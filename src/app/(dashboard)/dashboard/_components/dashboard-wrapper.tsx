"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

export function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const verified = searchParams.get("verified")
    if (verified === "success") {
      toast.success("Account Verified Successfully", {
        description: "Your account has been verified. Welcome!",
      })
    }
  }, [searchParams])

  return <>{children}</>
}
