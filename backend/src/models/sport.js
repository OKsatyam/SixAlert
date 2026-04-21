/**
 * Sport model — lookup table for supported sports (e.g. cricket, football).
 * Referenced by Match and Brand to scope offers and triggers to a specific sport.
 */
import mongoose from 'mongoose';

const sportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sport name is required'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// explicit index declared here even though unique:true creates one —
// makes the intent visible and allows adding options (sparse, etc.) later
sportSchema.index({ slug: 1 });

const Sport = mongoose.model('Sport', sportSchema);

export default Sport;
