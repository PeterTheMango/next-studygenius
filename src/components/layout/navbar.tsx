"use client";

import { usePathname } from "next/navigation";
import { MobileSidebar } from "./mobile-sidebar";

export function Navbar({ user }: { user: any }) {
  const pathname = usePathname();

  const getTitle = () => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.startsWith("/documents")) return "Documents";
    if (pathname.startsWith("/quizzes")) return "Quizzes";
    return "StudyGenius";
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 sticky top-0 z-20 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <MobileSidebar user={user} />
        <h1 className="hidden md:block text-xl font-semibold text-slate-800 capitalize">
          {getTitle()}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          StudyBuddy AI Active
        </div>
      </div>
    </header>
  );
}
