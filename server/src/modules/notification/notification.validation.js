import { AppError } from '../../utils/AppError.js';

import {
  NOTIFICATION_READ_STATUS_VALUES,
  NOTIFICATION_TYPE_VALUES,
} from './notification.constants.js';

const NOTIFICATION_QUERY_FIELDS = ['page', 'limit', 'type', 'readStatus'];

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
      request: 'A valid Notification request object is required.',
    });
  }
}

function rejectUnexpectedFields(input, allowedFields, message) {
  const unexpectedFields = Object.keys(input).filter(
    (key) => !allowedFields.includes(key),
  );

  if (unexpectedFields.length > 0) {
    throwValidationError({
      request: message,
    });
  }
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

function getOptionalNotificationType(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !NOTIFICATION_TYPE_VALUES.includes(value)) {
    throwValidationError({
      type: 'Notification type is invalid.',
    });
  }

  return value;
}

function getOptionalReadStatus(value) {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== 'string' ||
    !NOTIFICATION_READ_STATUS_VALUES.includes(value)
  ) {
    throwValidationError({
      readStatus: 'Read status must be read or unread.',
    });
  }

  return value;
}

export function validateNotificationListQuery(query) {
  validateObject(query);

  rejectUnexpectedFields(
    query,
    NOTIFICATION_QUERY_FIELDS,
    'Unsupported Notification query fields were provided.',
  );

  const input = {
    page: getPositiveIntegerQuery(query.page, 'page', DEFAULT_PAGE),

    limit: getPositiveIntegerQuery(
      query.limit,
      'limit',
      DEFAULT_LIMIT,
      MAX_LIMIT,
    ),
  };

  const type = getOptionalNotificationType(query.type);

  const readStatus = getOptionalReadStatus(query.readStatus);

  if (type !== undefined) {
    input.type = type;
  }

  if (readStatus !== undefined) {
    input.readStatus = readStatus;
  }

  return input;
}

export function validateNotificationReadInput(input) {
  /*
   * PATCH /notifications/:notificationId/read
   *
   * Signed API contract has no request body.
   *
   * Express may give us undefined when no body
   * was sent or {} for an empty JSON object.
   */
  if (input === undefined) {
    return;
  }

  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).length > 0
  ) {
    throwValidationError({
      request: 'Mark-read does not accept a request body.',
    });
  }
}
