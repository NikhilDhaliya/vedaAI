"use client";

import React, { useState } from "react";
import {
  Home,
  Settings,
  Users,
  Plus,
  GraduationCap,
  FileText,
  BookOpen,
  Library,
  Menu,
  X
} from "lucide-react";

interface SidebarProps {
  currentView: "dashboard" | "create" | "result";
  setView: (view: "dashboard" | "create" | "result") => void;
  assignmentsCount?: number;
}

export default function Sidebar({ currentView, setView, assignmentsCount = 0 }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavClick = (view: "dashboard" | "create" | "result") => {
    setView(view);
    setIsOpen(false); // Auto-collapse drawer on mobile
  };

  const navContent = (
    <>
      {/* Navigation Items list - Exactly matching Figma text */}
      <nav className="flex flex-col gap-1.5 pt-4">
        <button
          onClick={() => handleNavClick("dashboard")}
          className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 text-left w-full ${currentView === "dashboard"
              ? "bg-[#F6F6F6] text-[#303030]"
              : "text-[rgba(94,94,94,0.8)] hover:text-[#303030] hover:bg-[#F6F6F6]/40"
            }`}
        >
          <Home size={18} />
          <span>Home</span>
        </button>

        <button
          className="flex items-center gap-4 px-4 py-3 rounded-2xl text-[rgba(94,94,94,0.8)] hover:text-[#303030] hover:bg-[#F6F6F6]/40 font-semibold text-sm transition-all duration-200 text-left w-full"
        >
          <Users size={18} />
          <span>My Groups</span>
        </button>

        <button
          onClick={() => handleNavClick("dashboard")}
          className={`flex items-center justify-between px-4 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 w-full ${currentView === "result"
              ? "bg-[#F6F6F6] text-[#303030]"
              : "text-[rgba(94,94,94,0.8)] hover:text-[#303030] hover:bg-[#F6F6F6]/40"
            }`}
        >
          <div className="flex items-center gap-4">
            <FileText size={18} />
            <span>Assignments</span>
          </div>
          {assignmentsCount > 0 && (
            <span className="bg-[#FF7950] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-[6px] shadow-sm shadow-[#FF7950]/20 animate-pulse">
              {assignmentsCount}
            </span>
          )}
        </button>

        <button
          className="flex items-center gap-4 px-4 py-3 rounded-2xl text-[rgba(94,94,94,0.8)] hover:text-[#303030] hover:bg-[#F6F6F6]/40 font-semibold text-sm transition-all duration-200 text-left w-full"
        >
          <BookOpen size={18} />
          <span>AI Teacher’s Toolkit</span>
        </button>

        <div
          className="flex items-center gap-4 px-4 py-3 rounded-2xl text-[rgba(94,94,94,0.8)] hover:text-[#303030] hover:bg-[#F6F6F6]/40 font-semibold text-sm transition-all duration-200 cursor-pointer"
        >
          <Library size={18} />
          <span>My Library</span>
        </div>
      </nav>
    </>
  );

  const footerContent = (
    <div className="flex flex-col gap-4">
      {/* Settings button in the footer area */}
      <button
        className="flex items-center gap-4 px-4 py-3 rounded-2xl text-[rgba(94,94,94,0.8)] hover:text-[#303030] hover:bg-[#F6F6F6]/40 font-semibold text-sm transition-all duration-200 text-left w-full"
      >
        <Settings size={18} />
        <span>Settings</span>
      </button>

      {/* School Profile Section: DPS Bokaro Steel City */}
      <div className="bg-[#F6F6F6] border border-[#DADADA]/50 p-4 rounded-[16px] flex items-center gap-3 shadow-[inset_0px_2px_4px_rgba(0,0,0,0.01)]">
        <div className="w-10 h-10 bg-white border border-[#DADADA]/60 rounded-xl flex items-center justify-center text-[#FF7950] font-black text-sm shadow-sm shrink-0">
          DPS
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[#303030] truncate">Delhi Public School</p>
          <p className="text-[10px] font-semibold text-[rgba(94,94,94,0.55)] truncate">Bokaro Steel City</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. MOBILE TOP HEADER (shown only on screens < lg) */}
      <header className="lg:hidden w-full bg-white border border-[#DADADA]/50 shadow-sm rounded-[24px] p-4 flex items-center justify-between print:hidden select-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-[#FF7950] to-[#C0350A] rounded-xl flex items-center justify-center font-bold text-white shadow-md">
            <GraduationCap size={20} />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-[#303030] leading-none">VedaAI</h1>
            <span className="text-[8px] uppercase font-bold text-[rgba(94,94,94,0.55)] tracking-wider mt-0.5 block">
              Assessor Room
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {assignmentsCount > 0 && (
            <span className="bg-[#FF7950]/10 text-[#FF7950] font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-[#FF7950]/20">
              {assignmentsCount} Assignments
            </span>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-[#303030] hover:bg-[#F6F6F6] rounded-full transition-all border border-[#DADADA]/50 bg-white"
            aria-label="Toggle navigation drawer"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* 2. MOBILE DRAWER SLIDE-OUT PANEL (overlay) */}
      <div 
        className={`lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-all duration-300 print:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
      >
        <div 
          className={`w-72 bg-white h-full p-6 flex flex-col justify-between shadow-2xl relative transition-transform duration-300 ease-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[#DADADA]/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-tr from-[#FF7950] to-[#C0350A] rounded-lg flex items-center justify-center font-bold text-white">
                  <GraduationCap size={16} />
                </div>
                <div>
                  <h2 className="font-extrabold text-xs text-[#303030]">VedaAI</h2>
                  <p className="text-[8px] font-bold text-[rgba(94,94,94,0.55)]">MENU NAVIGATION</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 text-[rgba(94,94,94,0.55)] hover:text-[#303030] hover:bg-[#F6F6F6] rounded-full transition-all border border-[#DADADA]/40"
              >
                <X size={16} />
              </button>
            </div>

            {/* Action Button: Create New */}
            <button
              onClick={() => handleNavClick("create")}
              className="w-full bg-gradient-to-tr from-[#FF7950] to-[#C0350A] hover:opacity-95 text-white font-semibold text-xs flex items-center justify-center gap-2 py-3 px-5 rounded-full shadow-md shadow-[#FF7950]/10 transition-all"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Create Assessment</span>
            </button>

            {navContent}
          </div>

          {footerContent}
        </div>
      </div>

      {/* 3. DESKTOP PERMANENT SIDEBAR (hidden on < lg screens) */}
      <aside className="hidden lg:flex w-72 h-[calc(100vh-32px)] sticky top-4 bg-white flex-col justify-between p-6 rounded-[24px] border border-[#DADADA]/50 shadow-[0px_8px_32px_rgba(0,0,0,0.04)] print:hidden select-none shrink-0">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#FF7950] to-[#C0350A] rounded-xl flex items-center justify-center font-bold text-white shadow-md shadow-[#FF7950]/20">
              <GraduationCap size={22} />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-[#303030] leading-none tracking-tight">VedaAI</h1>
              <span className="text-[10px] uppercase font-bold text-[rgba(94,94,94,0.55)] tracking-wider mt-0.5 block">
                Assessor Room
              </span>
            </div>
          </div>

          {/* Action Button: Capsule with Orange-Red Gradient Border */}
          <div className="px-1 pt-2">
            <div className="bg-gradient-to-b from-[#FF7950] to-[#C0350A] p-[2.5px] rounded-full shadow-lg shadow-[#FF7950]/15 hover:shadow-[#FF7950]/25 transition-all duration-300">
              <button
                onClick={() => handleNavClick("create")}
                className="w-full bg-[#272727] hover:bg-[#1E1E1E] text-white font-semibold text-sm flex items-center justify-center gap-2 py-3 px-5 rounded-full transition-all duration-200"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Create Assignment</span>
              </button>
            </div>
          </div>

          {navContent}
        </div>

        {footerContent}
      </aside>
    </>
  );
}
