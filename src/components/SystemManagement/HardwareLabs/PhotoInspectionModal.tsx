import React from 'react';
import { X, MapPin, Compass, Mountain, Calendar, Trash2, ExternalLink, Navigation } from 'lucide-react';
import type { PhotoGpsPin } from '../../../utils/demTerrainViewshed';

interface PhotoInspectionModalProps {
    photo: PhotoGpsPin | null;
    onClose: () => void;
    onDelete?: (id: string) => void;
    onUpdateAzimuth?: (id: string, azimuth: number) => void;
    isKa?: boolean;
}

export const PhotoInspectionModal: React.FC<PhotoInspectionModalProps> = ({
    photo,
    onClose,
    onDelete,
    onUpdateAzimuth,
    isKa = false
}) => {
    if (!photo) return null;

    return (
        <div className="fixed inset-0 z-[1500] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-300">
                            📷
                        </div>
                        <div>
                            <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                                <span>{photo.name || 'Inspection Photo'}</span>
                                {photo.hasExifGps ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                                        EXIF GPS ✓
                                    </span>
                                ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-950 text-amber-300 border border-amber-700/50">
                                        Manual GPS
                                    </span>
                                )}
                            </h3>
                            <span className="text-[10px] text-slate-400 font-mono">
                                Lat: {photo.lat.toFixed(6)}, Lng: {photo.lng.toFixed(6)}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Photo Viewer */}
                <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[280px] max-h-[460px]">
                    <img
                        src={photo.dataUrl}
                        alt={photo.name}
                        className="max-h-full max-w-full object-contain select-none"
                    />

                    {/* Compass Overlay Badge */}
                    <div className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur-md border border-cyan-500/50 rounded-xl p-2 flex items-center gap-2 text-white shadow-xl">
                        <div 
                            className="w-7 h-7 rounded-full border border-cyan-400 flex items-center justify-center transition-transform"
                            style={{ transform: `rotate(${photo.azimuthDeg}deg)` }}
                        >
                            <Navigation size={14} className="text-cyan-400 fill-cyan-400/40" />
                        </div>
                        <div className="font-mono text-right">
                            <div className="text-[10px] text-cyan-300 font-bold">{photo.azimuthDeg}°</div>
                            <div className="text-[8px] text-slate-400 uppercase">Heading</div>
                        </div>
                    </div>
                </div>

                {/* Metadata & Controls Bar */}
                <div className="p-3.5 bg-slate-950/90 border-t border-slate-800 space-y-3">
                    <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                        <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                            <span className="text-[9px] text-slate-400 uppercase flex items-center gap-1">
                                <MapPin size={10} className="text-cyan-400" /> GPS Pin
                            </span>
                            <div className="font-bold text-white text-[11px] truncate">
                                {photo.lat.toFixed(5)}, {photo.lng.toFixed(5)}
                            </div>
                        </div>

                        <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                            <span className="text-[9px] text-slate-400 uppercase flex items-center gap-1">
                                <Mountain size={10} className="text-amber-400" /> Altitude ASL
                            </span>
                            <div className="font-bold text-amber-300 text-[11px]">
                                {photo.altitudeM} m
                            </div>
                        </div>

                        <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                            <span className="text-[9px] text-slate-400 uppercase flex items-center gap-1">
                                <Calendar size={10} className="text-purple-400" /> Timestamp
                            </span>
                            <div className="font-bold text-purple-300 text-[10px] truncate">
                                {photo.timestamp || 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* Compass Heading Adjustment Slider */}
                    {onUpdateAzimuth && (
                        <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
                            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0 flex items-center gap-1">
                                <Compass size={12} className="text-cyan-400" />
                                {isKa ? 'ხედვის კუთხე (Azimuth):' : 'Viewing Direction:'}
                            </span>
                            <input
                                type="range"
                                min="0"
                                max="359"
                                value={photo.azimuthDeg}
                                onChange={(e) => onUpdateAzimuth(photo.id, Number(e.target.value))}
                                className="flex-1 accent-cyan-400 cursor-pointer"
                            />
                            <span className="font-mono font-bold text-cyan-300 w-12 text-right">
                                {photo.azimuthDeg}°
                            </span>
                        </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-1">
                        {onDelete && (
                            <button
                                type="button"
                                onClick={() => {
                                    onDelete(photo.id);
                                    onClose();
                                }}
                                className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                                <Trash2 size={13} />
                                <span>{isKa ? 'წაშლა' : 'Delete Photo Pin'}</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer ml-auto"
                        >
                            {isKa ? 'დახურვა' : 'Close'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
