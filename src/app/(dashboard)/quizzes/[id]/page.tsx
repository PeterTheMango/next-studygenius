import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { PlayCircle, Clock, FileText, BarChart, GraduationCap, ArrowLeft, Eye, Trophy, Target } from "lucide-react"
import { QuizActionsDropdown } from "@/components/quiz/quiz-actions-dropdown"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

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

  const totalAttempts = attempts?.length ?? 0
  const avgScore = totalAttempts > 0
    ? Math.round(attempts!.reduce((acc, a) => acc + ((a.correct_answers || 0) / (a.total_questions || 1) * 100), 0) / totalAttempts)
    : 0

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Back Navigation */}
      <div
        className="animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{ animationFillMode: 'backwards' }}
      >
        <Link
          href="/quizzes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Quizzes
        </Link>
      </div>

      {/* Page Header */}
      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{quiz.title}</h1>
              <QuizActionsDropdown quizId={quiz.id} quizTitle={quiz.title} />
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-xs font-normal capitalize">
                {quiz.mode}
              </Badge>
              {quiz.documents && (
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {(quiz.documents as any).file_name}
                </span>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/quizzes/${id}/take`}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-sm hover:bg-primary/90 hover:scale-[1.02] transition-all whitespace-nowrap w-full sm:w-auto"
        >
          <PlayCircle className="w-4 h-4" />
          Start Quiz
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
        >
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">Questions</p>
            <p className="text-lg font-bold text-foreground leading-tight">{quiz.question_count}</p>
          </div>
        </div>
        <div
          className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
        >
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <Trophy className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">Best Score</p>
            <p className="text-lg font-bold text-foreground leading-tight">{Math.round(bestScore)}%</p>
          </div>
        </div>
        <div
          className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
        >
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">Avg Score</p>
            <p className="text-lg font-bold text-foreground leading-tight">{avgScore}%</p>
          </div>
        </div>
        <div
          className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}
        >
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">Est. Time</p>
            <p className="text-lg font-bold text-foreground leading-tight">{Math.ceil((quiz.question_count || 10) * 0.5)} min</p>
          </div>
        </div>
      </div>

      {/* Recent Attempts */}
      {attempts && attempts.length > 0 ? (
        <div
          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Recent Attempts</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Your past quiz results</p>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
              {totalAttempts} {totalAttempts === 1 ? 'attempt' : 'attempts'}
            </span>
          </div>

          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              {attempts.map((attempt, i) => {
                const score = Math.round((attempt.correct_answers || 0) / (attempt.total_questions || 1) * 100)
                return (
                  <div
                    key={attempt.id}
                    className="flex items-center gap-3 md:gap-4 p-3 md:px-5 md:py-4 transition-colors hover:bg-accent/50 animate-in fade-in duration-300"
                    style={{ animationDelay: `${350 + i * 50}ms`, animationFillMode: 'backwards' }}
                  >
                    {/* Score ring (desktop) */}
                    <div className="hidden sm:block shrink-0">
                      <div className="relative h-10 w-10">
                        <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-border)" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15" fill="none"
                            stroke={score >= 80 ? 'var(--color-chart-2)' : score >= 50 ? 'var(--color-chart-4)' : 'var(--color-destructive)'}
                            strokeWidth="3"
                            strokeDasharray={`${(score / 100) * 94.25} 94.25`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground tabular-nums">
                          {score}
                        </span>
                      </div>
                    </div>

                    {/* Score badge (mobile) */}
                    <div className="sm:hidden shrink-0">
                      <Badge className={`font-semibold tabular-nums ${
                        score >= 80
                          ? 'bg-chart-2/15 text-chart-2 border-chart-2/25'
                          : score >= 50
                            ? 'bg-chart-4/15 text-chart-4 border-chart-4/25'
                            : 'bg-destructive/15 text-destructive border-destructive/25'
                      }`}>
                        {score}%
                      </Badge>
                    </div>

                    {/* Attempt info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {attempt.correct_answers} / {attempt.total_questions} correct
                      </p>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(attempt.completed_at!).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Score progress (desktop) */}
                    <div className="hidden md:block w-24 shrink-0">
                      <Progress value={score} className="h-1.5" />
                    </div>

                    {/* Action */}
                    <Link
                      href={`/quizzes/${id}/results?attempt=${attempt.id}`}
                      className="shrink-0"
                    >
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      ) : (
        <div
          className="bg-card border border-border border-dashed rounded-2xl p-8 sm:p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
        >
          <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1.5">No attempts yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
            Take your first attempt to start tracking your progress on this quiz.
          </p>
          <Link
            href={`/quizzes/${id}/take`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-sm hover:bg-primary/90 transition-all"
          >
            <PlayCircle className="w-4 h-4" />
            Start Quiz
          </Link>
        </div>
      )}
    </div>
  )
}


