import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { PlayCircle, Clock, FileText, BarChart, GraduationCap, Calendar, CheckCircle2, Eye } from "lucide-react"
import { QuizActionsDropdown } from "@/components/quiz/quiz-actions-dropdown"

export const dynamic = 'force-dynamic'

export default async function QuizDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch quiz details
  const { data: quiz, error } = await supabase
    .from('quizzes')
    .select('*, documents(file_name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !quiz) {
    notFound()
  }

  // Redirect to generating page if quiz is still in progress
  const generationStatuses = ['queued', 'generating', 'cleaning', 'structuring', 'finalizing']
  if (quiz.status && generationStatuses.includes(quiz.status)) {
    redirect(`/quizzes/${id}/generating`)
  }

  // Fetch past attempts
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', id)
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  const bestScore = attempts?.length 
    ? Math.max(...attempts.map(a => (a.correct_answers || 0) / (a.total_questions || 1) * 100))
    : 0

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-foreground">{quiz.title}</h1>
            <QuizActionsDropdown quizId={quiz.id} quizTitle={quiz.title} />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>{quiz.documents && (quiz.documents as any).file_name}</span>
          </div>
        </div>
        <Link 
          href={`/quizzes/${id}/take`}
          className="flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg shadow-xl shadow-primary/30 hover:bg-primary/90 hover:scale-105 transition-all"
        >
          <PlayCircle className="w-5 h-5" />
          Start Quiz
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><GraduationCap className="w-6 h-6" /></div>
                <div>
                    <p className="text-sm text-muted-foreground font-medium">Mode</p>
                    <h3 className="text-xl font-bold text-foreground capitalize">{quiz.mode}</h3>
                </div>
            </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><FileText className="w-6 h-6" /></div>
                <div>
                    <p className="text-sm text-muted-foreground font-medium">Questions</p>
                    <h3 className="text-xl font-bold text-foreground">{quiz.question_count}</h3>
                </div>
            </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-xl"><BarChart className="w-6 h-6" /></div>
                <div>
                    <p className="text-sm text-muted-foreground font-medium">Best Score</p>
                    <h3 className="text-xl font-bold text-foreground">{Math.round(bestScore)}%</h3>
                </div>
            </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><Clock className="w-6 h-6" /></div>
                <div>
                    <p className="text-sm text-muted-foreground font-medium">Est. Time</p>
                    <h3 className="text-xl font-bold text-foreground">{Math.ceil((quiz.question_count || 10) * 0.5)} min</h3>
                </div>
            </div>
        </div>
      </div>

      {attempts && attempts.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-4">Recent Attempts</h3>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {attempts.map((attempt) => (
              <div key={attempt.id} className="p-4 border-b border-border last:border-0 flex items-center justify-between hover:bg-accent transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    Math.round((attempt.correct_answers || 0) / attempt.total_questions * 100) >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {Math.round((attempt.correct_answers || 0) / attempt.total_questions * 100)}%
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Completed</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(attempt.completed_at!).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{attempt.correct_answers} / {attempt.total_questions} correct</span>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/quizzes/${id}/results?attempt=${attempt.id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View Results
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


