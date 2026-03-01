import { StorageClient } from "@supabase/storage-js";
import { UsersUploadedPdf } from "#models/user.upload.model";
import { Router } from "express";
import type { Response, Request, NextFunction } from "express";
import { unlink, readFile } from "fs/promises"; // readFile + unlink
import multer from "multer";

let UserUploadRouter = Router();

// Disk storage so we have a file path to unlink
const uploads = multer({
  storage: multer.diskStorage({
    destination: "users_uploads/",
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req: Request, file, cb) {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files allowed"));
    }
  },
});

UserUploadRouter.post(
  "/",
  uploads.single("file"),
  async (req: Request, res: Response, nxt: NextFunction): Promise<void> => {
    const usersEmail = req.cookies.user_1UA_XG;
    const { courseTitle, unitName, unitCode } = req.body;
    const filePath = req.file?.path; // path on disk

    if (!usersEmail || !courseTitle || !unitName || !unitCode) {
      res.status(400).json({ error: "Invalid file options" });
      return;
    }

    try {
      if (!req.file) {
        res
          .status(400)
          .json({ error: "Invalid file type. Please upload only PDF files." });
        return;
      }

      const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const PROJECT_REF = process.env.SUPABASE_URL;
      if (!SERVICE_KEY || !PROJECT_REF) {
        res.status(500).json({ error: "Missing Supabase credentials" });
        return;
      }

      const STORAGE_URL = `https://${PROJECT_REF}.supabase.co/storage/v1`;
      const storageClient = new StorageClient(STORAGE_URL, {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      });

      const fileName = `${Date.now()}-${req.file.originalname}`;
      const fileBuffer = await readFile(filePath!); // read file from disk

      // Upload file buffer to Supabase
      const { error } = await storageClient
        .from("campusHub_PDF")
        .upload(fileName, fileBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (error) {
        res
          .status(500)
          .json({ error: "Failed to upload to Supabase", newError: error });
        return;
      }

      const { data } = storageClient
        .from("campusHub_PDF")
        .getPublicUrl(fileName);

      await UsersUploadedPdf.create({
        from: usersEmail,
        courseTitle,
        unitName,
        unitCode,
        pdfUrl: data.publicUrl,
      });

      res.status(200).json({
        success: "Upload successful",
        fileUrl: data.publicUrl,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    } finally {
      // Always clean up local file if it exists
      if (filePath) {
        try {
          await unlink(filePath);
        } catch (cleanupErr) {
          console.error("Failed to unlink file:", cleanupErr);
        }
      }
    }
  },
);

export { UserUploadRouter };
