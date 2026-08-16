import mongoose from 'mongoose';

import { SPORT_VALUES } from './catalog.constants.js';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    nameKey: {
      type: String,
      required: true,
      trim: true,
    },

    sport: {
      type: String,
      enum: SPORT_VALUES,
      required: true,
    },

    isActive: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

categorySchema.index(
  {
    sport: 1,
    nameKey: 1,
  },
  {
    unique: true,
  },
);

export const Category = mongoose.model('Category', categorySchema);
