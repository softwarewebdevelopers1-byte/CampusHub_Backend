import { Router } from "express";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { authenticateAdmin } from "#Verification/access.token";
import { Admin, LecturerAcc, User } from "#models/user.model";

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

      if (role === "Student") {
        const createdStudent = await User.create({
          email,
          password: hashedPassword,
          userName: userName?.trim() || "Student",
          role: "Student",
          status: "Active",
          account_state: "Active",
        });

        res.status(201).json({
          message: "Student account created successfully",
          user: buildUserRecord({
            email: createdStudent.email,
            role: createdStudent.role,
            status: createdStudent.status,
            account_state: createdStudent.account_state,
            userName: createdStudent.userName,
          }),
        });
        return;
      }

      if (role === "Lecturer") {
        const createdLecturer = await LecturerAcc.create({
          email,
          password: hashedPassword,
          fullName: fullName?.trim() || "Lecturer",
          role: "Lecturer",
          status: "Active",
          account_state: "Active",
        });

        res.status(201).json({
          message: "Lecturer account created successfully",
          user: buildUserRecord({
            email: createdLecturer.email,
            role: createdLecturer.role,
            status: createdLecturer.status,
            account_state: createdLecturer.account_state,
            fullName: createdLecturer.fullName,
          }),
        });
        return;
      }

      const createdAdmin = await Admin.create({
        email,
        password: hashedPassword,
        role: "Admin",
      });

      res.status(201).json({
        message: "Admin account created successfully",
        user: buildUserRecord({
          email: createdAdmin.email,
          role: createdAdmin.role,
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
      if (role === "Student") {
        const updatedStudent = await User.findOneAndUpdate(
          { email },
          {
            $set: {
              account_state,
              status: account_state,
              ...(account_state === "Active"
                ? { role: "Student", expiresAt: null }
                : {}),
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

        if (!updatedStudent) {
          res.status(404).json({ error: "User not found" });
          return;
        }

        res.status(200).json({
          message: `User marked as ${account_state.toLowerCase()}`,
          user: buildUserRecord(updatedStudent),
        });
        return;
      }

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

      if (!updatedLecturer) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.status(200).json({
        message: `User marked as ${account_state.toLowerCase()}`,
        user: buildUserRecord(updatedLecturer),
      });
    } catch (error) {
      res.status(500).json({ error: "Unable to update user" });
    }
  },
);

export { AdminUserManagementRouter };
