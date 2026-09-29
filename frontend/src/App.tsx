import React, { useState, useEffect, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './components/LoginView';
import { ScheduledTable } from './components/ScheduledTable';
import { SentTable } from './components/SentTable';
import { EmailDetailView } from './components/EmailDetailView';
import { ComposeView } from './components/ComposeView';
import { SearchBar } from './components/SearchBar';
import { PreviewModal } from './components/PreviewModal';
import { SlackModal } from './components/SlackModal';
import {
  getScheduledEmails,
  getSentEmails,
  cancelScheduledEmail,
  searchEmails,
} from './services/api';
import { IEmailJob } from './types';
import { Inbox, Sparkles, Loader2 } from 'lucide-react';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '108394857291-example.apps.googleusercontent.com';

const DEFAULT_SCHEDULED: IEmailJob[] = [
  {
    id: 'sample-sched-1',
    userId: 'demo-user',
    senderAccountId: 'sender-1',
    recipientEmail: 'john.smith@domain.com',
    metadata: { name: 'John Smith' },
    subject: 'Meeting follow-up - Scheduled',
    bodyText: 'Hi John, just wanted to follow up on our meeting and see if we can schedule a quick review of the roadmap.',
    status: 'SCHEDULED',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sample-sched-2',
    userId: 'demo-user',
    senderAccountId: 'sender-1',
    recipientEmail: 'olive@domain.com',
    metadata: { name: 'Olive' },
    subject: "Ramit, great to meet you - you'll love it",
    bodyText: 'Hi Olive, just wanted to follow up on our meeting and share the new strategy materials.',
    status: 'SCHEDULED',
    scheduledAt: new Date(Date.now() + 172800000).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_SENT: IEmailJob[] = [
  {
    id: 'sample-sent-1',
    userId: 'demo-user',
    senderAccountId: 'sender-1',
    recipientEmail: 'sarah.wilson@domain.com',
    metadata: { name: 'Sarah Wilson' },
    subject: 'Re: Project Update',
    bodyText: 'Thanks for the update, Sarah. Looks good! Everything is aligned for the release.',
    status: 'SENT',
    scheduledAt: new Date(Date.now() - 3600000).toISOString(),
    sentAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sample-sent-2',
    userId: 'demo-user',
    senderAccountId: 'sender-1',
    recipientEmail: 'support@domain.io',
    metadata: { name: 'Support' },
    subject: 'Issue with login',
    bodyText: 'I am having trouble logging in to the dashboard. Could you please take a look?',
    status: 'SENT',
    scheduledAt: new Date(Date.now() - 7200000).toISOString(),
    sentAt: new Date(Date.now() - 7200000).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

function MainDashboard() {
  const { user, loading: authLoading } = useAuth();

  // Navigation state
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'compose'>('list');
  const [selectedEmail, setSelectedEmail] = useState<IEmailJob | null>(null);

  // Search & Data states
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduledEmails, setScheduledEmails] = useState<IEmailJob[]>(DEFAULT_SCHEDULED);
  const [sentEmails, setSentEmails] = useState<IEmailJob[]>(DEFAULT_SENT);
  const [searchResults, setSearchResults] = useState<IEmailJob[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searching, setSearching] = useState(false);

  // Modals
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
      if (scheduledRes.emails && scheduledRes.emails.length > 0) {
        setScheduledEmails(scheduledRes.emails);
      }
      if (sentRes.emails && sentRes.emails.length > 0) {
        setSentEmails(sentRes.emails);
      }
    } catch (err) {
      console.warn('API sync notice (using local cache if available):', err);
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
      const interval = setInterval(loadData, 6000);
      return () => clearInterval(interval);
    }
  }, [user, loadData]);

  // Debounced Elasticsearch Search
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
        // Fallback local search across state
        const q = searchQuery.toLowerCase();
        const localHits = [...scheduledEmails, ...sentEmails].filter(
          (e) =>
            e.subject?.toLowerCase().includes(q) ||
            e.recipientEmail?.toLowerCase().includes(q) ||
            e.bodyText?.toLowerCase().includes(q)
        );
        setSearchResults(localHits);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, scheduledEmails, sentEmails]);

  const handleCancelScheduled = async (id: string) => {
    try {
      await cancelScheduledEmail(id);
      loadData();
    } catch (err) {
      setScheduledEmails((prev) => prev.filter((e) => e.id !== id));
    }
    if (selectedEmail?.id === id) {
      setCurrentView('list');
      setSelectedEmail(null);
    }
  };

  const handleOpenPreview = (url: string, subject: string) => {
    setPreviewData({
      isOpen: true,
      url,
      subject,
    });
  };

  const handleSelectEmail = (job: IEmailJob) => {
    setSelectedEmail(job);
    setCurrentView('detail');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-gray-400 gap-2">
        <Loader2 className="h-7 w-7 animate-spin text-[#00A651]" />
        <p className="text-xs">Authenticating...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-white flex selection:bg-[#00A651] selection:text-white">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setCurrentView('list');
          setSearchQuery('');
        }}
        onOpenCompose={() => {
          setCurrentView('compose');
        }}
        onOpenSlackModal={() => setIsSlackOpen(true)}
        scheduledCount={scheduledEmails.length}
        sentCount={sentEmails.length}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {currentView === 'compose' ? (
          <ComposeView
            onBack={() => setCurrentView('list')}
            onSuccess={loadData}
          />
        ) : currentView === 'detail' && selectedEmail ? (
          <EmailDetailView
            email={selectedEmail}
            onBack={() => setCurrentView('list')}
            onPreviewEthereal={handleOpenPreview}
            onDelete={handleCancelScheduled}
          />
        ) : (
          /* List View (Scheduled / Sent / Search) */
          <div className="flex-1 flex flex-col">
            {/* Top Search Bar Header */}
            <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onRefresh={loadData}
                loading={loadingData}
              />
            </div>

            {/* Content List Area */}
            <div className="flex-1 px-4 sm:px-6 py-2">
              {isSearchActive ? (
                <div>
                  <div className="py-2.5 px-3 mb-2 flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>
                        Search query: <strong>&ldquo;{searchQuery}&rdquo;</strong>
                      </span>
                    </div>
                    <span>{searchResults.length} results</span>
                  </div>

                  {searching ? (
                    <div className="py-16 flex flex-col items-center justify-center text-gray-400 gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[#00A651]" />
                      <p className="text-xs">Searching indexed emails...</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 flex flex-col items-center">
                      <Inbox className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="text-xs font-semibold text-gray-700">No results match your search</p>
                    </div>
                  ) : (
                    <SentTable
                      emails={searchResults}
                      loading={false}
                      onPreview={handleOpenPreview}
                      onSelectEmail={handleSelectEmail}
                    />
                  )}
                </div>
              ) : activeTab === 'scheduled' ? (
                <ScheduledTable
                  emails={scheduledEmails}
                  loading={loadingData && scheduledEmails.length === 0}
                  onCancel={handleCancelScheduled}
                  onSelectEmail={handleSelectEmail}
                />
              ) : (
                <SentTable
                  emails={sentEmails}
                  loading={loadingData && sentEmails.length === 0}
                  onPreview={handleOpenPreview}
                  onSelectEmail={handleSelectEmail}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Preview Modal for Ethereal SMTP fake inbox view */}
      <PreviewModal
        isOpen={previewData.isOpen}
        onClose={() => setPreviewData({ isOpen: false, url: '', subject: '' })}
        previewUrl={previewData.url}
        subject={previewData.subject}
      />

      {/* Slack Integration Modal */}
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
        <MainDashboard />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
