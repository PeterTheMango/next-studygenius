"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Check, X, Clock, Target, RotateCcw, LayoutDashboard,
  ChevronDown, AlertCircle, Sparkles, ArrowLeft, Lightbulb
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'

interface QuizResultProps {
  quiz: {
    id: string
    title: string
    mode: 'learn' | 'revision' | 'test'
    questions: {
      id: string
      questionText: string
      correctAnswer: string
      explanation: string
      options?: string[]
      type?: string
    }[]
  }
  attempt: {
    score: number
    correctAnswers: number
    totalQuestions: number
    timeSpent: number
    answers: Record<string, {
      userAnswer: string
      isCorrect: boolean
      score?: number
      attemptNumber?: number
      totalAttempts?: number
      hasRetries?: boolean
      firstAttemptCorrect?: boolean
      allAttempts?: any[]
    }>
  }
}

function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    const duration = 1200
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) {
        ref.current = requestAnimationFrame(tick)
      }
    }

    ref.current = requestAnimationFrame(tick)
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current)
    }
  }, [value])

  return <>{display}</>
}

function ScoreRing({ score, size = 160, strokeWidth = 10 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'var(--color-chart-2)'
    if (s >= 50) return 'var(--color-chart-4)'
    return 'var(--color-destructive)'
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getScoreColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (score / 100) * circumference }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-foreground tabular-nums tracking-tight">
          <AnimatedScore value={score} />
          <span className="text-2xl text-muted-foreground">%</span>
        </span>
        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
          Score
        </span>
      </div>
    </div>
  )
}

export function ResultsSummary({ quiz, attempt }: QuizResultProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)
  const [overridingQuestions, setOverridingQuestions] = useState<Set<string>>(new Set())
  const [localAttempt, setLocalAttempt] = useState(attempt)
  const hasConfettied = useRef(false)

  // Confetti on high scores
  useEffect(() => {
    if (!hasConfettied.current && localAttempt.score >= 80) {
      hasConfettied.current = true
      const timer = setTimeout(() => {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } })
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [localAttempt.score])

  // Retrieve and merge confidence scores from sessionStorage
  useEffect(() => {
    const attemptId = searchParams.get('attempt')
    if (attemptId && typeof window !== 'undefined') {
      const scoresJson = sessionStorage.getItem(`quiz-scores-${attemptId}`)
      if (scoresJson) {
        try {
          const scores = JSON.parse(scoresJson)
          setLocalAttempt(prev => {
            const newAnswers = { ...prev.answers }
            scores.forEach((item: any) => {
              if (newAnswers[item.questionId]) {
                newAnswers[item.questionId] = {
                  ...newAnswers[item.questionId],
                  score: item.score
                }
              }
            })
            return { ...prev, answers: newAnswers }
          })
          sessionStorage.removeItem(`quiz-scores-${attemptId}`)
        } catch (error) {
          console.error('Failed to parse session scores:', error)
        }
      }
    }
  }, [searchParams])

  const toggleExpand = (id: string) => {
    setExpandedQuestion(expandedQuestion === id ? null : id)
  }

  const percentage = Math.round(localAttempt.score)
  const data = [
    { name: 'Correct', value: localAttempt.correctAnswers, color: 'var(--color-chart-2)' },
    { name: 'Incorrect', value: localAttempt.totalQuestions - localAttempt.correctAnswers, color: 'var(--color-destructive)' },
  ]

  if (localAttempt.totalQuestions === 0) {
    data[1].value = 1
  }

  const questionsWithRetries = Object.values(localAttempt.answers).filter(a => a.hasRetries).length
  const questionsImprovedInRetry = Object.values(localAttempt.answers).filter(
    a => a.hasRetries && !a.firstAttemptCorrect && a.isCorrect
  ).length

  const correctCount = localAttempt.correctAnswers
  const incorrectCount = localAttempt.totalQuestions - localAttempt.correctAnswers

  const getScoreLabel = (s: number) => {
    if (s >= 90) return 'Excellent'
    if (s >= 80) return 'Great Job'
    if (s >= 60) return 'Good Effort'
    if (s >= 40) return 'Keep Practicing'
    return 'Keep Going'
  }

  const handleOverrideAnswer = async (questionId: string) => {
    const attemptId = searchParams.get('attempt')
    if (!attemptId || overridingQuestions.has(questionId)) return

    const confirmOverride = confirm(
      "Are you sure you want to mark this answer as correct? This will override the current evaluation and update your score."
    )

    if (!confirmOverride) return

    setOverridingQuestions(prev => new Set(prev).add(questionId))

    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, questionId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to override answer")
      }

      setLocalAttempt(prev => {
        const newAnswers = { ...prev.answers }
        if (newAnswers[questionId]) {
          newAnswers[questionId] = {
            ...newAnswers[questionId],
            isCorrect: true,
            score: 100,
          }
        }

        const newCorrectCount = Object.values(newAnswers).filter(a => a.isCorrect).length

        return {
          ...prev,
          answers: newAnswers,
          correctAnswers: newCorrectCount,
          score: Math.round((newCorrectCount / prev.totalQuestions) * 100),
        }
      })

      toast.success("Answer marked as correct! Your score has been updated.")

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    } catch (error: any) {
      console.error("Override error:", error)
      toast.error(error.message || "Failed to override answer")
    } finally {
      setOverridingQuestions(prev => {
        const newSet = new Set(prev)
        newSet.delete(questionId)
        return newSet
      })
    }
  }

  const stagger = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.06, delayChildren: 0.1 }
    }
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } }
  }

  return (
    <motion.div
      className="max-w-4xl mx-auto px-4 sm:px-0"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Back Navigation */}
      <motion.div variants={fadeUp} className="mb-6">
        <Link
          href={`/quizzes/${quiz.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Quiz
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col gap-1 mb-8">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {getScoreLabel(percentage)}
          </h1>
          {percentage >= 80 && <Sparkles className="w-5 h-5 text-chart-4" />}
        </div>
        <p className="text-sm text-muted-foreground">
          Results for <span className="font-medium text-foreground">{quiz.title}</span>
          <Badge variant="secondary" className="ml-2 text-[10px] font-normal capitalize align-middle">
            {quiz.mode}
          </Badge>
        </p>
      </motion.div>

      {/* Score Card — stacks vertically on mobile, horizontal on md+ */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden mb-6">
          <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-6">
            {/* Score Ring */}
            <div className="flex justify-center md:justify-start shrink-0">
              <ScoreRing score={percentage} />
            </div>

            {/* Stats Grid */}
            <div className="flex-1 grid grid-cols-2 gap-3 sm:gap-4">
              {/* Correct */}
              <div className="bg-chart-2/8 border border-chart-2/15 rounded-xl p-3.5 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-chart-2/15 rounded-lg">
                    <Check className="w-3.5 h-3.5 text-chart-2" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Correct</span>
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{correctCount}</p>
              </div>

              {/* Incorrect */}
              <div className="bg-destructive/5 border border-destructive/15 rounded-xl p-3.5 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-destructive/15 rounded-lg">
                    <X className="w-3.5 h-3.5 text-destructive" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Incorrect</span>
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{incorrectCount}</p>
              </div>

              {/* Time */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-3.5 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Time</span>
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {Math.floor(localAttempt.timeSpent / 60)}
                  <span className="text-sm text-muted-foreground font-medium">m </span>
                  {Math.round(localAttempt.timeSpent % 60)}
                  <span className="text-sm text-muted-foreground font-medium">s</span>
                </p>
              </div>

              {/* Accuracy */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-3.5 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Target className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Accuracy</span>
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {correctCount}<span className="text-sm text-muted-foreground font-medium">/{localAttempt.totalQuestions}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Retry Stats Banner — learn mode only */}
          {quiz.mode === 'learn' && questionsWithRetries > 0 && (
            <div className="border-t border-border px-5 sm:px-6 py-3.5 bg-chart-4/5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-chart-4/15 rounded-lg">
                  <RotateCcw className="w-3.5 h-3.5 text-chart-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {questionsWithRetries} question{questionsWithRetries > 1 ? 's' : ''} retried
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {questionsImprovedInRetry} mastered on retry
                  </p>
                </div>
              </div>
              <span className="text-lg font-bold text-chart-4 tabular-nums">{questionsImprovedInRetry}</span>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Action Buttons */}
      <motion.div variants={fadeUp} className="flex gap-3 mb-8">
        <Button
          onClick={() => router.push(`/quizzes/${quiz.id}`)}
          className="flex-1 h-11 rounded-xl font-semibold shadow-sm shadow-primary/15"
        >
          <RotateCcw className="w-4 h-4" />
          Retry Quiz
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
          className="flex-1 h-11 rounded-xl font-semibold"
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Button>
      </motion.div>

      {/* Question Review */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-foreground">Question Review</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
            {quiz.questions.length} questions
          </span>
        </div>

        {quiz.questions.map((q, idx) => {
          const answer = localAttempt.answers[q.id]
          const isCorrect = answer?.isCorrect
          const isExpanded = expandedQuestion === q.id
          const isOverriding = overridingQuestions.has(q.id)

          return (
            <motion.div
              key={q.id}
              variants={fadeUp}
              className="group"
            >
              <Card className={`overflow-hidden transition-colors ${!isCorrect ? 'border-destructive/20' : ''}`}>
                {/* Question Row */}
                <button
                  onClick={() => toggleExpand(q.id)}
                  className="w-full p-3.5 sm:p-4 flex items-center gap-3 text-left hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  {/* Status Icon */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    isCorrect
                      ? 'bg-chart-2/15 text-chart-2'
                      : 'bg-destructive/15 text-destructive'
                  }`}>
                    {isCorrect
                      ? <Check className="w-4 h-4" />
                      : <X className="w-4 h-4" />
                    }
                  </div>

                  {/* Question Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">Q{idx + 1}</span>
                      {quiz.mode === 'learn' && answer?.hasRetries && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                          {answer.firstAttemptCorrect ? 'Practice' : 'Mastered'}
                        </Badge>
                      )}
                      {quiz.mode === 'learn' && answer?.totalAttempts && answer.totalAttempts > 1 && (
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {answer.totalAttempts} attempts
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                      {q.questionText.replace(/___/g, '...')}
                    </p>
                  </div>

                  {/* Expand Chevron */}
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                  >
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                </button>

                {/* Expanded Detail */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-border space-y-4">
                        {/* Full Question */}
                        <p className="text-sm text-foreground font-medium leading-relaxed pt-3">
                          {q.questionText}
                        </p>

                        {/* Answer Comparison */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className={`p-3 rounded-xl border text-sm ${
                            isCorrect
                              ? 'bg-chart-2/5 border-chart-2/20'
                              : 'bg-destructive/5 border-destructive/20'
                          }`}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                              Your Answer
                            </p>
                            <p className="font-medium text-foreground leading-snug">
                              {answer?.userAnswer || "Skipped"}
                            </p>
                          </div>
                          <div className="p-3 rounded-xl border border-border bg-muted/50 text-sm">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                              Correct Answer
                            </p>
                            <p className="font-medium text-foreground leading-snug">
                              {q.correctAnswer}
                            </p>
                          </div>
                        </div>

                        {/* AI Confidence Score */}
                        {answer?.score !== undefined &&
                         (q.type === 'short_answer' || q.type === 'fill_blank') && (
                          <div className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-xl">
                            <div className="relative w-9 h-9 shrink-0">
                              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-border)" strokeWidth="3" />
                                <circle
                                  cx="18" cy="18" r="14" fill="none"
                                  stroke={answer.score >= 70 ? 'var(--color-chart-2)' : answer.score >= 40 ? 'var(--color-chart-4)' : 'var(--color-destructive)'}
                                  strokeWidth="3"
                                  strokeDasharray={`${(answer.score / 100) * 87.96} 87.96`}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums">
                                {answer.score}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-foreground">AI Confidence</p>
                              <p className="text-[11px] text-muted-foreground">{answer.score}/100 match score</p>
                            </div>
                          </div>
                        )}

                        {/* Explanation */}
                        <div className="flex gap-3 p-3.5 bg-primary/5 border border-primary/10 rounded-xl">
                          <div className="p-1.5 bg-primary/10 rounded-lg h-fit shrink-0 mt-0.5">
                            <Lightbulb className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground mb-1">Explanation</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {q.explanation}
                            </p>
                          </div>
                        </div>

                        {/* Override Button */}
                        {!isCorrect && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOverrideAnswer(q.id)}
                            disabled={isOverriding}
                            className="border-chart-4/40 text-chart-4 hover:bg-chart-4/10 hover:text-chart-4"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            {isOverriding ? "Overriding..." : "Mark as Correct"}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
