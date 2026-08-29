import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, X, ZoomIn, Upload, ClipboardCheck, Sparkles } from 'lucide-react';
import { MediaAttachment } from '../types';

interface ScreenshotUploaderProps {
  screenshot?: MediaAttachment;
  onScreenshotChange: (screenshot?: MediaAttachment) => void;
}

export const ScreenshotUploader: React.FC<ScreenshotUploaderProps> = ({
  screenshot,
  onScreenshotChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [pasteNotice, setPasteNotice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for global or focused Ctrl+V / Cmd+V paste events!
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            setPasteNotice(true);
            setTimeout(() => setPasteNotice(false), 3000);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP, etc.)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('Screenshot exceeds 15MB limit. Please attach a compressed image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onScreenshotChange({
        dataUrl,
        filename: file.name || `screenshot_${Date.now()}.png`,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString()
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div id="screenshot-uploader-container" className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
          Screenshot / Visual Evidence
        </label>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Ctrl+V</span> to paste
        </span>
      </div>

      {pasteNotice && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-xs text-indigo-200 animate-pulse">
          <ClipboardCheck className="w-4 h-4 text-indigo-400" />
          Pasted image from clipboard successfully!
        </div>
      )}

      {!screenshot ? (
        <div
          id="screenshot-dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-indigo-400 bg-indigo-500/10 scale-[0.99]'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="screenshot-file-input"
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-slate-200">
              Drop screenshot here, <span className="text-indigo-400 underline decoration-indigo-400/40 underline-offset-4">browse files</span>, or press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs">Ctrl+V</kbd>
            </div>
            <p className="text-xs text-slate-500">
              Supports PNG, JPG, GIF, WebP up to 15MB
            </p>
          </div>
        </div>
      ) : (
        <div className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60 p-3">
          <div className="relative rounded-lg overflow-hidden border border-slate-800/80 bg-slate-950 max-h-64 flex items-center justify-center">
            <img
              src={screenshot.dataUrl}
              alt="Attached screenshot preview"
              className="max-h-64 object-contain rounded cursor-pointer"
              onClick={() => setIsZoomed(true)}
            />
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                id="btn-zoom-screenshot"
                onClick={() => setIsZoomed(true)}
                className="p-2 rounded-lg bg-slate-900/90 text-slate-200 hover:text-white hover:bg-slate-800 border border-slate-700 shadow-lg text-xs flex items-center gap-1.5"
              >
                <ZoomIn className="w-4 h-4" /> Full View
              </button>
              <button
                type="button"
                id="btn-remove-screenshot"
                onClick={() => onScreenshotChange(undefined)}
                className="p-2 rounded-lg bg-rose-500/90 text-white hover:bg-rose-600 shadow-lg text-xs flex items-center gap-1.5"
              >
                <X className="w-4 h-4" /> Remove
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2.5 px-1 text-xs text-slate-400">
            <span className="truncate max-w-[220px] font-medium text-slate-300">
              {screenshot.filename}
            </span>
            <span>{(screenshot.size / 1024).toFixed(1)} KB</span>
          </div>
        </div>
      )}

      {/* Lightbox Zoom Modal */}
      {isZoomed && screenshot && (
        <div
          id="screenshot-lightbox-modal"
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute -top-12 right-0 p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={screenshot.dataUrl}
              alt="Screenshot full preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl border border-slate-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-3 text-xs text-slate-400 font-mono">
              {screenshot.filename} • {(screenshot.size / 1024).toFixed(1)} KB
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
