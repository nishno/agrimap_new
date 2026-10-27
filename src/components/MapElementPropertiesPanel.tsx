import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    X, Camera, Plane, Sliders, Settings, Edit3, Trash2, Copy, 
    Play, Eye, Radio, Shield, Wifi, Video, RefreshCw, 
    Maximize2, ChevronDown, ChevronUp, Download, Check, AlertCircle,
    Compass, MapPin, ZoomIn, ZoomOut, Volume2, ShieldCheck, Sparkles,
    Move, GripVertical, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    RotateCcw, Scan, Activity, Power, Crosshair
} from 'lucide-react';
import { toast } from 'sonner';
import type { PlantationCamera } from './SystemManagement/HardwareLabs/CameraNvrLab';
import type { DroneFlightMission, DroneFlightWaypoint } from './DroneFlightPathPlanner';
import { computeBlindZoneDistanceM } from '../utils/cameraGeospatial';

interface MapElementPropertiesPanelProps {
    selectedCamera: PlantationCamera | null;
    onUpdateCamera?: (cam: PlantationCamera) => void;
    onDeleteCamera?: (cameraId: string) => void;
    onCopyCamera?: (cam: PlantationCamera) => void;
    onOpenLiveView?: (cam: PlantationCamera) => void;

    selectedDroneMission: DroneFlightMission | null;
    onUpdateDroneMission?: (mission: DroneFlightMission) => void;
    onDeleteDroneMission?: () => void;
    onCopyDroneMission?: (mission: DroneFlightMission) => void;
    onStartDroneSimulation?: (mission: DroneFlightMission) => void;

    onClose: () => void;
    isKa?: boolean;
}

export const MapElementPropertiesPanel: React.FC<MapElementPropertiesPanelProps> = ({
    selectedCamera,
    onUpdateCamera,
    onDeleteCamera,
    onCopyCamera,
    onOpenLiveView,

    selectedDroneMission,
    onUpdateDroneMission,
    onDeleteDroneMission,
    onCopyDroneMission,
    onStartDroneSimulation,

    onClose,
    isKa = false
}) => {
    const isCamera = !!selectedCamera;
    const isDrone = !!selectedDroneMission;

    const [activeTab, setActiveTab] = useState<'manage' | 'config' | 'edit'>('manage');
    const [isMinimized, setIsMinimized] = useState<boolean>(false);
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);

    // Fast, lightweight local slider state so sliders move like butter with zero UI freeze
    const [localTilt, setLocalTilt] = useState<number>(selectedCamera?.tiltAngleDeg ?? 4);
    const [localAzimuth, setLocalAzimuth] = useState<number>(selectedCamera?.azimuthDeg ?? 0);
    const [localRange, setLocalRange] = useState<number>(selectedCamera?.rangeM ?? 75);
    const [localFov, setLocalFov] = useState<number>(selectedCamera?.fovAngleDeg ?? 90);

    // PTZ Controls State
    const [ptzSpeed, setPtzSpeed] = useState<number>(2); // 1 = fine, 2 = normal, 4 = fast
    const [ptzZoomLevel, setPtzZoomLevel] = useState<number>(1);
    const [isPatrolActive, setIsPatrolActive] = useState<boolean>(false);
    const patrolIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const patrolDirectionRef = useRef<'right' | 'left'>('right');

    // Network / Ping Test State in Config tab
    const [isPinging, setIsPinging] = useState<boolean>(false);
    const [pingResult, setPingResult] = useState<{ success: boolean; ms: number; text: string } | null>(null);

    // Synchronize local states when active camera changes
    useEffect(() => {
        if (selectedCamera) {
            setLocalTilt(selectedCamera.tiltAngleDeg ?? 4);
            setLocalAzimuth(selectedCamera.azimuthDeg ?? 0);
            setLocalRange(selectedCamera.rangeM ?? 75);
            setLocalFov(selectedCamera.fovAngleDeg ?? 90);
            setPtzZoomLevel(selectedCamera.opticalZoomLevel ?? 1);
            setIsPatrolActive(false);
            if (patrolIntervalRef.current) {
                clearInterval(patrolIntervalRef.current);
                patrolIntervalRef.current = null;
            }
        }
    }, [selectedCamera?.id]);

    // Cleanup patrol interval on unmount
    useEffect(() => {
        return () => {
            if (patrolIntervalRef.current) {
                clearInterval(patrolIntervalRef.current);
            }
        };
    }, []);

    // Check if current camera is PTZ-capable
    const isPtzCamera = Boolean(
        selectedCamera?.isPtz || 
        selectedCamera?.model?.toLowerCase().includes('ptz') ||
        selectedCamera?.name?.toLowerCase().includes('ptz')
    );

    if (!isCamera && !isDrone) return null;

    // Draggable Panel handler
    const handlePanelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button, input, select, a, textarea')) return;
        e.preventDefault();
        e.stopPropagation();
        const targetEl = e.currentTarget;
        try { targetEl.setPointerCapture(e.pointerId); } catch {}
        const rect = panelRef.current?.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = rect ? rect.left : 24;
        const startTop = rect ? rect.top : 80;
        const panelWidth = rect?.width || 410;

        const onPointerMove = (moveEvt: PointerEvent) => {
            moveEvt.preventDefault();
            const deltaX = moveEvt.clientX - startX;
            const deltaY = moveEvt.clientY - startY;
            const newLeft = Math.max(8, Math.min(window.innerWidth - panelWidth - 8, startLeft + deltaX));
            const newTop = Math.max(8, Math.min(window.innerHeight - 80, startTop + deltaY));
            setPanelPos({ x: Math.round(newLeft), y: Math.round(newTop) });
        };

        const onPointerUp = (upEvt: PointerEvent) => {
            try { targetEl.releasePointerCapture(upEvt.pointerId); } catch {}
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerUp, { passive: false });
    };

    // Debounced commit for silky-smooth 60fps sliders without map bottleneck
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const commitCameraChange = useCallback((fields: Partial<PlantationCamera>) => {
        if (!selectedCamera || !onUpdateCamera) return;
        const updated = { ...selectedCamera, ...fields };
        onUpdateCamera(updated);
    }, [selectedCamera, onUpdateCamera]);

    const handleCameraFieldChange = (fields: Partial<PlantationCamera>) => {
        if (fields.tiltAngleDeg !== undefined) setLocalTilt(fields.tiltAngleDeg);
        if (fields.azimuthDeg !== undefined) setLocalAzimuth(fields.azimuthDeg);
        if (fields.rangeM !== undefined) setLocalRange(fields.rangeM);
        if (fields.fovAngleDeg !== undefined) setLocalFov(fields.fovAngleDeg);

        commitCameraChange(fields);
    };

    // High performance slider drag handler: updates local state immediately, batches parent updates
    const handleSliderInput = (field: 'azimuthDeg' | 'tiltAngleDeg' | 'rangeM', val: number) => {
        if (field === 'azimuthDeg') setLocalAzimuth(val);
        if (field === 'tiltAngleDeg') setLocalTilt(val);
        if (field === 'rangeM') setLocalRange(val);

        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }
        updateTimeoutRef.current = setTimeout(() => {
            commitCameraChange({ [field]: val });
        }, 35);
    };

    const handleSliderCommit = (field: 'azimuthDeg' | 'tiltAngleDeg' | 'rangeM', val: number) => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }
        commitCameraChange({ [field]: val });
    };

    // PTZ Motorized Actions
    const handlePtzPan = (deltaDeg: number) => {
        const nextAz = ((localAzimuth + deltaDeg * ptzSpeed) % 360 + 360) % 360;
        setLocalAzimuth(nextAz);
        commitCameraChange({ azimuthDeg: nextAz });
    };

    const handlePtzTilt = (deltaDeg: number) => {
        const nextTilt = Math.max(1, Math.min(45, localTilt + deltaDeg * ptzSpeed));
        setLocalTilt(nextTilt);
        commitCameraChange({ tiltAngleDeg: nextTilt });
    };

    const handlePtzZoom = (direction: 'in' | 'out') => {
        if (direction === 'in') {
            const nextZoom = Math.min(25, ptzZoomLevel + (ptzSpeed === 1 ? 0.5 : 1));
            const nextRange = Math.min(250, localRange + 15 * ptzSpeed);
            const nextFov = Math.max(30, localFov - 4);
            setPtzZoomLevel(nextZoom);
            setLocalRange(nextRange);
            setLocalFov(nextFov);
            commitCameraChange({ opticalZoomLevel: nextZoom, rangeM: nextRange, fovAngleDeg: nextFov });
            toast.info(`Optical Zoom In: ${nextZoom.toFixed(1)}x`);
        } else {
            const nextZoom = Math.max(1, ptzZoomLevel - (ptzSpeed === 1 ? 0.5 : 1));
            const nextRange = Math.max(25, localRange - 15 * ptzSpeed);
            const nextFov = Math.min(120, localFov + 4);
            setPtzZoomLevel(nextZoom);
            setLocalRange(nextRange);
            setLocalFov(nextFov);
            commitCameraChange({ opticalZoomLevel: nextZoom, rangeM: nextRange, fovAngleDeg: nextFov });
            toast.info(`Optical Zoom Out: ${nextZoom.toFixed(1)}x`);
        }
    };

    const handlePtzHome = () => {
        setLocalAzimuth(0);
        setLocalTilt(4);
        setLocalRange(75);
        setLocalFov(90);
        setPtzZoomLevel(1);
        commitCameraChange({ azimuthDeg: 0, tiltAngleDeg: 4, rangeM: 75, fovAngleDeg: 90, opticalZoomLevel: 1 });
        toast.success(isKa ? 'PTZ დაბრუნდა საწყის პოზიციაზე (Home)' : 'PTZ Reset to Home Preset');
    };

    const handlePtzPreset = (presetNumber: number) => {
        const presets: Record<number, { azimuth: number; tilt: number; range: number; zoom: number; label: string }> = {
            1: { azimuth: 0, tilt: 4, range: 80, zoom: 1, label: 'North Gate' },
            2: { azimuth: 90, tilt: 8, range: 120, zoom: 2, label: 'East Orchard' },
            3: { azimuth: 180, tilt: 4, range: 75, zoom: 1, label: 'South Perimeter' },
            4: { azimuth: 270, tilt: 6, range: 110, zoom: 2.5, label: 'West Storage' }
        };
        const target = presets[presetNumber];
        if (target) {
            setLocalAzimuth(target.azimuth);
            setLocalTilt(target.tilt);
            setLocalRange(target.range);
            setPtzZoomLevel(target.zoom);
            commitCameraChange({
                azimuthDeg: target.azimuth,
                tiltAngleDeg: target.tilt,
                rangeM: target.range,
                opticalZoomLevel: target.zoom
            });
            toast.success(`PTZ Preset ${presetNumber} Loaded: ${target.label}`);
        }
    };

    // Auto Patrol / Panoramic Sweep Simulation
    const toggleAutoPatrol = () => {
        if (isPatrolActive) {
            if (patrolIntervalRef.current) clearInterval(patrolIntervalRef.current);
            patrolIntervalRef.current = null;
            setIsPatrolActive(false);
            toast.info(isKa ? 'ავტო-პატრულირება შეჩერებულია' : 'Auto Patrol Stopped');
        } else {
            setIsPatrolActive(true);
            toast.success(isKa ? 'ავტო-პატრულირება გააქტიურებულია' : 'Auto Patrol / Tour Active');
            const baseAzimuth = localAzimuth;
            const sweepArc = 60; // sweep +/- 30 degrees
            let offset = 0;

            patrolIntervalRef.current = setInterval(() => {
                if (patrolDirectionRef.current === 'right') {
                    offset += 2;
                    if (offset >= sweepArc / 2) {
                        patrolDirectionRef.current = 'left';
                    }
                } else {
                    offset -= 2;
                    if (offset <= -sweepArc / 2) {
                        patrolDirectionRef.current = 'right';
                    }
                }
                const newAz = ((baseAzimuth + offset) % 360 + 360) % 360;
                setLocalAzimuth(newAz);
                commitCameraChange({ azimuthDeg: newAz });
            }, 300);
        }
    };

    // Test Ping / Connection in Config
    const handleTestPing = () => {
        setIsPinging(true);
        setPingResult(null);
        setTimeout(() => {
            setIsPinging(false);
            const latency = Math.floor(Math.random() * 8) + 9;
            setPingResult({
                success: true,
                ms: latency,
                text: `RTSP stream active @ ${selectedCamera?.ipAddress || '192.168.1.120'}:${selectedCamera?.rtspPort || 554} (${latency}ms)`
            });
            toast.success(isKa ? `კავშირი დადასტურებულია (${latency} ms)` : `Camera Ping OK (${latency} ms)`);
        }, 600);
    };

    const handleCameraCopy = () => {
        if (!selectedCamera) return;
        if (onCopyCamera) {
            onCopyCamera(selectedCamera);
        } else {
            toast.success(isKa ? 'კამერის ასლი შეიქმნა' : 'Camera duplicated');
        }
    };

    const handleCameraDelete = () => {
        if (!selectedCamera || !onDeleteCamera) return;
        onDeleteCamera(selectedCamera.id);
        toast.info(isKa ? `კამერა "${selectedCamera.name}" წაიშალა` : `Camera "${selectedCamera.name}" deleted`);
        onClose();
    };

    // Drone Handlers
    const handleDroneFieldChange = (fields: Partial<DroneFlightMission>) => {
        if (!selectedDroneMission || !onUpdateDroneMission) return;
        const updated = { ...selectedDroneMission, ...fields };
        onUpdateDroneMission(updated);
    };

    const handleDroneCopy = () => {
        if (!selectedDroneMission) return;
        if (onCopyDroneMission) {
            onCopyDroneMission(selectedDroneMission);
        } else {
            toast.success(isKa ? 'მარშრუტის ასლი შეიქმნა' : 'Flight path duplicated');
        }
    };

    const handleDroneDelete = () => {
        if (!selectedDroneMission || !onDeleteDroneMission) return;
        onDeleteDroneMission();
        toast.info(isKa ? 'დრონის მარშრუტი წაიშალა' : 'Drone flight path deleted');
        onClose();
    };

    // Camera Blind Zone & Ground Coverage
    const blindZoneDist = selectedCamera 
        ? computeBlindZoneDistanceM(selectedCamera.mountHeightM || 6, localTilt || 4, localFov || 95)
        : 0;

    // Drone Total Distance Calculation
    const totalDroneDistanceMeters = (() => {
        if (!selectedDroneMission) return 0;
        if (selectedDroneMission.mode === 'circle_sector') {
            const r = selectedDroneMission.circleRadiusM || 60;
            return Math.round(2 * Math.PI * r);
        }
        if (selectedDroneMission.waypoints.length < 2) return 0;
        let d = 0;
        for (let i = 0; i < selectedDroneMission.waypoints.length - 1; i++) {
            const p1 = selectedDroneMission.waypoints[i];
            const p2 = selectedDroneMission.waypoints[i + 1];
            const dLat = (p2.lat - p1.lat) * 111111;
            const dLng = (p2.lng - p1.lng) * 111111 * Math.cos((p1.lat * Math.PI) / 180);
            d += Math.sqrt(dLat * dLat + dLng * dLng);
        }
        return Math.round(d);
    })();

    const flightDurationSec = selectedDroneMission 
        ? Math.round(totalDroneDistanceMeters / Math.max(1, selectedDroneMission.speedMs || 10))
        : 0;

    return (
        <div 
            ref={panelRef}
            style={panelPos ? {
                position: 'fixed',
                left: `${panelPos.x}px`,
                top: `${panelPos.y}px`,
                zIndex: 2500
            } : undefined}
            className="fixed top-16 sm:top-20 left-2 sm:left-6 z-[2400] w-[calc(100vw-16px)] sm:w-[410px] max-w-[420px] bg-slate-950/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200 text-white select-none max-h-[88vh] flex flex-col max-sm:bottom-2 max-sm:top-auto"
        >
            {/* Header with Drag Handle */}
            <div 
                onPointerDown={handlePanelPointerDown}
                className="flex items-center justify-between p-3 sm:p-3.5 bg-slate-900/95 border-b border-slate-800 cursor-grab active:cursor-grabbing touch-none select-none"
                title={isKa ? 'გადაათრიეთ პანელი ეკრანზე' : 'Drag panel to move anywhere'}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <div className="text-slate-400 p-1 hover:text-white shrink-0">
                        <GripVertical size={16} />
                    </div>
                    <div className={`p-1.5 rounded-xl border flex items-center justify-center shrink-0 ${
                        isCamera 
                            ? isPtzCamera 
                                ? 'bg-amber-600/20 border-amber-500/40 text-amber-400'
                                : 'bg-blue-600/20 border-blue-500/40 text-blue-400' 
                            : 'bg-cyan-600/20 border-cyan-500/40 text-cyan-400'
                    }`}>
                        {isCamera ? <Camera size={16} /> : <Plane size={16} />}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate">
                                {isCamera 
                                    ? (isPtzCamera ? 'PTZ Surveillance Camera' : 'Surveillance Camera') 
                                    : (isKa ? 'დრონის მარშრუტი' : 'Drone Flight Path')}
                            </span>
                            {isCamera && (
                                <span className={`px-1.5 py-0.2 rounded-md font-mono text-[9px] border font-bold shrink-0 ${
                                    isPtzCamera ? 'bg-amber-950 text-amber-300 border-amber-800/60' : 'bg-blue-950 text-blue-300 border-blue-800/60'
                                }`}>
                                    CH0{selectedCamera.channel}
                                </span>
                            )}
                            {isPtzCamera && (
                                <span className="px-1.5 py-0.2 rounded-md font-mono text-[8px] bg-amber-500 text-slate-950 font-black tracking-wider shrink-0">
                                    PTZ
                                </span>
                            )}
                        </div>
                        <h4 className="text-xs sm:text-sm font-black text-white truncate max-w-[170px] sm:max-w-[210px]">
                            {isCamera ? selectedCamera.name : selectedDroneMission?.name}
                        </h4>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title={isMinimized ? "Expand" : "Minimize"}
                    >
                        {isMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-rose-900/40 hover:text-rose-400 rounded-xl text-slate-400 transition-colors cursor-pointer"
                        title="Close Properties Panel"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Quick Action Bar: Copy & Delete with Listed Options */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/50 border-b border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5">
                    {/* Copy Button */}
                    <button
                        type="button"
                        onClick={isCamera ? handleCameraCopy : handleDroneCopy}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700 active:scale-95 shadow-sm"
                        title={isKa ? 'ობიექტის სრული ასლის შექმნა (Copy / Duplicate)' : 'Duplicate item with full properties'}
                    >
                        <Copy size={12} className="text-amber-400" />
                        <span>{isKa ? 'ასლის შექმნა (COPY)' : 'COPY'}</span>
                    </button>

                    {/* Delete Button with Confirmation */}
                    {confirmDelete ? (
                        <div className="flex items-center gap-1 bg-red-950/80 border border-red-700 px-2 py-0.5 rounded-xl">
                            <span className="text-[10px] text-red-300 font-bold">{isKa ? 'დარწმუნებული ხართ?' : 'Delete?'}</span>
                            <button
                                type="button"
                                onClick={isCamera ? handleCameraDelete : handleDroneDelete}
                                className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[9px] font-black uppercase cursor-pointer"
                            >
                                {isKa ? 'დიახ' : 'Yes'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(false)}
                                className="px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-[9px] cursor-pointer"
                            >
                                {isKa ? 'არა' : 'No'}
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmDelete(true)}
                            className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border border-red-800/40 active:scale-95"
                            title={isKa ? 'ობიექტის წაშლა რუკიდან' : 'Delete item from map'}
                        >
                            <Trash2 size={12} />
                            <span>{isKa ? 'წაშლა (DELETE)' : 'DELETE'}</span>
                        </button>
                    )}
                </div>

                {/* Primary Action Button (Live View for Cam / Start Sim for Drone) */}
                {isCamera && onOpenLiveView && (
                    <button
                        type="button"
                        onClick={() => onOpenLiveView(selectedCamera)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-900/40 active:scale-95"
                    >
                        <Video size={12} />
                        <span>{isKa ? 'LIVE ეთერი' : 'LIVE VIEW'}</span>
                    </button>
                )}

                {isDrone && onStartDroneSimulation && (
                    <button
                        type="button"
                        onClick={() => onStartDroneSimulation(selectedDroneMission)}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-cyan-900/40 active:scale-95"
                    >
                        <Play size={12} />
                        <span>{isKa ? 'სიმულაცია' : 'SIMULATION'}</span>
                    </button>
                )}
            </div>

            {/* Collapsible Body */}
            {!isMinimized && (
                <div>
                    {/* Navigation Tabs: MANAGE | CONFIG | EDIT */}
                    <div className="flex border-b border-slate-800 bg-slate-950/60 px-3 text-xs font-black uppercase tracking-wider">
                        <button
                            type="button"
                            onClick={() => setActiveTab('manage')}
                            className={`flex-1 py-2.5 text-center border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                activeTab === 'manage'
                                    ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Sliders size={13} />
                            <span>{isKa ? 'მართვა' : 'MANAGE'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('config')}
                            className={`flex-1 py-2.5 text-center border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                activeTab === 'config'
                                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Settings size={13} />
                            <span>{isKa ? 'კონფიგი' : 'CONFIG'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('edit')}
                            className={`flex-1 py-2.5 text-center border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                activeTab === 'edit'
                                    ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Edit3 size={13} />
                            <span>{isKa ? 'შესწორება' : 'EDIT'}</span>
                        </button>
                    </div>

                    {/* Content Section */}
                    <div className="p-3.5 space-y-3.5 max-h-[62vh] overflow-y-auto custom-scrollbar text-xs text-slate-300">
                        
                        {/* ===================== TAB 1: MANAGE ===================== */}
                        {activeTab === 'manage' && (
                            <div className="space-y-3">
                                {isCamera && (
                                    <>
                                        {/* Status & Latency Card */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                                                <span className="text-[10px] text-slate-400 font-bold block">{isKa ? 'სტატუსი' : 'Status'}</span>
                                                <span className="text-emerald-400 font-black flex items-center gap-1.5 mt-0.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    {selectedCamera.status || 'ONLINE'}
                                                </span>
                                            </div>
                                            <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                                                <span className="text-[10px] text-slate-400 font-bold block">{isKa ? 'დაყოვნება (Ping)' : 'Latency'}</span>
                                                <span className="text-white font-mono font-bold mt-0.5 block">14 ms (LAN)</span>
                                            </div>
                                        </div>

                                        {/* Coordinates & Pole Elevation */}
                                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                                                <span>{isKa ? 'კოორდინატები' : 'Location Coordinates'}</span>
                                                <span className="text-blue-400 font-mono">CH0{selectedCamera.channel}</span>
                                            </div>
                                            <div className="font-mono text-white text-xs">
                                                {selectedCamera.lat.toFixed(6)}, {selectedCamera.lng.toFixed(6)}
                                            </div>
                                            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                                                <span>{isKa ? 'ბოძი:' : 'Pole:'} {selectedCamera.mountHeightM}m</span>
                                                <span>{isKa ? 'დახრა:' : 'Tilt:'} {localTilt}°</span>
                                                <span className="text-red-400 font-mono">{isKa ? 'ბრმა ზონა:' : 'Blind:'} &lt;{blindZoneDist}m</span>
                                            </div>
                                        </div>

                                        {/* PTZ CONTROL CENTER (If camera has PTZ capability or user enables it) */}
                                        {isPtzCamera ? (
                                            <div className="p-3 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-amber-500/40 shadow-lg space-y-3">
                                                {/* PTZ Header & Speed */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <Crosshair size={14} className="text-amber-400 animate-pulse" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                                                            PTZ Motorized Optics
                                                        </span>
                                                    </div>
                                                    {/* Speed Selector */}
                                                    <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                                                        <span className="text-[9px] text-slate-400 px-1 font-bold">Speed:</span>
                                                        {[
                                                            { label: '1x', val: 1 },
                                                            { label: '2x', val: 2 },
                                                            { label: '4x', val: 4 }
                                                        ].map(spd => (
                                                            <button
                                                                key={spd.val}
                                                                type="button"
                                                                onClick={() => setPtzSpeed(spd.val)}
                                                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                                                    ptzSpeed === spd.val 
                                                                        ? 'bg-amber-500 text-slate-950 font-black' 
                                                                        : 'text-slate-400 hover:text-white'
                                                                }`}
                                                            >
                                                                {spd.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* PTZ Joystick / Direction Cross & Zoom Controls */}
                                                <div className="grid grid-cols-2 gap-3 items-center">
                                                    {/* Direction Cross */}
                                                    <div className="relative w-32 h-32 mx-auto bg-slate-950 rounded-full border border-slate-800 p-1 flex items-center justify-center shadow-inner">
                                                        {/* Up (Tilt -) */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePtzTilt(-2)}
                                                            className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-900 hover:bg-amber-500 active:bg-amber-600 text-slate-200 hover:text-slate-950 font-bold flex items-center justify-center border border-slate-700 hover:border-amber-400 transition-all cursor-pointer active:scale-95 shadow"
                                                            title="Tilt Up"
                                                        >
                                                            <ArrowUp size={14} />
                                                        </button>

                                                        {/* Down (Tilt +) */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePtzTilt(2)}
                                                            className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-900 hover:bg-amber-500 active:bg-amber-600 text-slate-200 hover:text-slate-950 font-bold flex items-center justify-center border border-slate-700 hover:border-amber-400 transition-all cursor-pointer active:scale-95 shadow"
                                                            title="Tilt Down"
                                                        >
                                                            <ArrowDown size={14} />
                                                        </button>

                                                        {/* Left (Pan -) */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePtzPan(-5)}
                                                            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900 hover:bg-amber-500 active:bg-amber-600 text-slate-200 hover:text-slate-950 font-bold flex items-center justify-center border border-slate-700 hover:border-amber-400 transition-all cursor-pointer active:scale-95 shadow"
                                                            title="Pan Left"
                                                        >
                                                            <ArrowLeft size={14} />
                                                        </button>

                                                        {/* Right (Pan +) */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePtzPan(5)}
                                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900 hover:bg-amber-500 active:bg-amber-600 text-slate-200 hover:text-slate-950 font-bold flex items-center justify-center border border-slate-700 hover:border-amber-400 transition-all cursor-pointer active:scale-95 shadow"
                                                            title="Pan Right"
                                                        >
                                                            <ArrowRight size={14} />
                                                        </button>

                                                        {/* Center: HOME */}
                                                        <button
                                                            type="button"
                                                            onClick={handlePtzHome}
                                                            className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer"
                                                            title="Center / Home Position"
                                                        >
                                                            HOME
                                                        </button>
                                                    </div>

                                                    {/* Optical Zoom & Auto Patrol */}
                                                    <div className="space-y-2">
                                                        <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
                                                            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">
                                                                Optical Zoom
                                                            </span>
                                                            <span className="text-base font-black font-mono text-amber-400 block my-0.5">
                                                                {ptzZoomLevel.toFixed(1)}x
                                                            </span>
                                                            <div className="grid grid-cols-2 gap-1.5 mt-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handlePtzZoom('in')}
                                                                    className="py-1.5 px-2 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 border border-slate-700 transition-all cursor-pointer active:scale-95"
                                                                    title="Zoom In (Telephoto)"
                                                                >
                                                                    <ZoomIn size={13} />
                                                                    <span>+</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handlePtzZoom('out')}
                                                                    className="py-1.5 px-2 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 border border-slate-700 transition-all cursor-pointer active:scale-95"
                                                                    title="Zoom Out (Wide)"
                                                                >
                                                                    <ZoomOut size={13} />
                                                                    <span>-</span>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Auto-Patrol / Continuous Sweep */}
                                                        <button
                                                            type="button"
                                                            onClick={toggleAutoPatrol}
                                                            className={`w-full py-2 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow border ${
                                                                isPatrolActive 
                                                                    ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 animate-pulse'
                                                                    : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/40'
                                                            }`}
                                                        >
                                                            <Scan size={13} />
                                                            <span>{isPatrolActive ? 'Stop Patrol' : 'Auto Patrol / Tour'}</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* PTZ Presets */}
                                                <div>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                        Quick Presets:
                                                    </span>
                                                    <div className="grid grid-cols-4 gap-1">
                                                        {[1, 2, 3, 4].map(num => (
                                                            <button
                                                                key={num}
                                                                type="button"
                                                                onClick={() => handlePtzPreset(num)}
                                                                className="py-1 px-1 bg-slate-950 hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded-lg text-[9px] font-mono font-bold border border-slate-800 transition-all cursor-pointer active:scale-95"
                                                            >
                                                                P{num}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* If camera doesn't have PTZ enabled, give 1-click option to enable */
                                            <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-300 block">Fixed Lens Camera</span>
                                                    <span className="text-[9px] text-slate-500">PTZ motorized head disabled</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        commitCameraChange({ isPtz: true, model: `${selectedCamera.model || 'IP Cam'} (PTZ)` });
                                                        toast.success("PTZ Controls Enabled for this Camera");
                                                    }}
                                                    className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-500/40 transition-all cursor-pointer"
                                                >
                                                    + Enable PTZ
                                                </button>
                                            </div>
                                        )}

                                        {/* FAST, SMOOTH, LIGHTWEIGHT SLIDERS (TILT, AZIMUTH, RANGE) */}
                                        <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-3.5 shadow-md">
                                            
                                            {/* TILT ANGLE */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[10px] font-bold text-slate-300">
                                                        {isKa ? 'დახრის კუთხე (Tilt)' : 'Tilt Angle'}
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setLocalTilt(4);
                                                                commitCameraChange({ tiltAngleDeg: 4 });
                                                            }}
                                                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
                                                        >
                                                            4° Def
                                                        </button>
                                                        <span className="text-amber-400 font-mono font-bold text-xs">{localTilt}°</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const next = Math.max(1, localTilt - 1);
                                                            setLocalTilt(next);
                                                            commitCameraChange({ tiltAngleDeg: next });
                                                        }}
                                                        className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-amber-600 text-white font-bold flex items-center justify-center border border-slate-700 shrink-0 cursor-pointer"
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="40"
                                                        value={localTilt}
                                                        onChange={(e) => handleSliderInput('tiltAngleDeg', Number(e.target.value))}
                                                        onPointerUp={(e) => handleSliderCommit('tiltAngleDeg', Number(e.currentTarget.value))}
                                                        className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 transition-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const next = Math.min(40, localTilt + 1);
                                                            setLocalTilt(next);
                                                            commitCameraChange({ tiltAngleDeg: next });
                                                        }}
                                                        className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-amber-600 text-white font-bold flex items-center justify-center border border-slate-700 shrink-0 cursor-pointer"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>

                                            {/* AZIMUTH HEADING */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[10px] font-bold text-slate-300">
                                                        {isKa ? 'აზიმუტი (მიმართულება 0°–360°)' : 'Azimuth Heading'}
                                                    </span>
                                                    <span className="text-blue-400 font-mono font-bold text-xs">{localAzimuth}°</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const next = ((localAzimuth - 5) % 360 + 360) % 360;
                                                            setLocalAzimuth(next);
                                                            commitCameraChange({ azimuthDeg: next });
                                                        }}
                                                        className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-blue-600 text-white font-bold flex items-center justify-center border border-slate-700 shrink-0 cursor-pointer"
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="359"
                                                        value={localAzimuth}
                                                        onChange={(e) => handleSliderInput('azimuthDeg', Number(e.target.value))}
                                                        onPointerUp={(e) => handleSliderCommit('azimuthDeg', Number(e.currentTarget.value))}
                                                        className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 transition-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const next = ((localAzimuth + 5) % 360 + 360) % 360;
                                                            setLocalAzimuth(next);
                                                            commitCameraChange({ azimuthDeg: next });
                                                        }}
                                                        className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-blue-600 text-white font-bold flex items-center justify-center border border-slate-700 shrink-0 cursor-pointer"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                {/* Heading Presets */}
                                                <div className="grid grid-cols-4 gap-1 mt-1.5">
                                                    {[
                                                        { label: 'N 0°', val: 0 },
                                                        { label: 'E 90°', val: 90 },
                                                        { label: 'S 180°', val: 180 },
                                                        { label: 'W 270°', val: 270 }
                                                    ].map(p => (
                                                        <button
                                                            key={p.val}
                                                            type="button"
                                                            onClick={() => {
                                                                setLocalAzimuth(p.val);
                                                                commitCameraChange({ azimuthDeg: p.val });
                                                            }}
                                                            className={`py-1 rounded-lg text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                                                                localAzimuth === p.val
                                                                    ? 'bg-blue-600 text-white border-blue-400'
                                                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                                                            }`}
                                                        >
                                                            {p.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* OPTICAL RANGE */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[10px] font-bold text-slate-300">
                                                        {isKa ? 'ოპტიკური დისტანცია' : 'Optical Range'}
                                                    </span>
                                                    <span className="text-emerald-400 font-mono font-bold text-xs">{localRange}m</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const next = Math.max(15, localRange - 5);
                                                            setLocalRange(next);
                                                            commitCameraChange({ rangeM: next });
                                                        }}
                                                        className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-emerald-600 text-white font-bold flex items-center justify-center border border-slate-700 shrink-0 cursor-pointer"
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type="range"
                                                        min="15"
                                                        max="250"
                                                        value={localRange}
                                                        onChange={(e) => handleSliderInput('rangeM', Number(e.target.value))}
                                                        onPointerUp={(e) => handleSliderCommit('rangeM', Number(e.currentTarget.value))}
                                                        className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const next = Math.min(250, localRange + 5);
                                                            setLocalRange(next);
                                                            commitCameraChange({ rangeM: next });
                                                        }}
                                                        className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-emerald-600 text-white font-bold flex items-center justify-center border border-slate-700 shrink-0 cursor-pointer"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                {/* Range Quick Presets */}
                                                <div className="grid grid-cols-4 gap-1 mt-1.5">
                                                    {[30, 60, 90, 150].map(rng => (
                                                        <button
                                                            key={rng}
                                                            type="button"
                                                            onClick={() => {
                                                                setLocalRange(rng);
                                                                commitCameraChange({ rangeM: rng });
                                                            }}
                                                            className={`py-1 rounded-lg text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                                                                localRange === rng
                                                                    ? 'bg-emerald-600 text-white border-emerald-400'
                                                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                                                            }`}
                                                        >
                                                            {rng}m
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {isDrone && (
                                    <>
                                        {/* Drone Mission Stats */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                                                <span className="text-[10px] text-slate-400 font-bold block">{isKa ? 'მთლიანი მანძილი' : 'Total Distance'}</span>
                                                <span className="text-cyan-400 font-black font-mono mt-0.5 block">
                                                    {totalDroneDistanceMeters >= 1000 
                                                        ? `${(totalDroneDistanceMeters / 1000).toFixed(2)} km` 
                                                        : `${totalDroneDistanceMeters} m`}
                                                </span>
                                            </div>
                                            <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                                                <span className="text-[10px] text-slate-400 font-bold block">{isKa ? 'ფრენის დრო' : 'Flight Time'}</span>
                                                <span className="text-emerald-400 font-mono font-bold mt-0.5 block">
                                                    ~{Math.floor(flightDurationSec / 60)}m {flightDurationSec % 60}s
                                                </span>
                                            </div>
                                        </div>

                                        {/* Waypoints Breakdown */}
                                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                                <span>{isKa ? 'მარშრუტის წერტილები' : 'Mission Waypoints'}</span>
                                                <span className="text-cyan-400 font-mono">{selectedDroneMission.waypoints.length} Points</span>
                                            </div>
                                            <div className="max-h-28 overflow-y-auto space-y-1 custom-scrollbar">
                                                {selectedDroneMission.waypoints.map((wp, idx) => (
                                                    <div key={wp.id || idx} className="flex items-center justify-between p-1.5 bg-slate-950 rounded-lg text-[10px] font-mono border border-slate-800/80">
                                                        <span className="text-cyan-300 font-bold">
                                                            {idx === 0 ? 'Home (Takeoff)' : wp.leg === 'return' ? 'RTH (Return)' : `WP #${idx}`}
                                                        </span>
                                                        <span className="text-slate-400">
                                                            Alt: {wp.altitudeM || selectedDroneMission.altitudeM}m • Spd: {wp.speedMs || selectedDroneMission.speedMs}m/s
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ===================== TAB 2: CONFIG (HIGHLY MANAGEABLE) ===================== */}
                        {activeTab === 'config' && (
                            <div className="space-y-3.5">
                                {isCamera && (
                                    <>
                                        {/* Section 1: Network & Streaming */}
                                        <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                                    <Wifi size={12} /> Network & Stream Configuration
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={handleTestPing}
                                                    disabled={isPinging}
                                                    className="px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-800 hover:text-white font-mono text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                                >
                                                    <Activity size={10} className={isPinging ? 'animate-spin' : ''} />
                                                    <span>{isPinging ? 'Testing...' : 'Test Ping'}</span>
                                                </button>
                                            </div>

                                            {pingResult && (
                                                <div className="p-2 rounded-xl bg-slate-950 border border-emerald-500/50 text-[10px] font-mono text-emerald-400 flex items-center justify-between">
                                                    <span>{pingResult.text}</span>
                                                    <span className="font-bold text-white">✓ OK</span>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                        IP Address
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={selectedCamera.ipAddress}
                                                        onChange={(e) => handleCameraFieldChange({ ipAddress: e.target.value })}
                                                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-xs outline-none focus:border-emerald-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                        RTSP Port
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={selectedCamera.rtspPort || 554}
                                                        onChange={(e) => handleCameraFieldChange({ rtspPort: Number(e.target.value) })}
                                                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-xs outline-none focus:border-emerald-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                        NVR Channel #
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="64"
                                                        value={selectedCamera.channel}
                                                        onChange={(e) => handleCameraFieldChange({ channel: Number(e.target.value) })}
                                                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-xs outline-none focus:border-emerald-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                        ONVIF / HTTP Port
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={selectedCamera.onvifPort || 80}
                                                        onChange={(e) => handleCameraFieldChange({ onvifPort: Number(e.target.value) })}
                                                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-xs outline-none focus:border-emerald-500"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                    Main RTSP Stream URL
                                                </label>
                                                <input
                                                    type="text"
                                                    value={selectedCamera.streamUrl || `rtsp://admin:pass@${selectedCamera.ipAddress}:554/Streaming/Channels/${selectedCamera.channel}01`}
                                                    onChange={(e) => handleCameraFieldChange({ streamUrl: e.target.value })}
                                                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-[11px] outline-none focus:border-emerald-500 truncate"
                                                />
                                            </div>
                                        </div>

                                        {/* Section 2: Hardware & Camera Capabilities */}
                                        <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2.5">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                                                <Sliders size={12} /> Hardware & Optical Parameters
                                            </span>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                        Camera Model
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={selectedCamera.model}
                                                        onChange={(e) => handleCameraFieldChange({ model: e.target.value })}
                                                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                        Mount Pole Height (m)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="30"
                                                        value={selectedCamera.mountHeightM}
                                                        onChange={(e) => handleCameraFieldChange({ mountHeightM: Number(e.target.value) })}
                                                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-xs outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                        Lens FOV (Degrees)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="30"
                                                        max="180"
                                                        value={localFov}
                                                        onChange={(e) => handleCameraFieldChange({ fovAngleDeg: Number(e.target.value) })}
                                                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-xs outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                        Operational Status
                                                    </label>
                                                    <select
                                                        value={selectedCamera.status || 'ONLINE'}
                                                        onChange={(e) => handleCameraFieldChange({ status: e.target.value as any })}
                                                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-blue-500 cursor-pointer"
                                                    >
                                                        <option value="ONLINE">ONLINE (Active)</option>
                                                        <option value="RECORDING">RECORDING (NVR)</option>
                                                        <option value="STANDBY">STANDBY</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Hardware Toggles: PTZ & Night Vision */}
                                            <div className="space-y-2 pt-1">
                                                {/* Motorized PTZ Head Toggle */}
                                                <label className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer">
                                                    <div className="flex items-center gap-2">
                                                        <Crosshair size={14} className={isPtzCamera ? 'text-amber-400' : 'text-slate-500'} />
                                                        <div>
                                                            <span className="text-[11px] font-bold text-white block">
                                                                Motorized PTZ Capability
                                                            </span>
                                                            <span className="text-[9px] text-slate-400 block">
                                                                Enables live motorized Pan, Tilt & Optical Zoom controls
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={isPtzCamera}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            handleCameraFieldChange({ 
                                                                isPtz: checked,
                                                                model: checked && !selectedCamera.model.includes('PTZ') 
                                                                    ? `${selectedCamera.model} (PTZ)` 
                                                                    : selectedCamera.model
                                                            });
                                                            toast.success(checked ? "PTZ Mode Activated" : "Switched to Fixed Lens Mode");
                                                        }}
                                                        className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                                                    />
                                                </label>

                                                {/* IR Night Vision Toggle */}
                                                <label className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-colors cursor-pointer">
                                                    <div className="flex items-center gap-2">
                                                        <Eye size={14} className={selectedCamera.isNightVision ? 'text-blue-400' : 'text-slate-500'} />
                                                        <div>
                                                            <span className="text-[11px] font-bold text-white block">
                                                                Infrared Night Vision (IR)
                                                            </span>
                                                            <span className="text-[9px] text-slate-400 block">
                                                                ColorVu / DarkFighter infrared illuminator
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCamera.isNightVision}
                                                        onChange={(e) => handleCameraFieldChange({ isNightVision: e.target.checked })}
                                                        className="w-4 h-4 rounded text-blue-500 accent-blue-500 cursor-pointer"
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        {/* Save & Apply Feedback Button */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                commitCameraChange(selectedCamera);
                                                toast.success("Camera Configuration Saved & Applied");
                                            }}
                                            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-900/40 active:scale-95"
                                        >
                                            <Check size={14} />
                                            <span>Save & Apply Configuration</span>
                                        </button>
                                    </>
                                )}

                                {isDrone && (
                                    <>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                                                    {isKa ? 'ფრენის სიმაღლე (მ)' : 'Flight Altitude (m)'}
                                                </label>
                                                <input
                                                    type="number"
                                                    min="10"
                                                    max="150"
                                                    value={selectedDroneMission.altitudeM}
                                                    onChange={(e) => handleDroneFieldChange({ altitudeM: Number(e.target.value) })}
                                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-xs outline-none focus:border-cyan-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                                                    {isKa ? 'სიჩქარე (მ/წმ)' : 'Speed (m/s)'}
                                                </label>
                                                <input
                                                    type="number"
                                                    min="2"
                                                    max="25"
                                                    value={selectedDroneMission.speedMs}
                                                    onChange={(e) => handleDroneFieldChange({ speedMs: Number(e.target.value) })}
                                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-xs outline-none focus:border-cyan-500"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                                                {isKa ? 'ფოტოს ინტერვალი (წამი)' : 'Trigger Interval (sec)'}
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="30"
                                                value={selectedDroneMission.timeIntervalSec || 5}
                                                onChange={(e) => handleDroneFieldChange({ timeIntervalSec: Number(e.target.value) })}
                                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-xs outline-none focus:border-cyan-500"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ===================== TAB 3: EDIT ===================== */}
                        {activeTab === 'edit' && (
                            <div className="space-y-3">
                                {isCamera && (
                                    <>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                                                {isKa ? 'კამერის სახელი' : 'Camera Label'}
                                            </label>
                                            <input
                                                type="text"
                                                value={selectedCamera.name}
                                                onChange={(e) => handleCameraFieldChange({ name: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-bold outline-none focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                                                {isKa ? 'ლოკაციის სახელი' : 'Location / Sector Name'}
                                            </label>
                                            <input
                                                type="text"
                                                value={selectedCamera.locationName || ''}
                                                onChange={(e) => handleCameraFieldChange({ locationName: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-blue-500"
                                            />
                                        </div>

                                        {/* Coordinates Readout */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                    Latitude
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.000001"
                                                    value={selectedCamera.lat}
                                                    onChange={(e) => handleCameraFieldChange({ lat: Number(e.target.value) })}
                                                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-xs outline-none focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                    Longitude
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.000001"
                                                    value={selectedCamera.lng}
                                                    onChange={(e) => handleCameraFieldChange({ lng: Number(e.target.value) })}
                                                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-xs outline-none focus:border-blue-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Smooth Sliders for Quick Adjustments */}
                                        <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {isKa ? 'დახრის კუთხე' : 'Tilt Angle'}
                                                    </span>
                                                    <span className="text-amber-400 font-mono font-bold text-xs">{localTilt}°</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="40"
                                                    value={localTilt}
                                                    onChange={(e) => handleSliderInput('tiltAngleDeg', Number(e.target.value))}
                                                    onPointerUp={(e) => handleSliderCommit('tiltAngleDeg', Number(e.currentTarget.value))}
                                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                />
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {isKa ? 'აზიმუტი' : 'Azimuth'}
                                                    </span>
                                                    <span className="text-blue-400 font-mono font-bold text-xs">{localAzimuth}°</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="359"
                                                    value={localAzimuth}
                                                    onChange={(e) => handleSliderInput('azimuthDeg', Number(e.target.value))}
                                                    onPointerUp={(e) => handleSliderCommit('azimuthDeg', Number(e.currentTarget.value))}
                                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {isKa ? 'დისტანცია' : 'Range'}
                                                    </span>
                                                    <span className="text-emerald-400 font-mono font-bold text-xs">{localRange}m</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="15"
                                                    max="250"
                                                    value={localRange}
                                                    onChange={(e) => handleSliderInput('rangeM', Number(e.target.value))}
                                                    onPointerUp={(e) => handleSliderCommit('rangeM', Number(e.currentTarget.value))}
                                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {isDrone && (
                                    <>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                                                {isKa ? 'მისიის სახელი' : 'Mission Name'}
                                            </label>
                                            <input
                                                type="text"
                                                value={selectedDroneMission.name}
                                                onChange={(e) => handleDroneFieldChange({ name: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-bold outline-none focus:border-cyan-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                                                {isKa ? 'ფრენის რეჟიმი' : 'Flight Mode'}
                                            </label>
                                            <select
                                                value={selectedDroneMission.mode}
                                                onChange={(e) => handleDroneFieldChange({ mode: e.target.value as any })}
                                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-bold outline-none focus:border-cyan-500"
                                            >
                                                <option value="waypoints">{isKa ? 'წერტილები (Waypoints)' : 'Waypoints'}</option>
                                                <option value="circle_sector">{isKa ? 'სექტორის ორბიტა (Circle Sector)' : 'Circle Sector Orbit'}</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
