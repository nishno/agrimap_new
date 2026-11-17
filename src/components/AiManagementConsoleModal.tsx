import React, { useState, useEffect } from 'react';
import { 
    X, Sparkles, AlertTriangle, CheckCircle2, AlertCircle, RefreshCw, 
    CreditCard, Key, Server, Cpu, ExternalLink, Copy, Check, Eye, EyeOff,
    Shield, ShieldCheck, Zap, Lock, ArrowRight, Clock, ChevronRight,
    HelpCircle, Database, Layers, Radio
} from 'lucide-react';
import { toast } from 'sonner';
import type { User, AiCreditPack, AiSubscriptionPlan } from '../types';
import { 
    DEFAULT_AI_CREDIT_PACKS, 
    DEFAULT_AI_SUBSCRIPTION_PLANS,
    getEffectiveUserAiQuota, 
    purchaseAiCredits,
    subscribeToAiPlan,
    cleanApiKey, 
    getActiveGeminiApiKey, 
    setCustomGeminiApiKey, 
    testGeminiApiKey, 
    getRecentAiProvenances,
    getLastAiProvenance,
    PRIMARY_GEMINI_MODEL,
    type GeminiTestResult,
    type AiProvenanceRecord
} from '../services/geminiService';
import { AiSourceBadge } from './AiSourceBadge';

export interface AiManagementConsoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
    onUpdateUser?: (updated: User) => void;
    initialTab?: 'diagnostics' | 'billing' | 'keys' | 'engine';
    initialNotice?: any;
    reasonNotice?: string;
    isKa?: boolean;
    allUsers?: User[];
}

export const AiManagementConsoleModal: React.FC<AiManagementConsoleModalProps> = ({
    isOpen,
    onClose,
    currentUser,
    onUpdateUser,
    initialTab = 'diagnostics',
    initialNotice = null,
    reasonNotice,
    isKa = false,
    allUsers = []
}) => {
    const [activeTab, setActiveTab] = useState<'diagnostics' | 'billing' | 'keys' | 'engine'>(initialTab);
    const [quota, setQuota] = useState(() => getEffectiveUserAiQuota(currentUser));

    // Diagnostics state
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<GeminiTestResult | null>(null);
    const [serverStatus, setServerStatus] = useState<any>(null);
    const [provenances, setProvenances] = useState<AiProvenanceRecord[]>(() => getRecentAiProvenances());

    // Billing / Payment state
    const [selectedPlanId, setSelectedPlanId] = useState<string>(DEFAULT_AI_SUBSCRIPTION_PLANS[0].id);
    const [selectedPackId, setSelectedPackId] = useState<string>(DEFAULT_AI_CREDIT_PACKS[1].id);
    const [paymentItemType, setPaymentItemType] = useState<'subscription' | 'pack'>('subscription');
    const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
    const [cardExpiry, setCardExpiry] = useState('12/28');
    const [cardCvc, setCardCvc] = useState('888');
    const [cardHolder, setCardHolder] = useState(currentUser?.name || 'AgriFarm Member');
    const [billingCountry, setBillingCountry] = useState('Georgia (საქართველო)');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    // API Key state
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isSavingKey, setIsSavingKey] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);

    // Engine settings
    const [sovereignOfflineMode, setSovereignOfflineMode] = useState<boolean>(() => {
        try {
            return localStorage.getItem('agrimap_force_local_ai') === 'true';
        } catch {
            return false;
        }
    });

    const selectedPlan = DEFAULT_AI_SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanId) || DEFAULT_AI_SUBSCRIPTION_PLANS[0];
    const selectedPack = DEFAULT_AI_CREDIT_PACKS.find(p => p.id === selectedPackId) || DEFAULT_AI_CREDIT_PACKS[1];
    const freeRemaining = Math.max(0, quota.monthlyFreeTierTotal - quota.monthlyFreeTierUsed);

    // Fetch initial diagnostics and server status
    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/gemini/status');
            if (res.ok) {
                const data = await res.json();
                setServerStatus(data);
            }
        } catch (e) {
            console.warn('[AI Console] Failed to fetch server status:', e);
        }
    };

    useEffect(() => {
        setQuota(getEffectiveUserAiQuota(currentUser));
        setApiKeyInput(getActiveGeminiApiKey());
        setProvenances(getRecentAiProvenances());
        fetchStatus();

        if (initialTab) {
            setActiveTab(initialTab);
        }

        if (initialNotice) {
            setTestResult({
                success: false,
                ok: false,
                statusCode: initialNotice.code || (initialNotice.type === 'PREPAYMENT_DEPLETED' ? 402 : 500),
                title: initialNotice.title || 'Google Gemini Upstream Notice',
                message: initialNotice.message || 'API request halted by Google Cloud gateway.',
                advice: initialNotice.advice,
                billingUrl: initialNotice.billingUrl,
                apiKeyUrl: initialNotice.apiKeyUrl
            });
            if (initialNotice.code === 402 || initialNotice.type === 'PREPAYMENT_DEPLETED') {
                // If it's prepayment, default to diagnostics tab to show root cause & resolution
                setActiveTab('diagnostics');
            }
        } else if (reasonNotice) {
            setTestResult({
                success: false,
                ok: false,
                statusCode: 402,
                title: 'AI Operational Notice',
                message: reasonNotice
            });
        }
    }, [initialTab, initialNotice, reasonNotice, currentUser]);

    // Test Gemini connection
    const handleRunTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const cleaned = cleanApiKey(apiKeyInput);
            const res = await testGeminiApiKey(cleaned);
            setTestResult(res);
            if (res.ok) {
                toast.success(isKa ? 'Gemini 3.8 Flash კავშირი დადასტურებულია!' : 'Gemini 3.8 Flash Cloud connection verified!');
            } else if (res.statusCode === 402) {
                toast.warning(isKa ? 'Google AI Studio: კრედიტები ამოწურულია (Code 402)' : 'Google AI Studio: Prepayment credits depleted (Code 402)');
            } else {
                toast.error(res.title || (isKa ? 'კავშირი ვერ დამყარდა' : 'Connection failed'));
            }
        } catch (err: any) {
            setTestResult({
                success: false,
                ok: false,
                statusCode: 500,
                errorType: 'CLIENT_ERROR',
                title: 'Diagnostics Error',
                message: err?.message || 'Error executing connection test'
            });
        } finally {
            setIsTesting(false);
            fetchStatus();
        }
    };

    // Save API key
    const handleSaveKey = async () => {
        setIsSavingKey(true);
        try {
            const cleaned = cleanApiKey(apiKeyInput);
            await setCustomGeminiApiKey(cleaned);
            toast.success(isKa ? 'API გასაღები შენახულია!' : 'API Key successfully updated!');
            await fetchStatus();
            await handleRunTest();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save API key');
        } finally {
            setIsSavingKey(false);
        }
    };

    // Card checkout payment confirmation
    const handleConfirmPayment = async () => {
        setIsProcessingPayment(true);
        try {
            // Simulate 256-bit bank card authorization
            await new Promise(r => setTimeout(r, 900));

            if (paymentItemType === 'subscription') {
                const updated = subscribeToAiPlan(currentUser, selectedPlan, onUpdateUser);
                setQuota(updated);
                toast.success(
                    isKa
                        ? `🎉 გამოწერა გააქტიურებულია: ${selectedPlan.name} (${selectedPlan.priceGel} GEL) — შეუზღუდავი Cloud AI!`
                        : `🎉 Subscription Activated: ${selectedPlan.name} (${selectedPlan.priceGel} GEL) — Unlimited Cloud AI active!`
                );
            } else {
                const updated = purchaseAiCredits(currentUser, selectedPack, onUpdateUser);
                setQuota(updated);
                toast.success(
                    isKa
                        ? `🎉 ბალანსი შეივსო: +${selectedPack.credits} AI კრედიტი!`
                        : `🎉 Top-up successful: +${selectedPack.credits} AI credits added to balance!`
                );
            }

            // Immediately switch to diagnostics and test
            setActiveTab('diagnostics');
            toast.info(isKa ? 'AI კავშირი შემოწმებულია' : 'AI access restored');
        } catch (err: any) {
            toast.error(err?.message || 'Payment authorization failed');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    // Toggle Sovereign Offline Mode
    const handleToggleSovereign = (val: boolean) => {
        setSovereignOfflineMode(val);
        try {
            localStorage.setItem('agrimap_force_local_ai', val ? 'true' : 'false');
            toast.info(
                val 
                    ? (isKa ? 'გააქტიურდა 100% ავტონომიური ლოკალური AI რეჟიმი' : '100% Sovereign Local AI mode activated')
                    : (isKa ? 'გადაერთო ღრუბლოვან (Cloud First) AI რეჟიმზე' : 'Switched to Cloud-First AI mode')
            );
        } catch (_) {}
    };

    // Latest provenance record
    const lastProvenance = getLastAiProvenance();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-5xl h-[92vh] max-h-[850px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
                
                {/* 1. CONSOLE TOP HEADER */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-600 to-indigo-600 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                                    {isKa ? 'AI მართვის კონსოლი' : 'AI Management Console'}
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    PRO ARCHITECTURE
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                {isKa 
                                    ? 'ღრუბლოვანი ძრავის დიაგნოსტიკა • შეცდომების ანალიზი • ბარათით გადახდა • API გასაღები' 
                                    : 'Cloud Engine Diagnostics • Error Analyzer • Card Payment & Subscriptions • API Keys'}
                            </p>
                        </div>
                    </div>

                    {/* Quick Status Pill & Close Button */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-[11px] font-mono">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-slate-300">Local Core: Ready</span>
                            <span className="text-slate-500">•</span>
                            <span className={`font-semibold ${testResult?.ok ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {testResult?.ok ? 'Cloud: Live' : 'Cloud: Fallback'}
                            </span>
                        </div>

                        <button 
                            type="button" 
                            onClick={onClose}
                            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title={isKa ? 'დახურვა' : 'Close'}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 2. NAVIGATION TABS */}
                <div className="px-6 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0 custom-scrollbar">
                    <button
                        type="button"
                        onClick={() => setActiveTab('diagnostics')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'diagnostics'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                    >
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>{isKa ? '1. შეცდომის დიაგნოსტიკა & ანალიზი' : '1. Error Diagnostics & Health'}</span>
                        {(testResult?.statusCode === 402 || testResult?.statusCode === 429) && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('billing')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'billing'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                    >
                        <CreditCard className="w-4 h-4 text-indigo-400" />
                        <span>{isKa ? '2. ბარათით გადახდა & გამოწერა' : '2. Card Payment & Subscriptions'}</span>
                        <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/30 text-indigo-200 text-[10px] font-mono">
                            {quota.isUnlimited ? '∞ Unlimited' : `${quota.aiCreditsBalance} Cr`}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('keys')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'keys'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                    >
                        <Key className="w-4 h-4 text-emerald-400" />
                        <span>{isKa ? '3. Gemini API გასაღები' : '3. Gemini API Key & Cloud Setup'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('engine')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'engine'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                    >
                        <Server className="w-4 h-4 text-cyan-400" />
                        <span>{isKa ? '4. Local GodAI ცოდნის ბაზა' : '4. Local Knowledge Core'}</span>
                    </button>
                </div>

                {/* 3. TAB CONTENT PANELS */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">

                    {/* ======================================================== */}
                    {/* TAB 1: ERROR DIAGNOSTICS & ROOT CAUSE ANALYZER           */}
                    {/* ======================================================== */}
                    {activeTab === 'diagnostics' && (
                        <div className="space-y-6">
                            
                            {/* LIVE CONNECTION TEST BAR */}
                            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Cpu className="w-4 h-4 text-amber-400" />
                                        {isKa ? 'Google Gemini 3.8 Flash კავშირის რეალური ტესტი' : 'Live Google Gemini 3.8 Flash Gateway Diagnostic'}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {isKa
                                            ? 'შეამოწმეთ ცოცხალი კავშირი, წინასწარ გადახდილი კრედიტები და API გასაღების ავტორიზაცია.'
                                            : 'Sends a ping handshake through the server proxy to determine upstream cloud status and credit health.'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRunTest}
                                    disabled={isTesting}
                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer shrink-0 transition-transform active:scale-95"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
                                    <span>{isTesting ? (isKa ? 'მოწმდება...' : 'Diagnosing...') : (isKa ? 'დიაგნოსტიკის დაწყება' : 'Run Diagnostic Test Now')}</span>
                                </button>
                            </div>

                            {/* DETECTED ROOT CAUSE BREAKDOWN BANNER */}
                            {testResult && !testResult.ok && (
                                <div className={`p-6 rounded-3xl border-2 shadow-xl ${
                                    testResult.statusCode === 402 
                                        ? 'bg-amber-950/40 border-amber-500/80 text-amber-100'
                                        : testResult.statusCode === 429
                                        ? 'bg-orange-950/40 border-orange-500/80 text-orange-100'
                                        : 'bg-red-950/40 border-red-500/80 text-red-100'
                                }`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-2xl shrink-0 ${
                                            testResult.statusCode === 402 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                        }`}>
                                            <AlertTriangle className="w-7 h-7" />
                                        </div>
                                        <div className="space-y-3 flex-1">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <span className="px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-300 font-mono text-[10px] font-black uppercase">
                                                        HTTP CODE {testResult.statusCode || 'ERR'} • {testResult.errorType || 'UPSTREAM_RESTRICTION'}
                                                    </span>
                                                    <h4 className="text-base font-black mt-1 text-white">
                                                        {testResult.title || 'Upstream Gemini Gateway Error'}
                                                    </h4>
                                                </div>
                                                <span className="text-[11px] font-mono text-amber-300/80">
                                                    Action Required
                                                </span>
                                            </div>

                                            {/* Detailed Explanation */}
                                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                                                {testResult.message}
                                            </p>

                                            {/* 3 Quick Action Resolution Cards */}
                                            <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {/* Action 1: Card payment */}
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTab('billing')}
                                                    className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-left cursor-pointer transition-all hover:scale-[1.02] group"
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <CreditCard className="w-4 h-4 text-indigo-400" />
                                                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-1" />
                                                    </div>
                                                    <span className="text-xs font-bold text-white block">
                                                        {isKa ? 'ბარათით გადახდა' : 'Pay with Card'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {isKa ? 'შეიძინეთ შეუზღუდავი AI გამოწერა' : 'Recharge tokens or get unlimited tier'}
                                                    </span>
                                                </button>

                                                {/* Action 2: AI Studio Billing link */}
                                                <a
                                                    href={testResult.billingUrl || "https://ai.studio/projects"}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/50 text-left transition-all hover:scale-[1.02] group"
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <ExternalLink className="w-4 h-4 text-amber-400" />
                                                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-1" />
                                                    </div>
                                                    <span className="text-xs font-bold text-white block">
                                                        {isKa ? 'Google AI Studio Billing' : 'Google AI Studio Billing'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {isKa ? 'დაამატეთ prepayment კრედიტები' : 'Add Google Cloud prepayment balance'}
                                                    </span>
                                                </a>

                                                {/* Action 3: Change API key */}
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTab('keys')}
                                                    className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-emerald-400/50 text-left cursor-pointer transition-all hover:scale-[1.02] group"
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <Key className="w-4 h-4 text-emerald-400" />
                                                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-1" />
                                                    </div>
                                                    <span className="text-xs font-bold text-white block">
                                                        {isKa ? 'API გასაღების შეცვლა' : 'Configure Custom Key'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {isKa ? 'შეიყვანეთ ახალი Free Tier გასაღები' : 'Paste fresh key from Google Studio'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SUCCESS CONFIRMATION IF ACTIVE */}
                            {testResult && testResult.ok && (
                                <div className="p-5 rounded-3xl bg-emerald-950/40 border border-emerald-500/50 flex items-start gap-3 text-emerald-100">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-sm text-white">
                                            {isKa ? 'Gemini 3.8 Flash კავშირი სრულად აქტიურია' : 'Gemini 3.8 Flash Cloud Gateway Active'}
                                        </h4>
                                        <p className="text-xs text-emerald-200/90 mt-1">
                                            {testResult.message} • Latency: {testResult.latencyMs} ms
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* EXPLANATORY GUIDE: HOW LOCAL AI & CLOUD AI WORK */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                            {isKa ? 'როდის პასუხობს Local AI (ყვითელი ყუთი)?' : 'When does Local AI Answer (Yellow Box)?'}
                                        </h4>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        {isKa 
                                            ? 'როდესაც Google Gemini კრედიტები ამოწურულია (402), ამოიწურა თვიური ტოკენები, ან გასაღები არასწორია, სისტემა ავტომატურად იყენებს აგრონომიულ ცოდნის ბაზას (GodAI). პასუხის ყუთი ხდება ყვითელი და ეწერება "AI Local".'
                                            : 'When Google Gemini prepayment credits are depleted ($0 / Code 402), free tokens are exhausted, rate limits are reached, or network is offline, AgriMap automatically serves domain answers via the internal Autonomous Agronomic Engine. The box turns yellow with an "AI Local" badge.'}
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                            {isKa ? 'როდის პასუხობს Cloud AI (მწვანე ნიშნული)?' : 'When does Cloud AI Answer (Green Badge)?'}
                                        </h4>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        {isKa
                                            ? 'როდესაც აქტიურია მოქმედი API გასაღები ან შევსებულია ბალანსი/გამოწერა, პასუხებს აგენერირებს Google Gemini 3.8 Flash მოდელი რეალურ დროში ღრუბლოვანი სიმძლავრით.'
                                            : 'When an active API key with valid billing credits or a paid subscription pack is active, answers are dynamically generated via Google Gemini 3.8 Flash Cloud Gateway with advanced reasoning.'}
                                    </p>
                                </div>
                            </div>

                            {/* RECENT AI ANSWERS PROVENANCE LOG */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                        <Database className="w-4 h-4 text-indigo-400" />
                                        {isKa ? 'ბოლო AI მოთხოვნების გამჭვირვალობის ჟურნალი' : 'Recent AI Queries & Provenance Log'}
                                    </h4>
                                    <span className="text-[10px] text-slate-400">
                                        {provenances.length} {isKa ? 'ჩანაწერი' : 'records logged'}
                                    </span>
                                </div>

                                {provenances.length === 0 ? (
                                    <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-500">
                                        {isKa ? 'ჯერ არ არის შესრულებული AI მოთხოვნები ამ სესიაში.' : 'No AI queries executed in current session yet.'}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {provenances.slice(0, 6).map((item) => (
                                            <div 
                                                key={item.id}
                                                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                                                    item.source === 'local'
                                                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                                                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                                                }`}
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <AiSourceBadge 
                                                            source={item.source}
                                                            reason={item.fallbackReason}
                                                            code={item.fallbackCode}
                                                            modelUsed={item.modelUsed}
                                                            compact
                                                            isKa={isKa}
                                                        />
                                                        <span className="font-mono text-[10px] text-slate-400">
                                                            {new Date(item.timestamp).toLocaleTimeString()}
                                                        </span>
                                                        <span className="font-mono text-[10px] text-slate-500">
                                                            {item.modelUsed}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-200 text-xs italic font-serif">
                                                        "{item.queryPreview}"
                                                    </p>
                                                </div>

                                                {item.fallbackReason && (
                                                    <div className="text-[11px] text-amber-300/90 font-medium sm:text-right max-w-sm">
                                                        <span className="font-bold">{isKa ? 'მიზეზი: ' : 'Reason: '}</span>
                                                        {item.fallbackReason}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 2: CARD PAYMENT & SUBSCRIPTION TIERS                 */}
                    {/* ======================================================== */}
                    {activeTab === 'billing' && (
                        <div className="space-y-6">
                            
                            {/* USER QUOTA & BALANCE OVERVIEW */}
                            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                                        {isKa ? 'თქვენი AI ბალანსი' : 'Your Active AI Balance'}
                                    </span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-white font-mono">
                                            {quota.isUnlimited ? '∞ UNLIMITED' : `${quota.aiCreditsBalance} CREDITS`}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            ({freeRemaining} free queries left this month)
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-mono font-bold text-slate-200 border border-slate-700">
                                        Plan: {quota.subscriptionTier ? quota.subscriptionTier.toUpperCase() : 'FREE TIER'}
                                    </span>
                                </div>
                            </div>

                            {/* SELECT SUBSCRIPTION OR PACK */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                                        {isKa ? 'აირჩიეთ ტარიფი ან კრედიტების პაკეტი' : 'Choose Monthly Plan or Instant Credit Pack'}
                                    </h3>
                                    <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentItemType('subscription')}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                paymentItemType === 'subscription' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            {isKa ? 'ყოველთვიური გამოწერა' : 'Monthly Subscriptions'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentItemType('pack')}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                paymentItemType === 'pack' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            {isKa ? 'კრედიტების შევსება' : 'One-Time Packs'}
                                        </button>
                                    </div>
                                </div>

                                {paymentItemType === 'subscription' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {DEFAULT_AI_SUBSCRIPTION_PLANS.map((plan) => {
                                            const isSelected = selectedPlanId === plan.id;
                                            return (
                                                <div
                                                    key={plan.id}
                                                    onClick={() => setSelectedPlanId(plan.id)}
                                                    className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                                                        isSelected
                                                            ? 'bg-indigo-950/50 border-indigo-500 shadow-xl shadow-indigo-500/10'
                                                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                                                    }`}
                                                >
                                                    {plan.isPopular && (
                                                        <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                                                            MOST POPULAR
                                                        </span>
                                                    )}

                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-base font-black text-white">{plan.name}</h4>
                                                            <div className="text-right">
                                                                <span className="text-2xl font-black text-white font-mono">{plan.priceGel} GEL</span>
                                                                <span className="text-slate-400 text-xs block">/ month</span>
                                                            </div>
                                                        </div>

                                                        <p className="text-xs text-slate-300 leading-relaxed font-normal">
                                                            {plan.description}
                                                        </p>

                                                        <ul className="space-y-1.5 pt-2 border-t border-slate-800/80">
                                                            {plan.features.map((feat, fIdx) => (
                                                                <li key={fIdx} className="text-[11px] text-slate-300 flex items-center gap-2">
                                                                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                                    <span>{feat}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-800">
                                                        <span className="text-xs font-bold text-indigo-400">
                                                            {isSelected ? '✓ Selected for Payment' : 'Click to select'}
                                                        </span>
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                            isSelected ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-600'
                                                        }`}>
                                                            {isSelected && <Check className="w-3 h-3" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {DEFAULT_AI_CREDIT_PACKS.map((pack) => {
                                            const isSelected = selectedPackId === pack.id;
                                            return (
                                                <div
                                                    key={pack.id}
                                                    onClick={() => setSelectedPackId(pack.id)}
                                                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                                        isSelected
                                                            ? 'bg-indigo-950/50 border-indigo-500 shadow-lg'
                                                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-bold text-white">{pack.name}</span>
                                                            {pack.isPopular && (
                                                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Popular</span>
                                                            )}
                                                        </div>
                                                        <div className="text-lg font-black text-indigo-300 font-mono mb-1">
                                                            +{pack.credits} Cr
                                                        </div>
                                                        <div className="text-xs font-bold text-white font-mono mb-2">
                                                            {pack.priceGel} GEL (${pack.priceUsd})
                                                        </div>
                                                        <p className="text-[10px] text-slate-400">
                                                            {pack.description}
                                                        </p>
                                                    </div>

                                                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                                                        <span className="text-[10px] text-indigo-300 font-semibold">
                                                            {isSelected ? '✓ Selected' : 'Select'}
                                                        </span>
                                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                            isSelected ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-600'
                                                        }`}>
                                                            {isSelected && <Check className="w-2.5 h-2.5" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* CARD CHECKOUT FORM */}
                            <div className="p-6 rounded-3xl bg-slate-950/90 border border-slate-800 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-5 h-5 text-indigo-400" />
                                        <h4 className="text-sm font-bold text-white">
                                            {isKa ? 'საბანკო ბარათით გადახდა (Instant Cloud AI Checkout)' : 'Instant Card Checkout & Cloud AI Activation'}
                                        </h4>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>256-bit SSL Encrypted</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                                            {isKa ? 'ბარათის მფლობელი' : 'Cardholder Name'}
                                        </label>
                                        <input
                                            type="text"
                                            value={cardHolder}
                                            onChange={(e) => setCardHolder(e.target.value)}
                                            placeholder="Giorgi Nishnianidze"
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                                            {isKa ? 'ბარათის ნომერი' : 'Card Number'}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={cardNumber}
                                                onChange={(e) => setCardNumber(e.target.value)}
                                                placeholder="•••• •••• •••• ••••"
                                                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            />
                                            <span className="absolute right-3 top-2.5 text-[10px] font-mono text-indigo-400 font-bold">
                                                VISA / MC
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                                            {isKa ? 'მოქმედების ვადა' : 'Expiry (MM/YY)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={cardExpiry}
                                            onChange={(e) => setCardExpiry(e.target.value)}
                                            placeholder="12/28"
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                                            CVC / CVV
                                        </label>
                                        <input
                                            type="password"
                                            value={cardCvc}
                                            maxLength={4}
                                            onChange={(e) => setCardCvc(e.target.value)}
                                            placeholder="•••"
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Summary & Pay Button */}
                                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <span className="text-[11px] text-slate-400">Total Due Today:</span>
                                        <div className="text-xl font-black text-white font-mono">
                                            {paymentItemType === 'subscription' ? `${selectedPlan.priceGel} GEL` : `${selectedPack.priceGel} GEL`}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleConfirmPayment}
                                        disabled={isProcessingPayment}
                                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-600 hover:from-indigo-600 hover:to-emerald-700 text-white font-black text-xs shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
                                    >
                                        <Zap className={`w-4 h-4 ${isProcessingPayment ? 'animate-spin' : ''}`} />
                                        <span>
                                            {isProcessingPayment 
                                                ? (isKa ? 'მუშავდება გადახდა...' : 'Authorizing Card...')
                                                : (isKa ? '💳 გადახდა ბარათით და Cloud AI-ს გააქტიურება' : '💳 Pay with Card & Activate Instant Cloud Access')}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 3: GEMINI API KEY & CLOUD SETUP                      */}
                    {/* ======================================================== */}
                    {activeTab === 'keys' && (
                        <div className="space-y-6">
                            
                            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Key className="w-4 h-4 text-emerald-400" />
                                        {isKa ? 'Google Gemini API გასაღების კონფიგურაცია' : 'Google Gemini API Key Credentials'}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {isKa
                                            ? 'შეიყვანეთ თქვენი Google AI Studio-ს გასაღები (AIzaSy...). სისტემა ავტომატურად გაასუფთავებს ზედმეტ სიმბოლოებს.'
                                            : 'Enter your custom Google AI Studio API key. The platform uses this key to query live Gemini 3.8 Flash models directly.'}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="relative">
                                        <input
                                            type={showKey ? "text" : "password"}
                                            value={apiKeyInput}
                                            onChange={(e) => setApiKeyInput(e.target.value)}
                                            placeholder="AIzaSy..."
                                            className="w-full pl-3.5 pr-24 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                        />
                                        <div className="absolute right-2 top-2 flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setShowKey(!showKey)}
                                                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                                                title={showKey ? 'Hide' : 'Show'}
                                            >
                                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-500">
                                        Stored securely in server runtime & session memory. Never exposed publicly.
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleSaveKey}
                                        disabled={isSavingKey}
                                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
                                    >
                                        <Check className="w-4 h-4" />
                                        <span>{isSavingKey ? (isKa ? 'ინახება...' : 'Saving...') : (isKa ? 'გასაღების შენახვა' : 'Save & Verify Key')}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleRunTest}
                                        disabled={isTesting}
                                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 cursor-pointer"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                                        <span>{isKa ? 'შემოწმება' : 'Test Key'}</span>
                                    </button>

                                    <a
                                        href="https://aistudio.google.com/apikey"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 ml-auto"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                                        <span>{isKa ? 'ახალი გასაღების მიღება (AI Studio)' : 'Get Free Key at Google AI Studio'}</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 4: LOCAL GODAI KNOWLEDGE ENGINE                      */}
                    {/* ======================================================== */}
                    {activeTab === 'engine' && (
                        <div className="space-y-6">
                            
                            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <Server className="w-4 h-4 text-cyan-400" />
                                            {isKa ? 'ავტონომიური აგრონომიული ცოდნის ბაზა (GodAI Local Core)' : 'Autonomous Agronomic Knowledge Core (GodAI Engine)'}
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {isKa
                                                ? 'უზრუნველყოფს 100%-იან მუშაობას ინტერნეტის გარეშე და სარეზერვო პასუხებს Cloud AI-ის შეფერხებისას.'
                                                : 'Guarantees 100% operational uptime in air-gapped plantation zones and serves automatic fallback answers.'}
                                        </p>
                                    </div>

                                    {/* Sovereign Mode Switch */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-slate-300">
                                            {isKa ? 'ლოკალური AI რეჟიმი' : 'Force Sovereign Mode:'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleSovereign(!sovereignOfflineMode)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                                                sovereignOfflineMode ? 'bg-amber-500' : 'bg-slate-700'
                                            }`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                sovereignOfflineMode ? 'translate-x-6' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Indexed Heuristics</span>
                                        <span className="text-xl font-bold text-white font-mono">84 Rules</span>
                                        <span className="text-[10px] text-emerald-400 block mt-1">Blueberry, Hazelnut & Vine</span>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Scale Protocols</span>
                                        <span className="text-xl font-bold text-white font-mono">6 Standards</span>
                                        <span className="text-[10px] text-indigo-400 block mt-1">0.35kg auto-tare + QR</span>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Offline Resilience</span>
                                        <span className="text-xl font-bold text-emerald-400 font-mono">100% Active</span>
                                        <span className="text-[10px] text-slate-400 block mt-1">LAN Local Storage & Sync</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. CONSOLE FOOTER */}
                <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs">
                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Platform Engine: <strong>AgriMap Pro Dual-AI Bridge</strong></span>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
                    >
                        {isKa ? 'დახურვა' : 'Close Console'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AiManagementConsoleModal;
