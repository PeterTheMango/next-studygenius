import React, { useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { DocumentMeta } from '../types';
import { useToast } from './ui/Toast';

interface FileUploadProps {
  onDocumentProcessed: (doc: DocumentMeta) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDocumentProcessed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { showToast } = useToast();

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
    if (file.type !== 'application/pdf') {
      showToast('Only PDF files are supported', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showToast('File size must be less than 10MB', 'error');
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      // 1. Convert to Base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
            const base64 = e.target?.result as string;
            setProgress(40);

            // 2. Extract basic meta/topics via Gemini
            const topics = await GeminiService.extractTopics(base64);
            setProgress(90);

            const newDoc: DocumentMeta = {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            topics,
            uploadedAt: new Date().toISOString(),
            base64Data: base64
            };

            setProgress(100);
            setTimeout(() => {
            onDocumentProcessed(newDoc);
            setIsProcessing(false);
            setProgress(0);
            showToast('Document processed successfully', 'success');
            }, 500);
        } catch (err) {
            console.error(err);
            setIsProcessing(false);
            showToast('Failed to analyze document content', 'error');
        }
      };
      reader.onerror = () => {
        setIsProcessing(false);
        showToast('Error reading file', 'error');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      showToast('Unexpected error during upload', 'error');
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
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-blue-600">
                AI
              </div>
            </div>
            <p className="mt-4 text-lg font-medium text-slate-700">Analyzing Document...</p>
            <p className="text-sm text-slate-500 mt-1">Extracting topics & preparing content</p>
            <div className="w-64 h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
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
};