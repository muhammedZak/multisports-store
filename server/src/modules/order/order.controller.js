import {
  validateAdminOrderQuery,
  validateCustomerOrderCancellationInput,
  validateCustomerOrderQuery,
} from './order.validation.js';

import {
  cancelCustomerOrder,
  getAdminOrder,
  getAdminOrders,
  getCustomerOrder,
  getCustomerOrders,
} from './order.service.js';

export async function getOrdersForCustomer(req, res) {
  const query = validateCustomerOrderQuery(req.query);

  const result = await getCustomerOrders({
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

export async function getOrderForCustomer(req, res) {
  const order = await getCustomerOrder({
    customerId: req.user.id,

    orderId: req.params.orderId,
  });

  res.status(200).json({
    success: true,

    data: {
      order,
    },
  });
}

export async function cancelOrderForCustomer(req, res) {
  validateCustomerOrderCancellationInput(req.body);

  const order = await cancelCustomerOrder({
    customerId: req.user.id,

    orderId: req.params.orderId,
  });

  res.status(200).json({
    success: true,

    data: {
      order,
    },
  });
}

export async function getOrdersForAdmin(req, res) {
  const query = validateAdminOrderQuery(req.query);

  const result = await getAdminOrders(query);

  res.status(200).json({
    success: true,

    data: {
      items: result.items,
    },

    meta: result.meta,
  });
}

export async function getOrderForAdmin(req, res) {
  const order = await getAdminOrder(req.params.orderId);

  res.status(200).json({
    success: true,

    data: {
      order,
    },
  });
}