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
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Quizzes</h2>
          <p className="text-slate-500">Manage and retake your quizzes.</p>
        </div>
        <Link
          href="/documents"
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:scale-[1.02] transition-all whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          New Quiz
        </Link>
      </div>

      <QuizzesList quizzes={quizzes || []} />
    </div>
  )
}


