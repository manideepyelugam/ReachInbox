import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Upload,
  ChevronDown,
  RotateCcw,
  RotateCw,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Calendar,
  X,
  Plus,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import Papa from 'papaparse';
import { ISenderAccount } from '../types';
import { getSenders, createTestSender, scheduleEmail, scheduleBulkEmails } from '../services/api';
import { format, addDays, setHours, setMinutes } from 'date-fns';

interface ComposeViewProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const ComposeView: React.FC<ComposeViewProps> = ({ onBack, onSuccess }) => {
  const [senders, setSenders] = useState<ISenderAccount[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [creatingSender, setCreatingSender] = useState(false);

  // Form Fields
  const [recipientInput, setRecipientInput] = useState('recipient@example.com');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);

  // CSV Leads list
  const [parsedLeads, setParsedLeads] = useState<Array<{ email: string; name?: string }>>([]);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Send Later Popover state
  const [isSendLaterOpen, setIsSendLaterOpen] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasAttachment, setHasAttachment] = useState(true);

  useEffect(() => {
    loadSenders();
    // Default scheduled time: 2 minutes from now
    const d = new Date(Date.now() + 120000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setScheduledDateTime(d.toISOString().slice(0, 16));
  }, []);

  const loadSenders = async () => {
    try {
      const data = await getSenders();
      setSenders(data.senders);
      if (data.senders.length > 0) {
        setSelectedSenderId(data.senders[0].id);
        if (data.senders[0].hourlyLimit) {
          setHourlyLimit(data.senders[0].hourlyLimit);
        }
      }
    } catch (err) {
      console.error('Failed to load senders:', err);
    }
  };

  const handleCreateTestSender = async () => {
    setCreatingSender(true);
    try {
      const data = await createTestSender();
      setSenders((prev) => [data.sender, ...prev]);
      setSelectedSenderId(data.sender.id);
    } catch (err: any) {
      setError('Failed to create Ethereal sender: ' + err.message);
    } finally {
      setCreatingSender(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        const detected: Array<{ email: string; name?: string }> = [];

        for (const row of rows) {
          let emailVal = '';
          let nameVal = '';
          for (const [key, val] of Object.entries(row)) {
            const k = key.toLowerCase();
            const v = String(val || '').trim();
            if (k.includes('email') || k.includes('mail') || v.includes('@')) {
              if (v.includes('@')) emailVal = v;
            }
            if (k.includes('name') || k.includes('first')) {
              nameVal = v;
            }
          }
          if (emailVal && emailVal.includes('@')) {
            detected.push({ email: emailVal, name: nameVal || undefined });
          }
        }

        if (detected.length > 0) {
          setParsedLeads(detected);
        }
      },
    });
  };

  const applyPreset = (presetName: string, targetDate: Date) => {
    setSelectedPreset(presetName);
    const d = new Date(targetDate);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setScheduledDateTime(d.toISOString().slice(0, 16));
  };

  const handleSubmit = async () => {
    setError('');

    if (!subject.trim()) {
      setError('Please provide an email subject');
      return;
    }

    setLoading(true);
    try {
      const sendTimeISO = scheduledDateTime
        ? new Date(scheduledDateTime).toISOString()
        : new Date().toISOString();

      if (parsedLeads.length > 0) {
        // Bulk send
        await scheduleBulkEmails({
          leads: parsedLeads,
          subject: subject.trim(),
          bodyText: bodyText.trim() || 'Hi {{name}},\n\nJust following up on our previous discussion.',
          senderAccountId: selectedSenderId || undefined,
          startTime: sendTimeISO,
          delayBetweenEmailsSeconds: delaySeconds || 2,
          hourlyLimit: hourlyLimit || 50,
        });
      } else {
        // Single send
        if (!recipientInput || !recipientInput.includes('@')) {
          setError('Please provide a valid recipient email address');
          setLoading(false);
          return;
        }

        await scheduleEmail({
          recipientEmail: recipientInput.trim(),
          subject: subject.trim(),
          bodyText: bodyText.trim() || 'Hi,\n\nJust wanted to follow up on our previous discussion.',
          senderAccountId: selectedSenderId || undefined,
          scheduledAt: sendTimeISO,
        });
      }

      onSuccess();
      onBack();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to schedule email');
    } finally {
      setLoading(false);
    }
  };

  const selectedSender = senders.find((s) => s.id === selectedSenderId);

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto relative">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 text-gray-700 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-gray-900">Compose New Email</h1>
        </div>

        {/* Right Action Icons & Send Buttons */}
        <div className="flex items-center gap-3">
          {/* Attachment Icon */}
          <button
            type="button"
            onClick={() => setHasAttachment(!hasAttachment)}
            className={`flex items-center gap-1 p-1.5 rounded-lg transition-colors ${
              hasAttachment ? 'text-[#00A651]' : 'text-gray-400 hover:text-gray-700'
            }`}
            title="Attachments"
          >
            <Paperclip className="w-4 h-4" />
            <span className="text-[11px] font-semibold">1</span>
          </button>

          {/* Schedule Clock Icon (Opens Send Later popover) */}
          <button
            type="button"
            onClick={() => setIsSendLaterOpen(!isSendLaterOpen)}
            className={`p-1.5 rounded-lg transition-colors ${
              isSendLaterOpen ? 'text-[#00A651]' : 'text-gray-600 hover:text-black'
            }`}
            title="Schedule / Send Later"
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* Send / Send Later Pill Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-1 rounded-full border-2 border-[#00A651] text-[#00A651] hover:bg-[#00A651] hover:text-white transition-all text-xs font-semibold disabled:opacity-50"
          >
            {loading ? 'Scheduling...' : isSendLaterOpen || scheduledDateTime ? 'Send Later' : 'Send'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Compose Fields */}
      <div className="p-6 sm:p-8 max-w-4xl space-y-4">
        {/* From Field */}
        <div className="flex items-center gap-4 text-xs">
          <label className="w-12 text-gray-500 font-normal">From</label>
          <div className="relative flex items-center gap-2">
            <select
              value={selectedSenderId}
              onChange={(e) => {
                setSelectedSenderId(e.target.value);
                const s = senders.find((x) => x.id === e.target.value);
                if (s?.hourlyLimit) setHourlyLimit(s.hourlyLimit);
              }}
              className="appearance-none bg-[#F3F4F6] text-gray-800 text-xs font-medium px-3.5 py-1.5 pr-8 rounded-lg outline-none cursor-pointer border-none"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.email}
                </option>
              ))}
              {senders.length === 0 && (
                <option value="">oliver.brown@domain.io</option>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 pointer-events-none" />

            <button
              type="button"
              onClick={handleCreateTestSender}
              disabled={creatingSender}
              className="text-[11px] text-[#00A651] hover:underline flex items-center gap-1 font-medium ml-2"
            >
              <Plus className="w-3 h-3" />
              {creatingSender ? 'Creating...' : '+ Ethereal Sender'}
            </button>
          </div>
        </div>

        {/* To Field */}
        <div className="flex items-center gap-4 text-xs">
          <label className="w-12 text-gray-500 font-normal">To</label>
          <div className="flex-1 flex items-center justify-between gap-2">
            {parsedLeads.length > 0 ? (
              /* Chips Display */
              <div className="flex flex-wrap items-center gap-1.5">
                {parsedLeads.slice(0, 3).map((lead, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full border border-[#00A651] text-[#111827] bg-white text-xs"
                  >
                    {lead.email}
                  </span>
                ))}
                {parsedLeads.length > 3 && (
                  <span className="px-2.5 py-0.5 rounded-full border border-[#00A651] text-[#00A651] bg-[#EAF6ED] text-xs font-semibold">
                    +{parsedLeads.length - 3}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setParsedLeads([]);
                    setFileName('');
                  }}
                  className="text-gray-400 hover:text-red-500 p-0.5"
                  title="Clear leads"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              /* Single input */
              <input
                type="email"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1 border-none text-xs text-gray-800 placeholder-gray-400 outline-none"
              />
            )}

            {/* Upload List button */}
            <div className="flex-shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#00A651] hover:underline"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100" />

        {/* Subject Field */}
        <div className="flex items-center gap-4 text-xs">
          <label className="w-12 text-gray-500 font-normal">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 border-none text-xs text-gray-900 placeholder-gray-400 outline-none"
          />
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100" />

        {/* Delay & Hourly Limit Throttling Controls */}
        <div className="flex flex-wrap items-center gap-6 text-xs text-gray-700 py-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Delay between 2 emails</span>
            <input
              type="number"
              min="0"
              max="3600"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Number(e.target.value))}
              placeholder="00"
              className="w-12 px-2 py-1 text-center text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#00A651]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-500">Hourly Limit</span>
            <input
              type="number"
              min="1"
              max="5000"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              placeholder="00"
              className="w-12 px-2 py-1 text-center text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#00A651]"
            />
          </div>
        </div>

        {/* Rich Text Editor Box */}
        <div className="bg-[#F9FAFB] rounded-2xl p-4 border border-gray-100 min-h-[380px] flex flex-col relative">
          {/* Floating Pill Toolbar */}
          <div className="bg-white rounded-full border border-gray-200 shadow-sm px-4 py-1.5 flex flex-wrap items-center gap-3 text-gray-600 text-xs mb-3 w-fit">
            <button type="button" className="hover:text-black"><RotateCcw className="w-3.5 h-3.5" /></button>
            <button type="button" className="hover:text-black"><RotateCw className="w-3.5 h-3.5" /></button>

            <div className="h-3 w-px bg-gray-200 mx-0.5" />

            <button type="button" className="font-bold flex items-center gap-0.5 hover:text-black">
              <span>Tt</span>
              <span className="text-[9px]">↕</span>
            </button>

            <div className="h-3 w-px bg-gray-200 mx-0.5" />

            <button type="button" className="hover:text-black"><Bold className="w-3.5 h-3.5" /></button>
            <button type="button" className="hover:text-black"><Italic className="w-3.5 h-3.5" /></button>
            <button type="button" className="hover:text-black"><Underline className="w-3.5 h-3.5" /></button>

            <div className="h-3 w-px bg-gray-200 mx-0.5" />

            <button type="button" className="hover:text-black"><AlignLeft className="w-3.5 h-3.5" /></button>
            <button type="button" className="hover:text-black"><AlignCenter className="w-3.5 h-3.5" /></button>

            <div className="h-3 w-px bg-gray-200 mx-0.5" />

            <button type="button" className="hover:text-black"><ListOrdered className="w-3.5 h-3.5" /></button>
            <button type="button" className="hover:text-black"><List className="w-3.5 h-3.5" /></button>

            <div className="h-3 w-px bg-gray-200 mx-0.5" />

            <button type="button" className="hover:text-black"><Quote className="w-3.5 h-3.5" /></button>
            <button type="button" className="hover:text-black"><Strikethrough className="w-3.5 h-3.5" /></button>
          </div>

          {/* Textarea */}
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="Type Your Reply..."
            className="flex-1 w-full bg-transparent resize-none outline-none text-xs text-gray-800 leading-relaxed placeholder-gray-400 min-h-[220px]"
          />

          {/* Attachments Preview */}
          {hasAttachment && (
            <div className="pt-3 border-t border-gray-200/60 flex items-center gap-3">
              <div className="w-28 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xs">
                <div className="h-16 bg-gray-100 overflow-hidden">
                  <img
                    src="/tennis_coach_1.png"
                    alt="attachment"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-1.5 text-[10px] truncate text-gray-700 font-medium">
                  Tennis_Coach.png
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send Later Popover / Modal (Figma Frame 5) */}
      {isSendLaterOpen && (
        <div className="fixed sm:absolute top-20 right-6 w-80 bg-white border border-gray-200 rounded-2xl shadow-popover p-5 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Send Later</h3>
            <button
              type="button"
              onClick={() => setIsSendLaterOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Date & Time Picker */}
          <div className="space-y-1.5 mb-4">
            <label className="text-xs font-normal text-gray-500">Pick date & time</label>
            <div className="relative">
              <input
                type="datetime-local"
                value={scheduledDateTime}
                onChange={(e) => {
                  setScheduledDateTime(e.target.value);
                  setSelectedPreset('');
                }}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:border-[#00A651]"
              />
            </div>
          </div>

          {/* Preset Options */}
          <div className="space-y-1 text-xs border-t border-gray-100 pt-3 mb-5">
            {[
              {
                label: 'Tomorrow',
                time: setMinutes(setHours(addDays(new Date(), 1), 9), 0),
              },
              {
                label: 'Tomorrow, 10:00 AM',
                time: setMinutes(setHours(addDays(new Date(), 1), 10), 0),
              },
              {
                label: 'Tomorrow, 11:00 AM',
                time: setMinutes(setHours(addDays(new Date(), 1), 11), 0),
              },
              {
                label: 'Tomorrow, 3:00 PM',
                time: setMinutes(setHours(addDays(new Date(), 1), 15), 0),
              },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.label, preset.time)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${
                  selectedPreset === preset.label
                    ? 'bg-[#EAF6ED] text-[#00A651] font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Popover Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsSendLaterOpen(false)}
              className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSendLaterOpen(false);
                handleSubmit();
              }}
              className="px-5 py-1 rounded-full border border-[#00A651] text-[#00A651] hover:bg-[#00A651] hover:text-white transition-all text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
