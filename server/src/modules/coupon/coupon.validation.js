import { AppError } from '../../utils/AppError.js';

import { validateMergeCartInput } from '../cart/cart.validation.js';

const CREATE_COUPON_FIELDS = [
  'code',
  'discountType',
  'discountValue',
  'minimumOrderAmount',
  'maximumDiscount',
  'startsAt',
  'expiresAt',
  'usageLimit',
  'isActive',
];

const UPDATE_COUPON_FIELDS = [
  'code',
  'discountType',
  'discountValue',
  'minimumOrderAmount',
  'maximumDiscount',
  'startsAt',
  'expiresAt',
  'usageLimit',
];

const UPDATE_STATUS_FIELDS = ['isActive'];

const PUBLIC_COUPON_VALIDATE_FIELDS = ['code', 'items'];

const ADMIN_COUPON_QUERY_FIELDS = [
  'page',
  'limit',
  'q',
  'status',
  'discountType',
  'sort',
  'order',
];

const ADMIN_COUPON_SORT_VALUES = ['createdAt', 'code', 'expiresAt'];

const ADMIN_COUPON_ORDER_VALUES = ['asc', 'desc'];

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

function validateObject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
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

export function validateCouponCreateInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, CREATE_COUPON_FIELDS);

  return validateCouponConfiguration(body);
}

export function validateCouponUpdateInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, UPDATE_COUPON_FIELDS);

  if (Object.keys(body).length === 0) {
    throwValidationError({
      request: 'Provide at least one Coupon field to update.',
    });
  }

  const input = {};

  for (const fieldName of UPDATE_COUPON_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, fieldName)) {
      input[fieldName] = body[fieldName];
    }
  }

  return input;
}

export function validateCouponStatusInput(body) {
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

export function validateAdminCouponQuery(query) {
  validateObject(query);

  rejectUnexpectedFields(query, ADMIN_COUPON_QUERY_FIELDS);

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

  if (query.q !== undefined) {
    if (typeof query.q !== 'string') {
      throwValidationError({
        q: 'Search value must be text.',
      });
    }

    const q = normalizeCouponCode(query.q);

    if (q) {
      input.q = q;
    }
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

  if (query.discountType !== undefined) {
    if (
      typeof query.discountType !== 'string' ||
      !['percentage', 'fixed'].includes(query.discountType)
    ) {
      throwValidationError({
        discountType: 'Discount type must be percentage or fixed.',
      });
    }

    input.discountType = query.discountType;
  }

  if (query.sort !== undefined) {
    if (
      typeof query.sort !== 'string' ||
      !ADMIN_COUPON_SORT_VALUES.includes(query.sort)
    ) {
      throwValidationError({
        sort: `Sort must be one of: ${ADMIN_COUPON_SORT_VALUES.join(', ')}.`,
      });
    }

    input.sort = query.sort;
  }

  if (query.order !== undefined) {
    if (
      typeof query.order !== 'string' ||
      !ADMIN_COUPON_ORDER_VALUES.includes(query.order)
    ) {
      throwValidationError({
        order: 'Order must be asc or desc.',
      });
    }

    input.order = query.order;
  }

  return input;
}

export function validatePublicCouponInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, PUBLIC_COUPON_VALIDATE_FIELDS);

  const code = normalizeCouponCode(body.code);

  if (!code) {
    throwValidationError({
      code: 'Coupon code is required.',
    });
  }

  /*
   * Reuse the already verified Guest Cart validation.
   *
   * This ensures each item may contain only:
   *
   * productId
   * variantId (optional)
   * quantity
   *
   * Browser prices, stock, totals, Customer IDs and other commerce
   * fields are rejected.
   *
   * It also safely merges duplicate logical Guest Cart lines before
   * pricing.
   */
  const { items } = validateMergeCartInput({
    items: body.items,
  });

  return {
    code,
    items,
  };
}