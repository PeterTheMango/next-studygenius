"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, RefreshCw, AlertTriangle } from "lucide-react";

const GENERATION_STAGES = [
  { key: "queued", label: "Preparing..." },
  { key: "generating", label: "Generating questions from your document..." },
  { key: "cleaning", label: "Validating questions..." },
  { key: "structuring", label: "Checking difficulty distribution..." },
  { key: "finalizing", label: "Saving your quiz..." },
] as const;

const ACTIVE_STATUSES = new Set([
  "queued",
  "generating",
  "cleaning",
  "structuring",
  "finalizing",
]);

interface QuizStatus {
  status: string;
  generation_stage: string | null;
  error_message: string | null;
  error_stage: string | null;
  question_count: number | null;
}

export default function GeneratingPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const [quizStatus, setQuizStatus] = useState<QuizStatus | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/quizzes/${quizId}/status`);
      if (!res.ok) {
        setError("Failed to fetch quiz status");
        return;
      }
      const data: QuizStatus = await res.json();
      setQuizStatus(data);

      if (data.status === "ready") {
        // Brief delay to show completion, then redirect
        setTimeout(() => {
          router.push(`/quizzes/${quizId}`);
        }, 1000);
      }
    } catch {
      setError("Failed to connect to server");
    }
  }, [quizId, router]);

  useEffect(() => {
    fetchStatus();

    const interval = setInterval(() => {
      if (quizStatus && !ACTIVE_STATUSES.has(quizStatus.status)) return;
      fetchStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchStatus, quizStatus]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/retry`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Retry failed");
        return;
      }
      // Reset state and start polling again
      setQuizStatus({ status: "queued", generation_stage: "queued", error_message: null, error_stage: null, question_count: null });
      setError(null);
    } catch {
      setError("Failed to retry");
    } finally {
      setIsRetrying(false);
    }
  };

  const currentStageIndex = GENERATION_STAGES.findIndex(
    (s) => s.key === (quizStatus?.status || quizStatus?.generation_stage)
  );

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Generating Your Quiz</h1>
        <p className="text-slate-500">This usually takes 30-120 seconds</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        {/* Stage Steps */}
        <div className="space-y-4">
          {GENERATION_STAGES.map((stage, index) => {
            const isComplete = quizStatus?.status === "ready" || (currentStageIndex > index);
            const isCurrent = currentStageIndex === index && ACTIVE_STATUSES.has(quizStatus?.status ?? "");
            const isFailed = quizStatus?.status === "failed" && quizStatus?.error_stage === stage.key;

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
                    : "bg-slate-50 border border-transparent"
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
                    <div className="w-6 h-6 rounded-full border-2 border-slate-300" />
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
                      : "text-slate-400"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}

          {/* Ready state */}
          {quizStatus?.status === "ready" && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
              <span className="font-medium text-green-800">
                Quiz ready! Redirecting... ({quizStatus.question_count} questions)
              </span>
            </div>
          )}
        </div>

        {/* Failed state */}
        {quizStatus?.status === "failed" && (
          <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-800 mb-1">Generation Failed</h3>
                <p className="text-sm text-red-700 mb-4">
                  {quizStatus.error_message || "An unexpected error occurred during quiz generation."}
                </p>
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isRetrying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {isRetrying ? "Retrying..." : "Retry Generation"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Connection error */}
        {error && quizStatus?.status !== "failed" && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            {error}. Retrying...
          </div>
        )}
      </div>
    </div>
  );
}
