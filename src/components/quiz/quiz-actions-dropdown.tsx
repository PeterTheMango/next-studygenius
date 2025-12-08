"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronDown, Pencil, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditQuizSheet } from "./edit-quiz-sheet"
import { ConfirmActionDialog } from "./confirm-action-dialog"
import { clearQuizAttempts } from "@/app/actions/quiz-actions"

interface QuizActionsDropdownProps {
  quizId: string
  quizTitle: string
}

export function QuizActionsDropdown({ quizId, quizTitle }: QuizActionsDropdownProps) {
  const router = useRouter()
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  
  const [isDeleting, setIsDeleting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const handleClearAttempts = async () => {
    setIsClearing(true)
    try {
      const result = await clearQuizAttempts(quizId)
      if (result.success) {
        toast.success("Quiz attempts cleared successfully.")
      }
      setClearDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear attempts.")
    } finally {
      setIsClearing(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/quizzes/${quizId}`, { method: "DELETE" })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete quiz.")
      }
      toast.success("Quiz deleted successfully.")
      setDeleteDialogOpen(false)
      // Redirect to the main quizzes page after deletion
      router.push("/quizzes")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <ChevronDown className="w-5 h-5" />
            <span className="sr-only">Quiz Options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditSheetOpen(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Quiz Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-500"
            onSelect={() => setClearDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Quiz Attempts
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-500"
            onSelect={() => setDeleteDialogOpen(true)}
          >
            <X className="w-4 h-4 mr-2" />
            Delete Quiz
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditQuizSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        quizId={quizId}
        currentTitle={quizTitle}
      />

      <ConfirmActionDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        title="Are you sure you want to clear all attempts?"
        description="This will permanently delete all past attempts and scores for this quiz. This action cannot be undone."
        actionLabel="Confirm Clear Attempts"
        onConfirm={handleClearAttempts}
        isLoading={isClearing}
      />

      <ConfirmActionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Are you absolutely sure you want to delete this quiz?"
        description="This will permanently delete this quiz and all of its associated data, including attempts and scores. This action cannot be undone."
        actionLabel="Confirm Delete"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </>
  )
}
