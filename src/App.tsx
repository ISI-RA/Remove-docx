/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, DragEvent, ChangeEvent, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Download, Settings2, Trash2, Loader2, History, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CleanOptions {
  removeManualPageBreaks: boolean;
  removeTrailingEmptyParagraphs: boolean;
  removeConsecutiveEmptyParagraphs: boolean;
  normalizeSectionBreaks: boolean;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [options, setOptions] = useState<CleanOptions>({
    removeManualPageBreaks: true,
    removeTrailingEmptyParagraphs: true,
    removeConsecutiveEmptyParagraphs: true,
    normalizeSectionBreaks: false,
  });
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.docx')) {
      setFile(droppedFile);
      setError(null);
      setResultUrl(null);
    } else {
      setError('Please upload a valid .docx file.');
    }
  }, []);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.docx')) {
      setFile(selectedFile);
      setError(null);
      setResultUrl(null);
    } else {
      setError('Please upload a valid .docx file.');
    }
  };

  const handleClean = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('removeManualPageBreaks', String(options.removeManualPageBreaks));
    formData.append('removeTrailingEmptyParagraphs', String(options.removeTrailingEmptyParagraphs));
    formData.append('removeConsecutiveEmptyParagraphs', String(options.removeConsecutiveEmptyParagraphs));
    formData.append('normalizeSectionBreaks', String(options.normalizeSectionBreaks));

    try {
      const response = await fetch('/api/clean', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setResultUrl(url);
      fetchHistory(); // Refresh history after success
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResultUrl(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <FileText className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Docx Cleaner</h1>
          </motion.div>
          <p className="text-muted-foreground text-lg max-w-xl">
            Professional tool to remove empty pages and redundant spaces from your Word documents while keeping your formatting intact.
          </p>
        </header>

        <main className="grid gap-8">
          {/* Upload Section */}
          <section>
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={`
                    relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all duration-200
                    ${isDragging ? 'border-black bg-black/5' : 'border-black/10 bg-white'}
                  `}
                >
                  <input
                    type="file"
                    accept=".docx"
                    onChange={onFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-6">
                    <Upload className="w-8 h-8 text-black/40" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Drop your .docx file here</h3>
                  <p className="text-muted-foreground">or click to browse from your computer</p>
                </motion.div>
              ) : (
                <motion.div
                  key="file-ready"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                        <FileText className="text-emerald-600 w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">{file.name}</h3>
                        <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button 
                      onClick={reset}
                      className="p-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Options */}
                  <div className="space-y-6 mb-8">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-black/40">
                      <Settings2 className="w-4 h-4" />
                      Cleaning Options
                    </div>
                    <div className="grid gap-4">
                      {[
                        { id: 'removeManualPageBreaks', label: 'Remove manual page breaks in empty paragraphs' },
                        { id: 'removeTrailingEmptyParagraphs', label: 'Strip trailing empty paragraphs' },
                        { id: 'removeConsecutiveEmptyParagraphs', label: 'Remove consecutive empty paragraphs' },
                        { id: 'normalizeSectionBreaks', label: 'Normalize section breaks (experimental)', disabled: true },
                      ].map((opt) => (
                        <label 
                          key={opt.id} 
                          className={`flex items-center justify-between p-4 rounded-2xl border border-black/5 hover:bg-black/[0.02] cursor-pointer transition-colors ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span className="text-sm font-medium">{opt.label}</span>
                          <input
                            type="checkbox"
                            checked={options[opt.id as keyof CleanOptions]}
                            disabled={opt.disabled}
                            onChange={(e) => setOptions(prev => ({ ...prev, [opt.id]: e.target.checked }))}
                            className="w-5 h-5 rounded border-black/20 text-black focus:ring-black"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4">
                    {!resultUrl ? (
                      <button
                        onClick={handleClean}
                        disabled={isProcessing}
                        className="flex-1 bg-black text-white py-4 rounded-2xl font-medium hover:bg-black/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            Clean Document
                          </>
                        )}
                      </button>
                    ) : (
                      <a
                        href={resultUrl}
                        download={`cleaned_${file.name}`}
                        className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-medium hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        Download Cleaned File
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Activity Section */}
          <section className="mt-12">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-black/40 mb-6">
              <History className="w-4 h-4" />
              Recent Activity
            </div>
            <div className="bg-white border border-black/5 rounded-3xl overflow-hidden shadow-sm">
              {history.length > 0 ? (
                <div className="divide-y divide-black/5">
                  {history.map((item, idx) => (
                    <motion.div 
                      key={item.id || idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 flex items-center justify-between hover:bg-black/[0.01] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black/5 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-black/60" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.filename}</p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(item.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {item.options && JSON.parse(item.options).removeManualPageBreaks && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-medium rounded-full">Breaks</span>
                        )}
                        {item.options && JSON.parse(item.options).removeTrailingEmptyParagraphs && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-medium rounded-full">Trailing</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-sm text-muted-foreground italic">No recent activity found.</p>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-black/5 text-center">
          <p className="text-sm text-muted-foreground">
            Built for production-ready document processing. All files are processed in memory and never stored.
          </p>
        </footer>
      </div>
    </div>
  );
}

