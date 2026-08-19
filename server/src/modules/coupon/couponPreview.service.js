import { AppError } from '../../utils/AppError.js';

import { resolveCartItemForAdd } from '../cart/cart.service.js';

import { resolveCouponForSubtotal } from './coupon.service.js';

function throwPricingOverflow() {
  throw new AppError(
    422,
    'VALIDATION_ERROR',
    'Please correct the invalid fields.',
    {
      items: 'Cart pricing total is too large.',
    },
  );
}

export async function resolveGuestCouponPreview({ code, items }) {
  let subtotal = 0;

  /*
   * Never use browser-submitted prices.
   *
   * Each Guest Cart identity is resolved again through the same
   * Product / Variant / Inventory / pricing rules already used
   * by Customer Add-to-Cart.
   */
  for (const item of items) {
    const resolvedItem = await resolveCartItemForAdd({
      productId: item.productId,

      variantId: item.variantId ?? null,

      quantity: item.quantity,

      existingQuantity: 0,
    });

    const lineTotal = resolvedItem.unitPrice * item.quantity;

    if (!Number.isSafeInteger(lineTotal)) {
      throwPricingOverflow();
    }

    const nextSubtotal = subtotal + lineTotal;

    if (!Number.isSafeInteger(nextSubtotal)) {
      throwPricingOverflow();
    }

    subtotal = nextSubtotal;
  }

  /*
   * The Coupon service remains the single source of truth for:
   *
   * - code lookup
   * - active state
   * - start time
   * - expiry
   * - minimum subtotal
   * - usage limit
   * - percentage/fixed calculation
   * - maximum percentage cap
   */
  const couponResult = await resolveCouponForSubtotal({
    code,
    subtotal,
  });

  return {
    coupon: couponResult.coupon,

    pricing: {
      subtotal: couponResult.subtotal,

      discountAmount: couponResult.discountAmount,

      totalAmount: couponResult.totalAmount,
    },
  };
}
