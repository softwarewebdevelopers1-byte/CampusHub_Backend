// unitName
import { UsersUploadedPdf } from "#models/user.upload.model";
import { Router } from "express";
import type { Response, Request } from "express";

let simpleSearchRoute = Router();

simpleSearchRoute.post("/", async (req:Request, res:Response) => {
  try {
    const search = req.body.unitName?.trim();

    if (!search) {
      return res.status(400).json({
        success: false,
        message: "unitName is required",
      });
    }

    // Split words: "graph pdf" -> ["graph", "pdf"]
    const words = search.split(" ");

    const regexArray = words.map((word:string) => ({
      unitName: { $regex: word, $options: "i" },
    }));

    const pdf = await UsersUploadedPdf.find({
      $or: regexArray,
    });

    return res.status(200).json({
      success: true,
      data: pdf,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export { simpleSearchRoute };
