import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import { Zap } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginWithGoogle, loginDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCustomGoogleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      if (tokenResponse.access_token) {
        loginWithGoogle(tokenResponse.access_token);
      }
    },
    onError: () => {
      setError('Google login was cancelled or failed. You can sign in using the Demo account.');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // In development/demo, allow quick credential login or demo fallback
      await loginDemo();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      {/* Centered Login Card */}
      <div className="w-full max-w-[420px] bg-white border border-gray-100 rounded-2xl p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-6 tracking-tight">
          Login
        </h1>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs text-center">
            {error}
          </div>
        )}

        {/* Google Login Button */}
        <button
          type="button"
          onClick={() => handleCustomGoogleLogin()}
          className="w-full py-2.5 px-4 rounded-lg bg-[#EAF6ED] hover:bg-[#ddf2e2] text-gray-800 text-xs font-medium flex items-center justify-center gap-2.5 transition-colors"
        >
          {/* Google Icon */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Login with Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center my-6">
          <div className="flex-grow border-t border-gray-100" />
          <span className="flex-shrink mx-3 text-[11px] text-gray-400 font-normal">
            or sign up through email
          </span>
          <div className="flex-grow border-t border-gray-100" />
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email ID"
              className="w-full px-4 py-2.5 bg-[#F3F4F6] text-gray-800 placeholder-gray-400 text-xs rounded-lg border-none focus:ring-2 focus:ring-[#00A651] outline-none transition-all"
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-2.5 bg-[#F3F4F6] text-gray-800 placeholder-gray-400 text-xs rounded-lg border-none focus:ring-2 focus:ring-[#00A651] outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 mt-2 rounded-lg bg-[#00A651] hover:bg-[#008c44] text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Instant Demo Candidate Link */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-[#00A651] transition-colors"
          >
            <Zap className="h-3 w-3 text-amber-500" />
            <span>Instant Demo Candidate One-Click Login</span>
          </button>
        </div>
      </div>
    </div>
  );
};
