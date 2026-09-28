import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Clock,
  Gauge,
  Send,
  Plus,
  CheckCircle,
  AlertCircle,
  Users,
  Timer,
} from 'lucide-react';
import Papa from 'papaparse';
import { ISenderAccount } from '../types';
import { getSenders, createTestSender, scheduleEmail, scheduleBulkEmails } from '../services/api';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [senders, setSenders] = useState<ISenderAccount[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [mode, setMode] = useState<'single' | 'bulk'>('bulk');

  // Fields
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [startTime, setStartTime] = useState<string>('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);

  // Bulk CSV state
  const [parsedLeads, setParsedLeads] = useState<Array<{ email: string; name?: string }>>([]);
  const [fileName, setFileName] = useState<string>('');
  const [csvError, setCsvError] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [creatingSender, setCreatingSender] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadSenders();
      // Set default startTime to 1 minute from now
      const defaultDate = new Date(Date.now() + 60000);
      defaultDate.setMinutes(defaultDate.getMinutes() - defaultDate.getTimezoneOffset());
      setStartTime(defaultDate.toISOString().slice(0, 16));
    }
  }, [isOpen]);

  const loadSenders = async () => {
    try {
      const data = await getSenders();
      setSenders(data.senders);
      if (data.senders.length > 0 && !selectedSenderId) {
        setSelectedSenderId(data.senders[0].id);
        setHourlyLimit(data.senders[0].hourlyLimit || 50);
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
    setCsvError('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        const detectedLeads: Array<{ email: string; name?: string }> = [];

        for (const row of rows) {
          // Look for common email keys or any value containing '@'
          let emailVal = '';
          let nameVal = '';

          for (const [key, val] of Object.entries(row)) {
            const k = key.toLowerCase();
            const v = String(val || '').trim();

            if (k.includes('email') || k.includes('mail') || v.includes('@')) {
              if (v.includes('@')) {
                emailVal = v;
              }
            }
            if (k.includes('name') || k.includes('first') || k.includes('lead')) {
              nameVal = v;
            }
          }

          if (emailVal && emailVal.includes('@')) {
            detectedLeads.push({
              email: emailVal,
              name: nameVal || undefined,
            });
          }
        }

        if (detectedLeads.length === 0) {
          setCsvError('No valid email addresses found in the CSV file.');
          setParsedLeads([]);
        } else {
          setParsedLeads(detectedLeads);
        }
      },
      error: (err) => {
        setCsvError('Failed to parse CSV file: ' + err.message);
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!bodyText.trim()) {
      setError('Email body is required');
      return;
    }

    setLoading(true);
    try {
      const formattedStartTime = startTime ? new Date(startTime).toISOString() : new Date().toISOString();

      if (mode === 'single') {
        if (!recipientEmail || !recipientEmail.includes('@')) {
          setError('Please provide a valid recipient email address');
          setLoading(false);
          return;
        }

        await scheduleEmail({
          recipientEmail: recipientEmail.trim(),
          subject: subject.trim(),
          bodyText: bodyText.trim(),
          senderAccountId: selectedSenderId || undefined,
          scheduledAt: formattedStartTime,
        });
      } else {
        if (parsedLeads.length === 0) {
          setError('Please upload a CSV file with at least one lead');
          setLoading(false);
          return;
        }

        await scheduleBulkEmails({
          leads: parsedLeads,
          subject: subject.trim(),
          bodyText: bodyText.trim(),
          senderAccountId: selectedSenderId || undefined,
          startTime: formattedStartTime,
          delayBetweenEmailsSeconds: delaySeconds,
          hourlyLimit: hourlyLimit,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to schedule emails');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-surface-900 border border-surface-700/80 rounded-2xl shadow-2xl overflow-hidden z-10 my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Compose & Schedule Email</h2>
              <p className="text-xs text-slate-400">Configure delivery queue, delay throttling & rate limits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sender Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-200">From Sender Account</label>
              <button
                type="button"
                onClick={handleCreateTestSender}
                disabled={creatingSender}
                className="text-brand-400 hover:text-brand-300 text-[11px] font-medium flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                {creatingSender ? 'Generating...' : '+ New Ethereal Sender'}
              </button>
            </div>
            <select
              value={selectedSenderId}
              onChange={(e) => {
                setSelectedSenderId(e.target.value);
                const s = senders.find((x) => x.id === e.target.value);
                if (s) setHourlyLimit(s.hourlyLimit || 50);
              }}
              className="w-full px-3 py-2 bg-surface-950 border border-surface-700/70 focus:border-brand-500 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.email} ({s.email}) — Limit: {s.hourlyLimit}/hr
                </option>
              ))}
            </select>
          </div>

          {/* Mode Selector */}
          <div className="flex rounded-xl bg-surface-950 p-1 border border-surface-800">
            <button
              type="button"
              onClick={() => setMode('bulk')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                mode === 'bulk'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Bulk Lead Campaign (CSV Upload)
            </button>
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                mode === 'single'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              Single Recipient
            </button>
          </div>

          {/* Lead Input depending on mode */}
          {mode === 'single' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-200">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="lead@company.com"
                className="w-full px-3 py-2 bg-surface-950 border border-surface-700/70 focus:border-brand-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-200 flex items-center justify-between">
                <span>Upload CSV / Leads File</span>
                {parsedLeads.length > 0 && (
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {parsedLeads.length} leads detected
                  </span>
                )}
              </label>

              <div className="border-2 border-dashed border-surface-700/80 hover:border-brand-500/70 bg-surface-950/60 rounded-xl p-4 text-center cursor-pointer transition-colors relative">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-1.5">
                  <div className="p-2.5 rounded-full bg-surface-800 text-slate-400">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div className="text-xs text-slate-300 font-medium">
                    {fileName ? (
                      <span className="text-brand-300 flex items-center gap-1">
                        <FileSpreadsheet className="h-3.5 w-3.5" /> {fileName}
                      </span>
                    ) : (
                      'Click or drag & drop a CSV / Text file'
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">Supports columns: email, name, first_name, etc.</p>
                </div>
              </div>

              {csvError && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {csvError}
                </p>
              )}

              {parsedLeads.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-2 rounded-lg bg-surface-950 border border-surface-800">
                  {parsedLeads.slice(0, 8).map((lead, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-surface-800 text-[10px] text-slate-300 border border-surface-700"
                    >
                      {lead.email} {lead.name ? `(${lead.name})` : ''}
                    </span>
                  ))}
                  {parsedLeads.length > 8 && (
                    <span className="px-2 py-0.5 text-[10px] text-brand-400 font-medium">
                      +{parsedLeads.length - 8} more
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-200">Email Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quick question regarding cold outreach at ReachInbox"
              className="w-full px-3 py-2 bg-surface-950 border border-surface-700/70 focus:border-brand-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-200">Email Body</label>
              <span className="text-[10px] text-slate-400">Use {'{{name}}'} for dynamic name replacement</span>
            </div>
            <textarea
              rows={4}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Hi {{name}},&#10;&#10;I noticed your recent work and wanted to reach out regarding our AI outreach platform..."
              className="w-full px-3 py-2 bg-surface-950 border border-surface-700/70 focus:border-brand-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none resize-none font-sans"
            />
          </div>

          {/* Scheduling & Throttle Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-surface-800">
            {/* Start Time */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                <Clock className="h-3 w-3 text-brand-400" /> Start Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface-950 border border-surface-700/70 focus:border-brand-500 rounded-lg text-xs text-white focus:outline-none"
              />
            </div>

            {/* Delay Between Emails */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                <Timer className="h-3 w-3 text-amber-400" /> Delay / Email (s)
              </label>
              <input
                type="number"
                min="0"
                max="3600"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-surface-950 border border-surface-700/70 focus:border-brand-500 rounded-lg text-xs text-white focus:outline-none"
              />
            </div>

            {/* Hourly Rate Limit */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                <Gauge className="h-3 w-3 text-emerald-400" /> Hourly Limit
              </label>
              <input
                type="number"
                min="1"
                max="5000"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-surface-950 border border-surface-700/70 focus:border-brand-500 rounded-lg text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-surface-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {loading
                ? 'Scheduling Jobs...'
                : mode === 'bulk'
                ? `Schedule ${parsedLeads.length > 0 ? parsedLeads.length : ''} Emails`
                : 'Schedule Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
