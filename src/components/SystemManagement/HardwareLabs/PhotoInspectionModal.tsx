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
        <div className="fixed inset-0 z-[1500] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#FAFBF8] border border-[#D8E3D4] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#163022]">
                {/* Header */}
                <div className="p-3.5 bg-[#EEF3EA] border-b border-[#D8E3D4] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-white border border-[#CFDCCB] flex items-center justify-center text-[#16a34a] shadow-2xs">
                            📷
                        </div>
                        <div>
                            <h3 className="font-black text-sm text-[#163022] flex items-center gap-1.5">
                                <span>{photo.name || 'Inspection Photo'}</span>
                                {photo.hasExifGps ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                                        EXIF GPS ✓
                                    </span>
                                ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                                        Manual GPS
                                    </span>
                                )}
                            </h3>
                            <span className="text-[10px] text-[#4A6753] font-mono">
                                Lat: {photo.lat.toFixed(6)}, Lng: {photo.lng.toFixed(6)}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-[#4A6753] hover:text-[#163022] rounded-xl bg-white hover:bg-[#D8E3D4] border border-[#CFDCCB] transition-colors cursor-pointer"
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
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md border border-[#D8E3D4] rounded-xl p-2 flex items-center gap-2 text-[#163022] shadow-xl">
                        <div 
                            className="w-7 h-7 rounded-full border border-[#0284c7] flex items-center justify-center transition-transform"
                            style={{ transform: `rotate(${photo.azimuthDeg}deg)` }}
                        >
                            <Navigation size={14} className="text-[#0284c7] fill-cyan-400/40" />
                        </div>
                        <div className="font-mono text-right">
                            <div className="text-[10px] text-[#0284c7] font-bold">{photo.azimuthDeg}°</div>
                            <div className="text-[8px] text-[#4A6753] uppercase">Heading</div>
                        </div>
                    </div>
                </div>

                {/* Metadata & Controls Bar */}
                <div className="p-3.5 bg-[#EEF3EA] border-t border-[#D8E3D4] space-y-3">
                    <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                        <div className="p-2 bg-white rounded-xl border border-[#CFDCCB] shadow-2xs">
                            <span className="text-[9px] text-[#4A6753] uppercase flex items-center gap-1 font-bold">
                                <MapPin size={10} className="text-[#0284c7]" /> GPS Pin
                            </span>
                            <div className="font-bold text-[#163022] text-[11px] truncate">
                                {photo.lat.toFixed(5)}, {photo.lng.toFixed(5)}
                            </div>
                        </div>

                        <div className="p-2 bg-white rounded-xl border border-[#CFDCCB] shadow-2xs">
                            <span className="text-[9px] text-[#4A6753] uppercase flex items-center gap-1 font-bold">
                                <Mountain size={10} className="text-amber-700" /> Altitude ASL
                            </span>
                            <div className="font-bold text-amber-800 text-[11px]">
                                {photo.altitudeM} m
                            </div>
                        </div>

                        <div className="p-2 bg-white rounded-xl border border-[#CFDCCB] shadow-2xs">
                            <span className="text-[9px] text-[#4A6753] uppercase flex items-center gap-1 font-bold">
                                <Calendar size={10} className="text-purple-700" /> Timestamp
                            </span>
                            <div className="font-bold text-purple-800 text-[10px] truncate">
                                {photo.timestamp || 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* Compass Heading Adjustment Slider */}
                    {onUpdateAzimuth && (
                        <div className="p-2 bg-white rounded-xl border border-[#CFDCCB] flex items-center justify-between gap-3 text-xs shadow-2xs">
                            <span className="text-[10px] text-[#4A6753] font-bold uppercase shrink-0 flex items-center gap-1">
                                <Compass size={12} className="text-[#0284c7]" />
                                {isKa ? 'ხედვის კუთხე (Azimuth):' : 'Viewing Direction:'}
                            </span>
                            <input
                                type="range"
                                min="0"
                                max="359"
                                value={photo.azimuthDeg}
                                onChange={(e) => onUpdateAzimuth(photo.id, Number(e.target.value))}
                                className="flex-1 accent-[#0284c7] cursor-pointer"
                            />
                            <span className="font-mono font-bold text-[#0284c7] w-12 text-right">
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
                                className="px-3 py-1.5 bg-white hover:bg-[#dc2626] hover:text-white text-[#dc2626] border border-[#dc2626] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all duration-200 shadow-2xs"
                            >
                                <Trash2 size={13} />
                                <span>{isKa ? 'წაშლა' : 'Delete Photo Pin'}</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-1.5 bg-white hover:bg-[#64748b] hover:text-white text-[#244130] border border-[#CFDCCB] rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ml-auto shadow-2xs"
                        >
                            {isKa ? 'დახურვა' : 'Close'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
