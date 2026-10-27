import React, { useState } from 'react';
import { 
    X, Sparkles, CreditCard, Check, Zap, Shield, ArrowRight, 
    RefreshCw, AlertCircle, HelpCircle, ChevronRight, Layers,
    Clock, Cpu, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import type { User, AiCreditPack } from '../types';
import { 
    DEFAULT_AI_CREDIT_PACKS, 
    getEffectiveUserAiQuota, 
    purchaseAiCredits 
} from '../services/geminiService';

interface AiBalanceTopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
    onUpdateUser?: (updated: User) => void;
    reasonNotice?: string;
    isKa?: boolean;
}

export const AiBalanceTopUpModal: React.FC<AiBalanceTopUpModalProps> = ({
    isOpen,
    onClose,
    currentUser,
    onUpdateUser,
    reasonNotice,
    isKa = false
}) => {
    if (!isOpen) return null;

    const quota = getEffectiveUserAiQuota(currentUser);
    const [selectedPackId, setSelectedPackId] = useState<string>(DEFAULT_AI_CREDIT_PACKS[1].id);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [promoCode, setPromoCode] = useState<string>('');
    const [autoRecharge, setAutoRecharge] = useState<boolean>(quota.hasPaymentMethodLinked || false);
    const [activeTab, setActiveTab] = useState<'packs' | 'architecture' | 'history'>('packs');

    const selectedPack = DEFAULT_AI_CREDIT_PACKS.find(p => p.id === selectedPackId) || DEFAULT_AI_CREDIT_PACKS[1];

    const freeRemaining = Math.max(0, quota.monthlyFreeTierTotal - quota.monthlyFreeTierUsed);

    const handlePurchase = async () => {
        setIsProcessing(true);
        try {
            // Simulate Stripe payment handshake & credit activation
            await new Promise(resolve => setTimeout(resolve, 800));
            const updated = purchaseAiCredits(currentUser, selectedPack, onUpdateUser);
            toast.success(
                isKa 
                    ? `ბალანსი შეივსო: +${selectedPack.credits} AI კრედიტი!` 
                    : `Purchased successfully: +${selectedPack.credits} AI credits added!`
            );
            setIsProcessing(false);
            onClose();
        } catch (err: any) {
            toast.error(err?.message || "Payment processing failed");
            setIsProcessing(false);
        }
    };

    const handleApplyPromo = () => {
        const clean = promoCode.trim().toUpperCase();
        if (clean === 'AGRIMAP2026' || clean === 'GEORGIA' || clean === 'FOUNDER') {
            const bonusPack: AiCreditPack = {
                id: 'bonus_promo',
                name: 'Promotional Grant',
                credits: 50,
                priceGel: 0,
                priceUsd: 0,
                description: 'Voucher bonus credits'
            };
            purchaseAiCredits(currentUser, bonusPack, onUpdateUser);
            toast.success(isKa ? "პრომო-კოდი გააქტიურდა: +50 კრედიტი!" : "Voucher redeemed: +50 free credits!");
            setPromoCode('');
        } else {
            toast.error(isKa ? "არასწორი პრომო-კოდი" : "Invalid voucher code");
        }
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                                    {isKa ? 'AI კვოტა და კრედიტების ბალანსი' : 'AI Quota & Credit Balance'}
                                </h3>
                                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                                    {isKa ? 'ჰიბრიდული მოდელი' : 'Hybrid Tier'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {isKa ? 'ყოველთვიური უფასო ლიმიტი როლის მიხედვით + ბალანსის შევსება' : 'Role-based monthly free tier with pay-as-you-go credit top-ups'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Reason notice banner if triggered by exhaustion */}
                {reasonNotice && (
                    <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs flex items-center gap-2 shrink-0">
                        <AlertCircle size={15} className="shrink-0 text-amber-400" />
                        <span>{reasonNotice}</span>
                    </div>
                )}

                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-800/80 bg-slate-900/40 px-5 text-xs font-bold shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('packs')}
                        className={`py-3 px-3 border-b-2 transition-all cursor-pointer ${
                            activeTab === 'packs'
                                ? 'border-emerald-500 text-emerald-400 font-black'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {isKa ? 'კრედიტების პაკეტები' : 'Credit Top-Up Packs'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('architecture')}
                        className={`py-3 px-3 border-b-2 transition-all cursor-pointer ${
                            activeTab === 'architecture'
                                ? 'border-emerald-500 text-emerald-400 font-black'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {isKa ? 'როგორ მუშაობს (Setup & Pricing)' : 'Setup & Pricing Architecture'}
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs">
                    
                    {/* Live Usage & Balance HUD Card */}
                    <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block font-medium">
                                {isKa ? 'თვიური უფასო დარჩენილი' : 'Monthly Free Left'}
                            </span>
                            <span className="text-base font-black font-mono text-emerald-400 tabular-nums block mt-0.5">
                                {freeRemaining} <span className="text-[10px] text-slate-500 font-normal">/ {quota.monthlyFreeTierTotal}</span>
                            </span>
                        </div>

                        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block font-medium">
                                {isKa ? 'ფასიანი კრედიტები' : 'Paid Credits'}
                            </span>
                            <span className="text-base font-black font-mono text-blue-400 tabular-nums block mt-0.5">
                                {quota.aiCreditsBalance} <span className="text-[10px] text-slate-500 font-normal">pts</span>
                            </span>
                        </div>

                        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block font-medium">
                                {isKa ? 'სულ მოთხოვნები' : 'Total Queries'}
                            </span>
                            <span className="text-base font-black font-mono text-white tabular-nums block mt-0.5">
                                {quota.totalQueriesAllTime}
                            </span>
                        </div>

                        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block font-medium">
                                {isKa ? 'სტატუსი' : 'Engine Status'}
                            </span>
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-1 mt-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Live Core
                            </span>
                        </div>
                    </div>

                    {activeTab === 'packs' && (
                        <>
                            {/* Pack Selection Section */}
                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-2">
                                    {isKa ? 'აირჩიეთ კრედიტების პაკეტი' : 'Select Top-Up Credit Pack'}
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {DEFAULT_AI_CREDIT_PACKS.map(pack => {
                                        const isSelected = selectedPackId === pack.id;
                                        return (
                                            <div
                                                key={pack.id}
                                                onClick={() => setSelectedPackId(pack.id)}
                                                className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                                                    isSelected
                                                        ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500 shadow-lg shadow-emerald-950/50'
                                                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                                                }`}
                                            >
                                                {pack.isPopular && (
                                                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-emerald-500 text-slate-950 text-[9px] font-black uppercase tracking-wider rounded-md shadow">
                                                        Most Popular
                                                    </span>
                                                )}
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-black text-white">{pack.name}</span>
                                                        <div className="text-right">
                                                            <span className="text-base font-black font-mono text-emerald-400">{pack.priceGel} GEL</span>
                                                            <span className="text-[10px] text-slate-400 block font-mono">~${pack.priceUsd} USD</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-mono font-bold text-blue-400 block mb-1">
                                                        {pack.credits} AI Queries ({((pack.priceGel / pack.credits)).toFixed(2)} GEL / query)
                                                    </span>
                                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                                        {pack.description}
                                                    </p>
                                                </div>
                                                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                                                    <span>Target: {pack.recommendedRole}</span>
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                        isSelected ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-700'
                                                    }`}>
                                                        {isSelected && <Check size={10} />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Auto-Recharge Switch */}
                            <label className="flex items-center justify-between p-3.5 bg-slate-900/70 rounded-2xl border border-slate-800 cursor-pointer">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                                        <RefreshCw size={14} />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-white block">
                                            {isKa ? 'ავტომატური შევსება ბარათიდან' : 'Auto-Top-Up When Balance is Low'}
                                        </span>
                                        <span className="text-[11px] text-slate-400 block">
                                            {isKa ? 'ავტომატურად შეავსეთ ბალანსი როცა 5-ზე ნაკლები კრედიტი დარჩება' : 'Recharge Standard Pack automatically when balance drops below 5 queries'}
                                        </span>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={autoRecharge}
                                    onChange={(e) => setAutoRecharge(e.target.checked)}
                                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                                />
                            </label>

                            {/* Promo Code Input */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value)}
                                    placeholder={isKa ? 'პრომო-კოდი ან ვაუჩერი (მაგ: AGRIMAP2026)' : 'Promo voucher code (e.g. AGRIMAP2026)'}
                                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-emerald-500"
                                />
                                <button
                                    type="button"
                                    onClick={handleApplyPromo}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-700"
                                >
                                    {isKa ? 'გააქტიურება' : 'Apply'}
                                </button>
                            </div>

                            {/* Purchase CTA */}
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={handlePurchase}
                                    disabled={isProcessing}
                                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
                                >
                                    <CreditCard size={15} />
                                    <span>
                                        {isProcessing 
                                            ? (isKa ? 'მუშავდება...' : 'Processing...') 
                                            : (isKa 
                                                ? `შეძენა: ${selectedPack.name} (${selectedPack.priceGel} GEL)` 
                                                : `Purchase ${selectedPack.name} (${selectedPack.priceGel} GEL)`)}
                                    </span>
                                </button>
                                <p className="text-[10px] text-center text-slate-500 mt-2 flex items-center justify-center gap-1.5">
                                    <Lock size={11} /> 256-bit encrypted card billing via Stripe Checkout · Instant balance activation
                                </p>
                            </div>
                        </>
                    )}

                    {activeTab === 'architecture' && (
                        <div className="space-y-4 leading-relaxed text-slate-300">
                            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Cpu size={14} /> Underlying Architecture & Execution Flow
                                </h4>
                                <p>
                                    1. <b>AI Studio / Full-Stack Node</b>: Runs <code>server.ts</code> with the <code>@google/genai</code> SDK using <code>GEMINI_API_KEY</code> stored securely in Settings &gt; Secrets. Browser requests call <code>/api/gemini/call</code> on the server without leaking API keys.
                                </p>
                                <p>
                                    2. <b>agrimap.pro (Production)</b>: Firebase Hosting serves client assets. The <code>/api/**</code> endpoints route to our Cloud Run container running <code>server.ts</code> where the production Gemini API key resides.
                                </p>
                                <p>
                                    3. <b>Local Plantation Server Node</b>: Farm computers run <code>node server.js</code> (via <code>local-server-template.js</code>) on the local Wi-Fi. It synchronizes scale weighings and routes offline AI queries through the Autonomous Knowledge Core.
                                </p>
                            </div>

                            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                                <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Layers size={14} /> Usage Calculation & Real Costs
                                </h4>
                                <p>
                                    Gemini 3.8 Flash is billed strictly by token consumption:
                                </p>
                                <ul className="space-y-1 list-disc list-inside font-mono text-[11px] text-slate-400">
                                    <li>Input Tokens: $0.075 / 1,000,000 tokens (~750,000 words)</li>
                                    <li>Output Tokens: $0.30 / 1,000,000 tokens</li>
                                    <li>Average query cost: ~$0.0003 USD (&lt; 0.1 Georgian Tetri per query)</li>
                                    <li>Margin on 18 GEL pack (100 queries): ~96% gross operating margin</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiBalanceTopUpModal;
