import { Router } from "express";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { authenticateAdmin } from "#Verification/access.token";
import { Admin, LecturerAcc, OTP, User } from "#models/user.model";
import { AdminRefreshToken, RefreshToken } from "#models/token.model";
import { UsersUploadedPdf, UsersUploadVideos } from "#models/user.upload.model";
import notifications from "#models/notifications.model";

type SupportedRole = "Student" | "Lecturer" | "Admin";

interface CreateUserBody {
  email?: string;
  password?: string;
  role?: SupportedRole;
  userName?: string;
  fullName?: string;
}

interface UpdateUserBody {
  email?: string;
  role?: SupportedRole;
  account_state?: "Active" | "Inactive";
}

const AdminUserManagementRouter = Router();

const findUserAcrossRoles = async (email: string) => {
  const [student, lecturer, admin] = await Promise.all([
    User.findOne({ email }).lean().exec(),
    LecturerAcc.findOne({ email }).lean().exec(),
    Admin.findOne({ email }).lean().exec(),
  ]);

  return student || lecturer || admin;
};

const buildUserRecord = (user: {
  email: string;
  role?: string;
  status?: string;
  account_state?: string;
  userName?: string;
  fullName?: string;
}) => ({
  email: user.email,
  role: user.role || "Student",
  status: user.status || "Active",
  account_state: user.account_state || "Active",
  displayName: user.fullName || user.userName || user.email.split("@")[0],
});

AdminUserManagementRouter.get(
  "/",
  authenticateAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const [students, lecturers, admins] = await Promise.all([
        User.find(
          {},
          {
            email: true,
            role: true,
            status: true,
            account_state: true,
            userName: true,
            _id: false,
          },
        )
          .lean()
          .exec(),
        LecturerAcc.find(
          {},
          {
            email: true,
            role: true,
            status: true,
            account_state: true,
            fullName: true,
            _id: false,
          },
        )
          .lean()
          .exec(),
        Admin.find(
          {},
          {
            email: true,
            role: true,
            _id: false,
          },
        )
          .lean()
          .exec(),
      ]);

      const users = [...students, ...lecturers, ...admins]
        .map(buildUserRecord)
        .sort((a, b) => a.email.localeCompare(b.email));

      res.status(200).json({ users });
    } catch (error) {
      res.status(500).json({ error: "Unable to load users" });
    }
  },
);

AdminUserManagementRouter.post(
  "/",
  authenticateAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { email, password, role, userName, fullName }: CreateUserBody =
      req.body;

    if (!email || !password || !role) {
      res
        .status(400)
        .json({ error: "Email, password, and role are required" });
      return;
    }

    if (!["Student", "Lecturer", "Admin"].includes(role)) {
      res.status(400).json({ error: "Unsupported role" });
      return;
    }

    if (role === "Student" && !userName?.trim()) {
      res.status(400).json({ error: "Student name is required" });
      return;
    }

    if (role === "Lecturer" && !fullName?.trim()) {
      res.status(400).json({ error: "Lecturer full name is required" });
      return;
    }

    try {
      const existingUser = await findUserAcrossRoles(email);
      if (existingUser) {
        res.status(409).json({ error: "Email already exists" });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const displayName =
        role === "Student"
          ? userName?.trim() || "Student"
          : role === "Lecturer"
            ? fullName?.trim() || "Lecturer"
            : email.split("@")[0] || "Admin";

      const createdUser = await User.create({
        email,
        password: hashedPassword,
        userName: displayName,
        role,
        status: "Active",
        account_state: "Active",
      });

      res.status(201).json({
        message: `${role} account created successfully`,
        user: buildUserRecord({
          email: createdUser.email,
          role: createdUser.role,
          status: createdUser.status,
          account_state: createdUser.account_state,
          userName: createdUser.userName,
        }),
      });
    } catch (error) {
      res.status(500).json({ error: "Unable to create account" });
    }
  },
);

AdminUserManagementRouter.patch(
  "/",
  authenticateAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { email, role, account_state }: UpdateUserBody = req.body;

    if (!email || !role || !account_state) {
      res
        .status(400)
        .json({ error: "Email, role, and account state are required" });
      return;
    }

    if (!["Student", "Lecturer", "Admin"].includes(role)) {
      res.status(400).json({ error: "Unsupported role" });
      return;
    }

    if (!["Active", "Inactive"].includes(account_state)) {
      res.status(400).json({ error: "Unsupported account state" });
      return;
    }

    if (role === "Admin") {
      res.status(400).json({
        error: "Admin accounts cannot be activated or deactivated here",
      });
      return;
    }

    try {
      const updatedUser = await User.findOneAndUpdate(
        { email },
        {
          $set: {
            account_state,
            status: account_state,
            ...(account_state === "Active" ? { role, expiresAt: null } : {}),
          },
        },
        {
          new: true,
          runValidators: true,
          upsert: false,
        },
      )
        .lean()
        .exec();

      if (updatedUser) {
        res.status(200).json({
          message: `User marked as ${account_state.toLowerCase()}`,
          user: buildUserRecord(updatedUser),
        });
        return;
      }

      if (role === "Lecturer") {
        const updatedLecturer = await LecturerAcc.findOneAndUpdate(
          { email },
          {
            $set: {
              account_state,
              status: account_state,
            },
          },
          {
            new: true,
            runValidators: true,
            upsert: false,
          },
        )
          .lean()
          .exec();

        if (updatedLecturer) {
          res.status(200).json({
            message: `User marked as ${account_state.toLowerCase()}`,
            user: buildUserRecord(updatedLecturer),
          });
          return;
        }
      }

      res.status(404).json({ error: "User not found" });
    } catch (error) {
      res.status(500).json({ error: "Unable to update user" });
    }
  },
);

AdminUserManagementRouter.delete(
  "/",
  authenticateAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { email, role } = req.body as {
      email?: string;
      role?: SupportedRole;
    };

    if (!email || !role) {
      res.status(400).json({ error: "Email and role are required" });
      return;
    }

    if (!["Student", "Lecturer", "Admin"].includes(role)) {
      res.status(400).json({ error: "Unsupported role" });
      return;
    }

    try {
      let deletedUser = null;

      deletedUser = await User.findOneAndDelete({ email }).lean().exec();

      if (!deletedUser && role === "Lecturer") {
        deletedUser = await LecturerAcc.findOneAndDelete({ email })
          .lean()
          .exec();
      } else if (!deletedUser && role === "Admin") {
        deletedUser = await Admin.findOneAndDelete({ email }).lean().exec();
      }

      if (!deletedUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      await Promise.all([
        RefreshToken.deleteMany({ email }),
        AdminRefreshToken.deleteMany({ email }),
        OTP.deleteMany({ email }),
        UsersUploadedPdf.deleteMany({ from: email }),
        UsersUploadVideos.deleteMany({ email }),
        role === "Admin"
          ? notifications.deleteMany({ from: `Admin ${email}` })
          : Promise.resolve(),
      ]);

      res.status(200).json({
        message: "User and related content deleted successfully",
      });
    } catch (error) {
      res.status(500).json({ error: "Unable to delete user" });
    }
  },
);

export { AdminUserManagementRouter };
