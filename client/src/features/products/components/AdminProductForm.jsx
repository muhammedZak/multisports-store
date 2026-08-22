import { Link } from 'react-router';

import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';

import AdminProductImageManager from './AdminProductImageManager.jsx';
import AdminProductVariantManager from './AdminProductVariantManager.jsx';

export function AdminProductForm({ model, productId }) {
  const busy =
    model.saving || model.imageManagerBusy || model.variantManagerBusy;

  return (
    <form onSubmit={model.submit} className='mt-8 space-y-10'>
      <section>
        <h2 className='mb-0 text-lg font-black tracking-[-0.02em]'>
          Product information
        </h2>

        <div className='mt-5 grid gap-5 lg:grid-cols-2'>
          <Input
            id='product-name'
            name='name'
            label='Product name'
            required
            disabled={model.saving}
            value={model.form.name}
            error={model.formError?.fields?.name}
            onChange={model.handleChange}
          />

          <Input
            id='product-brand'
            name='brand'
            label='Brand'
            required
            disabled={model.saving}
            value={model.form.brand}
            error={model.formError?.fields?.brand}
            onChange={model.handleChange}
          />

          <Textarea
            id='product-description'
            name='description'
            label='Description'
            required
            rows={5}
            disabled={model.saving}
            value={model.form.description}
            error={model.formError?.fields?.description}
            onChange={model.handleChange}
            className='lg:col-span-2'
          />

          <Select
            id='product-sport'
            name='sport'
            label='Sport'
            required
            disabled={model.saving || model.referencesLoading}
            value={model.form.sport}
            error={model.formError?.fields?.sport}
            onChange={model.handleChange}>
            <option value=''>Select Sport</option>

            {model.sports.map((sport) => (
              <option key={sport.value} value={sport.value}>
                {sport.label}
              </option>
            ))}
          </Select>

          <Select
            id='product-category'
            name='categoryId'
            label='Category'
            required
            disabled={
              model.saving || model.referencesLoading || !model.form.sport
            }
            value={model.form.categoryId}
            error={model.formError?.fields?.categoryId}
            onChange={model.handleChange}>
            <option value=''>Select Category</option>

            {model.visibleCategories.map((category) => (
              <option
                key={category.id}
                value={category.id}
                disabled={model.effectiveIsActive && !category.isActive}>
                {category.name}
                {!category.isActive ? ' (Inactive)' : ''}
              </option>
            ))}
          </Select>

          {!model.editMode ? (
            <label className='flex items-start gap-3 border-y border-[var(--color-border)] py-4 lg:col-span-2'>
              <input
                type='checkbox'
                name='isActive'
                checked={model.form.isActive}
                disabled={model.saving}
                onChange={model.handleChange}
                className='mt-1 size-4 accent-[var(--color-ink)]'
              />

              <span>
                <span className='block text-sm font-bold'>Active Product</span>

                <span className='mt-1 block text-xs text-[var(--color-muted)]'>
                  Active Products require an active Category.
                </span>
              </span>
            </label>
          ) : null}
        </div>
      </section>

      <section className='border-t border-[var(--color-border)] pt-6'>
        <h2 className='mb-0 text-lg font-black'>Pricing</h2>

        <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
          Enter currency values in rupees. They are converted to integer paise
          before sending to the API.
        </p>

        <div className='mt-5 grid gap-5 lg:grid-cols-2'>
          <Input
            id='product-base-price'
            name='basePrice'
            label='Base price (₹)'
            type='number'
            min='0.01'
            step='0.01'
            required
            disabled={model.saving}
            value={model.form.basePrice}
            error={model.formError?.fields?.basePrice}
            onChange={model.handleChange}
          />

          <Select
            id='product-discount'
            name='discountType'
            label='Discount'
            value={model.form.discountType}
            disabled={model.saving}
            onChange={model.handleChange}>
            <option value=''>No discount</option>

            <option value='percentage'>Percentage</option>

            <option value='fixed'>Fixed amount</option>
          </Select>

          {model.form.discountType ? (
            <Input
              id='product-discount-value'
              name='discountValue'
              label={
                model.form.discountType === 'percentage'
                  ? 'Discount percentage'
                  : 'Discount amount (₹)'
              }
              type='number'
              min={model.form.discountType === 'percentage' ? '1' : '0.01'}
              step={model.form.discountType === 'percentage' ? '1' : '0.01'}
              disabled={model.saving}
              value={model.form.discountValue}
              error={model.formError?.fields?.discountValue}
              onChange={model.handleChange}
            />
          ) : null}
        </div>
      </section>

      <section className='border-t border-[var(--color-border)] pt-6'>
        <h2 className='mb-0 text-lg font-black'>Specifications</h2>

        <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
          Keep specifications as a simple JSON key/value object.
        </p>

        <Textarea
          id='product-specifications'
          name='specifications'
          rows={8}
          disabled={model.saving}
          value={model.form.specifications}
          error={model.formError?.fields?.specifications}
          onChange={model.handleChange}
          className='mt-5 font-mono'
        />
      </section>

      {!model.editMode ? (
        <section className='border-t border-[var(--color-border)] pt-6'>
          <h2 className='mb-0 text-lg font-black'>Initial Inventory</h2>

          <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
            Choose whether this Product has one stock position or separate stock
            positions for Variants.
          </p>

          <div className='mt-5 flex flex-wrap gap-6'>
            <label className='flex items-center gap-2 text-sm font-semibold'>
              <input
                type='radio'
                name='inventoryMode'
                value='simple'
                checked={model.form.inventoryMode === 'simple'}
                disabled={model.saving}
                onChange={model.handleChange}
              />
              Simple Product
            </label>

            <label className='flex items-center gap-2 text-sm font-semibold'>
              <input
                type='radio'
                name='inventoryMode'
                value='variant'
                checked={model.form.inventoryMode === 'variant'}
                disabled={model.saving}
                onChange={model.handleChange}
              />
              Variant Product
            </label>
          </div>

          {model.formError?.fields?.inventory ? (
            <Alert variant='danger' className='mt-4'>
              {model.formError.fields.inventory}
            </Alert>
          ) : null}

          {model.form.inventoryMode === 'simple' ? (
            <div className='mt-5 max-w-sm'>
              <Input
                id='initial-quantity'
                name='initialQuantity'
                label='Initial quantity'
                type='number'
                min='0'
                step='1'
                required
                disabled={model.saving}
                value={model.form.initialQuantity}
                hint='Use 0 when stock has not arrived yet.'
                error={model.formError?.fields?.initialQuantity}
                onChange={model.handleChange}
              />
            </div>
          ) : (
            <Textarea
              id='initial-variants'
              name='initialVariants'
              label='Initial Variants'
              rows={12}
              required
              disabled={model.saving}
              value={model.form.initialVariants}
              hint='Each Variant needs options, an initialQuantity and isActive. Initial quantities use whole units.'
              error={
                model.formError?.fields?.variants ??
                model.formError?.fields?.options
              }
              onChange={model.handleChange}
              className='mt-5 font-mono'
            />
          )}
        </section>
      ) : null}

      {!model.editMode ? (
        <section className='border-t border-[var(--color-border)] pt-6'>
          <h2 className='mb-0 text-lg font-black'>Initial images</h2>

          <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
            Upload 1–5 JPEG, PNG or WebP images. Each image must be 5 MB or
            smaller.
          </p>

          <input
            type='file'
            multiple
            accept='image/jpeg,image/png,image/webp'
            disabled={model.saving}
            onChange={model.handleImagesChange}
            className='mt-5 block w-full text-sm text-[var(--color-muted)] file:mr-4 file:border file:border-[var(--color-border-strong)] file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold'
          />

          {model.images.length > 0 ? (
            <ul className='mt-4 space-y-1 text-sm text-[var(--color-muted)]'>
              {model.images.map((image) => (
                <li key={`${image.name}-${image.size}`}>{image.name}</li>
              ))}
            </ul>
          ) : null}

          {model.formError?.fields?.images ? (
            <Alert variant='danger' className='mt-4'>
              {model.formError.fields.images}
            </Alert>
          ) : null}
        </section>
      ) : (
        <>
          <AdminProductImageManager
            product={model.product}
            onProductChange={model.setProduct}
            disabled={model.saving || model.variantManagerBusy}
            onBusyChange={model.setImageManagerBusy}
          />

          <AdminProductVariantManager
            product={model.product}
            onProductChange={model.setProduct}
            disabled={model.saving || model.imageManagerBusy}
            onBusyChange={model.setVariantManagerBusy}
          />
        </>
      )}

      {model.formError?.fields?.request ? (
        <Alert variant='danger'>{model.formError.fields.request}</Alert>
      ) : null}

      <div className='flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-6'>
        <Button
          type='submit'
          disabled={
            busy || model.referencesLoading || Boolean(model.referencesError)
          }>
          {model.saving
            ? 'Saving...'
            : model.editMode
              ? 'Save changes'
              : 'Create Product'}
        </Button>

        <Link
          to={
            model.editMode ? `/admin/products/${productId}` : '/admin/products'
          }
          className='inline-flex min-h-10 items-center border border-[var(--color-border-strong)] px-4 text-sm font-semibold hover:border-[var(--color-ink)]'>
          Cancel
        </Link>
      </div>
    </form>
  );
}
