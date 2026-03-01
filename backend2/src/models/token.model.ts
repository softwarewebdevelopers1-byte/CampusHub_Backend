import mongoose, { Model } from "mongoose";
// INTERFACE FOR RFERESH TOKEN
interface RefreshTokenFace {
  email: string;
  refreshToken: string;
  deviceId: string;
  createdAt: Date;
}

const refreshTokenSchema = new mongoose.Schema<RefreshTokenFace>({
  email: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
    required: true,
  },
  deviceId: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
// TTL indexing
refreshTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 }); // 7 days in seconds
const AdminRefreshTokenSchema = new mongoose.Schema<RefreshTokenFace>({
  email: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
    required: true,
  },
  deviceId: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400,
  },
});
export let RefreshToken =
  (mongoose.models.refreshtoken as Model<RefreshTokenFace>) ||
  mongoose.model<RefreshTokenFace>("refreshtoken", refreshTokenSchema);
//# sourceMappingURL=token.model.js.map
export let AdminRefreshToken =
  (mongoose.models.adminrefreshtoken as Model<RefreshTokenFace>) ||
  mongoose.model<RefreshTokenFace>(
    "adminrefreshtoken",
    AdminRefreshTokenSchema,
  );
