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
        is_correct,
        attempt_number,
        is_retry_round
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
      mode,
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

  // Map responses - group by question and track retry attempts
  const responsesByQuestion = (attempt.question_responses || []).reduce((acc: Record<string, any[]>, response: any) => {
    if (!acc[response.question_id]) {
      acc[response.question_id] = []
    }
    acc[response.question_id].push(response)
    return acc
  }, {})

  // Create answers map with retry information
  const answersMap = Object.entries(responsesByQuestion).reduce((acc: Record<string, any>, [questionId, responses]) => {
    // Sort by attempt number to get chronological order
    const sortedResponses = (responses as any[]).sort((a, b) => (a.attempt_number || 1) - (b.attempt_number || 1))

    // Get the latest/final response for the question
    const finalResponse = sortedResponses[sortedResponses.length - 1]
    const firstAttempt = sortedResponses.find(r => r.attempt_number === 1)
    const hasRetries = sortedResponses.length > 1

    acc[questionId] = {
      userAnswer: finalResponse.user_answer,
      isCorrect: finalResponse.is_correct,
      attemptNumber: finalResponse.attempt_number || 1,
      totalAttempts: sortedResponses.length,
      hasRetries,
      firstAttemptCorrect: firstAttempt?.is_correct || false,
      allAttempts: sortedResponses
    }
    return acc
  }, {})

  const scorePercentage = Math.round((attempt.correct_answers || 0) / attempt.total_questions * 100)

  return (
    <div className="py-4 sm:py-8">
      <ResultsSummary
        quiz={{
          id: id,
          title: quiz.title,
          mode: quiz.mode,
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