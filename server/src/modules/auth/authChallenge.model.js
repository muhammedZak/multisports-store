import mongoose from 'mongoose';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const authChallengeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    targetEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [EMAIL_REGEX, 'Please provide a valid email address'],
    },

    purpose: {
      type: String,
      enum: [
        'email_verification',
        'otp_login',
        'password_reset',
        'email_change',
      ],
      required: true,
    },

    challengeHash: {
      type: String,
      required: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    usedAt: {
      type: Date,
      default: null,
    },

    attemptCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    lastSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'authChallenges',
  },
);

authChallengeSchema.index(
  {
    userId: 1,
    purpose: 1,
  },
  {
    unique: true,
  },
);

authChallengeSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);

export const AuthChallenge = mongoose.model(
  'AuthChallenge',
  authChallengeSchema,
);
