import React, { useState } from 'react';
import { IEmailJob } from '../types';
import {
  ArrowLeft,
  Star,
  Archive,
  Trash2,
  ChevronDown,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';

interface EmailDetailViewProps {
  email: IEmailJob;
  onBack: () => void;
  onPreviewEthereal?: (url: string, subject: string) => void;
  onDelete?: (id: string) => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({
  email,
  onBack,
  onPreviewEthereal,
  onDelete,
}) => {
  const [isStarred, setIsStarred] = useState(false);
  const [showRecipientDetails, setShowRecipientDetails] = useState(false);

  const senderName = email.senderAccount?.name || 'Amanda Clark';
  const senderEmail = email.senderAccount?.email || 'sender@example.com';
  const senderInitial = (senderName.charAt(0) || 'A').toUpperCase();

  let formattedDate = 'Nov 3, 10:23 AM';
  try {
    const rawDate = email.sentAt || email.scheduledAt || new Date().toISOString();
    formattedDate = format(new Date(rawDate), 'MMM d, h:mm a');
  } catch (e) {}

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 text-gray-700 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to email list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-gray-900 truncate">
            {email.subject || 'Oliver, hello there!'} | MJWYT44 BM#52W01
          </h1>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsStarred(!isStarred)}
            className="p-2 text-gray-400 hover:text-amber-400 rounded-lg transition"
            title={isStarred ? 'Unstar' : 'Star'}
          >
            <Star
              className={`w-4 h-4 ${
                isStarred ? 'text-amber-400 fill-amber-400' : 'text-gray-400'
              }`}
            />
          </button>

          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-700 rounded-lg transition"
            title="Archive"
          >
            <Archive className="w-4 h-4" />
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(email.id)}
              className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition"
              title="Delete email"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {email.previewUrl && onPreviewEthereal && (
            <button
              type="button"
              onClick={() => onPreviewEthereal(email.previewUrl!, email.subject)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EAF6ED] text-[#00A651] hover:bg-[#dcf0e1] text-xs font-semibold transition ml-2"
              title="Open real rendered Ethereal fake SMTP email"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ethereal Preview</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Email Content */}
      <div className="p-6 sm:p-8 max-w-4xl space-y-6">
        {/* Sender Info Row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Green Avatar with Initial */}
            <div className="w-9 h-9 rounded-full bg-[#00A651] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
              {senderInitial}
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-gray-900">{senderName}</span>
                <span className="text-xs text-gray-500 font-normal">&lt;{senderEmail}&gt;</span>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRecipientDetails(!showRecipientDetails)}
                  className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700"
                >
                  <span>to me</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showRecipientDetails && (
                  <div className="absolute top-full left-0 mt-1 p-3 bg-white border border-gray-100 rounded-xl shadow-lg text-xs space-y-1 z-20 min-w-[240px]">
                    <div><strong className="text-gray-700">From:</strong> {senderEmail}</div>
                    <div><strong className="text-gray-700">To:</strong> {email.recipientEmail}</div>
                    <div><strong className="text-gray-700">Date:</strong> {formattedDate}</div>
                    <div><strong className="text-gray-700">Status:</strong> {email.status}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-400 font-normal">
            {formattedDate}
          </div>
        </div>

        {/* Email Body Content */}
        <div className="space-y-4 text-xs text-gray-800 leading-relaxed font-sans pt-2">
          {email.bodyText ? (
            <div
              className="prose max-w-none text-xs leading-relaxed"
              dangerouslySetInnerHTML={{ __html: email.bodyText }}
            />
          ) : (
            <>
              <p>Hey Oliver,</p>
              <p>You&apos;ve just RECEIVED something</p>

              {/* Highlight Callout Box */}
              <div className="p-4 rounded-lg bg-[#FEFCE8] border border-[#FEF08A] text-gray-900 font-medium space-y-1.5 shadow-sm my-4">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span>⚡</span>
                  <span>Extremely Exclusive—Only 4 Spots Worldwide Per Year | $25,000 investment</span>
                  <span>⚡</span>
                </div>
                <div className="text-[11px] text-gray-700">
                  ⚡ To explore securing your private transformation, simply reply right now with <strong className="text-black">&quot;FLY OUT FIX&quot;</strong> .
                </div>
              </div>

              <p>Your coach for world-class performance,</p>
              <p className="font-semibold text-gray-900">Grant</p>
              <p className="italic text-gray-600">P.S. Always remember that you can develop world class technique! 🚀</p>
            </>
          )}

          {/* Attachments Section */}
          <div className="pt-6 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-900 mb-3">
              Attachments (2 files)
            </div>
            <div className="flex flex-wrap gap-4">
              {/* Attachment 1 */}
              <div className="w-48 bg-[#F9FAFB] border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition cursor-pointer group">
                <div className="h-28 overflow-hidden bg-gray-100 flex items-center justify-center">
                  <img
                    src="/tennis_coach_1.png"
                    alt="Tennis_Coach_Profile"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-2.5">
                  <div className="text-xs font-medium text-gray-800 truncate">
                    Tennis_Coach_Profile.png
                  </div>
                  <div className="text-[10px] text-gray-400">1.2 MB</div>
                </div>
              </div>

              {/* Attachment 2 */}
              <div className="w-48 bg-[#F9FAFB] border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition cursor-pointer group">
                <div className="h-28 overflow-hidden bg-gray-100 flex items-center justify-center">
                  <img
                    src="/tennis_coach_2.png"
                    alt="Tennis_Coach_Profile2"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-2.5">
                  <div className="text-xs font-medium text-gray-800 truncate">
                    Tennis_Coach_Profile2.png
                  </div>
                  <div className="text-[10px] text-gray-400">1.2 MB</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
