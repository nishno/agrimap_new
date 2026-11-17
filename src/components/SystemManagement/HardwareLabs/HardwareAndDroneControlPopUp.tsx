import React, { useState } from 'react';
import {
    Camera, Navigation, Sliders, Eye, EyeOff, Mountain,
    Video, Plus, Copy, Trash2, Move, Maximize2, Minimize2,
    X, AlertTriangle, Check, Layers, Film, Sparkles,
    Satellite, Compass, ShieldCheck, ChevronDown, Radio,
    RotateCcw, Activity, Droplets, User, ZoomIn
} from 'lucide-react';
import type { PlantationCamera } from './CameraNvrLab';
import type { SandboxDroneMission } from './HardwareTestingSandboxMap';
import type { HillSpineProfile, SpineControlPoint } from '../../../utils/demTerrainViewshed';
import { getElevationAtCoords, getSlopeAndAspect } from '../../../utils/demTerrainViewshed';
import { computeBlindZoneDistanceM } from '../../../utils/cameraGeospatial';
import { DeviceControlPanel } from './DeviceControlPanel';

export interface RegisteredPlantationArea {
    id: string;
    name: string;
    nameKa: string;
    sectorName: string;
    center: [number, number];
    elevationBaseM: number;
}

interface HardwareAndDroneControlPopUpProps {
    isOpen: boolean;
    onClose: () => void;
    isMinimized: boolean;
    onToggleMinimize: () => void;
    isMaximized: boolean;
    onToggleMaximize: () => void;
    activeMode: 'camera' | 'drone' | '3d' | 'windows';
    onChangeMode: (mode: 'camera' | 'drone' | '3d' | 'windows') => void;
    
    // Registered Plantation Areas
    registeredPlantations: RegisteredPlantationArea[];
    selectedPlantationId: string;
    onSelectPlantation: (id: string) => void;

    // Camera Management
    testCameras: PlantationCamera[];
    activeCamera: PlantationCamera;
    onSelectCamera: (camId: string) => void;
    onUpdateActiveCamera: (patch: Partial<PlantationCamera>) => void;
    onAddCamera: () => void;
    onDuplicateCamera: () => void;
    onDeleteActiveCamera: () => void;
    hiddenCameraIds: string[];
    onToggleHideCamera: (id: string) => void;
    onToggleHideAllCameras: () => void;
    onMoveActiveCameraOnMap: () => void;
    isMovingCamera: boolean;
    onOpenLiveCameraStream: (camera: PlantationCamera) => void;

    // Drone Management
    testDroneMission: SandboxDroneMission;
    onUpdateDroneMission: (patch: Partial<SandboxDroneMission>) => void;
    onFlySelectedTrenches: () => void;
    onToggleTrench: (trenchNum: number) => void;
    onDroneTakePhoto: (name?: string) => void;
    onDroneToggleRecordVideo: (name?: string) => void;
    isDroneLiveFeedOpen: boolean;
    onToggleDroneLiveFeed: (open: boolean) => void;

    // 3D Terrain & Satellite DEM
    is3dWindowOpen: boolean;
    onToggle3dWindow: (open: boolean) => void;
    hillSpineProfile: HillSpineProfile;
    activePointId: string;
    onSelectPointId: (ptId: string) => void;
    onUpdateActivePoint: (patch: Partial<SpineControlPoint>) => void;
    onAddSpinePoint: () => void;
    onDeleteSpinePoint: (ptId: string) => void;
    elevationExaggeration: number;
    onChangeExaggeration: (val: number) => void;
    isSatelliteDemLoaded: boolean;
    onLoadSatelliteDem: () => void;
    isAiSlopeScanning: boolean;
    onAiAutoDetectSlope: () => void;

    // Window & Tool Visibility Toggles
    visibility: {
        showCameras: boolean;
        showDronePath: boolean;
        showSoilSensors: boolean;
        showWaterSensors: boolean;
        showWorkersGps: boolean;
        showTrenches: boolean;
        showSeedlings: boolean;
        showBlindZones: boolean;
        showDirections: boolean;
        showTopToolbar?: boolean;
        showTrenchConfigBar?: boolean;
        showBottomHud?: boolean;
        showFleetTable?: boolean;
        show3dWindow?: boolean;
    };
    onToggleVisibility: (key: string) => void;

    isKa: boolean;
    baseLat: number;
    baseLng: number;
}

export const HardwareAndDroneControlPopUp: React.FC<HardwareAndDroneControlPopUpProps> = ({
    isOpen,
    onClose,
    isMinimized,
    onToggleMinimize,
    isMaximized,
    onToggleMaximize,
    activeMode,
    onChangeMode,
    registeredPlantations,
    selectedPlantationId,
    onSelectPlantation,
    testCameras,
    activeCamera,
    onSelectCamera,
    onUpdateActiveCamera,
    onAddCamera,
    onDuplicateCamera,
    onDeleteActiveCamera,
    hiddenCameraIds,
    onToggleHideCamera,
    onToggleHideAllCameras,
    onMoveActiveCameraOnMap,
    isMovingCamera,
    onOpenLiveCameraStream,
    testDroneMission,
    onUpdateDroneMission,
    onFlySelectedTrenches,
    onToggleTrench,
    onDroneTakePhoto,
    onDroneToggleRecordVideo,
    isDroneLiveFeedOpen,
    onToggleDroneLiveFeed,
    is3dWindowOpen,
    onToggle3dWindow,
    hillSpineProfile,
    activePointId,
    onSelectPointId,
    onUpdateActivePoint,
    onAddSpinePoint,
    onDeleteSpinePoint,
    elevationExaggeration,
    onChangeExaggeration,
    isSatelliteDemLoaded,
    onLoadSatelliteDem,
    isAiSlopeScanning,
    onAiAutoDetectSlope,
    visibility,
    onToggleVisibility,
    isKa,
    baseLat,
    baseLng
}) => {
    if (!isOpen) return null;

    const currentPlantation = registeredPlantations.find(p => p.id === selectedPlantationId) || registeredPlantations[0];
    const isCurrentCamHidden = hiddenCameraIds.includes(activeCamera?.id || '');
    const allCamsHidden = testCameras.length > 0 && testCameras.every(c => hiddenCameraIds.includes(c.id));
    const [showDeviceControl, setShowDeviceControl] = useState<boolean>(true);

    // Active hill spine point
    const activePoint = hillSpineProfile.points.find(p => p.id === activePointId) || hillSpineProfile.points[0] || {
        id: 'pt-A',
        name: 'Connection point A',
        lat: baseLat,
        lng: baseLng,
        widthM: 45,
        startOffsetM: 0,
        endDistanceM: 80,
        peakHeightM: 37,
        slopeFalloff: 'cosine' as const
    };

    // Minimized Compact Pill Mode
    if (isMinimized) {
        return (
            <div className="absolute top-3 left-3 z-[2500] px-3 py-2 bg-[#FAFBF8]/95 border border-[#D8E3D4] rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 text-xs text-[#163022]">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                    <span className="font-black text-[#1E3B2B] uppercase tracking-wider text-[11px]">
                        🛠️ {isKa ? 'მართვის Pop-up' : 'Control Pop-up'}
                    </span>
                    <span className="text-[#8DA394]">|</span>
                    <span className="text-blue-700 font-mono text-[10px] font-bold">[CH0{activeCamera?.channel || 1}]</span>
                    <span className="text-emerald-700 font-mono text-[10px] font-bold">{currentPlantation?.nameKa || currentPlantation?.name || 'Agrobari'}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onToggleMinimize}
                        className="px-2 py-0.5 bg-white text-[#1E3B2B] border border-[#CFDCCB] hover:bg-[#0284c7] hover:text-white hover:border-[#0284c7] rounded-lg text-[10px] font-bold cursor-pointer transition-all duration-200 shadow-2xs"
                        title="Expand Control Pop-up"
                    >
                        {isKa ? 'გახსნა' : 'Expand'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 text-[#6A8272] hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                        title="Close Pop-up"
                    >
                        <X size={13} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`
            ${isMaximized 
                ? 'fixed inset-4 z-[2800] rounded-3xl' 
                : 'fixed inset-x-3 top-16 bottom-4 md:inset-auto md:top-20 md:left-6 md:w-[560px] md:max-h-[86vh] z-[2200] rounded-3xl'
            }
            bg-[#FAFBF8]/98 border border-[#D8E3D4] shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden text-[#163022] transition-all select-none
        `}>
            {/* 1. MASTER HEADER */}
            <div className="p-3 sm:p-3.5 bg-[#EEF3EA] border-b border-[#D8E3D4] flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-white border border-[#D8E3D4] text-[#1E3B2B] shrink-0 shadow-2xs">
                        <Sliders size={18} className="stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-xs sm:text-sm text-[#163022] uppercase tracking-wider truncate">
                                {isKa ? 'მართვის Pop-up: კამერები, 3D & დრონი' : 'Mission Control Pop-up: Cam, 3D & Drone'}
                            </h3>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        </div>
                        <p className="text-[10px] text-[#4F6C5B] font-mono truncate font-semibold">
                            {isKa ? 'ორმხრივი სინქრონიზაცია რუკასთან' : 'Live Reciprocal Map & DEM Synchronization'}
                        </p>
                    </div>
                </div>

                {/* Pop-up Window Controls: Minimize, Maximize, Close */}
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={onToggleMinimize}
                        className="p-1.5 text-[#5F7A69] hover:text-[#1E3B2B] rounded-lg hover:bg-white cursor-pointer transition-colors shadow-2xs"
                        title={isKa ? 'ჩაკეცვა' : 'Minimize to badge'}
                    >
                        <Minimize2 size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={onToggleMaximize}
                        className="p-1.5 text-[#5F7A69] hover:text-[#1E3B2B] rounded-lg hover:bg-white cursor-pointer transition-colors shadow-2xs"
                        title={isMaximized ? (isKa ? 'შემცირება' : 'Restore size') : (isKa ? 'გადიდება' : 'Maximize Pop-up')}
                    >
                        <Maximize2 size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-[#5F7A69] hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors shadow-2xs"
                        title={isKa ? 'დახურვა' : 'Close Pop-up'}
                    >
                        <X size={15} />
                    </button>
                </div>
            </div>

            {/* 2. REGISTERED PLANTATION AREAS SELECTOR (TOP OF POP-UP) */}
            <div className="p-3 bg-[#F6F8F4] border-b border-[#D8E3D4] shrink-0 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-[#3B5B47] uppercase tracking-wider flex items-center gap-1.5">
                        <span className="text-emerald-600 font-black">🌱</span>
                        <span>{isKa ? 'რეგისტრირებული პლანტაციის არეალი:' : 'Registered Plantation Area:'}</span>
                    </span>
                    <span className="text-emerald-700 font-mono font-bold">
                        Elev Base: ~{currentPlantation?.elevationBaseM || 480}m ASL
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <select
                            value={selectedPlantationId}
                            onChange={(e) => onSelectPlantation(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#CFDCCB] hover:border-emerald-600 rounded-xl text-[#1E3B2B] text-xs font-bold font-mono cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400/50 appearance-none transition-all shadow-2xs"
                        >
                            {registeredPlantations.map((plant, pIdx) => (
                                <option key={`plant-${plant.id}-${pIdx}`} value={plant.id} className="bg-white text-[#163022]">
                                    📍 {isKa ? plant.nameKa : plant.name} • [{plant.center[0].toFixed(4)}, {plant.center[1].toFixed(4)}]
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-3 text-emerald-600 pointer-events-none" />
                    </div>

                    <button
                        type="button"
                        onClick={() => onSelectPlantation(selectedPlantationId)}
                        className="px-3 py-2 bg-white hover:bg-[#16a34a] hover:text-white hover:border-[#16a34a] text-[#1E3B2B] border border-[#CFDCCB] rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs shrink-0"
                        title={isKa ? 'პლანტაციაზე გადაფრენა' : 'Fly map to Plantation'}
                    >
                        <Navigation size={12} className="text-[#16a34a]" />
                        <span>{isKa ? 'გადაფრენა' : 'Fly'}</span>
                    </button>
                </div>
            </div>

            {/* 3. MODE NAVIGATION TABS */}
            <div className="grid grid-cols-4 gap-1 p-2 bg-[#EDF2E8] border-b border-[#D8E3D4] text-xs shrink-0">
                <button
                    type="button"
                    onClick={() => onChangeMode('camera')}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all duration-200 cursor-pointer shadow-2xs ${
                        activeMode === 'camera'
                            ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-300 font-black border border-blue-600'
                            : 'bg-white/95 text-[#244130] hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb] border border-[#CFDCCB]'
                    }`}
                >
                    <Camera size={13} className="shrink-0" />
                    <span className="text-[10px] uppercase truncate">{isKa ? 'კამერა' : 'Cameras'}</span>
                </button>

                <button
                    type="button"
                    onClick={() => onChangeMode('drone')}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all duration-200 cursor-pointer shadow-2xs ${
                        activeMode === 'drone'
                            ? 'bg-cyan-600 text-white shadow-md ring-1 ring-cyan-300 font-black border border-cyan-600'
                            : 'bg-white/95 text-[#244130] hover:bg-[#0891b2] hover:text-white hover:border-[#0891b2] border border-[#CFDCCB]'
                    }`}
                >
                    <Navigation size={13} className="shrink-0" />
                    <span className="text-[10px] uppercase truncate">{isKa ? 'დრონი' : 'Drone'}</span>
                </button>

                <button
                    type="button"
                    onClick={() => onChangeMode('3d')}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all duration-200 cursor-pointer shadow-2xs ${
                        activeMode === '3d'
                            ? 'bg-[#16a34a] text-white shadow-md ring-1 ring-emerald-300 font-black border border-emerald-600'
                            : 'bg-white/95 text-[#244130] hover:bg-[#16a34a] hover:text-white hover:border-[#16a34a] border border-[#CFDCCB]'
                    }`}
                >
                    <Mountain size={13} className="shrink-0" />
                    <span className="text-[10px] uppercase truncate">{isKa ? '3D & AI' : '3D Terrain'}</span>
                </button>

                <button
                    type="button"
                    onClick={() => onChangeMode('windows')}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all duration-200 cursor-pointer shadow-2xs ${
                        activeMode === 'windows'
                            ? 'bg-purple-600 text-white shadow-md ring-1 ring-purple-300 font-black border border-purple-600'
                            : 'bg-white/95 text-[#244130] hover:bg-[#8b5cf6] hover:text-white hover:border-[#8b5cf6] border border-[#CFDCCB]'
                    }`}
                >
                    <Layers size={13} className="shrink-0" />
                    <span className="text-[10px] uppercase truncate">{isKa ? 'ფანჯრები' : 'Windows'}</span>
                </button>
            </div>

            {/* 4. SCROLLABLE TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs text-[#163022]">

                {/* ========================================================= */}
                {/* TAB 1: CAMERAS HUB (CAMERA 01 TOOLS & FLEET CONTROLS) */}
                {/* ========================================================= */}
                {activeMode === 'camera' && (
                    <div className="space-y-3.5">
                        {/* Channel selector chips & Master actions */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A6753]">
                                    {isKa ? 'არჩეული კამერის არხი:' : 'Select Camera Channel:'}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={onAddCamera}
                                        className="px-2.5 py-1 bg-white hover:bg-[#16a34a] hover:text-white text-[#16a34a] border border-[#CFDCCB] rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all duration-200 active:scale-95 shadow-2xs"
                                        title="Add new camera"
                                    >
                                        <Plus size={11} className="stroke-[3]" />
                                        <span>+ Add Cam</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onDuplicateCamera}
                                        className="px-2.5 py-1 bg-white hover:bg-[#2563eb] hover:text-white text-[#244130] border border-[#CFDCCB] rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all duration-200 shadow-2xs"
                                        title="Duplicate camera"
                                    >
                                        <Copy size={11} />
                                        <span>Dup</span>
                                    </button>
                                </div>
                            </div>

                            {/* Camera Channel Chips */}
                            <div className="flex flex-wrap gap-1.5">
                                {testCameras.map((cam, idx) => {
                                    const isSelected = cam.id === activeCamera.id;
                                    const isHidden = hiddenCameraIds.includes(cam.id);
                                    return (
                                        <button
                                            key={`popup-cam-${cam.id}-${idx}`}
                                            type="button"
                                            onClick={() => onSelectCamera(cam.id)}
                                            className={`px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 font-black border border-blue-600'
                                                    : 'bg-white hover:bg-[#2563eb] hover:text-white text-[#244130] border border-[#CFDCCB]'
                                            }`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${isHidden ? 'bg-red-400' : 'bg-[#16a34a] animate-pulse'}`} />
                                            <span>[CH0{cam.channel}]</span>
                                            <span className="text-[10px] font-sans font-normal opacity-90 truncate max-w-[90px]">{cam.name}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* MASTER FLEET VISIBILITY CONTROLS (HIDE / UNHIDE ALL TOGETHER) */}
                            <div className="flex items-center justify-between p-2.5 bg-white rounded-2xl border border-[#D8E3D4] shadow-2xs">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={14} className="text-[#2563eb]" />
                                    <span className="text-[11px] font-bold text-[#163022]">
                                        {isKa ? 'ყველა კამერა ერთად:' : 'All Cameras Visibility:'}
                                    </span>
                                    <span className="text-[10px] font-mono text-blue-700 font-bold">
                                        ({testCameras.length - hiddenCameraIds.length} / {testCameras.length} Visible)
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={onToggleHideAllCameras}
                                    className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all duration-200 shadow-2xs ${
                                        allCamsHidden
                                            ? 'bg-white hover:bg-[#16a34a] hover:text-white text-[#16a34a] border border-[#16a34a]'
                                            : 'bg-white hover:bg-[#64748b] hover:text-white text-[#244130] border border-[#CFDCCB]'
                                    }`}
                                >
                                    {allCamsHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                                    <span>{allCamsHidden ? (isKa ? 'ყველას გამოჩენა' : 'Unhide All') : (isKa ? 'ყველას დამალვა' : 'Hide All')}</span>
                                </button>
                            </div>
                        </div>

                        {/* ACTIVE CAMERA TOOLS CARD (WORKS DIRECTLY ON SELECTED CAMERA) */}
                        <div className="p-3.5 bg-white rounded-2xl border border-[#D8E3D4] space-y-3 shadow-2xs text-[#163022]">
                            {/* Card Header with Camera Name and Individual Hide/Unhide Toggle */}
                            <div className="flex items-center justify-between border-b border-[#D8E3D4] pb-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-mono font-bold text-[10px]">
                                            CH0{activeCamera.channel}
                                        </span>
                                        <span className="font-bold text-[#163022] text-xs">
                                            {activeCamera.name}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-[#4A6753] font-mono block mt-0.5">
                                        {activeCamera.locationName} • {activeCamera.model}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1">
                                    {/* Individual Hide/Unhide Toggle for this camera */}
                                    <button
                                        type="button"
                                        onClick={() => onToggleHideCamera(activeCamera.id)}
                                        className={`p-1.5 rounded-xl transition-all duration-200 cursor-pointer shadow-2xs ${
                                            isCurrentCamHidden
                                                ? 'bg-white hover:bg-[#dc2626] hover:text-white text-[#dc2626] border border-[#dc2626]'
                                                : 'bg-white hover:bg-[#16a34a] hover:text-white text-[#244130] border border-[#CFDCCB]'
                                        }`}
                                        title={isCurrentCamHidden ? (isKa ? 'გამოჩენა რუკაზე' : 'Unhide on map') : (isKa ? 'დამალვა რუკიდან' : 'Hide from map')}
                                    >
                                        {isCurrentCamHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                                    </button>

                                    {testCameras.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={onDeleteActiveCamera}
                                            className="p-1.5 text-[#4A6753] hover:text-[#dc2626] hover:bg-red-50 rounded-xl cursor-pointer border border-[#CFDCCB] transition-colors"
                                            title="Delete camera"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Pole Height (AGL) Slider */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[#4A6753] font-bold uppercase text-[10px]">
                                        {isKa ? 'ბოძის სიმაღლე (Pole AGL)' : 'Pole Height (AGL)'}
                                    </span>
                                    <span className="text-cyan-800 font-mono font-bold bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                                        {activeCamera.mountHeightM || 6}m
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="2"
                                    max="25"
                                    step="0.5"
                                    value={activeCamera.mountHeightM || 6}
                                    onChange={(e) => onUpdateActiveCamera({ mountHeightM: Number(e.target.value) })}
                                    className="w-full accent-cyan-600 cursor-pointer"
                                />
                                <div className="flex justify-between text-[9px] text-[#4A6753] font-mono mt-0.5">
                                    <span>Ground: {getElevationAtCoords(activeCamera.lat, activeCamera.lng, baseLat, baseLng).toFixed(1)}m</span>
                                    <span className="text-emerald-700 font-bold">Total Z: {(getElevationAtCoords(activeCamera.lat, activeCamera.lng, baseLat, baseLng) + (activeCamera.mountHeightM || 6)).toFixed(1)}m ASL</span>
                                </div>
                            </div>

                            {/* Vertical Tilt (Pitch Angle, e.g. 4°) Slider */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[#4A6753] font-bold uppercase text-[10px]">
                                        {isKa ? 'დახრის კუთხე (Vertical Tilt - 4°)' : 'Vertical Tilt / Pitch Angle'}
                                    </span>
                                    <span className="text-amber-800 font-mono font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        {activeCamera.tiltAngleDeg || 4}° Pitch
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="45"
                                    step="1"
                                    value={activeCamera.tiltAngleDeg || 4}
                                    onChange={(e) => onUpdateActiveCamera({ tiltAngleDeg: Number(e.target.value) })}
                                    className="w-full accent-amber-500 cursor-pointer"
                                />
                                <span className="text-[9px] text-[#6A8A73] block mt-0.5">
                                    Downward pitch to eliminate blind sides over orchard slope
                                </span>
                            </div>

                            {/* Horizontal Azimuth (Yaw Heading) */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[#4A6753] font-bold uppercase text-[10px]">
                                        {isKa ? 'აზიმუტი / მიმართულება' : 'Horizontal Azimuth / Yaw'}
                                    </span>
                                    <span className="text-blue-800 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                        {activeCamera.azimuthDeg || 0}°
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    step="1"
                                    value={activeCamera.azimuthDeg || 0}
                                    onChange={(e) => onUpdateActiveCamera({ azimuthDeg: Number(e.target.value) })}
                                    className="w-full accent-blue-600 cursor-pointer"
                                />
                            </div>

                            {/* FOV Angle & Range */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className="text-[#4A6753] text-[9px] uppercase font-bold">FOV Spread</span>
                                        <span className="text-[#163022] font-mono font-bold text-[9px]">{activeCamera.fovAngleDeg || 85}°</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="35"
                                        max="125"
                                        step="1"
                                        value={activeCamera.fovAngleDeg || 85}
                                        onChange={(e) => onUpdateActiveCamera({ fovAngleDeg: Number(e.target.value) })}
                                        className="w-full accent-indigo-600 cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className="text-[#4A6753] text-[9px] uppercase font-bold">Range (R)</span>
                                        <span className="text-[#163022] font-mono font-bold text-[9px]">{activeCamera.rangeM || 75}m</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="20"
                                        max="220"
                                        step="5"
                                        value={activeCamera.rangeM || 75}
                                        onChange={(e) => onUpdateActiveCamera({ rangeM: Number(e.target.value) })}
                                        className="w-full accent-indigo-600 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Optic Model Preset Selector */}
                            <div>
                                <label className="text-[10px] text-[#4A6753] block mb-1 font-bold uppercase">
                                    Optic Model Preset
                                </label>
                                <select
                                    value={activeCamera.model || 'Hikvision DS-2CD2087G2-LU (4K ColorVu)'}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        let fov = 85;
                                        let range = 75;
                                        if (val.includes('ColorVu') || val.includes('2.8mm')) { fov = 115; range = 45; }
                                        else if (val.includes('AcuSense') || val.includes('4mm')) { fov = 89; range = 75; }
                                        else if (val.includes('Telephoto') || val.includes('6mm')) { fov = 53; range = 110; }
                                        else if (val.includes('PTZ')) { fov = 60; range = 160; }
                                        onUpdateActiveCamera({ model: val, fovAngleDeg: fov, rangeM: range });
                                    }}
                                    className="w-full px-2.5 py-1.5 bg-[#FAFBF8] border border-[#CFDCCB] rounded-xl text-[#163022] text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="Hikvision DS-2CD2087G2-LU (4K ColorVu)">ColorVu 2.8mm (115° Ultra-Wide, 45m)</option>
                                    <option value="Hikvision DS-2CD2386G2-ISU (4mm AcuSense)">AcuSense 4mm (89° Standard Orchard, 75m)</option>
                                    <option value="Hikvision DS-2CD2T86G2-4I (6mm Telephoto)">Telephoto 6mm (53° Trench Corridor, 110m)</option>
                                    <option value="Hikvision DS-2DE4425IW-DE (25x PTZ)">25x Optical PTZ (60° Perimeter, 160m)</option>
                                </select>
                            </div>

                            {/* Real-time Computed Slope & Blind Zone Stats */}
                            <div className="p-2 bg-[#EEF3EA] rounded-xl border border-[#D8E3D4] text-[9.5px] font-mono text-[#2D4536] space-y-1">
                                <div className="flex justify-between">
                                    <span>📐 Terrain Slope at Pole:</span>
                                    <span className="text-emerald-700 font-bold">
                                        {getSlopeAndAspect(activeCamera.lat, activeCamera.lng, baseLat, baseLng).slopeDeg.toFixed(1)}°
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>🚫 Nadir Blind Zone:</span>
                                    <span className="text-red-600 font-bold">
                                        &lt; {computeBlindZoneDistanceM(activeCamera.mountHeightM || 6, activeCamera.tiltAngleDeg || 4, activeCamera.fovAngleDeg || 85)}m
                                    </span>
                                </div>
                            </div>

                            {/* Actions for this Camera */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={onMoveActiveCameraOnMap}
                                    className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs ${
                                        isMovingCamera
                                            ? 'bg-[#d97706] text-white shadow ring-2 ring-amber-300 border border-[#d97706]'
                                            : 'bg-white hover:bg-[#d97706] hover:text-white text-[#244130] border border-[#CFDCCB]'
                                    }`}
                                >
                                    <Move size={13} />
                                    <span>{isMovingCamera ? (isKa ? 'დააწკაპუნეთ რუკაზე' : 'Click Map to Place') : (isKa ? 'გადატანა რუკაზე' : 'Move on Map')}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => onOpenLiveCameraStream(activeCamera)}
                                    className="py-2 px-2 bg-white hover:bg-[#2563eb] hover:text-white text-[#244130] border border-[#CFDCCB] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 shadow-2xs"
                                >
                                    <Video size={13} />
                                    <span>{isKa ? 'Live ნაკადი' : 'Live Stream'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowDeviceControl(!showDeviceControl)}
                                    className={`col-span-2 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer border shadow-2xs ${
                                        showDeviceControl 
                                            ? 'bg-[#2563eb] text-white border-[#2563eb] shadow-md ring-2 ring-blue-300/40' 
                                            : 'bg-white hover:bg-[#2563eb] hover:text-white text-[#244130] border border-[#CFDCCB]'
                                    }`}
                                >
                                    <Move size={13} />
                                    <span>{showDeviceControl ? (isKa ? 'მართვის პანელის ჩაკეცვა' : 'Hide Device Control & Moving') : (isKa ? 'მოწყობილობის მართვა & გადაადგილება' : 'Device Control Panel & Move')}</span>
                                </button>
                            </div>

                            {/* Integrated Device Control Panel with Full Ability of Moving */}
                            {showDeviceControl && (
                                <div className="pt-2 border-t border-[#D8E3D4]">
                                    <DeviceControlPanel
                                        camera={{
                                            id: activeCamera.id,
                                            name: activeCamera.name,
                                            channel: activeCamera.channel,
                                            model: activeCamera.model,
                                            ipAddress: activeCamera.ipAddress,
                                            lat: activeCamera.lat,
                                            lng: activeCamera.lng,
                                            azimuthDeg: activeCamera.azimuthDeg,
                                            tiltAngleDeg: activeCamera.tiltAngleDeg,
                                            opticalZoomX: (activeCamera as any).opticalZoomX || 2,
                                            digitalZoomX: (activeCamera as any).digitalZoomX || 1,
                                            rangeM: activeCamera.rangeM,
                                            mountHeightM: activeCamera.mountHeightM,
                                            isPtz: activeCamera.isPtz,
                                            isNightVision: activeCamera.isNightVision
                                        }}
                                        onUpdateCamera={(updated) => onUpdateActiveCamera(updated)}
                                        mapCenterCoords={currentPlantation?.center || [activeCamera.lat, activeCamera.lng]}
                                        isKa={isKa}
                                    />
                                </div>
                            )}
                        </div>

                        {/* LIST OF ALL CAMERAS (WITH INDIVIDUAL HIDE/UNHIDE EYE BUTTONS) */}
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A6753] block">
                                {isKa ? 'კამერების სია (დამალვა სათითაოდ):' : 'All Cameras List (Hide/Unhide One-by-One):'}
                            </span>
                            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                {testCameras.map((cam, idx) => {
                                    const isHidden = hiddenCameraIds.includes(cam.id);
                                    const isSelected = cam.id === activeCamera.id;
                                    return (
                                        <div
                                            key={`popup-fleet-${cam.id}-${idx}`}
                                            className={`p-2 rounded-xl border flex items-center justify-between transition-all duration-200 shadow-2xs ${
                                                isSelected 
                                                    ? 'bg-blue-50 border-blue-400 text-[#163022]' 
                                                    : 'bg-white border-[#E2EBE0] hover:border-[#CFDCCB] text-[#244130]'
                                            }`}
                                        >
                                            <div 
                                                className="flex items-center gap-2 cursor-pointer min-w-0"
                                                onClick={() => onSelectCamera(cam.id)}
                                            >
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${isHidden ? 'bg-slate-400' : 'bg-[#16a34a] animate-pulse'}`} />
                                                <span className="font-mono font-bold text-xs text-[#163022] shrink-0">[CH0{cam.channel}]</span>
                                                <span className="text-[#244130] text-xs truncate max-w-[140px] font-medium">{cam.name}</span>
                                                <span className="text-[9px] text-[#4A6753] font-mono shrink-0">{cam.mountHeightM}m | {cam.azimuthDeg}°</span>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => onToggleHideCamera(cam.id)}
                                                    className={`p-1 rounded-lg transition-all duration-200 cursor-pointer shadow-2xs ${
                                                        isHidden 
                                                            ? 'bg-white hover:bg-[#dc2626] hover:text-white text-[#dc2626] border border-[#dc2626]' 
                                                            : 'bg-white hover:bg-[#16a34a] hover:text-white text-[#244130] border border-[#CFDCCB]'
                                                    }`}
                                                    title={isHidden ? 'Unhide on map' : 'Hide from map'}
                                                >
                                                    {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* TAB 2: DRONE TOOLS (TRENCH FLIGHT & GIMBAL LIVE CONTROLS) */}
                {/* ========================================================= */}
                {activeMode === 'drone' && (
                    <div className="space-y-3.5">
                        <div className="p-3 bg-white rounded-2xl border border-[#D8E3D4] space-y-2.5 shadow-2xs text-[#163022]">
                            <div className="flex items-center justify-between border-b border-[#D8E3D4] pb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#0284c7] animate-pulse" />
                                    <span className="font-black text-xs text-[#163022] uppercase tracking-wider">
                                        {isKa ? 'თხრილების გასწვრივ ფრენის მისია' : 'Drone Trench Inspection Mission'}
                                    </span>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 font-mono text-[10px] font-bold border border-sky-200">
                                    4K Aerial Gimbal
                                </span>
                            </div>

                            {/* Plantation & Sector details */}
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                                <div className="p-2 bg-[#EEF3EA] rounded-xl border border-[#D8E3D4]">
                                    <span className="text-[#4A6753] block uppercase text-[8px]">Plantation</span>
                                    <span className="text-[#163022] font-bold">{testDroneMission.plantationName}</span>
                                </div>
                                <div className="p-2 bg-[#EEF3EA] rounded-xl border border-[#D8E3D4]">
                                    <span className="text-[#4A6753] block uppercase text-[8px]">Sector</span>
                                    <span className="text-emerald-700 font-bold">{testDroneMission.sectorName}</span>
                                </div>
                            </div>

                            {/* Trenches selector chips: #1, #2, #3, #4, #5 */}
                            <div>
                                <span className="text-[10px] text-[#4A6753] font-bold uppercase block mb-1">
                                    {isKa ? 'სამიზნე თხრილები (დააწკაპუნეთ ასარჩევად):' : 'Target Trenches (Click to toggle):'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    {[1, 2, 3, 4, 5].map((tNum, tIdx) => {
                                         const isSelected = (Array.isArray(testDroneMission.selectedTrenches) ? testDroneMission.selectedTrenches : [3, 4, 5]).includes(tNum);
                                         return (
                                             <button
                                                 key={`popup-trench-${tNum}-${tIdx}`}
                                                 type="button"
                                                 onClick={() => onToggleTrench(tNum)}
                                                 className={`flex-1 py-1.5 rounded-xl font-mono font-black text-xs transition-all duration-200 cursor-pointer shadow-2xs ${
                                                     isSelected
                                                         ? 'bg-[#d97706] text-white shadow-md ring-1 ring-amber-300 border border-[#d97706]'
                                                         : 'bg-white hover:bg-[#d97706] hover:text-white text-[#244130] border border-[#CFDCCB]'
                                                 }`}
                                             >
                                                 #{tNum}
                                             </button>
                                         );
                                     })}
                                 </div>
                            </div>

                            {/* Altitude Slider (AGL) */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[#4A6753] font-bold uppercase text-[10px]">
                                        {isKa ? 'ფრენის სიმაღლე (Altitude AGL)' : 'Flight Altitude (AGL)'}
                                    </span>
                                    <span className="text-cyan-800 font-mono font-bold bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                                        {testDroneMission.currentAlt || 35}m
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="10"
                                    max="120"
                                    step="1"
                                    value={testDroneMission.currentAlt || 35}
                                    onChange={(e) => onUpdateDroneMission({ currentAlt: Number(e.target.value) })}
                                    className="w-full accent-cyan-600 cursor-pointer"
                                />
                            </div>

                            {/* Gimbal Pitch Angle */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[#4A6753] font-bold uppercase text-[10px]">
                                        {isKa ? 'გიმბალის დახრა (Gimbal Pitch)' : 'Gimbal Pitch (-90° Nadir to 0°)'}
                                    </span>
                                    <span className="text-amber-800 font-mono font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        {testDroneMission.gimbalPitchDeg || -45}°
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="-90"
                                    max="0"
                                    step="5"
                                    value={testDroneMission.gimbalPitchDeg || -45}
                                    onChange={(e) => onUpdateDroneMission({ gimbalPitchDeg: Number(e.target.value) })}
                                    className="w-full accent-amber-500 cursor-pointer"
                                />
                            </div>

                            {/* Optical Zoom Level */}
                            <div>
                                <span className="text-[10px] text-[#4A6753] font-bold uppercase block mb-1">Optical Zoom:</span>
                                <div className="flex items-center gap-1.5">
                                    {[1, 2, 4, 8].map((z, zIdx) => (
                                        <button
                                            key={`popup-zoom-${z}-${zIdx}`}
                                            type="button"
                                            onClick={() => onUpdateDroneMission({ opticalZoom: z })}
                                            className={`flex-1 py-1 rounded-lg font-mono font-bold text-xs transition-all duration-200 cursor-pointer shadow-2xs ${
                                                testDroneMission.opticalZoom === z
                                                    ? 'bg-[#0284c7] text-white shadow'
                                                    : 'bg-white hover:bg-[#0284c7] hover:text-white text-[#244130] border border-[#CFDCCB]'
                                            }`}
                                        >
                                            {z}x
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons: Fly & Display Live Feed, Photo, REC */}
                            <div className="pt-2 space-y-2 border-t border-[#D8E3D4]">
                                <button
                                    type="button"
                                    onClick={onFlySelectedTrenches}
                                    className="w-full py-2.5 px-3 bg-white hover:bg-[#0284c7] hover:text-white text-[#0284c7] border border-[#0284c7] rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-95 transition-all duration-200"
                                >
                                    <Navigation size={14} className="stroke-[2.5]" />
                                    <span>{isKa ? 'ფრენა & პირდაპირი კამერის ხედი' : 'Fly & Display Live Gimbal Feed'}</span>
                                </button>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onDroneTakePhoto('Active Aerial Photo')}
                                        className="py-1.5 px-2 bg-white hover:bg-[#0284c7] hover:text-white text-[#244130] border border-[#CFDCCB] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 shadow-2xs"
                                    >
                                        <Camera size={13} />
                                        <span>Photo Capture</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onDroneToggleRecordVideo('Active Aerial Video')}
                                        className={`py-1.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 shadow-2xs ${
                                            testDroneMission.isRecordingVideo 
                                                ? 'bg-red-600 text-white animate-pulse border border-red-600' 
                                                : 'bg-white hover:bg-[#dc2626] hover:text-white text-[#244130] border border-[#CFDCCB]'
                                        }`}
                                    >
                                        <Film size={13} />
                                        <span>{testDroneMission.isRecordingVideo ? 'Stop REC' : 'Record Video'}</span>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-[#4A6753] pt-1">
                                    <span>Live Feed Window:</span>
                                    <button
                                        type="button"
                                        onClick={() => onToggleDroneLiveFeed(!isDroneLiveFeedOpen)}
                                        className="text-[#0284c7] font-bold hover:underline cursor-pointer"
                                    >
                                        {isDroneLiveFeedOpen ? 'Close Feed Window' : 'Open Feed Window'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* TAB 3: 3D SATELLITE TERRAIN, MAPBOX DEM & AI SLOPE DETECT */}
                {/* ========================================================= */}
                {activeMode === '3d' && (
                    <div className="space-y-3.5">
                        {/* 1. Automated Initial Layer (Mapbox Terrain DEM API) */}
                        <div className="p-3 bg-white rounded-2xl border border-[#D8E3D4] space-y-2 shadow-2xs text-[#163022]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Satellite size={16} className="text-[#16a34a]" />
                                    <span className="font-black text-xs text-[#163022] uppercase tracking-wider">
                                        {isKa ? 'თანამგზავრული DEM რელიეფი (Mapbox API)' : 'Satellite DEM (Mapbox Terrain DEM)'}
                                    </span>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono text-[9px] font-bold border border-emerald-200">
                                    InSAR / Radar
                                </span>
                            </div>
                            <p className="text-[10px] text-[#4A6753] leading-relaxed">
                                {isKa 
                                    ? 'InSAR რადარული & სტერეოფოტოგრამეტრიული მონაცემები Mapbox Terrain DEM-ის მეშვეობით პირდაპირ ედება 3D რუკას.' 
                                    : 'Retrieves global satellite elevation data (Mapbox Terrain DEM) and drapes it naturally across your plantation coordinates.'}
                            </p>

                            <button
                                type="button"
                                onClick={onLoadSatelliteDem}
                                className="w-full py-2 px-3 bg-white hover:bg-[#16a34a] hover:text-white text-[#16a34a] border border-[#16a34a] rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-95 transition-all duration-200"
                            >
                                <Satellite size={13} />
                                <span>{isKa ? 'თანამგზავრული რელიეფის ჩატვირთვა' : 'Load Satellite Elevation (Mapbox DEM)'}</span>
                            </button>

                            {/* Exaggeration Factor Slider */}
                            <div className="pt-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[#4A6753] font-bold uppercase text-[10px]">
                                        {isKa ? 'რელიეფის გაძლიერების კოეფიციენტი' : 'Terrain Exaggeration Factor'}
                                    </span>
                                    <span className="text-emerald-800 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        {elevationExaggeration.toFixed(1)}x
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="1.0"
                                    max="2.5"
                                    step="0.1"
                                    value={elevationExaggeration}
                                    onChange={(e) => onChangeExaggeration(Number(e.target.value))}
                                    className="w-full accent-[#16a34a] cursor-pointer"
                                />
                                <span className="text-[9px] text-[#6A8A73] block mt-0.5">
                                    Mapbox GL standard: 1.0 realistic, 1.5 - 2.0 pronounced slopes
                                </span>
                            </div>
                        </div>

                        {/* 2. AI-Driven Slope Detection */}
                        <div className="p-3 bg-white rounded-2xl border border-[#D8E3D4] space-y-2 shadow-2xs text-[#163022]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={16} className="text-[#0284c7]" />
                                    <span className="font-black text-xs text-[#163022] uppercase tracking-wider">
                                        {isKa ? 'ფერდობის AI დეტექცია (Auto-Detect Slope)' : 'AI Slope & Ridge Auto-Detection'}
                                    </span>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 font-mono text-[9px] font-bold border border-sky-200">
                                    DSM → DTM
                                </span>
                            </div>
                            <p className="text-[10px] text-[#4A6753] leading-relaxed">
                                {isKa 
                                    ? 'ხელოვნური ინტელექტი ფილტრავს მცენარეულობას (DSM → DTM) და ავტომატურად ხაზავს ქედის კონტურს (A, B წერტილებს).' 
                                    : 'AI filters vegetation cover (DSM to DTM) and automatically outlines ridge crest lines and slope contours.'}
                            </p>

                            <button
                                type="button"
                                onClick={onAiAutoDetectSlope}
                                disabled={isAiSlopeScanning}
                                className="w-full py-2 px-3 bg-white hover:bg-[#0284c7] hover:text-white text-[#0284c7] border border-[#0284c7] disabled:opacity-50 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-95 transition-all duration-200"
                            >
                                <Sparkles size={13} className={isAiSlopeScanning ? 'animate-spin' : ''} />
                                <span>{isAiSlopeScanning ? (isKa ? 'AI ანალიზი მიმდინარეობს...' : 'Scanning Satellite Imagery...') : (isKa ? 'ფერდობის AI ავტო-დეტექცია' : 'Auto-Detect Slope & Ridgeline (AI)')}</span>
                            </button>
                        </div>

                        {/* 3. Fine-Tuning / Override (Spine & Slope Sculptor) */}
                        <div className="p-3.5 bg-white rounded-2xl border border-[#D8E3D4] space-y-3 shadow-2xs text-[#163022]">
                            <div className="flex items-center justify-between border-b border-[#D8E3D4] pb-2">
                                <span className="font-black text-xs text-[#163022] uppercase tracking-wider">
                                    {isKa ? 'ზუსტი კორექცია (Spine & Slope Sculptor)' : 'Fine-Tuning: Spine & Slope Sculptor'}
                                </span>
                                <button
                                    type="button"
                                    onClick={onAddSpinePoint}
                                    className="px-2.5 py-1 bg-white hover:bg-[#d97706] hover:text-white text-[#244130] border border-[#CFDCCB] rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all duration-200 shadow-2xs"
                                >
                                    <Plus size={11} className="stroke-[3]" />
                                    <span>+ Point</span>
                                </button>
                            </div>

                            {/* Point selector chips: Point A, Point B... */}
                            <div className="flex flex-wrap gap-1.5">
                                {hillSpineProfile.points.map((pt, idx) => {
                                    const isSelected = pt.id === activePointId;
                                    const letter = String.fromCharCode(65 + idx);
                                    return (
                                        <button
                                            key={`popup-pt-${pt.id}-${idx}`}
                                            type="button"
                                            onClick={() => onSelectPointId(pt.id)}
                                            className={`px-2.5 py-1 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs ${
                                                isSelected 
                                                    ? 'bg-[#d97706] text-white font-black shadow ring-2 ring-amber-300 border border-[#d97706]' 
                                                    : 'bg-white hover:bg-[#d97706] hover:text-white text-[#244130] border border-[#CFDCCB]'
                                            }`}
                                        >
                                            <span>Point {letter}</span>
                                            <span className="text-[10px] opacity-80">{pt.peakHeightM > 0 ? `+${pt.peakHeightM}` : pt.peakHeightM}m</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Peak Height (H) Slider */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[#4A6753] font-bold uppercase text-[10px]">
                                        {isKa ? 'პიკის სიმაღლე / სიღრმე (Peak H)' : 'Peak Height / Depth (Peak H)'}
                                    </span>
                                    <span className="text-cyan-800 font-mono font-bold bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                                        {activePoint.peakHeightM > 0 ? `+${activePoint.peakHeightM}` : activePoint.peakHeightM}m
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="-25"
                                    max="60"
                                    step="1"
                                    value={activePoint.peakHeightM}
                                    onChange={(e) => onUpdateActivePoint({ peakHeightM: Number(e.target.value) })}
                                    className="w-full accent-cyan-600 cursor-pointer"
                                />
                            </div>

                            {/* Start Offset (Start of Slope Descent) */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[#4A6753] font-bold uppercase text-[10px]">
                                        {isKa ? 'დაღმართის დაწყება (Start Offset)' : 'Start Offset (Crown Plateau)'}
                                    </span>
                                    <span className="text-sky-800 font-mono font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                        {activePoint.startOffsetM}m
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="40"
                                    step="1"
                                    value={activePoint.startOffsetM}
                                    onChange={(e) => onUpdateActivePoint({ startOffsetM: Number(e.target.value) })}
                                    className="w-full accent-sky-600 cursor-pointer"
                                />
                            </div>

                            {/* End Distance (Zero Base level) */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[#4A6753] font-bold uppercase text-[10px]">
                                        {isKa ? 'ფერდობის დასასრული (End Distance)' : 'End Distance (Zero Base Level)'}
                                    </span>
                                    <span className="text-emerald-800 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        {activePoint.endDistanceM}m
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="20"
                                    max="160"
                                    step="1"
                                    value={activePoint.endDistanceM}
                                    onChange={(e) => onUpdateActivePoint({ endDistanceM: Number(e.target.value) })}
                                    className="w-full accent-emerald-600 cursor-pointer"
                                />
                            </div>

                            {/* Slope Falloff Curve Selector */}
                            <div>
                                <span className="text-[10px] text-[#4A6753] font-bold uppercase block mb-1">
                                    Falloff Function:
                                </span>
                                <div className="grid grid-cols-3 gap-1">
                                    {(['linear', 'cosine', 'plateau'] as const).map(fType => (
                                        <button
                                            key={fType}
                                            type="button"
                                            onClick={() => onUpdateActivePoint({ slopeFalloff: fType })}
                                            className={`py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all duration-200 cursor-pointer shadow-2xs ${
                                                activePoint.slopeFalloff === fType 
                                                    ? 'bg-[#d97706] text-white font-black shadow border border-[#d97706]' 
                                                    : 'bg-white hover:bg-[#d97706] hover:text-white text-[#244130] border border-[#CFDCCB]'
                                            }`}
                                        >
                                            {fType}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* TAB 4: WINDOWS & TOOLS VISIBILITY MANAGER */}
                {/* ========================================================= */}
                {activeMode === 'windows' && (
                    <div className="space-y-3.5">
                        <div className="p-3 bg-white rounded-2xl border border-[#D8E3D4] space-y-2 shadow-2xs text-[#163022]">
                            <div className="flex items-center justify-between border-b border-[#D8E3D4] pb-2">
                                <span className="font-black text-xs text-[#163022] uppercase tracking-wider">
                                    {isKa ? 'ფანჯრებისა და ხელსაწყოების გამორთვა/ჩართვა' : 'Windows & Tool Panes Visibility Controller'}
                                </span>
                                <span className="text-[10px] text-purple-700 font-mono font-bold">
                                    Toggle Any Pane
                                </span>
                            </div>
                            <p className="text-[10px] text-[#4A6753]">
                                {isKa 
                                    ? 'აქედან შეგიძლიათ ჩართოთ ან სრულად გათიშოთ ნებისმიერი ფანჯარა, ხელსაწყოების პანელი ან რუკის ფენა.' 
                                    : 'Enable or disable any individual tool palette, floating window, or map overlay anytime.'}
                            </p>

                            <div className="space-y-2 pt-1">
                                {[
                                    { key: 'show3dWindow', label: isKa ? '🌐 3D Sandbox (PiP) ფანჯარა' : '🌐 Floating 3D PiP Window', active: is3dWindowOpen, onToggle: () => onToggle3dWindow(!is3dWindowOpen) },
                                    { key: 'showDroneLive', label: isKa ? '🛸 დრონის პირდაპირი კამერის ფანჯარა' : '🛸 Drone Live Gimbal Feed Window', active: isDroneLiveFeedOpen, onToggle: () => onToggleDroneLiveFeed(!isDroneLiveFeedOpen) },
                                    { key: 'showTopToolbar', label: isKa ? '🛠️ ზედა ხელსაწყოების პალიტრა' : '🛠️ Master Hardware Tool Palette Bar', active: visibility.showTopToolbar !== false, onToggle: () => onToggleVisibility('showTopToolbar') },
                                    { key: 'showTrenchConfigBar', label: isKa ? '🚜 დრონის თხრილების კონფიგურაციის ბარი' : '🚜 Drone Trench Flight Config Bar', active: visibility.showTrenchConfigBar !== false, onToggle: () => onToggleVisibility('showTrenchConfigBar') },
                                    { key: 'showBottomHud', label: isKa ? '📏 ქვედა გაზომვების HUD ბარი' : '📏 Bottom Measurements HUD', active: visibility.showBottomHud !== false, onToggle: () => onToggleVisibility('showBottomHud') },
                                    { key: 'showFleetTable', label: isKa ? '📋 კამერების ფლოტის ცხრილი (ქვემოთ)' : '📋 All Cameras Fleet Manager (Below Map)', active: visibility.showFleetTable !== false, onToggle: () => onToggleVisibility('showFleetTable') },
                                    { key: 'showBlindZones', label: isKa ? '🚫 ნადირის ბრმა ზონების დაჩრდილვა' : '🚫 Nadir Blind Zones Shading', active: visibility.showBlindZones, onToggle: () => onToggleVisibility('showBlindZones') },
                                    { key: 'showTrenches', label: isKa ? '🌱 საცნობარო თხრილები (#1-#5)' : '🌱 Reference Trenches (#1-#5)', active: visibility.showTrenches, onToggle: () => onToggleVisibility('showTrenches') },
                                    { key: 'showSoilSensors', label: isKa ? '💧 ნიადაგის NPK სენსორები' : '💧 Soil Moisture Probes', active: visibility.showSoilSensors, onToggle: () => onToggleVisibility('showSoilSensors') }
                                ].map((item, itIdx) => (
                                    <div
                                        key={`popup-win-item-${item.key}-${itIdx}`}
                                        className="flex items-center justify-between p-2 rounded-xl bg-[#FAFBF8] border border-[#E2EBE0] shadow-2xs"
                                    >
                                        <span className="text-xs font-bold text-[#163022]">{item.label}</span>
                                        <button
                                            type="button"
                                            onClick={item.onToggle}
                                            className={`px-3 py-1 rounded-xl text-[10px] font-bold cursor-pointer transition-all duration-200 shadow-2xs ${
                                                item.active 
                                                    ? 'bg-white hover:bg-[#16a34a] hover:text-white text-[#16a34a] border border-[#16a34a]' 
                                                    : 'bg-white hover:bg-[#64748b] hover:text-white text-[#4A6753] border border-[#CFDCCB]'
                                            }`}
                                        >
                                            {item.active ? (isKa ? 'ჩართული' : 'ENABLED') : (isKa ? 'გამორთული' : 'DISABLED')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 5. FOOTER STATUS BAR */}
            <div className="p-2.5 bg-[#EEF3EA] border-t border-[#D8E3D4] flex items-center justify-between text-[10px] font-mono shrink-0 text-[#4A6753]">
                <div className="flex items-center gap-2 truncate">
                    <span className="text-blue-700 font-bold">[CH0{activeCamera?.channel || 1}]</span>
                    <span className="truncate text-[#163022]">{activeCamera?.name || 'Surveillance Cam'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1 bg-white hover:bg-[#64748b] hover:text-white text-[#244130] border border-[#CFDCCB] rounded-lg font-bold cursor-pointer transition-all duration-200 shadow-2xs"
                    >
                        {isKa ? 'დახურვა' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
};
