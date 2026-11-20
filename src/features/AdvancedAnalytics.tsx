import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Zap, 
    Sparkles, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    CreditCard, 
    RefreshCw, 
    FileText, 
    Layers, 
    Bot, 
    Leaf, 
    Microscope, 
    Search, 
    Trash2, 
    Copy, 
    Check, 
    ArrowRight, 
    HelpCircle, 
    ShieldCheck, 
    Activity, 
    Cpu, 
    Calendar, 
    SlidersHorizontal,
    Star,
    ExternalLink,
    Key,
    DollarSign,
    TrendingUp,
    Info,
    Percent,
    Calculator
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { Note, User } from '../types';
import { 
    getDailyAiUsageStats, 
    getAiQueryHistory, 
    clearAiQueryHistory, 
    AiQueryHistoryItem, 
    DailyAiUsageStats, 
    openAiManagementConsole, 
    executeGeminiCall,
    testGeminiApiKey,
    GeminiTestResult,
    AI_SUBSCRIPTION_PLANS,
    AI_CREDIT_PACKS,
    getActiveGeminiApiKey,
    setCustomGeminiApiKey,
    isLocalAiDisabled,
    setLocalAiDisabled
} from '../services/geminiService';
import { clinicalAnalysisService, SavedAgroAnalysisRecord } from '../services/clinicalAnalysisService';
import { godAIKnowledgeEngine } from '../new_engine/ai/GodAIKnowledgeEngine';
import { AiSourceBadge } from '../components/AiSourceBadge';

interface AdvancedAnalyticsProps {
    currentUser?: User | null;
    onUpdateUser?: (updated: User) => void;
    notes?: Note[];
    onUpdateNote?: (note: Note) => void;
    activeOrgId?: string;
}

export const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({
    currentUser,
    onUpdateUser,
    notes = [],
    onUpdateNote,
    activeOrgId = 'default'
}) => {
    const { t, language } = useLanguage();
    const isKa = language === 'ka' || t('language') === 'ka' || (typeof localStorage !== 'undefined' && localStorage.getItem('agri-app-lang') === 'ka');

    // Navigation Tabs inside AI Control Tool
    const [activeSection, setActiveSection] = useState<'overview' | 'pricing_regulator' | 'notes_learning' | 'history' | 'clinical' | 'diagnostics'>('overview');

    // Local AI Switch state
    const [localAiDisabled, setLocalAiState] = useState<boolean>(() => isLocalAiDisabled());
    
    // Gemini Key configuration
    const [geminiApiKeyInput, setGeminiApiKeyInput] = useState<string>(() => getActiveGeminiApiKey());
    const [isSavingKey, setIsSavingKey] = useState(false);

    // AI Pricing & Profit Simulator States
    const [simFarmsCount, setSimFarmsCount] = useState<number>(10);
    const [simQueriesPerFarm, setSimQueriesPerFarm] = useState<number>(2500);
    const [simOneGelPacksSold, setSimOneGelPacksSold] = useState<number>(50);

    // AI Usage Stats
    const [stats, setStats] = useState<DailyAiUsageStats>(() => getDailyAiUsageStats(currentUser));
    
    // AI Query History
    const [history, setHistory] = useState<AiQueryHistoryItem[]>(() => getAiQueryHistory());
    const [historySearch, setHistorySearch] = useState('');
    const [historyFilter, setHistoryFilter] = useState<'all' | 'cloud' | 'local'>('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Clinical Agro Analyses
    const [clinicalRecords, setClinicalRecords] = useState<SavedAgroAnalysisRecord[]>([]);
    const [clinicalLoading, setClinicalLoading] = useState(false);
    const [clinicalFilter, setClinicalFilter] = useState<'all' | 'disease' | 'soil' | 'agro_image'>('all');

    // Notes Daily Agro Analysis State
    const [isAnalyzingNotes, setIsAnalyzingNotes] = useState(false);
    const [dailySynthesisReport, setDailySynthesisReport] = useState<string | null>(null);
    const [filterOnlyCheckedNotes, setFilterOnlyCheckedNotes] = useState(true);

    // Diagnostic status
    const [diagnosticResult, setDiagnosticResult] = useState<GeminiTestResult | null>(null);
    const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);

    // Handle Local AI Toggle
    const handleToggleLocalAi = () => {
        const nextState = !localAiDisabled;
        setLocalAiDisabled(nextState);
        setLocalAiState(nextState);
        if (nextState) {
            toast.warning(
                isKa 
                    ? '🔴 ლოკალური AI გამორთულია. სისტემა იმუშავებს მხოლოდ მკაცრ Google Gemini API რეჟიმში!' 
                    : '🔴 Local AI disabled. Strict Google Gemini API mode active!'
            );
        } else {
            toast.success(
                isKa 
                    ? '🟢 ლოკალური AI ჩართულია. ინტერნეტის შეფერხებისას ავტომატურად იმუშავებს სარეზერვო ბირთვი.' 
                    : '🟢 Local AI enabled. Autonomous offline knowledge fallback active.'
            );
        }
    };

    // Handle Save Custom Key
    const handleSaveGeminiKey = async () => {
        setIsSavingKey(true);
        try {
            await setCustomGeminiApiKey(geminiApiKeyInput.trim());
            toast.success(isKa ? 'Gemini API გასაღები შენახულია და სინქრონიზებულია სერვერთან!' : 'Gemini API key saved & synced to server runtime!');
            const testRes = await testGeminiApiKey(geminiApiKeyInput.trim());
            setDiagnosticResult(testRes);
        } catch (err: any) {
            toast.error(err?.message || (isKa ? 'გასაღების შენახვა ვერ შესრულდა' : 'Failed to save key'));
        } finally {
            setIsSavingKey(false);
        }
    };

    // Refresh stats when custom events fire
    useEffect(() => {
        const refreshStats = () => {
            setStats(getDailyAiUsageStats(currentUser));
            setHistory(getAiQueryHistory());
            setLocalAiState(isLocalAiDisabled());
            setGeminiApiKeyInput(getActiveGeminiApiKey());
        };

        window.addEventListener('agrimap:daily_ai_usage_changed', refreshStats);
        window.addEventListener('agrimap:ai_history_updated', refreshStats);
        window.addEventListener('agrimap:ai_provenance_changed', refreshStats);
        window.addEventListener('agrimap:admin_granted_tokens', refreshStats);
        window.addEventListener('agrimap_local_ai_toggle', refreshStats);
        window.addEventListener('agrimap_gemini_key_updated', refreshStats);

        return () => {
            window.removeEventListener('agrimap:daily_ai_usage_changed', refreshStats);
            window.removeEventListener('agrimap:ai_history_updated', refreshStats);
            window.removeEventListener('agrimap:ai_provenance_changed', refreshStats);
            window.removeEventListener('agrimap:admin_granted_tokens', refreshStats);
            window.removeEventListener('agrimap_local_ai_toggle', refreshStats);
            window.removeEventListener('agrimap_gemini_key_updated', refreshStats);
        };
    }, [currentUser]);

    // Load clinical analyses
    useEffect(() => {
        let isMounted = true;
        setClinicalLoading(true);
        clinicalAnalysisService.getSavedAnalyses(activeOrgId).then(records => {
            if (isMounted) {
                setClinicalRecords(records);
                setClinicalLoading(false);
            }
        }).catch(() => {
            if (isMounted) setClinicalLoading(false);
        });
        return () => { isMounted = false; };
    }, [activeOrgId]);

    // Handle Copy
    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success(isKa ? 'დაკოპირდა გაცვლის ბუფერში' : 'Copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Toggle note dailyAgroAnalysis
    const handleToggleNoteCheck = (note: Note) => {
        const updated: Note = {
            ...note,
            dailyAgroAnalysis: !note.dailyAgroAnalysis
        };
        if (onUpdateNote) {
            onUpdateNote(updated);
        } else {
            window.dispatchEvent(new CustomEvent('agrimap_update_note', { detail: updated }));
        }
        toast.success(
            updated.dailyAgroAnalysis 
                ? (isKa ? 'შენიშვნა დაემატა დღიურ აგრო-ანალიზში' : 'Note added to Daily Agro Analysis')
                : (isKa ? 'შენიშვნა ამოიშალა დღიური აგრო-ანალიზიდან' : 'Note removed from Daily Agro Analysis')
        );
    };

    // Filter notes for agro analysis
    const checkedNotes = useMemo(() => {
        return notes.filter(n => Boolean(n.dailyAgroAnalysis));
    }, [notes]);

    const displayedNotes = useMemo(() => {
        return filterOnlyCheckedNotes ? checkedNotes : notes;
    }, [notes, checkedNotes, filterOnlyCheckedNotes]);

    // Run Daily Agro Notes Analysis via Gemini or GodAI
    const handleRunDailyAgroNotesSynthesis = async () => {
        if (checkedNotes.length === 0) {
            toast.error(isKa ? 'გთხოვთ ჯერ მონიშნოთ მინიმუმ ერთი აგრო-შენიშვნა' : 'Please check at least one agro note first');
            return;
        }

        setIsAnalyzingNotes(true);
        setDailySynthesisReport(null);

        try {
            const notesText = checkedNotes.map((n, idx) => 
                `[Note #${idx + 1}] Date: ${new Date(n.timestamp).toLocaleDateString()}, Author: ${n.authorName}, Module: ${n.moduleName || 'Field'}\nContent: "${n.content}"\nTags: ${(n.tags || []).join(', ')}`
            ).join('\n\n');

            const prompt = `You are the Agrimap Senior Agronomist and Chief Field Intelligence Specialist. 
Synthesize these ${checkedNotes.length} daily agricultural field notes into an executive clinical agro report for the farm:

${notesText}

Please provide a well-structured agronomic synthesis with:
1. 📋 EXECUTIVE FIELD HEALTH SUMMARY (Overview of today's field condition)
2. 🚨 CRITICAL PATHOLOGY & STRESS ALERTS (Pest outbreaks, fungal indicators, irrigation stress, nutrient chlorosis)
3. 💊 IMMEDIATE CLINICAL INTERVENTIONS & DOSAGES (Exact chemicals/fertilizers/organic treatments with kg/ha dosage)
4. 🧠 LEARNED KNOWLEDGE HEURISTIC (1 concise rule of thumb derived from today's notes for future AI model training)

Language: ${isKa ? 'Write the complete report in natural, professional Georgian (ქართულად)' : 'Write in English'}.`;

            const result = await executeGeminiCall({
                contents: prompt,
                model: 'gemini-4-hydrogen'
            });

            const report = result?.text || (isKa ? 'აგრო-ანალიზი წარმატებით დასრულდა.' : 'Agro analysis completed successfully.');
            setDailySynthesisReport(report);

            // Update analyzed notes with insights and timestamp
            const nowIso = new Date().toISOString();
            checkedNotes.forEach(n => {
                const updatedNote: Note = {
                    ...n,
                    aiAnalyzedAt: nowIso,
                    aiAgroInsights: isKa 
                        ? `[დღიური AI სინთეზი ${new Date().toLocaleDateString()}] გაანალიზებულია საველე ინტელექტის მიერ. გადამოწმებულია პათოგენების რისკი.`
                        : `[Daily AI Synthesis ${new Date().toLocaleDateString()}] Analyzed by Field Intelligence. Pathogen & soil stress assessed.`
                };
                if (onUpdateNote) onUpdateNote(updatedNote);
                else window.dispatchEvent(new CustomEvent('agrimap_update_note', { detail: updatedNote }));
            });

            // Train GodAI Local Knowledge Engine
            godAIKnowledgeEngine.recordModuleAiEvent({
                module: 'agronomy',
                summary: `Daily Agro Notes Synthesis (${checkedNotes.length} field observations analyzed)`,
                recommendation: report.slice(0, 300),
                orgId: activeOrgId,
                metrics: {
                    notesCount: checkedNotes.length,
                    analyzedAt: nowIso,
                    source: result?.source || 'cloud'
                }
            });

            toast.success(isKa ? 'დღიური აგრო-შენიშვნები გაანალიზდა და შეინახა!' : 'Daily agro notes analyzed and saved to engine!');
        } catch (err: any) {
            console.error('Agro notes synthesis error:', err);
            toast.error(isKa ? 'ანალიზის შესრულება ვერ მოხერხდა' : 'Failed to complete analysis');
        } finally {
            setIsAnalyzingNotes(false);
            setStats(getDailyAiUsageStats(currentUser));
            setHistory(getAiQueryHistory());
        }
    };

    // Run Engine Diagnostics
    const handleRunDiagnostics = async () => {
        setIsRunningDiagnostic(true);
        setDiagnosticResult(null);
        try {
            const res = await testGeminiApiKey();
            setDiagnosticResult(res);
            if (res.ok) {
                toast.success(isKa ? 'Gemini AI ღრუბლოვანი ძრავა მუშაობს გამართულად!' : 'Gemini Cloud AI is fully connected & working!');
            } else {
                toast.warning(isKa ? 'Gemini AI იყენებს ლოკალურ GodAI რეჟიმს' : 'Gemini AI is using Local GodAI fallback mode');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Diagnostic error');
        } finally {
            setIsRunningDiagnostic(false);
        }
    };

    // Filtered history list
    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            const matchesSearch = !historySearch || 
                item.prompt.toLowerCase().includes(historySearch.toLowerCase()) || 
                item.response.toLowerCase().includes(historySearch.toLowerCase()) ||
                (item.moduleName && item.moduleName.toLowerCase().includes(historySearch.toLowerCase()));
            
            const matchesSource = historyFilter === 'all' || item.source === historyFilter;
            return matchesSearch && matchesSource;
        });
    }, [history, historySearch, historyFilter]);

    // Daily meter calculations
    const dailyPercent = Math.min(100, Math.round((stats.dailyUsed / Math.max(1, stats.dailyLimit)) * 100));
    const monthlyPercent = Math.min(100, Math.round((stats.monthlyUsed / Math.max(1, stats.monthlyLimit)) * 100));

    return (
        <div className="space-y-6">
            {/* Top Navigation Bar & Title */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-40 bg-gradient-to-bl from-emerald-100/40 via-amber-100/30 to-transparent pointer-events-none rounded-bl-full" />
                
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-emerald-200">
                            <Bot className="w-8 h-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                    {isKa ? 'AI მართვისა და ინტელექტის ცენტრი' : 'AI Intelligence & Control Center'}
                                </h2>
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-wider rounded-full border border-emerald-300">
                                    {isKa ? 'ინტელექტის ლაბორატორია' : 'Labs Intelligence'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                {isKa 
                                    ? 'მარტივი და ბავშვისთვისაც გასაგები კვოტების მონიტორინგი, AI ისტორია, აგრო-რეცეპტები და სწავლება'
                                    : 'Super-simple quota meters, live AI history, agronomic clinical prescriptions, and field notes learning'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Manual Local AI Enable/Disable Button */}
                        <button
                            type="button"
                            onClick={handleToggleLocalAi}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border flex items-center gap-2 cursor-pointer transition-all shadow-xs active:scale-95 ${
                                localAiDisabled
                                    ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            }`}
                            title={isKa 
                                ? (localAiDisabled ? 'ლოკალური AI გათიშულია. მკაცრი Gemini API რეჟიმი' : 'ლოკალური AI ჩართულია (ავტომატური რეზერვი)') 
                                : (localAiDisabled ? 'Local AI is disabled. Strict Gemini API mode' : 'Local AI fallback active')}
                        >
                            <span className={`w-2.5 h-2.5 rounded-full ${localAiDisabled ? 'bg-rose-600 animate-ping' : 'bg-emerald-500'}`} />
                            <span>
                                {isKa
                                    ? (localAiDisabled ? '🔴 Local AI: გათიშულია' : '🟢 Local AI: ჩართულია')
                                    : (localAiDisabled ? '🔴 Local AI: Disabled' : '🟢 Local AI: Enabled')}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => openAiManagementConsole({ tab: 'billing' })}
                            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-200 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                        >
                            <CreditCard className="w-4 h-4" />
                            <span>{isKa ? '💳 შევსება / გამოწერა' : '💳 Top Up / Subscribe'}</span>
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => openAiManagementConsole({ tab: 'diagnostics' })}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider border border-slate-200 flex items-center gap-2 cursor-pointer transition-all"
                        >
                            <Cpu className="w-4 h-4 text-slate-500" />
                            <span>{isKa ? 'მართვის კონსოლი' : 'Console'}</span>
                        </button>
                    </div>
                </div>

                {/* Sub-tabs selector */}
                <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setActiveSection('overview')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                            activeSection === 'overview'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                        }`}
                    >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isKa ? '📊 კვოტები და ბალანსი' : '📊 Quotas & Tokens'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('pricing_regulator')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                            activeSection === 'pricing_regulator'
                                ? 'bg-emerald-700 text-white shadow-xs'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                        }`}
                    >
                        <Calculator className="w-3.5 h-3.5 text-emerald-300" />
                        <span>{isKa ? '💰 ფასწარმოქმნა & მარჟა (0.1 თეთრი)' : '💰 Pricing & Margin (0.1 Tetri)'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('notes_learning')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                            activeSection === 'notes_learning'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                        }`}
                    >
                        <Leaf className="w-3.5 h-3.5 text-emerald-300" />
                        <span>{isKa ? '🌱 დღიური აგრო-შენიშვნების სწავლება' : '🌱 Daily Agro Notes Learning'}</span>
                        {checkedNotes.length > 0 && (
                            <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 text-[10px] font-black rounded-full">
                                {checkedNotes.length}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('history')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                            activeSection === 'history'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5 text-blue-300" />
                        <span>{isKa ? '📜 AI მოთხოვნების ისტორია' : '📜 AI Query History'}</span>
                        <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] font-black rounded-full">
                            {history.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('clinical')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                            activeSection === 'clinical'
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                        }`}
                    >
                        <Microscope className="w-3.5 h-3.5 text-purple-300" />
                        <span>{isKa ? '🔬 აგრო-კლინიკური ანალიზები' : '🔬 Clinical Agro Records'}</span>
                        <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] font-black rounded-full">
                            {clinicalRecords.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('diagnostics')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                            activeSection === 'diagnostics'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                        }`}
                    >
                        <Activity className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isKa ? '⚙️ დიაგნოსტიკა' : '⚙️ Diagnostics'}</span>
                    </button>
                </div>
            </div>

            {/* SECTION 1: OVERVIEW & KIDS-SIMPLE METERS */}
            {activeSection === 'overview' && (
                <div className="space-y-6">
                    {/* 4 Chunky Friendly Cards for 2-year-olds */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. Daily Requests */}
                        <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-5 bg-gradient-to-b from-amber-50/80 to-amber-100/40 rounded-3xl border-2 border-amber-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                                    <span className="text-lg">☀️</span>
                                    <span>{isKa ? 'დღიური მოთხოვნები' : 'Daily Requests'}</span>
                                </span>
                                <span className="px-2 py-0.5 bg-amber-200/70 text-amber-900 text-[10px] font-black rounded-full">
                                    {isKa ? 'დღეს' : 'Today'}
                                </span>
                            </div>

                            <div className="my-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-amber-950 font-mono tracking-tight">
                                        {stats.dailyRemaining}
                                    </span>
                                    <span className="text-xs font-bold text-amber-800">
                                        {isKa ? `დარჩენილია (${stats.dailyUsed}/${stats.dailyLimit} გამოყენებული)` : `left (${stats.dailyUsed}/${stats.dailyLimit} used)`}
                                    </span>
                                </div>

                                {/* Joyful Progress Bar */}
                                <div className="w-full h-3 bg-amber-200/60 rounded-full mt-3 overflow-hidden p-0.5 border border-amber-300/60">
                                    <div 
                                        className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, Math.max(5, (stats.dailyRemaining / Math.max(1, stats.dailyLimit)) * 100))}%` }}
                                    />
                                </div>
                            </div>

                            <p className="text-[11px] text-amber-800/80 font-medium mt-2">
                                {isKa ? 'ყოველ ღამე განახლდება უფასოდ!' : 'Resets every midnight automatically!'}
                            </p>
                        </motion.div>

                        {/* 2. Monthly Requests */}
                        <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className="p-5 bg-gradient-to-b from-blue-50/80 to-blue-100/40 rounded-3xl border-2 border-blue-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                                    <span className="text-lg">📅</span>
                                    <span>{isKa ? 'თვის კვოტა' : 'Monthly Allowance'}</span>
                                </span>
                                <span className="px-2 py-0.5 bg-blue-200/70 text-blue-900 text-[10px] font-black rounded-full">
                                    {isKa ? 'თვიური' : 'Monthly'}
                                </span>
                            </div>

                            <div className="my-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-blue-950 font-mono tracking-tight">
                                        {stats.monthlyRemaining}
                                    </span>
                                    <span className="text-xs font-bold text-blue-800">
                                        {isKa ? `დარჩენილია / ${stats.monthlyLimit}` : `left / ${stats.monthlyLimit}`}
                                    </span>
                                </div>

                                <div className="w-full h-3 bg-blue-200/60 rounded-full mt-3 overflow-hidden p-0.5 border border-blue-300/60">
                                    <div 
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, Math.max(5, (stats.monthlyRemaining / Math.max(1, stats.monthlyLimit)) * 100))}%` }}
                                    />
                                </div>
                            </div>

                            <p className="text-[11px] text-blue-800/80 font-medium mt-2">
                                {isKa ? `${stats.monthlyUsed} მოთხოვნა გამოყენებულია ამ თვეში` : `${stats.monthlyUsed} queries used this month`}
                            </p>
                        </motion.div>

                        {/* 3. Token Credits Balance */}
                        <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-5 bg-gradient-to-b from-emerald-50/80 to-emerald-100/40 rounded-3xl border-2 border-emerald-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                                    <span className="text-lg">⚡</span>
                                    <span>{isKa ? 'ტოკენების ბალანსი' : 'Token Balance'}</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => openAiManagementConsole({ tab: 'billing' })}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-lg shadow-xs cursor-pointer transition-colors"
                                >
                                    + {isKa ? 'შევსება' : 'Top Up'}
                                </button>
                            </div>

                            <div className="my-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-emerald-950 font-mono tracking-tight">
                                        {stats.isUnlimited ? '∞' : stats.tokenCreditsBalance}
                                    </span>
                                    <span className="text-xs font-bold text-emerald-800">
                                        {stats.isUnlimited ? (isKa ? 'ულიმიტო' : 'Unlimited') : (isKa ? 'კრედიტი' : 'Credits')}
                                    </span>
                                </div>

                                <div className="text-[11px] text-emerald-700 font-bold mt-2 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{isKa ? 'არასდროს ეწურება ვადა' : 'Never expires'}</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => openAiManagementConsole({ tab: 'billing' })}
                                className="w-full py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-black text-center mt-2 cursor-pointer transition-colors"
                            >
                                💳 {isKa ? 'ბარათით ყიდვა (100-200₾)' : 'Purchase Tokens (Card)'}
                            </button>
                        </motion.div>

                        {/* 4. Plan & Engine Status */}
                        <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="p-5 bg-gradient-to-b from-purple-50/80 to-purple-100/40 rounded-3xl border-2 border-purple-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                                    <span className="text-lg">👑</span>
                                    <span>{isKa ? 'გამოწერის სტატუსი' : 'Subscription'}</span>
                                </span>
                                <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${
                                    stats.isUnlimited ? 'bg-purple-600 text-white' : 'bg-purple-200 text-purple-900'
                                }`}>
                                    {stats.isUnlimited ? 'VIP' : 'PRO'}
                                </span>
                            </div>

                            <div className="my-2">
                                <div className="text-lg font-black text-purple-950">
                                    {stats.isUnlimited 
                                        ? (isKa ? 'ულიმიტო პრემიუმ AI' : 'Premium Unlimited') 
                                        : (isKa ? 'სტანდარტული ფერმა' : 'Standard Farm Tier')}
                                </div>
                                <div className="text-xs text-purple-700 font-medium mt-1">
                                    {isKa ? 'ყველა მოდული: აგრონომია, მოსავალი, ხმა' : 'All 8 agricultural AI modules included'}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => openAiManagementConsole({ tab: 'billing' })}
                                className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black text-center mt-2 cursor-pointer transition-colors shadow-xs"
                            >
                                ⭐ {isKa ? 'ულიმიტო გამოწერა (300₾/თვე)' : 'Unlimited (300₾/mo)'}
                            </button>
                        </motion.div>
                    </div>

                    {/* Engine Health Banner with Local AI explanation */}
                    <div className="p-5 bg-amber-50/80 border-2 border-amber-200 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 border border-amber-300">
                                <AlertTriangle className="w-5 h-5 text-amber-700" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-black text-amber-950">
                                        {isKa ? 'როდის და რატომ პასუხობს ლოკალური AI (AI Local)?' : 'When & Why does Local AI answer?'}
                                    </h4>
                                    <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-black rounded-full">
                                        GodAI Engine
                                    </span>
                                </div>
                                <p className="text-xs text-amber-900/80 font-medium mt-1 leading-relaxed">
                                    {isKa
                                        ? 'თუ თქვენი პასუხი ყვითელია და აწერია "AI Local", ეს ნიშნავს რომ ღრუბლოვან Gemini-ზე ამოიწურა კრედიტები ($0 prepayment), მიაღწიეთ ლიმიტს, ან ინტერნეტი გაითიშა. სისტემა ავტომატურად გადაერთო ადგილობრივ აგრო-ბაზაზე, რათა ფერმა არასდროს გაჩერდეს!'
                                        : 'If an answer appears yellow with "AI Local", cloud Gemini credits are depleted ($0 prepayment), quota is reached, or connection is offline. Agrimap automatically switches to Local GodAI so your farm never stops!'}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => openAiManagementConsole({ tab: 'diagnostics' })}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                        >
                            <span>⚡ {isKa ? 'დიაგნოსტიკის გახსნა' : 'Run Diagnostics'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Quick Access to the other 3 sections */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div 
                            onClick={() => setActiveSection('notes_learning')}
                            className="p-5 bg-white rounded-3xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <Leaf className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-black text-slate-900">
                                {isKa ? 'დღიური აგრო-შენიშვნების სწავლება' : 'Daily Agro Notes Learning'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                                {isKa ? `${checkedNotes.length} შენიშვნა მონიშნულია გასაანალიზებლად` : `${checkedNotes.length} notes checked for AI synthesis`}
                            </p>
                        </div>

                        <div 
                            onClick={() => setActiveSection('history')}
                            className="p-5 bg-white rounded-3xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Clock className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-black text-slate-900">
                                {isKa ? 'AI მოთხოვნებისა და ტოკენების ისტორია' : 'AI Query & Token History'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                                {isKa ? `${history.length} შენახული მოთხოვნა და პასუხი` : `${history.length} saved AI interactions`}
                            </p>
                        </div>

                        <div 
                            onClick={() => setActiveSection('clinical')}
                            className="p-5 bg-white rounded-3xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <Microscope className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-black text-slate-900">
                                {isKa ? 'აგრო-კლინიკური რეცეპტები და ანალიზები' : 'Agronomic Clinical Records'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                                {isKa ? `${clinicalRecords.length} გაანალიზებული დაავადება/ფოტო` : `${clinicalRecords.length} plant pathology analyses`}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION: AI PRICING & MARGIN REGULATOR (0.1 TETRI COST BREAKDOWN) */}
            {activeSection === 'pricing_regulator' && (
                <div className="space-y-6">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 rounded-3xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="space-y-2 max-w-2xl">
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-[11px] font-black uppercase tracking-wider rounded-full border border-emerald-500/30">
                                        {isKa ? '⚡ 0.1 თეთრი / მოთხოვნა' : '⚡ 0.1 Tetri / Request'}
                                    </span>
                                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-[11px] font-black uppercase tracking-wider rounded-full border border-amber-500/30">
                                        {isKa ? 'Google Gemini 2.5/3.8 Flash' : 'Google Gemini 2.5/3.8 Flash'}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black tracking-tight text-white">
                                    {isKa ? 'AI ფასწარმოქმნის, თვითღირებულებისა და მოგების მარჟის რეგულატორი' : 'AI Pricing, Wholesale Cost & Profit Margin Regulator'}
                                </h3>
                                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                    {isKa 
                                        ? 'ზუსტი ეკონომიკური გათვლა: 1 აგრო-ანალიზი Google-ში ღირს ~0.1 თეთრი ($0.00035 USD). როდესაც მომხმარებელი გიხდით 300₾-ს ულიმიტო პაკეტში, თქვენ Google-ს უხდით მხოლოდ 2.50₾-3₾-ს თვეში, რაც გაძლევთ 99%-იან წმინდა მოგებას!' 
                                        : 'Exact wholesale economics: 1 agro query costs ~0.1 tetri ($0.00035 USD) with Google. When a client pays 300 GEL for unlimited AI, you pay Google only 2.50-3.00 GEL/mo, leaving you with a 99% net profit margin!'}
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={handleToggleLocalAi}
                                    className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider border flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 ${
                                        localAiDisabled
                                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30'
                                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                                    }`}
                                >
                                    <span className={`w-2.5 h-2.5 rounded-full ${localAiDisabled ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                                    <span>
                                        {isKa 
                                            ? (localAiDisabled ? '🔴 Local AI: გათიშულია' : '🟢 Local AI: ჩართულია')
                                            : (localAiDisabled ? '🔴 Local AI: Disabled' : '🟢 Local AI: Enabled')}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* The 2 Core Business Models */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Model 1: 300 GEL Unlimited Plan */}
                        <div className="p-6 bg-white rounded-3xl border-2 border-emerald-300/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-900 text-xs font-black rounded-full uppercase tracking-wider">
                                        {isKa ? '👑 300 ₾ ულიმიტო პაკეტი' : '👑 300 GEL Unlimited Plan'}
                                    </span>
                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                        {isKa ? 'მარჟა: 99%' : 'Margin: 99%'}
                                    </span>
                                </div>

                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-slate-900 font-mono">300.00 ₾</span>
                                        <span className="text-xs text-slate-500 font-bold">{isKa ? '/ თვეში მომხმარებლისგან' : '/ mo from customer'}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                                        {isKa 
                                            ? 'ფერმის აგრონომი საშუალოდ აკეთებს 2,000-3,000 მოთხოვნას/თვეში (ფოთლების სკანირება, შესყიდვები, ამინდი, ასისტენტი).' 
                                            : 'An active farm agronomist averages 2,000-3,000 queries/month (leaf diagnostics, purchase orders, weather, copilot).'}
                                    </p>
                                </div>

                                <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600">{isKa ? 'მომხმარებლის გადახდილი თანხა:' : 'Customer Pays:'}</span>
                                        <span className="font-black text-slate-900 font-mono">+300.00 ₾</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600">{isKa ? 'თქვენი ხარჯი Google API-ზე (3,000 × 0.1 თეთრი):' : 'Wholesale to Google (3,000 × 0.1 tetri):'}</span>
                                        <span className="font-black text-rose-600 font-mono">-3.00 ₾</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                                        <span className="font-black text-emerald-950">{isKa ? 'თქვენი წმინდა მოგება:' : 'Your Net Profit:'}</span>
                                        <span className="font-black text-emerald-700 font-mono">+297.00 ₾ / თვე</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[11px] text-slate-400 font-medium mt-4">
                                {isKa 
                                    ? '* თუნდაც მომხმარებელმა გააკეთოს 10,000 მოთხოვნა, Google-ის ხარჯი არის მხოლოდ 10 ₾, მოგება კი 290 ₾!' 
                                    : '* Even at 10,000 queries, Google cost is only 10 GEL, leaving 290 GEL profit!'}
                            </p>
                        </div>

                        {/* Model 2: 1 GEL Pay-as-you-go Pack */}
                        <div className="p-6 bg-white rounded-3xl border-2 border-blue-300/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="px-3 py-1 bg-blue-100 text-blue-900 text-xs font-black rounded-full uppercase tracking-wider">
                                        {isKa ? '🪙 1 ₾ მიკრო პაკეტი (100 მოთხოვნა)' : '🪙 1 GEL Micro Pack (100 Queries)'}
                                    </span>
                                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                                        {isKa ? 'მარჟა: 90%' : 'Margin: 90%'}
                                    </span>
                                </div>

                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-slate-900 font-mono">1.00 ₾</span>
                                        <span className="text-xs text-slate-500 font-bold">{isKa ? '= 100 თეთრი მომხმარებლისგან' : '= 100 tetri from customer'}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                                        {isKa 
                                            ? 'მომხმარებელი ყიდულობს 1 ლარად 100 AI მოთხოვნას. თითოეული მოთხოვნა ჯდება ზუსტად 0.1 თეთრი.' 
                                            : 'The customer pays 1 GEL for 100 AI queries. Each query costs exactly 0.1 tetri in wholesale Gemini API.'}
                                    </p>
                                </div>

                                <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600">{isKa ? 'მომხმარებლის გადახდილი თანხა:' : 'Customer Pays:'}</span>
                                        <span className="font-black text-slate-900 font-mono">+1.00 ₾ (100 თეთრი)</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600">{isKa ? 'თქვენი ხარჯი Google API-ზე (100 × 0.1 თეთრი):' : 'Wholesale to Google (100 × 0.1 tetri):'}</span>
                                        <span className="font-black text-rose-600 font-mono">-0.10 ₾ (10 თეთრი)</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                                        <span className="font-black text-blue-950">{isKa ? 'თქვენი წმინდა მოგება:' : 'Your Net Profit:'}</span>
                                        <span className="font-black text-blue-700 font-mono">+0.90 ₾ (90 თეთრი)</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[11px] text-slate-400 font-medium mt-4">
                                {isKa 
                                    ? '* 1 ლარიდან თქვენი წმინდა მოგება არის 90 თეთრი (90% მოგება)!' 
                                    : '* From 1 GEL you retain 90 tetri net profit (90% gross margin)!'}
                            </p>
                        </div>
                    </div>

                    {/* Interactive Live Profit Calculator */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    <Calculator className="w-5 h-5 text-emerald-600" />
                                    <span>{isKa ? 'ინტერაქტიული მოგებისა და ხარჯების სიმულატორი' : 'Interactive Profit & Breakeven Simulator'}</span>
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {isKa ? 'შეცვალეთ პარამეტრები და ნახეთ თქვენი თვიური შემოსავალი და Google-ის ხარჯი' : 'Adjust subscribers and query volume to see your monthly net profit'}
                                </p>
                            </div>
                            <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-mono font-bold rounded-xl">
                                Base Rate: 0.1 tetri / query
                            </span>
                        </div>

                        {/* Sliders */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                            {/* Slider 1: 300 GEL Subscribers */}
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-700">
                                        {isKa ? '👑 300 ₾ გამომწერი ფერმები:' : '👑 300 GEL Subscribers:'}
                                    </label>
                                    <span className="text-sm font-black text-emerald-700 font-mono">{simFarmsCount}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={simFarmsCount}
                                    onChange={e => setSimFarmsCount(Number(e.target.value))}
                                    className="w-full accent-emerald-600 cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                    <span>0 ფერმა</span>
                                    <span>50</span>
                                    <span>100 ფერმა</span>
                                </div>
                            </div>

                            {/* Slider 2: Average Queries per farm */}
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-700">
                                        {isKa ? '⚡ მოთხოვნა/თვეში თითო ფერმაზე:' : '⚡ Queries/mo per Farm:'}
                                    </label>
                                    <span className="text-sm font-black text-blue-700 font-mono">{simQueriesPerFarm}</span>
                                </div>
                                <input
                                    type="range"
                                    min="500"
                                    max="10000"
                                    step="250"
                                    value={simQueriesPerFarm}
                                    onChange={e => setSimQueriesPerFarm(Number(e.target.value))}
                                    className="w-full accent-blue-600 cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                    <span>500</span>
                                    <span>5,000</span>
                                    <span>10,000</span>
                                </div>
                            </div>

                            {/* Slider 3: 1 GEL packs sold */}
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-700">
                                        {isKa ? '🪙 1 ₾ მიკრო-პაკეტების გაყიდვა:' : '🪙 1 GEL Packs Sold:'}
                                    </label>
                                    <span className="text-sm font-black text-amber-700 font-mono">{simOneGelPacksSold}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="500"
                                    step="10"
                                    value={simOneGelPacksSold}
                                    onChange={e => setSimOneGelPacksSold(Number(e.target.value))}
                                    className="w-full accent-amber-600 cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                    <span>0</span>
                                    <span>250</span>
                                    <span>500</span>
                                </div>
                            </div>
                        </div>

                        {/* Calculated Simulator Results */}
                        {(() => {
                            const totalRevFromSubs = simFarmsCount * 300;
                            const totalRevFromPacks = simOneGelPacksSold * 1.0;
                            const totalRevenue = totalRevFromSubs + totalRevFromPacks;

                            const totalSubQueries = simFarmsCount * simQueriesPerFarm;
                            const totalPackQueries = simOneGelPacksSold * 100;
                            const totalQueries = totalSubQueries + totalPackQueries;

                            // 0.1 tetri = 0.001 GEL
                            const totalGoogleCost = Number((totalQueries * 0.001).toFixed(2));
                            const netProfit = Number((totalRevenue - totalGoogleCost).toFixed(2));
                            const marginPct = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

                            return (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                                        <span className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                                            {isKa ? 'თვიური შემოსავალი' : 'Gross Monthly Revenue'}
                                        </span>
                                        <span className="text-2xl font-black text-slate-900 font-mono">
                                            {totalRevenue.toLocaleString()} ₾
                                        </span>
                                        <span className="text-[10px] text-slate-400 block mt-1">
                                            {totalQueries.toLocaleString()} {isKa ? 'სულ მოთხოვნა' : 'total queries'}
                                        </span>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
                                        <span className="text-[11px] font-black uppercase text-rose-800 block mb-1">
                                            {isKa ? 'ხარჯი Google-ზე (0.1 თეთრი)' : 'Google API Bill (0.1 tetri)'}
                                        </span>
                                        <span className="text-2xl font-black text-rose-700 font-mono">
                                            -{totalGoogleCost.toLocaleString()} ₾
                                        </span>
                                        <span className="text-[10px] text-rose-600/80 block mt-1">
                                            {isKa ? 'საბითუმო თვითღირებულება' : 'Wholesale cost'}
                                        </span>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300">
                                        <span className="text-[11px] font-black uppercase text-emerald-800 block mb-1">
                                            {isKa ? 'თქვენი წმინდა მოგება' : 'Net Monthly Profit'}
                                        </span>
                                        <span className="text-2xl font-black text-emerald-800 font-mono">
                                            +{netProfit.toLocaleString()} ₾
                                        </span>
                                        <span className="text-[10px] text-emerald-700 block mt-1">
                                            {isKa ? 'რჩება თქვენს ანგარიშზე' : 'Retained in your pocket'}
                                        </span>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                                        <span className="text-[11px] font-black uppercase text-blue-800 block mb-1">
                                            {isKa ? 'მოგების მარჟა' : 'Profit Margin'}
                                        </span>
                                        <span className="text-2xl font-black text-blue-800 font-mono">
                                            {marginPct}%
                                        </span>
                                        <span className="text-[10px] text-blue-600 block mt-1">
                                            {isKa ? 'სუპერ-მაღალი რენტაბელობა' : 'Ultra-high SaaS margin'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Gemini API Key Direct Configuration */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    <Key className="w-5 h-5 text-amber-500" />
                                    <span>{isKa ? 'Google Gemini API გასაღების კონფიგურაცია' : 'Google Gemini API Key Setup'}</span>
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {isKa ? 'შეიყვანეთ თქვენი საკუთარი Gemini API Key ყველა AI ხელსაწყოს პირდაპირი მუშაობისთვის' : 'Enter your custom Gemini API key to power all platform AI tools with live cloud intelligence'}
                                </p>
                            </div>
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
                            >
                                <span>{isKa ? 'გასაღების აღება Google AI Studio-ში' : 'Get Key from Google AI Studio'}</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                            <input
                                type="password"
                                value={geminiApiKeyInput}
                                onChange={e => setGeminiApiKeyInput(e.target.value)}
                                placeholder="AIzaSy..."
                                className="flex-grow px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <button
                                type="button"
                                disabled={isSavingKey}
                                onClick={handleSaveGeminiKey}
                                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 disabled:opacity-50"
                            >
                                {isSavingKey ? (isKa ? 'ინახება...' : 'Saving...') : (isKa ? 'გასაღების შენახვა' : 'Save Key')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 2: DAILY AGRO NOTES AI LEARNING */}
            {activeSection === 'notes_learning' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black text-slate-900">
                                        🌱 {isKa ? 'დღიური აგრო-შენიშვნების AI სინთეზი და სწავლება' : 'Daily Agro Notes AI Synthesis & Learning'}
                                    </h3>
                                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                                        {checkedNotes.length} {isKa ? 'მონიშნული' : 'Checked'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    {isKa 
                                        ? 'მონიშნეთ საველე ან ხმოვანი შენიშვნები, რათა AI-მ შეაჯამოს დღის აგრონომიული მდგომარეობა და ისწავლოს მომავლისთვის'
                                        : 'Mark field & voice notes to run batch AI agronomic synthesis and train future local domain rules'}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setFilterOnlyCheckedNotes(prev => !prev)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                        filterOnlyCheckedNotes
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                            : 'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}
                                >
                                    {filterOnlyCheckedNotes 
                                        ? (isKa ? '✓ მხოლოდ მონიშნულები' : '✓ Only Checked Notes')
                                        : (isKa ? 'ყველა შენიშვნა' : 'All Notes')}
                                </button>

                                <button
                                    type="button"
                                    disabled={checkedNotes.length === 0 || isAnalyzingNotes}
                                    onClick={handleRunDailyAgroNotesSynthesis}
                                    className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                                        checkedNotes.length === 0 || isAnalyzingNotes
                                            ? 'bg-slate-300 shadow-none cursor-not-allowed'
                                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                                    }`}
                                >
                                    {isAnalyzingNotes ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white" />
                                            <span>{isKa ? 'ანალიზი მიმდინარეობს...' : 'Analyzing with AI...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            <span>{isKa ? '🚀 AI ანალიზის გაშვება' : '🚀 Run Daily Agro AI'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Synthesis Report Display if available */}
                        {dailySynthesisReport && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mb-6 p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50/40 rounded-3xl border-2 border-emerald-300 shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                                            🧠
                                        </span>
                                        <div>
                                            <h4 className="text-sm font-black text-emerald-950">
                                                {isKa ? 'დღიური აგრონომიული AI ანგარიში' : 'Daily Agronomic AI Synthesis Report'}
                                            </h4>
                                            <span className="text-[10px] text-emerald-700 font-medium">
                                                {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(dailySynthesisReport, 'report')}
                                        className="px-3 py-1.5 bg-white text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                    >
                                        {copiedId === 'report' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedId === 'report' ? (isKa ? 'დაკოპირდა' : 'Copied') : (isKa ? 'კოპირება' : 'Copy')}</span>
                                    </button>
                                </div>

                                <div className="p-4 bg-white/90 rounded-2xl border border-emerald-200/80 text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                                    {dailySynthesisReport}
                                </div>
                            </motion.div>
                        )}

                        {/* List of notes with checkboxes */}
                        {displayedNotes.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <Leaf className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-bold text-slate-600">
                                    {isKa ? 'შენიშვნები არ მოიძებნა' : 'No notes found'}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {isKa 
                                        ? 'შექმენით შენიშვნა ან ხმოვანი ჩანაწერი და მონიშნეთ "დღიური აგრო-ანალიზი"'
                                        : 'Create a field or voice note and check "Daily Agro Analysis"'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {displayedNotes.map(note => {
                                    const isChecked = Boolean(note.dailyAgroAnalysis);
                                    return (
                                        <div
                                            key={note.id}
                                            className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                                                isChecked
                                                    ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3 flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleToggleNoteCheck(note)}
                                                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 mt-0.5"
                                                />
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                                                            {note.moduleName || 'Field'}
                                                        </span>
                                                        <span className="text-[11px] font-bold text-slate-500">
                                                            {new Date(note.timestamp).toLocaleDateString()} {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400">
                                                            • {note.authorName}
                                                        </span>
                                                        {note.aiAnalyzedAt && (
                                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-full border border-amber-300 flex items-center gap-1">
                                                                🧠 {isKa ? 'AI გაანალიზებული' : 'AI Analyzed'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                                                        "{note.content}"
                                                    </p>

                                                    {note.aiAgroInsights && (
                                                        <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 mt-1">
                                                            <strong>AI Insight:</strong> {note.aiAgroInsights}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleToggleNoteCheck(note)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                                                    isChecked
                                                        ? 'bg-emerald-600 text-white border-emerald-700'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                {isChecked ? (isKa ? '✓ მონიშნულია' : '✓ Checked') : (isKa ? '+ მონიშვნა' : '+ Check')}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SECTION 3: AI QUERY & TOKEN HISTORY */}
            {activeSection === 'history' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">
                                    📜 {isKa ? 'AI მოთხოვნებისა და პასუხების სრული ისტორია' : 'AI Query & Token History'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    {isKa 
                                        ? 'ყველა შესრულებული მოთხოვნა, პასუხი, დახარჯული კრედიტები და AI-ს წყარო'
                                        : 'Every AI call recorded with spent tokens, remaining quota, prompt & response'}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="relative">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={historySearch}
                                        onChange={(e) => setHistorySearch(e.target.value)}
                                        placeholder={isKa ? 'ძიება ისტორიაში...' : 'Search queries...'}
                                        className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-60"
                                    />
                                </div>

                                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                                    <button
                                        type="button"
                                        onClick={() => setHistoryFilter('all')}
                                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                            historyFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                                        }`}
                                    >
                                        {isKa ? 'ყველა' : 'All'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setHistoryFilter('cloud')}
                                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                            historyFilter === 'cloud' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
                                        }`}
                                    >
                                        Cloud AI
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setHistoryFilter('local')}
                                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                            historyFilter === 'local' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-600'
                                        }`}
                                    >
                                        Local AI
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        clearAiQueryHistory();
                                        setHistory([]);
                                        toast.success(isKa ? 'ისტორია გასუფთავდა' : 'History cleared');
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                                    title={isKa ? 'ისტორიის გასუფთავება' : 'Clear History'}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {filteredHistory.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-bold text-slate-600">
                                    {isKa ? 'ისტორია ცარიელია' : 'No query records found'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredHistory.map(item => {
                                    const isLocal = item.source === 'local';
                                    return (
                                        <div
                                            key={item.id}
                                            className={`p-4 rounded-2xl border transition-all ${
                                                isLocal 
                                                    ? 'bg-amber-50/50 border-amber-200/80 shadow-2xs' 
                                                    : 'bg-white border-slate-200 shadow-2xs hover:shadow-xs'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <AiSourceBadge 
                                                        source={item.source}
                                                        reason={item.fallbackReason}
                                                        modelUsed={item.modelUsed}
                                                        isKa={isKa}
                                                    />

                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                                                        {item.moduleName || 'General'}
                                                    </span>

                                                    <span className="text-[11px] text-slate-500 font-medium">
                                                        {item.formattedDate}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                                        isLocal 
                                                            ? 'bg-amber-200 text-amber-900' 
                                                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                                    }`}>
                                                        {item.tokensOrCreditsSpent > 0 
                                                            ? `⚡ -${item.tokensOrCreditsSpent} Token` 
                                                            : (isKa ? '🟡 0 Token (უფასო)' : '🟡 0 Token (Free Local)')}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(item.response, item.id)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                        title={isKa ? 'პასუხის კოპირება' : 'Copy Response'}
                                                    >
                                                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Prompt */}
                                            <div className="mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    {isKa ? 'მოთხოვნა / Prompt:' : 'Prompt:'}
                                                </span>
                                                <p className="text-xs font-semibold text-slate-800 mt-0.5">
                                                    {item.prompt}
                                                </p>
                                            </div>

                                            {/* Response */}
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                                                {item.response}
                                            </div>

                                            {/* Fallback reason if any */}
                                            {item.fallbackReason && (
                                                <div className="mt-2 text-[10px] text-amber-800 font-bold flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                                    <span>{item.fallbackReason}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SECTION 4: AGRONOMIC CLINICAL RECORDS & PRESCRIPTIONS */}
            {activeSection === 'clinical' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">
                                    🔬 {isKa ? 'აგრონომიული კლინიკური ანალიზები და რეცეპტები' : 'Agronomic Clinical Records & Prescriptions'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    {isKa 
                                        ? 'AI-ით გაანალიზებული მცენარეთა დაავადებები, ნიადაგის ანალიზები და მთავარი აგრონომის რეცეპტები'
                                        : 'All AI-analyzed plant diseases, soil profiles, and certified agronomist chemical/organic prescriptions'}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                                    <button
                                        type="button"
                                        onClick={() => setClinicalFilter('all')}
                                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                            clinicalFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                                        }`}
                                    >
                                        {isKa ? 'ყველა' : 'All'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setClinicalFilter('disease')}
                                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                            clinicalFilter === 'disease' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
                                        }`}
                                    >
                                        {isKa ? 'დაავადებები' : 'Diseases'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setClinicalFilter('soil')}
                                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                            clinicalFilter === 'soil' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-600'
                                        }`}
                                    >
                                        {isKa ? 'ნიადაგი' : 'Soil'}
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent('agrimap:open_harvest_ai_modal', { detail: { mode: 'disease' } }));
                                        toast.info(isKa ? 'იხსნება მცენარის სკანერი...' : 'Opening Plant Disease Scanner...');
                                    }}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>{isKa ? '+ ახალი სკანირება' : '+ New Scan'}</span>
                                </button>
                            </div>
                        </div>

                        {clinicalLoading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto" />
                            </div>
                        ) : clinicalRecords.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <Microscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-bold text-slate-600">
                                    {isKa ? 'კლინიკური ჩანაწერები არ მოიძებნა' : 'No clinical records found'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {clinicalRecords
                                    .filter(r => clinicalFilter === 'all' || r.type === clinicalFilter)
                                    .map(rec => {
                                        const conclusion = rec.agronomistConclusion;
                                        return (
                                            <div
                                                key={rec.id}
                                                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div>
                                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider rounded-md">
                                                                {rec.type.toUpperCase()}
                                                            </span>
                                                            <h4 className="text-base font-black text-slate-900 mt-1">
                                                                {rec.title}
                                                            </h4>
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                {new Date(rec.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>

                                                        {conclusion?.severity && (
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                                                                conclusion.severity === 'Critical' ? 'bg-red-100 text-red-800 border border-red-300' :
                                                                conclusion.severity === 'Severe' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                                                                'bg-amber-100 text-amber-800 border border-amber-300'
                                                            }`}>
                                                                {conclusion.severity}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* AI Raw Description */}
                                                    {rec.rawAiResult?.description && (
                                                        <p className="text-xs text-slate-600 leading-relaxed mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                            {rec.rawAiResult.description}
                                                        </p>
                                                    )}

                                                    {/* Agronomist Prescription Box */}
                                                    {conclusion && (
                                                        <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-2 mb-3">
                                                            <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                                                                <span>👨‍🌾 {conclusion.authorName} ({conclusion.authorRole})</span>
                                                                {conclusion.isVerified && (
                                                                    <span className="text-[10px] text-emerald-700 bg-emerald-200/80 px-2 py-0.5 rounded-full font-black">
                                                                        {isKa ? '✓ დამოწმებული' : '✓ Certified'}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {conclusion.prescribedTreatment && (
                                                                <div className="text-xs text-slate-800">
                                                                    <strong className="text-emerald-900">{isKa ? 'სამკურნალო სქემა: ' : 'Treatment: '}</strong>
                                                                    {conclusion.prescribedTreatment}
                                                                </div>
                                                            )}

                                                            {conclusion.recommendedDosage && (
                                                                <div className="text-xs text-slate-800">
                                                                    <strong className="text-emerald-900">{isKa ? 'დოზირება: ' : 'Dosage: '}</strong>
                                                                    <span className="font-bold text-emerald-800">{conclusion.recommendedDosage}</span>
                                                                </div>
                                                            )}

                                                            {conclusion.prescribedNutrition && (
                                                                <div className="text-xs text-slate-800">
                                                                    <strong className="text-emerald-900">{isKa ? 'კვება / სასუქი: ' : 'Nutrition: '}</strong>
                                                                    {conclusion.prescribedNutrition}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* AI Learned Insights */}
                                                    {rec.aiLearnedInsights && (
                                                        <div className="text-[11px] text-slate-500 font-medium italic border-t border-slate-100 pt-2">
                                                            🧠 {rec.aiLearnedInsights}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between text-[11px] text-slate-400">
                                                    <span>ID: {rec.id}</span>
                                                    <span className="text-purple-700 font-bold">Agrimap Clinical Registry</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SECTION 5: DIAGNOSTICS & SETTINGS */}
            {activeSection === 'diagnostics' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">
                                    ⚙️ {isKa ? 'AI სისტემური დიაგნოსტიკა და შემოწმება' : 'AI System Diagnostics & Engine Verification'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    {isKa 
                                        ? 'შეამოწმეთ პირდაპირი კავშირი Google Gemini-სთან და გაიგეთ რატომ პასუხობს ლოკალური AI'
                                        : 'Verify live latency to Google Gemini and diagnose any API prepayment/quota errors'}
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={isRunningDiagnostic}
                                onClick={handleRunDiagnostics}
                                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-amber-200 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isRunningDiagnostic ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white" />
                                        <span>{isKa ? 'მოწმდება...' : 'Testing...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Activity className="w-4 h-4" />
                                        <span>{isKa ? 'ტესტირება ახლავე' : 'Test Engine Now'}</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Diagnostic results card */}
                        {diagnosticResult && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-5 rounded-2xl border-2 mb-6 ${
                                    diagnosticResult.ok 
                                        ? 'bg-emerald-50 border-emerald-300' 
                                        : 'bg-amber-50 border-amber-300'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {diagnosticResult.ok ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        ) : (
                                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                                        )}
                                        <span className="text-sm font-black text-slate-900">
                                            {diagnosticResult.title || (diagnosticResult.ok ? 'Connection Successful' : 'Notice: Using Local Fallback')}
                                        </span>
                                    </div>
                                    {diagnosticResult.latencyMs && (
                                        <span className="text-xs font-mono font-bold text-slate-600">
                                            {diagnosticResult.latencyMs}ms
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs font-medium text-slate-700 leading-relaxed">
                                    {diagnosticResult.message}
                                </p>
                            </motion.div>
                        )}

                        {/* Gemini Key Config Card */}
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 mb-6 space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <Key className="w-4 h-4 text-amber-500" />
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                                        {isKa ? 'Gemini API გასაღების მართვა' : 'Gemini API Key Management'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${
                                        localAiDisabled ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    }`}>
                                        {localAiDisabled ? 'Local AI Disabled' : 'Local AI Enabled'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleToggleLocalAi}
                                        className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                                    >
                                        {localAiDisabled ? (isKa ? 'ჩართვა' : 'Enable') : (isKa ? 'გათიშვა' : 'Disable')}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                <input
                                    type="password"
                                    value={geminiApiKeyInput}
                                    onChange={e => setGeminiApiKeyInput(e.target.value)}
                                    placeholder="AIzaSy..."
                                    className="flex-grow px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                    type="button"
                                    disabled={isSavingKey}
                                    onClick={handleSaveGeminiKey}
                                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 disabled:opacity-50"
                                >
                                    {isSavingKey ? (isKa ? 'ინახება...' : 'Saving...') : (isKa ? 'შენახვა' : 'Save')}
                                </button>
                            </div>
                        </div>

                        {/* Subscription plans preview */}
                        <div className="pt-4 border-t border-slate-100">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-4">
                                {isKa ? 'ხელმისაწვდომი ტოკენებისა და გამოწერის პაკეტები:' : 'Available AI Plans & Token Packs:'}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {AI_SUBSCRIPTION_PLANS.map(plan => (
                                    <div 
                                        key={plan.id}
                                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-black text-slate-900">{plan.name}</span>
                                                <span className="text-sm font-black text-emerald-700">{plan.priceGel} ₾</span>
                                            </div>
                                            <p className="text-[11px] text-slate-500">{plan.description}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => openAiManagementConsole({ tab: 'billing' })}
                                            className="w-full py-1.5 mt-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer text-center"
                                        >
                                            {isKa ? 'გამოწერა' : 'Subscribe'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
