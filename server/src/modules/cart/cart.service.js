import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { Product } from '../catalog/product.model.js';

import { getCurrentProductPrice } from '../catalog/product.service.js';

import {
  assertProductInventoryStructure,
  getStockState,
} from '../inventory/inventory.service.js';

import { Cart } from './cart.model.js';

import {
  resolveCouponByIdForSubtotal,
  resolveCouponForSubtotal,
} from '../coupon/coupon.service.js';

const INVENTORY_INTEGRITY_ERROR_CODES = new Set([
  'INVENTORY_MODE_CONFLICT',
  'INVENTORY_NOT_FOUND',
]);

const COUPON_RUNTIME_ERROR_CODES = new Set([
  'INVALID_COUPON',
  'COUPON_INACTIVE',
  'COUPON_NOT_STARTED',
  'COUPON_EXPIRED',
  'COUPON_MINIMUM_NOT_MET',
  'COUPON_USAGE_LIMIT_REACHED',
]);

const CART_WRITE_MAX_ATTEMPTS = 5;

function isCouponRuntimeError(error) {
  return (
    error instanceof AppError && COUPON_RUNTIME_ERROR_CODES.has(error.code)
  );
}

function throwCartEmpty() {
  throw new AppError(409, 'CART_EMPTY', 'Your Cart is empty.');
}

function throwCartCouponConflict() {
  throw new AppError(
    409,
    'CART_ITEM_UNAVAILABLE',
    'The Cart changed while the Coupon was being applied. Please try again.',
  );
}

function createCartWarning(code, message, details = null) {
  return {
    code,
    message,

    ...(details ?? {}),
  };
}

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

function throwCartItemNotFound() {
  throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart Item not found.');
}

function throwCartUpdateConflict() {
  throw new AppError(
    409,
    'CART_ITEM_UNAVAILABLE',
    'The Cart changed while this item was being updated. Please try again.',
  );
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

function throwCartMergeConflict(
  message = 'The Guest Cart could not be merged safely.',
  fields = null,
) {
  throw new AppError(409, 'CART_MERGE_CONFLICT', message, fields);
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

async function resolveCartItemForMerge({
  productId,
  variantId = null,
  quantity,
  existingQuantity,
}) {
  try {
    return await resolveCartItemForAdd({
      productId,
      variantId,
      quantity,
      existingQuantity,
    });
  } catch (error) {
    /*
     * Request-shape validation happens before the service.
     *
     * Once the request shape is valid, Product / Variant / Inventory /
     * cumulative-stock failures mean that the proposed Guest Cart cannot
     * be merged safely.
     */
    if (error instanceof AppError) {
      throwCartMergeConflict(error.message, error.fields);
    }

    throw error;
  }
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

async function resolveCustomerCartState(cart) {
  if (!cart) {
    return {
      resource: {
        id: null,

        items: [],

        coupon: null,

        pricing: {
          subtotal: 0,
          discountAmount: 0,
          totalAmount: 0,
        },

        issues: [],

        warnings: [],

        canCheckout: false,
      },

      couponValidationError: null,
    };
  }

  const items = [];

  for (const cartItem of cart.items) {
    items.push(await resolveStoredCartItem(cartItem));
  }

  /*
   * Current Product pricing is authoritative.
   *
   * Persisted Cart lines contain identities + quantities,
   * never historical pricing.
   */
  const subtotal = items.reduce(
    (total, item) => total + (item.lineTotal ?? 0),
    0,
  );

  const issues = items.flatMap((item) =>
    item.issues.map((issue) => ({
      cartItemId: item.id,
      ...issue,
    })),
  );

  let coupon = null;

  let discountAmount = 0;

  let totalAmount = subtotal;

  const warnings = [];

  let couponValidationError = null;

  if (cart.appliedCouponId) {
    try {
      const couponResult = await resolveCouponByIdForSubtotal({
        couponId: cart.appliedCouponId,

        subtotal,
      });

      coupon = couponResult.coupon;

      discountAmount = couponResult.discountAmount;

      totalAmount = couponResult.totalAmount;
    } catch (error) {
      /*
       * An applied Coupon becoming invalid must not make
       * GET /cart unusable.
       *
       * Examples:
       * - Coupon expired
       * - Admin deactivated it
       * - usage limit reached
       * - minimum subtotal no longer met
       *
       * The Cart stays readable with zero Coupon discount.
       */
      if (!isCouponRuntimeError(error)) {
        throw error;
      }

      couponValidationError = error;

      warnings.push(createCartWarning(error.code, error.message));
    }
  }

  return {
    resource: {
      id: cart._id.toString(),

      items,

      coupon,

      pricing: {
        subtotal,
        discountAmount,
        totalAmount,
      },

      issues,

      warnings,

      canCheckout: items.length > 0 && issues.length === 0,
    },

    couponValidationError,
  };
}

export async function resolveCustomerCart(cart) {
  const { resource } = await resolveCustomerCartState(cart);

  return resource;
}

async function resolveCustomerCartAfterMutation(cart) {
  if (!cart) {
    return resolveCustomerCart(null);
  }

  let currentCart = cart;

  for (let attempt = 0; attempt < CART_WRITE_MAX_ATTEMPTS; attempt += 1) {
    const { resource, couponValidationError } =
      await resolveCustomerCartState(currentCart);

    /*
     * No Coupon, or the applied Coupon is
     * still valid after the mutation.
     */
    if (!currentCart.appliedCouponId || !couponValidationError) {
      return resource;
    }

    /*
     * A Cart mutation has left the persisted Coupon
     * invalid.
     *
     * Clear only the exact Coupon/state we just
     * evaluated. updatedAt prevents overwriting a
     * concurrent Cart change.
     */
    const clearedCart = await Cart.findOneAndUpdate(
      {
        _id: currentCart._id,

        customerId: currentCart.customerId,

        appliedCouponId: currentCart.appliedCouponId,

        updatedAt: currentCart.updatedAt,
      },

      {
        $set: {
          appliedCouponId: null,
        },
      },

      {
        returnDocument: 'after',
        runValidators: true,
      },
    );

    if (clearedCart) {
      const repairedCart = await resolveCustomerCart(clearedCart);

      return {
        ...repairedCart,

        warnings: [
          createCartWarning(
            'COUPON_REMOVED',
            'The applied Coupon is no longer valid and was removed.',
            {
              reasonCode: couponValidationError.code,

              reasonMessage: couponValidationError.message,
            },
          ),

          ...(repairedCart.warnings ?? []),
        ],
      };
    }

    /*
     * Another request changed the Cart while we
     * were clearing the stale Coupon.
     *
     * Re-read authority and evaluate again.
     */
    currentCart = await Cart.findOne({
      customerId: currentCart.customerId,
    });

    if (!currentCart) {
      return resolveCustomerCart(null);
    }
  }

  /*
   * Very unusual sustained concurrent writes.
   * Return the newest authoritative state instead
   * of performing an unsafe blind update.
   */
  return resolveCustomerCart(currentCart);
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

      return resolveCustomerCartAfterMutation(updatedCart);
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

    return resolveCustomerCartAfterMutation(updatedCart);
  }

  throwCartWriteConflict();
}

export async function updateCustomerCartItemQuantity({
  customerId,
  cartItemId,
  quantity,
}) {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new TypeError('A valid Customer ID is required.');
  }

  if (!mongoose.isValidObjectId(cartItemId)) {
    throw new TypeError('A valid Cart Item ID is required.');
  }

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new TypeError('Cart quantity must be a positive integer.');
  }

  for (let attempt = 0; attempt < CART_WRITE_MAX_ATTEMPTS; attempt += 1) {
    const existingCart = await Cart.findOne({
      customerId,
    }).select('_id customerId items appliedCouponId createdAt updatedAt');

    if (!existingCart) {
      throwCartItemNotFound();
    }

    const existingItem = existingCart.items.id(cartItemId);

    if (!existingItem) {
      throwCartItemNotFound();
    }

    const existingQuantity = existingItem.quantity;

    /*
     * PATCH uses an absolute desired quantity.
     *
     * Reuse the existing Product/Variant/Inventory resolver with
     * existingQuantity = 0 so `quantity` itself is validated against
     * current authoritative Inventory.
     */
    const resolvedItem = await resolveCartItemForAdd({
      productId: existingItem.productId,
      variantId: existingItem.variantId ?? null,
      quantity,
      existingQuantity: 0,
    });

    /*
     * Optimistic compare-and-set:
     * update only if this exact Cart Item still has the quantity that
     * was read and validated.
     */
    const updatedCart = await Cart.findOneAndUpdate(
      {
        _id: existingCart._id,
        customerId,

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
        $set: {
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

    return resolveCustomerCartAfterMutation(updatedCart);
  }

  throwCartUpdateConflict();
}

export async function removeItemFromCustomerCart({ customerId, cartItemId }) {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new TypeError('A valid Customer ID is required.');
  }

  if (!mongoose.isValidObjectId(cartItemId)) {
    throw new TypeError('A valid Cart Item ID is required.');
  }

  /*
   * Removal intentionally does not re-resolve Product, Variant or Inventory.
   *
   * A stale, inactive, deleted or out-of-stock Cart Item must still be
   * removable by its owning Customer.
   *
   * The query is ownership-safe because it requires both the authenticated
   * Customer and the embedded Cart Item ID to match.
   */
  const updatedCart = await Cart.findOneAndUpdate(
    {
      customerId,
      'items._id': cartItemId,
    },
    {
      $pull: {
        items: {
          _id: cartItemId,
        },
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  );

  if (!updatedCart) {
    throwCartItemNotFound();
  }

  return resolveCustomerCartAfterMutation(updatedCart);
}

export async function clearCustomerCart(customerId) {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new TypeError('A valid Customer ID is required.');
  }

  /*
   * Clear Cart preserves the Customer's persistent Cart document.
   *
   * Coupon persistence is also cleared because a Coupon cannot remain
   * attached to an empty Cart.
   *
   * If no Cart exists yet, return the same logical empty Cart used by GET.
   */
  const updatedCart = await Cart.findOneAndUpdate(
    {
      customerId,
    },
    {
      $set: {
        items: [],
        appliedCouponId: null,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  );

  return resolveCustomerCart(updatedCart);
}

export async function mergeGuestCartIntoCustomerCart({ customerId, items }) {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new TypeError('A valid Customer ID is required.');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new TypeError('Guest Cart items are required.');
  }

  for (let attempt = 0; attempt < CART_WRITE_MAX_ATTEMPTS; attempt += 1) {
    /*
     * Read one authoritative Customer Cart snapshot.
     *
     * updatedAt will also be used as our optimistic concurrency guard.
     */
    const existingCart = await Cart.findOne({
      customerId,
    }).select('_id customerId items appliedCouponId createdAt updatedAt');

    /*
     * Build the proposed Cart completely in memory.
     *
     * Existing embedded Cart Item IDs are explicitly preserved.
     * Nothing is written to MongoDB during validation.
     */
    const proposedItems = existingCart
      ? existingCart.items.map((item) => ({
          _id: item._id,
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
        }))
      : [];

    /*
     * Validate EVERY Guest line before any database mutation.
     */
    for (const guestItem of items) {
      const variantId = guestItem.variantId ?? null;

      const existingItem =
        proposedItems.find((item) => {
          return (
            sameObjectId(item.productId, guestItem.productId) &&
            sameObjectId(item.variantId, variantId)
          );
        }) ?? null;

      const existingQuantity = existingItem?.quantity ?? 0;

      /*
       * This validates:
       *
       * existing Customer quantity
       *          +
       * Guest quantity
       *          ↓
       * authoritative current Inventory
       *
       * It also re-resolves Product, Variant and current pricing.
       */
      const resolvedItem = await resolveCartItemForMerge({
        productId: guestItem.productId,
        variantId,
        quantity: guestItem.quantity,
        existingQuantity,
      });

      if (existingItem) {
        /*
         * Same Product + Variant identity:
         *
         * Keep the existing Cart Item _id and replace only its proposed
         * quantity in memory.
         */
        existingItem.quantity = resolvedItem.finalQuantity;

        continue;
      }

      /*
       * New logical Cart line.
       *
       * Create its embedded ID now so the one final write produces a
       * stable Cart Item identity.
       */
      proposedItems.push({
        _id: new mongoose.Types.ObjectId(),
        productId: resolvedItem.productId,
        variantId: resolvedItem.variantId,
        quantity: resolvedItem.finalQuantity,
      });
    }

    /*
     * Customer has no persisted Cart yet.
     *
     * All Guest items have already been validated, so create the whole
     * Cart in one operation.
     */
    if (!existingCart) {
      try {
        const createdCart = await Cart.create({
          customerId,
          items: proposedItems,
        });

        return resolveCustomerCart(createdCart);
      } catch (error) {
        /*
         * Another concurrent request may have created the Customer Cart
         * after our initial read.
         *
         * The unique customerId index prevents two Cart documents.
         * Retry against the newly created authoritative Cart.
         */
        if (isDuplicateKeyError(error)) {
          continue;
        }

        throw error;
      }
    }

    /*
     * Existing Customer Cart:
     *
     * Apply the entire proposed item array in ONE guarded mutation.
     *
     * updatedAt must still equal the value we originally validated.
     * If another Cart mutation happened meanwhile, this query matches
     * nothing and we retry from fresh state.
     *
     * appliedCouponId is deliberately untouched.
     */
    const updatedCart = await Cart.findOneAndUpdate(
      {
        _id: existingCart._id,
        customerId,
        updatedAt: existingCart.updatedAt,
      },
      {
        $set: {
          items: proposedItems,
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

    return resolveCustomerCartAfterMutation(updatedCart);
  }

  throwCartMergeConflict(
    'The Cart changed while Guest items were being merged. Please try again.',
  );
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

export async function applyCouponToCustomerCart({ customerId, code }) {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new TypeError('A valid Customer ID is required.');
  }

  for (let attempt = 0; attempt < CART_WRITE_MAX_ATTEMPTS; attempt += 1) {
    const existingCart = await Cart.findOne({
      customerId,
    }).select('_id customerId items appliedCouponId createdAt updatedAt');

    if (!existingCart || existingCart.items.length === 0) {
      throwCartEmpty();
    }

    /*
     * Re-resolve the complete Customer Cart.
     *
     * Never accept a client subtotal.
     */
    const { resource: resolvedCart } =
      await resolveCustomerCartState(existingCart);

    /*
     * Do not attach a Coupon to a Cart whose
     * Product / Variant / Inventory state is
     * currently unsafe.
     */
    if (resolvedCart.issues.length > 0) {
      throwCartItemUnavailable(
        'Resolve unavailable Cart items before applying a Coupon.',
      );
    }

    /*
     * Coupon domain service validates:
     *
     * existence
     * active status
     * startsAt / expiresAt
     * minimum order
     * global usage limit
     * percentage/fixed calculation
     */
    const couponResult = await resolveCouponForSubtotal({
      code,

      subtotal: resolvedCart.pricing.subtotal,
    });

    /*
     * Persist only appliedCouponId.
     *
     * updatedAt is an optimistic concurrency
     * guard: do not attach pricing validated
     * against an older Cart snapshot.
     */
    const updatedCart = await Cart.findOneAndUpdate(
      {
        _id: existingCart._id,
        customerId,
        updatedAt: existingCart.updatedAt,
      },

      {
        $set: {
          appliedCouponId: couponResult.coupon.id,
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

    /*
     * Revalidate once more after persistence.
     *
     * If an Admin changed the Coupon between
     * validation and persistence, the mutation
     * resolver safely removes it.
     */
    return resolveCustomerCartAfterMutation(updatedCart);
  }

  throwCartCouponConflict();
}

export async function removeCouponFromCustomerCart(customerId) {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new TypeError('A valid Customer ID is required.');
  }

  /*
   * Removal is intentionally idempotent.
   *
   * No Cart yet / no Coupon already produces the
   * normal authoritative Cart response.
   */
  const updatedCart = await Cart.findOneAndUpdate(
    {
      customerId,
    },

    {
      $set: {
        appliedCouponId: null,
      },
    },

    {
      returnDocument: 'after',
      runValidators: true,
    },
  );

  return resolveCustomerCart(updatedCart);
}