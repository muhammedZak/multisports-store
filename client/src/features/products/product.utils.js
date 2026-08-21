import { formatInrFromPaise } from '../../utils/money.js';

export function getDiscountLabel(product) {
  if (!product?.discount) {
    return null;
  }

  if (product.discount.type === 'percentage') {
    return `${product.discount.value}% off`;
  }

  if (product.discount.type === 'fixed') {
    return `${formatInrFromPaise(product.discount.value)} off`;
  }

  return null;
}

export function formatProductOptionName(name) {
  if (typeof name !== 'string') {
    return '';
  }

  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getPreferredProductImage(images = []) {
  return images.find((image) => image.isPrimary) ?? images[0] ?? null;
}

export function getCustomerCartErrorMessage(error) {
  if (!error) {
    return null;
  }

  return (
    error.fields?.quantity || error.fields?.variantId || error.message || null
  );
}
