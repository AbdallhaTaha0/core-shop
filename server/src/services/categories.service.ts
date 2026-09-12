import { ForeignKeyConstraintError, UniqueConstraintError } from 'sequelize';
import { Category, Product } from '../models/index';
import type { CreateCategoryDto, UpdateCategoryDto } from '../schemas/category.schema';
import { AppError } from '../utils/AppError';
import { resolveUniqueSlug, slugify } from '../utils/slug';

function toConflict(err: unknown): AppError {
  if (err instanceof UniqueConstraintError) {
    return new AppError(
      409,
      'CATEGORY_CONFLICT',
      'A category with this name or slug already exists',
    );
  }
  throw err;
}

export async function listCategories(): Promise<Category[]> {
  return Category.findAll({
    attributes: ['id', 'name', 'slug', 'description', 'parentId', 'createdAt', 'updatedAt'],
    order: [['name', 'ASC']],
  });
}

export async function createCategory(dto: CreateCategoryDto): Promise<Category> {
  if (dto.parentId !== undefined && dto.parentId !== null) {
    await requireCategory(dto.parentId);
  }
  const slug = dto.slug ?? (await resolveUniqueSlug(checkSlug, slugify(dto.name)));
  if (dto.slug !== undefined && (await checkSlug(dto.slug))) {
    throw new AppError(409, 'CATEGORY_SLUG_TAKEN', 'A category with this slug already exists');
  }
  try {
    return await Category.create({
      name: dto.name,
      slug,
      description: dto.description ?? null,
      parentId: dto.parentId ?? null,
    });
  } catch (err) {
    throw toConflict(err);
  }
}

export async function updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
  const category = await Category.findByPk(id);
  if (category === null) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
  }
  if (dto.slug !== undefined && dto.slug !== category.slug && (await checkSlug(dto.slug))) {
    throw new AppError(409, 'CATEGORY_SLUG_TAKEN', 'A category with this slug already exists');
  }
  if (dto.parentId !== undefined) {
    await requireValidParent(id, dto.parentId);
  }
  try {
    await category.update({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      parentId: dto.parentId,
    });
    return category;
  } catch (err) {
    throw toConflict(err);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const category = await Category.findByPk(id);
  if (category === null) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
  }
  if ((await Category.count({ where: { parentId: id } })) > 0) {
    throw new AppError(
      409,
      'CATEGORY_HAS_CHILDREN',
      'Category cannot be deleted while it has subcategories',
    );
  }
  if ((await Product.count({ where: { categoryId: id } })) > 0) {
    throw new AppError(
      409,
      'CATEGORY_HAS_PRODUCTS',
      'Category cannot be deleted while products reference it',
    );
  }
  try {
    await category.destroy();
  } catch (err) {
    if (err instanceof ForeignKeyConstraintError) {
      throw new AppError(
        409,
        'CATEGORY_HAS_PRODUCTS',
        'Category cannot be deleted while products reference it',
      );
    }
    throw err;
  }
}

async function requireCategory(id: string): Promise<void> {
  if ((await Category.findByPk(id)) === null) {
    throw new AppError(404, 'CATEGORY_PARENT_NOT_FOUND', 'Parent category not found');
  }
}

async function requireValidParent(selfId: string, parentId: string | null): Promise<void> {
  if (parentId === null) {
    return;
  }
  if (parentId === selfId) {
    throw new AppError(400, 'CATEGORY_PARENT_CYCLE', 'A category cannot be its own parent');
  }
  // Walk the ancestor chain: if it reaches back to self, the move is a cycle.
  let current: string | null = parentId;
  while (current !== null) {
    if (current === selfId) {
      throw new AppError(400, 'CATEGORY_PARENT_CYCLE', 'Moving here would create a cycle');
    }
    const parent: Category | null = await Category.findByPk(current, {
      attributes: ['parentId'],
    });
    if (parent === null) {
      throw new AppError(404, 'CATEGORY_PARENT_NOT_FOUND', 'Parent category not found');
    }
    current = parent.parentId;
  }
}

async function checkSlug(slug: string): Promise<boolean> {
  return (await Category.findOne({ where: { slug } })) !== null;
}
