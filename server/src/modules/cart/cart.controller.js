import {
  validateAddCartItemInput,
  validateCartItemId,
  validateUpdateCartItemInput,
} from './cart.validation.js';

import {
  addItemToCustomerCart,
  getResolvedCustomerCart,
  updateCustomerCartItemQuantity,
} from './cart.service.js';

export async function updateCartItemQuantityForCustomer(req, res) {
  const cartItemId = validateCartItemId(req.params.cartItemId);

  const input = validateUpdateCartItemInput(req.body);

  const cart = await updateCustomerCartItemQuantity({
    customerId: req.user.id,
    cartItemId,
    ...input,
  });

  res.status(200).json({
    success: true,

    data: {
      cart,
    },
  });
}

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
