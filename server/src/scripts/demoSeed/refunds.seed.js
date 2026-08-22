import { isDeepStrictEqual } from 'node:util';

import mongoose from 'mongoose';

import { Cart } from '../../modules/cart/cart.model.js';
import { Coupon } from '../../modules/coupon/coupon.model.js';
import { getRefundAnalytics } from '../../modules/analytics/refundAnalytics.service.js';
import { Inventory } from '../../modules/inventory/inventory.model.js';
import { InventoryAdjustment } from '../../modules/inventory/inventoryAdjustment.model.js';
import { Notification } from '../../modules/notification/notification.model.js';
import { Order, ORDER_STATUSES } from '../../modules/order/order.model.js';
import {
  Payment,
  PAYMENT_COMMERCE_RESOLUTIONS,
  PAYMENT_STATUSES,
} from '../../modules/payment/payment.model.js';
import {
  REFUND_ADMIN_DECISIONS,
  REFUND_ORIGINS,
  REFUND_SCOPES,
  REFUND_STATUSES,
  REFUND_SYSTEM_REASONS,
  isRefundScopeOccupyingStatus,
} from '../../modules/refund/refund.constants.js';
import {
  buildRefundScopeClaimKeys,
  calculateOrderRefundAmount,
  normalizeOrderRefundScope,
  refundScopesConflict,
} from '../../modules/refund/refund.domain.js';
import { Refund } from '../../modules/refund/refund.model.js';
import {
  getAdminRefund,
  getAdminRefunds,
  getCustomerRefund,
  getCustomerRefunds,
} from '../../modules/refund/refund.service.js';
import {
  validateAdminRefundDecisionInput,
  validateCustomerRefundRequestInput,
} from '../../modules/refund/refund.validation.js';
import { Review } from '../../modules/review/review.model.js';
import { User } from '../../modules/users/user.model.js';
import { buildRefundEligibilityPlan } from './commerce.scenarios.seed.js';
import {
  HISTORICAL_COMMERCE_STATES,
  preflightHistoricalCommerce,
} from './commerce.persistence.seed.js';
import { preflightReviews } from './reviews.seed.js';
import { deterministicObjectId } from './seed.registry.js';
import {
  SeedDriftError,
  SeedValidationError,
  withSeedTransaction,
} from './seed.utils.js';

export const REFUND_CLASSIFICATIONS = Object.freeze({
  MISSING: 'MISSING',
  EXACT: 'EXACT',
  ID_CONFLICT: 'ID_CONFLICT',
  NATURAL_KEY_CONFLICT: 'NATURAL_KEY_CONFLICT',
  SCOPE_CONFLICT: 'SCOPE_CONFLICT',
  PROVIDER_REFUND_ID_CONFLICT: 'PROVIDER_REFUND_ID_CONFLICT',
  DRIFT: 'DRIFT',
});

export const LEGACY_REFUND_KEYS = Object.freeze(
  Array.from(
    { length: 4 },
    (_, index) => `refund:scenario:${String(index + 1).padStart(2, '0')}`,
  ),
);

const CUSTOMER_DEFINITIONS = Object.freeze([
  Object.freeze({
    status: REFUND_STATUSES.REQUESTED,
    daysAgo: 3,
    reason: 'Changed my mind about this item.',
    explanation: 'The item is unused and still in its original packaging.',
  }),
  Object.freeze({
    status: REFUND_STATUSES.APPROVED,
    daysAgo: 7,
    reason: 'The fit is not right for me.',
    restockOnCompletion: true,
  }),
  Object.freeze({
    status: REFUND_STATUSES.REJECTED,
    daysAgo: 11,
    reason: 'The item did not meet my expectations.',
    explanation: 'I would like to return it after trying it.',
    adminDecisionNote:
      'Request does not meet the accepted return conditions.',
  }),
  Object.freeze({
    status: REFUND_STATUSES.PROCESSING,
    daysAgo: 15,
    reason: 'The item arrived with a minor issue.',
    explanation: 'I would like the approved refund to be processed.',
    restockOnCompletion: false,
  }),
  Object.freeze({
    status: REFUND_STATUSES.REFUNDED,
    daysAgo: 21,
    reason: 'I would like to return this item.',
    explanation: 'The return was accepted and the refund was completed.',
    restockOnCompletion: false,
  }),
  Object.freeze({
    status: REFUND_STATUSES.FAILED,
    daysAgo: 27,
    reason: 'The product quality was not as expected.',
    restockOnCompletion: true,
  }),
]);

const CANCELLATION_STATUSES = Object.freeze([
  REFUND_STATUSES.REFUNDED,
  REFUND_STATUSES.APPROVED,
  REFUND_STATUSES.PROCESSING,
  REFUND_STATUSES.FAILED,
]);

const COMPENSATION_STATUSES = Object.freeze([
  REFUND_STATUSES.REFUNDED,
  REFUND_STATUSES.FAILED,
]);

const PROVIDER_STATUSES = new Set([
  REFUND_STATUSES.PROCESSING,
  REFUND_STATUSES.REFUNDED,
  REFUND_STATUSES.FAILED,
]);

function assertRefund(condition, code, message) {
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

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addHours(date, hours) {
  return addMinutes(date, hours * 60);
}

function refundNaturalKey(refund) {
  if (refund.origin === REFUND_ORIGINS.ORDER_CANCELLATION) {
    return `cancellation:${idString(refund.orderId)}`;
  }

  if (refund.origin === REFUND_ORIGINS.SYSTEM_COMPENSATION) {
    return `compensation:${idString(refund.paymentId)}`;
  }

  return [
    'customer',
    idString(refund.customerId),
    idString(refund.orderId),
    refund.origin,
    refund.scope,
    ...(refund.itemIds ?? []).map(idString).sort(),
  ].join(':');
}

function providerRefundId(refundId) {
  return `demo_rzp_refund_${idString(refundId)}`;
}

export function refundPayload(refund) {
  return {
    _id: refund._id,
    customerId: refund.customerId,
    ...(refund.orderId ? { orderId: refund.orderId } : {}),
    paymentId: refund.paymentId,
    provider: refund.provider,
    ...(refund.providerRefundId
      ? { providerRefundId: refund.providerRefundId }
      : {}),
    origin: refund.origin,
    status: refund.status,
    ...(refund.scope ? { scope: refund.scope } : {}),
    ...(refund.itemIds !== undefined ? { itemIds: refund.itemIds } : {}),
    amount: refund.amount,
    reason: refund.reason,
    ...(refund.explanation ? { explanation: refund.explanation } : {}),
    currency: refund.currency,
    ...(refund.restockOnCompletion !== undefined
      ? { restockOnCompletion: refund.restockOnCompletion }
      : {}),
    ...(refund.reviewedBy ? { reviewedBy: refund.reviewedBy } : {}),
    ...(refund.adminDecisionNote
      ? { adminDecisionNote: refund.adminDecisionNote }
      : {}),
    ...(refund.reviewedAt ? { reviewedAt: refund.reviewedAt } : {}),
    ...(refund.refundedAt ? { refundedAt: refund.refundedAt } : {}),
    ...(refund.scopeClaimKeys !== undefined
      ? { scopeClaimKeys: refund.scopeClaimKeys }
      : {}),
    scopeOccupied: refund.scopeOccupied,
    requestedAt: refund.requestedAt,
    createdAt: refund.createdAt,
    updatedAt: refund.updatedAt,
  };
}

function comparableRefund(refund) {
  return {
    _id: idString(refund?._id),
    customerId: idString(refund?.customerId),
    orderId: idString(refund?.orderId) ?? null,
    paymentId: idString(refund?.paymentId) ?? null,
    provider: refund?.provider ?? null,
    providerRefundId: refund?.providerRefundId ?? null,
    origin: refund?.origin,
    status: refund?.status,
    scope: refund?.scope ?? null,
    itemIds:
      refund?.itemIds === undefined ? null : refund.itemIds.map(idString),
    amount: refund?.amount,
    reason: refund?.reason,
    explanation: refund?.explanation ?? null,
    currency: refund?.currency,
    restockOnCompletion: refund?.restockOnCompletion ?? null,
    reviewedBy: idString(refund?.reviewedBy) ?? null,
    adminDecisionNote: refund?.adminDecisionNote ?? null,
    reviewedAt: dateString(refund?.reviewedAt),
    refundedAt: dateString(refund?.refundedAt),
    scopeClaimKeys:
      refund?.scopeClaimKeys === undefined ? null : refund.scopeClaimKeys,
    scopeOccupied: refund?.scopeOccupied ?? null,
    requestedAt: dateString(refund?.requestedAt),
    createdAt: dateString(refund?.createdAt),
    updatedAt: dateString(refund?.updatedAt),
  };
}

function lookupById(values) {
  return new Map(values.map((value) => [idString(value._id), value]));
}

function buildCustomerRefunds({ registry, clock, eligibility, matrix, admin }) {
  const ordersById = lookupById(matrix.orders);
  const paymentsById = lookupById(matrix.payments);

  return CUSTOMER_DEFINITIONS.map((definition, index) => {
    const relationship = eligibility[index];
    const order = ordersById.get(idString(relationship?.orderId));
    const payment = paymentsById.get(idString(relationship?.paymentId));
    const seedKey = `refund:customer-request:${String(index + 1).padStart(2, '0')}`;
    const _id = registry.idFor(seedKey);
    const requestedAt = clock.atLocalTime(clock.daysAgo(definition.daysAgo), {
      hour: 10,
      minute: index + 1,
    });
    const reviewedAt = index === 0 ? undefined : addHours(requestedAt, 12);
    const providerAt = PROVIDER_STATUSES.has(definition.status)
      ? addHours(reviewedAt, 6)
      : undefined;
    const normalized = order
      ? normalizeOrderRefundScope({
          order,
          scope: REFUND_SCOPES.ITEMS,
          itemIds: relationship.itemIds,
        })
      : { itemIds: relationship?.itemIds ?? [] };

    return {
      seedKey,
      ordinal: index + 1,
      _id,
      customerId: relationship?.customerId,
      orderId: relationship?.orderId,
      paymentId: relationship?.paymentId,
      provider: payment?.provider,
      ...(providerAt ? { providerRefundId: providerRefundId(_id) } : {}),
      origin: REFUND_ORIGINS.CUSTOMER_REQUEST,
      status: definition.status,
      scope: REFUND_SCOPES.ITEMS,
      itemIds: normalized.itemIds,
      amount: order
        ? calculateOrderRefundAmount({
            order,
            scope: REFUND_SCOPES.ITEMS,
            itemIds: normalized.itemIds,
          })
        : 0,
      reason: definition.reason,
      ...(definition.explanation
        ? { explanation: definition.explanation }
        : {}),
      currency: payment?.currency,
      ...(definition.restockOnCompletion !== undefined
        ? { restockOnCompletion: definition.restockOnCompletion }
        : {}),
      ...(reviewedAt ? { reviewedBy: admin?._id, reviewedAt } : {}),
      ...(definition.adminDecisionNote
        ? { adminDecisionNote: definition.adminDecisionNote }
        : {}),
      ...(definition.status === REFUND_STATUSES.REFUNDED
        ? { refundedAt: providerAt }
        : {}),
      scopeClaimKeys: order
        ? buildRefundScopeClaimKeys({
            order,
            scope: REFUND_SCOPES.ITEMS,
            itemIds: normalized.itemIds,
          })
        : [],
      scopeOccupied: isRefundScopeOccupyingStatus(definition.status),
      requestedAt,
      createdAt: requestedAt,
      updatedAt: providerAt ?? reviewedAt ?? requestedAt,
    };
  });
}

function buildCancellationRefunds({ registry, eligibility, matrix }) {
  const ordersById = lookupById(matrix.orders);
  const paymentsById = lookupById(matrix.payments);

  return CANCELLATION_STATUSES.map((status, index) => {
    const relationship = eligibility[index];
    const order = ordersById.get(idString(relationship?.orderId));
    const payment = paymentsById.get(idString(relationship?.paymentId));
    const seedKey = `refund:order-cancellation:${String(index + 1).padStart(2, '0')}`;
    const _id = registry.idFor(seedKey);
    const requestedAt = order?.cancelledAt
      ? addMinutes(order.cancelledAt, 5)
      : null;
    const providerAt = PROVIDER_STATUSES.has(status)
      ? addMinutes(requestedAt, 30)
      : undefined;

    return {
      seedKey,
      ordinal: index + 1,
      _id,
      customerId: relationship?.customerId,
      orderId: relationship?.orderId,
      paymentId: relationship?.paymentId,
      provider: payment?.provider,
      ...(providerAt ? { providerRefundId: providerRefundId(_id) } : {}),
      origin: REFUND_ORIGINS.ORDER_CANCELLATION,
      status,
      scope: REFUND_SCOPES.ORDER,
      itemIds: [],
      amount: order?.totalAmount ?? 0,
      reason: REFUND_SYSTEM_REASONS.ORDER_CANCELLATION,
      currency: payment?.currency,
      restockOnCompletion: false,
      ...(status === REFUND_STATUSES.REFUNDED
        ? { refundedAt: providerAt }
        : {}),
      scopeClaimKeys: order
        ? buildRefundScopeClaimKeys({
            order,
            scope: REFUND_SCOPES.ORDER,
          })
        : [],
      scopeOccupied: true,
      requestedAt,
      createdAt: requestedAt,
      updatedAt: providerAt ?? requestedAt,
    };
  });
}

function buildCompensationRefunds({ registry, eligibility, matrix }) {
  const paymentsById = lookupById(matrix.payments);

  return COMPENSATION_STATUSES.map((status, index) => {
    const relationship = eligibility[index];
    const payment = paymentsById.get(idString(relationship?.paymentId));
    const seedKey = `refund:system-compensation:${String(index + 1).padStart(2, '0')}`;
    const _id = registry.idFor(seedKey);
    const requestedAt = payment?.verifiedAt
      ? addMinutes(payment.verifiedAt, 5)
      : null;
    const providerAt = requestedAt ? addMinutes(requestedAt, 30) : null;

    return {
      seedKey,
      ordinal: index + 1,
      _id,
      customerId: relationship?.customerId,
      paymentId: relationship?.paymentId,
      provider: payment?.provider,
      providerRefundId: providerRefundId(_id),
      origin: REFUND_ORIGINS.SYSTEM_COMPENSATION,
      status,
      amount: payment?.amount ?? 0,
      reason: REFUND_SYSTEM_REASONS.SYSTEM_COMPENSATION,
      currency: payment?.currency,
      restockOnCompletion: false,
      ...(status === REFUND_STATUSES.REFUNDED
        ? { refundedAt: providerAt }
        : {}),
      scopeOccupied: false,
      requestedAt,
      createdAt: requestedAt,
      updatedAt: providerAt,
    };
  });
}

export function buildExpectedRefunds({ registry, clock, matrix, users }) {
  const eligibility = buildRefundEligibilityPlan(matrix);
  const admin = users.find((user) => user.seedKey === 'user:admin');

  const customerRequests = buildCustomerRefunds({
    registry,
    clock,
    eligibility: eligibility.customerRequest,
    matrix,
    admin,
  });
  const orderCancellations = buildCancellationRefunds({
    registry,
    eligibility: eligibility.orderCancellation,
    matrix,
  });
  const systemCompensations = buildCompensationRefunds({
    registry,
    eligibility: eligibility.systemCompensation,
    matrix,
  });

  return {
    refunds: [
      ...customerRequests,
      ...orderCancellations,
      ...systemCompensations,
    ],
    eligibility,
    groups: { customerRequests, orderCancellations, systemCompensations },
    authorities: { admin },
  };
}

function countBy(values, field) {
  return Object.fromEntries(
    [...new Set(values.map((value) => value[field]))].map((key) => [
      key,
      values.filter((value) => value[field] === key).length,
    ]),
  );
}

function assertNoExpectedScopeCollisions(refunds) {
  for (let leftIndex = 0; leftIndex < refunds.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < refunds.length;
      rightIndex += 1
    ) {
      assertRefund(
        !refundScopesConflict(refunds[leftIndex], refunds[rightIndex]),
        'DEMO_REFUND_SCOPE_COLLISION',
        `Refunds ${refunds[leftIndex].seedKey} and ${refunds[rightIndex].seedKey} overlap.`,
      );
    }
  }
}

export async function validateRefundDefinitions({ registry, clock, matrix, users }) {
  const built = buildExpectedRefunds({ registry, clock, matrix, users });
  const { refunds, eligibility, groups, authorities } = built;
  const ordersById = lookupById(matrix.orders);
  const paymentsById = lookupById(matrix.payments);
  const expectedOrderSeeds = [
    'order:historical:14',
    'order:historical:36',
    'order:historical:37',
    'order:historical:38',
  ];

  assertRefund(
    registry.entries.length === 717 &&
      registry.counts.refunds === 12 &&
      refunds.length === 12 &&
      new Set(refunds.map((refund) => idString(refund._id))).size === 12 &&
      new Set(refunds.map(refundNaturalKey)).size === 12,
    'DEMO_REFUND_IDENTITIES_INVALID',
    'Refund definitions require twelve unique semantic identities.',
  );
  assertRefund(
    eligibility.customerRequest.length === 6 &&
      eligibility.orderCancellation.length === 4 &&
      eligibility.systemCompensation.length === 2,
    'DEMO_REFUND_ELIGIBILITY_COUNTS_INVALID',
    'Refund eligibility must resolve to exact 6/4/2 groups.',
  );
  assertRefund(
    isDeepStrictEqual(countBy(refunds, 'origin'), {
      [REFUND_ORIGINS.CUSTOMER_REQUEST]: 6,
      [REFUND_ORIGINS.ORDER_CANCELLATION]: 4,
      [REFUND_ORIGINS.SYSTEM_COMPENSATION]: 2,
    }) &&
      isDeepStrictEqual(countBy(refunds, 'status'), {
        [REFUND_STATUSES.REQUESTED]: 1,
        [REFUND_STATUSES.APPROVED]: 2,
        [REFUND_STATUSES.REJECTED]: 1,
        [REFUND_STATUSES.PROCESSING]: 2,
        [REFUND_STATUSES.REFUNDED]: 3,
        [REFUND_STATUSES.FAILED]: 3,
      }),
    'DEMO_REFUND_DISTRIBUTION_INVALID',
    'Refund origin or status distribution differs from the lock.',
  );
  assertRefund(
    refunds.filter((refund) => refund.providerRefundId).length === 8 &&
      new Set(
        refunds
          .filter((refund) => refund.providerRefundId)
          .map((refund) => refund.providerRefundId),
      ).size === 8 &&
      refunds.filter((refund) => refund.refundedAt).length === 3 &&
      groups.customerRequests.filter((refund) => refund.reviewedBy).length ===
        5,
    'DEMO_REFUND_PROVIDER_AUDIT_TOTALS_INVALID',
    'Refund provider or audit totals differ from the lock.',
  );
  assertRefund(
    authorities.admin?.role === 'admin' &&
      authorities.admin.emailVerified === true,
    'DEMO_REFUND_ADMIN_AUTHORITY_INVALID',
    'Refund definitions require the exact verified Admin authority.',
  );

  for (const [index, refund] of groups.customerRequests.entries()) {
    const order = ordersById.get(idString(refund.orderId));
    const payment = paymentsById.get(idString(refund.paymentId));
    const definition = CUSTOMER_DEFINITIONS[index];
    const requestInput = validateCustomerRefundRequestInput({
      scope: refund.scope,
      orderItemIds: refund.itemIds.map(idString),
      reason: refund.reason,
      ...(refund.explanation ? { explanation: refund.explanation } : {}),
    });

    assertRefund(
      order?.seedKey === `order:historical:${String(31 + Math.floor(index / 2)).padStart(2, '0')}` &&
        order.orderStatus === ORDER_STATUSES.DELIVERED &&
        idString(order.customerId) === idString(refund.customerId) &&
        idString(order.paymentId) === idString(refund.paymentId) &&
        order.items.some(
          (item) => idString(item._id) === idString(refund.itemIds[0]),
        ) &&
        payment?.status === PAYMENT_STATUSES.SUCCEEDED &&
        payment.commerceResolution === PAYMENT_COMMERCE_RESOLUTIONS.ORDER &&
        idString(payment.customerId) === idString(refund.customerId) &&
        requestInput.reason === definition.reason &&
        refund.requestedAt > order.updatedAt &&
        refund.updatedAt <= clock.anchorTime,
      'DEMO_REFUND_CUSTOMER_AUTHORITY_INVALID',
      `Customer Refund ${refund.seedKey} lacks exact authority.`,
    );

    if (index > 0) {
      const decision = validateAdminRefundDecisionInput(
        refund.status === REFUND_STATUSES.REJECTED
          ? {
              decision: REFUND_ADMIN_DECISIONS.REJECT,
              adminDecisionNote: refund.adminDecisionNote,
            }
          : {
              decision: REFUND_ADMIN_DECISIONS.APPROVE,
              restockOnCompletion: refund.restockOnCompletion,
            },
      );
      assertRefund(
        idString(refund.reviewedBy) === idString(authorities.admin._id) &&
          refund.reviewedAt.getTime() ===
            addHours(refund.requestedAt, 12).getTime() &&
          decision.decision ===
            (refund.status === REFUND_STATUSES.REJECTED
              ? REFUND_ADMIN_DECISIONS.REJECT
              : REFUND_ADMIN_DECISIONS.APPROVE),
        'DEMO_REFUND_CUSTOMER_DECISION_INVALID',
        `Customer Refund ${refund.seedKey} has invalid decision audit.`,
      );
    }
  }

  for (const [index, refund] of groups.orderCancellations.entries()) {
    const order = ordersById.get(idString(refund.orderId));
    const payment = paymentsById.get(idString(refund.paymentId));
    assertRefund(
      order?.seedKey === expectedOrderSeeds[index] &&
        order.orderStatus === ORDER_STATUSES.CANCELLED &&
        order.cancelledAt &&
        payment?.status === PAYMENT_STATUSES.SUCCEEDED &&
        payment.commerceResolution === PAYMENT_COMMERCE_RESOLUTIONS.ORDER &&
        payment.amount === order.totalAmount &&
        idString(payment.customerId) === idString(order.customerId) &&
        refund.amount === order.totalAmount &&
        refund.requestedAt.getTime() ===
          addMinutes(order.cancelledAt, 5).getTime(),
      'DEMO_REFUND_CANCELLATION_AUTHORITY_INVALID',
      `Cancellation Refund ${refund.seedKey} lacks exact authority.`,
    );
  }

  for (const [index, refund] of groups.systemCompensations.entries()) {
    const payment = paymentsById.get(idString(refund.paymentId));
    assertRefund(
      payment?.seedKey ===
        `payment:system-compensation:${String(index + 1).padStart(2, '0')}` &&
        payment.status === PAYMENT_STATUSES.SUCCEEDED &&
        payment.commerceResolution ===
          PAYMENT_COMMERCE_RESOLUTIONS.SYSTEM_COMPENSATION &&
        payment.providerPaymentId &&
        !matrix.orders.some(
          (order) => idString(order.paymentId) === idString(payment._id),
        ) &&
        refund.amount === payment.amount &&
        refund.requestedAt.getTime() ===
          addMinutes(payment.verifiedAt, 5).getTime(),
      'DEMO_REFUND_COMPENSATION_AUTHORITY_INVALID',
      `Compensation Refund ${refund.seedKey} lacks exact authority.`,
    );
  }

  assertNoExpectedScopeCollisions(refunds);

  for (const refund of refunds) {
    assertRefund(
      Number.isSafeInteger(refund.amount) &&
        refund.amount > 0 &&
        refund.currency === 'INR' &&
        refund.updatedAt <= clock.anchorTime,
      'DEMO_REFUND_AMOUNT_OR_TIME_INVALID',
      `Refund ${refund.seedKey} has invalid amount, currency, or time.`,
    );
    await new Refund(refundPayload(refund)).validate();
  }

  return {
    ...built,
    counts: {
      refunds: 12,
      origins: countBy(refunds, 'origin'),
      statuses: countBy(refunds, 'status'),
      providerRefundIds: 8,
      refunded: 3,
      reviewed: 5,
      activeScopeCollisions: 0,
      refundReturnAdjustments: 0,
    },
  };
}

export function classifyRefundRecord({
  expected,
  recordById,
  recordByNatural,
  recordByProviderRefundId,
  scopeConflict,
}) {
  if (recordById && refundNaturalKey(recordById) !== refundNaturalKey(expected)) {
    return { classification: REFUND_CLASSIFICATIONS.ID_CONFLICT };
  }
  if (
    recordByNatural &&
    idString(recordByNatural._id) !== idString(expected._id)
  ) {
    return { classification: REFUND_CLASSIFICATIONS.NATURAL_KEY_CONFLICT };
  }
  if (
    recordByProviderRefundId &&
    idString(recordByProviderRefundId._id) !== idString(expected._id)
  ) {
    return {
      classification: REFUND_CLASSIFICATIONS.PROVIDER_REFUND_ID_CONFLICT,
    };
  }
  if (scopeConflict) {
    return { classification: REFUND_CLASSIFICATIONS.SCOPE_CONFLICT };
  }
  if (!recordById && !recordByNatural) {
    return { classification: REFUND_CLASSIFICATIONS.MISSING };
  }

  const existing = recordById || recordByNatural;
  return {
    classification: isDeepStrictEqual(
      comparableRefund(existing),
      comparableRefund(expected),
    )
      ? REFUND_CLASSIFICATIONS.EXACT
      : REFUND_CLASSIFICATIONS.DRIFT,
  };
}

export function findLegacyRefundPlaceholders(records) {
  const legacyIds = new Set(
    LEGACY_REFUND_KEYS.map((key) => idString(deterministicObjectId(key))),
  );
  return records.filter((record) => legacyIds.has(idString(record._id)));
}

export async function preflightRefunds(expectedRefunds, records = null) {
  const existingRecords =
    records ??
    (await Refund.find({}).select('+scopeClaimKeys +scopeOccupied').lean());

  if (findLegacyRefundPlaceholders(existingRecords).length > 0) {
    throw new SeedDriftError(
      'Legacy deterministic Refund placeholder ownership unexpectedly exists.',
    );
  }

  const byId = new Map();
  const byNatural = new Map();
  const byProviderRefundId = new Map();
  for (const record of existingRecords) {
    byId.set(idString(record._id), record);
    const natural = refundNaturalKey(record);
    if (byNatural.has(natural)) {
      throw new SeedDriftError(
        `Refund preflight found duplicate natural identity ${natural}.`,
      );
    }
    byNatural.set(natural, record);
    if (record.providerRefundId) {
      if (byProviderRefundId.has(record.providerRefundId)) {
        throw new SeedDriftError(
          `Refund preflight found duplicate provider identity ${record.providerRefundId}.`,
        );
      }
      byProviderRefundId.set(record.providerRefundId, record);
    }
  }

  const expectedIds = new Set(expectedRefunds.map((refund) => idString(refund._id)));
  const results = expectedRefunds.map((expected) => {
    const scopeConflict = existingRecords.some(
      (record) =>
        !expectedIds.has(idString(record._id)) &&
        refundScopesConflict(record, expected),
    );
    return {
      expected,
      ...classifyRefundRecord({
        expected,
        recordById: byId.get(idString(expected._id)),
        recordByNatural: byNatural.get(refundNaturalKey(expected)),
        recordByProviderRefundId: expected.providerRefundId
          ? byProviderRefundId.get(expected.providerRefundId)
          : undefined,
        scopeConflict,
      }),
    };
  });
  const failures = results.filter(
    (result) =>
      ![
        REFUND_CLASSIFICATIONS.MISSING,
        REFUND_CLASSIFICATIONS.EXACT,
      ].includes(result.classification),
  );
  if (failures.length > 0) {
    throw new SeedDriftError(
      `Refund preflight rejected: ${failures
        .map((failure) => `${failure.expected.seedKey}:${failure.classification}`)
        .join(', ')}.`,
    );
  }

  const missing = results.filter(
    (result) => result.classification === REFUND_CLASSIFICATIONS.MISSING,
  ).length;
  const exact = results.length - missing;
  if (missing > 0 && exact > 0) {
    throw new SeedDriftError(
      `Refund preflight rejected partial deterministic state (${exact} exact / ${missing} missing).`,
    );
  }
  return results;
}

export async function snapshotUnrelatedRefunds(expectedRefunds) {
  const expectedIds = new Set(expectedRefunds.map((refund) => idString(refund._id)));
  const expectedNatural = new Set(expectedRefunds.map(refundNaturalKey));
  const records = await Refund.collection.find({}).sort({ _id: 1 }).toArray();
  return JSON.stringify(
    records.filter(
      (record) =>
        !expectedIds.has(idString(record._id)) &&
        !expectedNatural.has(refundNaturalKey(record)),
    ),
  );
}

async function snapshotRefundProtectedData() {
  const collections = await mongoose.connection.db
    .listCollections({}, { nameOnly: true })
    .toArray();
  const snapshots = [];
  for (const { name } of collections
    .filter((collection) => collection.name !== Refund.collection.name)
    .sort((left, right) => left.name.localeCompare(right.name))) {
    snapshots.push({
      name,
      records: await mongoose.connection.db
        .collection(name)
        .find({})
        .sort({ _id: 1 })
        .toArray(),
    });
  }
  return JSON.stringify(snapshots);
}

export async function verifyPersistedRefundAuthorities(validated) {
  const { refunds } = validated;
  const orderIds = [...new Set(refunds.filter((refund) => refund.orderId).map((refund) => idString(refund.orderId)))];
  const paymentIds = [...new Set(refunds.map((refund) => idString(refund.paymentId)))];
  const customerIds = [...new Set(refunds.map((refund) => idString(refund.customerId)))];
  const [orders, payments, customers, compensationOrders] = await Promise.all([
    Order.find({ _id: { $in: orderIds } }).lean(),
    Payment.find({ _id: { $in: paymentIds } }).lean(),
    User.find({ _id: { $in: customerIds } })
      .select('_id email role emailVerified')
      .lean(),
    Order.find({
      paymentId: {
        $in: validated.groups.systemCompensations.map(
          (refund) => refund.paymentId,
        ),
      },
    })
      .select('_id')
      .lean(),
  ]);
  const ordersById = lookupById(orders);
  const paymentsById = lookupById(payments);
  const customersById = lookupById(customers);

  assertRefund(
    orders.length === 7 &&
      payments.length === 9 &&
      customers.length === 2 &&
      compensationOrders.length === 0,
    'DEMO_REFUND_PERSISTED_AUTHORITY_COUNTS_INVALID',
    'Persisted Refund authority counts differ from the lock.',
  );

  for (const refund of refunds) {
    const customer = customersById.get(idString(refund.customerId));
    const payment = paymentsById.get(idString(refund.paymentId));
    const order = refund.orderId
      ? ordersById.get(idString(refund.orderId))
      : null;
    assertRefund(
      customer?.role === 'customer' &&
        customer.emailVerified === true &&
        payment?.status === PAYMENT_STATUSES.SUCCEEDED &&
        payment.provider === refund.provider &&
        payment.currency === refund.currency &&
        idString(payment.customerId) === idString(refund.customerId) &&
        (!order ||
          (idString(order.customerId) === idString(refund.customerId) &&
            idString(order.paymentId) === idString(refund.paymentId))),
      'DEMO_REFUND_PERSISTED_AUTHORITY_INVALID',
      `Persisted authority failed for ${refund.seedKey}.`,
    );
  }
  return { verified: refunds.length };
}

export async function seedRefunds({
  validated,
  historicalDefinitions,
  validatedReviews,
}) {
  const historical = await preflightHistoricalCommerce(historicalDefinitions);
  assertRefund(
    historical.state === HISTORICAL_COMMERCE_STATES.EXACT_FINAL,
    'DEMO_REFUND_HISTORICAL_COMMERCE_REQUIRED',
    'Refund persistence requires exact final historical commerce.',
  );
  const reviewPreflight = await preflightReviews(validatedReviews.reviews);
  assertRefund(
    reviewPreflight.every(
      (result) => result.classification === 'EXACT',
    ),
    'DEMO_REFUND_REVIEWS_REQUIRED',
    'Refund persistence requires all fourteen exact Reviews.',
  );

  const beforeProtected = await snapshotRefundProtectedData();
  const beforeUnrelated = await snapshotUnrelatedRefunds(validated.refunds);
  await verifyPersistedRefundAuthorities(validated);
  const preflight = await preflightRefunds(validated.refunds);
  const missing = preflight.filter(
    (result) => result.classification === REFUND_CLASSIFICATIONS.MISSING,
  );

  if (missing.length === validated.refunds.length) {
    try {
      await withSeedTransaction(async (session) => {
        await Refund.collection.insertMany(
          missing.map((result) => refundPayload(result.expected)),
          { ordered: true, session },
        );
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new SeedValidationError(
          'DEMO_REFUND_DUPLICATE_KEY',
          'A concurrent write created a Refund ownership conflict.',
        );
      }
      throw error;
    }
  }

  const postflight = await preflightRefunds(validated.refunds);
  await verifyPersistedRefundAuthorities(validated);
  const afterUnrelated = await snapshotUnrelatedRefunds(validated.refunds);
  const afterProtected = await snapshotRefundProtectedData();
  assertRefund(
    postflight.every(
      (result) => result.classification === REFUND_CLASSIFICATIONS.EXACT,
    ),
    'DEMO_REFUND_POSTFLIGHT_FAILED',
    'Refund postflight did not find twelve exact deterministic records.',
  );
  assertRefund(
    beforeUnrelated === afterUnrelated,
    'DEMO_REFUND_UNRELATED_CHANGED',
    'Unrelated Refunds changed during deterministic Refund seeding.',
  );
  assertRefund(
    beforeProtected === afterProtected,
    'DEMO_REFUND_PROTECTED_DATA_CHANGED',
    'Refund seeding changed protected application data.',
  );

  return {
    ...validated,
    created: missing.length,
    skipped: validated.refunds.length - missing.length,
  };
}

export function exactRefundOwnershipFilter(expectedRefunds) {
  assertRefund(
    Array.isArray(expectedRefunds) && expectedRefunds.length === 12,
    'DEMO_REFUND_RESET_SCOPE_INVALID',
    'Refund reset requires all twelve exact deterministic identities.',
  );
  return {
    $or: expectedRefunds.map((refund) => ({
      _id: refund._id,
      customerId: refund.customerId,
      paymentId: refund.paymentId,
      origin: refund.origin,
      ...(refund.orderId ? { orderId: refund.orderId } : {}),
    })),
  };
}

export async function resetRefunds(validated) {
  const preflight = await preflightRefunds(validated.refunds);
  const exact = preflight.filter(
    (result) => result.classification === REFUND_CLASSIFICATIONS.EXACT,
  );
  if (exact.length === 0) {
    return { deleted: 0 };
  }
  assertRefund(
    exact.length === 12,
    'DEMO_REFUND_RESET_INCOMPLETE',
    'Refund reset requires all twelve deterministic Refunds to be exact.',
  );
  const dependency = await Notification.exists({
    resourceType: 'refund',
    resourceId: { $in: validated.refunds.map((refund) => refund._id) },
  });
  assertRefund(
    !dependency,
    'DEMO_REFUND_RESET_DEPENDENCY_EXISTS',
    'Refund reset refused because a Notification references a seeded Refund.',
  );

  const beforeUnrelated = await snapshotUnrelatedRefunds(validated.refunds);
  let deleted = 0;
  await withSeedTransaction(async (session) => {
    const result = await Refund.deleteMany(
      exactRefundOwnershipFilter(validated.refunds),
      { session },
    );
    deleted = result.deletedCount;
    assertRefund(
      deleted === 12,
      'DEMO_REFUND_RESET_COUNT_MISMATCH',
      'Refund reset did not delete exactly twelve deterministic Refunds.',
    );
  });
  const postflight = await preflightRefunds(validated.refunds);
  const afterUnrelated = await snapshotUnrelatedRefunds(validated.refunds);
  assertRefund(
    postflight.every(
      (result) => result.classification === REFUND_CLASSIFICATIONS.MISSING,
    ) && beforeUnrelated === afterUnrelated,
    'DEMO_REFUND_RESET_POSTFLIGHT_FAILED',
    'Refund reset did not preserve exact unrelated Refund state.',
  );
  return { deleted };
}

export async function countPersistedRefundRegressions() {
  const [refunds, reviews] = await Promise.all([
    Refund.countDocuments({}),
    Review.countDocuments({}),
  ]);
  return { refunds, reviews };
}

function periodLabel(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function serviceListInput(overrides = {}) {
  return {
    page: 1,
    limit: 100,
    sort: 'requestedAt',
    order: 'desc',
    ...overrides,
  };
}

export async function verifyPersistedRefundReadModels({
  validated,
  registry,
  clock,
}) {
  const expected = validated.refunds;
  const persisted = await Refund.find({
    _id: { $in: expected.map((refund) => refund._id) },
  })
    .select('+scopeClaimKeys +scopeOccupied')
    .lean();
  const preflight = await preflightRefunds(expected, persisted);
  assertRefund(
    persisted.length === 12 &&
      preflight.every(
        (result) => result.classification === REFUND_CLASSIFICATIONS.EXACT,
      ),
    'DEMO_REFUND_ATLAS_SUBSET_INVALID',
    'Atlas does not contain twelve exact deterministic Refunds.',
  );

  const origins = countBy(persisted, 'origin');
  const statuses = countBy(persisted, 'status');
  const providerRefundIds = persisted
    .map((refund) => refund.providerRefundId)
    .filter(Boolean);
  const providerDuplicates = await Refund.aggregate([
    { $match: { providerRefundId: { $type: 'string' } } },
    { $group: { _id: '$providerRefundId', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  const legacyCount = await Refund.countDocuments({
    _id: {
      $in: LEGACY_REFUND_KEYS.map(deterministicObjectId),
    },
  });
  let activeScopeCollisions = 0;
  for (let left = 0; left < persisted.length; left += 1) {
    for (let right = left + 1; right < persisted.length; right += 1) {
      activeScopeCollisions += refundScopesConflict(
        persisted[left],
        persisted[right],
      )
        ? 1
        : 0;
    }
  }
  assertRefund(
    isDeepStrictEqual(origins, validated.counts.origins) &&
      isDeepStrictEqual(statuses, validated.counts.statuses) &&
      providerRefundIds.length === 8 &&
      new Set(providerRefundIds).size === 8 &&
      providerDuplicates.length === 0 &&
      persisted.filter((refund) => refund.refundedAt).length === 3 &&
      activeScopeCollisions === 0 &&
      legacyCount === 0,
    'DEMO_REFUND_ATLAS_DISTRIBUTION_INVALID',
    'Atlas Refund distribution, uniqueness, or scope state is invalid.',
  );

  const refundsCustomerId = registry.idFor('user:refunds');
  const ordersCustomerId = registry.idFor('user:orders');
  const refundsCustomer = await getCustomerRefunds({
    customerId: refundsCustomerId,
    ...serviceListInput(),
  });
  const ordersCustomer = await getCustomerRefunds({
    customerId: ordersCustomerId,
    ...serviceListInput(),
  });
  const otherCustomerKeys = [
    'user:checkout',
    'user:support',
    'user:reviews',
    'user:ratings',
  ];
  const otherCustomerHistories = await Promise.all(
    otherCustomerKeys.map((key) =>
      getCustomerRefunds({
        customerId: registry.idFor(key),
        ...serviceListInput(),
      }),
    ),
  );
  assertRefund(
    refundsCustomer.meta.totalItems === 11 &&
      ordersCustomer.meta.totalItems === 1 &&
      ordersCustomer.items[0]?.origin ===
        REFUND_ORIGINS.ORDER_CANCELLATION &&
      otherCustomerHistories.every((history) => history.meta.totalItems === 0),
    'DEMO_REFUND_CUSTOMER_SERVICE_INVALID',
    'Customer Refund histories do not match exact ownership.',
  );
  const customerDetails = await Promise.all([
    validated.groups.customerRequests[0],
    validated.groups.customerRequests[2],
    validated.groups.customerRequests[4],
    validated.groups.systemCompensations[0],
  ].map((refund) =>
    getCustomerRefund({
      customerId: refund.customerId,
      refundId: refund._id,
    }),
  ));
  assertRefund(
    customerDetails.every((detail) => detail.payment) &&
      customerDetails.map((detail) => detail.status).join(',') ===
        'requested,rejected,refunded,refunded',
    'DEMO_REFUND_CUSTOMER_DETAIL_INVALID',
    'Customer Refund detail projections are invalid.',
  );

  const adminAll = await getAdminRefunds(serviceListInput());
  const adminOriginCounts = Object.fromEntries(
    await Promise.all(
      Object.values(REFUND_ORIGINS).map(async (origin) => [
        origin,
        (
          await getAdminRefunds(serviceListInput({ origin }))
        ).meta.totalItems,
      ]),
    ),
  );
  const adminStatusCounts = Object.fromEntries(
    await Promise.all(
      Object.values(REFUND_STATUSES).map(async (status) => [
        status,
        (
          await getAdminRefunds(serviceListInput({ status }))
        ).meta.totalItems,
      ]),
    ),
  );
  const detailsByStatus = await Promise.all(
    Object.values(REFUND_STATUSES).map((status) =>
      getAdminRefund(
        expected.find((refund) => refund.status === status)._id,
      ),
    ),
  );
  const decidedCustomerDetails = await Promise.all(
    validated.groups.customerRequests
      .slice(1)
      .map((refund) => getAdminRefund(refund._id)),
  );
  const systemDetails = await Promise.all(
    [
      ...validated.groups.orderCancellations,
      ...validated.groups.systemCompensations,
    ].map((refund) => getAdminRefund(refund._id)),
  );
  assertRefund(
    adminAll.meta.totalItems === 12 &&
      isDeepStrictEqual(adminOriginCounts, validated.counts.origins) &&
      isDeepStrictEqual(adminStatusCounts, validated.counts.statuses) &&
      detailsByStatus.length === 6 &&
      decidedCustomerDetails.every(
        (detail) => detail.reviewedBy?.email === 'admin.demo@example.test',
      ) &&
      systemDetails.every((detail) => detail.reviewedBy === null),
    'DEMO_REFUND_ADMIN_SERVICE_INVALID',
    'Admin Refund list or detail projections are invalid.',
  );

  const recentPeriods = [
    ...new Set(
      validated.groups.customerRequests.map((refund) =>
        periodLabel(refund.requestedAt, clock.timeZone),
      ),
    ),
  ].sort();
  const recentAnalytics = await getRefundAnalytics(
    {
      startAt: clock.daysAgo(30),
      endAt: clock.anchorTime,
      bucket: 'day',
      timezone: clock.timeZone,
    },
    recentPeriods,
  );
  assertRefund(
    isDeepStrictEqual(recentAnalytics.workflow, {
      totalRequests: 6,
      requested: 1,
      approved: 1,
      rejected: 1,
      processing: 1,
      refunded: 1,
      failed: 1,
    }) &&
      recentAnalytics.trend.reduce(
        (sum, period) => sum + period.customerRequests,
        0,
      ) === 6,
    'DEMO_REFUND_RECENT_ANALYTICS_INVALID',
    'Recent Refund workflow analytics differ from the lock.',
  );

  const refundedExpected = expected.filter(
    (refund) => refund.status === REFUND_STATUSES.REFUNDED,
  );
  const fullPeriods = [
    ...new Set(
      refundedExpected.map((refund) =>
        periodLabel(refund.refundedAt, clock.timeZone),
      ),
    ),
  ].sort();
  const fullAnalytics = await getRefundAnalytics(
    {
      startAt: new Date('2020-01-01T00:00:00.000Z'),
      endAt: clock.anchorTime,
      bucket: 'day',
      timezone: clock.timeZone,
    },
    fullPeriods,
  );
  const expectedFinancial = {
    customerRequestRefundedAmount:
      validated.groups.customerRequests[4].amount,
    orderCancellationRefundedAmount:
      validated.groups.orderCancellations[0].amount,
    systemCompensationRefundedAmount:
      validated.groups.systemCompensations[0].amount,
  };
  expectedFinancial.totalProviderRefundedAmount =
    expectedFinancial.customerRequestRefundedAmount +
    expectedFinancial.orderCancellationRefundedAmount +
    expectedFinancial.systemCompensationRefundedAmount;
  assertRefund(
    isDeepStrictEqual(fullAnalytics.financial, expectedFinancial) &&
      fullAnalytics.trend.reduce(
        (sum, period) => sum + period.refundedAmount,
        0,
      ) === expectedFinancial.totalProviderRefundedAmount,
    'DEMO_REFUND_FINANCIAL_ANALYTICS_INVALID',
    'Full-range Refund financial analytics differ from exact amounts.',
  );

  const [
    paymentCount,
    orderCount,
    reviewCount,
    visibleReviewCount,
    cartCount,
    couponCount,
    inventoryCount,
    adjustmentCount,
    refundReturnCount,
    notificationCount,
  ] = await Promise.all([
    Payment.countDocuments({}),
    Order.countDocuments({}),
    Review.countDocuments({}),
    Review.countDocuments({ moderationStatus: 'visible' }),
    Cart.countDocuments({}),
    Coupon.countDocuments({}),
    Inventory.countDocuments({}),
    InventoryAdjustment.countDocuments({}),
    InventoryAdjustment.countDocuments({ reason: 'refund_return' }),
    Notification.countDocuments({}),
  ]);
  const orderStatuses = Object.fromEntries(
    await Promise.all(
      Object.values(ORDER_STATUSES).map(async (status) => [
        status,
        await Order.countDocuments({ orderStatus: status }),
      ]),
    ),
  );
  assertRefund(
    paymentCount === 46 &&
      orderCount === 42 &&
      isDeepStrictEqual(orderStatuses, {
        placed: 6,
        confirmed: 5,
        processing: 5,
        shipped: 5,
        delivered: 17,
        cancelled: 4,
      }) &&
      reviewCount === 14 &&
      visibleReviewCount === 10 &&
      cartCount === 3 &&
      couponCount === 8 &&
      inventoryCount === 105 &&
      adjustmentCount === 157 &&
      refundReturnCount === 0 &&
      notificationCount === 0,
    'DEMO_REFUND_REGRESSION_INVALID',
    'A protected collection differs from its signed-off state.',
  );

  return {
    atlas: {
      total: persisted.length,
      origins,
      statuses,
      providerRefundIds: providerRefundIds.length,
      refundedAt: persisted.filter((refund) => refund.refundedAt).length,
      providerDuplicates: providerDuplicates.length,
      activeScopeCollisions,
      legacyPlaceholders: legacyCount,
    },
    customerService: {
      refundsCustomer: refundsCustomer.meta.totalItems,
      ordersCustomer: ordersCustomer.meta.totalItems,
      otherCustomers: 0,
      detailReads: customerDetails.length,
    },
    adminService: {
      total: adminAll.meta.totalItems,
      origins: adminOriginCounts,
      statuses: adminStatusCounts,
      detailStatuses: detailsByStatus.length,
    },
    recentAnalytics,
    fullAnalytics,
    protectedCounts: {
      payments: paymentCount,
      orders: orderCount,
      reviews: reviewCount,
      visibleReviews: visibleReviewCount,
      hiddenReviews: reviewCount - visibleReviewCount,
      carts: cartCount,
      coupons: couponCount,
      inventory: inventoryCount,
      inventoryAdjustments: adjustmentCount,
      refundReturnAdjustments: refundReturnCount,
      notifications: notificationCount,
    },
  };
}
