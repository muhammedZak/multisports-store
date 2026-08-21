import {
  validateAdminSupportConversationListQuery,
  validateSupportConversationCreateInput,
  validateSupportConversationQuery,
  validateSupportConversationReadInput,
  validateSupportMessageCreateInput,
  validateSupportMessageListQuery,
} from './support.validation.js';

import {
  createAdminSupportMessage,
  createCustomerSupportMessage,
  createOrReuseCustomerSupportConversation,
  getAdminSupportConversationDetail,
  getAdminSupportConversationMessages,
  getCustomerSupportConversation,
  getCustomerSupportMessages,
  listAdminSupportConversations,
  markAdminSupportConversationRead,
  markCustomerSupportConversationRead,
} from './support.service.js';

export async function createSupportConversation(req, res) {
  validateSupportConversationCreateInput(req.body);

  validateSupportConversationQuery(req.query);

  /*
   * Never accept customerId from the browser.
   *
   * req.user was loaded from the authenticated
   * server-side session by requireAuth.
   */
  const result = await createOrReuseCustomerSupportConversation({
    customerId: req.user.id,
  });

  res.status(result.created ? 201 : 200).json({
    success: true,

    data: {
      conversation: result.conversation,
    },
  });
}

export async function getSupportConversation(req, res) {
  validateSupportConversationQuery(req.query);

  const conversation = await getCustomerSupportConversation({
    customerId: req.user.id,
  });

  /*
   * Never-started support is a normal Customer
   * account state, not a 404.
   */
  res.status(200).json({
    success: true,

    data: {
      conversation,
    },
  });
}

export async function getSupportMessages(req, res) {
  const query = validateSupportMessageListQuery(req.query);

  const result = await getCustomerSupportMessages({
    customerId: req.user.id,

    ...query,
  });

  res.status(200).json({
    success: true,

    data: {
      items: result.items,
    },

    meta: result.meta,
  });
}

export async function sendSupportMessage(req, res) {
  validateSupportConversationQuery(req.query);

  const input = validateSupportMessageCreateInput(req.body);

  const message = await createCustomerSupportMessage({
    customerId: req.user.id,

    text: input.text,
  });

  res.status(201).json({
    success: true,

    data: {
      message,
    },
  });
}

export async function markSupportConversationRead(req, res) {
  validateSupportConversationQuery(req.query);

  validateSupportConversationReadInput(req.body);

  const conversation = await markCustomerSupportConversationRead({
    customerId: req.user.id,
  });

  res.status(200).json({
    success: true,

    data: {
      conversation,
    },
  });
}

export async function getAdminSupportConversations(req, res) {
  const query = validateAdminSupportConversationListQuery(req.query);

  const result = await listAdminSupportConversations(query);

  res.status(200).json({
    success: true,

    data: {
      items: result.items,
    },

    meta: result.meta,
  });
}

export async function getAdminSupportConversation(req, res) {
  validateSupportConversationQuery(req.query);

  const conversation = await getAdminSupportConversationDetail({
    conversationId: req.params.conversationId,
  });

  res.status(200).json({
    success: true,

    data: {
      conversation,
    },
  });
}

export async function getAdminSupportMessages(req, res) {
  const query = validateSupportMessageListQuery(req.query);

  const result = await getAdminSupportConversationMessages({
    conversationId: req.params.conversationId,

    ...query,
  });

  res.status(200).json({
    success: true,

    data: {
      items: result.items,
    },

    meta: result.meta,
  });
}

export async function sendAdminSupportMessage(req, res) {
  validateSupportConversationQuery(req.query);

  const input = validateSupportMessageCreateInput(req.body);

  const message = await createAdminSupportMessage({
    /*
     * Admin identity comes from the authenticated
     * server-side session.
     */
    adminId: req.user.id,

    conversationId: req.params.conversationId,

    text: input.text,
  });

  res.status(201).json({
    success: true,

    data: {
      message,
    },
  });
}

export async function markAdminSupportRead(req, res) {
  validateSupportConversationQuery(req.query);

  validateSupportConversationReadInput(req.body);

  const conversation = await markAdminSupportConversationRead({
    conversationId: req.params.conversationId,
  });

  res.status(200).json({
    success: true,

    data: {
      conversation,
    },
  });
}