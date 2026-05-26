import mongoose, { Schema, Document } from "mongoose";

export interface IAssignment extends Document {
  title: string;
  dueDate: Date;
  instructions?: string;
  questionTypes: string[];
  numberOfQuestions: number;
  totalMarks: number;
  uploadedFile?: string;
  status: "queued" | "generating" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true },
    dueDate: { type: Date, required: true },
    instructions: { type: String, default: null },
    questionTypes: { type: [String], required: true },
    numberOfQuestions: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    uploadedFile: { type: String, default: null },
    status: {
      type: String,
      enum: ["queued", "generating", "completed", "failed"],
      default: "queued",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
      },
    },
  }
);

export default mongoose.model<IAssignment>("Assignment", AssignmentSchema);
