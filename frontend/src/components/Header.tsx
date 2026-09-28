import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  LogOut,
  ExternalLink,
  Activity,
  Slack,
  CheckCircle2,
} from 'lucide-react';

interface HeaderProps {
  onOpenSlackModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSlackModal }) => {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-surface-800 bg-surface-900/60 backdrop-blur-xl px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
      {/* Brand */}
      <div className="flex items-center gap-3.5">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-glow">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white tracking-tight">ReachInbox</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-300 font-semibold border border-brand-500/25">
              Scheduler
            </span>
          </div>
          <p className="text-xs text-slate-400">High-Throughput Outreach & Job Orchestrator</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* BullMQ Live Monitor Link */}
        <a
          href="/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/80 hover:bg-surface-800 text-slate-300 hover:text-white border border-surface-700/60 text-xs font-medium transition-colors"
          title="Open real-time BullMQ queue monitor"
        >
          <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          BullMQ Monitor
          <ExternalLink className="h-3 w-3 text-slate-400" />
        </a>

        {/* Slack Connection Button */}
        <button
          onClick={onOpenSlackModal}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            user?.isSlackConnected
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-surface-800/80 text-slate-300 border-surface-700/60 hover:bg-surface-800 hover:text-white'
          }`}
        >
          <Slack className="h-3.5 w-3.5 text-[#ECB22E]" />
          {user?.isSlackConnected ? (
            <>
              <span>Slack: #{user.slackChannel || 'alerts'}</span>
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            </>
          ) : (
            <span>Connect Slack</span>
          )}
        </button>

        <div className="h-5 w-px bg-surface-800 mx-1 hidden sm:block" />

        {/* User Profile */}
        {user && (
          <div className="flex items-center gap-3 pl-1">
            <div className="flex items-center gap-2.5">
              <img
                src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                alt={user.name || 'User'}
                className="h-8 w-8 rounded-full border border-brand-500/40 object-cover bg-surface-800"
              />
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-white leading-tight">{user.name || 'User'}</div>
                <div className="text-[11px] text-slate-400 leading-tight truncate max-w-[150px]">{user.email}</div>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-surface-800/60 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
