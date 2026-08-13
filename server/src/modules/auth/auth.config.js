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
});
