import { getSequelize } from '../../src/db/sequelize';
import {
  Address,
  AuditLog,
  Brand,
  Cart,
  CartItem,
  Category,
  Order,
  OrderItem,
  Product,
  ProductImage,
} from '../../src/models/index';
import { User } from '../../src/models/user';

// Safety guard: auth tests truncate the users table. Refuse to run unless
// the connection targets an isolated `*_test` database, so a misconfigured
// DATABASE_URL can never wipe development data.
export function ensureTestDatabase(): void {
  const name = getSequelize().getDatabaseName();
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to run destructive auth tests against non-test database "${name}"`);
  }
}

export async function truncateAll(): Promise<void> {
  ensureTestDatabase();
  await AuditLog.destroy({ where: {} });
  await OrderItem.destroy({ where: {} });
  await Order.destroy({ where: {} });
  await CartItem.destroy({ where: {} });
  await Cart.destroy({ where: {} });
  await ProductImage.destroy({ where: {} });
  await Product.destroy({ where: {} });
  await Category.destroy({ where: {} });
  await Brand.destroy({ where: {} });
  await Address.destroy({ where: {} });
  await User.destroy({ where: {} });
}
