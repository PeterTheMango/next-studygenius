"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createCourseSchema, CreateCourseInput, COURSE_COLORS, COURSE_ICONS } from "@/types/course"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useCourseStore } from "@/stores/course-store"
import { useRouter } from "next/navigation"
import * as LucideIcons from "lucide-react"
import { Check } from "lucide-react"

interface CreateCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateCourseDialog({ open, onOpenChange }: CreateCourseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addCourse } = useCourseStore()
  const router = useRouter()

  const form = useForm({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      title: "",
      description: "",
      course_code: "",
      color: "#3b82f6",
      icon: "book-open",
      status: "active" as const,
    },
  })

  const onSubmit = async (data: CreateCourseInput) => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create course")
      }

      addCourse(result.data)
      toast.success("Course created successfully")
      form.reset()
      onOpenChange(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to create course")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
          <DialogDescription>
            Organize your study materials by creating a course
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Introduction to Biology"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="course_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., BIO101"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase()
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Must be uppercase letters and numbers only
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the course..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Color</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-5 gap-3">
                      {COURSE_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => field.onChange(color.value)}
                          className="relative h-12 rounded-lg border-2 transition-all hover:scale-105"
                          style={{
                            backgroundColor: color.value,
                            borderColor:
                              field.value === color.value
                                ? color.value
                                : "transparent",
                          }}
                          title={color.name}
                        >
                          {field.value === color.value && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Check className="w-5 h-5 text-white drop-shadow-md" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Icon</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-6 gap-3">
                      {COURSE_ICONS.map((icon) => {
                        const IconComponent = (LucideIcons as any)[
                          icon.name
                            .split("-")
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join("")
                        ] as React.ComponentType<{ className?: string }>

                        return (
                          <button
                            key={icon.name}
                            type="button"
                            onClick={() => field.onChange(icon.name)}
                            className={`relative h-16 rounded-lg border-2 transition-all hover:scale-105 flex items-center justify-center ${
                              field.value === icon.name
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/30"
                            }`}
                            title={icon.label}
                          >
                            {IconComponent && (
                              <IconComponent
                                className={`w-6 h-6 ${
                                  field.value === icon.name
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Course"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
