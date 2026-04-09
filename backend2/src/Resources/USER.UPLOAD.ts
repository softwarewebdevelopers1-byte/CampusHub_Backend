import { StorageClient } from "@supabase/storage-js";
import { UsersUploadedPdf } from "#models/user.upload.model";
import { Router } from "express";
import type { Response, Request, NextFunction } from "express";
import { unlink, readFile } from "fs/promises"; // readFile + unlink
import { Groq } from "groq-sdk";
import multer from "multer";
import { PDFParse } from "pdf-parse";

let UserUploadRouter = Router();
const MAX_VERIFICATION_TEXT_CHARS = 12000;
const aiApiKey = process.env.API_KEY;

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

type VerificationResult = {
  matches: boolean;
  confidence: number;
  feedback: string;
  summary: string;
};

async function extractPdfText(filePath: string) {
  const parser = new PDFParse({ url: filePath });

  try {
    const result = await parser.getText();
    return result.text.replace(/\s+/g, " ").trim();
  } finally {
    await parser.destroy();
  }
}

function parseVerificationResult(rawResponse: string): VerificationResult {
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  const jsonPayload = jsonMatch ? jsonMatch[0] : rawResponse;
  const parsed = JSON.parse(jsonPayload) as Partial<VerificationResult>;

  return {
    matches: Boolean(parsed.matches),
    confidence:
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0,
    feedback:
      typeof parsed.feedback === "string" && parsed.feedback.trim()
        ? parsed.feedback.trim()
        : "The uploaded document does not appear to match the submitted unit name.",
    summary:
      typeof parsed.summary === "string" ? parsed.summary.trim() : "",
  };
}

async function verifyDocumentMatchesCourse({
  unitName,
  extractedText,
}: {
  unitName: string;
  extractedText: string;
}) {
  if (!aiApiKey) {
    throw new Error("Missing AI verification API key");
  }

  const safeExcerpt =
    extractedText.length > MAX_VERIFICATION_TEXT_CHARS
      ? `${extractedText.slice(0, MAX_VERIFICATION_TEXT_CHARS)}...`
      : extractedText;

  const groq = new Groq({ apiKey: aiApiKey });
  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'You validate whether an uploaded academic PDF matches the submitted unit name. Respond in JSON only with keys "matches", "confidence", "feedback", and "summary". Set "matches" to true only when the PDF content is clearly relevant to the submitted unit name. Do not evaluate course titles, unit codes, or any other details. Keep "feedback" short and useful for the student.',
      },
      {
        role: "user",
        content: `Submitted unit name: ${unitName}

PDF text excerpt:
${safeExcerpt}

Decide whether the document matches the submitted unit name only. Do not consider course title, unit code, or other details. If it does not match, explain why in feedback. Confidence must be a number between 0 and 1.`,
      },
    ],
  });

  const rawResponse = completion.choices[0]?.message?.content;
  if (!rawResponse) {
    throw new Error("AI verification returned an empty response");
  }

  return parseVerificationResult(rawResponse);
}

UserUploadRouter.post(
  "/",
  uploads.single("file"),
  async (req: Request, res: Response, nxt: NextFunction): Promise<void> => {
    const usersEmail =
      req.cookies.user_1UA_XG || req.cookies.CampusHub7U4D_lecturer_1UA_XG;
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
      const extractedText = await extractPdfText(filePath!);

      if (!extractedText) {
        res.status(400).json({
          error: "We could not read any text from that PDF.",
          verificationFailed: true,
          feedback:
            "Upload a text-based academic PDF so CampusHub AI can verify it against the selected unit name.",
        });
        return;
      }

      const verification = await verifyDocumentMatchesCourse({
        unitName,
        extractedText,
      });

      if (!verification.matches) {
        res.status(400).json({
          error: "AI verification failed",
          verificationFailed: true,
          feedback: verification.feedback,
          confidence: verification.confidence,
          summary: verification.summary,
        });
        return;
      }

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
        verification: {
          feedback: verification.feedback,
          confidence: verification.confidence,
          summary: verification.summary,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Server error",
        feedback:
          "CampusHub could not verify this document right now. Please try again in a moment.",
      });
    } finally {
      // Always clean up local file if it exists
      if (filePath) {
        try {
          await unlink(filePath);
        } catch (cleanupErr) {}
      }
    }
  },
);

export { UserUploadRouter };
