"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  const handleRestart = async () => {
    const confirmed = confirm(
      `Are you sure you want to start a new attempt? Your progress (${answeredCount}/${totalQuestions} questions) will be lost.`
    );

    if (!confirmed) return;

    setIsRestarting(true);
    try {
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

  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <Card className="bg-chart-2/8 border-chart-2/25 p-4 sm:p-5 relative overflow-hidden">
      {/* Dismiss button */}
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-2.5 right-2.5 p-1 hover:bg-chart-2/15 rounded-md transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-chart-2" />
      </button>

      <div className="flex items-start gap-3">
        <div className="p-2 bg-chart-2/15 rounded-lg shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-chart-2" />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <p className="font-semibold text-sm sm:text-base text-foreground">
            Resume In-Progress Quiz
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            You have an unfinished attempt with{" "}
            <strong className="text-foreground">
              {answeredCount}/{totalQuestions}
            </strong>{" "}
            questions answered. Last activity was{" "}
            <strong className="text-foreground">
              {formatTimeAgo(lastAnsweredAt)}
            </strong>
            .
          </p>

          {/* Progress indicator */}
          <div className="mt-3 flex items-center gap-3">
            <Progress value={progressPercent} className="h-1.5 flex-1" />
            <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
              {progressPercent}%
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
            <Button
              onClick={onResume}
              size="sm"
              className="w-full sm:w-auto gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              Resume Progress
            </Button>
            <Button
              onClick={handleRestart}
              size="sm"
              variant="outline"
              disabled={isRestarting}
              className="w-full sm:w-auto gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {isRestarting ? "Restarting..." : "Start Fresh"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
