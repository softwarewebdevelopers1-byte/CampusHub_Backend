import type { Response, Request } from "express";
import { v4 as uuidv4 } from "uuid";
import { Admin } from "#models/user.model";
import { compare, hash } from "bcrypt";
import { Router } from "express";
import { loginAdminLimit } from "#Verification/rate.limit";
import {
  generateAccessToken,
  generateRefreshToken,
} from "#Verification/access.token";
import { AdminRefreshToken } from "#models/token.model";
let LogAdminRouter = Router();
// constructing interface blueprint
interface LoginFace {
  email: string;
  password: string;
}
// login class flow
class LoginFlow {
  private password: string;
  private email: string;
  constructor() {
    this.password = "";
    this.email = "";
  }
  Login = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body) {
        res.status(403).json({ issue: "Unauthorized access" });
        return;
      }
      const { email, password }: LoginFace = req.body;
      if (!email || !password) {
        res.status(400).json({
          message: "Email and password are required ",
          success: false,
        });
        return;
      }
      this.email = email;
      this.password = password;
      let user = await Admin.findOne({ email: this.email });
      if (!user) {
        res
          .status(401)
          .json({ message: "Invalid credentials", success: false });
        return;
      }

      let matching = await compare(this.password, user.password);
      if (!matching) {
        res.status(401).json({ message: "Invalid password", success: false });
        return;
      }
      if (user && matching) {
        // clear existing cookies
        res.clearCookie("dCa_Host_AccessToken");
        res.clearCookie("Q_user_1334G_XG");
        res.clearCookie("ptq2_was_auth_RefreshToken");
        res.clearCookie("Host_wqc_Auth_4rt__DeviceId");
        //
        let AccessToken = generateAccessToken(req);
        // duration for refresh token
        const duration = 1 * 24 * 60 * 60 * 1000;
        // duration for access token
        const duration2 = 60 * 1000 * 15;

        let RefreshTokenAccess = generateRefreshToken(req);
        let DeviceId = uuidv4();
        let HashedRefreshToken = await hash(RefreshTokenAccess, 10);
        await AdminRefreshToken.create({
          email: email,
          refreshToken: HashedRefreshToken,
          deviceId: DeviceId,
        });
        // sending access token as cookie
        res.cookie("dCa_Host_AccessToken", AccessToken, {
          httpOnly: true,
          maxAge: duration2,
          secure: true,
          sameSite: "none",
        });
        res.cookie("Q_user_1334G_XG", email, {
          httpOnly: true,
          maxAge: duration,
          secure: true,
          sameSite: "none",
        });
        // sending refresh token as cookie
        res.cookie("ptq2_was_auth_RefreshToken", RefreshTokenAccess, {
          httpOnly: true,
          maxAge: duration,
          secure: true,
          sameSite: "none",
        });
        // sending device Id as cookie
        res.cookie("Host_wqc_Auth_4rt__DeviceId", DeviceId, {
          httpOnly: true,
          maxAge: duration,
          secure: true,
          sameSite: "none",
        });
        res.status(200).json({
          user: `${email.split("@")[0]?.slice(0, 3)}*****${email.split("@")[1]?.split(".")[0]}`,
          success: true,
          role: user.role || "None",
        });
      }
    } catch (err) {
      res.status(500).json({ error: err });
    }
  };
}
let login = new LoginFlow();
LogAdminRouter.post("/", loginAdminLimit(), login.Login);
export { LogAdminRouter };
//# sourceMappingURL=login.js.map
