import React, { useState, useEffect } from 'react';
import { 
    X, Sparkles, Key, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, 
    ExternalLink, Copy, Check, Eye, EyeOff, ShieldCheck, Cpu, Zap, CreditCard,
    Server, ArrowRight, HelpCircle, HardDrive
} from 'lucide-react';
import { toast } from 'sonner';
import { 
    cleanApiKey, 
    getActiveGeminiApiKey, 
    setCustomGeminiApiKey, 
    testGeminiApiKey, 
    triggerAiTopUpModal,
    PRIMARY_GEMINI_MODEL,
    type GeminiTestResult
} from '../services/geminiService';

interface AiKeyDiagnosticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isKa?: boolean;
    initialNotice?: {
        code?: number;
        title?: string;
        message?: string;
        advice?: string[];
        billingUrl?: string;
        apiKeyUrl?: string;
    } | null;
}

export const AiKeyDiagnosticsModal: React.FC<AiKeyDiagnosticsModalProps> = ({
    isOpen,
    onClose,
    isKa = false,
    initialNotice = null
}) => {
    const [activeTab, setActiveTab] = useState<'diagnostics' | 'billing'>('diagnostics');
    const [apiKeyInput, setApiKeyInput] = useState<string>('');
    const [showKey, setShowKey] = useState<boolean>(false);
    const [isTesting, setIsTesting] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [testResult, setTestResult] = useState<GeminiTestResult | null>(null);
    const [serverStatus, setServerStatus] = useState<{
        hasActiveKey: boolean;
        source: string;
        keyPreview: string | null;
        model: string;
    } | null>(null);
    const [copiedLink, setCopiedLink] = useState<string | null>(null);

    // Load active key and server status on mount
    const fetchServerStatus = async () => {
        try {
            const res = await fetch('/api/gemini/status');
            if (res.ok) {
                const data = await res.json();
                setServerStatus(data);
            }
        } catch (e) {
            console.warn('[AI Diagnostics] Server status fetch failed:', e);
        }
    };

    useEffect(() => {
        const stored = getActiveGeminiApiKey();
        setApiKeyInput(stored);
        fetchServerStatus();

        if (initialNotice) {
            setTestResult({
                success: false,
                ok: false,
                statusCode: initialNotice.code || 402,
                title: initialNotice.title || 'Google Gemini API Notice',
                message: initialNotice.message || 'API request was rejected by Google Cloud gateway.',
                advice: initialNotice.advice,
                billingUrl: initialNotice.billingUrl,
                apiKeyUrl: initialNotice.apiKeyUrl
            });
            if (initialNotice.code === 402) {
                setActiveTab('billing');
            }
        }
    }, [initialNotice]);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard?.writeText(text);
        setCopiedLink(id);
        setTimeout(() => setCopiedLink(null), 2000);
        toast.success(isKa ? 'დაკოპირდა ბუფერში' : 'Copied to clipboard');
    };

    const handlePaste = async () => {
        try {
            const clipText = await navigator.clipboard?.readText();
            if (clipText) {
                const cleaned = cleanApiKey(clipText);
                setApiKeyInput(cleaned);
                toast.success(isKa ? 'გასაღები ჩაისვა და გასუფთავდა' : 'API Key pasted and formatted');
            }
        } catch {
            toast.error(isKa ? 'ვერ მოხერხდა ბუფერიდან წაკითხვა' : 'Clipboard read unavailable');
        }
    };

    const handleRunTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const cleaned = cleanApiKey(apiKeyInput);
            const result = await testGeminiApiKey(cleaned);
            setTestResult(result);
            if (result.ok) {
                toast.success(isKa ? 'Gemini API კავშირი წარმატებულია!' : 'Gemini API connection confirmed!');
            } else if (result.statusCode === 402) {
                toast.warning(isKa ? 'პროექტს ამოეწურა კრედიტები (Code 402)' : 'Project prepayment credits depleted (Code 402)');
            } else {
                toast.error(result.title || (isKa ? 'კავშირი ვერ დამყარდა' : 'Connection failed'));
            }
        } catch (err: any) {
            setTestResult({
                success: false,
                ok: false,
                statusCode: 500,
                errorType: 'CLIENT_ERROR',
                title: 'Client Diagnostic Error',
                message: err?.message || 'Error executing API test'
            });
        } finally {
            setIsTesting(false);
            fetchServerStatus();
        }
    };

    const handleSaveKey = async () => {
        setIsSaving(true);
        try {
            const cleaned = cleanApiKey(apiKeyInput);
            await setCustomGeminiApiKey(cleaned);
            await fetchServerStatus();
            toast.success(
                cleaned
                    ? (isKa ? 'გასაღები წარმატებით შეინახა სერვერზე!' : 'API Key saved and synced to server runtime!')
                    : (isKa ? 'პერსონალური გასაღები წაიშალა' : 'Custom API Key removed')
            );
            // Re-run test with newly applied key
            handleRunTest();
        } catch (err: any) {
            toast.error(isKa ? 'შენახვის შეცდომა' : 'Failed to save API key');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClearKey = async () => {
        setApiKeyInput('');
        await setCustomGeminiApiKey('');
        await fetchServerStatus();
        setTestResult(null);
        toast.info(isKa ? 'პერსონალური გასაღები წაიშალა' : 'Custom key cleared. Reverted to server default.');
    };

    const isDirty = cleanApiKey(apiKeyInput) !== cleanApiKey(getActiveGeminiApiKey());
    const isCleanedDifferent = apiKeyInput.trim() !== cleanApiKey(apiKeyInput);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700/80 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-white tracking-tight">
                                    {isKa ? 'AI სისტემის დიაგნოსტიკა და ბილინგი' : 'AI Engine Diagnostics & Cloud Gateway'}
                                </h2>
                                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    {PRIMARY_GEMINI_MODEL}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                {isKa ? 'Google Gemini API კავშირი, ტოკენების სტატუსი და ანგარიშის ბალანსი' : 'Google Gemini API connection, token verification, and billing status'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-900/50 px-6">
                    <button
                        onClick={() => setActiveTab('diagnostics')}
                        className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'diagnostics'
                                ? 'border-emerald-500 text-emerald-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Cpu className="w-4 h-4" />
                        {isKa ? 'კავშირი და API გასაღები' : 'Connection & API Key'}
                    </button>
                    <button
                        onClick={() => setActiveTab('billing')}
                        className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'billing'
                                ? 'border-emerald-500 text-emerald-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <CreditCard className="w-4 h-4" />
                        {isKa ? 'ტოკენების შეძენა & ბილინგი' : 'Buying Tokens & Billing Guide'}
                        {testResult?.statusCode === 402 && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        )}
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Active Server Status Banner */}
                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300">
                                <Server className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-400">
                                    {isKa ? 'სერვერის აქტიური გასაღები:' : 'Active Server Runtime Key:'}
                                </div>
                                <div className="text-sm font-mono text-slate-200 font-medium">
                                    {serverStatus?.keyPreview || (isKa ? 'გასაღები არ არის მითითებული' : 'No key detected')}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                                serverStatus?.source === 'custom_runtime'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                    : serverStatus?.source === 'environment'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}>
                                {serverStatus?.source === 'custom_runtime'
                                    ? (isKa ? 'პერსონალური გასაღები (აქტიური)' : 'Custom User Key (Active)')
                                    : serverStatus?.source === 'environment'
                                    ? (isKa ? 'სისტემური გარემო' : 'Environment Variable')
                                    : (isKa ? 'გასაღების გარეშე' : 'No Key')}
                            </span>
                            <button
                                onClick={fetchServerStatus}
                                title="Refresh server status"
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {activeTab === 'diagnostics' && (
                        <div className="space-y-6">
                            {/* Key Input Section */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                        <Key className="w-4 h-4 text-emerald-400" />
                                        {isKa ? 'Google Gemini API გასაღები (პროექტი WMDA ან პირადი)' : 'Google Gemini API Key (Project WMDA or Personal)'}
                                    </label>
                                    <div className="flex items-center gap-2 text-xs">
                                        <button
                                            type="button"
                                            onClick={handlePaste}
                                            className="text-emerald-400 hover:text-emerald-300 font-medium underline-offset-2 hover:underline"
                                        >
                                            {isKa ? 'ბუფერიდან ჩასმა' : 'Paste from Clipboard'}
                                        </button>
                                        {apiKeyInput && (
                                            <button
                                                type="button"
                                                onClick={handleClearKey}
                                                className="text-slate-400 hover:text-rose-400"
                                            >
                                                {isKa ? 'გასუფთავება' : 'Clear'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="relative">
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={apiKeyInput}
                                        onChange={(e) => setApiKeyInput(e.target.value)}
                                        placeholder="AIzaSy..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 font-mono text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 pr-24"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded"
                                    >
                                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {isCleanedDifferent && (
                                    <p className="text-xs text-amber-400 flex items-center gap-1.5 mt-1">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        {isKa 
                                            ? 'გასაღების ფორმატი გასუფთავდა (მოშორდა ბრჭყალები, სივრცეები ან პრეფიქსი).'
                                            : 'Key formatting automatically sanitized (stripped quotes, spaces, or variable prefix).'}
                                    </p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={handleRunTest}
                                    disabled={isTesting}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium border border-slate-600 transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin text-emerald-400' : ''}`} />
                                    {isTesting ? (isKa ? 'ტესტირება მიმდინარეობს...' : 'Testing Connection...') : (isKa ? 'კავშირის ტესტირება' : 'Test Connection')}
                                </button>

                                <button
                                    onClick={handleSaveKey}
                                    disabled={isSaving || !isDirty}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                        isDirty
                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                                            : 'bg-slate-800 text-slate-400 border border-slate-700 opacity-60 cursor-not-allowed'
                                    }`}
                                >
                                    <Check className="w-4 h-4" />
                                    {isSaving ? (isKa ? 'ინახება...' : 'Saving...') : (isKa ? 'შენახვა და სერვერზე გააქტიურება' : 'Save & Apply to Server')}
                                </button>
                            </div>

                            {/* Test Results Display */}
                            {testResult && (
                                <div className={`p-4 rounded-xl border ${
                                    testResult.ok
                                        ? 'bg-emerald-950/40 border-emerald-500/40'
                                        : testResult.statusCode === 402
                                        ? 'bg-amber-950/40 border-amber-500/50'
                                        : 'bg-rose-950/40 border-rose-500/50'
                                } space-y-3`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            {testResult.ok ? (
                                                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                                            ) : testResult.statusCode === 402 ? (
                                                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                                            ) : (
                                                <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className={`text-sm font-bold ${
                                                        testResult.ok ? 'text-emerald-300' : testResult.statusCode === 402 ? 'text-amber-300' : 'text-rose-300'
                                                    }`}>
                                                        {testResult.title || (testResult.ok ? 'Connection Operational' : 'Connection Error')}
                                                    </h3>
                                                    {testResult.statusCode && (
                                                        <span className="text-xs px-2 py-0.5 rounded font-mono bg-black/40 border border-slate-700 text-slate-300">
                                                            HTTP {testResult.statusCode}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                                    {testResult.message}
                                                </p>
                                            </div>
                                        </div>

                                        {testResult.latencyMs !== undefined && (
                                            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800 shrink-0">
                                                {testResult.latencyMs} ms
                                            </span>
                                        )}
                                    </div>

                                    {/* Action advice / links */}
                                    {testResult.statusCode === 402 && (
                                        <div className="pt-2 border-t border-amber-500/30 space-y-2">
                                            <p className="text-xs font-medium text-amber-200">
                                                {isKa 
                                                    ? 'Google Cloud-ის მოთხოვნა: პროექტს (WMDA) სჭირდება Prepayment კრედიტების შევსება ან ბილინგის გამოწერა.'
                                                    : 'Google Cloud Requirement: Your project (WMDA) requires Prepayment credits before model tokens can be served.'}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                                <a
                                                    href={testResult.billingUrl || "https://ai.studio/projects"}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    {isKa ? 'AI Studio ბილინგის მართვა (ai.studio/projects)' : 'Manage Billing at ai.studio/projects'}
                                                </a>
                                                <a
                                                    href={testResult.apiKeyUrl || "https://aistudio.google.com/apikey"}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors"
                                                >
                                                    <Key className="w-3.5 h-3.5 text-emerald-400" />
                                                    {isKa ? 'ახალი უფასო გასაღების აღება (Free Tier)' : 'Get Free Tier Key (Without Billing)'}
                                                </a>
                                                <button
                                                    onClick={() => setActiveTab('billing')}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-amber-300 hover:text-amber-200 underline font-medium"
                                                >
                                                    {isKa ? 'დეტალური ინსტრუქცია' : 'View Resolution Steps'} &rarr;
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {testResult.advice && testResult.advice.length > 0 && (
                                        <ul className="text-xs text-slate-400 list-disc list-inside space-y-0.5 pt-1">
                                            {testResult.advice.map((item, idx) => (
                                                <li key={idx}>{item}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {/* Autonomous Fallback Assurance */}
                            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-3">
                                <HardDrive className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                                <div className="space-y-1 text-xs text-slate-400">
                                    <span className="font-semibold text-slate-200">
                                        {isKa ? 'სარეზერვო აგრონომიული ბირთვი (Autonomous Core)' : 'Autonomous Agricultural Knowledge Core Active'}
                                    </span>
                                    <p>
                                        {isKa
                                            ? 'თუ Google API-ზე კრედიტები ამოწურულია ან ქსელი გათიშულია, სისტემა ავტომატურად გაწვდით რეალურ აგრონომიულ დიაგნოსტიკას (ქლოროზი, ანთრაქნოზი, სასწორის ტარის გამოკლება 0.35კგ, FIFO და GIS რუკა) შეფერხების გარეშე.'
                                            : 'If Google Cloud credits are depleted or offline, AgriMap automatically synthesizes precise agronomic answers (foliar chlorosis, anthracnose treatments, 0.35kg tare deduction, FIFO inventory, GIS cadastral mapping) with zero downtime.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="space-y-6">
                            
                            {/* Alert Card about Code 402 */}
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <h4 className="text-sm font-semibold text-amber-300">
                                        {isKa ? 'რატომ წერს "Prepayment Credits Depleted (402)"?' : 'Why does Google return "Prepayment Credits Depleted (Code 402)"?'}
                                    </h4>
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        {isKa
                                            ? 'Google AI Studio-ს პროექტში (მაგ. WMDA), როდესაც ჩართულია ბილინგის ანგარიში, Google მოითხოვს წინასწარ შეტანილ ბალანსს (Prepayment Credits). როდესაც ბალანსი $0.00-ია, Google ბლოკავს ყველა მოთხოვნას.'
                                            : 'When a Google Cloud project (such as project WMDA) is enrolled in Google AI Studio Pay-As-You-Go, Google requires an active Prepayment Credit balance. If the balance reaches $0.00, requests are rejected with Code 402.'}
                                    </p>
                                </div>
                            </div>

                            {/* Two Resolution Paths */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                
                                {/* Path 1: Google Cloud AI Studio Prepayment */}
                                <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between space-y-4">
                                    <div className="space-y-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                                            1
                                        </div>
                                        <h4 className="text-sm font-bold text-white">
                                            {isKa ? 'Google AI Studio კრედიტების შევსება' : 'Recharge Google AI Studio Prepayment'}
                                        </h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            {isKa
                                                ? 'შედით Google AI Studio-ში, აირჩიეთ პროექტი WMDA და დაამატეთ მინიმალური კრედიტი ($5 - $10). გასაღები მყისიერად ამოქმედდება.'
                                                : 'Go to Google AI Studio, select project WMDA, and add prepayment credits ($5 - $10 minimum). Your existing key will activate immediately.'}
                                        </p>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <a
                                            href="https://ai.studio/projects"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            {isKa ? 'ai.studio/projects გახსნა' : 'Open ai.studio/projects'}
                                        </a>
                                        <a
                                            href="https://console.cloud.google.com/billing"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs transition-colors"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            {isKa ? 'Google Cloud Billing კონსოლი' : 'Google Cloud Billing Console'}
                                        </a>
                                    </div>
                                </div>

                                {/* Path 2: Free Tier Key without Billing Link */}
                                <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between space-y-4">
                                    <div className="space-y-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                                            2
                                        </div>
                                        <h4 className="text-sm font-bold text-white">
                                            {isKa ? 'ახალი უფასო გასაღების გენერირება (Free Tier)' : 'Create 100% Free Tier Key'}
                                        </h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            {isKa
                                                ? 'შექმენით გასაღები ახალ, ცალკე პროექტში ბილინგის მიბმის გარეშე. Google გაძლევთ 15 მოთხოვნას/წუთში სრულიად უფასოდ!'
                                                : 'Generate a new API key without attaching a Google Cloud billing account. Gemini 3.8 Flash includes 15 requests per minute free.'}
                                        </p>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <a
                                            href="https://aistudio.google.com/apikey"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors"
                                        >
                                            <Key className="w-4 h-4" />
                                            {isKa ? 'უფასო გასაღების აღება (aistudio.google.com)' : 'Get Free Key at aistudio.google.com'}
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Path 3: AgriMap Platform AI Packs */}
                            <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">
                                                {isKa ? 'AgriMap Pro პლატფორმის ტოკენები & გამოწერა' : 'AgriMap Pro In-App Token Packs & Unlimited AI'}
                                            </h4>
                                            <p className="text-xs text-slate-400">
                                                {isKa ? 'გამოიყენეთ პლატფორმის მართული სერვერი თქვენი პირადი გასაღების გარეშე' : 'Use platform-managed cloud intelligence without managing personal API keys'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            onClose();
                                            triggerAiTopUpModal();
                                        }}
                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                                    >
                                        {isKa ? 'პაკეტების ყიდვა' : 'Purchase AI Pack'}
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                                        <div className="text-slate-400">Micro Pack</div>
                                        <div className="text-white font-bold">30 Queries</div>
                                        <div className="text-emerald-400 font-mono">6 GEL</div>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                                        <div className="text-slate-400">Standard Pack</div>
                                        <div className="text-white font-bold">100 Queries</div>
                                        <div className="text-emerald-400 font-mono">18 GEL</div>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                                        <div className="text-slate-400">Pro Plantation</div>
                                        <div className="text-white font-bold">500 Queries</div>
                                        <div className="text-emerald-400 font-mono">75 GEL</div>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-emerald-500/30 bg-emerald-500/5">
                                        <div className="text-emerald-300 font-medium">Premium Unlimited</div>
                                        <div className="text-white font-bold">Unlimited</div>
                                        <div className="text-emerald-400 font-mono">300 GEL/mo</div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>{isKa ? '256-ბიტიანი სერვერული პროქსი (process.env.GEMINI_API_KEY)' : 'Server-side proxy active (process.env.GEMINI_API_KEY)'}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                    >
                        {isKa ? 'დახურვა' : 'Close'}
                    </button>
                </div>

            </div>
        </div>
    );
};
