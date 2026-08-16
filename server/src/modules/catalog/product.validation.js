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
