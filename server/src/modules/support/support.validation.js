import { AppError } from '../../utils/AppError.js';

import {
  SUPPORT_MESSAGE_DEFAULT_LIMIT,
  SUPPORT_MESSAGE_MAX_LIMIT,
  SUPPORT_MESSAGE_TEXT_MAX_LENGTH,
} from './support.constants.js';

function throwValidationError(fields) {
  throw new AppError(
    422,
    'VALIDATION_ERROR',
    'Please correct the invalid fields.',
    fields,
  );
}

function validateEmptyObject(input, message) {
  /*
   * Express may provide:
   *
   * undefined → no body sent
   * {}        → empty JSON body
   *
   * Both are acceptable for an endpoint whose
   * contract intentionally has no request body.
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
      request: message,
    });
  }
}

export function validateSupportConversationCreateInput(body) {
  validateEmptyObject(
    body,
    'Support conversation creation does not accept a request body.',
  );
}

export function validateSupportConversationQuery(query) {
  if (
    !query ||
    typeof query !== 'object' ||
    Array.isArray(query) ||
    Object.keys(query).length > 0
  ) {
    throwValidationError({
      request: 'Support conversation does not accept query fields.',
    });
  }
}

const SUPPORT_MESSAGE_QUERY_FIELDS = ['page', 'limit'];

function validateObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throwValidationError({
      request: 'A valid Support request object is required.',
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

function throwSupportMessageInvalid(message) {
  throw new AppError(422, 'SUPPORT_MESSAGE_INVALID', message);
}

export function validateSupportMessageListQuery(query) {
  validateObject(query);

  rejectUnexpectedFields(
    query,
    SUPPORT_MESSAGE_QUERY_FIELDS,
    'Unsupported Support message query fields were provided.',
  );

  return {
    page: getPositiveIntegerQuery(query.page, 'page', 1),

    limit: getPositiveIntegerQuery(
      query.limit,
      'limit',
      SUPPORT_MESSAGE_DEFAULT_LIMIT,
      SUPPORT_MESSAGE_MAX_LIMIT,
    ),
  };
}

export function validateSupportMessageCreateInput(input) {
  validateObject(input);

  rejectUnexpectedFields(input, ['text'], 'Support message accepts only text.');

  if (typeof input.text !== 'string') {
    throwSupportMessageInvalid('Support message text is required.');
  }

  const text = input.text.trim();

  if (text.length === 0) {
    throwSupportMessageInvalid('Support message text cannot be empty.');
  }

  if (text.length > SUPPORT_MESSAGE_TEXT_MAX_LENGTH) {
    throwSupportMessageInvalid(
      `Support message text cannot exceed ${SUPPORT_MESSAGE_TEXT_MAX_LENGTH} characters.`,
    );
  }

  return {
    text,
  };
}

export function validateSupportConversationReadInput(input) {
  validateEmptyObject(
    input,
    'Marking a Support conversation as read does not accept a request body.',
  );
}