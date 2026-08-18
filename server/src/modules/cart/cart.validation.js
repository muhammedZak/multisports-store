import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

const ADD_CART_ITEM_FIELDS = ['productId', 'variantId', 'quantity'];

const UPDATE_CART_ITEM_FIELDS = ['quantity'];

const MERGE_CART_FIELDS = ['items'];

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
      request: 'A valid request body is required.',
    });
  }
}

function rejectUnexpectedFields(input, allowedFields) {
  const unexpectedFields = Object.keys(input).filter(
    (field) => !allowedFields.includes(field),
  );

  if (unexpectedFields.length > 0) {
    throwValidationError({
      request: 'Unsupported Cart fields were provided.',
    });
  }
}

function validateCartLineInput(input) {
  validateObject(input);

  rejectUnexpectedFields(input, ADD_CART_ITEM_FIELDS);

  const fields = {};

  let productId;

  if (
    typeof input.productId !== 'string' ||
    !mongoose.isValidObjectId(input.productId.trim())
  ) {
    fields.productId = 'A valid Product ID is required.';
  } else {
    productId = input.productId.trim();
  }

  let variantId;

  if (input.variantId !== undefined) {
    if (
      typeof input.variantId !== 'string' ||
      !mongoose.isValidObjectId(input.variantId.trim())
    ) {
      fields.variantId = 'Variant ID is invalid.';
    } else {
      variantId = input.variantId.trim();
    }
  }

  if (!isPositiveCartQuantity(input.quantity)) {
    fields.quantity = 'Quantity must be a positive integer.';
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return {
    productId,

    ...(variantId
      ? {
          variantId,
        }
      : {}),

    quantity: input.quantity,
  };
}

function getCartLineIdentity(item) {
  return `${item.productId}:${item.variantId ?? 'simple'}`;
}

export function isPositiveCartQuantity(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function validateCartItemId(cartItemId) {
  if (
    typeof cartItemId !== 'string' ||
    !mongoose.isValidObjectId(cartItemId.trim())
  ) {
    throwValidationError({
      cartItemId: 'A valid Cart Item ID is required.',
    });
  }

  return cartItemId.trim();
}

export function validateUpdateCartItemInput(input) {
  validateObject(input);

  rejectUnexpectedFields(input, UPDATE_CART_ITEM_FIELDS);

  const fields = {};

  if (!isPositiveCartQuantity(input.quantity)) {
    fields.quantity = 'Quantity must be a positive integer.';
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return {
    quantity: input.quantity,
  };
}

export function validateAddCartItemInput(input) {
  return validateCartLineInput(input);
}

export function validateMergeCartInput(input) {
  validateObject(input);

  rejectUnexpectedFields(input, MERGE_CART_FIELDS);

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throwValidationError({
      items: 'At least one Guest Cart item is required.',
    });
  }

  const mergedItems = [];

  const itemsByIdentity = new Map();

  for (const rawItem of input.items) {
    /*
     * Each Guest line accepts exactly the same trusted fields
     * as normal Add to Cart:
     *
     * productId
     * variantId (optional)
     * quantity
     *
     * Browser-owned prices, stock and totals are rejected.
     */
    const item = validateCartLineInput(rawItem);

    const lineIdentity = getCartLineIdentity(item);

    const existingItem = itemsByIdentity.get(lineIdentity);

    if (!existingItem) {
      const normalizedItem = {
        productId: item.productId,

        ...(item.variantId
          ? {
              variantId: item.variantId,
            }
          : {}),

        quantity: item.quantity,
      };

      mergedItems.push(normalizedItem);

      itemsByIdentity.set(lineIdentity, normalizedItem);

      continue;
    }

    /*
     * A malformed/tampered Guest Cart could contain duplicate logical
     * identities even though our normal Redux/localStorage code already
     * merges them.
     *
     * Normalize them here before the service runs.
     */
    const mergedQuantity = existingItem.quantity + item.quantity;

    if (!Number.isSafeInteger(mergedQuantity)) {
      throwValidationError({
        quantity: 'Merged Guest Cart quantity is too large.',
      });
    }

    existingItem.quantity = mergedQuantity;
  }

  return {
    items: mergedItems,
  };
}
