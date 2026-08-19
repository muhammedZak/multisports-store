import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  addCustomerCartItem,
  applyCustomerCartCoupon,
  clearCustomerCart,
  fetchCustomerCart,
  mergeCustomerCart,
  removeCustomerCartCoupon,
  removeCustomerCartItem,
  updateCustomerCartItemQuantity,
} from '../../api/cartApi.js';

import { normalizeApiError } from '../../api/errors.js';

import {
  loadGuestCartItems,
  sanitizeGuestCartItem,
} from './guestCartStorage.js';

const CUSTOMER_CART_REVALIDATION_ERROR_CODES = new Set([
  'OUT_OF_STOCK',
  'CART_ITEM_UNAVAILABLE',
  'CART_ITEM_NOT_FOUND',
  'PRODUCT_NOT_FOUND',
  'VARIANT_NOT_FOUND',
  'VARIANT_REQUIRED',
  'INVENTORY_NOT_FOUND',
  'INVENTORY_MODE_CONFLICT',
]);

function shouldRevalidateCustomerCart(error) {
  if (!error) {
    return false;
  }

  if (CUSTOMER_CART_REVALIDATION_ERROR_CODES.has(error.code)) {
    return true;
  }

  // A Product changing from Variant → simple can surface as
  // VALIDATION_ERROR on the persisted stale variant identity.
  return error.code === 'VALIDATION_ERROR' && Boolean(error.fields?.variantId);
}

function createEmptyCart() {
  return {
    id: null,

    items: [],

    coupon: null,

    pricing: {
      subtotal: 0,
      discountAmount: 0,
      totalAmount: 0,
    },

    issues: [],

    warnings: [],

    canCheckout: false,
  };
}

function createAuthenticatedCartState() {
  return {
    cart: createEmptyCart(),

    ownerId: null,

    initialized: false,

    loadStatus: 'idle',
    actionStatus: 'idle',

    loadError: null,
    actionError: null,

    loadRequestId: null,
    actionRequestId: null,

    revalidationStatus: 'idle',
    revalidationError: null,
    revalidationRequestId: null,

    actionItemId: null,
    actionOperation: null,

    mergeStatus: 'idle',
    mergeError: null,
    mergeRequestId: null,
  };
}

function createInitialState() {
  return {
    ...createAuthenticatedCartState(),

    guestItems: loadGuestCartItems(),
  };
}

const initialState = createInitialState();

export const loadCustomerCart = createAsyncThunk(
  'cart/loadCustomerCart',

  async (customerId, { rejectWithValue }) => {
    try {
      const cart = await fetchCustomerCart();

      return {
        customerId,
        cart,
      };
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(error, 'Unable to load your cart.'),
      );
    }
  },

  {
    condition: (customerId, { getState }) => {
      if (!customerId) {
        return false;
      }

      const { cart } = getState();

      if (
        cart.ownerId === customerId &&
        (cart.loadStatus === 'loading' || cart.loadStatus === 'succeeded')
      ) {
        return false;
      }

      return true;
    },
  },
);

export const revalidateCustomerCart = createAsyncThunk(
  'cart/revalidateCustomerCart',

  async (customerId, { rejectWithValue }) => {
    try {
      const cart = await fetchCustomerCart();

      return {
        customerId,
        cart,
      };
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(
          error,
          'Unable to refresh current cart pricing and availability.',
        ),
      );
    }
  },

  {
    condition: (customerId, { getState }) => {
      const state = getState();

      return (
        Boolean(customerId) &&
        state.auth.user?.id === customerId &&
        state.auth.user?.role === 'customer' &&
        state.cart.ownerId === customerId &&
        state.cart.initialized &&
        state.cart.loadStatus !== 'loading' &&
        state.cart.mergeStatus !== 'loading' &&
        state.cart.revalidationStatus !== 'loading'
      );
    },
  },
);

export const mergeGuestCart = createAsyncThunk(
  'cart/mergeGuestCart',

  async ({ customerId, items }, { rejectWithValue }) => {
    try {
      const cart = await mergeCustomerCart({
        items,
      });

      return {
        customerId,
        cart,
      };
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(error, 'Unable to merge your Guest Cart.'),
      );
    }
  },

  {
    condition: ({ customerId, items }, { getState }) => {
      const state = getState();

      return (
        Boolean(customerId) &&
        Array.isArray(items) &&
        items.length > 0 &&
        state.auth.user?.id === customerId &&
        state.auth.user?.role === 'customer' &&
        state.cart.mergeStatus === 'idle'
      );
    },
  },
);

export const addCartItem = createAsyncThunk(
  'cart/addCartItem',

  async ({ customerId, item }, { rejectWithValue }) => {
    try {
      const cart = await addCustomerCartItem(item);

      return {
        customerId,
        cart,
      };
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(error, 'Unable to add this item to your cart.'),
      );
    }
  },

  {
    condition: ({ customerId }, { getState }) => {
      const state = getState();

      return (
        Boolean(customerId) &&
        state.auth.user?.id === customerId &&
        state.auth.user?.role === 'customer' &&
        state.cart.actionStatus !== 'loading'
      );
    },
  },
);

export const updateCartItemQuantity = createAsyncThunk(
  'cart/updateCartItemQuantity',

  async (
    { customerId, cartItemId, quantity },
    { dispatch, rejectWithValue },
  ) => {
    try {
      const cart = await updateCustomerCartItemQuantity(cartItemId, {
        quantity,
      });

      return {
        customerId,
        cartItemId,
        cart,
      };
    } catch (error) {
      const normalizedError = normalizeApiError(
        error,
        'Unable to update this cart quantity.',
      );

      if (shouldRevalidateCustomerCart(normalizedError)) {
        dispatch(revalidateCustomerCart(customerId));
      }

      return rejectWithValue(normalizedError);
    }
  },

  {
    condition: ({ customerId, cartItemId, quantity }, { getState }) => {
      const state = getState();

      return (
        Boolean(customerId) &&
        Boolean(cartItemId) &&
        Number.isSafeInteger(quantity) &&
        quantity > 0 &&
        state.auth.user?.id === customerId &&
        state.auth.user?.role === 'customer' &&
        state.cart.actionStatus !== 'loading'
      );
    },
  },
);

export const removeCartItem = createAsyncThunk(
  'cart/removeCartItem',

  async ({ customerId, cartItemId }, { dispatch, rejectWithValue }) => {
    try {
      const cart = await removeCustomerCartItem(cartItemId);

      return {
        customerId,
        cartItemId,
        cart,
      };
    } catch (error) {
      const normalizedError = normalizeApiError(
        error,
        'Unable to remove this item from your cart.',
      );

      if (shouldRevalidateCustomerCart(normalizedError)) {
        dispatch(revalidateCustomerCart(customerId));
      }

      return rejectWithValue(normalizedError);
    }
  },

  {
    condition: ({ customerId, cartItemId }, { getState }) => {
      const state = getState();

      return (
        Boolean(customerId) &&
        Boolean(cartItemId) &&
        state.auth.user?.id === customerId &&
        state.auth.user?.role === 'customer' &&
        state.cart.actionStatus !== 'loading'
      );
    },
  },
);

export const applyCartCoupon = createAsyncThunk(
  'cart/applyCartCoupon',

  async ({ customerId, code }, { rejectWithValue }) => {
    try {
      const cart = await applyCustomerCartCoupon({
        code,
      });

      return {
        customerId,
        cart,
      };
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(error, 'Unable to apply this Coupon.'),
      );
    }
  },

  {
    condition: ({ customerId, code }, { getState }) => {
      const state = getState();

      return (
        Boolean(customerId) &&
        typeof code === 'string' &&
        Boolean(code.trim()) &&
        state.auth.user?.id === customerId &&
        state.auth.user?.role === 'customer' &&
        state.cart.ownerId === customerId &&
        state.cart.initialized &&
        state.cart.actionStatus !== 'loading' &&
        state.cart.mergeStatus !== 'loading' &&
        state.cart.revalidationStatus !== 'loading'
      );
    },
  },
);

export const removeCartCoupon = createAsyncThunk(
  'cart/removeCartCoupon',

  async (customerId, { rejectWithValue }) => {
    try {
      const cart = await removeCustomerCartCoupon();

      return {
        customerId,
        cart,
      };
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(error, 'Unable to remove this Coupon.'),
      );
    }
  },

  {
    condition: (customerId, { getState }) => {
      const state = getState();

      return (
        Boolean(customerId) &&
        state.auth.user?.id === customerId &&
        state.auth.user?.role === 'customer' &&
        state.cart.ownerId === customerId &&
        state.cart.initialized &&
        state.cart.actionStatus !== 'loading' &&
        state.cart.mergeStatus !== 'loading' &&
        state.cart.revalidationStatus !== 'loading'
      );
    },
  },
);

export const clearCart = createAsyncThunk(
  'cart/clearCart',

  async (customerId, { rejectWithValue }) => {
    try {
      const cart = await clearCustomerCart();

      return {
        customerId,
        cart,
      };
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(error, 'Unable to clear your cart.'),
      );
    }
  },

  {
    condition: (customerId, { getState }) => {
      const state = getState();

      return (
        Boolean(customerId) &&
        state.auth.user?.id === customerId &&
        state.auth.user?.role === 'customer' &&
        state.cart.actionStatus !== 'loading'
      );
    },
  },
);

const cartSlice = createSlice({
  name: 'cart',

  initialState,

  reducers: {
    addGuestCartItem(state, action) {
      const incomingItem = sanitizeGuestCartItem(action.payload);

      if (!incomingItem) {
        return;
      }

      const existingItem = state.guestItems.find(
        (item) =>
          item.productId === incomingItem.productId &&
          (item.variantId ?? null) === (incomingItem.variantId ?? null),
      );

      if (existingItem) {
        const mergedQuantity = existingItem.quantity + incomingItem.quantity;

        if (!Number.isSafeInteger(mergedQuantity)) {
          return;
        }

        existingItem.quantity = mergedQuantity;

        return;
      }

      state.guestItems.push(incomingItem);
    },

    updateGuestCartItemQuantity(state, action) {
      const incomingItem = sanitizeGuestCartItem(action.payload);

      if (!incomingItem) {
        return;
      }

      const existingItem = state.guestItems.find(
        (item) =>
          item.productId === incomingItem.productId &&
          (item.variantId ?? null) === (incomingItem.variantId ?? null),
      );

      if (!existingItem) {
        return;
      }

      existingItem.quantity = incomingItem.quantity;
    },

    removeGuestCartItem(state, action) {
      const identity = sanitizeGuestCartItem({
        ...action.payload,
        quantity: 1,
      });

      if (!identity) {
        return;
      }

      state.guestItems = state.guestItems.filter(
        (item) =>
          !(
            item.productId === identity.productId &&
            (item.variantId ?? null) === (identity.variantId ?? null)
          ),
      );
    },

    clearGuestCart(state) {
      state.guestItems = [];
    },

    clearAuthenticatedCart(state) {
      /*
       * Reset only the backend-authoritative Customer Cart.
       * Guest Cart must survive login/logout/session transitions until
       * Task 6.5 explicitly performs Guest → Customer Cart merge.
       */
      const guestItems = state.guestItems;

      Object.assign(state, createAuthenticatedCartState());

      state.guestItems = guestItems;
    },

    clearCartActionError(state) {
      state.actionError = null;
      state.actionItemId = null;
      state.actionOperation = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loadCustomerCart.pending, (state, action) => {
        state.ownerId = action.meta.arg;

        state.loadStatus = 'loading';
        state.loadError = null;

        state.loadRequestId = action.meta.requestId;
      })

      .addCase(loadCustomerCart.fulfilled, (state, action) => {
        if (
          state.loadRequestId !== action.meta.requestId ||
          state.ownerId !== action.payload.customerId
        ) {
          return;
        }

        state.cart = action.payload.cart;

        state.initialized = true;

        state.loadStatus = 'succeeded';
        state.loadError = null;

        state.loadRequestId = null;
      })

      .addCase(loadCustomerCart.rejected, (state, action) => {
        if (state.loadRequestId !== action.meta.requestId) {
          return;
        }

        state.initialized = true;

        state.loadStatus = 'failed';
        state.loadError = action.payload;

        state.loadRequestId = null;
      })

      .addCase(revalidateCustomerCart.pending, (state, action) => {
        state.revalidationStatus = 'loading';
        state.revalidationError = null;
        state.revalidationRequestId = action.meta.requestId;
      })

      .addCase(revalidateCustomerCart.fulfilled, (state, action) => {
        if (
          state.revalidationRequestId !== action.meta.requestId ||
          state.ownerId !== action.payload.customerId
        ) {
          return;
        }

        /*
         * GET /cart is the authority.
         *
         * Never patch price, availability, issues or totals locally.
         */
        state.cart = action.payload.cart;

        state.initialized = true;

        state.loadStatus = 'succeeded';
        state.loadError = null;

        state.revalidationStatus = 'succeeded';
        state.revalidationError = null;
        state.revalidationRequestId = null;
      })

      .addCase(revalidateCustomerCart.rejected, (state, action) => {
        if (state.revalidationRequestId !== action.meta.requestId) {
          return;
        }

        /*
         * Keep the previously rendered Cart.
         *
         * A refresh failure must not destroy valid Customer Cart state.
         */
        state.revalidationStatus = 'failed';

        state.revalidationError = action.payload ?? {
          message: 'Unable to refresh current cart pricing and availability.',
        };

        state.revalidationRequestId = null;
      })

      .addCase(mergeGuestCart.pending, (state, action) => {
        state.ownerId = action.meta.arg.customerId;

        /*
         * The Customer Cart is intentionally considered not ready while
         * Guest → Customer reconciliation is happening.
         *
         * This prevents a stale/empty Customer Cart from flashing before the
         * authoritative merge response arrives.
         */
        state.initialized = false;

        state.loadStatus = 'idle';
        state.loadError = null;
        state.loadRequestId = null;

        state.mergeStatus = 'loading';
        state.mergeError = null;
        state.mergeRequestId = action.meta.requestId;
      })

      .addCase(mergeGuestCart.fulfilled, (state, action) => {
        if (
          state.mergeRequestId !== action.meta.requestId ||
          state.ownerId !== action.payload.customerId
        ) {
          return;
        }

        /*
         * Never calculate the merged Customer Cart locally.
         * The backend response is the commerce authority.
         */
        state.cart = action.payload.cart;

        state.initialized = true;

        state.loadStatus = 'succeeded';
        state.loadError = null;
        state.loadRequestId = null;

        state.mergeStatus = 'succeeded';
        state.mergeError = null;
        state.mergeRequestId = null;

        /*
         * Clear Guest persistence ONLY after the backend confirms success.
         *
         * The existing Redux store subscriber observes this change and removes
         * multisports_guest_cart from localStorage.
         */
        state.guestItems = [];
      })

      .addCase(mergeGuestCart.rejected, (state, action) => {
        if (state.mergeRequestId !== action.meta.requestId) {
          return;
        }

        /*
         * Do NOT clear guestItems here.
         *
         * A failed merge must preserve the Guest Cart in Redux/localStorage.
         */
        state.mergeStatus = 'failed';

        state.mergeError = action.payload ?? {
          message: 'Unable to merge your Guest Cart.',
        };

        state.mergeRequestId = null;

        /*
         * The next CartSessionSync pass will GET the Customer's actual
         * persisted Cart.
         */
        state.initialized = false;

        state.loadStatus = 'idle';
        state.loadError = null;
        state.loadRequestId = null;
      })

      .addCase(addCartItem.pending, (state, action) => {
        state.ownerId = action.meta.arg.customerId;

        state.actionStatus = 'loading';
        state.actionError = null;
        state.actionItemId = null;
        state.actionOperation = null;
        state.actionRequestId = action.meta.requestId;
      })

      .addCase(addCartItem.fulfilled, (state, action) => {
        if (
          state.actionRequestId !== action.meta.requestId ||
          state.ownerId !== action.payload.customerId
        ) {
          return;
        }

        /*
         * Never calculate Customer Cart state locally.
         * Replace it with the backend-authoritative Cart.
         */
        state.cart = action.payload.cart;

        state.initialized = true;

        state.actionStatus = 'idle';
        state.actionError = null;
        state.actionItemId = null;
        state.actionOperation = null;
        state.actionRequestId = null;
      })

      .addCase(addCartItem.rejected, (state, action) => {
        if (state.actionRequestId !== action.meta.requestId) {
          return;
        }

        state.actionStatus = 'idle';
        state.actionError = action.payload;

        state.actionItemId = null;
        state.actionOperation = null;
        state.actionRequestId = null;
      })

      .addCase(updateCartItemQuantity.pending, (state, action) => {
        state.ownerId = action.meta.arg.customerId;

        state.actionStatus = 'loading';
        state.actionError = null;

        state.actionRequestId = action.meta.requestId;
        state.actionItemId = action.meta.arg.cartItemId;
        state.actionOperation = 'quantity';
      })

      .addCase(updateCartItemQuantity.fulfilled, (state, action) => {
        if (
          state.actionRequestId !== action.meta.requestId ||
          state.ownerId !== action.payload.customerId
        ) {
          return;
        }

        /*
         * Customer Cart remains backend-authoritative.
         * Never calculate the successful Customer quantity or totals locally.
         */
        state.cart = action.payload.cart;

        state.initialized = true;

        state.actionStatus = 'idle';
        state.actionError = null;

        state.actionRequestId = null;
        state.actionItemId = null;

        state.actionOperation = null;
      })

      .addCase(updateCartItemQuantity.rejected, (state, action) => {
        if (state.actionRequestId !== action.meta.requestId) {
          return;
        }

        state.actionStatus = 'idle';
        state.actionError = action.payload;

        state.actionRequestId = null;
        state.actionItemId = action.meta.arg.cartItemId;

        state.actionOperation = 'quantity';
      })

      .addCase(removeCartItem.pending, (state, action) => {
        state.ownerId = action.meta.arg.customerId;

        state.actionStatus = 'loading';
        state.actionError = null;

        state.actionRequestId = action.meta.requestId;
        state.actionItemId = action.meta.arg.cartItemId;
        state.actionOperation = 'remove';
      })

      .addCase(removeCartItem.fulfilled, (state, action) => {
        if (
          state.actionRequestId !== action.meta.requestId ||
          state.ownerId !== action.payload.customerId
        ) {
          return;
        }

        /*
         * Customer Cart stays backend-authoritative.
         * The removed line and recalculated subtotal come from the response.
         */
        state.cart = action.payload.cart;

        state.initialized = true;

        state.actionStatus = 'idle';
        state.actionError = null;

        state.actionRequestId = null;
        state.actionItemId = null;
        state.actionOperation = null;
      })

      .addCase(removeCartItem.rejected, (state, action) => {
        if (state.actionRequestId !== action.meta.requestId) {
          return;
        }

        state.actionStatus = 'idle';
        state.actionError = action.payload;

        state.actionRequestId = null;
        state.actionItemId = action.meta.arg.cartItemId;
        state.actionOperation = 'remove';
      })

      .addCase(applyCartCoupon.pending, (state, action) => {
        state.ownerId = action.meta.arg.customerId;

        state.actionStatus = 'loading';
        state.actionError = null;

        state.actionRequestId = action.meta.requestId;

        state.actionItemId = null;

        state.actionOperation = 'coupon-apply';
      })

      .addCase(applyCartCoupon.fulfilled, (state, action) => {
        if (
          state.actionRequestId !== action.meta.requestId ||
          state.ownerId !== action.payload.customerId
        ) {
          return;
        }

        /*
         * Coupon + pricing come entirely
         * from the backend-authoritative Cart.
         */
        state.cart = action.payload.cart;

        state.initialized = true;

        state.actionStatus = 'idle';
        state.actionError = null;

        state.actionRequestId = null;
        state.actionItemId = null;
        state.actionOperation = null;
      })

      .addCase(applyCartCoupon.rejected, (state, action) => {
        if (state.actionRequestId !== action.meta.requestId) {
          return;
        }

        state.actionStatus = 'idle';

        state.actionError = action.payload ?? {
          message: 'Unable to apply this Coupon.',
        };

        state.actionRequestId = null;
        state.actionItemId = null;

        state.actionOperation = 'coupon-apply';
      })

      .addCase(removeCartCoupon.pending, (state, action) => {
        state.ownerId = action.meta.arg;

        state.actionStatus = 'loading';
        state.actionError = null;

        state.actionRequestId = action.meta.requestId;

        state.actionItemId = null;

        state.actionOperation = 'coupon-remove';
      })

      .addCase(removeCartCoupon.fulfilled, (state, action) => {
        if (
          state.actionRequestId !== action.meta.requestId ||
          state.ownerId !== action.payload.customerId
        ) {
          return;
        }

        state.cart = action.payload.cart;

        state.initialized = true;

        state.actionStatus = 'idle';
        state.actionError = null;

        state.actionRequestId = null;
        state.actionItemId = null;
        state.actionOperation = null;
      })

      .addCase(removeCartCoupon.rejected, (state, action) => {
        if (state.actionRequestId !== action.meta.requestId) {
          return;
        }

        state.actionStatus = 'idle';

        state.actionError = action.payload ?? {
          message: 'Unable to remove this Coupon.',
        };

        state.actionRequestId = null;
        state.actionItemId = null;

        state.actionOperation = 'coupon-remove';
      })

      .addCase(clearCart.pending, (state, action) => {
        state.ownerId = action.meta.arg;

        state.actionStatus = 'loading';
        state.actionError = null;

        state.actionRequestId = action.meta.requestId;
        state.actionItemId = null;
        state.actionOperation = 'clear';
      })

      .addCase(clearCart.fulfilled, (state, action) => {
        if (
          state.actionRequestId !== action.meta.requestId ||
          state.ownerId !== action.payload.customerId
        ) {
          return;
        }

        /*
         * Customer Cart remains backend-authoritative.
         * Replace it with the resolved empty Cart returned by the server.
         */
        state.cart = action.payload.cart;

        state.initialized = true;

        state.actionStatus = 'idle';
        state.actionError = null;

        state.actionRequestId = null;
        state.actionItemId = null;
        state.actionOperation = null;
      })

      .addCase(clearCart.rejected, (state, action) => {
        if (state.actionRequestId !== action.meta.requestId) {
          return;
        }

        state.actionStatus = 'idle';
        state.actionError = action.payload;

        state.actionRequestId = null;
        state.actionItemId = null;
        state.actionOperation = 'clear';
      });
  },
});

export const {
  addGuestCartItem,
  updateGuestCartItemQuantity,
  removeGuestCartItem,
  clearGuestCart,
  clearAuthenticatedCart,
  clearCartActionError,
} = cartSlice.actions;

export default cartSlice.reducer;
