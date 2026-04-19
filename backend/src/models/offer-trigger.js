/**
 * OfferTrigger model — records every time an offer fires during a match.
 * One document per offer-per-ball-event. expiresAt is set by the caller
 * (trigger engine) as firedAt + offer.durationSeconds before saving.
 */
import mongoose from 'mongoose';

const offerTriggerSchema = new mongoose.Schema(
  {
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      required: [true, 'offerId is required'],
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: [true, 'matchId is required'],
    },
    ballEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BallEvent',
      required: [true, 'ballEventId is required'],
    },
    firedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: [true, 'expiresAt is required'],
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

offerTriggerSchema.index({ firedAt: 1 });
// lets the frontend query "all triggers for this match" efficiently
offerTriggerSchema.index({ matchId: 1, firedAt: -1 });

const OfferTrigger = mongoose.model('OfferTrigger', offerTriggerSchema);

export default OfferTrigger;
