import { Address } from './address';
import { AuditLog } from './auditLog';
import { Brand } from './brand';
import { Cart } from './cart';
import { CartItem } from './cartItem';
import { Category } from './category';
import { Order } from './order';
import { OrderItem } from './orderItem';
import { Product } from './product';
import { ProductImage } from './productImage';
import { User } from './user';

// All associations live here (not in the model files) to avoid circular
// imports. Deletion behavior is deliberate:
// - Category/Brand -> Product: RESTRICT. A category or brand with products
//   cannot be deleted; reassign or remove the products first. Silent
//   nullification would corrupt catalog navigation.
// - Product -> ProductImage: CASCADE. Images are owned wholly by their product.
// - Category parent -> children: SET NULL. Children become top-level.
Category.hasMany(Category, { as: 'children', foreignKey: 'parentId' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });

Category.hasMany(Product, { foreignKey: 'categoryId', onDelete: 'RESTRICT' });
Product.belongsTo(Category, { foreignKey: 'categoryId' });

Brand.hasMany(Product, { foreignKey: 'brandId', onDelete: 'RESTRICT' });
Product.belongsTo(Brand, { foreignKey: 'brandId' });

Product.hasMany(ProductImage, {
  as: 'images',
  foreignKey: 'productId',
  onDelete: 'CASCADE',
});
ProductImage.belongsTo(Product, { foreignKey: 'productId' });

// - User -> Cart: CASCADE, one cart per user (unique user_id). Guest carts
//   are anonymous rows keyed by the cart cookie.
// - Cart -> CartItem: CASCADE. Product -> CartItem: CASCADE (a hard-deleted
//   product vanishes from carts instead of dangling).
User.hasOne(Cart, { foreignKey: 'userId', onDelete: 'CASCADE' });
Cart.belongsTo(User, { foreignKey: 'userId' });

Cart.hasMany(CartItem, { as: 'items', foreignKey: 'cartId', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId' });

Product.hasMany(CartItem, { foreignKey: 'productId', onDelete: 'CASCADE' });
CartItem.belongsTo(Product, { foreignKey: 'productId' });

// - User -> Order: RESTRICT. Orders are financial history; a user with orders
//   cannot be deleted while this reference exists.
// - Order -> OrderItem: CASCADE. Product -> OrderItem: RESTRICT, so history
//   can never lose the product it points at (deactivation is the normal path).
User.hasMany(Order, { foreignKey: 'userId', onDelete: 'RESTRICT' });
Order.belongsTo(User, { foreignKey: 'userId' });

Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

Product.hasMany(OrderItem, { foreignKey: 'productId', onDelete: 'RESTRICT' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });

// - User -> AuditLog: SET NULL. The trail outlives the accounts it records.
User.hasMany(AuditLog, { foreignKey: 'actorUserId', onDelete: 'SET NULL' });
AuditLog.belongsTo(User, { foreignKey: 'actorUserId' });

export {
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
  User,
};
export type { OrderStatus } from './order';
