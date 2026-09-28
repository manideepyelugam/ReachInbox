import React, { useState, useEffect, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { ComposeModal } from './components/ComposeModal';
import { ScheduledTable } from './components/ScheduledTable';
import { SentTable } from './components/SentTable';
import { PreviewModal } from './components/PreviewModal';
import { SlackModal } from './components/SlackModal';
import { SearchBar } from './components/SearchBar';
import {
  getScheduledEmails,
  getSentEmails,
  cancelScheduledEmail,
  searchEmails,
} from './services/api';
import { IEmailJob } from './types';
import {
  Calendar,
  Send,
  Plus,
  RefreshCw,
  Sparkles,
  Inbox,
  AlertCircle,
} from 'lucide-react';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '108394857291-example.apps.googleusercontent.com';

function Dashboard() {
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [scheduledEmails, setScheduledEmails] = useState<IEmailJob[]>([]);
  const [sentEmails, setSentEmails] = useState<IEmailJob[]>([]);
  const [searchResults, setSearchResults] = useState<IEmailJob[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searching, setSearching] = useState(false);

  // Modals
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ isOpen: boolean; url: string; subject: string }>({
    isOpen: false,
    url: '',
    subject: '',
  });

  // Load emails
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const [scheduledRes, sentRes] = await Promise.all([
        getScheduledEmails(),
        getSentEmails(),
      ]);
      setScheduledEmails(scheduledRes.emails || []);
      setSentEmails(sentRes.emails || []);
    } catch (err) {
      console.error('Failed to load email tables:', err);
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
      // Auto-poll every 5 seconds so user sees live transitions without manual refresh
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }
  }, [user, loadData]);

  // Debounced Elasticsearch query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchEmails(searchQuery.trim());
        setSearchResults(res.hits || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCancelScheduled = async (id: string) => {
    try {
      await cancelScheduledEmail(id);
      loadData();
    } catch (err) {
      console.error('Failed to cancel job:', err);
    }
  };

  const handleOpenPreview = (url: string, subject: string) => {
    setPreviewData({
      isOpen: true,
      url,
      subject,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Authenticating session...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Header */}
      <Header onOpenSlackModal={() => setIsSlackOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-900 border border-surface-800 self-start sm:self-auto">
            <button
              onClick={() => {
                setActiveTab('scheduled');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'scheduled' && !isSearchActive
                  ? 'bg-brand-600 text-white shadow-glow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Scheduled Emails</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-surface-800/80 text-brand-300 font-mono">
                {scheduledEmails.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('sent');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'sent' && !isSearchActive
                  ? 'bg-brand-600 text-white shadow-glow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Sent Emails</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-surface-800/80 text-emerald-300 font-mono">
                {sentEmails.length}
              </span>
            </button>
          </div>

          {/* Search & Compose Actions */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />

            <button
              onClick={loadData}
              className="p-2.5 rounded-xl bg-surface-900 border border-surface-800 hover:bg-surface-800 text-slate-400 hover:text-white transition-colors"
              title="Refresh queue"
            >
              <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin text-brand-400' : ''}`} />
            </button>

            <button
              onClick={() => setIsComposeOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow flex items-center gap-2 transition-all flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Compose Email</span>
            </button>
          </div>
        </div>

        {/* Table Container Card */}
        <div className="border border-surface-800 bg-surface-900/50 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md flex-1 flex flex-col">
          {isSearchActive ? (
            <div>
              <div className="p-4 border-b border-surface-800 bg-surface-950/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <span>
                    Elasticsearch query: <strong className="text-white font-mono">"{searchQuery}"</strong>
                  </span>
                </div>
                <span className="text-slate-400">{searchResults.length} matches found</span>
              </div>

              {searching ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs">Querying Elasticsearch index...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                  <Inbox className="h-8 w-8 text-slate-500 mb-2" />
                  <p className="text-sm font-semibold text-white">No results matched your search query</p>
                  <p className="text-xs text-slate-500 mt-1">Try searching with another keyword or recipient email.</p>
                </div>
              ) : (
                <div className="divide-y divide-surface-800">
                  {/* Reuse SentTable layout for search matches */}
                  <SentTable
                    emails={searchResults}
                    loading={false}
                    onPreview={handleOpenPreview}
                  />
                </div>
              )}
            </div>
          ) : activeTab === 'scheduled' ? (
            <ScheduledTable
              emails={scheduledEmails}
              loading={loadingData && scheduledEmails.length === 0}
              onCancel={handleCancelScheduled}
            />
          ) : (
            <SentTable
              emails={sentEmails}
              loading={loadingData && sentEmails.length === 0}
              onPreview={handleOpenPreview}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={loadData}
      />

      <PreviewModal
        isOpen={previewData.isOpen}
        onClose={() => setPreviewData({ isOpen: false, url: '', subject: '' })}
        previewUrl={previewData.url}
        subject={previewData.subject}
      />

      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
