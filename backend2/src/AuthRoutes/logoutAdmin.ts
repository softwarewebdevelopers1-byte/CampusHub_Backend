import { AdminRefreshToken } from "#models/token.model";
import { Router } from "express";
import type { Response, Request } from "express";
export let AdminLogOut = Router();
AdminLogOut.post("/", async (req: Request, res: Response): Promise<void> => {
  // clearing cookies on logout both refresh and access tokens and device ID and deleting the Device ID refresh token
  const Device = req.cookies?.Host_wqc_Auth_4rt__DeviceId;
  await AdminRefreshToken.findOneAndDelete({
    deviceId: Device,
  });
  res.clearCookie("Q_user_1334G_XG");
  res.clearCookie("dCa_Host_AccessToken");
  res.clearCookie("ptq2_was_auth_RefreshToken");
  res.clearCookie("Host_wqc_Auth_4rt__DeviceId");
  res.status(200).json({ success: true });
});
export const AdminLogOutAll = Router();
AdminLogOutAll.post("/", async (req: Request, res: Response) => {
  // clearing cookies on logout both refresh and access tokens and device ID and deleting the Device ID refresh token
  try {
    let email = req.cookies?.Q_user_1334G_XG;
    // email = email.replace("%40", "@");
    await AdminRefreshToken.deleteMany({
      email: email,
    });
    res.clearCookie("Q_user_1334G_XG");
    res.clearCookie("dCa_Host_AccessToken");
    res.clearCookie("ptq2_was_auth_RefreshToken");
    res.clearCookie("Host_wqc_Auth_4rt__DeviceId");
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server unable to clear cookies" });
  }
});
