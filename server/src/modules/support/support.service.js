import mongoose from 'mongoose';

import { User } from '../users/user.model.js';

import { AppError } from '../../utils/AppError.js';

import {
  notifyAdminsNewSupportMessage,
  notifyCustomerSupportReply,
} from '../notification/notificationEvent.service.js';

import { SUPPORT_SENDER_ROLES } from './support.constants.js';

import { SupportMessage } from './supportMessage.model.js';

import { SupportConversation } from './supportConversation.model.js';

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function throwSupportConversationNotFound() {
  throw new AppError(
    404,
    'SUPPORT_CONVERSATION_NOT_FOUND',
    'Support conversation not found.',
  );
}

function isAdminConversationUnread(conversation) {
  if (!conversation.lastMessageAt) {
    return false;
  }

  if (!conversation.adminLastReadAt) {
    return true;
  }

  return (
    new Date(conversation.lastMessageAt).getTime() >
    new Date(conversation.adminLastReadAt).getTime()
  );
}

function toAdminSupportConversationResource(conversation) {
  const customer = conversation.customerId?._id
    ? conversation.customerId
    : null;

  return {
    id: conversation._id.toString(),

    customer: customer
      ? {
          id: customer._id.toString(),
          name: customer.name,
          email: customer.email,
        }
      : null,

    customerLastReadAt: conversation.customerLastReadAt ?? null,

    adminLastReadAt: conversation.adminLastReadAt ?? null,

    lastMessageAt: conversation.lastMessageAt ?? null,

    unread: isAdminConversationUnread(conversation),

    createdAt: conversation.createdAt,

    updatedAt: conversation.updatedAt,
  };
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

export async function listAdminSupportConversations({
  page,
  limit,
  q,
  unread,
  sort,
  order,
}) {
  const filter = {};

  /*
   * q searches Customer identity first, then filters
   * Conversations by the matching Customer IDs.
   */
  if (q) {
    const escapedSearch = escapeRegularExpression(q);

    const matchingCustomerIds = await User.distinct('_id', {
      role: 'customer',

      $or: [
        {
          name: {
            $regex: escapedSearch,
            $options: 'i',
          },
        },

        {
          email: {
            $regex: escapedSearch,
            $options: 'i',
          },
        },
      ],
    });

    filter.customerId = {
      $in: matchingCustomerIds,
    };
  }

  /*
   * Admin unread:
   *
   * lastMessageAt exists
   * AND
   * adminLastReadAt is null or older.
   */
  if (unread === true) {
    filter.$and = [
      {
        lastMessageAt: {
          $ne: null,
        },
      },

      {
        $or: [
          {
            adminLastReadAt: null,
          },

          {
            $expr: {
              $lt: ['$adminLastReadAt', '$lastMessageAt'],
            },
          },
        ],
      },
    ];
  } else if (unread === false) {
    filter.$or = [
      /*
       * An empty Conversation has nothing unread.
       */
      {
        lastMessageAt: null,
      },

      /*
       * Admin marker has caught up with activity.
       */
      {
        $expr: {
          $gte: ['$adminLastReadAt', '$lastMessageAt'],
        },
      },
    ];
  }

  const direction = order === 'asc' ? 1 : -1;

  const sortDefinition = {
    [sort]: direction,

    _id: direction,
  };

  const skip = (page - 1) * limit;

  const [conversations, totalItems] = await Promise.all([
    SupportConversation.find(filter)
      .populate('customerId', '_id name email')
      .sort(sortDefinition)
      .skip(skip)
      .limit(limit)
      .lean(),

    SupportConversation.countDocuments(filter),
  ]);

  return {
    items: conversations.map(toAdminSupportConversationResource),

    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

export async function getAdminSupportConversationDetail({ conversationId }) {
  if (!mongoose.isValidObjectId(conversationId)) {
    throwSupportConversationNotFound();
  }

  const conversation = await SupportConversation.findById(conversationId)
    .populate('customerId', '_id name email')
    .lean();

  if (!conversation) {
    throwSupportConversationNotFound();
  }

  return toAdminSupportConversationResource(conversation);
}

export async function createAdminSupportMessage({
  adminId,
  conversationId,
  text,
}) {
  if (!mongoose.isValidObjectId(conversationId)) {
    throwSupportConversationNotFound();
  }

  const conversation = await SupportConversation.findById(conversationId)
    .select('_id customerId')
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

            /*
             * Never accept Admin sender identity
             * from the request body.
             */
            senderId: adminId,

            senderRole: SUPPORT_SENDER_ROLES.ADMIN,

            text,
          },
        ],
        {
          session,
        },
      );

      /*
       * Signed Admin-send rules:
       *
       * lastMessageAt      = message.createdAt
       * adminLastReadAt    = message.createdAt
       * customerLastReadAt = unchanged
       */
      const updateResult = await SupportConversation.updateOne(
        {
          _id: conversation._id,
        },
        {
          $max: {
            lastMessageAt: message.createdAt,

            adminLastReadAt: message.createdAt,
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
   * Authoritative Support state has committed.
   *
   * Notification is deliberately after commit and
   * remains a non-blocking informational side effect.
   */
  await notifyCustomerSupportReply({
    customerId: conversation.customerId,

    conversationId: conversation._id,
  });

  return messageResource;
}

export async function markAdminSupportConversationRead({ conversationId }) {
  if (!mongoose.isValidObjectId(conversationId)) {
    throwSupportConversationNotFound();
  }

  const conversation = await SupportConversation.findById(conversationId)
    .select('_id')
    .lean();

  if (!conversation) {
    throwSupportConversationNotFound();
  }

  /*
   * The read marker is based on persisted Message
   * authority, not new Date().
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

  if (latestMessage) {
    await SupportConversation.updateOne(
      {
        _id: conversation._id,
      },
      {
        /*
         * Never let a stale read request move
         * the marker backwards.
         */
        $max: {
          adminLastReadAt: latestMessage.createdAt,
        },
      },
    );
  }

  /*
   * Empty Conversations are valid.
   * Return the same Admin detail shape.
   */
  return getAdminSupportConversationDetail({
    conversationId: conversation._id,
  });
}