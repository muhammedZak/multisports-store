import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { validateAddressCreateInput } from '../users/address.validation.js';

const CHECKOUT_FIELDS = ['shippingAddressId', 'shippingAddress'];

const INLINE_ADDRESS_FIELDS = [
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

function validateObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throwValidationError({
      request: 'A valid JSON object is required.',
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

function validateInlineShippingAddress(shippingAddress) {
  validateObject(shippingAddress);

  rejectUnexpectedFields(
    shippingAddress,
    INLINE_ADDRESS_FIELDS,
    'Unsupported shipping address fields were provided.',
  );

  /*
   * Reuse the already verified Saved Address validation rules.
   *
   * Inline Checkout addresses are not persisted, therefore isDefault
   * is supplied only for validation and removed afterwards.
   */
  const validatedAddress = validateAddressCreateInput({
    ...shippingAddress,
    isDefault: false,
  });

  const { isDefault, ...normalizedAddress } = validatedAddress;

  return normalizedAddress;
}

export function validateCheckoutAddressInput(body) {
  validateObject(body);

  /*
   * This also rejects browser-owned commerce fields such as:
   *
   * customerId
   * amount
   * subtotal
   * totalAmount
   * items
   * prices
   */
  rejectUnexpectedFields(
    body,
    CHECKOUT_FIELDS,
    'Only a saved or inline shipping address may be submitted for Checkout.',
  );

  const hasShippingAddressId = Object.prototype.hasOwnProperty.call(
    body,
    'shippingAddressId',
  );

  const hasShippingAddress = Object.prototype.hasOwnProperty.call(
    body,
    'shippingAddress',
  );

  /*
   * Exactly one:
   *
   * saved address
   *       OR
   * inline address
   */
  if (hasShippingAddressId === hasShippingAddress) {
    throwValidationError({
      request: 'Provide exactly one shipping address source.',
    });
  }

  if (hasShippingAddressId) {
    const shippingAddressId =
      typeof body.shippingAddressId === 'string'
        ? body.shippingAddressId.trim()
        : '';

    if (!mongoose.isValidObjectId(shippingAddressId)) {
      throwValidationError({
        shippingAddressId: 'A valid saved Address ID is required.',
      });
    }

    return {
      shippingAddressId,
    };
  }

  return {
    shippingAddress: validateInlineShippingAddress(body.shippingAddress),
  };
}
