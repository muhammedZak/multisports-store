export const INVENTORY_EMPTY_FILTERS = {
  q: '',
  sport: '',
  categoryId: '',
  stockState: '',
  sort: 'updatedAt',
  order: 'desc',
};

export const INVENTORY_DEFAULT_QUERY = {
  ...INVENTORY_EMPTY_FILTERS,

  page: 1,
  limit: 20,
};

export const INVENTORY_DEFAULT_META = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};

export const INVENTORY_EMPTY_ADJUSTMENT_FORM = {
  quantityChange: '',
  reason: 'restock',
  note: '',
};

export const INVENTORY_EMPTY_HISTORY_FILTERS = {
  reason: '',
  order: 'desc',
};

export const INVENTORY_DEFAULT_HISTORY_QUERY = {
  ...INVENTORY_EMPTY_HISTORY_FILTERS,

  sort: 'createdAt',

  page: 1,
  limit: 20,
};

export const INVENTORY_ADJUSTMENT_REASON_LABELS = {
  initial_stock: 'Initial stock',

  restock: 'Restock',

  manual_correction: 'Manual correction',

  order_purchase: 'Order purchase',

  order_cancellation: 'Order cancellation',

  refund_return: 'Refund return',
};
