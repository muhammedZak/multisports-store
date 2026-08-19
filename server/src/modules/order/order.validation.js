import { AppError } from '../../utils/AppError.js';

import { ORDER_STATUSES } from './order.model.js';

const CUSTOMER_ORDER_QUERY_FIELDS = [
  'page',
  'limit',
  'status',
  'sort',
  'order',
];

const CUSTOMER_ORDER_SORT_VALUES = ['placedAt'];
const CUSTOMER_ORDER_DIRECTION_VALUES = ['asc', 'desc'];
const CUSTOMER_ORDER_STATUS_VALUES = Object.values(ORDER_STATUSES);

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
