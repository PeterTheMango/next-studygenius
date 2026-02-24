"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, FileUp, CheckCircle2, X, FileText } from "lucide-react";
import { toast } from "sonner";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface FileUploadState {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "confirming" | "done" | "error";
  documentId?: string;
  error?: string;
}

export function UploadZone() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const validateFiles = (fileList: File[]): File[] => {
    const valid: File[] = [];
    for (const file of fileList) {
      if (file.type !== "application/pdf") {
        toast.error(`Only PDF files are supported: ${file.name}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File size must be less than 50MB: ${file.name}`);
        continue;
      }
      valid.push(file);
    }

    if (valid.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files at once`);
      return valid.slice(0, MAX_FILES);
    }

    return valid;
  };

  const uploadSingleFile = async (file: File) => {
    setIsBusy(true);
    setFiles([{ file, progress: 10, status: "uploading" }]);

    try {
      // Step 1: Get signed URL
      const uploadRes = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.error || "Upload failed");
      }

      const { signedUrl, document } = await uploadRes.json();

      setFiles([{ file, progress: 10, status: "uploading", documentId: document.id }]);

      // Step 2: Upload via XHR
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", "application/pdf");

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const uploadProgress = 10 + Math.round((e.loaded / e.total) * 80);
            setFiles([{ file, progress: uploadProgress, status: "uploading", documentId: document.id }]);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error("Failed to upload file to storage"));
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      // Step 3: Confirm upload (fire-and-forget to Edge Function)
      setFiles([{ file, progress: 95, status: "confirming", documentId: document.id }]);

      const confirmRes = await fetch(`/api/documents/${document.id}/confirm-upload`, {
        method: "POST",
      });

      if (!confirmRes.ok) {
        const error = await confirmRes.json();
        throw new Error(error.error || "Failed to start processing");
      }

      setFiles([{ file, progress: 100, status: "done", documentId: document.id }]);

      // Step 4: Redirect to processing page
      setTimeout(() => {
        router.push(`/documents/${document.id}/processing`);
      }, 300);
    } catch (error: any) {
      toast.error(error.message || "Unexpected error during upload");
      setFiles([]);
      setIsBusy(false);
    }
  };

  const uploadMultipleFiles = async (validFiles: File[]) => {
    setIsBusy(true);
    setFiles(
      validFiles.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      }))
    );

    try {
      // Step 1: Create batch
      const batchRes = await fetch("/api/documents/upload/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: validFiles.map((f) => ({
            fileName: f.name,
            fileSize: f.size,
          })),
        }),
      });

      if (!batchRes.ok) {
        const error = await batchRes.json();
        throw new Error(error.error || "Failed to create batch");
      }

      const { batchId, files: batchFiles } = await batchRes.json();

      // Update files with document IDs
      setFiles(
        validFiles.map((file, i) => ({
          file,
          progress: 5,
          status: "uploading" as const,
          documentId: batchFiles[i]?.documentId,
        }))
      );

      // Step 2: Upload each file concurrently
      const uploadPromises = validFiles.map(async (file, i) => {
        const batchFile = batchFiles[i];
        if (!batchFile) return;

        try {
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", batchFile.signedUrl);
            xhr.setRequestHeader("Content-Type", "application/pdf");

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const progress = 5 + Math.round((e.loaded / e.total) * 80);
                setFiles((prev) =>
                  prev.map((f, j) =>
                    j === i ? { ...f, progress, status: "uploading" as const } : f
                  )
                );
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error("Upload failed"));
            };

            xhr.onerror = () => reject(new Error("Network error"));
            xhr.send(file);
          });

          // Step 3: Confirm each upload
          setFiles((prev) =>
            prev.map((f, j) =>
              j === i
                ? { ...f, progress: 90, status: "confirming" as const }
                : f
            )
          );

          await fetch(`/api/documents/${batchFile.documentId}/confirm-upload`, {
            method: "POST",
          });

          setFiles((prev) =>
            prev.map((f, j) =>
              j === i
                ? { ...f, progress: 100, status: "done" as const }
                : f
            )
          );
        } catch (err: any) {
          setFiles((prev) =>
            prev.map((f, j) =>
              j === i
                ? { ...f, status: "error" as const, error: err.message }
                : f
            )
          );
        }
      });

      await Promise.all(uploadPromises);

      // Step 4: Redirect to batch processing page
      setTimeout(() => {
        router.push(`/documents/batch/${batchId}/processing`);
      }, 500);
    } catch (error: any) {
      toast.error(error.message || "Unexpected error during batch upload");
      setFiles([]);
      setIsBusy(false);
    }
  };

  const processFiles = async (fileList: File[]) => {
    const validFiles = validateFiles(fileList);
    if (validFiles.length === 0) return;

    if (validFiles.length === 1) {
      await uploadSingleFile(validFiles[0]);
    } else {
      await uploadMultipleFiles(validFiles);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(Array.from(e.dataTransfer.files));
      }
    },
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const overallProgress =
    files.length > 0
      ? Math.round(
          files.reduce((sum, f) => sum + f.progress, 0) / files.length
        )
      : 0;

  const progressLabel = files.some((f) => f.status === "uploading")
    ? "Uploading documents..."
    : files.every((f) => f.status === "done")
    ? "Complete!"
    : files.some((f) => f.status === "confirming")
    ? "Starting processing..."
    : "Preparing...";

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative overflow-hidden rounded-2xl border-2 border-dashed
          transition-all duration-300 ease-out
          ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/10"
              : "border-border bg-card hover:border-primary/40 hover:bg-card/80"
          }
        `}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.02] pointer-events-none" />

        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".pdf"
          multiple
          onChange={handleChange}
          disabled={isBusy}
        />

        {isBusy ? (
          <div className="relative flex flex-col items-center justify-center px-6 py-10 sm:py-14">
            {/* Animated processing indicator */}
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-full border-[3px] border-muted flex items-center justify-center">
                {files.every((f) => f.status === "done") ? (
                  <CheckCircle2 className="w-8 h-8 text-primary animate-in zoom-in duration-300" />
                ) : (
                  <>
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <div
                      className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary animate-spin"
                      style={{ animationDuration: "1.5s" }}
                    />
                  </>
                )}
              </div>
            </div>

            <p className="text-base font-semibold text-foreground mb-1">
              {progressLabel}
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              {files.length === 1
                ? "Sending your file securely"
                : `${files.length} files`}
            </p>

            {/* Overall progress bar */}
            <div className="w-full max-w-xs mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Progress
                </span>
                <span className="text-xs font-bold text-foreground tabular-nums">
                  {overallProgress}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            {/* Per-file progress (multi-file only) */}
            {files.length > 1 && (
              <div className="w-full max-w-xs space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 text-muted-foreground">
                      {f.file.name}
                    </span>
                    {f.status === "done" ? (
                      <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />
                    ) : f.status === "error" ? (
                      <X className="w-3 h-3 text-red-600 shrink-0" />
                    ) : (
                      <span className="tabular-nums text-muted-foreground shrink-0">
                        {f.progress}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <label
            htmlFor="file-upload"
            className="relative cursor-pointer flex flex-col sm:flex-row items-center gap-5 sm:gap-6 px-6 py-8 sm:py-10 group"
          >
            {/* Icon */}
            <div
              className={`
              shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center
              bg-primary/10 text-primary
              group-hover:bg-primary/15 group-hover:scale-105
              transition-all duration-200
            `}
            >
              <FileUp className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            {/* Text content */}
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                Upload Study Material
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Drag & drop PDFs or{" "}
                <span className="text-primary font-medium underline underline-offset-2 decoration-primary/30">
                  browse files
                </span>
                . Lecture notes, textbooks, or papers up to 50MB. Up to {MAX_FILES} files at once.
              </p>
            </div>

            {/* Upload button - desktop only */}
            <div className="hidden sm:block shrink-0">
              <span
                className="
                inline-flex items-center gap-2 px-5 py-2.5
                bg-primary text-primary-foreground
                rounded-xl font-medium text-sm
                shadow-sm shadow-primary/20
                group-hover:shadow-md group-hover:shadow-primary/25
                group-hover:bg-primary/90
                transition-all duration-200
              "
              >
                <Upload className="w-4 h-4" />
                Upload PDFs
              </span>
            </div>
          </label>
        )}
      </div>
    </div>
  );
}
