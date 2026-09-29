import React, { useState } from 'react';
import { IEmailJob } from '../types';
import { Clock, Star, Trash2, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ScheduledTableProps {
  emails: IEmailJob[];
  loading: boolean;
  onCancel: (id: string) => void;
  onSelectEmail: (job: IEmailJob) => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  emails,
  loading,
  onCancel,
  onSelectEmail,
}) => {
  const [starredMap, setStarredMap] = useState<Record<string, boolean>>({});

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStarredMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-[#00A651]" />
        <p className="text-xs">Loading scheduled emails...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <div className="p-3.5 rounded-full bg-gray-50 text-gray-400 mb-3 border border-gray-100">
          <Calendar className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-xs font-semibold text-gray-800 mb-1">No scheduled emails in queue</h3>
        <p className="text-[11px] text-gray-400 max-w-sm">
          Click "Compose" on the sidebar to schedule your outreach emails.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full divide-y divide-gray-100">
      {emails.map((job) => {
        let timeDisplay = 'Tue 9:15:12 AM';
        try {
          timeDisplay = format(new Date(job.scheduledAt), 'eee h:mm:ss a');
        } catch (e) {}

        const recipientLabel =
          (job.metadata?.name as string) ||
          job.recipientEmail.split('@')[0].replace('.', ' ').replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());

        const bodyClean = (job.bodyText || '')
          .replace(/<[^>]*>?/gm, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const isStarred = starredMap[job.id] ?? false;

        return (
          <div
            key={job.id}
            onClick={() => onSelectEmail(job)}
            className="flex items-center justify-between px-3 py-3 hover:bg-gray-50/80 transition-colors cursor-pointer group text-xs select-none"
          >
            {/* Left Content Area: Recipient + Scheduled Badge + Subject & Snippet */}
            <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
              {/* Recipient */}
              <div className="w-32 sm:w-36 flex-shrink-0 font-bold text-gray-900 truncate">
                To: {recipientLabel}
              </div>

              {/* Scheduled Badge */}
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FFF3E0] text-[#D97706] text-[11px] font-medium whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  <span>{timeDisplay}</span>
                </span>
              </div>

              {/* Subject & Snippet */}
              <div className="flex-1 min-w-0 truncate text-xs">
                <span className="font-bold text-gray-900">{job.subject}</span>
                <span className="text-gray-400 font-normal"> - {bodyClean || 'No additional content'}</span>
              </div>
            </div>

            {/* Right Action Icons: Delete/Cancel + Star */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(job.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all rounded"
                title="Cancel scheduled email"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => toggleStar(e, job.id)}
                className="p-1 text-gray-300 hover:text-amber-400 transition-colors"
                title={isStarred ? 'Unstar' : 'Star'}
              >
                <Star
                  className={`w-4 h-4 ${
                    isStarred ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                  }`}
                />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
