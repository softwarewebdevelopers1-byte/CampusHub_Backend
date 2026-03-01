import { User } from "#models/user.model";
import { authenticateAdmin } from "#Verification/access.token";
import { Router } from "express";
import type { Response, Request } from "express";

export let GetUsers = Router();
export let UserNumber = Router();
GetUsers.get(
  "/",
  authenticateAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      let users: any[] = await User.find({}    , {
        email: true,
        role: true,
        status: true,
        account_state: true,
        _id: false,
      })
        .lean()
        .exec();
      res.status(200).json({ Users: users });
    } catch (error) {
      res.status(500).json({ error: "Fetching users error" });
    }
  },
);
UserNumber.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    let count = await User.countDocuments({}    );
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: "Counting users error" });
  }
});
