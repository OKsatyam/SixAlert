/**
 * DataSourceLog model — records every poll/scrape attempt by the cricket pipeline.
 * The circuit breaker reads these to decide when to switch layers.
 * Auto-deleted after 7 days via TTL index.
 */
import mongoose from 'mongoose';

const LAYERS = [1, 2, 3];

// 7 days in seconds
const TTL_7_DAYS = 604800;

const dataSourceLogSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: [true, 'matchId is required'],
    },
    layer: {
      type: Number,
      enum: { values: LAYERS, message: '{VALUE} is not a valid layer' },
      required: [true, 'layer is required'],
    },
    success: {
      type: Boolean,
      required: [true, 'success is required'],
    },
    responseMs: {
      type: Number,
      min: 0,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    endpoint: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// circuit breaker query: "last N attempts for this match on this layer"
dataSourceLogSchema.index({ matchId: 1, layer: 1 });
// TTL index — MongoDB deletes documents automatically 7 days after createdAt
dataSourceLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: TTL_7_DAYS });

const DataSourceLog = mongoose.model('DataSourceLog', dataSourceLogSchema);

export default DataSourceLog;
