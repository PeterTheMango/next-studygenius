import { createClient } from "@/lib/supabase/server"
import { QuizzesList } from "@/components/quizzes/quizzes-list"
import Link from "next/link"
import { Plus, BrainCircuit, Trophy, Clock, Target } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function QuizzesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Please login</div>
  }

  const { data: quizzes, error } = await supabase
    .from('quizzes')
    .select(`
      *,
      documents(file_name),
      quiz_attempts(id, score, started_at)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .order('started_at', { foreignTable: 'quiz_attempts', ascending: false })

  const quizList = quizzes || []
  const totalQuizzes = quizList.length
  const totalAttempts = quizList.reduce((acc, q) => acc + (q.quiz_attempts?.length ?? 0), 0)
  const bestScore = quizList.reduce((best, q) => {
    const scores = q.quiz_attempts?.map((a: { score: number | null }) => a.score).filter((s: number | null): s is number => s !== null) ?? []
    const max = scores.length > 0 ? Math.round(Math.max(...scores) * 100) : 0
    return max > best ? max : best
  }, 0)

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Quizzes</h1>
            <p className="text-sm text-muted-foreground">
              Test your knowledge and track your progress.
            </p>
          </div>
        </div>
        <Link
          href="/documents"
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-sm hover:bg-primary/90 hover:scale-[1.02] transition-all whitespace-nowrap w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          New Quiz
        </Link>
      </div>

      {/* Quick Stats */}
      {totalQuizzes > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div
            className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}
          >
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Quizzes</p>
              <p className="text-lg font-bold text-foreground leading-tight">{totalQuizzes}</p>
            </div>
          </div>
          <div
            className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
          >
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Attempts</p>
              <p className="text-lg font-bold text-foreground leading-tight">{totalAttempts}</p>
            </div>
          </div>
          <div
            className="hidden sm:flex bg-card border border-border rounded-xl p-3.5 items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
          >
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Best Score</p>
              <p className="text-lg font-bold text-foreground leading-tight">{bestScore}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Library */}
      {totalQuizzes > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Your Quizzes</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
              {totalQuizzes} {totalQuizzes === 1 ? 'quiz' : 'quizzes'}
            </span>
          </div>
          <QuizzesList quizzes={quizList} />
        </div>
      ) : (
        <div className="bg-card border border-border border-dashed rounded-2xl p-8 sm:p-12 text-center">
          <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <BrainCircuit className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1.5">No quizzes yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
            Upload a document and generate your first quiz to start testing your knowledge.
          </p>
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-sm hover:bg-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Your First Quiz
          </Link>
        </div>
      )}
    </div>
  )
}


