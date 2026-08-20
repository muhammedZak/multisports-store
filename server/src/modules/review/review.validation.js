import { AppError } from '../../utils/AppError.js';

import { REVIEW_TEXT_MAX_LENGTH } from './review.model.js';

const REVIEW_CREATE_FIELDS = ['rating', 'text'];

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
      request: 'A valid Review request body is required.',
    });
  }
}

function rejectUnexpectedFields(input) {
  const unexpectedFields = Object.keys(input).filter(
    (key) => !REVIEW_CREATE_FIELDS.includes(key),
  );

  if (unexpectedFields.length > 0) {
    throwValidationError({
      request: 'Unsupported Review fields were provided.',
    });
  }
}

function getRating(value) {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new AppError(
      422,
      'INVALID_RATING',
      'Rating must be an integer from 1 to 5.',
      {
        rating: 'Rating must be an integer from 1 to 5.',
      },
    );
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

export function validateReviewCreateInput(input) {
  validateObject(input);

  rejectUnexpectedFields(input);

  return {
    rating: getRating(input.rating),
    text: getReviewText(input.text),
  };
}
