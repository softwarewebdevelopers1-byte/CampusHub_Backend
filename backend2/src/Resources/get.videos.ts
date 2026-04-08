import { UsersUploadVideos } from "#models/user.upload.model";
import { Router, type Request, type Response } from "express";

export let VideosGetRoute = Router();

VideosGetRoute.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawSearchTerm =
      typeof req.body?.searchTerm === "string" ? req.body.searchTerm.trim() : "";

    if (!rawSearchTerm) {
      const videos = await UsersUploadVideos.find({}).sort({ _id: -1 }).limit(8);

      res.status(200).json({
        count: videos.length,
        videos,
        mode: "latest",
      });
      return;
    }

    const searchWords = rawSearchTerm.split(/\s+/).filter(Boolean);
    const searchableFields = ["unitName", "courseTitle", "unitCode", "email"];
    const query = {
      $or: searchWords.flatMap((word: string) =>
        searchableFields.map((field) => ({
          [field]: { $regex: word, $options: "i" },
        })),
      ),
    };

    const videos = await UsersUploadVideos.find(query).sort({ _id: -1 }).limit(8);

    res.status(200).json({
      count: videos.length,
      videos,
      mode: "search",
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
