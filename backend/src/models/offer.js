/**
 * Offer model — a brand's promotional deal tied to a specific in-match event.
 * When the trigger engine detects the triggerEvent, it fires this offer for durationSeconds.
 */
import mongoose from 'mongoose';

const TRIGGER_EVENTS = ['SIX', 'FOUR', 'WICKET', 'MATCH_START', 'MATCH_END'];
const DISCOUNT_TYPES = ['percentage', 'flat', 'free_delivery'];

const offerSchema = new mongoose.Schema(
  {
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: [true, 'brandId is required'],
    },
    sportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sport',
      required: [true, 'sportId is required'],
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    triggerEvent: {
      type: String,
      enum: { values: TRIGGER_EVENTS, message: '{VALUE} is not a valid trigger event' },
      required: [true, 'triggerEvent is required'],
    },
    discountType: {
      type: String,
      enum: { values: DISCOUNT_TYPES, message: '{VALUE} is not a valid discount type' },
      required: [true, 'discountType is required'],
    },
    discountValue: {
      type: Number,
      required: [true, 'discountValue is required'],
      min: 0,
    },
    durationSeconds: {
      type: Number,
      required: [true, 'durationSeconds is required'],
    },
    validFrom: {
      type: Date,
      required: [true, 'validFrom is required'],
    },
    validTo: {
      type: Date,
      required: [true, 'validTo is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    terms: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// the trigger engine queries: find active offers for this sport + event type
offerSchema.index({ sportId: 1, triggerEvent: 1, isActive: 1 });
offerSchema.index({ brandId: 1 });

const Offer = mongoose.model('Offer', offerSchema);

export default Offer;
