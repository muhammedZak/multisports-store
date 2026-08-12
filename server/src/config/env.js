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

export const env = Object.freeze({
  nodeEnv,
  port,
  mongodbUri: process.env.MONGODB_URI,
  clientOrigins,
});
