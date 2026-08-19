import {
  validateCouponCreateInput,
  validateCouponUpdateInput,
  validateCouponStatusInput,
  validateAdminCouponQuery,
} from './coupon.validation.js';

import {
  getAdminCoupons,
  getAdminCoupon,
  createCoupon,
  updateCoupon,
  updateCouponStatus,
} from './coupon.service.js';

export async function getCouponsForAdmin(req, res) {
  const query = validateAdminCouponQuery(req.query);

  const result = await getAdminCoupons(query);

  res.status(200).json({
    success: true,

    data: {
      items: result.items,
    },

    meta: result.meta,
  });
}

export async function getCouponForAdmin(req, res) {
  const coupon = await getAdminCoupon(req.params.couponId);

  res.status(200).json({
    success: true,

    data: {
      coupon,
    },
  });
}

export async function createCouponForAdmin(req, res) {
  const input = validateCouponCreateInput(req.body);

  const coupon = await createCoupon(input);

  res.status(201).json({
    success: true,

    data: {
      coupon,
    },
  });
}

export async function updateCouponForAdmin(req, res) {
  const input = validateCouponUpdateInput(req.body);

  const coupon = await updateCoupon(req.params.couponId, input);

  res.status(200).json({
    success: true,

    data: {
      coupon,
    },
  });
}

export async function updateCouponStatusForAdmin(req, res) {
  const input = validateCouponStatusInput(req.body);

  const coupon = await updateCouponStatus(req.params.couponId, input.isActive);

  res.status(200).json({
    success: true,

    data: {
      coupon,
    },
  });
}
