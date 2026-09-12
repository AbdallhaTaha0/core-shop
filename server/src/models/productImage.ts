import { DataTypes, Model, type Optional } from 'sequelize';
import { UUIDV4 } from 'sequelize';
import { getSequelize } from '../db/sequelize';

export interface ProductImageAttributes {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

type ProductImageCreationAttributes = Optional<
  ProductImageAttributes,
  'id' | 'altText' | 'position' | 'createdAt' | 'updatedAt'
>;

export class ProductImage
  extends Model<ProductImageAttributes, ProductImageCreationAttributes>
  implements ProductImageAttributes
{
  declare id: string;
  declare productId: string;
  declare url: string;
  declare altText: string | null;
  declare position: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ProductImage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING(2048),
      allowNull: false,
    },
    altText: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    modelName: 'ProductImage',
    tableName: 'product_images',
  },
);
