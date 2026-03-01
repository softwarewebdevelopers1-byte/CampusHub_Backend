import { Router } from "express";
import type { Request, Response } from "express";
import { RefreshToken as DataBaseRefreshToken } from "#models/token.model";
import { compare } from "bcrypt";
import { User } from "#models/user.model";
let IsLoggedRoute = Router();
IsLoggedRoute.post("/", async (req: Request, res: Response): Promise<void> => {
  const deviceId = req.cookies?.Host_AU1_Auth_2Wa__DeviceId;
  const UserEmail = req.cookies?.user_1UA_XG;
  const RefreshToken = req.cookies?.CampusHub_3ga_auth_RefreshToken;
  const { user } = req.body;
  async function deleteCookies(): Promise<void> {
    try {
      if (UserEmail) {
        await User.findOneAndUpdate(
          { email: UserEmail },
          { $set: { status: "Inactive" } },
          {
            new: true, // return the updated document
            runValidators: true, // validate schema rules
            upsert: false, // create if not found (optional)
          },
        );
      }
    } catch (error) {
      console.log("Unable to update user status to inactive");
    }
    res.clearCookie("user_1UA_XG");
    res.clearCookie("CampusHub7U4D_Host_AccessToken");
    res.clearCookie("CampusHub_3ga_auth_RefreshToken");
    res.clearCookie("Host_AU1_Auth_2Wa__DeviceId");
  }
  if (!deviceId) {
    await deleteCookies();
    res.status(401).json({ error: "Device ID required" });
    return;
  }
  if (!UserEmail) {
    await deleteCookies();
    try {
      await User.findOneAndUpdate(
        { email: `${user}@gmail.com` },
        { $set: { status: "Inactive" } },
        {
          new: true, // return the updated document
          runValidators: true, // validate schema rules
          upsert: false, // create if not found (optional)
        },
      );
    } catch (error) {
      console.log("Unable to update user status to inactive");
    }

    res.status(401).json({ error: "User email is required" });
    return;
  }
  if (!RefreshToken) {
    await deleteCookies();
    res.status(401).json({ error: "Refresh token is required" });
    return;
  }
  // if (user === "user") {
  //   res.status(400).json({ error: "User type not specified" });
  //   return;
  // }
  try {
    const entry = await DataBaseRefreshToken.findOne({
      deviceId: deviceId,
    });

    if (!entry) {
      await deleteCookies();
      res.status(401).json({ error: "Invalid device ID" });
      return;
    }
    const isValid = await compare(RefreshToken, entry.refreshToken);
    if (!isValid) {
      await deleteCookies();
      res.status(401).json({ error: "Invalid refresh token" });
      return; // stop execution here
    }

    // Only reached if comparison succeeded
    res.status(200).json({ loggedIn: true });
  } catch (error) {
    await deleteCookies();
    res.status(401).json({ error: "Invalid/expired refresh token" });
  }
});

export default IsLoggedRoute;
