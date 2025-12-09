"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, PlayCircle, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

interface ResumeQuizBannerProps {
  attemptId: string;
  quizId: string;
  answeredCount: number;
  totalQuestions: number;
  lastAnsweredAt: string;
  onResume: () => void;
  onRestart: () => void;
}

export function ResumeQuizBanner({
  attemptId,
  quizId,
  answeredCount,
  totalQuestions,
  lastAnsweredAt,
  onResume,
  onRestart,
}: ResumeQuizBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  if (isDismissed) return null;

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const handleRestart = async () => {
    const confirmed = confirm(
      `Are you sure you want to start a new attempt? Your progress (${answeredCount}/${totalQuestions} questions) will be lost.`
    );

    if (!confirmed) return;

    setIsRestarting(true);
    try {
      // Call API to abandon current attempt and create new one
      const res = await fetch(`/api/quizzes/${quizId}/abandon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });

      if (!res.ok) {
        throw new Error("Failed to restart quiz");
      }

      toast.success("Starting fresh attempt...");
      onRestart();
    } catch (error) {
      console.error("Restart error:", error);
      toast.error("Failed to restart quiz. Please try again.");
      setIsRestarting(false);
    }
  };

  return (
    <Card className="bg-blue-500/10 border-blue-500 p-4 mb-6 relative">
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-2 right-2 p-1 hover:bg-blue-500/20 rounded"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-blue-500" />
      </button>

      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-blue-500">Resume In-Progress Quiz</p>
          <p className="text-sm text-muted-foreground mt-1">
            You have an unfinished attempt with <strong>{answeredCount}/{totalQuestions}</strong> questions answered.
            Last activity was <strong>{formatTimeAgo(lastAnsweredAt)}</strong>.
          </p>
          <div className="flex gap-3 mt-3">
            <Button
              onClick={onResume}
              size="sm"
              className="bg-blue-500 hover:bg-blue-600"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Resume Progress
            </Button>
            <Button
              onClick={handleRestart}
              size="sm"
              variant="outline"
              disabled={isRestarting}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {isRestarting ? "Restarting..." : "Start Fresh"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
