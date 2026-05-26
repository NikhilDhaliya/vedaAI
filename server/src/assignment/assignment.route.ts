import { Router } from "express";
import { 
  createAssignment, 
  getAssignment, 
  getAssignmentResult, 
  getAssignmentResultPdf,
  listAssignments,
  deleteAssignment,
  fileUpload 
} from "./assignment.controller";

const router = Router();

router.post("/assignments", fileUpload.single("file"), createAssignment);
router.get("/assignments", listAssignments);
router.get("/assignments/:id", getAssignment);
router.delete("/assignments/:id", deleteAssignment);
router.get("/results/:assignmentId", getAssignmentResult);
router.get("/results/:assignmentId/pdf", getAssignmentResultPdf);

export default router;
