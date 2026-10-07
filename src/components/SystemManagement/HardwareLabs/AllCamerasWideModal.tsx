import React, { useState } from 'react';
import { 
    X, Maximize2, Minimize2, Video, Camera, Grid, RefreshCw, 
    HardDrive, Server, Shield, Radio, Volume2, VolumeX, Eye, 
    Sliders, Settings, Plus, ExternalLink, Play, Pause
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { PlantationCamera } from './CameraNvrLab';

interface AllCamerasWideModalProps {
    isOpen: boolean;
    onClose: () => void;
    cameras: PlantationCamera[];
    onSelectCameraForDetail?: (cam: PlantationCamera) => void;
    onOpenAddCameraModal?: () => void;
}

export const AllCamerasWideModal: React.FC<AllCamerasWideModalProps> = ({
    isOpen,
    onClose,
    cameras,
    onSelectCameraForDetail,
    onOpenAddCameraModal
}) => {
    const { language } = useLanguage();
    const isKa = language === 'ka';

    const [layout, setLayout] = useState<'1x1' | '2x2' | '3x3'>('2x2');
    const [selectedCamId, setSelectedCamId] = useState<string>(cameras[0]?.id || '');
    const [isRecordingAll, setIsRecordingAll] = useState<boolean>(true);

    if (!isOpen) return null;

    const activeCam = cameras.find(c => c.id === selectedCamId) || cameras[0];

    return (
        <div className="fixed inset-0 z-[2700] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-7xl h-[92vh] bg-slate-950 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white">
                
                {/* Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600/20 border border-blue-500/40 rounded-2xl text-blue-400">
                            <Video size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                    Hikvision DS-7716NI-I4 / 16P NVR Surveillance Control
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[9px]">
                                    {cameras.length} Active Channels
                                </span>
                            </div>
                            <h2 className="text-base sm:text-xl font-black uppercase tracking-wide text-white mt-0.5">
                                {isKa ? 'პლანტაციის ვიდეოთვალთვალის სრული მატრიცა' : 'Wide Surveillance Video Matrix'}
                            </h2>
                        </div>
                    </div>

                    {/* Layout Switcher & Action Controls */}
                    <div className="flex items-center gap-2">
                        {/* Grid Matrix Buttons */}
                        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                            {(['1x1', '2x2', '3x3'] as const).map(l => (
                                <button
                                    key={l}
                                    type="button"
                                    onClick={() => setLayout(l)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                                        layout === l ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>

                        {onOpenAddCameraModal && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onOpenAddCameraModal();
                                }}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/30 cursor-pointer"
                            >
                                <Plus size={14} />
                                <span className="hidden sm:inline">{isKa ? 'კამერის დამატება' : 'Add Camera'}</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Close Window"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Video Grid */}
                <div className="flex-1 p-3 sm:p-4 bg-black overflow-y-auto">
                    <div className={`grid gap-3 h-full ${
                        layout === '1x1' 
                            ? 'grid-cols-1' 
                            : layout === '2x2' 
                            ? 'grid-cols-1 sm:grid-cols-2' 
                            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    }`}>
                        {cameras.map((cam, idx) => {
                            const isSelected = cam.id === selectedCamId;
                            return (
                                <div
                                    key={cam.id}
                                    onClick={() => setSelectedCamId(cam.id)}
                                    className={`relative rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col justify-between ${
                                        isSelected 
                                            ? 'border-blue-500 ring-2 ring-blue-500/40' 
                                            : 'border-slate-800 hover:border-slate-700'
                                    } bg-slate-950 min-h-[220px]`}
                                >
                                    {/* Video Stream Simulation */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center">
                                        {/* Optical View Simulation */}
                                        <div className="w-full h-full opacity-60 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950 via-slate-950 to-black p-4 flex flex-col justify-between pointer-events-none">
                                            <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                                    REC ● CH0{cam.channel}
                                                </span>
                                                <span>4K 25FPS</span>
                                            </div>

                                            {/* Detection Box for visual realism */}
                                            <div className="self-center p-2 border border-emerald-400/60 rounded-lg text-center bg-black/40">
                                                <span className="text-[9px] font-mono text-emerald-300">
                                                    AcuSense: Sector Motion Clear
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                                                <span>RTSP: {cam.ipAddress}:554</span>
                                                <span>Tilt: {cam.tiltAngleDeg || 4}°</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Header Badge */}
                                    <div className="relative z-10 p-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[10px] font-bold">
                                                CH0{cam.channel}
                                            </span>
                                            <span className="font-bold text-xs text-white truncate max-w-[160px]">
                                                {cam.name}
                                            </span>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[9px] font-bold">
                                            {cam.status}
                                        </span>
                                    </div>

                                    {/* Bottom Footer Details */}
                                    <div className="relative z-10 p-3 flex items-center justify-between bg-gradient-to-t from-black/90 to-transparent text-[10px] text-slate-300">
                                        <span className="font-mono text-slate-400">
                                            {cam.model.slice(0, 24)}...
                                        </span>
                                        <span className="font-mono text-emerald-400">
                                            Range {cam.rangeM}m • FOV {cam.fovAngleDeg}°
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Telemetry & Selected Camera Quick PTZ */}
                {activeCam && (
                    <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                            <span className="text-slate-400">
                                {isKa ? 'არჩეული არხი:' : 'Active Channel:'}
                            </span>
                            <span className="font-black text-white">
                                [CH0{activeCam.channel}] {activeCam.name}
                            </span>
                            <span className="text-slate-400 font-mono hidden sm:inline">
                                ({activeCam.ipAddress} • {activeCam.model} • Tilt: {activeCam.tiltAngleDeg || 4}°)
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => toast.success(`Snapshot taken for ${activeCam.name}`)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <Camera size={13} />
                                <span>{isKa ? 'კადრის გადაღება' : 'Snapshot'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (onSelectCameraForDetail) {
                                        onSelectCameraForDetail(activeCam);
                                    }
                                    toast.info(`Zoomed in on [CH0${activeCam.channel}]`);
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-white"
                            >
                                <Maximize2 size={13} />
                                <span>{isKa ? 'დეტალური ხედი' : 'Single Full View'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
