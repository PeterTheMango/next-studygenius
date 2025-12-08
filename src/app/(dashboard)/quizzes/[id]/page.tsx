import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { PlayCircle, Clock, FileText, BarChart, GraduationCap, Calendar, CheckCircle2 } from "lucide-react"

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
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{quiz.title}</h1>
          <div className="flex items-center gap-2 text-slate-500">
            <FileText className="w-4 h-4" />
            <span>{quiz.documents && (quiz.documents as any).file_name}</span>
          </div>
        </div>
        <Link 
          href={`/quizzes/${id}/take`}
          className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-105 transition-all"
        >
          <PlayCircle className="w-5 h-5" />
          Start Quiz
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><GraduationCap className="w-6 h-6" /></div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Mode</p>
                    <h3 className="text-xl font-bold text-slate-800 capitalize">{quiz.mode}</h3>
                </div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><FileText className="w-6 h-6" /></div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Questions</p>
                    <h3 className="text-xl font-bold text-slate-800">{quiz.question_count}</h3>
                </div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-xl"><BarChart className="w-6 h-6" /></div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Best Score</p>
                    <h3 className="text-xl font-bold text-slate-800">{Math.round(bestScore)}%</h3>
                </div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><Clock className="w-6 h-6" /></div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Est. Time</p>
                    <h3 className="text-xl font-bold text-slate-800">{Math.ceil((quiz.question_count || 10) * 0.5)} min</h3>
                </div>
            </div>
        </div>
      </div>

      {attempts && attempts.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-4">Recent Attempts</h3>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {attempts.map((attempt) => (
              <div key={attempt.id} className="p-4 border-b border-slate-100 last:border-0 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    Math.round((attempt.correct_answers || 0) / attempt.total_questions * 100) >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {Math.round((attempt.correct_answers || 0) / attempt.total_questions * 100)}%
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Completed</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(attempt.completed_at!).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{attempt.correct_answers} / {attempt.total_questions} correct</span>
                    </div>
                  </div>
                </div>
                <div className="text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


