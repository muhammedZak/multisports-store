import { NOTIFICATION_TYPE_VARIANTS } from './notification.constants.js';

export const notificationDateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatNotificationLabel(value) {
  if (!value) {
    return 'Notification';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getNotificationTypeVariant(type) {
  return NOTIFICATION_TYPE_VARIANTS[type] ?? 'neutral';
}

export function getNotificationResourceLink(notification) {
  if (!notification.resourceId) {
    return null;
  }

  if (notification.resourceType === 'order') {
    return `/account/orders/${notification.resourceId}`;
  }

  if (notification.resourceType === 'refund') {
    return `/account/refunds/${notification.resourceId}`;
  }

  if (notification.resourceType === 'support') {
    /*
     * A Customer owns one
     * persistent Support
     * Conversation.
     */
    return '/account/support';
  }

  /*
   * There is currently no
   * Customer Payment-detail
   * route.
   */
  return null;
}

export function getNotificationResourceLabel(notification) {
  if (notification.resourceType === 'order') {
    return 'View Order';
  }

  if (notification.resourceType === 'refund') {
    return 'View Refund';
  }

  if (notification.resourceType === 'support') {
    return 'Open Support';
  }

  return 'View details';
}
