import { createClient } from "@/lib/supabase/server"
import { QuizzesList } from "@/components/quizzes/quizzes-list"
import Link from "next/link"
import { Plus } from "lucide-react"

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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Quizzes</h2>
          <p className="text-muted-foreground">Manage and retake your quizzes.</p>
        </div>
        <Link
          href="/documents"
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] transition-all whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          New Quiz
        </Link>
      </div>

      <QuizzesList quizzes={quizzes || []} />
    </div>
  )
}


