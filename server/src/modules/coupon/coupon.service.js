import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { Coupon } from './coupon.model.js';

import {
  normalizeCouponCode,
  validateCouponConfiguration,
} from './coupon.validation.js';

function throwInvalidCoupon() {
  throw new AppError(422, 'INVALID_COUPON', 'Coupon is invalid.');
}

function throwCouponNotFound() {
  throw new AppError(404, 'COUPON_NOT_FOUND', 'Coupon not found.');
}

function throwDuplicateCoupon() {
  throw new AppError(
    409,
    'DUPLICATE_COUPON',
    'A Coupon with this code already exists.',
    {
      code: 'Use a different Coupon code.',
    },
  );
}

function throwCouponUsageConflict() {
  throw new AppError(
    409,
    'COUPON_USAGE_CONFLICT',
    'Coupon usage limit conflicts with existing usage.',
    {
      usageLimit: 'Usage limit cannot be lower than the current used count.',
    },
  );
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
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

function toAdminCouponResource(coupon) {
  return {
    id: coupon._id.toString(),

    code: coupon.code,

    discountType: coupon.discountType,

    discountValue: coupon.discountValue,

    minimumOrderAmount: coupon.minimumOrderAmount,

    maximumDiscount: coupon.maximumDiscount ?? null,

    startsAt: coupon.startsAt ?? null,

    expiresAt: coupon.expiresAt ?? null,

    usageLimit: coupon.usageLimit ?? null,

    usedCount: coupon.usedCount,

    isActive: coupon.isActive,

    createdAt: coupon.createdAt,

    updatedAt: coupon.updatedAt,
  };
}

async function getAdminCouponDocumentOrThrow(couponId) {
  if (!mongoose.isValidObjectId(couponId)) {
    throwCouponNotFound();
  }

  const coupon = await Coupon.findById(couponId);

  if (!coupon) {
    throwCouponNotFound();
  }

  return coupon;
}

async function ensureCouponCodeIsUnique({ code, excludeCouponId = null }) {
  const filter = {
    code,
  };

  if (excludeCouponId) {
    filter._id = {
      $ne: excludeCouponId,
    };
  }

  const existingCoupon = await Coupon.exists(filter);

  if (existingCoupon) {
    throwDuplicateCoupon();
  }
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

export async function getAdminCoupons({
  page,
  limit,
  q,
  status,
  discountType,
  sort,
  order,
}) {
  const filter = {};

  if (q) {
    filter.code = {
      $regex: escapeRegex(q),
      $options: 'i',
    };
  }

  if (status === 'active') {
    filter.isActive = true;
  }

  if (status === 'inactive') {
    filter.isActive = false;
  }

  if (discountType) {
    filter.discountType = discountType;
  }

  const direction = order === 'asc' ? 1 : -1;

  const sortDefinition = {
    [sort]: direction,
    _id: direction,
  };

  const skip = (page - 1) * limit;

  const [coupons, totalItems] = await Promise.all([
    Coupon.find(filter).sort(sortDefinition).skip(skip).limit(limit),

    Coupon.countDocuments(filter),
  ]);

  return {
    items: coupons.map(toAdminCouponResource),

    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

export async function getAdminCoupon(couponId) {
  const coupon = await getAdminCouponDocumentOrThrow(couponId);

  return toAdminCouponResource(coupon);
}

export async function createCoupon(input) {
  await ensureCouponCodeIsUnique({
    code: input.code,
  });

  try {
    const coupon = await Coupon.create({
      ...input,

      usedCount: 0,
    });

    return toAdminCouponResource(coupon);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throwDuplicateCoupon();
    }

    throw error;
  }
}

export async function updateCoupon(couponId, changes) {
  const coupon = await getAdminCouponDocumentOrThrow(couponId);

  const has = (fieldName) =>
    Object.prototype.hasOwnProperty.call(changes, fieldName);

  const nextConfiguration = validateCouponConfiguration({
    code: has('code') ? changes.code : coupon.code,

    discountType: has('discountType')
      ? changes.discountType
      : coupon.discountType,

    discountValue: has('discountValue')
      ? changes.discountValue
      : coupon.discountValue,

    minimumOrderAmount: has('minimumOrderAmount')
      ? changes.minimumOrderAmount
      : coupon.minimumOrderAmount,

    maximumDiscount: has('maximumDiscount')
      ? changes.maximumDiscount
      : coupon.maximumDiscount,

    startsAt: has('startsAt') ? changes.startsAt : coupon.startsAt,

    expiresAt: has('expiresAt') ? changes.expiresAt : coupon.expiresAt,

    usageLimit: has('usageLimit') ? changes.usageLimit : coupon.usageLimit,

    isActive: coupon.isActive,
  });

  if (
    nextConfiguration.usageLimit !== null &&
    nextConfiguration.usageLimit < coupon.usedCount
  ) {
    throwCouponUsageConflict();
  }

  if (nextConfiguration.code !== coupon.code) {
    await ensureCouponCodeIsUnique({
      code: nextConfiguration.code,
      excludeCouponId: coupon._id,
    });
  }

  coupon.code = nextConfiguration.code;

  coupon.discountType = nextConfiguration.discountType;

  coupon.discountValue = nextConfiguration.discountValue;

  coupon.minimumOrderAmount = nextConfiguration.minimumOrderAmount;

  coupon.maximumDiscount = nextConfiguration.maximumDiscount;

  coupon.startsAt = nextConfiguration.startsAt;

  coupon.expiresAt = nextConfiguration.expiresAt;

  coupon.usageLimit = nextConfiguration.usageLimit;

  try {
    await coupon.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throwDuplicateCoupon();
    }

    throw error;
  }

  return toAdminCouponResource(coupon);
}

export async function updateCouponStatus(couponId, isActive) {
  const coupon = await getAdminCouponDocumentOrThrow(couponId);

  coupon.isActive = isActive;

  await coupon.save();

  return toAdminCouponResource(coupon);
}
