import { UsersUploadedPdf } from "#models/user.upload.model";
import { Router } from "express";
import type { Request, Response } from "express";

const deepSearchRouter = Router();

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

function normalizeCode(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenList(value: string): string[] {
  return [...new Set(normalizeText(value).split(" ").filter((token) => token.length > 1))];
}

function scoreDeepSearch(
  pdf: SearchablePdf,
  unitQuery: string,
  codeQuery: string,
  unitTokens: string[],
): number {
  const unitName = normalizeText(pdf.unitName || "");
  const unitCode = normalizeCode(pdf.unitCode || "");
  const courseTitle = normalizeText(pdf.courseTitle || "");
  const uploadedBy = normalizeText(pdf.from || "");

  let score = 0;

  if (unitQuery) {
    if (unitName === unitQuery) score += 180;
    if (unitName.startsWith(unitQuery)) score += 90;
    if (unitName.includes(unitQuery)) score += 60;
    if (courseTitle.includes(unitQuery)) score += 22;

    const allTokensInUnit = unitTokens.every((token) => unitName.includes(token));
    if (allTokensInUnit) score += 55;

    for (const token of unitTokens) {
      if (unitName.includes(token)) score += 15;
      if (courseTitle.includes(token)) score += 6;
      if (uploadedBy.includes(token)) score += 2;
    }
  }

  if (codeQuery) {
    if (unitCode === codeQuery) score += 170;
    if (unitCode.startsWith(codeQuery)) score += 100;
    if (unitCode.includes(codeQuery)) score += 70;
  }

  if (unitQuery && codeQuery && unitName.includes(unitQuery) && unitCode.includes(codeQuery)) {
    score += 120;
  }

  return score;
}

deepSearchRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const rawUnitName = req.body.unitName?.trim() || "";
  const rawCourseCode = req.body.courseCode?.trim() || "";

  try {
    if (!rawUnitName && !rawCourseCode) {
      res.status(400).json({
        success: false,
        message: "Provide at least unitName or courseCode",
      });
      return;
    }

    const unitQuery = normalizeText(rawUnitName);
    const codeQuery = normalizeCode(rawCourseCode);
    const unitTokens = tokenList(rawUnitName);

    const searchConditions: Array<Record<string, unknown>> = [];

    if (rawUnitName) {
      searchConditions.push(
        { unitName: { $regex: escapeRegex(rawUnitName), $options: "i" } },
        { courseTitle: { $regex: escapeRegex(rawUnitName), $options: "i" } },
      );

      for (const token of unitTokens) {
        searchConditions.push({
          unitName: { $regex: escapeRegex(token), $options: "i" },
        });
      }
    }

    if (rawCourseCode) {
      const codePattern = rawCourseCode.replace(/\s+/g, "\\s*");
      searchConditions.push({
        unitCode: { $regex: codePattern, $options: "i" },
      });
    }

    const pdfs = (await UsersUploadedPdf.find({
      $or: searchConditions,
    })
      .select("pdfUrl from unitName unitCode courseTitle")
      .lean()) as unknown as SearchablePdf[];

    const rankedResults = pdfs
      .map((pdf) => ({
        ...pdf,
        courseTitle: pdf.courseTitle || "",
        course: pdf.courseTitle || "",
        relevanceScore: scoreDeepSearch(pdf, unitQuery, codeQuery, unitTokens),
      }))
      .filter((pdf) => pdf.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    res.json({
      success: true,
      data: rankedResults,
      total: rankedResults.length,
      query: {
        unitName: rawUnitName,
        courseCode: rawCourseCode,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Unable to find pdf" });
  }
});

export { deepSearchRouter };
