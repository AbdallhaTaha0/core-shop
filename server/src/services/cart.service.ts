import { UniqueConstraintError, type Transaction } from 'sequelize';
import { getSequelize } from '../db/sequelize';
import { Cart, CartItem, Category, Product, ProductImage } from '../models/index';
import type { AddCartItemDto, UpdateCartItemDto } from '../schemas/cart.schema';
import { AppError } from '../utils/AppError';

export interface CartItemJson {
  id: string;
  quantity: number;
  available: boolean;
  maxQuantity: number;
  lineTotalCents: number;
  product: {
    id: string;
    slug: string;
    name: string;
    priceCents: number;
    stock: number;
    // First image by position (null when the product has no images) plus the
    // category slug, so the storefront can show the uploaded photo with the
    // category artwork as fallback — no extra round trip needed.
    imageUrl: string | null;
    imageAltText: string | null;
    categorySlug: string;
  };
}

export interface CartJson {
  id: string | null;
  items: CartItemJson[];
  itemCount: number;
  subtotalCents: number;
  unavailableCount: number;
}

export interface MergeSummary {
  mergedItems: number;
  skippedItems: number;
}

type CartProduct = Product & { images?: ProductImage[]; Category?: Category };
type CartRow = Cart & { items?: Array<CartItem & { Product?: CartProduct }> };

export function emptyCartJson(): CartJson {
  return { id: null, items: [], itemCount: 0, subtotalCents: 0, unavailableCount: 0 };
}

export async function getCartJson(cartId: string): Promise<CartJson> {
  const cart = (await Cart.findByPk(cartId, {
    include: [
      {
        model: CartItem,
        as: 'items',
        include: [
          {
            model: Product,
            attributes: ['id', 'slug', 'name', 'priceCents', 'stock', 'isActive'],
            include: [
              { model: ProductImage, as: 'images', attributes: ['url', 'altText', 'position'] },
              { model: Category, attributes: ['slug'] },
            ],
          },
        ],
      },
    ],
  })) as CartRow | null;
  if (cart === null) {
    return emptyCartJson();
  }
  return toCartJson(cart);
}

export async function addItemToCart(cart: Cart, dto: AddCartItemDto): Promise<CartJson> {
  const product = await Product.findByPk(dto.productId);
  if (product === null) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  }
  requireAvailable(product);
  await increaseItem(cart.id, product.id, dto.quantity, product.stock);
  return getCartJson(cart.id);
}

export async function updateCartItem(
  cart: Cart,
  itemId: string,
  dto: UpdateCartItemDto,
): Promise<CartJson> {
  // Scoped to the caller's cart: item IDs from other carts resolve to 404,
  // never to another user's data.
  const item = (await CartItem.findOne({
    where: { id: itemId, cartId: cart.id },
    include: [{ model: Product, attributes: ['id', 'priceCents', 'stock', 'isActive'] }],
  })) as (CartItem & { Product?: Product }) | null;
  if (item === null) {
    throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found');
  }
  const product = item.Product;
  if (product === undefined) {
    throw new Error('Cart item loaded without its product');
  }
  requireAvailable(product);
  item.quantity = Math.min(dto.quantity, product.stock);
  await item.save();
  return getCartJson(cart.id);
}

export async function removeCartItem(cart: Cart, itemId: string): Promise<CartJson> {
  // Idempotent: removing an absent item still returns the current cart.
  await CartItem.destroy({ where: { id: itemId, cartId: cart.id } });
  return getCartJson(cart.id);
}

// Deterministic guest→user merge. Duplicate products combine (capped at
// authoritative stock); inactive/out-of-stock items are skipped, never moved.
// The guest cart row is destroyed; callers must also clear the cart cookie.
export async function mergeGuestCart(
  guestCartId: string,
  userId: string,
): Promise<MergeSummary | null> {
  const guestCart = (await Cart.findOne({
    where: { id: guestCartId, userId: null },
    include: [
      {
        model: CartItem,
        as: 'items',
        include: [{ model: Product, attributes: ['id', 'stock', 'isActive'] }],
      },
    ],
  })) as CartRow | null;
  if (guestCart === null) {
    return null;
  }

  const sequelize = getSequelize();
  return sequelize.transaction(async (t) => {
    const [userCart] = await Cart.findOrCreate({
      where: { userId },
      defaults: { userId },
      transaction: t,
    });
    let mergedItems = 0;
    let skippedItems = 0;
    for (const item of guestCart.items ?? []) {
      const product = item.Product;
      if (product === undefined || !product.isActive || product.stock <= 0) {
        skippedItems += 1;
        continue;
      }
      await increaseItem(userCart.id, product.id, item.quantity, product.stock, t);
      mergedItems += 1;
    }
    await guestCart.destroy({ transaction: t });
    return { mergedItems, skippedItems };
  });
}

// Adds quantity to any existing row for the product, capped at authoritative
// stock. The unique (cart, product) index is the backstop for the
// check-then-insert race: on conflict the winner row is re-read and merged.
async function increaseItem(
  cartId: string,
  productId: string,
  addQuantity: number,
  stockCap: number,
  transaction?: Transaction,
): Promise<void> {
  const quantity = Math.min(addQuantity, stockCap);
  const existing = await CartItem.findOne({ where: { cartId, productId }, transaction });
  if (existing !== null) {
    existing.quantity = Math.min(existing.quantity + quantity, stockCap);
    await existing.save({ transaction });
    return;
  }
  try {
    await CartItem.create({ cartId, productId, quantity }, { transaction });
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      const raced = await CartItem.findOne({ where: { cartId, productId }, transaction });
      if (raced === null) {
        throw err;
      }
      raced.quantity = Math.min(raced.quantity + quantity, stockCap);
      await raced.save({ transaction });
      return;
    }
    throw err;
  }
}

function requireAvailable(product: Product): void {
  if (!product.isActive || product.stock <= 0) {
    throw new AppError(409, 'PRODUCT_UNAVAILABLE', 'This product is currently unavailable');
  }
}

// Single ORM-boundary conversion (see products.service toProductJson).
function toCartJson(cart: CartRow): CartJson {
  const rows: Array<{ json: CartItemJson; createdAt: Date }> = [];
  for (const item of cart.items ?? []) {
    const product = item.Product;
    if (product === undefined) {
      throw new Error('Cart item loaded without its product');
    }
    const available = product.isActive && product.stock > 0;
    const firstImage = [...(product.images ?? [])].sort((a, b) => a.position - b.position)[0];
    rows.push({
      json: {
        id: item.id,
        quantity: item.quantity,
        available,
        maxQuantity: available ? product.stock : 0,
        lineTotalCents: available ? item.quantity * product.priceCents : 0,
        product: {
          id: product.id,
          slug: product.slug,
          name: product.name,
          priceCents: product.priceCents,
          stock: product.stock,
          imageUrl: firstImage?.url ?? null,
          imageAltText: firstImage?.altText ?? null,
          categorySlug: product.Category?.slug ?? '',
        },
      },
      createdAt: item.createdAt,
    });
  }
  // Oldest first for a stable presentation order.
  rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const items = rows.map((row) => row.json);
  return {
    id: cart.id,
    items,
    itemCount: items.reduce((sum, item) => sum + (item.available ? item.quantity : 0), 0),
    subtotalCents: items.reduce((sum, item) => sum + item.lineTotalCents, 0),
    unavailableCount: items.filter((item) => !item.available).length,
  };
}
