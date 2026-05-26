import { create } from "zustand";

export interface Question {
  id: string;
  text: string;
  type: "mcq" | "short" | "long" | "numerical" | "diagram";
  options?: string[];
  answer?: string;
  difficulty: "easy" | "moderate" | "hard";
  marks: number;
}

export interface Section {
  id: string;
  title: string;
  instruction: string;
  questions: Question[];
}

export interface Result {
  id: string;
  assignmentId: string;
  sections: Section[];
}

export interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  instructions?: string;
  questionTypes: string[];
  numberOfQuestions: number;
  totalMarks: number;
  status: "queued" | "generating" | "completed" | "failed";
}

interface AssignmentState {
  currentAssignment: Assignment | null;
  currentResult: Result | null;
  loading: boolean;
  error: string | null;
  progressMessage: string;
  setCurrentAssignment: (assignment: Assignment | null) => void;
  setCurrentResult: (result: Result | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setProgressMessage: (message: string) => void;
  reset: () => void;
}

export const useAssignmentStore = create<AssignmentState>((set) => ({
  currentAssignment: null,
  currentResult: null,
  loading: false,
  error: null,
  progressMessage: "",
  setCurrentAssignment: (assignment) => set({ currentAssignment: assignment }),
  setCurrentResult: (result) => set({ currentResult: result }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setProgressMessage: (message) => set({ progressMessage: message }),
  reset: () => set({ 
    currentAssignment: null, 
    currentResult: null, 
    loading: false, 
    error: null, 
    progressMessage: "" 
  }),
}));
