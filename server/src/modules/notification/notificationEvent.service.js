import { STOCK_STATES } from '../inventory/inventory.constants.js';
import { REFUND_STATUSES } from '../refund/refund.constants.js';
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
     * Notifications remain informational.
     *
     * A Notification persistence problem must never
     * invalidate an already-successful business event.
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

export async function notifyRefundRequestCreated({ customerId, refundId }) {
  await createNotificationSafely({
    event: 'refund_requested_customer',

    context: {
      customerId: customerId?.toString() ?? null,
      refundId: refundId?.toString() ?? null,
    },

    recipientId: customerId,

    type: NOTIFICATION_TYPES.REFUND,

    title: 'Refund requested',

    message: 'Your Refund request has been submitted and is awaiting review.',

    resourceType: NOTIFICATION_RESOURCE_TYPES.REFUND,

    resourceId: refundId,
  });

  await notifyAllAdmins({
    event: 'refund_requested_admin',

    type: NOTIFICATION_TYPES.REFUND,

    title: 'New Refund request',

    message: 'A new Customer Refund request is ready for review.',

    resourceType: NOTIFICATION_RESOURCE_TYPES.REFUND,

    resourceId: refundId,
  });
}

export async function notifyCustomerRefundDecision({
  customerId,
  refundId,
  refundStatus,
}) {
  let title;
  let message;

  if (refundStatus === REFUND_STATUSES.APPROVED) {
    title = 'Refund approved';

    message = 'Your Refund request has been approved and will be processed.';
  } else if (refundStatus === REFUND_STATUSES.REJECTED) {
    title = 'Refund rejected';

    message =
      'Your Refund request was not approved. View the Refund details for more information.';
  } else {
    /*
     * This is an internal side-effect helper.
     *
     * Never let an unexpected Notification input
     * break an already-completed Refund decision.
     */
    logNotificationFailure(
      'refund_decision_notification_invalid_status',
      new Error('Unsupported Refund decision status.'),
      {
        customerId: customerId?.toString() ?? null,
        refundId: refundId?.toString() ?? null,
        refundStatus,
      },
    );

    return;
  }

  await createNotificationSafely({
    event: `refund_${refundStatus}_customer`,

    context: {
      customerId: customerId?.toString() ?? null,
      refundId: refundId?.toString() ?? null,
      refundStatus,
    },

    recipientId: customerId,

    type: NOTIFICATION_TYPES.REFUND,

    title,

    message,

    resourceType: NOTIFICATION_RESOURCE_TYPES.REFUND,

    resourceId: refundId,
  });
}

export async function notifyCustomerRefundCompleted({ customerId, refundId }) {
  await createNotificationSafely({
    event: 'refund_completed_customer',

    context: {
      customerId: customerId?.toString() ?? null,
      refundId: refundId?.toString() ?? null,
    },

    recipientId: customerId,

    type: NOTIFICATION_TYPES.REFUND,

    title: 'Refund completed',

    message: 'Your Refund has been completed successfully.',

    resourceType: NOTIFICATION_RESOURCE_TYPES.REFUND,

    resourceId: refundId,
  });
}

export async function notifyAdminsInventoryStockTransition({
  inventoryId,
  previousStockState,
  newStockState,
  newQuantity,
}) {
  /*
   * Remaining inside the same stock state does not
   * generate another alert.
   *
   * Example:
   *
   * low_stock 5 → low_stock 4
   *
   * should not spam Admins.
   */
  if (previousStockState === newStockState) {
    return;
  }

  let title;
  let message;

  if (newStockState === STOCK_STATES.LOW_STOCK) {
    title = 'Low stock';

    message = `An Inventory position is low on stock with ${newQuantity} unit${
      newQuantity === 1 ? '' : 's'
    } remaining.`;
  } else if (newStockState === STOCK_STATES.OUT_OF_STOCK) {
    title = 'Out of stock';

    message = 'An Inventory position is now out of stock.';
  } else {
    /*
     * Recovery to IN_STOCK is useful business state,
     * but it is not a signed Notification event.
     */
    return;
  }

  await notifyAllAdmins({
    event: `inventory_${newStockState}`,

    type: NOTIFICATION_TYPES.INVENTORY,

    title,

    message,

    resourceType: NOTIFICATION_RESOURCE_TYPES.INVENTORY,

    resourceId: inventoryId,
  });
}

export async function notifyAdminsNewSupportMessage({ conversationId }) {
  await notifyAllAdmins({
    event: 'support_message_customer_admin',

    type: NOTIFICATION_TYPES.SUPPORT,

    title: 'New support message',

    message: 'A Customer sent a new support message.',

    resourceType: NOTIFICATION_RESOURCE_TYPES.SUPPORT,

    /*
     * The useful Support resource is the Conversation,
     * not an individual Message.
     */
    resourceId: conversationId,
  });
}