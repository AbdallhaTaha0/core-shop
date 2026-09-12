import { DataTypes, Model, type Optional } from 'sequelize';
import { UUIDV4 } from 'sequelize';
import { getSequelize } from '../db/sequelize';

// Order items are immutable history: unit price, product name, and slug are
// snapshotted at purchase time. Later product edits (or renames) never
// rewrite what the customer actually bought and paid.
export interface OrderItemAttributes {
  id: string;
  orderId: string;
  productId: string;
  productSlug: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  createdAt: Date;
  updatedAt: Date;
}

type OrderItemCreationAttributes = Optional<OrderItemAttributes, 'id' | 'createdAt' | 'updatedAt'>;

export class OrderItem
  extends Model<OrderItemAttributes, OrderItemCreationAttributes>
  implements OrderItemAttributes
{
  declare id: string;
  declare orderId: string;
  declare productId: string;
  declare productSlug: string;
  declare productName: string;
  declare unitPriceCents: number;
  declare quantity: number;
  declare lineTotalCents: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

OrderItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    productSlug: {
      type: DataTypes.STRING(220),
      allowNull: false,
    },
    productName: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    unitPriceCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    lineTotalCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize: getSequelize(),
    modelName: 'OrderItem',
    tableName: 'order_items',
  },
);
