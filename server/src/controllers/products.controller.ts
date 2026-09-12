import type { NextFunction, Request, Response } from 'express';
import type { AdminProductQuery, ProductQuery } from '../schemas/product.schema';
import { auditActor, recordAudit } from '../services/audit.service';
import {
  createProduct,
  deleteProduct,
  getProductBySlug,
  listProducts,
  updateProduct,
} from '../services/products.service';

// req.validatedQuery carries schema-validated data (see validateQuery +
// the Request augmentation). It is narrowed once here at the boundary.
function productQuery(req: Request): ProductQuery {
  return req.validatedQuery as ProductQuery;
}

function adminQuery(req: Request): AdminProductQuery {
  return req.validatedQuery as AdminProductQuery;
}

function routeId(req: Request): string {
  return req.params.id as string;
}

function routeSlug(req: Request): string {
  return req.params.slug as string;
}

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listProducts(productQuery(req));
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json({ product: await getProductBySlug(routeSlug(req)) });
  } catch (err) {
    next(err);
  }
}

export async function adminListProducts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = adminQuery(req);
    const result = await listProducts(query, query.includeInactive ?? false);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function adminCreateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const product = await createProduct(req.body);
    await recordAudit({
      actorUserId: auditActor(req),
      action: 'admin.product.create',
      entityType: 'product',
      entityId: product.id,
      metadata: { slug: product.slug },
      ipAddress: req.ip,
    });
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const product = await updateProduct(routeId(req), req.body);
    await recordAudit({
      actorUserId: auditActor(req),
      action: 'admin.product.update',
      entityType: 'product',
      entityId: product.id,
      metadata: { fields: Object.keys(req.body as Record<string, unknown>) },
      ipAddress: req.ip,
    });
    res.status(200).json({ product });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteProduct(routeId(req));
    await recordAudit({
      actorUserId: auditActor(req),
      action: 'admin.product.delete',
      entityType: 'product',
      entityId: routeId(req),
      ipAddress: req.ip,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
