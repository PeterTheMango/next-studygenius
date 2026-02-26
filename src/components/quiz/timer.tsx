"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface TimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
}

export function Timer({ totalSeconds, onTimeUp }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onTimeUp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isWarning = secondsLeft < 60;
  const isCritical = secondsLeft < 15;

  return (
    <div
      className={`flex items-center gap-2 font-mono text-sm sm:text-base font-bold px-3 py-1.5 rounded-lg border transition-colors ${
        isCritical
          ? "text-destructive bg-destructive/10 border-destructive/25 animate-pulse"
          : isWarning
          ? "text-destructive bg-destructive/5 border-destructive/15"
          : "text-foreground bg-muted border-border"
      }`}
    >
      <Clock className="w-4 h-4 shrink-0" />
      <span className="tabular-nums">{formatTime(secondsLeft)}</span>
    </div>
  );
}
