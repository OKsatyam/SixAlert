/**
 * Match model — represents a single sporting fixture.
 * Tracks live state (currentOver, currentBall) so the offer engine knows
 * match position when a BallEvent arrives without querying BallEvent history.
 */
import mongoose from 'mongoose';

const MATCH_STATUSES = ['scheduled', 'live', 'completed', 'abandoned'];

const matchSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      required: [true, 'External API ID is required'],
      unique: true,
      trim: true,
    },
    sport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sport',
      required: [true, 'Sport reference is required'],
    },
    teams: {
      type: [String],
      validate: {
        validator: (v) => v.length === 2 && v.every((t) => t.trim().length > 0),
        message: 'teams must contain exactly two non-empty strings',
      },
      required: [true, 'teams is required'],
    },
    status: {
      type: String,
      enum: { values: MATCH_STATUSES, message: '{VALUE} is not a valid match status' },
      default: 'scheduled',
    },
    currentOver: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentBall: {
      type: Number,
      default: 0,
      min: 0,
    },
    startTime: {
      type: Date,
    },
  },
  { timestamps: true }
);

matchSchema.index({ status: 1 });
matchSchema.index({ sport: 1, status: 1 });

const Match = mongoose.model('Match', matchSchema);

export default Match;
