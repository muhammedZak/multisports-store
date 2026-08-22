import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertDemoCloudinaryUploadAllowed,
  assertSeedRuntimeSafety,
  createSeedConfig,
  requireDemoSeedPassword,
} from './seed.config.js';
import { createSeedClock } from './seed.clock.js';
import {
  createSeedRegistry,
  deterministicObjectId,
} from './seed.registry.js';
import { loadAndValidateProductManifest } from './seed.validation.js';

const TEST_DATABASE = 'multisports_seed_test';

function safeEnvironment(overrides = {}) {
  return {
    NODE_ENV: 'development',
    ALLOW_DEMO_SEED: 'true',
    MONGODB_URI: `mongodb://127.0.0.1:27017/${TEST_DATABASE}`,
    DEMO_SEED_DATABASE: TEST_DATABASE,
    APP_TIMEZONE: 'Asia/Kolkata',
    ...overrides,
  };
}

test('deterministic IDs are stable, distinct, and valid', () => {
  const first = deterministicObjectId('user:customer:01');
  const repeated = deterministicObjectId('user:customer:01');
  const different = deterministicObjectId('user:customer:02');

  assert.equal(first.toHexString(), repeated.toHexString());
  assert.notEqual(first.toHexString(), different.toHexString());
  assert.match(first.toHexString(), /^[a-f0-9]{24}$/);
});

test('production rejection overrides every other seed setting', () => {
  const config = createSeedConfig(
    safeEnvironment({
      NODE_ENV: 'production',
      ALLOW_DEMO_SEED: 'false',
      MONGODB_URI: '',
    }),
  );

  assert.throws(
    () => assertSeedRuntimeSafety(config),
    (error) => error.code === 'DEMO_SEED_PRODUCTION_FORBIDDEN',
  );
});

test('Cloudinary upload and User password require separate lazy opt-ins', () => {
  const config = assertSeedRuntimeSafety(createSeedConfig(safeEnvironment()));

  assert.throws(
    () => assertDemoCloudinaryUploadAllowed(config),
    (error) => error.code === 'DEMO_CLOUDINARY_UPLOAD_NOT_ALLOWED',
  );
  assert.throws(
    () => requireDemoSeedPassword(config),
    (error) => error.code === 'DEMO_SEED_PASSWORD_REQUIRED',
  );

  const enabled = assertSeedRuntimeSafety(
    createSeedConfig(
      safeEnvironment({
        ALLOW_DEMO_CLOUDINARY_UPLOAD: 'true',
        DEMO_SEED_PASSWORD: 'present-only-for-this-test',
      }),
    ),
  );

  assert.doesNotThrow(() => assertDemoCloudinaryUploadAllowed(enabled));
  assert.equal(requireDemoSeedPassword(enabled), 'present-only-for-this-test');
});

test('missing ALLOW_DEMO_SEED is rejected', () => {
  const config = createSeedConfig(
    safeEnvironment({ ALLOW_DEMO_SEED: 'false' }),
  );

  assert.throws(
    () => assertSeedRuntimeSafety(config),
    (error) => error.code === 'DEMO_SEED_NOT_ALLOWED',
  );
});

test('DEMO_SEED_DATABASE is mandatory', () => {
  const config = createSeedConfig(
    safeEnvironment({ DEMO_SEED_DATABASE: '' }),
  );

  assert.throws(
    () => assertSeedRuntimeSafety(config),
    (error) => error.code === 'DEMO_SEED_DATABASE_REQUIRED',
  );
});

test('the URI database must equal DEMO_SEED_DATABASE', () => {
  const config = createSeedConfig(
    safeEnvironment({ DEMO_SEED_DATABASE: 'different_seed_test' }),
  );

  assert.throws(
    () => assertSeedRuntimeSafety(config),
    (error) => error.code === 'DEMO_SEED_DATABASE_MISMATCH',
  );
});

test('an unsafe database name is rejected', () => {
  const config = createSeedConfig(
    safeEnvironment({
      MONGODB_URI: 'mongodb://127.0.0.1:27017/multisports_store',
      DEMO_SEED_DATABASE: 'multisports_store',
    }),
  );

  assert.throws(
    () => assertSeedRuntimeSafety(config),
    (error) => error.code === 'DEMO_SEED_ALLOWED_DATABASE_UNSAFE',
  );
});

test('the locked manifest and complete registry validate', async () => {
  const manifest = await loadAndValidateProductManifest();
  const registry = createSeedRegistry(manifest);
  const ids = registry.entries.map((entry) => entry.idString);

  assert.equal(manifest.products.length, 42);
  assert.equal(registry.counts.users, 8);
  assert.equal(registry.counts.categories, 21);
  assert.equal(registry.counts.products, 42);
  assert.equal(registry.counts.coupons, 8);
  assert.equal(new Set(ids).size, ids.length);
});

test('scenario clock remains stable during one execution', () => {
  const clock = createSeedClock({
    anchorDate: '2026-08-22',
    timeZone: 'Asia/Kolkata',
  });

  assert.equal(clock.anchorDate, '2026-08-22');
  assert.equal(clock.anchorTime.toISOString(), clock.anchorTime.toISOString());
  assert.equal(clock.daysAgo(5).toISOString(), clock.daysAgo(5).toISOString());
  assert.equal(
    clock.monthsAgo(2).toISOString(),
    clock.monthsAgo(2).toISOString(),
  );

  const ordered = clock.orderedTimestamps(3, { stepMilliseconds: 500 });

  assert.deepEqual(
    ordered.map((value) => value.getTime()),
    [
      clock.anchorTime.getTime(),
      clock.anchorTime.getTime() + 500,
      clock.anchorTime.getTime() + 1000,
    ],
  );

  const monthEndClock = createSeedClock({
    anchorDate: '2024-03-31',
    timeZone: 'Asia/Kolkata',
  });

  assert.equal(
    monthEndClock.monthsAgo(1).toISOString(),
    monthEndClock.localDateTime({
      year: 2024,
      month: 2,
      day: 29,
    }).toISOString(),
  );
});
