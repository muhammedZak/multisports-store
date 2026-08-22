import { Category } from '../../modules/catalog/category.model.js';
import { Product } from '../../modules/catalog/product.model.js';
import {
  SeedDriftError,
  SeedValidationError,
  withSeedTransaction,
} from './seed.utils.js';

export const CATEGORY_CLASSIFICATIONS = Object.freeze({
  MISSING: 'MISSING',
  EXACT: 'EXACT',
  NATURAL_KEY_CONFLICT: 'NATURAL_KEY_CONFLICT',
  ID_CONFLICT: 'ID_CONFLICT',
  DRIFT: 'DRIFT',
});

const CATEGORY_GROUPS = Object.freeze({
  football: Object.freeze([
    ['balls', 'Balls'],
    ['footwear', 'Footwear'],
    ['training', 'Training'],
  ]),
  cricket: Object.freeze([
    ['bats', 'Bats'],
    ['balls', 'Balls'],
    ['protection', 'Protection'],
  ]),
  basketball: Object.freeze([
    ['balls', 'Balls'],
    ['footwear', 'Footwear'],
    ['training', 'Training'],
  ]),
  tennis: Object.freeze([
    ['racquets', 'Racquets'],
    ['balls', 'Balls'],
    ['accessories', 'Accessories'],
  ]),
  badminton: Object.freeze([
    ['racquets', 'Racquets'],
    ['shuttles', 'Shuttles'],
    ['footwear', 'Footwear'],
  ]),
  running: Object.freeze([
    ['footwear', 'Footwear'],
    ['apparel', 'Apparel'],
    ['accessories', 'Accessories'],
  ]),
  fitness: Object.freeze([
    ['strength', 'Strength'],
    ['yoga', 'Yoga'],
    ['recovery', 'Recovery'],
  ]),
});

export function normalizeCategoryName(name) {
  return name.trim().replace(/\s+/g, ' ');
}

export function createCategoryNameKey(name) {
  return normalizeCategoryName(name).toLowerCase();
}

export const CATEGORY_DEFINITIONS = Object.freeze(
  Object.entries(CATEGORY_GROUPS).flatMap(([sport, entries]) =>
    entries.map(([suffix, name]) =>
      Object.freeze({
        seedKey: `category:${sport}:${suffix}`,
        categoryKey: `${sport}-${suffix}`,
        name,
        nameKey: createCategoryNameKey(name),
        sport,
        isActive: true,
      }),
    ),
  ),
);

function idString(value) {
  return value?.toString();
}

function dateString(value) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function naturalKey(value) {
  return `${value.sport}:${value.nameKey}`;
}

function comparableCategory(value) {
  const source =
    typeof value?.toObject === 'function' ? value.toObject() : value;

  return {
    _id: idString(source?._id),
    name: source?.name,
    nameKey: source?.nameKey,
    sport: source?.sport,
    isActive: source?.isActive,
    createdAt: source?.createdAt ? dateString(source.createdAt) : undefined,
    updatedAt: source?.updatedAt ? dateString(source.updatedAt) : undefined,
  };
}

export function buildExpectedCategories({ registry, clock }) {
  const timestamps = clock.orderedTimestamps(CATEGORY_DEFINITIONS.length, {
    start: clock.atLocalTime(clock.monthsAgo(8), { hour: 9 }),
    stepMilliseconds: 1000,
  });

  return CATEGORY_DEFINITIONS.map((definition, index) => ({
    ...definition,
    _id: registry.idFor(definition.seedKey),
    createdAt: timestamps[index],
    updatedAt: timestamps[index],
  }));
}

export async function validateCategoryDefinitions({
  registry,
  clock,
  manifest,
}) {
  const expectedCategories = buildExpectedCategories({ registry, clock });
  const ids = new Set();
  const naturalKeys = new Set();
  const categoryKeys = new Set();

  if (expectedCategories.length !== 21) {
    throw new SeedValidationError(
      'DEMO_CATEGORY_COUNT_INVALID',
      'Demo Category definitions must contain exactly 21 records.',
    );
  }

  for (const expected of expectedCategories) {
    const id = idString(expected._id);
    const identity = naturalKey(expected);

    if (
      ids.has(id) ||
      naturalKeys.has(identity) ||
      categoryKeys.has(expected.categoryKey)
    ) {
      throw new SeedValidationError(
        'DEMO_CATEGORY_IDENTITY_DUPLICATE',
        'Demo Category definitions contain a duplicate identity.',
      );
    }

    ids.add(id);
    naturalKeys.add(identity);
    categoryKeys.add(expected.categoryKey);

    const document = new Category(expected);
    await document.validate();
  }

  const manifestCategoryKeys = new Set(
    manifest.products.map((product) => product.categoryKey),
  );

  if (
    manifestCategoryKeys.size !== categoryKeys.size ||
    [...manifestCategoryKeys].some((key) => !categoryKeys.has(key)) ||
    [...categoryKeys].some((key) => !manifestCategoryKeys.has(key))
  ) {
    throw new SeedValidationError(
      'DEMO_CATEGORY_MANIFEST_COVERAGE_INVALID',
      'Category definitions and manifest category keys must match exactly.',
    );
  }

  return expectedCategories;
}

export function classifyCategoryRecord({
  expected,
  recordById,
  recordByNaturalKey,
}) {
  if (!recordById && !recordByNaturalKey) {
    return { classification: CATEGORY_CLASSIFICATIONS.MISSING };
  }

  if (recordById && naturalKey(recordById) !== naturalKey(expected)) {
    return { classification: CATEGORY_CLASSIFICATIONS.ID_CONFLICT };
  }

  if (
    recordByNaturalKey &&
    idString(recordByNaturalKey._id) !== idString(expected._id)
  ) {
    return {
      classification: CATEGORY_CLASSIFICATIONS.NATURAL_KEY_CONFLICT,
    };
  }

  const actual = comparableCategory(recordById || recordByNaturalKey);
  const wanted = comparableCategory(expected);
  const driftFields = Object.keys(wanted).filter(
    (field) => actual[field] !== wanted[field],
  );

  if (driftFields.length > 0) {
    return {
      classification: CATEGORY_CLASSIFICATIONS.DRIFT,
      driftFields,
    };
  }

  return { classification: CATEGORY_CLASSIFICATIONS.EXACT };
}

function categoryIdentityQuery(expectedCategories) {
  return {
    $or: [
      { _id: { $in: expectedCategories.map((category) => category._id) } },
      ...expectedCategories.map((category) => ({
        sport: category.sport,
        nameKey: category.nameKey,
      })),
    ],
  };
}

export async function preflightCategories(expectedCategories) {
  const records = await Category.find(
    categoryIdentityQuery(expectedCategories),
  ).lean();
  const byId = new Map(records.map((record) => [idString(record._id), record]));
  const byNaturalKey = new Map(
    records.map((record) => [naturalKey(record), record]),
  );
  const results = expectedCategories.map((expected) => ({
    expected,
    ...classifyCategoryRecord({
      expected,
      recordById: byId.get(idString(expected._id)),
      recordByNaturalKey: byNaturalKey.get(naturalKey(expected)),
    }),
  }));
  const failures = results.filter(
    (result) =>
      ![
        CATEGORY_CLASSIFICATIONS.MISSING,
        CATEGORY_CLASSIFICATIONS.EXACT,
      ].includes(result.classification),
  );

  if (failures.length > 0) {
    throw new SeedDriftError(
      `Category preflight rejected: ${failures
        .map((failure) =>
          `${failure.expected.seedKey}:${failure.classification}`,
        )
        .join(', ')}.`,
    );
  }

  return results;
}

export async function seedCategories({ registry, clock, manifest }) {
  const expectedCategories = await validateCategoryDefinitions({
    registry,
    clock,
    manifest,
  });
  const preflight = await preflightCategories(expectedCategories);
  const missing = preflight.filter(
    (result) => result.classification === CATEGORY_CLASSIFICATIONS.MISSING,
  );

  if (missing.length > 0) {
    try {
      await withSeedTransaction(async (session) => {
        await Category.insertMany(
          missing.map(({ expected }) => ({
            _id: expected._id,
            name: expected.name,
            nameKey: expected.nameKey,
            sport: expected.sport,
            isActive: expected.isActive,
            createdAt: expected.createdAt,
            updatedAt: expected.updatedAt,
          })),
          { ordered: true, session },
        );
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new SeedValidationError(
          'DEMO_CATEGORY_DUPLICATE_KEY',
          'A concurrent write created a Category ID or natural-key conflict.',
        );
      }

      throw error;
    }
  }

  const postflight = await preflightCategories(expectedCategories);

  if (
    postflight.some(
      (result) => result.classification !== CATEGORY_CLASSIFICATIONS.EXACT,
    )
  ) {
    throw new SeedValidationError(
      'DEMO_CATEGORY_POSTFLIGHT_FAILED',
      'Category post-write verification did not find 21 exact records.',
    );
  }

  return {
    expectedCategories,
    created: missing.length,
    skipped: expectedCategories.length - missing.length,
  };
}

export function exactCategoryOwnershipFilter(expectedCategories) {
  if (
    !Array.isArray(expectedCategories) ||
    expectedCategories.length < 1 ||
    expectedCategories.length > 21
  ) {
    throw new SeedValidationError(
      'DEMO_CATEGORY_RESET_SCOPE_INVALID',
      'Category reset requires one to 21 preflighted identities.',
    );
  }

  return {
    $or: expectedCategories.map((category) => ({
      _id: category._id,
      sport: category.sport,
      nameKey: category.nameKey,
    })),
  };
}

export async function resetCategories({ registry, clock, manifest }) {
  const expectedCategories = await validateCategoryDefinitions({
    registry,
    clock,
    manifest,
  });
  const preflight = await preflightCategories(expectedCategories);
  const existing = preflight.filter(
    (result) => result.classification === CATEGORY_CLASSIFICATIONS.EXACT,
  );

  if (existing.length === 0) {
    return { deleted: 0 };
  }

  const existingIds = existing.map((result) => result.expected._id);
  const referencedCategory = await Product.exists({
    categoryId: { $in: existingIds },
  });

  if (referencedCategory) {
    throw new SeedValidationError(
      'DEMO_CATEGORY_RESET_PRODUCT_DEPENDENCY',
      'Category reset is blocked because a Product references a seeded Category.',
    );
  }

  let deleted = 0;

  await withSeedTransaction(async (session) => {
    const result = await Category.deleteMany(
      exactCategoryOwnershipFilter(
        existing.map((preflightResult) => preflightResult.expected),
      ),
      { session },
    );
    deleted = result.deletedCount;

    if (deleted !== existing.length) {
      throw new SeedValidationError(
        'DEMO_CATEGORY_RESET_COUNT_MISMATCH',
        'Category reset did not delete the exact preflighted set.',
      );
    }
  });

  return { deleted };
}

export function demoCategoryIdentityQuery(expectedCategories) {
  return categoryIdentityQuery(expectedCategories);
}
