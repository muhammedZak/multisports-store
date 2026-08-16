import { AppError } from '../../utils/AppError.js';

import { Category } from './category.model.js';
import { validateProductDiscountState } from './product.validation.js';

function throwCategoryNotFound() {
  throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
}

function throwCategorySportMismatch() {
  throw new AppError(
    422,
    'CATEGORY_SPORT_MISMATCH',
    'The selected category does not belong to the selected sport.',
    {
      categoryId: 'Select a category that belongs to the product sport.',
    },
  );
}

function throwInactiveCategory() {
  throw new AppError(
    422,
    'VALIDATION_ERROR',
    'Please correct the invalid fields.',
    {
      categoryId: 'An active product must belong to an active category.',
    },
  );
}

export async function ensureProductCategoryIntegrity({
  categoryId,
  sport,
  isActive,
}) {
  const category = await Category.findById(categoryId);

  if (!category) {
    throwCategoryNotFound();
  }

  if (category.sport !== sport) {
    throwCategorySportMismatch();
  }

  if (isActive && !category.isActive) {
    throwInactiveCategory();
  }

  return category;
}

export async function validateProductCatalogState({
  categoryId,
  sport,
  isActive,
  basePrice,
  discountType,
  discountValue,
}) {
  validateProductDiscountState({
    basePrice,
    discountType,
    discountValue,
  });

  await ensureProductCategoryIntegrity({
    categoryId,
    sport,
    isActive,
  });
}
