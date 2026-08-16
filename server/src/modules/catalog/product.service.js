import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import {
  uploadProductImageAsset,
  deleteProductImageAsset,
} from '../../integrations/cloudinary.js';

import { Category } from './category.model.js';
import { Product } from './product.model.js';

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

    basePrice: product.basePrice,

    discountType: product.discountType ?? null,

    discountValue: product.discountValue ?? null,

    specifications: product.specifications ?? {},

    isActive: product.isActive,

    createdAt: product.createdAt,

    updatedAt: product.updatedAt,
  };
}

async function getProductOrThrow(productId) {
  if (!mongoose.isValidObjectId(productId)) {
    throwProductNotFound();
  }

  const product = await Product.findById(productId);

  if (!product) {
    throwProductNotFound();
  }

  return product;
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

  const category = await validateProductCatalogState({
    categoryId: input.categoryId,
    sport: input.sport,
    isActive: input.isActive,
    basePrice: input.basePrice,
    discountType: input.discountType,
    discountValue: input.discountValue,
  });

  const uploadedImages = await uploadProductImages(imageFiles, input.name);

  let product;

  try {
    product = await Product.create({
      ...input,
      images: uploadedImages,
    });
  } catch (error) {
    await cleanupProductImages(
      uploadedImages.map((image) => image.publicId),
      'database save failure',
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