import { Router } from "express";
import { RefreshToken } from "#models/token.model";
import type { Request, Response } from "express";
import { User } from "#models/user.model";
let LogOutAll = Router();
LogOutAll.post("/", async (req: Request, res: Response) => {
  // clearing cookies on logout both refresh and access tokens and device ID and deleting the Device ID refresh token
  try {
    let email = req.cookies?.user_1UA_XG;
    // email = email.replace("%40", "@");
    await RefreshToken.deleteMany({
      email: email,
    }) ;
    // update user status to inactive
    await User.findOneAndUpdate(
      { email: email } ,
      { $set: { status: "Inactive" } },
      {
        new: true, // return the updated document
        runValidators: true, // validate schema rules
        upsert: false, // create if not found (optional)
      } ,
    );
    res.clearCookie("user_1UA_XG");
    res.clearCookie("CampusHub7U4D_Host_AccessToken");
    res.clearCookie("CampusHub_3ga_auth_RefreshToken");
    res.clearCookie("Host_AU1_Auth_2Wa__DeviceId");
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server unable to clear cookies" });
  }
});
export default LogOutAll;
