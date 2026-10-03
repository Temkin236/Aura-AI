import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/landing/LandingPage';
import { ChatWorkspace } from './components/chat/ChatWorkspace';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SettingsModal } from './components/settings/SettingsModal';
import { AuthModal } from './components/auth/AuthModal';
import { UserSettings } from './types';
import { SafeUser } from './db/types';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'chat' | 'admin'>('landing');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Load current authenticated user from server session on mount
  useEffect(() => {
    fetch('/api/auth/me', { headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setIsAuthLoading(false);
      });
  }, []);

  const DEFAULT_SETTINGS: UserSettings = {
    theme: 'light',
    defaultMode: 'developer',
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    saveHistory: true,
    autoTitle: true,
    streamResponses: true,
    soundEffects: false,
  };

  const getLocalSettings = (): UserSettings => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem('aura_settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch {}
    setCurrentUser(null);
    const anonSettings = getLocalSettings();
    setUserSettings(anonSettings);
    applyTheme(anonSettings.theme);
  };

  // Settings State
  const [userSettings, setUserSettings] = useState<UserSettings>(getLocalSettings);

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    if (theme === 'dark') {
      setIsDarkMode(true);
    } else if (theme === 'light') {
      setIsDarkMode(false);
    } else {
      const matchesDark =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(matchesDark);
    }
  };

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const initial = getLocalSettings();
    if (initial.theme === 'dark') return true;
    if (initial.theme === 'light') return false;
    return (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  });

  // Reconcile settings from PostgreSQL when authenticated user changes
  useEffect(() => {
    if (isAuthLoading) return;

    if (currentUser?.id) {
      // Authenticated user: fetch from PostgreSQL
      fetch('/api/settings', { headers: { Accept: 'application/json' } })
        .then((res) => {
          if (res.status === 401) {
            handleSignOut();
            return null;
          }
          return res.ok ? res.json() : null;
        })
        .then((data) => {
          if (data?.settings) {
            setUserSettings(data.settings);
            applyTheme(data.settings.theme);
          }
        })
        .catch((err) => {
          console.error('Failed to load cloud settings:', err);
        });
    } else {
      // Anonymous user: restore from localStorage
      const anonSettings = getLocalSettings();
      setUserSettings(anonSettings);
      applyTheme(anonSettings.theme);
    }
  }, [currentUser?.id, isAuthLoading]);

  // Listen to system theme changes when theme is set to 'system'
  useEffect(() => {
    if (userSettings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      setIsDarkMode(userSettings.theme === 'dark');
    }
  }, [userSettings.theme]);

  // Apply dark mode class to <html> element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    const nextTheme = nextDark ? 'dark' : 'light';
    handleUpdateSettings({ theme: nextTheme });
  };

  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
    setUserSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.theme) {
        applyTheme(newSettings.theme);
      }
      return updated;
    });

    if (currentUser?.id) {
      // Authenticated user: persist to PostgreSQL
      fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
        .then((res) => {
          if (res.status === 401) {
            handleSignOut();
            return null;
          }
          return res.ok ? res.json() : null;
        })
        .then((data) => {
          if (data?.settings) {
            setUserSettings(data.settings);
          }
        })
        .catch((err) => {
          console.error('Failed to save settings to cloud:', err);
        });
    } else {
      // Anonymous user: persist to localStorage
      try {
        const currentLocal = getLocalSettings();
        const updatedLocal = { ...currentLocal, ...newSettings };
        localStorage.setItem('aura_settings', JSON.stringify(updatedLocal));
      } catch (err) {
        console.warn('LocalStorage error saving settings:', err);
      }
    }
  };

  const handleClearAllConversations = () => {
    localStorage.removeItem('aura_conversations');
    localStorage.removeItem('aura_messages');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#F8F3ED] dark:bg-[#17110E] text-[#2B1D17] dark:text-[#EDE1D5] selection:bg-[#DCC9B8] selection:text-[#2B1D17]">
      {/* Route Views */}
      {currentView === 'landing' && (
        <LandingPage
          onStartChatting={() => setCurrentView('chat')}
          onOpenAdmin={() => setCurrentView('admin')}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          user={currentUser}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onSignOut={handleSignOut}
        />
      )}

      {currentView === 'chat' && (
        <ChatWorkspace
          onOpenLanding={() => setCurrentView('landing')}
          onOpenAdmin={() => setCurrentView('admin')}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          userSettings={userSettings}
          user={currentUser}
          isAuthLoading={isAuthLoading}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onSignOut={handleSignOut}
        />
      )}

      {currentView === 'admin' && (
        <AdminDashboard
          onBackToChat={() => setCurrentView('chat')}
          onOpenLanding={() => setCurrentView('landing')}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
      )}

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={userSettings}
        onUpdateSettings={handleUpdateSettings}
        onClearAllConversations={handleClearAllConversations}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthLoading(false);
        }}
      />
    </div>
  );
}
