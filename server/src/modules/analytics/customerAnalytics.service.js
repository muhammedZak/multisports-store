import { Order, ORDER_STATUSES } from '../order/order.model.js';

import { Payment, PAYMENT_STATUSES } from '../payment/payment.model.js';

import { User } from '../users/user.model.js';

function createPeriodExpression(field, bucket, timezone) {
  return {
    $dateToString: {
      format: bucket === 'month' ? '%Y-%m' : '%Y-%m-%d',

      date: field,
      timezone,
    },
  };
}

function zeroFillTrend(periods, trend) {
  const valuesByPeriod = new Map(trend.map((item) => [item._id, item.value]));

  return periods.map((period) => ({
    period,
    value: valuesByPeriod.get(period) ?? 0,
  }));
}

async function getCustomerRegistrationAnalytics(range) {
  const periodExpression = createPeriodExpression(
    '$createdAt',
    range.bucket,
    range.timezone,
  );

  const [result] = await User.aggregate([
    {
      $match: {
        role: 'customer',
      },
    },

    {
      $facet: {
        total: [
          {
            $count: 'value',
          },
        ],

        newCustomers: [
          {
            $match: {
              createdAt: {
                $gte: range.startAt,
                $lte: range.endAt,
              },
            },
          },

          {
            $count: 'value',
          },
        ],

        trend: [
          {
            $match: {
              createdAt: {
                $gte: range.startAt,
                $lte: range.endAt,
              },
            },
          },

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
      },
    },
  ]);

  return {
    totalCustomers: result?.total?.[0]?.value ?? 0,

    newCustomers: result?.newCustomers?.[0]?.value ?? 0,

    trend: result?.trend ?? [],
  };
}

async function getPurchasingCustomerCount(range) {
  const result = await Order.aggregate([
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

    /*
     * A Customer may have many recognized Orders.
     * Count the Customer once.
     */
    {
      $group: {
        _id: '$customerId',
      },
    },

    {
      $count: 'value',
    },
  ]);

  return result[0]?.value ?? 0;
}

export async function getCustomerAnalytics(range, periods) {
  const [registrations, purchasingCustomers] = await Promise.all([
    getCustomerRegistrationAnalytics(range),

    getPurchasingCustomerCount(range),
  ]);

  return {
    totalCustomers: registrations.totalCustomers,

    newCustomers: registrations.newCustomers,

    purchasingCustomers,

    newCustomerTrend: zeroFillTrend(periods, registrations.trend),
  };
}
