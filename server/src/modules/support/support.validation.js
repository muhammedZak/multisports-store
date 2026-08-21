import { AppError } from '../../utils/AppError.js';

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
