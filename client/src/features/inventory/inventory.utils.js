import { INVENTORY_ADJUSTMENT_REASON_LABELS } from './inventory.constants.js';

export const inventoryDateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export const INVENTORY_STOCK_PRESENTATION = {
  in_stock: {
    label: 'In stock',
    variant: 'success',
  },

  low_stock: {
    label: 'Low stock',
    variant: 'warning',
  },

  out_of_stock: {
    label: 'Out of stock',
    variant: 'danger',
  },
};

export function getInventoryStockPresentation(stockState) {
  return (
    INVENTORY_STOCK_PRESENTATION[stockState] ?? {
      label: stockState,
      variant: 'neutral',
    }
  );
}

export function formatInventoryVariant(variant) {
  if (!variant) {
    return 'Simple Product';
  }

  const options = Object.entries(variant.options ?? {});

  if (options.length === 0) {
    return 'Variant';
  }

  return options
    .map(([name, value]) => `${name}: ${String(value)}`)
    .join(' · ');
}

export function getAdjustmentReasonLabel(reason) {
  return INVENTORY_ADJUSTMENT_REASON_LABELS[reason] ?? reason;
}

export function formatQuantityChange(value) {
  return value > 0 ? `+${value}` : String(value);
}

export function validateInventoryAdjustment(form) {
  const fields = {};

  const quantityText = form.quantityChange.trim();

  const quantityChange = Number(quantityText);

  if (
    !quantityText ||
    !Number.isSafeInteger(quantityChange) ||
    quantityChange === 0
  ) {
    fields.quantityChange = 'Quantity change must be a non-zero integer.';
  }

  if (
    form.reason === 'restock' &&
    Number.isSafeInteger(quantityChange) &&
    quantityChange <= 0
  ) {
    fields.quantityChange = 'Restock quantity change must be greater than 0.';
  }

  const note = form.note.trim().replace(/\s+/g, ' ');

  if (form.reason === 'manual_correction' && !note) {
    fields.note = 'A note is required for a manual inventory correction.';
  }

  if (Object.keys(fields).length > 0) {
    return {
      valid: false,

      fields,
    };
  }

  return {
    valid: true,

    payload: {
      quantityChange,

      reason: form.reason,

      ...(note
        ? {
            note,
          }
        : {}),
    },
  };
}
