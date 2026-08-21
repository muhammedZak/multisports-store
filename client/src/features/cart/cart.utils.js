export function formatCartOptionName(name) {
  if (typeof name !== 'string') {
    return '';
  }

  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getCartPrimaryImage(images = []) {
  return images.find((image) => image.isPrimary) ?? images[0] ?? null;
}

export function getGuestCartItemKey(item) {
  return `${item.productId}:${item.variantId ?? 'simple'}`;
}

export function resolveGuestCartItem(item, product, requestError) {
  if (!product) {
    return {
      id: getGuestCartItemKey(item),

      product: {
        id: item.productId,
        name: null,
        brand: null,
        primaryImage: null,
      },

      variant: item.variantId
        ? {
            id: item.variantId,
            options: {},
          }
        : null,

      quantity: item.quantity,

      unitPrice: null,

      lineTotal: null,

      availability: {
        stockState: null,
        isAvailable: false,
      },

      issues: [
        {
          message:
            requestError?.message ??
            'Unable to load current information for this item.',
        },
      ],
    };
  }

  const variants = product.variants ?? [];

  const issues = [];

  let variant = null;

  if (requestError) {
    issues.push({
      message:
        requestError.message ??
        'Unable to confirm current information for this item.',
    });
  }

  if (variants.length > 0) {
    if (!item.variantId) {
      issues.push({
        message: 'This cart item no longer has a valid option.',
      });
    } else {
      variant = variants.find((entry) => entry.id === item.variantId) ?? null;

      if (!variant) {
        issues.push({
          message: 'The selected product option is no longer available.',
        });
      }
    }
  } else if (item.variantId) {
    issues.push({
      message: 'This cart item no longer matches the product configuration.',
    });
  }

  const stockState = variant?.stockState ?? product.stockState ?? null;

  if (stockState === 'out_of_stock') {
    issues.push({
      message: 'This cart item is currently out of stock.',
    });
  }

  const unitPrice = Number.isSafeInteger(product.currentPrice)
    ? product.currentPrice
    : null;

  const calculatedLineTotal =
    unitPrice !== null ? unitPrice * item.quantity : null;

  const lineTotal = Number.isSafeInteger(calculatedLineTotal)
    ? calculatedLineTotal
    : null;

  if (unitPrice === null || lineTotal === null) {
    issues.push({
      message: 'Current pricing for this item is unavailable.',
    });
  }

  return {
    id: getGuestCartItemKey(item),

    product: {
      id: product.id,
      name: product.name,
      brand: product.brand,

      primaryImage: getCartPrimaryImage(product.images),
    },

    variant: variant
      ? {
          id: variant.id,
          options: variant.options ?? {},
        }
      : item.variantId
        ? {
            id: item.variantId,
            options: {},
          }
        : null,

    quantity: item.quantity,

    unitPrice,

    lineTotal,

    availability: {
      stockState,

      isAvailable: issues.length === 0,
    },

    issues,
  };
}
