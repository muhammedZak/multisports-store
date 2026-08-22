import fs from 'node:fs/promises';
import path from 'node:path';

import { Cart } from '../../modules/cart/cart.model.js';
import { Product } from '../../modules/catalog/product.model.js';
import { Inventory } from '../../modules/inventory/inventory.model.js';
import { Order } from '../../modules/order/order.model.js';
import { Payment } from '../../modules/payment/payment.model.js';
import { Review } from '../../modules/review/review.model.js';
import {
  SeedDriftError,
  SeedValidationError,
  withSeedTransaction,
} from './seed.utils.js';
import { PRODUCT_MANIFEST_PATH } from './seed.validation.js';

export const PRODUCT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

export const PRODUCT_CLASSIFICATIONS = Object.freeze({
  MISSING: 'MISSING',
  EXACT: 'EXACT',
  ID_CONFLICT: 'ID_CONFLICT',
  DRIFT: 'DRIFT',
});

function idString(value) {
  return value?.toString();
}

function dateString(value) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function stableObject(value) {
  return Object.fromEntries(
    Object.entries(value || {}).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
}

function comparableVariants(variants = []) {
  return variants.map((variant) => ({
    _id: idString(variant._id),
    options: stableObject(variant.options),
    isActive: variant.isActive,
  }));
}

function comparableImages(images = []) {
  return images.map((image) => ({
    _id: idString(image._id),
    altText: image.altText,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
  }));
}

function comparableProduct(value) {
  const source =
    typeof value?.toObject === 'function' ? value.toObject() : value;

  return {
    _id: idString(source?._id),
    name: source?.name,
    description: source?.description,
    brand: source?.brand,
    sport: source?.sport,
    categoryId: idString(source?.categoryId),
    images: comparableImages(source?.images),
    variants: comparableVariants(source?.variants),
    basePrice: source?.basePrice,
    discountType: source?.discountType ?? null,
    discountValue: source?.discountValue ?? null,
    specifications: stableObject(source?.specifications),
    isActive: source?.isActive,
    createdAt: source?.createdAt ? dateString(source.createdAt) : undefined,
    updatedAt: source?.updatedAt ? dateString(source.updatedAt) : undefined,
  };
}

export function buildExpectedPersistedProducts({ definitions, clock }) {
  const timestamps = clock.orderedTimestamps(definitions.length, {
    start: clock.atLocalTime(clock.monthsAgo(7), { hour: 9 }),
    stepMilliseconds: 1000,
  });

  return definitions.map((definition, index) => ({
    ...definition,
    createdAt: timestamps[index],
    updatedAt: timestamps[index],
  }));
}

export function validateCloudinaryImageMetadata(
  image,
  productImageFolder,
) {
  const publicIdPrefix = `${productImageFolder}/`;

  if (
    typeof image?.publicId !== 'string' ||
    !image.publicId.startsWith(publicIdPrefix) ||
    image.publicId.length <= publicIdPrefix.length
  ) {
    return false;
  }

  if (typeof image.url !== 'string' || image.url.length === 0) {
    return false;
  }

  try {
    return new URL(image.url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function classifyProductRecord({
  expected,
  existingRecord,
  productImageFolder,
}) {
  if (!existingRecord) {
    return { classification: PRODUCT_CLASSIFICATIONS.MISSING };
  }

  if (
    existingRecord.name !== expected.name ||
    existingRecord.sport !== expected.sport ||
    idString(existingRecord.categoryId) !== idString(expected.categoryId)
  ) {
    return { classification: PRODUCT_CLASSIFICATIONS.ID_CONFLICT };
  }

  const actual = comparableProduct(existingRecord);
  const wanted = comparableProduct(expected);
  const driftFields = Object.keys(wanted).filter(
    (field) => JSON.stringify(actual[field]) !== JSON.stringify(wanted[field]),
  );
  const actualImages = existingRecord.images || [];

  if (
    actualImages.length !== expected.images.length ||
    actualImages.some(
      (image) =>
        !validateCloudinaryImageMetadata(image, productImageFolder),
    )
  ) {
    driftFields.push('images.cloudinary');
  }

  if (driftFields.length > 0) {
    return {
      classification: PRODUCT_CLASSIFICATIONS.DRIFT,
      driftFields: [...new Set(driftFields)],
    };
  }

  return { classification: PRODUCT_CLASSIFICATIONS.EXACT };
}

export function missingProductResults(preflightResults) {
  return preflightResults.filter(
    (result) => result.classification === PRODUCT_CLASSIFICATIONS.MISSING,
  );
}

export function cloudinaryPermissionIsRequired(preflightResults) {
  return missingProductResults(preflightResults).length > 0;
}

export async function preflightProducts({
  expectedProducts,
  productImageFolder,
}) {
  const records = await Product.find({
    _id: { $in: expectedProducts.map((product) => product._id) },
  }).lean();
  const byId = new Map(records.map((record) => [idString(record._id), record]));
  const results = expectedProducts.map((expected) => ({
    expected,
    existingRecord: byId.get(idString(expected._id)),
    ...classifyProductRecord({
      expected,
      existingRecord: byId.get(idString(expected._id)),
      productImageFolder,
    }),
  }));
  const failures = results.filter(
    (result) =>
      ![
        PRODUCT_CLASSIFICATIONS.MISSING,
        PRODUCT_CLASSIFICATIONS.EXACT,
      ].includes(result.classification),
  );

  if (failures.length > 0) {
    throw new SeedDriftError(
      `Product preflight rejected: ${failures
        .map((failure) =>
          `${failure.expected.seedKey}:${failure.classification}`,
        )
        .join(', ')}.`,
    );
  }

  const existingPublicIds = results
    .filter((result) => result.classification === PRODUCT_CLASSIFICATIONS.EXACT)
    .flatMap((result) =>
      result.existingRecord.images.map((image) => image.publicId),
    );

  if (new Set(existingPublicIds).size !== existingPublicIds.length) {
    throw new SeedDriftError(
      'Exact seeded Products contain duplicate Cloudinary public IDs.',
    );
  }

  return results;
}

function isWebP(buffer) {
  return (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  );
}

export async function verifyRequiredProductAssets(
  missingResults,
  { assetsRoot = path.dirname(PRODUCT_MANIFEST_PATH) } = {},
) {
  const files = [];
  const seenManifestPaths = new Set();
  const approvedRoot = path.resolve(assetsRoot);

  for (const result of missingResults) {
    for (const image of [...result.expected.images].sort(
      (left, right) => left.sortOrder - right.sortOrder,
    )) {
      if (seenManifestPaths.has(image.file)) {
        throw new SeedValidationError(
          'DEMO_PRODUCT_IMAGE_PATH_DUPLICATE',
          'Required Product image paths must be unique before upload.',
        );
      }

      seenManifestPaths.add(image.file);

      const resolvedPath = path.resolve(approvedRoot, image.file);
      const relativePath = path.relative(approvedRoot, resolvedPath);

      if (
        relativePath.startsWith('..') ||
        path.isAbsolute(relativePath) ||
        path.extname(resolvedPath).toLowerCase() !== '.webp'
      ) {
        throw new SeedValidationError(
          'DEMO_PRODUCT_IMAGE_PATH_UNSAFE',
          `Product ${result.expected.seedKey} has an unsafe image path.`,
        );
      }

      let stats;
      let buffer;

      try {
        stats = await fs.stat(resolvedPath);
        buffer = await fs.readFile(resolvedPath);
      } catch {
        throw new SeedValidationError(
          'DEMO_PRODUCT_IMAGE_MISSING',
          `A required image for ${result.expected.seedKey} is missing.`,
        );
      }

      if (
        !stats.isFile() ||
        stats.size <= 0 ||
        stats.size > PRODUCT_IMAGE_MAX_SIZE ||
        !isWebP(buffer)
      ) {
        throw new SeedValidationError(
          'DEMO_PRODUCT_IMAGE_INVALID',
          `A required image for ${result.expected.seedKey} failed integrity checks.`,
        );
      }

      files.push({
        productSeedKey: result.expected.seedKey,
        productId: result.expected._id,
        imageId: image._id,
        sortOrder: image.sortOrder,
        buffer,
      });
    }
  }

  return files;
}

export async function uploadRequiredProductAssets({
  verifiedFiles,
  uploadAsset,
  productImageFolder,
  uploadedAssets = [],
}) {
  for (const file of verifiedFiles) {
    const asset = await uploadAsset(file.buffer);

    if (!validateCloudinaryImageMetadata(asset, productImageFolder)) {
      throw new SeedValidationError(
        'DEMO_PRODUCT_CLOUDINARY_RESULT_INVALID',
        'Cloudinary returned invalid Product image metadata.',
      );
    }

    uploadedAssets.push({
      productSeedKey: file.productSeedKey,
      productId: file.productId,
      imageId: file.imageId,
      sortOrder: file.sortOrder,
      publicId: asset.publicId,
      url: asset.url,
    });
  }

  return uploadedAssets;
}

export async function cleanupCurrentRunUploads(uploadedAssets, deleteAsset) {
  const cleanup = { attempted: 0, deleted: 0, failed: 0 };

  for (const asset of uploadedAssets) {
    cleanup.attempted += 1;

    try {
      await deleteAsset(asset.publicId);
      cleanup.deleted += 1;
    } catch {
      cleanup.failed += 1;
    }
  }

  return cleanup;
}

export function buildFinalProductPayloads({ missingResults, uploadedAssets }) {
  const uploadedByImageId = new Map(
    uploadedAssets.map((asset) => [idString(asset.imageId), asset]),
  );

  return missingResults.map(({ expected }) => ({
    _id: expected._id,
    name: expected.name,
    description: expected.description,
    brand: expected.brand,
    sport: expected.sport,
    categoryId: expected.categoryId,
    images: expected.images.map((image) => {
      const asset = uploadedByImageId.get(idString(image._id));

      if (!asset) {
        throw new SeedValidationError(
          'DEMO_PRODUCT_IMAGE_UPLOAD_MISSING',
          `Product ${expected.seedKey} is missing uploaded image metadata.`,
        );
      }

      return {
        _id: image._id,
        publicId: asset.publicId,
        url: asset.url,
        altText: image.altText,
        isPrimary: image.isPrimary,
        sortOrder: image.sortOrder,
      };
    }),
    variants: expected.variants.map((variant) => ({
      _id: variant._id,
      options: variant.options,
      isActive: variant.isActive,
    })),
    basePrice: expected.basePrice,
    discountType: expected.discountType,
    discountValue: expected.discountValue,
    specifications: expected.specifications,
    isActive: expected.isActive,
    createdAt: expected.createdAt,
    updatedAt: expected.updatedAt,
  }));
}

export async function validateFinalProductPayloads({
  payloads,
  productImageFolder,
}) {
  const allowedFields = new Set([
    '_id',
    'name',
    'description',
    'brand',
    'sport',
    'categoryId',
    'images',
    'variants',
    'basePrice',
    'discountType',
    'discountValue',
    'specifications',
    'isActive',
    'createdAt',
    'updatedAt',
  ]);
  const imageIds = [];
  const variantIds = [];
  const publicIds = [];

  for (const payload of payloads) {
    if (Object.keys(payload).some((field) => !allowedFields.has(field))) {
      throw new SeedValidationError(
        'DEMO_PRODUCT_PAYLOAD_FIELD_INVALID',
        'Final Product payload contains a seed-only field.',
      );
    }

    if (
      payload.images.length !== 2 ||
      payload.images.filter((image) => image.isPrimary).length !== 1 ||
      payload.images.some(
        (image) =>
          !validateCloudinaryImageMetadata(image, productImageFolder),
      )
    ) {
      throw new SeedValidationError(
        'DEMO_PRODUCT_FINAL_IMAGES_INVALID',
        'Final Product payload contains invalid image metadata.',
      );
    }

    imageIds.push(...payload.images.map((image) => idString(image._id)));
    variantIds.push(
      ...payload.variants.map((variant) => idString(variant._id)),
    );
    publicIds.push(...payload.images.map((image) => image.publicId));

    const document = new Product(payload);
    await document.validate();

    if (
      document.images.some(
        (image, index) =>
          idString(image._id) !== idString(payload.images[index]._id),
      ) ||
      document.variants.some(
        (variant, index) =>
          idString(variant._id) !== idString(payload.variants[index]._id),
      )
    ) {
      throw new SeedValidationError(
        'DEMO_PRODUCT_EMBEDDED_ID_CHANGED',
        'Product validation did not preserve deterministic embedded IDs.',
      );
    }
  }

  const identifiers = [
    ['image IDs', imageIds],
    ['variant IDs', variantIds],
    ['Cloudinary public IDs', publicIds],
  ];

  for (const [label, values] of identifiers) {
    if (new Set(values).size !== values.length) {
      throw new SeedValidationError(
        'DEMO_PRODUCT_IDENTIFIER_DUPLICATE',
        `Final Product payloads contain duplicate ${label}.`,
      );
    }
  }

  return payloads;
}

function compensationError(error, uploadedCount, cleanup) {
  const cleanupMessage =
    `Uploaded before failure: ${uploadedCount}. ` +
    `Cleanup deleted: ${cleanup.deleted}; failed: ${cleanup.failed}.`;

  return new SeedValidationError(
    cleanup.failed > 0
      ? 'DEMO_PRODUCT_COMPENSATION_INCOMPLETE'
      : 'DEMO_PRODUCT_SEED_COMPENSATED',
    `Product seed failed before a successful commit. ${cleanupMessage} Cause: ${error.code || error.name || 'unknown'}.`,
  );
}

export async function seedProducts({
  definitions,
  clock,
  productImageFolder,
  assertUploadAllowed,
  uploadAsset,
  deleteAsset,
}) {
  const expectedProducts = buildExpectedPersistedProducts({
    definitions,
    clock,
  });
  const preflight = await preflightProducts({
    expectedProducts,
    productImageFolder,
  });
  const missing = missingProductResults(preflight);

  if (missing.length === 0) {
    return {
      expectedProducts,
      created: 0,
      skipped: expectedProducts.length,
      uploaded: 0,
      cleanup: { attempted: 0, deleted: 0, failed: 0 },
    };
  }

  assertUploadAllowed();

  const verifiedFiles = await verifyRequiredProductAssets(missing);
  const uploadedAssets = [];
  let committed = false;

  try {
    await uploadRequiredProductAssets({
      verifiedFiles,
      uploadAsset,
      productImageFolder,
      uploadedAssets,
    });

    const payloads = buildFinalProductPayloads({
      missingResults: missing,
      uploadedAssets,
    });

    await validateFinalProductPayloads({ payloads, productImageFolder });

    try {
      await withSeedTransaction(async (session) => {
        await Product.insertMany(payloads, { ordered: true, session });
      });
      committed = true;
    } catch (error) {
      if (error?.code === 11000) {
        throw new SeedValidationError(
          'DEMO_PRODUCT_DUPLICATE_KEY',
          'A concurrent write created a deterministic Product ID conflict.',
        );
      }

      throw error;
    }
  } catch (error) {
    if (!committed) {
      const cleanup = await cleanupCurrentRunUploads(
        uploadedAssets,
        deleteAsset,
      );
      throw compensationError(error, uploadedAssets.length, cleanup);
    }

    throw error;
  }

  const postflight = await preflightProducts({
    expectedProducts,
    productImageFolder,
  });

  if (
    postflight.some(
      (result) => result.classification !== PRODUCT_CLASSIFICATIONS.EXACT,
    )
  ) {
    throw new SeedValidationError(
      'DEMO_PRODUCT_POSTFLIGHT_FAILED',
      'Product post-write verification did not find 42 exact records.',
    );
  }

  return {
    expectedProducts,
    created: missing.length,
    skipped: expectedProducts.length - missing.length,
    uploaded: uploadedAssets.length,
    cleanup: { attempted: 0, deleted: 0, failed: 0 },
  };
}

export function exactProductOwnershipFilter(expectedProducts) {
  if (
    !Array.isArray(expectedProducts) ||
    expectedProducts.length < 1 ||
    expectedProducts.length > 42
  ) {
    throw new SeedValidationError(
      'DEMO_PRODUCT_RESET_SCOPE_INVALID',
      'Product reset requires one to 42 preflighted identities.',
    );
  }

  return {
    $or: expectedProducts.map((product) => ({
      _id: product._id,
      name: product.name,
      sport: product.sport,
      categoryId: product.categoryId,
    })),
  };
}

export async function findProductResetDependencies(productIds) {
  const checks = await Promise.all([
    Inventory.exists({ productId: { $in: productIds } }),
    Cart.exists({ 'items.productId': { $in: productIds } }),
    Review.exists({ productId: { $in: productIds } }),
    Order.exists({ 'items.productId': { $in: productIds } }),
    Payment.exists({
      'checkoutSnapshot.items.productId': { $in: productIds },
    }),
  ]);
  const names = ['Inventory', 'Cart', 'Review', 'Order', 'Payment'];

  return names.filter((name, index) => Boolean(checks[index]));
}

export function assertNoProductResetDependencies(dependencies) {
  if (dependencies.length > 0) {
    throw new SeedValidationError(
      'DEMO_PRODUCT_RESET_DEPENDENCY',
      `Product reset is blocked by: ${dependencies.join(', ')}.`,
    );
  }
}

export async function resetProducts({
  definitions,
  clock,
  productImageFolder,
  assertCloudinaryMutationAllowed,
  deleteAsset,
}) {
  const expectedProducts = buildExpectedPersistedProducts({
    definitions,
    clock,
  });
  const preflight = await preflightProducts({
    expectedProducts,
    productImageFolder,
  });
  const existing = preflight.filter(
    (result) => result.classification === PRODUCT_CLASSIFICATIONS.EXACT,
  );

  if (existing.length === 0) {
    return { deleted: 0, cloudinaryDeleted: 0 };
  }

  const productIds = existing.map((result) => result.expected._id);
  const dependencies = await findProductResetDependencies(productIds);
  assertNoProductResetDependencies(dependencies);

  const publicIds = existing.flatMap((result) =>
    result.existingRecord.images.map((image) => image.publicId),
  );
  assertCloudinaryMutationAllowed();
  let cloudinaryDeleted = 0;

  for (const publicId of publicIds) {
    try {
      await deleteAsset(publicId);
      cloudinaryDeleted += 1;
    } catch {
      throw new SeedValidationError(
        'DEMO_PRODUCT_RESET_CLOUDINARY_FAILED',
        `Product reset stopped after ${cloudinaryDeleted} Cloudinary deletions; Product documents were not deleted.`,
      );
    }
  }

  let deleted = 0;

  await withSeedTransaction(async (session) => {
    const result = await Product.deleteMany(
      exactProductOwnershipFilter(
        existing.map((preflightResult) => preflightResult.expected),
      ),
      { session },
    );
    deleted = result.deletedCount;

    if (deleted !== existing.length) {
      throw new SeedValidationError(
        'DEMO_PRODUCT_RESET_COUNT_MISMATCH',
        'Product reset did not delete the exact preflighted set.',
      );
    }
  });

  return { deleted, cloudinaryDeleted };
}
