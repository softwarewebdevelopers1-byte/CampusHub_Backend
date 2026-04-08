import { Router } from "express";
import type { Request, Response } from "express";
import { UsersUploadedPdf, UsersUploadVideos } from "#models/user.upload.model";

let LatestUploadsRoute = Router();

LatestUploadsRoute.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const [pdfs, videos] = await Promise.all([
      UsersUploadedPdf.find({})
        .sort({ _id: -1 })
        .limit(6)
        .lean()
        .exec(),
      UsersUploadVideos.find({})
        .sort({ _id: -1 })
        .limit(6)
        .lean()
        .exec(),
    ]);

    const latestUploads = [
      ...pdfs.map((pdf) => ({
        type: "pdf",
        title: pdf.unitName || pdf.courseTitle || "PDF Upload",
        courseTitle: pdf.courseTitle,
        unitName: pdf.unitName,
        unitCode: pdf.unitCode,
        uploadedBy: pdf.from,
        fileUrl: pdf.pdfUrl,
        createdAt:
          typeof pdf._id?.getTimestamp === "function"
            ? pdf._id.getTimestamp()
            : new Date(),
      })),
      ...videos.map((video) => ({
        type: "video",
        title: video.unitName || video.courseTitle || "Video Upload",
        courseTitle: video.courseTitle,
        unitName: video.unitName,
        unitCode: video.unitCode,
        uploadedBy: video.email,
        fileUrl: video.videoUrl,
        createdAt:
          typeof video._id?.getTimestamp === "function"
            ? video._id.getTimestamp()
            : new Date(),
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 8);

    res.status(200).json({ uploads: latestUploads });
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch latest uploads" });
  }
});

export { LatestUploadsRoute };
