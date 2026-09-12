import { DataTypes, Model, type Optional } from 'sequelize';
import { UUIDV4 } from 'sequelize';
import { getSequelize } from '../db/sequelize';

// Append-only audit trail. Rows are never updated or deleted through the
// API; actor references SET NULL so history survives user deletion.
export interface AuditLogAttributes {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}

type AuditLogCreationAttributes = Optional<
  AuditLogAttributes,
  'id' | 'actorUserId' | 'entityType' | 'entityId' | 'metadata' | 'ipAddress' | 'createdAt'
>;

export class AuditLog
  extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes
{
  declare id: string;
  declare actorUserId: string | null;
  declare action: string;
  declare entityType: string | null;
  declare entityId: string | null;
  declare metadata: Record<string, unknown> | null;
  declare ipAddress: string | null;
  declare readonly createdAt: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    actorUserId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize: getSequelize(),
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    updatedAt: false,
  },
);
