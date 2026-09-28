import React from 'react';
import { IEmailJob } from '../types';
import { CheckCircle2, XCircle, ExternalLink, Mail, Send, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface SentTableProps {
  emails: IEmailJob[];
  loading: boolean;
  onPreview: (url: string, subject: string) => void;
}

export const SentTable: React.FC<SentTableProps> = ({
  emails,
  loading,
  onPreview,
}) => {
  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Loading sent emails...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center">
        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 text-slate-500 mb-3">
          <Send className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">No sent emails recorded yet</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Emails sent by the worker engine will appear here with live Ethereal SMTP test previews.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-surface-900/70 border-b border-surface-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <tr>
            <th className="py-3 px-4">Recipient</th>
            <th className="py-3 px-4">Subject</th>
            <th className="py-3 px-4 hidden md:table-cell">Sender Account</th>
            <th className="py-3 px-4">Sent Time</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4 text-right">Ethereal Preview</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-800/60">
          {emails.map((job) => {
            let sentFormatted = 'Just now';
            if (job.sentAt) {
              try {
                sentFormatted = format(new Date(job.sentAt), 'MMM dd, yyyy • hh:mm:ss a');
              } catch (e) {}
            }

            return (
              <tr
                key={job.id}
                className="hover:bg-surface-800/30 transition-colors group"
              >
                {/* Recipient */}
                <td className="py-3 px-4 font-medium text-white">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-3 w-3" />
                    </div>
                    <span className="truncate max-w-[180px]">{job.recipientEmail}</span>
                  </div>
                </td>

                {/* Subject */}
                <td className="py-3 px-4 text-slate-200">
                  <span className="truncate block max-w-[220px]" title={job.subject}>
                    {job.subject}
                  </span>
                </td>

                {/* Sender */}
                <td className="py-3 px-4 text-slate-400 hidden md:table-cell">
                  <span className="truncate block max-w-[160px]">
                    {job.senderAccount?.email || 'Default Sender'}
                  </span>
                </td>

                {/* Sent Time */}
                <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                  {sentFormatted}
                </td>

                {/* Status */}
                <td className="py-3 px-4">
                  {job.status === 'SENT' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Delivered (SMTP)
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-medium"
                      title={job.errorMessage || 'Failed to send'}
                    >
                      <XCircle className="h-2.5 w-2.5" />
                      Failed
                    </span>
                  )}
                </td>

                {/* Preview Link */}
                <td className="py-3 px-4 text-right">
                  {job.previewUrl ? (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => onPreview(job.previewUrl!, job.subject)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[11px] font-medium transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        Preview
                      </button>
                      <a
                        href={job.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">No preview</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
