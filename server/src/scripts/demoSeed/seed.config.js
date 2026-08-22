import 'dotenv/config';

import { SeedSafetyError } from './seed.utils.js';

const DEMO_DATABASE_PATTERN = /(?:^|[_-])(demo|seed|sandbox)(?:$|[_-])/i;

function isExplicitlyTrue(value) {
  return value === 'true';
}

export function resolveMongoDatabaseName(mongodbUri) {
  if (typeof mongodbUri !== 'string' || mongodbUri.trim().length === 0) {
    throw new SeedSafetyError(
      'MONGODB_URI_REQUIRED',
      'MONGODB_URI is required for the demo seed.',
    );
  }

  const match = mongodbUri
    .trim()
    .match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?#]+)(?:[?#]|$)/i);

  if (!match) {
    throw new SeedSafetyError(
      'DEMO_SEED_DATABASE_UNRESOLVED',
      'MONGODB_URI must include an explicit database name.',
    );
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    throw new SeedSafetyError(
      'DEMO_SEED_DATABASE_UNRESOLVED',
      'The MongoDB database name could not be resolved safely.',
    );
  }
}

export function createSeedConfig(source = process.env) {
  const nodeEnv = (source.NODE_ENV || 'development').trim().toLowerCase();
  const mongodbUri = source.MONGODB_URI?.trim() || '';
  const allowedDatabaseName = source.DEMO_SEED_DATABASE?.trim() || '';
  const appTimezone = source.APP_TIMEZONE?.trim() || 'Asia/Kolkata';
  const anchorDate = source.DEMO_SEED_ANCHOR_DATE?.trim() || undefined;
  let databaseName;
  let databaseResolutionError;

  try {
    databaseName = resolveMongoDatabaseName(mongodbUri);
  } catch (error) {
    databaseResolutionError = error;
  }

  return Object.freeze({
    nodeEnv,
    mongodbUri,
    databaseName,
    allowedDatabaseName,
    appTimezone,
    anchorDate,
    allowDemoSeed: isExplicitlyTrue(source.ALLOW_DEMO_SEED),
    allowCloudinaryUpload: isExplicitlyTrue(
      source.ALLOW_DEMO_CLOUDINARY_UPLOAD,
    ),
    demoPassword: source.DEMO_SEED_PASSWORD || undefined,
    databaseResolutionError,
  });
}

export function assertSeedRuntimeSafety(config) {
  if (config.nodeEnv === 'production') {
    throw new SeedSafetyError(
      'DEMO_SEED_PRODUCTION_FORBIDDEN',
      'Demo seed execution is forbidden in production.',
    );
  }

  if (!['development', 'test'].includes(config.nodeEnv)) {
    throw new SeedSafetyError(
      'DEMO_SEED_ENVIRONMENT_INVALID',
      'Demo seed execution is allowed only in development or test.',
    );
  }

  if (!config.allowDemoSeed) {
    throw new SeedSafetyError(
      'DEMO_SEED_NOT_ALLOWED',
      'Set ALLOW_DEMO_SEED=true explicitly before running the demo seed.',
    );
  }

  if (config.databaseResolutionError) {
    throw config.databaseResolutionError;
  }

  if (!config.allowedDatabaseName) {
    throw new SeedSafetyError(
      'DEMO_SEED_DATABASE_REQUIRED',
      'DEMO_SEED_DATABASE is required for the demo seed.',
    );
  }

  if (!DEMO_DATABASE_PATTERN.test(config.allowedDatabaseName)) {
    throw new SeedSafetyError(
      'DEMO_SEED_ALLOWED_DATABASE_UNSAFE',
      'DEMO_SEED_DATABASE must be a recognizable demo, seed, or sandbox database.',
    );
  }

  if (config.databaseName !== config.allowedDatabaseName) {
    throw new SeedSafetyError(
      'DEMO_SEED_DATABASE_MISMATCH',
      `Resolved database "${config.databaseName}" does not match the allowed demo database.`,
    );
  }

  if (!DEMO_DATABASE_PATTERN.test(config.databaseName)) {
    throw new SeedSafetyError(
      'DEMO_SEED_DATABASE_UNSAFE',
      'The resolved MongoDB database is not recognizable as a demo database.',
    );
  }

  try {
    new Intl.DateTimeFormat('en-US', {
      timeZone: config.appTimezone,
    }).format(new Date());
  } catch {
    throw new SeedSafetyError(
      'DEMO_SEED_TIMEZONE_INVALID',
      'APP_TIMEZONE must be a valid IANA timezone.',
    );
  }

  return config;
}

export function assertDemoCloudinaryUploadAllowed(config) {
  if (!config.allowCloudinaryUpload) {
    throw new SeedSafetyError(
      'DEMO_CLOUDINARY_UPLOAD_NOT_ALLOWED',
      'Set ALLOW_DEMO_CLOUDINARY_UPLOAD=true explicitly before demo uploads.',
    );
  }
}

export function requireDemoSeedPassword(config) {
  if (!config.demoPassword) {
    throw new SeedSafetyError(
      'DEMO_SEED_PASSWORD_REQUIRED',
      'DEMO_SEED_PASSWORD is required before User seeding.',
    );
  }

  return config.demoPassword;
}
