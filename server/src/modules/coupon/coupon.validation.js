import { AppError } from '../../utils/AppError.js';

function throwValidationError(fields) {
  throw new AppError(
    422,
    'VALIDATION_ERROR',
    'Please correct the invalid fields.',
    fields,
  );
}

export function normalizeCouponCode(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toUpperCase();
}

function getOptionalDate(value, fieldName, fields) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    fields[fieldName] = `${fieldName} must be a valid date.`;

    return null;
  }

  return date;
}

export function validateCouponConfiguration(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throwValidationError({
      request: 'A valid Coupon configuration object is required.',
    });
  }

  const fields = {};

  const code = normalizeCouponCode(input.code);

  if (!code) {
    fields.code = 'Coupon code is required.';
  }

  const discountType =
    typeof input.discountType === 'string'
      ? input.discountType.trim().toLowerCase()
      : '';

  if (!['percentage', 'fixed'].includes(discountType)) {
    fields.discountType = 'Discount type must be percentage or fixed.';
  }

  const discountValue = input.discountValue;

  if (!Number.isSafeInteger(discountValue) || discountValue <= 0) {
    fields.discountValue = 'Discount value must be a positive integer.';
  } else if (discountType === 'percentage' && discountValue > 100) {
    fields.discountValue = 'Percentage discount must be between 1 and 100.';
  }

  const minimumOrderAmount =
    input.minimumOrderAmount === undefined || input.minimumOrderAmount === null
      ? 0
      : input.minimumOrderAmount;

  if (!Number.isSafeInteger(minimumOrderAmount) || minimumOrderAmount < 0) {
    fields.minimumOrderAmount =
      'Minimum order amount must be a non-negative integer in paise.';
  }

  const maximumDiscount =
    input.maximumDiscount === undefined ? null : input.maximumDiscount;

  if (maximumDiscount !== null) {
    if (discountType !== 'percentage') {
      fields.maximumDiscount =
        'Maximum discount is supported only for percentage Coupons.';
    } else if (!Number.isSafeInteger(maximumDiscount) || maximumDiscount < 0) {
      fields.maximumDiscount =
        'Maximum discount must be a non-negative integer in paise.';
    }
  }

  const startsAt = getOptionalDate(input.startsAt, 'startsAt', fields);

  const expiresAt = getOptionalDate(input.expiresAt, 'expiresAt', fields);

  if (startsAt && expiresAt && expiresAt <= startsAt) {
    fields.expiresAt = 'Expiry must be later than the start date.';
  }

  const usageLimit = input.usageLimit === undefined ? null : input.usageLimit;

  if (
    usageLimit !== null &&
    (!Number.isSafeInteger(usageLimit) || usageLimit <= 0)
  ) {
    fields.usageLimit = 'Usage limit must be a positive integer.';
  }

  const isActive = input.isActive === undefined ? true : input.isActive;

  if (typeof isActive !== 'boolean') {
    fields.isActive = 'Active status must be true or false.';
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return {
    code,
    discountType,
    discountValue,
    minimumOrderAmount,
    maximumDiscount,
    startsAt,
    expiresAt,
    usageLimit,
    isActive,
  };
}
