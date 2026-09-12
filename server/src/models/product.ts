import { DataTypes, Model, type Optional } from 'sequelize';
import { UUIDV4 } from 'sequelize';
import { getSequelize } from '../db/sequelize';

// Money representation for the whole project: integer minor units
// (`priceCents`). Exact arithmetic, no floating-point drift, trivially
// portable to carts/orders totals later. Display formatting is a
// presentation concern and lives outside the database.
export interface ProductAttributes {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceCents: number;
  stock: number;
  isActive: boolean;
  categoryId: string;
  brandId: string;
  createdAt: Date;
  updatedAt: Date;
}

type ProductCreationAttributes = Optional<
  ProductAttributes,
  'id' | 'description' | 'stock' | 'isActive' | 'createdAt' | 'updatedAt'
>;

export class Product
  extends Model<ProductAttributes, ProductCreationAttributes>
  implements ProductAttributes
{
  declare id: string;
  declare name: string;
  declare slug: string;
  declare description: string | null;
  declare priceCents: number;
  declare stock: number;
  declare isActive: boolean;
  declare categoryId: string;
  declare brandId: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Product.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(220),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    priceCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    brandId: {
      type: DataTypes.UUID,
      allowNull: false,
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
    modelName: 'Product',
    tableName: 'products',
  },
);
