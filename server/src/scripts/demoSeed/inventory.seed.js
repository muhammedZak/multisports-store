import { isDeepStrictEqual } from 'node:util';

import { Product } from '../../modules/catalog/product.model.js';
import {
  INVENTORY_ADJUSTMENT_REASONS,
  STOCK_STATES,
} from '../../modules/inventory/inventory.constants.js';
import { Inventory } from '../../modules/inventory/inventory.model.js';
import { InventoryAdjustment } from '../../modules/inventory/inventoryAdjustment.model.js';
import {
  hasConsistentAdjustmentArithmetic,
  isNonNegativeInteger,
  isNonZeroInteger,
} from '../../modules/inventory/inventory.validation.js';
import { User } from '../../modules/users/user.model.js';
import {
  PRODUCT_CLASSIFICATIONS,
  buildExpectedPersistedProducts,
  preflightProducts,
} from './product.persistence.seed.js';
import { buildInventoryRegistryPlan } from './seed.registry.js';
import {
  SeedDriftError,
  SeedValidationError,
  withSeedTransaction,
} from './seed.utils.js';

export const INVENTORY_CLASSIFICATIONS = Object.freeze({
  MISSING: 'MISSING',
  EXACT: 'EXACT',
  NATURAL_KEY_CONFLICT: 'NATURAL_KEY_CONFLICT',
  ID_CONFLICT: 'ID_CONFLICT',
  DRIFT: 'DRIFT',
});

export const INVENTORY_RESET_ORDER = Object.freeze([
  'inventoryAdjustments',
  'inventory',
]);

export const DEMO_INVENTORY_RECONCILIATION_NOTE =
  'Demo catalog count reconciliation.';

function idString(value) {
  return value?.toString();
}

function dateString(value) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function hasOwn(value, field) {
  return Object.prototype.hasOwnProperty.call(value || {}, field);
}

export function resolveSeedLowStockThreshold(source = process.env) {
  const threshold = Number(source.LOW_STOCK_THRESHOLD ?? 5);

  if (!Number.isInteger(threshold) || threshold < 0) {
    throw new SeedValidationError(
      'DEMO_INVENTORY_THRESHOLD_INVALID',
      'LOW_STOCK_THRESHOLD must be a non-negative integer.',
    );
  }

  if (threshold < 1) {
    throw new SeedValidationError(
      'DEMO_INVENTORY_THRESHOLD_ZERO',
      'LOW_STOCK_THRESHOLD must be at least 1 for the demo Inventory dataset.',
    );
  }

  return threshold;
}

export function getSeedStockState(quantity, threshold) {
  if (!isNonNegativeInteger(quantity)) {
    throw new TypeError('Inventory quantity must be a non-negative integer.');
  }

  if (!Number.isInteger(threshold) || threshold < 1) {
    throw new TypeError('Demo Inventory threshold must be a positive integer.');
  }

  if (quantity === 0) {
    return STOCK_STATES.OUT_OF_STOCK;
  }

  return quantity <= threshold
    ? STOCK_STATES.LOW_STOCK
    : STOCK_STATES.IN_STOCK;
}

export function naturalInventoryIdentity(value) {
  const productId = idString(value?.productId);
  const hasVariant = hasOwn(value, 'variantId');

  if (!productId) {
    return null;
  }

  if (!hasVariant || value.variantId === undefined) {
    return `${productId}:simple`;
  }

  if (value.variantId === null) {
    return `${productId}:simple`;
  }

  return `${productId}:variant:${idString(value.variantId)}`;
}

function calculateFinalQuantity(position, threshold) {
  const minLowCycle = Math.min(threshold, 5);

  if (position.productType === 'simple') {
    if (!position.productActive) {
      return threshold + 6 + position.simpleOrdinal;
    }

    if (position.stockState === STOCK_STATES.LOW_STOCK) {
      return 1 + ((position.simpleOrdinal - 1) % minLowCycle);
    }

    if (position.stockState === STOCK_STATES.OUT_OF_STOCK) {
      return 0;
    }

    return threshold + 8 + ((position.simpleOrdinal * 3) % 11);
  }

  if (position.variantOrdinal === 1) {
    return threshold + 10 + ((position.variantProductOrdinal * 2) % 9);
  }

  if (position.variantOrdinal === 2) {
    return 1 + ((position.variantProductOrdinal - 1) % minLowCycle);
  }

  if (position.variantOrdinal === 3) {
    return 0;
  }

  return threshold + 5 + ((position.variantProductOrdinal * 3) % 8);
}

function createAdjustment({
  id,
  inventoryId,
  reason,
  previousQuantity,
  quantityChange,
  performedBy,
  note,
  timestamp,
}) {
  return {
    _id: id,
    inventoryId,
    reason,
    previousQuantity,
    quantityChange,
    newQuantity: previousQuantity + quantityChange,
    ...(performedBy ? { performedBy } : {}),
    ...(note ? { note } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildPositionAdjustments({
  position,
  finalQuantity,
  registry,
  adminId,
  nextTimestamp,
}) {
  if (position.historyType === 'zero_no_history') {
    return [];
  }

  let initialQuantity = finalQuantity;

  if (position.historyType === 'restock') {
    initialQuantity = finalQuantity - (3 + (position.inStockOrdinal % 3));
  } else if (position.historyType === 'manual_correction') {
    initialQuantity = finalQuantity + 2;
  } else if (position.historyType === 'historical_zero') {
    initialQuantity = 6 + (position.outOfStockOrdinal % 5);
  }

  if (!Number.isInteger(initialQuantity) || initialQuantity <= 0) {
    throw new SeedValidationError(
      'DEMO_INVENTORY_INITIAL_QUANTITY_INVALID',
      `Inventory ${position.inventoryKey} has an invalid initial quantity.`,
    );
  }

  const inventoryId = registry.idFor(position.inventoryKey);
  const adjustments = [
    createAdjustment({
      id: registry.idFor(position.adjustmentKeys[0]),
      inventoryId,
      reason: INVENTORY_ADJUSTMENT_REASONS.INITIAL_STOCK,
      previousQuantity: 0,
      quantityChange: initialQuantity,
      timestamp: nextTimestamp(),
    }),
  ];

  if (position.adjustmentKeys.length === 1) {
    return adjustments;
  }

  const reason =
    position.historyType === 'restock'
      ? INVENTORY_ADJUSTMENT_REASONS.RESTOCK
      : INVENTORY_ADJUSTMENT_REASONS.MANUAL_CORRECTION;
  const quantityChange = finalQuantity - initialQuantity;

  adjustments.push(
    createAdjustment({
      id: registry.idFor(position.adjustmentKeys[1]),
      inventoryId,
      reason,
      previousQuantity: initialQuantity,
      quantityChange,
      performedBy: adminId,
      ...(reason === INVENTORY_ADJUSTMENT_REASONS.MANUAL_CORRECTION
        ? { note: DEMO_INVENTORY_RECONCILIATION_NOTE }
        : {}),
      timestamp: nextTimestamp(),
    }),
  );

  return adjustments;
}

export function buildExpectedInventorySeed({
  definitions,
  registry,
  clock,
  threshold,
  adminId = registry.idFor('user:admin'),
}) {
  const expectedProducts = buildExpectedPersistedProducts({
    definitions,
    clock,
  });
  const productsBySeedKey = new Map(
    expectedProducts.map((product) => [product.seedKey, product]),
  );
  const plan = buildInventoryRegistryPlan({
    products: definitions.map((product) => ({
      seedKey: product.seedKey,
      productType: product.productType,
      active: product.isActive,
    })),
  });
  const inventoryTimestamps = clock.orderedTimestamps(plan.length, {
    start: clock.atLocalTime(clock.monthsAgo(6), { hour: 9 }),
    stepMilliseconds: 1000,
  });
  const adjustmentTimestamps = clock.orderedTimestamps(104, {
    start: clock.atLocalTime(clock.monthsAgo(6), { hour: 10 }),
    stepMilliseconds: 1000,
  });
  let adjustmentTimestampIndex = 0;
  const nextTimestamp = () => {
    const timestamp = adjustmentTimestamps[adjustmentTimestampIndex];
    adjustmentTimestampIndex += 1;
    return timestamp;
  };

  const positions = plan.map((position, index) => {
    const product = productsBySeedKey.get(position.productSeedKey);
    const variant =
      position.productType === 'variant'
        ? product?.variants[position.variantOrdinal - 1]
        : undefined;

    if (!product || (position.productType === 'variant' && !variant)) {
      throw new SeedValidationError(
        'DEMO_INVENTORY_PRODUCT_MAPPING_INVALID',
        `Inventory ${position.inventoryKey} has no exact Product mapping.`,
      );
    }

    const quantity = calculateFinalQuantity(position, threshold);
    const createdAt = inventoryTimestamps[index];
    const adjustments = buildPositionAdjustments({
      position,
      finalQuantity: quantity,
      registry,
      adminId,
      nextTimestamp,
    });
    const updatedAt = adjustments.at(-1)?.createdAt ?? createdAt;

    return {
      seedKey: position.inventoryKey,
      productSeedKey: position.productSeedKey,
      productType: position.productType,
      productActive: position.productActive,
      variantActive: variant?.isActive,
      stockState: position.stockState,
      historyType: position.historyType,
      _id: registry.idFor(position.inventoryKey),
      productId: product._id,
      ...(variant ? { variantId: variant._id } : {}),
      quantity,
      createdAt,
      updatedAt,
      productCreatedAt: product.createdAt,
      adjustments,
    };
  });

  if (adjustmentTimestampIndex !== adjustmentTimestamps.length) {
    throw new SeedValidationError(
      'DEMO_INVENTORY_ADJUSTMENT_TIMESTAMP_COUNT',
      'Inventory adjustment timestamps do not match the locked ledger count.',
    );
  }

  return { expectedProducts, positions };
}

function inventoryPayload(position) {
  return {
    _id: position._id,
    productId: position.productId,
    ...(hasOwn(position, 'variantId') ? { variantId: position.variantId } : {}),
    quantity: position.quantity,
    createdAt: position.createdAt,
    updatedAt: position.updatedAt,
  };
}

function adjustmentPayload(adjustment) {
  return {
    _id: adjustment._id,
    inventoryId: adjustment.inventoryId,
    reason: adjustment.reason,
    quantityChange: adjustment.quantityChange,
    previousQuantity: adjustment.previousQuantity,
    newQuantity: adjustment.newQuantity,
    ...(hasOwn(adjustment, 'performedBy')
      ? { performedBy: adjustment.performedBy }
      : {}),
    ...(hasOwn(adjustment, 'note') ? { note: adjustment.note } : {}),
    createdAt: adjustment.createdAt,
    updatedAt: adjustment.updatedAt,
  };
}

function reasonCounts(adjustments) {
  return Object.fromEntries(
    Object.values(INVENTORY_ADJUSTMENT_REASONS).map((reason) => [
      reason,
      adjustments.filter((adjustment) => adjustment.reason === reason).length,
    ]),
  );
}

export function reconcileInventoryLedgers(positions) {
  let reconciled = 0;

  for (const position of positions) {
    let runningQuantity = 0;
    let previousTimestamp = position.createdAt;

    if (new Date(position.productCreatedAt) >= new Date(position.createdAt)) {
      throw new SeedValidationError(
        'DEMO_INVENTORY_PRODUCT_TIMELINE_INVALID',
        `Inventory ${position.seedKey} does not follow its Product timestamp.`,
      );
    }

    for (const adjustment of position.adjustments) {
      if (
        new Date(adjustment.createdAt) <= new Date(previousTimestamp) ||
        adjustment.previousQuantity !== runningQuantity ||
        !isNonZeroInteger(adjustment.quantityChange) ||
        !hasConsistentAdjustmentArithmetic(adjustment) ||
        adjustment.newQuantity < 0
      ) {
        throw new SeedValidationError(
          'DEMO_INVENTORY_LEDGER_INVALID',
          `Inventory ${position.seedKey} has invalid ledger arithmetic or chronology.`,
        );
      }

      runningQuantity = adjustment.newQuantity;
      previousTimestamp = adjustment.createdAt;
    }

    if (
      runningQuantity !== position.quantity ||
      dateString(position.updatedAt) !== dateString(previousTimestamp)
    ) {
      throw new SeedValidationError(
        'DEMO_INVENTORY_LEDGER_RECONCILIATION_FAILED',
        `Inventory ${position.seedKey} does not reconcile to its final quantity.`,
      );
    }

    reconciled += 1;
  }

  return reconciled;
}

function summarizePublicProductStates(positions) {
  const byProduct = new Map();

  for (const position of positions.filter((item) => item.productActive)) {
    if (!byProduct.has(position.productSeedKey)) {
      byProduct.set(position.productSeedKey, []);
    }

    byProduct.get(position.productSeedKey).push(position);
  }

  const states = [...byProduct.values()].map((productPositions) => {
    if (productPositions[0].productType === 'simple') {
      return productPositions[0].stockState;
    }

    const activeStates = productPositions
      .filter((position) => position.variantActive)
      .map((position) => position.stockState);

    if (activeStates.includes(STOCK_STATES.IN_STOCK)) {
      return STOCK_STATES.IN_STOCK;
    }

    return activeStates.includes(STOCK_STATES.LOW_STOCK)
      ? STOCK_STATES.LOW_STOCK
      : STOCK_STATES.OUT_OF_STOCK;
  });

  return Object.fromEntries(
    Object.values(STOCK_STATES).map((state) => [
      state,
      states.filter((value) => value === state).length,
    ]),
  );
}

export async function validateInventoryDefinitions({
  definitions,
  registry,
  clock,
  threshold,
  adminId = registry.idFor('user:admin'),
}) {
  const built = buildExpectedInventorySeed({
    definitions,
    registry,
    clock,
    threshold,
    adminId,
  });
  const { positions } = built;
  const adjustments = positions.flatMap((position) => position.adjustments);
  const inventoryIds = positions.map((position) => idString(position._id));
  const adjustmentIds = adjustments.map((adjustment) =>
    idString(adjustment._id),
  );
  const naturalIdentities = positions.map(naturalInventoryIdentity);
  const stockCounts = Object.fromEntries(
    Object.values(STOCK_STATES).map((state) => [
      state,
      positions.filter((position) => position.stockState === state).length,
    ]),
  );
  const adjustmentsByReason = reasonCounts(adjustments);
  const publicStockCounts = summarizePublicProductStates(positions);
  const activeSimpleCount = definitions.filter(
    (product) => product.productType === 'simple' && product.isActive,
  ).length;
  const inactiveSimpleCount = definitions.filter(
    (product) => product.productType === 'simple' && !product.isActive,
  ).length;

  if (
    positions.length !== 105 ||
    positions.filter((position) => position.productType === 'simple').length !==
      21 ||
    positions.filter((position) => position.productType === 'variant').length !==
      84 ||
    activeSimpleCount !== 19 ||
    inactiveSimpleCount !== 2 ||
    registry.counts.inventory !== 105 ||
    registry.counts.inventoryAdjustments !== 104 ||
    new Set(inventoryIds).size !== 105 ||
    new Set(adjustmentIds).size !== 104 ||
    new Set(naturalIdentities).size !== 105
  ) {
    throw new SeedValidationError(
      'DEMO_INVENTORY_DEFINITION_TOTALS_INVALID',
      'Inventory definitions, registry IDs, or natural identities have unexpected totals.',
    );
  }

  if (
    stockCounts.in_stock !== 54 ||
    stockCounts.low_stock !== 26 ||
    stockCounts.out_of_stock !== 25 ||
    publicStockCounts.in_stock !== 29 ||
    publicStockCounts.low_stock !== 5 ||
    publicStockCounts.out_of_stock !== 4
  ) {
    throw new SeedValidationError(
      'DEMO_INVENTORY_STOCK_DISTRIBUTION_INVALID',
      'Inventory or public Product stock-state totals are invalid.',
    );
  }

  if (
    positions.filter(
      (position) =>
        position.productType === 'variant' &&
        position.variantActive === false &&
        position.quantity > threshold,
    ).length !== 21
  ) {
    throw new SeedValidationError(
      'DEMO_INVENTORY_INACTIVE_VARIANT_STOCK_INVALID',
      'All 21 inactive Variants must retain in-stock Inventory.',
    );
  }

  if (
    adjustments.length !== 104 ||
    adjustmentsByReason.initial_stock !== 85 ||
    adjustmentsByReason.restock !== 8 ||
    adjustmentsByReason.manual_correction !== 11 ||
    adjustmentsByReason.order_purchase !== 0 ||
    adjustmentsByReason.order_cancellation !== 0 ||
    adjustmentsByReason.refund_return !== 0
  ) {
    throw new SeedValidationError(
      'DEMO_INVENTORY_ADJUSTMENT_TOTALS_INVALID',
      'Foundational InventoryAdjustment reason totals are invalid.',
    );
  }

  if (
    adjustments.some(
      (adjustment) =>
        hasOwn(adjustment, 'sourceType') || hasOwn(adjustment, 'sourceId'),
    ) ||
    adjustments.some(
      (adjustment) =>
        adjustment.reason === INVENTORY_ADJUSTMENT_REASONS.INITIAL_STOCK &&
        hasOwn(adjustment, 'performedBy'),
    ) ||
    adjustments.some(
      (adjustment) =>
        [
          INVENTORY_ADJUSTMENT_REASONS.RESTOCK,
          INVENTORY_ADJUSTMENT_REASONS.MANUAL_CORRECTION,
        ].includes(adjustment.reason) &&
        idString(adjustment.performedBy) !== idString(adminId),
    ) ||
    adjustments.some(
      (adjustment) =>
        adjustment.reason ===
          INVENTORY_ADJUSTMENT_REASONS.MANUAL_CORRECTION &&
        adjustment.note !== DEMO_INVENTORY_RECONCILIATION_NOTE,
    )
  ) {
    throw new SeedValidationError(
      'DEMO_INVENTORY_ADJUSTMENT_OWNERSHIP_INVALID',
      'Foundational InventoryAdjustment performer, source, or note fields are invalid.',
    );
  }

  if (reconcileInventoryLedgers(positions) !== 105) {
    throw new SeedValidationError(
      'DEMO_INVENTORY_LEDGER_COUNT_INVALID',
      'All 105 Inventory ledgers must reconcile.',
    );
  }

  for (const position of positions) {
    if (getSeedStockState(position.quantity, threshold) !== position.stockState) {
      throw new SeedValidationError(
        'DEMO_INVENTORY_QUANTITY_STATE_INVALID',
        `Inventory ${position.seedKey} quantity does not match its stock state.`,
      );
    }

    const inventoryDocument = new Inventory(inventoryPayload(position));
    await inventoryDocument.validate();

    if (
      position.productType === 'simple' &&
      hasOwn(inventoryDocument.toObject(), 'variantId')
    ) {
      throw new SeedValidationError(
        'DEMO_INVENTORY_SIMPLE_VARIANT_PRESENT',
        `Simple Inventory ${position.seedKey} persisted a variantId field.`,
      );
    }

    for (const adjustment of position.adjustments) {
      const adjustmentDocument = new InventoryAdjustment(
        adjustmentPayload(adjustment),
      );
      await adjustmentDocument.validate();
    }
  }

  return {
    ...built,
    adjustments,
    counts: {
      inventory: positions.length,
      simple: 21,
      variant: 84,
      adjustments: adjustments.length,
      stock: stockCounts,
      publicStock: publicStockCounts,
      reasons: adjustmentsByReason,
      reconciled: 105,
    },
  };
}

function comparableInventory(value) {
  return {
    _id: idString(value?._id),
    productId: idString(value?.productId),
    variantPresent: hasOwn(value, 'variantId'),
    variantId: idString(value?.variantId),
    quantity: value?.quantity,
    createdAt: value?.createdAt ? dateString(value.createdAt) : undefined,
    updatedAt: value?.updatedAt ? dateString(value.updatedAt) : undefined,
  };
}

function comparableAdjustment(value) {
  return {
    _id: idString(value?._id),
    inventoryId: idString(value?.inventoryId),
    reason: value?.reason,
    quantityChange: value?.quantityChange,
    previousQuantity: value?.previousQuantity,
    newQuantity: value?.newQuantity,
    performedByPresent: hasOwn(value, 'performedBy'),
    performedBy: idString(value?.performedBy),
    sourceTypePresent: hasOwn(value, 'sourceType'),
    sourceType: value?.sourceType,
    sourceIdPresent: hasOwn(value, 'sourceId'),
    sourceId: idString(value?.sourceId),
    notePresent: hasOwn(value, 'note'),
    note: value?.note,
    createdAt: value?.createdAt ? dateString(value.createdAt) : undefined,
    updatedAt: value?.updatedAt ? dateString(value.updatedAt) : undefined,
  };
}

function compareExpectedLedger(expected, existingAdjustments) {
  const actual = [...existingAdjustments].sort((left, right) =>
    dateString(left.createdAt).localeCompare(dateString(right.createdAt)),
  );

  if (actual.length !== expected.adjustments.length) {
    return false;
  }

  return expected.adjustments.every((adjustment, index) =>
    isDeepStrictEqual(
      comparableAdjustment(actual[index]),
      comparableAdjustment(adjustment),
    ),
  );
}

export function classifyInventoryPosition({
  expected,
  recordById,
  recordByNaturalIdentity,
  existingAdjustments = [],
  adjustmentIdConflicts = [],
}) {
  if (
    recordById &&
    naturalInventoryIdentity(recordById) !== naturalInventoryIdentity(expected)
  ) {
    return { classification: INVENTORY_CLASSIFICATIONS.ID_CONFLICT };
  }

  if (
    recordByNaturalIdentity &&
    idString(recordByNaturalIdentity._id) !== idString(expected._id)
  ) {
    return {
      classification: INVENTORY_CLASSIFICATIONS.NATURAL_KEY_CONFLICT,
    };
  }

  if (!recordById && !recordByNaturalIdentity) {
    return existingAdjustments.length > 0 || adjustmentIdConflicts.length > 0
      ? { classification: INVENTORY_CLASSIFICATIONS.DRIFT }
      : { classification: INVENTORY_CLASSIFICATIONS.MISSING };
  }

  const existing = recordById || recordByNaturalIdentity;

  if (
    !isDeepStrictEqual(
      comparableInventory(existing),
      comparableInventory(expected),
    ) ||
    !compareExpectedLedger(expected, existingAdjustments) ||
    adjustmentIdConflicts.length > 0
  ) {
    return { classification: INVENTORY_CLASSIFICATIONS.DRIFT };
  }

  return { classification: INVENTORY_CLASSIFICATIONS.EXACT };
}

export async function preflightInventorySeed(expectedPositions) {
  const inventoryIds = expectedPositions.map((position) => position._id);
  const productIds = [
    ...new Set(expectedPositions.map((position) => idString(position.productId))),
  ];
  const adjustmentIds = expectedPositions.flatMap((position) =>
    position.adjustments.map((adjustment) => adjustment._id),
  );
  const records = await Inventory.find({
    $or: [
      { _id: { $in: inventoryIds } },
      { productId: { $in: productIds } },
    ],
  }).lean();
  const adjustments = await InventoryAdjustment.find({
    $or: [
      { _id: { $in: adjustmentIds } },
      { inventoryId: { $in: inventoryIds } },
    ],
  }).lean();
  const expectedIdSet = new Set(inventoryIds.map(idString));
  const expectedProductIdSet = new Set(productIds);
  const unknownRecords = records.filter(
    (record) =>
      expectedProductIdSet.has(idString(record.productId)) &&
      !expectedIdSet.has(idString(record._id)),
  );

  if (unknownRecords.length > 0) {
    throw new SeedDriftError(
      'Inventory preflight found an unknown Inventory row on a deterministic Product.',
    );
  }

  const recordsById = new Map(
    records.map((record) => [idString(record._id), record]),
  );
  const recordsByNaturalIdentity = new Map();

  for (const record of records) {
    const identity = naturalInventoryIdentity(record);

    if (recordsByNaturalIdentity.has(identity)) {
      throw new SeedDriftError(
        'Inventory preflight found duplicate natural Inventory identities.',
      );
    }

    recordsByNaturalIdentity.set(identity, record);
  }

  const adjustmentsByInventoryId = new Map();

  for (const adjustment of adjustments) {
    const inventoryId = idString(adjustment.inventoryId);

    if (!adjustmentsByInventoryId.has(inventoryId)) {
      adjustmentsByInventoryId.set(inventoryId, []);
    }

    adjustmentsByInventoryId.get(inventoryId).push(adjustment);
  }

  const adjustmentsById = new Map(
    adjustments.map((adjustment) => [idString(adjustment._id), adjustment]),
  );
  const results = expectedPositions.map((expected) => {
    const expectedAdjustmentIds = new Set(
      expected.adjustments.map((adjustment) => idString(adjustment._id)),
    );
    const adjustmentIdConflicts = [...expectedAdjustmentIds]
      .map((id) => adjustmentsById.get(id))
      .filter(
        (adjustment) =>
          adjustment &&
          idString(adjustment.inventoryId) !== idString(expected._id),
      );
    const recordById = recordsById.get(idString(expected._id));
    const recordByNaturalIdentity = recordsByNaturalIdentity.get(
      naturalInventoryIdentity(expected),
    );

    return {
      expected,
      existingRecord: recordById || recordByNaturalIdentity,
      ...classifyInventoryPosition({
        expected,
        recordById,
        recordByNaturalIdentity,
        existingAdjustments:
          adjustmentsByInventoryId.get(idString(expected._id)) || [],
        adjustmentIdConflicts,
      }),
    };
  });
  const failures = results.filter(
    (result) =>
      ![
        INVENTORY_CLASSIFICATIONS.MISSING,
        INVENTORY_CLASSIFICATIONS.EXACT,
      ].includes(result.classification),
  );

  if (failures.length > 0) {
    throw new SeedDriftError(
      `Inventory preflight rejected: ${failures
        .map((failure) =>
          `${failure.expected.seedKey}:${failure.classification}`,
        )
        .join(', ')}.`,
    );
  }

  return results;
}

async function assertExactProducts({
  expectedProducts,
  productImageFolder,
}) {
  const results = await preflightProducts({
    expectedProducts,
    productImageFolder,
  });

  if (
    results.length !== 42 ||
    results.some(
      (result) => result.classification !== PRODUCT_CLASSIFICATIONS.EXACT,
    )
  ) {
    throw new SeedValidationError(
      'DEMO_INVENTORY_PRODUCT_PRECONDITION_FAILED',
      'All 42 deterministic Products must be exact before Inventory seeding.',
    );
  }
}

export async function assertDemoInventoryAdmin(registry) {
  const adminId = registry.idFor('user:admin');
  const admin = await User.findById(adminId).select('email role').lean();

  if (
    !admin ||
    admin.email !== 'admin.demo@example.test' ||
    admin.role !== 'admin'
  ) {
    throw new SeedValidationError(
      'DEMO_INVENTORY_ADMIN_INVALID',
      'The deterministic Demo Store Admin is missing or invalid.',
    );
  }

  return adminId;
}

export async function seedInventoryCatalog({
  definitions,
  registry,
  clock,
  threshold,
  productImageFolder,
}) {
  const adminId = registry.idFor('user:admin');
  const validated = await validateInventoryDefinitions({
    definitions,
    registry,
    clock,
    threshold,
    adminId,
  });

  await assertExactProducts({
    expectedProducts: validated.expectedProducts,
    productImageFolder,
  });
  await assertDemoInventoryAdmin(registry);

  const preflight = await preflightInventorySeed(validated.positions);
  const missing = preflight.filter(
    (result) => result.classification === INVENTORY_CLASSIFICATIONS.MISSING,
  );

  if (missing.length > 0) {
    const inventoryDocuments = missing.map((result) =>
      inventoryPayload(result.expected),
    );
    const adjustmentDocuments = missing.flatMap((result) =>
      result.expected.adjustments.map(adjustmentPayload),
    );

    try {
      await withSeedTransaction(async (session) => {
        await Inventory.insertMany(inventoryDocuments, {
          ordered: true,
          session,
        });

        if (adjustmentDocuments.length > 0) {
          await InventoryAdjustment.insertMany(adjustmentDocuments, {
            ordered: true,
            session,
          });
        }
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new SeedValidationError(
          'DEMO_INVENTORY_DUPLICATE_KEY',
          'A concurrent write created an Inventory ownership conflict.',
        );
      }

      throw error;
    }
  }

  const postflight = await preflightInventorySeed(validated.positions);

  if (
    postflight.some(
      (result) => result.classification !== INVENTORY_CLASSIFICATIONS.EXACT,
    )
  ) {
    throw new SeedValidationError(
      'DEMO_INVENTORY_POSTFLIGHT_FAILED',
      'Inventory post-write verification did not find 105 exact ledgers.',
    );
  }

  const createdAdjustments = missing.reduce(
    (total, result) => total + result.expected.adjustments.length,
    0,
  );

  return {
    ...validated,
    created: missing.length,
    skipped: validated.positions.length - missing.length,
    adjustmentsCreated: createdAdjustments,
    adjustmentsSkipped: validated.adjustments.length - createdAdjustments,
  };
}

export function exactInventoryOwnershipFilter(expectedPositions) {
  if (!Array.isArray(expectedPositions) || expectedPositions.length === 0) {
    throw new SeedValidationError(
      'DEMO_INVENTORY_RESET_SCOPE_INVALID',
      'Inventory reset requires exact preflighted positions.',
    );
  }

  return {
    $or: expectedPositions.map((position) => ({
      _id: position._id,
      productId: position.productId,
      ...(hasOwn(position, 'variantId')
        ? { variantId: position.variantId }
        : { variantId: { $exists: false } }),
      quantity: position.quantity,
    })),
  };
}

export async function resetInventoryCatalog({
  definitions,
  registry,
  clock,
  threshold,
  productImageFolder,
}) {
  const validated = await validateInventoryDefinitions({
    definitions,
    registry,
    clock,
    threshold,
  });

  await assertExactProducts({
    expectedProducts: validated.expectedProducts,
    productImageFolder,
  });

  const preflight = await preflightInventorySeed(validated.positions);
  const existing = preflight.filter(
    (result) => result.classification === INVENTORY_CLASSIFICATIONS.EXACT,
  );

  if (existing.length === 0) {
    return { inventoryDeleted: 0, adjustmentsDeleted: 0 };
  }

  const positions = existing.map((result) => result.expected);
  const adjustmentIds = positions.flatMap((position) =>
    position.adjustments.map((adjustment) => adjustment._id),
  );
  let adjustmentsDeleted = 0;
  let inventoryDeleted = 0;

  await withSeedTransaction(async (session) => {
    if (adjustmentIds.length > 0) {
      const adjustmentResult = await InventoryAdjustment.deleteMany(
        { _id: { $in: adjustmentIds } },
        { session },
      );
      adjustmentsDeleted = adjustmentResult.deletedCount;

      if (adjustmentsDeleted !== adjustmentIds.length) {
        throw new SeedValidationError(
          'DEMO_INVENTORY_ADJUSTMENT_RESET_COUNT_MISMATCH',
          'Inventory reset did not delete the exact registered adjustment set.',
        );
      }
    }

    const inventoryResult = await Inventory.deleteMany(
      exactInventoryOwnershipFilter(positions),
      { session },
    );
    inventoryDeleted = inventoryResult.deletedCount;

    if (inventoryDeleted !== positions.length) {
      throw new SeedValidationError(
        'DEMO_INVENTORY_RESET_COUNT_MISMATCH',
        'Inventory reset did not delete the exact preflighted position set.',
      );
    }
  });

  return { inventoryDeleted, adjustmentsDeleted };
}

export async function countUnknownInventoryOnSeedProducts(expectedPositions) {
  const expectedIds = new Set(
    expectedPositions.map((position) => idString(position._id)),
  );
  const productIds = [
    ...new Set(expectedPositions.map((position) => idString(position.productId))),
  ];
  const records = await Inventory.find({
    productId: { $in: productIds },
  })
    .select('_id')
    .lean();

  return records.filter((record) => !expectedIds.has(idString(record._id)))
    .length;
}

export async function assertPersistedInventoryStructure(expectedPositions) {
  const products = await Product.find({
    _id: {
      $in: [
        ...new Set(expectedPositions.map((position) => position.productId)),
      ],
    },
  })
    .select('_id variants')
    .lean();
  const inventories = await Inventory.find({
    _id: { $in: expectedPositions.map((position) => position._id) },
  }).lean();
  const byProduct = new Map();

  for (const inventory of inventories) {
    const productId = idString(inventory.productId);

    if (!byProduct.has(productId)) {
      byProduct.set(productId, []);
    }

    byProduct.get(productId).push(inventory);
  }

  for (const product of products) {
    const productInventories = byProduct.get(idString(product._id)) || [];

    if (product.variants.length === 0) {
      if (
        productInventories.length !== 1 ||
        hasOwn(productInventories[0], 'variantId')
      ) {
        throw new SeedValidationError(
          'DEMO_INVENTORY_SIMPLE_STRUCTURE_INVALID',
          'A simple Product does not have exactly one Product-level Inventory.',
        );
      }
      continue;
    }

    const expectedVariantIds = new Set(
      product.variants.map((variant) => idString(variant._id)),
    );
    const actualVariantIds = new Set(
      productInventories.map((inventory) => idString(inventory.variantId)),
    );

    if (
      productInventories.length !== 4 ||
      actualVariantIds.size !== 4 ||
      [...expectedVariantIds].some((variantId) =>
        !actualVariantIds.has(variantId),
      )
    ) {
      throw new SeedValidationError(
        'DEMO_INVENTORY_VARIANT_STRUCTURE_INVALID',
        'A Variant Product does not have one Inventory per embedded Variant.',
      );
    }
  }

  if (products.length !== 42 || inventories.length !== 105) {
    throw new SeedValidationError(
      'DEMO_INVENTORY_PERSISTED_STRUCTURE_COUNT',
      'Persisted Product/Inventory structure has unexpected totals.',
    );
  }

  return { products: products.length, inventory: inventories.length };
}
