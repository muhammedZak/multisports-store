import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { User } from '../users/user.model.js';

import {
  NOTIFICATION_READ_STATUSES,
  NOTIFICATION_RESOURCE_TYPE_VALUES,
  NOTIFICATION_TYPE_VALUES,
} from './notification.constants.js';

import { Notification } from './notification.model.js';

const NOTIFICATION_PUBLIC_FIELDS = [
  'type',
  'title',
  'message',
  'resourceType',
  'resourceId',
  'readAt',
  'createdAt',
  'updatedAt',
].join(' ');

function throwValidationError(fields) {
  throw new AppError(
    422,
    'VALIDATION_ERROR',
    'Please correct the invalid fields.',
    fields,
  );
}

function throwNotificationNotFound() {
  throw new AppError(404, 'NOT_FOUND', 'Notification not found.');
}

function isObjectIdValue(value) {
  return (
    value instanceof mongoose.Types.ObjectId ||
    (typeof value === 'string' && mongoose.isValidObjectId(value))
  );
}

function getRecipientId(value) {
  if (!isObjectIdValue(value)) {
    throwValidationError({
      recipientId: 'Notification recipient ID is invalid.',
    });
  }

  return value;
}

function getNotificationType(value) {
  if (typeof value !== 'string' || !NOTIFICATION_TYPE_VALUES.includes(value)) {
    throwValidationError({
      type: 'Notification type is invalid.',
    });
  }

  return value;
}

function getRequiredText(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throwValidationError({
      [fieldName]: `${fieldName} is required.`,
    });
  }

  return value.trim();
}

function getOptionalResourceType(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (
    typeof value !== 'string' ||
    !NOTIFICATION_RESOURCE_TYPE_VALUES.includes(value)
  ) {
    throwValidationError({
      resourceType: 'Notification resource type is invalid.',
    });
  }

  return value;
}

function getOptionalResourceId(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (!isObjectIdValue(value)) {
    throwValidationError({
      resourceId: 'Notification resource ID is invalid.',
    });
  }

  return value;
}

async function ensureRecipientExists(recipientId) {
  const recipientExists = await User.exists({
    _id: recipientId,
  });

  if (!recipientExists) {
    throw new AppError(
      404,
      'NOTIFICATION_RECIPIENT_NOT_FOUND',
      'Notification recipient not found.',
    );
  }
}

function toNotificationResource(notification) {
  return {
    id: notification._id.toString(),

    type: notification.type,

    title: notification.title,

    message: notification.message,

    resourceType: notification.resourceType ?? null,

    resourceId: notification.resourceId
      ? notification.resourceId.toString()
      : null,

    readAt: notification.readAt ?? null,

    createdAt: notification.createdAt,

    updatedAt: notification.updatedAt,
  };
}

export async function createNotification({
  recipientId,
  type,
  title,
  message,
  resourceType,
  resourceId,
}) {
  const normalizedRecipientId = getRecipientId(recipientId);
  const normalizedType = getNotificationType(type);
  const normalizedTitle = getRequiredText(title, 'title');
  const normalizedMessage = getRequiredText(message, 'message');
  const normalizedResourceType = getOptionalResourceType(resourceType);
  const normalizedResourceId = getOptionalResourceId(resourceId);

  await ensureRecipientExists(normalizedRecipientId);

  return Notification.create({
    recipientId: normalizedRecipientId,
    type: normalizedType,
    title: normalizedTitle,
    message: normalizedMessage,
    resourceType: normalizedResourceType,
    resourceId: normalizedResourceId,

    // Every new Notification starts unread.
    readAt: null,
  });
}

export async function getNotificationsForRecipient({
  recipientId,
  page,
  limit,
  type,
  readStatus,
}) {
  const filter = {
    recipientId,
  };

  if (type) {
    filter.type = type;
  }

  if (readStatus === NOTIFICATION_READ_STATUSES.UNREAD) {
    filter.readAt = null;
  }

  if (readStatus === NOTIFICATION_READ_STATUSES.READ) {
    filter.readAt = {
      $ne: null,
    };
  }

  const skip = (page - 1) * limit;

  const [notifications, totalItems, unreadCount] = await Promise.all([
    Notification.find(filter)
      .select(NOTIFICATION_PUBLIC_FIELDS)
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    Notification.countDocuments(filter),

    /*
     * IMPORTANT:
     *
     * unreadCount intentionally ignores:
     *
     * - page
     * - limit
     * - type
     * - readStatus
     *
     * It always represents ALL unread Notifications
     * owned by the current recipient.
     */
    Notification.countDocuments({
      recipientId,
      readAt: null,
    }),
  ]);

  return {
    items: notifications.map(toNotificationResource),

    unreadCount,

    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

export async function markNotificationReadForRecipient({
  recipientId,
  notificationId,
}) {
  if (!mongoose.isValidObjectId(notificationId)) {
    throwNotificationNotFound();
  }

  /*
   * First attempt:
   *
   * Only an unread Notification owned by this
   * recipient may receive a new readAt.
   *
   * This makes the first successful update
   * the authority for the original read time.
   */
  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipientId,
      readAt: null,
    },
    {
      $set: {
        readAt: new Date(),
      },
    },
    {
      new: true,
    },
  )
    .select(NOTIFICATION_PUBLIC_FIELDS)
    .lean();

  if (notification) {
    return toNotificationResource(notification);
  }

  /*
   * The update can return null for two reasons:
   *
   * 1. Notification does not belong to this recipient.
   * 2. Notification was already read.
   *
   * Check ownership without changing readAt.
   */
  const existingNotification = await Notification.findOne({
    _id: notificationId,
    recipientId,
  })
    .select(NOTIFICATION_PUBLIC_FIELDS)
    .lean();

  if (!existingNotification) {
    throwNotificationNotFound();
  }

  /*
   * Already read.
   *
   * Return it unchanged so repeated PATCH requests
   * are idempotent and preserve the original readAt.
   */
  return toNotificationResource(existingNotification);
}
