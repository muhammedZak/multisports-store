import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { Product } from '../catalog/product.model.js';

import { getCurrentProductPrice } from '../catalog/product.service.js';

import {
  assertProductInventoryStructure,
  getStockState,
} from '../inventory/inventory.service.js';

import { Cart } from './cart.model.js';

const INVENTORY_INTEGRITY_ERROR_CODES = new Set([
  'INVENTORY_MODE_CONFLICT',
  'INVENTORY_NOT_FOUND',
]);

const CART_WRITE_MAX_ATTEMPTS = 5;

function throwProductNotFound() {
  throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
}

function throwVariantNotFound() {
  throw new AppError(404, 'VARIANT_NOT_FOUND', 'Variant not found.');
}

function throwVariantRequired() {
  throw new AppError(
    422,
    'VARIANT_REQUIRED',
    'Select a Product variant before adding this item to the Cart.',
    {
      variantId: 'Select an available Product variant.',
    },
  );
}

function throwVariantNotAllowed() {
  throw new AppError(
    422,
    'VALIDATION_ERROR',
    'Please correct the invalid fields.',
    {
      variantId: 'variantId must be omitted for a simple Product.',
    },
  );
}

function throwCartItemUnavailable(message) {
  throw new AppError(409, 'CART_ITEM_UNAVAILABLE', message);
}

function throwOutOfStock(message) {
  throw new AppError(409, 'OUT_OF_STOCK', message, {
    quantity: 'Reduce the quantity or choose another available item.',
  });
}

function createCartIssue(code, message) {
  return {
    code,
    message,
  };
}

function getPrimaryImage(images = []) {
  const orderedImages = [...images].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );

  const image =
    orderedImages.find((item) => item.isPrimary) ?? orderedImages[0] ?? null;

  if (!image) {
    return null;
  }

  return {
    id: image._id.toString(),
    url: image.url,
    altText: image.altText ?? '',
  };
}

function toCartProductResource(product) {
  return {
    id: product._id.toString(),
    name: product.name,
    brand: product.brand,
    primaryImage: getPrimaryImage(product.images),
  };
}

function toCartVariantResource(variant) {
  if (!variant) {
    return null;
  }

  return {
    id: variant._id.toString(),
    options: variant.options ?? {},
  };
}

function getMissingProductResource(productId) {
  return {
    id: productId.toString(),
    name: null,
    brand: null,
    primaryImage: null,
  };
}

function getMissingVariantResource(variantId) {
  if (!variantId) {
    return null;
  }

  return {
    id: variantId.toString(),
    options: {},
  };
}

function getMatchingInventory(inventories, variant = null) {
  if (!variant) {
    return inventories[0] ?? null;
  }

  const variantId = variant._id.toString();

  return (
    inventories.find(
      (inventory) => inventory.variantId?.toString() === variantId,
    ) ?? null
  );
}

function isInventoryIntegrityError(error) {
  return (
    error instanceof AppError && INVENTORY_INTEGRITY_ERROR_CODES.has(error.code)
  );
}

function assertServiceQuantity(quantity, label) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new TypeError(`${label} must be a non-negative integer.`);
  }
}

function assertRequestedQuantityAvailable(inventory, finalQuantity) {
  if (inventory.quantity === 0) {
    throwOutOfStock('This item is currently out of stock.');
  }

  if (finalQuantity > inventory.quantity) {
    throwOutOfStock('The requested Cart quantity is not currently available.');
  }
}

export function getCartLineIdentity(productId, variantId = null) {
  return `${productId.toString()}:${variantId?.toString() ?? 'simple'}`;
}

function sameObjectId(left, right) {
  if (left === null || left === undefined) {
    return right === null || right === undefined;
  }

  if (right === null || right === undefined) {
    return false;
  }

  return left.toString() === right.toString();
}

function findCartItemByIdentity(cart, productId, variantId = null) {
  return (
    cart.items.find((item) => {
      return (
        sameObjectId(item.productId, productId) &&
        sameObjectId(item.variantId, variantId)
      );
    }) ?? null
  );
}

function getCartIdentityMatch(productId, variantId = null) {
  return {
    productId,
    variantId: variantId ?? null,
  };
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

function throwCartWriteConflict() {
  throw new AppError(
    409,
    'CART_ITEM_UNAVAILABLE',
    'The Cart changed while this item was being added. Please try again.',
  );
}

export async function resolveCartItemForAdd({
  productId,
  variantId = null,
  quantity,
  existingQuantity = 0,
}) {
  if (!mongoose.isValidObjectId(productId)) {
    throwProductNotFound();
  }

  if (
    variantId !== null &&
    variantId !== undefined &&
    !mongoose.isValidObjectId(variantId)
  ) {
    throwVariantNotFound();
  }

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new TypeError('Requested Cart quantity must be a positive integer.');
  }

  assertServiceQuantity(existingQuantity, 'Existing Cart quantity');

  const product = await Product.findById(productId);

  if (!product) {
    throwProductNotFound();
  }

  if (!product.isActive) {
    throwCartItemUnavailable('This Product is no longer available.');
  }

  const variants = product.variants ?? [];

  let variant = null;

  if (variants.length === 0) {
    if (variantId !== null && variantId !== undefined) {
      throwVariantNotAllowed();
    }
  } else {
    if (!variantId) {
      throwVariantRequired();
    }

    variant = product.variants.id(variantId);

    if (!variant) {
      throwVariantNotFound();
    }

    if (!variant.isActive) {
      throwCartItemUnavailable(
        'The selected Product variant is no longer available.',
      );
    }
  }

  /*
   * Inventory remains the authoritative stock owner.
   *
   * This also verifies that:
   * - simple Products have one Product-level Inventory position
   * - Variant Products have valid Variant-level positions
   * - Inventory does not conflict with Product variant structure
   */
  const inventories = await assertProductInventoryStructure(product);

  const inventory = getMatchingInventory(inventories, variant);

  if (!inventory) {
    throwCartItemUnavailable(
      'Inventory availability for this item cannot be confirmed.',
    );
  }

  const finalQuantity = existingQuantity + quantity;

  if (!Number.isSafeInteger(finalQuantity)) {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      'Please correct the invalid fields.',
      {
        quantity: 'Quantity is too large.',
      },
    );
  }

  assertRequestedQuantityAvailable(inventory, finalQuantity);

  return {
    product,

    variant,

    inventory,

    productId: product._id,

    variantId: variant?._id ?? null,

    requestedQuantity: quantity,

    finalQuantity,

    unitPrice: getCurrentProductPrice(product),

    lineIdentity: getCartLineIdentity(product._id, variant?._id ?? null),
  };
}

async function resolveStoredCartItem(cartItem) {
  const issues = [];

  const product = await Product.findById(cartItem.productId);

  /*
   * A Product may have been removed after being placed in the Cart.
   *
   * The Cart Item is not silently deleted. We return enough identity
   * for the frontend to explain that the line is unavailable.
   */
  if (!product) {
    const issue = createCartIssue(
      'CART_ITEM_UNAVAILABLE',
      'This Product is no longer available.',
    );

    return {
      id: cartItem._id.toString(),

      product: getMissingProductResource(cartItem.productId),

      variant: getMissingVariantResource(cartItem.variantId),

      quantity: cartItem.quantity,

      unitPrice: null,

      lineTotal: null,

      availability: {
        stockState: null,
        isAvailable: false,
      },

      issues: [issue],
    };
  }

  if (!product.isActive) {
    issues.push(
      createCartIssue(
        'CART_ITEM_UNAVAILABLE',
        'This Product is currently unavailable.',
      ),
    );
  }

  const variants = product.variants ?? [];

  let variant = null;

  let canResolveInventory = true;

  if (variants.length === 0) {
    /*
     * A simple Product must not have a Variant identity.
     */
    if (cartItem.variantId) {
      issues.push(
        createCartIssue(
          'CART_ITEM_UNAVAILABLE',
          'This Cart Item no longer matches the Product configuration.',
        ),
      );

      canResolveInventory = false;
    }
  } else if (!cartItem.variantId) {
    /*
     * A Variant Product requires a stable embedded Variant identity.
     */
    issues.push(
      createCartIssue(
        'CART_ITEM_UNAVAILABLE',
        'This Cart Item no longer has a valid Product variant.',
      ),
    );

    canResolveInventory = false;
  } else {
    variant = product.variants.id(cartItem.variantId);

    if (!variant) {
      issues.push(
        createCartIssue(
          'CART_ITEM_UNAVAILABLE',
          'The selected Product variant no longer exists.',
        ),
      );

      canResolveInventory = false;
    } else if (!variant.isActive) {
      issues.push(
        createCartIssue(
          'CART_ITEM_UNAVAILABLE',
          'The selected Product variant is currently unavailable.',
        ),
      );
    }
  }

  let inventory = null;

  let stockState = null;

  if (canResolveInventory) {
    try {
      const inventories = await assertProductInventoryStructure(product);

      inventory = getMatchingInventory(inventories, variant);

      if (!inventory) {
        issues.push(
          createCartIssue(
            'CART_ITEM_UNAVAILABLE',
            'Inventory availability for this item cannot be confirmed.',
          ),
        );
      } else {
        stockState = getStockState(inventory.quantity);

        if (inventory.quantity === 0) {
          issues.push(
            createCartIssue(
              'OUT_OF_STOCK',
              'This Cart Item is currently out of stock.',
            ),
          );
        } else if (cartItem.quantity > inventory.quantity) {
          issues.push(
            createCartIssue(
              'CART_ITEM_UNAVAILABLE',
              'The selected Cart quantity is no longer available.',
            ),
          );
        }
      }
    } catch (error) {
      /*
       * Inventory integrity errors must not destroy the Customer's
       * persisted Cart or leak internal Inventory details.
       *
       * Convert the condition into an unavailable Cart line.
       */
      if (!isInventoryIntegrityError(error)) {
        throw error;
      }

      issues.push(
        createCartIssue(
          'CART_ITEM_UNAVAILABLE',
          'Inventory availability for this item cannot be confirmed.',
        ),
      );
    }
  }

  const unitPrice = getCurrentProductPrice(product);

  const lineTotal = unitPrice * cartItem.quantity;

  return {
    id: cartItem._id.toString(),

    product: toCartProductResource(product),

    variant: variant
      ? toCartVariantResource(variant)
      : getMissingVariantResource(cartItem.variantId),

    quantity: cartItem.quantity,

    unitPrice,

    lineTotal,

    availability: {
      stockState,
      isAvailable: issues.length === 0,
    },

    issues,
  };
}

export async function resolveCustomerCart(cart) {
  if (!cart) {
    return {
      id: null,

      items: [],

      pricing: {
        subtotal: 0,
      },

      issues: [],

      canCheckout: false,
    };
  }

  const items = [];

  for (const cartItem of cart.items) {
    items.push(await resolveStoredCartItem(cartItem));
  }

  /*
   * Resolved/priced lines contribute to the current subtotal.
   * A completely missing Product has lineTotal = null.
   *
   * Such a Cart cannot proceed because the line has an issue.
   */
  const subtotal = items.reduce((total, item) => {
    return total + (item.lineTotal ?? 0);
  }, 0);

  const issues = items.flatMap((item) => {
    return item.issues.map((issue) => ({
      cartItemId: item.id,
      ...issue,
    }));
  });

  return {
    id: cart._id.toString(),

    items,

    pricing: {
      subtotal,
    },

    issues,

    canCheckout: items.length > 0 && issues.length === 0,
  };
}

export async function addItemToCustomerCart({
  customerId,
  productId,
  variantId = null,
  quantity,
}) {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new TypeError('A valid Customer ID is required.');
  }

  for (let attempt = 0; attempt < CART_WRITE_MAX_ATTEMPTS; attempt += 1) {
    /*
     * Read only the persisted Cart identity/quantities needed to decide
     * whether this request is a new line or an increment.
     *
     * The actual mutation below is still conditional and atomic.
     */
    const existingCart = await Cart.findOne({
      customerId,
    }).select('_id customerId items appliedCouponId createdAt updatedAt');

    /*
     * First successful Add to Cart creates the Customer's persistent Cart.
     */
    if (!existingCart) {
      const resolvedItem = await resolveCartItemForAdd({
        productId,
        variantId,
        quantity,
        existingQuantity: 0,
      });

      try {
        const createdCart = await Cart.create({
          customerId,

          items: [
            {
              productId: resolvedItem.productId,
              variantId: resolvedItem.variantId,
              quantity,
            },
          ],
        });

        return resolveCustomerCart(createdCart);
      } catch (error) {
        /*
         * Two first-add requests may both observe no Cart.
         *
         * customerId is unique, so only one Cart can actually be created.
         * The losing request retries against the Cart that now exists.
         */
        if (isDuplicateKeyError(error)) {
          continue;
        }

        throw error;
      }
    }

    const persistedVariantId = variantId ?? null;

    const existingItem = findCartItemByIdentity(
      existingCart,
      productId,
      persistedVariantId,
    );

    /*
     * Existing logical line:
     *
     * Re-resolve Product/Variant/Inventory and validate the requested
     * cumulative quantity before attempting the atomic increment.
     */
    if (existingItem) {
      const existingQuantity = existingItem.quantity;

      const resolvedItem = await resolveCartItemForAdd({
        productId,
        variantId,
        quantity,
        existingQuantity,
      });

      /*
       * Optimistic compare-and-update:
       *
       * The mutation succeeds only if this exact Cart Item still has the
       * quantity we just validated.
       *
       * If another request changed it meanwhile, this update matches
       * nothing and we retry with the new authoritative quantity.
       */
      const updatedCart = await Cart.findOneAndUpdate(
        {
          _id: existingCart._id,

          items: {
            $elemMatch: {
              _id: existingItem._id,

              ...getCartIdentityMatch(
                resolvedItem.productId,
                resolvedItem.variantId,
              ),

              quantity: existingQuantity,
            },
          },
        },

        {
          $inc: {
            'items.$.quantity': quantity,
          },
        },

        {
          returnDocument: 'after',
          runValidators: true,
        },
      );

      if (!updatedCart) {
        continue;
      }

      return resolveCustomerCart(updatedCart);
    }

    /*
     * New logical line.
     *
     * Validate Product/Variant/Inventory first.
     */
    const resolvedItem = await resolveCartItemForAdd({
      productId,
      variantId,
      quantity,
      existingQuantity: 0,
    });

    const identityMatch = getCartIdentityMatch(
      resolvedItem.productId,
      resolvedItem.variantId,
    );

    /*
     * Push only while this Product + Variant identity does NOT already
     * exist.
     *
     * This prevents concurrent requests from inserting duplicate lines.
     */
    const updatedCart = await Cart.findOneAndUpdate(
      {
        _id: existingCart._id,

        items: {
          $not: {
            $elemMatch: identityMatch,
          },
        },
      },

      {
        $push: {
          items: {
            productId: resolvedItem.productId,
            variantId: resolvedItem.variantId,
            quantity,
          },
        },
      },

      {
        returnDocument: 'after',
        runValidators: true,
      },
    );

    /*
     * Another request may have inserted this identity after our read.
     * Retry and it will now follow the existing-line $inc path.
     */
    if (!updatedCart) {
      continue;
    }

    return resolveCustomerCart(updatedCart);
  }

  throwCartWriteConflict();
}

export async function getResolvedCustomerCart(customerId) {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new TypeError('A valid Customer ID is required.');
  }

  const cart = await Cart.findOne({
    customerId,
  });

  return resolveCustomerCart(cart);
}
