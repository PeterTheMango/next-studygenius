"use client";

import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

  const getTitle = () => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.startsWith("/documents")) return "Documents";
    if (pathname.startsWith("/quizzes")) return "Quizzes";
    return "StudyGenius";
  };

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-20 flex justify-between items-center">
      <h1 className="text-xl font-semibold text-slate-800 capitalize">
        {getTitle()}
      </h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          StudyBuddy AI Active
        </div>
      </div>
    </header>
  );
}
