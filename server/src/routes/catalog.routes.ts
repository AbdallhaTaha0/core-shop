import { Router } from 'express';
import { getBrands } from '../controllers/brands.controller';
import { getCategories } from '../controllers/categories.controller';
import { getProduct, getProducts } from '../controllers/products.controller';
import { validateParams, validateQuery } from '../middleware/validate';
import { ProductQuerySchema, ProductSlugParamsSchema } from '../schemas/product.schema';

// Public catalog reads. No authentication: browsing must work for guests.
const catalogRouter = Router();

catalogRouter.get('/products', validateQuery(ProductQuerySchema), getProducts);
catalogRouter.get('/products/:slug', validateParams(ProductSlugParamsSchema), getProduct);
catalogRouter.get('/categories', getCategories);
catalogRouter.get('/brands', getBrands);

export default catalogRouter;
