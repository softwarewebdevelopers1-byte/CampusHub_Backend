import { UsersUploadVideos } from "#models/user.upload.model";
import { Router, type Request, type Response } from "express";

export let VideosGetRoute = Router();
VideosGetRoute.post("/", async (req: Request, res: Response): Promise<void> => {
  if (!req.body) {
    res.status(400).json({ message: "Body id required" });
    return;
  }
  try {
    let { searchTerm } = req.body;
    let videoArray = await UsersUploadVideos.find({ courseTitle: searchTerm });
    res.status(200).json({ videos: videoArray });
  } catch (error) {
    console.log(`Error ${error} happened`);
  }
});
