"use client"

import Link from "next/link"
import { CheckCircle, XCircle, Clock, Trophy } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface ResultsSummaryProps {
  score: number
  totalQuestions: number
  correctAnswers: number
  timeSpent: number // in seconds
  quizId: string
}

export function ResultsSummary({
  score,
  totalQuestions,
  correctAnswers,
  timeSpent,
  quizId,
}: ResultsSummaryProps) {
  const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 bg-primary/10 p-4 rounded-full w-fit">
          <Trophy className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-3xl font-bold">Quiz Complete!</CardTitle>
        <p className="text-muted-foreground">Here's how you did</p>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="text-center">
          <div className="text-5xl font-bold mb-2">{percentage}%</div>
          <Progress value={percentage} className="h-3" />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/20">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <div className="font-semibold text-green-600">{correctAnswers}</div>
            <div className="text-sm text-muted-foreground">Correct</div>
          </div>
          <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/20">
            <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
            <div className="font-semibold text-red-600">{totalQuestions - correctAnswers}</div>
            <div className="text-sm text-muted-foreground">Incorrect</div>
          </div>
          <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900/20">
            <Clock className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="font-semibold text-blue-600">{formatTime(timeSpent)}</div>
            <div className="text-sm text-muted-foreground">Time</div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center gap-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
        <Button asChild>
          <Link href={`/quizzes/${quizId}`}>Retake Quiz</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
