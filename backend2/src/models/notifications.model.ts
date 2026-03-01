import mongoose from "mongoose";
import type { Model } from "mongoose";
// NOTIFICATION INTERFACE
interface notificationFace {
  from: string;
  title: string;
  content: string;
  time: string;
  expiresAt: Date;
}
let NotificationSchema = new mongoose.Schema<notificationFace>({
  from: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  time: {
    type: String,
  },
  expiresAt: {
    type: Date,
    default: Date.now,
  },
});
//TTL deletes the document after 24hrs (Immediately)
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });
//
let notifications =
  (mongoose.models.notifications as Model<notificationFace>) ||
  mongoose.model<notificationFace>("notifications", NotificationSchema);
export default notifications;
