import type { Request, Response } from "express";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { RefreshToken } from "#models/token.model";
import type { JwtLoad } from "#JwtPayloadInterface/jwt";
import { compare } from "bcrypt";

const RefreshRouter = Router();

RefreshRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.CampusHub_3ga_auth_RefreshToken;
    let emailVerify = req.cookies?.user_1UA_XG;
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
    const accessSecret = process.env.ACCESS_TOKEN_SECRET;
    if (!refreshSecret || !accessSecret) {
      res.status(401).json({ error: "Unauthorized: No raw Tokens token" });
      return;
    }
    if (!refreshToken) {
      res.status(401).json({ error: "Unauthorized: No refresh token" });
      return;
    }
    // Verify refresh token synchronously
    let payload: JwtLoad;
    try {
      payload = jwt.verify(refreshToken, refreshSecret) as JwtLoad;
    } catch (err) {
      res.status(403).json({ error: err });
      console.log(err);
      return;
    }
    const tokenRecord = await RefreshToken.findOne({
      email: emailVerify,
    } as any);
    // Check DB if refresh token exists
    // const tokenRecord = await RefreshToken.findOne({
    //   refreshToken: refreshToken,
    // } as any);
    if (!tokenRecord) {
      res.status(403).json({ error: "Refresh token not recognized" });
      return;
    }
    let comparedRecord = await compare(refreshToken, tokenRecord.refreshToken);
    if (!comparedRecord) {
      res.status(403).json({ error: "User not authorized" });
    }

    // Strip exp/iat before re-signing
    const { exp, iat, ...cleanPayload } = payload as any;

    // Generate new access token
    const newAccessToken = jwt.sign(cleanPayload, accessSecret, {
      expiresIn: "15m",
    });

    // Send new access token in cookie
    res.cookie("CampusHub7U4D_Host_AccessToken", newAccessToken, {
      httpOnly: true,
      maxAge: 15 * 60 * 1000, // 15 minutes
      secure: true,
      sameSite: "none",
    });

    res.json({ success: true, message: "New access token issued" });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err });
  }
});

export { RefreshRouter };
