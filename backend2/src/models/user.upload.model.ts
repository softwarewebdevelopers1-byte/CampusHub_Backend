import mongoose, { Model } from "mongoose";
// interface
interface UsersUploads {
  from: string;
  courseTitle: string;
  unitName: string;
  unitCode: string;
  pdfUrl: string;
}
interface VideoUploads {
  email: string;
  courseTitle: string;
  unitName: string;
  unitCode: string;
  videoUrl: string;
}
let videoUploadSchema = new mongoose.Schema<VideoUploads>({
  email: { type: String, required: true },
  courseTitle: { type: String, required: true },
  unitName: { type: String, required: true },
  unitCode: { type: String, required: true },
  videoUrl: { type: String, required: true },
});
let UserUploadSchema = new mongoose.Schema<UsersUploads>({
  from: String,
  courseTitle: String,
  unitName: String,
  unitCode: String,
  pdfUrl: String,
});
let UsersUploadedPdf =
  (mongoose.models.pdf as Model<UsersUploads>) ||
  mongoose.model<UsersUploads>("users_pdf", UserUploadSchema);
let UsersUploadVideos =
  (mongoose.models.videos as Model<VideoUploads>) ||
  mongoose.model<VideoUploads>("videos", videoUploadSchema);
export { UsersUploadedPdf, UsersUploadVideos };
