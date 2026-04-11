import { UsersUploadedPdf } from "#models/user.upload.model";
import { Router } from "express";
import type { Request, Response } from "express";

const simpleSearchRoute = Router();

type SearchablePdf = {
  _id?: unknown;
  unitName?: string;
  unitCode?: string;
  courseTitle?: string;
  from?: string;
  pdfUrl?: string;
};

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueTokens(value: string): string[] {
  return [...new Set(normalizeText(value).split(" ").filter((token) => token.length > 1))];
}

function scoreSimpleSearch(pdf: SearchablePdf, query: string, tokens: string[]): number {
  const unitName = normalizeText(pdf.unitName || "");
  const unitCode = normalizeText(pdf.unitCode || "");
  const courseTitle = normalizeText(pdf.courseTitle || "");
  const uploadedBy = normalizeText(pdf.from || "");

  let score = 0;

  if (unitName === query) score += 140;
  if (unitCode === query) score += 110;
  if (courseTitle === query) score += 90;

  if (unitName.startsWith(query)) score += 65;
  if (unitCode.startsWith(query)) score += 55;
  if (courseTitle.startsWith(query)) score += 35;

  if (unitName.includes(query)) score += 45;
  if (unitCode.includes(query)) score += 35;
  if (courseTitle.includes(query)) score += 25;
  if (uploadedBy.includes(query)) score += 10;

  const allTokensInUnitName = tokens.every((token) => unitName.includes(token));
  const allTokensInCode = tokens.every((token) => unitCode.includes(token));
  const allTokensInCourse = tokens.every((token) => courseTitle.includes(token));

  if (allTokensInUnitName) score += 50;
  if (allTokensInCode) score += 30;
  if (allTokensInCourse) score += 20;

  for (const token of tokens) {
    if (unitName.includes(token)) score += 14;
    if (unitCode.includes(token)) score += 10;
    if (courseTitle.includes(token)) score += 8;
    if (uploadedBy.includes(token)) score += 3;
  }

  if (tokens.length === 1 && unitName.split(" ").some((word) => word === tokens[0])) {
    score += 20;
  }

  return score;
}

simpleSearchRoute.post("/", async (req: Request, res: Response) => {
  try {
    const rawSearch = req.body.unitName?.trim();

    if (!rawSearch) {
      return res.status(400).json({
        success: false,
        message: "unitName is required",
      });
    }

    const query = normalizeText(rawSearch);
    const tokens = uniqueTokens(rawSearch);

    if (!query || tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Enter a more specific search term",
      });
    }

    const regexParts = tokens.map((token) => ({
      $or: [
        { unitName: { $regex: escapeRegex(token), $options: "i" } },
        { unitCode: { $regex: escapeRegex(token), $options: "i" } },
        { courseTitle: { $regex: escapeRegex(token), $options: "i" } },
        { from: { $regex: escapeRegex(token), $options: "i" } },
      ],
    }));

    const pdfs = (await UsersUploadedPdf.find({
      $or: [
        { unitName: { $regex: escapeRegex(rawSearch), $options: "i" } },
        { unitCode: { $regex: escapeRegex(rawSearch), $options: "i" } },
        { courseTitle: { $regex: escapeRegex(rawSearch), $options: "i" } },
        ...regexParts,
      ],
    }).lean()) as unknown as SearchablePdf[];

    const rankedResults = pdfs
      .map((pdf) => ({
        ...pdf,
        relevanceScore: scoreSimpleSearch(pdf, query, tokens),
      }))
      .filter((pdf) => pdf.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return res.status(200).json({
      success: true,
      data: rankedResults,
      total: rankedResults.length,
      query: rawSearch,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export { simpleSearchRoute };
