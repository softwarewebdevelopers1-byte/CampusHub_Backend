import { LecturerAcc } from "#models/user.model";
import bcrypt from "bcrypt";
import type { Response, Request } from "express";
import { Router } from "express";
let LecturerCreateAccount = Router();
class SignUpFlow {
  SignUp = async (req: Request, res: Response) => {
    try {
      // validating if user sends data
      if (!req.body)
        return res.status(403).json({ issue: "Unauthorized access" });
      const { fullName, email, password } = req.body;
      if (!email || !password || !fullName) {
        return res
          .status(400)
          .send({ message: "Email name and password are required" });
      }
      // validating if user already exists
      let userExists = await LecturerAcc.findOne({
        email: email,
      });
      if (userExists) {
        return res.status(409).send({ message: "email already exists" });
      }
      let hashedPassword=bcrypt.hashSync(password,10);
      await LecturerAcc.create({fullName:fullName, email:email, password:hashedPassword});
      res.status(200).json({ message: "Account created successfully" });
      // if user doesn't exist an otp is generated
    } catch (error) {
      res.status(500).send({ success: false });
      console.log(error);
    }
  };
}
let lecturerSignRoute = new SignUpFlow();
LecturerCreateAccount.post("/", lecturerSignRoute.SignUp);

export { LecturerCreateAccount };
