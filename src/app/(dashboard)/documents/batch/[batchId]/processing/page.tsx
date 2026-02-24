"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  FileText,
} from "lucide-react";

interface BatchDocument {
  id: string;
  file_name: string;
  status: string;
  processing_stage: string | null;
  error_message: string | null;
  error_stage: string | null;
}

interface BatchStatus {
  batch: {
    id: string;
    status: string;
    total_count: number;
    completed_count: number;
    failed_count: number;
    created_at: string;
    completed_at: string | null;
  };
  documents: BatchDocument[];
}

const ACTIVE_BATCH_STATUSES = new Set(["processing"]);

export default function BatchProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.batchId as string;

  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryingDocs, setRetryingDocs] = useState<Set<string>>(new Set());

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/batch/${batchId}/status`);
      if (!res.ok) {
        setError("Failed to fetch batch status");
        return;
      }
      const data: BatchStatus = await res.json();
      setBatchStatus(data);
    } catch {
      setError("Failed to connect to server");
    }
  }, [batchId]);

  useEffect(() => {
    fetchStatus();

    const interval = setInterval(() => {
      if (
        batchStatus &&
        !ACTIVE_BATCH_STATUSES.has(batchStatus.batch.status)
      )
        return;
      fetchStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchStatus, batchStatus]);

  const handleRetryDocument = async (docId: string) => {
    setRetryingDocs((prev) => new Set(prev).add(docId));
    try {
      const res = await fetch(`/api/documents/${docId}/retry`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Retry failed");
      }
      // Re-fetch to get updated status
      await fetchStatus();
    } catch {
      setError("Failed to retry document");
    } finally {
      setRetryingDocs((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    }
  };

  const batch = batchStatus?.batch;
  const documents = batchStatus?.documents ?? [];
  const progressCount = batch
    ? batch.completed_count + batch.failed_count
    : 0;
  const progressPercent = batch
    ? Math.round((progressCount / Math.max(batch.total_count, 1)) * 100)
    : 0;

  const isBatchDone =
    batch?.status === "completed" ||
    batch?.status === "partial" ||
    batch?.status === "failed";

  return (
    <div className="max-w-3xl mx-auto py-16 px-4">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Processing Documents
        </h1>
        <p className="text-muted-foreground">
          {batch
            ? `${progressCount} of ${batch.total_count} files processed`
            : "Loading..."}
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
        {/* Overall progress bar */}
        {batch && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Overall Progress
              </span>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {progressPercent}%
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  batch.status === "failed"
                    ? "bg-red-500"
                    : batch.status === "partial"
                    ? "bg-yellow-500"
                    : batch.status === "completed"
                    ? "bg-green-500"
                    : "bg-primary"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Per-file status rows */}
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center gap-4 p-4 rounded-xl border ${
                doc.status === "ready"
                  ? "bg-green-50 border-green-200"
                  : doc.status === "failed"
                  ? "bg-red-50 border-red-200"
                  : doc.status === "processing"
                  ? "bg-blue-50 border-blue-200"
                  : "bg-muted border-transparent"
              }`}
            >
              <div className="shrink-0">
                {doc.status === "ready" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : doc.status === "failed" ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : doc.status === "processing" ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {doc.file_name}
                </p>
                {doc.status === "processing" && doc.processing_stage && (
                  <p className="text-xs text-blue-600 capitalize">
                    {doc.processing_stage}...
                  </p>
                )}
                {doc.status === "failed" && doc.error_message && (
                  <p className="text-xs text-red-600 truncate">
                    {doc.error_message}
                  </p>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {doc.status === "ready" && (
                  <button
                    onClick={() => router.push(`/documents/${doc.id}`)}
                    className="text-xs text-green-700 hover:text-green-800 font-medium underline underline-offset-2"
                  >
                    View
                  </button>
                )}
                {doc.status === "failed" && (
                  <button
                    onClick={() => handleRetryDocument(doc.id)}
                    disabled={retryingDocs.has(doc.id)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {retryingDocs.has(doc.id) ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Batch completion summary */}
        {isBatchDone && (
          <div className="mt-8">
            {batch?.status === "completed" && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-green-800">
                  All {batch.total_count} documents processed successfully!
                </p>
              </div>
            )}
            {batch?.status === "partial" && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
                <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="font-semibold text-yellow-800">
                  {batch.completed_count} of {batch.total_count} documents
                  processed.{" "}
                  {batch.failed_count} failed — use retry buttons above.
                </p>
              </div>
            )}
            {batch?.status === "failed" && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="font-semibold text-red-800">
                  All documents failed to process. Please try again.
                </p>
              </div>
            )}

            <button
              onClick={() => router.push("/documents")}
              className="mt-4 w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              Go to Documents
            </button>
          </div>
        )}

        {/* Connection error */}
        {error && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            {error}. Retrying...
          </div>
        )}
      </div>
    </div>
  );
}
