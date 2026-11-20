import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { AssistantMessage, Note, User, AppMode } from '../types';
import { SparklesIcon, CommandLineIcon, ArrowUpCircleIcon, MicrophoneIcon, XIcon, ChevronDownIcon, ChevronUpIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon, StopIcon, DocumentTextIcon } from './Icons';
import { 
  MessageSquare, Video, GripHorizontal, ChevronDown, Sparkles, Mic, 
  Settings, CheckCircle2, AlertTriangle, RefreshCw, Key, Trash2, ExternalLink, ShieldCheck,
  Crown, Leaf, Briefcase, TrendingUp, Layers, Eye, EyeOff, History, FileText, Stethoscope,
  Maximize2, Minimize2, Minus, X, ArrowLeftRight, ArrowUpDown, MoreHorizontal,
  Calendar, FileSpreadsheet, FolderOpen, Search, Server, BookOpen
} from 'lucide-react';
import AiAnalysisSuite from './AiAnalysisSuite';
import AiAnalysisModal from './AiAnalysisModal';
import GlobalVoiceNotesModal from './GlobalVoiceNotesModal';
import { HelpAiAssistantChat } from './Help/HelpAiAssistantChat';
import { GodAIIntelligenceHubModal } from '../new_engine/ui/GodAIIntelligenceHubModal';
import { AIAssistantMode } from '../new_engine/types';
import { safeStorage } from '../services/storageService';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';
import { 
  cleanApiKey,
  getActiveGeminiApiKey, 
  setCustomGeminiApiKey, 
  testGeminiApiKey, 
  triggerAiDiagnosticsModal,
  triggerAiTopUpModal,
  PRIMARY_GEMINI_MODEL,
  openAiManagementConsole,
  type GeminiTestResult
} from '../services/geminiService';
import { AiSourceBadge } from './AiSourceBadge';

// FIX: Add type definitions for the Web Speech API to resolve TS errors.
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

// Type assertion for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface GlobalAssistantPanelProps {
  messages: AssistantMessage[];
  onSendCommand: (command: string) => void;
  isLoading: boolean;
  activeModuleName?: string;
  notes?: Note[];
  onAddNote?: (
      content: string, 
      location?: { lat: number; lng: number }, 
      featureId?: string, 
      moduleName?: string, 
      tags?: string[], 
      isVoiceNote?: boolean, 
      language?: string
  ) => Promise<void>;
  onDeleteNote?: (noteId: string) => void;
  onDeleteMultipleNotes?: (noteIds: string[]) => void;
  activeOrgId?: string;
  activeOrgName?: string;
  currentUser?: User | null;
  isSystemAdmin?: boolean;
  isRoot?: boolean;
  activeOrgRole?: string;
  onOpenChat?: () => void;
  onOpenMeet?: () => void;
  currentAiMode?: AIAssistantMode;
  onSetAiMode?: (mode: AIAssistantMode) => void;
  organizations?: any[];
  workAssignments?: any[];
  harvestEntries?: any[];
  plantationFeatures?: any[];
  employees?: any[];
  machinery?: any[];
  nutritionPlans?: any[];
  onNavigateToTasks?: () => void;
  onNavigateMode?: (mode: AppMode) => void;
  onAddTask?: (task: any) => void;
  onAddNutritionPlan?: (plan: any) => void;
}

const Message: React.FC<{ message: AssistantMessage; onOpenSettings?: () => void }> = ({ message, onOpenSettings }) => {
    const isUser = message.type === 'user';
    const isError = message.type === 'error';
    const isLocal = !isUser && !isError && (
        message.source === 'local' || 
        message.isAutonomousFallback || 
        message.modelUsed === 'autonomous-agri-core' ||
        message.text.includes('Autonomous Agronomic') ||
        message.text.includes('Autonomous Agricultural') ||
        message.text.includes('Knowledge Engine Local Core')
    );

    const baseClasses = 'p-3.5 rounded-2xl max-w-sm sm:max-w-md text-sm whitespace-pre-wrap transition-all';
    const userClasses = 'bg-blue-600 text-white self-end shadow-sm rounded-tr-xs';
    // YELLOW COLOR FOR LOCAL AI AS REQUESTED:
    const localClasses = 'bg-amber-50 border-2 border-amber-400 text-amber-950 self-start shadow-md rounded-tl-xs';
    const cloudClasses = 'bg-slate-100 text-slate-800 self-start border border-slate-200/80 shadow-xs rounded-tl-xs';
    const errorClasses = 'bg-red-50 border-2 border-red-200 text-red-900 self-start shadow-sm rounded-tl-xs';
    
    const icon = isUser 
        ? <CommandLineIcon className="h-5 w-5 text-blue-200" /> 
        : isLocal 
        ? <span className="p-1 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center"><Server className="h-4 w-4" /></span>
        : <SparklesIcon className="h-5 w-5 text-green-500" />;
    
    const isKeyIssue = isError && (message.text.includes("Key") || message.text.includes("Quota") || message.text.includes("429") || message.text.includes("Settings"));

    return (
        <div className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : ''}`}>
            {!isUser && <div className="flex-shrink-0 mt-1">{icon}</div>}
            <div className={`${baseClasses} ${isUser ? userClasses : isError ? errorClasses : isLocal ? localClasses : cloudClasses}`}>
                
                {/* Identification Header / Badge */}
                {!isUser && !isError && (
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5 gap-2">
                        <AiSourceBadge 
                            source={isLocal ? 'local' : 'cloud'}
                            isLocal={isLocal}
                            reason={message.fallbackReason}
                            code={message.fallbackCode}
                            modelUsed={message.modelUsed}
                            notice={message.upstreamNotice}
                        />
                        {message.timestamp && (
                            <span className="text-[10px] font-mono text-slate-400">
                                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                )}

                <div className="leading-relaxed font-sans">{message.text}</div>

                {isKeyIssue && onOpenSettings && (
                    <button
                        onClick={onOpenSettings}
                        className="mt-2.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                        <Settings className="w-3.5 h-3.5 text-emerald-700" />
                        Configure Gemini API Key (⚙️)
                    </button>
                )}
            </div>
             {isUser && <div className="flex-shrink-0 mt-1">{icon}</div>}
        </div>
    );
};

const GlobalAssistantPanel: React.FC<GlobalAssistantPanelProps> = ({ 
  messages, 
  onSendCommand, 
  isLoading,
  activeModuleName = 'Dashboard',
  notes = [],
  onAddNote,
  onDeleteNote,
  onDeleteMultipleNotes,
  activeOrgId = '',
  activeOrgName = '',
  currentUser = null,
  isSystemAdmin: isSystemAdminProp = false,
  isRoot: isRootProp = false,
  activeOrgRole = '',
  onOpenChat,
  onOpenMeet,
  currentAiMode = 'standard',
  onSetAiMode,
  organizations = [],
  workAssignments = [],
  harvestEntries = [],
  plantationFeatures = [],
  employees = [],
  machinery = [],
  nutritionPlans = [],
  onNavigateToTasks,
  onNavigateMode,
  onAddTask,
  onAddNutritionPlan
}) => {
  const { language } = useLanguage();
  const isKa = language === 'ka';
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [assistantView, setAssistantView] = useState<'guide' | 'chat' | 'analysis'>('guide');
  const [analysisInitialTool, setAnalysisInitialTool] = useState<'disease' | 'document' | 'agro_image' | 'history'>('disease');
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isEnlarged, setIsEnlarged] = useState<boolean>(() => {
    return safeStorage.getItem('agrimap_assistant_enlarged') === 'true';
  });

  // Live viewport dimensions so the AI Assistant scales dynamically across phones, tablets, laptops & desktops
  const [viewport, setViewport] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? (window.visualViewport?.height || window.innerHeight) : 800
  }));

  // Window Custom Dimensions (Live Resizing)
  const [panelSize, setPanelSize] = useState<{ width: number; height: number }>(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? (window.visualViewport?.height || window.innerHeight) : 800;
    const stored = safeStorage.getItem('agrimap_assistant_custom_size');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Number.isFinite(parsed?.width) && Number.isFinite(parsed?.height)) {
          return {
            width: Math.max(300, Math.min(vw - 16, parsed.width)),
            height: Math.max(360, Math.min(vh - 20, parsed.height)),
          };
        }
      } catch (e) {}
    }
    const defaultW = vw < 640 ? Math.max(296, vw - 16) : Math.min(460, vw - 24);
    const defaultH = Math.min(580, vh - 24);
    return { width: defaultW, height: defaultH };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleViewportResize = () => {
      const vw = window.innerWidth;
      const vh = Math.round(window.visualViewport?.height || window.innerHeight);
      setViewport({ width: vw, height: vh });
      setPanelSize(prev => ({
        width: Math.max(280, Math.min(prev.width, vw - 16)),
        height: Math.max(320, Math.min(prev.height, vh - 20))
      }));
    };
    window.addEventListener('resize', handleViewportResize);
    window.visualViewport?.addEventListener('resize', handleViewportResize);
    return () => {
      window.removeEventListener('resize', handleViewportResize);
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  const toggleEnlarged = () => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : viewport.width;
    const vh = typeof window !== 'undefined' ? Math.round(window.visualViewport?.height || window.innerHeight) : viewport.height;
    setIsEnlarged(prev => {
      const next = !prev;
      safeStorage.setItem('agrimap_assistant_enlarged', next ? 'true' : 'false');
      if (next) {
        setPanelSize({
          width: Math.min(940, vw - 16),
          height: Math.min(820, vh - 20)
        });
      } else {
        setPanelSize({
          width: Math.min(460, vw - 16),
          height: Math.min(580, vh - 24)
        });
      }
      return next;
    });
  };
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVoiceNotesOpen, setIsVoiceNotesOpen] = useState(false);
  const [isGodAIHubOpen, setIsGodAIHubOpen] = useState(false);
  const [isGoogleHubOpen, setIsGoogleHubOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testStatus, setTestStatus] = useState<(GeminiTestResult & { model?: string }) | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Floating Tools Dock Minimized & Enabled State
  const [isDockMinimized, setIsDockMinimized] = useState<boolean>(() => {
    return safeStorage.getItem('agrimap_floating_dock_minimized') === 'true';
  });

  const [isDockVisible, setIsDockVisible] = useState<boolean>(() => {
    return safeStorage.getItem('agrimap_floating_dock_enabled') !== 'false';
  });

  const toggleDockMinimized = useCallback((explicit?: boolean) => {
    setIsDockMinimized(prev => {
      const next = typeof explicit === 'boolean' ? explicit : !prev;
      safeStorage.setItem('agrimap_floating_dock_minimized', String(next));
      toast.info(
        next 
          ? (isKa ? 'ხელსაწყოების პანელი ჩაიკეცა ... ღილაკში' : 'Tools dock minimized to ... button') 
          : (isKa ? 'ხელსაწყოების პანელი გაიშალა' : 'Floating tools dock expanded')
      );
      return next;
    });
  }, [isKa]);

  const toggleDockVisibility = useCallback((explicit?: boolean) => {
    setIsDockVisible(prev => {
      const next = typeof explicit === 'boolean' ? explicit : !prev;
      safeStorage.setItem('agrimap_floating_dock_enabled', String(next));
      toast.info(
        next 
          ? (isKa ? 'მცურავი ხელსაწყოების პანელი ჩართულია' : 'Floating tools enabled') 
          : (isKa ? 'მცურავი ხელსაწყოების პანელი დამალულია' : 'Floating tools hidden')
      );
      return next;
    });
  }, [isKa]);

  useEffect(() => {
    const handleToggle = (e: any) => {
      if (typeof e.detail?.visible === 'boolean') {
        toggleDockVisibility(e.detail.visible);
      } else if (typeof e.detail?.minimized === 'boolean') {
        toggleDockMinimized(e.detail.minimized);
      } else {
        toggleDockVisibility();
      }
    };
    window.addEventListener('agrimap_toggle_floating_dock', handleToggle);
    return () => window.removeEventListener('agrimap_toggle_floating_dock', handleToggle);
  }, [toggleDockVisibility, toggleDockMinimized]);

  const { isSystemAdmin, hasPrivilegedGoogleAiAccess } = useMemo(() => {
    if (!currentUser || currentUser.isGuest) {
      return { isSystemAdmin: false, hasPrivilegedGoogleAiAccess: false };
    }

    const normalizedEmail = (currentUser.email || '').trim().toLowerCase();
    const systemAdminEmails = [
      'admin@agrimap.io',
      'nishno@agrimap.pro',
      'giorgi.nishno@gmail.com',
      'giorgi@agrimap.pro',
    ];
    const isSysEmail =
      systemAdminEmails.includes(normalizedEmail) ||
      normalizedEmail.endsWith('.agrimap.pro') ||
      normalizedEmail.endsWith('@agrimap.pro');

    const rawRoles: string[] = [
      ...(Array.isArray(currentUser.roles) ? currentUser.roles : []),
      typeof (currentUser as any)?.role === 'string' ? (currentUser as any).role : '',
      typeof activeOrgRole === 'string' ? activeOrgRole : '',
    ]
      .filter(Boolean)
      .map((r) => r.trim().toLowerCase());

    const isNonAdminAgrimapIoAccount =
      normalizedEmail.endsWith('@agrimap.io') && normalizedEmail !== 'admin@agrimap.io';

    const sysAdminDetected = Boolean(
      (isSystemAdminProp && !isNonAdminAgrimapIoAccount) ||
      (currentUser as any)?.isSystemAdmin ||
      isSysEmail ||
      rawRoles.some((r) => r === 'system_admin' || r === 'system-admin' || r === 'system administrator')
    );

    const rootDetected = Boolean(
      (isRootProp && !isNonAdminAgrimapIoAccount) ||
      (currentUser as any)?.isRoot ||
      rawRoles.some((r) => r === 'root_super_admin' || r === 'root') ||
      currentUser.individualUniqueId?.startsWith('I-001') ||
      currentUser.globalUniqueId?.startsWith('G-001')
    );

    const privilegedRoleDetected = rawRoles.some(
      (r) =>
        r === 'admin' ||
        r === 'founder' ||
        r === 'co-founder' ||
        r === 'cofounder' ||
        r === 'co_founder' ||
        r === 'root_super_admin' ||
        r === 'root' ||
        r === 'system_admin' ||
        r === 'system-admin' ||
        r === 'system administrator'
    );

    const activeOrg = activeOrgId
      ? organizations?.find((o) => o?.id === activeOrgId)
      : null;
    const isOrgCreator = Boolean(
      activeOrg && currentUser.id && activeOrg.createdBy === currentUser.id
    );

    return {
      isSystemAdmin: sysAdminDetected,
      hasPrivilegedGoogleAiAccess: Boolean(
        sysAdminDetected || rootDetected || privilegedRoleDetected || isOrgCreator
      ),
    };
  }, [currentUser, isSystemAdminProp, isRootProp, activeOrgRole, activeOrgId, organizations]);

  // Load currently active key on mount and when settings opens
  useEffect(() => {
    const key = getActiveGeminiApiKey();
    setApiKeyInput(key);
  }, [isSettingsOpen]);

  const handleSaveApiKey = async () => {
    const cleaned = cleanApiKey(apiKeyInput);
    await setCustomGeminiApiKey(cleaned);
    setSaveStatus({
      type: 'success',
      message: cleaned 
        ? (isKa ? 'Gemini API გასაღები შეინახა და სერვერზე გააქტიურდა!' : 'Gemini API Key saved and synced to server runtime!') 
        : (isKa ? 'პერსონალური გასაღები წაიშალა.' : 'Custom API key removed. Reverted to server default.')
    });
    setTestStatus(null);
    setTimeout(() => setSaveStatus(null), 3500);
    // Automatically test the newly saved key
    handleTestConnection();
  };

  const handleClearApiKey = async () => {
    await setCustomGeminiApiKey('');
    setApiKeyInput('');
    setSaveStatus({
      type: 'info',
      message: isKa ? 'პერსონალური გასაღები გასუფთავდა.' : 'Custom API key cleared. Reverted to environment configuration.'
    });
    setTestStatus(null);
    setTimeout(() => setSaveStatus(null), 3500);
  };

  const handleTestConnection = async () => {
    setIsTestingKey(true);
    setTestStatus(null);
    try {
      const cleaned = cleanApiKey(apiKeyInput);
      const result = await testGeminiApiKey(cleaned || undefined);
      setTestStatus(result);
      if (result.ok) {
        toast.success(isKa ? 'კავშირი დადასტურებულია!' : 'Gemini API connection confirmed!');
      } else if (result.statusCode === 402) {
        toast.warning(isKa ? 'პროექტს ამოეწურა კრედიტები (Code 402)' : 'Project prepayment credits depleted (Code 402)');
      }
    } catch (e: any) {
      setTestStatus({
        ok: false,
        success: false,
        statusCode: 500,
        message: e?.message || 'Failed to complete test.'
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  useEffect(() => {
    const handleOpenNotes = () => setIsVoiceNotesOpen(true);
    const handleOpenAssistant = () => {
      setAssistantView('guide');
      setIsCollapsed(false);
    };
    window.addEventListener('agrimap_open_voice_notes', handleOpenNotes);
    window.addEventListener('agrimap_open_assistant', handleOpenAssistant);
    return () => {
      window.removeEventListener('agrimap_open_voice_notes', handleOpenNotes);
      window.removeEventListener('agrimap_open_assistant', handleOpenAssistant);
    };
  }, []);

  // Viewport resize clamping to ensure chat never slips off-screen or becomes inaccessible
  useEffect(() => {
    const handleWindowResize = () => {
      const availW = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const availH = typeof window !== 'undefined' ? window.innerHeight : 800;

      setPanelSize(prev => {
        const maxW = Math.max(280, availW - 16);
        const maxH = Math.max(240, availH - 24);
        return {
          width: Math.max(280, Math.min(prev.width, maxW)),
          height: Math.max(240, Math.min(prev.height, maxH))
        };
      });

      setCommsPos(prev => {
        if (!prev) return prev;
        const clampedX = Math.max(8, Math.min(availW - 65, prev.x));
        const clampedY = Math.max(8, Math.min(availH - 75, prev.y));
        return { x: clampedX, y: clampedY };
      });
    };

    const handleWindowBlur = () => {
      if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
      }
    };

    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleWindowBlur);
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleWindowBlur);
    };
  }, [isListening]);

  // Movable Floating Comms Hub State
  const [commsPos, setCommsPos] = useState<{ x: number; y: number } | null>(() => {
      const stored = safeStorage.getItem('agrimap_floating_fabs_pos');
      if (stored) {
          try {
              const parsed = JSON.parse(stored);
              if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) {
                  if (parsed.x < window.innerWidth - 50 && parsed.y < window.innerHeight - 50 && parsed.x >= 0 && parsed.y >= 0) {
                      return parsed;
                  }
              }
          } catch (e) {}
      }
      return null;
  });

  const commsContainerRef = useRef<HTMLDivElement | null>(null);
  const commsDragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const hasCommsDraggedRef = useRef<boolean>(false);

  const handleCommsPointerDown = (e: React.PointerEvent<HTMLDivElement | HTMLButtonElement>) => {
      const target = e.target as HTMLElement;
      // Allow dragging on drag handle or drag-target buttons (like the minimized ... button), but exclude other buttons
      if (!target.closest('[data-drag-target="true"]') && target.closest('button, input, a, textarea')) return;
      e.preventDefault();
      try {
          e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {}

      hasCommsDraggedRef.current = false;
      const rect = commsContainerRef.current?.getBoundingClientRect();
      const currentLeft = rect ? rect.left : (window.innerWidth - 80);
      const currentTop = rect ? rect.top : (window.innerHeight - 280);

      commsDragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startLeft: currentLeft,
          startTop: currentTop
      };
  };

  const handleCommsPointerMove = (e: React.PointerEvent<HTMLDivElement | HTMLButtonElement>) => {
      if (!commsDragRef.current) return;
      e.preventDefault();
      const deltaX = e.clientX - commsDragRef.current.startX;
      const deltaY = e.clientY - commsDragRef.current.startY;
      if (Math.hypot(deltaX, deltaY) > 5) {
          hasCommsDraggedRef.current = true;
      }
      const newLeft = Math.max(8, Math.min(window.innerWidth - 65, commsDragRef.current.startLeft + deltaX));
      const newTop = Math.max(8, Math.min(window.innerHeight - 80, commsDragRef.current.startTop + deltaY));
      setCommsPos({ x: Math.round(newLeft), y: Math.round(newTop) });
  };

  const handleCommsPointerUp = (e: React.PointerEvent<HTMLDivElement | HTMLButtonElement>) => {
      if (!commsDragRef.current) return;
      try {
          e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
      commsDragRef.current = null;
      setCommsPos(curr => {
          if (curr) safeStorage.setItem('agrimap_floating_fabs_pos', JSON.stringify(curr));
          return curr;
      });
  };

  // Live Window Resizing Handlers
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const resizeRef = useRef<{
    direction: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  const startResize = (e: React.PointerEvent<HTMLDivElement>, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    const rect = commsContainerRef.current?.getBoundingClientRect();
    const currentLeft = rect ? rect.left : 80;
    const currentTop = rect ? rect.top : 80;
    const currentWidth = rect ? rect.width : panelSize.width;
    const currentHeight = rect ? rect.height : panelSize.height;

    setIsResizing(direction);
    resizeRef.current = {
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentWidth,
      startHeight: currentHeight,
      startLeft: currentLeft,
      startTop: currentTop
    };
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current) return;
    e.preventDefault();
    const { direction, startX, startY, startWidth, startHeight, startLeft, startTop } = resizeRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    const minW = Math.min(340, window.innerWidth - 20);
    const maxW = Math.min(1300, window.innerWidth - 16);
    const minH = Math.min(380, window.innerHeight - 20);
    const maxH = window.innerHeight - 16;

    if (direction.includes('right')) {
      newWidth = Math.max(minW, Math.min(maxW, startWidth + deltaX));
    }
    if (direction.includes('left')) {
      const candidateWidth = startWidth - deltaX;
      if (candidateWidth >= minW && candidateWidth <= maxW) {
        newWidth = candidateWidth;
        newLeft = startLeft + deltaX;
      } else if (candidateWidth < minW) {
        newWidth = minW;
        newLeft = startLeft + (startWidth - minW);
      } else {
        newWidth = maxW;
        newLeft = startLeft + (startWidth - maxW);
      }
    }
    if (direction.includes('bottom')) {
      newHeight = Math.max(minH, Math.min(maxH, startHeight + deltaY));
    }
    if (direction.includes('top')) {
      const candidateHeight = startHeight - deltaY;
      if (candidateHeight >= minH && candidateHeight <= maxH) {
        newHeight = candidateHeight;
        newTop = startTop + deltaY;
      } else if (candidateHeight < minH) {
        newHeight = minH;
        newTop = startTop + (startHeight - minH);
      } else {
        newHeight = maxH;
        newTop = startTop + (startHeight - maxH);
      }
    }

    newLeft = Math.max(8, Math.min(window.innerWidth - newWidth - 8, newLeft));
    newTop = Math.max(8, Math.min(window.innerHeight - newHeight - 8, newTop));

    setPanelSize({ width: Math.round(newWidth), height: Math.round(newHeight) });
    setCommsPos({ x: Math.round(newLeft), y: Math.round(newTop) });
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    resizeRef.current = null;
    setIsResizing(null);
    safeStorage.setItem('agrimap_assistant_custom_size', JSON.stringify(panelSize));
    if (commsPos) {
      safeStorage.setItem('agrimap_floating_fabs_pos', JSON.stringify(commsPos));
    }
  };

  // Close dropdown menu on outside click
  useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
          if (commsContainerRef.current && !commsContainerRef.current.contains(e.target as Node)) {
              setIsMenuOpen(false);
          }
      };
      if (isMenuOpen) {
          document.addEventListener('pointerdown', handleClickOutside);
      }
      return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isMenuOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  
  const handleVoiceCommand = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice commands are not supported by your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
        setIsListening(true);
        setInputValue("Listening...");
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        onSendCommand(transcript);
    };
    
    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'not-allowed') {
            alert("Microphone access was denied. Please allow microphone access in your browser settings to use voice commands.");
        }
        setInputValue("");
    };

    recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        if (inputValue === "Listening...") {
             setInputValue("");
        }
    };

    recognition.start();
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendCommand(inputValue.trim());
      setInputValue('');
    }
  };

  if (isCollapsed) {
    return (
      <>
        {/* Discreet Edge Restorer when floating dock is completely hidden/disabled */}
        {!isDockVisible && (
          <div 
            style={{ position: 'fixed', right: '0px', bottom: '90px', zIndex: 8500 }}
            className="select-none pointer-events-auto"
          >
            <button
              type="button"
              onClick={() => {
                toggleDockVisibility(true);
                toggleDockMinimized(false);
              }}
              className="group flex items-center gap-1.5 px-2.5 py-2 bg-[#FAFBF8] border-l-2 border-y border-[#D8E3D4] hover:border-emerald-600 rounded-l-2xl shadow-xl hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 transition-all cursor-pointer font-bold"
              title={isKa ? "ხელსაწყოების პანელის ჩვენება (ჩართვა)" : "Show Floating Tools Dock (Enable)"}
            >
              <MoreHorizontal size={16} className="text-emerald-700 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-black hidden group-hover:inline transition-all tracking-wider">
                {isKa ? "ხელსაწყოები" : "Tools"}
              </span>
            </button>
          </div>
        )}

        {/* MINIMIZED STATE: Sleek compact ... (three dots) floating button */}
        {isDockVisible && isDockMinimized && (
          <div 
            ref={commsContainerRef}
            style={{
                position: 'fixed',
                ...(commsPos ? { left: `${commsPos.x}px`, top: `${commsPos.y}px` } : { right: '16px', bottom: '80px' }),
                zIndex: 8500
            }}
            className="select-none pointer-events-auto"
          >
            <div className="relative group/dots">
              <button
                type="button"
                data-drag-target="true"
                onPointerDown={handleCommsPointerDown}
                onPointerMove={handleCommsPointerMove}
                onPointerUp={handleCommsPointerUp}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!hasCommsDraggedRef.current) {
                    toggleDockMinimized(false);
                  }
                }}
                className="w-12 h-12 rounded-full bg-[#FAFBF8] hover:bg-white text-stone-800 hover:text-emerald-700 border-2 border-[#D8E3D4] hover:border-emerald-500 shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 cursor-pointer relative"
                title={isKa ? "ხელსაწყოების პანელის გაშლა (დააჭირეთ გასაშლელად)" : "Expand Floating Tools (Click to expand)"}
              >
                <MoreHorizontal className="w-6 h-6 transition-transform group-hover/dots:scale-110 text-emerald-800" />
                {notes && notes.length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-black flex items-center justify-center border border-white shadow-sm">
                    {notes.length}
                  </span>
                )}
              </button>

              {/* Tooltip on hover */}
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#FAFBF8] text-stone-800 text-[11px] font-bold rounded-xl whitespace-nowrap shadow-2xl border border-stone-200 opacity-0 group-hover/dots:opacity-100 pointer-events-none transition-all duration-150 transform translate-x-2 group-hover/dots:translate-x-0 z-50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{isKa ? "ხელსაწყოების პანელი (...) • დააჭირეთ გასაშლელად" : "Floating Tools (...) • Click to expand"}</span>
              </div>
            </div>
          </div>
        )}

        {/* EXPANDED STATE: Floating Action Buttons: Two-Piece Segmented Dock */}
        {isDockVisible && !isDockMinimized && (
          <div 
            ref={commsContainerRef}
            style={{
                position: 'fixed',
                ...(commsPos ? { left: `${commsPos.x}px`, top: `${commsPos.y}px` } : { right: '16px', bottom: '80px' }),
                zIndex: 8500
            }}
            className="select-none pointer-events-auto"
          >
            <div className="flex flex-col items-center gap-2 group">
                {/* Piece 0: Drag Handle, Minimize to ..., Alignment Correction, & Hide Tool */}
                <div className="flex items-center gap-1.5 p-1 bg-[#FAFBF8] rounded-full border border-stone-200/90 shadow-md backdrop-blur-md transition-opacity">
                    {/* Drag Handle */}
                    <div 
                        data-drag-target="true"
                        onPointerDown={handleCommsPointerDown}
                        onPointerMove={handleCommsPointerMove}
                        onPointerUp={handleCommsPointerUp}
                        className="p-1 text-stone-400 hover:text-stone-800 rounded-full transition-all cursor-move flex items-center justify-center"
                        title={isKa ? "გადაადგილება ეკრანზე" : "Drag to reposition floating tools"}
                    >
                        <GripHorizontal size={13} />
                    </div>

                    {/* Minimize to ... button */}
                    <button
                        type="button"
                        onClick={() => toggleDockMinimized(true)}
                        className="p-1 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-full transition-all cursor-pointer flex items-center justify-center"
                        title={isKa ? "ჩაკეცვა ... ღილაკში (მეორე დაწკაპუნებით გაიშლება)" : "Minimize to ... button (click again to expand)"}
                    >
                        <MoreHorizontal size={13} className="hover:scale-110 transition-transform" />
                    </button>

                    {/* Dedicated Correction / Position Reset Tool */}
                    <button
                        type="button"
                        onClick={() => {
                            setCommsPos(null);
                            safeStorage.removeItem('agrimap_floating_fabs_pos');
                            safeStorage.removeItem('agrimap_comms_tools_pos');
                            safeStorage.removeItem('agrimap_comms_hub_pos');
                            toast.success(isKa ? "ღილაკების პოზიცია და გასწორება აღდგენილია!" : "Floating tools position and alignment corrected!");
                        }}
                        className="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-full transition-all cursor-pointer flex items-center justify-center"
                        title={isKa ? "კორექციის ხელსაწყო: პოზიციის და გასწორების აღდგენა" : "Correction Tool: Reset & Align Floating Tools Position"}
                    >
                        <RefreshCw size={11} className="hover:rotate-180 transition-transform duration-300" />
                    </button>

                    {/* Hide / Disable Floating Dock */}
                    <button
                        type="button"
                        onClick={() => toggleDockVisibility(false)}
                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all cursor-pointer flex items-center justify-center"
                        title={isKa ? "პანელის დამალვა (ჩართვა ეკრანის კუთხიდან ან მენიუდან)" : "Hide Floating Dock (Can re-enable from edge or menu)"}
                    >
                        <EyeOff size={11} />
                    </button>
                </div>

                {/* PIECE 1: Google & Team Communication Hub (Google Suite, Meet, Chat) */}
                <div className="p-1.5 bg-[#FAFBF8] backdrop-blur-md rounded-full border border-stone-200/90 shadow-xl flex flex-col items-center gap-2">
                    {/* 1. Google Workspace & Farm Suite Button */}
                    <div className="relative group/btn">
                        <button
                            type="button"
                            onClick={() => setIsGoogleHubOpen(true)}
                            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white hover:bg-slate-50 text-slate-800 shadow-xl shadow-slate-900/10 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 cursor-pointer border-2 border-stone-200/90 relative"
                            title={isKa ? "Google Workspace & საველე სერვისები" : "Google Workspace Suite & Farm Tools"}
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                            </svg>
                        </button>
                        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#FAFBF8] text-stone-800 text-[11px] font-bold rounded-xl whitespace-nowrap shadow-xl border border-stone-200 opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all duration-150 transform translate-x-2 group-hover/btn:translate-x-0 z-50">
                            {isKa ? 'Google ხელსაწყოები' : 'Google Workspace'}
                        </div>
                    </div>

                    {/* 2. Google Meet Video Button (Admins, Founders, Co-Founders, Root & System Admins only) */}
                    {hasPrivilegedGoogleAiAccess && (
                      <div className="relative group/btn">
                          <button
                              type="button"
                              onClick={() => {
                                  if (onOpenMeet) onOpenMeet();
                                  else window.dispatchEvent(new CustomEvent('agrimap_open_meet'));
                              }}
                              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-xl shadow-emerald-950/20 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 cursor-pointer border border-emerald-300/40 relative"
                              title={isKa ? "Google Meet - ვიდეო ოთახი & ეკრანის გაზიარება" : "Google Meet - Live Field Video Room & Screen Share"}
                          >
                              <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </button>
                          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#FAFBF8] text-stone-800 text-[11px] font-bold rounded-xl whitespace-nowrap shadow-xl border border-stone-200 opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all duration-150 transform translate-x-2 group-hover/btn:translate-x-0 z-50">
                              Google Meet
                          </div>
                      </div>
                    )}

                    {/* 3. Google Chat Button (Admins, Founders, Co-Founders, Root & System Admins only) */}
                    {hasPrivilegedGoogleAiAccess && (
                      <div className="relative group/btn">
                          <button
                              type="button"
                              onClick={() => {
                                  if (onOpenChat) onOpenChat();
                                  else window.dispatchEvent(new CustomEvent('agrimap_open_chat'));
                              }}
                              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white shadow-xl shadow-blue-950/20 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 cursor-pointer border border-blue-300/40 relative"
                              title={isKa ? "Google Chat & საველე ინტერკომი" : "Google Chat - Field Spaces & Team Intercom"}
                          >
                              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </button>
                          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#FAFBF8] text-stone-800 text-[11px] font-bold rounded-xl whitespace-nowrap shadow-xl border border-stone-200 opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all duration-150 transform translate-x-2 group-hover/btn:translate-x-0 z-50">
                              Google Chat
                          </div>
                      </div>
                    )}
                </div>

                {/* PIECE 2: AI Intelligence & Field Operations (Notes, AI Copilot, God AI) */}
                <div className="p-1.5 bg-[#FAFBF8] backdrop-blur-md rounded-full border border-stone-200/90 shadow-xl flex flex-col items-center gap-2">
                    {/* 4. AI Voice Notes Button */}
                    <div className="relative group/btn">
                        <button
                            type="button"
                            onClick={() => setIsVoiceNotesOpen(true)}
                            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white shadow-xl shadow-purple-950/20 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 cursor-pointer border border-purple-300/40 relative"
                            title={isKa ? "AI ხმოვანი & საველე ჩანაწერები" : "AI Voice & Audio Field Notes"}
                        >
                            <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            {notes && notes.length > 0 && (
                                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-black flex items-center justify-center border border-white shadow-sm">
                                    {notes.length}
                                </span>
                            )}
                        </button>
                        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#FAFBF8] text-stone-800 text-[11px] font-bold rounded-xl whitespace-nowrap shadow-xl border border-stone-200 opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all duration-150 transform translate-x-2 group-hover/btn:translate-x-0 z-50">
                            {isKa ? `ხმოვანი ჩანაწერები (${notes?.length || 0})` : `Voice Notes (${notes?.length || 0})`}
                        </div>
                    </div>

                    {/* 5. AI Assistant (Starts on AI Guide Assistant) */}
                    <div className="relative group/btn">
                        <button
                            type="button"
                            onClick={() => {
                                setAssistantView('guide');
                                setIsCollapsed(false);
                            }}
                            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-500 hover:from-cyan-500 hover:to-emerald-400 text-white shadow-xl shadow-cyan-950/20 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 cursor-pointer border border-cyan-300/40 relative"
                            title={isKa ? "AI გზამკვლევი ასისტენტი & დიაგნოსტიკა" : "AI Guide Assistant & Diagnostics"}
                        >
                            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </button>
                        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#FAFBF8] text-stone-800 text-[11px] font-bold rounded-xl whitespace-nowrap shadow-xl border border-stone-200 opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all duration-150 transform translate-x-2 group-hover/btn:translate-x-0 z-50">
                            {isKa ? 'AI ასისტენტი & გზამკვლევი' : 'AI Guide Assistant'}
                        </div>
                    </div>

                    {/* 6. God AI Hub / Root Console Button (Admins, Founders, Co-Founders, Root & System Admins only) */}
                    {hasPrivilegedGoogleAiAccess && (
                      <div className="relative group/btn">
                          <button
                              type="button"
                              onClick={() => setIsGodAIHubOpen(true)}
                              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white shadow-xl shadow-amber-950/30 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 cursor-pointer border-2 border-amber-300/50 relative"
                              title={isSystemAdmin ? (isKa ? "Root AI ასისტენტი & God AI კონსოლი (სუპერ ადმინი - ყველა კომპანია)" : "Root AI Assistant & God AI Console (Super Admin - All Companies)") : (isKa ? "God AI & აგრონომიული PM კონსოლი" : "God AI & Agronomy PM Console")}
                          >
                              <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-white"></span>
                              </span>
                          </button>
                          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#FAFBF8] text-stone-800 text-[11px] font-bold rounded-xl whitespace-nowrap shadow-xl border border-stone-200 opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all duration-150 transform translate-x-2 group-hover/btn:translate-x-0 z-50">
                              {isKa ? 'God AI კონსოლი' : 'God AI Console'}
                          </div>
                      </div>
                    )}
                </div>
            </div>
          </div>
        )}

        {/* Global Voice Notes Modal */}
        {onAddNote && (
            <GlobalVoiceNotesModal
                isOpen={isVoiceNotesOpen}
                onClose={() => setIsVoiceNotesOpen(false)}
                activeModuleName={activeModuleName}
                activeOrgId={activeOrgId}
                currentUser={currentUser}
                notes={notes}
                onAddNote={onAddNote}
                onDeleteNote={onDeleteNote}
                onDeleteMultipleNotes={onDeleteMultipleNotes}
            />
        )}

        {/* God AI & Agronomy PM Intelligence Hub Modal (Privileged roles only) */}
        {hasPrivilegedGoogleAiAccess && (
          <GodAIIntelligenceHubModal
              isOpen={isGodAIHubOpen}
              onClose={() => setIsGodAIHubOpen(false)}
              activeOrgId={activeOrgId}
              activeOrgName={activeOrgName}
              currentUser={currentUser}
              isSystemAdmin={isSystemAdmin || hasPrivilegedGoogleAiAccess}
              currentAiMode={currentAiMode}
              onSetAiMode={(mode) => {
                  if (onSetAiMode) onSetAiMode(mode);
              }}
              organizations={organizations}
              workAssignments={workAssignments}
              harvestEntries={harvestEntries}
              plantationFeatures={plantationFeatures}
              employees={employees}
              machinery={machinery}
              nutritionPlans={nutritionPlans}
              notes={notes}
              onNavigateToTasks={onNavigateToTasks}
          />
        )}

        {/* Dedicated Google Workspace & Farm Services Modal */}
        {isGoogleHubOpen && (
            <div className="fixed inset-0 z-[9900] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 select-none">
                <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl text-white space-y-5 animate-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white rounded-2xl shadow-md flex items-center justify-center">
                                <svg className="w-6 h-6" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-base font-black uppercase tracking-wider text-white">
                                    {isKa ? 'Google Workspace & საველე სერვისები' : 'Google Workspace & Farm Suite'}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    {isKa
                                      ? (hasPrivilegedGoogleAiAccess ? 'ინტეგრირებული Google Meet, Chat, Sheets & Drive' : 'ინტეგრირებული Google Sheets, Drive & Calendar')
                                      : (hasPrivilegedGoogleAiAccess ? 'Integrated Google Meet, Chat, Sheets, Drive & Research' : 'Integrated Google Sheets, Drive, Calendar & Research')}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsGoogleHubOpen(false)}
                            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Google Meet (Admins, Founders, Co-Founders, Root & System Admins only) */}
                        {hasPrivilegedGoogleAiAccess && (
                          <button
                              type="button"
                              onClick={() => {
                                  setIsGoogleHubOpen(false);
                                  if (onOpenMeet) onOpenMeet();
                                  else window.dispatchEvent(new CustomEvent('agrimap_open_meet'));
                              }}
                              className="p-3.5 bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/50 rounded-2xl flex flex-col gap-2 transition-all text-left cursor-pointer group"
                          >
                              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 w-fit group-hover:scale-110 transition-transform">
                                  <Video size={18} />
                              </div>
                              <div>
                                  <span className="font-bold text-white block">Google Meet</span>
                                  <span className="text-[10px] text-slate-400">Live video conference & map screen share</span>
                              </div>
                          </button>
                        )}

                        {/* Google Chat (Admins, Founders, Co-Founders, Root & System Admins only) */}
                        {hasPrivilegedGoogleAiAccess && (
                          <button
                              type="button"
                              onClick={() => {
                                  setIsGoogleHubOpen(false);
                                  if (onOpenChat) onOpenChat();
                                  else window.dispatchEvent(new CustomEvent('agrimap_open_chat'));
                              }}
                              className="p-3.5 bg-slate-950 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-500/50 rounded-2xl flex flex-col gap-2 transition-all text-left cursor-pointer group"
                          >
                              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 w-fit group-hover:scale-110 transition-transform">
                                  <MessageSquare size={18} />
                              </div>
                              <div>
                                  <span className="font-bold text-white block">Google Chat</span>
                                  <span className="text-[10px] text-slate-400">Team spaces & field intercom dispatch</span>
                              </div>
                          </button>
                        )}

                        {/* Google Sheets */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsGoogleHubOpen(false);
                                window.open('https://docs.google.com/spreadsheets/', '_blank');
                            }}
                            className="p-3.5 bg-slate-950 hover:bg-green-950/40 border border-slate-800 hover:border-green-500/50 rounded-2xl flex flex-col gap-2 transition-all text-left cursor-pointer group"
                        >
                            <div className="p-2 rounded-xl bg-green-500/20 text-green-400 w-fit group-hover:scale-110 transition-transform">
                                <FileSpreadsheet size={18} />
                            </div>
                            <div>
                                <span className="font-bold text-white block">Google Sheets</span>
                                <span className="text-[10px] text-slate-400">Harvest, yield & finance export</span>
                            </div>
                        </button>

                        {/* Google Drive & Docs */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsGoogleHubOpen(false);
                                window.open('https://drive.google.com/', '_blank');
                            }}
                            className="p-3.5 bg-slate-950 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/50 rounded-2xl flex flex-col gap-2 transition-all text-left cursor-pointer group"
                        >
                            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 w-fit group-hover:scale-110 transition-transform">
                                <FolderOpen size={18} />
                            </div>
                            <div>
                                <span className="font-bold text-white block">Google Drive & Docs</span>
                                <span className="text-[10px] text-slate-400">Agronomy SOPs & field logs</span>
                            </div>
                        </button>

                        {/* Google Calendar */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsGoogleHubOpen(false);
                                window.open('https://calendar.google.com/', '_blank');
                            }}
                            className="p-3.5 bg-slate-950 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 rounded-2xl flex flex-col gap-2 transition-all text-left cursor-pointer group"
                        >
                            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 w-fit group-hover:scale-110 transition-transform">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <span className="font-bold text-white block">Google Calendar</span>
                                <span className="text-[10px] text-slate-400">Spraying & harvest schedule</span>
                            </div>
                        </button>

                        {/* Google Search Grounding */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsGoogleHubOpen(false);
                                setAssistantView('guide');
                                setIsCollapsed(false);
                            }}
                            className="p-3.5 bg-slate-950 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 rounded-2xl flex flex-col gap-2 transition-all text-left cursor-pointer group"
                        >
                            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 w-fit group-hover:scale-110 transition-transform">
                                <Search size={18} />
                            </div>
                            <div>
                                <span className="font-bold text-white block">Google Grounding</span>
                                <span className="text-[10px] text-slate-400">Live agronomic market & web research</span>
                            </div>
                        </button>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono text-[10px]">
                            {currentUser?.email ? `User: ${currentUser.email}` : 'Google Services Active'}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsGoogleHubOpen(false)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}
      </>
    );
  }

  const isCompactScreen = viewport.width < 640;
  const effectiveWidth = isCompactScreen
    ? Math.max(280, viewport.width - 16)
    : Math.max(320, Math.min(panelSize.width, viewport.width - 16));
  const effectiveHeight = isCompactScreen
    ? Math.max(320, viewport.height - 16)
    : Math.max(320, Math.min(panelSize.height, viewport.height - 20));
  const clampedLeft = !isCompactScreen && commsPos
    ? Math.max(8, Math.min(Math.max(8, viewport.width - effectiveWidth - 8), commsPos.x))
    : undefined;
  const clampedTop = !isCompactScreen && commsPos
    ? Math.max(8, Math.min(Math.max(8, viewport.height - effectiveHeight - 8), commsPos.y))
    : undefined;

  return (
    <>
      <div 
        ref={commsContainerRef}
        style={isCompactScreen ? {
          position: 'fixed',
          inset: '8px',
          width: 'calc(100vw - 16px)',
          height: 'calc(100dvh - 16px)',
          maxWidth: 'calc(100vw - 16px)',
          maxHeight: 'calc(100dvh - 16px)',
          zIndex: 8500
        } : {
          position: 'fixed',
          left: clampedLeft !== undefined ? `${clampedLeft}px` : undefined,
          top: clampedTop !== undefined ? `${clampedTop}px` : undefined,
          right: clampedLeft === undefined ? '12px' : undefined,
          bottom: clampedTop === undefined ? '12px' : undefined,
          width: `${effectiveWidth}px`,
          height: `${effectiveHeight}px`,
          maxWidth: 'calc(100vw - 16px)',
          maxHeight: 'calc(100dvh - 16px)',
          zIndex: 8500
        }}
        className="bg-white flex flex-col rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 origin-bottom-right relative pointer-events-auto transition-[box-shadow,border-color] duration-150"
      >
        {/* Row 1: Primary Window Title Bar — Pinned Always-Visible Minimize / Maximize / Close (X) */}
        <div className="px-2.5 py-2 sm:px-3 sm:py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between select-none shrink-0 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              {!isCompactScreen && (
                <div 
                  onPointerDown={handleCommsPointerDown}
                  onPointerMove={handleCommsPointerMove}
                  onPointerUp={handleCommsPointerUp}
                  className="cursor-move p-1 text-slate-400 hover:text-slate-700 rounded transition-colors shrink-0"
                  title={isKa ? "ფანჯრის გადაადგილება" : "Drag Assistant Window"}
                >
                  <GripHorizontal size={15} />
                </div>
              )}
              <SparklesIcon className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-tight truncate">
                  {isKa ? 'AI ასისტენტი & ნავიგატორი' : 'AI System Navigator & Copilot'}
                </h3>
                <div className="flex items-center gap-1 mt-0.5 overflow-hidden">
                  <span className="text-[8.5px] sm:text-[9px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded tracking-wide border border-emerald-300 shrink-0">
                    Gemini 4 Hydrogen
                  </span>
                  <span className="text-[8.5px] sm:text-[9px] font-bold text-slate-600 bg-slate-200/80 px-1 py-0.2 rounded truncate">
                    {activeModuleName}
                  </span>
                  {isGodAIHubOpen && (
                    <span className="hidden sm:inline text-[8px] font-black text-amber-700 bg-amber-100 border border-amber-300 px-1 rounded animate-pulse shrink-0">
                      Console
                    </span>
                  )}
                </div>
              </div>
          </div>

          {/* Strictly Pinned Window Controls: Collapse (-), Enlarge/Restore, Close (X) — ALWAYS VISIBLE on every screen */}
          <div className="flex items-center gap-1 shrink-0 pl-1.5 border-l border-slate-200">
              <button 
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                  title={isKa ? "ჩაკეცვა (-)" : "Minimize (-)"}
                  aria-label="Minimize AI Assistant"
              >
                 <Minus size={14} strokeWidth={2.5} />
              </button>

              {!isCompactScreen && (
                <button
                    type="button"
                    onClick={toggleEnlarged}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                    title={isEnlarged ? (isKa ? "სტანდარტული ზომა" : "Standard Size") : (isKa ? "ფანჯრის გაფართოება" : "Enlarge Window")}
                    aria-label="Resize AI Assistant"
                >
                    {isEnlarged ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
              )}

              <button 
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  className="w-7 h-7 rounded-lg bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                  title={isKa ? "დახურვა (X)" : "Close (X)"}
                  aria-label="Close AI Assistant"
              >
                 <X size={15} strokeWidth={2.5} />
              </button>
          </div>
        </div>

        {/* Row 2: Compact Horizontally-Scrollable Quick Tools Bar — Never pushes Close (X) off-screen */}
        <div className="px-2.5 py-1.5 border-b border-slate-100 bg-slate-50/70 flex items-center gap-1 overflow-x-auto no-scrollbar select-none shrink-0">
              <button
                  type="button"
                  onClick={() => {
                      if (onNavigateMode) onNavigateMode('guide');
                      else window.dispatchEvent(new CustomEvent('agrimap_set_mode', { detail: 'guide' }));
                      setIsCollapsed(true);
                  }}
                  className="px-2 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 transition-all flex items-center gap-1 text-[10px] font-black uppercase cursor-pointer shrink-0"
                  title={isKa ? "SOP გზამკვლევი სქრინშოთებით" : "Open SOP Guide with Screenshots"}
              >
                  <BookOpen size={11} />
                  <span>{isKa ? 'SOP' : 'SOP Guide'}</span>
              </button>

              <button
                  type="button"
                  onClick={() => {
                      setAnalysisInitialTool('disease');
                      setIsAnalysisModalOpen(true);
                  }}
                  className="px-2 py-1 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-all flex items-center gap-1 text-[10px] font-black uppercase cursor-pointer shrink-0"
                  title={isKa ? "დიაგნოსტიკის გახსნა ცალკე Pop-up ფანჯარაში" : "Open Diagnostics in Dedicated Pop-up Modal"}
              >
                  <ExternalLink size={11} />
                  <span>Pop-up</span>
              </button>

              <button
                  type="button"
                  onClick={() => setIsGoogleHubOpen(true)}
                  className="px-2 py-1 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-slate-600 hover:text-slate-900 flex items-center gap-1 text-[10px] font-bold shrink-0"
                  title={isKa ? "Google Workspace & საველე სერვისები" : "Google Workspace Suite & Farm Tools"}
              >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span className="hidden sm:inline">Google</span>
              </button>

              {hasPrivilegedGoogleAiAccess && (
                <button
                    type="button"
                    onClick={() => {
                        if (onOpenMeet) onOpenMeet();
                        else window.dispatchEvent(new CustomEvent('agrimap_open_meet'));
                    }}
                    className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors text-emerald-600 hover:text-emerald-700 cursor-pointer shrink-0"
                    title={isKa ? "Google Meet - ვიდეო ოთახი" : "Google Meet - Video Room"}
                >
                    <Video className="w-3.5 h-3.5" />
                </button>
              )}

              {hasPrivilegedGoogleAiAccess && (
                <button
                    type="button"
                    onClick={() => {
                        if (onOpenChat) onOpenChat();
                        else window.dispatchEvent(new CustomEvent('agrimap_open_chat'));
                    }}
                    className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 hover:text-blue-700 cursor-pointer shrink-0"
                    title={isKa ? "Google Chat & საველე ინტერკომი" : "Google Chat & Field Spaces"}
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                  type="button"
                  onClick={() => setIsVoiceNotesOpen(true)}
                  className="p-1.5 hover:bg-purple-50 rounded-lg transition-colors text-purple-600 hover:text-purple-700 cursor-pointer relative shrink-0"
                  title={isKa ? `ხმოვანი ჩანაწერები (${notes?.length || 0})` : `Voice Notes (${notes?.length || 0})`}
              >
                  <Mic className="w-3.5 h-3.5" />
                  {notes && notes.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 px-1 min-w-3.5 h-3.5 rounded-full bg-rose-500 text-white font-mono text-[8px] font-black flex items-center justify-center">
                          {notes.length}
                      </span>
                  )}
              </button>

              <button
                  type="button"
                  onClick={() => {
                      setCommsPos(null);
                      safeStorage.removeItem('agrimap_floating_fabs_pos');
                      safeStorage.removeItem('agrimap_comms_tools_pos');
                      safeStorage.removeItem('agrimap_comms_hub_pos');
                      toast.success(isKa ? "პოზიცია გასწორდა!" : "Floating position & alignment corrected!");
                  }}
                  className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-cyan-600 hover:text-cyan-800 cursor-pointer shrink-0"
                  title={isKa ? "პოზიციის აღდგენა" : "Reset Window Position"}
              >
                  <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button 
                  type="button"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 hover:text-slate-800 cursor-pointer ml-auto shrink-0"
                  title={isKa ? "Gemini AI პარამეტრები" : "Gemini AI Settings & Diagnostics"}
              >
                  <Settings className="h-3.5 h-3.5" />
              </button>
        </div>

        {/* Dedicated AI Assistant View Switcher — Starts on AI Guide Assistant */}
        <div className="px-2.5 py-1.5 bg-white border-b border-slate-200 flex items-center gap-1.5 select-none shrink-0">
          <button
            type="button"
            onClick={() => setAssistantView('guide')}
            className={`flex-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              assistantView === 'guide'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700'
            }`}
          >
            <BookOpen size={13} />
            <span className="truncate">{isKa ? 'AI გზამკვლევი' : 'AI Guide Assistant'}</span>
          </button>
          <button
            type="button"
            onClick={() => setAssistantView('chat')}
            className={`flex-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              assistantView === 'chat'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare size={13} />
            <span className="truncate">{isKa ? 'Copilot ჩატი' : 'Copilot Chat'}</span>
          </button>
          <button
            type="button"
            onClick={() => setAssistantView('analysis')}
            className={`flex-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              assistantView === 'analysis'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700'
            }`}
          >
            <Leaf size={13} />
            <span className="truncate">{isKa ? 'დიაგნოსტიკა' : 'Diagnostics'}</span>
          </button>
        </div>

        {/* Mode Selector & Intelligence Hub Console Bar (shown in Copilot chat mode) */}
        {assistantView === 'chat' && (
        <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs select-none shrink-0 gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">{isKa ? 'რეჟიმი:' : 'Mode:'}</span>
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => onSetAiMode?.('standard')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  currentAiMode === 'standard' 
                    ? 'bg-slate-700 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isKa ? 'სტანდარტული' : 'Standard'}
              </button>
              <button
                type="button"
                onClick={() => onSetAiMode?.('expert')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  currentAiMode === 'expert' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
                title={isKa ? "მიბმულია მიმდინარე კომპანიაზე: აკონტროლებს სამუშაოებს, ამოცანებს, ტექნიკას" : "Attached to active enterprise: monitors work, tasks, bottlenecks, machinery, labor"}
              >
                <Leaf size={10} />
                <span>Expert PM</span>
              </button>
              {hasPrivilegedGoogleAiAccess && (
                <button
                  type="button"
                  onClick={() => onSetAiMode?.('god_ai')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    currentAiMode === 'god_ai' 
                      ? 'bg-amber-600 text-white shadow-xs animate-pulse' 
                      : 'text-slate-400 hover:text-amber-300'
                  }`}
                  title={isKa ? "სუპერ ადმინი God AI: კროს-კომპანიური მონაცემები" : "Super Admin God AI: Cross-enterprise learning across all registered companies"}
                >
                  <Crown size={10} />
                  <span>God AI</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAnalysisInitialTool('disease');
                setIsAnalysisModalOpen(true);
              }}
              className="px-2 py-1 bg-emerald-800/90 hover:bg-emerald-700 text-emerald-100 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 border border-emerald-600/50"
              title={isKa ? "AI დიაგნოსტიკის ცალკე Pop-up ფანჯარაში გახსნა" : "Open AI Diagnostics in Dedicated Pop-up Modal"}
            >
              <Stethoscope size={11} />
              <span>{isKa ? 'დიაგნოსტიკა (Pop-up)' : 'Pop-up'}</span>
            </button>
            {hasPrivilegedGoogleAiAccess && (
              <button
                type="button"
                onClick={() => setIsGodAIHubOpen(true)}
                className="px-2 py-1 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95"
                title={isKa ? "God AI & PM კონსოლის გახსნა" : "Open God AI & PM Intelligence Hub Console"}
              >
                <Sparkles size={11} />
                <span>{isKa ? 'კონსოლი' : 'Console'}</span>
              </button>
            )}
          </div>
        </div>
        )}

        {/* Tenant Attachment / Scope Radius / Root AI Banner */}
        {currentAiMode === 'expert' && (
          <div className="px-3 py-1.5 bg-emerald-950/95 border-b border-emerald-800/80 text-[10px] text-emerald-200 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5 truncate">
              <Leaf size={12} className="text-emerald-400 shrink-0" />
              <span><strong className="font-bold text-white">Attached Company Radius:</strong> {activeOrgName || activeOrgId || 'Active Enterprise'}</span>
            </span>
            <span className="text-[9px] bg-emerald-800/90 px-1.5 py-0.5 rounded text-emerald-100 uppercase tracking-wider font-mono shrink-0 ml-1 border border-emerald-600/40">
              Attached Scope
            </span>
          </div>
        )}
        {currentAiMode === 'standard' && (
          <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-300 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
              <span><strong className="font-bold text-slate-300">Attached Company Radius:</strong> <span className="text-emerald-300 font-bold">{activeOrgName || activeOrgId || 'Active Enterprise'}</span></span>
            </span>
            <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 uppercase tracking-wider font-mono shrink-0 ml-1 border border-slate-700">
              Copilot Radius
            </span>
          </div>
        )}
        {currentAiMode === 'god_ai' && hasPrivilegedGoogleAiAccess && (
          <div className="px-3 py-1.5 bg-amber-950/95 border-b border-amber-800/80 text-[10px] text-amber-200 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5 truncate">
              <Crown size={12} className="text-amber-400 shrink-0 animate-pulse" />
              <span><strong className="font-bold text-white">Root AI Assistant:</strong> Multi-Company Oversight Across All {organizations?.length || 0} Enterprises</span>
            </span>
            <span className="text-[9px] bg-amber-800/90 px-1.5 py-0.5 rounded text-amber-100 uppercase tracking-wider font-mono shrink-0 ml-1 border border-amber-600/40">
              Super Admin
            </span>
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[10px] shrink-0">
          <button
            type="button"
            onClick={() => onSendCommand("Explain the whole application architecture, GIS cadastral workflow, and 16-step SOP directives for our attached company.")}
            className="whitespace-nowrap px-2 py-0.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-900 rounded-full font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            🧭 App Architecture & SOP
          </button>
          <button
            type="button"
            onClick={() => onSendCommand("How do I use the Active Standing Register to add vehicles and materials, and link them to tasks and work assignments?")}
            className="whitespace-nowrap px-2 py-0.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 rounded-full font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            🚜 Vehicles & Materials
          </button>
          <button
            type="button"
            onClick={() => onSendCommand("Detail the 6 electronic digital scale protocols, 0.35kg tare deduction, and harvest weigh station integration.")}
            className="whitespace-nowrap px-2 py-0.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-900 rounded-full font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            ⚖️ 6 Scale Protocols
          </button>
          <button
            type="button"
            onClick={() => onSendCommand(`Provide a full status report on work assignments, bottlenecks, inventory FIFO, and machinery strictly within the radius of our attached company (${activeOrgName || 'Active Enterprise'}).`)}
            className="whitespace-nowrap px-2 py-0.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-900 rounded-full font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            📍 Company Radius Intel
          </button>
          {hasPrivilegedGoogleAiAccess && (
            <button
              type="button"
              onClick={() => {
                if (currentAiMode !== 'god_ai' && onSetAiMode) onSetAiMode('god_ai');
                onSendCommand("As the Root AI Assistant, analyze cross-enterprise benchmarks and comparative performance across all registered companies.");
              }}
              className="whitespace-nowrap px-2 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full font-bold transition-colors cursor-pointer hover:opacity-90 flex items-center gap-1 shadow-xs"
            >
              👑 Root AI: All Companies
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setAnalysisInitialTool('disease');
              setAssistantView('analysis');
            }}
            className="whitespace-nowrap px-2 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-full font-bold transition-colors cursor-pointer hover:bg-emerald-200 flex items-center gap-1"
          >
            <Leaf size={10} className="text-emerald-700" /> 🔬 AI დიაგნოსტიკა
          </button>
          {hasPrivilegedGoogleAiAccess && (
            <button
              type="button"
              onClick={() => setIsGodAIHubOpen(true)}
              className="whitespace-nowrap px-2 py-0.5 bg-gradient-to-r from-emerald-100 to-amber-100 border border-emerald-200 text-emerald-900 rounded-full font-bold transition-colors cursor-pointer hover:opacity-90 flex items-center gap-1"
            >
              <Sparkles size={10} className="text-amber-600" /> Console
            </button>
          )}
        </div>
        
        {isSettingsOpen && (
            <div className="absolute inset-0 bg-white z-20 p-5 flex flex-col overflow-y-auto">
                 <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                     <div className="flex items-center gap-2">
                         <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                             <Settings className="w-4 h-4" />
                         </div>
                         <div>
                             <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">AI & Gemini Configuration</h3>
                             <p className="text-[10px] text-slate-400">Settings for agrimap.pro & local servers</p>
                         </div>
                     </div>
                     <button 
                        onClick={() => setIsSettingsOpen(false)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                     >
                        <XIcon className="h-5 w-5" />
                     </button>
                 </div>
                 
                 <div className="space-y-4 text-xs">
                     {/* Active Status Card */}
                     <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                         <div className="flex items-center justify-between">
                             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Status</span>
                             {getActiveGeminiApiKey() ? (
                                 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                     <ShieldCheck className="w-3 h-3" /> Key Detected
                                 </span>
                             ) : (
                                 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                     <AlertTriangle className="w-3 h-3" /> No Key
                                 </span>
                             )}
                         </div>
                         <div className="text-[11px] text-slate-600 flex items-center justify-between">
                             <span>Model Tier:</span>
                             <span className="font-mono text-slate-800 font-medium">gemini-4-hydrogen (auto-fallback)</span>
                         </div>
                     </div>

                     {/* API Key Input */}
                     <div className="space-y-1.5">
                         <div className="flex items-center justify-between">
                             <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                                 Gemini API Key
                             </label>
                             <a 
                                 href="https://aistudio.google.com/apikey" 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                             >
                                 Get Free Key <ExternalLink className="w-2.5 h-2.5" />
                             </a>
                         </div>
                         <input 
                             type="password"
                             value={apiKeyInput}
                             onChange={(e) => setApiKeyInput(e.target.value)}
                             className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50"
                             placeholder="AIzaSy..."
                         />
                         <p className="text-[10px] text-slate-400 leading-relaxed">
                             Stored securely in your local browser storage. Allows AI assistance even on custom domains or offline testing servers.
                         </p>
                     </div>

                     {/* Test Result Message */}
                     {testStatus && (
                         <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                             testStatus.ok 
                                 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                 : testStatus.statusCode === 402
                                 ? 'bg-amber-50 border-amber-300 text-amber-900'
                                 : 'bg-red-50 border-red-200 text-red-800'
                         }`}>
                             <div className="flex items-start gap-2">
                                 {testStatus.ok ? (
                                     <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                 ) : testStatus.statusCode === 402 ? (
                                     <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                 ) : (
                                     <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                 )}
                                 <div className="flex-1">
                                     <div className="font-bold flex items-center justify-between">
                                         <span>{testStatus.ok ? 'Connection Successful' : (testStatus.title || 'Connection Failed')}</span>
                                         {testStatus.statusCode && (
                                             <span className="font-mono text-[10px] px-1.5 py-0.2 bg-black/5 rounded">
                                                 HTTP {testStatus.statusCode}
                                             </span>
                                         )}
                                     </div>
                                     <div className="mt-0.5 text-[11px] whitespace-pre-wrap">{testStatus.message}</div>
                                     {testStatus.latencyMs && (
                                         <div className="mt-1 text-[10px] text-emerald-700 font-mono">
                                             Model: {testStatus.modelUsed || testStatus.model || PRIMARY_GEMINI_MODEL} | Latency: {testStatus.latencyMs}ms
                                         </div>
                                     )}
                                     {testStatus.statusCode === 402 && (
                                         <div className="mt-2 pt-2 border-t border-amber-200 flex flex-wrap gap-1.5">
                                             <a
                                                 href={testStatus.billingUrl || 'https://ai.studio/projects'}
                                                 target="_blank"
                                                 rel="noopener noreferrer"
                                                 className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px]"
                                             >
                                                 <ExternalLink className="w-3 h-3" /> Manage Credits
                                             </a>
                                             <button
                                                 type="button"
                                                 onClick={() => triggerAiDiagnosticsModal('402 Prepayment Credits Depleted')}
                                                 className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-[10px] cursor-pointer"
                                             >
                                                 Resolution Guide
                                             </button>
                                         </div>
                                     )}
                                 </div>
                             </div>
                         </div>
                     )}

                     {/* Save Status Alert */}
                     {saveStatus && (
                         <div className={`p-2.5 rounded-xl border text-xs ${
                             saveStatus.type === 'success' 
                                 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                 : 'bg-blue-50 border-blue-200 text-blue-800'
                         }`}>
                             {saveStatus.message}
                         </div>
                     )}

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                          <button 
                              onClick={handleTestConnection}
                              disabled={isTestingKey}
                              className="py-2.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                          >
                              <RefreshCw className={`w-3.5 h-3.5 ${isTestingKey ? 'animate-spin text-emerald-600' : ''}`} />
                              {isTestingKey ? 'Testing...' : 'Test Connection'}
                          </button>
                          <button 
                              onClick={handleSaveApiKey}
                              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                          >
                              <Key className="w-3.5 h-3.5" />
                              Save Key
                          </button>
                      </div>

                      {/* AI Diagnostics & Token Top-Up Shortcuts */}
                      <div className="space-y-1.5 pt-1">
                          <button
                              type="button"
                              onClick={() => {
                                  setIsSettingsOpen(false);
                                  triggerAiDiagnosticsModal();
                              }}
                              className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                          >
                              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                              <span>AI Diagnostics & Prepayment Manager</span>
                          </button>
                          <button
                              type="button"
                              onClick={() => {
                                  setIsSettingsOpen(false);
                                  triggerAiTopUpModal();
                              }}
                              className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                              <Crown className="w-3.5 h-3.5 text-amber-500" />
                              <span>Buy Tokens or Unlimited Subscription</span>
                          </button>
                      </div>

                     {/* Clear Key Option */}
                     {apiKeyInput && (
                         <button 
                             onClick={handleClearApiKey}
                             className="w-full py-1.5 text-center text-[11px] text-slate-400 hover:text-red-600 transition flex items-center justify-center gap-1"
                         >
                             <Trash2 className="w-3 h-3" /> Remove Browser Key & Reset
                         </button>
                     )}

                     {/* Server Deployment Note */}
                     <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400 leading-relaxed space-y-1">
                         <div className="font-semibold text-slate-600">Production / Local Server Tip:</div>
                         <div>Add <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">GEMINI_API_KEY=your_key</code> to your server <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">.env</code> so you do not have to enter it in each browser.</div>
                     </div>
                 </div>
            </div>
        )}

        {assistantView === 'guide' ? (
          <div className="flex-grow min-h-0 overflow-hidden flex flex-col bg-white">
            <HelpAiAssistantChat
              compact
              language={language}
              currentUser={currentUser}
              onOpenSopGuide={() => {
                if (onNavigateMode) onNavigateMode('guide');
                else window.dispatchEvent(new CustomEvent('agrimap_set_mode', { detail: 'guide' }));
                setIsCollapsed(true);
              }}
              onNavigateMode={(mode) => {
                if (onNavigateMode) {
                  onNavigateMode(mode);
                } else {
                  window.dispatchEvent(new CustomEvent('agrimap_set_mode', { detail: mode }));
                }
                setIsCollapsed(true);
              }}
            />
          </div>
        ) : assistantView === 'analysis' ? (
          <div className="flex-grow min-h-0 overflow-hidden flex flex-col bg-white">
            <div className="p-2 bg-emerald-50/90 border-b border-emerald-100 flex items-center justify-between text-xs px-3">
              <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5 truncate">
                <Stethoscope size={13} className="text-emerald-600 shrink-0" />
                <span>{isKa ? 'AI დიაგნოსტიკა & კლინიკური ანალიტიკა' : 'AI Diagnostics & Clinical Suite'}</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAnalysisModalOpen(true)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1 shadow-xs cursor-pointer transition-all hover:scale-105"
                  title={isKa ? 'ცალკე Pop-up ფანჯარაში გახსნა (კონსოლის მსგავსად)' : 'Open in Pop-up Modal (like Console)'}
                >
                  <ExternalLink size={11} />
                  <span>{isKa ? 'Pop-up ფანჯარა' : 'Pop-up Window'}</span>
                </button>
                <button
                  type="button"
                  onClick={toggleEnlarged}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all"
                  title={isEnlarged ? (isKa ? 'ფანჯრის შემცირება' : 'Standard Size') : (isKa ? 'ფანჯრის გაფართოება' : 'Enlarge Window')}
                >
                  {isEnlarged ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                  <span>{isEnlarged ? (isKa ? 'შემცირება' : 'Shrink') : (isKa ? 'გაფართოება' : 'Enlarge')}</span>
                </button>
              </div>
            </div>
            <AiAnalysisSuite
              mode={isEnlarged ? 'full' : 'compact'}
              initialTool={analysisInitialTool}
              activeOrgId={activeOrgId}
              currentUser={currentUser}
              onClose={() => setAssistantView('guide')}
              onAddTask={onAddTask}
              onAddNutritionPlan={onAddNutritionPlan}
            />
          </div>
        ) : (
          <>
            <div className="flex-grow min-h-0 overflow-y-auto p-4 space-y-4 bg-white">
              {messages.map((msg) => (
                  <Message 
                      key={msg.id} 
                      message={msg} 
                      onOpenSettings={() => setIsSettingsOpen(true)}
                  />
              ))}
              {isLoading && (
                  <div className="flex items-start gap-2.5">
                       <div className="flex-shrink-0 mt-1"><SparklesIcon className="h-5 w-5 text-green-500 animate-pulse"/></div>
                      <div className="p-3 rounded-lg bg-gray-100 text-gray-500 text-xs italic">
                          {isKa ? 'ფიქრობს...' : 'Thinking...'}
                      </div>
                  </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={handleSend} className="p-3 border-t bg-slate-50 flex items-center gap-2 relative shrink-0">
              <div className="absolute -top-10 left-4">
                   <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-lg shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest leading-none">
                        {isKa ? 'AI & დიაგნოსტიკა დაკავშირებულია' : 'AI & DIAGNOSTICS LINKED'}
                      </span>
                  </div>
              </div>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isKa ? "ჰკითხეთ AI-ს ან მოიძიეთ კლინიკური დიაგნოსტიკა..." : "Ask Gemini 2.5 AI Navigator & Copilot..."}
                className="flex-grow p-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none bg-white transition-all"
                disabled={isListening}
              />
              <button
                type="button"
                onClick={handleVoiceCommand}
                disabled={isListening}
                className={`p-2 rounded-xl transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-slate-200 text-slate-400'}`}
                title={isKa ? "ხმოვანი ბრძანება" : "Speak command"}
              >
                <MicrophoneIcon className="h-5 w-5" />
              </button>
              <button
                type="submit"
                disabled={!inputValue.trim() || isListening}
                className="p-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-slate-300 transition-colors cursor-pointer flex items-center justify-center min-w-[36px]"
                title={isKa ? "გაგზავნა" : "Send message"}
              >
                {isLoading ? (
                  <Sparkles className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <ArrowUpCircleIcon className="h-5 w-5" />
                )}
              </button>
            </form>
          </>
        )}
         <style>{`
          @keyframes pulse {
            50% { opacity: .5; }
          }
          .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>

        {/* Live Window Resize Edge Handles with Hover Arrows */}
        {/* Left Edge */}
        <div
          onPointerDown={(e) => startResize(e, 'left')}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          className="group/edge-left absolute -left-1.5 top-3 bottom-3 w-4 cursor-ew-resize z-[3550] flex items-center justify-center select-none touch-none"
          title={isKa ? "ზომის გაზრდა / შემცირება (გაჭიმეთ მარცხნივ/მარჯვნივ)" : "Live resize width (drag left/right)"}
        >
          <div className="w-1 h-full bg-emerald-500/0 group-hover/edge-left:bg-emerald-500/50 rounded-full transition-colors" />
          <div className="absolute left-0.5 bg-emerald-600 text-white rounded-full p-1 shadow-lg border border-emerald-300 opacity-0 group-hover/edge-left:opacity-100 transition-opacity pointer-events-none flex items-center justify-center scale-90">
            <ArrowLeftRight size={12} />
          </div>
        </div>

        {/* Right Edge */}
        <div
          onPointerDown={(e) => startResize(e, 'right')}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          className="group/edge-right absolute -right-1.5 top-3 bottom-3 w-4 cursor-ew-resize z-[3550] flex items-center justify-center select-none touch-none"
          title={isKa ? "ზომის გაზრდა / შემცირება (გაჭიმეთ მარცხნივ/მარჯვნივ)" : "Live resize width (drag left/right)"}
        >
          <div className="w-1 h-full bg-emerald-500/0 group-hover/edge-right:bg-emerald-500/50 rounded-full transition-colors" />
          <div className="absolute right-0.5 bg-emerald-600 text-white rounded-full p-1 shadow-lg border border-emerald-300 opacity-0 group-hover/edge-right:opacity-100 transition-opacity pointer-events-none flex items-center justify-center scale-90">
            <ArrowLeftRight size={12} />
          </div>
        </div>

        {/* Top Edge */}
        <div
          onPointerDown={(e) => startResize(e, 'top')}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          className="group/edge-top absolute -top-1.5 left-3 right-3 h-4 cursor-ns-resize z-[3550] flex items-center justify-center select-none touch-none"
          title={isKa ? "ზომის გაზრდა / შემცირება (გაჭიმეთ ზემოთ/ქვემოთ)" : "Live resize height (drag up/down)"}
        >
          <div className="h-1 w-full bg-emerald-500/0 group-hover/edge-top:bg-emerald-500/50 rounded-full transition-colors" />
          <div className="absolute top-0.5 bg-emerald-600 text-white rounded-full p-1 shadow-lg border border-emerald-300 opacity-0 group-hover/edge-top:opacity-100 transition-opacity pointer-events-none flex items-center justify-center scale-90">
            <ArrowUpDown size={12} />
          </div>
        </div>

        {/* Bottom Edge */}
        <div
          onPointerDown={(e) => startResize(e, 'bottom')}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          className="group/edge-bottom absolute -bottom-1.5 left-3 right-3 h-4 cursor-ns-resize z-[3550] flex items-center justify-center select-none touch-none"
          title={isKa ? "ზომის გაზრდა / შემცირება (გაჭიმეთ ზემოთ/ქვემოთ)" : "Live resize height (drag up/down)"}
        >
          <div className="h-1 w-full bg-emerald-500/0 group-hover/edge-bottom:bg-emerald-500/50 rounded-full transition-colors" />
          <div className="absolute bottom-0.5 bg-emerald-600 text-white rounded-full p-1 shadow-lg border border-emerald-300 opacity-0 group-hover/edge-bottom:opacity-100 transition-opacity pointer-events-none flex items-center justify-center scale-90">
            <ArrowUpDown size={12} />
          </div>
        </div>

        {/* Corner Handles */}
        <div
          onPointerDown={(e) => startResize(e, 'bottom-right')}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          className="group/corner-br absolute -bottom-2 -right-2 w-6 h-6 cursor-nwse-resize z-[3560] flex items-center justify-center select-none touch-none"
          title={isKa ? "დიაგონალური ზომის შეცვლა" : "Diagonal resize"}
        >
          <div className="w-3.5 h-3.5 border-r-2 border-b-2 border-slate-400 group-hover/corner-br:border-emerald-500 rounded-br transition-colors" />
        </div>
        <div
          onPointerDown={(e) => startResize(e, 'bottom-left')}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          className="group/corner-bl absolute -bottom-2 -left-2 w-6 h-6 cursor-nesw-resize z-[3560] flex items-center justify-center select-none touch-none"
          title={isKa ? "დიაგონალური ზომის შეცვლა" : "Diagonal resize"}
        >
          <div className="w-3.5 h-3.5 border-l-2 border-b-2 border-slate-400 group-hover/corner-bl:border-emerald-500 rounded-bl transition-colors" />
        </div>
        <div
          onPointerDown={(e) => startResize(e, 'top-right')}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          className="group/corner-tr absolute -top-2 -right-2 w-6 h-6 cursor-nesw-resize z-[3560] flex items-center justify-center select-none touch-none"
          title={isKa ? "დიაგონალური ზომის შეცვლა" : "Diagonal resize"}
        >
          <div className="w-3.5 h-3.5 border-r-2 border-t-2 border-slate-400 group-hover/corner-tr:border-emerald-500 rounded-tr transition-colors" />
        </div>
        <div
          onPointerDown={(e) => startResize(e, 'top-left')}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          className="group/corner-tl absolute -top-2 -left-2 w-6 h-6 cursor-nwse-resize z-[3560] flex items-center justify-center select-none touch-none"
          title={isKa ? "დიაგონალური ზომის შეცვლა" : "Diagonal resize"}
        >
          <div className="w-3.5 h-3.5 border-l-2 border-t-2 border-slate-400 group-hover/corner-tl:border-emerald-500 rounded-tl transition-colors" />
        </div>

        {/* Live Resizing Dimension Overlay Badge */}
        {isResizing && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[3600] px-4 py-2 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-emerald-500/80 text-xs font-mono font-bold flex items-center gap-2.5 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
            <ArrowLeftRight size={14} className="text-emerald-400 animate-pulse" />
            <span>{Math.round(panelSize.width)} × {Math.round(panelSize.height)} px</span>
            <span className="text-[10px] text-emerald-300 font-sans font-medium">
              {isKa ? 'რეალურ დროში ზომა' : 'Live Size'}
            </span>
          </div>
        )}
      </div>

      {onAddNote && (
          <GlobalVoiceNotesModal
              isOpen={isVoiceNotesOpen}
              onClose={() => setIsVoiceNotesOpen(false)}
              activeModuleName={activeModuleName}
              activeOrgId={activeOrgId}
              currentUser={currentUser}
              notes={notes}
              onAddNote={onAddNote}
              onDeleteNote={onDeleteNote}
              onDeleteMultipleNotes={onDeleteMultipleNotes}
          />
      )}

      {/* God AI & Agronomy PM Intelligence Hub Modal (Privileged roles only) */}
      {hasPrivilegedGoogleAiAccess && (
        <GodAIIntelligenceHubModal
            isOpen={isGodAIHubOpen}
            onClose={() => setIsGodAIHubOpen(false)}
            activeOrgId={activeOrgId}
            activeOrgName={activeOrgName}
            currentUser={currentUser}
            isSystemAdmin={isSystemAdmin || hasPrivilegedGoogleAiAccess}
            currentAiMode={currentAiMode}
            onSetAiMode={(mode) => {
                if (onSetAiMode) onSetAiMode(mode);
            }}
            organizations={organizations}
            workAssignments={workAssignments}
            harvestEntries={harvestEntries}
            plantationFeatures={plantationFeatures}
            employees={employees}
            machinery={machinery}
            nutritionPlans={nutritionPlans}
            notes={notes}
            onNavigateToTasks={onNavigateToTasks}
        />
      )}

      {/* AI Analysis Suite Dedicated Pop-up Modal (Matches Console Window) */}
      <AiAnalysisModal
          isOpen={isAnalysisModalOpen}
          onClose={() => setIsAnalysisModalOpen(false)}
          initialTool={analysisInitialTool}
          activeOrgId={activeOrgId}
          activeOrgName={activeOrgName}
          currentUser={currentUser}
          onAddTask={onAddTask}
          onAddNutritionPlan={onAddNutritionPlan}
      />
    </>
  );
};

export default GlobalAssistantPanel;
