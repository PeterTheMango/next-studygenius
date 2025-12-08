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

  // Fetch attempt details with responses
  const { data: attempt, error: attemptError } = await supabase
    .from('quiz_attempts')
    .select(`
      *,
      question_responses (
        question_id,
        user_answer,
        is_correct
      )
    `)
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .single()

  if (attemptError || !attempt) {
    notFound()
  }

  // Fetch quiz details with questions
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select(`
      title,
      questions (
        id,
        question_text,
        correct_answer,
        explanation,
        options,
        order_index,
        type
      )
    `)
    .eq('id', id)
    .single()

  if (quizError || !quiz) {
    notFound()
  }

  let finalTimeSpent = attempt.time_spent || 0

  // If status is still in_progress, mark it as completed
  if (attempt.status === 'in_progress') {
    const now = new Date()
    const startedAt = new Date(attempt.started_at)
    // Calculate seconds difference
    finalTimeSpent = Math.floor((now.getTime() - startedAt.getTime()) / 1000)

    await supabase
      .from('quiz_attempts')
      .update({ 
        status: 'completed',
        completed_at: now.toISOString(),
        time_spent: finalTimeSpent
      })
      .eq('id', attemptId)
  } else if (finalTimeSpent === 0 && attempt.started_at && attempt.completed_at) {
    // Calculate from existing timestamps if time_spent is missing
    const startedAt = new Date(attempt.started_at)
    const completedAt = new Date(attempt.completed_at)
    finalTimeSpent = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)
  }

  // Sort questions
  const sortedQuestions = (quiz.questions || []).sort((a, b) => a.order_index - b.order_index)

  // Map responses
  const answersMap = (attempt.question_responses || []).reduce((acc: Record<string, { userAnswer: string; isCorrect: boolean }>, response: any) => {
    acc[response.question_id] = {
      userAnswer: response.user_answer,
      isCorrect: response.is_correct
    }
    return acc
  }, {})

  const scorePercentage = Math.round((attempt.correct_answers || 0) / attempt.total_questions * 100)

  return (
    <div className="py-8">
      <ResultsSummary
        quiz={{
          id: id,
          title: quiz.title,
          questions: sortedQuestions.map((q: any) => ({
            id: q.id,
            questionText: q.question_text,
            correctAnswer: q.correct_answer,
            explanation: q.explanation,
            options: q.options || undefined,
            type: q.type
          }))
        }}
        attempt={{
          score: scorePercentage,
          correctAnswers: attempt.correct_answers || 0,
          totalQuestions: attempt.total_questions,
          timeSpent: finalTimeSpent,
          answers: answersMap
        }}
      />
    </div>
  )
}