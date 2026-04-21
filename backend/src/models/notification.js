/**
 * Notification model — one document per dispatch attempt per user per channel.
 * Tracks delivery state so failed notifications can be retried and audited.
 */
import mongoose from 'mongoose';

const CHANNELS = ['webPush', 'telegram', 'email'];
const STATUSES = ['pending', 'sent', 'failed'];

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
    },
    offerTriggerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OfferTrigger',
      required: [true, 'offerTriggerId is required'],
    },
    channel: {
      type: String,
      enum: { values: CHANNELS, message: '{VALUE} is not a valid channel' },
      required: [true, 'channel is required'],
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: '{VALUE} is not a valid status' },
      default: 'pending',
    },
    sentAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// primary query: "find all failed notifications for a user" (retry queue)
notificationSchema.index({ userId: 1, status: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
