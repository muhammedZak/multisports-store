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
  isRefundScopeOccupyingStatus,
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
      min: 1,
      validate: {
        validator(value) {
          return Number.isSafeInteger(value) && value > 0;
        },
        message: 'Refund amount must be a positive integer in paise.',
      },
      immutable: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator(value) {
          return typeof value === 'string' && value.length > 0;
        },
        message: 'Refund reason is required.',
      },
      immutable: true,
    },

    explanation: {
      type: String,
      trim: true,
      default: undefined,
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

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },

    adminDecisionNote: {
      type: String,
      trim: true,
      default: undefined,
    },

    reviewedAt: {
      type: Date,
      default: undefined,
    },

    refundedAt: {
      type: Date,
      default: undefined,
    },

    scopeClaimKeys: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: undefined,
      immutable: true,
      select: false,
    },

    scopeOccupied: {
      type: Boolean,
      default: undefined,
      select: false,
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

  const scopeClaimKeys = Array.isArray(this.scopeClaimKeys)
    ? this.scopeClaimKeys
    : [];

  const uniqueScopeClaimKeys = new Set(scopeClaimKeys);

  if (uniqueScopeClaimKeys.size !== scopeClaimKeys.length) {
    this.invalidate(
      'scopeClaimKeys',
      'Refund scope claim keys must not contain duplicates.',
    );
  }

  if (hasOrder) {
    const orderClaimPrefix = `${this.orderId.toString()}:`;

    if (scopeClaimKeys.length === 0) {
      this.invalidate(
        'scopeClaimKeys',
        'Order-backed Refunds require scope claim keys.',
      );
    }

    if (
      scopeClaimKeys.some((claimKey) => {
        if (
          typeof claimKey !== 'string' ||
          !claimKey.startsWith(orderClaimPrefix)
        ) {
          return true;
        }

        const itemId = claimKey.slice(orderClaimPrefix.length);

        return !mongoose.Types.ObjectId.isValid(itemId);
      })
    ) {
      this.invalidate(
        'scopeClaimKeys',
        'Refund scope claim keys must be namespaced to valid Order items.',
      );
    }

    if (this.scope === REFUND_SCOPES.ITEMS) {
      const expectedClaimKeys = itemIdKeys.map(
        (itemId) => `${orderClaimPrefix}${itemId}`,
      );

      if (
        expectedClaimKeys.length !== scopeClaimKeys.length ||
        expectedClaimKeys.some(
          (claimKey, index) => claimKey !== scopeClaimKeys[index],
        )
      ) {
        this.invalidate(
          'scopeClaimKeys',
          'Item Refund claims must match its stored Order item scope.',
        );
      }
    }

    const scopeShouldBeOccupied = isRefundScopeOccupyingStatus(this.status);

    if (this.scopeOccupied !== scopeShouldBeOccupied) {
      this.invalidate(
        'scopeOccupied',
        'Refund scope occupancy must match its status.',
      );
    }
  } else {
    if (scopeClaimKeys.length > 0) {
      this.invalidate(
        'scopeClaimKeys',
        'A Refund without an Order cannot claim Order-item scope.',
      );
    }

    if (this.scopeOccupied !== undefined && this.scopeOccupied !== false) {
      this.invalidate(
        'scopeOccupied',
        'A Refund without an Order cannot occupy Order-item scope.',
      );
    }
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

refundSchema.index(
  {
    scopeClaimKeys: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      scopeOccupied: true,
    },
    name: 'refund_scope_claim_unique',
  },
);

refundSchema.index(
  {
    orderId: 1,
    origin: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      origin: REFUND_ORIGINS.ORDER_CANCELLATION,
    },
    name: 'refund_order_cancellation_unique',
  },
);

refundSchema.index(
  {
    paymentId: 1,
    origin: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      origin: REFUND_ORIGINS.SYSTEM_COMPENSATION,
    },
    name: 'refund_system_compensation_unique',
  },
);

export const Refund = mongoose.model('Refund', refundSchema);
