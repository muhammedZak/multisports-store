import mongoose from 'mongoose';

import {
  REFUND_ORIGINS,
  REFUND_ORIGIN_VALUES,
  REFUND_PROVIDERS,
  REFUND_PROVIDER_VALUES,
  REFUND_SCOPES,
  REFUND_SCOPE_VALUES,
  REFUND_STATUSES,
  REFUND_STATUS_VALUES,
} from './refund.constants.js';

const refundSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: undefined,
      immutable: true,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: undefined,
      immutable: true,
    },

    provider: {
      type: String,
      enum: {
        values: REFUND_PROVIDER_VALUES,
        message: 'Invalid Refund provider.',
      },
      trim: true,
      default: undefined,
      immutable: true,
    },

    providerRefundId: {
      type: String,
      trim: true,
      default: undefined,
      validate: {
        validator(value) {
          return value === undefined || value === null || value.length > 0;
        },
        message: 'Provider Refund ID cannot be empty.',
      },
    },

    origin: {
      type: String,
      enum: {
        values: REFUND_ORIGIN_VALUES,
        message: 'Invalid Refund origin.',
      },
      required: true,
      immutable: true,
    },

    status: {
      type: String,
      enum: {
        values: REFUND_STATUS_VALUES,
        message: 'Invalid Refund status.',
      },
      required: true,
      default: REFUND_STATUSES.REQUESTED,
    },

    scope: {
      type: String,
      enum: {
        values: REFUND_SCOPE_VALUES,
        message: 'Invalid Refund scope.',
      },
      default: undefined,
      immutable: true,
    },

    itemIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
        },
      ],
      default: undefined,
      immutable: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(value) {
          return Number.isSafeInteger(value) && value >= 0;
        },
        message: 'Refund amount must be a non-negative integer in paise.',
      },
      immutable: true,
    },

    currency: {
      type: String,
      enum: ['INR'],
      required: true,
      default: 'INR',
      immutable: true,
    },

    restockOnCompletion: {
      type: Boolean,
      default: undefined,
    },

    requestedAt: {
      type: Date,
      required: true,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: true,
    collection: 'refunds',
  },
);

refundSchema.pre('validate', function validateRefundIntegrity() {
  const orderIsRequired =
    this.origin === REFUND_ORIGINS.CUSTOMER_REQUEST ||
    this.origin === REFUND_ORIGINS.ORDER_CANCELLATION;

  const hasOrder = this.orderId !== undefined && this.orderId !== null;
  const hasPayment = this.paymentId !== undefined && this.paymentId !== null;
  const hasProvider =
    typeof this.provider === 'string' && this.provider.length > 0;
  const hasProviderRefundId =
    typeof this.providerRefundId === 'string' &&
    this.providerRefundId.length > 0;

  if (orderIsRequired && !hasOrder) {
    this.invalidate(
      'orderId',
      'Customer-request and Order-cancellation Refunds require an Order.',
    );
  }

  if (!hasOrder && this.origin !== REFUND_ORIGINS.SYSTEM_COMPENSATION) {
    this.invalidate(
      'orderId',
      'Only a system-compensation Refund may omit its Order.',
    );
  }

  if (hasOrder && !this.scope) {
    this.invalidate('scope', 'Order-backed Refunds require a scope.');
  }

  if (!hasOrder && this.scope) {
    this.invalidate(
      'scope',
      'A Refund without an Order cannot have an Order-item scope.',
    );
  }

  const itemIds = Array.isArray(this.itemIds) ? this.itemIds : [];

  if (this.scope === REFUND_SCOPES.ORDER && itemIds.length > 0) {
    this.invalidate(
      'itemIds',
      'Whole-Order Refund scope cannot contain item IDs.',
    );
  }

  if (this.scope === REFUND_SCOPES.ITEMS && itemIds.length === 0) {
    this.invalidate(
      'itemIds',
      'Item Refund scope requires at least one Order item ID.',
    );
  }

  if (!this.scope && itemIds.length > 0) {
    this.invalidate('itemIds', 'Refund item IDs require item scope.');
  }

  const itemIdKeys = itemIds.map((itemId) => itemId.toString());

  if (new Set(itemIdKeys).size !== itemIdKeys.length) {
    this.invalidate('itemIds', 'Refund item IDs must not contain duplicates.');
  }

  if (hasProvider && !hasPayment) {
    this.invalidate(
      'paymentId',
      'Provider-backed Refunds require a Payment.',
    );
  }

  if (hasProviderRefundId && !hasProvider) {
    this.invalidate(
      'provider',
      'A Provider Refund ID requires a Refund provider.',
    );
  }

  if (hasProviderRefundId && !hasPayment) {
    this.invalidate(
      'paymentId',
      'A Provider Refund ID requires a Payment.',
    );
  }

  const mustNeverRestock =
    this.origin === REFUND_ORIGINS.ORDER_CANCELLATION ||
    this.origin === REFUND_ORIGINS.SYSTEM_COMPENSATION;

  if (mustNeverRestock && this.restockOnCompletion !== false) {
    this.invalidate(
      'restockOnCompletion',
      'Order-cancellation and system-compensation Refunds cannot restock.',
    );
  }

  if (this.origin === REFUND_ORIGINS.CUSTOMER_REQUEST) {
    const approvalDecisionHasOccurred = [
      REFUND_STATUSES.APPROVED,
      REFUND_STATUSES.PROCESSING,
      REFUND_STATUSES.REFUNDED,
      REFUND_STATUSES.FAILED,
    ].includes(this.status);

    if (
      approvalDecisionHasOccurred &&
      typeof this.restockOnCompletion !== 'boolean'
    ) {
      this.invalidate(
        'restockOnCompletion',
        'Approved Customer Refunds require a restock decision.',
      );
    }

    if (
      !approvalDecisionHasOccurred &&
      this.restockOnCompletion !== undefined
    ) {
      this.invalidate(
        'restockOnCompletion',
        'Customer Refund restocking is decided only during approval.',
      );
    }
  }

  if (
    this.provider === REFUND_PROVIDERS.RAZORPAY &&
    this.currency !== 'INR'
  ) {
    this.invalidate('currency', 'Razorpay Refund currency must be INR.');
  }
});

refundSchema.index(
  {
    orderId: 1,
    requestedAt: -1,
  },
  {
    name: 'refund_order_history',
  },
);

refundSchema.index(
  {
    customerId: 1,
    requestedAt: -1,
  },
  {
    name: 'refund_customer_history',
  },
);

refundSchema.index(
  {
    status: 1,
    requestedAt: -1,
  },
  {
    name: 'refund_status_history',
  },
);

refundSchema.index(
  {
    providerRefundId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      providerRefundId: {
        $type: 'string',
      },
    },
    name: 'refund_provider_refund_unique',
  },
);

export const Refund = mongoose.model('Refund', refundSchema);
