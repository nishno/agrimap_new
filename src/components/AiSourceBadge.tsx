import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Server, Info, AlertTriangle, ArrowRight, X, ExternalLink, CreditCard, Key } from 'lucide-react';
import { openAiManagementConsole } from '../services/geminiService';

export interface AiSourceBadgeProps {
    source?: 'cloud' | 'local';
    isLocal?: boolean;
    reason?: string;
    code?: number | string;
    modelUsed?: string;
    className?: string;
    compact?: boolean;
    notice?: any;
    isKa?: boolean;
    onOpenConsole?: () => void;
}

export const AiSourceBadge: React.FC<AiSourceBadgeProps> = ({
    source = 'cloud',
    isLocal = false,
    reason,
    code,
    modelUsed,
    className = '',
    compact = false,
    notice,
    isKa = false,
    onOpenConsole
}) => {
    const isActuallyLocal = isLocal || source === 'local' || modelUsed === 'autonomous-agri-core';
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const resolvedReason = reason || notice?.message || (
        code === 402 || notice?.code === 402
            ? (isKa ? 'Google AI Studio: წინასწარ გადახდილი კრედიტები ამოწურულია ($0)' : 'Google AI Studio: Prepayment credits depleted ($0 balance)')
            : code === 429 || notice?.code === 429
            ? (isKa ? 'Gemini მოთხოვნების ან ტარიფის ლიმიტი ამოიწურა (429)' : 'Gemini quota or rate limit exceeded (HTTP 429)')
            : code === 400 || notice?.code === 400
            ? (isKa ? 'არასწორი ან ვადაგასული Gemini API გასაღები (400)' : 'Invalid or expired Gemini API key (HTTP 400)')
            : code === 'INSUFFICIENT_TOKENS'
            ? (isKa ? 'არასაკმარისი AI ტოკენები (თვიური ლიმიტი ამოწურულია)' : 'Insufficient AI tokens (monthly allowance depleted)')
            : (isKa ? 'ღრუბლოვანი AI მიუწვდომელია — პასუხი მოწოდებულია ადგილობრივი ბირთვიდან' : 'Cloud AI gateway offline / depleted — answered via Autonomous Local Engine')
    );

    const handleOpenConsole = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsOpen(false);
        if (onOpenConsole) {
            onOpenConsole();
        } else {
            const targetTab = (code === 'INSUFFICIENT_TOKENS' || resolvedReason.toLowerCase().includes('token')) ? 'billing' : 'diagnostics';
            openAiManagementConsole({ tab: targetTab, reason: resolvedReason, notice });
        }
    };

    if (isActuallyLocal) {
        return (
            <div 
                ref={popoverRef} 
                className={`relative inline-block ${className}`}
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
            >
                {/* Identification Box "AI Local" with amber styling */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer select-none shadow-xs border ${
                        isOpen
                            ? 'bg-amber-200 text-amber-950 border-amber-400 ring-2 ring-amber-400/40'
                            : 'bg-amber-100/90 hover:bg-amber-200 text-amber-900 border-amber-300/80 hover:border-amber-400'
                    }`}
                    title={isKa ? "დააწკაპუნეთ ან გადაატარეთ მიზეზის გასაგებად" : "Hover or click to view why Local AI answered"}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <Server className="w-3 h-3 text-amber-700" />
                    <span>AI Local</span>
                    <Info className="w-2.5 h-2.5 text-amber-600 opacity-70" />
                </button>

                {/* Explanatory Popover with Blinking Forwarding Button */}
                {isOpen && (
                    <div 
                        className="absolute z-50 bottom-full mb-2 left-0 sm:left-auto sm:right-0 w-80 sm:w-96 p-4 rounded-2xl bg-white border-2 border-amber-400 shadow-2xl text-slate-800 text-xs animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-100">
                            <div className="flex items-center gap-2">
                                <span className="p-1 rounded-md bg-amber-100 text-amber-800">
                                    <AlertTriangle className="w-4 h-4" />
                                </span>
                                <div>
                                    <h4 className="font-black text-amber-950 text-xs tracking-tight">
                                        {isKa ? 'პასუხი მოწოდებულია Local AI-ით' : 'Answered by Local Knowledge AI'}
                                    </h4>
                                    <span className="text-[9px] font-bold text-amber-700 uppercase tracking-widest">
                                        {modelUsed || 'Autonomous Agronomic Core'}
                                    </span>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setIsOpen(false)} 
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Explanation Reason Body */}
                        <div className="space-y-2 text-slate-700 text-[11px] leading-relaxed">
                            <p>
                                {isKa ? (
                                    <>თქვენ მიიღეთ ეს პასუხი <strong>ადგილობრივი AI ცოდნის ბაზიდან</strong>, რადგან ფასიანი ღრუბლოვანი AI (Gemini 3.8 Flash) დროებით მიუწვდომელია:</>
                                ) : (
                                    <>You have received this answer with <strong>Local AI</strong> instead of paid Cloud AI because of the following detected reason:</>
                                )}
                            </p>

                            {/* Specific Reason Box */}
                            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold flex items-start gap-2">
                                <span className="text-amber-600 mt-0.5">⚡</span>
                                <div className="leading-snug">
                                    <span className="font-black text-amber-900 block text-[10px] uppercase tracking-wider">
                                        {isKa ? 'მიზეზი:' : 'Root Cause:'}
                                    </span>
                                    {resolvedReason}
                                </div>
                            </div>

                            <p className="text-[10px] text-slate-500">
                                {isKa 
                                    ? 'სრული ფუნქციონალის აღსადგენად გახსენით AI მართვის კონსოლი, სადაც შეგიძლიათ შეცდომის გაანალიზება, ბარათით ტოკენების შევსება ან გამოწერის გააქტიურება.'
                                    : 'To restore live Cloud AI reasoning, open the AI Management Console to analyze diagnostics, update keys, or top up with card.'}
                            </p>
                        </div>

                        {/* BLINKING FORWARDING BUTTON */}
                        <button
                            type="button"
                            onClick={handleOpenConsole}
                            className="w-full mt-3 py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all animate-pulse hover:scale-[1.02] active:scale-95"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isKa ? '⚡ AI მართვის კონსოლის გახსნა →' : '⚡ Open AI Management Console →'}</span>
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Cloud AI Badge
    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs select-none ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>{compact ? 'Cloud AI' : 'Cloud AI • Gemini 3.8'}</span>
        </div>
    );
};

export default AiSourceBadge;
