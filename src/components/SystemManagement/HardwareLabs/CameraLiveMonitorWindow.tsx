import React, { useState } from 'react';
import { 
    X, LayoutGrid, Info, Compass, Sliders, MapPin, Eye, ExternalLink, Move
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { PlantationCamera } from './CameraNvrLab';
import { Go2rtcVideoStream } from './Go2rtcVideoStream';
import { DeviceControlPanel } from './DeviceControlPanel';
import { CANONICAL_AGROBARI_CENTER } from '../../../utils/plantationHelper';

interface CameraLiveMonitorWindowProps {
    camera: PlantationCamera;
    onClose: () => void;
    onOpenAllCamerasWide?: () => void;
    onUpdateCamera?: (updated: Partial<PlantationCamera>) => void;
}

export const CameraLiveMonitorWindow: React.FC<CameraLiveMonitorWindowProps> = ({
    camera,
    onClose,
    onOpenAllCamerasWide,
    onUpdateCamera
}) => {
    const { language } = useLanguage();
    const isKa = language === 'ka';
    const [showControls, setShowControls] = useState(false);

    const rtspUrl = (camera as any).rtspUrl || `rtsp://admin:Htmc2009@${camera.ipAddress || '192.168.10.244'}:554/Streaming/Channels/${camera.channel}01`;
    const streamSrc = `camera_${camera.channel}_main`;

    return (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[2600] w-[340px] sm:w-[440px] bg-[#FAFBF8]/98 backdrop-blur-2xl border border-[#D8E3D4] rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 text-[#163022] select-none">
            
            {/* Header with Title and Link to All Cameras */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#EEF3EA] border-b border-[#D8E3D4]">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] animate-pulse shrink-0" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold text-[9px] border border-blue-200">
                                CH0{camera.channel}
                            </span>
                            <span className="font-black text-xs text-[#163022] truncate max-w-[130px] sm:max-w-[190px]">
                                {camera.name}
                            </span>
                        </div>
                        <span className="text-[9px] text-[#4A6753] font-mono block truncate">
                            {camera.ipAddress}:{camera.rtspPort || 554} &bull; Tilt {camera.tiltAngleDeg || 4}&deg; &bull; Azimuth {camera.azimuthDeg || 0}&deg;
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Device Control & Move Toggle */}
                    <button
                        type="button"
                        onClick={() => setShowControls(!showControls)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-2xs ${
                            showControls 
                                ? 'bg-[#d97706] text-white font-black shadow-md border border-[#d97706]' 
                                : 'bg-white hover:bg-[#d97706] hover:text-white text-[#244130] border border-[#CFDCCB]'
                        }`}
                        title="Open PTZ and Moving Controls"
                    >
                        <Move size={12} />
                        <span className="hidden sm:inline">{showControls ? (isKa ? 'დახურვა' : 'Close') : (isKa ? 'მართვა' : 'Control')}</span>
                    </button>

                    {/* Link to All Cameras Matrix */}
                    {onOpenAllCamerasWide && (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onOpenAllCamerasWide();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-[#2563eb] hover:text-white text-[#244130] border border-[#CFDCCB] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-2xs cursor-pointer"
                            title={isKa ? "ყველა კამერის სრული ეკრანის მატრიცის გახსნა" : "Open Wide Window for All Cameras"}
                        >
                            <LayoutGrid size={13} />
                            <span className="hidden sm:inline">{isKa ? "მატრიცა" : "Matrix"}</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-[#D8E3D4] rounded-xl text-[#4A6753] hover:text-[#163022] transition-colors cursor-pointer"
                        title="Close Live Monitor"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Embedded Live Video Stream (WebRTC, ISAPI HTTP, Simulation, VLC) */}
            <div className="p-2 bg-black">
                <Go2rtcVideoStream
                    streamSrc={streamSrc}
                    rtspUrl={rtspUrl}
                    cameraName={camera.name}
                    channelNumber={camera.channel}
                    aspectRatio="16/9"
                />
            </div>

            {/* Collapsible Device Control & Moving Panel */}
            {showControls && (
                <div className="p-3 bg-[#FAFBF8] border-t border-[#D8E3D4] max-h-[360px] overflow-y-auto custom-scrollbar text-[#163022]">
                    <DeviceControlPanel
                        camera={{
                            id: camera.id,
                            name: camera.name,
                            channel: camera.channel,
                            model: camera.model,
                            ipAddress: camera.ipAddress,
                            lat: camera.lat,
                            lng: camera.lng,
                            azimuthDeg: camera.azimuthDeg,
                            tiltAngleDeg: camera.tiltAngleDeg,
                            opticalZoomX: (camera as any).opticalZoomX || 2,
                            rangeM: camera.rangeM,
                            mountHeightM: camera.mountHeightM,
                            isPtz: camera.isPtz,
                            isNightVision: camera.isNightVision
                        }}
                        onUpdateCamera={(updated) => {
                            Object.assign(camera, updated);
                            if (onUpdateCamera) onUpdateCamera(updated);
                        }}
                        mapCenterCoords={[camera.lat, camera.lng]}
                        isKa={isKa}
                    />
                </div>
            )}

            {/* Map Telemetry Footer */}
            <div className="px-4 py-2 bg-[#EEF3EA] border-t border-[#D8E3D4] flex items-center justify-between text-[10px] font-mono text-[#4A6753]">
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[#244130]">
                        <MapPin size={11} className="text-[#16a34a]" />
                        {camera.lat.toFixed(5)}, {camera.lng.toFixed(5)}
                    </span>
                    <span className="text-blue-700 font-bold">
                        Range: {camera.rangeM}m
                    </span>
                </div>
                <span className="text-[9px] text-[#6A8A73]">
                    Map Live CCTV Panel
                </span>
            </div>
        </div>
    );
};
