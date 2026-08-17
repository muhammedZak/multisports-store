export const STOCK_STATES = Object.freeze({
  OUT_OF_STOCK: 'out_of_stock',
  LOW_STOCK: 'low_stock',
  IN_STOCK: 'in_stock',
});

export const INVENTORY_ADJUSTMENT_REASONS = Object.freeze({
  INITIAL_STOCK: 'initial_stock',
  RESTOCK: 'restock',
  MANUAL_CORRECTION: 'manual_correction',
  ORDER_PURCHASE: 'order_purchase',
  ORDER_CANCELLATION: 'order_cancellation',
  REFUND_RETURN: 'refund_return',
});

export const INVENTORY_ADJUSTMENT_REASON_VALUES = Object.freeze(
  Object.values(INVENTORY_ADJUSTMENT_REASONS),
);

export const MANUAL_INVENTORY_ADJUSTMENT_REASONS = Object.freeze([
  INVENTORY_ADJUSTMENT_REASONS.RESTOCK,
  INVENTORY_ADJUSTMENT_REASONS.MANUAL_CORRECTION,
]);

export function isInventoryAdjustmentReason(value) {
  return INVENTORY_ADJUSTMENT_REASON_VALUES.includes(value);
}

export function isManualInventoryAdjustmentReason(value) {
  return MANUAL_INVENTORY_ADJUSTMENT_REASONS.includes(value);
}
