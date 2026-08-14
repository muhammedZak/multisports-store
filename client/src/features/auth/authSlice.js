import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  fetchCsrfToken,
  fetchSession,
  loginCustomer,
  logoutCustomer,
} from '../../api/authApi.js';

import { setCsrfToken } from '../../api/csrf.js';

import { normalizeApiError } from '../../api/errors.js';

const initialState = {
  user: null,

  initialized: false,
  bootstrapStatus: 'idle',

  actionStatus: 'idle',
  error: null,
};

export const bootstrapAuth = createAsyncThunk(
  'auth/bootstrap',
  async (_, { rejectWithValue }) => {
    try {
      const csrf = await fetchCsrfToken();

      setCsrfToken(csrf.csrfToken);

      const session = await fetchSession();

      return session;
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(error, 'Unable to restore your session.'),
      );
    }
  },
  {
    condition: (_, { getState }) => {
      return getState().auth.bootstrapStatus === 'idle';
    },
  },
);

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const result = await loginCustomer(credentials);

      setCsrfToken(result.csrfToken);

      return result.user;
    } catch (error) {
      return rejectWithValue(normalizeApiError(error, 'Unable to log in.'));
    }
  },
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const result = await logoutCustomer();

      setCsrfToken(result.csrfToken);

      return null;
    } catch (error) {
      return rejectWithValue(normalizeApiError(error, 'Unable to log out.'));
    }
  },
);

const authSlice = createSlice({
  name: 'auth',

  initialState,

  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.bootstrapStatus = 'checking';
      })

      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.bootstrapStatus = 'ready';

        state.initialized = true;

        state.user = action.payload.authenticated ? action.payload.user : null;
      })

      .addCase(bootstrapAuth.rejected, (state, action) => {
        state.bootstrapStatus = 'failed';

        state.initialized = true;
        state.user = null;

        state.error = action.payload;
      })

      .addCase(login.pending, (state) => {
        state.actionStatus = 'loading';
        state.error = null;
      })

      .addCase(login.fulfilled, (state, action) => {
        state.actionStatus = 'idle';
        state.user = action.payload;
        state.error = null;
      })

      .addCase(login.rejected, (state, action) => {
        state.actionStatus = 'idle';
        state.error = action.payload;
      })

      .addCase(logout.pending, (state) => {
        state.actionStatus = 'loading';
        state.error = null;
      })

      .addCase(logout.fulfilled, (state) => {
        state.actionStatus = 'idle';
        state.user = null;
        state.error = null;
      })

      .addCase(logout.rejected, (state, action) => {
        state.actionStatus = 'idle';
        state.error = action.payload;
      });
  },
});

export const { clearAuthError } = authSlice.actions;

export default authSlice.reducer;
