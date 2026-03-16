import { UsersUploadVideos } from "#models/user.upload.model";
import { Router, type Request, type Response } from "express";

export let VideosGetRoute = Router();

VideosGetRoute.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    let { searchTerm } = req.body;

    if (!searchTerm || searchTerm.trim() === "") {
      res.status(400).json({ message: "Search term is required" });
      return;
    }
    searchTerm = searchTerm.split(" ");
    const unitNameRegexArray = searchTerm.map((word: string) => ({
      unitName: { $regex: word, $options: "i" },
    }));
    const query = {
      $or: unitNameRegexArray,
    };

    const videos = await UsersUploadVideos.find(query).limit(5);

    res.status(200).json({
      count: videos.length,
      videos,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
