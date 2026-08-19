import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { Cart } from '../cart/cart.model.js';

import { resolveCartItemForAdd } from '../cart/cart.service.js';

import { Category } from '../catalog/category.model.js';

import { resolveCouponByIdForSubtotal } from '../coupon/coupon.service.js';

import { getStockState } from '../inventory/inventory.service.js';

import { User } from '../users/user.model.js';

const COUPON_CHECKOUT_ERROR_CODES = new Set([
  'INVALID_COUPON',
  'COUPON_INACTIVE',
  'COUPON_NOT_STARTED',
  'COUPON_EXPIRED',
  'COUPON_MINIMUM_NOT_MET',
  'COUPON_USAGE_LIMIT_REACHED',
]);

const CART_ITEM_CHECKOUT_ERROR_CODES = new Set([
  'PRODUCT_NOT_FOUND',
  'VARIANT_NOT_FOUND',
  'VARIANT_REQUIRED',
  'VALIDATION_ERROR',
  'CART_ITEM_UNAVAILABLE',
  'INVENTORY_MODE_CONFLICT',
  'INVENTORY_NOT_FOUND',
  'OUT_OF_STOCK',
]);

function createIssue(code, message) {
  return {
    code,
    message,
  };
}

function throwInvalidShippingAddress() {
  throw new AppError(
    422,
    'INVALID_SHIPPING_ADDRESS',
    'The selected shipping address is not available for this Customer.',
    {
      shippingAddressId: 'Select one of your saved addresses.',
    },
  );
}

function throwPricingOverflow() {
  throw new AppError(
    409,
    'CHECKOUT_NOT_READY',
    'Checkout pricing could not be calculated safely.',
  );
}

function toAddressSnapshot(address) {
  return {
    fullName: address.fullName,
    phone: address.phone,
    address: address.address,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  };
}

async function resolveShippingAddress({
  customerId,
  shippingAddressId,
  shippingAddress,
}) {
  /*
   * Inline address:
   *
   * already normalized by checkout.validation.js.
   * Do not save it to User.addresses.
   */
  if (shippingAddress) {
    const snapshot = toAddressSnapshot(shippingAddress);

    return {
      snapshot,

      resource: {
        source: 'inline',
        id: null,
        ...snapshot,
      },
    };
  }

  /*
   * Saved address:
   *
   * ownership comes from Customer User.addresses.
   */
  const user = await User.findById(customerId).select('addresses');

  const savedAddress = user?.addresses.id(shippingAddressId);

  if (!savedAddress) {
    throwInvalidShippingAddress();
  }

  const snapshot = toAddressSnapshot(savedAddress);

  return {
    snapshot,

    resource: {
      source: 'saved',
      id: savedAddress._id.toString(),
      ...snapshot,
    },
  };
}

function toUnavailablePreviewItem(cartItem, itemIssue) {
  return {
    id: cartItem._id.toString(),

    product: {
      id: cartItem.productId.toString(),
      name: null,
      brand: null,
      sport: null,
      category: null,
    },

    variant: cartItem.variantId
      ? {
          id: cartItem.variantId.toString(),
          options: {},
        }
      : null,

    quantity: cartItem.quantity,

    pricing: {
      basePrice: null,
      itemDiscount: null,
      unitPrice: null,
      lineTotal: null,
    },

    availability: {
      stockState: null,
      isAvailable: false,
    },

    issues: [itemIssue],
  };
}

function toCheckoutItemIssue(error) {
  if (error.code === 'OUT_OF_STOCK') {
    return createIssue('OUT_OF_STOCK', error.message);
  }

  /*
   * Deleted/inactive Product, stale Variant or broken Inventory all
   * mean the persisted Cart line cannot currently proceed through Checkout.
   */
  return createIssue(
    'CART_ITEM_UNAVAILABLE',
    error.message || 'This Cart Item is no longer available for Checkout.',
  );
}

async function resolveCheckoutItem(cartItem) {
  let resolved;

  try {
    /*
     * Reuse the same authority already used by Add-to-Cart:
     *
     * Product
     * Variant
     * Inventory
     * requested quantity
     * current Product price
     */
    resolved = await resolveCartItemForAdd({
      productId: cartItem.productId,

      variantId: cartItem.variantId ?? null,

      quantity: cartItem.quantity,

      existingQuantity: 0,
    });
  } catch (error) {
    const isCheckoutItemError =
      error instanceof AppError &&
      CART_ITEM_CHECKOUT_ERROR_CODES.has(error.code);

    if (!isCheckoutItemError) {
      throw error;
    }

    const itemIssue = toCheckoutItemIssue(error);

    return {
      previewItem: toUnavailablePreviewItem(cartItem, itemIssue),

      snapshotItem: null,

      issue: itemIssue,

      lineTotal: 0,
    };
  }

  /*
   * Category is required in the immutable commerce snapshot.
   *
   * Active Product → active Category is already protected by Catalog
   * rules, but rechecking it here prevents corrupted/stale data from
   * becoming historical Order authority.
   */
  const category = await Category.findById(resolved.product.categoryId).select(
    'name sport isActive',
  );

  if (
    !category ||
    !category.isActive ||
    category.sport !== resolved.product.sport
  ) {
    const itemIssue = createIssue(
      'CART_ITEM_UNAVAILABLE',
      'This Product category is no longer available for Checkout.',
    );

    return {
      previewItem: toUnavailablePreviewItem(cartItem, itemIssue),

      snapshotItem: null,

      issue: itemIssue,

      lineTotal: 0,
    };
  }

  /*
   * Task 8.1 snapshot pricing:
   *
   * unitPrice in the historical snapshot = Product base price.
   * itemDiscount = per-unit Product-level discount.
   *
   * lineTotal =
   * (unitPrice - itemDiscount) * quantity
   */
  const basePrice = resolved.product.basePrice;

  const unitPrice = resolved.unitPrice;

  const itemDiscount = basePrice - unitPrice;

  const lineTotal = unitPrice * cartItem.quantity;

  if (
    !Number.isSafeInteger(itemDiscount) ||
    itemDiscount < 0 ||
    !Number.isSafeInteger(lineTotal)
  ) {
    throwPricingOverflow();
  }

  const variant = resolved.variant;

  return {
    previewItem: {
      id: cartItem._id.toString(),

      product: {
        id: resolved.product._id.toString(),

        name: resolved.product.name,

        brand: resolved.product.brand,

        sport: resolved.product.sport,

        category: {
          id: category._id.toString(),

          name: category.name,
        },
      },

      variant: variant
        ? {
            id: variant._id.toString(),

            options: variant.options ?? {},
          }
        : null,

      quantity: cartItem.quantity,

      /*
       * Public preview keeps the existing Cart meaning:
       *
       * basePrice = before Product discount
       * itemDiscount = Product discount per unit
       * unitPrice = effective/current selling price
       */
      pricing: {
        basePrice,

        itemDiscount,

        unitPrice,

        lineTotal,
      },

      availability: {
        stockState: getStockState(resolved.inventory.quantity),

        isAvailable: true,
      },

      issues: [],
    },

    /*
     * Internal snapshot shape matches Task 8.1.
     *
     * This object is NOT sent as browser authority.
     * Task 8.3 will persist it inside Payment.checkoutSnapshot.
     */
    snapshotItem: {
      productId: resolved.product._id,

      variantId: variant?._id ?? null,

      productName: resolved.product.name,

      brand: resolved.product.brand,

      sport: resolved.product.sport,

      categoryId: category._id,

      categoryName: category.name,

      variantOptions: variant?.options ?? null,

      quantity: cartItem.quantity,

      unitPrice: basePrice,

      itemDiscount,

      lineTotal,
    },

    issue: null,

    lineTotal,
  };
}

function addMoney(left, right) {
  const total = left + right;

  if (!Number.isSafeInteger(total)) {
    throwPricingOverflow();
  }

  return total;
}

export async function resolveCheckoutForCustomer({
  customerId,
  shippingAddressId,
  shippingAddress,
}) {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new TypeError('A valid Customer ID is required.');
  }

  /*
   * Resolve shipping authority first.
   *
   * The browser cannot provide Customer ownership.
   */
  const address = await resolveShippingAddress({
    customerId,

    shippingAddressId,

    shippingAddress,
  });

  /*
   * Browser does NOT submit Cart items here.
   *
   * Checkout always starts from the persisted Customer Cart.
   */
  const cart = await Cart.findOne({
    customerId,
  });

  if (!cart || cart.items.length === 0) {
    return {
      preview: {
        items: [],

        shippingAddress: address.resource,

        coupon: null,

        pricing: {
          subtotal: 0,
          discountAmount: 0,
          totalAmount: 0,
        },

        issues: [createIssue('CART_EMPTY', 'Your Cart is empty.')],

        canProceed: false,
      },

      checkoutSnapshot: null,
    };
  }

  const previewItems = [];

  const snapshotItems = [];

  const issues = [];

  let subtotal = 0;

  for (const cartItem of cart.items) {
    const result = await resolveCheckoutItem(cartItem);

    previewItems.push(result.previewItem);

    if (result.snapshotItem) {
      snapshotItems.push(result.snapshotItem);
    }

    if (result.issue) {
      issues.push({
        cartItemId: cartItem._id.toString(),

        ...result.issue,
      });
    }

    subtotal = addMoney(subtotal, result.lineTotal);
  }

  /*
   * Coupon is recalculated AFTER current Product-level discounts.
   */
  let coupon = null;

  let couponSnapshot = null;

  let discountAmount = 0;

  let totalAmount = subtotal;

  if (cart.appliedCouponId) {
    try {
      const result = await resolveCouponByIdForSubtotal({
        couponId: cart.appliedCouponId,

        subtotal,
      });

      coupon = {
        ...result.coupon,

        discountAmount: result.discountAmount,
      };

      couponSnapshot = {
        couponId: cart.appliedCouponId,

        code: result.coupon.code,

        discountType: result.coupon.discountType,

        discountValue: result.coupon.discountValue,

        discountAmount: result.discountAmount,
      };

      discountAmount = result.discountAmount;

      totalAmount = result.totalAmount;
    } catch (error) {
      const isCouponCheckoutError =
        error instanceof AppError &&
        COUPON_CHECKOUT_ERROR_CODES.has(error.code);

      if (!isCouponCheckoutError) {
        throw error;
      }

      /*
       * Preview is read-only.
       *
       * Do not clear appliedCouponId and do not change usedCount.
       * Surface the problem so the Customer can resolve it.
       */
      issues.push(createIssue(error.code, error.message));
    }
  }

  /*
   * Razorpay payment creation requires a positive payable amount.
   * Surface that requirement already during preview.
   */
  if (issues.length === 0 && totalAmount === 0) {
    issues.push(
      createIssue(
        'ZERO_VALUE_CHECKOUT_UNSUPPORTED',
        'Zero-value Checkout is not supported.',
      ),
    );
  }

  const canProceed = issues.length === 0 && totalAmount > 0;

  const preview = {
    items: previewItems,

    shippingAddress: address.resource,

    coupon,

    pricing: {
      subtotal,

      discountAmount,

      totalAmount,
    },

    issues,

    canProceed,
  };

  return {
    preview,

    /*
     * Only a fully valid Checkout is allowed to produce an internal
     * Payment-ready snapshot.
     */
    checkoutSnapshot: canProceed
      ? {
          items: snapshotItems,

          shippingAddress: address.snapshot,

          coupon: couponSnapshot,

          subtotal,

          discountAmount,

          totalAmount,
        }
      : null,
  };
}
