import { Router } from "express";
import type { Request, Response } from "express";
import { AdminRefreshToken as DataBaseRefreshToken } from "#models/token.model";
import { compare } from "bcrypt";
let IsAdminLogged = Router();
IsAdminLogged.get("/", async (req: Request, res: Response): Promise<void> => {
  const deviceId = req.cookies?.Host_wqc_Auth_4rt__DeviceId;
  const UserEmail = req.cookies?.Q_user_1334G_XG;
  const RefreshToken = req.cookies?.ptq2_was_auth_RefreshToken;
  // const AccessToken = req.cookies?.dCa_Host_AccessToken;

  function deleteCookies(): void {
    res.clearCookie("Q_user_1334G_XG");
    res.clearCookie("dCa_Host_AccessToken");
    res.clearCookie("ptq2_was_auth_RefreshToken");
    res.clearCookie("Host_wqc_Auth_4rt__DeviceId");
  }

  if (!deviceId) {
    deleteCookies();
    res.status(401).json({ error: "Device ID required" });
    return;
  }
  if (!UserEmail) {
    deleteCookies();
    res.status(401).json({ error: "User email is required" });
    return;
  }
  if (!RefreshToken) {
    deleteCookies();
    res.status(401).json({ error: "Refresh token is required" });
    return;
  }
  // if (!AccessToken) {
  //   deleteCookies();
  //   res.status(401).json({ error: "Access token is required" });
  //   return;
  // }

  try {
    const entry = await DataBaseRefreshToken.findOne({
      deviceId: deviceId,
    });
    if (!entry) {
      deleteCookies();
      res.status(401).json({ error: "Invalid device ID" });
      return;
    }

    const isValid = await compare(RefreshToken, entry.refreshToken);
    if (!isValid) {
      deleteCookies();
      res.status(401).json({ error: "Invalid refresh token" });
      return; // stop execution here
    }

    // Only reached if comparison succeeded
    res.status(200).json({ loggedIn: true });
  } catch (error) {
    deleteCookies();
    res.status(401).json({ error: "Invalid/expired refresh token" });
  }
});

export default IsAdminLogged;
