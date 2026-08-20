import { AppError } from '../../utils/AppError.js';

import { REVIEW_TEXT_MAX_LENGTH } from './review.model.js';

const REVIEW_CREATE_FIELDS = ['rating', 'text'];

const PUBLIC_REVIEW_QUERY_FIELDS = ['page', 'limit', 'rating', 'sort', 'order'];

const PUBLIC_REVIEW_SORT_VALUES = ['createdAt', 'rating'];
const PUBLIC_REVIEW_ORDER_VALUES = ['asc', 'desc'];

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

function throwInvalidRating() {
  throw new AppError(
    422,
    'INVALID_RATING',
    'Rating must be an integer from 1 to 5.',
    {
      rating: 'Rating must be an integer from 1 to 5.',
    },
  );
}

function validateObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throwValidationError({
      request: 'A valid Review request object is required.',
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

function getRating(value) {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throwInvalidRating();
  }

  return value;
}

function getReviewText(value) {
  if (typeof value !== 'string') {
    throwValidationError({
      text: 'Review text is required.',
    });
  }

  const text = value.trim();

  if (!text) {
    throwValidationError({
      text: 'Review text is required.',
    });
  }

  if (text.length > REVIEW_TEXT_MAX_LENGTH) {
    throwValidationError({
      text: `Review text must not exceed ${REVIEW_TEXT_MAX_LENGTH} characters.`,
    });
  }

  return text;
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

function getOptionalRatingQuery(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !/^[1-5]$/.test(value)) {
    throwInvalidRating();
  }

  return Number(value);
}

export function validateReviewCreateInput(input) {
  validateObject(input);

  rejectUnexpectedFields(
    input,
    REVIEW_CREATE_FIELDS,
    'Unsupported Review fields were provided.',
  );

  return {
    rating: getRating(input.rating),
    text: getReviewText(input.text),
  };
}

export function validatePublicReviewQuery(query) {
  validateObject(query);

  rejectUnexpectedFields(
    query,
    PUBLIC_REVIEW_QUERY_FIELDS,
    'Unsupported Review query fields were provided.',
  );

  const input = {
    page: getPositiveIntegerQuery(query.page, 'page', DEFAULT_PAGE),

    limit: getPositiveIntegerQuery(
      query.limit,
      'limit',
      DEFAULT_LIMIT,
      MAX_LIMIT,
    ),

    sort: 'createdAt',

    order: 'desc',
  };

  const rating = getOptionalRatingQuery(query.rating);

  if (rating !== undefined) {
    input.rating = rating;
  }

  if (query.sort !== undefined) {
    if (
      typeof query.sort !== 'string' ||
      !PUBLIC_REVIEW_SORT_VALUES.includes(query.sort)
    ) {
      throwValidationError({
        sort: 'Sort must be createdAt or rating.',
      });
    }

    input.sort = query.sort;
  }

  if (query.order !== undefined) {
    if (
      typeof query.order !== 'string' ||
      !PUBLIC_REVIEW_ORDER_VALUES.includes(query.order)
    ) {
      throwValidationError({
        order: 'Order must be asc or desc.',
      });
    }

    input.order = query.order;
  }

  return input;
}
