import mongoose from 'mongoose';

import { checkoutSnapshotSchema } from '../commerce/commerceSnapshot.schema.js';

export const PAYMENT_STATUSES = Object.freeze({
  CREATED: 'created',
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  VERIFICATION_FAILED: 'verification_failed',
});

const paymentSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },

    provider: {
      type: String,
      enum: ['razorpay'],
      required: true,
      default: 'razorpay',
      immutable: true,
    },

    providerOrderId: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
    },

    providerPaymentId: {
      type: String,
      trim: true,
      default: undefined,
      validate: {
        validator(value) {
          return (
            value === undefined ||
            value === null ||
            (typeof value === 'string' && value.trim().length > 0)
          );
        },
        message: 'Provider Payment ID cannot be empty.',
      },
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator(value) {
          return Number.isSafeInteger(value) && value > 0;
        },
        message: 'Payment amount must be a positive integer in paise.',
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

    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUSES),
      required: true,
      default: PAYMENT_STATUSES.CREATED,
    },

    checkoutSnapshot: {
      type: checkoutSnapshotSchema,
      required: true,
      immutable: true,
    },

    verifiedAt: {
      type: Date,
      default: undefined,
    },

    failureCode: {
      type: String,
      trim: true,
      default: undefined,
    },

    failureMessage: {
      type: String,
      trim: true,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

paymentSchema.pre('validate', function validatePaymentIntegrity() {
  if (
    this.checkoutSnapshot &&
    Number.isSafeInteger(this.amount) &&
    Number.isSafeInteger(this.checkoutSnapshot.totalAmount) &&
    this.amount !== this.checkoutSnapshot.totalAmount
  ) {
    this.invalidate(
      'amount',
      'Payment amount must match the checkout snapshot total.',
    );
  }

  if (this.status === PAYMENT_STATUSES.SUCCEEDED && !this.verifiedAt) {
    this.invalidate(
      'verifiedAt',
      'Successful Payment must record backend verification time.',
    );
  }

  if (this.verifiedAt && this.status !== PAYMENT_STATUSES.SUCCEEDED) {
    this.invalidate(
      'verifiedAt',
      'Payment verification time is valid only for a successful Payment.',
    );
  }
});

paymentSchema.index(
  {
    providerOrderId: 1,
  },
  {
    unique: true,
    name: 'payment_provider_order_unique',
  },
);

paymentSchema.index(
  {
    providerPaymentId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      providerPaymentId: {
        $type: 'string',
      },
    },
    name: 'payment_provider_payment_unique',
  },
);

paymentSchema.index(
  {
    customerId: 1,
    createdAt: -1,
  },
  {
    name: 'payment_customer_history',
  },
);

export const Payment = mongoose.model('Payment', paymentSchema);
