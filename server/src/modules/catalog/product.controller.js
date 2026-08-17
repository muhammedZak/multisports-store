import {
  validateAdminProductQuery,
  validateProductCreateMultipartInput,
  validateProductUpdateInput,
  validateProductStatusInput,
  validateProductImageUpdateInput,
  validateProductVariantCreateInput,
  validateProductVariantUpdateInput,
  validateProductVariantStatusInput,
  validatePublicProductQuery,
  validateCatalogFilterOptionsQuery,
} from './product.validation.js';

import {
  getAdminProducts,
  getAdminProduct,
  createProduct,
  updateProduct,
  updateProductStatus,
  addProductImages,
  updateProductImage,
  deleteProductImage,
  addProductVariant,
  updateProductVariant,
  updateProductVariantStatus,
  getPublicProducts,
  getCatalogFilterOptions,
} from './product.service.js';

export async function getProductsForAdmin(req, res) {
  const query = validateAdminProductQuery(req.query);

  const result = await getAdminProducts(query);

  res.status(200).json({
    success: true,

    data: {
      items: result.items,
    },

    meta: result.meta,
  });
}

export async function getProductForAdmin(req, res) {
  const product = await getAdminProduct(req.params.productId);

  res.status(200).json({
    success: true,

    data: {
      product,
    },
  });
}

export async function createProductForAdmin(req, res) {
  const input = validateProductCreateMultipartInput(req.body);

  const product = await createProduct(input, req.files);

  res.status(201).json({
    success: true,

    data: {
      product,
    },
  });
}

export async function updateProductForAdmin(req, res) {
  const input = validateProductUpdateInput(req.body);

  const product = await updateProduct(req.params.productId, input);

  res.status(200).json({
    success: true,

    data: {
      product,
    },
  });
}

export async function updateProductStatusForAdmin(req, res) {
  const input = validateProductStatusInput(req.body);

  const product = await updateProductStatus(
    req.params.productId,
    input.isActive,
  );

  res.status(200).json({
    success: true,

    data: {
      product,
    },
  });
}

export async function addProductImagesForAdmin(req, res) {
  const product = await addProductImages(req.params.productId, req.files);

  res.status(201).json({
    success: true,

    data: {
      product,
    },
  });
}

export async function updateProductImageForAdmin(req, res) {
  const input = validateProductImageUpdateInput(req.body);

  const product = await updateProductImage(
    req.params.productId,
    req.params.imageId,
    input,
  );

  res.status(200).json({
    success: true,

    data: {
      product,
    },
  });
}

export async function deleteProductImageForAdmin(req, res) {
  await deleteProductImage(req.params.productId, req.params.imageId);

  res.status(204).send();
}

export async function addProductVariantForAdmin(req, res) {
  const input = validateProductVariantCreateInput(req.body);

  const product = await addProductVariant(req.params.productId, input);

  res.status(201).json({
    success: true,

    data: {
      product,
    },
  });
}

export async function updateProductVariantForAdmin(req, res) {
  const input = validateProductVariantUpdateInput(req.body);

  const product = await updateProductVariant(
    req.params.productId,
    req.params.variantId,
    input,
  );

  res.status(200).json({
    success: true,

    data: {
      product,
    },
  });
}

export async function updateProductVariantStatusForAdmin(req, res) {
  const input = validateProductVariantStatusInput(req.body);

  const product = await updateProductVariantStatus(
    req.params.productId,
    req.params.variantId,
    input.isActive,
  );

  res.status(200).json({
    success: true,

    data: {
      product,
    },
  });
}

export async function getProductsForPublic(req, res) {
  const query = validatePublicProductQuery(req.query);

  const result = await getPublicProducts(query);

  res.status(200).json({
    success: true,

    data: {
      items: result.items,
    },

    meta: result.meta,
  });
}

export async function getCatalogFilterOptionsForPublic(req, res) {
  const query = validateCatalogFilterOptionsQuery(req.query);

  const filterOptions = await getCatalogFilterOptions(query);

  res.status(200).json({
    success: true,

    data: filterOptions,
  });
}