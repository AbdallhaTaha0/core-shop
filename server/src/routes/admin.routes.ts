import { Router } from 'express';
import {
  adminCreateBrand,
  adminDeleteBrand,
  adminUpdateBrand,
} from '../controllers/brands.controller';
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminUpdateCategory,
} from '../controllers/categories.controller';
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminListProducts,
  adminUpdateProduct,
} from '../controllers/products.controller';
import { adminGet, adminList, adminUpdateStatus } from '../controllers/orders.controller';
import { adminGetUser, adminListUsers, adminUpdateUserRole } from '../controllers/users.controller';
import { adminListAuditLogs } from '../controllers/audit.controller';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { BrandIdParamsSchema, CreateBrandSchema, UpdateBrandSchema } from '../schemas/brand.schema';
import {
  CategoryIdParamsSchema,
  CreateCategorySchema,
  UpdateCategorySchema,
} from '../schemas/category.schema';
import {
  AdminOrderQuerySchema,
  OrderIdParamsSchema,
  UpdateOrderStatusSchema,
} from '../schemas/order.schema';
import { UpdateUserRoleSchema, UserIdParamsSchema, UserQuerySchema } from '../schemas/user.schema';
import { AuditQuerySchema } from '../schemas/audit.schema';
import {
  AdminProductQuerySchema,
  CreateProductSchema,
  ProductIdParamsSchema,
  UpdateProductSchema,
} from '../schemas/product.schema';

// Every route here requires a server-verified admin session. Client-sent
// roles are never consulted (see authorize middleware).
const adminRouter = Router();

adminRouter.use(authenticate, requireRole('admin'));

adminRouter.get('/products', validateQuery(AdminProductQuerySchema), adminListProducts);
adminRouter.post('/products', validateBody(CreateProductSchema), adminCreateProduct);
adminRouter.patch(
  '/products/:id',
  validateParams(ProductIdParamsSchema),
  validateBody(UpdateProductSchema),
  adminUpdateProduct,
);
adminRouter.delete('/products/:id', validateParams(ProductIdParamsSchema), adminDeleteProduct);

adminRouter.post('/categories', validateBody(CreateCategorySchema), adminCreateCategory);
adminRouter.patch(
  '/categories/:id',
  validateParams(CategoryIdParamsSchema),
  validateBody(UpdateCategorySchema),
  adminUpdateCategory,
);
adminRouter.delete('/categories/:id', validateParams(CategoryIdParamsSchema), adminDeleteCategory);

adminRouter.post('/brands', validateBody(CreateBrandSchema), adminCreateBrand);
adminRouter.patch(
  '/brands/:id',
  validateParams(BrandIdParamsSchema),
  validateBody(UpdateBrandSchema),
  adminUpdateBrand,
);
adminRouter.delete('/brands/:id', validateParams(BrandIdParamsSchema), adminDeleteBrand);

adminRouter.get('/orders', validateQuery(AdminOrderQuerySchema), adminList);
adminRouter.get('/orders/:id', validateParams(OrderIdParamsSchema), adminGet);
adminRouter.patch(
  '/orders/:id',
  validateParams(OrderIdParamsSchema),
  validateBody(UpdateOrderStatusSchema),
  adminUpdateStatus,
);

adminRouter.get('/users', validateQuery(UserQuerySchema), adminListUsers);
adminRouter.get('/users/:id', validateParams(UserIdParamsSchema), adminGetUser);
adminRouter.patch(
  '/users/:id',
  validateParams(UserIdParamsSchema),
  validateBody(UpdateUserRoleSchema),
  adminUpdateUserRole,
);

adminRouter.get('/audit-logs', validateQuery(AuditQuerySchema), adminListAuditLogs);

export default adminRouter;
