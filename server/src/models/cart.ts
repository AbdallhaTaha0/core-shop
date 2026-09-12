import { DataTypes, Model, type Optional } from 'sequelize';
import { UUIDV4 } from 'sequelize';
import { getSequelize } from '../db/sequelize';

export interface CartAttributes {
  id: string;
  // Exactly one of userId / guest ownership applies: authenticated carts are
  // linked by userId (one cart per user), guest carts are anonymous rows
  // referenced by the cart cookie. userId is unique to enforce that.
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type CartCreationAttributes = Optional<CartAttributes, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

export class Cart extends Model<CartAttributes, CartCreationAttributes> implements CartAttributes {
  declare id: string;
  declare userId: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Cart.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true,
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
    modelName: 'Cart',
    tableName: 'carts',
  },
);
