import React, { useState, useEffect } from 'react';
import { ChatWorkspace } from './components/chat/ChatWorkspace';
import { SettingsModal } from './components/settings/SettingsModal';
import { UserSettings } from './types';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  defaultMode: 'developer',
  model: 'gemini-2.5-flash',
};

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      try {
        localStorage.setItem('aura_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearAllConversations = () => {
    localStorage.removeItem('aura_conversations');
    localStorage.removeItem('aura_messages');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#F8F3ED] dark:bg-[#17110E] text-[#2B1D17] dark:text-[#EDE1D5] selection:bg-[#DCC9B8] selection:text-[#2B1D17]">
      {/* Primary AURA Chat Interface */}
      <ChatWorkspace
        onOpenSettings={() => setIsSettingsOpen(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        userSettings={userSettings}
      />

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={userSettings}
        onUpdateSettings={handleUpdateSettings}
        onClearAllConversations={handleClearAllConversations}
      />
    </div>
  );
}
