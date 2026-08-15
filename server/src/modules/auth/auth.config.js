export const authConfig = Object.freeze({
  password: Object.freeze({
    minLength: 8,
    maxLength: 128,
  }),

  emailVerification: Object.freeze({
    otpLength: 6,
    otpTtlMs: 10 * 60 * 1000,
    resendCooldownMs: 60 * 1000,
    maxAttempts: 5,
  }),

  passwordRecovery: Object.freeze({
    resetAuthorizationTtlMs: 10 * 60 * 1000,
  }),

  rateLimits: Object.freeze({
    registration: Object.freeze({
      windowMs: 15 * 60 * 1000,
      limit: 5,
    }),

    verification: Object.freeze({
      windowMs: 10 * 60 * 1000,
      limit: 20,
    }),

    resend: Object.freeze({
      windowMs: 15 * 60 * 1000,
      limit: 10,
    }),

    login: Object.freeze({
      windowMs: 15 * 60 * 1000,
      limit: 10,
    }),

    passwordChange: Object.freeze({
      windowMs: 15 * 60 * 1000,
      limit: 5,
    }),
  }),
});
