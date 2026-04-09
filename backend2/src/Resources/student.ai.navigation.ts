import { Router } from "express";
import type { Request, Response } from "express";
import { Groq } from "groq-sdk";

const StudentNavigationAIRouter = Router();
const apiKey = process.env.API_KEY;

const AVAILABLE_PAGES = [
  {
    id: "homepage",
    path: "/homepage",
    title: "Dashboard",
    aliases: ["home", "dashboard", "homepage", "main page", "welcome page"],
    description: "Main student dashboard overview.",
  },
  {
    id: "myCollection",
    path: "/myCollection",
    title: "My Collection",
    aliases: ["my collection", "collection", "my documents", "my pdfs"],
    description: "View and manage your uploaded PDF documents.",
  },
  {
    id: "simpleSearch",
    path: "/simpleSearch",
    title: "PDF Library Simple Search",
    aliases: ["simple search", "pdf search", "find pdfs"],
    description: "Search PDFs using simple keyword search.",
  },
  {
    id: "deepsearch",
    path: "/deepsearch",
    title: "PDF Library Deep Search",
    aliases: ["deep search", "deepsearch", "ai pdf search"],
    description: "Search inside PDFs more deeply.",
  },
  {
    id: "AISummary",
    path: "/AISummary",
    title: "AI Summary",
    aliases: ["ai summary", "summary", "summarize pdf", "pdf summary"],
    description: "Upload a PDF and get an AI-generated summary.",
  },
  {
    id: "sharePDF",
    path: "/sharePDF",
    title: "Share PDF",
    aliases: ["share pdf", "upload pdf", "uploads", "upload resource"],
    description: "Upload and share a PDF resource.",
  },
  {
    id: "videos",
    path: "/videos",
    title: "Lecture Videos",
    aliases: ["videos", "lecture videos", "video page"],
    description: "Browse lecture videos.",
  },
  {
    id: "settings",
    path: "/settings",
    title: "Settings",
    aliases: ["settings", "account settings", "preferences"],
    description: "Manage your settings.",
  },
  {
    id: "notes",
    path: "/notes",
    title: "My Notes",
    aliases: ["notes", "my notes", "study notes"],
    description: "Create and manage personal study notes.",
  },
] as const;

type AssistantResult = {
  reply: string;
  shouldNavigate: boolean;
  targetPageId: string | null;
  suggestions: string[];
};

function buildFallbackReply(message: string): AssistantResult {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("hello") ||
    lowerMessage.includes("hi") ||
    lowerMessage.includes("help")
  ) {
    return {
      reply:
        "I can help you move around CampusHub. You can ask me to open Dashboard, My Collection, My Notes, Share PDF, AI Summary, Deep Search, Simple Search, Videos, or Settings.",
      shouldNavigate: false,
      targetPageId: null,
      suggestions: ["Open My Notes", "Take me to Share PDF", "Go to Videos"],
    };
  }

  return {
    reply:
      "I can help you navigate CampusHub. Ask me to open a page like Dashboard, My Collection, My Notes, Share PDF, AI Summary, Videos, or Settings.",
    shouldNavigate: false,
    targetPageId: null,
    suggestions: ["Go to Dashboard", "Open My Collection", "Take me to Settings"],
  };
}

function parseAssistantResult(rawResponse: string): AssistantResult {
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  const jsonPayload = jsonMatch ? jsonMatch[0] : rawResponse;
  const parsed = JSON.parse(jsonPayload) as Partial<AssistantResult>;

  return {
    reply:
      typeof parsed.reply === "string" && parsed.reply.trim()
        ? parsed.reply.trim()
        : "I can help you navigate CampusHub.",
    shouldNavigate: Boolean(parsed.shouldNavigate),
    targetPageId:
      typeof parsed.targetPageId === "string" && parsed.targetPageId.trim()
        ? parsed.targetPageId.trim()
        : null,
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions
          .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
          .slice(0, 3)
      : [],
  };
}

StudentNavigationAIRouter.post("/", async (req: Request, res: Response) => {
  const { message, userName } = req.body as {
    message?: string;
    userName?: string;
  };

  if (!message || !message.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  if (!apiKey) {
    res.status(200).json(buildFallbackReply(message));
    return;
  }

  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are CampusHub's student navigation assistant.
Your job is to guide students to real pages that exist in the platform.
Only recommend pages from this list:
${JSON.stringify(AVAILABLE_PAGES)}

Respond in JSON only with keys:
"reply": string
"shouldNavigate": boolean
"targetPageId": string or null
"suggestions": array of short strings

Rules:
- If the student's request matches a real page, set shouldNavigate to true and targetPageId to that page id.
- If the student asks for a page that does not exist, set shouldNavigate to false, set targetPageId to null, and clearly say that page does not exist on CampusHub.
- Do not invent routes, pages, or features.
- Keep replies short, clear, and student-friendly.
- Suggestions must be practical follow-up prompts and at most 3 items.`,
        },
        {
          role: "user",
          content: `Student name: ${userName || "Student"}
Student message: ${message}`,
        },
      ],
    });

    const rawResponse = completion.choices[0]?.message?.content;

    if (!rawResponse) {
      res.status(200).json(buildFallbackReply(message));
      return;
    }

    const parsed = parseAssistantResult(rawResponse);
    const matchedPage = AVAILABLE_PAGES.find((page) => page.id === parsed.targetPageId);

    if (parsed.shouldNavigate && matchedPage) {
      res.status(200).json({
        ...parsed,
        targetPageId: matchedPage.id,
        path: matchedPage.path,
      });
      return;
    }

    if (parsed.shouldNavigate && !matchedPage) {
      res.status(200).json({
        reply:
          "That page does not exist on CampusHub right now. Try Dashboard, My Collection, My Notes, Share PDF, AI Summary, Videos, or Settings.",
        shouldNavigate: false,
        targetPageId: null,
        suggestions: ["Open My Notes", "Go to Dashboard", "Take me to Share PDF"],
      });
      return;
    }

    res.status(200).json({
      ...parsed,
      targetPageId: null,
    });
  } catch (error) {
    console.error("Student navigation AI failed:", error);
    res.status(200).json(buildFallbackReply(message));
  }
});

export { StudentNavigationAIRouter, AVAILABLE_PAGES };
