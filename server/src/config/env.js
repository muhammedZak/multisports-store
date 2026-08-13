import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV || 'development';

const allowedNodeEnvs = ['development', 'test', 'production'];

if (!allowedNodeEnvs.includes(nodeEnv)) {
  throw new Error('NODE_ENV must be development, test, or production');
}

const port = Number(process.env.PORT || 4000);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error('PORT must be a valid positive number');
}

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required');
}

if (!process.env.CLIENT_ORIGINS) {
  throw new Error('CLIENT_ORIGINS is required');
}

const clientOrigins = process.env.CLIENT_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters');
}

if (
  !process.env.AUTH_CHALLENGE_SECRET ||
  process.env.AUTH_CHALLENGE_SECRET.length < 32
) {
  throw new Error('AUTH_CHALLENGE_SECRET must contain at least 32 characters');
}

export const env = Object.freeze({
  nodeEnv,
  port,
  mongodbUri: process.env.MONGODB_URI,
  clientOrigins,

  sessionSecret: process.env.SESSION_SECRET,
  authChallengeSecret: process.env.AUTH_CHALLENGE_SECRET,

  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL || '',
});
