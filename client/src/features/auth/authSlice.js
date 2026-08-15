import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  fetchCsrfToken,
  fetchSession,
  loginCustomer,
  logoutCustomer,
  requestLoginOtp,
  verifyLoginOtp,
  authenticateGoogle,
} from '../../api/authApi.js';

import { setCsrfToken } from '../../api/csrf.js';

import { normalizeApiError } from '../../api/errors.js';

const initialState = {
  user: null,

  initialized: false,
  bootstrapStatus: 'idle',

  actionStatus: 'idle',
  error: null,

  googleLinkPending: false,
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

export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',

  async ({ credential }, { rejectWithValue }) => {
    try {
      const result = await authenticateGoogle({
        credential,
      });

      setCsrfToken(result.csrfToken);

      return result.user;
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(error, 'Unable to continue with Google.'),
      );
    }
  },
);

export const requestOtpLogin = createAsyncThunk(
  'auth/requestOtpLogin',
  async (payload, { rejectWithValue }) => {
    try {
      return await requestLoginOtp(payload);
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(error, 'Unable to request a login code.'),
      );
    }
  },
);

export const verifyOtpLogin = createAsyncThunk(
  'auth/verifyOtpLogin',
  async (payload, { rejectWithValue }) => {
    try {
      const result = await verifyLoginOtp(payload);

      setCsrfToken(result.csrfToken);

      return result.user;
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(error, 'Unable to verify the login code.'),
      );
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

    clearGoogleLinkPending(state) {
      state.googleLinkPending = false;

      if (state.error?.code === 'ACCOUNT_LINK_REQUIRED') {
        state.error = null;
      }
    },

    updateAuthenticatedUserEmail(state, action) {
      if (!state.user) {
        return;
      }

      state.user.email = action.payload.email;
      state.user.emailVerified = true;
    },

    updateAuthenticatedUserProfile(state, action) {
      if (!state.user) {
        return;
      }

      state.user.name = action.payload.name;
      state.user.phone = action.payload.phone;
    },

    updateAuthenticatedUserProfilePhoto(state, action) {
      if (!state.user) {
        return;
      }

      state.user.profilePhoto = action.payload.profilePhoto;
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

      .addCase(signInWithGoogle.pending, (state) => {
        state.actionStatus = 'loading';
        state.error = null;
      })

      .addCase(signInWithGoogle.fulfilled, (state, action) => {
        state.actionStatus = 'idle';

        state.user = action.payload;

        state.googleLinkPending = false;

        state.error = null;
      })

      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.actionStatus = 'idle';

        state.error = action.payload;

        if (action.payload?.code === 'ACCOUNT_LINK_REQUIRED') {
          state.googleLinkPending = true;
        }
      })

      .addCase(requestOtpLogin.pending, (state) => {
        state.actionStatus = 'loading';
        state.error = null;
      })

      .addCase(requestOtpLogin.fulfilled, (state) => {
        state.actionStatus = 'idle';
        state.error = null;
      })

      .addCase(requestOtpLogin.rejected, (state, action) => {
        state.actionStatus = 'idle';
        state.error = action.payload;
      })

      .addCase(verifyOtpLogin.pending, (state) => {
        state.actionStatus = 'loading';
        state.error = null;
      })

      .addCase(verifyOtpLogin.fulfilled, (state, action) => {
        state.actionStatus = 'idle';
        state.user = action.payload;
        state.error = null;
      })

      .addCase(verifyOtpLogin.rejected, (state, action) => {
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
        state.googleLinkPending = false;
        state.error = null;
      })

      .addCase(logout.rejected, (state, action) => {
        state.actionStatus = 'idle';
        state.error = action.payload;
      });
  },
});

export const {
  clearAuthError,
  clearGoogleLinkPending,
  updateAuthenticatedUserEmail,
  updateAuthenticatedUserProfile,
  updateAuthenticatedUserProfilePhoto,
} = authSlice.actions;

export default authSlice.reducer;
