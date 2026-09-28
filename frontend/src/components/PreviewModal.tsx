import React from 'react';
import { X, ExternalLink, Mail } from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string;
  subject: string;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  previewUrl,
  subject,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl h-[85vh] bg-surface-900 border border-surface-700/80 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-surface-800 flex items-center justify-between bg-surface-950/60">
          <div className="flex items-center gap-2.5 truncate">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Mail className="h-4 w-4" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold text-white truncate">{subject}</h3>
              <p className="text-[11px] text-slate-400">Rendered via Ethereal Fake SMTP Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 hover:text-white text-xs font-medium border border-surface-700 transition-colors"
            >
              <span>Open in Tab</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Iframe Viewport */}
        <div className="flex-1 bg-white p-1">
          <iframe
            src={previewUrl}
            title="Ethereal Email Preview"
            className="w-full h-full border-0 rounded-b-xl"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      </div>
    </div>
  );
};
