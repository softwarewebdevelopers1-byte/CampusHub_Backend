import { Router } from "express";
import { unlink } from "fs/promises";
import type { Request, Response } from "express";
import { Groq } from "groq-sdk";
import multer from "multer";
import path from "path";
import { PDFParse } from "pdf-parse";
import { existsSync, mkdirSync } from "fs";
import { GenerateOTP } from "#Verification/OTP.verify";
import { StudentAISummaryModel } from "#models/ai.summary.model";

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

async function streamGroqResponse(messages: { role: "system" | "user"; content: string }[]) {
  const groq = new Groq({ apiKey });
  const chatCompletion = await groq.chat.completions.create({
    messages,
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

  return fullAI;
}

pdfRouter.post(
  "/",
  uploads.single("file"),
  async (req: Request, res: Response) => {
    let PdfFilePath = req.file?.path;
    try {
      const studentEmail = req.cookies?.user_1UA_XG;

      if (!studentEmail) {
        return res.status(401).json({ error: "Unauthorized" });
      }

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

      const fullAI = await streamGroqResponse([
        {
          role: "system",
          content:
            "You summarize academic PDFs clearly and concisely. If the input is truncated, say so briefly and summarize only the provided excerpt.",
        },
        {
          role: "user",
          content: `Summarize the following PDF text in clear sections.\nFocus on the key ideas, important findings, and practical takeaways.\n${wasTrimmed ? "The text was truncated to fit the model input limit, so mention that briefly in the summary.\n" : ""}\nPDF text:\n${safeExcerpt}`,
        },
      ]);

      const historyEntry = await StudentAISummaryModel.create({
        studentEmail,
        fileName: req.file.originalname,
        summaryText: fullAI,
        truncated: wasTrimmed,
        extractedCharacters: finalResult.length,
        summarizedCharacters: safeExcerpt.length,
      });

      res.json({
        data2: fullAI,
        summaryId: historyEntry._id,
        fileName: req.file.originalname,
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

pdfRouter.get("/history", async (req: Request, res: Response) => {
  try {
    const studentEmail = req.cookies?.user_1UA_XG;

    if (!studentEmail) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const history = await StudentAISummaryModel.find({
      studentEmail,
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    res.status(200).json({ history });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Unable to load summary history" });
  }
});

pdfRouter.post("/ask-summary", async (req: Request, res: Response) => {
  try {
    const { summary, question } = req.body as {
      summary?: string;
      question?: string;
    };

    if (!summary || !question) {
      res
        .status(400)
        .json({ error: "Summary and question are required" });
      return;
    }

    const safeSummary =
      summary.length > MAX_PROMPT_CHARS
        ? `${summary.slice(0, MAX_PROMPT_CHARS)}...`
        : summary;

    const answer = await streamGroqResponse([
      {
        role: "system",
        content:
          "You answer questions only from the provided AI-generated summary. If the answer is not supported by the summary, say that clearly and do not invent details.",
      },
      {
        role: "user",
        content: `Summary:\n${safeSummary}\n\nQuestion:\n${question}\n\nAnswer the question clearly and directly using the summary above.`,
      },
    ]);

    res.status(200).json({ answer });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Unable to answer question" });
  }
});
export { pdfRouter };
//# sourceMappingURL=upload.pdf.js.map
