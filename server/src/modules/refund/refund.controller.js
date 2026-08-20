import {
  validateAdminRefundDecisionInput,
  validateAdminRefundQuery,
  validateCustomerRefundQuery,
  validateCustomerRefundRequestInput,
} from './refund.validation.js';

import {
  createCustomerRefundRequest,
  decideAdminRefund,
  getAdminRefund,
  getAdminRefunds,
  getCustomerRefund,
  getCustomerRefunds,
} from './refund.service.js';

export async function createRefundForCustomer(req, res) {
  const input = validateCustomerRefundRequestInput(req.body);

  const refund = await createCustomerRefundRequest({
    customerId: req.user.id,
    orderId: req.params.orderId,
    scope: input.scope,
    orderItemIds: input.orderItemIds,
    reason: input.reason,
    explanation: input.explanation,
  });

  res.status(201).json({
    success: true,
    data: {
      refund,
    },
  });
}

export async function getRefundsForCustomer(req, res) {
  const query = validateCustomerRefundQuery(req.query);

  const result = await getCustomerRefunds({
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

export async function getRefundForCustomer(req, res) {
  const refund = await getCustomerRefund({
    customerId: req.user.id,
    refundId: req.params.refundId,
  });

  res.status(200).json({
    success: true,
    data: {
      refund,
    },
  });
}

export async function getRefundsForAdmin(req, res) {
  const query = validateAdminRefundQuery(req.query);
  const result = await getAdminRefunds(query);

  res.status(200).json({
    success: true,
    data: {
      items: result.items,
    },
    meta: result.meta,
  });
}

export async function getRefundForAdmin(req, res) {
  const refund = await getAdminRefund(req.params.refundId);

  res.status(200).json({
    success: true,
    data: {
      refund,
    },
  });
}

export async function decideRefundForAdmin(req, res) {
  const input = validateAdminRefundDecisionInput(req.body);
  const refund = await decideAdminRefund({
    refundId: req.params.refundId,
    adminId: req.user.id,
    ...input,
  });

  res.status(200).json({
    success: true,
    data: {
      refund,
    },
  });
}
