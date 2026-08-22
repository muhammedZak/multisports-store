export const ADMIN_PRODUCT_EMPTY_FILTERS = {
  q: '',
  sport: '',
  categoryId: '',
  brand: '',
  status: '',
  sort: 'createdAt',
  order: 'desc',
};

export const ADMIN_PRODUCT_DEFAULT_QUERY = {
  ...ADMIN_PRODUCT_EMPTY_FILTERS,

  page: 1,
  limit: 20,
};

export const ADMIN_PRODUCT_DEFAULT_META = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};

export const ADMIN_PRODUCT_MAX_IMAGES = 5;

export const ADMIN_PRODUCT_MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const ADMIN_PRODUCT_ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const ADMIN_INITIAL_VARIANTS_EXAMPLE = JSON.stringify(
  [
    {
      options: {
        size: '8',
        color: 'Black',
      },

      initialQuantity: 0,

      isActive: true,
    },
  ],

  null,

  2,
);

export const ADMIN_PRODUCT_EMPTY_FORM = {
  name: '',
  description: '',
  brand: '',

  sport: '',
  categoryId: '',

  basePrice: '',

  discountType: '',
  discountValue: '',

  specifications: '{}',

  inventoryMode: 'simple',

  initialQuantity: '0',

  initialVariants: ADMIN_INITIAL_VARIANTS_EXAMPLE,

  isActive: true,
};
