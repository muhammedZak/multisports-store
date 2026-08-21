import mongoose from 'mongoose';

import {
  SUPPORT_MESSAGE_TEXT_MAX_LENGTH,
  SUPPORT_SENDER_ROLES,
} from './support.constants.js';

const supportMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportConversation',
      required: true,
      immutable: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },

    senderRole: {
      type: String,
      enum: Object.values(SUPPORT_SENDER_ROLES),
      required: true,
      immutable: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: SUPPORT_MESSAGE_TEXT_MAX_LENGTH,
      immutable: true,
    },
  },
  {
    /*
     * The signed SupportMessage model needs createdAt,
     * but no editable-message updatedAt authority exists.
     */
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

/*
 * Primary chat-history query:
 *
 * conversationId
 * → newest message window
 *
 * The API reverses each fetched page before returning it
 * so the browser receives oldest → newest within that page.
 */
supportMessageSchema.index(
  {
    conversationId: 1,
    createdAt: -1,
  },
  {
    name: 'support_message_conversation_history',
  },
);

export const SupportMessage = mongoose.model(
  'SupportMessage',
  supportMessageSchema,
);
