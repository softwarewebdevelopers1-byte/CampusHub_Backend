import { UsersUploadedPdf } from "#models/user.upload.model";
import { Router } from "express";
import type { Response, Request } from "express";

let deepSearchRouter = Router();

deepSearchRouter.post(
  "/",
  async (req: Request, res: Response): Promise<void> => {
    const { unitName, courseCode } = req.body;

    try {
      let searchConditions: any[] = [];

      if (unitName) {
        searchConditions.push({
          unitName: { $regex: unitName, $options: "i" },
        });
      }

      if (courseCode) {
        searchConditions.push({
          unitCode: { $regex: courseCode, $options: "i" },
        });
      }
      // If nothing is provided
      if (searchConditions.length === 0) {
        res.status(400).json({
          success: false,
          message: "Provide at least unitName or courseCode",
        });
        return;
      }

      let pdf = await UsersUploadedPdf.find({
        $or: searchConditions,
      }).select("pdfUrl from unitName unitCode  -_id");

      res.json({ success: true, data: pdf });
    } catch (error) {
      res.status(500).json({ success: false, error: "Unable to find pdf" });
    }
  },
);

export { deepSearchRouter };
