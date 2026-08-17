import { apiClient } from './client.js';

const PUBLIC_PRODUCT_QUERY_FIELDS = [
  'page',
  'limit',
  'q',
  'sport',
  'categoryId',
  'brand',
  'minPrice',
  'maxPrice',
  'size',
  'color',
  'availability',
  'sort',
  'order',
];

const FILTER_OPTION_QUERY_FIELDS = ['q', 'sport', 'categoryId'];

function createQueryParams(filters, supportedFields) {
  const params = {};

  for (const field of supportedFields) {
    const value = filters[field];

    if (value !== undefined && value !== null && value !== '') {
      params[field] = value;
    }
  }

  return params;
}

export async function fetchPublicProducts(filters = {}) {
  const response = await apiClient.get('/products', {
    params: createQueryParams(filters, PUBLIC_PRODUCT_QUERY_FIELDS),
  });

  return {
    items: response.data.data.items,
    meta: response.data.meta,
  };
}

export async function fetchPublicProduct(productId) {
  const response = await apiClient.get(`/products/${productId}`);

  return response.data.data.product;
}

export async function fetchCatalogFilterOptions(filters = {}) {
  const response = await apiClient.get('/catalog/filter-options', {
    params: createQueryParams(filters, FILTER_OPTION_QUERY_FIELDS),
  });

  return response.data.data;
}

export async function fetchAdminProducts(filters = {}) {
  const params = {};

  const supportedFields = [
    'page',
    'limit',
    'q',
    'sport',
    'categoryId',
    'brand',
    'status',
    'sort',
    'order',
  ];

  for (const field of supportedFields) {
    const value = filters[field];

    if (value !== undefined && value !== null && value !== '') {
      params[field] = value;
    }
  }

  const response = await apiClient.get('/admin/products', {
    params,
  });

  return {
    items: response.data.data.items,
    meta: response.data.meta,
  };
}

export async function fetchAdminProduct(productId) {
  const response = await apiClient.get(`/admin/products/${productId}`);

  return response.data.data.product;
}

export async function createAdminProduct(productData, images) {
  const formData = new FormData();

  formData.append('data', JSON.stringify(productData));

  for (const image of images) {
    formData.append('images', image);
  }

  const response = await apiClient.post('/admin/products', formData);

  return response.data.data.product;
}

export async function updateAdminProduct(productId, payload) {
  const response = await apiClient.patch(
    `/admin/products/${productId}`,
    payload,
  );

  return response.data.data.product;
}

export async function updateAdminProductStatus(productId, isActive) {
  const response = await apiClient.patch(
    `/admin/products/${productId}/status`,
    {
      isActive,
    },
  );

  return response.data.data.product;
}

export async function addAdminProductImages(productId, images) {
  const formData = new FormData();

  for (const image of images) {
    formData.append('images', image);
  }

  const response = await apiClient.post(
    `/admin/products/${productId}/images`,
    formData,
  );

  return response.data.data.product;
}

export async function updateAdminProductImage(productId, imageId, payload) {
  const response = await apiClient.patch(
    `/admin/products/${productId}/images/${imageId}`,
    payload,
  );

  return response.data.data.product;
}

export async function deleteAdminProductImage(productId, imageId) {
  await apiClient.delete(`/admin/products/${productId}/images/${imageId}`);
}

export async function addAdminProductVariant(productId, payload) {
  const response = await apiClient.post(
    `/admin/products/${productId}/variants`,
    payload,
  );

  return response.data.data.product;
}

export async function updateAdminProductVariant(productId, variantId, payload) {
  const response = await apiClient.patch(
    `/admin/products/${productId}/variants/${variantId}`,
    payload,
  );

  return response.data.data.product;
}

export async function updateAdminProductVariantStatus(
  productId,
  variantId,
  isActive,
) {
  const response = await apiClient.patch(
    `/admin/products/${productId}/variants/${variantId}/status`,
    {
      isActive,
    },
  );

  return response.data.data.product;
}
