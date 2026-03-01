import mongoose, { Model } from "mongoose";
// interface
interface UsersUploads {
  from: string;
  courseTitle: string;
  unitName: string;
  unitCode: string;
  pdfUrl: string;
}
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
export { UsersUploadedPdf };
