import React, { useState } from 'react';
import { Mail, Sparkles, Zap, ShieldCheck, Clock, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { loginWithGoogle, loginDemo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginDemo();
    } catch (err: any) {
      setError(err.message || 'Demo sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-surface-900/80 border border-surface-700/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Brand Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-glow mb-3.5">
            <Mail className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ReachInbox Scheduler</h1>
          <p className="text-xs text-slate-400 mt-1">High-Throughput Outreach & Job Orchestration Service</p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
            {error}
          </div>
        )}

        {/* Feature Highlights */}
        <div className="space-y-2 mb-6 text-xs text-slate-300">
          <div className="p-2.5 rounded-xl bg-surface-950/70 border border-surface-800 flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-brand-400 flex-shrink-0" />
            <span>BullMQ Delayed Job Queue (Persistent / No Cron)</span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-950/70 border border-surface-800 flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>Redis Sliding Window Rate Limiting & Staggering</span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-950/70 border border-surface-800 flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-indigo-400 flex-shrink-0" />
            <span>Elasticsearch Search & Slack Rate-Limit Webhooks</span>
          </div>
        </div>

        {/* Login Controls */}
        <div className="space-y-3">
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (credentialResponse.credential) {
                  loginWithGoogle(credentialResponse.credential);
                }
              }}
              onError={() => {
                setError('Google authentication failed. Please try Demo Login.');
              }}
              theme="filled_black"
              shape="pill"
              text="continue_with"
            />
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-surface-800" />
            <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
              Or Instant Demo Access
            </span>
            <div className="flex-grow border-t border-surface-800" />
          </div>

          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Zap className="h-4 w-4 text-amber-300" />
            <span>{loading ? 'Authenticating...' : 'Sign In as Demo Candidate'}</span>
            <ArrowRight className="h-3.5 w-3.5 ml-auto" />
          </button>
        </div>
      </div>
    </div>
  );
};
