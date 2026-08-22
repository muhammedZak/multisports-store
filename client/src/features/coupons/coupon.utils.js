import { formatInrFromPaise, parseRupeesToPaise } from '../../utils/money.js';

export const couponDateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatCouponDate(value) {
  if (!value) {
    return '—';
  }

  return couponDateFormatter.format(new Date(value));
}

export function getCouponDiscountLabel(coupon) {
  if (coupon.discountType === 'percentage') {
    const cap =
      coupon.maximumDiscount !== null
        ? ` · max ${formatInrFromPaise(coupon.maximumDiscount)}`
        : '';

    return `${coupon.discountValue}%${cap}`;
  }

  return formatInrFromPaise(coupon.discountValue);
}

export function toCouponDatetimeLocal(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (number) => String(number).padStart(2, '0');

  return [
    date.getFullYear(),
    '-',

    pad(date.getMonth() + 1),

    '-',

    pad(date.getDate()),

    'T',

    pad(date.getHours()),

    ':',

    pad(date.getMinutes()),
  ].join('');
}

function parseOptionalDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function validateAdminCouponForm({
  form,

  editMode,
}) {
  const fields = {};

  const code = form.code.trim().toUpperCase();

  if (!code) {
    fields.code = 'Coupon code is required.';
  }

  const discountType = form.discountType;

  if (!['percentage', 'fixed'].includes(discountType)) {
    fields.discountType = 'Select a valid discount type.';
  }

  let discountValue = null;

  if (discountType === 'percentage') {
    const value = form.discountValue.trim();

    if (!/^\d+$/.test(value)) {
      fields.discountValue = 'Enter a whole-number percentage.';
    } else {
      discountValue = Number(value);

      if (
        !Number.isSafeInteger(discountValue) ||
        discountValue <= 0 ||
        discountValue > 100
      ) {
        fields.discountValue = 'Percentage must be between 1 and 100.';
      }
    }
  }

  if (discountType === 'fixed') {
    discountValue = parseRupeesToPaise(form.discountValue);

    if (discountValue === null || discountValue <= 0) {
      fields.discountValue = 'Enter a fixed discount greater than ₹0.';
    }
  }

  const minimumOrderAmount = parseRupeesToPaise(form.minimumOrderAmount);

  if (minimumOrderAmount === null || minimumOrderAmount < 0) {
    fields.minimumOrderAmount =
      'Enter a valid non-negative minimum order amount.';
  }

  let maximumDiscount = null;

  if (discountType === 'percentage' && form.maximumDiscount.trim()) {
    maximumDiscount = parseRupeesToPaise(form.maximumDiscount);

    if (maximumDiscount === null || maximumDiscount < 0) {
      fields.maximumDiscount = 'Enter a valid non-negative maximum discount.';
    }
  }

  const startsAt = parseOptionalDate(form.startsAt);

  if (form.startsAt && !startsAt) {
    fields.startsAt = 'Enter a valid start date and time.';
  }

  const expiresAt = parseOptionalDate(form.expiresAt);

  if (form.expiresAt && !expiresAt) {
    fields.expiresAt = 'Enter a valid expiry date and time.';
  }

  if (startsAt && expiresAt && expiresAt <= startsAt) {
    fields.expiresAt = 'Expiry must be later than the start date.';
  }

  let usageLimit = null;

  if (form.usageLimit.trim()) {
    if (!/^\d+$/.test(form.usageLimit.trim())) {
      fields.usageLimit = 'Usage limit must be a positive whole number.';
    } else {
      usageLimit = Number(form.usageLimit.trim());

      if (!Number.isSafeInteger(usageLimit) || usageLimit <= 0) {
        fields.usageLimit = 'Usage limit must be a positive whole number.';
      }
    }
  }

  return {
    fields,

    payload: {
      code,

      discountType,
      discountValue,

      minimumOrderAmount,
      maximumDiscount,

      startsAt: startsAt?.toISOString() ?? null,

      expiresAt: expiresAt?.toISOString() ?? null,

      usageLimit,

      ...(editMode
        ? {}
        : {
            isActive: form.isActive,
          }),
    },
  };
}
