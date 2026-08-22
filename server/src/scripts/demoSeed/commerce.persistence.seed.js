import { isDeepStrictEqual } from 'node:util';

import { Cart } from '../../modules/cart/cart.model.js';
import { Coupon } from '../../modules/coupon/coupon.model.js';
import { Inventory } from '../../modules/inventory/inventory.model.js';
import { InventoryAdjustment } from '../../modules/inventory/inventoryAdjustment.model.js';
import { INVENTORY_ADJUSTMENT_REASONS } from '../../modules/inventory/inventory.constants.js';
import { Notification } from '../../modules/notification/notification.model.js';
import { Order } from '../../modules/order/order.model.js';
import { Payment } from '../../modules/payment/payment.model.js';
import { Refund } from '../../modules/refund/refund.model.js';
import {
  SeedDriftError,
  SeedValidationError,
  withSeedTransaction,
} from './seed.utils.js';

export const HISTORICAL_COMMERCE_STATES = Object.freeze({
  BASE: 'BASE',
  EXACT_FINAL: 'EXACT_FINAL',
  PARTIAL: 'PARTIAL',
  CONFLICT: 'CONFLICT',
  DRIFT: 'DRIFT',
});

function idString(value) {
  return value?.toString();
}

function hasOwn(value, field) {
  return Object.prototype.hasOwnProperty.call(value || {}, field);
}

function dateString(value) {
  return value ? new Date(value).toISOString() : null;
}

function assertHistorical(condition, code, message) {
  if (!condition) {
    throw new SeedValidationError(code, message);
  }
}

function normalize(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value?._bsontype === 'ObjectId') {
    return value.toString();
  }

  if (typeof value?.toObject === 'function') {
    return normalize(value.toObject({ depopulate: true }));
  }

  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => key !== '__v' && value[key] !== undefined)
      .sort()
      .map((key) => [key, normalize(value[key])]),
  );
}

const PAYMENT_FIELDS = Object.freeze([
  '_id',
  'customerId',
  'provider',
  'providerOrderId',
  'providerPaymentId',
  'amount',
  'currency',
  'status',
  'checkoutSnapshot',
  'verifiedAt',
  'failureCode',
  'failureMessage',
  'commerceResolution',
  'createdAt',
  'updatedAt',
]);

const ORDER_FIELDS = Object.freeze([
  '_id',
  'orderNumber',
  'customerId',
  'paymentId',
  'items',
  'shippingAddress',
  'coupon',
  'subtotal',
  'discountAmount',
  'totalAmount',
  'orderStatus',
  'placedAt',
  'cancelledAt',
  'cartReconciledAt',
  'createdAt',
  'updatedAt',
]);

const ADJUSTMENT_FIELDS = Object.freeze([
  '_id',
  'inventoryId',
  'reason',
  'quantityChange',
  'previousQuantity',
  'newQuantity',
  'performedBy',
  'sourceType',
  'sourceId',
  'note',
  'createdAt',
  'updatedAt',
]);

const INVENTORY_FIELDS = Object.freeze([
  '_id',
  'productId',
  'variantId',
  'quantity',
  'createdAt',
  'updatedAt',
]);

function selectFields(value, fields) {
  const source =
    typeof value?.toObject === 'function'
      ? value.toObject({ depopulate: true })
      : value;

  return normalize(
    Object.fromEntries(
      fields
        .filter((field) => source?.[field] !== undefined)
        .map((field) => [field, source[field]]),
    ),
  );
}

function paymentPayload(payment) {
  return Object.fromEntries(
    PAYMENT_FIELDS.filter((field) => payment[field] !== undefined).map(
      (field) => [field, payment[field]],
    ),
  );
}

function orderPayload(order) {
  return Object.fromEntries(
    ORDER_FIELDS.filter((field) => order[field] !== undefined).map((field) => [
      field,
      order[field],
    ]),
  );
}

function adjustmentPayload(adjustment) {
  return Object.fromEntries(
    ADJUSTMENT_FIELDS.filter(
      (field) => adjustment[field] !== undefined,
    ).map((field) => [field, adjustment[field]]),
  );
}

function inventoryPayload(position) {
  return Object.fromEntries(
    INVENTORY_FIELDS.filter((field) => position[field] !== undefined).map(
      (field) => [field, position[field]],
    ),
  );
}

function orderOrdinal(order) {
  return order.ordinal ?? Number(order.seedKey.slice(-2));
}

function effectSeedKey(order, effect, lineOrdinal) {
  const ordinal = String(orderOrdinal(order)).padStart(2, '0');
  const line = String(lineOrdinal).padStart(2, '0');
  const type =
    effect.reason === INVENTORY_ADJUSTMENT_REASONS.ORDER_PURCHASE
      ? 'purchase'
      : 'cancellation';

  return `inventory-adjustment:historical:order:${ordinal}:${type}:${line}`;
}

export function buildHistoricalInventoryAdjustments({
  matrix,
  registry,
  foundationalPositions,
}) {
  const ordersById = new Map(
    matrix.orders.map((order) => [idString(order._id), order]),
  );
  const positionsById = new Map(
    foundationalPositions.map((position) => [idString(position._id), position]),
  );
  const effects = matrix.inventoryEffectPlan.effects.map((effect) => {
    const order = ordersById.get(idString(effect.sourceId));
    const lineOrdinal =
      order.items.findIndex(
        (item) => idString(item._id) === idString(effect.orderItemId),
      ) + 1;
    const timestamp =
      effect.reason === INVENTORY_ADJUSTMENT_REASONS.ORDER_PURCHASE
        ? order.placedAt
        : order.cancelledAt;

    assertHistorical(
      order && lineOrdinal > 0 && timestamp,
      'DEMO_HISTORICAL_EFFECT_MAPPING_INVALID',
      'A historical Inventory effect does not map to an exact Order line.',
    );

    return {
      ...effect,
      order,
      lineOrdinal,
      timestamp,
      seedKey: effectSeedKey(order, effect, lineOrdinal),
    };
  });

  effects.sort((left, right) => {
    const timestampOrder = left.timestamp - right.timestamp;

    if (timestampOrder !== 0) {
      return timestampOrder;
    }

    const ordinalOrder = orderOrdinal(left.order) - orderOrdinal(right.order);

    if (ordinalOrder !== 0) {
      return ordinalOrder;
    }

    const reasonOrder =
      left.reason === INVENTORY_ADJUSTMENT_REASONS.ORDER_PURCHASE ? -1 : 1;
    const otherReasonOrder =
      right.reason === INVENTORY_ADJUSTMENT_REASONS.ORDER_PURCHASE ? -1 : 1;

    return reasonOrder - otherReasonOrder || left.lineOrdinal - right.lineOrdinal;
  });

  const runningQuantities = new Map(
    foundationalPositions.map((position) => [
      idString(position._id),
      position.quantity,
    ]),
  );
  const adjustments = effects.map((effect) => {
    const inventoryId = idString(effect.inventoryId);
    const position = positionsById.get(inventoryId);
    const previousQuantity = runningQuantities.get(inventoryId);
    const newQuantity = previousQuantity + effect.quantityChange;

    assertHistorical(
      position &&
        effect.timestamp > position.updatedAt &&
        Number.isInteger(newQuantity) &&
        newQuantity >= 0,
      'DEMO_HISTORICAL_EFFECT_ARITHMETIC_INVALID',
      `Historical Inventory effect ${effect.seedKey} is unsafe.`,
    );
    runningQuantities.set(inventoryId, newQuantity);

    return {
      _id: registry.idFor(effect.seedKey),
      seedKey: effect.seedKey,
      orderItemId: effect.orderItemId,
      orderOrdinal: orderOrdinal(effect.order),
      lineOrdinal: effect.lineOrdinal,
      inventoryId: effect.inventoryId,
      reason: effect.reason,
      quantityChange: effect.quantityChange,
      previousQuantity,
      newQuantity,
      sourceType: 'order',
      sourceId: effect.sourceId,
      createdAt: effect.timestamp,
      updatedAt: effect.timestamp,
    };
  });
  const systemKeys = adjustments.map(
    (adjustment) =>
      `${idString(adjustment.inventoryId)}:${adjustment.sourceType}:` +
      `${idString(adjustment.sourceId)}:${adjustment.reason}`,
  );

  assertHistorical(
    adjustments.length === 53 &&
      adjustments.filter(
        (adjustment) =>
          adjustment.reason === INVENTORY_ADJUSTMENT_REASONS.ORDER_PURCHASE,
      ).length === 49 &&
      adjustments.filter(
        (adjustment) =>
          adjustment.reason === INVENTORY_ADJUSTMENT_REASONS.ORDER_CANCELLATION,
      ).length === 4 &&
      new Set(systemKeys).size === 53 &&
      new Set(adjustments.map((adjustment) => idString(adjustment._id))).size ===
        53,
    'DEMO_HISTORICAL_ADJUSTMENT_IDENTITIES_INVALID',
    'Historical Inventory adjustments must be an exact unique 49/4 set.',
  );

  return adjustments;
}

export function buildHistoricalInventoryOverlay({
  matrix,
  foundationalPositions,
  historicalAdjustments,
}) {
  const adjustmentsByInventory = new Map();

  for (const adjustment of historicalAdjustments) {
    const key = idString(adjustment.inventoryId);

    if (!adjustmentsByInventory.has(key)) {
      adjustmentsByInventory.set(key, []);
    }

    adjustmentsByInventory.get(key).push(adjustment);
  }

  const projectionById = new Map(
    matrix.inventoryEffectPlan.projection.map((projection) => [
      idString(projection.inventoryId),
      projection,
    ]),
  );
  const finalPositions = foundationalPositions.map((position) => {
    const history = adjustmentsByInventory.get(idString(position._id)) || [];
    const lastAdjustment = history.at(-1);
    const projection = projectionById.get(idString(position._id));

    return {
      ...position,
      quantity: projection.projectedQuantity,
      updatedAt: lastAdjustment?.createdAt ?? position.updatedAt,
      historicalAdjustments: history,
    };
  });
  const affectedPositions = finalPositions.filter(
    (position) => position.historicalAdjustments.length > 0,
  );
  const netChange = finalPositions.reduce(
    (total, position, index) =>
      total + position.quantity - foundationalPositions[index].quantity,
    0,
  );

  assertHistorical(
    finalPositions.length === 105 &&
      affectedPositions.length === 14 &&
      netChange === -45 &&
      finalPositions.every((position) => position.quantity >= 0) &&
      Math.min(...affectedPositions.map((position) => position.quantity)) === 13,
    'DEMO_HISTORICAL_INVENTORY_OVERLAY_INVALID',
    'Historical Inventory overlay does not match the locked final projection.',
  );

  return { finalPositions, affectedPositions, netChange };
}

export async function validateHistoricalPersistenceDefinitions({
  matrix,
  registry,
  foundationalPositions,
}) {
  const historicalAdjustments = buildHistoricalInventoryAdjustments({
    matrix,
    registry,
    foundationalPositions,
  });
  const overlay = buildHistoricalInventoryOverlay({
    matrix,
    foundationalPositions,
    historicalAdjustments,
  });

  assertHistorical(
    registry.counts.historicalInventoryAdjustments === 53,
    'DEMO_HISTORICAL_ADJUSTMENT_REGISTRY_INVALID',
    'Registry must reserve exactly 53 historical Inventory adjustments.',
  );

  for (const payment of matrix.payments) {
    await new Payment(paymentPayload(payment)).validate();
  }

  for (const order of matrix.orders) {
    await new Order(orderPayload(order)).validate();
  }

  for (const adjustment of historicalAdjustments) {
    await new InventoryAdjustment(adjustmentPayload(adjustment)).validate();
  }

  for (const position of overlay.affectedPositions) {
    await new Inventory(inventoryPayload(position)).validate();
  }

  return {
    matrix,
    foundationalPositions,
    foundationalAdjustments: foundationalPositions.flatMap(
      (position) => position.adjustments,
    ),
    historicalAdjustments,
    ...overlay,
  };
}

function paymentNaturalMatches(expected, record) {
  return (
    record.providerOrderId === expected.providerOrderId ||
    (expected.providerPaymentId &&
      record.providerPaymentId === expected.providerPaymentId)
  );
}

function orderNaturalMatches(expected, record) {
  return (
    record.orderNumber === expected.orderNumber ||
    idString(record.paymentId) === idString(expected.paymentId)
  );
}

function adjustmentNaturalMatches(expected, record) {
  return (
    idString(record.inventoryId) === idString(expected.inventoryId) &&
    record.sourceType === expected.sourceType &&
    idString(record.sourceId) === idString(expected.sourceId) &&
    record.reason === expected.reason
  );
}

function classifyDocumentSet({
  expected,
  records,
  fields,
  naturalMatches,
}) {
  let exact = 0;
  let missing = 0;
  let drift = 0;
  let conflict = 0;

  for (const target of expected) {
    const byId = records.find(
      (record) => idString(record._id) === idString(target._id),
    );
    const byNatural = records.find((record) => naturalMatches(target, record));

    if (
      (byId && !naturalMatches(target, byId)) ||
      (byNatural && idString(byNatural._id) !== idString(target._id))
    ) {
      conflict += 1;
      continue;
    }

    const existing = byId || byNatural;

    if (!existing) {
      missing += 1;
    } else if (
      isDeepStrictEqual(selectFields(existing, fields), selectFields(target, fields))
    ) {
      exact += 1;
    } else {
      drift += 1;
    }
  }

  if (conflict > 0) {
    return HISTORICAL_COMMERCE_STATES.CONFLICT;
  }

  if (drift > 0) {
    return HISTORICAL_COMMERCE_STATES.DRIFT;
  }

  if (exact === expected.length) {
    return HISTORICAL_COMMERCE_STATES.EXACT_FINAL;
  }

  if (missing === expected.length) {
    return 'MISSING';
  }

  return HISTORICAL_COMMERCE_STATES.PARTIAL;
}

function classifyInventorySet({ foundationalPositions, finalPositions, records }) {
  if (records.length === 0) {
    return 'MISSING';
  }

  const byId = new Map(records.map((record) => [idString(record._id), record]));
  let baseExact = 0;
  let finalExact = 0;
  let missing = 0;
  let other = 0;

  for (let index = 0; index < foundationalPositions.length; index += 1) {
    const foundational = foundationalPositions[index];
    const final = finalPositions[index];
    const record = byId.get(idString(foundational._id));

    if (!record) {
      missing += 1;
    } else if (
      isDeepStrictEqual(
        selectFields(record, INVENTORY_FIELDS),
        selectFields(final, INVENTORY_FIELDS),
      )
    ) {
      finalExact += 1;
      if (
        isDeepStrictEqual(
          selectFields(record, INVENTORY_FIELDS),
          selectFields(foundational, INVENTORY_FIELDS),
        )
      ) {
        baseExact += 1;
      }
    } else if (
      isDeepStrictEqual(
        selectFields(record, INVENTORY_FIELDS),
        selectFields(foundational, INVENTORY_FIELDS),
      )
    ) {
      baseExact += 1;
    } else {
      other += 1;
    }
  }

  if (other > 0) {
    return HISTORICAL_COMMERCE_STATES.DRIFT;
  }

  if (missing > 0) {
    return missing === foundationalPositions.length
      ? 'MISSING'
      : HISTORICAL_COMMERCE_STATES.PARTIAL;
  }

  if (finalExact === finalPositions.length) {
    return HISTORICAL_COMMERCE_STATES.EXACT_FINAL;
  }

  if (baseExact === foundationalPositions.length) {
    return HISTORICAL_COMMERCE_STATES.BASE;
  }

  return HISTORICAL_COMMERCE_STATES.PARTIAL;
}

function classifyExactAdjustmentSet(expected, records) {
  if (records.length === 0) {
    return 'MISSING';
  }

  const byId = new Map(records.map((record) => [idString(record._id), record]));
  let exact = 0;
  let missing = 0;

  for (const target of expected) {
    const record = byId.get(idString(target._id));

    if (!record) {
      missing += 1;
    } else if (
      isDeepStrictEqual(
        selectFields(record, ADJUSTMENT_FIELDS),
        selectFields(target, ADJUSTMENT_FIELDS),
      )
    ) {
      exact += 1;
    } else {
      return HISTORICAL_COMMERCE_STATES.DRIFT;
    }
  }

  if (exact === expected.length && records.length === expected.length) {
    return HISTORICAL_COMMERCE_STATES.EXACT_FINAL;
  }

  return missing === expected.length
    ? 'MISSING'
    : HISTORICAL_COMMERCE_STATES.PARTIAL;
}

export function classifyHistoricalCommerceSnapshot({
  validated,
  payments,
  orders,
  historicalAdjustments,
  foundationalAdjustments,
  inventory,
  unknownAdjustments = [],
  unknownInventory = [],
}) {
  const paymentState = classifyDocumentSet({
    expected: validated.matrix.payments,
    records: payments,
    fields: PAYMENT_FIELDS,
    naturalMatches: paymentNaturalMatches,
  });
  const orderState = classifyDocumentSet({
    expected: validated.matrix.orders,
    records: orders,
    fields: ORDER_FIELDS,
    naturalMatches: orderNaturalMatches,
  });
  const historicalAdjustmentState = classifyDocumentSet({
    expected: validated.historicalAdjustments,
    records: historicalAdjustments,
    fields: ADJUSTMENT_FIELDS,
    naturalMatches: adjustmentNaturalMatches,
  });
  const foundationalAdjustmentState = classifyExactAdjustmentSet(
    validated.foundationalAdjustments,
    foundationalAdjustments,
  );
  const inventoryState = classifyInventorySet({
    foundationalPositions: validated.foundationalPositions,
    finalPositions: validated.finalPositions,
    records: inventory,
  });
  const entityStates = [paymentState, orderState, historicalAdjustmentState];

  if (
    unknownAdjustments.length > 0 ||
    unknownInventory.length > 0 ||
    entityStates.includes(HISTORICAL_COMMERCE_STATES.CONFLICT)
  ) {
    return HISTORICAL_COMMERCE_STATES.CONFLICT;
  }

  if (
    entityStates.includes(HISTORICAL_COMMERCE_STATES.DRIFT) ||
    foundationalAdjustmentState === HISTORICAL_COMMERCE_STATES.DRIFT ||
    inventoryState === HISTORICAL_COMMERCE_STATES.DRIFT
  ) {
    return HISTORICAL_COMMERCE_STATES.DRIFT;
  }

  if (
    entityStates.every((state) => state === 'MISSING') &&
    ['MISSING', HISTORICAL_COMMERCE_STATES.BASE].includes(inventoryState) &&
    ((inventoryState === 'MISSING' && foundationalAdjustmentState === 'MISSING') ||
      (inventoryState === HISTORICAL_COMMERCE_STATES.BASE &&
        foundationalAdjustmentState === HISTORICAL_COMMERCE_STATES.EXACT_FINAL))
  ) {
    return HISTORICAL_COMMERCE_STATES.BASE;
  }

  if (
    entityStates.every(
      (state) => state === HISTORICAL_COMMERCE_STATES.EXACT_FINAL,
    ) &&
    foundationalAdjustmentState === HISTORICAL_COMMERCE_STATES.EXACT_FINAL &&
    inventoryState === HISTORICAL_COMMERCE_STATES.EXACT_FINAL
  ) {
    return HISTORICAL_COMMERCE_STATES.EXACT_FINAL;
  }

  return HISTORICAL_COMMERCE_STATES.PARTIAL;
}

async function loadHistoricalCommerceSnapshot(validated) {
  const paymentIds = validated.matrix.payments.map((payment) => payment._id);
  const providerOrderIds = validated.matrix.payments.map(
    (payment) => payment.providerOrderId,
  );
  const providerPaymentIds = validated.matrix.payments
    .map((payment) => payment.providerPaymentId)
    .filter(Boolean);
  const orderIds = validated.matrix.orders.map((order) => order._id);
  const orderNumbers = validated.matrix.orders.map((order) => order.orderNumber);
  const historicalAdjustmentIds = validated.historicalAdjustments.map(
    (adjustment) => adjustment._id,
  );
  const foundationalAdjustmentIds = validated.foundationalAdjustments.map(
    (adjustment) => adjustment._id,
  );
  const inventoryIds = validated.foundationalPositions.map(
    (position) => position._id,
  );
  const productIds = validated.foundationalPositions.map(
    (position) => position.productId,
  );
  const [payments, orders, adjustments, inventory] = await Promise.all([
    Payment.find({
      $or: [
        { _id: { $in: paymentIds } },
        { providerOrderId: { $in: providerOrderIds } },
        { providerPaymentId: { $in: providerPaymentIds } },
      ],
    }).lean(),
    Order.find({
      $or: [
        { _id: { $in: orderIds } },
        { orderNumber: { $in: orderNumbers } },
        { paymentId: { $in: paymentIds } },
      ],
    }).lean(),
    InventoryAdjustment.find({
      $or: [
        {
          _id: {
            $in: [...foundationalAdjustmentIds, ...historicalAdjustmentIds],
          },
        },
        { inventoryId: { $in: inventoryIds } },
        {
          sourceType: 'order',
          sourceId: { $in: orderIds },
        },
      ],
    }).lean(),
    Inventory.find({
      $or: [
        { _id: { $in: inventoryIds } },
        { productId: { $in: productIds } },
      ],
    }).lean(),
  ]);
  const foundationalIdSet = new Set(foundationalAdjustmentIds.map(idString));
  const historicalIdSet = new Set(historicalAdjustmentIds.map(idString));
  const expectedInventoryIdSet = new Set(inventoryIds.map(idString));
  const foundationalAdjustments = adjustments.filter((adjustment) =>
    foundationalIdSet.has(idString(adjustment._id)),
  );
  const historicalAdjustments = adjustments.filter(
    (adjustment) =>
      historicalIdSet.has(idString(adjustment._id)) ||
      validated.historicalAdjustments.some((expected) =>
        adjustmentNaturalMatches(expected, adjustment),
      ),
  );
  const knownAdjustmentIds = new Set(
    [...foundationalAdjustments, ...historicalAdjustments].map((adjustment) =>
      idString(adjustment._id),
    ),
  );

  return {
    payments,
    orders,
    historicalAdjustments,
    foundationalAdjustments,
    inventory: inventory.filter((record) =>
      expectedInventoryIdSet.has(idString(record._id)),
    ),
    unknownAdjustments: adjustments.filter(
      (adjustment) => !knownAdjustmentIds.has(idString(adjustment._id)),
    ),
    unknownInventory: inventory.filter(
      (record) => !expectedInventoryIdSet.has(idString(record._id)),
    ),
  };
}

export async function preflightHistoricalCommerce(validated) {
  const snapshot = await loadHistoricalCommerceSnapshot(validated);
  const state = classifyHistoricalCommerceSnapshot({ validated, ...snapshot });

  if (
    ![
      HISTORICAL_COMMERCE_STATES.BASE,
      HISTORICAL_COMMERCE_STATES.EXACT_FINAL,
    ].includes(state)
  ) {
    throw new SeedDriftError(
      `Historical commerce preflight rejected the ${state} layer state.`,
    );
  }

  return { state, snapshot };
}

async function snapshotUnrelatedHistoricalData(validated) {
  const paymentIds = validated.matrix.payments.map((payment) => payment._id);
  const providerOrderIds = validated.matrix.payments.map(
    (payment) => payment.providerOrderId,
  );
  const providerPaymentIds = validated.matrix.payments
    .map((payment) => payment.providerPaymentId)
    .filter(Boolean);
  const orderIds = validated.matrix.orders.map((order) => order._id);
  const orderNumbers = validated.matrix.orders.map((order) => order.orderNumber);
  const historyIds = validated.historicalAdjustments.map(
    (adjustment) => adjustment._id,
  );
  const affectedIds = validated.affectedPositions.map((position) => position._id);
  const [payments, orders, adjustments, inventory, carts, coupons] =
    await Promise.all([
      Payment.collection
        .find({
          $and: [
            { _id: { $nin: paymentIds } },
            { providerOrderId: { $nin: providerOrderIds } },
            { providerPaymentId: { $nin: providerPaymentIds } },
          ],
        })
        .sort({ _id: 1 })
        .toArray(),
      Order.collection
        .find({
          $and: [
            { _id: { $nin: orderIds } },
            { orderNumber: { $nin: orderNumbers } },
            { paymentId: { $nin: paymentIds } },
          ],
        })
        .sort({ _id: 1 })
        .toArray(),
      InventoryAdjustment.collection
        .find({ _id: { $nin: historyIds } })
        .sort({ _id: 1 })
        .toArray(),
      Inventory.collection
        .find({ _id: { $nin: affectedIds } })
        .sort({ _id: 1 })
        .toArray(),
      Cart.collection.find({}).sort({ _id: 1 }).toArray(),
      Coupon.collection.find({}).sort({ _id: 1 }).toArray(),
    ]);

  return JSON.stringify({
    payments,
    orders,
    adjustments,
    inventory,
    carts,
    coupons,
    refunds: await Refund.countDocuments({}),
    notifications: await Notification.countDocuments({}),
  });
}

function foundationalInventoryFilter(position) {
  return {
    _id: position._id,
    productId: position.productId,
    ...(hasOwn(position, 'variantId')
      ? { variantId: position.variantId }
      : { variantId: { $exists: false } }),
    quantity: position.quantity,
    createdAt: position.createdAt,
    updatedAt: position.updatedAt,
  };
}

function finalInventoryFilter(position) {
  return {
    _id: position._id,
    productId: position.productId,
    ...(hasOwn(position, 'variantId')
      ? { variantId: position.variantId }
      : { variantId: { $exists: false } }),
    quantity: position.quantity,
    createdAt: position.createdAt,
    updatedAt: position.updatedAt,
  };
}

export async function verifyHistoricalCommerce(validated) {
  const preflight = await preflightHistoricalCommerce(validated);

  assertHistorical(
    preflight.state === HISTORICAL_COMMERCE_STATES.EXACT_FINAL,
    'DEMO_HISTORICAL_POSTFLIGHT_NOT_FINAL',
    'Historical commerce verification requires the exact final layer.',
  );

  const adjustments = [
    ...preflight.snapshot.foundationalAdjustments,
    ...preflight.snapshot.historicalAdjustments,
  ].sort((left, right) => {
    const timestampOrder = dateString(left.createdAt).localeCompare(
      dateString(right.createdAt),
    );

    return timestampOrder || idString(left._id).localeCompare(idString(right._id));
  });
  const running = new Map(
    validated.finalPositions.map((position) => [idString(position._id), 0]),
  );

  for (const adjustment of adjustments) {
    const key = idString(adjustment.inventoryId);
    const previous = running.get(key);

    assertHistorical(
      adjustment.previousQuantity === previous &&
        adjustment.newQuantity === previous + adjustment.quantityChange &&
        adjustment.newQuantity >= 0,
      'DEMO_HISTORICAL_LEDGER_ARITHMETIC_INVALID',
      `Inventory ledger arithmetic failed at ${idString(adjustment._id)}.`,
    );
    running.set(key, adjustment.newQuantity);
  }

  for (const position of validated.finalPositions) {
    assertHistorical(
      running.get(idString(position._id)) === position.quantity,
      'DEMO_HISTORICAL_LEDGER_FINAL_MISMATCH',
      `Inventory ${position.seedKey} does not reconcile to its final quantity.`,
    );
  }

  const reasons = Object.fromEntries(
    Object.values(INVENTORY_ADJUSTMENT_REASONS).map((reason) => [
      reason,
      adjustments.filter((adjustment) => adjustment.reason === reason).length,
    ]),
  );

  assertHistorical(
    adjustments.length === 157 &&
      reasons.initial_stock === 85 &&
      reasons.restock === 8 &&
      reasons.manual_correction === 11 &&
      reasons.order_purchase === 49 &&
      reasons.order_cancellation === 4 &&
      reasons.refund_return === 0,
    'DEMO_HISTORICAL_LEDGER_TOTALS_INVALID',
    'Complete Inventory ledger reason totals differ from the lock.',
  );

  return {
    state: preflight.state,
    payments: 46,
    orders: 42,
    historicalAdjustments: 53,
    totalAdjustments: 157,
    affectedInventory: validated.affectedPositions.length,
    minimumAffectedQuantity: Math.min(
      ...validated.affectedPositions.map((position) => position.quantity),
    ),
    reasons,
  };
}

export async function seedHistoricalCommerce(validated) {
  const beforeUnrelated = await snapshotUnrelatedHistoricalData(validated);
  const preflight = await preflightHistoricalCommerce(validated);
  let createdPayments = 0;
  let createdOrders = 0;
  let createdAdjustments = 0;
  let updatedInventory = 0;

  if (preflight.state === HISTORICAL_COMMERCE_STATES.BASE) {
    assertHistorical(
      preflight.snapshot.inventory.length === 105 &&
        preflight.snapshot.foundationalAdjustments.length === 104,
      'DEMO_HISTORICAL_FOUNDATION_INCOMPLETE',
      'Historical persistence requires the exact complete Inventory foundation.',
    );

    try {
      await withSeedTransaction(async (session) => {
        const paymentResult = await Payment.collection.insertMany(
          validated.matrix.payments.map(paymentPayload),
          { ordered: true, session },
        );
        createdPayments = paymentResult.insertedCount;
        const orderResult = await Order.collection.insertMany(
          validated.matrix.orders.map(orderPayload),
          { ordered: true, session },
        );
        createdOrders = orderResult.insertedCount;
        const adjustmentResult = await InventoryAdjustment.collection.insertMany(
          validated.historicalAdjustments.map(adjustmentPayload),
          { ordered: true, session },
        );
        createdAdjustments = adjustmentResult.insertedCount;

        for (const finalPosition of validated.affectedPositions) {
          const foundational = validated.foundationalPositions.find(
            (position) => idString(position._id) === idString(finalPosition._id),
          );
          const result = await Inventory.collection.updateOne(
            foundationalInventoryFilter(foundational),
            {
              $set: {
                quantity: finalPosition.quantity,
                updatedAt: finalPosition.updatedAt,
              },
            },
            { session },
          );

          if (result.matchedCount !== 1 || result.modifiedCount !== 1) {
            throw new SeedValidationError(
              'DEMO_HISTORICAL_INVENTORY_GUARD_FAILED',
              `Guarded Inventory update failed for ${finalPosition.seedKey}.`,
            );
          }

          updatedInventory += 1;
        }
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new SeedValidationError(
          'DEMO_HISTORICAL_DUPLICATE_KEY',
          'A concurrent write created a historical commerce identity conflict.',
        );
      }

      throw error;
    }
  }

  const verification = await verifyHistoricalCommerce(validated);
  const afterUnrelated = await snapshotUnrelatedHistoricalData(validated);

  assertHistorical(
    beforeUnrelated === afterUnrelated,
    'DEMO_HISTORICAL_UNRELATED_DATA_CHANGED',
    'Unrelated commerce, Inventory, Cart, Coupon, Refund, or Notification state changed.',
  );

  return {
    createdPayments,
    skippedPayments: 46 - createdPayments,
    createdOrders,
    skippedOrders: 42 - createdOrders,
    createdAdjustments,
    skippedAdjustments: 53 - createdAdjustments,
    updatedInventory,
    verification,
  };
}

export function historicalInventoryLogicalSeedResult(validated) {
  return {
    positions: validated.finalPositions,
    adjustments: validated.foundationalAdjustments,
    counts: {
      inventory: 105,
      adjustments: 104,
    },
    created: 0,
    skipped: 105,
    adjustmentsCreated: 0,
    adjustmentsSkipped: 104,
  };
}

export function exactHistoricalIdFilter(records) {
  assertHistorical(
    Array.isArray(records) && records.length > 0,
    'DEMO_HISTORICAL_RESET_SCOPE_EMPTY',
    'Historical reset requires exact deterministic records.',
  );

  return { _id: { $in: records.map((record) => record._id) } };
}

export async function findHistoricalResetDependencies(validated) {
  const orderIds = validated.matrix.orders.map((order) => order._id);
  const paymentIds = validated.matrix.payments.map((payment) => payment._id);
  const [refund, notification] = await Promise.all([
    Refund.exists({
      $or: [
        { orderId: { $in: orderIds } },
        { paymentId: { $in: paymentIds } },
      ],
    }),
    Notification.exists({
      resourceId: { $in: [...orderIds, ...paymentIds] },
    }),
  ]);

  return [
    ...(refund ? ['Refund'] : []),
    ...(notification ? ['Notification'] : []),
  ];
}

export function assertNoHistoricalResetDependencies(dependencies) {
  assertHistorical(
    dependencies.length === 0,
    'DEMO_HISTORICAL_RESET_DEPENDENCY',
    `Historical reset is blocked by: ${dependencies.join(', ')}.`,
  );
}

export async function resetHistoricalCommerce(validated) {
  const preflight = await preflightHistoricalCommerce(validated);

  if (preflight.state === HISTORICAL_COMMERCE_STATES.BASE) {
    return {
      inventoryRestored: 0,
      adjustmentsDeleted: 0,
      ordersDeleted: 0,
      paymentsDeleted: 0,
    };
  }

  const dependencies = await findHistoricalResetDependencies(validated);
  assertNoHistoricalResetDependencies(dependencies);
  let inventoryRestored = 0;
  let adjustmentsDeleted = 0;
  let ordersDeleted = 0;
  let paymentsDeleted = 0;

  await withSeedTransaction(async (session) => {
    for (const finalPosition of validated.affectedPositions) {
      const foundational = validated.foundationalPositions.find(
        (position) => idString(position._id) === idString(finalPosition._id),
      );
      const result = await Inventory.collection.updateOne(
        finalInventoryFilter(finalPosition),
        {
          $set: {
            quantity: foundational.quantity,
            updatedAt: foundational.updatedAt,
          },
        },
        { session },
      );

      if (result.matchedCount !== 1 || result.modifiedCount !== 1) {
        throw new SeedValidationError(
          'DEMO_HISTORICAL_RESET_INVENTORY_GUARD_FAILED',
          `Historical reset guard failed for ${finalPosition.seedKey}.`,
        );
      }

      inventoryRestored += 1;
    }

    const adjustmentResult = await InventoryAdjustment.deleteMany(
      exactHistoricalIdFilter(validated.historicalAdjustments),
      { session },
    );
    adjustmentsDeleted = adjustmentResult.deletedCount;
    const orderResult = await Order.deleteMany(
      exactHistoricalIdFilter(validated.matrix.orders),
      { session },
    );
    ordersDeleted = orderResult.deletedCount;
    const paymentResult = await Payment.deleteMany(
      exactHistoricalIdFilter(validated.matrix.payments),
      { session },
    );
    paymentsDeleted = paymentResult.deletedCount;

    assertHistorical(
      adjustmentsDeleted === 53 &&
        ordersDeleted === 42 &&
        paymentsDeleted === 46,
      'DEMO_HISTORICAL_RESET_COUNT_MISMATCH',
      'Historical reset did not delete the exact deterministic layer.',
    );
  });

  const postflight = await preflightHistoricalCommerce(validated);
  assertHistorical(
    postflight.state === HISTORICAL_COMMERCE_STATES.BASE,
    'DEMO_HISTORICAL_RESET_POSTFLIGHT_FAILED',
    'Historical reset did not restore the exact foundational state.',
  );

  return {
    inventoryRestored,
    adjustmentsDeleted,
    ordersDeleted,
    paymentsDeleted,
  };
}
