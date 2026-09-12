import type { NextFunction, Request, Response } from 'express';
import { auditActor, recordAudit } from '../services/audit.service';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../services/categories.service';

export async function getCategories(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.status(200).json({ data: await listCategories() });
  } catch (err) {
    next(err);
  }
}

export async function adminCreateCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const category = await createCategory(req.body);
    await recordAudit({
      actorUserId: auditActor(req),
      action: 'admin.category.create',
      entityType: 'category',
      entityId: category.id,
      metadata: { slug: category.slug },
      ipAddress: req.ip,
    });
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const category = await updateCategory(req.params.id as string, req.body);
    await recordAudit({
      actorUserId: auditActor(req),
      action: 'admin.category.update',
      entityType: 'category',
      entityId: category.id,
      metadata: { fields: Object.keys(req.body as Record<string, unknown>) },
      ipAddress: req.ip,
    });
    res.status(200).json({ category });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteCategory(req.params.id as string);
    await recordAudit({
      actorUserId: auditActor(req),
      action: 'admin.category.delete',
      entityType: 'category',
      entityId: req.params.id as string,
      ipAddress: req.ip,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
