import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import {
  REFUND_ADMIN_DECISIONS,
  REFUND_ADMIN_DECISION_VALUES,
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

const ADMIN_REFUND_QUERY_FIELDS = [
  'page',
  'limit',
  'q',
  'status',
  'origin',
  'customerId',
  'orderId',
  'dateFrom',
  'dateTo',
  'sort',
  'order',
];

const ADMIN_REFUND_DECISION_FIELDS = [
  'decision',
  'adminDecisionNote',
  'restockOnCompletion',
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

function normalizeSingleLineText(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function getOptionalAdminText(value, fieldName, label) {
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

function getOptionalObjectIdQuery(value, fieldName, label) {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== 'string' ||
    !mongoose.isValidObjectId(value.trim())
  ) {
    throwValidationError({
      [fieldName]: `${label} is invalid.`,
    });
  }

  return value.trim();
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

export function validateAdminRefundQuery(query) {
  validateObject(query, 'A valid Admin Refund query object is required.');

  rejectUnexpectedFields(
    query,
    ADMIN_REFUND_QUERY_FIELDS,
    'Unsupported Admin Refund query fields were provided.',
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

  const q = getOptionalAdminText(query.q, 'q', 'Order search value');
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
  const customerId = getOptionalObjectIdQuery(
    query.customerId,
    'customerId',
    'Customer ID',
  );
  const orderId = getOptionalObjectIdQuery(
    query.orderId,
    'orderId',
    'Order ID',
  );
  const dateFrom = getCalendarDate(query.dateFrom, 'dateFrom');
  const dateTo = getCalendarDate(query.dateTo, 'dateTo');

  if (q) {
    input.q = q.toUpperCase();
  }

  if (status) {
    input.status = status;
  }

  if (origin) {
    input.origin = origin;
  }

  if (customerId) {
    input.customerId = customerId;
  }

  if (orderId) {
    input.orderId = orderId;
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

export function validateAdminRefundDecisionInput(input) {
  validateObject(input, 'A valid Refund decision body is required.');

  rejectUnexpectedFields(
    input,
    ADMIN_REFUND_DECISION_FIELDS,
    'Unsupported Refund decision fields were provided.',
  );

  if (typeof input.decision !== 'string' || !input.decision.trim()) {
    throwValidationError({
      decision: 'Refund decision is required.',
    });
  }

  const decision = input.decision.trim().toLowerCase();

  if (!REFUND_ADMIN_DECISION_VALUES.includes(decision)) {
    throwValidationError({
      decision: 'Refund decision must be approve or reject.',
    });
  }

  let adminDecisionNote;

  if (Object.prototype.hasOwnProperty.call(input, 'adminDecisionNote')) {
    if (typeof input.adminDecisionNote !== 'string') {
      throwValidationError({
        adminDecisionNote: 'Admin decision note must be text.',
      });
    }

    adminDecisionNote = input.adminDecisionNote.trim() || undefined;
  }

  const hasRestockDecision = Object.prototype.hasOwnProperty.call(
    input,
    'restockOnCompletion',
  );

  if (decision === REFUND_ADMIN_DECISIONS.REJECT) {
    if (!adminDecisionNote) {
      throwValidationError({
        adminDecisionNote: 'A meaningful rejection note is required.',
      });
    }

    if (hasRestockDecision) {
      throwValidationError({
        restockOnCompletion:
          'Restock decision must be omitted when rejecting a Refund.',
      });
    }

    return {
      decision,
      adminDecisionNote,
    };
  }

  if (
    !hasRestockDecision ||
    typeof input.restockOnCompletion !== 'boolean'
  ) {
    throwValidationError({
      restockOnCompletion:
        'Approval requires an explicit restockOnCompletion boolean.',
    });
  }

  return {
    decision,
    ...(adminDecisionNote ? { adminDecisionNote } : {}),
    restockOnCompletion: input.restockOnCompletion,
  };
}
