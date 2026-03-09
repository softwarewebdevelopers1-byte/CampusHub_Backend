import { Router } from "express";
import { RefreshToken } from "#models/token.model";
import { User } from "#models/user.model";
import type { Request, Response } from "express";

const LecturerLogout = Router();

// Logout single device for lecturer (delete refresh token for device)
LecturerLogout.post("/",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const Device = req.cookies?.CampusHub7U4D_lecturer_Host_DeviceId;
      const email = req.cookies?.CampusHub7U4D_lecturer_1UA_XG;
      if (!Device || !email) {
        res
          .status(400)
          .json({ error: "Device ID or email not found in cookies" });
        return;
      }
      if (Device) {
        await RefreshToken.findOneAndDelete({ deviceId: Device });
      }
      if (email) {
        await User.findOneAndUpdate(
          { email: email },
          { $set: { status: "Inactive" } },
          { new: true, runValidators: true, upsert: false },
        );
      }

      res.clearCookie("CampusHub7U4D_lecturer_1UA_XG");
      res.clearCookie("CampusHub7U4D_lecturer_Host_AccessToken");
      res.clearCookie("CampusHub7U4D_lecturer_3ga_auth_RefreshToken");
      res.clearCookie("CampusHub7U4D_lecturer_Host_DeviceId");
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server unable to clear cookies" });
    }
  },
);

// Logout from all devices for lecturer (delete all refresh tokens by email)
LecturerLogout.post("/logoutAll", async (req: Request, res: Response): Promise<void> => {
  try {
    const email = req.cookies?.CampusHub7U4D_lecturer_1UA_XG;
    if (!email) {
      res.status(400).json({ error: "Email not found in cookies" });
      return;
    }
    if (email) {
      await RefreshToken.deleteMany({ email: email });
      await User.findOneAndUpdate(
        { email: email },
        { $set: { status: "Inactive" } },
        { new: true, runValidators: true, upsert: false },
      );
    }

    res.clearCookie("CampusHub7U4D_lecturer_1UA_XG");
    res.clearCookie("CampusHub7U4D_lecturer_Host_AccessToken");
    res.clearCookie("CampusHub7U4D_lecturer_3ga_auth_RefreshToken");
    res.clearCookie("CampusHub7U4D_lecturer_Host_DeviceId");
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server unable to clear cookies" });
  }
});

export default LecturerLogout;
