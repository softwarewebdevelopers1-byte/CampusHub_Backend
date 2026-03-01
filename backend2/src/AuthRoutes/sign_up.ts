import { Router } from "express";
import { OTP, User } from "#models/user.model";
import { sendVerificationEmail } from "#Verification/email.send";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { signUpLimit } from "#Verification/rate.limit";
import { GenerateOTP } from "#Verification/OTP.verify";
import { generateAccessToken } from "#Verification/access.token";
dotenv.config();
class SignUpFlow {
  SignUp = async (req: Request, res: Response) => {
    try {
      // validating if user sends data
      if (!req.body)
        return res.status(403).json({ issue: "Unauthorized access" });
      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .send({ message: "Email and password are required" });
      }
      // validating ig user already exists
      let userExists = await User.findOne({
        email: email,
      });
      if (userExists) {
        return res.status(409).send({ message: "email already exists" });
      }
      // if user doesn't exist an otp is generated
      const otp = GenerateOTP().toString();
      // if there was OTP previously it gets deleted
      await OTP.findOneAndDelete({ email: email });
      const hashOTP = await bcrypt.hash(otp, 10);
      try {
        // function for sending email to the user
        await sendVerificationEmail(email, otp);
      } catch (err) {
        res.status(500).json({ error: "Unable to send email" });
      }
      // hashing password (Protection of user data at rest)
      const hashPassword = await bcrypt.hash(password, 10);
      await OTP.create({ email: email, password: hashPassword, otp: hashOTP });
      let accessToken = generateAccessToken(req);
      res.cookie("CampusHub7U4D_Host_AccessToken", accessToken, {
        httpOnly: true,
        maxAge: 60 * 1000 * 5,
        secure: true, // only over HTTPS sameSite: "none", // prevents CSRF
        sameSite: "none",
      });
      res.status(200).json({ message: "OTP created" });
    } catch (error) {
      res.status(500).send({ success: false });
      console.log(error);
    }
  };
}
let Sign = new SignUpFlow();
let signUpRouter = Router();
signUpRouter.post("/", signUpLimit(), Sign.SignUp);
export { signUpRouter };
//# sourceMappingURL=sign_up.js.map
