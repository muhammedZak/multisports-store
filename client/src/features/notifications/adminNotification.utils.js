import { ADMIN_NOTIFICATION_TYPE_VARIANTS } from './adminNotification.constants.js';

export function getAdminNotificationTypeVariant(type) {
  return ADMIN_NOTIFICATION_TYPE_VARIANTS[type] ?? 'neutral';
}

export function getAdminNotificationResourceLink(notification) {
  if (!notification.resourceId) {
    return null;
  }

  if (notification.resourceType === 'order') {
    return `/admin/orders/${notification.resourceId}`;
  }

  if (notification.resourceType === 'refund') {
    return `/admin/refunds/${notification.resourceId}`;
  }

  if (notification.resourceType === 'inventory') {
    return `/admin/inventory/${notification.resourceId}`;
  }

  if (notification.resourceType === 'support') {
    return `/admin/support/conversations/${notification.resourceId}`;
  }

  /*
   * No Admin Payment-detail
   * route currently exists.
   */
  return null;
}

export function getAdminNotificationResourceLabel(notification) {
  if (notification.resourceType === 'order') {
    return 'View Order';
  }

  if (notification.resourceType === 'refund') {
    return 'View Refund';
  }

  if (notification.resourceType === 'inventory') {
    return 'View Inventory';
  }

  if (notification.resourceType === 'support') {
    return 'Open Support';
  }

  return 'View details';
}
