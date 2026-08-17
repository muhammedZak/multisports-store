import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { isSupportedSport } from '../catalog/catalog.constants.js';

import {
  INVENTORY_ADJUSTMENT_REASONS,
  STOCK_STATES,
  isManualInventoryAdjustmentReason,
} from './inventory.constants.js';

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

const ADMIN_MANUAL_INVENTORY_ADJUSTMENT_FIELDS = [
  'quantityChange',
  'reason',
  'note',
];

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

function validateObject(value, message = 'A valid query object is required.') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throwValidationError({
      request: message,
    });
  }
}

function rejectUnexpectedFields(
  input,
  allowedFields,
  message = 'Unsupported query fields were provided.',
) {
  const unexpectedFields = Object.keys(input).filter(
    (key) => !allowedFields.includes(key),
  );

  if (unexpectedFields.length > 0) {
    throwValidationError({
      request: message,
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

export function validateManualInventoryAdjustmentInput(input) {
  validateObject(input, 'A valid request body is required.');

  rejectUnexpectedFields(
    input,
    ADMIN_MANUAL_INVENTORY_ADJUSTMENT_FIELDS,
    'Unsupported inventory adjustment fields were provided.',
  );

  const fields = {};

  if (
    !Number.isSafeInteger(input.quantityChange) ||
    input.quantityChange === 0
  ) {
    fields.quantityChange = 'Quantity change must be a non-zero integer.';
  }

  let reason;

  if (typeof input.reason !== 'string' || !input.reason.trim()) {
    fields.reason = 'Adjustment reason is required.';
  } else {
    reason = input.reason.trim().toLowerCase();

    if (!isManualInventoryAdjustmentReason(reason)) {
      fields.reason = 'Reason must be restock or manual_correction.';
    }
  }

  let note;

  if (input.note !== undefined) {
    if (typeof input.note !== 'string') {
      fields.note = 'Note must be text.';
    } else {
      note = normalizeSingleLineText(input.note) || undefined;
    }
  }

  if (
    reason === INVENTORY_ADJUSTMENT_REASONS.RESTOCK &&
    Number.isSafeInteger(input.quantityChange) &&
    input.quantityChange <= 0
  ) {
    fields.quantityChange = 'Restock quantity change must be greater than 0.';
  }

  if (reason === INVENTORY_ADJUSTMENT_REASONS.MANUAL_CORRECTION && !note) {
    fields.note = 'A note is required for a manual inventory correction.';
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return {
    quantityChange: input.quantityChange,
    reason,
    ...(note ? { note } : {}),
  };
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
