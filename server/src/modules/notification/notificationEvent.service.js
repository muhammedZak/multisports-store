import { User } from '../users/user.model.js';

import {
  NOTIFICATION_RESOURCE_TYPES,
  NOTIFICATION_TYPES,
} from './notification.constants.js';

import { createNotification } from './notification.service.js';

function logNotificationFailure(event, error, context = {}) {
  console.error('Notification side effect failed:', {
    event,
    ...context,
    message: error?.message ?? null,
  });
}

async function createNotificationSafely({
  event,
  context,
  ...notificationInput
}) {
  try {
    return await createNotification(notificationInput);
  } catch (error) {
    /*
     * Notifications are informational.
     *
     * A Notification persistence problem must not
     * invalidate an already-successful Payment,
     * Order placement, or fulfillment transition.
     */
    logNotificationFailure(event, error, context);

    return null;
  }
}

async function notifyAllAdmins({
  event,
  type,
  title,
  message,
  resourceType,
  resourceId,
}) {
  let admins;

  try {
    /*
     * Notifications are recipient-specific.
     *
     * There is no shared Admin-inbox model, so an
     * Admin business event fans out to every current
     * User whose role is admin.
     */
    admins = await User.find({
      role: 'admin',
    })
      .select('_id')
      .lean();
  } catch (error) {
    logNotificationFailure(event, error, {
      resourceId: resourceId?.toString() ?? null,
    });

    return;
  }

  for (const admin of admins) {
    await createNotificationSafely({
      event,

      context: {
        adminId: admin._id.toString(),
        resourceId: resourceId?.toString() ?? null,
      },

      recipientId: admin._id,

      type,

      title,

      message,

      resourceType,

      resourceId,
    });
  }
}

export async function notifyCustomerPaymentSucceeded({
  customerId,
  paymentId,
}) {
  await createNotificationSafely({
    event: 'payment_succeeded',

    context: {
      customerId: customerId?.toString() ?? null,
      paymentId: paymentId?.toString() ?? null,
    },

    recipientId: customerId,

    type: NOTIFICATION_TYPES.PAYMENT,

    title: 'Payment successful',

    message: 'Your payment was completed successfully.',

    resourceType: NOTIFICATION_RESOURCE_TYPES.PAYMENT,

    resourceId: paymentId,
  });
}

export async function notifyOrderPlaced({ customerId, orderId, orderNumber }) {
  await createNotificationSafely({
    event: 'order_placed_customer',

    context: {
      customerId: customerId?.toString() ?? null,
      orderId: orderId?.toString() ?? null,
    },

    recipientId: customerId,

    type: NOTIFICATION_TYPES.ORDER,

    title: 'Order placed',

    message: `Your order ${orderNumber} has been placed successfully.`,

    resourceType: NOTIFICATION_RESOURCE_TYPES.ORDER,

    resourceId: orderId,
  });

  await notifyAllAdmins({
    event: 'new_order_admin',

    type: NOTIFICATION_TYPES.ORDER,

    title: 'New order',

    message: `Order ${orderNumber} has been placed and is ready for review.`,

    resourceType: NOTIFICATION_RESOURCE_TYPES.ORDER,

    resourceId: orderId,
  });
}

export async function notifyCustomerOrderStatusChanged({
  customerId,
  orderId,
  orderNumber,
  orderStatus,
}) {
  await createNotificationSafely({
    event: 'order_status_changed',

    context: {
      customerId: customerId?.toString() ?? null,
      orderId: orderId?.toString() ?? null,
      orderStatus,
    },

    recipientId: customerId,

    type: NOTIFICATION_TYPES.ORDER,

    title: 'Order status updated',

    message: `Order ${orderNumber} is now ${orderStatus}.`,

    resourceType: NOTIFICATION_RESOURCE_TYPES.ORDER,

    resourceId: orderId,
  });
}
