import React, { useState, useMemo, useEffect } from 'react';
import { Conversation, AIModeId } from '../../types';
import { AuraSymbol } from '../aura/AuraSymbol';
import { AI_MODES } from '../../data/modes';
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  Settings,
  Moon,
  Sun,
  Check,
  PanelLeftClose,
  Pin
} from 'lucide-react';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePinConversation?: (id: string) => void;
  isDesktopOpen: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
  onOpenSettings: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onTogglePinConversation,
  isDesktopOpen,
  isMobileOpen,
  onCloseMobile,
  onToggleCollapse,
  onOpenSettings,
  isDarkMode,
  onToggleTheme,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const groupedConversations = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const today = new Date().setHours(0, 0, 0, 0);

    const groups: {
      pinned: Conversation[];
      today: Conversation[];
      yesterday: Conversation[];
      previous7Days: Conversation[];
      older: Conversation[];
    } = {
      pinned: [],
      today: [],
      yesterday: [],
      previous7Days: [],
      older: [],
    };

    filteredConversations.forEach((conv) => {
      if (conv.pinned) {
        groups.pinned.push(conv);
        return;
      }

      const timestamp = conv.updatedAt || conv.createdAt;
      if (timestamp >= today) {
        groups.today.push(conv);
      } else if (timestamp >= today - oneDay) {
        groups.yesterday.push(conv);
      } else if (timestamp >= today - 7 * oneDay) {
        groups.previous7Days.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [filteredConversations]);

  const handleStartRename = (conv: Conversation) => {
    setRenamingId(conv.id);
    setRenameValue(conv.title);
    setActiveMenuId(null);
  };

  const handleSaveRename = (id: string) => {
    if (renameValue.trim()) {
      onRenameConversation(id, renameValue.trim());
    }
    setRenamingId(null);
  };

  const renderConversationItem = (conv: Conversation) => {
    const isActive = conv.id === activeConversationId;
    const isRenaming = conv.id === renamingId;
    const modeInfo = AI_MODES[conv.mode as AIModeId] || AI_MODES.developer;

    return (
      <div
        key={conv.id}
        className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-all cursor-pointer ${
          isActive
            ? 'bg-[#EDE1D5]/70 dark:bg-[#2B1D17] text-[#2B1D17] dark:text-[#FCFAF7] font-medium shadow-xs'
            : 'text-[#4A3026] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/40 dark:hover:bg-[#2B1D17]/40'
        }`}
        onClick={() => {
          if (!isRenaming) {
            onSelectConversation(conv.id);
            if (isMobileOpen) onCloseMobile();
          }
        }}
      >
        {isRenaming ? (
          <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename(conv.id);
                if (e.key === 'Escape') setRenamingId(null);
              }}
              autoFocus
              className="flex-1 px-2 py-1 text-xs rounded-lg bg-[#FCFAF7] dark:bg-[#17110E] border border-[#C7A46A] text-[#2B1D17] dark:text-[#EDE1D5] focus:outline-none"
            />
            <button
              onClick={() => handleSaveRename(conv.id)}
              className="p-1 text-green-600 hover:text-green-700"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setRenamingId(null)}
              className="p-1 text-red-500 hover:text-red-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: modeInfo.badgeColor }}
                title={modeInfo.name}
              />
              <span className="truncate">{conv.title}</span>
            </div>

            {/* Hover Actions Menu */}
            <div
              className={`flex items-center gap-0.5 ${
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              } transition-opacity`}
              onClick={(e) => e.stopPropagation()}
            >
              {onTogglePinConversation && (
                <button
                  onClick={() => onTogglePinConversation(conv.id)}
                  className={`p-1 rounded-md text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] transition-colors ${
                    conv.pinned ? 'text-[#C7A46A]' : ''
                  }`}
                  title={conv.pinned ? 'Unpin chat' : 'Pin chat'}
                >
                  <Pin className="w-3 h-3" />
                </button>
              )}

              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === conv.id ? null : conv.id);
                  }}
                  className="p-1 rounded-md text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] transition-colors"
                >
                  <MoreVertical className="w-3 h-3" />
                </button>

                {activeMenuId === conv.id && (
                  <div className="absolute right-0 top-full mt-1 w-32 rounded-xl bg-[#FCFAF7] dark:bg-[#211814] border border-[#DCC9B8] dark:border-[#3A2921] shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => handleStartRename(conv)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#4A3026] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/50 dark:hover:bg-[#2B1D17]"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Rename</span>
                    </button>
                    <button
                      onClick={() => {
                        onDeleteConversation(conv.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#F5EFE6] dark:bg-[#1A120E] border-r border-[#DCC9B8]/70 dark:border-[#3A2921] select-none">
      {/* Header & Logo */}
      <div className="p-4 flex items-center justify-between border-b border-[#EDE1D5] dark:border-[#2B1D17]">
        <div className="flex items-center gap-2.5">
          <AuraSymbol size={22} variant="gold" />
          <span className="font-serif font-medium text-base tracking-wide text-[#2B1D17] dark:text-[#FCFAF7]">
            AURA
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] transition-colors"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-[#C7A46A]" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Desktop Collapse Button */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] transition-colors"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={() => {
            onNewConversation();
            if (isMobileOpen) onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2B1D17] dark:bg-[#FCFAF7] text-[#FCFAF7] dark:text-[#2B1D17] hover:bg-[#4A3026] dark:hover:bg-[#EDE1D5] active:scale-98 text-xs font-medium tracking-wide transition-all shadow-sm"
        >
          <Plus className="w-4 h-4 text-[#C7A46A]" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Search Input */}
      {conversations.length > 4 && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A7A70]" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[#EDE1D5]/50 dark:bg-[#17110E] border border-[#DCC9B8]/40 dark:border-[#3A2921] text-[#2B1D17] dark:text-[#EDE1D5] placeholder:text-[#8A7A70] focus:outline-none focus:border-[#C7A46A] transition-colors"
            />
          </div>
        </div>
      )}

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4 scrollbar-thin">
        {groupedConversations.pinned.length > 0 && (
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[#8A7A70]">
              Pinned
            </p>
            {groupedConversations.pinned.map(renderConversationItem)}
          </div>
        )}

        {groupedConversations.today.length > 0 && (
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[#8A7A70]">
              Today
            </p>
            {groupedConversations.today.map(renderConversationItem)}
          </div>
        )}

        {groupedConversations.yesterday.length > 0 && (
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[#8A7A70]">
              Yesterday
            </p>
            {groupedConversations.yesterday.map(renderConversationItem)}
          </div>
        )}

        {groupedConversations.previous7Days.length > 0 && (
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[#8A7A70]">
              Previous 7 Days
            </p>
            {groupedConversations.previous7Days.map(renderConversationItem)}
          </div>
        )}

        {groupedConversations.older.length > 0 && (
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[#8A7A70]">
              Older
            </p>
            {groupedConversations.older.map(renderConversationItem)}
          </div>
        )}

        {filteredConversations.length === 0 && (
          <div className="p-4 text-center text-xs text-[#8A7A70]">
            No conversations found.
          </div>
        )}
      </div>

      {/* Footer Settings */}
      <div className="p-3 border-t border-[#EDE1D5] dark:border-[#2B1D17]">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#4A3026] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] transition-all"
        >
          <Settings className="w-4 h-4 text-[#8A6756]" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block transition-all duration-200 ease-in-out ${
          isDesktopOpen ? 'w-64 min-w-[16rem]' : 'w-0 min-w-0 overflow-hidden border-none'
        } h-screen sticky top-0`}
      >
        {isDesktopOpen && sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
