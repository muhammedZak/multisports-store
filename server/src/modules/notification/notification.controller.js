import {
  validateNotificationListQuery,
  validateNotificationReadInput,
} from './notification.validation.js';

import {
  getNotificationsForRecipient,
  markNotificationReadForRecipient,
} from './notification.service.js';

export async function getNotifications(req, res) {
  const query = validateNotificationListQuery(req.query);

  const result = await getNotificationsForRecipient({
    /*
     * req.user exists only after requireAuth.
     *
     * Its identity was resolved from the
     * authenticated server-side session.
     */
    recipientId: req.user.id,

    ...query,
  });

  res.status(200).json({
    success: true,

    data: {
      items: result.items,

      unreadCount: result.unreadCount,
    },

    meta: result.meta,
  });
}

export async function markNotificationRead(req, res) {
  validateNotificationReadInput(req.body);

  const notification = await markNotificationReadForRecipient({
    recipientId: req.user.id,

    notificationId: req.params.notificationId,
  });

  res.status(200).json({
    success: true,

    data: {
      notification,
    },
  });
}
