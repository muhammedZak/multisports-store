import mongoose from 'mongoose';

import {
  NOTIFICATION_RESOURCE_TYPE_VALUES,
  NOTIFICATION_TYPE_VALUES,
} from './notification.constants.js';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    type: {
      type: String,
      enum: NOTIFICATION_TYPE_VALUES,
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    resourceType: {
      type: String,
      enum: NOTIFICATION_RESOURCE_TYPE_VALUES,
      default: null,
    },

    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index(
  {
    recipientId: 1,
    createdAt: -1,
  },
  {
    name: 'notification_recipient_history',
  },
);

notificationSchema.index(
  {
    recipientId: 1,
    readAt: 1,
    createdAt: -1,
  },
  {
    name: 'notification_recipient_read_history',
  },
);

export const Notification = mongoose.model('Notification', notificationSchema);
