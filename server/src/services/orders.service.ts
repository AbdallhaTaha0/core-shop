import { getSequelize } from '../db/sequelize';
import {
  Address,
  Cart,
  CartItem,
  Order,
  OrderItem,
  Product,
  type OrderStatus,
} from '../models/index';
import type { AdminOrderQuery, OrderQuery } from '../schemas/order.schema';
import { AppError } from '../utils/AppError';
import { PaymentDeclinedError, paymentProvider } from './payment.service';

export interface OrderItemJson {
  id: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  product: { id: string; slug: string; name: string };
}

export interface OrderJson {
  id: string;
  status: OrderStatus;
  currency: string;
  subtotalCents: number;
  totalCents: number;
  paymentId: string | null;
  shipping: {
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    postalCode: string;
    country: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemJson[];
}

export interface OrderList {
  data: OrderJson[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// Single-currency shop. Amounts are integer minor units end to end.
const CURRENCY = 'USD';

// Client-supplied statuses can never drive transitions directly: every
// change must follow this machine (enforced in updateOrderStatus).
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

type CartRow = Cart & { items?: Array<CartItem & { Product?: Product }> };
type OrderRow = Order & { items?: OrderItem[] };

// Checkout: validate -> charge -> fulfill atomically. The only accepted
// client input is an optional address reference; prices, quantities, and
// totals are derived from authoritative server/database state inside the
// transaction.
export async function checkout(userId: string, addressId?: string): Promise<OrderJson> {
  const cart = (await Cart.findOne({
    where: { userId },
    include: [
      {
        model: CartItem,
        as: 'items',
        include: [
          { model: Product, attributes: ['id', 'slug', 'name', 'priceCents', 'stock', 'isActive'] },
        ],
      },
    ],
  })) as CartRow | null;
  const items = cart?.items ?? [];
  if (cart === null || items.length === 0) {
    throw new AppError(409, 'CART_EMPTY', 'Your cart is empty');
  }
  assertStock(items);

  // Ownership is verified before any money moves: another user's address id
  // resolves to 404 here, never to their data.
  let shipping: Address | null = null;
  if (addressId !== undefined) {
    shipping = await Address.findOne({ where: { id: addressId, userId } });
    if (shipping === null) {
      throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
    }
  }

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.quantity * item.Product.priceCents,
    0,
  );

  let paymentId: string;
  try {
    const charge = await paymentProvider.charge({ amountCents: subtotalCents, currency: CURRENCY });
    paymentId = charge.paymentId;
  } catch (err) {
    if (err instanceof PaymentDeclinedError) {
      throw new AppError(402, 'PAYMENT_FAILED', 'Payment was declined');
    }
    throw err;
  }

  const sequelize = getSequelize();
  try {
    return await sequelize.transaction(async (t) => {
      // Lock product rows in a stable order (deadlock hygiene), then
      // revalidate: stock may have moved since the pre-check above.
      const ids = [...new Set(items.map((item) => item.productId))].sort();
      const locked = await Product.findAll({
        where: { id: ids },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const byId = new Map(locked.map((product) => [product.id, product]));
      const lines = items.map((item) => {
        const product = byId.get(item.productId);
        if (product === undefined || !product.isActive || product.stock < item.quantity) {
          throw new AppError(
            409,
            'INSUFFICIENT_STOCK',
            'Some items changed availability during checkout; please review your cart',
          );
        }
        return { item, product };
      });

      const order = await Order.create(
        {
          userId,
          status: 'paid',
          currency: CURRENCY,
          subtotalCents,
          totalCents: subtotalCents,
          paymentId,
          shipFullName: shipping?.fullName ?? null,
          shipLine1: shipping?.line1 ?? null,
          shipLine2: shipping?.line2 ?? null,
          shipCity: shipping?.city ?? null,
          shipPostalCode: shipping?.postalCode ?? null,
          shipCountry: shipping?.country ?? null,
        },
        { transaction: t },
      );
      const createdItems = await OrderItem.bulkCreate(
        lines.map(({ item, product }) => ({
          orderId: order.id,
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          unitPriceCents: product.priceCents,
          quantity: item.quantity,
          lineTotalCents: item.quantity * product.priceCents,
        })),
        { transaction: t },
      );
      for (const { item, product } of lines) {
        product.stock -= item.quantity;
        await product.save({ transaction: t });
      }
      await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });
      return toOrderJson(order, createdItems);
    });
  } catch (err) {
    // Money already moved: refund best-effort before surfacing the failure,
    // so a failed checkout can never leave a charge without an order.
    try {
      await paymentProvider.refund(paymentId);
    } catch (refundErr) {
      console.error(`Refund failed for payment ${paymentId}: ${(refundErr as Error).message}`);
    }
    throw err;
  }
}

export async function listMyOrders(userId: string, query: OrderQuery): Promise<OrderList> {
  return listOrders({ userId }, query);
}

export async function getMyOrder(userId: string, id: string): Promise<OrderJson> {
  // Scoped lookup: another user's id resolves to 404, never to their data.
  const order = (await Order.findOne({
    where: { id, userId },
    include: [{ model: OrderItem, as: 'items' }],
  })) as OrderRow | null;
  if (order === null) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }
  return toOrderJson(order, order.items ?? []);
}

export async function adminListOrders(query: AdminOrderQuery): Promise<OrderList> {
  return listOrders(query.status !== undefined ? { status: query.status } : {}, query);
}

export async function adminGetOrder(id: string): Promise<OrderJson> {
  const order = (await Order.findByPk(id, {
    include: [{ model: OrderItem, as: 'items' }],
  })) as OrderRow | null;
  if (order === null) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }
  return toOrderJson(order, order.items ?? []);
}

export async function adminUpdateOrderStatus(id: string, status: OrderStatus): Promise<OrderJson> {
  const order = await Order.findByPk(id);
  if (order === null) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }
  if (!ALLOWED_TRANSITIONS[order.status].includes(status)) {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Cannot move order from ${order.status} to ${status}`,
    );
  }

  const sequelize = getSequelize();
  await sequelize.transaction(async (t) => {
    // Cancelling returns reserved stock so it becomes purchasable again.
    if (status === 'cancelled' && order.status !== 'cancelled') {
      const items = await OrderItem.findAll({ where: { orderId: order.id }, transaction: t });
      for (const item of items) {
        const product = await Product.findByPk(item.productId, { transaction: t });
        if (product !== null) {
          product.stock += item.quantity;
          await product.save({ transaction: t });
        }
      }
    }
    order.status = status;
    await order.save({ transaction: t });
  });

  const refreshed = (await Order.findByPk(id, {
    include: [{ model: OrderItem, as: 'items' }],
  })) as OrderRow | null;
  if (refreshed === null) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }
  return toOrderJson(refreshed, refreshed.items ?? []);
}

async function listOrders(
  where: { userId?: string; status?: OrderStatus },
  query: OrderQuery,
): Promise<OrderList> {
  const offset = (query.page - 1) * query.limit;
  const result = await Order.findAndCountAll({
    where,
    include: [{ model: OrderItem, as: 'items' }],
    order: [['createdAt', 'DESC']],
    limit: query.limit,
    offset,
    distinct: true,
  });
  return {
    data: (result.rows as OrderRow[]).map((order) => toOrderJson(order, order.items ?? [])),
    meta: {
      page: query.page,
      limit: query.limit,
      total: result.count,
      totalPages: Math.max(1, Math.ceil(result.count / query.limit)),
    },
  };
}

function assertStock(
  items: Array<CartItem & { Product?: Product }>,
): asserts items is Array<CartItem & { Product: Product }> {
  const offenders: Array<{ productId: string; requested: number; available: number }> = [];
  for (const item of items) {
    const product = item.Product;
    if (product === undefined || !product.isActive || product.stock < item.quantity) {
      offenders.push({
        productId: item.productId,
        requested: item.quantity,
        available: product !== undefined && product.isActive ? product.stock : 0,
      });
    }
  }
  if (offenders.length > 0) {
    throw new AppError(
      409,
      'INSUFFICIENT_STOCK',
      'Some items are no longer available in the requested quantity',
      { items: offenders },
    );
  }
}

function toOrderJson(order: Order, items: OrderItem[]): OrderJson {
  return {
    id: order.id,
    status: order.status,
    currency: order.currency,
    subtotalCents: order.subtotalCents,
    totalCents: order.totalCents,
    paymentId: order.paymentId,
    shipping:
      order.shipFullName !== null &&
      order.shipLine1 !== null &&
      order.shipCity !== null &&
      order.shipPostalCode !== null &&
      order.shipCountry !== null
        ? {
            fullName: order.shipFullName,
            line1: order.shipLine1,
            line2: order.shipLine2,
            city: order.shipCity,
            postalCode: order.shipPostalCode,
            country: order.shipCountry,
          }
        : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
      product: { id: item.productId, slug: item.productSlug, name: item.productName },
    })),
  };
}
