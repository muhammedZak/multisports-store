import { env } from '../../config/env.js';

import { STOCK_STATES } from './inventory.constants.js';
import { isNonNegativeInteger } from './inventory.validation.js';

export function getStockState(quantity) {
  if (!isNonNegativeInteger(quantity)) {
    throw new TypeError(
      'Inventory quantity must be a non-negative integer before calculating stock state.',
    );
  }

  if (quantity === 0) {
    return STOCK_STATES.OUT_OF_STOCK;
  }

  if (quantity <= env.lowStockThreshold) {
    return STOCK_STATES.LOW_STOCK;
  }

  return STOCK_STATES.IN_STOCK;
}
