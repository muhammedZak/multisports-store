import { useCallback, useEffect, useState } from 'react';

import {
  createAdminCategory,
  fetchAdminCategories,
  fetchSports,
  updateAdminCategory,
  updateAdminCategoryStatus,
} from '../../../api/categoryApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import {
  CATEGORY_EMPTY_FILTERS,
  CATEGORY_EMPTY_FORM,
} from '../category.constants.js';

import { validateAdminCategoryForm } from '../category.utils.js';

export function useAdminCategories() {
  const [sports, setSports] = useState([]);

  const [categories, setCategories] = useState([]);

  const [filterForm, setFilterForm] = useState(CATEGORY_EMPTY_FILTERS);

  const [appliedFilters, setAppliedFilters] = useState(CATEGORY_EMPTY_FILTERS);

  const [form, setForm] = useState(CATEGORY_EMPTY_FORM);

  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const [loading, setLoading] = useState(true);

  const [sportsLoading, setSportsLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const [listError, setListError] = useState(null);

  const [sportsError, setSportsError] = useState(null);

  const [formError, setFormError] = useState(null);

  const [message, setMessage] = useState('');

  const editMode = Boolean(editingCategoryId);

  const loadCategories = useCallback(async () => {
    setLoading(true);

    setListError(null);

    try {
      const items = await fetchAdminCategories(appliedFilters);

      setCategories(items);
    } catch (requestError) {
      setListError(
        normalizeApiError(
          requestError,
          'Unable to load categories. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  const loadSports = useCallback(async () => {
    setSportsLoading(true);

    setSportsError(null);

    try {
      const items = await fetchSports();

      setSports(items);
    } catch (requestError) {
      setSportsError(
        normalizeApiError(
          requestError,
          'Unable to load sports. Please try again.',
        ),
      );
    } finally {
      setSportsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadSports();
  }, [loadSports]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilterForm((current) => ({
      ...current,

      [name]: value,
    }));
  }

  function applyFilters(event) {
    event.preventDefault();

    setAppliedFilters({
      q: filterForm.q.trim(),

      sport: filterForm.sport,

      status: filterForm.status,
    });
  }

  function resetFilters() {
    setFilterForm(CATEGORY_EMPTY_FILTERS);

    setAppliedFilters(CATEGORY_EMPTY_FILTERS);
  }

  function handleFormChange(event) {
    const { name, value, checked, type } = event.target;

    setForm((current) => ({
      ...current,

      [name]: type === 'checkbox' ? checked : value,
    }));

    setFormError(null);

    setMessage('');
  }

  function resetForm() {
    setEditingCategoryId(null);

    setForm(CATEGORY_EMPTY_FORM);

    setFormError(null);
  }

  function startEdit(category) {
    setEditingCategoryId(category.id);

    setForm({
      name: category.name,

      sport: category.sport,

      isActive: category.isActive,
    });

    setFormError(null);

    setMessage('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function submitCategory(event) {
    event.preventDefault();

    setFormError(null);

    setMessage('');

    const { fields, normalized } = validateAdminCategoryForm(form);

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
        await updateAdminCategory(
          editingCategoryId,

          normalized,
        );

        setMessage('Category updated successfully.');
      } else {
        await createAdminCategory({
          ...normalized,

          isActive: form.isActive,
        });

        setMessage('Category created successfully.');
      }

      resetForm();

      await loadCategories();
    } catch (requestError) {
      setFormError(
        normalizeApiError(
          requestError,

          editMode
            ? 'Unable to update this category.'
            : 'Unable to create this category.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(category) {
    const nextIsActive = !category.isActive;

    if (!nextIsActive) {
      const confirmed = window.confirm(
        `Deactivate "${category.name}"? It will no longer appear in public category results.`,
      );

      if (!confirmed) {
        return;
      }
    }

    setStatusUpdatingId(category.id);

    setListError(null);

    setMessage('');

    try {
      await updateAdminCategoryStatus(
        category.id,

        nextIsActive,
      );

      setMessage(
        nextIsActive
          ? 'Category activated successfully.'
          : 'Category deactivated successfully.',
      );

      if (editingCategoryId === category.id) {
        resetForm();
      }

      await loadCategories();
    } catch (requestError) {
      setListError(
        normalizeApiError(
          requestError,

          nextIsActive
            ? 'Unable to activate this category.'
            : 'Unable to deactivate this category.',
        ),
      );
    } finally {
      setStatusUpdatingId(null);
    }
  }

  return {
    sports,
    categories,

    filterForm,

    form,

    editMode,

    loading,
    sportsLoading,

    saving,
    statusUpdatingId,

    listError,
    sportsError,
    formError,

    message,

    loadCategories,
    loadSports,

    handleFilterChange,
    applyFilters,
    resetFilters,

    handleFormChange,

    resetForm,
    startEdit,

    submitCategory,
    changeStatus,
  };
}
