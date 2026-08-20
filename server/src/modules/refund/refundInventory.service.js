import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { INVENTORY_ADJUSTMENT_REASONS } from '../inventory/inventory.constants.js';
import { Inventory } from '../inventory/inventory.model.js';
import { InventoryAdjustment } from '../inventory/inventoryAdjustment.model.js';
import { Order } from '../order/order.model.js';

import {
  REFUND_ORIGINS,
  REFUND_SCOPES,
  REFUND_STATUSES,
} from './refund.constants.js';
import { Refund } from './refund.model.js';

const REFUND_ADJUSTMENT_SOURCE_TYPE = 'refund';

function throwRefundInventoryIntegrityError(message) {
  throw new AppError(
    409,
    'REFUND_INVENTORY_INTEGRITY_ERROR',
    message,
  );
}

function getInventoryFilter(item) {
  const filter = {
    productId: item.productId,
  };

  if (item.variantId) {
    filter.variantId = item.variantId;
  } else {
    filter.variantId = {
      $exists: false,
    };
  }

  return filter;
}

function resolveAffectedOrderLines(refund, order) {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    throwRefundInventoryIntegrityError(
      'The immutable Order does not contain refundable item lines.',
    );
  }

  if (refund.scope === REFUND_SCOPES.ORDER) {
    return order.items;
  }

  if (refund.scope !== REFUND_SCOPES.ITEMS) {
    throwRefundInventoryIntegrityError(
      'The refunded Customer Refund does not have a valid Order scope.',
    );
  }

  const selectedItemIds = new Set(
    (refund.itemIds ?? []).map((itemId) => itemId.toString()),
  );

  if (selectedItemIds.size === 0) {
    throwRefundInventoryIntegrityError(
      'The item Refund does not contain any immutable Order item IDs.',
    );
  }

  const affectedLines = order.items.filter((item) =>
    selectedItemIds.has(item._id.toString()),
  );

  if (affectedLines.length !== selectedItemIds.size) {
    throwRefundInventoryIntegrityError(
      'A refunded item line is missing from the immutable Order.',
    );
  }

  return affectedLines;
}

async function writeInventoryAdjustments(adjustments, session) {
  await InventoryAdjustment.create(adjustments, {
    session,
    ordered: true,
  });
}

function adjustmentMatchesExpectedEffect(adjustment, expectedEffect) {
  return (
    adjustment.quantityChange === expectedEffect.item.quantity &&
    adjustment.newQuantity - adjustment.previousQuantity ===
      expectedEffect.item.quantity
  );
}

export async function reconcileRefundInventoryRestock(
  refundId,
  {
    persistAdjustments = writeInventoryAdjustments,
  } = {},
) {
  if (!mongoose.isObjectIdOrHexString(refundId)) {
    throw new TypeError('A valid Refund ID is required for Inventory restock.');
  }

  let result = {
    result: 'not_applicable',
    adjustmentCount: 0,
  };

  await mongoose.connection.transaction(
    async (session) => {
      result = {
        result: 'not_applicable',
        adjustmentCount: 0,
      };

      const refund = await Refund.findById(refundId)
        .select(
          '_id orderId itemIds origin status scope restockOnCompletion',
        )
        .session(session)
        .lean();

      if (!refund) {
        throwRefundInventoryIntegrityError(
          'The Refund no longer exists for Inventory reconciliation.',
        );
      }

      if (
        refund.status !== REFUND_STATUSES.REFUNDED ||
        refund.origin !== REFUND_ORIGINS.CUSTOMER_REQUEST ||
        refund.restockOnCompletion !== true ||
        !refund.orderId
      ) {
        return;
      }

      const order = await Order.findById(refund.orderId)
        .select('_id items')
        .session(session)
        .lean();

      if (!order) {
        throwRefundInventoryIntegrityError(
          'The immutable Order is missing for Refund Inventory reconciliation.',
        );
      }

      const affectedLines = resolveAffectedOrderLines(refund, order);
      const expectedEffects = [];
      const seenInventoryIds = new Set();

      for (const item of affectedLines) {
        if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
          throwRefundInventoryIntegrityError(
            'An immutable Order item has an invalid complete-line quantity.',
          );
        }

        const inventory = await Inventory.findOne(getInventoryFilter(item))
          .select('_id quantity')
          .session(session)
          .lean();

        if (!inventory) {
          throwRefundInventoryIntegrityError(
            'A required Inventory position is missing for Refund restock.',
          );
        }

        const inventoryId = inventory._id.toString();

        if (seenInventoryIds.has(inventoryId)) {
          throwRefundInventoryIntegrityError(
            'Multiple refunded Order lines resolve to the same Inventory position.',
          );
        }

        seenInventoryIds.add(inventoryId);
        expectedEffects.push({
          inventory,
          item,
        });
      }

      const existingAdjustments = await InventoryAdjustment.find({
        sourceType: REFUND_ADJUSTMENT_SOURCE_TYPE,
        sourceId: refund._id,
        reason: INVENTORY_ADJUSTMENT_REASONS.REFUND_RETURN,
      })
        .select(
          'inventoryId quantityChange previousQuantity newQuantity',
        )
        .session(session)
        .lean();

      if (existingAdjustments.length > 0) {
        const expectedEffectsByInventoryId = new Map(
          expectedEffects.map((effect) => [
            effect.inventory._id.toString(),
            effect,
          ]),
        );
        const allExpectedAdjustmentsExist =
          existingAdjustments.length === expectedEffects.length &&
          existingAdjustments.every((adjustment) => {
            const expectedEffect = expectedEffectsByInventoryId.get(
              adjustment.inventoryId.toString(),
            );

            return (
              expectedEffect &&
              adjustmentMatchesExpectedEffect(adjustment, expectedEffect)
            );
          });

        if (!allExpectedAdjustmentsExist) {
          throwRefundInventoryIntegrityError(
            'Refund Inventory adjustment history is partially applied or inconsistent.',
          );
        }

        result = {
          result: 'already_reconciled',
          adjustmentCount: existingAdjustments.length,
        };
        return;
      }

      const adjustments = [];

      for (const effect of expectedEffects) {
        const updatedInventory = await Inventory.findOneAndUpdate(
          {
            _id: effect.inventory._id,
          },
          {
            $inc: {
              quantity: effect.item.quantity,
            },
          },
          {
            session,
            returnDocument: 'after',
          },
        )
          .select('_id quantity')
          .lean();

        if (!updatedInventory) {
          throwRefundInventoryIntegrityError(
            'A required Inventory position disappeared during Refund restock.',
          );
        }

        adjustments.push({
          inventoryId: updatedInventory._id,
          reason: INVENTORY_ADJUSTMENT_REASONS.REFUND_RETURN,
          quantityChange: effect.item.quantity,
          previousQuantity: updatedInventory.quantity - effect.item.quantity,
          newQuantity: updatedInventory.quantity,
          sourceType: REFUND_ADJUSTMENT_SOURCE_TYPE,
          sourceId: refund._id,
        });
      }

      await persistAdjustments(adjustments, session);

      result = {
        result: 'restocked',
        adjustmentCount: adjustments.length,
      };
    },
    {
      readPreference: 'primary',
    },
  );

  return result;
}
