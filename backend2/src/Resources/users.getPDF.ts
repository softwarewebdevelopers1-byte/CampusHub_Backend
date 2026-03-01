import { UsersUploadedPdf } from "#models/user.upload.model";
import type { Response, Request } from "express";
import { Router } from "express";
let usersGetOwnPDF = Router();
usersGetOwnPDF.get("/", async (req: Request, res: Response) => {
  const user = req.cookies?.user_1UA_XG;
  if (!user) {
    res.status(401).json({ error: "Unauthorized pdf access" });
    return;
  }
  let allPdfs = await UsersUploadedPdf.find({ from: user });
  res.status(200).json(allPdfs);
});
export { usersGetOwnPDF };
