/**
 * BallEvent model — one document per ball bowled during a live match.
 * Auto-deleted after 30 days via TTL index to keep the collection bounded.
 */
import mongoose from 'mongoose';

const BALL_EVENT_SOURCES = ['api', 'scraper', 'manual'];

// 30 days in seconds
const TTL_30_DAYS = 2592000;

const ballEventSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: [true, 'matchId is required'],
    },
    over: {
      type: Number,
      required: [true, 'over is required'],
      min: 0,
    },
    ball: {
      type: Number,
      required: [true, 'ball is required'],
      min: 1,
      max: 6,
    },
    runs: {
      type: Number,
      required: [true, 'runs is required'],
      default: 0,
    },
    isSix: {
      type: Boolean,
      default: false,
    },
    isFour: {
      type: Boolean,
      default: false,
    },
    isWicket: {
      type: Boolean,
      default: false,
    },
    batsman: {
      type: String,
      trim: true,
    },
    bowler: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: { values: BALL_EVENT_SOURCES, message: '{VALUE} is not a valid source' },
      required: [true, 'source is required'],
    },
    rawData: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

ballEventSchema.index({ matchId: 1 });
// TTL index — MongoDB deletes documents automatically 30 days after createdAt
ballEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: TTL_30_DAYS });

const BallEvent = mongoose.model('BallEvent', ballEventSchema);

export default BallEvent;
