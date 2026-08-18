import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { addCustomerCartItem, fetchCustomerCart } from '../../api/cartApi.js';

import { normalizeApiError } from '../../api/errors.js';

function createEmptyCart() {
  return {
    id: null,

    items: [],

    pricing: {
      subtotal: 0,
    },

    issues: [],

    canCheckout: false,
  };
}

function createInitialState() {
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

const cartSlice = createSlice({
  name: 'cart',

  initialState,

  reducers: {
    clearAuthenticatedCart(state) {
      Object.assign(state, createInitialState());
    },

    clearCartActionError(state) {
      state.actionError = null;
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

      .addCase(addCartItem.pending, (state, action) => {
        state.ownerId = action.meta.arg.customerId;

        state.actionStatus = 'loading';
        state.actionError = null;

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
         * Never calculate Cart state locally.
         * Replace it with the backend-authoritative Cart.
         */
        state.cart = action.payload.cart;

        state.initialized = true;

        state.actionStatus = 'idle';
        state.actionError = null;

        state.actionRequestId = null;
      })

      .addCase(addCartItem.rejected, (state, action) => {
        if (state.actionRequestId !== action.meta.requestId) {
          return;
        }

        state.actionStatus = 'idle';
        state.actionError = action.payload;

        state.actionRequestId = null;
      });
  },
});

export const { clearAuthenticatedCart, clearCartActionError } =
  cartSlice.actions;

export default cartSlice.reducer;
