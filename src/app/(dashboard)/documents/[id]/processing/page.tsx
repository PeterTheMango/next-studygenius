"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { ProcessingStages } from "@/components/shared/processing-stages";

const PROCESSING_STAGES = [
  { key: "extracting", label: "Extracting pages from PDF..." },
  { key: "filtering", label: "Filtering and cleaning content..." },
  { key: "analyzing", label: "Analyzing topics..." },
  { key: "finalizing", label: "Saving results..." },
] as const;

const ACTIVE_STATUSES = new Set(["pending", "processing"]);

interface DocumentStatus {
  status: string;
  processing_stage: string | null;
  error_message: string | null;
  error_stage: string | null;
  file_name: string | null;
}

export default function DocumentProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  const [docStatus, setDocStatus] = useState<DocumentStatus | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/status`);
      if (!res.ok) {
        setError("Failed to fetch document status");
        return;
      }
      const data: DocumentStatus = await res.json();
      setDocStatus(data);

      if (data.status === "ready") {
        setTimeout(() => {
          router.push(`/documents/${documentId}`);
        }, 1000);
      }
    } catch {
      setError("Failed to connect to server");
    }
  }, [documentId, router]);

  useEffect(() => {
    fetchStatus();

    const interval = setInterval(() => {
      if (docStatus && !ACTIVE_STATUSES.has(docStatus.status)) return;
      fetchStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchStatus, docStatus]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/retry`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Retry failed");
        return;
      }
      setDocStatus({
        status: "processing",
        processing_stage: "extracting",
        error_message: null,
        error_stage: null,
        file_name: docStatus?.file_name ?? null,
      });
      setError(null);
    } catch {
      setError("Failed to retry");
    } finally {
      setIsRetrying(false);
    }
  };

  // Map processing_stage to the stage key for the component
  const currentStatus = useMemo(() => {
    if (!docStatus) return null;
    if (docStatus.status === "ready") return "ready";
    if (docStatus.status === "failed") return "failed";
    return docStatus.processing_stage;
  }, [docStatus]);

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Processing Your Document
        </h1>
        <p className="text-muted-foreground">
          {docStatus?.file_name
            ? `Analyzing "${docStatus.file_name}"...`
            : "This usually takes 30-120 seconds"}
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
        <ProcessingStages
          stages={[...PROCESSING_STAGES]}
          currentStatus={currentStatus}
          currentStage={docStatus?.processing_stage ?? null}
          errorStage={docStatus?.error_stage ?? null}
          activeStatuses={new Set([
            "extracting",
            "filtering",
            "analyzing",
            "finalizing",
          ])}
          completedStatus="ready"
          failedStatus="failed"
          completionMessage="Document ready! Redirecting..."
        />

        {/* Failed state */}
        {docStatus?.status === "failed" && (
          <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-800 mb-1">
                  Processing Failed
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  {docStatus.error_message ||
                    "An unexpected error occurred during document processing."}
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
                  {isRetrying ? "Retrying..." : "Retry Processing"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Connection error */}
        {error && docStatus?.status !== "failed" && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            {error}. Retrying...
          </div>
        )}
      </div>
    </div>
  );
}
