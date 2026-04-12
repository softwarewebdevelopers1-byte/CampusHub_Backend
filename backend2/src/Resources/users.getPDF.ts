import { UsersUploadedPdf, UsersUploadVideos } from "#models/user.upload.model";
import { StorageClient } from "@supabase/storage-js";
import type { Response, Request } from "express";
import { Router } from "express";
let usersGetOwnPDF = Router();

function extractObjectPath(url: string, publicUrlPrefix: string) {
  const filePathIndex = url.indexOf(publicUrlPrefix);
  return filePathIndex >= 0
    ? decodeURIComponent(url.slice(filePathIndex + publicUrlPrefix.length))
    : "";
}

usersGetOwnPDF.get("/", async (req: Request, res: Response) => {
  const user = req.cookies?.user_1UA_XG;
  if (!user) {
    res.status(401).json({ error: "Unauthorized pdf access" });
    return;
  }

  const [allPdfs, allVideos] = await Promise.all([
    UsersUploadedPdf.find({ from: user }).lean(),
    UsersUploadVideos.find({ email: user }).lean(),
  ]);

  const collection = [
    ...allPdfs.map((pdf) => ({
      ...pdf,
      type: "pdf",
      fileUrl: pdf.pdfUrl,
      uploadedBy: pdf.from,
      uploadedAt:
        typeof pdf._id?.getTimestamp === "function"
          ? pdf._id.getTimestamp()
          : null,
    })),
    ...allVideos.map((video) => ({
      ...video,
      type: "video",
      fileUrl: video.videoUrl,
      uploadedBy: video.email,
      uploadedAt:
        typeof video._id?.getTimestamp === "function"
          ? video._id.getTimestamp()
          : null,
    })),
  ].sort(
    (a, b) =>
      new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime(),
  );

  res.status(200).json(collection);
});

usersGetOwnPDF.delete("/:pdfId", async (req: Request, res: Response) => {
  const user = req.cookies?.user_1UA_XG;

  if (!user) {
    res.status(401).json({ error: "Unauthorized pdf access" });
    return;
  }

  const { pdfId } = req.params;
  const resourceType = req.query.type === "video" ? "video" : "pdf";
  if (!pdfId) {
    res.status(400).json({ error: "Missing pdf id" });
    return;
  }

  try {
    if (resourceType === "video") {
      const video = await UsersUploadVideos.findOne({ _id: pdfId, email: user });

      if (!video) {
        res.status(404).json({ error: "Video not found" });
        return;
      }

      const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const PROJECT_REF = process.env.SUPABASE_URL;

      if (!SERVICE_KEY || !PROJECT_REF) {
        res.status(500).json({ error: "Missing Supabase credentials" });
        return;
      }

      const storageClient = new StorageClient(
        `https://${PROJECT_REF}.supabase.co/storage/v1`,
        {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      );

      const filePath = extractObjectPath(
        video.videoUrl,
        "/storage/v1/object/public/CampusHub_Videos/",
      );

      if (filePath) {
        const { error: storageError } = await storageClient
          .from("CampusHub_Videos")
          .remove([filePath]);

        if (storageError) {
          res.status(500).json({ error: "Failed to delete video from storage" });
          return;
        }
      }

      await UsersUploadVideos.deleteOne({ _id: pdfId, email: user });

      res.status(200).json({ message: "Video deleted successfully", pdfId });
      return;
    }

    const pdf = await UsersUploadedPdf.findOne({ _id: pdfId, from: user });

    if (!pdf) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const PROJECT_REF = process.env.SUPABASE_URL;

    if (!SERVICE_KEY || !PROJECT_REF) {
      res.status(500).json({ error: "Missing Supabase credentials" });
      return;
    }

    const storageClient = new StorageClient(
      `https://${PROJECT_REF}.supabase.co/storage/v1`,
      {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    );

    const filePath = extractObjectPath(
      pdf.pdfUrl,
      "/storage/v1/object/public/campusHub_PDF/",
    );

    if (filePath) {
      const { error: storageError } = await storageClient
        .from("campusHub_PDF")
        .remove([filePath]);

      if (storageError) {
        res.status(500).json({ error: "Failed to delete PDF from storage" });
        return;
      }
    }

    await UsersUploadedPdf.deleteOne({ _id: pdfId, from: user });

    res.status(200).json({ message: "Document deleted successfully", pdfId });
  } catch (error) {
    console.error("Failed to delete user PDF:", error);
    res.status(500).json({ error: "Unable to delete document" });
  }
});

export { usersGetOwnPDF };
