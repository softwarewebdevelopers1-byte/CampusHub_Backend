import { User } from "#models/user.model";
import { authenticateAdmin } from "#Verification/access.token";
import type { Response, Request } from "express";
import express from "express";
let RecoverUsers = express.Router();
RecoverUsers.post(
  "/",
  authenticateAdmin,
  async (req: Request, res: Response): Promise<void> => {
    let { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    try {
      await User.updateOne({ email: email } , {
        $set: { account_state: "Active", role: "Student", expiresAt: "" },
      });
      res.status(200).json({ message: "User recovered successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to recover user" });
    }
  },
);
export default RecoverUsers;
