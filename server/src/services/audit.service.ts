import type { Request } from 'express';
import type { WhereOptions } from 'sequelize';
import { AuditLog } from '../models/index';
import type { AuditLogAttributes } from '../models/auditLog';

export const AUDIT_ACTIONS = [
  'auth.register',
  'auth.login',
  'auth.login_failed',
  'auth.logout',
  'admin.product.create',
  'admin.product.update',
  'admin.product.delete',
  'admin.category.create',
  'admin.category.update',
  'admin.category.delete',
  'admin.brand.create',
  'admin.brand.update',
  'admin.brand.delete',
  'admin.order.status',
  'admin.user.role',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditList {
  data: AuditLog[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function auditActor(req: Request): string | null {
  return req.user?.id ?? null;
}

export async function recordAudit(entry: {
  actorUserId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await AuditLog.create({
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
      ipAddress: entry.ipAddress ?? null,
    });
  } catch (err) {
    // Fail-open by design: the audit trail must never break authentication
    // or admin flows (that would turn an audit outage into a full outage).
    console.error(`Audit write failed (${entry.action}): ${(err as Error).message}`);
  }
}

export async function listAuditLogs(query: {
  page: number;
  limit: number;
  action?: string;
}): Promise<AuditList> {
  const where: WhereOptions<AuditLogAttributes> = {};
  if (query.action !== undefined) {
    where.action = query.action;
  }
  const offset = (query.page - 1) * query.limit;
  const result = await AuditLog.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: query.limit,
    offset,
  });
  return {
    data: result.rows,
    meta: {
      page: query.page,
      limit: query.limit,
      total: result.count,
      totalPages: Math.max(1, Math.ceil(result.count / query.limit)),
    },
  };
}
