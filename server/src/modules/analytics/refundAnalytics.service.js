import { Refund } from '../refund/refund.model.js';

import { REFUND_ORIGINS, REFUND_STATUSES } from '../refund/refund.constants.js';

function createPeriodExpression(field, bucket, timezone) {
  return {
    $dateToString: {
      format: bucket === 'month' ? '%Y-%m' : '%Y-%m-%d',

      date: field,
      timezone,
    },
  };
}

function zeroFillRefundTrend(periods, requestTrend, financialTrend) {
  const requestsByPeriod = new Map(
    requestTrend.map((item) => [item._id, item.customerRequests]),
  );

  const refundedByPeriod = new Map(
    financialTrend.map((item) => [item._id, item.refundedAmount]),
  );

  return periods.map((period) => ({
    period,

    customerRequests: requestsByPeriod.get(period) ?? 0,

    refundedAmount: refundedByPeriod.get(period) ?? 0,
  }));
}

export async function getRefundAnalytics(range, periods) {
  const requestedPeriod = createPeriodExpression(
    '$requestedAt',
    range.bucket,
    range.timezone,
  );

  const refundedPeriod = createPeriodExpression(
    '$refundedAt',
    range.bucket,
    range.timezone,
  );

  const [result] = await Refund.aggregate([
    {
      $facet: {
        /*
         * Workflow analytics:
         *
         * Only Customer-request Refunds whose original
         * requestedAt falls inside the selected range.
         *
         * Their CURRENT status is reported.
         */
        workflow: [
          {
            $match: {
              origin: REFUND_ORIGINS.CUSTOMER_REQUEST,

              requestedAt: {
                $gte: range.startAt,
                $lte: range.endAt,
              },
            },
          },

          {
            $group: {
              _id: '$status',

              value: {
                $sum: 1,
              },
            },
          },
        ],

        /*
         * Request trend follows requestedAt.
         */
        requestTrend: [
          {
            $match: {
              origin: REFUND_ORIGINS.CUSTOMER_REQUEST,

              requestedAt: {
                $gte: range.startAt,
                $lte: range.endAt,
              },
            },
          },

          {
            $group: {
              _id: requestedPeriod,

              customerRequests: {
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

        /*
         * Financial Refund analytics:
         *
         * provider-confirmed completion belongs to
         * refundedAt, not requestedAt.
         */
        financial: [
          {
            $match: {
              status: REFUND_STATUSES.REFUNDED,

              refundedAt: {
                $gte: range.startAt,
                $lte: range.endAt,
              },

              /*
               * Keep this explicitly provider-backed.
               */
              provider: {
                $type: 'string',
              },

              providerRefundId: {
                $type: 'string',
              },
            },
          },

          {
            $group: {
              _id: '$origin',

              refundedAmount: {
                $sum: '$amount',
              },
            },
          },
        ],

        /*
         * Financial trend includes every confirmed
         * provider-backed Refund origin.
         */
        financialTrend: [
          {
            $match: {
              status: REFUND_STATUSES.REFUNDED,

              refundedAt: {
                $gte: range.startAt,
                $lte: range.endAt,
              },

              provider: {
                $type: 'string',
              },

              providerRefundId: {
                $type: 'string',
              },
            },
          },

          {
            $group: {
              _id: refundedPeriod,

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

  const workflowCounts = new Map(
    (result?.workflow ?? []).map((item) => [item._id, item.value]),
  );

  const financialByOrigin = new Map(
    (result?.financial ?? []).map((item) => [item._id, item.refundedAmount]),
  );

  const requested = workflowCounts.get(REFUND_STATUSES.REQUESTED) ?? 0;

  const approved = workflowCounts.get(REFUND_STATUSES.APPROVED) ?? 0;

  const rejected = workflowCounts.get(REFUND_STATUSES.REJECTED) ?? 0;

  const processing = workflowCounts.get(REFUND_STATUSES.PROCESSING) ?? 0;

  const refunded = workflowCounts.get(REFUND_STATUSES.REFUNDED) ?? 0;

  const failed = workflowCounts.get(REFUND_STATUSES.FAILED) ?? 0;

  const customerRequestRefundedAmount =
    financialByOrigin.get(REFUND_ORIGINS.CUSTOMER_REQUEST) ?? 0;

  const orderCancellationRefundedAmount =
    financialByOrigin.get(REFUND_ORIGINS.ORDER_CANCELLATION) ?? 0;

  const systemCompensationRefundedAmount =
    financialByOrigin.get(REFUND_ORIGINS.SYSTEM_COMPENSATION) ?? 0;

  return {
    workflow: {
      totalRequests:
        requested + approved + rejected + processing + refunded + failed,

      requested,
      approved,
      rejected,
      processing,
      refunded,
      failed,
    },

    financial: {
      totalProviderRefundedAmount:
        customerRequestRefundedAmount +
        orderCancellationRefundedAmount +
        systemCompensationRefundedAmount,

      customerRequestRefundedAmount,

      orderCancellationRefundedAmount,

      systemCompensationRefundedAmount,
    },

    trend: zeroFillRefundTrend(
      periods,

      result?.requestTrend ?? [],

      result?.financialTrend ?? [],
    ),
  };
}
