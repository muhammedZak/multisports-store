import { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import {
  addCartItem,
  addGuestCartItem,
  clearCartActionError,
} from '../../cart/cartSlice.js';

import { getCustomerCartErrorMessage } from '../product.utils.js';

export function useProductPurchase({ product, productId, selectedVariantId }) {
  const dispatch = useDispatch();

  const {
    initialized: authInitialized,

    user,
  } = useSelector((state) => state.auth);

  const {
    initialized: cartInitialized,

    actionStatus: cartActionStatus,

    actionError: cartActionError,
  } = useSelector((state) => state.cart);

  const [quantity, setQuantity] = useState('1');

  const [purchaseError, setPurchaseError] = useState(null);

  const [purchaseSuccess, setPurchaseSuccess] = useState(null);

  const isCustomer = user?.role === 'customer';

  const isCustomerCartBusy =
    isCustomer && (cartActionStatus === 'loading' || !cartInitialized);

  const customerCartErrorMessage = isCustomer
    ? getCustomerCartErrorMessage(cartActionError)
    : null;

  useEffect(() => {
    setQuantity('1');

    setPurchaseError(null);

    setPurchaseSuccess(null);

    dispatch(clearCartActionError());
  }, [dispatch, productId]);

  function clearFeedback() {
    setPurchaseError(null);

    setPurchaseSuccess(null);

    if (cartActionError) {
      dispatch(clearCartActionError());
    }
  }

  function handleQuantityChange(event) {
    setQuantity(event.target.value);

    clearFeedback();
  }

  async function addToCart() {
    clearFeedback();

    if (!product || !authInitialized) {
      return;
    }

    /*
     * Admin and any other
     * non-Customer authenticated role
     * cannot purchase.
     */
    if (user && user.role !== 'customer') {
      return;
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isSafeInteger(parsedQuantity) || parsedQuantity < 1) {
      setPurchaseError('Quantity must be a positive whole number.');

      return;
    }

    const variants = product.variants ?? [];

    /*
     * Variant products require
     * an explicit Customer selection.
     *
     * Never auto-select a Variant.
     */
    if (variants.length > 0 && !selectedVariantId) {
      setPurchaseError(
        'Choose an available option before adding this product.',
      );

      return;
    }

    const selectedVariant =
      variants.find((variant) => variant.id === selectedVariantId) ?? null;

    if (product.stockState === 'out_of_stock') {
      setPurchaseError('This product is currently out of stock.');

      return;
    }

    if (selectedVariant?.stockState === 'out_of_stock') {
      setPurchaseError(
        'The selected product option is currently out of stock.',
      );

      return;
    }

    const item = {
      productId: product.id,

      quantity: parsedQuantity,
    };

    /*
     * Simple Products omit
     * variantId completely.
     */
    if (variants.length > 0) {
      item.variantId = selectedVariantId;
    }

    /*
     * Guest Cart remains
     * Redux + localStorage.
     */
    if (!user) {
      dispatch(addGuestCartItem(item));

      setPurchaseSuccess('Added to cart.');

      return;
    }

    /*
     * Authenticated Customer Cart
     * remains backend-authoritative.
     */
    const result = await dispatch(
      addCartItem({
        customerId: user.id,

        item,
      }),
    );

    if (addCartItem.fulfilled.match(result)) {
      setPurchaseSuccess('Added to cart.');
    }
  }

  return {
    authInitialized,
    user,

    cartInitialized,
    cartActionStatus,

    quantity,

    purchaseError,
    purchaseSuccess,

    isCustomer,
    isCustomerCartBusy,

    customerCartErrorMessage,

    clearFeedback,
    handleQuantityChange,
    addToCart,
  };
}
