import express from "express";
import type { Response, Request } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";

const VideoUploadRouter = express.Router();

/* Resolve video folder */
const VideoFolderPath = path.resolve("./videos");

/* Create folder if it doesn't exist */
if (!fs.existsSync(VideoFolderPath)) {
  try {
    fs.mkdirSync(VideoFolderPath, { recursive: true });
  } catch (error) {
    console.log("Unable to create video folder");
  }
}

/* Storage configuration */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VideoFolderPath);
  },

  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(null, uniqueName + path.extname(file.originalname));
  },
});

/* Video filter */
const videoFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Only video files are allowed"));
  }
};

/* Multer setup */
const upload = multer({
  storage,

  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },

  fileFilter: videoFilter,
});

/* POST route */
VideoUploadRouter.post("/upload-video", (req: Request, res: Response) => {
  upload.single("video")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No video uploaded",
      });
    }

    res.status(200).json({
      success: true,
      message: "Video uploaded successfully",
      file: req.file.filename,
    });
  });
});

export default VideoUploadRouter;
