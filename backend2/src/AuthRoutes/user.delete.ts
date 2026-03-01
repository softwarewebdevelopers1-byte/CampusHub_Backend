import type { Request, Response } from "express";
import { Router } from "express";
import { RefreshToken as DbRefreshToken } from "#models/token.model";
import { User } from "#models/user.model";

export let UserDeleteRoute = Router();
UserDeleteRoute.post(
  "/",
  async (req: Request, res: Response): Promise<void> => {
    const deviceId = req.cookies?.Host_AU1_Auth_2Wa__DeviceId;
    const UserEmail = req.cookies?.user_1UA_XG;
    const RefreshToken = req.cookies?.CampusHub_3ga_auth_RefreshToken;
    if (!deviceId || !UserEmail || !RefreshToken) {
      res.status(401).json({ error: "Unauthorized access" });
      return;
    }
    try {
      await User.findOneAndUpdate(
        { email: UserEmail },
        {
          $set: {
            account_state: "Inactive",
            status: "Inactive",
            role: "Deleted",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        {
          new: true,
          runValidators: true,
          upsert: false,
        },
      );
      await DbRefreshToken.deleteMany({ email: UserEmail });
      // all other info am supposed to delete comes here
      res.clearCookie("CampusHub7U4D_Host_AccessToken");
      res.clearCookie("CampusHub_3ga_auth_RefreshToken");
      res.clearCookie("Host_AU1_Auth_2Wa__DeviceId");
      res.clearCookie("user_1UA_XG");
      res.status(200).json({ message: "User account deleted successfully" });
    } catch (error) {
      console.log("Unable to delete user");
      res.status(500).json({ error: "Server unable to delete user" });
    }
  },
);
