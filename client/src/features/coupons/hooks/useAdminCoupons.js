import { useCallback, useEffect, useState } from 'react';

import { useLocation, useNavigate } from 'react-router';

import {
  fetchAdminCoupons,
  updateAdminCouponStatus,
} from '../../../api/couponApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import {
  ADMIN_COUPON_DEFAULT_META,
  ADMIN_COUPON_DEFAULT_QUERY,
  ADMIN_COUPON_EMPTY_FILTERS,
} from '../coupon.constants.js';

export function useAdminCoupons() {
  const location = useLocation();

  const navigate = useNavigate();

  const [coupons, setCoupons] = useState([]);

  const [filterForm, setFilterForm] = useState(ADMIN_COUPON_EMPTY_FILTERS);

  const [query, setQuery] = useState(ADMIN_COUPON_DEFAULT_QUERY);

  const [meta, setMeta] = useState(ADMIN_COUPON_DEFAULT_META);

  const [loading, setLoading] = useState(true);

  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const [error, setError] = useState(null);

  const [message, setMessage] = useState(location.state?.message ?? '');

  useEffect(() => {
    if (!location.state?.message) {
      return;
    }

    navigate(
      `${location.pathname}${location.search}`,

      {
        replace: true,
        state: null,
      },
    );
  }, [location.pathname, location.search, location.state, navigate]);

  const loadCoupons = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const result = await fetchAdminCoupons(query);

      setCoupons(result.items);

      setMeta(result.meta);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,

          'Unable to load coupons. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilterForm((current) => ({
      ...current,

      [name]: value,
    }));
  }

  function applyFilters(event) {
    event.preventDefault();

    setQuery({
      ...filterForm,

      q: filterForm.q.trim(),

      page: 1,
      limit: 20,
    });
  }

  function resetFilters() {
    setFilterForm(ADMIN_COUPON_EMPTY_FILTERS);

    setQuery(ADMIN_COUPON_DEFAULT_QUERY);
  }

  function changePage(page) {
    setQuery((current) => ({
      ...current,

      page,
    }));
  }

  async function changeStatus(coupon) {
    const nextIsActive = !coupon.isActive;

    if (!nextIsActive) {
      const confirmed = window.confirm(
        `Deactivate "${coupon.code}"? Customers will no longer be able to apply it.`,
      );

      if (!confirmed) {
        return;
      }
    }

    setStatusUpdatingId(coupon.id);

    setError(null);

    setMessage('');

    try {
      await updateAdminCouponStatus(
        coupon.id,

        nextIsActive,
      );

      setMessage(
        nextIsActive
          ? `Coupon ${coupon.code} activated successfully.`
          : `Coupon ${coupon.code} deactivated successfully.`,
      );

      await loadCoupons();
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,

          nextIsActive
            ? 'Unable to activate this Coupon.'
            : 'Unable to deactivate this Coupon.',
        ),
      );
    } finally {
      setStatusUpdatingId(null);
    }
  }

  const filtersActive = Boolean(
    query.q ||
    query.status ||
    query.discountType ||
    query.sort !== 'createdAt' ||
    query.order !== 'desc',
  );

  return {
    coupons,

    filterForm,

    meta,

    loading,

    statusUpdatingId,

    error,
    message,

    filtersActive,

    loadCoupons,

    handleFilterChange,
    applyFilters,
    resetFilters,

    changePage,

    changeStatus,
  };
}
