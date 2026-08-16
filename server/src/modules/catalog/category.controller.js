import { SPORT_OPTIONS } from './catalog.constants.js';

import {
  validateCategoryCreateInput,
  validateCategoryUpdateInput,
  validateCategoryStatusInput,
  validatePublicCategoryQuery,
  validateAdminCategoryQuery,
} from './category.validation.js';

import {
  getPublicCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
} from './category.service.js';

export function getSports(req, res) {
  res.status(200).json({
    success: true,
    data: {
      items: SPORT_OPTIONS,
    },
  });
}

export async function getCategories(req, res) {
  const query = validatePublicCategoryQuery(req.query);

  const items = await getPublicCategories(query);

  res.status(200).json({
    success: true,
    data: {
      items,
    },
  });
}

export async function getCategoriesForAdmin(req, res) {
  const query = validateAdminCategoryQuery(req.query);

  const items = await getAdminCategories(query);

  res.status(200).json({
    success: true,
    data: {
      items,
    },
  });
}

export async function createCategoryForAdmin(req, res) {
  const input = validateCategoryCreateInput(req.body);

  const category = await createCategory(input);

  res.status(201).json({
    success: true,
    data: {
      category,
    },
  });
}

export async function updateCategoryForAdmin(req, res) {
  const input = validateCategoryUpdateInput(req.body);

  const category = await updateCategory(req.params.categoryId, input);

  res.status(200).json({
    success: true,
    data: {
      category,
    },
  });
}

export async function updateCategoryStatusForAdmin(req, res) {
  const input = validateCategoryStatusInput(req.body);

  const category = await updateCategoryStatus(
    req.params.categoryId,
    input.isActive,
  );

  res.status(200).json({
    success: true,
    data: {
      category,
    },
  });
}
