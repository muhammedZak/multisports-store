import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import {
  uploadProductImageAsset,
  deleteProductImageAsset,
} from '../../integrations/cloudinary.js';

import { Category } from './category.model.js';
import { Product } from './product.model.js';

import { STOCK_STATES } from '../inventory/inventory.constants.js';

import {
  assertProductInventoryStructure,
  createInitialInventoryForProduct,
  createInitialInventoryForVariant,
  getPublicProductAvailabilities,
} from '../inventory/inventory.service.js';

import { isSupportedSport } from './catalog.constants.js';

import { validateProductDiscountState } from './product.validation.js';

function throwCategoryNotFound() {
  throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
}

function throwCategorySportMismatch() {
  throw new AppError(
    422,
    'CATEGORY_SPORT_MISMATCH',
    'The selected category does not belong to the selected sport.',
    {
      categoryId: 'Select a category that belongs to the product sport.',
    },
  );
}

function throwInactiveCategory() {
  throw new AppError(
    422,
    'VALIDATION_ERROR',
    'Please correct the invalid fields.',
    {
      categoryId: 'An active product must belong to an active category.',
    },
  );
}

function throwProductNotFound() {
  throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
}

function throwProductImageRequired(status = 422) {
  throw new AppError(
    status,
    'PRODUCT_IMAGE_REQUIRED',
    'At least one product image is required.',
  );
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toCategorySummary(category) {
  if (!category) {
    return null;
  }

  return {
    id: category._id.toString(),
    name: category.name,
    sport: category.sport,
    isActive: category.isActive,
  };
}

function toImageResource(image) {
  return {
    id: image._id.toString(),
    url: image.url,
    altText: image.altText,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
  };
}

function toVariantResource(variant) {
  return {
    id: variant._id.toString(),
    options: variant.options ?? {},
    isActive: variant.isActive,
  };
}

function normalizeVariantComparisonPart(value) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function getNormalizedVariantKey(options) {
  const normalizedEntries = Object.entries(options)
    .map(([optionName, optionValue]) => [
      normalizeVariantComparisonPart(optionName),
      normalizeVariantComparisonPart(optionValue),
    ])
    .sort(([leftName], [rightName]) => leftName.localeCompare(rightName));

  return JSON.stringify(normalizedEntries);
}

function ensureVariantOptionsUnique(
  product,
  options,
  excludedVariantId = null,
) {
  const targetKey = getNormalizedVariantKey(options);

  const duplicateVariant = product.variants.some((variant) => {
    if (
      excludedVariantId &&
      variant._id.toString() === excludedVariantId.toString()
    ) {
      return false;
    }

    return getNormalizedVariantKey(variant.options) === targetKey;
  });

  if (duplicateVariant) {
    throwDuplicateVariant();
  }
}

function getSortedImages(images = []) {
  return [...images].sort((left, right) => left.sortOrder - right.sortOrder);
}

function getPrimaryImage(images = []) {
  const sortedImages = getSortedImages(images);

  const image = sortedImages.find((item) => item.isPrimary) ?? sortedImages[0];

  if (!image) {
    return null;
  }

  return {
    id: image._id.toString(),
    url: image.url,
    altText: image.altText,
  };
}

function toAdminProductListItem(product) {
  return {
    id: product._id.toString(),

    name: product.name,

    brand: product.brand,

    sport: product.sport,

    category: toCategorySummary(product.categoryId),

    primaryImage: getPrimaryImage(product.images),

    basePrice: product.basePrice,

    discountType: product.discountType ?? null,

    discountValue: product.discountValue ?? null,

    isActive: product.isActive,

    createdAt: product.createdAt,

    updatedAt: product.updatedAt,
  };
}

function toAdminProductResource(product, category = null) {
  const categoryResource =
    category ?? (product.categoryId?.name ? product.categoryId : null);

  return {
    id: product._id.toString(),

    name: product.name,

    description: product.description,

    brand: product.brand,

    sport: product.sport,

    category: toCategorySummary(categoryResource),

    images: getSortedImages(product.images).map(toImageResource),

    variants: (product.variants ?? []).map(toVariantResource),

    basePrice: product.basePrice,

    discountType: product.discountType ?? null,

    discountValue: product.discountValue ?? null,

    specifications: product.specifications ?? {},

    isActive: product.isActive,

    createdAt: product.createdAt,

    updatedAt: product.updatedAt,
  };
}

async function getProductOrThrow(productId, session = null) {
  if (!mongoose.isValidObjectId(productId)) {
    throwProductNotFound();
  }

  let query = Product.findById(productId);

  if (session) {
    query = query.session(session);
  }

  const product = await query;

  if (!product) {
    throwProductNotFound();
  }

  return product;
}

function getProductVariantOrThrow(product, variantId) {
  if (!mongoose.isValidObjectId(variantId)) {
    throwVariantNotFound();
  }

  const variant = product.variants.id(variantId);

  if (!variant) {
    throwVariantNotFound();
  }

  return variant;
}

async function cleanupProductImages(publicIds, reason) {
  for (const publicId of publicIds) {
    try {
      await deleteProductImageAsset(publicId);
    } catch (error) {
      console.error(`Product image cleanup failed (${reason}):`, error);
    }
  }
}

async function uploadProductImages(files, productName) {
  if (!Array.isArray(files) || files.length === 0) {
    throwProductImageRequired();
  }

  const uploadedImages = [];

  try {
    for (let index = 0; index < files.length; index += 1) {
      const asset = await uploadProductImageAsset(files[index].buffer);

      uploadedImages.push({
        publicId: asset.publicId,
        url: asset.url,
        altText: productName,
        isPrimary: index === 0,
        sortOrder: index,
      });
    }

    return uploadedImages;
  } catch (error) {
    await cleanupProductImages(
      uploadedImages.map((image) => image.publicId),
      'partial initial upload failure',
    );

    throw error;
  }
}

function throwProductImageNotFound() {
  throw new AppError(
    404,
    'PRODUCT_IMAGE_NOT_FOUND',
    'Product image not found.',
  );
}

function throwInvalidProductImageUpload() {
  throw new AppError(
    422,
    'INVALID_IMAGE',
    'Upload at least one product image.',
  );
}

function getProductImageOrThrow(product, imageId) {
  if (!mongoose.isValidObjectId(imageId)) {
    throwProductImageNotFound();
  }

  const image = product.images.id(imageId);

  if (!image) {
    throwProductImageNotFound();
  }

  return image;
}

function normalizeProductImageOrder(images) {
  const orderedImages = getSortedImages(images);

  orderedImages.forEach((image, index) => {
    image.sortOrder = index;
  });

  return orderedImages;
}

function ensureProductHasPrimaryImage(images) {
  if (images.length === 0) {
    return;
  }

  const hasPrimary = images.some((image) => image.isPrimary);

  if (hasPrimary) {
    return;
  }

  const [firstImage] = getSortedImages(images);

  firstImage.isPrimary = true;
}

function moveProductImageToSortOrder(images, image, targetSortOrder) {
  const orderedImages = getSortedImages(images);

  const maximumSortOrder = orderedImages.length - 1;

  if (targetSortOrder > maximumSortOrder) {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      'Please correct the invalid fields.',
      {
        sortOrder: `Image sort order must be between 0 and ${maximumSortOrder}.`,
      },
    );
  }

  const currentIndex = orderedImages.findIndex((item) =>
    item._id.equals(image._id),
  );

  orderedImages.splice(currentIndex, 1);

  orderedImages.splice(targetSortOrder, 0, image);

  orderedImages.forEach((item, index) => {
    item.sortOrder = index;
  });
}

async function uploadAdditionalProductImageAssets(
  files,
  productName,
  startingSortOrder,
) {
  if (!Array.isArray(files) || files.length === 0) {
    throwInvalidProductImageUpload();
  }

  const uploadedImages = [];

  try {
    for (let index = 0; index < files.length; index += 1) {
      const asset = await uploadProductImageAsset(files[index].buffer);

      uploadedImages.push({
        publicId: asset.publicId,
        url: asset.url,
        altText: productName,
        isPrimary: false,
        sortOrder: startingSortOrder + index,
      });
    }

    return uploadedImages;
  } catch (error) {
    await cleanupProductImages(
      uploadedImages.map((image) => image.publicId),
      'partial additional product image upload failure',
    );

    throw error;
  }
}

function throwVariantNotFound() {
  throw new AppError(404, 'VARIANT_NOT_FOUND', 'Variant not found.');
}

function throwDuplicateVariant() {
  throw new AppError(
    409,
    'DUPLICATE_VARIANT',
    'A variant with the same option combination already exists.',
    {
      options: 'Use a different variant option combination.',
    },
  );
}

function throwVariantInventoryModeConflict() {
  throw new AppError(
    409,
    'INVENTORY_MODE_CONFLICT',
    'An established simple Product cannot receive its first Variant without an inventory-mode migration.',
  );
}

async function getPopulatedAdminProductResource(product) {
  await product.populate('categoryId', 'name sport isActive');

  return toAdminProductResource(product);
}

async function ensureFilterCategoryIntegrity({ categoryId, sport }) {
  if (!categoryId) {
    return;
  }

  const category = await Category.findById(categoryId);

  if (!category) {
    throwCategoryNotFound();
  }

  if (sport && category.sport !== sport) {
    throwCategorySportMismatch();
  }
}

export async function ensureProductCategoryIntegrity({
  categoryId,
  sport,
  isActive,
}) {
  const category = await Category.findById(categoryId);

  if (!category) {
    throwCategoryNotFound();
  }

  if (category.sport !== sport) {
    throwCategorySportMismatch();
  }

  if (isActive && !category.isActive) {
    throwInactiveCategory();
  }

  return category;
}

export async function validateProductCatalogState({
  categoryId,
  sport,
  isActive,
  basePrice,
  discountType,
  discountValue,
}) {
  validateProductDiscountState({
    basePrice,
    discountType,
    discountValue,
  });

  return ensureProductCategoryIntegrity({
    categoryId,
    sport,
    isActive,
  });
}

export async function getAdminProducts({
  page,
  limit,
  q,
  sport,
  categoryId,
  brand,
  status,
  sort,
  order,
}) {
  await ensureFilterCategoryIntegrity({
    categoryId,
    sport,
  });

  const filter = {};

  if (q) {
    filter.$text = {
      $search: q,
    };
  }

  if (sport) {
    filter.sport = sport;
  }

  if (categoryId) {
    filter.categoryId = categoryId;
  }

  if (brand) {
    filter.brand = {
      $regex: `^${escapeRegex(brand)}$`,
      $options: 'i',
    };
  }

  if (status === 'active') {
    filter.isActive = true;
  }

  if (status === 'inactive') {
    filter.isActive = false;
  }

  const direction = order === 'asc' ? 1 : -1;

  const sortDefinition = {
    [sort]: direction,
    _id: direction,
  };

  const skip = (page - 1) * limit;

  const [products, totalItems] = await Promise.all([
    Product.find(filter)
      .select(
        [
          'name',
          'brand',
          'sport',
          'categoryId',
          'images',
          'basePrice',
          'discountType',
          'discountValue',
          'isActive',
          'createdAt',
          'updatedAt',
        ].join(' '),
      )
      .populate('categoryId', 'name sport isActive')
      .sort(sortDefinition)
      .skip(skip)
      .limit(limit),

    Product.countDocuments(filter),
  ]);

  return {
    items: products.map(toAdminProductListItem),

    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

export async function getAdminProduct(productId) {
  if (!mongoose.isValidObjectId(productId)) {
    throwProductNotFound();
  }

  const product = await Product.findById(productId).populate(
    'categoryId',
    'name sport isActive',
  );

  if (!product) {
    throwProductNotFound();
  }

  return toAdminProductResource(product);
}

export async function createProduct(input, imageFiles) {
  if (!Array.isArray(imageFiles) || imageFiles.length === 0) {
    throwProductImageRequired();
  }

  const {
    initialQuantity,
    variants: requestedVariants,
    ...productInput
  } = input;

  const category = await validateProductCatalogState({
    categoryId: productInput.categoryId,
    sport: productInput.sport,
    isActive: productInput.isActive,
    basePrice: productInput.basePrice,
    discountType: productInput.discountType,
    discountValue: productInput.discountValue,
  });

  const uploadedImages = await uploadProductImages(
    imageFiles,
    productInput.name,
  );

  const productVariants = Array.isArray(requestedVariants)
    ? requestedVariants.map((variant) => ({
        options: variant.options,
        isActive: variant.isActive,
      }))
    : [];

  let product;

  try {
    await mongoose.connection.transaction(async (session) => {
      [product] = await Product.create(
        [
          {
            ...productInput,
            images: uploadedImages,
            variants: productVariants,
          },
        ],
        {
          session,
        },
      );

      await createInitialInventoryForProduct({
        product,
        initialQuantity,
        variantInitialQuantities: Array.isArray(requestedVariants)
          ? requestedVariants.map((variant) => variant.initialQuantity)
          : undefined,
        session,
      });
    });
  } catch (error) {
    await cleanupProductImages(
      uploadedImages.map((image) => image.publicId),
      'product and initial inventory transaction failure',
    );

    throw error;
  }

  return toAdminProductResource(product, category);
}

export async function updateProduct(productId, changes) {
  const product = await getProductOrThrow(productId);

  const normalizedChanges = {
    ...changes,
  };

  if (
    Object.prototype.hasOwnProperty.call(changes, 'discountType') &&
    changes.discountType === null &&
    !Object.prototype.hasOwnProperty.call(changes, 'discountValue')
  ) {
    normalizedChanges.discountValue = null;
  }

  const nextState = {
    categoryId: normalizedChanges.categoryId ?? product.categoryId,

    sport: normalizedChanges.sport ?? product.sport,

    isActive: product.isActive,

    basePrice: normalizedChanges.basePrice ?? product.basePrice,

    discountType: Object.prototype.hasOwnProperty.call(
      normalizedChanges,
      'discountType',
    )
      ? normalizedChanges.discountType
      : product.discountType,

    discountValue: Object.prototype.hasOwnProperty.call(
      normalizedChanges,
      'discountValue',
    )
      ? normalizedChanges.discountValue
      : product.discountValue,
  };

  const category = await validateProductCatalogState(nextState);

  for (const [field, value] of Object.entries(normalizedChanges)) {
    product[field] = value;
  }

  await product.save();

  return toAdminProductResource(product, category);
}

export async function updateProductStatus(productId, isActive) {
  const product = await getProductOrThrow(productId);

  let category = null;

  if (isActive) {
    if (!Array.isArray(product.images) || product.images.length === 0) {
      throwProductImageRequired(409);
    }

    category = await validateProductCatalogState({
      categoryId: product.categoryId,
      sport: product.sport,
      isActive: true,
      basePrice: product.basePrice,
      discountType: product.discountType,
      discountValue: product.discountValue,
    });

     await assertProductInventoryStructure(product);
  } else {
    category = await Category.findById(product.categoryId);
  }

  product.isActive = isActive;

  await product.save();

  return toAdminProductResource(product, category);
}

export async function addProductImages(productId, imageFiles) {
  const product = await getProductOrThrow(productId);

  normalizeProductImageOrder(product.images);

  const startingSortOrder = product.images.length;

  const uploadedImages = await uploadAdditionalProductImageAssets(
    imageFiles,
    product.name,
    startingSortOrder,
  );

  for (const uploadedImage of uploadedImages) {
    product.images.push(uploadedImage);
  }

  ensureProductHasPrimaryImage(product.images);

  try {
    await product.save();
  } catch (error) {
    await cleanupProductImages(
      uploadedImages.map((image) => image.publicId),
      'additional product image database save failure',
    );

    throw error;
  }

  return getPopulatedAdminProductResource(product);
}

export async function updateProductImage(productId, imageId, changes) {
  const product = await getProductOrThrow(productId);

  const image = getProductImageOrThrow(product, imageId);

  if (Object.prototype.hasOwnProperty.call(changes, 'altText')) {
    image.altText = changes.altText;
  }

  if (changes.isPrimary === true) {
    for (const productImage of product.images) {
      productImage.isPrimary = productImage._id.equals(image._id);
    }
  }

  if (Object.prototype.hasOwnProperty.call(changes, 'sortOrder')) {
    moveProductImageToSortOrder(product.images, image, changes.sortOrder);
  }

  await product.save();

  return getPopulatedAdminProductResource(product);
}

export async function deleteProductImage(productId, imageId) {
  const product = await getProductOrThrow(productId);

  const image = getProductImageOrThrow(product, imageId);

  if (product.images.length === 1) {
    throwProductImageRequired(409);
  }

  const publicId = image.publicId;
  const wasPrimary = image.isPrimary;

  product.images.pull(image._id);

  const orderedImages = normalizeProductImageOrder(product.images);

  if (wasPrimary) {
    for (const remainingImage of orderedImages) {
      remainingImage.isPrimary = false;
    }

    orderedImages[0].isPrimary = true;
  } else {
    ensureProductHasPrimaryImage(product.images);
  }

  await product.save();

  try {
    await deleteProductImageAsset(publicId);
  } catch (error) {
    console.error(
      'Product image Cloudinary cleanup failed after database deletion:',
      error,
    );
  }
}

export async function addProductVariant(productId, input) {
  await mongoose.connection.transaction(async (session) => {
    const product = await getProductOrThrow(productId, session);

    /*
     * A Product with no embedded Variants is an established
     * simple-Inventory Product.
     *
     * Converting it to Variant Inventory is outside this MVP.
     */
    if (product.variants.length === 0) {
      throwVariantInventoryModeConflict();
    }

    /*
     * Before extending an existing Variant Product, make sure
     * its current Product ↔ Variant ↔ Inventory structure
     * is already valid.
     */
    await assertProductInventoryStructure(product, {
      session,
    });

    ensureVariantOptionsUnique(product, input.options);

    product.variants.push({
      options: input.options,
      isActive: input.isActive,
    });

    const newVariant = product.variants[product.variants.length - 1];

    await product.save({
      session,
    });

    await createInitialInventoryForVariant({
      productId: product._id,
      variantId: newVariant._id,
      initialQuantity: input.initialQuantity,
      session,
    });
  });

  return getAdminProduct(productId);
}

export async function updateProductVariant(productId, variantId, changes) {
  const product = await getProductOrThrow(productId);

  const variant = getProductVariantOrThrow(product, variantId);

  await assertProductInventoryStructure(product);

  ensureVariantOptionsUnique(product, changes.options, variant._id);

  variant.options = changes.options;

  await product.save();

  return getPopulatedAdminProductResource(product);
}

export async function updateProductVariantStatus(
  productId,
  variantId,
  isActive,
) {
  const product = await getProductOrThrow(productId);

  const variant = getProductVariantOrThrow(product, variantId);

  if (isActive) {
    ensureVariantOptionsUnique(product, variant.options, variant._id);

    /*
     * Reactivation is only safe when every required
     * Inventory relationship is intact.
     *
     * Quantity may still be zero.
     */
    await assertProductInventoryStructure(product);
  }

  variant.isActive = isActive;

  await product.save();

  return getPopulatedAdminProductResource(product);
}

function normalizePublicCatalogValue(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function getCurrentProductPrice(product) {
  if (
    product.discountType === 'percentage' &&
    Number.isInteger(product.discountValue)
  ) {
    return Math.round(
      (product.basePrice * (100 - product.discountValue)) / 100,
    );
  }

  if (
    product.discountType === 'fixed' &&
    Number.isInteger(product.discountValue)
  ) {
    return product.basePrice - product.discountValue;
  }

  return product.basePrice;
}

function getPublicPrimaryImage(images = []) {
  const sortedImages = [...images].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );

  const image = sortedImages.find((item) => item.isPrimary) ?? sortedImages[0];

  if (!image) {
    return null;
  }

  return {
    url: image.url,
    altText: image.altText ?? '',
  };
}

function toPublicCategorySummary(category) {
  if (!category) {
    return null;
  }

  return {
    id: category._id.toString(),
    name: category.name,
  };
}

function toPublicProductListItem(product, availability) {
  const currentPrice = getCurrentProductPrice(product);

  return {
    id: product._id.toString(),

    name: product.name,

    brand: product.brand,

    sport: product.sport,

    category: toPublicCategorySummary(product.categoryId),

    primaryImage: getPublicPrimaryImage(product.images),

    basePrice: product.basePrice,

    currentPrice,

    discount: product.discountType
      ? {
          type: product.discountType,
          value: product.discountValue,
        }
      : null,

    stockState: availability.stockState,
  };
}

function toPublicProductImage(image) {
  return {
    id: image._id.toString(),
    url: image.url,
    altText: image.altText ?? '',
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
  };
}

function getPublicProductImages(images = []) {
  return [...images]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(toPublicProductImage);
}

function toPublicProductVariant(variant, stockState) {
  return {
    id: variant._id.toString(),
    options: variant.options ?? {},
    stockState,
  };
}

function toPublicProductResource(product, availability) {
  const currentPrice = getCurrentProductPrice(product);

  return {
    id: product._id.toString(),

    name: product.name,

    description: product.description,

    brand: product.brand,

    sport: product.sport,

    category: toPublicCategorySummary(product.categoryId),

    images: getPublicProductImages(product.images),

    basePrice: product.basePrice,

    currentPrice,

    discount: product.discountType
      ? {
          type: product.discountType,
          value: product.discountValue,
        }
      : null,

    specifications: product.specifications ?? {},

    stockState: availability.stockState,

    variants: (product.variants ?? [])
      .filter((variant) => variant.isActive)
      .map((variant) => {
        const variantId = variant._id.toString();

        return toPublicProductVariant(
          variant,
          availability.variantStockStates[variantId],
        );
      }),
  };
}

export async function getPublicProduct(productId) {
  if (!mongoose.isValidObjectId(productId)) {
    throwProductNotFound();
  }

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  })
    .select(
      [
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
      ].join(' '),
    )
    .populate('categoryId', 'name sport isActive')
    .lean();

  if (
    !product ||
    !product.categoryId ||
    !product.categoryId.isActive ||
    product.categoryId.sport !== product.sport
  ) {
    throwProductNotFound();
  }

  const availabilityByProductId = await getPublicProductAvailabilities([
    product,
  ]);

  const availability = availabilityByProductId.get(product._id.toString());

  return toPublicProductResource(product, availability);
}

async function ensurePublicFilterCategoryIntegrity({ categoryId, sport }) {
  if (!categoryId) {
    return null;
  }

  const category = await Category.findById(categoryId)
    .select('name nameKey sport isActive')
    .lean();

  // Public catalog does not reveal inactive Categories.
  if (!category || !category.isActive) {
    throwCategoryNotFound();
  }

  if (sport && category.sport !== sport) {
    throwCategorySportMismatch();
  }

  return category;
}

async function resolvePublicSearchContext({ q, sport, categoryId }) {
  let resolvedSport = sport;

  let resolvedCategoryIds = categoryId ? [categoryId] : null;

  let textSearch = q;

  if (!q) {
    return {
      sport: resolvedSport,
      categoryIds: resolvedCategoryIds,
      textSearch,
    };
  }

  const normalizedQuery = normalizePublicCatalogValue(q);

  // Exact Sport terms become the structured Sport filter.
  if (
    isSupportedSport(normalizedQuery) &&
    (!resolvedSport || resolvedSport === normalizedQuery)
  ) {
    resolvedSport = normalizedQuery;
    textSearch = undefined;
  }

  // If the Customer has not already selected a Category,
  // an exact active Category name may become a Category filter.
  if (!categoryId && textSearch) {
    const categoryFilter = {
      nameKey: normalizedQuery,
      isActive: true,
    };

    if (resolvedSport) {
      categoryFilter.sport = resolvedSport;
    }

    const matchingCategories = await Category.find(categoryFilter)
      .select('_id')
      .lean();

    if (matchingCategories.length > 0) {
      resolvedCategoryIds = matchingCategories.map((category) =>
        category._id.toString(),
      );

      textSearch = undefined;
    }
  }

  return {
    sport: resolvedSport,
    categoryIds: resolvedCategoryIds,
    textSearch,
  };
}

async function getPublicProductCandidates({ q, sport, categoryId, brand }) {
  const selectedCategory = await ensurePublicFilterCategoryIntegrity({
    categoryId,
    sport,
  });

  const searchContext = await resolvePublicSearchContext({
    q,
    sport,
    categoryId,
  });

  // q may itself have resolved to a Sport.
  if (
    selectedCategory &&
    searchContext.sport &&
    selectedCategory.sport !== searchContext.sport
  ) {
    throwCategorySportMismatch();
  }

  const categoryFilter = {
    isActive: true,
  };

  if (searchContext.sport) {
    categoryFilter.sport = searchContext.sport;
  }

  if (searchContext.categoryIds) {
    categoryFilter._id = {
      $in: searchContext.categoryIds,
    };
  }

  const activeCategories = await Category.find(categoryFilter)
    .select('_id')
    .lean();

  const activeCategoryIds = activeCategories.map((category) => category._id);

  if (activeCategoryIds.length === 0) {
    return [];
  }

  const productFilter = {
    isActive: true,

    categoryId: {
      $in: activeCategoryIds,
    },
  };

  if (searchContext.sport) {
    productFilter.sport = searchContext.sport;
  }

  if (searchContext.textSearch) {
    productFilter.$text = {
      $search: searchContext.textSearch,
    };
  }

  if (brand) {
    productFilter.brand = {
      $regex: `^${escapeRegex(brand)}$`,
      $options: 'i',
    };
  }

  const products = await Product.find(productFilter)
    .select(
      [
        'name',
        'brand',
        'sport',
        'categoryId',
        'images',
        'variants',
        'basePrice',
        'discountType',
        'discountValue',
        'createdAt',
      ].join(' '),
    )
    .populate('categoryId', 'name sport isActive')
    .lean();

  // Extra defensive check in case catalog data was manually corrupted.
  return products.filter((product) => {
    return (
      product.categoryId &&
      product.categoryId.isActive &&
      product.categoryId.sport === product.sport
    );
  });
}

function getNormalizedVariantOption(options, optionName) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    return null;
  }

  const targetName = normalizePublicCatalogValue(optionName);

  for (const [name, value] of Object.entries(options)) {
    if (normalizePublicCatalogValue(name) === targetName) {
      return normalizePublicCatalogValue(value);
    }
  }

  return null;
}

function productMatchesVariantFilters(product, { size, color }) {
  if (!size && !color) {
    return true;
  }

  const normalizedSize = size ? normalizePublicCatalogValue(size) : null;

  const normalizedColor = color ? normalizePublicCatalogValue(color) : null;

  return (product.variants ?? []).some((variant) => {
    if (!variant.isActive) {
      return false;
    }

    const variantSize = getNormalizedVariantOption(variant.options, 'size');

    const variantColor = getNormalizedVariantOption(variant.options, 'color');

    if (normalizedSize && variantSize !== normalizedSize) {
      return false;
    }

    if (normalizedColor && variantColor !== normalizedColor) {
      return false;
    }

    return true;
  });
}

function productMatchesPriceFilters(product, { minPrice, maxPrice }) {
  const currentPrice = getCurrentProductPrice(product);

  if (minPrice !== undefined && currentPrice < minPrice) {
    return false;
  }

  if (maxPrice !== undefined && currentPrice > maxPrice) {
    return false;
  }

  return true;
}

function productMatchesAvailabilityFilter(stockState, availability) {
  if (!availability) {
    return true;
  }

  /*
   * Public "in_stock" means the Product is purchasable.
   *
   * Both normal stock and low stock are therefore included.
   */
  if (availability === 'in_stock') {
    return (
      stockState === STOCK_STATES.IN_STOCK ||
      stockState === STOCK_STATES.LOW_STOCK
    );
  }

  return stockState === STOCK_STATES.OUT_OF_STOCK;
}

function sortPublicProducts(products, { sort, order }) {
  const direction = order === 'asc' ? 1 : -1;

  return [...products].sort((left, right) => {
    let comparison = 0;

    if (sort === 'price') {
      comparison = getCurrentProductPrice(left) - getCurrentProductPrice(right);
    } else {
      comparison =
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime();
    }

    if (comparison !== 0) {
      return comparison * direction;
    }

    return left._id.toString().localeCompare(right._id.toString()) * direction;
  });
}

export async function getPublicProducts({
  page,
  limit,
  q,
  sport,
  categoryId,
  brand,
  minPrice,
  maxPrice,
  size,
  color,
  availability,
  sort,
  order,
}) {
  const candidates = await getPublicProductCandidates({
    q,
    sport,
    categoryId,
    brand,
  });

  /*
   * Apply filters that do not require Inventory first.
   *
   * This means we avoid loading Inventory for Products already
   * excluded by price or Variant-option filters.
   */
  const catalogFilteredProducts = candidates.filter((product) => {
    return (
      productMatchesPriceFilters(product, {
        minPrice,
        maxPrice,
      }) &&
      productMatchesVariantFilters(product, {
        size,
        color,
      })
    );
  });

  /*
   * One batch Inventory query for all remaining Products.
   *
   * The same availability data is needed even when the Customer
   * has not selected an availability filter because every public
   * Product card now exposes stockState.
   */
  const availabilityByProductId = await getPublicProductAvailabilities(
    catalogFilteredProducts,
  );

  /*
   * Availability must be filtered before sorting/pagination so
   * pagination metadata describes the actual filtered collection.
   */
  const filteredProducts = catalogFilteredProducts.filter((product) => {
    const productAvailability = availabilityByProductId.get(
      product._id.toString(),
    );

    return productMatchesAvailabilityFilter(
      productAvailability.stockState,
      availability,
    );
  });

  const sortedProducts = sortPublicProducts(filteredProducts, {
    sort,
    order,
  });

  const totalItems = sortedProducts.length;

  const startIndex = (page - 1) * limit;

  const paginatedProducts = sortedProducts.slice(
    startIndex,
    startIndex + limit,
  );

  return {
    items: paginatedProducts.map((product) => {
      const productAvailability = availabilityByProductId.get(
        product._id.toString(),
      );

      return toPublicProductListItem(product, productAvailability);
    }),

    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

function addUniqueCatalogOption(map, value) {
  if (typeof value !== 'string') {
    return;
  }

  const normalizedValue = normalizePublicCatalogValue(value);

  if (!normalizedValue || map.has(normalizedValue)) {
    return;
  }

  map.set(normalizedValue, value.trim().replace(/\s+/g, ' '));
}

function sortCatalogOptionValues(values) {
  return [...values].sort((left, right) =>
    left.localeCompare(right, undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  );
}

export async function getCatalogFilterOptions({ q, sport, categoryId }) {
  const products = await getPublicProductCandidates({
    q,
    sport,
    categoryId,
  });

  const availabilityByProductId =
    await getPublicProductAvailabilities(products);

  const brandMap = new Map();

  const sizeMap = new Map();

  const colorMap = new Map();

  const categoryMap = new Map();

  const prices = [];

  const availabilityStates = new Set();

  for (const product of products) {

    const productAvailability = availabilityByProductId.get(
      product._id.toString(),
    );

    if (productAvailability.stockState === STOCK_STATES.OUT_OF_STOCK) {
      availabilityStates.add('out_of_stock');
    } else {
      /*
       * low_stock is still publicly purchasable and therefore belongs
       * to the public in_stock availability filter.
       */
      availabilityStates.add('in_stock');
    }

    addUniqueCatalogOption(brandMap, product.brand);

    prices.push(getCurrentProductPrice(product));

    if (product.categoryId) {
      categoryMap.set(product.categoryId._id.toString(), {
        id: product.categoryId._id.toString(),
        name: product.categoryId.name,
      });
    }

    for (const variant of product.variants ?? []) {
      if (!variant.isActive) {
        continue;
      }

      for (const [optionName, optionValue] of Object.entries(
        variant.options ?? {},
      )) {
        const normalizedOptionName = normalizePublicCatalogValue(optionName);

        if (normalizedOptionName === 'size') {
          addUniqueCatalogOption(sizeMap, optionValue);
        }

        if (normalizedOptionName === 'color') {
          addUniqueCatalogOption(colorMap, optionValue);
        }
      }
    }
  }

  const categories = [...categoryMap.values()].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, {
      sensitivity: 'base',
    }),
  );

  return {
    brands: sortCatalogOptionValues(brandMap.values()),

    categories,

    priceRange: {
      min: prices.length > 0 ? Math.min(...prices) : null,
      max: prices.length > 0 ? Math.max(...prices) : null,
    },

    sizes: sortCatalogOptionValues(sizeMap.values()),

    colors: sortCatalogOptionValues(colorMap.values()),

    availability: ['in_stock', 'out_of_stock'].filter((value) =>
      availabilityStates.has(value),
    ),
  };
}
