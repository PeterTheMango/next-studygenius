import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { ResultsSummary } from "@/components/quiz/results-summary"

export const dynamic = 'force-dynamic'

interface ResultsPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ attempt: string }>
}

export default async function QuizResultsPage({ params, searchParams }: ResultsPageProps) {
  const { id } = await params
  const { attempt: attemptId } = await searchParams
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  if (!attemptId) {
    redirect(`/quizzes/${id}`)
  }

  // Fetch attempt details
  const { data: attempt, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .single()

  if (error || !attempt) {
    notFound()
  }

  // Calculate time spent (if not already stored properly, we might need logic here, but let's assume it's stored)
  // The PRD schema has time_spent.
  
  // If status is still in_progress, we should mark it complete? 
  // Ideally `submit` API should have marked it complete or we do it here.
  // Let's ensure it is marked complete.
  
  if (attempt.status === 'in_progress') {
    await supabase
      .from('quiz_attempts')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', attemptId)
  }

  return (
    <div className="py-8">
      <ResultsSummary 
        score={Math.round((attempt.correct_answers || 0) / attempt.total_questions * 100)}
        totalQuestions={attempt.total_questions}
        correctAnswers={attempt.correct_answers || 0}
        timeSpent={attempt.time_spent || 0}
        quizId={id}
      />
    </div>
  )
}