import mongoose, { Schema, Document, Types } from "mongoose";

export interface IQuestion {
  text: string;
  type: "mcq" | "short" | "long" | "numerical" | "diagram";
  options?: string[];
  answer?: string;
  difficulty: "easy" | "moderate" | "hard";
  marks: number;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    text: { type: String, required: true },
    type: {
      type: String,
      enum: ["mcq", "short", "long", "numerical", "diagram"],
      required: true,
    },
    options: { type: [String], default: undefined },
    answer: { type: String, default: "" },
    difficulty: {
      type: String,
      enum: ["easy", "moderate", "hard"],
      required: true,
    },
    marks: { type: Number, required: true },
  },
  { _id: true }
);

export interface ISection {
  title: string;
  instruction: string;
  questions: IQuestion[];
}

const SectionSchema = new Schema<ISection>(
  {
    title: { type: String, required: true },
    instruction: { type: String, required: true },
    questions: { type: [QuestionSchema], default: [] },
  },
  { _id: true }
);

export interface IResult extends Document {
  assignmentId: Types.ObjectId;
  sections: ISection[];
}

const ResultSchema = new Schema<IResult>(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      unique: true,
    },
    sections: { type: [SectionSchema], default: [] },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model<IResult>("Result", ResultSchema);
