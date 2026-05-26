import { Request, Response } from "express";
import Assignment from "../models/Assignment";
import Result from "../models/Result";
import { assessmentQueue } from "./assignment.queue";
import path from "path";
import fs from "fs";
import multer from "multer";
import puppeteer from "puppeteer";

const uploadDir = path.join(__dirname, "../../../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

export const fileUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".pdf" && ext !== ".txt") {
      return cb(new Error("Only PDF and TXT files are supported."));
    }
    cb(null, true);
  },
});

export async function createAssignment(req: Request, res: Response) {
  try {
    const { title, dueDate, questionTypes, numberOfQuestions, totalMarks, instructions } = req.body;

    if (!title || !dueDate || !questionTypes || !numberOfQuestions || !totalMarks) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const numQuestions = parseInt(numberOfQuestions);
    const marks = parseInt(totalMarks);

    if (isNaN(numQuestions) || numQuestions <= 0) {
      return res.status(400).json({ error: "Number of questions must be a positive integer." });
    }
    if (isNaN(marks) || marks <= 0) {
      return res.status(400).json({ error: "Total marks must be a positive integer." });
    }

    let parsedTypes: string[];
    try {
      parsedTypes = JSON.parse(questionTypes);
      if (!Array.isArray(parsedTypes) || parsedTypes.length === 0) throw new Error();
    } catch {
      return res.status(400).json({ error: "QuestionTypes must be a non-empty JSON array." });
    }

    const uploadedFile = req.file ? req.file.path : null;

    const assignment = await Assignment.create({
      title,
      dueDate: new Date(dueDate),
      questionTypes: parsedTypes,
      numberOfQuestions: numQuestions,
      totalMarks: marks,
      instructions: instructions || null,
      uploadedFile,
      status: "queued",
    });

    await assessmentQueue.add("generate", { assignmentId: assignment._id.toString() });

    return res.status(201).json({
      assignmentId: assignment._id,
      status: assignment.status,
    });
  } catch (error: any) {
    console.error("[Controller] createAssignment failed:", error.message);
    return res.status(500).json({ error: "Failed to queue assignment." });
  }
}

export async function getAssignment(req: Request, res: Response) {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found." });
    return res.status(200).json(assignment);
  } catch (error: any) {
    console.error("[Controller] getAssignment failed:", error.message);
    return res.status(500).json({ error: "Failed to retrieve assignment." });
  }
}

export async function getAssignmentResult(req: Request, res: Response) {
  try {
    const result = await Result.findOne({ assignmentId: req.params.assignmentId });
    if (!result) return res.status(404).json({ error: "No generated results exist." });

    return res.status(200).json({
      id: result._id,
      assignmentId: result.assignmentId,
      sections: result.sections,
    });
  } catch (error: any) {
    console.error("[Controller] getAssignmentResult failed:", error.message);
    return res.status(500).json({ error: "Failed to load generated assessment questions." });
  }
}

function cleanOptionText(text: string): string {
  if (!text) return "";
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^[\(\[][a-dA-D][\)\]]\s*/i, "");
  cleaned = cleaned.replace(/^[a-dA-D][\.)\-:]\s*/i, "");
  return cleaned;
}

export async function getAssignmentResultPdf(req: Request, res: Response) {
  try {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    const result = await Result.findOne({ assignmentId });

    if (!assignment || !result) {
      return res.status(404).json({ error: "Results not found." });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
          body { font-family: 'Outfit', sans-serif; color: #303030; background: #fff; margin: 0; padding: 10px; }
          .header { text-align: center; margin-bottom: 25px; }
          .header h1 { font-weight: 800; margin: 0; font-size: 18px; }
          .header p { font-weight: 600; margin: 4px 0 0 0; font-size: 11px; color: #5E5E5E; }
          .meta-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; border-bottom: 1.5px solid #DADADA; padding-bottom: 8px; margin: 15px 0 20px; }
          .instructions { font-size: 11px; font-weight: 600; color: #5E5E5E; line-height: 1.5; margin-bottom: 25px; }
          .student-fields { margin-bottom: 30px; font-size: 11px; font-weight: 700; color: #5E5E5E; }
          .student-field { display: flex; align-items: center; margin-bottom: 8px; max-width: 450px; }
          .student-field span { flex-shrink: 0; }
          .student-field .line { flex-grow: 1; border-bottom: 1px solid #DADADA; margin-left: 6px; height: 14px; }
          .section { margin-bottom: 35px; page-break-inside: avoid; }
          .section-header { text-align: center; margin-bottom: 20px; }
          .section-header h2 { font-size: 13px; font-weight: 800; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
          .section-desc { text-align: left; margin-top: 12px; font-size: 11px; font-weight: 700; }
          .section-instruction { font-size: 10px; font-style: italic; color: #5E5E5E; margin-top: 2px; font-weight: 600; }
          .question-item { font-size: 11px; font-weight: 500; line-height: 1.6; margin-bottom: 16px; page-break-inside: avoid; }
          .question-text-row { display: flex; justify-content: space-between; align-items: flex-start; }
          .question-num { font-weight: 700; margin-right: 4px; }
          .question-diff { font-weight: 700; color: #5E5E5E; margin-right: 4px; }
          .question-marks { font-weight: 700; margin-left: 15px; white-space: nowrap; }
          .choices-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; padding-left: 18px; }
          .choice { font-size: 11px; font-weight: 500; color: #5E5E5E; }
          .choice-letter { font-weight: 700; color: #303030; margin-right: 4px; }
          .end-label { font-weight: 800; font-size: 11px; margin-top: 30px; margin-bottom: 20px; }
          .answer-key-section { margin-top: 30px; border-top: 1.5px solid #DADADA; padding-top: 20px; page-break-inside: avoid; }
          .answer-key-section h3 { font-size: 13px; font-weight: 800; margin: 0 0 15px 0; }
          .answer-item { display: flex; gap: 6px; font-size: 11px; font-weight: 500; color: #5E5E5E; margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Delhi Public School, Sector-4, Bokaro</h1>
          <p>Subject: ${assignment.title}</p>
          <p>Class: Grade 8th</p>
        </div>
        <div class="meta-row">
          <div>Time Allowed: 3 Hours</div>
          <div>Maximum Marks: ${assignment.totalMarks}</div>
        </div>
        <div class="instructions">${assignment.instructions || "All questions are compulsory unless stated otherwise."}</div>
        <div class="student-fields">
          <div class="student-field"><span>Name:</span><div class="line"></div></div>
          <div class="student-field"><span>Roll Number:</span><div class="line"></div></div>
          <div class="student-field"><span>Class: 8th Section:</span><div class="line"></div></div>
        </div>
        <div>
          ${result.sections.map((sec: any, sIdx: number) => `
            <div class="section">
              <div class="section-header">
                <h2>${sec.title || `Section ${String.fromCharCode(65 + sIdx)}`}</h2>
                <div class="section-desc">
                  <div>Short Answer Questions</div>
                  <div class="section-instruction">${sec.instruction || "Attempt all questions."}</div>
                </div>
              </div>
              <div>
                ${sec.questions.map((q: any, qIdx: number) => {
                  const opts = q.options && q.options.length > 0 ? q.options : null;
                  return `
                    <div class="question-item">
                      <div class="question-text-row">
                        <div style="flex-grow:1;">
                          <span class="question-num">${qIdx + 1}.</span>
                          <span class="question-diff">[${q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}]</span>
                          <span>${q.text}</span>
                        </div>
                        <span class="question-marks">[${q.marks} ${q.marks === 1 ? "Mark" : "Marks"}]</span>
                      </div>
                      ${q.type === "mcq" && opts ? `
                        <div class="choices-grid">
                          ${opts.map((opt: string, oIdx: number) => `
                            <div class="choice">
                              <span class="choice-letter">(${String.fromCharCode(65 + oIdx)})</span>
                              <span>${cleanOptionText(opt)}</span>
                            </div>
                          `).join("")}
                        </div>
                      ` : ""}
                    </div>`;
                }).join("")}
              </div>
            </div>
          `).join("")}
        </div>
        <div class="end-label">End of Question Paper</div>
        <div class="answer-key-section">
          <h3>Answer Key:</h3>
          <div>
            ${result.sections.flatMap((s: any) => s.questions).map((q: any, idx: number) => `
              <div class="answer-item">
                <span class="question-num">${idx + 1}.</span>
                <div style="flex-grow:1;">${q.answer || "N/A"}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </body>
      </html>`;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
      printBackground: true,
    });

    await browser.close();
    res.contentType("application/pdf");
    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error("[Controller] getAssignmentResultPdf failed:", error.message);
    return res.status(500).json({ error: `PDF generation failed: ${error.message}` });
  }
}

export async function listAssignments(_req: Request, res: Response) {
  try {
    const assignments = await Assignment.find().sort({ createdAt: -1 });
    return res.status(200).json(assignments);
  } catch (error: any) {
    console.error("[Controller] listAssignments failed:", error.message);
    return res.status(500).json({ error: "Failed to retrieve assignments." });
  }
}

export async function deleteAssignment(req: Request, res: Response) {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found." });

    if (assignment.uploadedFile && fs.existsSync(assignment.uploadedFile)) {
      try { fs.unlinkSync(assignment.uploadedFile); } catch {}
    }

    await Result.deleteOne({ assignmentId: assignment._id });
    await Assignment.findByIdAndDelete(req.params.id);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("[Controller] deleteAssignment failed:", error.message);
    return res.status(500).json({ error: "Failed to delete assignment." });
  }
}
