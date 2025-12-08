"use client"

import { useMemo } from "react"
import { Target, FileText, Clock, Archive } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts"
import Link from "next/link"

interface Attempt {
  id: string
  score: number
  total_questions: number
  correct_answers: number
  time_spent: number
  created_at: string
  status: string
  quizzes: {
    title: string
    mode: string
  }
}

interface DashboardViewProps {
  attempts: Attempt[]
}

export function DashboardView({ attempts }: DashboardViewProps) {
  const stats = useMemo(() => {
    const completedAttempts = attempts.filter(a => a.status === 'completed')
    const avgScore = completedAttempts.length > 0
      ? Math.round(completedAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedAttempts.length)
      : 0
    
    const timeInvested = Math.round(attempts.reduce((acc, curr) => acc + (curr.time_spent || 0), 0) / 60)

    return {
      avgScore,
      activeQuizzes: attempts.length, // Or maybe unique quizzes? Legacy counts attempts/quizzes.
      timeInvested
    }
  }, [attempts])

  const performanceData = [
    { name: 'Correct', value: stats.avgScore, color: '#22c55e' },
    { name: 'Incorrect', value: 100 - stats.avgScore, color: '#f87171' }
  ]

  const chartData = [...attempts]
    .filter(a => a.status === 'completed')
    .reverse()
    .map(a => ({
      name: new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: Math.round(a.score || 0)
    }))

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Avg Score</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.avgScore}%</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Attempts</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.activeQuizzes}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Time Invested</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.timeInvested} m</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Charts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
          <h3 className="font-semibold text-slate-800 mb-4">Performance Overview</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={performanceData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {performanceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
          <h3 className="font-semibold text-slate-800 mb-4">Score History</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip cursor={{fill: '#f1f5f9'}} />
                <Area type="monotone" dataKey="score" stroke="#3b82f6" fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">No data available yet</div>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-800 mb-4">Recent Attempts</h3>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {attempts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
                No active attempts. <Link href="/documents" className="text-blue-600 hover:underline">Upload a document</Link> to start!
            </div>
          ) : (
            attempts.slice(0, 10).map((attempt) => (
              <div key={attempt.id} className="p-4 border-b border-slate-100 last:border-0 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${(attempt.score || 0) >= 80 ? 'bg-green-100 text-green-700' : (attempt.score || 0) >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {Math.round(attempt.score || 0)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{attempt.quizzes?.title || 'Unknown Quiz'}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="capitalize">{attempt.quizzes?.mode} Mode</span>
                      <span>•</span>
                      <span>{new Date(attempt.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                {/* Archive button placeholder - functionality would need server action */}
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
