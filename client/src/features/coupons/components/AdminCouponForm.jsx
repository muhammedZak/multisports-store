import { Link } from 'react-router';

import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';

import { CouponStatusBadge } from './CouponStatusBadge.jsx';

export function AdminCouponForm({ model }) {
  return (
    <form onSubmit={model.submit} className='mt-8 grid gap-6 lg:grid-cols-2'>
      {model.editMode ? (
        <section className='grid gap-5 border-y border-[var(--color-border)] py-5 sm:grid-cols-3 lg:col-span-2'>
          <div>
            <p className='mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
              Current status
            </p>

            <CouponStatusBadge isActive={model.coupon.isActive} />
          </div>

          <div>
            <p className='mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
              Used count
            </p>

            <p className='mb-0 text-xl font-black'>{model.coupon.usedCount}</p>
          </div>

          <div>
            <p className='mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
              Usage limit
            </p>

            <p className='mb-0 text-xl font-black'>
              {model.coupon.usageLimit ?? 'Unlimited'}
            </p>
          </div>
        </section>
      ) : null}

      <Input
        id='coupon-code'
        name='code'
        label='Coupon code'
        required
        disabled={model.saving}
        value={model.form.code}
        placeholder='SPORT20'
        hint='Codes are stored in uppercase.'
        error={model.formError?.fields?.code}
        onChange={model.handleChange}
        className='uppercase lg:col-span-2'
      />

      <Select
        id='coupon-discount-type'
        name='discountType'
        label='Discount type'
        value={model.form.discountType}
        disabled={model.saving}
        error={model.formError?.fields?.discountType}
        onChange={model.handleChange}>
        <option value='percentage'>Percentage</option>

        <option value='fixed'>Fixed amount</option>
      </Select>

      <Input
        id='coupon-discount-value'
        name='discountValue'
        label={
          model.form.discountType === 'percentage'
            ? 'Discount value (%)'
            : 'Discount value (₹)'
        }
        type='text'
        inputMode={
          model.form.discountType === 'percentage' ? 'numeric' : 'decimal'
        }
        required
        disabled={model.saving}
        value={model.form.discountValue}
        placeholder={model.form.discountType === 'percentage' ? '20' : '500.00'}
        error={model.formError?.fields?.discountValue}
        onChange={model.handleChange}
      />

      <Input
        id='coupon-minimum-order'
        name='minimumOrderAmount'
        label='Minimum order amount (₹)'
        type='text'
        inputMode='decimal'
        required
        disabled={model.saving}
        value={model.form.minimumOrderAmount}
        placeholder='1000.00'
        hint='Use ₹0 when there is no minimum.'
        error={model.formError?.fields?.minimumOrderAmount}
        onChange={model.handleChange}
      />

      {model.form.discountType === 'percentage' ? (
        <Input
          id='coupon-maximum-discount'
          name='maximumDiscount'
          label='Maximum discount (₹)'
          type='text'
          inputMode='decimal'
          disabled={model.saving}
          value={model.form.maximumDiscount}
          placeholder='Optional'
          hint='Optional cap for percentage Coupons.'
          error={model.formError?.fields?.maximumDiscount}
          onChange={model.handleChange}
        />
      ) : null}

      <Input
        id='coupon-start'
        name='startsAt'
        label='Starts at'
        type='datetime-local'
        disabled={model.saving}
        value={model.form.startsAt}
        hint='Optional. Leave empty to make the Coupon immediately eligible.'
        error={model.formError?.fields?.startsAt}
        onChange={model.handleChange}
      />

      <Input
        id='coupon-expiry'
        name='expiresAt'
        label='Expires at'
        type='datetime-local'
        disabled={model.saving}
        value={model.form.expiresAt}
        hint='Optional. When both dates are provided, expiry must be later than start.'
        error={model.formError?.fields?.expiresAt}
        onChange={model.handleChange}
      />

      <Input
        id='coupon-usage-limit'
        name='usageLimit'
        label='Global usage limit'
        type='text'
        inputMode='numeric'
        disabled={model.saving}
        value={model.form.usageLimit}
        placeholder='Unlimited'
        hint='Leave empty for no global usage limit.'
        error={model.formError?.fields?.usageLimit}
        onChange={model.handleChange}
      />

      {!model.editMode ? (
        <label className='flex items-start gap-3 border-y border-[var(--color-border)] py-4'>
          <input
            name='isActive'
            type='checkbox'
            checked={model.form.isActive}
            disabled={model.saving}
            onChange={model.handleChange}
            className='mt-1 size-4 accent-[var(--color-ink)]'
          />

          <span>
            <span className='block text-sm font-bold'>Active Coupon</span>

            <span className='mt-1 block text-xs leading-5 text-[var(--color-muted)]'>
              Active Coupons may be applied when all other eligibility rules
              pass.
            </span>
          </span>
        </label>
      ) : (
        <div className='border-y border-[var(--color-border)] py-4 text-sm leading-6 text-[var(--color-muted)]'>
          Activation and deactivation are intentionally managed from the Coupon
          list, not this configuration form.
        </div>
      )}

      {model.formError?.fields?.request ? (
        <Alert variant='danger' className='lg:col-span-2'>
          {model.formError.fields.request}
        </Alert>
      ) : null}

      {model.formError &&
      Object.keys(model.formError.fields || {}).length === 0 ? (
        <Alert variant='danger' className='lg:col-span-2'>
          {model.formError.message}
        </Alert>
      ) : null}

      <div className='flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-6 lg:col-span-2'>
        <Button type='submit' disabled={model.saving}>
          {model.saving
            ? 'Saving...'
            : model.editMode
              ? 'Save changes'
              : 'Create Coupon'}
        </Button>

        <Link
          to='/admin/coupons'
          className='inline-flex min-h-10 items-center border border-[var(--color-border-strong)] px-4 text-sm font-semibold'>
          Cancel
        </Link>
      </div>
    </form>
  );
}
