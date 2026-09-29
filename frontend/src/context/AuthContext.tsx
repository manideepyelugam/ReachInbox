import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser } from '../types';
import { getMe, loginWithDemo, loginWithGoogleCredential } from '../services/api';

interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const data = await getMe();
      setUser(data.user);
    } catch (err) {
      const cached = localStorage.getItem('reachinbox_demo_user');
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch (e) {
          setUser(null);
        }
      } else {
        console.warn('Session check failed or unauthenticated');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('reachinbox_token');
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = async (credential: string) => {
    setLoading(true);
    try {
      const data = await loginWithGoogleCredential(credential);
      localStorage.setItem('reachinbox_token', data.token);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = async () => {
    setLoading(true);
    try {
      const data = await loginWithDemo();
      localStorage.setItem('reachinbox_token', data.token);
      setUser(data.user);
    } catch (err) {
      console.warn('Backend unavailable, using local demo user session:', err);
      const demoUser: IUser = {
        id: 'demo-candidate-id',
        email: 'oliver.brown@domain.io',
        name: 'Oliver Brown',
        avatarUrl: '/oliver_avatar.png',
        isSlackConnected: true,
        slackChannel: 'alerts',
        slackTeam: 'Outbox Labs',
      };
      localStorage.setItem('reachinbox_token', 'demo-local-token');
      localStorage.setItem('reachinbox_demo_user', JSON.stringify(demoUser));
      setUser(demoUser);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('reachinbox_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        loginDemo,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
