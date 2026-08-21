export const CATALOG_PAGE_LIMIT = 20;

export const EMPTY_FILTER_OPTIONS = {
  brands: [],
  categories: [],
  priceRange: {
    min: null,
    max: null,
  },
  sizes: [],
  colors: [],
  availability: [],
};

export const DEFAULT_META = {
  page: 1,
  limit: CATALOG_PAGE_LIMIT,
  totalItems: 0,
  totalPages: 0,
};

export const SORT_OPTIONS = [
  {
    value: 'createdAt:desc',
    label: 'Newest',
  },
  {
    value: 'price:asc',
    label: 'Price: Low to High',
  },
  {
    value: 'price:desc',
    label: 'Price: High to Low',
  },
  {
    value: 'rating:desc',
    label: 'Rating: High to Low',
  },
  {
    value: 'rating:asc',
    label: 'Rating: Low to High',
  },
];

export const AVAILABILITY_FILTER_OPTIONS = [
  {
    value: 'in_stock',
    label: 'In stock',
  },
  {
    value: 'out_of_stock',
    label: 'Out of stock',
  },
];

export const STOCK_STATE_PRESENTATION = {
  in_stock: {
    label: 'In stock',
    variant: 'success',
  },

  low_stock: {
    label: 'Low stock',
    variant: 'warning',
  },

  out_of_stock: {
    label: 'Out of stock',
    variant: 'danger',
  },
};
