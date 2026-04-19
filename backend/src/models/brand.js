/**
 * Brand model — represents a partner brand that runs offers (e.g. Swiggy, Zomato).
 * Scoped to a sport so a brand can run cricket-only or football-only campaigns.
 */
import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Brand name is required'],
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
    logoUrl: {
      type: String,
      trim: true,
    },
    sport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sport',
      required: [true, 'Sport reference is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

brandSchema.index({ slug: 1 });
brandSchema.index({ sport: 1 });

const Brand = mongoose.model('Brand', brandSchema);

export default Brand;
