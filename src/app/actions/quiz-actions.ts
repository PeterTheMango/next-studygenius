"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function updateQuizTitle(quizId: string, title: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("You must be logged in to update a quiz.")
  }

  const { error } = await supabase
    .from("quizzes")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", quizId)
    .eq("user_id", user.id)

  if (error) {
    throw new Error(`Failed to update quiz title: ${error.message}`)
  }

  revalidatePath(`/quizzes/${quizId}`)
  revalidatePath("/quizzes")
  revalidatePath("/dashboard")

  return { success: true }
}

export async function clearQuizAttempts(quizId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("You must be logged in to clear quiz attempts.")
  }

  // First, get the attempts for the current user and quiz
  const { data: attempts, error: attemptsError } = await supabase
    .from("quiz_attempts")
    .select("id")
    .eq("quiz_id", quizId)
    .eq("user_id", user.id)

  if (attemptsError) {
    throw new Error(`Failed to fetch quiz attempts: ${attemptsError.message}`)
  }

  if (!attempts || attempts.length === 0) {
    // No attempts to clear, so we can return successfully.
    return { success: true, message: "No attempts to clear." }
  }

  const attemptIds = attempts.map((a) => a.id)

  // Delete associated question responses
  const { error: responsesError } = await supabase
    .from("question_responses")
    .delete()
    .in("quiz_attempt_id", attemptIds)

  if (responsesError) {
    throw new Error(
      `Failed to delete question responses: ${responsesError.message}`
    )
  }

  // Delete the quiz attempts
  const { error: attemptsDeleteError } = await supabase
    .from("quiz_attempts")
    .delete()
    .in("id", attemptIds)

  if (attemptsDeleteError) {
    throw new Error(`Failed to delete quiz attempts: ${attemptsDeleteError.message}`)
  }

  revalidatePath(`/quizzes/${quizId}`)
  revalidatePath("/quizzes")
  revalidatePath("/dashboard")

  return { success: true }
}
