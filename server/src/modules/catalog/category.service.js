import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { Category } from './category.model.js';
import { Product } from './product.model.js';

function throwCategoryNotFound() {
  throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
}

function throwDuplicateCategory() {
  throw new AppError(
    409,
    'DUPLICATE_CATEGORY',
    'A category with this name already exists for this sport.',
  );
}

function throwCategoryInUse() {
  throw new AppError(
    409,
    'CATEGORY_IN_USE',
    'This category is still used by active products.',
  );
}

function throwCategorySportChangeConflict() {
  throw new AppError(
    409,
    'CATEGORY_SPORT_CHANGE_CONFLICT',
    'The category sport cannot be changed while active products use this category.',
  );
}

async function hasActiveProducts(categoryId) {
  const productExists = await Product.exists({
    categoryId,
    isActive: true,
  });

  return Boolean(productExists);
}

function normalizeCategoryName(name) {
  return name.trim().replace(/\s+/g, ' ');
}

function createNameKey(name) {
  return normalizeCategoryName(name).toLowerCase();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

function toCategoryResource(category) {
  return {
    id: category._id.toString(),
    name: category.name,
    sport: category.sport,
    isActive: category.isActive,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

async function getCategoryOrThrow(categoryId) {
  if (!mongoose.isValidObjectId(categoryId)) {
    throwCategoryNotFound();
  }

  const category = await Category.findById(categoryId);

  if (!category) {
    throwCategoryNotFound();
  }

  return category;
}

async function ensureCategoryIsUnique({ sport, nameKey, excludeCategoryId }) {
  const filter = {
    sport,
    nameKey,
  };

  if (excludeCategoryId) {
    filter._id = {
      $ne: excludeCategoryId,
    };
  }

  const existingCategory = await Category.exists(filter);

  if (existingCategory) {
    throwDuplicateCategory();
  }
}

export async function getPublicCategories({ sport }) {
  const filter = {
    isActive: true,
  };

  if (sport) {
    filter.sport = sport;
  }

  const categories = await Category.find(filter).sort({
    sport: 1,
    name: 1,
  });

  return categories.map(toCategoryResource);
}

export async function getAdminCategories({ q, sport, status }) {
  const filter = {};

  if (sport) {
    filter.sport = sport;
  }

  if (status === 'active') {
    filter.isActive = true;
  }

  if (status === 'inactive') {
    filter.isActive = false;
  }

  if (q) {
    const normalizedQuery = createNameKey(q);

    filter.nameKey = {
      $regex: escapeRegex(normalizedQuery),
      $options: 'i',
    };
  }

  const categories = await Category.find(filter).sort({
    sport: 1,
    name: 1,
  });

  return categories.map(toCategoryResource);
}

export async function createCategory(input) {
  const name = normalizeCategoryName(input.name);
  const nameKey = createNameKey(name);

  await ensureCategoryIsUnique({
    sport: input.sport,
    nameKey,
  });

  try {
    const category = await Category.create({
      name,
      nameKey,
      sport: input.sport,
      isActive: input.isActive,
    });

    return toCategoryResource(category);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throwDuplicateCategory();
    }

    throw error;
  }
}

export async function updateCategory(categoryId, changes) {
  const category = await getCategoryOrThrow(categoryId);

  const nextName = Object.prototype.hasOwnProperty.call(changes, 'name')
    ? normalizeCategoryName(changes.name)
    : category.name;

  const nextSport = changes.sport ?? category.sport;

  const nextNameKey = createNameKey(nextName);

  const sportIsChanging = nextSport !== category.sport;

  if (sportIsChanging) {
    const categoryHasActiveProducts = await hasActiveProducts(category._id);

    if (categoryHasActiveProducts) {
      throwCategorySportChangeConflict();
    }
  }

  await ensureCategoryIsUnique({
    sport: nextSport,
    nameKey: nextNameKey,
    excludeCategoryId: category._id,
  });

  category.name = nextName;
  category.nameKey = nextNameKey;
  category.sport = nextSport;

  try {
    await category.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throwDuplicateCategory();
    }

    throw error;
  }

  return toCategoryResource(category);
}

export async function updateCategoryStatus(categoryId, isActive) {
  const category = await getCategoryOrThrow(categoryId);

  const isBeingDeactivated = category.isActive === true && isActive === false;

  if (isBeingDeactivated) {
    const categoryHasActiveProducts = await hasActiveProducts(category._id);

    if (categoryHasActiveProducts) {
      throwCategoryInUse();
    }
  }

  category.isActive = isActive;

  await category.save();

  return toCategoryResource(category);
}
