import { useEffect, useState } from 'react';

import { Link, useNavigate, useParams } from 'react-router';

import {
  createAdminProduct,
  fetchAdminProduct,
  updateAdminProduct,
} from '../../api/productApi.js';

import { fetchAdminCategories, fetchSports } from '../../api/categoryApi.js';

import AdminProductImageManager from './components/AdminProductImageManager.jsx';
import AdminProductVariantManager from './components/AdminProductVariantManager.jsx';

import { normalizeApiError } from '../../api/errors.js';

import { paiseToRupeesInput, parseRupeesToPaise } from '../../utils/money.js';

const MAX_IMAGES = 5;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const INITIAL_VARIANTS_EXAMPLE = JSON.stringify(
  [
    {
      options: {
        size: '8',
        color: 'Black',
      },
      initialQuantity: 0,
      isActive: true,
    },
  ],
  null,
  2,
);

const EMPTY_FORM = {
  name: '',
  description: '',
  brand: '',
  sport: '',
  categoryId: '',
  basePrice: '',
  discountType: '',
  discountValue: '',
  specifications: '{}',

  inventoryMode: 'simple',
  initialQuantity: '0',
  initialVariants: INITIAL_VARIANTS_EXAMPLE,

  isActive: true,
};

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseSpecifications(value) {
  if (!value.trim()) {
    return {
      value: {},
      error: null,
    };
  }

  let parsed;

  try {
    parsed = JSON.parse(value);
  } catch {
    return {
      value: null,
      error: 'Specifications must contain valid JSON.',
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      value: null,
      error: 'Specifications must be a JSON object.',
    };
  }

  const invalid = Object.values(parsed).some((item) => {
    if (typeof item === 'string' || typeof item === 'boolean') {
      return false;
    }

    if (typeof item === 'number') {
      return !Number.isFinite(item);
    }

    return true;
  });

  if (invalid) {
    return {
      value: null,
      error:
        'Specification values must be text, numbers, or true/false values.',
    };
  }

  return {
    value: parsed,
    error: null,
  };
}

function normalizeSingleLineText(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function getInitialVariantKey(options) {
  return JSON.stringify(
    Object.entries(options)
      .map(([name, value]) => [
        normalizeSingleLineText(name).toLowerCase(),
        normalizeSingleLineText(value).toLowerCase(),
      ])
      .sort(([leftName], [rightName]) => leftName.localeCompare(rightName)),
  );
}

function parseInitialVariants(value) {
  let parsed;

  try {
    parsed = JSON.parse(value);
  } catch {
    return {
      value: null,
      error: 'Initial Variants must contain valid JSON.',
    };
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return {
      value: null,
      error: 'Add at least one initial Variant.',
    };
  }

  const normalizedVariants = [];
  const seenVariantKeys = new Set();

  for (let index = 0; index < parsed.length; index += 1) {
    const variant = parsed[index];

    if (!isPlainObject(variant)) {
      return {
        value: null,
        error: `Variant ${index + 1} must be an object.`,
      };
    }

    if (
      !isPlainObject(variant.options) ||
      Object.keys(variant.options).length === 0
    ) {
      return {
        value: null,
        error: `Variant ${index + 1} needs at least one option.`,
      };
    }

    const options = {};

    for (const [rawName, rawValue] of Object.entries(variant.options)) {
      const name = normalizeSingleLineText(rawName);

      if (
        !name ||
        name.startsWith('$') ||
        name.includes('.') ||
        typeof rawValue !== 'string'
      ) {
        return {
          value: null,
          error: `Variant ${index + 1} contains invalid options.`,
        };
      }

      const optionValue = normalizeSingleLineText(rawValue);

      if (!optionValue) {
        return {
          value: null,
          error: `Variant ${index + 1} option values cannot be empty.`,
        };
      }

      options[name] = optionValue;
    }

    if (
      !Number.isSafeInteger(variant.initialQuantity) ||
      variant.initialQuantity < 0
    ) {
      return {
        value: null,
        error: `Variant ${index + 1} initial quantity must be a non-negative integer.`,
      };
    }

    if (typeof variant.isActive !== 'boolean') {
      return {
        value: null,
        error: `Variant ${index + 1} active status must be true or false.`,
      };
    }

    const variantKey = getInitialVariantKey(options);

    if (seenVariantKeys.has(variantKey)) {
      return {
        value: null,
        error: 'Initial Variant option combinations must be unique.',
      };
    }

    seenVariantKeys.add(variantKey);

    normalizedVariants.push({
      options,
      initialQuantity: variant.initialQuantity,
      isActive: variant.isActive,
    });
  }

  return {
    value: normalizedVariants,
    error: null,
  };
}

function validateProductForm({ form, editMode, product, categories, images }) {
  const fields = {};

  const name = form.name.trim();
  const description = form.description.trim();
  const brand = form.brand.trim();

  if (!name) {
    fields.name = 'Product name is required.';
  }

  if (!description) {
    fields.description = 'Description is required.';
  }

  if (!brand) {
    fields.brand = 'Brand is required.';
  }

  if (!form.sport) {
    fields.sport = 'Sport is required.';
  }

  if (!form.categoryId) {
    fields.categoryId = 'Category is required.';
  }

  const category = categories.find((item) => item.id === form.categoryId);

  if (form.categoryId && (!category || category.sport !== form.sport)) {
    fields.categoryId = 'Select a category belonging to the selected sport.';
  }

  const isActive = editMode ? product?.isActive : form.isActive;

  if (category && isActive && !category.isActive) {
    fields.categoryId = 'An active product requires an active category.';
  }

  const basePrice = parseRupeesToPaise(form.basePrice);

  if (basePrice === null || basePrice <= 0) {
    fields.basePrice = 'Enter a valid price greater than ₹0.';
  }

  const discountType = form.discountType || null;

  let discountValue = null;

  if (discountType === 'percentage') {
    if (!/^\d+$/.test(form.discountValue.trim())) {
      fields.discountValue = 'Enter a whole-number percentage.';
    } else {
      discountValue = Number(form.discountValue);

      if (discountValue <= 0 || discountValue > 100) {
        fields.discountValue = 'Percentage must be between 1 and 100.';
      }
    }
  }

  if (discountType === 'fixed') {
    discountValue = parseRupeesToPaise(form.discountValue);

    if (discountValue === null || discountValue <= 0) {
      fields.discountValue = 'Enter a valid fixed discount.';
    } else if (basePrice !== null && discountValue >= basePrice) {
      fields.discountValue = 'Fixed discount must be below the base price.';
    }
  }

  const parsedSpecifications = parseSpecifications(form.specifications);

  if (parsedSpecifications.error) {
    fields.specifications = parsedSpecifications.error;
  }

  let inventoryPayload = {};

  if (!editMode) {
    if (form.inventoryMode === 'simple') {
      if (!/^\d+$/.test(form.initialQuantity.trim())) {
        fields.initialQuantity =
          'Initial quantity must be a non-negative whole number.';
      } else {
        const initialQuantity = Number(form.initialQuantity);

        if (!Number.isSafeInteger(initialQuantity)) {
          fields.initialQuantity =
            'Initial quantity must be a valid non-negative whole number.';
        } else {
          inventoryPayload = {
            initialQuantity,
          };
        }
      }
    } else if (form.inventoryMode === 'variant') {
      const parsedVariants = parseInitialVariants(form.initialVariants);

      if (parsedVariants.error) {
        fields.variants = parsedVariants.error;
      } else {
        inventoryPayload = {
          variants: parsedVariants.value,
        };
      }
    } else {
      fields.inventory = 'Select an Inventory mode.';
    }

    if (images.length === 0) {
      fields.images = 'At least one product image is required.';
    } else if (images.length > MAX_IMAGES) {
      fields.images = 'You can upload a maximum of 5 images.';
    } else {
      const invalidType = images.some(
        (image) => !ALLOWED_IMAGE_TYPES.has(image.type),
      );

      const tooLarge = images.some((image) => image.size > MAX_IMAGE_SIZE);

      if (invalidType) {
        fields.images = 'Only JPEG, PNG and WebP images are allowed.';
      } else if (tooLarge) {
        fields.images = 'Each image must be 5 MB or smaller.';
      }
    }
  }

  return {
    fields,

    payload: {
      name,
      description,
      brand,
      sport: form.sport,
      categoryId: form.categoryId,
      basePrice,
      discountType,
      discountValue,
      specifications: parsedSpecifications.value ?? {},
      ...(editMode
        ? {}
        : {
            ...inventoryPayload,
            isActive: form.isActive,
          }),
    },
  };
}

function AdminProductFormPage() {
  const { productId } = useParams();

  const navigate = useNavigate();

  const editMode = Boolean(productId);

  const [product, setProduct] = useState(null);

  const [sports, setSports] = useState([]);

  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);

  const [images, setImages] = useState([]);

  const [loading, setLoading] = useState(editMode);

  const [referencesLoading, setReferencesLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [loadError, setLoadError] = useState(null);

  const [referencesError, setReferencesError] = useState(null);

  const [formError, setFormError] = useState(null);

  const [imageManagerBusy, setImageManagerBusy] = useState(false);

  const [variantManagerBusy, setVariantManagerBusy] = useState(false);

  useEffect(() => {
    async function loadReferences() {
      setReferencesLoading(true);

      try {
        const [sportItems, categoryItems] = await Promise.all([
          fetchSports(),
          fetchAdminCategories(),
        ]);

        setSports(sportItems);
        setCategories(categoryItems);
      } catch (requestError) {
        setReferencesError(
          normalizeApiError(requestError, 'Unable to load catalog references.'),
        );
      } finally {
        setReferencesLoading(false);
      }
    }

    loadReferences();
  }, []);

  useEffect(() => {
    if (!editMode) {
      return;
    }

    async function loadProduct() {
      setLoading(true);
      setLoadError(null);

      try {
        const item = await fetchAdminProduct(productId);

        setProduct(item);

        setForm({
          name: item.name,
          description: item.description,
          brand: item.brand,
          sport: item.sport,
          categoryId: item.category?.id ?? '',
          basePrice: paiseToRupeesInput(item.basePrice),
          discountType: item.discountType ?? '',
          discountValue:
            item.discountType === 'percentage'
              ? String(item.discountValue)
              : item.discountType === 'fixed'
                ? paiseToRupeesInput(item.discountValue)
                : '',
          specifications: JSON.stringify(item.specifications ?? {}, null, 2),
          isActive: item.isActive,
        });
      } catch (requestError) {
        setLoadError(
          normalizeApiError(requestError, 'Unable to load this product.'),
        );
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [editMode, productId]);

  const visibleCategories = form.sport
    ? categories.filter((category) => category.sport === form.sport)
    : [];

  const effectiveIsActive = editMode ? product?.isActive : form.isActive;

  function handleChange(event) {
    const { name, value, checked, type } = event.target;

    setForm((current) => {
      const next = {
        ...current,
        [name]: type === 'checkbox' ? checked : value,
      };

      if (name === 'sport') {
        const selectedCategory = categories.find(
          (category) => category.id === current.categoryId,
        );

        if (selectedCategory && selectedCategory.sport !== value) {
          next.categoryId = '';
        }
      }

      if (name === 'discountType' && !value) {
        next.discountValue = '';
      }

      if (name === 'isActive' && checked) {
        const selectedCategory = categories.find(
          (category) => category.id === current.categoryId,
        );

        if (selectedCategory && !selectedCategory.isActive) {
          next.categoryId = '';
        }
      }

      return next;
    });

    setFormError(null);
  }

  function handleImagesChange(event) {
    setImages(Array.from(event.target.files ?? []));

    setFormError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setFormError(null);

    const { fields, payload } = validateProductForm({
      form,
      editMode,
      product,
      categories,
      images,
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
      let savedProduct;

      if (editMode) {
        savedProduct = await updateAdminProduct(productId, payload);
      } else {
        savedProduct = await createAdminProduct(payload, images);
      }

      navigate(`/admin/products/${savedProduct.id}`, {
        state: {
          message: editMode
            ? 'Product updated successfully.'
            : 'Product created successfully.',
        },
      });
    } catch (requestError) {
      setFormError(
        normalizeApiError(
          requestError,
          editMode
            ? 'Unable to update this product.'
            : 'Unable to create this product.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className='p-5 sm:p-6'>
        <p className='text-sm text-neutral-600'>Loading product...</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className='p-5 sm:p-6'>
        <div
          role='alert'
          className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {loadError.message}
        </div>

        <Link
          to='/admin/products'
          className='mt-5 inline-flex font-medium underline underline-offset-4'>
          Back to products
        </Link>
      </main>
    );
  }

  return (
    <main className='p-5 sm:p-6'>
      <div>
        <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
          Catalog management
        </p>

        <h1 className='mt-3 text-3xl font-semibold'>
          {editMode ? 'Edit product' : 'Add product'}
        </h1>

        <p className='mt-3 text-sm text-neutral-600'>
          {editMode
            ? 'Update catalog-owned product information, images and variants. Product status is managed separately.'
            : 'Create the catalog Product, initial Inventory and initial images.'}
        </p>
      </div>

      {referencesError && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {referencesError.message}
        </div>
      )}

      {formError && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {formError.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className='mt-8 grid gap-6'>
        <section className='grid gap-5 border border-neutral-200 p-5 lg:grid-cols-2'>
          <div className='lg:col-span-2'>
            <h2 className='text-lg font-semibold'>Product information</h2>
          </div>

          <div>
            <label htmlFor='name' className='mb-2 block text-sm font-medium'>
              Product name
            </label>

            <input
              id='name'
              name='name'
              required
              disabled={saving}
              value={form.name}
              onChange={handleChange}
              className='w-full border border-neutral-300 px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100'
            />

            {formError?.fields?.name && (
              <p className='mt-2 text-sm text-red-600'>
                {formError.fields.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor='brand' className='mb-2 block text-sm font-medium'>
              Brand
            </label>

            <input
              id='brand'
              name='brand'
              required
              disabled={saving}
              value={form.brand}
              onChange={handleChange}
              className='w-full border border-neutral-300 px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100'
            />

            {formError?.fields?.brand && (
              <p className='mt-2 text-sm text-red-600'>
                {formError.fields.brand}
              </p>
            )}
          </div>

          <div className='lg:col-span-2'>
            <label
              htmlFor='description'
              className='mb-2 block text-sm font-medium'>
              Description
            </label>

            <textarea
              id='description'
              name='description'
              required
              rows='5'
              disabled={saving}
              value={form.description}
              onChange={handleChange}
              className='w-full border border-neutral-300 px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100'
            />

            {formError?.fields?.description && (
              <p className='mt-2 text-sm text-red-600'>
                {formError.fields.description}
              </p>
            )}
          </div>

          <div>
            <label htmlFor='sport' className='mb-2 block text-sm font-medium'>
              Sport
            </label>

            <select
              id='sport'
              name='sport'
              required
              disabled={saving || referencesLoading}
              value={form.sport}
              onChange={handleChange}
              className='w-full border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100'>
              <option value=''>Select sport</option>

              {sports.map((sport) => (
                <option key={sport.value} value={sport.value}>
                  {sport.label}
                </option>
              ))}
            </select>

            {formError?.fields?.sport && (
              <p className='mt-2 text-sm text-red-600'>
                {formError.fields.sport}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor='categoryId'
              className='mb-2 block text-sm font-medium'>
              Category
            </label>

            <select
              id='categoryId'
              name='categoryId'
              required
              disabled={saving || referencesLoading || !form.sport}
              value={form.categoryId}
              onChange={handleChange}
              className='w-full border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100'>
              <option value=''>Select category</option>

              {visibleCategories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                  disabled={effectiveIsActive && !category.isActive}>
                  {category.name}
                  {!category.isActive ? ' (Inactive)' : ''}
                </option>
              ))}
            </select>

            {formError?.fields?.categoryId && (
              <p className='mt-2 text-sm text-red-600'>
                {formError.fields.categoryId}
              </p>
            )}
          </div>

          {!editMode && (
            <label className='flex items-start gap-3 lg:col-span-2'>
              <input
                type='checkbox'
                name='isActive'
                checked={form.isActive}
                disabled={saving}
                onChange={handleChange}
                className='mt-1 h-4 w-4'
              />

              <span>
                <span className='block text-sm font-medium'>
                  Active product
                </span>

                <span className='mt-1 block text-xs text-neutral-500'>
                  Active products require an active category.
                </span>
              </span>
            </label>
          )}
        </section>

        <section className='grid gap-5 border border-neutral-200 p-5 lg:grid-cols-2'>
          <div className='lg:col-span-2'>
            <h2 className='text-lg font-semibold'>Pricing</h2>

            <p className='mt-1 text-sm text-neutral-600'>
              Enter currency values in rupees. They are converted to integer
              paise before sending to the API.
            </p>
          </div>

          <div>
            <label
              htmlFor='basePrice'
              className='mb-2 block text-sm font-medium'>
              Base price (₹)
            </label>

            <input
              id='basePrice'
              name='basePrice'
              type='number'
              min='0.01'
              step='0.01'
              required
              disabled={saving}
              value={form.basePrice}
              onChange={handleChange}
              className='w-full border border-neutral-300 px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100'
            />

            {formError?.fields?.basePrice && (
              <p className='mt-2 text-sm text-red-600'>
                {formError.fields.basePrice}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor='discountType'
              className='mb-2 block text-sm font-medium'>
              Discount
            </label>

            <select
              id='discountType'
              name='discountType'
              value={form.discountType}
              disabled={saving}
              onChange={handleChange}
              className='w-full border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100'>
              <option value=''>No discount</option>

              <option value='percentage'>Percentage</option>

              <option value='fixed'>Fixed amount</option>
            </select>
          </div>

          {form.discountType && (
            <div>
              <label
                htmlFor='discountValue'
                className='mb-2 block text-sm font-medium'>
                {form.discountType === 'percentage'
                  ? 'Discount percentage'
                  : 'Discount amount (₹)'}
              </label>

              <input
                id='discountValue'
                name='discountValue'
                type='number'
                min={form.discountType === 'percentage' ? '1' : '0.01'}
                step={form.discountType === 'percentage' ? '1' : '0.01'}
                disabled={saving}
                value={form.discountValue}
                onChange={handleChange}
                className='w-full border border-neutral-300 px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100'
              />

              {formError?.fields?.discountValue && (
                <p className='mt-2 text-sm text-red-600'>
                  {formError.fields.discountValue}
                </p>
              )}
            </div>
          )}
        </section>

        <section className='border border-neutral-200 p-5'>
          <h2 className='text-lg font-semibold'>Specifications</h2>

          <p className='mt-1 text-sm text-neutral-600'>
            Keep specifications as a simple JSON key/value object.
          </p>

          <textarea
            name='specifications'
            rows='8'
            disabled={saving}
            value={form.specifications}
            onChange={handleChange}
            className='mt-4 w-full border border-neutral-300 px-4 py-3 font-mono text-sm outline-none focus:border-black disabled:bg-neutral-100'
          />

          {formError?.fields?.specifications && (
            <p className='mt-2 text-sm text-red-600'>
              {formError.fields.specifications}
            </p>
          )}
        </section>

        {!editMode && (
          <section className='border border-neutral-200 p-5'>
            <h2 className='text-lg font-semibold'>Initial inventory</h2>

            <p className='mt-1 text-sm text-neutral-600'>
              Choose whether this Product has one stock position or separate
              stock positions for Variants.
            </p>

            <div className='mt-5 flex flex-wrap gap-6'>
              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='radio'
                  name='inventoryMode'
                  value='simple'
                  checked={form.inventoryMode === 'simple'}
                  disabled={saving}
                  onChange={handleChange}
                />
                Simple Product
              </label>

              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='radio'
                  name='inventoryMode'
                  value='variant'
                  checked={form.inventoryMode === 'variant'}
                  disabled={saving}
                  onChange={handleChange}
                />
                Variant Product
              </label>
            </div>

            {formError?.fields?.inventory && (
              <p className='mt-2 text-sm text-red-600'>
                {formError.fields.inventory}
              </p>
            )}

            {form.inventoryMode === 'simple' ? (
              <div className='mt-5 max-w-sm'>
                <label
                  htmlFor='initialQuantity'
                  className='mb-2 block text-sm font-medium'>
                  Initial quantity
                </label>

                <input
                  id='initialQuantity'
                  name='initialQuantity'
                  type='number'
                  min='0'
                  step='1'
                  required
                  disabled={saving}
                  value={form.initialQuantity}
                  onChange={handleChange}
                  className='w-full border border-neutral-300 px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100'
                />

                <p className='mt-2 text-xs text-neutral-500'>
                  Use 0 when stock has not arrived yet.
                </p>

                {formError?.fields?.initialQuantity && (
                  <p className='mt-2 text-sm text-red-600'>
                    {formError.fields.initialQuantity}
                  </p>
                )}
              </div>
            ) : (
              <div className='mt-5'>
                <label
                  htmlFor='initialVariants'
                  className='mb-2 block text-sm font-medium'>
                  Initial Variants
                </label>

                <textarea
                  id='initialVariants'
                  name='initialVariants'
                  rows='12'
                  required
                  disabled={saving}
                  value={form.initialVariants}
                  onChange={handleChange}
                  className='w-full border border-neutral-300 px-4 py-3 font-mono text-sm outline-none focus:border-black disabled:bg-neutral-100'
                />

                <p className='mt-2 text-xs text-neutral-500'>
                  Each Variant needs options, an initialQuantity, and isActive.
                  Initial quantities use whole units.
                </p>

                {(formError?.fields?.variants ||
                  formError?.fields?.options) && (
                  <p className='mt-2 text-sm text-red-600'>
                    {formError.fields.variants ?? formError.fields.options}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {!editMode ? (
          <section className='border border-neutral-200 p-5'>
            <h2 className='text-lg font-semibold'>Initial images</h2>

            <p className='mt-1 text-sm text-neutral-600'>
              Upload 1–5 JPEG, PNG or WebP images. Each image must be 5 MB or
              smaller.
            </p>

            <input
              type='file'
              multiple
              accept='image/jpeg,image/png,image/webp'
              disabled={saving}
              onChange={handleImagesChange}
              className='mt-4 block w-full text-sm'
            />

            {images.length > 0 && (
              <ul className='mt-4 space-y-2 text-sm text-neutral-600'>
                {images.map((image) => (
                  <li key={`${image.name}-${image.size}`}>{image.name}</li>
                ))}
              </ul>
            )}

            {formError?.fields?.images && (
              <p className='mt-3 text-sm text-red-600'>
                {formError.fields.images}
              </p>
            )}
          </section>
        ) : (
          <>
            <AdminProductImageManager
              product={product}
              onProductChange={setProduct}
              disabled={saving || variantManagerBusy}
              onBusyChange={setImageManagerBusy}
            />

            <AdminProductVariantManager
              product={product}
              onProductChange={setProduct}
              disabled={saving || imageManagerBusy}
              onBusyChange={setVariantManagerBusy}
            />
          </>
        )}

        {formError?.fields?.request && (
          <div
            role='alert'
            className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {formError.fields.request}
          </div>
        )}

        <div className='flex flex-wrap gap-3'>
          <button
            type='submit'
            disabled={
              saving ||
              imageManagerBusy ||
              variantManagerBusy ||
              referencesLoading ||
              Boolean(referencesError)
            }
            className='bg-black px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'>
            {saving
              ? 'Saving...'
              : editMode
                ? 'Save changes'
                : 'Create product'}
          </button>

          <Link
            to={editMode ? `/admin/products/${productId}` : '/admin/products'}
            className='border border-neutral-300 px-5 py-3 text-sm font-medium'>
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}

export default AdminProductFormPage;
