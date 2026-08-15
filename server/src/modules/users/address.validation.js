import { AppError } from '../../utils/AppError.js';

const PHONE_ALLOWED_REGEX = /^\+?[0-9\s()-]+$/;

const CREATE_ADDRESS_FIELDS = [
  'fullName',
  'phone',
  'address',
  'city',
  'state',
  'postalCode',
  'country',
  'isDefault',
];

const UPDATE_ADDRESS_FIELDS = [
  'fullName',
  'phone',
  'address',
  'city',
  'state',
  'postalCode',
  'country',
];

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

function validateRequiredString({
  body,
  fieldName,
  label,
  maxLength,
  fields,
  input,
}) {
  const value =
    typeof body[fieldName] === 'string' ? body[fieldName].trim() : '';

  if (!value) {
    fields[fieldName] = `${label} is required.`;

    return;
  }

  if (value.length > maxLength) {
    fields[fieldName] = `${label} is too long.`;

    return;
  }

  input[fieldName] = value;
}

function validatePhone(body, fields, input) {
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

  if (!phone || !isValidPhone(phone)) {
    fields.phone = 'Enter a valid phone number.';

    return;
  }

  input.phone = phone;
}

function validateAddressField(body, fieldName, fields, input) {
  const config = {
    fullName: {
      label: 'Full name',
      maxLength: 100,
    },

    address: {
      label: 'Address',
      maxLength: 300,
    },

    city: {
      label: 'City',
      maxLength: 100,
    },

    state: {
      label: 'State',
      maxLength: 100,
    },

    postalCode: {
      label: 'Postal code',
      maxLength: 20,
    },

    country: {
      label: 'Country',
      maxLength: 100,
    },
  };

  validateRequiredString({
    body,
    fieldName,
    label: config[fieldName].label,
    maxLength: config[fieldName].maxLength,
    fields,
    input,
  });
}

export function validateAddressCreateInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, CREATE_ADDRESS_FIELDS);

  const fields = {};
  const input = {};

  validateAddressField(body, 'fullName', fields, input);

  validatePhone(body, fields, input);

  validateAddressField(body, 'address', fields, input);

  validateAddressField(body, 'city', fields, input);

  validateAddressField(body, 'state', fields, input);

  validateAddressField(body, 'postalCode', fields, input);

  validateAddressField(body, 'country', fields, input);

  if (Object.prototype.hasOwnProperty.call(body, 'isDefault')) {
    if (typeof body.isDefault !== 'boolean') {
      fields.isDefault = 'Default address value must be true or false.';
    } else {
      input.isDefault = body.isDefault;
    }
  } else {
    input.isDefault = false;
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return input;
}

export function validateAddressUpdateInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, UPDATE_ADDRESS_FIELDS);

  const fields = {};
  const input = {};

  if (Object.keys(body).length === 0) {
    fields.request = 'Provide at least one address field to update.';
  }

  if (Object.prototype.hasOwnProperty.call(body, 'fullName')) {
    validateAddressField(body, 'fullName', fields, input);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'phone')) {
    validatePhone(body, fields, input);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'address')) {
    validateAddressField(body, 'address', fields, input);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'city')) {
    validateAddressField(body, 'city', fields, input);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'state')) {
    validateAddressField(body, 'state', fields, input);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'postalCode')) {
    validateAddressField(body, 'postalCode', fields, input);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'country')) {
    validateAddressField(body, 'country', fields, input);
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return input;
}
