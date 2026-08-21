export const NOTIFICATION_TYPES = Object.freeze({
  ORDER: 'order',
  PAYMENT: 'payment',
  REFUND: 'refund',
  INVENTORY: 'inventory',
  SUPPORT: 'support',
});

export const NOTIFICATION_TYPE_VALUES = Object.freeze(
  Object.values(NOTIFICATION_TYPES),
);

export const NOTIFICATION_RESOURCE_TYPES = Object.freeze({
  ORDER: 'order',
  PAYMENT: 'payment',
  REFUND: 'refund',
  INVENTORY: 'inventory',
  SUPPORT: 'support',
});

export const NOTIFICATION_RESOURCE_TYPE_VALUES = Object.freeze(
  Object.values(NOTIFICATION_RESOURCE_TYPES),
);
