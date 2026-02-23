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

  return (
    <div className={`flex items-center gap-2 font-mono text-lg font-bold ${secondsLeft < 60 ? 'text-red-500' : 'text-foreground'}`}>
      <Clock className="w-5 h-5" />
      {formatTime(secondsLeft)}
    </div>
  );
}
