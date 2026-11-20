import React, { useState, useRef, useEffect } from 'react';
import type { User, LocalServerConfig } from '../types';
import { BellIcon, UserCircleIcon, FolderIcon, SaveIcon, NetworkIcon, CloudIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppTheme } from '../contexts/ThemeContext';
import { Ticket, ChevronDown, ChevronLeft, ChevronRight, BookOpen, Search, Sparkles, MoreHorizontal, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { APP_VERSION_NAME, APP_CLASSIC_VERSION_NAME, UiVersionMode, getUiVersionMode, setUiVersionMode } from '../utils/version';
import { getEffectiveUserAiQuota, triggerAiDiagnosticsModal } from '../services/geminiService';


interface HeaderProps {
  currentUser: User | null;
  onRegister: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onOpenProjects: () => void;
  onSaveProject: () => void;
  activeOrgName?: string;
  currentUserRole?: string;
  onOpenTicketManager: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  notificationsCount: number;
  isManualOffline?: boolean;
  onToggleOffline?: () => void;
  isCloudQuotaExceeded?: boolean;
  onOpenLocalServerConfig?: () => void;
  localServerConfig?: LocalServerConfig;
  onPushToCloud?: () => Promise<void>;
  pendingSyncCount?: number;
  onOpenDataAuditor: () => void;
  onOpenHomepage?: () => void;
  onOpenHelp?: () => void;
  onOpenChat?: () => void;
  onOpenMeet?: () => void;
  onOpenAssistant?: () => void;
  onOpenNotes?: () => void;
  notesCount?: number;
  onOpenThemeStudio?: () => void;
  onOpenGlobalSearch?: () => void;
  onOpenAiTopUp?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  currentUser, onRegister, onLogin, onLogout, onOpenProjects, onSaveProject, 
  activeOrgName, onOpenTicketManager, onOpenProfile, currentUserRole,
  onOpenNotifications, notificationsCount, isManualOffline, onToggleOffline,
  isCloudQuotaExceeded, onOpenLocalServerConfig, localServerConfig,
  onPushToCloud, pendingSyncCount = 0, onOpenDataAuditor, onOpenHomepage,
  onOpenHelp, onOpenChat, onOpenMeet, onOpenAssistant, onOpenNotes, notesCount = 0,
  onOpenThemeStudio, onOpenGlobalSearch, onOpenAiTopUp
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMoreBarOpen, setIsMoreBarOpen] = useState(false);
  const [isTabletMenuOpen, setIsTabletMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreBarRef = useRef<HTMLDivElement>(null);
  const tabletMenuRef = useRef<HTMLDivElement>(null);
  const middleScrollRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ isDown: boolean; startX: number; scrollLeft: number; dragged: boolean }>({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    dragged: false,
  });
  const [isDraggingBar, setIsDraggingBar] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const { language, setLanguage, currency, setCurrency, region, setRegion, t } = useLanguage();
  const { isDark, currentTheme } = useAppTheme();
  const [storageUsage, setStorageUsage] = useState(0);
  const [uiVersionMode, setUiVersionModeState] = useState<UiVersionMode>(getUiVersionMode());

  const updateScrollArrows = () => {
    const el = middleScrollRef.current;
    if (!el) return;
    const overflowing = el.scrollWidth > el.clientWidth + 4;
    setIsOverflowing(overflowing);
    setCanScrollLeft(overflowing && el.scrollLeft > 4);
    setCanScrollRight(overflowing && el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollArrows();
    const el = middleScrollRef.current;
    if (!el) return;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollArrows) : null;
    ro?.observe(el);
    if (el.firstElementChild) {
      ro?.observe(el.firstElementChild);
    }
    window.addEventListener('resize', updateScrollArrows);
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      (document as any).fonts.ready.then(updateScrollArrows).catch(() => {});
    }
    const t1 = setTimeout(updateScrollArrows, 120);
    const t2 = setTimeout(updateScrollArrows, 450);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateScrollArrows);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pendingSyncCount, localServerConfig?.isLocalMode, isManualOffline, region, language, currency, uiVersionMode]);

  const scrollMiddleBy = (delta: number) => {
    const el = middleScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
    setTimeout(updateScrollArrows, 280);
  };

  const handleMiddleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = middleScrollRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth + 4 && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
      updateScrollArrows();
    }
  };

  const handleBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = middleScrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth + 4) return;
    dragStateRef.current = {
      isDown: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      dragged: false,
    };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current.isDown) return;
      const el = middleScrollRef.current;
      if (!el) return;
      const dx = e.clientX - dragStateRef.current.startX;
      if (Math.abs(dx) > 5) {
        dragStateRef.current.dragged = true;
        setIsDraggingBar(true);
      }
      if (dragStateRef.current.dragged) {
        el.scrollLeft = dragStateRef.current.scrollLeft - dx;
        updateScrollArrows();
      }
    };
    const onMouseUp = () => {
      if (!dragStateRef.current.isDown) return;
      dragStateRef.current.isDown = false;
      setIsDraggingBar(false);
      setTimeout(() => {
        dragStateRef.current.dragged = false;
      }, 0);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const handleBarClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragStateRef.current.dragged) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  useEffect(() => {
    const handleVersionChange = (e: any) => {
      if (e.detail?.mode) setUiVersionModeState(e.detail.mode);
    };
    window.addEventListener('agrimap-ui-version-changed', handleVersionChange);
    return () => window.removeEventListener('agrimap-ui-version-changed', handleVersionChange);
  }, []);

  const toggleUiVersion = () => {
    const nextMode: UiVersionMode = uiVersionMode === 'modern' ? 'classic' : 'modern';
    setUiVersionMode(nextMode);
    setUiVersionModeState(nextMode);
    toast.success(
      nextMode === 'modern'
        ? (language === 'ka' ? 'გადაირთო sonik G2.0.1.4 (თანამედროვე მინიმალისტური)' : 'Switched to sonik G2.0.1.4 (Modern Minimalist)')
        : (language === 'ka' ? 'გადაირთო sonik G2.0.1.3 (კლასიკური მრავალპანელიანი)' : 'Switched to sonik G2.0.1.3 (Classic Comprehensive)')
    );
  };


  const aiQuota = getEffectiveUserAiQuota(currentUser);
  const freeRemaining = Math.max(0, aiQuota.monthlyFreeTierTotal - aiQuota.monthlyFreeTierUsed);
  const isFounder = (currentUser?.roles || []).some(r => ['Founder', 'Co-Founder', 'ROOT_SUPER_ADMIN'].includes(r));

  const canManageLocalServer = currentUser?.roles?.some(r => r === 'Founder' || r === 'Admin' || r === 'ROOT_SUPER_ADMIN');

  const handleSyncClick = async () => {
      if (!onPushToCloud) return;
      setIsSyncing(true);
      await onPushToCloud();
      setIsSyncing(false);
  };

  useEffect(() => {
    const updateUsage = () => {
      let total = 0;
      for (let x in localStorage) {
        if (!localStorage.hasOwnProperty(x)) continue;
        total += ((localStorage[x].length + x.length) * 2);
      }
      const percentage = (total / (5 * 1024 * 1024)) * 100;
      setStorageUsage(Math.min(100, percentage));
    };
    updateUsage();
    window.addEventListener('storage', updateUsage);
    return () => window.removeEventListener('storage', updateUsage);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (moreBarRef.current && !moreBarRef.current.contains(event.target as Node)) {
        setIsMoreBarOpen(false);
      }
      if (tabletMenuRef.current && !tabletMenuRef.current.contains(event.target as Node)) {
        setIsTabletMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        setIsMoreBarOpen(false);
        setIsTabletMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'ka' : 'en';
    setLanguage(newLang);
    setCurrency(newLang === 'ka' ? 'GEL' : 'USD');
  };

  return (
    <div 
      className={`module-header flex-shrink-0 min-h-[54px] sm:min-h-[60px] py-1.5 flex items-center justify-between px-2 sm:px-3.5 xl:px-5 z-[1000] shadow-sm relative transition-colors border-b gap-1.5 sm:gap-2 xl:gap-3 ${
        isDark 
          ? 'bg-[#0d1527] border-slate-800/90 text-slate-100' 
          : 'bg-white border-gray-200 text-slate-800'
      }`}
      style={{
        backgroundColor: currentTheme.bgHeader || undefined,
        borderColor: currentTheme.borderColor || undefined,
        color: currentTheme.menubarLetterColor || currentTheme.universalLetterColor || undefined
      }}
    >
        {/* Left Side: Auto-resizing Brand Logo, Active Workspace, Cache & Search */}
        <div className="flex items-center gap-1.5 sm:gap-2 xl:gap-2.5 min-w-0 flex-shrink">
            <div className="flex flex-col lg:hidden justify-center text-left shrink-0 py-0.5">
                <button 
                    type="button" 
                    onClick={onOpenHomepage} 
                    className="font-black text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 text-sm sm:text-base tracking-tight leading-tight transition-colors cursor-pointer text-left whitespace-nowrap"
                    title={language === 'ka' ? 'მთავარი დაფა' : 'Go to Dashboard'}
                >
                    AgriMap
                </button>
                <button 
                    type="button"
                    onClick={toggleUiVersion}
                    className="hidden sm:flex text-[9px] font-semibold text-slate-400 hover:text-emerald-500 font-mono leading-none mt-0.5 cursor-pointer items-center gap-1 whitespace-nowrap"
                    title="Click to switch whole application version"
                >
                    <span>{uiVersionMode === 'modern' ? APP_VERSION_NAME : APP_CLASSIC_VERSION_NAME}</span>
                </button>
            </div>
            
            {activeOrgName && (
              <button 
                type="button"
                onClick={onOpenTicketManager}
                className={`flex items-center gap-1.5 px-2 sm:px-2.5 min-h-[38px] py-1 rounded-xl transition-all group max-w-[116px] sm:max-w-[165px] md:max-w-[200px] xl:max-w-[190px] border standing-light standing-beam shrink-0 cursor-pointer ${
                  isDark 
                    ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200' 
                    : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100 text-indigo-900'
                }`}
              >
                <div className={`p-1 rounded-lg text-white group-hover:scale-105 transition-transform flex-shrink-0 ${isDark ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
                  <Ticket size={13} />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className={`text-[8px] font-bold uppercase leading-none truncate w-full text-left ${isDark ? 'text-emerald-400' : 'text-indigo-500'}`}>{currentUserRole || 'Member'} at</span>
                  <div className="flex items-center gap-0.5 min-w-0 w-full mt-0.5">
                    <span className={`text-[11px] font-bold tracking-tight truncate ${isDark ? 'text-white' : 'text-indigo-950'}`}>{activeOrgName}</span>
                    <ChevronDown size={11} className={`shrink-0 ${isDark ? 'text-slate-400' : 'text-indigo-500'}`} />
                  </div>
                </div>
              </button>
            )}

            <div className={`hidden 2xl:flex items-center gap-2 px-2.5 py-1.5 rounded-xl border standing-light shrink-0 ${isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`} title="Amount of data stored locally in your browser for offline use (max 5MB)">
                <div className="flex flex-col">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Cache</span>
                    <div className={`w-14 h-1 rounded-full mt-1 overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                        <div 
                          className={`h-full transition-all duration-1000 ${storageUsage > 90 ? 'bg-red-500' : storageUsage > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${storageUsage}%` }}
                        />
                    </div>
                </div>
                <span className="text-[9px] font-black font-mono tabular-nums">{storageUsage.toFixed(0)}%</span>
            </div>

            {/* Auto-Resizing Global Spotlight Search Bar */}
            {onOpenGlobalSearch && (
                <button
                    type="button"
                    onClick={onOpenGlobalSearch}
                    className={`flex items-center justify-center sm:justify-between gap-1.5 min-h-[38px] w-9 sm:w-32 md:w-44 lg:w-48 xl:w-40 2xl:w-48 px-0 sm:px-2.5 py-1.5 rounded-xl border transition-all text-xs font-semibold shadow-xs flex-shrink-0 group cursor-pointer ${
                        isDark 
                            ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:border-emerald-500/50 hover:text-white' 
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-slate-900'
                    }`}
                    title={language === 'ka' ? 'გლობალური ძიება (⌘K)' : 'Search everything (⌘K or /)'}
                    aria-label={language === 'ka' ? 'ძიება' : 'Search'}
                >
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                        <span className="hidden sm:inline truncate text-xs font-medium text-slate-500 dark:text-slate-300">
                            {language === 'ka' ? 'ძიება...' : 'Search...'}
                        </span>
                    </div>
                    <kbd className={`hidden xl:inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-mono font-bold rounded border shrink-0 ${
                        isDark 
                            ? 'bg-slate-800 border-slate-700 text-slate-400' 
                            : 'bg-white border-slate-200 text-slate-500'
                    }`}>
                        ⌘K
                    </kbd>
                </button>
            )}
        </div>

        {/* Tablet & Mobile Auto-Adaptive Dropdown Menu (< xl / 1280px) */}
        <div className="flex xl:hidden flex-1 min-w-0 items-center justify-end gap-1.5 sm:gap-2 relative" ref={tabletMenuRef}>
            <button
                type="button"
                onClick={() => setIsTabletMenuOpen(prev => !prev)}
                className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-2xs ${
                    isTabletMenuOpen
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                        : pendingSyncCount > 0
                            ? isDark
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                                : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                            : isDark
                                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                aria-expanded={isTabletMenuOpen}
                aria-label={language === 'ka' ? 'ზედა პანელის მენიუ' : 'Top bar controls menu'}
            >
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{language === 'ka' ? 'მენიუ' : 'Controls'}</span>
                {pendingSyncCount > 0 ? (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black font-mono tabular-nums leading-none ${
                        isTabletMenuOpen ? 'bg-white/20 text-white' : 'bg-amber-500 text-slate-950'
                    }`}>
                        {pendingSyncCount}
                    </span>
                ) : (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                        isManualOffline ? 'bg-amber-500' : isCloudQuotaExceeded ? 'bg-red-500' : 'bg-emerald-500'
                    }`} />
                )}
                <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${isTabletMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <button
                type="button"
                onClick={onSaveProject}
                className="hidden md:flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex-shrink-0 cursor-pointer whitespace-nowrap"
            >
                <SaveIcon className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t('common.save')}</span>
            </button>

            {isTabletMenuOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[1350] bg-slate-950/20 sm:bg-transparent"
                        onClick={() => setIsTabletMenuOpen(false)}
                    />
                    <div
                        className={`fixed sm:absolute right-2 sm:right-0 top-[60px] sm:top-full sm:mt-2 w-[min(22rem,calc(100vw-1rem))] max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl shadow-2xl border p-3 z-[1400] space-y-2 animate-in fade-in zoom-in-95 duration-150 ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                    >
                        <div className={`flex items-center justify-between px-1 pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                            <span className="text-xs font-black tracking-tight">
                                {language === 'ka' ? 'მართვის პანელი და პარამეტრები' : 'Workspace Controls & Sync'}
                            </span>
                            <span className="text-[11px] font-mono tabular-nums text-slate-400">
                                {uiVersionMode === 'modern' ? 'V2.0.1.4' : 'V2.0.1.3'}
                            </span>
                        </div>

                        {/* Pending Sync Banner */}
                        {pendingSyncCount > 0 && (
                            <button
                                type="button"
                                onClick={() => { handleSyncClick(); setIsTabletMenuOpen(false); }}
                                disabled={isSyncing}
                                className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs cursor-pointer shadow-sm transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <CloudIcon className="w-4 h-4 shrink-0" />
                                    <span>{isSyncing ? (language === 'ka' ? 'იგზავნება...' : 'Pushing...') : (language === 'ka' ? `ღრუბელში გაგზავნა (${pendingSyncCount})` : `Push Pending Sync (${pendingSyncCount})`)}</span>
                                </span>
                                <ChevronRight className="w-4 h-4 shrink-0" />
                            </button>
                        )}

                        {/* Connection & Server Controls */}
                        <div className="space-y-1">
                            {onToggleOffline && (
                                <button
                                    type="button"
                                    onClick={() => { onToggleOffline(); setIsTabletMenuOpen(false); }}
                                    className={`w-full min-h-[42px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                                >
                                    <span>{isManualOffline ? (language === 'ka' ? 'ოფლაინ რეჟიმი (გადართე ონლაინზე)' : 'Offline Mode (Switch Online)') : isCloudQuotaExceeded ? 'Cloud Quota Limit' : (language === 'ka' ? 'ღრუბლოვანი სინქრონიზაცია აქტიურია' : 'Cloud Sync Active')}</span>
                                    <span className={`text-[11px] font-bold flex items-center gap-1.5 ${isManualOffline ? 'text-amber-500' : isCloudQuotaExceeded ? 'text-red-500' : 'text-emerald-600'}`}>
                                        <span className={`w-2 h-2 rounded-full ${isManualOffline ? 'bg-amber-500' : isCloudQuotaExceeded ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                        {isManualOffline ? 'Offline' : 'Cloud'}
                                    </span>
                                </button>
                            )}

                            {canManageLocalServer && (
                                <button
                                    type="button"
                                    onClick={() => { onOpenLocalServerConfig?.(); setIsTabletMenuOpen(false); }}
                                    className={`w-full min-h-[42px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-indigo-50/70'}`}
                                >
                                    <span>{localServerConfig?.isLocalMode ? (language === 'ka' ? 'ლოკალური სერვერი (ჩართულია)' : 'Local Private Server (Active)') : (language === 'ka' ? 'ლოკალური სერვერის კვანძი' : 'Local Server Node')}</span>
                                    <NetworkIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => { onOpenAiTopUp?.(); setIsTabletMenuOpen(false); }}
                                className={`w-full min-h-[42px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-emerald-50/70'}`}
                            >
                                <span className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>{language === 'ka' ? 'AI კვოტა და კრედიტები' : 'AI Quota & Credits'}</span>
                                </span>
                                <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-black">
                                    {isFounder ? '∞' : freeRemaining > 0 ? `${freeRemaining}` : `${aiQuota.aiCreditsBalance} Cr`}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { toggleUiVersion(); setIsTabletMenuOpen(false); }}
                                className={`w-full min-h-[42px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                            >
                                <span>{language === 'ka' ? 'ინტერფეისის ვერსია' : 'Interface Version'}</span>
                                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black">
                                    {uiVersionMode === 'modern' ? 'Modern V2.0.1.4' : 'Classic V2.0.1.3'}
                                </span>
                            </button>
                        </div>

                        {/* Offline Storage Cache Indicator */}
                        <div className={`px-3 py-2 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
                                <span className="text-slate-500">{language === 'ka' ? 'ბრაუზერის ოფლაინ მეხსიერება' : 'Local Offline Cache'}</span>
                                <span className="font-mono tabular-nums font-bold">{storageUsage.toFixed(0)}%</span>
                            </div>
                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                <div
                                    className={`h-full transition-all duration-700 ${storageUsage > 90 ? 'bg-red-500' : storageUsage > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${storageUsage}%` }}
                                />
                            </div>
                        </div>

                        {/* Region / Language / Currency Quick Grid */}
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                            <button
                                type="button"
                                onClick={() => setRegion(region === 'GE' ? 'GLOBAL' : 'GE')}
                                className={`min-h-[42px] px-2 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                            >
                                {region === 'GE' ? '🇬🇪 GE' : '🌐 GL'}
                            </button>
                            <button
                                type="button"
                                onClick={toggleLanguage}
                                className={`min-h-[42px] px-2 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                            >
                                {language === 'en' ? '🇺🇸 EN' : '🇬🇪 GE'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrency(currency === 'USD' ? 'GEL' : 'USD')}
                                className={`min-h-[42px] px-2 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                            >
                                {currency === 'USD' ? '💲 USD' : '₾ GEL'}
                            </button>
                        </div>

                        {/* Primary Save Action inside Dropdown */}
                        <button
                            type="button"
                            onClick={() => { onSaveProject(); setIsTabletMenuOpen(false); }}
                            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm transition-colors"
                        >
                            <SaveIcon className="w-4 h-4 shrink-0" />
                            <span>{t('common.save')}</span>
                        </button>
                    </div>
                </>
            )}
        </div>

        {/* Desktop Middle Area (>= xl / 1280px): Full inline toolbar with smart overflow arrows */}
        <div className="hidden xl:flex flex-1 min-w-0 items-center relative">
            {isOverflowing && (
                <button
                    type="button"
                    onClick={() => scrollMiddleBy(-190)}
                    disabled={!canScrollLeft}
                    className={`flex-shrink-0 mr-1 p-1.5 rounded-lg border shadow-xs transition-all z-10 ${
                        canScrollLeft
                            ? isDark
                                ? 'bg-slate-800 hover:bg-emerald-600 border-emerald-500/50 text-emerald-300 hover:text-white cursor-pointer'
                                : 'bg-emerald-50 hover:bg-emerald-600 border-emerald-300 text-emerald-700 hover:text-white cursor-pointer'
                            : isDark
                                ? 'bg-slate-900/50 border-slate-800 text-slate-600 opacity-45 cursor-default'
                                : 'bg-slate-50 border-slate-200 text-slate-300 opacity-60 cursor-default'
                    }`}
                    title={language === 'ka' ? 'მარცხნივ გადაწევა (ასევე შეგიძლიათ მაუსით გადაათრიოთ ზოლი)' : 'Move toolbar left (or click & drag the bar)'}
                    aria-label="Scroll toolbar left"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                </button>
            )}

            <div
                ref={middleScrollRef}
                onScroll={updateScrollArrows}
                onWheel={handleMiddleWheel}
                onMouseDown={handleBarMouseDown}
                onClickCapture={handleBarClickCapture}
                className={`flex-1 flex items-center justify-start gap-1 xl:gap-1.5 overflow-x-auto custom-scrollbar-hide flex-nowrap min-w-0 py-1 select-none ${
                    isOverflowing
                        ? isDraggingBar
                            ? 'cursor-grabbing'
                            : 'cursor-grab'
                        : ''
                }`}
                style={{ WebkitOverflowScrolling: 'touch' }}
                title={isOverflowing ? (language === 'ka' ? 'გადაათრიეთ მარცხნივ/მარჯვნივ ან გამოიყენეთ ისრები' : 'Drag left/right, use mouse wheel, or click arrows to move toolbar') : undefined}
            >
                <div className="flex items-center gap-1 xl:gap-1.5 flex-nowrap shrink-0 ml-auto">
                    {pendingSyncCount > 0 && (
                        <button
                            onClick={handleSyncClick}
                            disabled={isSyncing}
                            className="flex items-center flex-shrink-0 standing-light standing-beam cursor-pointer"
                        >
                            <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md transition-all animate-pulse">
                                <CloudIcon className="h-3.5 w-3.5 animate-bounce" />
                                <span className="text-[9px] font-black uppercase tracking-wider leading-none whitespace-nowrap">{isSyncing ? 'Pushing...' : `Push ${pendingSyncCount}`}</span>
                            </div>
                        </button>
                    )}

                    {canManageLocalServer && (
                        <button
                            onClick={onOpenLocalServerConfig}
                            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl border transition-all flex-shrink-0 standing-light standing-beam cursor-pointer ${
                                localServerConfig?.isLocalMode 
                                ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg underglow-box-active' 
                                : isDark
                                ? 'bg-slate-900/90 border-slate-700 text-indigo-400 hover:bg-slate-800'
                                : 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100'
                            }`}
                            title={localServerConfig?.isLocalMode ? `Connected to Local Server: ${localServerConfig.serverIp}` : "Switch to Local Private Server Mode"}
                        >
                            <NetworkIcon className={`h-3.5 w-3.5 shrink-0 ${localServerConfig?.isLocalMode ? 'animate-pulse' : ''}`} />
                            <span className="text-[9px] xl:text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                                {localServerConfig?.isLocalMode ? 'Local' : 'Node'}
                            </span>
                        </button>
                    )}

                    {onToggleOffline && (
                        <button
                            onClick={onToggleOffline}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border transition-all flex-shrink-0 standing-light standing-beam cursor-pointer ${
                                isManualOffline 
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-inner underglow-box-active' 
                                : isDark
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={isManualOffline ? "You are currently OFFLINE (Local Mode)" : "You are currently ONLINE (Cloud Sync Active)"}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0 ${isManualOffline ? 'bg-amber-500' : isCloudQuotaExceeded ? 'bg-red-500' : 'bg-emerald-500'}`} />
                            <span className="text-[9px] xl:text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                                {isManualOffline ? 'Offline' : isCloudQuotaExceeded ? 'Quota' : 'Cloud'}
                            </span>
                        </button>
                    )}

                    {/* AI Quota & Top-Up Trigger */}
                    <button
                        onClick={onOpenAiTopUp}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-xl border text-[10px] font-mono font-bold transition-all flex-shrink-0 standing-light cursor-pointer ${
                            isDark 
                                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-400/50' 
                                : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                        }`}
                        title={language === 'ka' ? 'AI კვოტა, ტარიფები და ბალანსის შევსება' : 'AI Quota, Architecture & Top-Up'}
                    >
                        <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="font-semibold tracking-tight">AI</span>
                        <span className="tabular-nums font-mono text-[10px] whitespace-nowrap">
                            {isFounder ? '∞' : freeRemaining > 0 ? `${freeRemaining}` : `${aiQuota.aiCreditsBalance} Cr`}
                        </span>
                    </button>

                    {/* UI Version Mode Switcher: sonik G2.0.1.4 (Modern) <-> sonik G2.0.1.3 (Classic) */}
                    <button
                        onClick={toggleUiVersion}
                        className={`px-2 py-1.5 rounded-xl border text-[10px] font-mono font-bold flex items-center gap-1 transition-all flex-shrink-0 standing-light cursor-pointer ${
                            uiVersionMode === 'modern'
                                ? isDark
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                : isDark
                                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/25'
                                  : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                        }`}
                        title={
                            uiVersionMode === 'modern'
                                ? 'Active: sonik G2.0.1.4 (Modern Minimalist). Click to switch to Classic G2.0.1.3'
                                : 'Active: sonik G2.0.1.3 (Classic Multi-Panel). Click to switch to Modern G2.0.1.4'
                        }
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="font-bold whitespace-nowrap">
                            {uiVersionMode === 'modern' ? 'V2.0.1.4' : 'V2.0.1.3'}
                        </span>
                        <span className={`hidden 2xl:inline text-[8px] uppercase tracking-wider px-1 py-0.5 rounded font-black ${
                            uiVersionMode === 'modern' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-indigo-500/20 text-indigo-600'
                        }`}>
                            {uiVersionMode === 'modern' ? 'MODERN' : 'CLASSIC'}
                        </span>
                    </button>

                    {/* Region Selector: Georgia (GE) vs Global (GLOBAL) */}
                    <button
                        onClick={() => setRegion(region === 'GE' ? 'GLOBAL' : 'GE')}
                        className={`px-2 py-1.5 rounded-xl border text-[10px] font-black flex items-center gap-1 transition-all flex-shrink-0 standing-light cursor-pointer ${
                            region === 'GE'
                                ? isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20' : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                                : isDark ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                        }`}
                        title={
                            region === 'GE'
                                ? 'Region: Georgia (GEL ₾, ha, Georgian Municipalities). Click for Global'
                                : 'Region: Global (USD $, ha/acres, International corridors). Click for Georgia'
                        }
                    >
                        <span>{region === 'GE' ? '🇬🇪' : '🌐'}</span>
                        <span className="font-bold whitespace-nowrap">{region === 'GE' ? 'GE' : 'GLOBAL'}</span>
                    </button>

                    {/* Language Toggle */}
                    <button
                        onClick={toggleLanguage}
                        className={`px-2 py-1.5 rounded-xl border text-[10px] font-black flex items-center gap-1 transition-all flex-shrink-0 standing-light standing-beam cursor-pointer ${
                          isDark 
                            ? 'bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800' 
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                        title="Switch Language"
                    >
                        <span>{language === 'en' ? '🇺🇸' : '🇬🇪'}</span>
                        <span className="font-bold">{language === 'en' ? 'EN' : 'GE'}</span>
                    </button>

                    <button
                        onClick={() => setCurrency(currency === 'USD' ? 'GEL' : 'USD')}
                        className={`px-2 py-1.5 rounded-xl border text-[10px] font-black flex items-center gap-1 transition-all flex-shrink-0 standing-light standing-beam cursor-pointer ${
                          isDark 
                            ? 'bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800' 
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                        title="Toggle Currency"
                    >
                        <span>{currency === 'USD' ? '💲' : '₾'}</span>
                        <span className="font-bold">{currency}</span>
                    </button>

                    <button 
                      onClick={onSaveProject} 
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex-shrink-0 standing-light standing-beam cursor-pointer"
                    >
                      <SaveIcon className="h-3.5 w-3.5 flex-shrink-0"/>
                      <span className="hidden sm:inline">{t('common.save')}</span>
                    </button>
                </div>
            </div>

            {isOverflowing && (
                <div className="flex items-center gap-1 flex-shrink-0 ml-1 relative" ref={moreBarRef}>
                    <button
                        type="button"
                        onClick={() => scrollMiddleBy(190)}
                        disabled={!canScrollRight}
                        className={`p-1.5 rounded-lg border shadow-xs transition-all z-10 ${
                            canScrollRight
                                ? isDark
                                    ? 'bg-slate-800 hover:bg-emerald-600 border-emerald-500/50 text-emerald-300 hover:text-white cursor-pointer'
                                    : 'bg-emerald-50 hover:bg-emerald-600 border-emerald-300 text-emerald-700 hover:text-white cursor-pointer'
                                : isDark
                                    ? 'bg-slate-900/50 border-slate-800 text-slate-600 opacity-45 cursor-default'
                                    : 'bg-slate-50 border-slate-200 text-slate-300 opacity-60 cursor-default'
                        }`}
                        title={language === 'ka' ? 'მარჯვნივ გადაწევა (დამალული ღილაკების ნახვა)' : 'Move toolbar right to reveal buttons'}
                        aria-label="Scroll toolbar right"
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsMoreBarOpen(prev => !prev)}
                        className={`p-1.5 rounded-lg border shadow-xs transition-all cursor-pointer z-10 ${
                            isMoreBarOpen
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : isDark
                                    ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                        }`}
                        title={language === 'ka' ? 'ყველა ზედა პანელის ღილაკის ნახვა' : 'View all top bar controls'}
                        aria-label="All toolbar controls"
                    >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>

                    {isMoreBarOpen && (
                        <div className={`absolute right-0 top-full mt-2 w-64 rounded-2xl shadow-2xl border p-2.5 z-[1200] space-y-1.5 ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                        }`}>
                            <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200/60">
                                {language === 'ka' ? 'ზედა პანელის ყველა ღილაკი' : 'All Top Bar Controls'}
                            </div>

                            {pendingSyncCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => { handleSyncClick(); setIsMoreBarOpen(false); }}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs cursor-pointer"
                                >
                                    <span>{isSyncing ? 'Pushing...' : `Push Sync (${pendingSyncCount})`}</span>
                                    <CloudIcon className="w-4 h-4" />
                                </button>
                            )}

                            {canManageLocalServer && (
                                <button
                                    type="button"
                                    onClick={() => { onOpenLocalServerConfig?.(); setIsMoreBarOpen(false); }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${isDark ? 'hover:bg-slate-800' : 'hover:bg-indigo-50'}`}
                                >
                                    <span>{localServerConfig?.isLocalMode ? 'Local Private Server' : 'Local Server Node'}</span>
                                    <NetworkIcon className="w-4 h-4 text-indigo-500" />
                                </button>
                            )}

                            {onToggleOffline && (
                                <button
                                    type="button"
                                    onClick={() => { onToggleOffline(); setIsMoreBarOpen(false); }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${isDark ? 'hover:bg-slate-800' : 'hover:bg-emerald-50'}`}
                                >
                                    <span>{isManualOffline ? 'Offline Mode (Switch Online)' : 'Cloud Sync Active'}</span>
                                    <span className={`w-2 h-2 rounded-full ${isManualOffline ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => { onOpenAiTopUp?.(); setIsMoreBarOpen(false); }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${isDark ? 'hover:bg-slate-800' : 'hover:bg-emerald-50'}`}
                            >
                                <span>AI Quota & Credits</span>
                                <span className="font-mono text-emerald-600 font-black">{isFounder ? '∞' : freeRemaining > 0 ? `${freeRemaining}` : `${aiQuota.aiCreditsBalance} Cr`}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { toggleUiVersion(); setIsMoreBarOpen(false); }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                            >
                                <span>UI Version</span>
                                <span className="font-mono text-indigo-600 font-black">{uiVersionMode === 'modern' ? 'V2.0.1.4' : 'V2.0.1.3'}</span>
                            </button>

                            <div className="grid grid-cols-3 gap-1.5 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setRegion(region === 'GE' ? 'GLOBAL' : 'GE')}
                                    className={`px-2 py-2 rounded-xl border text-[11px] font-black cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                                >
                                    {region === 'GE' ? '🇬🇪 GE' : '🌐 GL'}
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleLanguage}
                                    className={`px-2 py-2 rounded-xl border text-[11px] font-black cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                                >
                                    {language === 'en' ? '🇺🇸 EN' : '🇬🇪 GE'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrency(currency === 'USD' ? 'GEL' : 'USD')}
                                    className={`px-2 py-2 rounded-xl border text-[11px] font-black cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                                >
                                    {currency === 'USD' ? '💲 USD' : '₾ GEL'}
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => { onSaveProject(); setIsMoreBarOpen(false); }}
                                className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase cursor-pointer"
                            >
                                <SaveIcon className="w-3.5 h-3.5" />
                                <span>{t('common.save')}</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Right Side: Fixed core elements (Help, Notifications & Profile) */}
        <div className={`flex items-center gap-1 sm:gap-1.5 xl:gap-2 flex-shrink-0 border-l pl-1.5 sm:pl-2.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            {onOpenHelp && (
                <button
                    type="button"
                    onClick={onOpenHelp}
                    className={`flex items-center justify-center gap-1.5 min-h-[38px] min-w-[38px] sm:px-2.5 py-1.5 rounded-xl transition-all font-bold text-xs shadow-xs standing-light standing-beam cursor-pointer shrink-0 ${
                      isDark 
                        ? 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' 
                        : 'bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border border-indigo-100'
                    }`}
                    title={language === 'ka' ? 'დახმარება, AI გზამკვლევი და SOP' : 'Help, AI Guide Assistant & SOPs'}
                    aria-label={language === 'ka' ? 'დახმარება' : 'Help'}
                >
                    <BookOpen className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-indigo-500 flex-shrink-0" />
                    <span className="hidden sm:inline text-[11px] font-bold whitespace-nowrap">
                        {language === 'ka' ? 'დახმარება' : 'Help'}
                    </span>
                </button>
            )}

            <button 
                type="button"
                onClick={onOpenNotifications}
                className={`min-w-[38px] min-h-[38px] p-1.5 sm:p-2 rounded-xl transition-colors relative group flex items-center justify-center flex-shrink-0 standing-light cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                aria-label={language === 'ka' ? 'შეტყობინებები' : 'Notifications'}
            >
                <BellIcon className={`h-5 w-5 group-hover:scale-105 transition-transform ${notificationsCount > 0 ? 'text-emerald-500' : ''}`} />
                {notificationsCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-600 text-white text-[9px] font-black font-mono tabular-nums rounded-full border border-white dark:border-slate-900 flex items-center justify-center px-1 shadow-sm leading-none">
                        {notificationsCount > 99 ? '99+' : notificationsCount}
                    </span>
                )}
            </button>
            
            <div className="relative flex-shrink-0" ref={dropdownRef}>
                <button 
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                  className={`flex items-center space-x-1 sm:space-x-2 min-h-[38px] p-1 rounded-xl transition-all cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-gray-100 text-gray-800'
                  }`}
                  style={{ touchAction: 'manipulation' }}
                  aria-label="Account menu"
                >
                    <UserCircleIcon className={`h-7 w-7 sm:h-8 sm:w-8 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                    {currentUser && (
                        <span className="hidden xl:inline text-xs font-black uppercase tracking-tight truncate max-w-[120px]">
                            {currentUser.name}
                        </span>
                    )}
                </button>
                {isDropdownOpen && (
                    <div className={`fixed sm:absolute right-2 sm:right-0 top-[60px] sm:top-full sm:mt-2 w-[min(14.5rem,calc(100vw-1rem))] max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl shadow-2xl py-2 z-[1400] border animate-slide-up ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-gray-100 text-gray-700'
                    }`}>
                    {currentUser && !currentUser.isGuest ? (
                        <>
                        <div className={`px-4 py-2 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Workspace</p>
                            <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{currentUser.name}</p>
                        </div>
                        <button onClick={() => { onOpenProfile(); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 font-bold transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-indigo-50'}`}>
                            <UserCircleIcon className="h-4 w-4 text-indigo-400" /> My Profile
                        </button>
                        <button onClick={() => { onOpenProjects(); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 font-bold transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-green-50'}`}>
                            <FolderIcon className="h-4 w-4 text-emerald-400" /> My Projects
                        </button>
                        {onOpenHelp && (
                            <button onClick={() => { onOpenHelp(); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 font-bold transition-colors ${isDark ? 'hover:bg-slate-800 text-indigo-300' : 'hover:bg-indigo-50 text-indigo-700'}`}>
                                <BookOpen className="h-4 w-4 text-indigo-400" />
                                {language === 'ka' ? 'დახმარება და გზამკვლევი' : 'Help & Architecture Guide'}
                            </button>
                        )}
                        <button 
                            type="button"
                            onClick={() => { 
                                window.dispatchEvent(new CustomEvent('agrimap_toggle_floating_dock')); 
                                setIsDropdownOpen(false); 
                            }} 
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 font-bold transition-colors ${isDark ? 'hover:bg-slate-800 text-emerald-300' : 'hover:bg-emerald-50 text-emerald-800'}`}
                            title={language === 'ka' ? "მცურავი ხელსაწყოების პანელის ჩართვა / გამორთვა" : "Enable / Disable Floating Tools Dock"}
                        >
                            <MoreHorizontal className="h-4 w-4 text-emerald-500" />
                            {language === 'ka' ? 'ხელსაწყოების პანელი (...)' : 'Floating Tools Dock (...)'}
                        </button>
                        <div className={`my-1 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`} />
                        <button onClick={() => { onLogout(); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm text-red-400 font-bold transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-red-50'}`}>
                            {t('auth.logout')}
                        </button>
                        </>
                    ) : (
                        <>
                        <div className={`px-4 py-2 border-b ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-gray-100'}`}>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest Mode</p>
                            <p className="text-xs font-bold text-slate-500">Limited Access</p>
                        </div>
                        <button onClick={() => { onLogin(); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 font-bold transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-indigo-50'}`}>
                            <UserCircleIcon className="h-4 w-4 text-indigo-400" /> Login
                        </button>
                        <button onClick={() => { onRegister(); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 font-bold transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-green-50'}`}>
                            <FolderIcon className="h-4 w-4 text-emerald-400" /> Register
                        </button>
                        {onOpenHelp && (
                            <button onClick={() => { onOpenHelp(); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 font-bold transition-colors ${isDark ? 'hover:bg-slate-800 text-indigo-300' : 'hover:bg-indigo-50 text-indigo-700'}`}>
                                <BookOpen className="h-4 w-4 text-indigo-400" />
                                {language === 'ka' ? 'დახმარება და გზამკვლევი' : 'Help & Architecture Guide'}
                            </button>
                        )}
                        <button 
                            type="button"
                            onClick={() => { 
                                window.dispatchEvent(new CustomEvent('agrimap_toggle_floating_dock')); 
                                setIsDropdownOpen(false); 
                            }} 
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 font-bold transition-colors ${isDark ? 'hover:bg-slate-800 text-emerald-300' : 'hover:bg-emerald-50 text-emerald-800'}`}
                            title={language === 'ka' ? "მცურავი ხელსაწყოების პანელის ჩართვა / გამორთვა" : "Enable / Disable Floating Tools Dock"}
                        >
                            <MoreHorizontal className="h-4 w-4 text-emerald-500" />
                            {language === 'ka' ? 'ხელსაწყოების პანელი (...)' : 'Floating Tools Dock (...)'}
                        </button>
                        </>
                    )}
                    <div className={`border-t my-1 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}></div>
                    <button 
                        type="button" 
                        onClick={() => { if (onOpenHomepage) onOpenHomepage(); setIsDropdownOpen(false); }}
                        className={`w-full px-4 py-1.5 text-[9px] font-mono font-bold uppercase text-center transition-colors cursor-pointer block ${
                          isDark 
                            ? 'text-slate-400 hover:text-emerald-400 bg-slate-950/60 hover:bg-slate-800' 
                            : 'text-slate-400 hover:text-emerald-600 bg-slate-50/50 hover:bg-emerald-50/30'
                        }`}
                        title={language === 'ka' ? 'დაფაზე გადასვლა' : 'Go to Dashboard'}
                    >
                        {APP_VERSION_NAME}
                    </button>
                    </div>
                )}
            </div>
        </div>
        <style>{`
          .custom-scrollbar-hide::-webkit-scrollbar { display: none; }
          .custom-scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
    </div>
  );
};

export default Header;
