import { useCallback, useEffect, useState } from 'react';

import { Link, useNavigate, useParams } from 'react-router';

import {
  createAdminCoupon,
  fetchAdminCoupon,
  updateAdminCoupon,
} from '../../api/couponApi.js';

import { normalizeApiError } from '../../api/errors.js';

import { paiseToRupeesInput, parseRupeesToPaise } from '../../utils/money.js';

const EMPTY_FORM = {
  code: '',
  discountType: 'percentage',
  discountValue: '',
  minimumOrderAmount: '0.00',
  maximumDiscount: '',
  startsAt: '',
  expiresAt: '',
  usageLimit: '',
  isActive: true,
};

function toDatetimeLocal(value) {
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

function validateCouponForm({ form, editMode }) {
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

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <p className='mt-2 text-sm text-red-600'>{message}</p>;
}

function AdminCouponFormPage() {
  const { couponId } = useParams();

  const navigate = useNavigate();

  const editMode = Boolean(couponId);

  const [coupon, setCoupon] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(editMode);

  const [saving, setSaving] = useState(false);

  const [loadError, setLoadError] = useState(null);

  const [formError, setFormError] = useState(null);

  const loadCoupon = useCallback(async () => {
    if (!editMode) {
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const item = await fetchAdminCoupon(couponId);

      setCoupon(item);

      setForm({
        code: item.code,
        discountType: item.discountType,
        discountValue:
          item.discountType === 'percentage'
            ? String(item.discountValue)
            : paiseToRupeesInput(item.discountValue),
        minimumOrderAmount: paiseToRupeesInput(item.minimumOrderAmount),
        maximumDiscount:
          item.maximumDiscount === null
            ? ''
            : paiseToRupeesInput(item.maximumDiscount),
        startsAt: toDatetimeLocal(item.startsAt),
        expiresAt: toDatetimeLocal(item.expiresAt),
        usageLimit: item.usageLimit === null ? '' : String(item.usageLimit),
        isActive: item.isActive,
      });
    } catch (requestError) {
      setLoadError(
        normalizeApiError(requestError, 'Unable to load this Coupon.'),
      );
    } finally {
      setLoading(false);
    }
  }, [couponId, editMode]);

  useEffect(() => {
    loadCoupon();
  }, [loadCoupon]);

  function handleChange(event) {
    const { name, value, checked, type } = event.target;

    setForm((current) => {
      const next = {
        ...current,
        [name]: type === 'checkbox' ? checked : value,
      };

      if (name === 'discountType' && value !== current.discountType) {
        next.discountValue = '';

        if (value === 'fixed') {
          next.maximumDiscount = '';
        }
      }

      return next;
    });

    setFormError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setFormError(null);

    const { fields, payload } = validateCouponForm({
      form,
      editMode,
    });

    if (Object.keys(fields).length > 0) {
      setFormError({
        code: 'VALIDATION_ERROR',
        message: 'Please correct the invalid fields.',
        fields,
      });

      return;
    }

    setSaving(true);

    try {
      if (editMode) {
        await updateAdminCoupon(couponId, payload);
      } else {
        await createAdminCoupon(payload);
      }

      navigate('/admin/coupons', {
        state: {
          message: editMode
            ? 'Coupon updated successfully.'
            : 'Coupon created successfully.',
        },
      });
    } catch (requestError) {
      setFormError(
        normalizeApiError(
          requestError,
          editMode
            ? 'Unable to update this Coupon.'
            : 'Unable to create this Coupon.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className='p-5 sm:p-6'>
        <p className='text-sm text-neutral-600'>Loading Coupon...</p>
      </main>
    );
  }

  if (loadError && !coupon) {
    return (
      <main className='p-5 sm:p-6'>
        <div
          role='alert'
          className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {loadError.message}
        </div>

        <div className='mt-5 flex flex-wrap gap-3'>
          <button
            type='button'
            onClick={loadCoupon}
            className='bg-black px-4 py-2.5 text-sm font-medium text-white'>
            Try again
          </button>

          <Link
            to='/admin/coupons'
            className='border border-neutral-300 px-4 py-2.5 text-sm font-medium'>
            Back to coupons
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className='p-5 sm:p-6'>
      <div>
        <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
          Promotion management
        </p>

        <h1 className='mt-3 text-3xl font-semibold'>
          {editMode ? `Edit ${coupon.code}` : 'Add coupon'}
        </h1>

        <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
          {editMode
            ? 'Update this Coupon configuration. Activation is managed separately from the Coupon list.'
            : 'Configure a percentage or fixed-amount Coupon for the store.'}
        </p>
      </div>

      {editMode && (
        <section className='mt-6 grid gap-4 border border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-3'>
          <div>
            <p className='text-xs uppercase tracking-wide text-neutral-500'>
              Current status
            </p>

            <p className='mt-1 font-medium'>
              {coupon.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>

          <div>
            <p className='text-xs uppercase tracking-wide text-neutral-500'>
              Used count
            </p>

            <p className='mt-1 font-medium'>{coupon.usedCount}</p>
          </div>

          <div>
            <p className='text-xs uppercase tracking-wide text-neutral-500'>
              Usage limit
            </p>

            <p className='mt-1 font-medium'>
              {coupon.usageLimit ?? 'Unlimited'}
            </p>
          </div>
        </section>
      )}

      <form
        onSubmit={handleSubmit}
        className='mt-8 grid gap-6 border border-neutral-200 p-5 lg:grid-cols-2'>
        <div className='lg:col-span-2'>
          <label htmlFor='code' className='mb-2 block text-sm font-medium'>
            Coupon code
          </label>

          <input
            id='code'
            name='code'
            type='text'
            required
            disabled={saving}
            value={form.code}
            onChange={handleChange}
            placeholder='SPORT20'
            className='w-full border border-neutral-300 px-4 py-3 uppercase outline-none focus:border-black disabled:bg-neutral-100'
          />

          <p className='mt-2 text-xs text-neutral-500'>
            Codes are stored in uppercase.
          </p>

          <FieldError message={formError?.fields?.code} />
        </div>

        <div>
          <label
            htmlFor='discountType'
            className='mb-2 block text-sm font-medium'>
            Discount type
          </label>

          <select
            id='discountType'
            name='discountType'
            value={form.discountType}
            disabled={saving}
            onChange={handleChange}
            className='w-full border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100'>
            <option value='percentage'>Percentage</option>

            <option value='fixed'>Fixed amount</option>
          </select>

          <FieldError message={formError?.fields?.discountType} />
        </div>

        <div>
          <label
            htmlFor='discountValue'
            className='mb-2 block text-sm font-medium'>
            {form.discountType === 'percentage'
              ? 'Discount value (%)'
              : 'Discount value (₹)'}
          </label>

          <input
            id='discountValue'
            name='discountValue'
            type='text'
            inputMode={
              form.discountType === 'percentage' ? 'numeric' : 'decimal'
            }
            required
            disabled={saving}
            value={form.discountValue}
            onChange={handleChange}
            placeholder={form.discountType === 'percentage' ? '20' : '500.00'}
            className='w-full border border-neutral-300 px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100'
          />

          <FieldError message={formError?.fields?.discountValue} />
        </div>

        <div>
          <label
            htmlFor='minimumOrderAmount'
            className='mb-2 block text-sm font-medium'>
            Minimum order amount (₹)
          </label>

          <input
            id='minimumOrderAmount'
            name='minimumOrderAmount'
            type='text'
            inputMode='decimal'
            required
            disabled={saving}
            value={form.minimumOrderAmount}
            onChange={handleChange}
            placeholder='1000.00'
            className='w-full border border-neutral-300 px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100'
          />

          <p className='mt-2 text-xs text-neutral-500'>
            Use ₹0 when there is no minimum.
          </p>

          <FieldError message={formError?.fields?.minimumOrderAmount} />
        </div>

        {form.discountType === 'percentage' && (
          <div>
            <label
              htmlFor='maximumDiscount'
              className='mb-2 block text-sm font-medium'>
              Maximum discount (₹)
            </label>

            <input
              id='maximumDiscount'
              name='maximumDiscount'
              type='text'
              inputMode='decimal'
              disabled={saving}
              value={form.maximumDiscount}
              onChange={handleChange}
              placeholder='Optional'
              className='w-full border border-neutral-300 px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100'
            />

            <p className='mt-2 text-xs text-neutral-500'>
              Optional cap for percentage Coupons.
            </p>

            <FieldError message={formError?.fields?.maximumDiscount} />
          </div>
        )}

        <div>
          <label htmlFor='startsAt' className='mb-2 block text-sm font-medium'>
            Starts at
          </label>

          <input
            id='startsAt'
            name='startsAt'
            type='datetime-local'
            disabled={saving}
            value={form.startsAt}
            onChange={handleChange}
            className='w-full border border-neutral-300 px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100'
          />

          <p className='mt-2 text-xs text-neutral-500'>
            Optional. Leave empty to make the Coupon immediately eligible.
          </p>

          <FieldError message={formError?.fields?.startsAt} />
        </div>

        <div>
          <label htmlFor='expiresAt' className='mb-2 block text-sm font-medium'>
            Expires at
          </label>

          <input
            id='expiresAt'
            name='expiresAt'
            type='datetime-local'
            disabled={saving}
            value={form.expiresAt}
            onChange={handleChange}
            className='w-full border border-neutral-300 px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100'
          />

          <p className='mt-2 text-xs text-neutral-500'>
            Optional. Must be later than the start date when both are provided.
          </p>

          <FieldError message={formError?.fields?.expiresAt} />
        </div>

        <div>
          <label
            htmlFor='usageLimit'
            className='mb-2 block text-sm font-medium'>
            Global usage limit
          </label>

          <input
            id='usageLimit'
            name='usageLimit'
            type='text'
            inputMode='numeric'
            disabled={saving}
            value={form.usageLimit}
            onChange={handleChange}
            placeholder='Unlimited'
            className='w-full border border-neutral-300 px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100'
          />

          <p className='mt-2 text-xs text-neutral-500'>
            Leave empty for no global usage limit.
          </p>

          <FieldError message={formError?.fields?.usageLimit} />
        </div>

        {!editMode && (
          <label className='flex items-start gap-3'>
            <input
              name='isActive'
              type='checkbox'
              checked={form.isActive}
              disabled={saving}
              onChange={handleChange}
              className='mt-1 h-4 w-4'
            />

            <span>
              <span className='block text-sm font-medium'>Active Coupon</span>

              <span className='mt-1 block text-xs text-neutral-500'>
                Active Coupons may be applied when all other eligibility rules
                pass.
              </span>
            </span>
          </label>
        )}

        {editMode && (
          <div className='border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600'>
            Activation and deactivation are intentionally managed from the
            Coupon list rather than this configuration form.
          </div>
        )}

        {formError?.fields?.request && (
          <div
            role='alert'
            className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:col-span-2'>
            {formError.fields.request}
          </div>
        )}

        {formError && Object.keys(formError.fields || {}).length === 0 && (
          <div
            role='alert'
            className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:col-span-2'>
            {formError.message}
          </div>
        )}

        <div className='flex flex-wrap gap-3 lg:col-span-2'>
          <button
            type='submit'
            disabled={saving}
            className='bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50'>
            {saving ? 'Saving...' : editMode ? 'Save changes' : 'Create coupon'}
          </button>

          <Link
            to='/admin/coupons'
            className='border border-neutral-300 px-5 py-3 text-sm font-medium'>
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}

export default AdminCouponFormPage;
