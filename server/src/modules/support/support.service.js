import { SupportConversation } from './supportConversation.model.js';

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

function toCustomerSupportConversationResource(conversation) {
  if (!conversation?._id) {
    return null;
  }

  return {
    id: conversation._id.toString(),

    customerLastReadAt: conversation.customerLastReadAt ?? null,

    adminLastReadAt: conversation.adminLastReadAt ?? null,

    lastMessageAt: conversation.lastMessageAt ?? null,

    createdAt: conversation.createdAt,

    updatedAt: conversation.updatedAt,
  };
}

export async function getCustomerSupportConversation({ customerId }) {
  const conversation = await SupportConversation.findOne({
    customerId,
  }).lean();

  return toCustomerSupportConversationResource(conversation);
}

export async function createOrReuseCustomerSupportConversation({ customerId }) {
  /*
   * Normal path:
   *
   * If the Customer already has their one persistent
   * Conversation, simply reuse it.
   */
  const existingConversation = await SupportConversation.findOne({
    customerId,
  }).lean();

  if (existingConversation) {
    return {
      conversation: toCustomerSupportConversationResource(existingConversation),

      created: false,
    };
  }

  try {
    const conversation = await SupportConversation.create({
      customerId,

      customerLastReadAt: null,

      adminLastReadAt: null,

      lastMessageAt: null,
    });

    return {
      conversation: toCustomerSupportConversationResource(conversation),

      created: true,
    };
  } catch (error) {
    /*
     * Two POST requests can race:
     *
     * Request A:
     * find → none
     *
     * Request B:
     * find → none
     *
     * A creates Conversation.
     * B attempts create and loses against the unique index.
     *
     * Losing the race is NOT an application error because
     * POST /support/conversation is create-or-reuse.
     *
     * Fetch the Conversation created by the winner and reuse it.
     */
    if (isDuplicateKeyError(error)) {
      const conversation = await SupportConversation.findOne({
        customerId,
      }).lean();

      if (conversation) {
        return {
          conversation: toCustomerSupportConversationResource(conversation),

          created: false,
        };
      }
    }

    throw error;
  }
}
