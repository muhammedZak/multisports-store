import mongoose from 'mongoose';

const supportConversationSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },

    customerLastReadAt: {
      type: Date,
      default: null,
    },

    adminLastReadAt: {
      type: Date,
      default: null,
    },

    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

/*
 * MVP rule:
 *
 * One Customer has exactly one persistent
 * Customer ↔ Admin Support Conversation.
 *
 * The service performs a friendly lookup first,
 * but this unique index is the final race-safe authority.
 */
supportConversationSchema.index(
  {
    customerId: 1,
  },
  {
    unique: true,
    name: 'support_conversation_customer_unique',
  },
);

export const SupportConversation = mongoose.model(
  'SupportConversation',
  supportConversationSchema,
);
