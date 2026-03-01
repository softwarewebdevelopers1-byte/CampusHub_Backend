import { RefreshToken } from "#models/token.model";
import { User } from "#models/user.model";
import { Router } from "express";
import type { Response, Request } from "express";
let LogoutRouter = Router();
LogoutRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  // clearing cookies on logout both refresh and access tokens and device ID and deleting the Device ID refresh token
  const Device = req.cookies?.Host_AU1_Auth_2Wa__DeviceId;
  const email = req.cookies?.user_1UA_XG;
  await RefreshToken.findOneAndDelete({
    deviceId: Device,
  });
  // updtaing user status to inactive
  await User.findOneAndUpdate(
    { email: email },
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
});
export default LogoutRouter;
