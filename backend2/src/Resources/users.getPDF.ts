import { UsersUploadedPdf } from "#models/user.upload.model";
import { StorageClient } from "@supabase/storage-js";
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

usersGetOwnPDF.delete("/:pdfId", async (req: Request, res: Response) => {
  const user = req.cookies?.user_1UA_XG;

  if (!user) {
    res.status(401).json({ error: "Unauthorized pdf access" });
    return;
  }

  const { pdfId } = req.params;
  if (!pdfId) {
    res.status(400).json({ error: "Missing pdf id" });
    return;
  }

  try {
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

    const publicUrlPrefix = "/storage/v1/object/public/campusHub_PDF/";
    const filePathIndex = pdf.pdfUrl.indexOf(publicUrlPrefix);
    const filePath =
      filePathIndex >= 0
        ? decodeURIComponent(pdf.pdfUrl.slice(filePathIndex + publicUrlPrefix.length))
        : "";

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
