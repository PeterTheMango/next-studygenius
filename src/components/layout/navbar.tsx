"use client";

import { MobileSidebar } from "./mobile-sidebar";
import { SearchCommand } from "./search-command";

export function Navbar({ user }: { user: any }) {
  return (
    <header className="bg-card border-b border-border px-4 md:px-8 py-4 sticky top-0 z-20 flex justify-between items-center">
      <div className="flex items-center gap-4 flex-1">
        <MobileSidebar user={user} />
        <div className="hidden md:block flex-1 max-w-sm">
          <SearchCommand />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          StudyBuddy AI Active
        </div>
      </div>
    </header>
  );
}
