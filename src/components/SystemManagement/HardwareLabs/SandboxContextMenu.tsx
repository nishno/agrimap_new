import React, { useEffect, useRef } from 'react';
import { 
    Sliders, Navigation, Move, Copy, RotateCcw, 
    Eye, EyeOff, Trash2, X, Sparkles, Video, Play
} from 'lucide-react';

export interface ContextMenuState {
    x: number;
    y: number;
    type: 'camera' | 'drone' | 'worker' | 'soil' | 'water' | 'slope_point';
    data: any;
}

interface SandboxContextMenuProps {
    menu: ContextMenuState | null;
    onClose: () => void;
    onOpenProperties: (type: string, data: any) => void;
    onFlyTo: (lat: number, lng: number) => void;
    onMove: (type: string, data: any) => void;
    onDuplicate: (type: string, data: any) => void;
    onResetDefaults: (type: string, data: any) => void;
    onToggleVisibility?: (type: string, data: any) => void;
    onDelete: (type: string, data: any) => void;
    onOpenLiveStream?: (data: any) => void;
    isKa?: boolean;
}

export const SandboxContextMenu: React.FC<SandboxContextMenuProps> = ({
    menu,
    onClose,
    onOpenProperties,
    onFlyTo,
    onMove,
    onDuplicate,
    onResetDefaults,
    onToggleVisibility,
    onDelete,
    onOpenLiveStream,
    isKa = false
}) => {
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    if (!menu) return null;

    // Keep menu inside viewport boundaries
    const menuW = 220;
    const menuH = 260;
    const adjustedX = Math.min(Math.max(10, menu.x), window.innerWidth - menuW - 10);
    const adjustedY = Math.min(Math.max(10, menu.y), window.innerHeight - menuH - 10);

    const getDeviceTitle = () => {
        if (!menu.data) return 'Device';
        switch (menu.type) {
            case 'camera':
                return `📹 ${menu.data.name || `CH0${menu.data.channel}`}`;
            case 'drone':
                return '🛸 Drone Mission';
            case 'worker':
                return `👷 ${menu.data.workerName || 'Worker'}`;
            case 'soil':
                return `🌱 ${menu.data.name || 'Soil Sensor'}`;
            case 'water':
                return `💧 ${menu.data.name || 'Water Sensor'}`;
            case 'slope_point':
                return `🏔️ ${menu.data.name || 'Slope Point'}`;
            default:
                return 'Device';
        }
    };

    return (
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                left: `${adjustedX}px`,
                top: `${adjustedY}px`,
                zIndex: 9999
            }}
            className="w-56 bg-[#FAFBF8]/98 border border-[#D8E3D4] rounded-2xl shadow-2xl backdrop-blur-2xl py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 select-none text-xs text-[#163022]"
        >
            {/* Header */}
            <div className="px-3 py-2 border-b border-[#D8E3D4] bg-[#EEF3EA] flex items-center justify-between">
                <span className="font-black text-[#163022] truncate text-[11px] font-mono tracking-tight">
                    {getDeviceTitle()}
                </span>
                <button
                    onClick={onClose}
                    className="p-1 text-[#4A6753] hover:text-[#163022] rounded hover:bg-[#D8E3D4] transition-colors cursor-pointer"
                >
                    <X size={12} />
                </button>
            </div>

            {/* Actions list */}
            <div className="p-1 space-y-0.5">
                {/* Watch Live Video Stream (Cameras) */}
                {menu.type === 'camera' && onOpenLiveStream && (
                    <button
                        onClick={() => {
                            onOpenLiveStream(menu.data);
                            onClose();
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 bg-white hover:bg-[#dc2626] text-[#244130] hover:text-white transition-all duration-200 font-bold group cursor-pointer text-left shadow-2xs border border-[#CFDCCB]"
                    >
                        <Video size={13} className="text-[#dc2626] group-hover:text-white animate-pulse" />
                        <span>📹 {isKa ? 'პირდაპირი ვიდეო ნაკადი (Live)' : 'Watch Live Stream (RTSP)'}</span>
                    </button>
                )}

                {/* Properties */}
                <button
                    onClick={() => {
                        onOpenProperties(menu.type, menu.data);
                        onClose();
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 text-[#244130] hover:bg-[#2563eb] hover:text-white transition-all duration-200 font-bold group cursor-pointer text-left"
                >
                    <Sliders size={13} className="text-[#2563eb] group-hover:text-white" />
                    <span>{isKa ? 'პარამეტრები & მართვა' : 'Properties & Config'}</span>
                </button>

                {/* Fly to Location */}
                <button
                    onClick={() => {
                        if (menu.data.lat !== undefined && menu.data.lng !== undefined) {
                            onFlyTo(menu.data.lat, menu.data.lng);
                        }
                        onClose();
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 text-[#244130] hover:bg-[#0284c7] hover:text-white transition-all duration-200 font-bold group cursor-pointer text-left"
                >
                    <Navigation size={13} className="text-[#0284c7] group-hover:text-white" />
                    <span>{isKa ? 'რუკაზე მიახლოება (Fly to)' : 'Fly to Device'}</span>
                </button>

                {/* Move / Reposition */}
                <button
                    onClick={() => {
                        onMove(menu.type, menu.data);
                        onClose();
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 text-[#244130] hover:bg-[#d97706] hover:text-white transition-all duration-200 font-bold group cursor-pointer text-left"
                >
                    <Move size={13} className="text-[#d97706] group-hover:text-white" />
                    <span>{isKa ? 'გადაადგილება რუკაზე' : 'Reposition on Map'}</span>
                </button>

                {/* Duplicate */}
                {menu.type !== 'drone' && (
                    <button
                        onClick={() => {
                            onDuplicate(menu.type, menu.data);
                            onClose();
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 text-[#244130] hover:bg-[#16a34a] hover:text-white transition-all duration-200 font-bold group cursor-pointer text-left"
                    >
                        <Copy size={13} className="text-[#16a34a] group-hover:text-white" />
                        <span>{isKa ? 'დუბლირება' : 'Duplicate Device'}</span>
                    </button>
                )}

                {/* Reset Defaults */}
                <button
                    onClick={() => {
                        onResetDefaults(menu.type, menu.data);
                        onClose();
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 text-[#244130] hover:bg-[#8b5cf6] hover:text-white transition-all duration-200 font-bold group cursor-pointer text-left"
                >
                    <RotateCcw size={13} className="text-[#8b5cf6] group-hover:text-white" />
                    <span>{isKa ? 'საწყისი პარამეტრები' : 'Reset Defaults'}</span>
                </button>

                {/* Toggle Visibility */}
                {onToggleVisibility && menu.type === 'camera' && (
                    <button
                        onClick={() => {
                            onToggleVisibility(menu.type, menu.data);
                            onClose();
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 text-[#244130] hover:bg-[#4f46e5] hover:text-white transition-all duration-200 font-bold group cursor-pointer text-left"
                    >
                        <Eye size={13} className="text-[#4f46e5] group-hover:text-white" />
                        <span>{isKa ? 'კონუსის დამალვა/გამოჩენა' : 'Toggle FOV Cone'}</span>
                    </button>
                )}

                <div className="my-1 border-t border-[#D8E3D4]" />

                {/* Delete */}
                <button
                    onClick={() => {
                        onDelete(menu.type, menu.data);
                        onClose();
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 text-[#dc2626] hover:bg-[#dc2626] hover:text-white transition-all duration-200 font-bold group cursor-pointer text-left"
                >
                    <Trash2 size={13} className="text-[#dc2626] group-hover:text-white" />
                    <span>{isKa ? (menu.type === 'slope_point' ? 'წერტილის წაშლა' : 'მოწყობილობის წაშლა') : (menu.type === 'slope_point' ? 'Delete Slope Point' : 'Delete Device')}</span>
                </button>
            </div>
        </div>
    );
};
