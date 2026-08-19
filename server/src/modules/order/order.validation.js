import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { ORDER_STATUSES } from './order.model.js';

const CUSTOMER_ORDER_QUERY_FIELDS = [
  'page',
  'limit',
  'status',
  'sort',
  'order',
];

const ADMIN_ORDER_QUERY_FIELDS = [
  'page',
  'limit',
  'q',
  'status',
  'customerId',
  'dateFrom',
  'dateTo',
  'sort',
  'order',
];

const ADMIN_ORDER_STATUS_UPDATE_FIELDS = ['status'];

const ADMIN_ORDER_SORT_VALUES = ['placedAt'];

const ADMIN_ORDER_DIRECTION_VALUES = ['asc', 'desc'];

const CUSTOMER_ORDER_SORT_VALUES = ['placedAt'];
const CUSTOMER_ORDER_DIRECTION_VALUES = ['asc', 'desc'];
const CUSTOMER_ORDER_STATUS_VALUES = Object.values(ORDER_STATUSES);

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function normalizeSingleLineText(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function getOptionalAdminOrderText(value, fieldName, label) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throwValidationError({
      [fieldName]: `${label} must be text.`,
    });
  }

  const normalizedValue = normalizeSingleLineText(value);

  if (!normalizedValue) {
    return undefined;
  }

  if (normalizedValue.length > 100) {
    throwValidationError({
      [fieldName]: `${label} is too long.`,
    });
  }

  return normalizedValue;
}

function getAdminOrderObjectId(value, fieldName, label) {
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

function getCalendarDate(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throwValidationError({
      [fieldName]: `${fieldName} must use YYYY-MM-DD format.`,
    });
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throwValidationError({
      [fieldName]: `${fieldName} must use YYYY-MM-DD format.`,
    });
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  /*
   * Date.UTC normalizes impossible dates such as
   * 2026-02-31 into March, so verify every component.
   */
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throwValidationError({
      [fieldName]: `${fieldName} must be a valid calendar date.`,
    });
  }

  return date;
}

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
      request: 'Unsupported order query fields were provided.',
    });
  }
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

export function validateCustomerOrderQuery(query) {
  validateObject(query);

  rejectUnexpectedFields(query, CUSTOMER_ORDER_QUERY_FIELDS);

  const input = {
    page: getPositiveIntegerQuery(query.page, 'page', DEFAULT_PAGE),

    limit: getPositiveIntegerQuery(
      query.limit,
      'limit',
      DEFAULT_LIMIT,
      MAX_LIMIT,
    ),

    sort: 'placedAt',
    order: 'desc',
  };

  if (query.status !== undefined) {
    if (typeof query.status !== 'string' || !query.status.trim()) {
      throwValidationError({
        status: 'Order status is invalid.',
      });
    }

    const status = query.status.trim().toLowerCase();

    if (!CUSTOMER_ORDER_STATUS_VALUES.includes(status)) {
      throwValidationError({
        status:
          'Order status must be placed, confirmed, processing, shipped, delivered, or cancelled.',
      });
    }

    input.status = status;
  }

  if (query.sort !== undefined) {
    if (
      typeof query.sort !== 'string' ||
      !CUSTOMER_ORDER_SORT_VALUES.includes(query.sort)
    ) {
      throwValidationError({
        sort: 'Sort must be placedAt.',
      });
    }

    input.sort = query.sort;
  }

  if (query.order !== undefined) {
    if (
      typeof query.order !== 'string' ||
      !CUSTOMER_ORDER_DIRECTION_VALUES.includes(query.order)
    ) {
      throwValidationError({
        order: 'Order must be asc or desc.',
      });
    }

    input.order = query.order;
  }

  return input;
}

export function validateCustomerOrderCancellationInput(input) {
  if (input === undefined) {
    return;
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throwValidationError({
      request: 'Order cancellation does not accept request fields.',
    });
  }

  if (Object.keys(input).length > 0) {
    throwValidationError({
      request: 'Order cancellation does not accept request fields.',
    });
  }
}

export function validateAdminOrderQuery(query) {
  validateObject(query);

  rejectUnexpectedFields(query, ADMIN_ORDER_QUERY_FIELDS);

  const input = {
    page: getPositiveIntegerQuery(query.page, 'page', DEFAULT_PAGE),

    limit: getPositiveIntegerQuery(
      query.limit,
      'limit',
      DEFAULT_LIMIT,
      MAX_LIMIT,
    ),

    sort: 'placedAt',

    order: 'desc',
  };

  const q = getOptionalAdminOrderText(query.q, 'q', 'Order search value');

  const customerId = getAdminOrderObjectId(
    query.customerId,
    'customerId',
    'Customer ID',
  );

  const dateFrom = getCalendarDate(query.dateFrom, 'dateFrom');

  const dateTo = getCalendarDate(query.dateTo, 'dateTo');

  if (q) {
    /*
     * Order numbers are stored uppercase.
     * Normalizing here keeps the API predictable.
     */
    input.q = q.toUpperCase();
  }

  if (customerId) {
    input.customerId = customerId;
  }

  if (query.status !== undefined) {
    if (typeof query.status !== 'string' || !query.status.trim()) {
      throwValidationError({
        status: 'Order status is invalid.',
      });
    }

    const status = query.status.trim().toLowerCase();

    if (!CUSTOMER_ORDER_STATUS_VALUES.includes(status)) {
      throwValidationError({
        status:
          'Order status must be placed, confirmed, processing, shipped, delivered, or cancelled.',
      });
    }

    input.status = status;
  }

  if (dateFrom) {
    input.dateFrom = dateFrom;
  }

  if (dateTo) {
    input.dateTo = dateTo;
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throwValidationError({
      dateTo: 'dateTo must be on or after dateFrom.',
    });
  }

  if (query.sort !== undefined) {
    if (
      typeof query.sort !== 'string' ||
      !ADMIN_ORDER_SORT_VALUES.includes(query.sort)
    ) {
      throwValidationError({
        sort: 'Sort must be placedAt.',
      });
    }

    input.sort = query.sort;
  }

  if (query.order !== undefined) {
    if (
      typeof query.order !== 'string' ||
      !ADMIN_ORDER_DIRECTION_VALUES.includes(query.order)
    ) {
      throwValidationError({
        order: 'Order must be asc or desc.',
      });
    }

    input.order = query.order;
  }

  return input;
}

export function validateAdminOrderStatusUpdateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throwValidationError({
      request: 'A valid request body is required.',
    });
  }

  const unexpectedFields = Object.keys(input).filter(
    (field) => !ADMIN_ORDER_STATUS_UPDATE_FIELDS.includes(field),
  );

  if (unexpectedFields.length > 0) {
    throwValidationError({
      request: 'Unsupported Order status update fields were provided.',
    });
  }

  if (typeof input.status !== 'string' || !input.status.trim()) {
    throwValidationError({
      status: 'Order status is required.',
    });
  }

  const status = input.status.trim().toLowerCase();

  if (!CUSTOMER_ORDER_STATUS_VALUES.includes(status)) {
    throwValidationError({
      status:
        'Order status must be placed, confirmed, processing, shipped, delivered, or cancelled.',
    });
  }

  return {
    status,
  };
}