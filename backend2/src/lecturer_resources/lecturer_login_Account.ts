import type { Response, Request } from "express";
import { v4 as uuidv4 } from "uuid";
import { LecturerAcc } from "#models/user.model";
import { compare, hash } from "bcrypt";
import { Router } from "express";
import { loginLimit } from "#Verification/rate.limit";
import {
  generateAccessToken,
  generateRefreshToken,
} from "#Verification/access.token";
import { RefreshToken } from "#models/token.model";
let LecturerLoginRoute = Router();
// constructing interface blueprint
interface LoginFace {
  email: string;
  password: string;
}
// login class flow
class LecturerLoginFlow {
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
      let user = await LecturerAcc.findOne({
        email: email,
        account_state: "Active",
      });
      if (!user) {
        res.status(401).json({
          message: "Invalid credentials or account is suspended",
          success: false,
        });
        return;
      }

      let matching = await compare(password, user.password);
      if (!matching) {
        res.status(401).json({ message: "Invalid password", success: false });
        return;
      }
      if (user && matching) {
        // clear existing cookies
        res.clearCookie("CampusHub7U4D_lecturer_Host_AccessToken");
        res.clearCookie("CampusHub7U4D_lecturer_3ga_auth_RefreshToken");
        res.clearCookie("CampusHub7U4D_lecturer_Host_DeviceId");
        res.clearCookie("CampusHub7U4D_lecturer_1UA_XG");
        //
        let AccessToken = generateAccessToken(req);
        // duration for refresh token
        const duration = 7 * 24 * 60 * 60 * 1000;
        // duration for access token
        const duration2 = 60 * 1000 * 15;

        let RefreshTokenAccess = generateRefreshToken(req);
        let DeviceId = uuidv4();
        let HashedRefreshToken = await hash(RefreshTokenAccess, 10);
        await RefreshToken.create({
          email: email,
          refreshToken: HashedRefreshToken,
          deviceId: DeviceId,
        });
        await LecturerAcc.findOneAndUpdate(
          { email: email },
          { $set: { status: "Active" } },
          {
            new: true, // return the updated document
            runValidators: true, // validate schema rules
            upsert: false, // create if not found (optional)
          },
        );
        // sending access token as cookie

        // access token uses shorter maxAge
        res.cookie("CampusHub7U4D_lecturer_Host_AccessToken", AccessToken, {
          httpOnly: true,
          maxAge: duration2,
          secure: true,
          sameSite: "none",
        });

        res.cookie("CampusHub7U4D_lecturer_1UA_XG", email, {
          httpOnly: true,
          maxAge: duration,
          secure: true,
          sameSite: "none",
        });

        // sending refresh token as cookie
        res.cookie("CampusHub7U4D_lecturer_3ga_auth_RefreshToken", RefreshTokenAccess, {
          httpOnly: true,
          maxAge: duration,
          secure: true,
          sameSite: "none",
        });

        // sending device Id as cookie
        res.cookie("CampusHub7U4D_lecturer_Host_DeviceId", DeviceId, {
          httpOnly: true,
          maxAge: duration,
          secure: true,
          sameSite: "none",
        });
        res
          .status(200)
          .json({ user: email.split("@")[0], success: true, role: user.role });
      }
    } catch (err) {
      res.status(500).json({ error: err });
    }
  };
}
let login = new LecturerLoginFlow();
LecturerLoginRoute.post("/", loginLimit(), login.Login);
export { LecturerLoginRoute };
//# sourceMappingURL=login.js.map
