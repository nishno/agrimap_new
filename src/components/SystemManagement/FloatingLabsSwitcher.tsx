import React, { useState, useRef } from 'react';
import { GripHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface FloatingLabsSwitcherProps {
    labTab: string;
    onSelectLabTab: (tab: any) => void;
}

export const FloatingLabsSwitcher: React.FC<FloatingLabsSwitcherProps> = ({
    labTab,
    onSelectLabTab
}) => {
    const { language } = useLanguage();
    const isKa = language === 'ka';
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
    const [isMinimized, setIsMinimized] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button, input, select, textarea')) return;
        e.preventDefault();
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {}

        const rect = containerRef.current?.getBoundingClientRect();
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startLeft: rect ? rect.left : (window.innerWidth / 2 - 250),
            startTop: rect ? rect.top : 12
        };
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragRef.current) return;
        e.preventDefault();
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        const newX = Math.max(8, Math.min(window.innerWidth - 120, dragRef.current.startLeft + dx));
        const newY = Math.max(8, Math.min(window.innerHeight - 80, dragRef.current.startTop + dy));
        setPos({ x: newX, y: newY });
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragRef.current) return;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (err) {}
        dragRef.current = null;
    };

    if (isMinimized) {
        return (
            <div
                ref={containerRef}
                style={pos ? {
                    position: 'absolute',
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    transform: 'none'
                } : undefined}
                className={`z-[1300] flex items-center gap-1.5 p-1 px-2.5 rounded-2xl bg-[#FAFBF8]/95 border border-[#D8E3D4] shadow-xl backdrop-blur-xl select-none text-xs ${
                    pos ? '' : 'absolute top-3 left-1/2 -translate-x-1/2'
                }`}
            >
                <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="cursor-grab active:cursor-grabbing text-[#5B7565] hover:text-[#1E3B2B] flex items-center gap-1.5 py-1"
                    title="Drag anywhere"
                >
                    <GripHorizontal size={13} />
                    <span className="font-black uppercase tracking-wider text-[11px] text-[#1E3B2B]">
                        🗺️ Labs Nav
                    </span>
                </div>
                <button
                    onClick={() => setIsMinimized(false)}
                    className="p-1 text-[#5B7565] hover:text-[#1E3B2B] rounded-lg hover:bg-[#EEF3EA] transition-colors cursor-pointer"
                    title="Expand Labs switcher"
                >
                    <ChevronDown size={13} />
                </button>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            style={pos ? {
                position: 'absolute',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: 'none'
            } : undefined}
            className={`z-[1300] flex items-center p-1 rounded-2xl bg-[#FAFBF8]/95 border border-[#D8E3D4] shadow-xl backdrop-blur-xl gap-1 select-none ${
                pos ? '' : 'absolute top-3 left-1/2 -translate-x-1/2'
            }`}
        >
            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onDoubleClick={() => setPos(null)}
                className="px-1.5 py-1 cursor-grab active:cursor-grabbing text-[#6A8272] hover:text-[#1E3B2B] flex items-center justify-center transition-colors rounded-lg hover:bg-[#EEF3EA]"
                title={isKa ? 'გადაადგილება რუკაზე (ორჯერ დაწკაპუნება - საწყის ადგილზე დაბრუნება)' : 'Drag anywhere on map (double click to reset)'}
            >
                <GripHorizontal size={14} />
            </div>

            <button
                onClick={() => onSelectLabTab('devices_map')}
                data-active={labTab === 'devices_map' ? 'true' : 'false'}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    labTab === 'devices_map'
                        ? 'bg-[#1E3B2B] text-white shadow-md border border-[#1E3B2B]'
                        : 'bg-white/90 text-[#2D4536] border border-[#D3DFCE] hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb]'
                }`}
            >
                🗺️ {isKa ? 'მოწყობილობების რუკა' : 'Devices Map'}
            </button>
            <button
                onClick={() => onSelectLabTab('hardware')}
                data-active={labTab === 'hardware' ? 'true' : 'false'}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    labTab === 'hardware'
                        ? 'bg-[#1E3B2B] text-white shadow-md border border-[#1E3B2B]'
                        : 'bg-white/90 text-[#2D4536] border border-[#D3DFCE] hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb]'
                }`}
            >
                🔌 {isKa ? 'აპარატურა & მოწყობილობები' : 'Hardware & Devices'}
            </button>
            <button
                onClick={() => onSelectLabTab('theme')}
                data-active="false"
                className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white/90 text-[#2D4536] border border-[#D3DFCE] hover:bg-[#8b5cf6] hover:text-white hover:border-[#8b5cf6] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
                🎨 {isKa ? 'თემების სტუდია' : 'Theme Studio'}
            </button>
            <button
                onClick={() => onSelectLabTab('letters')}
                data-active="false"
                className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white/90 text-[#2D4536] border border-[#D3DFCE] hover:bg-[#d97706] hover:text-white hover:border-[#d97706] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
                🔤 {isKa ? 'შრიფტი & მენიუს ფერები' : 'Letters & Menu Colors'}
            </button>
            <button
                onClick={() => onSelectLabTab('analytics')}
                data-active="false"
                className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white/90 text-[#2D4536] border border-[#D3DFCE] hover:bg-[#16a34a] hover:text-white hover:border-[#16a34a] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
                🧠 {isKa ? 'ინტელექტი' : 'Intelligence'}
            </button>

            <button
                onClick={() => setIsMinimized(true)}
                className="p-1 text-[#6A8272] hover:text-[#1E3B2B] rounded-lg hover:bg-[#EEF3EA] transition-colors cursor-pointer"
                title="Minimize Labs switcher"
            >
                <ChevronUp size={13} />
            </button>
        </div>
    );
};
