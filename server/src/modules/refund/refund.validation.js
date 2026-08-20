import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import {
  REFUND_ORIGIN_VALUES,
  REFUND_SCOPES,
  REFUND_STATUS_VALUES,
} from './refund.constants.js';

const CUSTOMER_REFUND_REQUEST_FIELDS = [
  'scope',
  'orderItemIds',
  'reason',
  'explanation',
];

const CUSTOMER_REFUND_QUERY_FIELDS = [
  'page',
  'limit',
  'status',
  'origin',
  'orderId',
  'sort',
  'order',
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

function throwRefundScopeInvalid(fields) {
  throw new AppError(
    422,
    'REFUND_SCOPE_INVALID',
    'Refund scope is invalid.',
    fields,
  );
}

function validateObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throwValidationError({
      request: message,
    });
  }
}

function rejectUnexpectedFields(input, allowedFields, message) {
  const unexpectedFields = Object.keys(input).filter(
    (field) => !allowedFields.includes(field),
  );

  if (unexpectedFields.length > 0) {
    throwValidationError({
      request: message,
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

function getOptionalEnumQuery(value, fieldName, values) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !value.trim()) {
    throwValidationError({
      [fieldName]: `${fieldName} is invalid.`,
    });
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!values.includes(normalizedValue)) {
    throwValidationError({
      [fieldName]: `${fieldName} is invalid.`,
    });
  }

  return normalizedValue;
}

export function validateCustomerRefundRequestInput(input) {
  validateObject(input, 'A valid Refund request body is required.');

  rejectUnexpectedFields(
    input,
    CUSTOMER_REFUND_REQUEST_FIELDS,
    'Unsupported Refund request fields were provided.',
  );

  if (typeof input.scope !== 'string' || !input.scope.trim()) {
    throwRefundScopeInvalid({
      scope: 'Refund scope is required.',
    });
  }

  const scope = input.scope.trim().toLowerCase();

  if (scope !== REFUND_SCOPES.ORDER && scope !== REFUND_SCOPES.ITEMS) {
    throwRefundScopeInvalid({
      scope: 'Refund scope must be order or items.',
    });
  }

  const hasOrderItemIds = Object.prototype.hasOwnProperty.call(
    input,
    'orderItemIds',
  );

  let orderItemIds;

  if (scope === REFUND_SCOPES.ORDER && hasOrderItemIds) {
    throwRefundScopeInvalid({
      orderItemIds: 'Whole-Order Refunds cannot include Order item IDs.',
    });
  }

  if (scope === REFUND_SCOPES.ITEMS) {
    if (!Array.isArray(input.orderItemIds) || input.orderItemIds.length === 0) {
      throwRefundScopeInvalid({
        orderItemIds: 'Select at least one Order item to refund.',
      });
    }

    orderItemIds = input.orderItemIds.map((itemId) => {
      if (
        typeof itemId !== 'string' ||
        !mongoose.Types.ObjectId.isValid(itemId.trim())
      ) {
        throwValidationError({
          orderItemIds: 'Every Order item ID must be valid.',
        });
      }

      return itemId.trim().toLowerCase();
    });

    if (new Set(orderItemIds).size !== orderItemIds.length) {
      throwRefundScopeInvalid({
        orderItemIds: 'Order item IDs must not contain duplicates.',
      });
    }
  }

  if (typeof input.reason !== 'string' || !input.reason.trim()) {
    throwValidationError({
      reason: 'Refund reason is required.',
    });
  }

  const reason = input.reason.trim();

  let explanation;

  if (Object.prototype.hasOwnProperty.call(input, 'explanation')) {
    if (typeof input.explanation !== 'string') {
      throwValidationError({
        explanation: 'Refund explanation must be text.',
      });
    }

    explanation = input.explanation.trim() || undefined;
  }

  return {
    scope,
    ...(orderItemIds ? { orderItemIds } : {}),
    reason,
    ...(explanation ? { explanation } : {}),
  };
}

export function validateCustomerRefundQuery(query) {
  validateObject(query, 'A valid Refund query object is required.');

  rejectUnexpectedFields(
    query,
    CUSTOMER_REFUND_QUERY_FIELDS,
    'Unsupported Refund query fields were provided.',
  );

  const input = {
    page: getPositiveIntegerQuery(query.page, 'page', DEFAULT_PAGE),
    limit: getPositiveIntegerQuery(
      query.limit,
      'limit',
      DEFAULT_LIMIT,
      MAX_LIMIT,
    ),
    sort: 'requestedAt',
    order: 'desc',
  };

  const status = getOptionalEnumQuery(
    query.status,
    'status',
    REFUND_STATUS_VALUES,
  );

  const origin = getOptionalEnumQuery(
    query.origin,
    'origin',
    REFUND_ORIGIN_VALUES,
  );

  if (status) {
    input.status = status;
  }

  if (origin) {
    input.origin = origin;
  }

  if (query.orderId !== undefined) {
    if (
      typeof query.orderId !== 'string' ||
      !mongoose.Types.ObjectId.isValid(query.orderId.trim())
    ) {
      throwValidationError({
        orderId: 'Order ID is invalid.',
      });
    }

    input.orderId = query.orderId.trim();
  }

  if (query.sort !== undefined) {
    if (query.sort !== 'requestedAt') {
      throwValidationError({
        sort: 'Sort must be requestedAt.',
      });
    }

    input.sort = query.sort;
  }

  if (query.order !== undefined) {
    if (query.order !== 'asc' && query.order !== 'desc') {
      throwValidationError({
        order: 'Order must be asc or desc.',
      });
    }

    input.order = query.order;
  }

  return input;
}
