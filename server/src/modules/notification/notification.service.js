import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { User } from '../users/user.model.js';

import {
  NOTIFICATION_RESOURCE_TYPE_VALUES,
  NOTIFICATION_TYPE_VALUES,
} from './notification.constants.js';

import { Notification } from './notification.model.js';

function throwValidationError(fields) {
  throw new AppError(
    422,
    'VALIDATION_ERROR',
    'Please correct the invalid fields.',
    fields,
  );
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
