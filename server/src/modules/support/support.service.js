import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { notifyAdminsNewSupportMessage } from '../notification/notificationEvent.service.js';

import { SUPPORT_SENDER_ROLES } from './support.constants.js';

import { SupportMessage } from './supportMessage.model.js';

import { SupportConversation } from './supportConversation.model.js';

function throwSupportConversationNotFound() {
  throw new AppError(
    404,
    'SUPPORT_CONVERSATION_NOT_FOUND',
    'Support conversation not found.',
  );
}

function toSupportMessageResource(message) {
  return {
    id: message._id.toString(),

    conversationId: message.conversationId.toString(),

    senderId: message.senderId.toString(),

    senderRole: message.senderRole,

    text: message.text,

    createdAt: message.createdAt,
  };
}

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

export async function getCustomerSupportMessages({ customerId, page, limit }) {
  /*
   * Ownership is resolved through customerId.
   *
   * The browser never supplies conversationId for
   * this Customer endpoint.
   */
  const conversation = await SupportConversation.findOne({
    customerId,
  })
    .select('_id')
    .lean();

  if (!conversation) {
    throwSupportConversationNotFound();
  }

  const skip = (page - 1) * limit;

  const [messages, totalItems] = await Promise.all([
    SupportMessage.find({
      conversationId: conversation._id,
    })
      /*
       * First fetch the newest window.
       *
       * _id gives deterministic ordering when two
       * Messages happen to share the same millisecond.
       */
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    SupportMessage.countDocuments({
      conversationId: conversation._id,
    }),
  ]);

  /*
   * REST contract:
   *
   * Page 1 = newest window.
   *
   * Inside that window:
   * oldest → newest.
   */
  const items = messages.reverse().map(toSupportMessageResource);

  return {
    items,

    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

export async function createCustomerSupportMessage({ customerId, text }) {
  const conversation = await SupportConversation.findOne({
    customerId,
  })
    .select('_id')
    .lean();

  if (!conversation) {
    throwSupportConversationNotFound();
  }

  const session = await mongoose.startSession();

  let messageResource;

  try {
    await session.withTransaction(async () => {
      const [message] = await SupportMessage.create(
        [
          {
            conversationId: conversation._id,

            senderId: customerId,

            senderRole: SUPPORT_SENDER_ROLES.CUSTOMER,

            text,
          },
        ],
        {
          session,
        },
      );

      /*
       * Customer sending a Message means:
       *
       * lastMessageAt = message.createdAt
       * customerLastReadAt = message.createdAt
       * adminLastReadAt remains unchanged
       *
       * $max also protects us from an older concurrent
       * request overwriting a newer timestamp.
       */
      const updateResult = await SupportConversation.updateOne(
        {
          _id: conversation._id,
          customerId,
        },
        {
          $max: {
            lastMessageAt: message.createdAt,
            customerLastReadAt: message.createdAt,
          },
        },
        {
          session,
        },
      );

      if (updateResult.matchedCount !== 1) {
        throwSupportConversationNotFound();
      }

      messageResource = toSupportMessageResource(message);
    });
  } finally {
    await session.endSession();
  }

  /*
   * The authoritative Support Message + Conversation
   * metadata have committed successfully before this.
   *
   * Notification remains informational/non-blocking.
   */
  await notifyAdminsNewSupportMessage({
    conversationId: conversation._id,
  });

  return messageResource;
}

export async function markCustomerSupportConversationRead({ customerId }) {
  const conversation = await SupportConversation.findOne({
    customerId,
  })
    .select(
      [
        '_id',
        'customerLastReadAt',
        'adminLastReadAt',
        'lastMessageAt',
        'createdAt',
        'updatedAt',
      ].join(' '),
    )
    .lean();

  if (!conversation) {
    throwSupportConversationNotFound();
  }

  /*
   * Important:
   *
   * Do NOT use new Date().
   *
   * The signed contract says the read marker must point
   * to the latest persisted Message timestamp at the
   * moment we determine what has been read.
   */
  const latestMessage = await SupportMessage.findOne({
    conversationId: conversation._id,
  })
    .select('createdAt')
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .lean();

  /*
   * Empty Conversation is valid.
   *
   * There is nothing to mark as read yet.
   */
  if (!latestMessage) {
    return toCustomerSupportConversationResource(conversation);
  }

  const updatedConversation = await SupportConversation.findOneAndUpdate(
    {
      _id: conversation._id,
      customerId,
    },
    {
      /*
       * Never move the read marker backwards if another
       * Customer action has already advanced it.
       */
      $max: {
        customerLastReadAt: latestMessage.createdAt,
      },
    },
    {
      new: true,
    },
  ).lean();

  if (!updatedConversation) {
    throwSupportConversationNotFound();
  }

  return toCustomerSupportConversationResource(updatedConversation);
}