import { Worker, Job } from "bullmq";
import { connection } from "./assignment.queue";
import prisma from "../config/prisma";
import { generateExamPaper, ExamPaperInput } from "./assignment.service";
import { parseUploadedFile } from "../utils/fileParser";
import { emitAssignmentStatus } from "../socket/socket";

export const assessmentWorker = new Worker(
  "AssessmentQueue",
  async (job: Job) => {
    const { assignmentId } = job.data;
    console.log(`[Worker] Started job ${job.id} for assignment ${assignmentId}`);

    try {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId }
      });

      if (!assignment) {
        throw new Error(`Assignment with ID ${assignmentId} not found.`);
      }

      await prisma.assignment.update({
        where: { id: assignmentId },
        data: { status: "generating" }
      });
      emitAssignmentStatus(assignmentId, "generating", { title: assignment.title });

      let sourceText = "";
      if (assignment.uploadedFile) {
        sourceText = await parseUploadedFile(assignment.uploadedFile);
      }

      const inputParams: ExamPaperInput = {
        title: assignment.title,
        dueDate: assignment.dueDate,
        questionTypes: JSON.parse(assignment.questionTypes),
        numberOfQuestions: assignment.numberOfQuestions,
        totalMarks: assignment.totalMarks,
        instructions: assignment.instructions || undefined,
        sourceText: sourceText || undefined
      };

      const generatedPaper = await generateExamPaper(inputParams);

      await prisma.$transaction(async (tx: any) => {
        const resultDoc = await tx.result.create({
          data: { assignmentId: assignment.id }
        });

        for (const generatedSec of generatedPaper.sections) {
          const sectionDoc = await tx.section.create({
            data: {
              resultId: resultDoc.id,
              title: generatedSec.title,
              instruction: generatedSec.instruction,
            }
          });

          for (const q of generatedSec.questions) {
            await tx.question.create({
              data: {
                sectionId: sectionDoc.id,
                text: q.text,
                type: q.type,
                options: q.options ? JSON.stringify(q.options) : null,
                answer: q.answer || "",
                difficulty: q.difficulty,
                marks: q.marks,
              }
            });
          }
        }
      });

      await prisma.assignment.update({
        where: { id: assignmentId },
        data: { status: "completed" }
      });
      
      emitAssignmentStatus(assignmentId, "completed");
      return { success: true };
    } catch (error: any) {
      console.error(`[Worker] Job ${job.id} failed:`, error.message);
      
      await prisma.assignment.update({
        where: { id: assignmentId },
        data: { status: "failed" }
      }).catch((dbErr: any) => console.error("[Worker] DB update failed:", dbErr.message));

      emitAssignmentStatus(assignmentId, "failed", { error: error.message });
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

console.log("[BullMQ] AssessmentWorker initialized");
export default assessmentWorker;
