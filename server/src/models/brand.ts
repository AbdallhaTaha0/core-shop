import { DataTypes, Model, type Optional } from 'sequelize';
import { UUIDV4 } from 'sequelize';
import { getSequelize } from '../db/sequelize';

export interface BrandAttributes {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

type BrandCreationAttributes = Optional<BrandAttributes, 'id' | 'createdAt' | 'updatedAt'>;

export class Brand
  extends Model<BrandAttributes, BrandCreationAttributes>
  implements BrandAttributes
{
  declare id: string;
  declare name: string;
  declare slug: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Brand.init(
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
    modelName: 'Brand',
    tableName: 'brands',
  },
);
