import {
  validateSupportConversationCreateInput,
  validateSupportConversationQuery,
} from './support.validation.js';

import {
  createOrReuseCustomerSupportConversation,
  getCustomerSupportConversation,
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
