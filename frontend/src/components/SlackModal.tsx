import React, { useState, useEffect } from 'react';
import { X, Slack, CheckCircle2, AlertCircle, ExternalLink, Send, Unlink } from 'lucide-react';
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
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-modal overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#4A154B]/10 text-[#4A154B]">
              <Slack className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Slack Notifications</h3>
              <p className="text-[11px] text-gray-500">Real-time alerts when rate limits are reached</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
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
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {isConnected ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#EAF6ED] border border-[#00A651]/20 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#00A651] flex-shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-gray-900">Slack Workspace Connected</div>
                  <div className="text-gray-600 mt-0.5 text-[11px]">
                    Team: <span className="font-semibold text-gray-900">{user?.slackTeam || status.teamName || 'Active'}</span> • Channel: <span className="font-semibold text-gray-900">#{user?.slackChannel || status.channelName || 'alerts'}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                Whenever a sender account hits its hourly email threshold, an instant notification is dispatched to your Slack channel.
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSendTestAlert}
                  disabled={alertSending}
                  className="w-full py-2.5 px-4 rounded-full bg-[#00A651] hover:bg-[#008c44] text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {alertSending ? 'Sending Test Alert...' : 'Send Live Rate-Limit Test Alert'}
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="w-full py-2 px-4 rounded-full bg-white hover:bg-gray-50 text-red-600 text-xs font-medium border border-gray-200 flex items-center justify-center gap-2 transition-colors"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  Disconnect Slack
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                Connect your Slack workspace via OAuth 2.0 to receive instant alerts the moment a sender account exceeds its hourly limit.
              </p>

              <button
                type="button"
                onClick={handleConnect}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-full bg-[#4A154B] hover:bg-[#3B113C] text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Slack className="h-4 w-4 text-[#ECB22E]" />
                <span>Connect with Slack</span>
                <ExternalLink className="h-3 w-3 text-white/80" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
