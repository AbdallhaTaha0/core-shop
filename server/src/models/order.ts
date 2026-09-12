import { DataTypes, Model, type Optional } from 'sequelize';
import { UUIDV4 } from 'sequelize';
import { getSequelize } from '../db/sequelize';

export const ORDER_STATUSES = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderAttributes {
  id: string;
  userId: string;
  status: OrderStatus;
  currency: string;
  subtotalCents: number;
  totalCents: number;
  paymentId: string | null;
  shipFullName: string | null;
  shipLine1: string | null;
  shipLine2: string | null;
  shipCity: string | null;
  shipPostalCode: string | null;
  shipCountry: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type OrderCreationAttributes = Optional<
  OrderAttributes,
  | 'id'
  | 'status'
  | 'currency'
  | 'paymentId'
  | 'shipFullName'
  | 'shipLine1'
  | 'shipLine2'
  | 'shipCity'
  | 'shipPostalCode'
  | 'shipCountry'
  | 'createdAt'
  | 'updatedAt'
>;

export class Order
  extends Model<OrderAttributes, OrderCreationAttributes>
  implements OrderAttributes
{
  declare id: string;
  declare userId: string;
  declare status: OrderStatus;
  declare currency: string;
  declare subtotalCents: number;
  declare totalCents: number;
  declare paymentId: string | null;
  declare shipFullName: string | null;
  declare shipLine1: string | null;
  declare shipLine2: string | null;
  declare shipCity: string | null;
  declare shipPostalCode: string | null;
  declare shipCountry: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...ORDER_STATUSES),
      allowNull: false,
      defaultValue: 'pending',
    },
    currency: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      defaultValue: 'USD',
    },
    subtotalCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
    totalCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
    paymentId: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    shipFullName: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    shipLine1: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    shipLine2: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    shipCity: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    shipPostalCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    shipCountry: {
      type: DataTypes.CHAR(2),
      allowNull: true,
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
    modelName: 'Order',
    tableName: 'orders',
  },
);
