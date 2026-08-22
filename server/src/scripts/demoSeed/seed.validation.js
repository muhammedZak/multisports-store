import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SPORT_VALUES } from '../../modules/catalog/catalog.constants.js';
import {
  assertSeedRuntimeSafety,
  createSeedConfig,
} from './seed.config.js';
import { createSeedClock } from './seed.clock.js';
import { createSeedRegistry } from './seed.registry.js';
import {
  SeedValidationError,
  assertCollectionCountsUnchanged,
  connectSeedDatabase,
  disconnectSeedDatabase,
  snapshotCollectionCounts,
} from './seed.utils.js';

const CURRENT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));

export const PRODUCT_MANIFEST_PATH = path.resolve(
  CURRENT_DIRECTORY,
  '../../../seed-assets/product-images/manifest.json',
);

function requireText(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new SeedValidationError(
      'DEMO_SEED_MANIFEST_INVALID',
      `Product manifest field ${fieldName} is required.`,
    );
  }
}

export async function loadAndValidateProductManifest(
  manifestPath = PRODUCT_MANIFEST_PATH,
) {
  let manifest;

  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch (error) {
    throw new SeedValidationError(
      'DEMO_SEED_MANIFEST_UNREADABLE',
      `Product manifest could not be read: ${error.message}`,
    );
  }

  if (!Array.isArray(manifest.products) || manifest.products.length !== 42) {
    throw new SeedValidationError(
      'DEMO_SEED_MANIFEST_PRODUCT_COUNT',
      'Product manifest must contain exactly 42 Products.',
    );
  }

  const seedKeys = [];
  const slugs = [];
  const imagePaths = [];
  const manifestRoot = path.dirname(manifestPath);

  for (const product of manifest.products) {
    for (const field of [
      'seedKey',
      'name',
      'slug',
      'sport',
      'categoryKey',
      'productType',
    ]) {
      requireText(product[field], field);
    }

    if (!SPORT_VALUES.includes(product.sport)) {
      throw new SeedValidationError(
        'DEMO_SEED_MANIFEST_SPORT_INVALID',
        `Unsupported Product sport: ${product.sport}.`,
      );
    }

    if (!['simple', 'variant'].includes(product.productType)) {
      throw new SeedValidationError(
        'DEMO_SEED_MANIFEST_PRODUCT_TYPE_INVALID',
        `Unsupported Product type for ${product.seedKey}.`,
      );
    }

    if (typeof product.active !== 'boolean') {
      throw new SeedValidationError(
        'DEMO_SEED_MANIFEST_ACTIVE_INVALID',
        `Product activity must be boolean for ${product.seedKey}.`,
      );
    }

    if (!Array.isArray(product.images) || product.images.length !== 2) {
      throw new SeedValidationError(
        'DEMO_SEED_MANIFEST_IMAGE_COUNT',
        `Product ${product.seedKey} must define exactly two images.`,
      );
    }

    seedKeys.push(product.seedKey);
    slugs.push(`${product.sport}:${product.slug}`);

    for (const image of product.images) {
      requireText(image.file, 'images.file');
      requireText(image.altText, 'images.altText');

      if (
        typeof image.isPrimary !== 'boolean' ||
        !Number.isInteger(image.sortOrder)
      ) {
        throw new SeedValidationError(
          'DEMO_SEED_MANIFEST_IMAGE_INVALID',
          `Product ${product.seedKey} contains invalid image metadata.`,
        );
      }

      if (path.extname(image.file).toLowerCase() !== '.webp') {
        throw new SeedValidationError(
          'DEMO_SEED_MANIFEST_IMAGE_FORMAT',
          `Product ${product.seedKey} must reference WebP images.`,
        );
      }

      const resolvedFile = path.resolve(manifestRoot, image.file);

      if (!resolvedFile.startsWith(`${manifestRoot}${path.sep}`)) {
        throw new SeedValidationError(
          'DEMO_SEED_MANIFEST_IMAGE_PATH_UNSAFE',
          `Product ${product.seedKey} contains an unsafe image path.`,
        );
      }

      try {
        const stats = await fs.stat(resolvedFile);

        if (!stats.isFile()) {
          throw new Error('not a file');
        }
      } catch {
        throw new SeedValidationError(
          'DEMO_SEED_MANIFEST_IMAGE_MISSING',
          `Manifest image is missing: ${image.file}.`,
        );
      }

      imagePaths.push(image.file);
    }

    const primary = product.images.filter((image) => image.isPrimary);
    const secondary = product.images.filter((image) => !image.isPrimary);

    if (
      primary.length !== 1 ||
      primary[0].sortOrder !== 0 ||
      secondary.length !== 1 ||
      secondary[0].sortOrder !== 1
    ) {
      throw new SeedValidationError(
        'DEMO_SEED_MANIFEST_IMAGE_ORDER_INVALID',
        `Product ${product.seedKey} has invalid primary/secondary ordering.`,
      );
    }
  }

  if (new Set(seedKeys).size !== seedKeys.length) {
    throw new SeedValidationError(
      'DEMO_SEED_MANIFEST_SEED_KEY_DUPLICATE',
      'Product manifest seed keys must be unique.',
    );
  }

  if (new Set(slugs).size !== slugs.length) {
    throw new SeedValidationError(
      'DEMO_SEED_MANIFEST_SLUG_DUPLICATE',
      'Product manifest sport/slug identities must be unique.',
    );
  }

  if (imagePaths.length !== 84 || new Set(imagePaths).size !== 84) {
    throw new SeedValidationError(
      'DEMO_SEED_MANIFEST_IMAGE_PATH_DUPLICATE',
      'Product manifest must contain exactly 84 unique image paths.',
    );
  }

  const representedSports = new Set(
    manifest.products.map((product) => product.sport),
  );

  if (
    representedSports.size !== SPORT_VALUES.length ||
    SPORT_VALUES.some((sport) => !representedSports.has(sport))
  ) {
    throw new SeedValidationError(
      'DEMO_SEED_MANIFEST_SPORT_COVERAGE',
      'Product manifest must represent all supported sports.',
    );
  }

  return manifest;
}

export async function verifySeedFoundation({ mode }) {
  const { config, manifest, registry, clock } =
    await createSeedFoundationContext();

  let connection;

  try {
    connection = await connectSeedDatabase(config);
    const before = await snapshotCollectionCounts(connection);

    // Foundation mode intentionally performs no model imports or writes.
    const after = await snapshotCollectionCounts(connection);
    assertCollectionCountsUnchanged(before, after);

    console.log('Demo Seed');
    console.log(`Database: ${connection.db.databaseName}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(
      `Manifest: ${manifest.products.length} products / ${manifest.products.length * 2} images`,
    );
    console.log(`Registry: valid (${registry.entries.length} reserved IDs)`);
    console.log(`Anchor date: ${clock.anchorDate} (${clock.timeZone})`);
    console.log(`Mode: ${mode}`);
    console.log('Database writes: 0');

    return { config, manifest, registry, clock, collectionCounts: before };
  } finally {
    await disconnectSeedDatabase();
  }
}

export async function createSeedFoundationContext() {
  const config = assertSeedRuntimeSafety(createSeedConfig());
  const manifest = await loadAndValidateProductManifest();
  const registry = createSeedRegistry(manifest);
  const clock = createSeedClock({
    anchorDate: config.anchorDate,
    timeZone: config.appTimezone,
  });

  return { config, manifest, registry, clock };
}
