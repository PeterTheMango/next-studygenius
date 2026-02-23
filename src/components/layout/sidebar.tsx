"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  GraduationCap,
  LogOut,
  Settings,
} from "lucide-react";
import Image from "next/image";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  user?: any;
}

export function Sidebar({ className, user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  const routes = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
      active: pathname === "/dashboard",
    },
    {
      label: "Documents",
      icon: FileText,
      href: "/documents",
      active: pathname.startsWith("/documents"),
    },
    {
      label: "Courses",
      icon: BookOpen,
      href: "/courses",
      active: pathname.startsWith("/courses"),
    },
    {
      label: "Quizzes",
      icon: GraduationCap,
      href: "/quizzes",
      active: pathname.startsWith("/quizzes"),
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/settings",
      active: pathname.startsWith("/settings"),
    },
  ];

  return (
    <aside className={cn("flex flex-col h-full bg-card", className)}>
      <div className="p-6 border-b border-border flex items-center gap-3">
        <Image src="/icon.svg" alt="StudyGenius" width={32} height={32} />
        <span className="font-bold text-xl text-foreground tracking-tight">
          StudyGenius
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
              route.active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <route.icon className="w-5 h-5" />
            {route.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <div className="px-4 py-2 flex items-center gap-3 mb-2">
          <Avatar>
            <AvatarImage
              src={user?.user_metadata?.profile.avatar_url}
              alt={user?.user_metadata?.profile.full_name || "User"}
            />
            <AvatarFallback>
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-xs overflow-hidden">
            <p className="font-bold text-foreground truncate">
              {user?.user_metadata?.profile?.full_name || "User"}
            </p>
            <p className="text-muted-foreground truncate max-w-[120px]">
              {user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
