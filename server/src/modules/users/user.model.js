import mongoose from 'mongoose';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_ALLOWED_REGEX = /^\+?[0-9\s()-]+$/;

function isValidPhone(value) {
  if (value === undefined || value === null) {
    return true;
  }

  const phone = value.trim();

  const digitCount = phone.replace(/\D/g, '').length;

  return (
    phone.length <= 25 &&
    PHONE_ALLOWED_REGEX.test(phone) &&
    digitCount >= 7 &&
    digitCount <= 15
  );
}

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

    googleSub: {
      type: String,
      select: false,
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

    phone: {
      type: String,
      trim: true,
      validate: {
        validator: isValidPhone,
        message: 'Please provide a valid phone number',
      },
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

userSchema.index(
  { googleSub: 1 },
  {
    unique: true,
    partialFilterExpression: {
      googleSub: {
        $type: 'string',
      },
    },
  },
);

export const User = mongoose.model('User', userSchema);
