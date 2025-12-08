"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, FileText, GraduationCap, Brain, LogOut } from "lucide-react"

import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  user?: any
}

export function Sidebar({ className, user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast.success("Signed out successfully")
      router.push("/login")
    } catch (error) {
      toast.error("Error signing out")
    }
  }

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
      label: "Quizzes",
      icon: GraduationCap,
      href: "/quizzes",
      active: pathname.startsWith("/quizzes"),
    },
  ]

  return (
    <aside className={cn("flex flex-col h-full bg-white", className)}>
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-xl text-slate-800 tracking-tight">StudyGenius</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
              route.active 
                ? "bg-blue-50 text-blue-700" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <route.icon className="w-5 h-5" />
            {route.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 mt-auto">
         <div className="px-4 py-2 flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden">
               {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="User" className="w-full h-full object-cover" />
               ) : (
                  user?.email?.charAt(0).toUpperCase()
               )}
            </div>
            <div className="text-xs overflow-hidden">
                <p className="font-bold text-slate-800 truncate">{user?.user_metadata?.full_name || 'User'}</p>
                <p className="text-slate-500 truncate max-w-[120px]">{user?.email}</p>
            </div>
         </div>
         <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
         >
            <LogOut className="w-5 h-5" />
            Sign Out
         </button>
      </div>
    </aside>
  )
}

