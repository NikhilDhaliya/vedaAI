import { Worker, Job } from "bullmq";
import { connection } from "./assignment.queue";
import Assignment from "../models/Assignment";
import Result from "../models/Result";
import { generateExamPaper, ExamPaperInput } from "./assignment.service";
import { parseUploadedFile } from "../utils/fileParser";
import { emitAssignmentStatus } from "../socket/socket";

export const assessmentWorker = new Worker(
  "AssessmentQueue",
  async (job: Job) => {
    const { assignmentId } = job.data;
    console.log(`[Worker] Started job ${job.id} for assignment ${assignmentId}`);

    try {
      const assignment = await Assignment.findById(assignmentId);
      if (!assignment) throw new Error(`Assignment ${assignmentId} not found`);

      assignment.status = "generating";
      await assignment.save();
      emitAssignmentStatus(assignmentId, "generating", { title: assignment.title });

      let sourceText = "";
      if (assignment.uploadedFile) {
        sourceText = await parseUploadedFile(assignment.uploadedFile);
      }

      const inputParams: ExamPaperInput = {
        title: assignment.title,
        dueDate: assignment.dueDate,
        questionTypes: assignment.questionTypes,
        numberOfQuestions: assignment.numberOfQuestions,
        totalMarks: assignment.totalMarks,
        instructions: assignment.instructions || undefined,
        sourceText: sourceText || undefined,
      };

      const generatedPaper = await generateExamPaper(inputParams);

      await Result.create({
        assignmentId: assignment._id,
        sections: generatedPaper.sections.map((sec) => ({
          title: sec.title,
          instruction: sec.instruction,
          questions: sec.questions.map((q) => ({
            text: q.text,
            type: q.type,
            options: q.options || undefined,
            answer: q.answer || "",
            difficulty: q.difficulty,
            marks: q.marks,
          })),
        })),
      });

      assignment.status = "completed";
      await assignment.save();
      emitAssignmentStatus(assignmentId, "completed");

      return { success: true };
    } catch (error: any) {
      console.error(`[Worker] Job ${job.id} failed:`, error.message);

      await Assignment.findByIdAndUpdate(assignmentId, { status: "failed" })
        .catch((e: any) => console.error("[Worker] Status update failed:", e.message));

      emitAssignmentStatus(assignmentId, "failed", { error: error.message });
      throw error;
    }
  },
  { connection, concurrency: 2 }
);

console.log("[BullMQ] AssessmentWorker initialized");

assessmentWorker.on("error", (err) => {
  console.error("[BullMQ Worker Error]:", err.message);
});

export default assessmentWorker;
