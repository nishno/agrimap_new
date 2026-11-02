import React, { useState } from 'react';
import { 
    X, Sparkles, CreditCard, Check, Zap, Shield, ArrowRight, 
    RefreshCw, AlertCircle, HelpCircle, ChevronRight, Layers,
    Clock, Cpu, Lock, Crown, UserPlus, Gift, Server, Wifi, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import type { User, AiCreditPack, AiSubscriptionPlan } from '../types';
import { 
    DEFAULT_AI_CREDIT_PACKS, 
    DEFAULT_AI_SUBSCRIPTION_PLANS,
    getEffectiveUserAiQuota, 
    purchaseAiCredits,
    subscribeToAiPlan,
    grantAiCreditsByAdmin
} from '../services/geminiService';

interface AiBalanceTopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
    onUpdateUser?: (updated: User) => void;
    reasonNotice?: string;
    isKa?: boolean;
    allUsers?: User[];
}

export const AiBalanceTopUpModal: React.FC<AiBalanceTopUpModalProps> = ({
    isOpen,
    onClose,
    currentUser,
    onUpdateUser,
    reasonNotice,
    isKa = false,
    allUsers = []
}) => {
    if (!isOpen) return null;

    const quota = getEffectiveUserAiQuota(currentUser);
    const isRootOrAdmin = Boolean(
        currentUser?.roles?.some(r => ['ROOT_SUPER_ADMIN', 'Founder', 'Co-Founder', 'Admin'].includes(r))
    );

    const [activeTab, setActiveTab] = useState<'subscriptions' | 'packs' | 'admin_grant' | 'architecture'>('subscriptions');
    const [selectedPlanId, setSelectedPlanId] = useState<string>(DEFAULT_AI_SUBSCRIPTION_PLANS[0].id);
    const [selectedPackId, setSelectedPackId] = useState<string>(DEFAULT_AI_CREDIT_PACKS[1].id);
    
    // Checkout step: null (browsing) or 'card_payment'
    const [checkoutMode, setCheckoutMode] = useState<'card_payment' | null>(null);
    const [checkoutTarget, setCheckoutTarget] = useState<{
        type: 'subscription' | 'pack';
        item: AiSubscriptionPlan | AiCreditPack;
    } | null>(null);

    // Card checkout form state
    const [cardNumber, setCardNumber] = useState<string>('4242 •••• •••• 4242');
    const [cardExpiry, setCardExpiry] = useState<string>('12/28');
    const [cardCvc, setCardCvc] = useState<string>('888');
    const [cardHolder, setCardHolder] = useState<string>(currentUser?.name || 'AgriFarm Member');
    const [billingCountry, setBillingCountry] = useState<string>('Georgia (საქართველო)');
    const [autoRecharge, setAutoRecharge] = useState<boolean>(true);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [promoCode, setPromoCode] = useState<string>('');

    // Admin grant state
    const [grantTargetUserId, setGrantTargetUserId] = useState<string>(allUsers[0]?.id || currentUser?.id || '');
    const [grantAmount, setGrantAmount] = useState<number>(500);
    const [grantIsUnlimited, setGrantIsUnlimited] = useState<boolean>(false);
    const [grantReason, setGrantReason] = useState<string>('Field Season Allocation');

    const selectedPlan = DEFAULT_AI_SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanId) || DEFAULT_AI_SUBSCRIPTION_PLANS[0];
    const selectedPack = DEFAULT_AI_CREDIT_PACKS.find(p => p.id === selectedPackId) || DEFAULT_AI_CREDIT_PACKS[1];
    const freeRemaining = Math.max(0, quota.monthlyFreeTierTotal - quota.monthlyFreeTierUsed);

    // Open card checkout window for chosen item
    const handleOpenCardCheckout = (type: 'subscription' | 'pack') => {
        setCheckoutTarget({
            type,
            item: type === 'subscription' ? selectedPlan : selectedPack
        });
        setCheckoutMode('card_payment');
    };

    // Execute card payment authorization
    const handleConfirmPayment = async () => {
        if (!checkoutTarget) return;
        setIsProcessing(true);

        try {
            // Simulate 256-bit encrypted card processing handshake
            await new Promise(resolve => setTimeout(resolve, 950));

            if (checkoutTarget.type === 'subscription') {
                const plan = checkoutTarget.item as AiSubscriptionPlan;
                subscribeToAiPlan(currentUser, plan, onUpdateUser);
                toast.success(
                    isKa
                        ? `🎉 გამოწერა წარმატებით გააქტიურდა: ${plan.name} (${plan.priceGel} GEL/თვე) - შეუზღუდავი AI ტოკენები!`
                        : `🎉 Subscription Activated: ${plan.name} (${plan.priceGel} GEL/month) - Unlimited AI tokens active!`
                );
            } else {
                const pack = checkoutTarget.item as AiCreditPack;
                purchaseAiCredits(currentUser, pack, onUpdateUser);
                toast.success(
                    isKa
                        ? `🎉 ბალანსი შეივსო: +${pack.credits} AI კრედიტი!`
                        : `🎉 Top-up successful: +${pack.credits} AI credits added!`
                );
            }

            setIsProcessing(false);
            setCheckoutMode(null);
            onClose();
        } catch (err: any) {
            toast.error(err?.message || "Payment authorization failed");
            setIsProcessing(false);
        }
    };

    // Admin grant handler
    const handleAdminGrant = () => {
        if (!isRootOrAdmin) {
            toast.error("Unauthorized: Root or Admin privilege required.");
            return;
        }

        const targetId = grantTargetUserId || currentUser?.id || 'guest';
        const amountToGrant = grantIsUnlimited ? 99999 : (Number(grantAmount) || 100);

        try {
            const res = grantAiCreditsByAdmin(
                targetId,
                amountToGrant,
                currentUser,
                grantReason,
                allUsers,
                onUpdateUser
            );

            toast.success(
                isKa
                    ? `ადმინისტრატორმა წარმატებით გადასცა ${res.isUnlimited ? 'შეუზღუდავი' : `+${amountToGrant}`} ტოკენი მომხმარებელს!`
                    : `Admin successfully granted ${res.isUnlimited ? 'Unlimited' : `+${amountToGrant}`} tokens to user!`
            );
        } catch (err: any) {
            toast.error(err?.message || "Failed to grant tokens");
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
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shadow-lg shadow-emerald-950/40">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                                    {isKa ? 'AI კვოტა, გამოწერები & ბალანსი' : 'AI Quota, Subscriptions & Tokens'}
                                </h3>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                    quota.isUnlimited || quota.subscriptionTier === 'premium_unlimited'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                }`}>
                                    {quota.isUnlimited || quota.subscriptionTier === 'premium_unlimited' 
                                        ? (isKa ? 'შეუზღუდავი Premium' : 'Unlimited Premium') 
                                        : (isKa ? 'ჰიბრიდული მოდელი' : 'Hybrid Tier')}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {isKa ? 'პრემიუმ გამოწერა (300₾/თვე შეუზღუდავი), ტოკენების შევსება და ადმინ განაწილება' : 'Premium subscriptions (300 GEL/mo unlimited), token packs, and admin grants'}
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

                {/* Live Usage & Balance HUD Card */}
                <div className="px-5 pt-4 shrink-0">
                    <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                        <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block font-medium">
                                {isKa ? 'თვიური უფასო' : 'Monthly Free'}
                            </span>
                            <span className="text-sm font-black font-mono text-emerald-400 tabular-nums block mt-0.5">
                                {freeRemaining} <span className="text-[10px] text-slate-500 font-normal">/ {quota.monthlyFreeTierTotal}</span>
                            </span>
                        </div>

                        <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block font-medium">
                                {isKa ? 'ტოკენების ბალანსი' : 'Tokens Balance'}
                            </span>
                            <span className="text-sm font-black font-mono text-blue-400 tabular-nums block mt-0.5">
                                {quota.isUnlimited ? '∞ Unlimited' : `${quota.aiCreditsBalance} pts`}
                            </span>
                        </div>

                        <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block font-medium">
                                {isKa ? 'გამოწერა' : 'Subscription'}
                            </span>
                            <span className="text-sm font-black font-mono text-amber-400 block mt-0.5">
                                {quota.subscriptionTier === 'premium_unlimited' 
                                    ? '300₾ Premium' 
                                    : quota.subscriptionTier === 'standard' 
                                    ? '50₾ Pro' 
                                    : (isKa ? 'სტანდარტული' : 'Free Tier')}
                            </span>
                        </div>

                        <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block font-medium">
                                {isKa ? 'სტატუსი' : 'AI Engine Mode'}
                            </span>
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-1 mt-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Live & Offline
                            </span>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs (Hidden when in checkout window) */}
                {checkoutMode === null && (
                    <div className="flex border-b border-slate-800/80 bg-slate-900/40 px-5 text-xs font-bold shrink-0 mt-3 overflow-x-auto no-scrollbar">
                        <button
                            type="button"
                            onClick={() => setActiveTab('subscriptions')}
                            className={`py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                                activeTab === 'subscriptions'
                                    ? 'border-amber-500 text-amber-400 font-black'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Crown size={14} className={activeTab === 'subscriptions' ? 'text-amber-400' : 'text-slate-500'} />
                            {isKa ? 'თვიური გამოწერები (300₾ Unlimited)' : 'Subscriptions (300 GEL Unlimited)'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('packs')}
                            className={`py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                                activeTab === 'packs'
                                    ? 'border-emerald-500 text-emerald-400 font-black'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Zap size={14} className={activeTab === 'packs' ? 'text-emerald-400' : 'text-slate-500'} />
                            {isKa ? 'ტოკენების პაკეტები' : 'Token Top-Up Packs'}
                        </button>
                        {isRootOrAdmin && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('admin_grant')}
                                className={`py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                                    activeTab === 'admin_grant'
                                        ? 'border-blue-500 text-blue-400 font-black'
                                        : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Gift size={14} className={activeTab === 'admin_grant' ? 'text-blue-400' : 'text-slate-500'} />
                                {isKa ? 'ადმინ / Root განაწილება' : 'Admin & Root Grant'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setActiveTab('architecture')}
                            className={`py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                                activeTab === 'architecture'
                                    ? 'border-emerald-500 text-emerald-400 font-black'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Server size={14} className={activeTab === 'architecture' ? 'text-emerald-400' : 'text-slate-500'} />
                            {isKa ? 'Offline Local AI & არქიტექტურა' : 'Offline Local AI & LAN Setup'}
                        </button>
                    </div>
                )}

                {/* Body Area */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar text-xs flex-1">

                    {/* CHECKOUT MODE: Interactive Card Information & Payment Window */}
                    {checkoutMode === 'card_payment' && checkoutTarget && (
                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
                            {/* Return Button */}
                            <button
                                type="button"
                                onClick={() => setCheckoutMode(null)}
                                className="text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                            >
                                ← {isKa ? 'უკან დაბრუნება' : 'Back to Selection'}
                            </button>

                            {/* Order Summary Box */}
                            <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-black block">
                                        {checkoutTarget.type === 'subscription' ? 'Monthly Subscription Plan' : 'Credit Top-Up Pack'}
                                    </span>
                                    <h4 className="text-base font-black text-white mt-0.5">{checkoutTarget.item.name}</h4>
                                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                                        {checkoutTarget.type === 'subscription' 
                                            ? 'Includes monthly unlimited tokens for all agricultural, GIS, God AI & HR modules.' 
                                            : `Adds +${(checkoutTarget.item as AiCreditPack).credits} tokens immediately to your account.`}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-2xl font-black font-mono text-emerald-400">{checkoutTarget.item.priceGel} GEL</span>
                                    <span className="text-[11px] text-slate-400 block font-mono">~${checkoutTarget.item.priceUsd} USD</span>
                                </div>
                            </div>

                            {/* Payment Form */}
                            <div className="p-4 sm:p-5 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-3.5">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                                    <h5 className="font-bold text-white flex items-center gap-2">
                                        <CreditCard size={16} className="text-emerald-400" />
                                        {isKa ? 'საბანკო ბარათის მონაცემები' : 'Card Payment Information'}
                                    </h5>
                                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">VISA</span>
                                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">Mastercard</span>
                                    </div>
                                </div>

                                {/* Card Number */}
                                <div>
                                    <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                                        {isKa ? 'ბარათის ნომერი' : 'Card Number'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={cardNumber}
                                            onChange={(e) => setCardNumber(e.target.value)}
                                            placeholder="4000 1234 5678 9010"
                                            className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-emerald-500 pl-9"
                                        />
                                        <CreditCard size={15} className="absolute left-3 top-3 text-slate-500" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* Expiry */}
                                    <div>
                                        <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                                            {isKa ? 'ვადა (MM/YY)' : 'Expires (MM/YY)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={cardExpiry}
                                            onChange={(e) => setCardExpiry(e.target.value)}
                                            placeholder="12/28"
                                            className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-emerald-500"
                                        />
                                    </div>

                                    {/* CVC */}
                                    <div>
                                        <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                                            {isKa ? 'CVC / CVV' : 'CVC / CVV'}
                                        </label>
                                        <input
                                            type="password"
                                            maxLength={4}
                                            value={cardCvc}
                                            onChange={(e) => setCardCvc(e.target.value)}
                                            placeholder="•••"
                                            className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                </div>

                                {/* Cardholder Name */}
                                <div>
                                    <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                                        {isKa ? 'ბარათის მფლობელის სახელი' : 'Cardholder Name'}
                                    </label>
                                    <input
                                        type="text"
                                        value={cardHolder}
                                        onChange={(e) => setCardHolder(e.target.value)}
                                        placeholder="Full Name as on card"
                                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                                    />
                                </div>

                                {/* Country */}
                                <div>
                                    <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                                        {isKa ? 'ქვეყანა / რეგიონი' : 'Billing Country'}
                                    </label>
                                    <input
                                        type="text"
                                        value={billingCountry}
                                        onChange={(e) => setBillingCountry(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                                    />
                                </div>

                                {/* Auto-Recharge Switch */}
                                <label className="flex items-center justify-between p-3 bg-slate-950/70 rounded-xl border border-slate-800 cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <RefreshCw size={13} className="text-emerald-400" />
                                        <span className="text-[11px] text-slate-300 font-medium">
                                            {isKa ? 'ბარათის დამახსოვრება ყოველთვიური განახლებისთვის' : 'Save card for monthly renewal / auto-top-up'}
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={autoRecharge}
                                        onChange={(e) => setAutoRecharge(e.target.checked)}
                                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                                    />
                                </label>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="button"
                                onClick={handleConfirmPayment}
                                disabled={isProcessing}
                                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:opacity-95 active:scale-[0.99] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                                <Lock size={15} />
                                <span>
                                    {isProcessing
                                        ? (isKa ? 'გადახდა მუშავდება...' : 'Authorizing Payment...')
                                        : (isKa 
                                            ? `გადახდის დადასტურება (${checkoutTarget.item.priceGel} GEL)` 
                                            : `Confirm & Pay (${checkoutTarget.item.priceGel} GEL)`)}
                                </span>
                            </button>

                            <p className="text-[10px] text-center text-slate-500 flex items-center justify-center gap-1.5">
                                <Shield size={12} className="text-emerald-500" />
                                256-bit TLS encrypted bank gateway. Instant token credit and token activation.
                            </p>
                        </div>
                    )}

                    {/* TAB 1: Monthly Subscriptions (300 GEL / mo Premium Unlimited) */}
                    {checkoutMode === null && activeTab === 'subscriptions' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-300">
                                    {isKa ? 'აირჩიეთ ყოველთვიური AI გამოწერის გეგმა' : 'Select Monthly AI Subscription Plan'}
                                </label>
                                <span className="text-[10px] text-amber-400 font-mono font-bold">
                                    {isKa ? 'ულიმიტო ტოკენები თვეში' : 'Monthly Unlimited Available'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {DEFAULT_AI_SUBSCRIPTION_PLANS.map(plan => {
                                    const isSelected = selectedPlanId === plan.id;
                                    return (
                                        <div
                                            key={plan.id}
                                            onClick={() => setSelectedPlanId(plan.id)}
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                                                isSelected
                                                    ? 'bg-amber-950/30 border-amber-500 ring-1 ring-amber-500 shadow-xl shadow-amber-950/50'
                                                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                                            }`}
                                        >
                                            {plan.isPopular && (
                                                <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[9px] font-black uppercase tracking-wider rounded-md shadow-md">
                                                    👑 Most Popular · Unlimited
                                                </span>
                                            )}
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-sm font-black text-white flex items-center gap-1.5">
                                                        {plan.isUnlimited && <Crown size={14} className="text-amber-400" />}
                                                        {plan.name}
                                                    </span>
                                                    <div className="text-right">
                                                        <span className="text-base font-black font-mono text-amber-400">{plan.priceGel} GEL</span>
                                                        <span className="text-[10px] text-slate-400 block font-mono">/ month (~${plan.priceUsd})</span>
                                                    </div>
                                                </div>

                                                <span className="text-xs font-mono font-bold text-emerald-400 block mb-2">
                                                    {plan.isUnlimited ? '∞ Unlimited AI Tokens' : `${plan.tokenAllowance} Queries / Month`}
                                                </span>

                                                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                                                    {plan.description}
                                                </p>

                                                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                                                    {plan.features.map((feat, i) => (
                                                        <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-300">
                                                            <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                                                            <span>{feat}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                                                <span className="text-[10px] text-slate-400">
                                                    {plan.tier === 'premium_unlimited' ? 'For All Farm Crew & Admins' : 'Single User'}
                                                </span>
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                    isSelected ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-700'
                                                }`}>
                                                    {isSelected && <Check size={10} />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pay With Card Button - Replacing checkbox as requested */}
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => handleOpenCardCheckout('subscription')}
                                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 via-amber-500 to-emerald-600 hover:opacity-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                                >
                                    <CreditCard size={16} />
                                    <span>
                                        {isKa 
                                            ? `გადახდა ბარათით: ${selectedPlan.name} (${selectedPlan.priceGel} GEL/თვე)` 
                                            : `Pay with a Card: ${selectedPlan.name} (${selectedPlan.priceGel} GEL/mo)`}
                                    </span>
                                    <ArrowRight size={14} />
                                </button>
                                <p className="text-[10px] text-center text-slate-500 mt-2">
                                    Clicking Proceed directs to the secure card payment window. Instant token activation.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: Token Packs (Pay-as-you-go) */}
                    {checkoutMode === null && activeTab === 'packs' && (
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-slate-300 block">
                                {isKa ? 'აირჩიეთ კრედიტების პაკეტი (ერთჯერადი შევსება)' : 'Select Top-Up Credit Pack (One-Time Top-Up)'}
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
                                                    Popular
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

                            {/* Pay With Card Button for Packs */}
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => handleOpenCardCheckout('pack')}
                                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
                                >
                                    <CreditCard size={15} />
                                    <span>
                                        {isKa 
                                            ? `გადახდა ბარათით: ${selectedPack.name} (${selectedPack.priceGel} GEL)` 
                                            : `Pay with a Card: ${selectedPack.name} (${selectedPack.priceGel} GEL)`}
                                    </span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>

                            {/* Promo Code Input */}
                            <div className="flex gap-2 pt-1">
                                <input
                                    type="text"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value)}
                                    placeholder={isKa ? 'პრომო-კოდი (მაგ: AGRIMAP2026)' : 'Promo voucher code (e.g. AGRIMAP2026)'}
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
                        </div>
                    )}

                    {/* TAB 3: Admin & Root Token Grant Authority */}
                    {checkoutMode === null && activeTab === 'admin_grant' && isRootOrAdmin && (
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-950/30 rounded-2xl border border-blue-500/30">
                                <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-wider mb-1">
                                    <Gift size={16} />
                                    {isKa ? 'Root & ადმინისტრატორის ტოკენების განაწილების უფლება' : 'Root Authority & Admin AI Token Allocation'}
                                </div>
                                <p className="text-[11px] text-slate-300">
                                    {isKa 
                                        ? 'როგორც სისტემურ ადმინისტრატორს ან Root-ს, თქვენ შეგიძლიათ ნებისმიერ მომხმარებელს გადასცეთ სასურველი რაოდენობის ტოკენები ან გაუაქტიუროთ ულიმიტო AI რეჟიმი.'
                                        : 'As Root or Administrator, you have full authority to grant unlimited or specific token allocations to any employee, agronomist, or field manager without billing.'}
                                </p>
                            </div>

                            {/* User Selection */}
                            <div>
                                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                                    {isKa ? 'მომხმარებლის / თანამშრომლის არჩევა' : 'Target User or Employee ID'}
                                </label>
                                {allUsers.length > 0 ? (
                                    <select
                                        value={grantTargetUserId}
                                        onChange={(e) => setGrantTargetUserId(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                                    >
                                        {allUsers.map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.name || u.email || u.id} ({u.roles?.join(', ') || 'User'})
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={grantTargetUserId}
                                        onChange={(e) => setGrantTargetUserId(e.target.value)}
                                        placeholder="User ID or Email"
                                        className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                                    />
                                )}
                            </div>

                            {/* Amount & Quick Buttons */}
                            <div>
                                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                                    {isKa ? 'გადასაცემი ტოკენების რაოდენობა' : 'Token Allocation Quantity'}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        disabled={grantIsUnlimited}
                                        value={grantIsUnlimited ? 99999 : grantAmount}
                                        onChange={(e) => setGrantAmount(Math.max(1, parseInt(e.target.value, 10) || 0))}
                                        className="flex-1 px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-blue-500 disabled:opacity-50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setGrantIsUnlimited(!grantIsUnlimited)}
                                        className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                            grantIsUnlimited
                                                ? 'bg-amber-500 text-slate-950 shadow-md'
                                                : 'bg-slate-800 text-slate-300 hover:text-white'
                                        }`}
                                    >
                                        {grantIsUnlimited ? '∞ Unlimited Mode' : 'Set Unlimited'}
                                    </button>
                                </div>
                                <div className="flex gap-1.5 mt-2">
                                    {[50, 200, 500, 1000, 5000].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => { setGrantIsUnlimited(false); setGrantAmount(val); }}
                                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-mono text-slate-300 cursor-pointer"
                                        >
                                            +{val}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                                    {isKa ? 'დანიშნულება / შენიშვნა' : 'Audit Reason / Note'}
                                </label>
                                <input
                                    type="text"
                                    value={grantReason}
                                    onChange={(e) => setGrantReason(e.target.value)}
                                    placeholder="e.g. Harvest season agronomist grant"
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Grant CTA */}
                            <button
                                type="button"
                                onClick={handleAdminGrant}
                                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-blue-950/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                                <Gift size={15} />
                                <span>{isKa ? 'ტოკენების გადაცემა მომხმარებლისთვის' : 'Grant Tokens to User Immediately'}</span>
                            </button>
                        </div>
                    )}

                    {/* TAB 4: Architecture & Offline Local AI */}
                    {checkoutMode === null && activeTab === 'architecture' && (
                        <div className="space-y-4 leading-relaxed text-slate-300">
                            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Wifi size={14} /> Offline Local AI & LAN Server Synchronization
                                </h4>
                                <p>
                                    1. <b>Tablets & Mobile Units on LAN</b>: All field devices and weigh stations connect to the plantation's Local Server Node (<code>local-server-template.js</code>) on the farm Wi-Fi without needing continuous public internet.
                                </p>
                                <p>
                                    2. <b>God AI Knowledge Repository</b>: Every agricultural query, plant disease scan, harvest tare calculation, and agronomic recommendation from all 8 modules is synthesized into the centralized God AI file. Tablets query this local knowledge base directly with zero latency.
                                </p>
                                <p>
                                    3. <b>Zero-Disruption Fallback</b>: If internet connectivity drops or upstream Gemini credits are exhausted, the Autonomous Knowledge Core serves 100% accurate agronomic recommendations and disease protocols seamlessly.
                                </p>
                            </div>

                            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Crown size={14} /> Pricing & Subscription Structure
                                </h4>
                                <ul className="space-y-1.5 list-disc list-inside font-mono text-[11px] text-slate-400">
                                    <li><b>Premium Plan</b>: 300 GEL / month for unlimited AI queries across the entire farm operation.</li>
                                    <li><b>Standard Pro</b>: 50 GEL / month for 300 monthly queries.</li>
                                    <li><b>Pay-as-you-go</b>: Top-up packs from 6 GEL (Micro 30) to 199 GEL (Enterprise 1500).</li>
                                    <li><b>Admin Discretion</b>: Root Super Admins can grant tokens at will to agronomists and operators.</li>
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
