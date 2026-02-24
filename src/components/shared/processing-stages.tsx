"use client";

import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export interface StageDefinition {
  key: string;
  label: string;
}

interface ProcessingStagesProps {
  stages: StageDefinition[];
  currentStatus: string | null;
  currentStage: string | null;
  errorStage: string | null;
  activeStatuses: Set<string>;
  completedStatus: string;
  failedStatus: string;
  completionMessage?: string;
}

export function ProcessingStages({
  stages,
  currentStatus,
  currentStage,
  errorStage,
  activeStatuses,
  completedStatus,
  failedStatus,
  completionMessage,
}: ProcessingStagesProps) {
  const currentStageIndex = stages.findIndex(
    (s) => s.key === (currentStatus || currentStage)
  );

  return (
    <div className="space-y-4">
      {stages.map((stage, index) => {
        const isComplete =
          currentStatus === completedStatus || currentStageIndex > index;
        const isCurrent =
          currentStageIndex === index &&
          activeStatuses.has(currentStatus ?? "");
        const isFailed =
          currentStatus === failedStatus && errorStage === stage.key;

        return (
          <div
            key={stage.key}
            className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
              isCurrent
                ? "bg-blue-50 border border-blue-200"
                : isComplete
                ? "bg-green-50 border border-green-200"
                : isFailed
                ? "bg-red-50 border border-red-200"
                : "bg-muted border border-transparent"
            }`}
          >
            <div className="shrink-0">
              {isComplete ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : isCurrent ? (
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              ) : isFailed ? (
                <XCircle className="w-6 h-6 text-red-600" />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />
              )}
            </div>
            <span
              className={`font-medium ${
                isCurrent
                  ? "text-blue-800"
                  : isComplete
                  ? "text-green-800"
                  : isFailed
                  ? "text-red-800"
                  : "text-muted-foreground"
              }`}
            >
              {stage.label}
            </span>
          </div>
        );
      })}

      {/* Completed state */}
      {currentStatus === completedStatus && completionMessage && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 border border-green-200">
          <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
          <span className="font-medium text-green-800">{completionMessage}</span>
        </div>
      )}
    </div>
  );
}
