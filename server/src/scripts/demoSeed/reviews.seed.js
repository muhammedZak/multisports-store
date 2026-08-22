import { isDeepStrictEqual } from 'node:util';

import { Cart } from '../../modules/cart/cart.model.js';
import { Product } from '../../modules/catalog/product.model.js';
import { Coupon } from '../../modules/coupon/coupon.model.js';
import { Inventory } from '../../modules/inventory/inventory.model.js';
import { InventoryAdjustment } from '../../modules/inventory/inventoryAdjustment.model.js';
import { Notification } from '../../modules/notification/notification.model.js';
import { Order, ORDER_STATUSES } from '../../modules/order/order.model.js';
import {
  Payment,
  PAYMENT_COMMERCE_RESOLUTIONS,
  PAYMENT_STATUSES,
} from '../../modules/payment/payment.model.js';
import { Refund } from '../../modules/refund/refund.model.js';
import {
  Review,
  REVIEW_MODERATION_STATUSES,
} from '../../modules/review/review.model.js';
import {
  validateReviewCreateInput,
  validateReviewModerationInput,
} from '../../modules/review/review.validation.js';
import { User } from '../../modules/users/user.model.js';
import { buildReviewEligibilityPlan } from './commerce.scenarios.seed.js';
import {
  HISTORICAL_COMMERCE_STATES,
  preflightHistoricalCommerce,
} from './commerce.persistence.seed.js';
import { deterministicObjectId } from './seed.registry.js';
import {
  SeedDriftError,
  SeedValidationError,
  withSeedTransaction,
} from './seed.utils.js';

export const REVIEW_CLASSIFICATIONS = Object.freeze({
  MISSING: 'MISSING',
  EXACT: 'EXACT',
  NATURAL_KEY_CONFLICT: 'NATURAL_KEY_CONFLICT',
  ID_CONFLICT: 'ID_CONFLICT',
  DRIFT: 'DRIFT',
});

export const LEGACY_REVIEW_KEYS = Object.freeze(
  Array.from(
    { length: 8 },
    (_, index) => `review:scenario:${String(index + 1).padStart(2, '0')}`,
  ),
);

const REVIEW_DEFINITION_GROUPS = Object.freeze({
  reviews: Object.freeze([
    Object.freeze({
      productName: 'Stride Control Football Boots',
      rating: 5,
      moderationStatus: REVIEW_MODERATION_STATUSES.VISIBLE,
      text: 'Comfortable fit and solid grip for training sessions. The size felt true and the upper broke in quickly.',
    }),
    Object.freeze({
      productName: 'TouchLine Shin Guards',
      rating: 4,
      moderationStatus: REVIEW_MODERATION_STATUSES.HIDDEN,
      text: 'Good guards. Check my profile for discount codes and other gear deals.',
      moderationReason: 'Promotional or spam content.',
    }),
    Object.freeze({
      productName: 'WillowCraft English Cricket Bat',
      rating: 5,
      moderationStatus: REVIEW_MODERATION_STATUSES.VISIBLE,
      text: 'Well balanced bat with a clean pickup. It felt dependable for regular net practice.',
    }),
    Object.freeze({
      productName: 'GuardFlex Batting Pads',
      rating: 3,
      moderationStatus: REVIEW_MODERATION_STATUSES.HIDDEN,
      text: 'The pads are fine, but this review is mostly here to promote my sports page.',
      moderationReason: 'Promotional or irrelevant content.',
    }),
    Object.freeze({
      productName: 'Elevate Court Basketball Shoes',
      rating: 4,
      moderationStatus: REVIEW_MODERATION_STATUSES.VISIBLE,
      text: 'Good court traction and stable support. They stayed comfortable through a full indoor session.',
    }),
    Object.freeze({
      productName: 'DriveGuard Knee Sleeve Pair',
      rating: 3,
      moderationStatus: REVIEW_MODERATION_STATUSES.VISIBLE,
      text: 'Support is decent and the sleeves stay in place. I would prefer slightly more compression.',
    }),
    Object.freeze({
      productName: 'RallyPoint Control Tennis Racquet',
      rating: 5,
      moderationStatus: REVIEW_MODERATION_STATUSES.VISIBLE,
      text: 'Easy to control from the baseline and comfortable on longer rallies. A strong choice for regular practice.',
    }),
  ]),
  ratings: Object.freeze([
    Object.freeze({
      productName: 'SpinPath Overgrip Pack',
      rating: 4,
      moderationStatus: REVIEW_MODERATION_STATUSES.VISIBLE,
      text: 'The grip feels secure without being too tacky, and it was easy to wrap evenly.',
    }),
    Object.freeze({
      productName: 'AeroStrike Control Badminton Racquet',
      rating: 5,
      moderationStatus: REVIEW_MODERATION_STATUSES.VISIBLE,
      text: 'Light in hand with quick handling at the net. Clears and drives both felt predictable.',
    }),
    Object.freeze({
      productName: 'SwiftCourt Indoor Badminton Shoes',
      rating: 2,
      moderationStatus: REVIEW_MODERATION_STATUSES.HIDDEN,
      text: 'Shoes are okay. Visit my deal page for more offers and referral links.',
      moderationReason: 'Promotional or spam content.',
    }),
    Object.freeze({
      productName: 'TempoRun Daily Trainers',
      rating: 3,
      moderationStatus: REVIEW_MODERATION_STATUSES.VISIBLE,
      text: 'Comfortable for easy daily runs, though the cushioning feels firmer than I expected.',
    }),
    Object.freeze({
      productName: 'Endurance Breathable Running Tee',
      rating: 3,
      moderationStatus: REVIEW_MODERATION_STATUSES.HIDDEN,
      text: 'Average shirt. Follow my page and use my referral code for sports products.',
      moderationReason: 'Promotional or spam content.',
    }),
    Object.freeze({
      productName: 'CoreLift Cast Kettlebell',
      rating: 4,
      moderationStatus: REVIEW_MODERATION_STATUSES.VISIBLE,
      text: 'The handle has enough room for two-handed movements and the base sits steadily between sets.',
    }),
    Object.freeze({
      productName: 'BalanceFlow Yoga Mat',
      rating: 1,
      moderationStatus: REVIEW_MODERATION_STATUSES.VISIBLE,
      text: 'The mat is usable, but it feels thinner than I prefer and shifts slightly during faster transitions.',
    }),
  ]),
});

export const REVIEW_DEFINITIONS = Object.freeze(
  Object.entries(REVIEW_DEFINITION_GROUPS).flatMap(([customerKey, values]) =>
    values.map((value, index) =>
      Object.freeze({
        seedKey: `review:user:${customerKey}:${String(index + 1).padStart(2, '0')}`,
        customerSeedKey: `user:${customerKey}`,
        ordinal: index + 1,
        ...value,
      }),
    ),
  ),
);

function assertReview(condition, code, message) {
  if (!condition) {
    throw new SeedValidationError(code, message);
  }
}

function idString(value) {
  return value?.toString();
}

function dateString(value) {
  return value ? new Date(value).toISOString() : null;
}

function naturalKey(value) {
  return `${idString(value.customerId)}:${idString(value.productId)}`;
}

function reviewPayload(review) {
  return {
    _id: review._id,
    customerId: review.customerId,
    productId: review.productId,
    rating: review.rating,
    text: review.text,
    moderationStatus: review.moderationStatus,
    moderationReason: review.moderationReason,
    moderatedBy: review.moderatedBy,
    moderatedAt: review.moderatedAt,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

function comparableReview(value) {
  return {
    _id: idString(value?._id),
    customerId: idString(value?.customerId),
    productId: idString(value?.productId),
    rating: value?.rating,
    text: value?.text,
    moderationStatus: value?.moderationStatus,
    moderationReason: value?.moderationReason ?? null,
    moderatedBy: idString(value?.moderatedBy) ?? null,
    moderatedAt: dateString(value?.moderatedAt),
    createdAt: dateString(value?.createdAt),
    updatedAt: dateString(value?.updatedAt),
  };
}

function lookupById(values) {
  return new Map(values.map((value) => [idString(value._id), value]));
}

function ratingCounts(reviews) {
  return Object.fromEntries(
    [1, 2, 3, 4, 5].map((rating) => [
      rating,
      reviews.filter((review) => review.rating === rating).length,
    ]),
  );
}

export function buildExpectedReviews({
  registry,
  clock,
  matrix,
  productDefinitions,
  users,
}) {
  const eligibility = buildReviewEligibilityPlan(matrix);
  const productsById = lookupById(productDefinitions);
  const usersByKey = new Map(users.map((user) => [user.seedKey, user]));
  const ordersById = lookupById(matrix.orders);
  const admin = usersByKey.get('user:admin');

  return REVIEW_DEFINITIONS.map((definition) => {
    const customerKey = definition.customerSeedKey.slice('user:'.length);
    const relationship = eligibility[customerKey]?.[definition.ordinal - 1];
    const product = productsById.get(idString(relationship?.productId));
    const order = ordersById.get(idString(relationship?.orderId));
    const customer = usersByKey.get(definition.customerSeedKey);
    const createdAt = order
      ? new Date(
          order.updatedAt.getTime() +
            (12 + definition.ordinal) * 60 * 60 * 1000,
        )
      : null;
    const hidden =
      definition.moderationStatus === REVIEW_MODERATION_STATUSES.HIDDEN;
    const moderatedAt = hidden
      ? new Date(createdAt.getTime() + 6 * 60 * 60 * 1000)
      : null;

    return {
      seedKey: definition.seedKey,
      customerSeedKey: definition.customerSeedKey,
      productName: definition.productName,
      sport: product?.sport,
      orderId: relationship?.orderId,
      paymentId: relationship?.paymentId,
      itemId: relationship?.itemId,
      _id: registry.idFor(definition.seedKey),
      customerId: customer?._id,
      productId: relationship?.productId,
      rating: definition.rating,
      text: definition.text,
      moderationStatus: definition.moderationStatus,
      moderationReason: definition.moderationReason ?? null,
      moderatedBy: hidden ? admin?._id : null,
      moderatedAt,
      createdAt,
      updatedAt: moderatedAt ?? createdAt,
      anchorTime: clock.anchorTime,
    };
  });
}

function assertInMemoryPurchaseAuthority(review, matrix) {
  const order = matrix.orders.find(
    (candidate) => idString(candidate._id) === idString(review.orderId),
  );
  const payment = matrix.payments.find(
    (candidate) => idString(candidate._id) === idString(review.paymentId),
  );
  const item = order?.items.find(
    (candidate) => idString(candidate._id) === idString(review.itemId),
  );

  assertReview(
    order &&
      order.orderStatus === ORDER_STATUSES.DELIVERED &&
      idString(order.customerId) === idString(review.customerId) &&
      idString(order.paymentId) === idString(review.paymentId) &&
      item &&
      idString(item.productId) === idString(review.productId) &&
      payment &&
      payment.status === PAYMENT_STATUSES.SUCCEEDED &&
      payment.commerceResolution === PAYMENT_COMMERCE_RESOLUTIONS.ORDER &&
      idString(payment.customerId) === idString(review.customerId),
    'DEMO_REVIEW_ELIGIBILITY_INVALID',
    `Review ${review.seedKey} lacks exact delivered-purchase authority.`,
  );
}

export async function validateReviewDefinitions({
  registry,
  clock,
  matrix,
  productDefinitions,
  users,
}) {
  const reviews = buildExpectedReviews({
    registry,
    clock,
    matrix,
    productDefinitions,
    users,
  });
  const userByKey = new Map(users.map((user) => [user.seedKey, user]));
  const admin = userByKey.get('user:admin');
  const reviewCustomer = userByKey.get('user:reviews');
  const ratingCustomer = userByKey.get('user:ratings');
  const productById = lookupById(productDefinitions);
  const visible = reviews.filter(
    (review) => review.moderationStatus === REVIEW_MODERATION_STATUSES.VISIBLE,
  );
  const hidden = reviews.filter(
    (review) => review.moderationStatus === REVIEW_MODERATION_STATUSES.HIDDEN,
  );

  assertReview(
    registry.counts.reviews === 14 &&
      registry.entries.length === 709 &&
      reviews.length === 14 &&
      new Set(reviews.map((review) => idString(review._id))).size === 14 &&
      new Set(reviews.map(naturalKey)).size === 14,
    'DEMO_REVIEW_IDENTITIES_INVALID',
    'Review definitions require fourteen unique semantic identities.',
  );
  assertReview(
    admin?.role === 'admin' &&
      admin.emailVerified === true &&
      reviewCustomer?.role === 'customer' &&
      reviewCustomer.emailVerified === true &&
      ratingCustomer?.role === 'customer' &&
      ratingCustomer.emailVerified === true,
    'DEMO_REVIEW_AUTHORITIES_INVALID',
    'Review definitions require the exact verified Admin and Customers.',
  );
  assertReview(
    visible.length === 10 &&
      hidden.length === 4 &&
      reviews.filter((review) => review.customerSeedKey === 'user:reviews')
        .length === 7 &&
      reviews.filter((review) => review.customerSeedKey === 'user:ratings')
        .length === 7,
    'DEMO_REVIEW_MODERATION_TOTALS_INVALID',
    'Review definitions require exact 10 visible / 4 hidden totals.',
  );
  assertReview(
    isDeepStrictEqual(ratingCounts(reviews), {
      1: 1,
      2: 1,
      3: 4,
      4: 4,
      5: 4,
    }) &&
      isDeepStrictEqual(ratingCounts(visible), {
        1: 1,
        2: 0,
        3: 2,
        4: 3,
        5: 4,
      }) &&
      visible.reduce((total, review) => total + review.rating, 0) === 39,
    'DEMO_REVIEW_RATING_TOTALS_INVALID',
    'Review rating distributions differ from the lock.',
  );
  assertReview(
    new Set(visible.map((review) => review.sport)).size === 7,
    'DEMO_REVIEW_VISIBLE_SPORT_COVERAGE_INVALID',
    'Visible Reviews must cover all seven supported sports.',
  );

  for (const review of reviews) {
    const definition = REVIEW_DEFINITIONS.find(
      (candidate) => candidate.seedKey === review.seedKey,
    );
    const product = productById.get(idString(review.productId));
    const createInput = validateReviewCreateInput({
      rating: review.rating,
      text: review.text,
    });
    const moderationInput = validateReviewModerationInput(
      review.moderationStatus === REVIEW_MODERATION_STATUSES.HIDDEN
        ? {
            moderationStatus: REVIEW_MODERATION_STATUSES.HIDDEN,
            reason: review.moderationReason,
          }
        : { moderationStatus: REVIEW_MODERATION_STATUSES.VISIBLE },
    );

    assertReview(
      definition &&
        product?.name === definition.productName &&
        product.isActive === true &&
        createInput.rating === review.rating &&
        createInput.text === review.text &&
        moderationInput.moderationStatus === review.moderationStatus &&
        review.createdAt >
          matrix.orders.find(
            (order) => idString(order._id) === idString(review.orderId),
          ).updatedAt &&
        review.createdAt <= clock.anchorTime,
      'DEMO_REVIEW_DEFINITION_INVALID',
      `Review ${review.seedKey} differs from its exact locked definition.`,
    );

    if (review.moderationStatus === REVIEW_MODERATION_STATUSES.HIDDEN) {
      assertReview(
        idString(review.moderatedBy) === idString(admin._id) &&
          review.moderationReason === definition.moderationReason &&
          review.moderatedAt > review.createdAt &&
          review.moderatedAt <= clock.anchorTime &&
          review.updatedAt.getTime() === review.moderatedAt.getTime(),
        'DEMO_REVIEW_HIDDEN_AUDIT_INVALID',
        `Hidden Review ${review.seedKey} has invalid moderation audit data.`,
      );
    } else {
      assertReview(
        review.moderationReason === null &&
          review.moderatedBy === null &&
          review.moderatedAt === null &&
          review.updatedAt.getTime() === review.createdAt.getTime(),
        'DEMO_REVIEW_VISIBLE_AUDIT_INVALID',
        `Visible Review ${review.seedKey} has unexpected moderation data.`,
      );
    }

    assertInMemoryPurchaseAuthority(review, matrix);
    await new Review(reviewPayload(review)).validate();
  }

  return {
    reviews,
    counts: {
      reviews: reviews.length,
      visible: visible.length,
      hidden: hidden.length,
      visibleRatingSum: 39,
      visibleAverage: 3.9,
      sports: new Set(visible.map((review) => review.sport)).size,
    },
    authorities: { admin, reviewCustomer, ratingCustomer },
  };
}

export function classifyReviewRecord({ expected, recordById, recordByNatural }) {
  if (recordById && naturalKey(recordById) !== naturalKey(expected)) {
    return { classification: REVIEW_CLASSIFICATIONS.ID_CONFLICT };
  }

  if (
    recordByNatural &&
    idString(recordByNatural._id) !== idString(expected._id)
  ) {
    return { classification: REVIEW_CLASSIFICATIONS.NATURAL_KEY_CONFLICT };
  }

  if (!recordById && !recordByNatural) {
    return { classification: REVIEW_CLASSIFICATIONS.MISSING };
  }

  const existing = recordById || recordByNatural;

  if (!isDeepStrictEqual(comparableReview(existing), comparableReview(expected))) {
    return { classification: REVIEW_CLASSIFICATIONS.DRIFT };
  }

  return { classification: REVIEW_CLASSIFICATIONS.EXACT };
}

export function findLegacyReviewPlaceholders(records) {
  const legacyIds = new Set(
    LEGACY_REVIEW_KEYS.map((key) => idString(deterministicObjectId(key))),
  );

  return records.filter((record) => legacyIds.has(idString(record._id)));
}

export async function preflightReviews(expectedReviews, records = null) {
  const existingRecords = records ?? (await Review.find({}).lean());
  const legacy = findLegacyReviewPlaceholders(existingRecords);

  if (legacy.length > 0) {
    throw new SeedDriftError(
      'Legacy deterministic Review placeholder ownership unexpectedly exists.',
    );
  }

  const byId = new Map(
    existingRecords.map((record) => [idString(record._id), record]),
  );
  const byNatural = new Map();

  for (const record of existingRecords) {
    const key = naturalKey(record);

    if (byNatural.has(key)) {
      throw new SeedDriftError(
        `Review preflight found duplicate customer/product identity ${key}.`,
      );
    }

    byNatural.set(key, record);
  }

  const results = expectedReviews.map((expected) => ({
    expected,
    ...classifyReviewRecord({
      expected,
      recordById: byId.get(idString(expected._id)),
      recordByNatural: byNatural.get(naturalKey(expected)),
    }),
  }));
  const failures = results.filter(
    (result) =>
      ![
        REVIEW_CLASSIFICATIONS.MISSING,
        REVIEW_CLASSIFICATIONS.EXACT,
      ].includes(result.classification),
  );

  if (failures.length > 0) {
    throw new SeedDriftError(
      `Review preflight rejected: ${failures
        .map(
          (failure) =>
            `${failure.expected.seedKey}:${failure.classification}`,
        )
        .join(', ')}.`,
    );
  }

  return results;
}

export async function snapshotUnrelatedReviews(expectedReviews) {
  const expectedIds = new Set(
    expectedReviews.map((review) => idString(review._id)),
  );
  const expectedNaturalKeys = new Set(expectedReviews.map(naturalKey));
  const records = await Review.collection
    .find({})
    .sort({ _id: 1 })
    .toArray();

  return JSON.stringify(
    records.filter(
      (record) =>
        !expectedIds.has(idString(record._id)) &&
        !expectedNaturalKeys.has(naturalKey(record)),
    ),
  );
}

async function snapshotReviewProtectedData() {
  const models = [
    User,
    Product,
    Inventory,
    InventoryAdjustment,
    Coupon,
    Cart,
    Payment,
    Order,
    Refund,
    Notification,
  ];
  const snapshots = await Promise.all(
    models.map((Model) =>
      Model.collection.find({}).sort({ _id: 1 }).toArray(),
    ),
  );

  return JSON.stringify(snapshots);
}

export async function verifyPersistedReviewAuthorities(validated) {
  const expectedReviews = validated.reviews;
  const userIds = [
    validated.authorities.admin._id,
    validated.authorities.reviewCustomer._id,
    validated.authorities.ratingCustomer._id,
  ];
  const productIds = expectedReviews.map((review) => review.productId);
  const orderIds = [...new Set(expectedReviews.map((review) => idString(review.orderId)))];
  const paymentIds = [
    ...new Set(expectedReviews.map((review) => idString(review.paymentId))),
  ];
  const [users, products, orders, payments] = await Promise.all([
    User.find({ _id: { $in: userIds } })
      .select('_id email role emailVerified')
      .lean(),
    Product.find({ _id: { $in: productIds } })
      .select('_id name sport isActive')
      .lean(),
    Order.find({ _id: { $in: orderIds } }).lean(),
    Payment.find({ _id: { $in: paymentIds } }).lean(),
  ]);
  const usersById = lookupById(users);
  const productsById = lookupById(products);
  const ordersById = lookupById(orders);
  const paymentsById = lookupById(payments);

  for (const authority of Object.values(validated.authorities)) {
    const actual = usersById.get(idString(authority._id));

    assertReview(
      actual &&
        actual.email === authority.email &&
        actual.role === authority.role &&
        actual.emailVerified === true,
      'DEMO_REVIEW_PERSISTED_USER_AUTHORITY_INVALID',
      `Persisted Review authority ${authority.seedKey} is invalid.`,
    );
  }

  for (const review of expectedReviews) {
    const product = productsById.get(idString(review.productId));
    const order = ordersById.get(idString(review.orderId));
    const payment = paymentsById.get(idString(review.paymentId));
    const item = order?.items.find(
      (candidate) => idString(candidate._id) === idString(review.itemId),
    );

    assertReview(
      product?.name === review.productName &&
        product.isActive === true &&
        order &&
        order.orderStatus === ORDER_STATUSES.DELIVERED &&
        idString(order.customerId) === idString(review.customerId) &&
        idString(order.paymentId) === idString(review.paymentId) &&
        item &&
        idString(item.productId) === idString(review.productId) &&
        payment &&
        payment.status === PAYMENT_STATUSES.SUCCEEDED &&
        payment.commerceResolution === PAYMENT_COMMERCE_RESOLUTIONS.ORDER &&
        idString(payment.customerId) === idString(review.customerId),
      'DEMO_REVIEW_PERSISTED_PURCHASE_AUTHORITY_INVALID',
      `Persisted purchase authority failed for ${review.seedKey}.`,
    );
  }

  return { verified: expectedReviews.length, products: products.length };
}

export async function seedReviews({ validated, historicalDefinitions }) {
  const historical = await preflightHistoricalCommerce(historicalDefinitions);

  assertReview(
    historical.state === HISTORICAL_COMMERCE_STATES.EXACT_FINAL,
    'DEMO_REVIEW_HISTORICAL_COMMERCE_REQUIRED',
    'Review persistence requires the exact final historical commerce layer.',
  );

  const beforeProtected = await snapshotReviewProtectedData();
  const beforeUnrelated = await snapshotUnrelatedReviews(validated.reviews);
  await verifyPersistedReviewAuthorities(validated);
  const preflight = await preflightReviews(validated.reviews);
  const missing = preflight.filter(
    (result) => result.classification === REVIEW_CLASSIFICATIONS.MISSING,
  );

  if (missing.length > 0) {
    try {
      await withSeedTransaction(async (session) => {
        await Review.collection.insertMany(
          missing.map((result) => reviewPayload(result.expected)),
          { ordered: true, session },
        );
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new SeedValidationError(
          'DEMO_REVIEW_DUPLICATE_KEY',
          'A concurrent write created a Review ownership conflict.',
        );
      }

      throw error;
    }
  }

  const postflight = await preflightReviews(validated.reviews);
  await verifyPersistedReviewAuthorities(validated);
  const afterUnrelated = await snapshotUnrelatedReviews(validated.reviews);
  const afterProtected = await snapshotReviewProtectedData();

  assertReview(
    postflight.every(
      (result) => result.classification === REVIEW_CLASSIFICATIONS.EXACT,
    ),
    'DEMO_REVIEW_POSTFLIGHT_FAILED',
    'Review postflight did not find fourteen exact deterministic records.',
  );
  assertReview(
    beforeUnrelated === afterUnrelated,
    'DEMO_REVIEW_UNRELATED_CHANGED',
    'Unrelated Reviews changed during deterministic Review seeding.',
  );
  assertReview(
    beforeProtected === afterProtected,
    'DEMO_REVIEW_PROTECTED_DATA_CHANGED',
    'Review seeding changed protected application data.',
  );

  return {
    ...validated,
    created: missing.length,
    skipped: validated.reviews.length - missing.length,
  };
}

export function exactReviewOwnershipFilter(expectedReviews) {
  assertReview(
    Array.isArray(expectedReviews) && expectedReviews.length === 14,
    'DEMO_REVIEW_RESET_SCOPE_INVALID',
    'Review reset requires all fourteen exact deterministic identities.',
  );

  return {
    $or: expectedReviews.map((review) => ({
      _id: review._id,
      customerId: review.customerId,
      productId: review.productId,
    })),
  };
}

export async function resetReviews(validated) {
  const preflight = await preflightReviews(validated.reviews);
  const exact = preflight.filter(
    (result) => result.classification === REVIEW_CLASSIFICATIONS.EXACT,
  );

  if (exact.length === 0) {
    return { deleted: 0 };
  }

  assertReview(
    exact.length === 14,
    'DEMO_REVIEW_RESET_INCOMPLETE',
    'Review reset requires all fourteen deterministic Reviews to be exact.',
  );

  const beforeUnrelated = await snapshotUnrelatedReviews(validated.reviews);
  let deleted = 0;

  await withSeedTransaction(async (session) => {
    const result = await Review.deleteMany(
      exactReviewOwnershipFilter(validated.reviews),
      { session },
    );
    deleted = result.deletedCount;

    assertReview(
      deleted === 14,
      'DEMO_REVIEW_RESET_COUNT_MISMATCH',
      'Review reset did not delete exactly fourteen deterministic Reviews.',
    );
  });

  const postflight = await preflightReviews(validated.reviews);
  const afterUnrelated = await snapshotUnrelatedReviews(validated.reviews);

  assertReview(
    postflight.every(
      (result) => result.classification === REVIEW_CLASSIFICATIONS.MISSING,
    ) && beforeUnrelated === afterUnrelated,
    'DEMO_REVIEW_RESET_POSTFLIGHT_FAILED',
    'Review reset did not preserve the exact unrelated Review state.',
  );

  return { deleted };
}
