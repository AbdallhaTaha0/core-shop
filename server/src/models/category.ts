import { DataTypes, Model, type Optional } from 'sequelize';
import { UUIDV4 } from 'sequelize';
import { getSequelize } from '../db/sequelize';

export interface CategoryAttributes {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type CategoryCreationAttributes = Optional<
  CategoryAttributes,
  'id' | 'description' | 'parentId' | 'createdAt' | 'updatedAt'
>;

export class Category
  extends Model<CategoryAttributes, CategoryCreationAttributes>
  implements CategoryAttributes
{
  declare id: string;
  declare name: string;
  declare slug: string;
  declare description: string | null;
  declare parentId: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Category.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
    },
    slug: {
      type: DataTypes.STRING(140),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    parentId: {
      type: DataTypes.UUID,
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
    modelName: 'Category',
    tableName: 'categories',
  },
);
