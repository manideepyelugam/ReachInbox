import React, { useState, useEffect } from 'react';
import { X, Slack, CheckCircle, AlertCircle, ExternalLink, Send, Unlink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSlackAuthUrl, getSlackStatus, disconnectSlack, sendTestSlackAlert } from '../services/api';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [alertSending, setAlertSending] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; teamName?: string; channelName?: string }>({
    connected: false,
  });
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    try {
      const data = await getSlackStatus();
      setStatus(data);
    } catch (err) {
      console.error('Failed to load Slack status:', err);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { url } = await getSlackAuthUrl();
      if (url && url !== '#') {
        window.location.href = url;
      } else {
        setMessage({
          text: 'SLACK_CLIENT_ID is not configured in backend environment.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await disconnectSlack();
      await refreshUser();
      await loadStatus();
      setMessage({ text: 'Slack disconnected successfully.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestAlert = async () => {
    setAlertSending(true);
    setMessage(null);
    try {
      await sendTestSlackAlert();
      setMessage({
        text: 'Live rate-limit Block Kit alert dispatched to Slack successfully!',
        type: 'success',
      });
    } catch (err: any) {
      setMessage({
        text: err?.response?.data?.error || err.message || 'Failed to dispatch Slack alert',
        type: 'error',
      });
    } finally {
      setAlertSending(false);
    }
  };

  if (!isOpen) return null;

  const isConnected = user?.isSlackConnected || status.connected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-surface-900 border border-surface-700/80 rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#4A154B]/30 border border-[#ECB22E]/30 text-[#ECB22E]">
              <Slack className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Slack Notifications</h3>
              <p className="text-xs text-slate-400">Real-time alerts when rate limits are reached</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {isConnected ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold text-white">Slack Workspace Connected</div>
                  <div className="text-slate-300 mt-0.5">
                    Team: <span className="text-white font-medium">{user?.slackTeam || status.teamName || 'Active'}</span> • Channel: <span className="text-white font-medium">#{user?.slackChannel || status.channelName || 'alerts'}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Whenever a sender account hits its hourly email threshold, a live Block Kit notification is instantly sent to your Slack channel.
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSendTestAlert}
                  disabled={alertSending}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-glow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {alertSending ? 'Sending Test Alert...' : 'Send Live Rate-Limit Test Alert'}
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="w-full py-2 px-4 rounded-xl bg-surface-800 hover:bg-surface-700 text-rose-400 text-xs font-medium border border-surface-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  Disconnect Slack
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect your Slack workspace via OAuth 2.0 to receive instant alerts the moment a sender account exceeds its hourly limit.
              </p>

              <div className="p-3.5 rounded-xl bg-surface-950 border border-surface-800 text-xs space-y-1.5 text-slate-400">
                <div className="flex items-center gap-2 text-slate-200 font-medium">
                  <span>⚡ Features:</span>
                </div>
                <div>• Automatic OAuth token exchange</div>
                <div>• Rich Block Kit rate limit formatting</div>
                <div>• Safe fallback when disconnected (no crashes)</div>
              </div>

              <button
                type="button"
                onClick={handleConnect}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#4A154B] hover:bg-[#5C1B5E] text-white text-xs font-semibold shadow-lg flex items-center justify-center gap-2 border border-[#ECB22E]/40 transition-all disabled:opacity-50"
              >
                <Slack className="h-4 w-4 text-[#ECB22E]" />
                <span>Connect with Slack</span>
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
