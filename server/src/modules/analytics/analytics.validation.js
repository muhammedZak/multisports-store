import { AppError } from '../../utils/AppError.js';

export const ANALYTICS_RANGES = Object.freeze(['7d', '30d', 'month', 'year']);

const DEFAULT_ANALYTICS_RANGE = '30d';

const ANALYTICS_QUERY_FIELDS = ['range'];

function throwValidationError(fields) {
  throw new AppError(
    422,
    'VALIDATION_ERROR',
    'Please correct the invalid fields.',
    fields,
  );
}

export function validateAdminAnalyticsQuery(query) {
  if (!query || typeof query !== 'object' || Array.isArray(query)) {
    throwValidationError({
      request: 'A valid query object is required.',
    });
  }

  const unexpectedFields = Object.keys(query).filter(
    (field) => !ANALYTICS_QUERY_FIELDS.includes(field),
  );

  if (unexpectedFields.length > 0) {
    throwValidationError({
      request: 'Unsupported Analytics query fields were provided.',
    });
  }

  if (query.range === undefined) {
    return {
      range: DEFAULT_ANALYTICS_RANGE,
    };
  }

  if (
    typeof query.range !== 'string' ||
    !ANALYTICS_RANGES.includes(query.range)
  ) {
    throw new AppError(
      422,
      'INVALID_ANALYTICS_RANGE',
      'Analytics range must be one of: 7d, 30d, month, year.',
      {
        range: 'Choose 7d, 30d, month, or year.',
      },
    );
  }

  return {
    range: query.range,
  };
}
