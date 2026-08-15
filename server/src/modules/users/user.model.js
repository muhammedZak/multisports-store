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

const profilePhotoSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: true,
      trim: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const addressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name is too long'],
  },

  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: isValidPhone,
      message: 'Please provide a valid phone number',
    },
  },

  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [300, 'Address is too long'],
  },

  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [100, 'City is too long'],
  },

  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    maxlength: [100, 'State is too long'],
  },

  postalCode: {
    type: String,
    required: [true, 'Postal code is required'],
    trim: true,
    maxlength: [20, 'Postal code is too long'],
  },

  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    maxlength: [100, 'Country is too long'],
  },

  isDefault: {
    type: Boolean,
    default: false,
    required: true,
  },
});

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

    profilePhoto: {
      type: profilePhotoSchema,
      default: undefined,
    },

    addresses: {
      type: [addressSchema],
      default: [],
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
