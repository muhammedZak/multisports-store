import { AppError } from '../../utils/AppError.js';

import { Coupon } from './coupon.model.js';
import { normalizeCouponCode } from './coupon.validation.js';

function throwInvalidCoupon() {
  throw new AppError(422, 'INVALID_COUPON', 'Coupon is invalid.');
}

function throwCouponInactive() {
  throw new AppError(409, 'COUPON_INACTIVE', 'This Coupon is not active.');
}

function throwCouponNotStarted() {
  throw new AppError(
    409,
    'COUPON_NOT_STARTED',
    'This Coupon is not available yet.',
  );
}

function throwCouponExpired() {
  throw new AppError(409, 'COUPON_EXPIRED', 'This Coupon has expired.');
}

function throwCouponMinimumNotMet() {
  throw new AppError(
    409,
    'COUPON_MINIMUM_NOT_MET',
    'The Cart subtotal does not meet this Coupon minimum.',
  );
}

function throwCouponUsageLimitReached() {
  throw new AppError(
    409,
    'COUPON_USAGE_LIMIT_REACHED',
    'This Coupon has reached its usage limit.',
  );
}

function assertSubtotal(subtotal) {
  if (!Number.isSafeInteger(subtotal) || subtotal < 0) {
    throw new TypeError(
      'Coupon subtotal must be a non-negative integer in paise.',
    );
  }
}

function hasValidStoredConfiguration(coupon) {
  if (!coupon || !['percentage', 'fixed'].includes(coupon.discountType)) {
    return false;
  }

  if (typeof coupon.isActive !== 'boolean') {
    return false;
  }

  if (
    !Number.isSafeInteger(coupon.discountValue) ||
    coupon.discountValue <= 0
  ) {
    return false;
  }

  if (coupon.discountType === 'percentage' && coupon.discountValue > 100) {
    return false;
  }

  if (
    !Number.isSafeInteger(coupon.minimumOrderAmount) ||
    coupon.minimumOrderAmount < 0
  ) {
    return false;
  }

  if (coupon.maximumDiscount !== null && coupon.maximumDiscount !== undefined) {
    if (
      coupon.discountType !== 'percentage' ||
      !Number.isSafeInteger(coupon.maximumDiscount) ||
      coupon.maximumDiscount < 0
    ) {
      return false;
    }
  }

  if (
    coupon.startsAt &&
    coupon.expiresAt &&
    coupon.expiresAt <= coupon.startsAt
  ) {
    return false;
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usageLimit !== undefined &&
    (!Number.isSafeInteger(coupon.usageLimit) || coupon.usageLimit <= 0)
  ) {
    return false;
  }

  if (!Number.isSafeInteger(coupon.usedCount) || coupon.usedCount < 0) {
    return false;
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usageLimit !== undefined &&
    coupon.usedCount > coupon.usageLimit
  ) {
    return false;
  }

  return true;
}

function toCouponPricingResource(coupon) {
  return {
    id: coupon._id?.toString() ?? null,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumOrderAmount: coupon.minimumOrderAmount,
    maximumDiscount: coupon.maximumDiscount ?? null,
    startsAt: coupon.startsAt ?? null,
    expiresAt: coupon.expiresAt ?? null,
  };
}

export function calculateCouponDiscount({ coupon, subtotal }) {
  assertSubtotal(subtotal);

  if (!hasValidStoredConfiguration(coupon)) {
    throwInvalidCoupon();
  }

  let discountAmount;

  if (coupon.discountType === 'percentage') {
    discountAmount = Math.round((subtotal * coupon.discountValue) / 100);

    if (
      coupon.maximumDiscount !== null &&
      coupon.maximumDiscount !== undefined
    ) {
      discountAmount = Math.min(discountAmount, coupon.maximumDiscount);
    }
  } else {
    discountAmount = Math.min(coupon.discountValue, subtotal);
  }

  discountAmount = Math.min(discountAmount, subtotal);

  return discountAmount;
}

export function validateCouponForSubtotal({
  coupon,
  subtotal,
  now = new Date(),
}) {
  assertSubtotal(subtotal);

  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError('Coupon validation time must be a valid Date.');
  }

  if (!hasValidStoredConfiguration(coupon)) {
    throwInvalidCoupon();
  }

  if (!coupon.isActive) {
    throwCouponInactive();
  }

  if (coupon.startsAt && now < coupon.startsAt) {
    throwCouponNotStarted();
  }

  if (coupon.expiresAt && now >= coupon.expiresAt) {
    throwCouponExpired();
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usageLimit !== undefined &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    throwCouponUsageLimitReached();
  }

  if (subtotal < coupon.minimumOrderAmount) {
    throwCouponMinimumNotMet();
  }

  const discountAmount = calculateCouponDiscount({
    coupon,
    subtotal,
  });

  return {
    coupon: toCouponPricingResource(coupon),
    subtotal,
    discountAmount,
    totalAmount: subtotal - discountAmount,
  };
}

export async function getCouponByCode(code) {
  const normalizedCode = normalizeCouponCode(code);

  if (!normalizedCode) {
    throwInvalidCoupon();
  }

  const coupon = await Coupon.findOne({
    code: normalizedCode,
  });

  if (!coupon) {
    throwInvalidCoupon();
  }

  return coupon;
}

export async function resolveCouponForSubtotal({
  code,
  subtotal,
  now = new Date(),
}) {
  const coupon = await getCouponByCode(code);

  return validateCouponForSubtotal({
    coupon,
    subtotal,
    now,
  });
}
