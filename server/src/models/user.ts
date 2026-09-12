import { DataTypes, Model, type Optional } from 'sequelize';
import { UUIDV4 } from 'sequelize';
import { getSequelize } from '../db/sequelize';

// Deliberate minimalism: a single `role` enum covers the customer/admin
// split this project needs. A separate Role table would be over-engineering
// until permissions become more granular than one flag.
export type UserRole = 'customer' | 'admin';

export interface UserAttributes {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

type UserCreationAttributes = Optional<UserAttributes, 'id' | 'role' | 'createdAt' | 'updatedAt'>;

export interface SafeUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare role: UserRole;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  toSafeUser(): SafeUser {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    // Column is `password_hash` via the global `underscored` convention.
    // The hash itself is never selected for API output — see toSafeUser().
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('customer', 'admin'),
      allowNull: false,
      defaultValue: 'customer',
    },
    // Managed by Sequelize (`timestamps: true` default); declared explicitly
    // so the attribute map is complete. Stored as created_at/updated_at.
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
    modelName: 'User',
    tableName: 'users',
  },
);
