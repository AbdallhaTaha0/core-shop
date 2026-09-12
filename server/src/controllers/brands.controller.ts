import type { NextFunction, Request, Response } from 'express';
import { createBrand, deleteBrand, listBrands, updateBrand } from '../services/brands.service';
import { auditActor, recordAudit } from '../services/audit.service';

export async function getBrands(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json({ data: await listBrands() });
  } catch (err) {
    next(err);
  }
}

export async function adminCreateBrand(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const brand = await createBrand(req.body);
    await recordAudit({
      actorUserId: auditActor(req),
      action: 'admin.brand.create',
      entityType: 'brand',
      entityId: brand.id,
      metadata: { slug: brand.slug },
      ipAddress: req.ip,
    });
    res.status(201).json({ brand });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateBrand(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const brand = await updateBrand(req.params.id as string, req.body);
    await recordAudit({
      actorUserId: auditActor(req),
      action: 'admin.brand.update',
      entityType: 'brand',
      entityId: brand.id,
      metadata: { fields: Object.keys(req.body as Record<string, unknown>) },
      ipAddress: req.ip,
    });
    res.status(200).json({ brand });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteBrand(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteBrand(req.params.id as string);
    await recordAudit({
      actorUserId: auditActor(req),
      action: 'admin.brand.delete',
      entityType: 'brand',
      entityId: req.params.id as string,
      ipAddress: req.ip,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
