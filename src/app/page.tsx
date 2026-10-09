'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LandingPage } from '@/components/LandingPage';
import { AuthScreen } from '@/components/AuthScreen';
import { AuthUser, getActiveSession } from '@/lib/auth';
import { loadStudioProfile, saveStudioProfile } from '@/lib/storage';

export default function RootHomePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
  const [authInitialEmail, setAuthInitialEmail] = useState<string>('');

  useEffect(() => {
    setIsMounted(true);
    const session = getActiveSession();
    if (session) {
      setAuthUser(session);
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme(initial);
      document.documentElement.setAttribute('data-theme', initial);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  if (!isMounted) return null;

  if (authModalOpen) {
    return (
      <div key="page-auth" className="page-view-transition">
        <AuthScreen
          onSuccess={(user) => {
            setAuthUser(user);
            const currentProfile = loadStudioProfile(user.email);
            const updatedProfile = {
              ...currentProfile,
              ownerName: currentProfile.ownerName || user.name || '',
              studioName: currentProfile.studioName || user.studioName || '',
              email: currentProfile.email || user.email || '',
            };
            saveStudioProfile(updatedProfile, user.email);
            router.push('/dashboard');
          }}
          theme={theme}
          onToggleTheme={toggleTheme}
          initialMode={authInitialMode}
          initialEmail={authInitialEmail}
          onBackToLanding={() => setAuthModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div key="page-landing" className="page-view-transition">
      <LandingPage
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAuth={(mode, email) => {
          setAuthInitialMode(mode);
          if (email) setAuthInitialEmail(email);
          setAuthModalOpen(true);
        }}
        authUser={authUser}
        onOpenDashboard={() => router.push('/dashboard')}
      />
    </div>
  );
}
