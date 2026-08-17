import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { isSupportedSport } from '../catalog/catalog.constants.js';

import { STOCK_STATES } from './inventory.constants.js';

const ADMIN_INVENTORY_QUERY_FIELDS = [
  'page',
  'limit',
  'q',
  'sport',
  'categoryId',
  'stockState',
  'productId',
  'sort',
  'order',
];

const ADMIN_INVENTORY_SORT_VALUES = ['quantity', 'updatedAt'];
const ADMIN_INVENTORY_ORDER_VALUES = ['asc', 'desc'];
const ADMIN_INVENTORY_STOCK_STATE_VALUES = Object.values(STOCK_STATES);

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function throwValidationError(fields) {
  throw new AppError(
    422,
    'VALIDATION_ERROR',
    'Please correct the invalid fields.',
    fields,
  );
}

function validateObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throwValidationError({
      request: 'A valid query object is required.',
    });
  }
}

function rejectUnexpectedFields(input, allowedFields) {
  const unexpectedFields = Object.keys(input).filter(
    (key) => !allowedFields.includes(key),
  );

  if (unexpectedFields.length > 0) {
    throwValidationError({
      request: 'Unsupported query fields were provided.',
    });
  }
}

function normalizeSingleLineText(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function getPositiveIntegerQuery(value, fieldName, defaultValue, max = null) {
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

  if (max !== null && parsedValue > max) {
    throwValidationError({
      [fieldName]: `${fieldName} must not be greater than ${max}.`,
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

function getOptionalObjectIdQuery(value, fieldName, label) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) {
    throwValidationError({
      [fieldName]: `${label} is invalid.`,
    });
  }

  return value;
}

function getOptionalSport(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !value.trim()) {
    throwValidationError({
      sport: 'Sport is invalid.',
    });
  }

  const sport = value.trim().toLowerCase();

  if (!isSupportedSport(sport)) {
    throwValidationError({
      sport: 'Select a supported sport.',
    });
  }

  return sport;
}

export function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

export function isNonZeroInteger(value) {
  return Number.isInteger(value) && value !== 0;
}

export function hasConsistentAdjustmentArithmetic({
  previousQuantity,
  quantityChange,
  newQuantity,
}) {
  if (
    !isNonNegativeInteger(previousQuantity) ||
    !isNonZeroInteger(quantityChange) ||
    !isNonNegativeInteger(newQuantity)
  ) {
    return false;
  }

  return previousQuantity + quantityChange === newQuantity;
}

export function validateAdminInventoryQuery(query) {
  validateObject(query);

  rejectUnexpectedFields(query, ADMIN_INVENTORY_QUERY_FIELDS);

  const input = {
    page: getPositiveIntegerQuery(query.page, 'page', DEFAULT_PAGE),

    limit: getPositiveIntegerQuery(
      query.limit,
      'limit',
      DEFAULT_LIMIT,
      MAX_LIMIT,
    ),

    sort: 'updatedAt',
    order: 'desc',
  };

  const q = getOptionalQueryText(query.q, 'q', 'Search value');

  const sport = getOptionalSport(query.sport);

  const categoryId = getOptionalObjectIdQuery(
    query.categoryId,
    'categoryId',
    'Category ID',
  );

  const productId = getOptionalObjectIdQuery(
    query.productId,
    'productId',
    'Product ID',
  );

  if (q) {
    input.q = q;
  }

  if (sport) {
    input.sport = sport;
  }

  if (categoryId) {
    input.categoryId = categoryId;
  }

  if (productId) {
    input.productId = productId;
  }

  if (query.stockState !== undefined) {
    if (typeof query.stockState !== 'string') {
      throwValidationError({
        stockState: 'Stock state must be text.',
      });
    }

    const stockState = query.stockState.trim().toLowerCase();

    if (!ADMIN_INVENTORY_STOCK_STATE_VALUES.includes(stockState)) {
      throwValidationError({
        stockState: 'Stock state must be in_stock, low_stock, or out_of_stock.',
      });
    }

    input.stockState = stockState;
  }

  if (query.sort !== undefined) {
    if (
      typeof query.sort !== 'string' ||
      !ADMIN_INVENTORY_SORT_VALUES.includes(query.sort)
    ) {
      throwValidationError({
        sort: 'Sort must be quantity or updatedAt.',
      });
    }

    input.sort = query.sort;
  }

  if (query.order !== undefined) {
    if (
      typeof query.order !== 'string' ||
      !ADMIN_INVENTORY_ORDER_VALUES.includes(query.order)
    ) {
      throwValidationError({
        order: 'Order must be asc or desc.',
      });
    }

    input.order = query.order;
  }

  return input;
}
