import { Op, UniqueConstraintError, type Order, type WhereOptions } from 'sequelize';
import { getSequelize } from '../db/sequelize';
import { Brand, Category, Product, ProductImage } from '../models/index';
import type { ProductAttributes } from '../models/product';
import type { CreateProductDto, ProductQuery, UpdateProductDto } from '../schemas/product.schema';
import { AppError } from '../utils/AppError';
import { resolveUniqueSlug, slugify } from '../utils/slug';

export interface ProductJson {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceCents: number;
  stock: number;
  isActive: boolean;
  category: { id: string; slug: string; name: string };
  brand: { id: string; slug: string; name: string };
  images: Array<{ url: string; altText: string | null; position: number }>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductList {
  data: ProductJson[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

type ProductRow = Product & {
  Category?: Category;
  Brand?: Brand;
  images?: ProductImage[];
};

const SORT_ORDERS: Record<ProductQuery['sort'], Order> = {
  newest: [['createdAt', 'DESC']],
  price_asc: [['priceCents', 'ASC']],
  price_desc: [['priceCents', 'DESC']],
  name_asc: [['name', 'ASC']],
};

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export async function listProducts(
  query: ProductQuery,
  includeInactive = false,
): Promise<ProductList> {
  const where: WhereOptions<ProductAttributes> = {};
  if (!includeInactive) {
    where.isActive = true;
  }
  if (query.category !== undefined) {
    const category = await Category.findOne({ where: { slug: query.category } });
    if (category === null) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }
    where.categoryId = category.id;
  }
  if (query.brand !== undefined) {
    const brand = await Brand.findOne({ where: { slug: query.brand } });
    if (brand === null) {
      throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
    }
    where.brandId = brand.id;
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const price: { [Op.gte]?: number; [Op.lte]?: number } = {};
    if (query.minPrice !== undefined) {
      price[Op.gte] = query.minPrice;
    }
    if (query.maxPrice !== undefined) {
      price[Op.lte] = query.maxPrice;
    }
    where.priceCents = price;
  }
  if (query.inStock === true) {
    where.stock = { [Op.gt]: 0 };
  }
  if (query.q !== undefined && query.q !== '') {
    const pattern = `%${escapeLike(query.q)}%`;
    // Symbol-keyed operators have no index signature on the attribute hash,
    // so the OR branch is merged rather than assigned.
    Object.assign(where, {
      [Op.or]: [{ name: { [Op.iLike]: pattern } }, { description: { [Op.iLike]: pattern } }],
    });
  }

  const offset = (query.page - 1) * query.limit;
  // `distinct` keeps the count correct despite the images join multiplying rows.
  const result = await Product.findAndCountAll({
    where,
    include: [
      { model: Category, attributes: ['id', 'slug', 'name'] },
      { model: Brand, attributes: ['id', 'slug', 'name'] },
      { model: ProductImage, as: 'images', attributes: ['url', 'altText', 'position'] },
    ],
    order: SORT_ORDERS[query.sort],
    limit: query.limit,
    offset,
    distinct: true,
  });

  return {
    data: (result.rows as ProductRow[]).map(toProductJson),
    meta: {
      page: query.page,
      limit: query.limit,
      total: result.count,
      totalPages: Math.max(1, Math.ceil(result.count / query.limit)),
    },
  };
}

export async function getProductBySlug(
  slug: string,
  includeInactive = false,
): Promise<ProductJson> {
  const product = (await Product.findOne({
    where: { slug },
    include: [
      { model: Category, attributes: ['id', 'slug', 'name'] },
      { model: Brand, attributes: ['id', 'slug', 'name'] },
      { model: ProductImage, as: 'images', attributes: ['url', 'altText', 'position'] },
    ],
  })) as ProductRow | null;
  if (product === null || (!includeInactive && !product.isActive)) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  }
  return toProductJson(product);
}

export async function createProduct(dto: CreateProductDto): Promise<ProductJson> {
  await requireCategory(dto.categoryId);
  await requireBrand(dto.brandId);
  let slug: string;
  if (dto.slug !== undefined) {
    if (await slugTaken(dto.slug)) {
      throw new AppError(409, 'PRODUCT_SLUG_TAKEN', 'A product with this slug already exists');
    }
    slug = dto.slug;
  } else {
    slug = await resolveUniqueSlug(slugTaken, slugify(dto.name));
  }

  const sequelize = getSequelize();
  try {
    const created = await sequelize.transaction(async (t) => {
      const product = await Product.create(
        {
          name: dto.name,
          slug,
          description: dto.description ?? null,
          priceCents: dto.priceCents,
          stock: dto.stock,
          isActive: dto.isActive,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
        },
        { transaction: t },
      );
      if (dto.images.length > 0) {
        await ProductImage.bulkCreate(
          dto.images.map((image, index) => ({
            productId: product.id,
            url: image.url,
            altText: image.altText ?? null,
            position: index,
          })),
          { transaction: t },
        );
      }
      return product;
    });
    return getProductByIdOrThrow(created.id);
  } catch (err) {
    throw toSlugConflict(err);
  }
}

export async function updateProduct(id: string, dto: UpdateProductDto): Promise<ProductJson> {
  const product = await Product.findByPk(id);
  if (product === null) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  }
  if (dto.categoryId !== undefined) {
    await requireCategory(dto.categoryId);
  }
  if (dto.brandId !== undefined) {
    await requireBrand(dto.brandId);
  }
  if (dto.slug !== undefined && dto.slug !== product.slug && (await slugTaken(dto.slug))) {
    throw new AppError(409, 'PRODUCT_SLUG_TAKEN', 'A product with this slug already exists');
  }

  const sequelize = getSequelize();
  try {
    await sequelize.transaction(async (t) => {
      const fields = { ...dto };
      delete fields.images;
      await product.update(fields, { transaction: t });
      if (dto.images !== undefined) {
        await ProductImage.destroy({ where: { productId: id }, transaction: t });
        if (dto.images.length > 0) {
          await ProductImage.bulkCreate(
            dto.images.map((image, index) => ({
              productId: id,
              url: image.url,
              altText: image.altText ?? null,
              position: index,
            })),
            { transaction: t },
          );
        }
      }
    });
    return getProductByIdOrThrow(id);
  } catch (err) {
    throw toSlugConflict(err);
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const product = await Product.findByPk(id);
  if (product === null) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  }
  // Images cascade at the database level.
  await product.destroy();
}

async function getProductByIdOrThrow(id: string): Promise<ProductJson> {
  const product = (await Product.findByPk(id, {
    include: [
      { model: Category, attributes: ['id', 'slug', 'name'] },
      { model: Brand, attributes: ['id', 'slug', 'name'] },
      { model: ProductImage, as: 'images', attributes: ['url', 'altText', 'position'] },
    ],
  })) as ProductRow | null;
  if (product === null) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  }
  return toProductJson(product);
}

async function requireCategory(id: string): Promise<void> {
  if ((await Category.findByPk(id)) === null) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
  }
}

async function requireBrand(id: string): Promise<void> {
  if ((await Brand.findByPk(id)) === null) {
    throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
  }
}

async function slugTaken(slug: string): Promise<boolean> {
  return (await Product.findOne({ where: { slug }, attributes: ['id'] })) !== null;
}

function toSlugConflict(err: unknown): AppError {
  // Backstop for the check-then-insert race on the unique slug index.
  if (err instanceof UniqueConstraintError) {
    return new AppError(409, 'PRODUCT_SLUG_TAKEN', 'A product with this slug already exists');
  }
  throw err;
}

// Single ORM-boundary conversion: associations arrive untyped from Sequelize,
// so the shape is asserted once here instead of leaking `any` outward.
function toProductJson(product: ProductRow): ProductJson {
  const plain = product.get({ plain: true }) as unknown as {
    Category?: { id: string; slug: string; name: string };
    Brand?: { id: string; slug: string; name: string };
    images?: Array<{ url: string; altText: string | null; position: number }>;
  };
  if (plain.Category === undefined || plain.Brand === undefined) {
    throw new Error('Product loaded without its category/brand relations');
  }
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    priceCents: product.priceCents,
    stock: product.stock,
    isActive: product.isActive,
    category: plain.Category,
    brand: plain.Brand,
    images: [...(plain.images ?? [])].sort((a, b) => a.position - b.position),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
