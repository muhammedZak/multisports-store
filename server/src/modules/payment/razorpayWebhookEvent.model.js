import mongoose from 'mongoose';

export const RAZORPAY_WEBHOOK_EVENT_STATUSES = Object.freeze({
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  IGNORED: 'ignored',
  FAILED: 'failed',
});

const razorpayWebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
    },

    eventType: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
    },

    providerPaymentId: {
      type: String,
      trim: true,
      default: undefined,
      immutable: true,
    },

    providerOrderId: {
      type: String,
      trim: true,
      default: undefined,
      immutable: true,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: undefined,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: undefined,
    },

    providerCreatedAt: {
      type: Date,
      default: undefined,
      immutable: true,
    },

    status: {
      type: String,
      enum: Object.values(RAZORPAY_WEBHOOK_EVENT_STATUSES),
      required: true,
      default: RAZORPAY_WEBHOOK_EVENT_STATUSES.PROCESSING,
    },

    result: {
      type: String,
      trim: true,
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

    processedAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
    collection: 'razorpayWebhookEvents',
  },
);

razorpayWebhookEventSchema.index(
  {
    eventId: 1,
  },
  {
    unique: true,
    name: 'razorpay_webhook_event_unique',
  },
);

razorpayWebhookEventSchema.index(
  {
    status: 1,
    createdAt: -1,
  },
  {
    name: 'razorpay_webhook_status_history',
  },
);

export const RazorpayWebhookEvent = mongoose.model(
  'RazorpayWebhookEvent',
  razorpayWebhookEventSchema,
);
