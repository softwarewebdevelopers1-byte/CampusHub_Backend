import type { Request, Response } from "express";
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { compare, hash } from "bcrypt";
import { loginLimit } from "#Verification/rate.limit";
import {
  generateAccessToken,
  generateRefreshToken,
} from "#Verification/access.token";
import { User } from "#models/user.model";
import { AdminRefreshToken, RefreshToken } from "#models/token.model";

let logRouter = Router();

interface LoginFace {
  email: string;
  password: string;
}

type SupportedRole = "Student" | "Lecturer" | "Admin";

interface LoginConfig {
  accessCookie: string;
  refreshCookie: string;
  deviceCookie: string;
  userCookie: string;
  duration: number;
  refreshModel: typeof RefreshToken | typeof AdminRefreshToken;
}

const accessTokenDuration = 60 * 1000 * 15;

const loginConfigs: Record<SupportedRole, LoginConfig> = {
  Student: {
    accessCookie: "CampusHub7U4D_Host_AccessToken",
    refreshCookie: "CampusHub_3ga_auth_RefreshToken",
    deviceCookie: "Host_AU1_Auth_2Wa__DeviceId",
    userCookie: "user_1UA_XG",
    duration: 7 * 24 * 60 * 60 * 1000,
    refreshModel: RefreshToken,
  },
  Lecturer: {
    accessCookie: "CampusHub7U4D_lecturer_Host_AccessToken",
    refreshCookie: "CampusHub7U4D_lecturer_3ga_auth_RefreshToken",
    deviceCookie: "CampusHub7U4D_lecturer_Host_DeviceId",
    userCookie: "CampusHub7U4D_lecturer_1UA_XG",
    duration: 7 * 24 * 60 * 60 * 1000,
    refreshModel: RefreshToken,
  },
  Admin: {
    accessCookie: "dCa_Host_AccessToken",
    refreshCookie: "ptq2_was_auth_RefreshToken",
    deviceCookie: "Host_wqc_Auth_4rt__DeviceId",
    userCookie: "Q_user_1334G_XG",
    duration: 1 * 24 * 60 * 60 * 1000,
    refreshModel: AdminRefreshToken,
  },
};

class LoginFlow {
  private clearCookies(res: Response) {
    const cookies = [
      "CampusHub7U4D_Host_AccessToken",
      "CampusHub_3ga_auth_RefreshToken",
      "Host_AU1_Auth_2Wa__DeviceId",
      "user_1UA_XG",
      "CampusHub7U4D_lecturer_Host_AccessToken",
      "CampusHub7U4D_lecturer_3ga_auth_RefreshToken",
      "CampusHub7U4D_lecturer_Host_DeviceId",
      "CampusHub7U4D_lecturer_1UA_XG",
      "dCa_Host_AccessToken",
      "ptq2_was_auth_RefreshToken",
      "Host_wqc_Auth_4rt__DeviceId",
      "Q_user_1334G_XG",
    ];

    cookies.forEach((cookieName) => res.clearCookie(cookieName));
  }

  private normalizeRole(role?: string): SupportedRole {
    if (role === "Admin" || role === "Lecturer") {
      return role;
    }

    return "Student";
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

      const user = await User.findOne({
        email,
        account_state: "Active",
      });

      if (!user) {
        res.status(401).json({
          message: "Invalid credentials or account is suspended",
          success: false,
        });
        return;
      }

      const matching = await compare(password, user.password);
      if (!matching) {
        res.status(401).json({ message: "Invalid password", success: false });
        return;
      }

      const role = this.normalizeRole(user.role);
      const config = loginConfigs[role];

      this.clearCookies(res);

      const accessToken = generateAccessToken(req);
      const refreshToken = generateRefreshToken(req);
      const deviceId = uuidv4();
      const hashedRefreshToken = await hash(refreshToken, 10);

      await config.refreshModel.create({
        email,
        refreshToken: hashedRefreshToken,
        deviceId,
      });

      await User.findOneAndUpdate(
        { email },
        { $set: { status: "Active" } },
        {
          new: true,
          runValidators: true,
          upsert: false,
        },
      );

      res.cookie(config.accessCookie, accessToken, {
        httpOnly: true,
        maxAge: accessTokenDuration,
        secure: true,
        sameSite: "none",
      });

      res.cookie(config.userCookie, email, {
        httpOnly: true,
        maxAge: config.duration,
        secure: true,
        sameSite: "none",
      });

      res.cookie(config.refreshCookie, refreshToken, {
        httpOnly: true,
        maxAge: config.duration,
        secure: true,
        sameSite: "none",
      });

      res.cookie(config.deviceCookie, deviceId, {
        httpOnly: true,
        maxAge: config.duration,
        secure: true,
        sameSite: "none",
      });

      res.status(200).json({
        user: email.split("@")[0] || email,
        userName: user.userName || email.split("@")[0] || "User",
        role,
        success: true,
      });
    } catch (err) {
      res.status(500).json({ error: err });
    }
  };
}

let login = new LoginFlow();
logRouter.post("/", loginLimit(), login.Login);
export { logRouter };
