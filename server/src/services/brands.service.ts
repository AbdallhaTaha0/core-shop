import { ForeignKeyConstraintError, UniqueConstraintError } from 'sequelize';
import { Brand, Product } from '../models/index';
import type { CreateBrandDto, UpdateBrandDto } from '../schemas/brand.schema';
import { AppError } from '../utils/AppError';
import { resolveUniqueSlug, slugify } from '../utils/slug';

function toConflict(err: unknown): AppError {
  if (err instanceof UniqueConstraintError) {
    return new AppError(409, 'BRAND_CONFLICT', 'A brand with this name or slug already exists');
  }
  throw err;
}

export async function listBrands(): Promise<Brand[]> {
  return Brand.findAll({
    attributes: ['id', 'name', 'slug', 'createdAt', 'updatedAt'],
    order: [['name', 'ASC']],
  });
}

export async function createBrand(dto: CreateBrandDto): Promise<Brand> {
  const slug = dto.slug ?? (await resolveUniqueSlug(checkSlug, slugify(dto.name)));
  if (dto.slug !== undefined && (await checkSlug(dto.slug))) {
    throw new AppError(409, 'BRAND_SLUG_TAKEN', 'A brand with this slug already exists');
  }
  try {
    return await Brand.create({ name: dto.name, slug });
  } catch (err) {
    throw toConflict(err);
  }
}

export async function updateBrand(id: string, dto: UpdateBrandDto): Promise<Brand> {
  const brand = await Brand.findByPk(id);
  if (brand === null) {
    throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
  }
  if (dto.slug !== undefined && dto.slug !== brand.slug && (await checkSlug(dto.slug))) {
    throw new AppError(409, 'BRAND_SLUG_TAKEN', 'A brand with this slug already exists');
  }
  try {
    await brand.update({ name: dto.name, slug: dto.slug });
    return brand;
  } catch (err) {
    throw toConflict(err);
  }
}

export async function deleteBrand(id: string): Promise<void> {
  const brand = await Brand.findByPk(id);
  if (brand === null) {
    throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
  }
  if ((await Product.count({ where: { brandId: id } })) > 0) {
    throw new AppError(
      409,
      'BRAND_HAS_PRODUCTS',
      'Brand cannot be deleted while products reference it',
    );
  }
  try {
    await brand.destroy();
  } catch (err) {
    if (err instanceof ForeignKeyConstraintError) {
      throw new AppError(
        409,
        'BRAND_HAS_PRODUCTS',
        'Brand cannot be deleted while products reference it',
      );
    }
    throw err;
  }
}

async function checkSlug(slug: string): Promise<boolean> {
  return (await Brand.findOne({ where: { slug } })) !== null;
}
