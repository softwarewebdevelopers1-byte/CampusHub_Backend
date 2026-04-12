import express from "express";
import { StorageClient } from "@supabase/storage-js";
import multer from "multer";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { UsersUploadVideos } from "#models/user.upload.model";

const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const VideoUploadRouter = express.Router();

/* Resolve video folder */
const VideoFolderPath = path.resolve("./videos");

/* Create folder if it doesn't exist */
if (!fs.existsSync(VideoFolderPath)) {
  fs.mkdirSync(VideoFolderPath, { recursive: true });
}

/* Multer storage config */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VideoFolderPath),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

/* Video filter */
const videoFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (file.mimetype.startsWith("video/")) cb(null, true);
  else cb(new Error("Only video files are allowed"));
};

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: videoFilter,
});

/* POST route */
VideoUploadRouter.post(
  "/",
  upload.single("video"),
  async (req, res): Promise<void> => {
    const userEmail =
      req.cookies?.user_1UA_XG || req.cookies?.CampusHub7U4D_lecturer_1UA_XG;
    if (!userEmail) {
      res.status(401).json({
        message: "You must be logged in to upload videos",
      });
      return;
    }
    let filePath: string | null = null;
    let { courseTitle, unitName, unitCode } = req.body;
    console.log(courseTitle, unitName, unitCode);
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: "No video uploaded" });
        return;
      }

      // Store file path for cleanup
      filePath = path.join(VideoFolderPath, req.file.filename);

      // Supabase setup
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

      // Read the file buffer
      const fileBuffer = await readFile(filePath);

      // Upload to Supabase bucket
      const { error } = await storageClient
        .from("CampusHub_Videos")
        .upload(req.file.filename, fileBuffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (error) {
        res.status(500).json({ success: false, message: error.message });
        return;
      }
      await UsersUploadVideos.create({
        email: userEmail,
        courseTitle: courseTitle,
        unitName: unitName,
        unitCode: unitCode,
        videoUrl: `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/CampusHub_Videos/${req.file.filename}`,
      });
      // Success response
      res.status(200).json({
        success: true,
        message: "Video uploaded successfully",
        fileUrl: `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/CampusHub_Videos/${req.file.filename}`,
      });
      return;
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
      return;
    } finally {
      // Clean up the local file if it exists
      if (filePath) {
        try {
          await unlink(filePath);
        } catch (unlinkErr) {
          console.error("Failed to delete local file:", unlinkErr);
        }
      }
    }
  },
);

export default VideoUploadRouter;
