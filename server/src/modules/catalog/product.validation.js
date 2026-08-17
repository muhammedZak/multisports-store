import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { isSupportedSport } from './catalog.constants.js';

const CREATE_PRODUCT_FIELDS = [
  'name',
  'description',
  'brand',
  'sport',
  'categoryId',
  'basePrice',
  'discountType',
  'discountValue',
  'specifications',
  'initialQuantity',
  'variants',
  'isActive',
];

const CREATE_INITIAL_VARIANT_FIELDS = [
  'options',
  'initialQuantity',
  'isActive',
];

const UPDATE_PRODUCT_FIELDS = [
  'name',
  'description',
  'brand',
  'sport',
  'categoryId',
  'basePrice',
  'discountType',
  'discountValue',
  'specifications',
];

const UPDATE_STATUS_FIELDS = ['isActive'];

const PRODUCT_CREATE_MULTIPART_FIELDS = ['data'];

const ADMIN_PRODUCT_QUERY_FIELDS = [
  'page',
  'limit',
  'q',
  'sport',
  'categoryId',
  'brand',
  'status',
  'sort',
  'order',
];

const ADMIN_PRODUCT_SORT_VALUES = ['createdAt', 'name', 'basePrice'];

const ADMIN_PRODUCT_ORDER_VALUES = ['asc', 'desc'];

const PUBLIC_PRODUCT_QUERY_FIELDS = [
  'page',
  'limit',
  'q',
  'sport',
  'categoryId',
  'brand',
  'minPrice',
  'maxPrice',
  'size',
  'color',
  'sort',
  'order',
];

const CATALOG_FILTER_OPTIONS_QUERY_FIELDS = ['q', 'sport', 'categoryId'];

const PUBLIC_PRODUCT_SORT_VALUES = ['createdAt', 'price'];

const PUBLIC_PRODUCT_ORDER_VALUES = ['asc', 'desc'];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const UPDATE_PRODUCT_IMAGE_FIELDS = ['altText', 'isPrimary', 'sortOrder'];

const CREATE_PRODUCT_VARIANT_FIELDS = [
  'options',
  'initialQuantity',
  'isActive',
];

const UPDATE_PRODUCT_VARIANT_FIELDS = ['options'];

const UPDATE_PRODUCT_VARIANT_STATUS_FIELDS = ['isActive'];

function throwValidationError(fields) {
  throw new AppError(
    422,
    'VALIDATION_ERROR',
    'Please correct the invalid fields.',
    fields,
  );
}

function throwInvalidSport() {
  throw new AppError(422, 'INVALID_SPORT', 'Sport is not supported.', {
    sport: 'Select a supported sport.',
  });
}

function throwCategoryNotFound() {
  throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
}

function throwInvalidPrice() {
  throw new AppError(422, 'INVALID_PRICE', 'Product price is invalid.', {
    basePrice: 'Base price must be a positive integer in paise.',
  });
}

function throwInvalidDiscount(message) {
  throw new AppError(422, 'INVALID_DISCOUNT', 'Product discount is invalid.', {
    discountValue: message,
  });
}

function throwInventoryModeConflict() {
  throw new AppError(
    422,
    'INVENTORY_MODE_CONFLICT',
    'Product inventory configuration is invalid.',
    {
      inventory:
        'Use initialQuantity for a simple Product or variants for a Variant Product, not both.',
    },
  );
}

function throwDuplicateInitialVariant() {
  throw new AppError(
    409,
    'DUPLICATE_VARIANT',
    'A variant with the same option combination already exists.',
    {
      options: 'Use a different variant option combination.',
    },
  );
}

function validateObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throwValidationError({
      request: 'A valid JSON object is required.',
    });
  }
}

function rejectUnexpectedFields(input, allowedFields) {
  const unexpectedFields = Object.keys(input).filter(
    (key) => !allowedFields.includes(key),
  );

  if (unexpectedFields.length > 0) {
    throwValidationError({
      request: 'Unsupported fields were provided.',
    });
  }
}

function normalizeSingleLineText(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function getRequiredText(body, fieldName, label, fields, options = {}) {
  const value =
    typeof body[fieldName] === 'string' ? body[fieldName].trim() : '';

  if (!value) {
    fields[fieldName] = `${label} is required.`;

    return null;
  }

  if (options.collapseWhitespace) {
    return normalizeSingleLineText(value);
  }

  return value;
}

function getRequiredSport(body, fields) {
  if (typeof body.sport !== 'string' || !body.sport.trim()) {
    fields.sport = 'Sport is required.';

    return null;
  }

  const sport = body.sport.trim().toLowerCase();

  if (!isSupportedSport(sport)) {
    throwInvalidSport();
  }

  return sport;
}

function getOptionalSport(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !value.trim()) {
    throwInvalidSport();
  }

  const sport = value.trim().toLowerCase();

  if (!isSupportedSport(sport)) {
    throwInvalidSport();
  }

  return sport;
}

function getRequiredCategoryId(value) {
  if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) {
    throwCategoryNotFound();
  }

  return value;
}

function getOptionalCategoryId(value) {
  if (value === undefined) {
    return undefined;
  }

  return getRequiredCategoryId(value);
}

function getRequiredBasePrice(value) {
  if (!Number.isInteger(value) || value <= 0) {
    throwInvalidPrice();
  }

  return value;
}

function getOptionalBasePrice(value) {
  if (value === undefined) {
    return undefined;
  }

  return getRequiredBasePrice(value);
}

function getDiscountType(value) {
  if (value === null) {
    return null;
  }

  if (
    typeof value !== 'string' ||
    !['percentage', 'fixed'].includes(value.trim().toLowerCase())
  ) {
    throwInvalidDiscount('Discount type must be percentage, fixed, or empty.');
  }

  return value.trim().toLowerCase();
}

function getOptionalDiscountType(value) {
  if (value === undefined) {
    return undefined;
  }

  return getDiscountType(value);
}

function getDiscountValue(value) {
  if (value === null) {
    return null;
  }

  if (!Number.isInteger(value)) {
    throwInvalidDiscount('Discount value must be an integer.');
  }

  return value;
}

function getOptionalDiscountValue(value) {
  if (value === undefined) {
    return undefined;
  }

  return getDiscountValue(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getVariantOptions(value) {
  if (!isPlainObject(value) || Object.keys(value).length === 0) {
    throwValidationError({
      options: 'Variant options must be a non-empty object.',
    });
  }

  const normalizedEntries = [];
  const optionNameKeys = new Set();

  for (const [rawOptionName, rawOptionValue] of Object.entries(value)) {
    const optionName = normalizeSingleLineText(rawOptionName);

    if (!optionName) {
      throwValidationError({
        options: 'Every variant option must have a name.',
      });
    }

    if (optionName.startsWith('$') || optionName.includes('.')) {
      throwValidationError({
        options: 'Variant option names cannot start with $ or contain dots.',
      });
    }

    if (typeof rawOptionValue !== 'string') {
      throwValidationError({
        options: 'Variant option values must be text.',
      });
    }

    const optionValue = normalizeSingleLineText(rawOptionValue);

    if (!optionValue) {
      throwValidationError({
        options: 'Variant option values cannot be empty.',
      });
    }

    const optionNameKey = optionName.toLowerCase();

    if (optionNameKeys.has(optionNameKey)) {
      throwValidationError({
        options: 'Variant option names must be unique.',
      });
    }

    optionNameKeys.add(optionNameKey);

    normalizedEntries.push([optionName, optionValue]);
  }

  return Object.fromEntries(normalizedEntries);
}

function getInitialQuantity(value, fieldName = 'initialQuantity') {
  if (!Number.isSafeInteger(value) || value < 0) {
    throwValidationError({
      [fieldName]: 'Initial quantity must be a non-negative integer.',
    });
  }

  return value;
}

function getNormalizedInitialVariantKey(options) {
  const normalizedEntries = Object.entries(options)
    .map(([optionName, optionValue]) => [
      normalizeSingleLineText(optionName).toLowerCase(),
      normalizeSingleLineText(optionValue).toLowerCase(),
    ])
    .sort(([leftName], [rightName]) => leftName.localeCompare(rightName));

  return JSON.stringify(normalizedEntries);
}

function getInitialProductVariants(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throwValidationError({
      variants: 'Add at least one Variant.',
    });
  }

  const normalizedVariants = [];
  const seenVariantKeys = new Set();

  for (let index = 0; index < value.length; index += 1) {
    const variant = value[index];

    if (!isPlainObject(variant)) {
      throwValidationError({
        variants: `Variant ${index + 1} must be an object.`,
      });
    }

    const unexpectedFields = Object.keys(variant).filter(
      (field) => !CREATE_INITIAL_VARIANT_FIELDS.includes(field),
    );

    if (unexpectedFields.length > 0) {
      throwValidationError({
        variants: `Variant ${index + 1} contains unsupported fields.`,
      });
    }

    const options = getVariantOptions(variant.options);

    const initialQuantity = getInitialQuantity(
      variant.initialQuantity,
      'initialQuantity',
    );

    if (typeof variant.isActive !== 'boolean') {
      throwValidationError({
        variants: `Variant ${index + 1} active status must be true or false.`,
      });
    }

    const variantKey = getNormalizedInitialVariantKey(options);

    if (seenVariantKeys.has(variantKey)) {
      throwDuplicateInitialVariant();
    }

    seenVariantKeys.add(variantKey);

    normalizedVariants.push({
      options,
      initialQuantity,
      isActive: variant.isActive,
    });
  }

  return normalizedVariants;
}

function getSpecifications(value) {
  if (!isPlainObject(value)) {
    throwValidationError({
      specifications: 'Specifications must be a simple key/value object.',
    });
  }

  const hasInvalidValue = Object.values(value).some((specificationValue) => {
    if (typeof specificationValue === 'string') {
      return false;
    }

    if (typeof specificationValue === 'boolean') {
      return false;
    }

    if (typeof specificationValue === 'number') {
      return !Number.isFinite(specificationValue);
    }

    return true;
  });

  if (hasInvalidValue) {
    throwValidationError({
      specifications:
        'Specification values must be text, numbers, or true/false values.',
    });
  }

  return value;
}

function getOptionalSpecifications(value) {
  if (value === undefined) {
    return undefined;
  }

  return getSpecifications(value);
}

function getPositiveIntegerQuery(
  value,
  fieldName,
  defaultValue,
  maximum = null,
) {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throwValidationError({
      [fieldName]: `${fieldName} must be a positive integer.`,
    });
  }

  const parsedValue = Number(value);

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    throwValidationError({
      [fieldName]: `${fieldName} must be a positive integer.`,
    });
  }

  if (maximum !== null && parsedValue > maximum) {
    throwValidationError({
      [fieldName]: `${fieldName} cannot exceed ${maximum}.`,
    });
  }

  return parsedValue;
}

function getOptionalQueryText(value, fieldName, label) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throwValidationError({
      [fieldName]: `${label} must be text.`,
    });
  }

  const normalizedValue = normalizeSingleLineText(value);

  return normalizedValue || undefined;
}

function getOptionalNonNegativeIntegerQuery(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throwValidationError({
      [fieldName]: `${fieldName} must be a non-negative integer in paise.`,
    });
  }

  const parsedValue = Number(value);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) {
    throwValidationError({
      [fieldName]: `${fieldName} must be a non-negative integer in paise.`,
    });
  }

  return parsedValue;
}

export function validateProductDiscountState({
  basePrice,
  discountType,
  discountValue,
}) {
  if (discountType === null) {
    if (discountValue !== null) {
      throwInvalidDiscount(
        'Discount value must be empty when no discount is selected.',
      );
    }

    return;
  }

  if (!['percentage', 'fixed'].includes(discountType)) {
    throwInvalidDiscount('Discount type must be percentage or fixed.');
  }

  if (!Number.isInteger(discountValue)) {
    throwInvalidDiscount('A valid discount value is required.');
  }

  if (discountType === 'percentage') {
    if (discountValue <= 0 || discountValue > 100) {
      throwInvalidDiscount('Percentage discount must be between 1 and 100.');
    }

    return;
  }

  if (discountValue <= 0 || discountValue >= basePrice) {
    throwInvalidDiscount(
      'Fixed discount must be greater than zero and below the base price.',
    );
  }
}

export function validateProductCreateInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, CREATE_PRODUCT_FIELDS);

  const fields = {};

  const name = getRequiredText(body, 'name', 'Product name', fields, {
    collapseWhitespace: true,
  });

  const description = getRequiredText(
    body,
    'description',
    'Description',
    fields,
  );

  const brand = getRequiredText(body, 'brand', 'Brand', fields, {
    collapseWhitespace: true,
  });

  const sport = getRequiredSport(body, fields);

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  const categoryId = getRequiredCategoryId(body.categoryId);

  const basePrice = getRequiredBasePrice(body.basePrice);

  const discountType =
    body.discountType === undefined ? null : getDiscountType(body.discountType);

  const discountValue =
    body.discountValue === undefined
      ? null
      : getDiscountValue(body.discountValue);

  validateProductDiscountState({
    basePrice,
    discountType,
    discountValue,
  });

  const specifications =
    body.specifications === undefined
      ? {}
      : getSpecifications(body.specifications);

  if (typeof body.isActive !== 'boolean') {
    throwValidationError({
      isActive: 'Active status must be true or false.',
    });
  }

  const hasInitialQuantity = Object.prototype.hasOwnProperty.call(
    body,
    'initialQuantity',
  );

  const hasVariants = Object.prototype.hasOwnProperty.call(body, 'variants');

  if (hasInitialQuantity && hasVariants) {
    throwInventoryModeConflict();
  }

  if (!hasInitialQuantity && !hasVariants) {
    throwValidationError({
      inventory:
        'Choose a simple Product initial quantity or provide initial Variants.',
    });
  }

  const inventoryConfiguration = hasVariants
    ? {
        variants: getInitialProductVariants(body.variants),
      }
    : {
        initialQuantity: getInitialQuantity(body.initialQuantity),
      };

  return {
    name,
    description,
    brand,
    sport,
    categoryId,
    basePrice,
    discountType,
    discountValue,
    specifications,
    ...inventoryConfiguration,
    isActive: body.isActive,
  };
}

export function validateProductUpdateInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, UPDATE_PRODUCT_FIELDS);

  if (Object.keys(body).length === 0) {
    throwValidationError({
      request: 'Provide at least one product field to update.',
    });
  }

  const fields = {};
  const input = {};

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    const name = getRequiredText(body, 'name', 'Product name', fields, {
      collapseWhitespace: true,
    });

    if (name) {
      input.name = name;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'description')) {
    const description = getRequiredText(
      body,
      'description',
      'Description',
      fields,
    );

    if (description) {
      input.description = description;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'brand')) {
    const brand = getRequiredText(body, 'brand', 'Brand', fields, {
      collapseWhitespace: true,
    });

    if (brand) {
      input.brand = brand;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'sport')) {
    input.sport = getOptionalSport(body.sport);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'categoryId')) {
    input.categoryId = getOptionalCategoryId(body.categoryId);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'basePrice')) {
    input.basePrice = getOptionalBasePrice(body.basePrice);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'discountType')) {
    input.discountType = getOptionalDiscountType(body.discountType);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'discountValue')) {
    input.discountValue = getOptionalDiscountValue(body.discountValue);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'specifications')) {
    input.specifications = getOptionalSpecifications(body.specifications);
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return input;
}

export function validateProductStatusInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, UPDATE_STATUS_FIELDS);

  if (typeof body.isActive !== 'boolean') {
    throwValidationError({
      isActive: 'Active status must be true or false.',
    });
  }

  return {
    isActive: body.isActive,
  };
}

export function validateProductImageUpdateInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, UPDATE_PRODUCT_IMAGE_FIELDS);

  if (Object.keys(body).length === 0) {
    throwValidationError({
      request: 'Provide at least one image field to update.',
    });
  }

  const fields = {};
  const input = {};

  if (Object.prototype.hasOwnProperty.call(body, 'altText')) {
    if (typeof body.altText !== 'string' || !body.altText.trim()) {
      fields.altText = 'Image alt text is required.';
    } else {
      input.altText = body.altText.trim();
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'isPrimary')) {
    if (body.isPrimary !== true) {
      fields.isPrimary =
        'To change the primary image, set another image as primary.';
    } else {
      input.isPrimary = true;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'sortOrder')) {
    if (!Number.isSafeInteger(body.sortOrder) || body.sortOrder < 0) {
      fields.sortOrder = 'Image sort order must be a non-negative integer.';
    } else {
      input.sortOrder = body.sortOrder;
    }
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return input;
}

export function validateProductCreateMultipartInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, PRODUCT_CREATE_MULTIPART_FIELDS);

  if (typeof body.data !== 'string' || !body.data.trim()) {
    throwValidationError({
      data: 'Product data is required.',
    });
  }

  let parsedData;

  try {
    parsedData = JSON.parse(body.data);
  } catch {
    throwValidationError({
      data: 'Product data must contain valid JSON.',
    });
  }

  return validateProductCreateInput(parsedData);
}

export function validateAdminProductQuery(query) {
  validateObject(query);

  rejectUnexpectedFields(query, ADMIN_PRODUCT_QUERY_FIELDS);

  const input = {
    page: getPositiveIntegerQuery(query.page, 'page', DEFAULT_PAGE),

    limit: getPositiveIntegerQuery(
      query.limit,
      'limit',
      DEFAULT_LIMIT,
      MAX_LIMIT,
    ),

    sport: getOptionalSport(query.sport),

    categoryId: getOptionalCategoryId(query.categoryId),

    sort: 'createdAt',

    order: 'desc',
  };

  if (query.q !== undefined) {
    if (typeof query.q !== 'string') {
      throwValidationError({
        q: 'Search value must be text.',
      });
    }

    const q = query.q.trim();

    if (q) {
      input.q = q;
    }
  }

  if (query.brand !== undefined) {
    if (typeof query.brand !== 'string') {
      throwValidationError({
        brand: 'Brand must be text.',
      });
    }

    const brand = normalizeSingleLineText(query.brand);

    if (brand) {
      input.brand = brand;
    }
  }

  if (query.status !== undefined) {
    if (
      typeof query.status !== 'string' ||
      !['active', 'inactive'].includes(query.status)
    ) {
      throwValidationError({
        status: 'Status must be active or inactive.',
      });
    }

    input.status = query.status;
  }

  if (query.sort !== undefined) {
    if (
      typeof query.sort !== 'string' ||
      !ADMIN_PRODUCT_SORT_VALUES.includes(query.sort)
    ) {
      throwValidationError({
        sort: 'Sort must be createdAt, name, or basePrice.',
      });
    }

    input.sort = query.sort;
  }

  if (query.order !== undefined) {
    if (
      typeof query.order !== 'string' ||
      !ADMIN_PRODUCT_ORDER_VALUES.includes(query.order)
    ) {
      throwValidationError({
        order: 'Order must be asc or desc.',
      });
    }

    input.order = query.order;
  }

  return input;
}

export function validatePublicProductQuery(query) {
  validateObject(query);

  rejectUnexpectedFields(query, PUBLIC_PRODUCT_QUERY_FIELDS);

  const minPrice = getOptionalNonNegativeIntegerQuery(
    query.minPrice,
    'minPrice',
  );

  const maxPrice = getOptionalNonNegativeIntegerQuery(
    query.maxPrice,
    'maxPrice',
  );

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throwValidationError({
      minPrice: 'Minimum price cannot be greater than maximum price.',
    });
  }

  const input = {
    page: getPositiveIntegerQuery(query.page, 'page', DEFAULT_PAGE),

    limit: getPositiveIntegerQuery(
      query.limit,
      'limit',
      DEFAULT_LIMIT,
      MAX_LIMIT,
    ),

    sport: getOptionalSport(query.sport),

    categoryId: getOptionalCategoryId(query.categoryId),

    sort: 'createdAt',

    order: 'desc',
  };

  const q = getOptionalQueryText(query.q, 'q', 'Search value');

  const brand = getOptionalQueryText(query.brand, 'brand', 'Brand');

  const size = getOptionalQueryText(query.size, 'size', 'Size');

  const color = getOptionalQueryText(query.color, 'color', 'Color');

  if (q) {
    input.q = q;
  }

  if (brand) {
    input.brand = brand;
  }

  if (minPrice !== undefined) {
    input.minPrice = minPrice;
  }

  if (maxPrice !== undefined) {
    input.maxPrice = maxPrice;
  }

  if (size) {
    input.size = size;
  }

  if (color) {
    input.color = color;
  }

  if (query.sort !== undefined) {
    if (
      typeof query.sort !== 'string' ||
      !PUBLIC_PRODUCT_SORT_VALUES.includes(query.sort)
    ) {
      throwValidationError({
        sort: 'Sort must be createdAt or price.',
      });
    }

    input.sort = query.sort;
  }

  if (query.order !== undefined) {
    if (
      typeof query.order !== 'string' ||
      !PUBLIC_PRODUCT_ORDER_VALUES.includes(query.order)
    ) {
      throwValidationError({
        order: 'Order must be asc or desc.',
      });
    }

    input.order = query.order;
  }

  return input;
}

export function validateCatalogFilterOptionsQuery(query) {
  validateObject(query);

  rejectUnexpectedFields(query, CATALOG_FILTER_OPTIONS_QUERY_FIELDS);

  const input = {
    sport: getOptionalSport(query.sport),

    categoryId: getOptionalCategoryId(query.categoryId),
  };

  const q = getOptionalQueryText(query.q, 'q', 'Search value');

  if (q) {
    input.q = q;
  }

  return input;
}

export function validateProductVariantCreateInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, CREATE_PRODUCT_VARIANT_FIELDS);

  const options = getVariantOptions(body.options);

  const initialQuantity = getInitialQuantity(body.initialQuantity);

  if (typeof body.isActive !== 'boolean') {
    throwValidationError({
      isActive: 'Variant active status must be true or false.',
    });
  }

  return {
    options,
    initialQuantity,
    isActive: body.isActive,
  };
}

export function validateProductVariantUpdateInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, UPDATE_PRODUCT_VARIANT_FIELDS);

  if (Object.keys(body).length === 0) {
    throwValidationError({
      request: 'Provide variant options to update.',
    });
  }

  return {
    options: getVariantOptions(body.options),
  };
}

export function validateProductVariantStatusInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, UPDATE_PRODUCT_VARIANT_STATUS_FIELDS);

  if (typeof body.isActive !== 'boolean') {
    throwValidationError({
      isActive: 'Variant active status must be true or false.',
    });
  }

  return {
    isActive: body.isActive,
  };
}
