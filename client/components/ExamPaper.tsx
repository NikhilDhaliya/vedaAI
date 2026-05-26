"use client";

import React, { useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAssignmentStore } from "../store/assignmentStore";
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Download,
  Printer
} from "lucide-react";

function cleanOptionText(text: string): string {
  if (!text) return "";
  let cleaned = text.trim();
  // Strip surrounding parentheses or brackets if they envelope the letter, like (A) or [A]
  cleaned = cleaned.replace(/^[\(\[][a-dA-D][\)\]]\s*/i, "");
  // Strip standalone letter prefixes followed by dot, parenthesis, dash, or colon, like A. or A) or A-
  cleaned = cleaned.replace(/^[a-dA-D][\.\)\-\:]\s*/i, "");
  return cleaned;
}

interface ExamPaperProps {
  onBack?: () => void;
}

export default function ExamPaper({ onBack }: ExamPaperProps) {
  const { currentAssignment, currentResult, reset } = useAssignmentStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [showAnswers, setShowAnswers] = useState(() => searchParams.get("answers") === "true");
  const [isExporting, setIsExporting] = useState(false);

  // Sync show/hide answers state to URL so it survives refresh
  const toggleAnswers = useCallback(() => {
    const newVal = !showAnswers;
    setShowAnswers(newVal);
    const params = new URLSearchParams(searchParams.toString());
    if (newVal) {
      params.set("answers", "true");
    } else {
      params.delete("answers");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [showAnswers, searchParams, router, pathname]);

  if (!currentResult || !currentAssignment) return null;

  // Render difficulty badge styled colors
  const renderDifficultyBadge = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 uppercase tracking-wide">
            Easy
          </span>
        );
      case "hard":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-rose-200 bg-rose-50 text-rose-700 uppercase tracking-wide">
            Hard
          </span>
        );
      case "moderate":
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 bg-amber-50 text-amber-700 uppercase tracking-wide">
            Moderate
          </span>
        );
    }
  };

  // Trigger backend Puppeteer PDF Export
  const triggerPdfExport = async () => {
    try {
      setIsExporting(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      
      console.log(`[ExamPaper] Dispatching request for PDF export...`);
      const response = await fetch(`${apiUrl}/api/results/${currentAssignment.id}/pdf`, {
        method: "GET"
      });

      if (!response.ok) {
        throw new Error("Failed to compile PDF on the server.");
      }

      // Convert stream response to downloadable file blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentAssignment.title.replace(/\s+/g, "_")}_Exam_Paper.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("[ExamPaper] PDF export failed, falling back to print dialog:", err.message);
      // Fallback: trigger standard browser printing directly!
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handleBack = () => {
    reset();
    if (onBack) {
      onBack();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-12 w-full font-sans text-[#303030] px-2 sm:px-0">
      
      {/* Top Minimalist Action Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-2 print:hidden select-none">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-[rgba(94,94,94,0.8)] hover:text-[#303030] text-xs font-bold transition-all"
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          <span>Back to Creator</span>
        </button>

        <button
          onClick={toggleAnswers}
          className="bg-white hover:bg-slate-50 px-4 py-2 border border-[#DADADA] rounded-full text-xs font-bold flex items-center gap-2 transition-all text-[#303030] shadow-sm"
        >
          {showAnswers ? <EyeOff size={14} strokeWidth={2.5} /> : <Eye size={14} strokeWidth={2.5} />}
          <span>{showAnswers ? "Hide Answers" : "Show Answer Key"}</span>
        </button>
      </div>

      {/* Premium Translucent Dark Greetings Card (Figma Style) */}
      <div className="bg-[#181818] text-white p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] shadow-lg flex flex-col gap-4 sm:gap-6 print:hidden select-none">
        <h2 className="text-sm sm:text-base md:text-xl font-bold font-sans tracking-tight leading-relaxed max-w-2xl">
          Certainly, Lakshya! Here are customized Question Paper for your CBSE Grade 8 Science classes on the NCERT chapters:
        </h2>

        {/* Download Action Capsule directly beneath the text */}
        <button
          onClick={triggerPdfExport}
          disabled={isExporting}
          className="bg-white hover:bg-slate-100 text-[#181818] font-extrabold text-[10px] sm:text-xs flex items-center justify-center gap-2 py-2.5 sm:py-3 px-5 sm:px-6 rounded-full transition-all duration-200 shadow-md self-start shrink-0"
        >
          {isExporting ? (
            <>
              <span className="w-3 h-3 border-2 border-[#181818] border-t-transparent rounded-full animate-spin"></span>
              <span>Compiling PDF...</span>
            </>
          ) : (
            <>
              <Download size={14} strokeWidth={2.5} />
              <span>Download as PDF</span>
            </>
          )}
        </button>
      </div>

      {/* Main Print Container: Formatted exactly like an exam sheet */}
      <article className="bg-white p-6 sm:p-10 md:p-16 rounded-[24px] sm:rounded-[32px] border border-[#DADADA]/60 shadow-[0px_8px_32px_rgba(0,0,0,0.01)] print:shadow-none print:border-none print:p-0 transition-all select-none">
        
        {/* Academic Credentials Centered Header */}
        <div className="text-center space-y-1 mb-6 sm:mb-8">
          <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-[#303030]">Delhi Public School, Sector-4, Bokaro</h1>
          <p className="text-xs font-bold text-[rgba(94,94,94,0.8)]">Subject: {currentAssignment.title}</p>
          <p className="text-xs font-bold text-[rgba(94,94,94,0.8)]">Class: Grade 8th</p>
        </div>

        {/* Time and Marks Row */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center text-xs font-extrabold text-[#303030] mt-6 mb-4 gap-1.5 md:gap-0">
          <span>Time Allowed: 3 Hours</span>
          <span>Maximum Marks: {currentAssignment.totalMarks}</span>
        </div>

        {/* General Instructions Note */}
        <div className="text-xs font-semibold text-[rgba(94,94,94,0.8)] mb-6 sm:mb-8 leading-relaxed">
          {currentAssignment.instructions || "All questions are compulsory unless stated otherwise."}
        </div>

        {/* Student Identification Underline Fields */}
        <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10 text-xs font-bold text-[#303030]">
          <div className="flex items-center gap-2 max-w-lg w-full">
            <span className="shrink-0">Name:</span>
            <div className="flex-1 border-b border-[#303030]/60 h-4"></div>
          </div>
          <div className="flex items-center gap-2 max-w-lg w-full">
            <span className="shrink-0">Roll Number:</span>
            <div className="flex-1 border-b border-[#303030]/60 h-4"></div>
          </div>
          <div className="flex items-center gap-2 max-w-lg w-full">
            <span className="shrink-0">Class: 8th Section:</span>
            <div className="flex-1 border-b border-[#303030]/60 h-4"></div>
          </div>
        </div>

        {/* Dynamic Sections and Questions */}
        <div className="space-y-12">
          {currentResult.sections.map((section, sIndex) => (
            <section key={section.id} className="space-y-6">
              
              {/* Centered Section Title */}
              <div className="text-center space-y-1 mb-6">
                <h2 className="text-sm font-extrabold text-[#303030] uppercase tracking-wide">
                  {section.title || `Section ${String.fromCharCode(65 + sIndex)}`}
                </h2>
                <div className="text-left font-bold mt-4 space-y-0.5">
                  <p className="text-xs text-[#303030]">Short Answer Questions</p>
                  <p className="text-[11px] text-[rgba(94,94,94,0.8)] italic">
                    {section.instruction || "Attempt all questions. Each question carries marks as indicated."}
                  </p>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {section.questions.map((question, qIndex) => (
                  <div key={question.id} className="text-xs text-[#303030] font-semibold leading-relaxed">
                    
                    {/* Inline Difficulty and Question Text */}
                    <div className="flex justify-between items-start gap-4">
                      <p className="flex-1">
                        <span className="font-extrabold mr-1.5">{qIndex + 1}.</span>
                        <span className="font-extrabold mr-1.5">[{question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1).toLowerCase()}]</span>
                        <span>{question.text}</span>
                      </p>
                      <span className="font-extrabold shrink-0 whitespace-nowrap">
                        [{question.marks} {question.marks === 1 ? "Mark" : "Marks"}]
                      </span>
                    </div>

                    {/* Rendering MCQ choices in clean list */}
                    {question.type === "mcq" && question.options && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6 mt-2 text-[rgba(94,94,94,0.8)]">
                        {question.options.map((option, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-1.5">
                            <span className="font-extrabold text-[#303030]">({String.fromCharCode(65 + oIdx)})</span>
                            <span>{cleanOptionText(option)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </section>
          ))}
        </div>

        {/* End of Question Paper Line */}
        <div className="font-extrabold text-xs text-[#303030] mt-10 mb-6">
          End of Question Paper
        </div>

        {/* Dynamic Answer Key Booklet Section at the bottom */}
        {showAnswers && (
          <div className="mt-8 pt-8 border-t border-[#DADADA]/60 space-y-6">
            <h3 className="text-sm font-extrabold text-[#303030] tracking-wide">
              Answer Key:
            </h3>
            <div className="space-y-4 text-xs font-semibold text-[#303030] leading-relaxed">
              {currentResult.sections
                .flatMap((section) => section.questions)
                .map((question, idx) => (
                  <div key={question.id} className="flex gap-2">
                    <span className="font-extrabold shrink-0">{idx + 1}.</span>
                    <p className="flex-1">{question.answer || "Answer key not saved."}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </article>

    </div>
  );
}

