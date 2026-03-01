import mongoose from "mongoose";
import type { Model } from "mongoose";
// INTERFACE FOR USER
interface User {
  email: string;
  password: string;
  role: string;
  status: string;
  account_state: string;
  expiresAt?: Date;
}
// INTERFACE FOR ADMIN
interface Admin {
  email: string;
  password: string;
  role: string;
}
// INTERFACE FOR OTP
interface OTP {
  email: string;
  password: string;
  otp: string;
  createdAt: Date;
}
//  USER SCHEMA
const userSchema = new mongoose.Schema<User>({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "Student" },
  status: { type: String, default: "Active" },
  account_state: { type: String, default: "Active" },
  expiresAt: { type: Date },
});
userSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// ADMIN SCHEMA
const AdminSchema = new mongoose.Schema<Admin>({
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "Admin" },
});
// OTP SCHEMA
const otpSchema = new mongoose.Schema<OTP>({
  email: { type: String, unique: true, required: true },
  otp: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 },
});
// USER MODEL
export const User =
  (mongoose.models.user as Model<User>) ||
  mongoose.model<User>("user", userSchema);
// ADMIN MODEL
export const Admin =
  (mongoose.models.admin as Model<Admin>) ||
  mongoose.model<Admin>("admin", AdminSchema);
// OTP MODEL
export const OTP =
  (mongoose.models.otp as Model<OTP>) || mongoose.model<OTP>("otp", otpSchema);
//# sourceMappingURL=user.model.js.map
