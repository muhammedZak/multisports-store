import { formatInrFromPaise, paiseToRupeesInput } from '../../utils/money.js';

import {
  AVAILABILITY_FILTER_OPTIONS,
  CATALOG_PAGE_LIMIT,
  SORT_OPTIONS,
} from './catalog.constants.js';

function normalizeParam(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getPositiveInteger(value, fallback) {
  const parsedValue = Number(value);

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

function getRupeesValue(paiseValue) {
  if (paiseValue === '') {
    return '';
  }

  const parsedValue = Number(paiseValue);

  if (!Number.isSafeInteger(parsedValue)) {
    return '';
  }

  return paiseToRupeesInput(parsedValue);
}

export function getCatalogQuery(searchParams) {
  return {
    page: getPositiveInteger(searchParams.get('page'), 1),

    limit: CATALOG_PAGE_LIMIT,

    q: normalizeParam(searchParams.get('q')),

    sport: normalizeParam(searchParams.get('sport')),

    categoryId: normalizeParam(searchParams.get('categoryId')),

    brand: normalizeParam(searchParams.get('brand')),

    minPrice: searchParams.get('minPrice') ?? '',

    maxPrice: searchParams.get('maxPrice') ?? '',

    size: normalizeParam(searchParams.get('size')),

    color: normalizeParam(searchParams.get('color')),

    rating: normalizeParam(searchParams.get('rating')),

    availability: normalizeParam(searchParams.get('availability')),

    sort: normalizeParam(searchParams.get('sort')) || 'createdAt',

    order: normalizeParam(searchParams.get('order')) || 'desc',
  };
}

export function createFilterForm(query) {
  return {
    q: query.q,
    sport: query.sport,
    categoryId: query.categoryId,
    brand: query.brand,

    minPrice: getRupeesValue(query.minPrice),

    maxPrice: getRupeesValue(query.maxPrice),

    size: query.size,
    color: query.color,
    rating: query.rating,
    availability: query.availability,
  };
}

export function getSortValue(query) {
  const value = `${query.sort}:${query.order}`;

  const supported = SORT_OPTIONS.some((option) => option.value === value);

  return supported ? value : 'createdAt:desc';
}

export function includeCurrentOption(options, currentValue) {
  if (!currentValue) {
    return options;
  }

  const currentKey = currentValue.toLowerCase();

  const alreadyExists = options.some(
    (option) => option.toLowerCase() === currentKey,
  );

  if (alreadyExists) {
    return options;
  }

  return [currentValue, ...options];
}

export function getCatalogContextLabels({ query, sports, categories }) {
  const sportLabel =
    sports.find((sport) => sport.value === query.sport)?.label ?? query.sport;

  const categoryLabel =
    categories.find((category) => category.id === query.categoryId)?.name ?? '';

  return {
    sportLabel,
    categoryLabel,
  };
}

export function getActiveCatalogFilters({ query, sportLabel, categoryLabel }) {
  const filters = [];

  if (query.q) {
    filters.push({
      key: 'q',
      label: `Search: ${query.q}`,
    });
  }

  if (query.sport) {
    filters.push({
      key: 'sport',
      label: sportLabel,
    });
  }

  if (query.categoryId) {
    filters.push({
      key: 'categoryId',
      label: categoryLabel || 'Selected category',
    });
  }

  if (query.brand) {
    filters.push({
      key: 'brand',
      label: query.brand,
    });
  }

  if (query.minPrice !== '') {
    const value = Number(query.minPrice);

    filters.push({
      key: 'minPrice',

      label: `From ${
        Number.isSafeInteger(value) ? formatInrFromPaise(value) : query.minPrice
      }`,
    });
  }

  if (query.maxPrice !== '') {
    const value = Number(query.maxPrice);

    filters.push({
      key: 'maxPrice',

      label: `Up to ${
        Number.isSafeInteger(value) ? formatInrFromPaise(value) : query.maxPrice
      }`,
    });
  }

  if (query.size) {
    filters.push({
      key: 'size',
      label: `Size ${query.size}`,
    });
  }

  if (query.color) {
    filters.push({
      key: 'color',
      label: query.color,
    });
  }

  if (query.rating) {
    filters.push({
      key: 'rating',
      label: `${query.rating}+ stars`,
    });
  }

  if (query.availability) {
    const availabilityLabel =
      AVAILABILITY_FILTER_OPTIONS.find(
        (option) => option.value === query.availability,
      )?.label ?? query.availability;

    filters.push({
      key: 'availability',

      label: `Availability: ${availabilityLabel}`,
    });
  }

  return filters;
}

export function getCatalogPageTitle({
  mode,
  query,
  sportLabel,
  categoryLabel,
}) {
  if (mode === 'search' && query.q) {
    return `Results for “${query.q}”`;
  }

  return categoryLabel || sportLabel || 'Shop all sports';
}
