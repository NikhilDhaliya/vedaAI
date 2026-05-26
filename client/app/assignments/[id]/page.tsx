"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "../../../components/Sidebar";
import ExamPaper from "../../../components/ExamPaper";
import { useAssignmentStore } from "../../../store/assignmentStore";
import { Loader2 } from "lucide-react";

export default function AssignmentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  
  const { setCurrentAssignment, setCurrentResult } = useAssignmentStore();
  const [localLoading, setLocalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignmentsCount, setAssignmentsCount] = useState(0);

  useEffect(() => {
    if (!id) return;

    const fetchResult = async () => {
      try {
        setLocalLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        
        const assignRes = await fetch(`${apiUrl}/api/assignments`);
        if (!assignRes.ok) throw new Error("Failed to load assessments list");
        const list = await assignRes.json();
        setAssignmentsCount(list.length);
        
        const assignment = list.find((a: any) => a.id === id);
        
        if (!assignment) {
          setError("Assessment not found in database.");
          return;
        }

        // 2. Fetch compiler result
        const resultRes = await fetch(`${apiUrl}/api/results/${id}`);
        if (!resultRes.ok) {
          setError("No generated results exist for this assignment yet. It may still be compiling.");
          return;
        }
        
        const resultData = await resultRes.json();
        setCurrentAssignment(assignment);
        setCurrentResult(resultData);
      } catch (err: any) {
        console.error("Failed to load assessment view:", err.message);
        setError("Error loading assessment. Please check backend connection.");
      } finally {
        setLocalLoading(false);
      }
    };

    fetchResult();
  }, [id, setCurrentAssignment, setCurrentResult]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#EEEEEE] to-[#DADADA] flex flex-col lg:flex-row font-sans antialiased text-[#303030] p-4 gap-4">
      <Sidebar 
        currentView="result" 
        setView={(view) => {
          if (view === "dashboard" || view === "create") {
            router.push("/");
          }
        }} 
        assignmentsCount={assignmentsCount}
      />

      <section className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 bg-white/50 backdrop-blur-md rounded-[32px] border border-[#DADADA]/60 p-8 shadow-[0px_16px_48px_rgba(0,0,0,0.02)] flex flex-col overflow-y-auto justify-center">
          {localLoading ? (
            <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto my-auto py-12">
              <div className="relative w-16 h-16 flex items-center justify-center mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-orange-100 animate-ping opacity-60"></div>
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shadow-inner">
                  <Loader2 className="animate-spin h-5 w-5 text-[#FF7950]" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-[#303030]">Loading Assessment Paper</h3>
              <p className="text-[10px] font-bold text-[rgba(94,94,94,0.55)] uppercase tracking-wider mt-1">Retrieving database record...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto">
              <h2 className="text-xl font-extrabold text-[#303030] mb-2">Notice</h2>
              <p className="text-xs font-semibold text-[rgba(94,94,94,0.8)] leading-relaxed mb-6">{error}</p>
              <button
                onClick={() => router.push("/")}
                className="bg-[#272727] hover:bg-[#1E1E1E] text-white font-bold text-xs py-3 px-6 rounded-full transition-all"
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <ExamPaper onBack={() => {
              router.push("/");
            }} />
          )}
        </div>
      </section>
    </main>
  );
}
