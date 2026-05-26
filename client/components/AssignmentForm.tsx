"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Upload, 
  Plus, 
  Minus, 
  Calendar, 
  FileText, 
  AlertCircle,
  X,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import { useAssignmentStore } from "../store/assignmentStore";
import io from "socket.io-client";

// Define strict validation rules using Zod
const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  dueDate: z.string().min(1, "Due date is required."),
  questionTypes: z.array(z.string()).min(1, "Select at least one question type."),
  numberOfQuestions: z.number().int().positive("Must be at least 1 question."),
  totalMarks: z.number().int().positive("Must be at least 1 mark."),
  instructions: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

const QUESTION_TYPE_OPTIONS = [
  { value: "mcq", label: "Multiple Choice Questions" },
  { value: "short", label: "Short Answer Questions" },
  { value: "long", label: "Long Answer Questions" },
  { value: "numerical", label: "Numerical Problems" },
  { value: "diagram", label: "Diagram / Graph Questions" }
];

interface AssignmentFormProps {
  onCancel?: () => void;
}

export default function AssignmentForm({ onCancel }: AssignmentFormProps) {
  const router = useRouter();
  const { setCurrentAssignment, setLoading, setError, setProgressMessage } = useAssignmentStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      dueDate: "",
      questionTypes: ["mcq"],
      numberOfQuestions: 10,
      totalMarks: 50,
      instructions: ""
    }
  });

  const questionTypes = watch("questionTypes");
  const numberOfQuestions = watch("numberOfQuestions");
  const totalMarks = watch("totalMarks");

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "pdf" && ext !== "txt") {
        alert("Only PDF and TXT files are allowed!");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "pdf" && ext !== "txt") {
        alert("Only PDF and TXT files are allowed!");
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  // Main Submit Handler
  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      setError(null);
      setProgressMessage("Initializing assignment details...");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      
      // Build FormData for multipart request
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("dueDate", data.dueDate);
      formData.append("questionTypes", JSON.stringify(data.questionTypes));
      formData.append("numberOfQuestions", data.numberOfQuestions.toString());
      formData.append("totalMarks", data.totalMarks.toString());
      if (data.instructions) {
        formData.append("instructions", data.instructions);
      }
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      console.log("[ClientForm] Submitting form data to express api...");
      const response = await fetch(`${apiUrl}/api/assignments`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errPayload = await response.json();
        throw new Error(errPayload.error || "Failed to create assignment job.");
      }

      const resData = await response.json();
      const assignmentId = resData.assignmentId;

      // Update local Zustand store
      setCurrentAssignment({
        id: assignmentId,
        title: data.title,
        dueDate: data.dueDate,
        instructions: data.instructions,
        questionTypes: data.questionTypes,
        numberOfQuestions: data.numberOfQuestions,
        totalMarks: data.totalMarks,
        status: "queued"
      });

      setProgressMessage("Queued in generator pipeline...");

      // Set up real-time WebSockets connection
      const socket = io(apiUrl);
      
      socket.on("connect", () => {
        console.log(`[SocketClient] Connected. Joining assignment room: ${assignmentId}`);
        socket.emit("join-assignment", assignmentId);
      });

      socket.on(`assignment:generating`, (payload) => {
        console.log("[SocketClient] Generating state received:", payload);
        setProgressMessage("Generating questions...");
      });

      socket.on(`assignment:completed`, (payload) => {
        console.log("[SocketClient] Generation complete!");
        setProgressMessage("Finished generation!");
        socket.disconnect();
        setLoading(false);
        // Use window.location for a full page navigation to guarantee redirect
        window.location.href = "/";
      });

      socket.on(`assignment:failed`, (payload) => {
        console.error("[SocketClient] Pipeline failed:", payload);
        setError(payload.error || "AI generation failed. Fallback to retry.");
        setLoading(false);
        socket.disconnect();
      });

    } catch (err: any) {
      console.error("[ClientForm] Submission error:", err.message);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-transparent w-full">
      
      {/* Figma Assignment Details Inner Card */}
      <div className="bg-[#F6F6F6] rounded-[24px] border border-[#DADADA]/60 p-6 space-y-6">
        <div className="border-b border-[#DADADA]/60 pb-4">
          <h3 className="text-base font-extrabold text-[#303030]">Assignment Details</h3>
          <p className="text-xs font-semibold text-[rgba(94,94,94,0.8)] mt-0.5">
            Basic information about your assignment
          </p>
        </div>

        {/* File Upload Dropzone */}
        <div>
          <label className="block text-xs font-bold text-[#303030] mb-2 uppercase tracking-wider">
            Assessment Source Material <span className="text-[rgba(94,94,94,0.55)] normal-case font-medium">(Optional)</span>
          </label>
          
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`bg-white border-2 border-dashed rounded-[16px] p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-250 ${
                isDragging 
                  ? "border-[#FF7950] bg-orange-50/20 text-[#FF7950]" 
                  : "border-[#DADADA] hover:border-[rgba(94,94,94,0.55)] text-[rgba(94,94,94,0.8)]"
              }`}
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-10 h-10 rounded-full bg-[#F6F6F6] flex items-center justify-center mb-2 text-[#303030]">
                <Upload size={18} />
              </div>
              <p className="font-bold text-[#303030] text-xs">
                Choose a file or drag & drop it here
              </p>
              <p className="text-[10px] text-[rgba(94,94,94,0.55)] font-semibold mt-0.5">
                JPEG, PNG, PDF or TXT up to 15MB
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#DADADA]/60 rounded-[16px] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF7950] flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#303030] truncate max-w-sm">{selectedFile.name}</p>
                  <p className="text-[10px] font-semibold text-[rgba(94,94,94,0.55)]">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[rgba(94,94,94,0.55)] hover:text-[#C0350A] hover:bg-rose-50 transition-all"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Title & Due Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-[#303030] mb-2 uppercase tracking-wider">
              Assignment Title / Topic
            </label>
            <input
              type="text"
              placeholder="e.g. Introduction to Quantum Physics"
              className="w-full bg-white px-5 py-3 rounded-full border border-[#DADADA] focus:outline-none focus:border-[#FF7950] font-semibold text-[#303030] placeholder:[rgba(94,94,94,0.55)] text-xs transition-all"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-[10px] text-[#C0350A] font-bold mt-1.5 flex items-center gap-1">
                <AlertCircle size={12} />
                <span>{errors.title.message}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#303030] mb-2 uppercase tracking-wider">
              Due Date
            </label>
            <div className="relative">
              <input
                type="date"
                className="w-full bg-white pl-11 pr-5 py-3 rounded-full border border-[#DADADA] focus:outline-none focus:border-[#FF7950] font-semibold text-[#303030] text-xs transition-all"
                {...register("dueDate")}
              />
              <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(94,94,94,0.8)] pointer-events-none" />
            </div>
            {errors.dueDate && (
              <p className="text-[10px] text-[#C0350A] font-bold mt-1.5 flex items-center gap-1">
                <AlertCircle size={12} />
                <span>{errors.dueDate.message}</span>
              </p>
            )}
          </div>
        </div>

        {/*Question Types Pill Selectors */}
        <div>
          <label className="block text-xs font-bold text-[#303030] mb-2.5 uppercase tracking-wider">
            Question Type <span className="text-[rgba(94,94,94,0.55)] normal-case font-medium">(Select multiple)</span>
          </label>
          
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPE_OPTIONS.map((opt) => {
              const isSelected = questionTypes.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`px-4 py-2 rounded-full border text-xs font-bold tracking-wide transition-all ${
                    isSelected
                      ? "bg-[#272727] border-[#272727] text-white"
                      : "bg-white border-[#DADADA] text-[#303030] hover:bg-slate-50"
                  }`}
                  onClick={() => {
                    if (isSelected) {
                      if (questionTypes.length > 1) {
                        setValue(
                          "questionTypes",
                          questionTypes.filter((t) => t !== opt.value)
                        );
                      }
                    } else {
                      setValue("questionTypes", [...questionTypes, opt.value]);
                    }
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    {opt.label}
                    {isSelected && <X size={12} strokeWidth={2.5} />}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.questionTypes && (
            <p className="text-[10px] text-[#C0350A] font-bold mt-2 flex items-center gap-1">
              <AlertCircle size={12} />
              <span>{errors.questionTypes.message}</span>
            </p>
          )}
        </div>

        {/* Number of Questions & Total Marks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Count Selector */}
          <div className="flex items-center justify-between p-4 border border-[#DADADA]/60 rounded-[16px] bg-white">
            <div>
              <p className="text-xs font-bold text-[#303030]">Total Questions</p>
              <p className="text-[10px] text-[rgba(94,94,94,0.55)] font-semibold mt-0.5">Amount generated in paper</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-[#DADADA] bg-white flex items-center justify-center hover:bg-slate-50 transition-all text-[#303030]"
                onClick={() => {
                  if (numberOfQuestions > 1) {
                    setValue("numberOfQuestions", numberOfQuestions - 1);
                  }
                }}
              >
                <Minus size={14} strokeWidth={2.5} />
              </button>
              <span className="bg-[#F6F6F6] border border-[#DADADA] text-[#303030] font-bold text-xs px-4 py-1.5 rounded-full min-w-[3rem] text-center">
                {numberOfQuestions}
              </span>
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-[#DADADA] bg-white flex items-center justify-center hover:bg-slate-50 transition-all text-[#303030]"
                onClick={() => setValue("numberOfQuestions", numberOfQuestions + 1)}
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Total Marks Selector */}
          <div className="flex items-center justify-between p-4 border border-[#DADADA]/60 rounded-[16px] bg-white">
            <div>
              <p className="text-xs font-bold text-[#303030]">Total Exam Marks</p>
              <p className="text-[10px] text-[rgba(94,94,94,0.55)] font-semibold mt-0.5">Marks sum of all questions</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-[#DADADA] bg-white flex items-center justify-center hover:bg-slate-50 transition-all text-[#303030]"
                onClick={() => {
                  if (totalMarks > 1) {
                    setValue("totalMarks", totalMarks - 1);
                  }
                }}
              >
                <Minus size={14} strokeWidth={2.5} />
              </button>
              <span className="bg-[#F6F6F6] border border-[#DADADA] text-[#303030] font-bold text-xs px-4 py-1.5 rounded-full min-w-[3rem] text-center">
                {totalMarks}
              </span>
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-[#DADADA] bg-white flex items-center justify-center hover:bg-slate-50 transition-all text-[#303030]"
                onClick={() => setValue("totalMarks", totalMarks + 1)}
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Additional Instructions */}
        <div>
          <label className="block text-xs font-bold text-[#303030] mb-2 uppercase tracking-wider">
            Instructions / Topic Guidelines
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Focus questions on thermodynamics, include easy numerical questions, omit diagram queries."
            className="w-full bg-white px-4 py-3 rounded-[16px] border border-[#DADADA] focus:outline-none focus:border-[#FF7950] font-semibold text-[#303030] placeholder:[rgba(94,94,94,0.55)] text-xs transition-all resize-none"
            {...register("instructions")}
          />
        </div>
      </div>

      {/* Form Submission Trigger Buttons (Cancel / Generate) */}
      <div className="flex justify-between items-center pt-2 gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="bg-white text-[#303030] border border-[#DADADA] hover:bg-slate-50 font-bold text-xs sm:text-sm px-4 sm:px-6 py-2.5 sm:py-3 rounded-full flex items-center gap-1.5 sm:gap-2 transition-all duration-200 shrink-0"
        >
          <ArrowLeft size={14} strokeWidth={2.5} />
          <span>Cancel</span>
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#272727] hover:bg-[#1E1E1E] text-white font-bold text-xs sm:text-sm px-4 sm:px-6 py-2.5 sm:py-3 rounded-full flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-black/10 hover:shadow-black/20 transition-all duration-200 disabled:bg-slate-400 whitespace-nowrap"
        >
          <span>{isSubmitting ? "Queueing..." : "Generate Assessment"}</span>
          <ArrowRight size={14} strokeWidth={2.5} />
        </button>
      </div>

    </form>
  );
}

