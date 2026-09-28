import React from 'react';
import { IEmailJob } from '../types';
import { Clock, AlertTriangle, Loader2, Trash2, Calendar, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface ScheduledTableProps {
  emails: IEmailJob[];
  loading: boolean;
  onCancel: (id: string) => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  emails,
  loading,
  onCancel,
}) => {
  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        <p className="text-xs">Loading scheduled emails...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center">
        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 text-slate-500 mb-3">
          <Calendar className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">No scheduled emails in queue</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Click the "Compose Email" button to upload a lead list and schedule your outreach campaign.
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
            <th className="py-3 px-4">Scheduled For</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-800/60">
          {emails.map((job) => {
            let scheduledFormatted = 'Invalid Date';
            try {
              scheduledFormatted = format(new Date(job.scheduledAt), 'MMM dd, yyyy • hh:mm:ss a');
            } catch (e) {}

            return (
              <tr
                key={job.id}
                className="hover:bg-surface-800/30 transition-colors group"
              >
                {/* Recipient */}
                <td className="py-3 px-4 font-medium text-white">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
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

                {/* Scheduled Time */}
                <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-brand-400" />
                    <span>{scheduledFormatted}</span>
                  </div>
                </td>

                {/* Status */}
                <td className="py-3 px-4">
                  {job.status === 'RATE_LIMITED' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-medium">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Rate Limited (Staggered)
                    </span>
                  ) : job.status === 'PROCESSING' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-medium">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-medium">
                      <Clock className="h-2.5 w-2.5" />
                      Scheduled (BullMQ)
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => onCancel(job.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-surface-800/80 rounded-lg transition-colors"
                    title="Cancel scheduled job"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
