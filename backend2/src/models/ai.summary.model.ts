import mongoose, { Model } from "mongoose";

interface StudentAISummary {
  studentEmail: string;
  fileName: string;
  summaryText: string;
  truncated: boolean;
  extractedCharacters: number;
  summarizedCharacters: number;
}

const StudentAISummarySchema = new mongoose.Schema<StudentAISummary>(
  {
    studentEmail: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    summaryText: { type: String, required: true },
    truncated: { type: Boolean, default: false },
    extractedCharacters: { type: Number, default: 0 },
    summarizedCharacters: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const StudentAISummaryModel =
  (mongoose.models.student_ai_summaries as Model<StudentAISummary>) ||
  mongoose.model<StudentAISummary>(
    "student_ai_summaries",
    StudentAISummarySchema,
  );

export { StudentAISummaryModel };
