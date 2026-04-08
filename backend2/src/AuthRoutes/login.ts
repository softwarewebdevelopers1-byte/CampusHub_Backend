import type { Request, Response } from "express";
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { compare, hash } from "bcrypt";
import { loginLimit } from "#Verification/rate.limit";
import {
  generateAccessToken,
  generateRefreshToken,
} from "#Verification/access.token";
import { Admin, LecturerAcc, User } from "#models/user.model";
import { AdminRefreshToken, RefreshToken } from "#models/token.model";

let logRouter = Router();

interface LoginFace {
  email: string;
  password: string;
  role?: string;
}

type SupportedRole = "Student" | "Lecturer" | "Admin";

interface LoginConfig {
  role: SupportedRole;
  refreshModel: typeof RefreshToken | typeof AdminRefreshToken;
  findUser: (email: string) => Promise<any>;
  accessCookie: string;
  refreshCookie: string;
  deviceCookie: string;
  userCookie: string;
  duration: number;
  formatUser: (email: string) => string;
  getUserName?: (user: {
    userName?: string;
    fullName?: string;
  }) => string | undefined;
  updateStatus?: (email: string) => Promise<any>;
}

const loginConfigs: Record<SupportedRole, LoginConfig> = {
  Student: {
    role: "Student",
    refreshModel: RefreshToken,
    findUser: (email: string) =>
      User.findOne({ email, account_state: "Active", role: "Student" }),
    accessCookie: "CampusHub7U4D_Host_AccessToken",
    refreshCookie: "CampusHub_3ga_auth_RefreshToken",
    deviceCookie: "Host_AU1_Auth_2Wa__DeviceId",
    userCookie: "user_1UA_XG",
    duration: 7 * 24 * 60 * 60 * 1000,
    formatUser: (email: string) => email.split("@")[0] || email,
    getUserName: (user) => user.userName || "Student",
    updateStatus: (email: string) =>
      User.findOneAndUpdate(
        { email },
        { $set: { status: "Active" } },
        {
          new: true,
          runValidators: true,
          upsert: false,
        },
      ),
  },
  Lecturer: {
    role: "Lecturer",
    refreshModel: RefreshToken,
    findUser: (email: string) =>
      LecturerAcc.findOne({ email, account_state: "Active" }),
    accessCookie: "CampusHub7U4D_lecturer_Host_AccessToken",
    refreshCookie: "CampusHub7U4D_lecturer_3ga_auth_RefreshToken",
    deviceCookie: "CampusHub7U4D_lecturer_Host_DeviceId",
    userCookie: "CampusHub7U4D_lecturer_1UA_XG",
    duration: 7 * 24 * 60 * 60 * 1000,
    formatUser: (email: string) => email.split("@")[0] || email,
    getUserName: (user) => user.fullName,
    updateStatus: (email: string) =>
      LecturerAcc.findOneAndUpdate(
        { email },
        { $set: { status: "Active" } },
        {
          new: true,
          runValidators: true,
          upsert: false,
        },
      ),
  },
  Admin: {
    role: "Admin",
    refreshModel: AdminRefreshToken,
    findUser: (email: string) => Admin.findOne({ email }),
    accessCookie: "dCa_Host_AccessToken",
    refreshCookie: "ptq2_was_auth_RefreshToken",
    deviceCookie: "Host_wqc_Auth_4rt__DeviceId",
    userCookie: "Q_user_1334G_XG",
    duration: 1 * 24 * 60 * 60 * 1000,
    formatUser: (email: string) =>
      `${email.split("@")[0]?.slice(0, 3) || ""}*****${email.split("@")[1]?.split(".")[0] || ""}`,
  },
};

const accessTokenDuration = 60 * 1000 * 15;
const supportedRoles: SupportedRole[] = ["Student", "Lecturer", "Admin"];

class LoginFlow {
  private clearCookies(res: Response) {
    const cookies = new Set(
      supportedRoles.flatMap((role) => {
        const config = loginConfigs[role];
        return [
          config.accessCookie,
          config.refreshCookie,
          config.deviceCookie,
          config.userCookie,
        ];
      }),
    );

    cookies.forEach((cookieName) => res.clearCookie(cookieName));
  }

  private buildRoleQueue(role?: string): SupportedRole[] {
    if (!role) return supportedRoles;

    const normalizedRole = role.trim().toLowerCase();
    const matchedRole = supportedRoles.find(
      (supportedRole) => supportedRole.toLowerCase() === normalizedRole,
    );

    return matchedRole ? [matchedRole] : [];
  }

  private async getAccountForLogin(email: string, role?: string) {
    const roleQueue = this.buildRoleQueue(role);

    for (const roleName of roleQueue) {
      const config = loginConfigs[roleName];
      const user = await config.findUser(email);

      if (user) {
        return { config, user };
      }
    }

    return null;
  }

  Login = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body) {
        res.status(403).json({ issue: "Unauthorized access" });
        return;
      }

      const { email, password, role }: LoginFace = req.body;
      if (!email || !password) {
        res.status(400).json({
          message: "Email and password are required ",
          success: false,
        });
        return;
      }

      if (role && this.buildRoleQueue(role).length === 0) {
        res.status(400).json({
          message: "Unsupported role supplied",
          success: false,
        });
        return;
      }

      const account = await this.getAccountForLogin(email, role);
      if (!account) {
        res.status(401).json({
          message: "Invalid credentials or account is suspended",
          success: false,
        });
        return;
      }

      const { config, user } = account;
      const matching = await compare(password, user.password);
      if (!matching) {
        res.status(401).json({ message: "Invalid password", success: false });
        return;
      }

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

      if (config.updateStatus) {
        await config.updateStatus(email);
      }

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
        user: config.formatUser(email),
        userName: config.getUserName?.(user),
        role: user.role || config.role,
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
