import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router';

import { fetchAdminCategories, fetchSports } from '../../../api/categoryApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import {
  createAdminProduct,
  fetchAdminProduct,
  updateAdminProduct,
} from '../../../api/productApi.js';

import { paiseToRupeesInput } from '../../../utils/money.js';

import { ADMIN_PRODUCT_EMPTY_FORM } from '../adminProduct.constants.js';

import { validateAdminProductForm } from '../adminProduct.utils.js';

export function useAdminProductForm(productId) {
  const navigate = useNavigate();

  const editMode = Boolean(productId);

  const [product, setProduct] = useState(null);

  const [sports, setSports] = useState([]);

  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState(ADMIN_PRODUCT_EMPTY_FORM);

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

      setReferencesError(null);

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
          ...ADMIN_PRODUCT_EMPTY_FORM,

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

          specifications: JSON.stringify(
            item.specifications ?? {},

            null,

            2,
          ),

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

  async function submit(event) {
    event.preventDefault();

    setFormError(null);

    const { fields, payload } = validateAdminProductForm({
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
        savedProduct = await updateAdminProduct(
          productId,

          payload,
        );
      } else {
        savedProduct = await createAdminProduct(
          payload,

          images,
        );
      }

      navigate(
        `/admin/products/${savedProduct.id}`,

        {
          state: {
            message: editMode
              ? 'Product updated successfully.'
              : 'Product created successfully.',
          },
        },
      );
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

  return {
    product,
    setProduct,

    sports,
    categories,
    visibleCategories,

    form,
    images,

    editMode,
    effectiveIsActive,

    loading,
    referencesLoading,

    saving,

    loadError,
    referencesError,
    formError,

    imageManagerBusy,
    variantManagerBusy,

    setImageManagerBusy,
    setVariantManagerBusy,

    handleChange,
    handleImagesChange,

    submit,
  };
}
