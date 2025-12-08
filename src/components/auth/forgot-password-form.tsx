"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Brain, Mail, ArrowRight, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { createClient } from "@/lib/supabase/client"
import { ForgotPasswordSchema } from "@/lib/validations"
import { z } from "zod"

type ForgotPasswordValues = z.infer<typeof ForgotPasswordSchema>

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const supabase = createClient()
  
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(data: ForgotPasswordValues) {
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings`,
      })

      if (error) {
        toast.error("Failed to send reset link", {
          description: error.message,
        })
        return
      }

      setIsSent(true)
      toast.success("Reset link sent!", {
        description: "Check your email for the password reset link.",
      })
    } catch (error) {
      toast.error("Something went wrong", {
        description: "Please try again later.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
        <p className="text-slate-500">Enter your email to receive recovery instructions</p>
      </div>

      {!isSent ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium text-slate-700 mb-1">Email Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        {...field}
                        type="email"
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
                        placeholder="you@example.com"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Reset Link <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>
        </Form>
      ) : (
        <div className="text-center space-y-4">
          <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100">
            Check your email! We sent a reset link to <span className="font-bold">{form.getValues("email")}</span>.
          </div>
          <button 
            onClick={() => setIsSent(false)} 
            className="text-sm text-blue-600 font-medium hover:underline cursor-pointer"
          >
            Try another email
          </button>
        </div>
      )}

      <div className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-slate-600 hover:text-slate-900 flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>
      </div>
    </div>
  )
}
