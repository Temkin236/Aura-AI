import React, { useState, useMemo, useEffect } from 'react';
import { Conversation, AIModeId } from '../../types';
import { AuraSymbol } from '../aura/AuraSymbol';
import { AI_MODES } from '../../data/modes';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Archive, 
  Trash2, 
  X, 
  Settings, 
  Sliders, 
  Moon, 
  Sun,
  LayoutDashboard,
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
  onArchiveConversation: (id: string) => void;
  onTogglePinConversation: (id: string) => void;
  isDesktopOpen: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onOpenLanding: () => void;
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
  onArchiveConversation,
  onTogglePinConversation,
  isDesktopOpen,
  isMobileOpen,
  onCloseMobile,
  onToggleCollapse,
  onOpenSettings,
  onOpenAdmin,
  onOpenLanding,
  isDarkMode,
  onToggleTheme
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

  // Group conversations by time (TODAY, YESTERDAY, PREVIOUS 7 DAYS, OLDER)
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
      older: []
    };

    filteredConversations.forEach((conv) => {
      if (conv.pinned) {
        groups.pinned.push(conv);
        return;
      }

      const convDate = new Date(conv.updatedAt).setHours(0, 0, 0, 0);
      if (convDate === today) {
        groups.today.push(conv);
      } else if (convDate >= today - oneDay) {
        groups.yesterday.push(conv);
      } else if (convDate >= today - 7 * oneDay) {
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

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-[#17110E]/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 sm:w-80 flex flex-col bg-[#F8F3ED] dark:bg-[#1E1612] border-r border-[#DCC9B8]/70 dark:border-[#3A2921] transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isDesktopOpen ? 'lg:flex' : 'lg:hidden'}`}
      >
        {/* Top Header: AURA logo & wordmark */}
        <div className="p-4 flex items-center justify-between border-b border-[#EDE1D5] dark:border-[#2B1D17]">
          <button
            onClick={() => {
              onOpenLanding();
              onCloseMobile();
            }}
            className="flex items-center gap-3 group text-left"
            title="Return to Home"
          >
            <AuraSymbol size={28} glow={false} variant="gold" />
            <div>
              <span className="font-serif text-lg tracking-wide font-medium text-[#2B1D17] dark:text-[#FCFAF7] group-hover:text-[#6B493B] transition-colors">
                AURA
              </span>
              <span className="font-mono text-xs text-[#C7A46A] tracking-wider ml-1.5 uppercase font-medium">
                AI
              </span>
            </div>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-[#8A6756] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] transition-colors hidden lg:flex"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-[#8A6756] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] transition-colors lg:hidden"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action: New Conversation Button */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              onNewConversation();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2B1D17] dark:bg-[#2B1D17] text-[#FCFAF7] hover:bg-[#4A3026] dark:hover:bg-[#3A2921] transition-all shadow-xs group font-sans text-xs tracking-wide uppercase font-semibold"
          >
            <Plus className="w-4 h-4 text-[#C7A46A] group-hover:rotate-90 transition-transform duration-200" />
            <span>New conversation</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A7A70]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-[#EDE1D5]/50 dark:bg-[#17110E]/60 border border-[#DCC9B8]/60 dark:border-[#3A2921] text-[#2B1D17] dark:text-[#EDE1D5] placeholder:text-[#8A7A70] focus:outline-none focus:border-[#C7A46A] transition-colors"
            />
          </div>
        </div>

        {/* Conversation History List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-[#8A7A70] dark:text-[#8A6756]">
              {searchQuery ? 'No matching conversations' : 'No conversations yet'}
            </div>
          ) : (
            <>
              {/* Pinned Section */}
              {groupedConversations.pinned.length > 0 && (
                <HistorySection
                  title="PINNED"
                  conversations={groupedConversations.pinned}
                  activeId={activeConversationId}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  activeMenuId={activeMenuId}
                  onSelect={onSelectConversation}
                  onRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onChangeRename={setRenameValue}
                  onCancelRename={() => setRenamingId(null)}
                  onArchive={onArchiveConversation}
                  onDelete={onDeleteConversation}
                  onTogglePin={onTogglePinConversation}
                  onToggleMenu={(id) => setActiveMenuId(activeMenuId === id ? null : id)}
                />
              )}

              {/* Today Section */}
              {groupedConversations.today.length > 0 && (
                <HistorySection
                  title="TODAY"
                  conversations={groupedConversations.today}
                  activeId={activeConversationId}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  activeMenuId={activeMenuId}
                  onSelect={onSelectConversation}
                  onRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onChangeRename={setRenameValue}
                  onCancelRename={() => setRenamingId(null)}
                  onArchive={onArchiveConversation}
                  onDelete={onDeleteConversation}
                  onTogglePin={onTogglePinConversation}
                  onToggleMenu={(id) => setActiveMenuId(activeMenuId === id ? null : id)}
                />
              )}

              {/* Yesterday Section */}
              {groupedConversations.yesterday.length > 0 && (
                <HistorySection
                  title="YESTERDAY"
                  conversations={groupedConversations.yesterday}
                  activeId={activeConversationId}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  activeMenuId={activeMenuId}
                  onSelect={onSelectConversation}
                  onRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onChangeRename={setRenameValue}
                  onCancelRename={() => setRenamingId(null)}
                  onArchive={onArchiveConversation}
                  onDelete={onDeleteConversation}
                  onTogglePin={onTogglePinConversation}
                  onToggleMenu={(id) => setActiveMenuId(activeMenuId === id ? null : id)}
                />
              )}

              {/* Previous 7 Days Section */}
              {groupedConversations.previous7Days.length > 0 && (
                <HistorySection
                  title="PREVIOUS 7 DAYS"
                  conversations={groupedConversations.previous7Days}
                  activeId={activeConversationId}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  activeMenuId={activeMenuId}
                  onSelect={onSelectConversation}
                  onRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onChangeRename={setRenameValue}
                  onCancelRename={() => setRenamingId(null)}
                  onArchive={onArchiveConversation}
                  onDelete={onDeleteConversation}
                  onTogglePin={onTogglePinConversation}
                  onToggleMenu={(id) => setActiveMenuId(activeMenuId === id ? null : id)}
                />
              )}

              {/* Older Section */}
              {groupedConversations.older.length > 0 && (
                <HistorySection
                  title="OLDER"
                  conversations={groupedConversations.older}
                  activeId={activeConversationId}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  activeMenuId={activeMenuId}
                  onSelect={onSelectConversation}
                  onRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onChangeRename={setRenameValue}
                  onCancelRename={() => setRenamingId(null)}
                  onArchive={onArchiveConversation}
                  onDelete={onDeleteConversation}
                  onTogglePin={onTogglePinConversation}
                  onToggleMenu={(id) => setActiveMenuId(activeMenuId === id ? null : id)}
                />
              )}
            </>
          )}
        </div>

        {/* Bottom Bar: Settings, Admin, Theme Toggle */}
        <div className="p-3 border-t border-[#EDE1D5] dark:border-[#2B1D17] bg-[#F8F3ED]/80 dark:bg-[#1E1612]/80 space-y-1">
          <div className="flex items-center justify-between px-1 py-1">
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] transition-colors"
              title="Toggle theme"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#C7A46A]" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#6B493B]" />
                  <span>Dark</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                onOpenSettings();
                onCloseMobile();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => {
                onOpenAdmin();
                onCloseMobile();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] transition-colors"
              title="Admin Console"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#C7A46A]" />
              <span>Admin</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

interface HistorySectionProps {
  title: string;
  conversations: Conversation[];
  activeId: string | null;
  renamingId: string | null;
  renameValue: string;
  activeMenuId: string | null;
  onSelect: (id: string) => void;
  onRename: (conv: Conversation) => void;
  onSaveRename: (id: string) => void;
  onChangeRename: (val: string) => void;
  onCancelRename: () => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleMenu: (id: string) => void;
}

const HistorySection: React.FC<HistorySectionProps> = ({
  title,
  conversations,
  activeId,
  renamingId,
  renameValue,
  activeMenuId,
  onSelect,
  onRename,
  onSaveRename,
  onChangeRename,
  onCancelRename,
  onArchive,
  onDelete,
  onTogglePin,
  onToggleMenu
}) => {
  return (
    <div>
      <h4 className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase text-[#8A7A70] dark:text-[#8A6756]">
        {title}
      </h4>
      <div className="space-y-0.5 mt-1">
        {conversations.map((conv) => {
          const isActive = conv.id === activeId;
          const isRenaming = conv.id === renamingId;
          const isMenuOpen = conv.id === activeMenuId;
          const modeInfo = AI_MODES[conv.mode as AIModeId];

          return (
            <div
              key={conv.id}
              className={`group relative rounded-xl transition-all duration-150 ${
                isActive
                  ? 'bg-[#EDE1D5] dark:bg-[#2B1D17] text-[#2B1D17] dark:text-[#FCFAF7]'
                  : 'hover:bg-[#EDE1D5]/40 dark:hover:bg-[#211814] text-[#4A3026] dark:text-[#DCC9B8]'
              }`}
            >
              {isRenaming ? (
                <div className="flex items-center gap-1.5 p-1.5">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => onChangeRename(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveRename(conv.id);
                      if (e.key === 'Escape') onCancelRename();
                    }}
                    autoFocus
                    className="flex-1 px-2 py-1 text-xs rounded bg-white dark:bg-[#17110E] border border-[#C7A46A] text-[#2B1D17] dark:text-[#EDE1D5] focus:outline-none"
                  />
                  <button
                    onClick={() => onSaveRename(conv.id)}
                    className="p-1 hover:text-[#C7A46A]"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={onCancelRename} className="p-1 hover:text-[#8A6756]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2">
                  <button
                    type="button"
                    onClick={() => onSelect(conv.id)}
                    className="flex-1 min-w-0 text-left flex items-center gap-2"
                  >
                    {conv.pinned && (
                      <Pin className="w-3 h-3 text-[#C7A46A] flex-shrink-0" />
                    )}
                    <span className="text-xs font-medium truncate">
                      {conv.title}
                    </span>
                  </button>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMenu(conv.id);
                      }}
                      className="p-1 rounded hover:bg-[#DCC9B8]/50 dark:hover:bg-[#3A2921] text-[#8A6756] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7]"
                      aria-label="Conversation options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Context Dropdown Menu */}
              {isMenuOpen && (
                <div
                  className="absolute right-2 top-full mt-1 w-36 rounded-xl bg-[#FCFAF7] dark:bg-[#211814] border border-[#DCC9B8] dark:border-[#3A2921] shadow-lg p-1 z-50 animate-in fade-in zoom-in-95 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      onTogglePin(conv.id);
                      onToggleMenu(conv.id);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] text-[#4A3026] dark:text-[#EDE1D5]"
                  >
                    <Pin className="w-3.5 h-3.5 text-[#C7A46A]" />
                    <span>{conv.pinned ? 'Unpin' : 'Pin'}</span>
                  </button>

                  <button
                    onClick={() => onRename(conv)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] text-[#4A3026] dark:text-[#EDE1D5]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Rename</span>
                  </button>

                  <button
                    onClick={() => {
                      onArchive(conv.id);
                      onToggleMenu(conv.id);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] text-[#4A3026] dark:text-[#EDE1D5]"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive</span>
                  </button>

                  <button
                    onClick={() => {
                      onDelete(conv.id);
                      onToggleMenu(conv.id);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-100/50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
