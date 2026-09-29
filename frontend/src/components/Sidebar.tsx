import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, Send, ChevronDown, Activity, Slack, LogOut, CheckCircle2, ExternalLink } from 'lucide-react';

interface SidebarProps {
  activeTab: 'scheduled' | 'sent';
  onSelectTab: (tab: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  onOpenSlackModal: () => void;
  scheduledCount: number;
  sentCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenCompose,
  onOpenSlackModal,
  scheduledCount,
  sentCount,
}) => {
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userName = user?.name || 'Oliver Brown';
  const userEmail = user?.email || 'oliver.brown@domain.io';

  return (
    <aside className="w-56 sm:w-60 flex-shrink-0 flex flex-col p-4 bg-white border-r border-gray-100 min-h-screen select-none">
      {/* Top Logo */}
      <div className="flex items-center gap-2 px-1 pt-1 pb-4">
        <img src="/onb_logo.png" alt="ONB" className="h-6 object-contain" />
      </div>

      {/* User Profile Card */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-[#F3F4F6] hover:bg-gray-200/70 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src="/oliver_avatar.png"
              onError={(e) => {
                // fallback to dicebear or initial
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail}`;
              }}
              alt={userName}
              className="w-8 h-8 rounded-full object-cover bg-gray-200 flex-shrink-0"
            />
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-gray-900 leading-snug truncate">
                {userName}
              </div>
              <div className="text-[10px] text-gray-500 leading-none truncate max-w-[105px]">
                {userEmail}
              </div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-1" />
        </button>

        {/* User Popup Dropdown Menu */}
        {isUserMenuOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-gray-100 rounded-xl shadow-lg p-1 z-50 animate-in fade-in duration-100">
            <a
              href="/admin/queues"
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsUserMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                <span>BullMQ Visualizer</span>
              </div>
              <ExternalLink className="w-3 h-3 text-gray-400" />
            </a>

            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                onOpenSlackModal();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition text-left"
            >
              <div className="flex items-center gap-2">
                <Slack className="w-3.5 h-3.5 text-[#4A154B]" />
                <span>Slack Alerts</span>
              </div>
              {user?.isSlackConnected && (
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              )}
            </button>

            <div className="h-px bg-gray-100 my-1" />

            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition text-left"
            >
              <LogOut className="w-3.5 h-3.5 text-red-500" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>

      {/* Compose Button */}
      <div className="mt-4">
        <button
          onClick={onOpenCompose}
          className="w-full py-2 px-4 rounded-full border-2 border-[#00A651] text-[#00A651] hover:bg-[#00A651] hover:text-white transition-all text-xs font-semibold flex items-center justify-center shadow-sm"
        >
          <span>Compose</span>
        </button>
      </div>

      {/* CORE Navigation Section */}
      <div className="mt-7 flex flex-col flex-1">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
          CORE
        </div>

        <nav className="space-y-1">
          {/* Scheduled Nav Button */}
          <button
            onClick={() => onSelectTab('scheduled')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
              activeTab === 'scheduled'
                ? 'bg-[#EAF6ED] text-black font-semibold shadow-none'
                : 'text-gray-600 hover:bg-gray-50 font-normal'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock
                className={`w-4 h-4 ${
                  activeTab === 'scheduled' ? 'text-black' : 'text-gray-500'
                }`}
              />
              <span>Scheduled</span>
            </div>
            <span
              className={`text-xs ${
                activeTab === 'scheduled' ? 'text-gray-800' : 'text-gray-500'
              }`}
            >
              {scheduledCount}
            </span>
          </button>

          {/* Sent Nav Button */}
          <button
            onClick={() => onSelectTab('sent')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
              activeTab === 'sent'
                ? 'bg-[#EAF6ED] text-black font-semibold shadow-none'
                : 'text-gray-600 hover:bg-gray-50 font-normal'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Send
                className={`w-4 h-4 ${
                  activeTab === 'sent' ? 'text-black' : 'text-gray-500'
                }`}
              />
              <span>Sent</span>
            </div>
            <span
              className={`text-xs ${
                activeTab === 'sent' ? 'text-gray-800' : 'text-gray-500'
              }`}
            >
              {sentCount}
            </span>
          </button>
        </nav>
      </div>
    </aside>
  );
};
