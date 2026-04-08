import { Router } from "express";
import { unlink } from "fs/promises";
import type { Request, Response } from "express";
import { Groq } from "groq-sdk";
import multer from "multer";
import path from "path";
import { PDFParse } from "pdf-parse";
import { existsSync, mkdirSync } from "fs";
import { GenerateOTP } from "#Verification/OTP.verify";

let pdfRouter = Router();
let apiKey = process.env.API_KEY;
if (!apiKey) throw new Error("Invalid API Key");
const MAX_PROMPT_CHARS = 12000;
let folderPath = path.resolve("./campusHub_AI_uploads");
if (!existsSync(folderPath)) {
  mkdirSync(folderPath, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req: Request, file, cb) {
    cb(null, folderPath);
  },
  filename: function (req: Request, file, cb) {
    cb(null, Date.now() + "" + GenerateOTP() + "" + file.originalname);
  },
});
const uploads = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req: Request, file, cb) {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      const error = new Error("Only PDF files allowed");
      (error as any).statusCode = 400;
      cb(error);
    }
  },
});
pdfRouter.post(
  "/",
  uploads.single("file"),
  async (req: Request, res: Response) => {
    let PdfFilePath = req.file?.path;
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ error: "Invalid file type. Please upload only PDF files." });
      }
      let parser = new PDFParse({ url: req.file.path });
      let results = parser.getText();
      let finalResult = (await results).text.replace(/\s+/g, " ").trim();
      if (!finalResult) {
        await parser.destroy();
        return res.status(400).json({ error: "Unable to extract text from PDF" });
      }

      const wasTrimmed = finalResult.length > MAX_PROMPT_CHARS;
      const safeExcerpt = wasTrimmed
        ? `${finalResult.slice(0, MAX_PROMPT_CHARS)}...`
        : finalResult;

      const groq = new Groq({ apiKey });
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You summarize academic PDFs clearly and concisely. If the input is truncated, say so briefly and summarize only the provided excerpt.",
          },
          {
            role: "user",
            content: `Summarize the following PDF text in clear sections.\nFocus on the key ideas, important findings, and practical takeaways.\n${wasTrimmed ? "The text was truncated to fit the model input limit, so mention that briefly in the summary.\n" : ""}\nPDF text:\n${safeExcerpt}`,
          },
        ],
        model: "openai/gpt-oss-20b",
        temperature: 0.5,
        max_completion_tokens: 900,
        stream: true,
      });
      let fullAI = "";
      for await (const chunk of chatCompletion) {
        const piece = chunk.choices[0]?.delta?.content;
        if (piece) fullAI += piece;
      }
      res.json({
        data2: fullAI,
        truncated: wasTrimmed,
        extractedCharacters: finalResult.length,
        summarizedCharacters: safeExcerpt.length,
      });
      await parser.destroy();
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: "Server error" });
    } finally {
      if (PdfFilePath) {
        try {
          await unlink(PdfFilePath);
        } catch (error) {
          console.error("Failed to unlink file:", error);
        }
      }
    }
  },
);
export { pdfRouter };
//# sourceMappingURL=upload.pdf.js.map
