import React, { useState, useRef, useEffect } from 'react';
import type { DashboardWidget } from '../types';
import { 
    GripVertical, Maximize2, MoveHorizontal, MoveVertical, 
    ArrowUpToLine, ChevronUp, ChevronDown, Check, MoreVertical, EyeOff
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardWidgetCardProps {
    widget: DashboardWidget;
    isDragged?: boolean;
    isDragOver?: boolean;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragOver: (e: React.DragEvent, id: string) => void;
    onDragLeave: (e: React.DragEvent, id: string) => void;
    onDrop: (e: React.DragEvent, id: string) => void;
    onOpenWindow: (widget: DashboardWidget) => void;
    onUpdateDimensions: (id: string, colSpan?: 1 | 2 | 3, heightPx?: number) => void;
    onMoveToTop?: (id: string) => void;
    onMoveStep?: (id: string, direction: 'up' | 'down') => void;
    onHideWidget?: (id: string) => void;
    children: React.ReactNode;
}

export const DashboardWidgetCard: React.FC<DashboardWidgetCardProps> = ({
    widget,
    isDragged,
    isDragOver,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onOpenWindow,
    onUpdateDimensions,
    onMoveToTop,
    onMoveStep,
    onHideWidget,
    children
}) => {
    const { t, language } = useLanguage();
    const isKa = language === 'ka';
    const cardRef = useRef<HTMLDivElement>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [activeHandle, setActiveHandle] = useState<'left' | 'right' | 'bottom' | 'top' | 'corner' | null>(null);

    // Current dimensions
    const colSpan = widget.colSpan || 1;
    const heightPx = widget.heightPx;

    // Determine Tailwind grid column span classes
    const colSpanClass = 
        colSpan === 3 ? 'sm:col-span-2 lg:col-span-3' :
        colSpan === 2 ? 'sm:col-span-2 lg:col-span-2' :
        'col-span-1';

    // Live Resize Drag Handling for Edges
    const handlePointerDown = (
        e: React.PointerEvent, 
        edge: 'left' | 'right' | 'bottom' | 'top' | 'corner'
    ) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        setActiveHandle(edge);

        const startX = e.clientX;
        const startY = e.clientY;
        const startColSpan = colSpan;
        const startHeight = cardRef.current ? cardRef.current.offsetHeight : (heightPx || 340);

        let latestColSpan: 1 | 2 | 3 = startColSpan;
        let latestHeight: number = startHeight;

        const onPointerMove = (moveEv: PointerEvent) => {
            const deltaX = moveEv.clientX - startX;
            const deltaY = moveEv.clientY - startY;

            // Handle horizontal resizing (Right / Left edges & Corner)
            if (edge === 'right' || edge === 'corner') {
                if (deltaX > 140) {
                    latestColSpan = Math.min(3, startColSpan + 2) as 1 | 2 | 3;
                } else if (deltaX > 60) {
                    latestColSpan = Math.min(3, startColSpan + 1) as 1 | 2 | 3;
                } else if (deltaX < -140) {
                    latestColSpan = Math.max(1, startColSpan - 2) as 1 | 2 | 3;
                } else if (deltaX < -60) {
                    latestColSpan = Math.max(1, startColSpan - 1) as 1 | 2 | 3;
                }
            } else if (edge === 'left') {
                if (deltaX < -140) {
                    latestColSpan = Math.min(3, startColSpan + 2) as 1 | 2 | 3;
                } else if (deltaX < -60) {
                    latestColSpan = Math.min(3, startColSpan + 1) as 1 | 2 | 3;
                } else if (deltaX > 140) {
                    latestColSpan = Math.max(1, startColSpan - 2) as 1 | 2 | 3;
                } else if (deltaX > 60) {
                    latestColSpan = Math.max(1, startColSpan - 1) as 1 | 2 | 3;
                }
            }

            // Handle vertical resizing (Bottom / Top edges & Corner)
            if (edge === 'bottom' || edge === 'corner') {
                const newH = Math.max(220, Math.min(900, startHeight + deltaY));
                latestHeight = Math.round(newH);
                if (cardRef.current) {
                    cardRef.current.style.minHeight = `${latestHeight}px`;
                }
            } else if (edge === 'top') {
                const newH = Math.max(220, Math.min(900, startHeight - deltaY));
                latestHeight = Math.round(newH);
                if (cardRef.current) {
                    cardRef.current.style.minHeight = `${latestHeight}px`;
                }
            }
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            setIsResizing(false);
            setActiveHandle(null);
            onUpdateDimensions(widget.id, latestColSpan, latestHeight);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // Quick click on side arrow toggles column width
    const handleSideClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const nextColSpan = (colSpan % 3 + 1) as 1 | 2 | 3;
        onUpdateDimensions(widget.id, nextColSpan, heightPx);
    };

    // Quick click on vertical arrow toggles height preset
    const handleVerticalClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const currentH = heightPx || 340;
        let nextH = 340;
        if (currentH < 300) nextH = 380;
        else if (currentH < 440) nextH = 540;
        else nextH = 260;
        onUpdateDimensions(widget.id, colSpan, nextH);
    };

    return (
        <div
            ref={cardRef}
            id={`dashboard-widget-${widget.id}`}
            draggable={false}
            onDragOver={(e) => onDragOver(e, widget.id)}
            onDragLeave={(e) => onDragLeave(e, widget.id)}
            onDrop={(e) => onDrop(e, widget.id)}
            style={{ minHeight: heightPx ? `${heightPx}px` : undefined }}
            className={`relative group/card transition-all duration-200 flex flex-col ${colSpanClass} ${
                isDragged ? 'opacity-30 scale-[0.98]' : ''
            } ${
                isDragOver ? 'ring-4 ring-indigo-500 ring-offset-4 rounded-[2.6rem] scale-[1.01]' : ''
            }`}
        >
            {/* INLINE TOP-RIGHT MICRO-CONTROLS (ALWAYS VISIBLE & TOUCH FRIENDLY ON TABLETS & PHONES) */}
            <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-30 flex items-center gap-1 bg-white/95 hover:bg-white backdrop-blur-md px-1.5 py-1 rounded-2xl shadow-md border border-slate-200/90 transition-opacity opacity-90 lg:opacity-0 lg:group-hover/card:opacity-100 touch-manipulation">
                {/* One-Tap Move Up for Tablets & Mobile */}
                {onMoveStep && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveStep(widget.id, 'up');
                        }}
                        title={t('dash.card.move_up') || 'Move Up'}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 active:bg-indigo-100 transition-colors cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
                    >
                        <ChevronUp size={14} />
                    </button>
                )}

                {/* One-Tap Move Down for Tablets & Mobile */}
                {onMoveStep && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveStep(widget.id, 'down');
                        }}
                        title={t('dash.card.move_down') || 'Move Down'}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 active:bg-indigo-100 transition-colors cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
                    >
                        <ChevronDown size={14} />
                    </button>
                )}

                {/* Drag Handle to Move & Reorder on Desktop */}
                <button
                    type="button"
                    draggable
                    onDragStart={(e) => onDragStart(e, widget.id)}
                    title={t('dash.card.drag_to_move')}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 cursor-grab active:cursor-grabbing transition-colors hidden sm:flex items-center justify-center"
                >
                    <GripVertical size={13} />
                </button>

                {/* Move / Order Quick Options Menu */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(prev => !prev);
                        }}
                        title={t('dash.card.move_top')}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
                    >
                        <MoreVertical size={14} />
                    </button>
                    {isMenuOpen && (
                        <>
                            {/* Touch backdrop to close menu cleanly */}
                            <div 
                                className="fixed inset-0 z-40 bg-transparent" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen(false);
                                }} 
                            />
                            <div 
                                className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-2xl border border-slate-200 p-1.5 z-50 text-slate-700 text-xs font-bold animate-in fade-in zoom-in-95 duration-100"
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        onMoveToTop?.(widget.id);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer"
                                >
                                    <ArrowUpToLine size={14} className="text-indigo-600" />
                                    <span>{t('dash.card.move_top')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onMoveStep?.(widget.id, 'up');
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                                >
                                    <ChevronUp size={14} className="text-slate-500" />
                                    <span>{t('dash.card.move_up')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onMoveStep?.(widget.id, 'down');
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                                >
                                    <ChevronDown size={14} className="text-slate-500" />
                                    <span>{t('dash.card.move_down')}</span>
                                </button>
                            <div className="my-1 border-t border-slate-100" />
                            <div className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400">{t('dash.card.width')}</div>
                            <div className="flex gap-1 px-1">
                                {[1, 2, 3].map(w => (
                                    <button
                                        key={w}
                                        type="button"
                                        onClick={() => {
                                            onUpdateDimensions(widget.id, w as 1 | 2 | 3, heightPx);
                                            setIsMenuOpen(false);
                                        }}
                                        className={`flex-1 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                            colSpan === w ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {w}x
                                    </button>
                                ))}
                            </div>
                            {onHideWidget && (
                                <>
                                    <div className="my-1 border-t border-slate-100" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onHideWidget(widget.id);
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-2 text-left text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                    >
                                        <EyeOff size={14} className="text-rose-500" />
                                        <span>{isKa ? 'დაფაზე დამალვა' : 'Hide from Dashboard'}</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
                </div>

                {/* Open in Floating Window Button */}
                <button
                    type="button"
                    onClick={() => onOpenWindow(widget)}
                    title={t('dash.card.open_window')}
                    className="p-1.5 text-indigo-600 hover:text-indigo-800 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                >
                    <Maximize2 size={13} />
                </button>
            </div>

            {/* LIVE RESIZING ARROWS ON SIDES (TOUCH & HOVER) */}
            {/* RIGHT SIDE (Width Resize) */}
            <div 
                title={t('dash.card.resize_width')}
                onPointerDown={(e) => handlePointerDown(e, 'right')}
                onClick={handleSideClick}
                className="group/edge-r absolute -right-2 top-4 bottom-4 w-4 cursor-ew-resize z-20 flex items-center justify-center select-none"
            >
                <div className={`w-5 h-8 bg-indigo-600 text-white rounded-full shadow-md flex items-center justify-center transition-all duration-150 -mr-1.5 ${
                    activeHandle === 'right' ? 'opacity-100 scale-110' : 'opacity-0 group-hover/edge-r:opacity-100 hover:scale-110'
                }`}>
                    <MoveHorizontal size={12} className="stroke-[2.5]" />
                </div>
            </div>

            {/* LEFT SIDE (Width Resize) */}
            <div 
                title={t('dash.card.resize_width')}
                onPointerDown={(e) => handlePointerDown(e, 'left')}
                onClick={handleSideClick}
                className="group/edge-l absolute -left-2 top-4 bottom-4 w-4 cursor-ew-resize z-20 flex items-center justify-center select-none"
            >
                <div className={`w-5 h-8 bg-indigo-600 text-white rounded-full shadow-md flex items-center justify-center transition-all duration-150 -ml-1.5 ${
                    activeHandle === 'left' ? 'opacity-100 scale-110' : 'opacity-0 group-hover/edge-l:opacity-100 hover:scale-110'
                }`}>
                    <MoveHorizontal size={12} className="stroke-[2.5]" />
                </div>
            </div>

            {/* BOTTOM SIDE (Height Resize) */}
            <div 
                title={t('dash.card.resize_height')}
                onPointerDown={(e) => handlePointerDown(e, 'bottom')}
                onClick={handleVerticalClick}
                className="group/edge-b absolute -bottom-2 left-6 right-6 h-4 cursor-ns-resize z-20 flex items-center justify-center select-none"
            >
                <div className={`h-5 w-8 bg-indigo-600 text-white rounded-full shadow-md flex items-center justify-center transition-all duration-150 -mb-1.5 ${
                    activeHandle === 'bottom' ? 'opacity-100 scale-110' : 'opacity-0 group-hover/edge-b:opacity-100 hover:scale-110'
                }`}>
                    <MoveVertical size={12} className="stroke-[2.5]" />
                </div>
            </div>

            {/* TOP SIDE (Height Resize) */}
            <div 
                title={t('dash.card.resize_height')}
                onPointerDown={(e) => handlePointerDown(e, 'top')}
                onClick={handleVerticalClick}
                className="group/edge-t absolute -top-2 left-6 right-6 h-4 cursor-ns-resize z-20 flex items-center justify-center select-none"
            >
                <div className={`h-5 w-8 bg-indigo-600 text-white rounded-full shadow-md flex items-center justify-center transition-all duration-150 -mt-1.5 ${
                    activeHandle === 'top' ? 'opacity-100 scale-110' : 'opacity-0 group-hover/edge-t:opacity-100 hover:scale-110'
                }`}>
                    <MoveVertical size={12} className="stroke-[2.5]" />
                </div>
            </div>

            {/* BOTTOM-RIGHT CORNER (Simultaneous Width & Height) */}
            <div 
                title={t('dash.card.resize_corner')}
                onPointerDown={(e) => handlePointerDown(e, 'corner')}
                className="group/corner absolute -bottom-1.5 -right-1.5 w-5 h-5 cursor-nwse-resize z-20 flex items-center justify-center select-none"
            >
                <div className={`w-3.5 h-3.5 bg-indigo-600/80 rounded-full transition-all duration-150 ${
                    activeHandle === 'corner' ? 'opacity-100 scale-125 bg-indigo-600 ring-2 ring-indigo-300' : 'opacity-0 group-hover/corner:opacity-100 hover:scale-125'
                }`} />
            </div>

            {/* WIDGET BODY */}
            <div className="flex-1 flex flex-col h-full">
                {children}
            </div>
        </div>
    );
};
