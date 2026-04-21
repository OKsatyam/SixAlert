/**
 * User model — registered accounts with notification preferences.
 * passwordHash and pushSubscription use select:false so they are never
 * returned by accident in API responses without an explicit .select('+field').
 */
import mongoose from 'mongoose';

const USER_ROLES = ['user', 'admin'];

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'passwordHash is required'],
      select: false,
    },
    role: {
      type: String,
      enum: { values: USER_ROLES, message: '{VALUE} is not a valid role' },
      default: 'user',
    },
    notificationPreferences: {
      webPush: { type: Boolean, default: false },
      telegram: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
    },
    pushSubscription: {
      type: mongoose.Schema.Types.Mixed,
      select: false,
    },
    telegramChatId: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });

const User = mongoose.model('User', userSchema);

export default User;
