import { DataTypes, Model, type Optional } from 'sequelize';
import { UUIDV4 } from 'sequelize';
import { getSequelize } from '../db/sequelize';

// Minimal shipping identity: only what checkout and a shipping label need.
// No more personal data than the flow requires.
export interface AddressAttributes {
  id: string;
  userId: string;
  label: string | null;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type AddressCreationAttributes = Optional<
  AddressAttributes,
  'id' | 'label' | 'line2' | 'isDefault' | 'createdAt' | 'updatedAt'
>;

export class Address
  extends Model<AddressAttributes, AddressCreationAttributes>
  implements AddressAttributes
{
  declare id: string;
  declare userId: string;
  declare label: string | null;
  declare fullName: string;
  declare line1: string;
  declare line2: string | null;
  declare city: string;
  declare postalCode: string;
  declare country: string;
  declare isDefault: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Address.init(
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
    label: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    fullName: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    line1: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    line2: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    postalCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    country: {
      type: DataTypes.CHAR(2),
      allowNull: false,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    modelName: 'Address',
    tableName: 'addresses',
  },
);
