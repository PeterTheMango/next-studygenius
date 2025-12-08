"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { BookOpen, RefreshCw, GraduationCap } from "lucide-react"
import { QuizMode } from "@/types/quiz"

interface ModeSelectorProps {
  selectedMode: QuizMode
  onSelect: (mode: QuizMode) => void
}

export function ModeSelector({ selectedMode, onSelect }: ModeSelectorProps) {
  const modes: { id: QuizMode; title: string; description: string; icon: any }[] = [
    {
      id: "learn",
      title: "Learn Mode",
      description: "Build understanding with hints and explanations.",
      icon: BookOpen,
    },
    {
      id: "revision",
      title: "Revision Mode",
      description: "Test your memory with mixed questions and no hints.",
      icon: RefreshCw,
    },
    {
      id: "test",
      title: "Test Mode",
      description: "Simulate exam conditions with time limits.",
      icon: GraduationCap,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {modes.map((mode) => (
        <Card 
          key={mode.id}
          className={`cursor-pointer transition-all hover:border-primary ${
            selectedMode === mode.id ? "border-primary bg-primary/5" : ""
          }`}
          onClick={() => onSelect(mode.id)}
        >
          <CardHeader>
            <mode.icon className={`h-8 w-8 mb-2 ${
              selectedMode === mode.id ? "text-primary" : "text-muted-foreground"
            }`} />
            <CardTitle>{mode.title}</CardTitle>
            <CardDescription>{mode.description}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
