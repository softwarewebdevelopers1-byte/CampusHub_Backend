import { Router, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { AuthenticateToken } from "#Verification/access.token";
import { OTP, User } from "#models/user.model";
import { OTPLimit } from "#Verification/rate.limit";
let OTPRouter = Router();
// function for generating OTP
function GenerateOTP() {
  return Math.floor(1000 + Math.random() * 9000);
}
// limits number of requests sent by the client
let OTPLimiter = OTPLimit();
OTPRouter.post("/", AuthenticateToken, OTPLimiter, async (req:Request, res:Response) => {
  const { email, otp } = req.body;
  try {
    // checking if valid data is sent to the server
    if (!email || !otp) {
      return res.status(403).json({ status: "Unauthorized" });
    }
    // getting verified user
    let verifiedUser = await OTP.findOne({ email: email } as any);
    if (!verifiedUser)
      return res.status(401).send({ success: false, message: "Invalid OTP" });
    // comparing OTP
    const isMatch = await bcrypt.compare(otp, verifiedUser.otp);
    if (!isMatch)
      return res.status(401).send({ success: false, message: "Invalid OTP" });
    // on reaching here the user credentials are correct and generating access token and user created on the database
    let userEmail = verifiedUser.email;
    let userPassword = verifiedUser.password;
    await User.create({ email: userEmail, password: userPassword });

    await OTP.findOneAndDelete({ email: email } as any);
    res.clearCookie("CampusHub7U4D_Host_AccessToken");
    res.status(200).json({ success: true, message: "SignUp successful!" });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});
export { GenerateOTP, OTPRouter };
//# sourceMappingURL=OTP.verify.js.map
