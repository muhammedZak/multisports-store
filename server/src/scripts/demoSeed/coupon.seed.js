import { isDeepStrictEqual } from 'node:util';

import { Cart } from '../../modules/cart/cart.model.js';
import { Coupon } from '../../modules/coupon/coupon.model.js';
import {
  normalizeCouponCode,
  validateCouponConfiguration,
} from '../../modules/coupon/coupon.validation.js';
import { Order } from '../../modules/order/order.model.js';
import { Payment } from '../../modules/payment/payment.model.js';
import { deterministicObjectId } from './seed.registry.js';
import {
  SeedDriftError,
  SeedValidationError,
  withSeedTransaction,
} from './seed.utils.js';

export const COUPON_CLASSIFICATIONS = Object.freeze({
  MISSING: 'MISSING',
  EXACT: 'EXACT',
  CODE_CONFLICT: 'CODE_CONFLICT',
  ID_CONFLICT: 'ID_CONFLICT',
  DRIFT: 'DRIFT',
});

export const LEGACY_DEMO_COUPON_CODES = Object.freeze([
  'WELCOME10',
  'SPORTS15',
  'TRAINING20',
  'RUNNER500',
  'COURT10',
  'FITNESS15',
  'FREESHIP',
  'DEMO25',
]);

export const COUPON_DEFINITIONS = Object.freeze([
  Object.freeze({
    seedKey: 'coupon:DEMO10',
    code: 'DEMO10',
    discountType: 'percentage',
    discountValue: 10,
    minimumOrderAmount: 99900,
    maximumDiscount: null,
    startsAtOffsetDays: null,
    expiresAtOffsetDays: null,
    usageLimit: null,
    usedCount: 0,
    isActive: true,
  }),
  Object.freeze({
    seedKey: 'coupon:SAVE500',
    code: 'SAVE500',
    discountType: 'fixed',
    discountValue: 50000,
    minimumOrderAmount: 299900,
    maximumDiscount: null,
    startsAtOffsetDays: null,
    expiresAtOffsetDays: null,
    usageLimit: null,
    usedCount: 0,
    isActive: true,
  }),
  Object.freeze({
    seedKey: 'coupon:MAX20',
    code: 'MAX20',
    discountType: 'percentage',
    discountValue: 20,
    minimumOrderAmount: 199900,
    maximumDiscount: 75000,
    startsAtOffsetDays: null,
    expiresAtOffsetDays: null,
    usageLimit: null,
    usedCount: 0,
    isActive: true,
  }),
  Object.freeze({
    seedKey: 'coupon:INACTIVE15',
    code: 'INACTIVE15',
    discountType: 'percentage',
    discountValue: 15,
    minimumOrderAmount: 99900,
    maximumDiscount: null,
    startsAtOffsetDays: null,
    expiresAtOffsetDays: null,
    usageLimit: null,
    usedCount: 0,
    isActive: false,
  }),
  Object.freeze({
    seedKey: 'coupon:EXPIRED12',
    code: 'EXPIRED12',
    discountType: 'percentage',
    discountValue: 12,
    minimumOrderAmount: 149900,
    maximumDiscount: null,
    startsAtOffsetDays: -90,
    expiresAtOffsetDays: -7,
    usageLimit: null,
    usedCount: 0,
    isActive: true,
  }),
  Object.freeze({
    seedKey: 'coupon:NEXTWEEK15',
    code: 'NEXTWEEK15',
    discountType: 'percentage',
    discountValue: 15,
    minimumOrderAmount: 149900,
    maximumDiscount: null,
    startsAtOffsetDays: 7,
    expiresAtOffsetDays: 37,
    usageLimit: null,
    usedCount: 0,
    isActive: true,
  }),
  Object.freeze({
    seedKey: 'coupon:USEDUP250',
    code: 'USEDUP250',
    discountType: 'fixed',
    discountValue: 25000,
    minimumOrderAmount: 99900,
    maximumDiscount: null,
    startsAtOffsetDays: null,
    expiresAtOffsetDays: null,
    usageLimit: 4,
    usedCount: 4,
    isActive: true,
  }),
  Object.freeze({
    seedKey: 'coupon:LIMITED5',
    code: 'LIMITED5',
    discountType: 'percentage',
    discountValue: 5,
    minimumOrderAmount: 49900,
    maximumDiscount: null,
    startsAtOffsetDays: null,
    expiresAtOffsetDays: null,
    usageLimit: 5,
    usedCount: 3,
    isActive: true,
  }),
]);

function idString(value) {
  return value?.toString();
}

function dateString(value) {
  return value ? new Date(value).toISOString() : null;
}

function offsetDate(clock, offsetDays) {
  if (offsetDays === null) {
    return null;
  }

  const date =
    offsetDays < 0
      ? clock.daysAgo(Math.abs(offsetDays))
      : clock.daysAfter(offsetDays);

  return clock.atLocalTime(date, { hour: 10 });
}

export function buildExpectedCoupons({ registry, clock }) {
  return COUPON_DEFINITIONS.map((definition, index) => {
    const timestamp = clock.atLocalTime(clock.daysAgo(120 - index), {
      hour: 10,
    });

    return {
      _id: registry.idFor(definition.seedKey),
      seedKey: definition.seedKey,
      code: definition.code,
      discountType: definition.discountType,
      discountValue: definition.discountValue,
      minimumOrderAmount: definition.minimumOrderAmount,
      maximumDiscount: definition.maximumDiscount,
      startsAt: offsetDate(clock, definition.startsAtOffsetDays),
      expiresAt: offsetDate(clock, definition.expiresAtOffsetDays),
      usageLimit: definition.usageLimit,
      usedCount: definition.usedCount,
      isActive: definition.isActive,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
}

function couponPayload(coupon) {
  return {
    _id: coupon._id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumOrderAmount: coupon.minimumOrderAmount,
    maximumDiscount: coupon.maximumDiscount,
    startsAt: coupon.startsAt,
    expiresAt: coupon.expiresAt,
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    isActive: coupon.isActive,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
}

export async function validateCouponDefinitions({ registry, clock }) {
  const coupons = buildExpectedCoupons({ registry, clock });
  const normalizedCodes = coupons.map((coupon) =>
    normalizeCouponCode(coupon.code),
  );
  const ids = coupons.map((coupon) => idString(coupon._id));
  const anchor = clock.anchorTime;

  if (
    coupons.length !== 8 ||
    registry.counts.coupons !== 8 ||
    new Set(normalizedCodes).size !== 8 ||
    new Set(ids).size !== 8 ||
    coupons.some((coupon) => coupon.code !== normalizeCouponCode(coupon.code))
  ) {
    throw new SeedValidationError(
      'DEMO_COUPON_IDENTITIES_INVALID',
      'Coupon definitions must contain eight unique normalized identities.',
    );
  }

  for (const coupon of coupons) {
    const configuration = validateCouponConfiguration(coupon);

    if (
      !isDeepStrictEqual(
        {
          ...configuration,
          startsAt: dateString(configuration.startsAt),
          expiresAt: dateString(configuration.expiresAt),
        },
        {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minimumOrderAmount: coupon.minimumOrderAmount,
          maximumDiscount: coupon.maximumDiscount,
          startsAt: dateString(coupon.startsAt),
          expiresAt: dateString(coupon.expiresAt),
          usageLimit: coupon.usageLimit,
          isActive: coupon.isActive,
        },
      ) ||
      !Number.isSafeInteger(coupon.usedCount) ||
      coupon.usedCount < 0 ||
      (coupon.usageLimit !== null && coupon.usedCount > coupon.usageLimit)
    ) {
      throw new SeedValidationError(
        'DEMO_COUPON_CONFIGURATION_INVALID',
        `Coupon ${coupon.code} has an invalid locked configuration.`,
      );
    }

    const document = new Coupon(couponPayload(coupon));
    await document.validate();
  }

  const counts = {
    coupons: coupons.length,
    percentage: coupons.filter(
      (coupon) => coupon.discountType === 'percentage',
    ).length,
    fixed: coupons.filter((coupon) => coupon.discountType === 'fixed').length,
    active: coupons.filter((coupon) => coupon.isActive).length,
    inactive: coupons.filter((coupon) => !coupon.isActive).length,
    unlimited: coupons.filter((coupon) => coupon.usageLimit === null).length,
    limited: coupons.filter((coupon) => coupon.usageLimit !== null).length,
    exhausted: coupons.filter(
      (coupon) =>
        coupon.usageLimit !== null && coupon.usedCount === coupon.usageLimit,
    ).length,
    partiallyUsedLimited: coupons.filter(
      (coupon) =>
        coupon.usageLimit !== null &&
        coupon.usedCount > 0 &&
        coupon.usedCount < coupon.usageLimit,
    ).length,
    maximumDiscount: coupons.filter(
      (coupon) => coupon.maximumDiscount !== null,
    ).length,
    upcoming: coupons.filter(
      (coupon) => coupon.startsAt !== null && coupon.startsAt > anchor,
    ).length,
    expired: coupons.filter(
      (coupon) => coupon.expiresAt !== null && coupon.expiresAt < anchor,
    ).length,
  };

  if (
    counts.percentage !== 6 ||
    counts.fixed !== 2 ||
    counts.active !== 7 ||
    counts.inactive !== 1 ||
    counts.unlimited !== 6 ||
    counts.limited !== 2 ||
    counts.exhausted !== 1 ||
    counts.partiallyUsedLimited !== 1 ||
    counts.maximumDiscount !== 1 ||
    counts.upcoming !== 1 ||
    counts.expired !== 1 ||
    coupons.some(
      (coupon) =>
        !Number.isSafeInteger(coupon.minimumOrderAmount) ||
        coupon.minimumOrderAmount < 0 ||
        (coupon.discountType === 'fixed' &&
          (!Number.isSafeInteger(coupon.discountValue) ||
            coupon.discountValue <= 0)) ||
        (coupon.discountType === 'percentage' &&
          (!Number.isSafeInteger(coupon.discountValue) ||
            coupon.discountValue < 1 ||
            coupon.discountValue > 100)) ||
        (coupon.maximumDiscount !== null &&
          coupon.discountType !== 'percentage') ||
        (coupon.startsAt &&
          coupon.expiresAt &&
          coupon.startsAt >= coupon.expiresAt),
    )
  ) {
    throw new SeedValidationError(
      'DEMO_COUPON_DEFINITION_TOTALS_INVALID',
      'Coupon definition scenario totals are invalid.',
    );
  }

  return { coupons, counts };
}

function comparableCoupon(value) {
  return {
    _id: idString(value?._id),
    code: normalizeCouponCode(value?.code),
    discountType: value?.discountType,
    discountValue: value?.discountValue,
    minimumOrderAmount: value?.minimumOrderAmount,
    maximumDiscount: value?.maximumDiscount ?? null,
    startsAt: dateString(value?.startsAt),
    expiresAt: dateString(value?.expiresAt),
    usageLimit: value?.usageLimit ?? null,
    usedCount: value?.usedCount,
    isActive: value?.isActive,
    createdAt: dateString(value?.createdAt),
    updatedAt: dateString(value?.updatedAt),
  };
}

export function classifyCouponRecord({ expected, recordById, recordByCode }) {
  if (
    recordById &&
    normalizeCouponCode(recordById.code) !== expected.code
  ) {
    return { classification: COUPON_CLASSIFICATIONS.ID_CONFLICT };
  }

  if (recordByCode && idString(recordByCode._id) !== idString(expected._id)) {
    return { classification: COUPON_CLASSIFICATIONS.CODE_CONFLICT };
  }

  if (!recordById && !recordByCode) {
    return { classification: COUPON_CLASSIFICATIONS.MISSING };
  }

  const existing = recordById || recordByCode;

  if (
    !isDeepStrictEqual(
      comparableCoupon(existing),
      comparableCoupon(expected),
    )
  ) {
    return { classification: COUPON_CLASSIFICATIONS.DRIFT };
  }

  return { classification: COUPON_CLASSIFICATIONS.EXACT };
}

export function findLegacyCouponPlaceholders(records) {
  const legacyCodes = new Set(LEGACY_DEMO_COUPON_CODES);
  const legacyIds = new Set(
    LEGACY_DEMO_COUPON_CODES.map((code) =>
      idString(deterministicObjectId(`coupon:${code}`)),
    ),
  );

  return records.filter(
    (record) =>
      legacyCodes.has(normalizeCouponCode(record.code)) ||
      legacyIds.has(idString(record._id)),
  );
}

async function loadAllCoupons() {
  return Coupon.find({}).lean();
}

export async function preflightCoupons(expectedCoupons, records = null) {
  const existingRecords = records ?? (await loadAllCoupons());
  const legacyRecords = findLegacyCouponPlaceholders(existingRecords);

  if (legacyRecords.length > 0) {
    throw new SeedDriftError(
      'Legacy demo Coupon placeholder ownership unexpectedly exists.',
    );
  }

  const recordsById = new Map(
    existingRecords.map((record) => [idString(record._id), record]),
  );
  const recordsByCode = new Map();

  for (const record of existingRecords) {
    const normalizedCode = normalizeCouponCode(record.code);

    if (recordsByCode.has(normalizedCode)) {
      throw new SeedDriftError(
        `Coupon preflight found duplicate normalized code ${normalizedCode}.`,
      );
    }

    recordsByCode.set(normalizedCode, record);
  }

  const results = expectedCoupons.map((expected) => {
    const recordById = recordsById.get(idString(expected._id));
    const recordByCode = recordsByCode.get(expected.code);

    return {
      expected,
      existingRecord: recordById || recordByCode,
      ...classifyCouponRecord({ expected, recordById, recordByCode }),
    };
  });
  const failures = results.filter(
    (result) =>
      ![
        COUPON_CLASSIFICATIONS.MISSING,
        COUPON_CLASSIFICATIONS.EXACT,
      ].includes(result.classification),
  );

  if (failures.length > 0) {
    throw new SeedDriftError(
      `Coupon preflight rejected: ${failures
        .map((failure) =>
          `${failure.expected.code}:${failure.classification}`,
        )
        .join(', ')}.`,
    );
  }

  return results;
}

export async function snapshotUnrelatedCoupons(expectedCoupons) {
  const expectedIds = new Set(
    expectedCoupons.map((coupon) => idString(coupon._id)),
  );
  const expectedCodes = new Set(expectedCoupons.map((coupon) => coupon.code));
  const records = await Coupon.collection
    .find({})
    .sort({ _id: 1 })
    .toArray();

  return JSON.stringify(
    records.filter(
      (record) =>
        !expectedIds.has(idString(record._id)) &&
        !expectedCodes.has(normalizeCouponCode(record.code)),
    ),
  );
}

export async function seedCoupons({ registry, clock, validatedCoupons = null }) {
  const validated =
    validatedCoupons ?? (await validateCouponDefinitions({ registry, clock }));
  const beforeUnrelated = await snapshotUnrelatedCoupons(validated.coupons);
  const preflight = await preflightCoupons(validated.coupons);
  const missing = preflight.filter(
    (result) => result.classification === COUPON_CLASSIFICATIONS.MISSING,
  );

  if (missing.length > 0) {
    try {
      await withSeedTransaction(async (session) => {
        await Coupon.insertMany(
          missing.map((result) => couponPayload(result.expected)),
          { ordered: true, session },
        );
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new SeedValidationError(
          'DEMO_COUPON_DUPLICATE_KEY',
          'A concurrent write created a Coupon ownership conflict.',
        );
      }

      throw error;
    }
  }

  const postflight = await preflightCoupons(validated.coupons);
  const afterUnrelated = await snapshotUnrelatedCoupons(validated.coupons);

  if (
    postflight.some(
      (result) => result.classification !== COUPON_CLASSIFICATIONS.EXACT,
    )
  ) {
    throw new SeedValidationError(
      'DEMO_COUPON_POSTFLIGHT_FAILED',
      'Coupon post-write verification did not find eight exact records.',
    );
  }

  if (beforeUnrelated !== afterUnrelated) {
    throw new SeedValidationError(
      'DEMO_COUPON_UNRELATED_CHANGED',
      'Unrelated Coupons changed during deterministic Coupon seeding.',
    );
  }

  return {
    ...validated,
    created: missing.length,
    skipped: validated.coupons.length - missing.length,
  };
}

export function exactCouponOwnershipFilter(expectedCoupons) {
  if (!Array.isArray(expectedCoupons) || expectedCoupons.length === 0) {
    throw new SeedValidationError(
      'DEMO_COUPON_RESET_SCOPE_INVALID',
      'Coupon reset requires exact preflighted Coupon identities.',
    );
  }

  return {
    $or: expectedCoupons.map((coupon) => ({
      _id: coupon._id,
      code: coupon.code,
    })),
  };
}

export async function findCouponResetDependencies(couponIds) {
  const checks = await Promise.all([
    Cart.exists({ appliedCouponId: { $in: couponIds } }),
    Order.exists({ 'coupon.couponId': { $in: couponIds } }),
    Payment.exists({ 'checkoutSnapshot.coupon.couponId': { $in: couponIds } }),
  ]);
  const names = ['Cart', 'Order', 'Payment'];

  return names.filter((name, index) => Boolean(checks[index]));
}

export function assertNoCouponResetDependencies(dependencies) {
  if (dependencies.length > 0) {
    throw new SeedValidationError(
      'DEMO_COUPON_RESET_DEPENDENCY',
      `Coupon reset is blocked by: ${dependencies.join(', ')}.`,
    );
  }
}

export async function resetCoupons({ registry, clock }) {
  const validated = await validateCouponDefinitions({ registry, clock });
  const preflight = await preflightCoupons(validated.coupons);
  const existing = preflight.filter(
    (result) => result.classification === COUPON_CLASSIFICATIONS.EXACT,
  );

  if (existing.length === 0) {
    return { deleted: 0 };
  }

  const coupons = existing.map((result) => result.expected);
  const dependencies = await findCouponResetDependencies(
    coupons.map((coupon) => coupon._id),
  );
  assertNoCouponResetDependencies(dependencies);
  let deleted = 0;

  await withSeedTransaction(async (session) => {
    const result = await Coupon.deleteMany(
      exactCouponOwnershipFilter(coupons),
      { session },
    );
    deleted = result.deletedCount;

    if (deleted !== coupons.length) {
      throw new SeedValidationError(
        'DEMO_COUPON_RESET_COUNT_MISMATCH',
        'Coupon reset did not delete the exact preflighted set.',
      );
    }
  });

  return { deleted };
}
