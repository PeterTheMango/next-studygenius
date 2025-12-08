"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function UploadZone() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are supported");
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit from API
      toast.error("File size must be less than 50MB");
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      // Upload file
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.error || "Upload failed");
      }

      const { document } = await uploadRes.json();
      setProgress(50);
      setUploading(false);
      setProcessing(true);

      // Process document
      const processRes = await fetch("/api/documents/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: document.id }),
      });

      setProgress(90);

      if (!processRes.ok) {
        const error = await processRes.json();
        throw new Error(error.error || "Processing failed");
      }

      setProgress(100);
      toast.success("Document processed successfully");

      setTimeout(() => {
        router.push(`/documents/${document.id}`);
        // Reset state
        setProcessing(false);
        setProgress(0);
      }, 500);

    } catch (error: any) {
      toast.error(error.message || "Unexpected error during upload");
      setUploading(false);
      setProcessing(false);
      setProgress(0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const isBusy = uploading || processing;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ease-in-out ${
          isDragging
            ? 'border-blue-500 bg-blue-50 scale-[1.02]'
            : 'border-slate-300 hover:border-slate-400 bg-white'
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".pdf"
          onChange={handleChange}
          disabled={isBusy}
        />

        {isBusy ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-blue-600">
                AI
              </div>
            </div>
            <p className="mt-4 text-lg font-medium text-slate-700">
                {uploading ? "Uploading..." : "Analyzing Document..."}
            </p>
            <p className="text-sm text-slate-500 mt-1">Extracting topics & preparing content</p>
            <div className="w-64 h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center group">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              Upload Study Material
            </h3>
            <p className="text-slate-500 mb-6 max-w-sm">
              Drag & drop your PDF lecture notes, textbooks, or papers here.
            </p>
            <span className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors">
              Select PDF File
            </span>
          </label>
        )}
      </div>
    </div>
  );
}

