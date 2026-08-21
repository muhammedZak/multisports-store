import { Order, ORDER_STATUSES } from '../order/order.model.js';

import { Payment, PAYMENT_STATUSES } from '../payment/payment.model.js';

import { Refund } from '../refund/refund.model.js';

import { REFUND_ORIGINS, REFUND_STATUSES } from '../refund/refund.constants.js';

import {
  createAnalyticsBucketKeys,
  resolveAnalyticsRange,
} from './analytics.range.js';

const ORDER_STATUS_VALUES = Object.values(ORDER_STATUSES);

function createPeriodExpression(field, bucket, timezone) {
  return {
    $dateToString: {
      format: bucket === 'month' ? '%Y-%m' : '%Y-%m-%d',

      date: field,

      timezone,
    },
  };
}

async function getRecognizedSalesAnalytics(range) {
  const periodExpression = createPeriodExpression(
    '$placedAt',
    range.bucket,
    range.timezone,
  );

  const [result] = await Order.aggregate([
    {
      $match: {
        placedAt: {
          $gte: range.startAt,
          $lte: range.endAt,
        },

        orderStatus: {
          $ne: ORDER_STATUSES.CANCELLED,
        },
      },
    },

    /*
     * Recognition requires the Order's related
     * Payment to have succeeded.
     */
    {
      $lookup: {
        from: Payment.collection.name,

        localField: 'paymentId',
        foreignField: '_id',

        as: 'payment',
      },
    },

    {
      $match: {
        'payment.status': PAYMENT_STATUSES.SUCCEEDED,
      },
    },

    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,

              grossSales: {
                $sum: '$totalAmount',
              },

              recognizedPaidOrderCount: {
                $sum: 1,
              },
            },
          },
        ],

        trend: [
          {
            $group: {
              _id: periodExpression,

              grossSales: {
                $sum: '$totalAmount',
              },
            },
          },

          {
            $sort: {
              _id: 1,
            },
          },
        ],
      },
    },
  ]);

  return {
    grossSales: result?.summary?.[0]?.grossSales ?? 0,

    recognizedPaidOrderCount:
      result?.summary?.[0]?.recognizedPaidOrderCount ?? 0,

    trend: result?.trend ?? [],
  };
}

async function getCustomerRefundRevenueAnalytics(range) {
  const periodExpression = createPeriodExpression(
    '$refundedAt',
    range.bucket,
    range.timezone,
  );

  const [result] = await Refund.aggregate([
    {
      $match: {
        origin: REFUND_ORIGINS.CUSTOMER_REQUEST,

        status: REFUND_STATUSES.REFUNDED,

        refundedAt: {
          $gte: range.startAt,
          $lte: range.endAt,
        },
      },
    },

    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,

              refundedAmount: {
                $sum: '$amount',
              },
            },
          },
        ],

        trend: [
          {
            $group: {
              _id: periodExpression,

              refundedAmount: {
                $sum: '$amount',
              },
            },
          },

          {
            $sort: {
              _id: 1,
            },
          },
        ],
      },
    },
  ]);

  return {
    refundedAmount: result?.summary?.[0]?.refundedAmount ?? 0,

    trend: result?.trend ?? [],
  };
}

async function getOrderAnalytics(range) {
  const periodExpression = createPeriodExpression(
    '$placedAt',
    range.bucket,
    range.timezone,
  );

  const [result] = await Order.aggregate([
    {
      $match: {
        placedAt: {
          $gte: range.startAt,
          $lte: range.endAt,
        },
      },
    },

    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,

              totalOrders: {
                $sum: 1,
              },

              cancelledOrders: {
                $sum: {
                  $cond: [
                    {
                      $eq: ['$orderStatus', ORDER_STATUSES.CANCELLED],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],

        trend: [
          {
            $group: {
              _id: periodExpression,

              value: {
                $sum: 1,
              },
            },
          },

          {
            $sort: {
              _id: 1,
            },
          },
        ],

        statusDistribution: [
          {
            $group: {
              _id: '$orderStatus',

              value: {
                $sum: 1,
              },
            },
          },
        ],
      },
    },
  ]);

  const statusCountByValue = new Map(
    (result?.statusDistribution ?? []).map((item) => [item._id, item.value]),
  );

  return {
    totalOrders: result?.summary?.[0]?.totalOrders ?? 0,

    cancelledOrders: result?.summary?.[0]?.cancelledOrders ?? 0,

    trend: result?.trend ?? [],

    statusDistribution: ORDER_STATUS_VALUES.filter((status) =>
      statusCountByValue.has(status),
    ).map((status) => ({
      status,

      value: statusCountByValue.get(status),
    })),
  };
}

function zeroFillRevenueTrend(periods, salesTrend, refundTrend) {
  const salesByPeriod = new Map(
    salesTrend.map((item) => [item._id, item.grossSales]),
  );

  const refundsByPeriod = new Map(
    refundTrend.map((item) => [item._id, item.refundedAmount]),
  );

  return periods.map((period) => {
    const grossSales = salesByPeriod.get(period) ?? 0;

    const refundedAmount = refundsByPeriod.get(period) ?? 0;

    return {
      period,
      grossSales,
      refundedAmount,

      /*
       * Do not clamp to zero.
       *
       * A period may legitimately become negative
       * when completed post-purchase refunds exceed
       * newly recognized sales in that period.
       */
      netRevenue: grossSales - refundedAmount,
    };
  });
}

function zeroFillOrderTrend(periods, orderTrend) {
  const ordersByPeriod = new Map(
    orderTrend.map((item) => [item._id, item.value]),
  );

  return periods.map((period) => ({
    period,
    value: ordersByPeriod.get(period) ?? 0,
  }));
}

export async function getAdminAnalyticsFoundation(rangeKey) {
  const range = resolveAnalyticsRange(rangeKey);

  const periods = createAnalyticsBucketKeys(range);

  const [recognizedSales, customerRefunds, orders] = await Promise.all([
    getRecognizedSalesAnalytics(range),

    getCustomerRefundRevenueAnalytics(range),

    getOrderAnalytics(range),
  ]);

  const totalRevenue =
    recognizedSales.grossSales - customerRefunds.refundedAmount;

  /*
   * The contract requires integer-paise money.
   *
   * Division can mathematically produce a
   * fractional paise, so round to the nearest
   * paise for the API value.
   */
  const averageOrderValue =
    recognizedSales.recognizedPaidOrderCount === 0
      ? 0
      : Math.round(
          recognizedSales.grossSales / recognizedSales.recognizedPaidOrderCount,
        );

  return {
    range: {
      key: range.key,

      startAt: range.startAt,
      endAt: range.endAt,

      timezone: range.timezone,
      bucket: range.bucket,
    },

    summary: {
      totalRevenue,

      totalOrders: orders.totalOrders,

      averageOrderValue,
    },

    sales: {
      revenueOverTime: zeroFillRevenueTrend(
        periods,
        recognizedSales.trend,
        customerRefunds.trend,
      ),

      ordersOverTime: zeroFillOrderTrend(periods, orders.trend),
    },

    orders: {
      cancelledOrders: orders.cancelledOrders,

      statusDistribution: orders.statusDistribution,
    },
  };
}
