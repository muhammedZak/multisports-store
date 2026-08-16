import { AppError } from '../../utils/AppError.js';

import { isSupportedSport } from './catalog.constants.js';

const CREATE_CATEGORY_FIELDS = ['name', 'sport', 'isActive'];

const UPDATE_CATEGORY_FIELDS = ['name', 'sport'];

const UPDATE_STATUS_FIELDS = ['isActive'];

const PUBLIC_CATEGORY_QUERY_FIELDS = ['sport'];

const ADMIN_CATEGORY_QUERY_FIELDS = ['q', 'sport', 'status'];

function throwValidationError(fields) {
  throw new AppError(
    422,
    'VALIDATION_ERROR',
    'Please correct the invalid fields.',
    fields,
  );
}

function throwInvalidSport() {
  throw new AppError(422, 'INVALID_SPORT', 'Sport is not supported.', {
    sport: 'Select a supported sport.',
  });
}

function validateObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throwValidationError({
      request: 'A valid JSON object is required.',
    });
  }
}

function rejectUnexpectedFields(input, allowedFields) {
  const unexpectedFields = Object.keys(input).filter(
    (key) => !allowedFields.includes(key),
  );

  if (unexpectedFields.length > 0) {
    throwValidationError({
      request: 'Unsupported fields were provided.',
    });
  }
}

function getRequiredName(body, fields) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!name) {
    fields.name = 'Category name is required.';

    return null;
  }

  return name;
}

function getRequiredSport(body, fields) {
  if (typeof body.sport !== 'string' || !body.sport.trim()) {
    fields.sport = 'Sport is required.';

    return null;
  }

  const sport = body.sport.trim().toLowerCase();

  if (!isSupportedSport(sport)) {
    throwInvalidSport();
  }

  return sport;
}

function getOptionalSport(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !value.trim()) {
    throwInvalidSport();
  }

  const sport = value.trim().toLowerCase();

  if (!isSupportedSport(sport)) {
    throwInvalidSport();
  }

  return sport;
}

export function validateCategoryCreateInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, CREATE_CATEGORY_FIELDS);

  const fields = {};

  const name = getRequiredName(body, fields);
  const sport = getRequiredSport(body, fields);

  if (typeof body.isActive !== 'boolean') {
    fields.isActive = 'Active status must be true or false.';
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return {
    name,
    sport,
    isActive: body.isActive,
  };
}

export function validateCategoryUpdateInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, UPDATE_CATEGORY_FIELDS);

  const fields = {};
  const input = {};

  if (Object.keys(body).length === 0) {
    fields.request = 'Provide at least one category field to update.';
  }

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    const name = getRequiredName(body, fields);

    if (name) {
      input.name = name;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'sport')) {
    const sport = getRequiredSport(body, fields);

    if (sport) {
      input.sport = sport;
    }
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return input;
}

export function validateCategoryStatusInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, UPDATE_STATUS_FIELDS);

  if (typeof body.isActive !== 'boolean') {
    throwValidationError({
      isActive: 'Active status must be true or false.',
    });
  }

  return {
    isActive: body.isActive,
  };
}

export function validatePublicCategoryQuery(query) {
  rejectUnexpectedFields(query, PUBLIC_CATEGORY_QUERY_FIELDS);

  return {
    sport: getOptionalSport(query.sport),
  };
}

export function validateAdminCategoryQuery(query) {
  rejectUnexpectedFields(query, ADMIN_CATEGORY_QUERY_FIELDS);

  const input = {
    sport: getOptionalSport(query.sport),
  };

  if (query.q !== undefined) {
    if (typeof query.q !== 'string') {
      throwValidationError({
        q: 'Search value must be text.',
      });
    }

    input.q = query.q.trim();
  }

  if (query.status !== undefined) {
    if (
      typeof query.status !== 'string' ||
      !['active', 'inactive'].includes(query.status)
    ) {
      throwValidationError({
        status: 'Status must be active or inactive.',
      });
    }

    input.status = query.status;
  }

  return input;
}
