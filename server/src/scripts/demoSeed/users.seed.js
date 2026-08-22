import * as argon2 from 'argon2';

import { validatePasswordResetInput } from '../../modules/auth/auth.validation.js';
import { User } from '../../modules/users/user.model.js';
import { DEMO_USER_IDENTITIES } from './seed.registry.js';
import {
  SeedDriftError,
  SeedValidationError,
  withSeedTransaction,
} from './seed.utils.js';

export const DEMO_USER_CLASSIFICATIONS = Object.freeze({
  MISSING: 'MISSING',
  EXACT: 'EXACT_SEEDED_RECORD',
  EMAIL_CONFLICT: 'EMAIL_CONFLICT',
  ID_CONFLICT: 'ID_CONFLICT',
  DRIFT: 'DRIFT',
});

const address = (seedKey, values) => Object.freeze({ seedKey, ...values });

export const DEMO_USER_DEFINITIONS = Object.freeze([
  Object.freeze({
    seedKey: 'user:admin',
    name: 'Demo Store Admin',
    email: 'admin.demo@example.test',
    role: 'admin',
    emailVerified: true,
    timestamp: Object.freeze({ unit: 'months', value: 6 }),
    addresses: Object.freeze([]),
  }),
  Object.freeze({
    seedKey: 'user:fresh',
    name: 'Fresh Demo Customer',
    email: 'fresh.demo@example.test',
    role: 'customer',
    emailVerified: true,
    timestamp: Object.freeze({ unit: 'days', value: 1 }),
    addresses: Object.freeze([]),
  }),
  Object.freeze({
    seedKey: 'user:checkout',
    name: 'Checkout Demo Customer',
    email: 'checkout.demo@example.test',
    role: 'customer',
    emailVerified: true,
    timestamp: Object.freeze({ unit: 'days', value: 4 }),
    addresses: Object.freeze([
      address('address:checkout:primary', {
        fullName: 'Checkout Demo Customer',
        phone: '+91 90000 01001',
        address: '12 Demo Sports Avenue',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India',
        isDefault: true,
      }),
      address('address:checkout:secondary', {
        fullName: 'Checkout Demo Customer',
        phone: '+91 90000 01001',
        address: '24 Portfolio Lane',
        city: 'Kochi',
        state: 'Kerala',
        postalCode: '682001',
        country: 'India',
        isDefault: false,
      }),
    ]),
  }),
  Object.freeze({
    seedKey: 'user:orders',
    name: 'Orders Demo Customer',
    email: 'orders.demo@example.test',
    role: 'customer',
    emailVerified: true,
    timestamp: Object.freeze({ unit: 'days', value: 12 }),
    addresses: Object.freeze([
      address('address:orders:primary', {
        fullName: 'Orders Demo Customer',
        phone: '+91 90000 01002',
        address: '18 Matchday Road',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500001',
        country: 'India',
        isDefault: true,
      }),
      address('address:orders:secondary', {
        fullName: 'Orders Demo Customer',
        phone: '+91 90000 01002',
        address: '7 Arena Street',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
        country: 'India',
        isDefault: false,
      }),
    ]),
  }),
  Object.freeze({
    seedKey: 'user:reviews',
    name: 'Reviews Demo Customer',
    email: 'reviews.demo@example.test',
    role: 'customer',
    emailVerified: true,
    timestamp: Object.freeze({ unit: 'days', value: 25 }),
    addresses: Object.freeze([
      address('address:reviews:primary', {
        fullName: 'Reviews Demo Customer',
        phone: '+91 90000 01003',
        address: '32 Review Park',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600001',
        country: 'India',
        isDefault: true,
      }),
    ]),
  }),
  Object.freeze({
    seedKey: 'user:ratings',
    name: 'Ratings Demo Customer',
    email: 'ratings.demo@example.test',
    role: 'customer',
    emailVerified: true,
    timestamp: Object.freeze({ unit: 'months', value: 2 }),
    addresses: Object.freeze([
      address('address:ratings:primary', {
        fullName: 'Ratings Demo Customer',
        phone: '+91 90000 01004',
        address: '14 Score Lane',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
        isDefault: true,
      }),
    ]),
  }),
  Object.freeze({
    seedKey: 'user:refunds',
    name: 'Refunds Demo Customer',
    email: 'refunds.demo@example.test',
    role: 'customer',
    emailVerified: true,
    timestamp: Object.freeze({ unit: 'months', value: 3 }),
    addresses: Object.freeze([
      address('address:refunds:primary', {
        fullName: 'Refunds Demo Customer',
        phone: '+91 90000 01005',
        address: '9 Returns Avenue',
        city: 'Ahmedabad',
        state: 'Gujarat',
        postalCode: '380001',
        country: 'India',
        isDefault: true,
      }),
    ]),
  }),
  Object.freeze({
    seedKey: 'user:support',
    name: 'Support Demo Customer',
    email: 'support.demo@example.test',
    role: 'customer',
    emailVerified: true,
    timestamp: Object.freeze({ unit: 'days', value: 7 }),
    addresses: Object.freeze([
      address('address:support:primary', {
        fullName: 'Support Demo Customer',
        phone: '+91 90000 01006',
        address: '21 Helpdesk Street',
        city: 'Kolkata',
        state: 'West Bengal',
        postalCode: '700001',
        country: 'India',
        isDefault: true,
      }),
    ]),
  }),
]);

const EXPECTED_ADDRESS_COUNTS = Object.freeze({
  'user:admin': 0,
  'user:fresh': 0,
  'user:checkout': 2,
  'user:orders': 2,
  'user:reviews': 1,
  'user:ratings': 1,
  'user:refunds': 1,
  'user:support': 1,
});

function idString(value) {
  return value?.toString();
}

function dateString(value) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function comparableAddress(value) {
  return {
    _id: idString(value._id),
    fullName: value.fullName,
    phone: value.phone,
    address: value.address,
    city: value.city,
    state: value.state,
    postalCode: value.postalCode,
    country: value.country,
    isDefault: value.isDefault,
  };
}

function comparableUser(value) {
  const source =
    typeof value?.toObject === 'function' ? value.toObject() : value;

  return {
    _id: idString(source?._id),
    name: source?.name,
    email:
      typeof source?.email === 'string'
        ? source.email.toLowerCase()
        : source?.email,
    role: source?.role,
    emailVerified: source?.emailVerified,
    googleSub: source?.googleSub,
    profilePhoto: source?.profilePhoto,
    addresses: (source?.addresses || []).map(comparableAddress),
    createdAt: source?.createdAt ? dateString(source.createdAt) : undefined,
    updatedAt: source?.updatedAt ? dateString(source.updatedAt) : undefined,
  };
}

function expectedTimestamp(definition, clock) {
  const date =
    definition.timestamp.unit === 'months'
      ? clock.monthsAgo(definition.timestamp.value)
      : clock.daysAgo(definition.timestamp.value);

  return clock.atLocalTime(date, { hour: 10 });
}

export function validateDemoSeedPassword(password) {
  try {
    validatePasswordResetInput({
      newPassword: password,
      confirmPassword: password,
    });
  } catch {
    throw new SeedValidationError(
      'DEMO_SEED_PASSWORD_INVALID',
      'DEMO_SEED_PASSWORD must be 8-128 characters and contain a letter and a number.',
    );
  }

  return password;
}

export function buildExpectedDemoUsers({ registry, clock }) {
  return DEMO_USER_DEFINITIONS.map((definition) => {
    const timestamp = expectedTimestamp(definition, clock);

    return {
      seedKey: definition.seedKey,
      _id: registry.idFor(definition.seedKey),
      name: definition.name,
      email: definition.email,
      role: definition.role,
      emailVerified: definition.emailVerified,
      addresses: definition.addresses.map(({ seedKey, ...values }) => ({
        _id: registry.idFor(seedKey),
        ...values,
      })),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
}

export async function validateDemoUserDefinitions({ registry, clock }) {
  const expectedUsers = buildExpectedDemoUsers({ registry, clock });
  const identityByKey = new Map(
    DEMO_USER_IDENTITIES.map((identity) => [identity.key, identity]),
  );
  const emails = new Set();
  const ids = new Set();
  const addressIds = new Set();

  if (
    expectedUsers.length !== 8 ||
    expectedUsers.filter((user) => user.role === 'admin').length !== 1 ||
    expectedUsers.filter((user) => user.role === 'customer').length !== 7
  ) {
    throw new SeedValidationError(
      'DEMO_USER_DEFINITIONS_INVALID',
      'Demo Users must contain exactly one Admin and seven Customers.',
    );
  }

  for (const expected of expectedUsers) {
    const registered = identityByKey.get(expected.seedKey);
    const definition = DEMO_USER_DEFINITIONS.find(
      (candidate) => candidate.seedKey === expected.seedKey,
    );

    if (!registered || !definition || registered.email !== expected.email) {
      throw new SeedValidationError(
        'DEMO_USER_REGISTRY_MISMATCH',
        `Demo User registry identity does not match ${expected.seedKey}.`,
      );
    }

    if (emails.has(expected.email) || ids.has(idString(expected._id))) {
      throw new SeedValidationError(
        'DEMO_USER_IDENTITY_DUPLICATE',
        'Demo User definitions contain a duplicate identity.',
      );
    }

    emails.add(expected.email);
    ids.add(idString(expected._id));

    if (
      expected.emailVerified !== true ||
      expected.addresses.length !== EXPECTED_ADDRESS_COUNTS[expected.seedKey] ||
      Object.hasOwn(definition, 'googleSub') ||
      Object.hasOwn(definition, 'profilePhoto')
    ) {
      throw new SeedValidationError(
        'DEMO_USER_FIELDS_INVALID',
        `Demo User ${expected.seedKey} has invalid locked seed fields.`,
      );
    }

    const defaultAddresses = expected.addresses.filter(
      (candidate) => candidate.isDefault,
    );

    if (
      (expected.addresses.length > 0 && defaultAddresses.length !== 1) ||
      (expected.addresses.length === 0 && defaultAddresses.length !== 0)
    ) {
      throw new SeedValidationError(
        'DEMO_USER_DEFAULT_ADDRESS_INVALID',
        `Demo User ${expected.seedKey} has invalid default-address state.`,
      );
    }

    for (const candidate of expected.addresses) {
      const candidateId = idString(candidate._id);

      if (addressIds.has(candidateId) || ids.has(candidateId)) {
        throw new SeedValidationError(
          'DEMO_ADDRESS_ID_COLLISION',
          'Demo Address definitions contain a deterministic ID collision.',
        );
      }

      addressIds.add(candidateId);
    }

    const document = new User({
      ...expected,
      passwordHash: 'validation-only-placeholder',
    });

    await document.validate();
  }

  if (addressIds.size !== 8) {
    throw new SeedValidationError(
      'DEMO_ADDRESS_COUNT_INVALID',
      'Demo User definitions must contain exactly eight embedded Addresses.',
    );
  }

  return expectedUsers;
}

export function classifyDemoUserRecord({
  expected,
  recordById,
  recordByEmail,
  passwordMatches = false,
}) {
  if (!recordById && !recordByEmail) {
    return { classification: DEMO_USER_CLASSIFICATIONS.MISSING };
  }

  if (recordById && recordById.email?.toLowerCase() !== expected.email) {
    return { classification: DEMO_USER_CLASSIFICATIONS.ID_CONFLICT };
  }

  if (recordByEmail && idString(recordByEmail._id) !== idString(expected._id)) {
    return { classification: DEMO_USER_CLASSIFICATIONS.EMAIL_CONFLICT };
  }

  const candidate = recordById || recordByEmail;
  const actual = comparableUser(candidate);
  const wanted = comparableUser(expected);
  const driftFields = Object.keys(wanted).filter((field) => {
    if (field === 'googleSub' || field === 'profilePhoto') {
      return actual[field] !== undefined;
    }

    return JSON.stringify(actual[field]) !== JSON.stringify(wanted[field]);
  });

  if (!candidate.passwordHash || !passwordMatches) {
    driftFields.push('passwordHash');
  }

  if (driftFields.length > 0) {
    return {
      classification: DEMO_USER_CLASSIFICATIONS.DRIFT,
      driftFields: [...new Set(driftFields)],
    };
  }

  return { classification: DEMO_USER_CLASSIFICATIONS.EXACT };
}

function identityQuery(expectedUsers) {
  return {
    $or: [
      { _id: { $in: expectedUsers.map((user) => user._id) } },
      { email: { $in: expectedUsers.map((user) => user.email) } },
    ],
  };
}

export function exactDemoUserPairFilter(expectedUsers) {
  if (
    !Array.isArray(expectedUsers) ||
    expectedUsers.length < 1 ||
    expectedUsers.length > 8
  ) {
    throw new SeedValidationError(
      'DEMO_USER_RESET_SCOPE_INVALID',
      'Selective User reset requires one to eight preflighted identities.',
    );
  }

  return {
    $or: expectedUsers.map((user) => ({
      _id: user._id,
      email: user.email,
    })),
  };
}

export async function preflightDemoUsers({ expectedUsers, password }) {
  const records = await User.find(identityQuery(expectedUsers))
    .select('+passwordHash +googleSub')
    .lean();
  const byId = new Map(records.map((record) => [idString(record._id), record]));
  const byEmail = new Map(records.map((record) => [record.email, record]));
  const results = [];

  for (const expected of expectedUsers) {
    const recordById = byId.get(idString(expected._id));
    const recordByEmail = byEmail.get(expected.email);
    const candidate = recordById || recordByEmail;
    let passwordMatches = false;

    if (candidate?.passwordHash) {
      try {
        passwordMatches = await argon2.verify(candidate.passwordHash, password);
      } catch {
        passwordMatches = false;
      }
    }

    results.push({
      expected,
      ...classifyDemoUserRecord({
        expected,
        recordById,
        recordByEmail,
        passwordMatches,
      }),
    });
  }

  const failures = results.filter(
    (result) =>
      ![
        DEMO_USER_CLASSIFICATIONS.MISSING,
        DEMO_USER_CLASSIFICATIONS.EXACT,
      ].includes(result.classification),
  );

  if (failures.length > 0) {
    const summary = failures
      .map((failure) => `${failure.expected.seedKey}:${failure.classification}`)
      .join(', ');

    throw new SeedDriftError(
      `Demo User preflight rejected conflicting or drifted identities: ${summary}.`,
    );
  }

  return results;
}

export async function seedDemoUsers({ registry, clock, password }) {
  validateDemoSeedPassword(password);
  const expectedUsers = await validateDemoUserDefinitions({ registry, clock });
  const preflight = await preflightDemoUsers({ expectedUsers, password });
  const missing = preflight.filter(
    (result) => result.classification === DEMO_USER_CLASSIFICATIONS.MISSING,
  );

  if (missing.length > 0) {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const documents = missing.map(({ expected }) => ({
      _id: expected._id,
      name: expected.name,
      email: expected.email,
      role: expected.role,
      passwordHash,
      emailVerified: expected.emailVerified,
      addresses: expected.addresses,
      createdAt: expected.createdAt,
      updatedAt: expected.updatedAt,
    }));

    try {
      await withSeedTransaction(async (session) => {
        await User.insertMany(documents, { ordered: true, session });
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new SeedValidationError(
          'DEMO_USER_DUPLICATE_KEY',
          'A concurrent write created a demo User ID or email conflict.',
        );
      }

      throw error;
    }
  }

  const postflight = await preflightDemoUsers({ expectedUsers, password });

  if (
    postflight.some(
      (result) => result.classification !== DEMO_USER_CLASSIFICATIONS.EXACT,
    )
  ) {
    throw new SeedValidationError(
      'DEMO_USER_POSTFLIGHT_FAILED',
      'Demo User post-write verification did not find eight exact records.',
    );
  }

  return {
    expectedUsers,
    created: missing.length,
    skipped: expectedUsers.length - missing.length,
  };
}

export async function resetDemoUsers({ registry, clock, password }) {
  validateDemoSeedPassword(password);
  const expectedUsers = await validateDemoUserDefinitions({ registry, clock });
  const preflight = await preflightDemoUsers({ expectedUsers, password });
  const existing = preflight.filter(
    (result) => result.classification === DEMO_USER_CLASSIFICATIONS.EXACT,
  );

  if (existing.length === 0) {
    return { deleted: 0 };
  }

  const filter = exactDemoUserPairFilter(
    existing.map((result) => result.expected),
  );
  let deleted = 0;

  await withSeedTransaction(async (session) => {
    const result = await User.deleteMany(filter, { session });
    deleted = result.deletedCount;

    if (deleted !== existing.length) {
      throw new SeedValidationError(
        'DEMO_USER_RESET_COUNT_MISMATCH',
        'Selective User reset did not delete the exact preflighted set.',
      );
    }
  });

  const remaining = await User.countDocuments(identityQuery(expectedUsers));

  if (remaining !== 0) {
    throw new SeedValidationError(
      'DEMO_USER_RESET_POSTFLIGHT_FAILED',
      'Selective User reset left a deterministic User ID or email behind.',
    );
  }

  return { deleted };
}

export function demoUserIdentityQuery(expectedUsers) {
  return identityQuery(expectedUsers);
}
