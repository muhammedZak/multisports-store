import { AppError } from '../../utils/AppError.js';

const PHONE_ALLOWED_REGEX = /^\+?[0-9\s()-]+$/;

function throwValidationError(fields) {
  throw new AppError(
    422,
    'VALIDATION_ERROR',
    'Please correct the invalid fields.',
    fields,
  );
}

function validateObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throwValidationError({
      request: 'A valid JSON object is required.',
    });
  }
}

function rejectUnexpectedFields(body, allowedFields) {
  const unexpectedFields = Object.keys(body).filter(
    (key) => !allowedFields.includes(key),
  );

  if (unexpectedFields.length > 0) {
    throwValidationError({
      request: 'Unsupported fields were provided.',
    });
  }
}

function isValidPhone(phone) {
  const digitCount = phone.replace(/\D/g, '').length;

  return (
    phone.length <= 25 &&
    PHONE_ALLOWED_REGEX.test(phone) &&
    digitCount >= 7 &&
    digitCount <= 15
  );
}

export function validateProfileUpdateInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, ['name', 'phone']);

  const hasName = Object.prototype.hasOwnProperty.call(body, 'name');
  const hasPhone = Object.prototype.hasOwnProperty.call(body, 'phone');

  const fields = {};
  const input = {};

  if (!hasName && !hasPhone) {
    fields.request = 'Provide at least one profile field to update.';
  }

  if (hasName) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!name) {
      fields.name = 'Name is required.';
    } else {
      input.name = name;
    }
  }

  if (hasPhone) {
    if (body.phone === null) {
      input.phone = null;
    } else {
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

      if (!phone || !isValidPhone(phone)) {
        fields.phone = 'Enter a valid phone number.';
      } else {
        input.phone = phone;
      }
    }
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return input;
}
