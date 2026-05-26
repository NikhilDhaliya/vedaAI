"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import AssignmentForm from "../components/AssignmentForm";
import LoadingScreen from "../components/LoadingScreen";
import { useAssignmentStore } from "../store/assignmentStore";
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Search, 
  SlidersHorizontal, 
  Eye,
  Loader2,
  AlertTriangle
} from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const { loading, setLoading, setCurrentAssignment, setCurrentResult } = useAssignmentStore();
  const [view, setView] = useState<"dashboard" | "create">("dashboard");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const fetchAssignments = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/assignments`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (err) {
      console.error("Failed to load assignments from backend SQLite database:", err);
    }
  };

  // Poll for generating assignments in real-time
  useEffect(() => {
    fetchAssignments();
    
    const interval = setInterval(() => {
      // If there's any assignment still processing, keep polling for updates
      const hasProcessing = assignments.some(
        (a) => a.status === "queued" || a.status === "generating"
      );
      if (hasProcessing || view === "dashboard") {
        fetchAssignments();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [view, assignments.length]);

  const handleViewResult = (assignment: any) => {
    router.push(`/assignments/${assignment.id}`);
  };

  const handleDeleteClick = (assignment: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({ id: assignment.id, title: assignment.title });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/assignments/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAssignments();
      } else {
        alert("Failed to delete assignment.");
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#EEEEEE] to-[#DADADA] flex flex-col lg:flex-row font-sans antialiased text-[#303030] p-4 gap-4">
      {/* Loading Overlay */}
      {loading && <LoadingScreen />}

      {/* Premium White Sidebar */}
      <Sidebar currentView={view === "create" ? "create" : "dashboard"} setView={(v: any) => setView(v)} assignmentsCount={assignments.length} />

      {/* Main Content Area */}
      <section className="flex-1 flex flex-col min-w-0">
        
        {/* Right Floating Translucent container */}
        <div className="flex-1 bg-white/50 backdrop-blur-md rounded-[32px] border border-[#DADADA]/60 p-8 shadow-[0px_16px_48px_rgba(0,0,0,0.02)] flex flex-col overflow-y-auto">
          
          {view === "dashboard" && (
            <div className="flex-1 flex flex-col h-full">
              
              {/* Header Title Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-extrabold text-[#303030] tracking-tight">Assignments</h2>
                  <p className="text-[rgba(94,94,94,0.8)] font-semibold text-xs mt-1">
                    Manage and create assessments for your classes.
                  </p>
                </div>

                {assignments.length > 0 && (
                  <button
                    onClick={() => setView("create")}
                    className="bg-[#272727] hover:bg-[#1E1E1E] text-white font-bold text-xs flex items-center justify-center gap-2 py-3 px-5 rounded-full shadow-md shadow-black/10 hover:shadow-black/20 transition-all duration-200"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Create Assignment</span>
                  </button>
                )}
              </div>

              {/* SEARCH & FILTERS ROW (Figma style) */}
              {assignments.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-3 rounded-[20px] border border-[#DADADA]/60">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(94,94,94,0.55)]" size={16} />
                    <input
                      type="text"
                      placeholder="Search Assignment"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-[#DADADA] rounded-full text-xs font-bold text-[#303030] placeholder-[rgba(94,94,94,0.55)] focus:outline-none focus:ring-1 focus:ring-[#FF7950]"
                    />
                  </div>

                  <button className="flex items-center gap-2 px-4 py-2 border border-[#DADADA] rounded-full text-xs font-bold text-[#303030] bg-[#F6F6F6] hover:bg-[#EAEAEA] transition-all">
                    <SlidersHorizontal size={14} strokeWidth={2.5} />
                    <span>Filter By</span>
                  </button>
                </div>
              )}

              {/* EMPTY STATE */}
              {assignments.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-auto animate-fade-in py-12">
                  <div className="w-56 h-56 mb-8 text-[#FF7950] opacity-90 select-none">
                    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                      <rect x="40" y="30" width="120" height="140" rx="20" fill="white" stroke="#DADADA" strokeWidth="4" />
                      <path d="M70 70H130" stroke="#FF7950" strokeWidth="4" strokeLinecap="round" />
                      <path d="M70 100H110" stroke="#FF7950" strokeWidth="4" strokeLinecap="round" />
                      <path d="M70 130H100" stroke="#FF7950" strokeWidth="4" strokeLinecap="round" />
                      <circle cx="140" cy="130" r="25" fill="#272727" />
                      <path d="M133 130H147" stroke="white" strokeWidth="3" strokeLinecap="round" />
                      <path d="M140 123V137" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>

                  <h2 className="text-xl font-extrabold text-[#303030] tracking-tight mb-3">
                    No assignments yet
                  </h2>
                  <p className="text-xs font-semibold text-[rgba(94,94,94,0.8)] leading-relaxed mb-6 max-w-md">
                    Create your first assignment to start collecting and grading student submissions. 
                    You can set up rubrics, define marking criteria, and let AI assist with grading.
                  </p>

                  <button
                    onClick={() => setView("create")}
                    className="bg-[#272727] hover:bg-[#1E1E1E] text-white font-semibold text-xs flex items-center justify-center gap-2 py-3 px-6 rounded-full shadow-lg shadow-black/10 hover:shadow-black/20 transition-all duration-200"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    <span>Create Your First Assignment</span>
                  </button>
                </div>
              ) : (
                /* GRID CARDS LIST (Figma Filled State) */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in pb-12">
                  {filteredAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      onClick={() => assignment.status === "completed" && handleViewResult(assignment)}
                      className={`bg-white border border-[#DADADA]/60 rounded-[24px] p-6 shadow-[0px_4px_24px_rgba(0,0,0,0.01)] hover:shadow-[0px_8px_32px_rgba(0,0,0,0.04)] flex flex-col justify-between min-h-[220px] transition-all duration-300 relative group select-none ${
                        assignment.status === "completed" ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      {/* Top Row: Title & Action */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-4">
                          <h3 className="font-extrabold text-sm text-[#303030] leading-snug line-clamp-2">
                            {assignment.title}
                          </h3>
                          <button
                            onClick={(e) => handleDeleteClick(assignment, e)}
                            className="text-[rgba(94,94,94,0.55)] hover:text-[#C0350A] p-1.5 rounded-full hover:bg-rose-50 transition-all duration-200"
                            title="Delete Assignment"
                          >
                            <Trash2 size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>

                      {/* Middle: Queue/AI Status and Dates */}
                      <div className="space-y-3 my-4">
                        <div className="flex flex-col gap-1 font-semibold text-[10px] text-[rgba(94,94,94,0.8)]">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-[rgba(94,94,94,0.55)]" />
                            <span>Assigned: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-[rgba(94,94,94,0.55)]" />
                            <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-2">
                          {assignment.status === "queued" && (
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-bold border border-blue-100 bg-blue-50 text-blue-700 flex items-center gap-1">
                              <Loader2 size={10} className="animate-spin" />
                              <span>Queued</span>
                            </span>
                          )}
                          {assignment.status === "generating" && (
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-bold border border-orange-100 bg-orange-50 text-[#FF7950] flex items-center gap-1 animate-pulse">
                              <Loader2 size={10} className="animate-spin" />
                              <span>AI Compiling...</span>
                            </span>
                          )}
                          {assignment.status === "completed" && (
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-bold border border-emerald-100 bg-emerald-50 text-emerald-700">
                              Ready
                            </span>
                          )}
                          {assignment.status === "failed" && (
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-bold border border-rose-100 bg-rose-50 text-[#C0350A] flex items-center gap-1">
                              <AlertTriangle size={10} />
                              <span>Compilation Failed</span>
                            </span>
                          )}
                          <span className="px-2.5 py-1 rounded-full text-[9px] font-bold border border-[#DADADA] bg-[#F6F6F6] text-[#303030]">
                            {assignment.totalMarks} Marks
                          </span>
                        </div>
                      </div>

                      {/* Bottom action button */}
                      <div className="pt-2 border-t border-[#DADADA]/40 flex justify-between items-center">
                        {assignment.status === "completed" ? (
                          <button
                            onClick={() => handleViewResult(assignment)}
                            className="text-xs font-extrabold text-[#303030] hover:text-[#FF7950] flex items-center gap-1.5 transition-colors"
                          >
                            <Eye size={14} strokeWidth={2.5} />
                            <span>View Assessment</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-[rgba(94,94,94,0.55)]">
                            Waiting for AI compile...
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-[rgba(94,94,94,0.55)]">
                          {assignment.numberOfQuestions} Qs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "create" && (
            <div className="flex-grow flex flex-col animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-extrabold text-[#303030] tracking-tight">Create Assignment</h2>
                <p className="text-[rgba(94,94,94,0.8)] font-semibold text-sm mt-1">
                  Set up a new assignment for your students
                </p>
              </div>
              <AssignmentForm onCancel={() => setView("dashboard")} />
            </div>
          )}

        </div>
      </section>
      {/* Custom Deletion Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 print:hidden animate-fade-in">
          <div 
            className="bg-white border border-[#DADADA]/60 rounded-[32px] w-full max-w-md p-8 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-5 border border-rose-100 shadow-sm animate-pulse">
              <AlertTriangle size={24} strokeWidth={2.5} />
            </div>
            
            <h3 className="text-lg font-black text-[#303030] tracking-tight">Delete Assessment</h3>
            <p className="text-xs font-semibold text-[rgba(94,94,94,0.8)] leading-relaxed mt-2 px-2">
              Are you sure you want to delete <span className="font-extrabold text-[#303030]">"{deleteTarget.title}"</span>? All generated sections, question banks, and answer keys will be permanently erased.
            </p>
            
            <div className="flex items-center gap-3 w-full mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-white hover:bg-slate-50 border border-[#DADADA] text-[#303030] font-bold text-xs py-3.5 px-6 rounded-full transition-all shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-3.5 px-6 rounded-full transition-all shadow-md shadow-rose-500/10 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


