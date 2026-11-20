import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X, BookOpen, CheckCircle2, ArrowRight, MessageSquare,
    Image as ImageIcon, ZoomIn, Sliders, ExternalLink
} from 'lucide-react';
import type { AppMode } from '../../types';
import { ROOT_MANUAL_SOPS, RootManualSopItem } from '../../data/rootManualSopData';
import { getCustomSopSvgScreenshot } from './RootDocsSopManual';

interface ModuleSopGuideModalProps {
    isOpen: boolean;
    sopId: string | null;
    moduleTitle?: string;
    moduleIcon?: React.ReactNode;
    moduleColor?: string;
    language: string;
    onClose: () => void;
    onOpenModule: (mode: AppMode) => void;
    onOpenFullSopManual: (sopId: string) => void;
    onAskAiGuide: (prompt: string) => void;
}

export const MODULE_TO_SOP_ID: Record<string, string> = {
    profile: 'sop-mod-02',
    guide: 'sop-sys-00',
    design: 'sop-mod-04',
    founders: 'sop-mod-03',
    harvesting: 'sop-mod-07',
    stock: 'sop-mod-08',
    accounting: 'sop-mod-10',
    tools: 'sop-mod-09',
    marketplace: 'sop-mod-11',
    agronomy: 'sop-mod-05',
    tasks: 'sop-mod-06',
    ai: 'sop-mod-12',
    dashboard: 'sop-mod-01',
    admin: 'sop-mod-15',
};

export const ModuleSopGuideModal: React.FC<ModuleSopGuideModalProps> = ({
    isOpen,
    sopId,
    moduleTitle,
    moduleIcon,
    moduleColor = 'from-teal-600 to-emerald-600 text-white',
    language,
    onClose,
    onOpenModule,
    onOpenFullSopManual,
    onAskAiGuide,
}) => {
    const isKa = language === 'ka';
    const [zoomedImg, setZoomedImg] = useState<string | null>(null);

    const sop: RootManualSopItem | undefined = sopId
        ? ROOT_MANUAL_SOPS.find(s => s.id === sopId)
        : undefined;

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (zoomedImg) setZoomedImg(null);
                else onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, zoomedImg, onClose]);

    if (!isOpen || !sop) return null;

    const title = isKa ? sop.titleKa : sop.titleEn;
    const purpose = isKa ? sop.purposeKa : sop.purposeEn;
    const options = isKa ? sop.optionsKa : sop.optionsEn;
    const steps = isKa ? sop.stepsKa : sop.stepsEn;
    const screenshotSrc = getCustomSopSvgScreenshot(sop);

    const modalContent = (
        <div
            className="fixed inset-0 z-[9200] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div
                className="w-[min(52rem,calc(100vw-1rem))] max-h-[calc(100dvh-1.25rem)] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Pinned Header with Always-Visible Close Button */}
                <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0 border-b border-slate-800">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${moduleColor} flex items-center justify-center shadow-sm shrink-0`}>
                            {moduleIcon || <BookOpen className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 font-bold">
                                <span>{sop.code}</span>
                                <span aria-hidden="true">·</span>
                                <span className="truncate text-slate-400 font-sans font-semibold">
                                    {moduleTitle || sop.category}
                                </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-black text-white leading-snug truncate">
                                {title}
                            </h3>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        aria-label={isKa ? 'დახურვა' : 'Close SOP Guide'}
                        title={isKa ? 'დახურვა (Esc)' : 'Close (Esc)'}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/70">
                    {/* Visual Screen Guide / Screenshot */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                        <div className="px-4 py-2.5 bg-slate-900/95 text-white flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs font-bold">
                                <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>{isKa ? 'ვიზუალური ეკრანის გზამკვლევი (სქრინშოთი)' : 'Visual Screen Guide & Interface Map'}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setZoomedImg(screenshotSrc)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 text-[11px] font-bold text-slate-200 hover:text-white flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                            >
                                <ZoomIn className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{isKa ? 'გადიდება' : 'Zoom'}</span>
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => setZoomedImg(screenshotSrc)}
                            className="w-full block bg-slate-950 p-2 sm:p-3 group cursor-zoom-in focus:outline-none"
                        >
                            <img
                                src={screenshotSrc}
                                alt={title}
                                referrerPolicy="no-referrer"
                                className="w-full max-h-[260px] sm:max-h-[300px] object-contain mx-auto rounded-xl transition-transform duration-200 group-hover:scale-[1.01]"
                            />
                        </button>
                    </div>

                    {/* Purpose */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4">
                        <div className="text-[11px] font-bold text-slate-500 mb-1">
                            {isKa ? 'მოდულის დანიშნულება' : 'Module Purpose & Scope'}
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                            {purpose}
                        </p>
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                            <span className="font-semibold text-slate-600">{isKa ? 'როლები:' : 'Roles:'}</span>
                            {sop.roles.map((role, idx) => (
                                <React.Fragment key={role}>
                                    {idx > 0 && <span aria-hidden="true">·</span>}
                                    <span className="capitalize">{role}</span>
                                </React.Fragment>
                            ))}
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-[11px] text-slate-400">{sop.sourceDoc}</span>
                        </div>
                    </div>

                    {/* Controls & Options */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-800 mb-3">
                            <Sliders className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>{isKa ? 'მოდულის პარამეტრები და ფუნქციები' : 'Available Controls & Options'}</span>
                        </div>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {options.map((opt, idx) => (
                                <li
                                    key={idx}
                                    className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                    <span className="leading-snug font-medium">{opt}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Step-by-Step SOP Procedure */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-800 mb-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{isKa ? 'ნაბიჯ-ნაბიჯ შესრულების ინსტრუქცია (SOP)' : 'Step-by-Step Standard Operating Procedure (SOP)'}</span>
                        </div>
                        <ol className="space-y-2.5">
                            {steps.map((step, idx) => (
                                <li
                                    key={idx}
                                    className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/40 border border-emerald-100/80"
                                >
                                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-black font-mono tabular-nums flex items-center justify-center shrink-0">
                                        {idx + 1}
                                    </span>
                                    <span className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                                        {step}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>

                {/* Pinned Action Footer */}
                <div className="px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onAskAiGuide(
                                    isKa
                                        ? `ამიხსენი დეტალურად როგორ გამოვიყენო "${title}" (${sop.code})`
                                        : `Give me a practical walkthrough for "${title}" (${sop.code})`
                                );
                            }}
                            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <MessageSquare className="w-4 h-4 shrink-0" />
                            <span>{isKa ? 'ჰკითხე AI გზამკვლევს' : 'Ask AI Guide'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onOpenFullSopManual(sop.id);
                            }}
                            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span>{isKa ? 'სრული SOP სახელმძღვანელო' : 'Full SOP Manual'}</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onOpenModule(sop.moduleMode);
                        }}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer ml-auto"
                    >
                        <span>{isKa ? 'მოდულის გახსნა' : 'Open Module'}</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                </div>
            </div>

            {/* Fullscreen Zoomed Screenshot Lightbox */}
            {zoomedImg && (
                <div
                    className="fixed inset-0 z-[9600] bg-slate-950/92 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
                    onClick={() => setZoomedImg(null)}
                >
                    <div
                        className="relative w-full max-w-4xl max-h-[calc(100dvh-2rem)] bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-200 truncate">
                                {sop.code} · {title}
                            </span>
                            <button
                                type="button"
                                onClick={() => setZoomedImg(null)}
                                className="min-w-[38px] min-h-[38px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center cursor-pointer shrink-0"
                                aria-label="Close zoom preview"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-3 sm:p-5 overflow-auto flex-1 flex items-center justify-center bg-slate-950">
                            <img
                                src={zoomedImg}
                                alt={title}
                                referrerPolicy="no-referrer"
                                className="max-w-full max-h-[75dvh] object-contain rounded-xl"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
