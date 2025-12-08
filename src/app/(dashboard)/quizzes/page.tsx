import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Plus, GraduationCap, ArrowRight } from "lucide-react"

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
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:scale-[1.02] transition-all"
        >
          <Plus className="w-5 h-5" />
          New Quiz
        </Link>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {quizzes?.map((quiz) => (
          <Link 
            key={quiz.id} 
            href={`/quizzes/${quiz.id}`}
            className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-lg cursor-pointer transition-all relative flex flex-col"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md capitalize">
                {quiz.mode}
              </span>
            </div>

            <h4 className="font-bold text-slate-800 mb-2 truncate pr-6">
              {quiz.title}
            </h4>
            
            <p className="text-xs text-slate-400 mb-4 truncate">
              From: {quiz.documents && (quiz.documents as any).file_name}
            </p>

            <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between text-sm">
               <span className="font-medium text-slate-600">{quiz.question_count} Questions</span>
               <span className="text-blue-600 font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                 View Details <ArrowRight className="w-4 h-4" />
               </span>
            </div>
          </Link>
        ))}
        {quizzes?.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            No quizzes found. Go to Documents to generate one.
          </div>
        )}
      </div>
    </div>
  )
}


