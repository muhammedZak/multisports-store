import { isDeepStrictEqual } from 'node:util';

import mongoose from 'mongoose';

export class SeedError extends Error {
  constructor(name, code, message) {
    super(message);
    this.name = name;
    this.code = code;
  }
}

export class SeedSafetyError extends SeedError {
  constructor(code, message) {
    super('SeedSafetyError', code, message);
  }
}

export class SeedValidationError extends SeedError {
  constructor(code, message) {
    super('SeedValidationError', code, message);
  }
}

export class SeedConnectionError extends SeedError {
  constructor(message) {
    super('SeedConnectionError', 'DEMO_SEED_CONNECTION_FAILED', message);
  }
}

export class SeedDriftError extends SeedError {
  constructor(message) {
    super('SeedDriftError', 'DEMO_SEED_DRIFT', message);
  }
}

export const SEED_RECORD_ACTIONS = Object.freeze({
  CREATE: 'create',
  SKIP: 'skip',
});

function comparableValue(record, field) {
  const source = typeof record?.toObject === 'function' ? record.toObject() : record;

  return source?.[field];
}

export function decideSeedRecordAction({
  existingRecord,
  expectedRecord,
  compareFields,
  entityLabel,
  seedKey,
}) {
  if (!existingRecord) {
    return SEED_RECORD_ACTIONS.CREATE;
  }

  if (!Array.isArray(compareFields) || compareFields.length === 0) {
    throw new TypeError('Seed comparison requires explicit fields.');
  }

  const driftedFields = compareFields.filter(
    (field) =>
      !isDeepStrictEqual(
        comparableValue(existingRecord, field),
        comparableValue(expectedRecord, field),
      ),
  );

  if (driftedFields.length > 0) {
    throw new SeedDriftError(
      `${entityLabel} "${seedKey}" has unexpected drift in fields: ${driftedFields.join(', ')}.`,
    );
  }

  return SEED_RECORD_ACTIONS.SKIP;
}

export function buildSeedOwnedIdFilter(registry, entity) {
  const keys = registry.keysByEntity[entity];

  if (!Array.isArray(keys) || keys.length === 0) {
    throw new SeedSafetyError(
      'DEMO_SEED_RESET_SCOPE_EMPTY',
      `No registered seed-owned IDs exist for ${entity}.`,
    );
  }

  return {
    _id: {
      $in: keys.map((key) => registry.idFor(key)),
    },
  };
}

export async function withSeedTransaction(
  work,
  { connection = mongoose.connection, transactionOptions } = {},
) {
  if (typeof work !== 'function') {
    throw new TypeError('withSeedTransaction requires a work function.');
  }

  return connection.transaction(
    async (session) => work(session),
    transactionOptions,
  );
}

export async function connectSeedDatabase(config) {
  try {
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
  } catch {
    throw new SeedConnectionError(
      'Unable to connect to the dedicated demo MongoDB database.',
    );
  }

  const connectedDatabaseName = mongoose.connection.db?.databaseName;

  if (connectedDatabaseName !== config.allowedDatabaseName) {
    await mongoose.disconnect();

    throw new SeedSafetyError(
      'DEMO_SEED_CONNECTED_DATABASE_MISMATCH',
      'MongoDB connected to a database other than DEMO_SEED_DATABASE.',
    );
  }

  return mongoose.connection;
}

export async function disconnectSeedDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export async function snapshotCollectionCounts(connection) {
  const collections = await connection.db
    .listCollections({}, { nameOnly: true })
    .toArray();
  const counts = {};

  for (const { name } of collections.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    counts[name] = await connection.db.collection(name).countDocuments({});
  }

  return counts;
}

export function assertCollectionCountsUnchanged(before, after) {
  if (!isDeepStrictEqual(before, after)) {
    throw new SeedValidationError(
      'DEMO_SEED_FOUNDATION_WROTE_DATA',
      'Collection counts changed during foundation verification.',
    );
  }
}

export function printSeedError(error) {
  const kind =
    error instanceof SeedConnectionError
      ? 'Connection error'
      : error instanceof SeedSafetyError
        ? 'Safety/configuration error'
        : 'Verification error';

  console.error('');
  console.error('Demo Seed failed.');
  console.error(`Type: ${kind}`);

  if (error.code) {
    console.error(`Code: ${error.code}`);
  }

  console.error(`Reason: ${error.message}`);
}
