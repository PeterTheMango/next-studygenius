"use client"

import { Menu } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Sidebar } from "@/components/layout/sidebar"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

export const MobileSidebar = ({ user }: { user: any }) => {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild className="md:hidden">
        <button>
          <Menu className="w-6 h-6 text-slate-800" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Navigate between pages</SheetDescription>
        </SheetHeader>
        <Sidebar user={user} />
      </SheetContent>
    </Sheet>
  )
}
