import React, { useState, useEffect, useRef } from 'react';
import { 
    X, Maximize2, Video, Camera, Move, ZoomIn, ZoomOut, 
    RotateCcw, Sliders, Shield, Radio, Volume2, VolumeX,
    Sun, Moon, Download, ExternalLink, RefreshCw, LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { PlantationCamera } from './CameraNvrLab';

interface CameraLiveMonitorWindowProps {
    camera: PlantationCamera;
    onClose: () => void;
    onOpenAllCamerasWide?: () => void;
}

export const CameraLiveMonitorWindow: React.FC<CameraLiveMonitorWindowProps> = ({
    camera,
    onClose,
    onOpenAllCamerasWide
}) => {
    const { language } = useLanguage();
    const isKa = language === 'ka';

    const [isNightMode, setIsNightMode] = useState<boolean>(false);
    const [isMuted, setIsMuted] = useState<boolean>(true);
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [ptzOffset, setPtzOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [liveTime, setLiveTime] = useState<string>('');
    const [bitrateKbps, setBitrateKbps] = useState<number>(4120);

    // Update real-time CCTV clock
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setLiveTime(now.toISOString().replace('T', ' ').slice(0, 19));
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    // Random slight bitrate fluctuation for realism
    useEffect(() => {
        const bTimer = setInterval(() => {
            setBitrateKbps(Math.round(4000 + (Math.random() * 250 - 125)));
        }, 3000);
        return () => clearInterval(bTimer);
    }, []);

    const handlePtz = (dx: number, dy: number) => {
        setPtzOffset(prev => ({
            x: Math.max(-50, Math.min(50, prev.x + dx)),
            y: Math.max(-30, Math.min(30, prev.y + dy))
        }));
        toast.info(`PTZ [${camera.name}]: Pan/Tilt adjusted`);
    };

    const handleSnapshot = () => {
        toast.success(isKa ? `კადრი შენახულია: ${camera.name} [CH0${camera.channel}]` : `Snapshot captured: ${camera.name} [CH0${camera.channel}]`);
    };

    return (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[2600] w-[340px] sm:w-[420px] bg-slate-950/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 text-white select-none">
            
            {/* Header with Title and Link to All Cameras */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 font-mono font-bold text-[9px] border border-blue-800/60">
                                CH0{camera.channel}
                            </span>
                            <span className="font-black text-xs text-white truncate max-w-[130px] sm:max-w-[180px]">
                                {camera.name}
                            </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono block">
                            {camera.ipAddress}:{camera.rtspPort} • Tilt {camera.tiltAngleDeg || 4}°
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {/* LINK TO ALL CAMERAS (Wide Open Window) as requested! */}
                    {onOpenAllCamerasWide && (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onOpenAllCamerasWide();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600/90 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-blue-900/30 cursor-pointer"
                            title={isKa ? "ყველა კამერის სრული ეკრანის მატრიცის გახსნა" : "Open Wide Window for All Cameras"}
                        >
                            <LayoutGrid size={13} />
                            <span className="hidden sm:inline">{isKa ? "ყველა კამერა" : "All Cameras"}</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Close Live Monitor"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Simulated Live Video Feed Canvas */}
            <div className="relative w-full h-[220px] sm:h-[260px] bg-black overflow-hidden flex items-center justify-center">
                
                {/* Simulated Camera Video Stream Layer */}
                <div 
                    className="absolute inset-0 transition-transform duration-200"
                    style={{
                        transform: `scale(${zoomLevel}) translate(${ptzOffset.x}px, ${ptzOffset.y}px)`,
                        filter: isNightMode ? 'grayscale(100%) contrast(140%) brightness(85%)' : 'none'
                    }}
                >
                    {/* Realistic Orchard Camera Environment Background */}
                    <div className="w-full h-full bg-gradient-to-b from-sky-950 via-emerald-950 to-slate-950 flex flex-col justify-between p-4">
                        <div className="flex justify-between items-start opacity-70">
                            <div className="w-24 h-12 border-t-2 border-l-2 border-emerald-400/40 rounded-tl-lg" />
                            <div className="w-24 h-12 border-t-2 border-r-2 border-emerald-400/40 rounded-tr-lg" />
                        </div>

                        {/* Motion Detection AI Tracking Box */}
                        <div className="self-center p-3 border-2 border-dashed border-emerald-400/80 rounded-xl bg-emerald-500/10 backdrop-blur-[1px] animate-pulse">
                            <div className="text-[9px] font-mono font-black text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                <span>AcuSense AI: Tractor Detected (98.4%)</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-end opacity-70">
                            <div className="w-24 h-12 border-b-2 border-l-2 border-emerald-400/40 rounded-bl-lg" />
                            <div className="w-24 h-12 border-b-2 border-r-2 border-emerald-400/40 rounded-br-lg" />
                        </div>
                    </div>
                </div>

                {/* CCTV Top Left HUD */}
                <div className="absolute top-2.5 left-3 pointer-events-none flex flex-col gap-0.5 z-10">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        <span className="font-mono font-black text-[11px] text-white tracking-widest drop-shadow">
                            REC ● LIVE
                        </span>
                        <span className="font-mono text-[9px] text-emerald-400 font-bold bg-black/60 px-1.5 py-0.5 rounded">
                            4K 25FPS
                        </span>
                    </div>
                    <span className="font-mono text-[10px] text-white/90 drop-shadow">
                        {camera.name.toUpperCase()}
                    </span>
                    <span className="font-mono text-[9px] text-white/70 drop-shadow">
                        {liveTime}
                    </span>
                </div>

                {/* CCTV Top Right HUD */}
                <div className="absolute top-2.5 right-3 pointer-events-none text-right font-mono text-[9px] text-white/80 z-10 drop-shadow">
                    <div>{bitrateKbps} kbps</div>
                    <div className="text-emerald-400 font-bold">H.265+ Smart Codec</div>
                    <div>FOV: {camera.fovAngleDeg}° | {camera.rangeM}m</div>
                </div>

                {/* Center Crosshair */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                    <div className="w-10 h-10 border border-white/50 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                </div>

                {/* Bottom Video Quick Action Floating Overlay */}
                <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between pointer-events-auto z-10">
                    <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsNightMode(!isNightMode)}
                            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                isNightMode ? 'bg-amber-500 text-black' : 'text-slate-300 hover:text-white'
                            }`}
                            title={isNightMode ? "Switch to ColorVu Daytime" : "Switch to Infrared Night Vision"}
                        >
                            {isNightMode ? <Sun size={13} /> : <Moon size={13} />}
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsMuted(!isMuted)}
                            className="p-1.5 rounded-lg text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title={isMuted ? "Unmute Camera Audio" : "Mute Camera Audio"}
                        >
                            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                        </button>

                        <button
                            type="button"
                            onClick={handleSnapshot}
                            className="p-1.5 rounded-lg text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Take Snapshot"
                        >
                            <Camera size={13} />
                        </button>
                    </div>

                    {/* Quick PTZ Direction Pad */}
                    <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/10">
                        <button
                            type="button"
                            onClick={() => handlePtz(-10, 0)}
                            className="px-2 py-1 text-[10px] font-mono font-bold hover:bg-white/20 rounded cursor-pointer"
                            title="Pan Left"
                        >
                            ◄
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePtz(0, -6)}
                            className="px-2 py-1 text-[10px] font-mono font-bold hover:bg-white/20 rounded cursor-pointer"
                            title="Tilt Up"
                        >
                            ▲
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePtz(0, 6)}
                            className="px-2 py-1 text-[10px] font-mono font-bold hover:bg-white/20 rounded cursor-pointer"
                            title="Tilt Down"
                        >
                            ▼
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePtz(10, 0)}
                            className="px-2 py-1 text-[10px] font-mono font-bold hover:bg-white/20 rounded cursor-pointer"
                            title="Pan Right"
                        >
                            ►
                        </button>
                        <div className="w-px h-3 bg-white/20 mx-0.5" />
                        <button
                            type="button"
                            onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.25))}
                            className="p-1 hover:bg-white/20 rounded text-slate-200 cursor-pointer"
                            title="Zoom In"
                        >
                            <ZoomIn size={12} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.25))}
                            className="p-1 hover:bg-white/20 rounded text-slate-200 cursor-pointer"
                            title="Zoom Out"
                        >
                            <ZoomOut size={12} />
                        </button>
                        <button
                            type="button"
                            onClick={() => { setZoomLevel(1); setPtzOffset({ x: 0, y: 0 }); }}
                            className="p-1 hover:bg-white/20 rounded text-slate-200 cursor-pointer"
                            title="Reset PTZ"
                        >
                            <RotateCcw size={12} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Footer Info & Wide Open Window Link */}
            <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                    <span className="text-slate-400">{camera.model}</span>
                </div>
                {onOpenAllCamerasWide && (
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onOpenAllCamerasWide();
                        }}
                        className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                        <span>{isKa ? 'ყველა კამერის მატრიცა' : 'Wide Surveillance Matrix'}</span>
                        <ExternalLink size={11} />
                    </button>
                )}
            </div>
        </div>
    );
};
