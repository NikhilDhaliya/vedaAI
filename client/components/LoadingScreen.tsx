"use client";

import React from "react";
import { useAssignmentStore } from "../store/assignmentStore";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

export default function LoadingScreen() {
  const { progressMessage, error, reset } = useAssignmentStore();

  return (
    <div className="fixed inset-0 z-50 bg-[#272727]/30 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300">
      <div className="bg-white rounded-[24px] border border-[#DADADA]/60 p-8 max-w-sm w-full shadow-[0px_16px_48px_rgba(0,0,0,0.1)] flex flex-col items-center text-center animate-fade-in">
        
        {!error ? (
          <>
            {/* Elegant Spinning Branding Ring */}
            <div className="relative w-20 h-20 flex items-center justify-center mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-orange-100 animate-ping opacity-60"></div>
              <div className="absolute inset-0 rounded-full border-4 border-orange-50 animate-pulse"></div>
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center shadow-inner">
                <Loader2 className="animate-spin text-[#FF7950]" size={22} strokeWidth={2.5} />
              </div>
            </div>

            <h3 className="text-base font-extrabold text-[#303030] mb-1">Creating Assessment</h3>
            <p className="text-[rgba(94,94,94,0.8)] font-semibold text-xs leading-relaxed max-w-xs">{progressMessage}</p>
            <p className="text-[10px] text-[rgba(94,94,94,0.55)] mt-4 leading-relaxed font-semibold">
              Our AI queue workers are compiling questions, structuring MCQ options, and structuring the exam sheet...
            </p>
          </>
        ) : (
          <>
            {/* Error Message Panel */}
            <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-5 text-[#C0350A] shadow-sm">
              <AlertCircle size={26} strokeWidth={2.5} />
            </div>

            <h3 className="text-base font-extrabold text-[#303030] mb-1.5">Generation Failed</h3>
            <p className="text-[#C0350A] font-semibold text-xs leading-relaxed max-w-xs mb-6">{error}</p>

            <button
              onClick={reset}
              className="px-6 py-3 bg-[#272727] hover:bg-[#1E1E1E] text-white rounded-full font-bold text-xs flex items-center gap-2 transition-all duration-200 w-full justify-center shadow-md shadow-black/10"
            >
              <RefreshCw size={14} strokeWidth={2.5} />
              <span>Reset & Retry</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
