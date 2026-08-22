import { useCallback, useEffect, useState } from 'react';

import { useNavigate } from 'react-router';

import {
  createAdminCoupon,
  fetchAdminCoupon,
  updateAdminCoupon,
} from '../../../api/couponApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import { paiseToRupeesInput } from '../../../utils/money.js';

import { ADMIN_COUPON_EMPTY_FORM } from '../coupon.constants.js';

import {
  toCouponDatetimeLocal,
  validateAdminCouponForm,
} from '../coupon.utils.js';

export function useAdminCouponForm(couponId) {
  const navigate = useNavigate();

  const editMode = Boolean(couponId);

  const [coupon, setCoupon] = useState(null);

  const [form, setForm] = useState(ADMIN_COUPON_EMPTY_FORM);

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

        startsAt: toCouponDatetimeLocal(item.startsAt),

        expiresAt: toCouponDatetimeLocal(item.expiresAt),

        usageLimit: item.usageLimit === null ? '' : String(item.usageLimit),

        isActive: item.isActive,
      });
    } catch (requestError) {
      setLoadError(
        normalizeApiError(
          requestError,

          'Unable to load this Coupon.',
        ),
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

  async function submit(event) {
    event.preventDefault();

    setFormError(null);

    const { fields, payload } = validateAdminCouponForm({
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
        await updateAdminCoupon(
          couponId,

          payload,
        );
      } else {
        await createAdminCoupon(payload);
      }

      navigate(
        '/admin/coupons',

        {
          state: {
            message: editMode
              ? 'Coupon updated successfully.'
              : 'Coupon created successfully.',
          },
        },
      );
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

  return {
    coupon,

    form,

    editMode,

    loading,
    saving,

    loadError,
    formError,

    loadCoupon,

    handleChange,
    submit,
  };
}
