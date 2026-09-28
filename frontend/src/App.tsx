import React from 'react';
import { Mail, Calendar, Send, ShieldAlert, Cpu } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-800 bg-surface-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center text-white shadow-glow">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
              ReachInbox <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 font-medium border border-brand-500/30">Scheduler v1.0</span>
            </h1>
            <p className="text-xs text-slate-400">High-Throughput Outreach & Job Orchestrator</p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col items-center justify-center text-center">
        <div className="max-w-xl p-8 rounded-2xl border border-surface-800 bg-surface-900/40 backdrop-blur-xl shadow-2xl">
          <div className="inline-flex p-3 rounded-xl bg-brand-500/10 text-brand-400 mb-4 border border-brand-500/20">
            <Cpu className="h-8 w-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">ReachInbox Scheduler Initialized</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Persistent BullMQ delayed email queuing, Redis rate limiting, Elasticsearch search indexing, and real-time Slack notifications engine.
          </p>
          <div className="grid grid-cols-2 gap-3 text-left text-xs text-slate-300">
            <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-400" /> Delayed Scheduling
            </div>
            <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50 flex items-center gap-2">
              <Send className="h-4 w-4 text-emerald-400" /> Ethereal SMTP Engine
            </div>
            <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" /> Redis Rate Limiter
            </div>
            <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50 flex items-center gap-2">
              <Mail className="h-4 w-4 text-indigo-400" /> Elasticsearch Search
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
