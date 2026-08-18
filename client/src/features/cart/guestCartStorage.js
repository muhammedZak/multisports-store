export const GUEST_CART_STORAGE_KEY = 'multisports_guest_cart';

const GUEST_CART_STORAGE_VERSION = 1;

function getStorage() {
  try {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeId(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue || null;
}

function hasSameIdentity(firstItem, secondItem) {
  return (
    firstItem.productId === secondItem.productId &&
    (firstItem.variantId ?? null) === (secondItem.variantId ?? null)
  );
}

export function sanitizeGuestCartItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return null;
  }

  const productId = normalizeId(item.productId);

  if (!productId) {
    return null;
  }

  if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
    return null;
  }

  const sanitizedItem = {
    productId,
    quantity: item.quantity,
  };

  if (item.variantId !== undefined && item.variantId !== null) {
    const variantId = normalizeId(item.variantId);

    if (!variantId) {
      return null;
    }

    sanitizedItem.variantId = variantId;
  }

  return sanitizedItem;
}

function sanitizeGuestCartItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const sanitizedItems = [];

  for (const item of items) {
    const sanitizedItem = sanitizeGuestCartItem(item);

    if (!sanitizedItem) {
      continue;
    }

    const existingItem = sanitizedItems.find((candidateItem) =>
      hasSameIdentity(candidateItem, sanitizedItem),
    );

    if (!existingItem) {
      sanitizedItems.push(sanitizedItem);
      continue;
    }

    const mergedQuantity = existingItem.quantity + sanitizedItem.quantity;

    if (!Number.isSafeInteger(mergedQuantity)) {
      continue;
    }

    existingItem.quantity = mergedQuantity;
  }

  return sanitizedItems;
}

export function loadGuestCartItems() {
  const storage = getStorage();

  if (!storage) {
    return [];
  }

  try {
    const storedValue = storage.getItem(GUEST_CART_STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);

    if (
      parsedValue?.version !== GUEST_CART_STORAGE_VERSION ||
      !Array.isArray(parsedValue.items)
    ) {
      return [];
    }

    return sanitizeGuestCartItems(parsedValue.items);
  } catch {
    return [];
  }
}

export function saveGuestCartItems(items) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    const sanitizedItems = sanitizeGuestCartItems(items);

    if (sanitizedItems.length === 0) {
      storage.removeItem(GUEST_CART_STORAGE_KEY);

      return;
    }

    storage.setItem(
      GUEST_CART_STORAGE_KEY,
      JSON.stringify({
        version: GUEST_CART_STORAGE_VERSION,
        items: sanitizedItems,
      }),
    );
  } catch {
    // localStorage is best-effort browser persistence.
  }
}
