import {
  validateAddCartItemInput,
  validateCartItemId,
  validateMergeCartInput,
  validateUpdateCartItemInput,
} from './cart.validation.js';

import {
  addItemToCustomerCart,
  clearCustomerCart,
  getResolvedCustomerCart,
  mergeGuestCartIntoCustomerCart,
  removeItemFromCustomerCart,
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

export async function removeCartItemForCustomer(req, res) {
  const cartItemId = validateCartItemId(req.params.cartItemId);

  const cart = await removeItemFromCustomerCart({
    customerId: req.user.id,
    cartItemId,
  });

  res.status(200).json({
    success: true,

    data: {
      cart,
    },
  });
}

export async function clearCartForCustomer(req, res) {
  const cart = await clearCustomerCart(req.user.id);

  res.status(200).json({
    success: true,

    data: {
      cart,
    },
  });
}

export async function mergeGuestCartForCustomer(req, res) {
  const input = validateMergeCartInput(req.body);

  const cart = await mergeGuestCartIntoCustomerCart({
    customerId: req.user.id,
    items: input.items,
  });

  res.status(200).json({
    success: true,

    data: {
      cart,
    },
  });
}