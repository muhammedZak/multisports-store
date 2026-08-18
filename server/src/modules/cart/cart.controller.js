import { validateAddCartItemInput } from './cart.validation.js';

import {
  addItemToCustomerCart,
  getResolvedCustomerCart,
} from './cart.service.js';

export async function getCartForCustomer(req, res) {
  const cart = await getResolvedCustomerCart(req.user.id);

  res.status(200).json({
    success: true,

    data: {
      cart,
    },
  });
}

export async function addCartItemForCustomer(req, res) {
  const input = validateAddCartItemInput(req.body);

  const cart = await addItemToCustomerCart({
    customerId: req.user.id,

    ...input,
  });

  res.status(200).json({
    success: true,

    data: {
      cart,
    },
  });
}
