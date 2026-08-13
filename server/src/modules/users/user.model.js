import mongoose from 'mongoose';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [EMAIL_REGEX, 'Please provide a valid email address'],
    },

    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
      required: true,
    },

    passwordHash: {
      type: String,
      select: false,
    },

    emailVerified: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
  },
);

export const User = mongoose.model('User', userSchema);
