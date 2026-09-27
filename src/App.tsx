import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/landing/LandingPage';
import { ChatWorkspace } from './components/chat/ChatWorkspace';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SettingsModal } from './components/settings/SettingsModal';
import { UserSettings } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'chat' | 'admin'>('landing');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings State
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('aura_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      theme: 'light',
      defaultMode: 'developer',
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      saveHistory: true,
      autoTitle: true,
      streamResponses: true,
      soundEffects: false,
    };
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (userSettings.theme === 'dark') return true;
    if (userSettings.theme === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
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

  // Sync settings to localStorage
  useEffect(() => {
    localStorage.setItem('aura_settings', JSON.stringify(userSettings));
  }, [userSettings]);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    setUserSettings((prev) => ({
      ...prev,
      theme: nextDark ? 'dark' : 'light',
    }));
  };

  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
    setUserSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.theme) {
        if (newSettings.theme === 'dark') setIsDarkMode(true);
        else if (newSettings.theme === 'light') setIsDarkMode(false);
        else {
          setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
      }
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
      {/* Route Views */}
      {currentView === 'landing' && (
        <LandingPage
          onStartChatting={() => setCurrentView('chat')}
          onOpenAdmin={() => setCurrentView('admin')}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
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
    </div>
  );
}
