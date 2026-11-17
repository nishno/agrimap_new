import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    MapPin, Camera, Navigation, Radio, Droplets, User, 
    Play, Pause, RotateCcw, Trash2, Eye, EyeOff, Layers, 
    ShieldCheck, AlertTriangle, Plus, Check, ArrowRight, 
    Activity, Download, Compass, Sliders, ExternalLink,
    ChevronDown, ChevronUp, RefreshCw, Satellite, Map as MapIcon,
    Maximize2, Minimize2, Video, Sparkles, Wind, Crosshair, Edit3, X,
    FileText, ZoomIn, ZoomOut, Film, Camera as PhotoIcon, Save, Move,
    Mountain, Copy, Undo2, Hexagon
} from 'lucide-react';
import { 
    MapContainer, TileLayer, Polygon, Polyline, Marker, 
    Popup, Tooltip, useMapEvents, useMap, Circle 
} from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'sonner';
import { useLanguage } from '../../../contexts/LanguageContext';
import { safeStorage } from '../../../services/storageService';
import type { 
    PlantationFeature, 
    SeedlingPlantationFeature, 
    AreaPlantationFeature, 
    LinePlantationFeature, 
    CameraPlantationFeature,
    BoundaryPlantationFeature
} from '../../../types';
import type { PlantationCamera } from './CameraNvrLab';
import { 
    computeFovConePolygon, 
    computeBlindZonePolygon, 
    computeBlindZoneDistanceM 
} from '../../../utils/cameraGeospatial';
import { CameraLiveMonitorWindow } from './CameraLiveMonitorWindow';
import { AllCamerasWideModal } from './AllCamerasWideModal';
import { UniversalLanDeviceScannerModal } from './UniversalLanDeviceScannerModal';

const Sandbox3DTerrainCanvas = React.lazy(() => 
    import('./Sandbox3DTerrainCanvas').then(m => ({ default: m.Sandbox3DTerrainCanvas }))
);
import { 
    getElevationAtCoords, 
    getSlopeAndAspect,
    computeTerrainViewshed,
    type HillSpineProfile,
    type SpineControlPoint,
    type PerimeterSlopeVertex,
    type PerimeterSlopeObject,
    type PhotoGpsPin,
    setActiveSpineProfilesCache,
    setActivePerimeterSlopesCache
} from '../../../utils/demTerrainViewshed';
import { HardwareAndDroneControlPopUp, type RegisteredPlantationArea } from './HardwareAndDroneControlPopUp';
import { getMainPlantation, getPlantationsList, resolvePlantationCenter } from '../../../utils/plantationHelper';
import { FloatingOnlineWeatherBadge } from './FloatingOnlineWeatherBadge';
import { SandboxFloatingTopToolbar } from './SandboxFloatingTopToolbar';
import { SandboxFloatingVisibilityMenu } from './SandboxFloatingVisibilityMenu';
import { SandboxFloatingLeftPanel } from './SandboxFloatingLeftPanel';
import { SandboxFloatingRightPanel } from './SandboxFloatingRightPanel';
import { SandboxLayerTreePanel, type LayerId } from './SandboxLayerTreePanel';
import { SandboxPlannerImportModal } from './SandboxPlannerImportModal';
import { calculatePathSegments, calculatePointToPointSegment, type TerrainSegmentMetrics } from '../../../utils/terrainSlopeAnalysis';
import { PhotoInspectionModal } from './PhotoInspectionModal';
import { extractPhotoMetadata, loadSavedPhotoPins, savePhotoPins } from '../../../utils/photoGpsHelper';
import { SandboxBottomDevicePanel } from './SandboxBottomDevicePanel';
import { SandboxContextMenu, type ContextMenuState } from './SandboxContextMenu';
import { SandboxLocationSearchBar } from './SandboxLocationSearchBar';

// Types for Sandbox Testing Environment
export interface SandboxSoilSensor {
    id: string;
    name: string;
    type: 'SOIL_MOISTURE_NPK' | 'LEAF_WETNESS' | 'SOIL_EC_PH';
    lat: number;
    lng: number;
    moistureVwc: number; // %
    temperatureC: number;
    ecMsCm: number;
    nitrogenPpm: number;
    phosphorusPpm: number;
    potassiumPpm: number;
    batteryPct: number;
    signalRssi: number;
    depthCm: number;
    status: 'OPTIMAL' | 'LOW_MOISTURE' | 'HIGH_SALINITY';
}

export interface SandboxWaterSensor {
    id: string;
    name: string;
    type: 'FLOW_METER' | 'DEEP_WELL_LEVEL' | 'PRESSURE_TRANSDUCER';
    lat: number;
    lng: number;
    flowRateLpm: number; // L/min
    totalVolumeM3: number;
    waterLevelM: number;
    pressureBar: number;
    batteryPct: number;
    status: 'FLOWING' | 'IDLE' | 'LEAK_WARNING';
}

export interface SandboxWorkerGps {
    id: string;
    workerName: string;
    badgeCode: string;
    role: string;
    lat: number;
    lng: number;
    speedKmh: number;
    batteryPct: number;
    heartRateBpm: number;
    status: 'ACTIVE' | 'RESTING' | 'SOS_ALERT';
}

export interface SandboxWeatherStation {
    id: string;
    name: string;
    model: string;
    ipAddress: string;
    port: number;
    lat: number;
    lng: number;
    tempC: number;
    humidityPct: number;
    windSpeedKmh: number;
    windDirectionDeg: number;
    solarRadiationWm2: number;
    rainMm: number;
    pressureHpa: number;
    status: 'ONLINE' | 'STANDBY';
    lastUpdated: string;
}

export interface SandboxDroneMission {
    name: string;
    mode: 'waypoints' | 'circle_sector' | 'trench_direction';
    waypoints: { id: string; lat: number; lng: number; altM: number; leg: 'outbound' | 'return' }[];
    circleCenter?: [number, number];
    circleRadiusM: number;
    altitudeM: number;
    speedMs: number;
    telemetryIntervalS: number;
    directionDeg: number;
    isSimulating: boolean;
    simulatedProgress: number; // 0 to 1
    currentLat: number;
    currentLng: number;
    currentAlt: number;
    batteryPct: number;
    // Trench specific flight configuration
    plantationName: string;
    sectorName: string;
    selectedTrenches: number[];
    isRecordingVideo: boolean;
    recordingSeconds: number;
    opticalZoom: number;
    gimbalPitchDeg: number;
}

interface HardwareTestingSandboxMapProps {
    plantationFeatures?: PlantationFeature[];
    mapCenter?: [number, number];
    onExportToMainMap?: (newFeatures: PlantationFeature[], layerName: string) => void;
    onSwitchTab?: (tab: string) => void;
}

// Leaflet map events listener
const SandboxMapEvents: React.FC<{
    activeTool: string;
    onMapClick: (lat: number, lng: number) => void;
    onMapMove?: (lat: number, lng: number) => void;
}> = ({ activeTool, onMapClick, onMapMove }) => {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
        moveend(e) {
            try {
                const c = e.target.getCenter();
                if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
                    onMapMove?.(c.lat, c.lng);
                }
            } catch (err) {}
        }
    });
    return null;
};

// Smooth map recenter controller - only centers once on initial load or on explicit user request
const MapRecenterController: React.FC<{ center: [number, number]; trigger?: number }> = ({ center, trigger = 0 }) => {
    const map = useMap();
    const hasInitializedRef = useRef<boolean>(false);
    const lastTriggerRef = useRef<number>(trigger);

    useEffect(() => {
        const isTriggerChanged = trigger !== lastTriggerRef.current;
        lastTriggerRef.current = trigger;

        if (!hasInitializedRef.current || isTriggerChanged) {
            hasInitializedRef.current = true;
            if (
                center &&
                Array.isArray(center) &&
                typeof center[0] === 'number' &&
                typeof center[1] === 'number' &&
                Number.isFinite(center[0]) &&
                Number.isFinite(center[1])
            ) {
                try {
                    map.setView(center, map.getZoom() || 17, { animate: true });
                } catch (err) {
                    console.warn('[MapRecenterController] Suppressed invalid setView:', err);
                }
            }
        }
    }, [trigger, map]);
    return null;
};

// Smooth map fly-to controller
const MapFlyController: React.FC<{ flyTarget: { lat: number; lng: number; zoom?: number; timestamp: number } | null }> = ({ flyTarget }) => {
    const map = useMap();
    const lastTimestampRef = useRef<number>(0);

    useEffect(() => {
        if (!flyTarget || !map) return;
        if (flyTarget.timestamp === lastTimestampRef.current) return;
        lastTimestampRef.current = flyTarget.timestamp;

        if (
            typeof flyTarget.lat !== 'number' ||
            typeof flyTarget.lng !== 'number' ||
            !Number.isFinite(flyTarget.lat) ||
            !Number.isFinite(flyTarget.lng) ||
            flyTarget.lat < -90 || flyTarget.lat > 90 ||
            flyTarget.lng < -180 || flyTarget.lng > 180
        ) {
            return;
        }

        try {
            const size = map.getSize ? map.getSize() : null;
            if (!size || size.x <= 10 || size.y <= 10) {
                // Map container is not rendered or has 0 dimensions, use safe setView
                map.setView([flyTarget.lat, flyTarget.lng], flyTarget.zoom || 18);
                return;
            }

            const currentCenter = map.getCenter ? map.getCenter() : null;
            if (!currentCenter || !Number.isFinite(currentCenter.lat) || !Number.isFinite(currentCenter.lng)) {
                map.setView([flyTarget.lat, flyTarget.lng], flyTarget.zoom || 18);
                return;
            }

            const targetZoom = Number.isFinite(flyTarget.zoom) && (flyTarget.zoom || 0) > 0
                ? flyTarget.zoom!
                : (map.getZoom() || 18);

            // If already at or extremely close to the coordinates, skip flyTo animation to prevent 0/0 NaN
            const dist = Math.hypot(currentCenter.lat - flyTarget.lat, currentCenter.lng - flyTarget.lng);
            if (dist < 0.00001 && Math.abs((map.getZoom() || 18) - targetZoom) < 0.1) {
                return;
            }

            map.flyTo([flyTarget.lat, flyTarget.lng], targetZoom, { animate: true, duration: 1.2 });
        } catch (err) {
            console.warn('[MapFlyController] Suppressed invalid flyTo:', err);
            try {
                map.setView([flyTarget.lat, flyTarget.lng]);
            } catch {
                // Ignore fallback error
            }
        }
    }, [flyTarget, map]);
    return null;
};

// Map Resize Controller to keep Leaflet crisp when switching between 2D & 3D PiP modes
const MapResizeController: React.FC<{ is3dMainView: boolean; isPiPHidden: boolean }> = ({ is3dMainView, isPiPHidden }) => {
    const map = useMap();
    useEffect(() => {
        const t1 = setTimeout(() => map.invalidateSize(), 60);
        const t2 = setTimeout(() => map.invalidateSize(), 260);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [is3dMainView, isPiPHidden, map]);
    return null;
};

// Real-Time Interactive Cross-Section SVG Curve Diagram for Selected Connection Point
const MoundCrossSectionProfileSVG: React.FC<{
    peakHeightM: number;
    widthM: number;
    startOffsetM: number;
    endDistanceM: number;
    slopeFalloff: 'linear' | 'cosine' | 'plateau';
    isKa?: boolean;
}> = ({ peakHeightM, widthM, startOffsetM, endDistanceM, slopeFalloff, isKa }) => {
    const svgW = 270;
    const svgH = 85;
    const midX = svgW / 2;
    const baseY = svgH - 16;
    const maxR = Math.max(10, endDistanceM || widthM || 45);
    const scaleX = (midX - 16) / maxR;
    
    const absH = Math.abs(peakHeightM);
    const maxHScale = Math.max(15, Math.min(absH, 60));
    const hPixels = (maxHScale / 60) * 48 * (peakHeightM >= 0 ? 1 : -1);
    const peakY = baseY - hPixels;

    const numSteps = 36;
    const pathPoints: [number, number][] = [];

    for (let i = 0; i <= numSteps; i++) {
        const uRatio = i / numSteps;
        const rSigned = (uRatio * 2 - 1) * maxR;
        const r = Math.abs(rSigned);
        const curX = midX + rSigned * scaleX;

        let deltaH = 0;
        if (r <= startOffsetM) {
            deltaH = peakHeightM;
        } else if (r >= (endDistanceM || maxR)) {
            deltaH = 0;
        } else {
            const u = (r - startOffsetM) / Math.max(1, ((endDistanceM || maxR) - startOffsetM));
            if (slopeFalloff === 'linear') {
                deltaH = peakHeightM * (1 - u);
            } else if (slopeFalloff === 'plateau') {
                if (u <= 0.35) deltaH = peakHeightM;
                else {
                    const t = (u - 0.35) / 0.65;
                    deltaH = peakHeightM * ((1 + Math.cos(Math.PI * t)) / 2);
                }
            } else {
                deltaH = peakHeightM * ((1 + Math.cos(Math.PI * u)) / 2);
            }
        }

        const curY = baseY - (deltaH / (Math.max(1, absH) || 1)) * Math.abs(hPixels) * (peakHeightM >= 0 ? 1 : -1);
        pathPoints.push([curX, curY]);
    }

    const pathD = `M ${pathPoints.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L ')}`;
    const closedPathD = `${pathD} L ${pathPoints[pathPoints.length - 1][0]},${baseY} L ${pathPoints[0][0]},${baseY} Z`;

    return (
        <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 text-[10px] font-mono space-y-1">
            <div className="flex justify-between items-center text-slate-400">
                <span className="font-bold flex items-center gap-1 text-[9px] uppercase tracking-wider text-slate-300">
                    📐 {isKa ? 'განივი ჭრილის პროფილი' : 'Cross-Section Profile'}
                </span>
                <span className="text-amber-400 font-bold capitalize">
                    {slopeFalloff} ({peakHeightM >= 0 ? '+H Rise' : '-H Trench'})
                </span>
            </div>
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-18 overflow-visible select-none">
                <defs>
                    <linearGradient id="slopeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={peakHeightM >= 0 ? '#10b981' : '#06b6d4'} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={peakHeightM >= 0 ? '#10b981' : '#06b6d4'} stopOpacity="0.05" />
                    </linearGradient>
                </defs>
                {/* Baseline 0m */}
                <line x1="10" y1={baseY} x2={svgW - 10} y2={baseY} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                {/* Center Ridge Axis */}
                <line x1={midX} y1="4" x2={midX} y2={baseY + 6} stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="3,3" />
                {/* Shaded Area */}
                <path d={closedPathD} fill="url(#slopeGrad)" />
                {/* Profile Contour Line */}
                <path d={pathD} fill="none" stroke={peakHeightM >= 0 ? '#10b981' : '#06b6d4'} strokeWidth="2.5" />
                {/* Center Marker */}
                <circle cx={midX} cy={peakY} r="3" fill="#f59e0b" />
                {/* Text Labels */}
                <text x={midX} y={Math.max(10, peakY - 4)} textAnchor="middle" fill="#f59e0b" fontSize="8.5" fontWeight="bold">
                    Peak {peakHeightM > 0 ? `+${peakHeightM}` : peakHeightM}m
                </text>
                <text x="14" y={baseY + 11} fill="#64748b" fontSize="7.5">-R {endDistanceM || maxR}m</text>
                <text x={svgW - 14} y={baseY + 11} textAnchor="end" fill="#64748b" fontSize="7.5">+R {endDistanceM || maxR}m</text>
                {startOffsetM > 0 && (
                    <text x={midX + startOffsetM * scaleX} y={baseY + 11} textAnchor="middle" fill="#38bdf8" fontSize="7.5">
                        Start {startOffsetM}m
                    </text>
                )}
            </svg>
        </div>
    );
};

export const HardwareTestingSandboxMap: React.FC<HardwareTestingSandboxMapProps> = ({
    plantationFeatures = [],
    mapCenter = [41.9023, 44.5],
    onExportToMainMap,
    onSwitchTab
}) => {
    const { language } = useLanguage();
    const isKa = language === 'ka';

    // Compute accurate Plantation Center from features, organization, or mapCenter
    const plantationCenter = useMemo<[number, number]>(() => {
        return resolvePlantationCenter(plantationFeatures, mapCenter || [41.9023, 44.5]);
    }, [plantationFeatures, mapCenter]);

    const mainPlantation = useMemo(() => {
        return getMainPlantation(plantationFeatures, plantationCenter);
    }, [plantationFeatures, plantationCenter]);

    // Persistent LABS module plantation center (user can choose and save for LABS)
    const [labsPlantationCenter, setLabsPlantationCenter] = useState<[number, number]>(() => {
        const saved = safeStorage.getItem('agrimap_labs_saved_plantation_center');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length === 2 && Number.isFinite(parsed[0]) && Number.isFinite(parsed[1])) {
                    return [parsed[0], parsed[1]];
                }
            } catch (_) {}
        }
        return Number.isFinite(plantationCenter[0]) && Number.isFinite(plantationCenter[1])
            ? plantationCenter
            : [41.9023, 44.5];
    });

    const baseLat = Number.isFinite(labsPlantationCenter[0]) ? labsPlantationCenter[0] : (Number.isFinite(plantationCenter[0]) ? plantationCenter[0] : 41.9023);
    const baseLng = Number.isFinite(labsPlantationCenter[1]) ? labsPlantationCenter[1] : (Number.isFinite(plantationCenter[1]) ? plantationCenter[1] : 44.5);

    // Smooth Map Fly-To Target
    const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom?: number; timestamp: number } | null>(null);

    // Right-Click Context Menu State
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    // 2D <-> 3D Viewport Swapping State
    const [is3dMainView, setIs3dMainView] = useState<boolean>(false);
    const [isPiPHidden, setIsPiPHidden] = useState<boolean>(false);
    const [pipPos, setPipPos] = useState<{ x: number; y: number } | null>(null);
    const pipDragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

    const handlePipPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button, input, select, textarea')) return;
        e.preventDefault();
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {}

        const target = (e.currentTarget.closest('[data-pip-container]') as HTMLElement);
        const rect = target?.getBoundingClientRect();
        pipDragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startLeft: rect ? rect.left : (window.innerWidth - 440),
            startTop: rect ? rect.top : (window.innerHeight - 340)
        };
    };

    const handlePipPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!pipDragRef.current) return;
        e.preventDefault();
        const dx = e.clientX - pipDragRef.current.startX;
        const dy = e.clientY - pipDragRef.current.startY;
        const newX = Math.max(8, Math.min(window.innerWidth - 140, pipDragRef.current.startLeft + dx));
        const newY = Math.max(8, Math.min(window.innerHeight - 90, pipDragRef.current.startTop + dy));
        setPipPos({ x: newX, y: newY });
    };

    const handlePipPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!pipDragRef.current) return;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (err) {}
        pipDragRef.current = null;
    };

    const handleSelectDevice = (type: 'camera' | 'soil' | 'water' | 'worker' | 'drone' | 'slope_point', data: any) => {
        if (data?.lat !== undefined && data?.lng !== undefined) {
            setFlyTarget({ lat: data.lat, lng: data.lng, zoom: 19, timestamp: Date.now() });
        }
        if (type === 'camera') {
            setActiveCameraId(data.id);
        } else if (type === 'slope_point') {
            setActivePointId(data.id);
            setIsSlopeSculptorOpen(true);
        }
    };

    // View & Tile Layer State
    const [tileMode, setTileMode] = useState<'satellite' | 'streets' | '3d'>('satellite');

    // Active Testing Tool
    const [activeTool, setActiveTool] = useState<
        'select' | 'add_camera' | 'add_drone' | 'add_worker' | 'add_soil' | 'add_water' | 'add_weather' | 'live_stream' |
        'move_camera' | 'drone_waypoint' | 'drone_direction' | 'inspect_target' | 'add_spine_point' |
        'draw_slope' | 'draw_perimeter' | 'draw_hill' | 'pick_plantation'
    >('select');

    // Direction line drawing state (Point A -> Point B)
    const [directionStart, setDirectionStart] = useState<[number, number] | null>(null);
    const [directionEnd, setDirectionEnd] = useState<[number, number] | null>(null);

    // Hidden Camera IDs for per-camera visibility toggling
    const [hiddenCameraIds, setHiddenCameraIds] = useState<string[]>(() => {
        const saved = safeStorage.getItem('agrimap_sandbox_hidden_cam_ids');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [];
    });

    useEffect(() => {
        safeStorage.setItem('agrimap_sandbox_hidden_cam_ids', JSON.stringify(hiddenCameraIds));
    }, [hiddenCameraIds]);

    const handleToggleHideCamera = (id: string) => {
        setHiddenCameraIds(prev => {
            const isHidden = prev.includes(id);
            const next = isHidden ? prev.filter(x => x !== id) : [...prev, id];
            toast.info(isHidden ? (isKa ? 'კამერა გამოჩნდა რუკაზე' : 'Camera unhidden on map') : (isKa ? 'კამერის კონუსი დაიმალა რუკაზე' : 'Camera hidden from map'));
            return next;
        });
    };

    // Clutter Visibility Controls (Avoid map cluttering - trenches and seedlings off by default)
    const [visibility, setVisibility] = useState({
        showAll: true,
        showCameras: true,
        showDronePath: true,
        showSoilSensors: true,
        showWaterSensors: true,
        showWorkersGps: true,
        showWeatherStations: true,
        showTrenches: false,
        showSeedlings: false,
        showBlindZones: true,
        showDirections: true,
        showMoundSlope: true,
        showSectors: true,
        showTopToolbar: true,
        showTrenchConfigBar: false,
        showBottomHud: true,
        showFleetTable: false
    });

    const [recenterTrigger, setRecenterTrigger] = useState<number>(0);

    const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(false);

    const handleToggleVisibilityKey = (key: string) => {
        setVisibility(v => ({ ...v, [key]: !(v as any)[key] }));
    };

    const handleToggleAllVisibility = () => {
        setVisibility(v => {
            const nextAll = !v.showAll;
            toast.info(nextAll 
                ? (isKa ? 'ყველა ელემენტი გამოჩნდა რუკაზე' : 'All map elements visible')
                : (isKa ? 'ყველა ელემენტი დაიმალა რუკაზე' : 'All map elements hidden'));
            return {
                ...v,
                showAll: nextAll,
                showCameras: nextAll,
                showDronePath: nextAll,
                showSoilSensors: nextAll,
                showWaterSensors: nextAll,
                showWorkersGps: nextAll,
                showWeatherStations: nextAll,
                showBlindZones: nextAll,
                showMoundSlope: nextAll,
                showSectors: nextAll,
                showDirections: nextAll
            };
        });
    };

    // 1. Test Cameras
    const [testCameras, setTestCameras] = useState<PlantationCamera[]>(() => {
        const saved = safeStorage.getItem('agrimap_sandbox_test_cameras');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [
            {
                id: 'sand-cam-01',
                name: 'Main Gate AcuSense 4K',
                channel: 1,
                model: 'Hikvision DS-2CD2087G2-LU (4K ColorVu)',
                ipAddress: '192.168.1.121',
                rtspPort: 554,
                locationName: 'Perimeter Pole A',
                lat: baseLat - 0.0012,
                lng: baseLng - 0.0010,
                mountHeightM: 6,
                azimuthDeg: 60,
                fovAngleDeg: 102,
                rangeM: 70,
                tiltAngleDeg: 4, // 4 degrees as requested
                isPtz: false,
                isNightVision: true,
                status: 'ONLINE'
            },
            {
                id: 'sand-cam-02',
                name: 'Field PTZ Surveillance',
                channel: 2,
                model: 'Hikvision DS-2DE4425IW-DE (25x PTZ)',
                ipAddress: '192.168.1.122',
                rtspPort: 554,
                locationName: 'Central Tower',
                lat: baseLat + 0.0010,
                lng: baseLng + 0.0008,
                mountHeightM: 9,
                azimuthDeg: 210,
                fovAngleDeg: 65,
                rangeM: 140,
                tiltAngleDeg: 5,
                isPtz: true,
                isNightVision: true,
                status: 'ONLINE'
            }
        ];
    });

    // Active Camera Selection for Left Panel Multi-Camera Hub
    const [activeCameraId, setActiveCameraId] = useState<string>(() => {
        return 'sand-cam-01';
    });

    const activeCamera = useMemo(() => {
        return testCameras.find(c => c.id === activeCameraId) || testCameras[0] || {
            id: 'sand-cam-01',
            name: 'Surveillance Cam #1',
            channel: 1,
            model: 'Hikvision DS-2CD2087G2-LU (4K ColorVu)',
            ipAddress: '192.168.1.121',
            rtspPort: 554,
            locationName: 'Perimeter Pole A',
            lat: baseLat - 0.0012,
            lng: baseLng - 0.0010,
            mountHeightM: 6,
            azimuthDeg: 60,
            fovAngleDeg: 102,
            rangeM: 70,
            tiltAngleDeg: 4,
            isPtz: false,
            isNightVision: true,
            status: 'ONLINE' as const
        };
    }, [testCameras, activeCameraId, baseLat, baseLng]);

    const updateActiveCamera = (patch: Partial<PlantationCamera>) => {
        setTestCameras(prev => {
            const next = prev.map(c => c.id === activeCamera.id ? { ...c, ...patch } : c);
            safeStorage.setItem('agrimap_sandbox_test_cameras', JSON.stringify(next));
            return next;
        });
    };

    // Helper to guarantee 100% unique IDs across all spine connection points
    const sanitizeSpinePoints = (rawPoints: any[]): SpineControlPoint[] => {
        if (!Array.isArray(rawPoints)) return [];
        const seenIds = new Set<string>();
        return rawPoints.map((pt: any, idx: number) => {
            const letter = String.fromCharCode(65 + idx);
            let baseId = typeof pt?.id === 'string' && pt.id.trim().length > 0 ? pt.id.trim() : `pt-${letter}`;
            let candidateId = baseId;
            let suffix = 1;
            while (seenIds.has(candidateId)) {
                candidateId = `pt-${letter}-${idx + 1}-${suffix}`;
                suffix++;
            }
            seenIds.add(candidateId);
            return {
                ...pt,
                id: candidateId,
                name: pt?.name || `Connection point ${letter}`
            };
        });
    };

    // Central Ridge Hill Spine Profile (Spine & Cross-Section Profile method)
    // Starts EMPTY by default so no unrequested hill automatically appears on map refresh
    const [hillSpineProfile, setHillSpineProfile] = useState<HillSpineProfile>(() => {
        const emptyProfile: HillSpineProfile = {
            id: 'spine-hill-main',
            name: 'Plantation Mound Ridge & Terrace',
            enabled: false,
            points: []
        };

        const saved = safeStorage.getItem('agrimap_sandbox_hill_spine_profile');
        if (saved) {
            try { 
                const parsed = JSON.parse(saved);
                if (parsed && Array.isArray(parsed.points) && parsed.points.length >= 2) {
                    // Check if this was the hardcoded legacy dummy hill that user never requested
                    const isLegacyDummy = parsed.id === 'spine-hill-main' && 
                        parsed.points.length === 3 && 
                        parsed.points.some((p: any) => p.id === 'pt-A' && (p.peakHeightM === 15 || p.peakHeightM === 18));
                    if (!isLegacyDummy) {
                        return {
                            ...parsed,
                            points: sanitizeSpinePoints(parsed.points)
                        };
                    } else {
                        safeStorage.removeItem('agrimap_sandbox_hill_spine_profile');
                    }
                }
            } catch (e) {}
        }
        return emptyProfile;
    });

    const [activePointId, setActivePointId] = useState<string>(() => {
        return hillSpineProfile.points[0]?.id || '';
    });
    const [lastEditedPointId, setLastEditedPointId] = useState<string | null>(null);
    const pointHistoryRef = useRef<string[]>([]);
    const [isClearMapConfirmOpen, setIsClearMapConfirmOpen] = useState<boolean>(false);
    const [isPlannerImportOpen, setIsPlannerImportOpen] = useState<boolean>(false);
    const [drawingPointHeight, setDrawingPointHeight] = useState<number>(20);
    const [terrainCounter, setTerrainCounter] = useState<number>(0);
    const handleDeleteLastEditedPointRef = useRef<() => void>(() => {});

    // Sync hill spine profile to global cache on update
    useEffect(() => {
        safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(hillSpineProfile));
        setActiveSpineProfilesCache([hillSpineProfile]);
    }, [hillSpineProfile]);

    // Global Keyboard Listeners: Backspace, Delete, and Ctrl+Z / Cmd+Z to delete last edited point
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) {
                return;
            }
            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                handleDeleteLastEditedPointRef.current?.();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                handleDeleteLastEditedPointRef.current?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Browser / Mouse Back Button Listener (popstate)
    useEffect(() => {
        const handlePopState = (e: PopStateEvent) => {
            if (e.state && e.state.sandboxPointEdit) {
                handleDeleteLastEditedPointRef.current?.();
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Auto-recenter cameras and slope points to current plantation center if out of bounds
    useEffect(() => {
        if (!baseLat || !baseLng) return;
        setTestCameras(prev => {
            const needReposition = prev.some(c => 
                !c.lat || !c.lng || 
                isNaN(c.lat) || isNaN(c.lng) ||
                Math.hypot(c.lat - baseLat, c.lng - baseLng) > 0.015
            );
            if (!needReposition) return prev;
            
            const offsets = [
                [-0.0008, -0.0008],
                [0.0008, 0.0006],
                [-0.0004, 0.0010],
                [0.0010, -0.0006]
            ];
            const updated = prev.map((cam, idx) => {
                const off = offsets[idx % offsets.length];
                return {
                    ...cam,
                    lat: baseLat + off[0],
                    lng: baseLng + off[1]
                };
            });
            safeStorage.setItem('agrimap_sandbox_test_cameras', JSON.stringify(updated));
            return updated;
        });

        setHillSpineProfile(prev => {
            const needReposition = prev.points.some(p => 
                !p.lat || !p.lng || 
                isNaN(p.lat) || isNaN(p.lng) ||
                Math.hypot(p.lat - baseLat, p.lng - baseLng) > 0.015
            );
            if (!needReposition) return prev;
            const updated = {
                ...prev,
                points: prev.points.map((p, idx) => {
                    const step = (idx - 1) * 0.00045;
                    return {
                        ...p,
                        lat: baseLat + step,
                        lng: baseLng + step * 1.2
                    };
                })
            };
            safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(updated));
            setActiveSpineProfilesCache([updated]);
            return updated;
        });
    }, [baseLat, baseLng]);

    const activePoint = useMemo(() => {
        return hillSpineProfile.points.find(p => p.id === activePointId) || hillSpineProfile.points[0] || {
            id: 'pt-B',
            name: 'Midpoint (Ridge Apex) B',
            lat: baseLat,
            lng: baseLng,
            widthM: 60,
            startOffsetM: 2,
            endDistanceM: 85,
            peakHeightM: 35,
            slopeFalloff: 'cosine' as const
        };
    }, [hillSpineProfile.points, activePointId, baseLat, baseLng]);

    const updateActivePoint = (patch: Partial<SpineControlPoint>) => {
        setLastEditedPointId(activePoint.id);
        pointHistoryRef.current.push(activePoint.id);
        setHillSpineProfile(prev => {
            const nextPoints = prev.points.map(p => p.id === activePoint.id ? { ...p, ...patch } : p);
            const next = { ...prev, points: nextPoints };
            safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(next));
            setActiveSpineProfilesCache([next]);
            setTerrainCounter(c => c + 1);
            return next;
        });
    };

    const updatePointById = (id: string, patch: Partial<SpineControlPoint>, shouldPersist: boolean = true) => {
        setLastEditedPointId(id);
        setHillSpineProfile(prev => {
            const nextPoints = prev.points.map(p => p.id === id ? { ...p, ...patch } : p);
            const next = { ...prev, points: nextPoints };
            setActiveSpineProfilesCache([next]);
            if (shouldPersist) {
                pointHistoryRef.current.push(id);
                safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(next));
                setTerrainCounter(c => c + 1);
            }
            return next;
        });
        setHillProfiles(prev => {
            return prev.map(h => {
                if (h.points.some(p => p.id === id)) {
                    return { ...h, points: h.points.map(p => p.id === id ? { ...p, ...patch } : p) };
                }
                return h;
            });
        });
    };

    const handleUpdateHillSpineProfile = (patch: Partial<HillSpineProfile>) => {
        setHillSpineProfile(prev => {
            const next = { ...prev, ...patch };
            safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(next));
            setActiveSpineProfilesCache([next]);
            return next;
        });
        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
    };

    // Live mouse width resizing for LEFT handle (independent, asymmetric, inside or outside drawn area)
    // ONLY resizes left side. Right side is strictly preserved and never changed.
    const handleResizeLeftHandle = (pointId: string, handlePos: [number, number], centerPos: [number, number], persist: boolean = false) => {
        const mLat = 111111;
        const mLng = 111111 * Math.cos((centerPos[0] * Math.PI) / 180);
        const dy = (handlePos[0] - centerPos[0]) * mLat;
        const dx = (handlePos[1] - centerPos[1]) * mLng;
        const leftDist = Math.max(2, Math.round(Math.hypot(dx, dy)));
        
        setHillSpineProfile(prev => {
            const target = prev.points.find(p => p.id === pointId);
            if (!target) return prev;
            // Strictly lock the current right side so right side NEVER changes when left handle is moved
            const currentRightW = target.rightWidthM !== undefined ? target.rightWidthM : (target.widthM !== undefined ? target.widthM : 45);
            const avgW = Math.round((leftDist + currentRightW) / 2);
            const nextPoints = prev.points.map(p => {
                if (p.id !== pointId) return p;
                return {
                    ...p,
                    leftLat: handlePos[0],
                    leftLng: handlePos[1],
                    leftWidthM: leftDist,
                    rightWidthM: currentRightW,
                    widthM: avgW,
                    endDistanceM: Math.round(Math.max(leftDist, currentRightW) * 1.25)
                };
            });
            const next = { ...prev, points: nextPoints };
            setActiveSpineProfilesCache([next]);
            if (persist) {
                pointHistoryRef.current.push(pointId);
                safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(next));
                setTerrainCounter(c => c + 1);
            }
            return next;
        });
    };

    // Live mouse width resizing for RIGHT handle (independent, asymmetric, inside or outside drawn area)
    // ONLY resizes right side. Left side is strictly preserved and never changed.
    const handleResizeRightHandle = (pointId: string, handlePos: [number, number], centerPos: [number, number], persist: boolean = false) => {
        const mLat = 111111;
        const mLng = 111111 * Math.cos((centerPos[0] * Math.PI) / 180);
        const dy = (handlePos[0] - centerPos[0]) * mLat;
        const dx = (handlePos[1] - centerPos[1]) * mLng;
        const rightDist = Math.max(2, Math.round(Math.hypot(dx, dy)));
        
        setHillSpineProfile(prev => {
            const target = prev.points.find(p => p.id === pointId);
            if (!target) return prev;
            // Strictly lock the current left side so left side NEVER changes when right handle is moved
            const currentLeftW = target.leftWidthM !== undefined ? target.leftWidthM : (target.widthM !== undefined ? target.widthM : 45);
            const avgW = Math.round((currentLeftW + rightDist) / 2);
            const nextPoints = prev.points.map(p => {
                if (p.id !== pointId) return p;
                return {
                    ...p,
                    rightLat: handlePos[0],
                    rightLng: handlePos[1],
                    rightWidthM: rightDist,
                    leftWidthM: currentLeftW,
                    widthM: avgW,
                    endDistanceM: Math.round(Math.max(currentLeftW, rightDist) * 1.25)
                };
            });
            const next = { ...prev, points: nextPoints };
            setActiveSpineProfilesCache([next]);
            if (persist) {
                pointHistoryRef.current.push(pointId);
                safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(next));
                setTerrainCounter(c => c + 1);
            }
            return next;
        });
    };

    // Moving an entire connection point (Point A, B, C...)
    // Moves the center point AND shifts both Left and Right width handles by (dLat, dLng)
    // preserving their exact independent lengths and orientation without resizing!
    const handleMoveSpinePoint = (pointId: string, newLat: number, newLng: number, persist: boolean = false) => {
        setHillSpineProfile(prev => {
            const target = prev.points.find(p => p.id === pointId);
            if (!target) return prev;
            const dLat = newLat - target.lat;
            const dLng = newLng - target.lng;

            const mLat = 111111;
            const mLng = 111111 * Math.cos((baseLat * Math.PI) / 180);

            let curLeftLat = target.leftLat;
            let curLeftLng = target.leftLng;
            let curRightLat = target.rightLat;
            let curRightLng = target.rightLng;

            const leftW = target.leftWidthM ?? target.widthM ?? 45;
            const rightW = target.rightWidthM ?? target.widthM ?? 45;

            // If explicit coordinates were not yet stored, calculate their starting positions before translating
            if (curLeftLat === undefined || curLeftLng === undefined || curRightLat === undefined || curRightLng === undefined) {
                const idx = prev.points.findIndex(p => p.id === pointId);
                let dirX = 0;
                let dirY = 0;
                if (idx === 0 && prev.points.length > 1) {
                    dirX = (prev.points[1].lng - prev.points[0].lng) * mLng;
                    dirY = (prev.points[1].lat - prev.points[0].lat) * mLat;
                } else if (idx === prev.points.length - 1 && idx > 0) {
                    dirX = (prev.points[idx].lng - prev.points[idx - 1].lng) * mLng;
                    dirY = (prev.points[idx].lat - prev.points[idx - 1].lat) * mLat;
                } else if (idx > 0 && idx < prev.points.length - 1) {
                    dirX = (prev.points[idx + 1].lng - prev.points[idx - 1].lng) * mLng;
                    dirY = (prev.points[idx + 1].lat - prev.points[idx - 1].lat) * mLat;
                } else {
                    dirX = 1;
                    dirY = 0;
                }
                const len = Math.hypot(dirX, dirY) || 1;
                const nx = -dirY / len;
                const ny = dirX / len;

                if (curLeftLat === undefined || curLeftLng === undefined) {
                    curLeftLat = target.lat + (ny * leftW) / mLat;
                    curLeftLng = target.lng + (nx * leftW) / mLng;
                }
                if (curRightLat === undefined || curRightLng === undefined) {
                    curRightLat = target.lat - (ny * rightW) / mLat;
                    curRightLng = target.lng - (nx * rightW) / mLng;
                }
            }

            const nextPoints = prev.points.map(p => {
                if (p.id !== pointId) return p;
                return {
                    ...p,
                    lat: newLat,
                    lng: newLng,
                    leftLat: curLeftLat! + dLat,
                    leftLng: curLeftLng! + dLng,
                    rightLat: curRightLat! + dLat,
                    rightLng: curRightLng! + dLng,
                    leftWidthM: leftW,
                    rightWidthM: rightW,
                    widthM: Math.round((leftW + rightW) / 2)
                };
            });
            const next = { ...prev, points: nextPoints };
            setActiveSpineProfilesCache([next]);
            if (persist) {
                pointHistoryRef.current.push(pointId);
                safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(next));
                setTerrainCounter(c => c + 1);
            }
            return next;
        });
    };

    const handleResizeWidthFromMap = (pointId: string, handlePos: [number, number], centerPos: [number, number]) => {
        handleResizeRightHandle(pointId, handlePos, centerPos, true);
    };

    // Auto-fit slope spine and widths to active orchard parcel
    const handleFitSlopeToOrchard = () => {
        const [cLat, cLng] = plantationCenter;
        const targetHillId = selectedLayerId.startsWith('hill') ? selectedLayerId : 'hill_1';
        const newProfile: HillSpineProfile = {
            id: targetHillId,
            name: 'Plantation Mound Ridge',
            enabled: true,
            points: [
                { id: 'pt-A', name: 'Start Point A', lat: cLat + 0.00045, lng: cLng - 0.00075, widthM: 10, startOffsetM: 0, endDistanceM: 20, peakHeightM: 15, slopeFalloff: 'cosine' },
                { id: 'pt-B', name: 'Mid Apex B', lat: cLat, lng: cLng, widthM: 70, startOffsetM: 2, endDistanceM: 95, peakHeightM: 35, slopeFalloff: 'cosine' },
                { id: 'pt-C', name: 'End Point C', lat: cLat - 0.00045, lng: cLng + 0.00075, widthM: 5, startOffsetM: 0, endDistanceM: 15, peakHeightM: 10, slopeFalloff: 'cosine' }
            ]
        };
        setHillSpineProfile(newProfile);
        safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(newProfile));
        setActiveSpineProfilesCache([newProfile]);
        setHillProfiles(prev => {
            const cleaned = prev.filter(h => h.id !== targetHillId && !h.id.startsWith('spine-'));
            return [...cleaned, newProfile];
        });
        setActivePointId('pt-B');
        setTerrainCounter(c => c + 1);
        setFlyTarget({ lat: cLat, lng: cLng, zoom: 18, timestamp: Date.now() });
        toast.success(isKa ? 'ქედი მოერგო პლანტაციის ნაკვეთს (A:10მ, B:70მ, C:5მ)' : 'Slope fitted to orchard (A: 10m, B: 70m, C: 5m)');
    };

    // Start a fresh ridge line by clicking points on the map
    const handleStartNewSlope = () => {
        const targetHillId = selectedLayerId.startsWith('hill') ? selectedLayerId : 'hill_1';
        const freshProfile: HillSpineProfile = {
            id: targetHillId,
            name: 'Custom Ridge Slope',
            enabled: true,
            points: []
        };
        setHillSpineProfile(freshProfile);
        safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(freshProfile));
        setActiveSpineProfilesCache([freshProfile]);
        setHillProfiles(prev => prev.filter(h => h.id !== targetHillId && !h.id.startsWith('spine-')));
        setTerrainCounter(c => c + 1);
        setActiveTool('draw_slope');
        toast.info(isKa ? 'დააწკაპუნეთ რუკაზე წერტილების (A, B, C...) დასასმელად' : 'Click on map to place your ridge points (Point A, B, C...)');
    };

    // Midpoint coordinates along the spine for displaying the slope length badge
    const spineMidpointCoords = useMemo<[number, number]>(() => {
        const pts = hillSpineProfile.points;
        if (!pts || pts.length === 0) return [baseLat, baseLng];
        if (pts.length === 1) return [pts[0].lat, pts[0].lng];
        const midIdx = Math.floor(pts.length / 2);
        return [pts[midIdx].lat, pts[midIdx].lng];
    }, [hillSpineProfile.points, baseLat, baseLng]);

    // Measured length along ridge spine
    const measuredHillLengthM = useMemo(() => {
        if (!hillSpineProfile.points || hillSpineProfile.points.length < 2) return 0;
        let total = 0;
        const mLat = 111111;
        const mLng = 111111 * Math.cos((baseLat * Math.PI) / 180);
        for (let i = 0; i < hillSpineProfile.points.length - 1; i++) {
            const p1 = hillSpineProfile.points[i];
            const p2 = hillSpineProfile.points[i + 1];
            const dy = (p2.lat - p1.lat) * mLat;
            const dx = (p2.lng - p1.lng) * mLng;
            total += Math.hypot(dx, dy);
        }
        return Math.round(total * 100) / 100;
    }, [hillSpineProfile.points, baseLat]);

    // Live calculated Point-to-Point Segments (Distance, Height Delta, and Incline/Decline %)
    const hillSegments = useMemo<TerrainSegmentMetrics[]>(() => {
        if (!hillSpineProfile.points || hillSpineProfile.points.length < 2) return [];
        return calculatePathSegments(
            hillSpineProfile.points.map((p, idx) => ({
                id: p.id,
                lat: p.lat,
                lng: p.lng,
                z: p.peakHeightM,
                label: p.name || `Pt ${String.fromCharCode(65 + idx)}`
            })),
            false
        );
    }, [hillSpineProfile.points]);

    // Cross-section perpendicular bars at Connection Points A, B...
    const crossSectionBars = useMemo(() => {
        if (!hillSpineProfile.points || hillSpineProfile.points.length < 2) return [];
        const mLat = 111111;
        const mLng = 111111 * Math.cos((baseLat * Math.PI) / 180);
        const pts = hillSpineProfile.points;

        return pts.map((pt, idx) => {
            let dirX = 0;
            let dirY = 0;
            if (idx === 0) {
                dirX = (pts[1].lng - pts[0].lng) * mLng;
                dirY = (pts[1].lat - pts[0].lat) * mLat;
            } else if (idx === pts.length - 1) {
                dirX = (pts[idx].lng - pts[idx - 1].lng) * mLng;
                dirY = (pts[idx].lat - pts[idx - 1].lat) * mLat;
            } else {
                dirX = (pts[idx + 1].lng - pts[idx - 1].lng) * mLng;
                dirY = (pts[idx + 1].lat - pts[idx - 1].lat) * mLat;
            }
            const len = Math.hypot(dirX, dirY) || 1;
            const nx = -dirY / len;
            const ny = dirX / len;

            const leftW = pt.leftWidthM ?? pt.widthM ?? 45;
            const rightW = pt.rightWidthM ?? pt.widthM ?? 45;

            const leftLat = (pt.leftLat !== undefined && Number.isFinite(pt.leftLat)) 
                ? pt.leftLat 
                : pt.lat + (ny * leftW) / mLat;
            const leftLng = (pt.leftLng !== undefined && Number.isFinite(pt.leftLng)) 
                ? pt.leftLng 
                : pt.lng + (nx * leftW) / mLng;

            const rightLat = (pt.rightLat !== undefined && Number.isFinite(pt.rightLat)) 
                ? pt.rightLat 
                : pt.lat - (ny * rightW) / mLat;
            const rightLng = (pt.rightLng !== undefined && Number.isFinite(pt.rightLng)) 
                ? pt.rightLng 
                : pt.lng - (nx * rightW) / mLng;

            return {
                id: `${pt.id || 'bar'}-${idx}`,
                pointId: pt.id,
                name: pt.name,
                center: [pt.lat, pt.lng] as [number, number],
                line: [[leftLat, leftLng], [rightLat, rightLng]] as [number, number][],
                leftEnd: [leftLat, leftLng] as [number, number],
                rightEnd: [rightLat, rightLng] as [number, number],
                leftWidthM: leftW,
                rightWidthM: rightW,
                widthM: Math.round(leftW + rightW)
            };
        });
    }, [hillSpineProfile.points, baseLat]);

    // Planting Mound Perimeter Polygon (interpolates left & right bounds along ridge)
    const moundPerimeterPolygon = useMemo(() => {
        if (!crossSectionBars || crossSectionBars.length < 2) return [];
        const leftPts: [number, number][] = [];
        const rightPts: [number, number][] = [];

        for (let i = 0; i < crossSectionBars.length; i++) {
            leftPts.push(crossSectionBars[i].leftEnd);
            rightPts.push(crossSectionBars[i].rightEnd);
        }

        return [...leftPts, ...rightPts.reverse()];
    }, [crossSectionBars]);

    // Measured total perimeter of the planting mound (in meters)
    const measuredMoundPerimeterM = useMemo(() => {
        if (moundPerimeterPolygon.length < 3) return 0;
        let total = 0;
        const mLat = 111111;
        const mLng = 111111 * Math.cos((baseLat * Math.PI) / 180);
        for (let i = 0; i < moundPerimeterPolygon.length; i++) {
            const p1 = moundPerimeterPolygon[i];
            const p2 = moundPerimeterPolygon[(i + 1) % moundPerimeterPolygon.length];
            const dy = (p2[0] - p1[0]) * mLat;
            const dx = (p2[1] - p1[1]) * mLng;
            total += Math.hypot(dx, dy);
        }
        return Math.round(total * 10) / 10;
    }, [moundPerimeterPolygon, baseLat]);

    // Mound overview metrics
    const moundMetrics = useMemo(() => {
        const pts = hillSpineProfile.points || [];
        if (pts.length === 0) return { maxH: 0, minH: 0, avgWidth: 0, maxWidth: 0 };
        let maxH = -Infinity;
        let minH = Infinity;
        let totalW = 0;
        let maxW = 0;
        pts.forEach(p => {
            if (p.peakHeightM > maxH) maxH = p.peakHeightM;
            if (p.peakHeightM < minH) minH = p.peakHeightM;
            const w = p.widthM || 45;
            totalW += w;
            if (w > maxW) maxW = w;
        });
        return {
            maxH: maxH === -Infinity ? 0 : maxH,
            minH: minH === Infinity ? 0 : minH,
            avgWidth: Math.round((totalW / pts.length) * 10) / 10,
            maxWidth: maxW
        };
    }, [hillSpineProfile.points]);

    // Layout and 3D Viewport Controls
    const [layoutMode, setLayoutMode] = useState<'4zone' | 'split50' | 'full2d' | 'full3d'>('full2d');
    const [is3dWindowOpen, setIs3dWindowOpen] = useState<boolean>(false);
    const [is3dWindowMaximized, setIs3dWindowMaximized] = useState<boolean>(false);
    const [is3dMinimized, setIs3dMinimized] = useState<boolean>(false);
    const [isSlopeSculptorOpen, setIsSlopeSculptorOpen] = useState<boolean>(false);
    const [sandbox3dMode, setSandbox3dMode] = useState<'orbit' | 'drone_cockpit' | 'camera_fov'>('orbit');
    
    // 3D Standalone External Tool Connection State (Disconnected by default for speed & Zero RAM)
    const [is3dConnected, setIs3dConnected] = useState<boolean>(() => {
        return safeStorage.getItem('agrimap_3d_tool_connected') === 'true';
    });

    const handleConnect3D = () => {
        setIs3dConnected(true);
        safeStorage.setItem('agrimap_3d_tool_connected', 'true');
        toast.success(isKa ? '3D რელიეფის ინსტრუმენტი დაკავშირებულია პროექტთან!' : '3D Terrain DEM Studio connected to project!');
    };

    const handleDisconnect3D = () => {
        setIs3dConnected(false);
        safeStorage.setItem('agrimap_3d_tool_connected', 'false');
        toast.info(isKa ? '3D ძრავა გაითიშა გარე Standby რეჟიმში (Zero-RAM)' : '3D Engine disconnected back to external standby');
    };

    // Contextual Tools Panel (Camera Hub vs Drone Tools vs 3D vs Windows)
    const [activeContextMode, setActiveContextMode] = useState<'camera' | 'drone' | '3d' | 'windows'>('camera');
    const [isToolsPanelOpen, setIsToolsPanelOpen] = useState<boolean>(true);
    const [isToolsMinimized, setIsToolsMinimized] = useState<boolean>(false);
    const [isToolbarOpen, setIsToolbarOpen] = useState<boolean>(true);
    const [isModalPopUp, setIsModalPopUp] = useState<boolean>(false);
    const [isPopUpMinimized, setIsPopUpMinimized] = useState<boolean>(false);
    const [isPopUpMaximized, setIsPopUpMaximized] = useState<boolean>(false);
    const [elevationExaggeration, setElevationExaggeration] = useState<number>(1.5);
    const [isSatelliteDemLoaded, setIsSatelliteDemLoaded] = useState<boolean>(true);
    const [isAiSlopeScanning, setIsAiSlopeScanning] = useState<boolean>(false);


    // =========================================================================
    // 1. WORKSPACE & LAYER TREE STATE (Base Grid, Hill 1, Hill 2, Slope 1, Slope 2, Photo Pins)
    // =========================================================================
    const [isLayerTreeOpen, setIsLayerTreeOpen] = useState<boolean>(true);
    const [selectedLayerId, setSelectedLayerId] = useState<LayerId>('hill_1');
    const [layerVisibility, setLayerVisibility] = useState({
        baseGrid: true,
        hill1: true,
        slope1: true,
        photoPins: true
    });
    const [layerLocks, setLayerLocks] = useState({
        baseGrid: false,
        hill1: false,
        slope1: false,
        photoPins: false
    });

    // Multi-Layer Hills state (EMPTY by default so no unrequested hill automatically appears)
    const [hillProfiles, setHillProfiles] = useState<HillSpineProfile[]>(() => {
        const saved = safeStorage.getItem('agrimap_sandbox_hill_profiles');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    const validHills = parsed.filter(h => {
                        if (!h || !Array.isArray(h.points) || h.points.length === 0) return false;
                        const isLegacyDummy = h.id === 'hill_1' && h.name === 'Hill 1 (Ridge Spine)' && 
                            h.points.length === 3 && h.points.some((p: any) => p.id === 'pt-A' && (p.peakHeightM === 18 || p.peakHeightM === 15));
                        return !isLegacyDummy;
                    });
                    if (validHills.length > 0) {
                        const seenIds = new Set<string>();
                        const uniqueHills: HillSpineProfile[] = [];
                        for (const h of validHills) {
                            const id = h.id || `hill_${uniqueHills.length + 1}`;
                            if (!seenIds.has(id)) {
                                seenIds.add(id);
                                uniqueHills.push({ ...h, id });
                            }
                        }
                        const firstPt = uniqueHills[0]?.points?.[0];
                        if (firstPt && (Math.abs(firstPt.lat - baseLat) > 0.1 || Math.abs(firstPt.lng - baseLng) > 0.1)) {
                            const dLat = baseLat - firstPt.lat;
                            const dLng = baseLng - firstPt.lng;
                            return uniqueHills.map((h: HillSpineProfile) => ({
                                ...h,
                                points: (h.points || []).map(p => ({
                                    ...p,
                                    lat: p.lat + dLat,
                                    lng: p.lng + dLng
                                }))
                            }));
                        }
                        return uniqueHills;
                    } else {
                        safeStorage.removeItem('agrimap_sandbox_hill_profiles');
                    }
                }
            } catch (_) {}
        }
        return [];
    });

    // Multi-Layer Slopes state
    const [slopeObjects, setSlopeObjects] = useState<PerimeterSlopeObject[]>(() => {
        const saved = safeStorage.getItem('agrimap_sandbox_slope_objects');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    if (parsed.length === 0) return [];
                    const validSlopes = parsed.filter(s => s && Array.isArray(s.vertices) && s.vertices.length > 0);
                    if (validSlopes.length > 0) {
                        const seenIds = new Set<string>();
                        const uniqueSlopes: PerimeterSlopeObject[] = [];
                        for (const s of validSlopes) {
                            const id = s.id || `slope_${uniqueSlopes.length + 1}`;
                            if (!seenIds.has(id)) {
                                seenIds.add(id);
                                uniqueSlopes.push({ ...s, id });
                            }
                        }
                        const firstV = uniqueSlopes[0]?.vertices?.[0];
                        if (firstV && (Math.abs(firstV.lat - baseLat) > 0.1 || Math.abs(firstV.lng - baseLng) > 0.1)) {
                            const dLat = baseLat - firstV.lat;
                            const dLng = baseLng - firstV.lng;
                            return uniqueSlopes.map((s: PerimeterSlopeObject) => ({
                                ...s,
                                vertices: (s.vertices || []).map(v => ({
                                    ...v,
                                    lat: v.lat + dLat,
                                    lng: v.lng + dLng
                                }))
                            }));
                        }
                        return uniqueSlopes;
                    }
                    return [];
                }
            } catch (_) {}
        }
        return [];
    });

    // Sync hill profiles cache and storage (deduplicated by ID)
    useEffect(() => {
        const seenIds = new Set<string>();
        const uniqueHills = hillProfiles.filter(h => {
            if (!h || !h.id) return false;
            if (seenIds.has(h.id)) return false;
            seenIds.add(h.id);
            return true;
        });
        safeStorage.setItem('agrimap_sandbox_hill_profiles', JSON.stringify(uniqueHills));
        setActiveSpineProfilesCache(uniqueHills.filter(h => h.enabled));
    }, [hillProfiles]);

    // Sync slope objects cache and storage (deduplicated by ID)
    useEffect(() => {
        const seenIds = new Set<string>();
        const uniqueSlopes = slopeObjects.filter(s => {
            if (!s || !s.id) return false;
            if (seenIds.has(s.id)) return false;
            seenIds.add(s.id);
            return true;
        });
        safeStorage.setItem('agrimap_sandbox_slope_objects', JSON.stringify(uniqueSlopes));
        setActivePerimeterSlopesCache(uniqueSlopes.filter(s => s.enabled));
    }, [slopeObjects]);

    // Add New Hill Layer (spawns right around current view / plantation center)
    const handleAddHillLayer = () => {
        const cLat = currentCenter[0] || baseLat;
        const cLng = currentCenter[1] || baseLng;
        const newId = `hill_${Date.now()}`;
        const newHill: HillSpineProfile = {
            id: newId,
            name: `Hill ${hillProfiles.length + 1} (Ridge)`,
            enabled: true,
            locked: false,
            generationMode: 'elongated_ridge',
            points: [
                { id: `pt-${newId}-A`, name: 'Point A', lat: cLat + 0.00035, lng: cLng - 0.00055, widthM: 40, startOffsetM: 0, endDistanceM: 50, peakHeightM: 18, slopeFalloff: 'cosine' },
                { id: `pt-${newId}-B`, name: 'Point B', lat: cLat, lng: cLng, widthM: 65, startOffsetM: 2, endDistanceM: 80, peakHeightM: 30, slopeFalloff: 'cosine' },
                { id: `pt-${newId}-C`, name: 'Point C', lat: cLat - 0.00035, lng: cLng + 0.00055, widthM: 45, startOffsetM: 0, endDistanceM: 55, peakHeightM: 16, slopeFalloff: 'cosine' }
            ]
        };
        const next = [...hillProfiles, newHill];
        setHillProfiles(next);
        setHillSpineProfile(newHill);
        setSelectedLayerId(newId);
        setActivePointId(`pt-${newId}-B`);
        setIsSlopeSculptorOpen(true);
        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
        toast.success(isKa ? `ახალი შრე "${newHill.name}" დაემატა` : `New Layer "${newHill.name}" created at current view`);
    };

    // Delete Hill Layer
    const handleDeleteHillLayer = (id: string) => {
        const next = hillProfiles.filter(h => h.id !== id);
        setHillProfiles(next);
        safeStorage.setItem('agrimap_sandbox_hill_profiles', JSON.stringify(next));
        if (selectedLayerId === id || next.length === 0) {
            const fallback = next[0]?.id || 'base_grid';
            setSelectedLayerId(fallback);
            if (next[0]) {
                setHillSpineProfile(next[0]);
            } else {
                setHillSpineProfile({
                    id: 'spine-cleared',
                    name: 'Cleared Slope',
                    enabled: false,
                    points: []
                });
                safeStorage.removeItem('agrimap_sandbox_hill_spine_profile');
                setActiveSpineProfilesCache([]);
                setActivePointId('');
            }
        }
        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
        toast.info(isKa ? 'ბორცვის შრე წაიშალა' : 'Hill layer deleted');
    };

    // Toggle Hill Visibility
    const handleToggleHillVisibility = (id: string) => {
        setHillProfiles(prev => {
            const next = prev.map(h => h.id === id ? { ...h, enabled: !h.enabled } : h);
            if (id === 'hill_1') {
                setLayerVisibility(v => ({ ...v, hill1: !v.hill1 }));
            }
            return next;
        });
        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
    };

    // Toggle Hill Lock
    const handleToggleHillLock = (id: string) => {
        setHillProfiles(prev => prev.map(h => h.id === id ? { ...h, locked: !h.locked } : h));
    };

    // Add New Slope Layer (immediately adds a distinct layer with 3D vertices around current view)
    const handleAddSlopeLayer = () => {
        const cLat = currentCenter[0] || baseLat;
        const cLng = currentCenter[1] || baseLng;
        const newSlopeId = `slope_${Date.now()}`;
        const defaultVertices: PerimeterSlopeVertex[] = [
            { id: `pv-${newSlopeId}-1`, lat: cLat - 0.0004, lng: cLng - 0.0006, elevationOffsetM: 8 },
            { id: `pv-${newSlopeId}-2`, lat: cLat - 0.0002, lng: cLng + 0.0005, elevationOffsetM: 14 },
            { id: `pv-${newSlopeId}-3`, lat: cLat + 0.0005, lng: cLng + 0.0004, elevationOffsetM: 20 },
            { id: `pv-${newSlopeId}-4`, lat: cLat + 0.0003, lng: cLng - 0.0005, elevationOffsetM: 10 }
        ];
        const newSlope: PerimeterSlopeObject = {
            id: newSlopeId,
            name: `Slope ${slopeObjects.length + 1} (Uneven)`,
            enabled: true,
            locked: false,
            hasRoadZeroLevel: true,
            vertices: defaultVertices
        };
        const next = [...slopeObjects, newSlope];
        setSlopeObjects(next);
        setPerimeterVertices(defaultVertices);
        setCustomSlopePerimeter(defaultVertices.map(v => [v.lat, v.lng]));
        setSelectedLayerId(newSlopeId);
        setIsSlopeSculptorOpen(true);
        setActiveTool('select');
        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
        toast.success(isKa ? `ახალი ფერდობის შრე "${newSlope.name}" შეიქმნა` : `New Slope Layer "${newSlope.name}" created at current view`);
    };

    // Delete Slope Layer
    const handleDeleteSlopeLayer = (id: string) => {
        const next = slopeObjects.filter(s => s.id !== id);
        setSlopeObjects(next);
        if (selectedLayerId === id) {
            const fallback = next[0];
            setSelectedLayerId(fallback?.id || 'base_grid');
            if (fallback) {
                setPerimeterVertices(fallback.vertices);
                setCustomSlopePerimeter(fallback.vertices.map(v => [v.lat, v.lng]));
            } else {
                setPerimeterVertices([]);
                setCustomSlopePerimeter([]);
            }
        }
        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
        toast.info(isKa ? 'ფერდობის შრე წაიშალა' : 'Slope layer deleted');
    };

    // Toggle Slope Visibility
    const handleToggleSlopeVisibility = (id: string) => {
        setSlopeObjects(prev => {
            const next = prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
            if (id === 'slope_1') {
                setLayerVisibility(v => ({ ...v, slope1: !v.slope1 }));
            }
            return next;
        });
        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
    };

    // Toggle Slope Lock
    const handleToggleSlopeLock = (id: string) => {
        setSlopeObjects(prev => prev.map(s => s.id === id ? { ...s, locked: !s.locked } : s));
    };

    // Generate Hill inside drawn perimeter
    const handleGenerateHillInsidePerimeter = () => {
        if (customSlopePerimeter.length < 3) {
            toast.warning(isKa ? 'დახატეთ მინიმუმ 3 პერიმეტრის წერტილი' : 'Place at least 3 perimeter points first');
            return;
        }
        const lats = customSlopePerimeter.map(p => p[0]);
        const lngs = customSlopePerimeter.map(p => p[1]);
        const minLat = Math.min(...lats), maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        const dLat = (maxLat - minLat) * 0.35;
        const dLng = (maxLng - minLng) * 0.35;

        const newHillId = `hill_${Date.now()}`;
        const newHill: HillSpineProfile = {
            id: newHillId,
            name: `Mound (Perimeter ${hillProfiles.length + 1})`,
            enabled: true,
            locked: false,
            generationMode: 'elongated_ridge',
            points: [
                { id: `pt-${newHillId}-A`, name: 'Start A', lat: centerLat - dLat, lng: centerLng - dLng, widthM: 35, startOffsetM: 0, endDistanceM: 45, peakHeightM: 16, slopeFalloff: 'cosine' },
                { id: `pt-${newHillId}-B`, name: 'Apex B', lat: centerLat, lng: centerLng, widthM: 65, startOffsetM: 2, endDistanceM: 80, peakHeightM: 32, slopeFalloff: 'cosine' },
                { id: `pt-${newHillId}-C`, name: 'End C', lat: centerLat + dLat, lng: centerLng + dLng, widthM: 40, startOffsetM: 0, endDistanceM: 50, peakHeightM: 18, slopeFalloff: 'cosine' }
            ]
        };

        setHillProfiles(prev => [...prev, newHill]);
        setHillSpineProfile(newHill);
        setSelectedLayerId(newHillId);
        setActivePointId(`pt-${newHillId}-B`);
        setIsSlopeSculptorOpen(true);
        setActiveTool('select');
        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
        toast.success(isKa ? `🏔️ ბორცვი შეიქმნა პერიმეტრის შიგნით!` : `🏔️ Hill / Mound generated inside perimeter!`);
    };

    // Generate 3D Uneven Slope Mesh from drawn perimeter
    const handleGenerateSlopeFromPerimeter = () => {
        if (customSlopePerimeter.length < 3) {
            toast.warning(isKa ? 'დახატეთ მინიმუმ 3 წერტილი' : 'Place at least 3 perimeter points first');
            return;
        }
        const newSlopeId = `slope_${Date.now()}`;
        const vertices: PerimeterSlopeVertex[] = customSlopePerimeter.map((coords, i) => ({
            id: `pv-${newSlopeId}-${i + 1}`,
            lat: coords[0],
            lng: coords[1],
            elevationOffsetM: 12 + (i % 3) * 6
        }));

        const newSlope: PerimeterSlopeObject = {
            id: newSlopeId,
            name: `Slope ${slopeObjects.length + 1} (Perimeter)`,
            enabled: true,
            locked: false,
            hasRoadZeroLevel: true,
            vertices
        };

        setSlopeObjects(prev => [...prev, newSlope]);
        setPerimeterVertices(vertices);
        setSelectedLayerId(newSlopeId);
        setActiveTool('select');
        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
        toast.success(isKa ? `📐 3D ფერდობის ბადე დაგენერირდა!` : `📐 3D Uneven Slope mesh generated from perimeter!`);
    };

    // Elevate all vertices in customSlopePerimeter
    const handleElevatePerimeter = (deltaM: number) => {
        setPerimeterVertices(prev => {
            const next = prev.map(v => ({ ...v, elevationOffsetM: Math.max(0, (v.elevationOffsetM || 10) + deltaM) }));
            safeStorage.setItem('agrimap_sandbox_perimeter_vertices', JSON.stringify(next));
            return next;
        });
        setSlopeObjects(prev => prev.map(s => s.id === selectedLayerId ? {
            ...s,
            vertices: s.vertices.map(v => ({ ...v, elevationOffsetM: Math.max(0, (v.elevationOffsetM || 10) + deltaM) }))
        } : s));
        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
        toast.info(`Perimeter elevation adjusted by ${deltaM > 0 ? '+' : ''}${deltaM}m`);
    };

    const handleToggleLayerVisibility = (layerKey: keyof typeof layerVisibility) => {
        setLayerVisibility(prev => {
            const next = { ...prev, [layerKey]: !prev[layerKey] };
            return next;
        });
        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
    };

    const handleToggleLayerLock = (layerKey: keyof typeof layerLocks) => {
        setLayerLocks(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
    };

    // =========================================================================
    // 2. PHOTO INTEGRATION (GPS PINS & EXIF HEADING EXTRACTION)
    // =========================================================================
    const [photoPins, setPhotoPins] = useState<PhotoGpsPin[]>(() => {
        const saved = loadSavedPhotoPins();
        if (saved.length > 0) return saved;
        return [
            {
                id: 'photo-pin-sample-1',
                name: 'Drone Inspection - South Ridge (Mast #1)',
                dataUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
                lat: 41.9023 - 0.00045,
                lng: 44.5000 - 0.00035,
                altitudeM: 504,
                azimuthDeg: 48,
                fovDeg: 65,
                timestamp: new Date().toLocaleDateString(),
                hasExifGps: true,
                notes: 'Drone high-angle verification shot with compass heading'
            }
        ];
    });
    const [selectedPhotoPin, setSelectedPhotoPin] = useState<PhotoGpsPin | null>(null);
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
    const photoInputRef = useRef<HTMLInputElement | null>(null);

    const handlePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            toast.info(isKa ? '📷 ფოტოს EXIF მეტამონაცემების ანალიზი...' : '📷 Analyzing photo EXIF GPS & compass orientation...');
            const meta = await extractPhotoMetadata(file, plantationCenter[0], plantationCenter[1]);
            const newPin: PhotoGpsPin = {
                id: `photo-${Date.now()}`,
                name: meta.fileName.replace(/\.[^/.]+$/, ''),
                dataUrl: meta.dataUrl,
                lat: meta.lat,
                lng: meta.lng,
                altitudeM: meta.altitudeM,
                azimuthDeg: meta.azimuthDeg,
                fovDeg: 60,
                timestamp: meta.timestamp,
                hasExifGps: meta.hasExifGps,
                notes: meta.hasExifGps ? 'EXIF GPS & Orientation verified' : 'Manual GPS placement'
            };
            const nextPins = [newPin, ...photoPins];
            setPhotoPins(nextPins);
            savePhotoPins(nextPins);
            setSelectedPhotoPin(newPin);
            setIsPhotoModalOpen(true);
            setSelectedLayerId('photo_pins');
            setTerrainCounter(c => c + 1);
            toast.success(isKa ? `📷 ფოტო პინი განთავსდა რუკაზე (${newPin.azimuthDeg}°)` : `📷 Photo Pin placed at (${newPin.lat.toFixed(5)}, ${newPin.lng.toFixed(5)}) with ${newPin.azimuthDeg}° heading`);
        } catch (err) {
            console.error('Photo upload failed:', err);
            toast.error(isKa ? 'ფოტოს დამუშავება ვერ მოხერხდა' : 'Failed to parse photo metadata');
        } finally {
            if (e.target) e.target.value = '';
        }
    };

    const handleDeletePhotoPin = (id: string) => {
        if (layerLocks.photoPins) {
            toast.warning(isKa ? 'Photo Pins შრე ჩაკეტილია' : 'Photo Pins layer is locked');
            return;
        }
        const nextPins = photoPins.filter(p => p.id !== id);
        setPhotoPins(nextPins);
        savePhotoPins(nextPins);
        if (selectedPhotoPin?.id === id) {
            setSelectedPhotoPin(null);
            setIsPhotoModalOpen(false);
        }
        setTerrainCounter(c => c + 1);
        toast.info(isKa ? 'ფოტოს პინი წაიშალა' : 'Photo pin removed');
    };

    // =========================================================================
    // 3. SLOPE 1 PERIMETER VERTICES (3D Triangulation & Uneven Terrain X,Y,Z)
    // =========================================================================
    const [perimeterVertices, setPerimeterVertices] = useState<PerimeterSlopeVertex[]>(() => {
        const raw = safeStorage.getItem('agrimap_sandbox_perimeter_vertices');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const firstV = parsed[0];
                    if (firstV && (Math.abs(firstV.lat - baseLat) > 0.1 || Math.abs(firstV.lng - baseLng) > 0.1)) {
                        const dLat = baseLat - firstV.lat;
                        const dLng = baseLng - firstV.lng;
                        return parsed.map((v: PerimeterSlopeVertex) => ({
                            ...v,
                            lat: v.lat + dLat,
                            lng: v.lng + dLng
                        }));
                    }
                    return parsed;
                }
            } catch (_) {}
        }
        return [
            { id: 'pv-1', lat: baseLat - 0.0005, lng: baseLng - 0.0007, elevationOffsetM: 8 },
            { id: 'pv-2', lat: baseLat - 0.0003, lng: baseLng + 0.0006, elevationOffsetM: 16 },
            { id: 'pv-3', lat: baseLat + 0.0006, lng: baseLng + 0.0005, elevationOffsetM: 22 },
            { id: 'pv-4', lat: baseLat + 0.0004, lng: baseLng - 0.0006, elevationOffsetM: 12 }
        ];
    });

    useEffect(() => {
        safeStorage.setItem('agrimap_sandbox_perimeter_vertices', JSON.stringify(perimeterVertices));
        setActivePerimeterSlopesCache([{
            id: 'slope_1',
            name: 'Slope 1 (Uneven Terrain)',
            enabled: layerVisibility.slope1,
            locked: layerLocks.slope1,
            vertices: perimeterVertices
        }]);
    }, [perimeterVertices, layerVisibility.slope1, layerLocks.slope1]);

    // Live calculated Point-to-Point Segments for Slope 3D Perimeter
    const slopeSegments = useMemo<TerrainSegmentMetrics[]>(() => {
        if (!perimeterVertices || perimeterVertices.length < 2) return [];
        return calculatePathSegments(
            perimeterVertices.map((v, idx) => ({
                id: v.id,
                lat: v.lat,
                lng: v.lng,
                z: v.elevationOffsetM,
                label: `V${idx + 1}`
            })),
            perimeterVertices.length >= 3
        );
    }, [perimeterVertices]);

    const handleUpdatePerimeterVertex = (id: string, patch: Partial<PerimeterSlopeVertex>) => {
        if (layerLocks.slope1) {
            toast.warning(isKa ? 'Slope 1 ჩაკეტილია რედაქტირებისგან' : 'Slope 1 layer is locked against edits');
            return;
        }
        setPerimeterVertices(prev => {
            const next = prev.map(v => v.id === id ? { ...v, ...patch } : v);
            // Also keep customSlopePerimeter coordinates in sync
            setCustomSlopePerimeter(next.map(v => [v.lat, v.lng]));
            return next;
        });
        setSlopeObjects(prev => {
            return prev.map(s => {
                if (s.vertices?.some(v => v.id === id)) {
                    return { ...s, vertices: s.vertices.map(v => v.id === id ? { ...v, ...patch } : v) };
                }
                return s;
            });
        });
        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
    };

    const handleAddPerimeterVertex = () => {
        if (layerLocks.slope1) {
            toast.warning(isKa ? 'Slope 1 ჩაკეტილია' : 'Slope 1 layer is locked');
            return;
        }
        const cLat = currentCenter[0] || baseLat;
        const cLng = currentCenter[1] || baseLng;
        const lastV = perimeterVertices[perimeterVertices.length - 1];
        const newLat = lastV && Math.abs(lastV.lat - cLat) < 0.01 ? lastV.lat + 0.0002 : cLat + 0.0002;
        const newLng = lastV && Math.abs(lastV.lng - cLng) < 0.01 ? lastV.lng + 0.0002 : cLng + 0.0002;
        const newVertex: PerimeterSlopeVertex = {
            id: `pv-${Date.now()}-${perimeterVertices.length + 1}`,
            lat: newLat,
            lng: newLng,
            elevationOffsetM: 14
        };
        const next = [...perimeterVertices, newVertex];
        setPerimeterVertices(next);
        const nextCoords: [number, number][] = next.map(v => [v.lat, v.lng]);
        setCustomSlopePerimeter(nextCoords);
        safeStorage.setItem('agrimap_sandbox_perimeter_vertices', JSON.stringify(next));
        safeStorage.setItem('agrimap_sandbox_custom_perimeter', JSON.stringify(nextCoords));
        
        const targetSlopeId = selectedLayerId.startsWith('slope') ? selectedLayerId : 'slope_1';
        setSlopeObjects(prev => {
            const exists = prev.some(s => s.id === targetSlopeId);
            const updated = exists 
                ? prev.map(s => s.id === targetSlopeId ? { ...s, vertices: next, enabled: true } : s)
                : [...prev, {
                    id: targetSlopeId,
                    name: 'Slope 1 (Uneven Terrain)',
                    enabled: true,
                    locked: false,
                    hasRoadZeroLevel: true,
                    vertices: next
                }];
            safeStorage.setItem('agrimap_sandbox_slope_objects', JSON.stringify(updated));
            return updated;
        });

        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
        toast.success(isKa ? 'დაემატა ახალი წვერო Slope 1-ისთვის' : 'Added new 3D vertex to Slope 1');
    };

    const handleDeletePerimeterVertex = (idOrIndex: string | number, index?: number) => {
        if (layerLocks.slope1) {
            toast.warning(isKa ? 'Slope 1 ჩაკეტილია' : 'Slope 1 layer is locked');
            return;
        }
        const idx = typeof idOrIndex === 'number' 
            ? idOrIndex 
            : (index !== undefined ? index : perimeterVertices.findIndex(v => v.id === idOrIndex));
        const id = typeof idOrIndex === 'string' 
            ? idOrIndex 
            : (perimeterVertices[idx]?.id || '');

        const next = perimeterVertices.filter((v, i) => {
            if (idx >= 0 && i === idx) return false;
            if (id && v.id === id) return false;
            return true;
        });
        setPerimeterVertices(next);
        const nextCoords: [number, number][] = next.map(v => [v.lat, v.lng] as [number, number]);
        setCustomSlopePerimeter(nextCoords);
        safeStorage.setItem('agrimap_sandbox_perimeter_vertices', JSON.stringify(next));
        safeStorage.setItem('agrimap_sandbox_custom_perimeter', JSON.stringify(nextCoords));
        
        const targetSlopeId = selectedLayerId.startsWith('slope') ? selectedLayerId : 'slope_1';
        setSlopeObjects(prev => {
            const updated = prev.map(s => {
                if (s.id === targetSlopeId || (id && s.vertices?.some(v => v.id === id))) {
                    const filteredVertices = (s.vertices || []).filter((v, i) => {
                        if (idx >= 0 && i === idx) return false;
                        if (id && v.id === id) return false;
                        return true;
                    });
                    return { ...s, vertices: filteredVertices };
                }
                return s;
            });
            safeStorage.setItem('agrimap_sandbox_slope_objects', JSON.stringify(updated));
            return updated;
        });

        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
        toast.success(isKa ? 'წერტილი წაიშალა' : 'Vertex deleted successfully');
    };

    // Registered Plantation Areas - Per user specification: only the main should be seen
    // Registered Plantation Areas - Dynamically retrieved for active profile (company or personal)
    const REGISTERED_PLANTATIONS = useMemo(() => {
        const list = getPlantationsList(plantationFeatures, plantationCenter, false);
        return list.map(item => ({
            id: item.id,
            name: item.name,
            nameKa: item.name,
            sectorName: item.name,
            center: item.center,
            elevationBaseM: 480
        }));
    }, [plantationFeatures, plantationCenter]);

    const [selectedPlantationId, setSelectedPlantationId] = useState<string>(() => {
        return REGISTERED_PLANTATIONS[0]?.id || 'plant-agrobari-main';
    });
    const [currentCenter, setCurrentCenter] = useState<[number, number]>(() => {
        return Number.isFinite(plantationCenter[0]) && Number.isFinite(plantationCenter[1])
            ? plantationCenter
            : [41.9023, 44.5];
    });

    const initialCenterDoneRef = useRef(false);
    useEffect(() => {
        if (!initialCenterDoneRef.current && Number.isFinite(plantationCenter[0]) && Number.isFinite(plantationCenter[1])) {
            initialCenterDoneRef.current = true;
            setCurrentCenter(plantationCenter);
        }
        if (REGISTERED_PLANTATIONS.length > 0 && !REGISTERED_PLANTATIONS.some(p => p.id === selectedPlantationId)) {
            setSelectedPlantationId(REGISTERED_PLANTATIONS[0].id);
        }
    }, [plantationCenter, REGISTERED_PLANTATIONS]);

    const handleSelectPlantation = (id: string) => {
        setSelectedPlantationId(id);
        const found = REGISTERED_PLANTATIONS.find(p => p.id === id);
        if (found) {
            setCurrentCenter(found.center);
            setRecenterTrigger(prev => prev + 1);
            setTestDroneMission(prev => ({
                ...prev,
                plantationName: mainPlantation.name,
                sectorName: found.sectorName
            }));
            toast.success(isKa 
                ? `რუკა გადავიდა: ${found.nameKa}` 
                : `Moved map to: ${found.name}`);
        } else {
            const feat = (plantationFeatures || []).find(f => f.id === id);
            if (feat && Array.isArray(feat.geometry) && feat.geometry.length > 0) {
                const coords = feat.geometry as any[];
                let validLatSum = 0;
                let validLngSum = 0;
                let validCount = 0;
                coords.forEach(c => {
                    if (Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number' && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
                        validLatSum += c[0];
                        validLngSum += c[1];
                        validCount++;
                    }
                });
                if (validCount > 0) {
                    const avgLat = validLatSum / validCount;
                    const avgLng = validLngSum / validCount;
                    if (Number.isFinite(avgLat) && Number.isFinite(avgLng)) {
                        setCurrentCenter([avgLat, avgLng]);
                        setRecenterTrigger(prev => prev + 1);
                    }
                }
                setTestDroneMission(prev => ({
                    ...prev,
                    plantationName: mainPlantation.name,
                    sectorName: feat.name || 'Custom Sector'
                }));
                toast.success(isKa 
                    ? `არჩეულია სექტორი: ${feat.name || 'Sector'}` 
                    : `Active Plantation Sector: ${feat.name || 'Sector'}`);
            }
        }
    };

    // Save current map view as LABS Plantation Location
    const handleSaveCurrentAsPlantation = () => {
        const newCoords: [number, number] = [
            Math.round(currentCenter[0] * 1e6) / 1e6,
            Math.round(currentCenter[1] * 1e6) / 1e6
        ];
        setLabsPlantationCenter(newCoords);
        safeStorage.setItem('agrimap_labs_saved_plantation_center', JSON.stringify(newCoords));
        toast.success(isKa 
            ? `პლანტაციის ადგილი წარმატებით შეინახა LABS მოდულისთვის: [${newCoords[0].toFixed(5)}, ${newCoords[1].toFixed(5)}]` 
            : `Plantation location saved for LABS module: [${newCoords[0].toFixed(5)}, ${newCoords[1].toFixed(5)}]`);
    };

    // Pick Plantation Location on Map
    const [isPickingPlantation, setIsPickingPlantation] = useState<boolean>(false);

    const handleStartPickPlantationLocation = () => {
        setIsPickingPlantation(true);
        setActiveTool('pick_plantation');
        toast.info(isKa
            ? '📍 დააწკაპუნეთ რუკაზე "აგრობარი" პლანტაციის ზუსტი ადგილის ასარჩევად'
            : '📍 Click anywhere on map to select Agrobari plantation location');
    };

    // Sync plantation location directly from Map Planner
    const handleSyncPlantationFromPlanner = () => {
        const resolved = resolvePlantationCenter(plantationFeatures, mapCenter || [41.9023, 44.5]);
        setLabsPlantationCenter(resolved);
        safeStorage.setItem('agrimap_labs_saved_plantation_center', JSON.stringify(resolved));
        setCurrentCenter(resolved);
        setFlyTarget({ lat: resolved[0], lng: resolved[1], zoom: 18, timestamp: Date.now() });
        toast.success(isKa 
            ? `პლანტაციის ადგილი გადმოტანილია Map Planner-იდან: [${resolved[0].toFixed(5)}, ${resolved[1].toFixed(5)}]` 
            : `Plantation location synced from Map Planner: [${resolved[0].toFixed(5)}, ${resolved[1].toFixed(5)}]`);
    };

    // Fly to saved LABS plantation location
    const handleFlyToPlantation = () => {
        setFlyTarget({ lat: labsPlantationCenter[0], lng: labsPlantationCenter[1], zoom: 18, timestamp: Date.now() });
        setCurrentCenter(labsPlantationCenter);
        toast.info(isKa 
            ? `რუკა გადაფრინდა თქვენს LABS პლანტაციაზე [${labsPlantationCenter[0].toFixed(4)}, ${labsPlantationCenter[1].toFixed(4)}]` 
            : `Flew to LABS plantation location [${labsPlantationCenter[0].toFixed(4)}, ${labsPlantationCenter[1].toFixed(4)}]`);
    };

    // Master camera toggle: Show all / hide all cameras
    const handleToggleAllCamerasVisibility = () => {
        if (hiddenCameraIds.length > 0) {
            setHiddenCameraIds([]);
            toast.success(isKa ? 'ყველა კამერა გამოჩნდა რუკაზე' : 'All cameras visible on map');
        } else {
            setHiddenCameraIds(testCameras.map(c => c.id));
            toast.info(isKa ? 'ყველა კამერა დაიმალა რუკაზე' : 'All camera FOVs and icons hidden');
        }
    };

    // Automated Satellite Elevation (Mapbox Terrain DEM) loader
    const handleLoadSatelliteDem = () => {
        setIsSatelliteDemLoaded(true);
        setTerrainCounter(c => c + 1);
        toast.success(isKa 
            ? '🛰️ თანამგზავრული DEM რელიეფი (Mapbox Terrain-DEM) ჩაიტვირთა! (InSAR სიზუსტე: ±1.2მ, ბაზა: 480მ ASL)' 
            : '🛰️ Satellite Elevation (Mapbox Terrain-DEM API) loaded! (InSAR Radar & Stereo DEM, Base 480m ASL)');
    };

    // AI Auto-Detect Slope feature: Generates real ridge geometry with break points and independent widths
    const handleAiAutoDetectSlope = () => {
        setIsAiSlopeScanning(true);
        setTimeout(() => {
            setIsAiSlopeScanning(false);
            const [cLat, cLng] = plantationCenter;
            const detectedProfile: HillSpineProfile = {
                id: `spine-ai-${Date.now()}`,
                name: isKa ? 'AI დეტექტირებული ქედი' : 'AI-Detected Contour Ridge',
                enabled: true,
                generationMode: 'elongated_ridge',
                points: [
                    {
                        id: 'ai-pt-A',
                        name: 'Ascent Crest Point A',
                        lat: cLat - 0.0006,
                        lng: cLng - 0.0008,
                        peakHeightM: 22,
                        widthM: 45,
                        leftWidthM: 35,
                        rightWidthM: 20,
                        startOffsetM: 4,
                        endDistanceM: 50,
                        plateauStartM: -5,
                        plateauEndM: 5,
                        slopeFalloff: 'cosine',
                        breakPoints: [
                            { id: 'bp-a1', distanceM: -20, heightM: 10 }
                        ]
                    },
                    {
                        id: 'ai-pt-B',
                        name: 'Peak Ridgeline Apex B',
                        lat: cLat,
                        lng: cLng,
                        peakHeightM: 32,
                        widthM: 65,
                        leftWidthM: 45,
                        rightWidthM: 25,
                        startOffsetM: 6,
                        endDistanceM: 70,
                        plateauStartM: -8,
                        plateauEndM: 6,
                        slopeFalloff: 'cosine',
                        breakPoints: [
                            { id: 'bp-b1', distanceM: -25, heightM: 15 },
                            { id: 'bp-b2', distanceM: 15, heightM: 8 }
                        ]
                    },
                    {
                        id: 'ai-pt-C',
                        name: 'Descent Terminal Point C',
                        lat: cLat + 0.0006,
                        lng: cLng + 0.0008,
                        peakHeightM: 18,
                        widthM: 40,
                        leftWidthM: 30,
                        rightWidthM: 15,
                        startOffsetM: 3,
                        endDistanceM: 45,
                        plateauStartM: -4,
                        plateauEndM: 4,
                        slopeFalloff: 'cosine',
                        breakPoints: [
                            { id: 'bp-c1', distanceM: -18, heightM: 8 }
                        ]
                    }
                ]
            };
            setHillSpineProfile(detectedProfile);
            setActivePointId('ai-pt-B');
            safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(detectedProfile));
            setActiveSpineProfilesCache([detectedProfile]);
            setTerrainCounter(c => c + 1);
            window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
            toast.success(isKa 
                ? '🤖 AI ოპტიკური ანალიზი: ქედის ხაზი და ფერდობის კონტური ავტომატურად განისაზღვრა (+32მ პიკი, ასიმეტრიული ფერდობები)' 
                : '🤖 AI Vision: Ridgeline crest & slope contours detected (+32m apex, asymmetric slopes & break points applied!)');
        }, 600);
    };

    // Camera raycasting viewshed & opposing slope blind zone calculation
    const opposingSlopeBlindZone = useMemo(() => {
        if (!visibility.showBlindZones || !activeCamera || !activeCamera.lat || !activeCamera.lng) return [];
        try {
            const res = computeTerrainViewshed({
                id: activeCamera.id,
                name: activeCamera.name,
                lat: activeCamera.lat,
                lng: activeCamera.lng,
                mountHeightM: activeCamera.mountHeightM || 6,
                azimuthDeg: activeCamera.azimuthDeg || 0,
                tiltAngleDeg: activeCamera.tiltAngleDeg || 4,
                fovAngleDeg: activeCamera.fovAngleDeg || 85,
                rangeM: activeCamera.rangeM || 75
            }, baseLat, baseLng, 32);

            return res.blindZoneGroundPolygons || [];
        } catch (_) {
            return [];
        }
    }, [activeCamera, baseLat, baseLng, terrainCounter, visibility.showBlindZones]);

    // Quick Add Single Camera (+ + ADD CAMERA)
    const handleQuickAddCamera = () => {
        const nextChannel = testCameras.length + 1;
        const newCam: PlantationCamera = {
            id: `sand-cam-${Date.now()}`,
            name: `Surveillance Cam #${nextChannel}`,
            channel: nextChannel,
            model: 'Hikvision DS-2CD2087G2-LU (4K ColorVu)',
            ipAddress: `192.168.1.${120 + nextChannel}`,
            rtspPort: 554,
            locationName: `Orchard Mast CH0${nextChannel}`,
            lat: baseLat + (Math.random() - 0.5) * 0.0012,
            lng: baseLng + (Math.random() - 0.5) * 0.0012,
            mountHeightM: 6,
            azimuthDeg: 45,
            fovAngleDeg: 85,
            rangeM: 75,
            tiltAngleDeg: 4,
            isPtz: false,
            isNightVision: true,
            status: 'ONLINE'
        };
        const updated = [...testCameras, newCam];
        setTestCameras(updated);
        safeStorage.setItem('agrimap_sandbox_test_cameras', JSON.stringify(updated));
        setActiveCameraId(newCam.id);
        toast.success(isKa ? `ახალი კამერა დაემატა: CH0${nextChannel}` : `New Camera Added: [CH0${nextChannel}]`);
    };

    // Duplicate Active Camera
    const handleDuplicateActiveCamera = () => {
        const nextChannel = testCameras.length + 1;
        const copy: PlantationCamera = {
            ...activeCamera,
            id: `sand-cam-${Date.now()}-copy`,
            name: `${activeCamera.name} (Copy)`,
            channel: nextChannel,
            lat: activeCamera.lat + 0.0003,
            lng: activeCamera.lng + 0.0003,
            ipAddress: `192.168.1.${120 + nextChannel}`
        };
        const updated = [...testCameras, copy];
        setTestCameras(updated);
        safeStorage.setItem('agrimap_sandbox_test_cameras', JSON.stringify(updated));
        setActiveCameraId(copy.id);
        toast.success(isKa ? `კამერის ასლი შეიქმნა: CH0${nextChannel}` : `Duplicated Camera: [CH0${nextChannel}]`);
    };

    // Delete Active Camera
    const handleDeleteActiveCamera = () => {
        if (testCameras.length <= 1) {
            toast.warning(isKa ? 'მინიმუმ ერთი კამერა უნდა დარჩეს' : 'At least one camera must remain');
            return;
        }
        const filtered = testCameras.filter(c => c.id !== activeCamera.id);
        setTestCameras(filtered);
        safeStorage.setItem('agrimap_sandbox_test_cameras', JSON.stringify(filtered));
        setActiveCameraId(filtered[0].id);
        toast.info(isKa ? 'კამერა წაიშალა' : 'Camera deleted');
    };

    // Add Axial Connection Point (Point C, D...)
    const handleAddSpinePoint = () => {
        const count = hillSpineProfile.points.length;
        const letter = String.fromCharCode(65 + count);
        const lastPt = hillSpineProfile.points[count - 1] || hillSpineProfile.points[0];
        let uniqueId = `pt-${letter}`;
        let counter = 1;
        while (hillSpineProfile.points.some(p => p.id === uniqueId)) {
            uniqueId = `pt-${letter}-${counter}`;
            counter++;
        }
        const cLat = currentCenter[0] || baseLat;
        const cLng = currentCenter[1] || baseLng;
        const isFar = !lastPt || Math.abs(lastPt.lat - cLat) > 0.015 || Math.abs(lastPt.lng - cLng) > 0.015;
        const newPt: SpineControlPoint = {
            id: uniqueId,
            name: `Connection point ${letter}${counter > 1 ? ` (${counter})` : ''}`,
            lat: isFar ? cLat : lastPt.lat - 0.0004,
            lng: isFar ? cLng : lastPt.lng + 0.0004,
            widthM: lastPt?.widthM || 45,
            startOffsetM: lastPt?.startOffsetM || 0,
            endDistanceM: lastPt?.endDistanceM || 60,
            peakHeightM: lastPt?.peakHeightM || 25,
            slopeFalloff: lastPt?.slopeFalloff || 'cosine'
        };
        const next = { ...hillSpineProfile, enabled: true, points: sanitizeSpinePoints([...hillSpineProfile.points, newPt]) };
        setHillSpineProfile(next);
        safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(next));
        setActiveSpineProfilesCache([next]);
        setActivePointId(newPt.id);
        setLastEditedPointId(newPt.id);
        pointHistoryRef.current.push(newPt.id);
        if (typeof window !== 'undefined' && window.history) {
            try { window.history.pushState({ sandboxPointEdit: true, timestamp: Date.now() }, ''); } catch (e) {}
        }
        setTerrainCounter(c => c + 1);
        toast.success(isKa ? `ახალი საკვანძო წერტილი დაემატა: ${newPt.name}` : `Added ${newPt.name}`);
    };

    // Insert Cross-section Point at Midpoint along the Slope Ridge
    const handleInsertSpinePointAtMidpoint = () => {
        const pts = hillSpineProfile.points;
        if (pts.length < 2) return;
        const curIdx = pts.findIndex(p => p.id === activePointId);
        const p1 = curIdx >= 0 && curIdx < pts.length - 1 ? pts[curIdx] : pts[0];
        const p2 = curIdx >= 0 && curIdx < pts.length - 1 ? pts[curIdx + 1] : pts[1];
        const count = pts.length;
        const letter = String.fromCharCode(65 + count);
        const newPt: SpineControlPoint = {
            id: `pt-${letter}-${Date.now().toString().slice(-4)}`,
            name: `Cross-section ${letter} (Midpoint)`,
            lat: (p1.lat + p2.lat) / 2,
            lng: (p1.lng + p2.lng) / 2,
            widthM: Math.round(((p1.widthM || 45) + (p2.widthM || 45)) / 2),
            startOffsetM: 0,
            endDistanceM: 65,
            peakHeightM: Math.round(((p1.peakHeightM || 20) + (p2.peakHeightM || 20)) / 2 + 5),
            slopeFalloff: p1.slopeFalloff || 'cosine'
        };
        const insertIdx = curIdx >= 0 && curIdx < pts.length - 1 ? curIdx + 1 : 1;
        const newPoints = [...pts.slice(0, insertIdx), newPt, ...pts.slice(insertIdx)];
        const next = { ...hillSpineProfile, enabled: true, points: sanitizeSpinePoints(newPoints) };
        setHillSpineProfile(next);
        safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(next));
        setActiveSpineProfilesCache([next]);
        setActivePointId(newPt.id);
        setLastEditedPointId(newPt.id);
        pointHistoryRef.current.push(newPt.id);
        if (typeof window !== 'undefined' && window.history) {
            try { window.history.pushState({ sandboxPointEdit: true, timestamp: Date.now() }, ''); } catch (e) {}
        }
        setIsSlopeSculptorOpen(true);
        setTerrainCounter(c => c + 1);
        toast.success(isKa ? `ახალი განივი ხაზი დაემატა შუა წერტილზე: ${newPt.name}` : `Inserted new cross-section at midpoint: ${newPt.name}`);
    };

    // Delete Axial Connection Point
    const handleDeleteSpinePoint = (id: string) => {
        const targetPt = hillSpineProfile.points.find(p => p.id === id);
        const filtered = hillSpineProfile.points.filter(p => p.id !== id);
        const sanitized = sanitizeSpinePoints(filtered);
        const next = { 
            ...hillSpineProfile, 
            enabled: sanitized.length >= 2, 
            points: sanitized 
        };
        setHillSpineProfile(next);
        safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(next));

        // Sync to hillProfiles list
        setHillProfiles(prev => {
            const targetHillId = selectedLayerId.startsWith('hill') ? selectedLayerId : (prev[0]?.id || 'hill_1');
            const updated = prev.map(h => h.id === targetHillId ? { ...h, enabled: sanitized.length >= 2, points: sanitized } : h);
            safeStorage.setItem('agrimap_sandbox_hill_profiles', JSON.stringify(updated));
            return updated;
        });

        if (sanitized.length >= 2) {
            setActiveSpineProfilesCache([next]);
        } else {
            setActiveSpineProfilesCache([]);
        }

        const nextActive = sanitized[sanitized.length - 1]?.id || '';
        setActivePointId(nextActive);
        setLastEditedPointId(nextActive || null);
        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
        toast.info(isKa ? `წერტილი წაიშალა: ${targetPt?.name || id}` : `Slope point deleted: ${targetPt?.name || id}`);
    };

    // 2. Test Drone Mission (with Trench configuration and live camera stream)
    const [testDroneMission, setTestDroneMission] = useState<SandboxDroneMission>(() => {
        const defaultMission: SandboxDroneMission = {
            name: 'Orchard Survey Mission',
            mode: 'trench_direction',
            waypoints: [
                { id: 'wp-1', lat: baseLat - 0.002, lng: baseLng - 0.0018, altM: 35, leg: 'outbound' },
                { id: 'wp-2', lat: baseLat - 0.0005, lng: baseLng - 0.0012, altM: 40, leg: 'outbound' },
                { id: 'wp-3', lat: baseLat + 0.0015, lng: baseLng - 0.0005, altM: 45, leg: 'outbound' },
                { id: 'wp-4', lat: baseLat + 0.0018, lng: baseLng + 0.0012, altM: 45, leg: 'return' },
                { id: 'wp-5', lat: baseLat - 0.0002, lng: baseLng + 0.0010, altM: 40, leg: 'return' },
                { id: 'wp-6', lat: baseLat - 0.002, lng: baseLng - 0.0018, altM: 35, leg: 'return' }
            ],
            circleCenter: [baseLat, baseLng],
            circleRadiusM: 80,
            altitudeM: 40,
            speedMs: 12,
            telemetryIntervalS: 2,
            directionDeg: 45,
            isSimulating: false,
            simulatedProgress: 0,
            currentLat: baseLat - 0.002,
            currentLng: baseLng - 0.0018,
            currentAlt: 35,
            batteryPct: 98,
            plantationName: 'აგრობარი (Agrobari)',
            sectorName: 'პატარა სექტორი (Small Sector)',
            selectedTrenches: [3, 4, 5],
            isRecordingVideo: false,
            recordingSeconds: 0,
            opticalZoom: 2,
            gimbalPitchDeg: -45
        };

        const saved = safeStorage.getItem('agrimap_sandbox_test_drone');
        if (saved) {
            try { 
                const parsed = JSON.parse(saved);
                return {
                    ...defaultMission,
                    ...parsed,
                    selectedTrenches: Array.isArray(parsed?.selectedTrenches) ? parsed.selectedTrenches : [3, 4, 5],
                    plantationName: parsed?.plantationName || defaultMission.plantationName,
                    sectorName: parsed?.sectorName || defaultMission.sectorName,
                    waypoints: Array.isArray(parsed?.waypoints) ? parsed.waypoints : defaultMission.waypoints
                };
            } catch (e) {}
        }
        return defaultMission;
    });

    // 3. Test Soil Sensors
    const [testSoilSensors, setTestSoilSensors] = useState<SandboxSoilSensor[]>(() => {
        const saved = safeStorage.getItem('agrimap_sandbox_test_soil');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [
            {
                id: 'soil-01',
                name: 'Blueberry Row Node #1',
                type: 'SOIL_MOISTURE_NPK',
                lat: baseLat + 0.0008,
                lng: baseLng - 0.0008,
                moistureVwc: 28.4,
                temperatureC: 19.2,
                ecMsCm: 1.25,
                nitrogenPpm: 48,
                phosphorusPpm: 22,
                potassiumPpm: 180,
                batteryPct: 94,
                signalRssi: -68,
                depthCm: 30,
                status: 'OPTIMAL'
            },
            {
                id: 'soil-02',
                name: 'Hazelnut Row Node #2',
                type: 'SOIL_MOISTURE_NPK',
                lat: baseLat - 0.0008,
                lng: baseLng + 0.0010,
                moistureVwc: 17.1,
                temperatureC: 22.4,
                ecMsCm: 0.95,
                nitrogenPpm: 32,
                phosphorusPpm: 16,
                potassiumPpm: 140,
                batteryPct: 88,
                signalRssi: -74,
                depthCm: 45,
                status: 'LOW_MOISTURE'
            }
        ];
    });

    // 4. Test Water Sensors
    const [testWaterSensors, setTestWaterSensors] = useState<SandboxWaterSensor[]>(() => {
        const saved = safeStorage.getItem('agrimap_sandbox_test_water');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [
            {
                id: 'water-01',
                name: 'Drip Fertigation Flow Meter',
                type: 'FLOW_METER',
                lat: baseLat + 0.0002,
                lng: baseLng - 0.0012,
                flowRateLpm: 142.5,
                totalVolumeM3: 1845.2,
                waterLevelM: 0,
                pressureBar: 3.4,
                batteryPct: 99,
                status: 'FLOWING'
            },
            {
                id: 'water-02',
                name: 'Artesian Well Level Probe',
                type: 'DEEP_WELL_LEVEL',
                lat: baseLat + 0.0016,
                lng: baseLng - 0.0014,
                flowRateLpm: 0,
                totalVolumeM3: 0,
                waterLevelM: 14.8,
                pressureBar: 1.5,
                batteryPct: 91,
                status: 'IDLE'
            }
        ];
    });

    // 5. Test Worker GPS Tracker Beacons
    const [testWorkersGps, setTestWorkersGps] = useState<SandboxWorkerGps[]>(() => {
        const saved = safeStorage.getItem('agrimap_sandbox_test_workers');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [
            {
                id: 'wrk-01',
                workerName: 'Giorgi Maisuradze',
                badgeCode: 'GPS-BADGE-#104',
                role: 'Pruning Team Leader',
                lat: baseLat - 0.0004,
                lng: baseLng - 0.0002,
                speedKmh: 2.4,
                batteryPct: 86,
                heartRateBpm: 78,
                status: 'ACTIVE'
            },
            {
                id: 'wrk-02',
                workerName: 'David Kapanadze',
                badgeCode: 'GPS-BADGE-#208',
                role: 'Tractor Operator',
                lat: baseLat + 0.0012,
                lng: baseLng + 0.0014,
                speedKmh: 9.8,
                batteryPct: 92,
                heartRateBpm: 84,
                status: 'ACTIVE'
            }
        ];
    });

    // 6. Test Trenches and Seedlings for the Plantation ("აგრობარი" -> "პატარა სექტორი" -> Trenches #3, #4, #5 -> Seed #44)
    const testTrenches = useMemo(() => [
        { id: 1, name: 'თხრილი #1 (Trench #1)', coords: [[baseLat - 0.0015, baseLng - 0.0012], [baseLat + 0.0015, baseLng - 0.0008]] as [number, number][] },
        { id: 2, name: 'თხრილი #2 (Trench #2)', coords: [[baseLat - 0.0015, baseLng - 0.0009], [baseLat + 0.0015, baseLng - 0.0005]] as [number, number][] },
        { id: 3, name: 'თხრილი #3 (Trench #3)', coords: [[baseLat - 0.0015, baseLng - 0.0006], [baseLat + 0.0015, baseLng - 0.0002]] as [number, number][] },
        { id: 4, name: 'თხრილი #4 (Trench #4)', coords: [[baseLat - 0.0015, baseLng - 0.0003], [baseLat + 0.0015, baseLng + 0.0001]] as [number, number][] },
        { id: 5, name: 'თხრილი #5 (Trench #5)', coords: [[baseLat - 0.0015, baseLng], [baseLat + 0.0015, baseLng + 0.0004]] as [number, number][] }
    ], [baseLat, baseLng]);

    // Sample seedling test target (Seed #44 in Trench #3, Sector "პატარა სექტორი", Plantation "აგრობარი")
    const testSeedlingTarget = useMemo(() => ({
        id: 'seed-44',
        name: 'ნერგი #44 (Seed 44)',
        plantation: 'აგრობარი (Agrobari)',
        sector: 'პატარა სექტორი (Small Sector)',
        trenchNumber: 3,
        seedNumber: 44,
        lat: baseLat + 0.0001,
        lng: baseLng - 0.0004,
        variety: 'Blueberry Duke Ultra',
        condition: 'Good',
        heightCm: 65,
        lastInspected: '2 hours ago'
    }), [baseLat, baseLng]);

    // Active Selected Object for Details View Panel
    const [selectedObject, setSelectedObject] = useState<{
        type: 'camera' | 'drone' | 'soil' | 'water' | 'worker' | 'seedling' | 'trench' | 'weather' | 'slope_point';
        data: any;
    } | null>(null);

    // Inline Edit Mode inside Details View
    const [isEditingDetails, setIsEditingDetails] = useState<boolean>(false);
    const [editFormData, setEditFormData] = useState<any>({});

    // Live Drone Camera HUD Modal / Floating View
    const [isDroneLiveCameraOpen, setIsDroneLiveCameraOpen] = useState<boolean>(false);

    // Live Surveillance Camera Stream Modal state
    const [liveStreamCamera, setLiveStreamCamera] = useState<PlantationCamera | null>(null);

    // Universal LAN Scanner & All Cameras Wide Modals
    const [isLanScannerModalOpen, setIsLanScannerModalOpen] = useState<boolean>(false);
    const [isAllCamerasWideOpen, setIsAllCamerasWideOpen] = useState<boolean>(false);

    // 6. Test Weather Stations
    const [testWeatherStations, setTestWeatherStations] = useState<SandboxWeatherStation[]>(() => {
        const saved = safeStorage.getItem('agrimap_sandbox_test_weather_stations');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [
            {
                id: 'sand-weather-01',
                name: 'Central Orchard Weather Station',
                model: 'Davis Vantage Pro2 Plus (WeatherLink IP)',
                ipAddress: '192.168.1.150',
                port: 22222,
                lat: baseLat + 0.0008,
                lng: baseLng - 0.0006,
                tempC: 19.4,
                humidityPct: 58,
                windSpeedKmh: 9.8,
                windDirectionDeg: 235,
                solarRadiationWm2: 610,
                rainMm: 0.0,
                pressureHpa: 1016.2,
                status: 'ONLINE',
                lastUpdated: 'Just now'
            }
        ];
    });

    useEffect(() => {
        safeStorage.setItem('agrimap_sandbox_test_weather_stations', JSON.stringify(testWeatherStations));
    }, [testWeatherStations]);

    // Captured Media Gallery (Photos & Videos)
    const [capturedMedia, setCapturedMedia] = useState<{
        id: string;
        type: 'photo' | 'video';
        title: string;
        target: string;
        timestamp: string;
        url: string;
    }[]>([]);

    // Export to Main Map Planner Modal
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportLayerName, setExportLayerName] = useState(
        isKa ? 'ლაბორატორიის ფენა: კამერები, დრონი & სენსორები' : 'Hardware Lab: Cameras, Drone & IoT Layer'
    );

    // Persist Sandbox state
    useEffect(() => {
        safeStorage.setItem('agrimap_sandbox_test_cameras', JSON.stringify(testCameras));
    }, [testCameras]);

    useEffect(() => {
        safeStorage.setItem('agrimap_sandbox_test_drone', JSON.stringify(testDroneMission));
    }, [testDroneMission]);

    useEffect(() => {
        safeStorage.setItem('agrimap_sandbox_test_soil', JSON.stringify(testSoilSensors));
    }, [testSoilSensors]);

    useEffect(() => {
        safeStorage.setItem('agrimap_sandbox_test_water', JSON.stringify(testWaterSensors));
    }, [testWaterSensors]);

    useEffect(() => {
        safeStorage.setItem('agrimap_sandbox_test_workers', JSON.stringify(testWorkersGps));
    }, [testWorkersGps]);

    // Drone flight simulation loop
    useEffect(() => {
        if (!testDroneMission.isSimulating) return;

        const interval = setInterval(() => {
            setTestDroneMission(prev => {
                if (!prev.isSimulating) return prev;

                let nextProgress = prev.simulatedProgress + 0.015;
                if (nextProgress >= 1) {
                    nextProgress = 0; // loop simulation
                }

                // If waypoints or trench direction
                const waypoints = prev.waypoints;
                if (waypoints.length >= 2) {
                    const totalSegments = waypoints.length - 1;
                    const segmentFloat = nextProgress * totalSegments;
                    const segIndex = Math.min(totalSegments - 1, Math.floor(segmentFloat));
                    const segFraction = segmentFloat - segIndex;

                    const p1 = waypoints[segIndex];
                    const p2 = waypoints[segIndex + 1];

                    const lat = p1.lat + (p2.lat - p1.lat) * segFraction;
                    const lng = p1.lng + (p2.lng - p1.lng) * segFraction;
                    const alt = p1.altM + (p2.altM - p1.altM) * segFraction;

                    return {
                        ...prev,
                        simulatedProgress: nextProgress,
                        currentLat: lat,
                        currentLng: lng,
                        currentAlt: Math.round(alt),
                        batteryPct: Math.max(12, Number((prev.batteryPct - 0.02).toFixed(1))),
                        recordingSeconds: prev.isRecordingVideo ? prev.recordingSeconds + 1 : prev.recordingSeconds
                    };
                }

                return prev;
            });
        }, 150);

        return () => clearInterval(interval);
    }, [testDroneMission.isSimulating]);

    // Calculate drawn bearing between Point A and Point B
    const drawnBearing = useMemo(() => {
        if (!directionStart || !directionEnd) return 45;
        const lat1 = (directionStart[0] * Math.PI) / 180;
        const lat2 = (directionEnd[0] * Math.PI) / 180;
        const dLng = ((directionEnd[1] - directionStart[1]) * Math.PI) / 180;
        const y = Math.sin(dLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
        const brng = (Math.atan2(y, x) * 180) / Math.PI;
        return Math.round((brng + 360) % 360);
    }, [directionStart, directionEnd]);

    // Custom Perimeter Drawn Polygon State
    const [customSlopePerimeter, setCustomSlopePerimeter] = useState<[number, number][]>(() => {
        const saved = safeStorage.getItem('agrimap_sandbox_custom_perimeter');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [];
    });

    useEffect(() => {
        safeStorage.setItem('agrimap_sandbox_custom_perimeter', JSON.stringify(customSlopePerimeter));
    }, [customSlopePerimeter]);

    // Measured total perimeter of custom drawn boundary
    const measuredCustomPerimeterM = useMemo(() => {
        if (customSlopePerimeter.length < 2) return 0;
        let total = 0;
        const mLat = 111111;
        const mLng = 111111 * Math.cos((baseLat * Math.PI) / 180);
        for (let i = 0; i < customSlopePerimeter.length; i++) {
            const p1 = customSlopePerimeter[i];
            const p2 = customSlopePerimeter[(i + 1) % customSlopePerimeter.length];
            const dy = (p2[0] - p1[0]) * mLat;
            const dx = (p2[1] - p1[1]) * mLng;
            total += Math.hypot(dx, dy);
        }
        return Math.round(total * 10) / 10;
    }, [customSlopePerimeter, baseLat]);

    // Measured area in square meters and hectares for custom drawn boundary
    const customPerimeterArea = useMemo(() => {
        if (customSlopePerimeter.length < 3) return { m2: 0, ha: 0 };
        const mLat = 111111;
        const mLng = 111111 * Math.cos((baseLat * Math.PI) / 180);
        let area = 0;
        const pts = customSlopePerimeter;
        for (let i = 0; i < pts.length; i++) {
            const j = (i + 1) % pts.length;
            const x1 = (pts[i][1] - baseLng) * mLng;
            const y1 = (pts[i][0] - baseLat) * mLat;
            const x2 = (pts[j][1] - baseLng) * mLng;
            const y2 = (pts[j][0] - baseLat) * mLat;
            area += x1 * y2 - x2 * y1;
        }
        const m2 = Math.round(Math.abs(area) / 2);
        const ha = Number((m2 / 10000).toFixed(2));
        return { m2, ha };
    }, [customSlopePerimeter, baseLat, baseLng]);

    // Slope Centroid for Move Gizmo
    const slopeCentroid = useMemo<[number, number]>(() => {
        const pts = hillSpineProfile.points;
        if (!pts || pts.length === 0) return [baseLat, baseLng];
        let latSum = 0, lngSum = 0;
        pts.forEach(p => {
            latSum += p.lat;
            lngSum += p.lng;
        });
        return [latSum / pts.length, lngSum / pts.length];
    }, [hillSpineProfile.points, baseLat, baseLng]);

    // Slope Apex (Highest or Middle point)
    const slopeApexPoint = useMemo(() => {
        const pts = hillSpineProfile.points;
        if (!pts || pts.length === 0) return null;
        let highest = pts[0];
        pts.forEach(p => {
            if ((p.peakHeightM || 0) > (highest.peakHeightM || 0)) highest = p;
        });
        return highest;
    }, [hillSpineProfile.points]);

    // Move Entire Slope by Delta (dLat, dLng)
    const handleMoveEntireSlope = (deltaLat: number, deltaLng: number) => {
        setHillSpineProfile(prev => {
            const updated = {
                ...prev,
                points: prev.points.map(p => ({
                    ...p,
                    lat: p.lat + deltaLat,
                    lng: p.lng + deltaLng
                }))
            };
            safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(updated));
            setActiveSpineProfilesCache([updated]);
            return updated;
        });
        setTerrainCounter(c => c + 1);
    };

    // Convert Custom Hand-Drawn Perimeter Boundary to 3D Slope / Hill (Matching user sketch)
    const handleConvertPerimeterToSlope = () => {
        if (customSlopePerimeter.length < 3) {
            toast.warning(isKa ? 'დახაზეთ მინიმუმ 3 წერტილი პერიმეტრისთვის' : 'Draw at least 3 points for perimeter');
            return;
        }
        let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
        let sumLat = 0, sumLng = 0;
        customSlopePerimeter.forEach(([lat, lng]) => {
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            sumLat += lat;
            sumLng += lng;
        });
        const n = customSlopePerimeter.length;
        const centerLat = sumLat / n;
        const centerLng = sumLng / n;

        const dLngM = (maxLng - minLng) * (111111 * Math.cos((centerLat * Math.PI) / 180));
        const dLatM = (maxLat - minLat) * 111111;

        const isHorizontal = dLngM >= dLatM;
        const numPoints = 4;
        const newPoints: SpineControlPoint[] = [];

        for (let i = 0; i < numPoints; i++) {
            const t = (i + 0.5) / numPoints;
            const ptLat = isHorizontal ? centerLat + (t - 0.5) * (maxLat - minLat) * 0.4 : minLat + t * (maxLat - minLat);
            const ptLng = isHorizontal ? minLng + t * (maxLng - minLng) : centerLng + (t - 0.5) * (maxLng - minLng) * 0.4;
            const letter = String.fromCharCode(65 + i);
            
            const bell = Math.sin(Math.PI * t);
            const peakH = Math.max(10, Math.round(15 + bell * 22));
            const width = Math.max(15, Math.round((isHorizontal ? dLatM : dLngM) * (0.45 + bell * 0.55)));

            newPoints.push({
                id: `pt-${letter}`,
                name: `Point ${letter}`,
                lat: ptLat,
                lng: ptLng,
                widthM: width,
                startOffsetM: Math.round(width * 0.05),
                endDistanceM: Math.round(width * 0.6),
                peakHeightM: peakH,
                slopeFalloff: 'cosine'
            });
        }

        const nextProfile: HillSpineProfile = {
            id: 'spine-hill-custom-' + Date.now(),
            name: `Hill from Drawn Perimeter (${Math.round(Math.max(dLngM, dLatM))}m)`,
            enabled: true,
            points: newPoints
        };

        setHillSpineProfile(nextProfile);
        safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(nextProfile));
        setActiveSpineProfilesCache([nextProfile]);
        setActivePointId(newPoints[1].id);
        setIsSlopeSculptorOpen(true);
        setTerrainCounter(c => c + 1);
        toast.success(isKa ? '3D რელიეფი პერიმეტრის მიხედვით შეიქმნა!' : '3D Slope generated matching perimeter! Points A-D placed.');
    };

    // Clear Custom Hand-Drawn Perimeter Boundary
    const handleClearPerimeter = () => {
        setCustomSlopePerimeter([]);
        setPerimeterVertices([]);
        safeStorage.removeItem('agrimap_sandbox_custom_perimeter');
        safeStorage.removeItem('agrimap_sandbox_perimeter_vertices');
        const targetSlopeId = selectedLayerId.startsWith('slope') ? selectedLayerId : 'slope_1';
        setSlopeObjects(prev => {
            const updated = prev.map(s => s.id === targetSlopeId ? { ...s, vertices: [] } : s);
            safeStorage.setItem('agrimap_sandbox_slope_objects', JSON.stringify(updated));
            return updated;
        });
        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
        toast.info(isKa ? 'პერიმეტრი გასუფთავდა' : 'Perimeter cleared');
    };

    // Delete Last Edited / Added Point (via UI Back button, Backspace key, or mouse Back button)
    const handleDeleteLastEditedPoint = () => {
        // Priority 1: If user is actively in draw_perimeter/draw_slope mode or there are perimeter points and no active slope spine
        if (activeTool === 'draw_perimeter' || activeTool === 'draw_slope' || (customSlopePerimeter.length > 0 && hillSpineProfile.points.length === 0)) {
            if (customSlopePerimeter.length > 0) {
                const nextCoords = customSlopePerimeter.slice(0, -1);
                setCustomSlopePerimeter(nextCoords);
                safeStorage.setItem('agrimap_sandbox_custom_perimeter', JSON.stringify(nextCoords));
                
                const nextVerts = perimeterVertices.slice(0, -1);
                setPerimeterVertices(nextVerts);
                safeStorage.setItem('agrimap_sandbox_perimeter_vertices', JSON.stringify(nextVerts));

                const targetSlopeId = selectedLayerId.startsWith('slope') ? selectedLayerId : 'slope_1';
                setSlopeObjects(prev => {
                    const updated = prev.map(s => s.id === targetSlopeId ? { ...s, vertices: (s.vertices || []).slice(0, -1) } : s);
                    safeStorage.setItem('agrimap_sandbox_slope_objects', JSON.stringify(updated));
                    return updated;
                });

                setTerrainCounter(c => c + 1);
                window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
                toast.info(isKa ? 'ბოლო პერიმეტრის წერტილი წაიშალა' : 'Deleted last perimeter vertex');
                return;
            }
        }

        // Priority 2: Slope spine points
        const pts = hillSpineProfile.points;
        if (pts && pts.length > 0) {
            let targetId: string | null = null;
            while (pointHistoryRef.current.length > 0) {
                const candidate = pointHistoryRef.current.pop();
                if (candidate === 'perimeter-last' && customSlopePerimeter.length > 0) {
                    const nextCoords = customSlopePerimeter.slice(0, -1);
                    setCustomSlopePerimeter(nextCoords);
                    safeStorage.setItem('agrimap_sandbox_custom_perimeter', JSON.stringify(nextCoords));

                    const nextVerts = perimeterVertices.slice(0, -1);
                    setPerimeterVertices(nextVerts);
                    safeStorage.setItem('agrimap_sandbox_perimeter_vertices', JSON.stringify(nextVerts));

                    const targetSlopeId = selectedLayerId.startsWith('slope') ? selectedLayerId : 'slope_1';
                    setSlopeObjects(prev => {
                        const updated = prev.map(s => s.id === targetSlopeId ? { ...s, vertices: (s.vertices || []).slice(0, -1) } : s);
                        safeStorage.setItem('agrimap_sandbox_slope_objects', JSON.stringify(updated));
                        return updated;
                    });

                    setTerrainCounter(c => c + 1);
                    window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
                    toast.info(isKa ? 'ბოლო პერიმეტრის წერტილი წაიშალა' : 'Deleted last perimeter vertex');
                    return;
                }
                if (candidate && pts.some(p => p.id === candidate)) {
                    targetId = candidate;
                    break;
                }
            }

            if (!targetId && lastEditedPointId && pts.some(p => p.id === lastEditedPointId)) {
                targetId = lastEditedPointId;
            }
            if (!targetId && activePointId && pts.some(p => p.id === activePointId)) {
                targetId = activePointId;
            }
            if (!targetId) {
                targetId = pts[pts.length - 1].id;
            }

            const targetPoint = pts.find(p => p.id === targetId);
            const filtered = pts.filter(p => p.id !== targetId);
            const next = { ...hillSpineProfile, points: sanitizeSpinePoints(filtered) };
            setHillSpineProfile(next);
            safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(next));
            setActiveSpineProfilesCache([next]);
            const nextActive = next.points[next.points.length - 1]?.id || '';
            setActivePointId(nextActive);
            setLastEditedPointId(nextActive || null);
            setTerrainCounter(c => c + 1);
            toast.info(isKa ? `ბოლო წერტილი წაიშალა: ${targetPoint?.name || targetId}` : `Deleted last point: ${targetPoint?.name || targetId}`);
            return;
        }

        // Priority 3: Fallback to perimeter points if slope was empty
        if (customSlopePerimeter.length > 0) {
            const nextCoords = customSlopePerimeter.slice(0, -1);
            setCustomSlopePerimeter(nextCoords);
            safeStorage.setItem('agrimap_sandbox_custom_perimeter', JSON.stringify(nextCoords));

            const nextVerts = perimeterVertices.slice(0, -1);
            setPerimeterVertices(nextVerts);
            safeStorage.setItem('agrimap_sandbox_perimeter_vertices', JSON.stringify(nextVerts));

            const targetSlopeId = selectedLayerId.startsWith('slope') ? selectedLayerId : 'slope_1';
            setSlopeObjects(prev => {
                const updated = prev.map(s => s.id === targetSlopeId ? { ...s, vertices: (s.vertices || []).slice(0, -1) } : s);
                safeStorage.setItem('agrimap_sandbox_slope_objects', JSON.stringify(updated));
                return updated;
            });

            setTerrainCounter(c => c + 1);
            window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
            toast.info(isKa ? 'ბოლო პერიმეტრის წერტილი წაიშალა' : 'Deleted last perimeter vertex');
            return;
        }

        toast.warning(isKa ? 'წასაშლელი წერტილი არ არის' : 'No points left to delete');
    };
    handleDeleteLastEditedPointRef.current = handleDeleteLastEditedPoint;

    // Delete Whole Slope (Spine profile points & custom perimeter)
    const handleDeleteWholeSlope = () => {
        const targetHillId = selectedLayerId.startsWith('hill') ? selectedLayerId : 'hill_1';
        const clearedProfile: HillSpineProfile = {
            id: targetHillId,
            name: 'Cleared Slope',
            enabled: false,
            points: []
        };
        setHillSpineProfile(clearedProfile);
        safeStorage.removeItem('agrimap_sandbox_hill_spine_profile');
        setActiveSpineProfilesCache([]);

        // Clear from hillProfiles
        setHillProfiles(prev => {
            const updated = prev.filter(h => h.id !== targetHillId && !h.id.startsWith('spine-'));
            safeStorage.setItem('agrimap_sandbox_hill_profiles', JSON.stringify(updated));
            return updated;
        });

        setCustomSlopePerimeter([]);
        setPerimeterVertices([]);
        safeStorage.removeItem('agrimap_sandbox_custom_perimeter');
        safeStorage.removeItem('agrimap_sandbox_perimeter_vertices');
        setSlopeObjects(prev => {
            const targetSlopeId = selectedLayerId.startsWith('slope') ? selectedLayerId : 'slope_1';
            const updated = prev.filter(s => s.id !== targetSlopeId);
            safeStorage.setItem('agrimap_sandbox_slope_objects', JSON.stringify(updated));
            return updated;
        });
        pointHistoryRef.current = [];
        setActivePointId('');
        setLastEditedPointId(null);
        setSelectedLayerId('base_grid');
        setIsSlopeSculptorOpen(false);
        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
        toast.success(isKa ? 'ბორცვი/ფერდობი მთლიანად წაიშალა 2D და 3D-დან' : 'Hill/Slope deleted completely from 2D & 3D');
    };

    // =========================================================================
    // IMPORT FROM MAP PLANNER TO LABS (Registered Company Polygon & Components)
    // =========================================================================
    const handleImportBoundaryOnly = (coords: [number, number][], name: string, areaHa: number) => {
        if (!coords || coords.length < 3) {
            toast.error(isKa ? 'საზღვრის პოლიგონს მინიმუმ 3 წერტილი სჭირდება' : 'Boundary polygon must have at least 3 points');
            return;
        }

        // 1. Set custom slope perimeter coordinates
        setCustomSlopePerimeter(coords);
        safeStorage.setItem('agrimap_sandbox_custom_perimeter', JSON.stringify(coords));

        // 2. Build 3D perimeter vertices
        const vertices: PerimeterSlopeVertex[] = coords.map((c, i) => ({
            id: `boundary-v-${i + 1}`,
            lat: c[0],
            lng: c[1],
            elevationOffsetM: 0
        }));
        setPerimeterVertices(vertices);
        safeStorage.setItem('agrimap_sandbox_perimeter_vertices', JSON.stringify(vertices));

        // 3. Register as active slope layer
        const boundarySlope: PerimeterSlopeObject = {
            id: 'slope_boundary',
            name: `${name} (Boundary)`,
            enabled: true,
            locked: false,
            hasRoadZeroLevel: true,
            vertices
        };
        setSlopeObjects(prev => {
            const filtered = prev.filter(s => s.id !== 'slope_boundary');
            const next = [boundarySlope, ...filtered];
            safeStorage.setItem('agrimap_sandbox_slope_objects', JSON.stringify(next));
            return next;
        });
        setSelectedLayerId('slope_boundary');

        // 4. Center map on imported boundary polygon
        const latSum = coords.reduce((acc, c) => acc + c[0], 0);
        const lngSum = coords.reduce((acc, c) => acc + c[1], 0);
        const cLat = latSum / coords.length;
        const cLng = lngSum / coords.length;
        setFlyTarget({ lat: cLat, lng: cLng, zoom: 17, timestamp: Date.now() });

        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
        toast.success(isKa 
            ? `იმპორტირებულია საზღვრის პოლიგონი: ${name} (${areaHa} ჰა)` 
            : `Imported company boundary polygon: ${name} (${areaHa} ha)`);
    };

    const handleImportSelectedComponents = (selected: {
        importBoundary: boolean;
        boundaryCoords?: [number, number][];
        boundaryName?: string;
        boundaryAreaHa?: number;
        sectors: AreaPlantationFeature[];
        trenches: LinePlantationFeature[];
        cameras: CameraPlantationFeature[];
        includeSeedlings: boolean;
    }) => {
        let importedCount = 0;

        // 1. Boundary Polygon
        if (selected.importBoundary && selected.boundaryCoords && selected.boundaryCoords.length >= 3) {
            handleImportBoundaryOnly(
                selected.boundaryCoords, 
                selected.boundaryName || 'Company Boundary', 
                selected.boundaryAreaHa || 0
            );
            importedCount++;
        }

        // 2. Sectors (imported as distinct 3D Slope Layers in Layer Tree)
        if (selected.sectors && selected.sectors.length > 0) {
            const newSlopeLayers: PerimeterSlopeObject[] = selected.sectors.map((sec, idx) => ({
                id: `slope_sec_${sec.id || idx}`,
                name: sec.name || `Sector ${idx + 1}`,
                enabled: true,
                locked: false,
                hasRoadZeroLevel: true,
                vertices: (sec.geometry || []).map((c: any, vIdx: number) => ({
                    id: `sec-${sec.id}-v-${vIdx + 1}`,
                    lat: Array.isArray(c) ? c[0] : c.lat,
                    lng: Array.isArray(c) ? c[1] : c.lng,
                    elevationOffsetM: 0
                }))
            }));
            setSlopeObjects(prev => {
                const combined = [...prev, ...newSlopeLayers];
                safeStorage.setItem('agrimap_sandbox_slope_objects', JSON.stringify(combined));
                return combined;
            });
            importedCount += selected.sectors.length;
        }

        // 3. Cameras
        if (selected.cameras && selected.cameras.length > 0) {
            const newCams: PlantationCamera[] = selected.cameras.map((c: any, idx: number) => ({
                id: `cam-imported-${c.id || Date.now()}-${idx}`,
                name: c.name || `Camera ${idx + 1}`,
                channel: (testCameras.length + idx + 1),
                model: 'Tiandy SuperStarlight 4K',
                ipAddress: `192.168.1.${140 + idx}`,
                rtspPort: 554,
                locationName: c.name || 'Imported Camera',
                lat: Array.isArray(c.geometry) ? c.geometry[0] : (c.lat || baseLat),
                lng: Array.isArray(c.geometry) ? c.geometry[1] : (c.lng || baseLng),
                mountHeightM: 6,
                azimuthDeg: c.properties?.azimuth || c.azimuthDeg || 0,
                fovAngleDeg: c.properties?.fov || c.fovAngleDeg || 85,
                rangeM: c.properties?.rangeM || c.rangeM || 70,
                tiltAngleDeg: 5,
                isPtz: false,
                isNightVision: true,
                status: 'ONLINE' as const
            }));
            setTestCameras(prev => {
                const combined = [...prev, ...newCams];
                safeStorage.setItem('agrimap_sandbox_test_cameras', JSON.stringify(combined));
                return combined;
            });
            importedCount += selected.cameras.length;
        }

        // 4. Trenches (converted into drone survey mission waypoints)
        if (selected.trenches && selected.trenches.length > 0) {
            const allTrenchPoints = selected.trenches.flatMap((t, tIdx) => 
                (t.geometry || []).map((pt: any, ptIdx: number) => ({
                    id: `wp-trench-${tIdx}-${ptIdx}`,
                    lat: Array.isArray(pt) ? pt[0] : pt.lat,
                    lng: Array.isArray(pt) ? pt[1] : pt.lng,
                    altM: 35,
                    leg: (tIdx % 2 === 0 ? 'outbound' : 'return') as 'outbound' | 'return'
                }))
            );
            if (allTrenchPoints.length >= 2) {
                setTestDroneMission(prev => ({
                    ...prev,
                    waypoints: allTrenchPoints
                }));
            }
            importedCount += selected.trenches.length;
        }

        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
        toast.success(isKa 
            ? `წარმატებით იმპორტირდა ${importedCount} ელემენტი დამგეგმავიდან!` 
            : `Successfully imported ${importedCount} items from Map Planner!`);
    };

    // Clear Map Fully (Remove all cameras, drone waypoints, sensors, workers, and slopes)
    const executeClearMapFully = () => {
        // 1. Clear cameras
        setTestCameras([]);
        safeStorage.removeItem('agrimap_sandbox_test_cameras');
        setActiveCameraId('');

        // 2. Clear slope & perimeter
        const clearedProfile: HillSpineProfile = {
            id: 'hill_1',
            name: 'Cleared Slope',
            enabled: false,
            points: []
        };
        setHillSpineProfile(clearedProfile);
        safeStorage.removeItem('agrimap_sandbox_hill_spine_profile');
        setActiveSpineProfilesCache([]);
        setCustomSlopePerimeter([]);
        setPerimeterVertices([]);
        safeStorage.removeItem('agrimap_sandbox_custom_perimeter');
        safeStorage.removeItem('agrimap_sandbox_perimeter_vertices');
        setSlopeObjects([]);
        safeStorage.removeItem('agrimap_sandbox_slope_objects');
        setHillProfiles([]);
        safeStorage.removeItem('agrimap_sandbox_hill_profiles');
        pointHistoryRef.current = [];
        setActivePointId('');
        setLastEditedPointId(null);

        // 3. Clear drone mission
        setTestDroneMission(prev => ({
            ...prev,
            waypoints: []
        }));
        safeStorage.removeItem('agrimap_sandbox_drone_mission');
        setDirectionStart(null);
        setDirectionEnd(null);

        // 4. Clear sensors & workers
        setTestSoilSensors([]);
        safeStorage.removeItem('agrimap_sandbox_soil_sensors');
        setTestWaterSensors([]);
        safeStorage.removeItem('agrimap_sandbox_water_sensors');
        setTestWorkersGps([]);
        safeStorage.removeItem('agrimap_sandbox_workers');

        // 5. Clear weather stations
        setTestWeatherStations([]);
        safeStorage.removeItem('agrimap_sandbox_test_weather_stations');

        // 6. Clear selections and popups
        setSelectedObject(null);
        setIsSlopeSculptorOpen(false);
        setIsEditingDetails(false);
        setContextMenu(null);
        setIsClearMapConfirmOpen(false);
        setSelectedLayerId('base_grid');
        setTerrainCounter(c => c + 1);
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));

        toast.success(isKa ? 'რუკა სრულად გასუფთავდა (ყველა მოწყობილობა და რელიეფი წაიშალა)' : 'Map fully cleared: all devices, slopes & waypoints removed');
    };


    // Add Spine Point directly at Coordinates (from 2D or 3D clicks)
    const handleAddSpinePointAtCoords = (coords: { lat: number; lng: number; peakHeightM?: number; widthM?: number }) => {
        const count = hillSpineProfile.points.length;
        const letter = String.fromCharCode(65 + count);
        const lastPt = hillSpineProfile.points[count - 1] || hillSpineProfile.points[0];
        let uniqueId = `pt-${letter}`;
        let counter = 1;
        while (hillSpineProfile.points.some(p => p.id === uniqueId)) {
            uniqueId = `pt-${letter}-${counter}`;
            counter++;
        }
        const newPt: SpineControlPoint = {
            id: uniqueId,
            name: `Point ${letter}`,
            lat: coords.lat,
            lng: coords.lng,
            widthM: coords.widthM || lastPt?.widthM || 45,
            startOffsetM: 0,
            endDistanceM: Math.round((coords.widthM || lastPt?.widthM || 45) * 1.25),
            peakHeightM: coords.peakHeightM ?? 25,
            slopeFalloff: 'cosine'
        };
        const next = { ...hillSpineProfile, enabled: true, points: sanitizeSpinePoints([...hillSpineProfile.points, newPt]) };
        setHillSpineProfile(next);
        safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(next));
        setActiveSpineProfilesCache([next]);
        setActivePointId(newPt.id);
        setLastEditedPointId(newPt.id);
        pointHistoryRef.current.push(newPt.id);
        if (typeof window !== 'undefined' && window.history) {
            try { window.history.pushState({ sandboxPointEdit: true, timestamp: Date.now() }, ''); } catch (e) {}
        }
        setIsSlopeSculptorOpen(true);
        setTerrainCounter(c => c + 1);
        toast.success(isKa ? `ქედის წერტილი ${newPt.name} დაემატა` : `Slope point ${newPt.name} placed (+${newPt.peakHeightM}m)`);
    };

    // Handle Map Clicks for Adding & Inspecting Items
    const handleMapClick = (lat: number, lng: number) => {
        if (activeTool === 'select') {
            setSelectedObject(null);
            return;
        }

        if (activeTool === 'pick_plantation' || isPickingPlantation) {
            const picked: [number, number] = [
                Math.round(lat * 1e6) / 1e6,
                Math.round(lng * 1e6) / 1e6
            ];
            setLabsPlantationCenter(picked);
            safeStorage.setItem('agrimap_labs_saved_plantation_center', JSON.stringify(picked));
            setCurrentCenter(picked);
            setIsPickingPlantation(false);
            setActiveTool('select');
            toast.success(isKa 
                ? `✓ "აგრობარი" პლანტაციის ადგილი წარმატებით შეინახა: [${picked[0].toFixed(5)}, ${picked[1].toFixed(5)}]` 
                : `✓ Agrobari plantation location saved: [${picked[0].toFixed(5)}, ${picked[1].toFixed(5)}]`);
            return;
        }

        if (activeTool === 'draw_slope' || activeTool === 'draw_perimeter') {
            const newVertex: PerimeterSlopeVertex = {
                id: `pv-${Date.now()}-${customSlopePerimeter.length + 1}`,
                lat,
                lng,
                elevationOffsetM: drawingPointHeight
            };
            const nextCoords: [number, number][] = [...customSlopePerimeter, [lat, lng]];
            setCustomSlopePerimeter(nextCoords);
            safeStorage.setItem('agrimap_sandbox_custom_perimeter', JSON.stringify(nextCoords));

            const nextVertices: PerimeterSlopeVertex[] = nextCoords.map((c, i) => {
                if (i < perimeterVertices.length && perimeterVertices[i]) {
                    return { ...perimeterVertices[i], lat: c[0], lng: c[1] };
                }
                return i === nextCoords.length - 1 ? newVertex : {
                    id: `pv-${Date.now()}-${i + 1}`,
                    lat: c[0],
                    lng: c[1],
                    elevationOffsetM: drawingPointHeight
                };
            });
            setPerimeterVertices(nextVertices);
            safeStorage.setItem('agrimap_sandbox_perimeter_vertices', JSON.stringify(nextVertices));
            
            // Sync with active slope layer in slopeObjects
            const targetSlopeId = selectedLayerId.startsWith('slope') ? selectedLayerId : 'slope_1';
            setSlopeObjects(prev => {
                const exists = prev.some(s => s.id === targetSlopeId);
                const updated = exists
                    ? prev.map(s => s.id === targetSlopeId ? { ...s, vertices: nextVertices, enabled: true } : s)
                    : [...prev.filter(s => s.id !== targetSlopeId), {
                        id: targetSlopeId,
                        name: 'Slope 1 (Uneven Terrain)',
                        enabled: true,
                        locked: false,
                        hasRoadZeroLevel: true,
                        vertices: nextVertices
                    }];
                safeStorage.setItem('agrimap_sandbox_slope_objects', JSON.stringify(updated));
                return updated;
            });
            setSelectedLayerId(targetSlopeId);

            pointHistoryRef.current.push('perimeter-last');
            if (typeof window !== 'undefined' && window.history) {
                try { window.history.pushState({ sandboxPointEdit: true, timestamp: Date.now() }, ''); } catch (e) {}
            }
            setTerrainCounter(c => c + 1);
            window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));

            const prevV = perimeterVertices[perimeterVertices.length - 1];
            let segDetail = '';
            if (prevV) {
                const seg = calculatePointToPointSegment(
                    perimeterVertices.length - 1, 
                    perimeterVertices.length,
                    { lat: prevV.lat, lng: prevV.lng, z: prevV.elevationOffsetM, label: `V${perimeterVertices.length}` },
                    { lat: newVertex.lat, lng: newVertex.lng, z: newVertex.elevationOffsetM, label: `V${nextVertices.length}` }
                );
                const arrow = seg.type === 'incline' ? '↗' : seg.type === 'decline' ? '↘' : '→';
                const sign = seg.elevationDeltaM > 0 ? '+' : '';
                segDetail = ` • 📏 ${seg.distanceM}m • ${arrow} ${sign}${seg.inclinePct}% (${seg.angleDeg}°)`;
            }

            toast.info(isKa 
                ? `ფერდობის წერტილი #${nextVertices.length} დაემატა (Z: +${newVertex.elevationOffsetM}მ)${segDetail}` 
                : `Slope vertex #${nextVertices.length} placed (Z: +${newVertex.elevationOffsetM}m)${segDetail}`);
            return;
        }

        if (activeTool === 'draw_hill' || activeTool === 'add_spine_point') {
            const count = hillSpineProfile.points.length;
            const letter = String.fromCharCode(65 + count);
            const lastPt = hillSpineProfile.points[count - 1] || hillSpineProfile.points[0];
            let uniqueId = `pt-${letter}`;
            let counter = 1;
            while (hillSpineProfile.points.some(p => p.id === uniqueId)) {
                uniqueId = `pt-${letter}-${counter}`;
                counter++;
            }
            const newPt: SpineControlPoint = {
                id: uniqueId,
                name: `Point ${letter}`,
                lat,
                lng,
                widthM: lastPt?.widthM || 45,
                startOffsetM: 0,
                endDistanceM: Math.round((lastPt?.widthM || 45) * 1.25),
                peakHeightM: drawingPointHeight,
                slopeFalloff: 'cosine'
            };
            const targetHillId = selectedLayerId.startsWith('hill') ? selectedLayerId : 'hill_1';
            const hillName = (hillSpineProfile.name && !hillSpineProfile.name.toLowerCase().includes('cleared'))
                ? hillSpineProfile.name
                : `Hill ${targetHillId.replace('hill_', '') || '1'}`;
            const next: HillSpineProfile = {
                ...hillSpineProfile,
                id: targetHillId,
                name: hillName,
                enabled: true,
                points: sanitizeSpinePoints([...hillSpineProfile.points, newPt])
            };
            setHillSpineProfile(next);
            safeStorage.setItem('agrimap_sandbox_hill_spine_profile', JSON.stringify(next));
            setActiveSpineProfilesCache([next]);
            
            // Sync with hillProfiles
            setHillProfiles(prev => {
                const cleaned = prev.filter(h => h.id !== targetHillId && h.id !== hillSpineProfile.id);
                return [...cleaned, next];
            });

            setActivePointId(newPt.id);
            setLastEditedPointId(newPt.id);
            pointHistoryRef.current.push(newPt.id);
            if (typeof window !== 'undefined' && window.history) {
                try { window.history.pushState({ sandboxPointEdit: true, timestamp: Date.now() }, ''); } catch (e) {}
            }
            setIsSlopeSculptorOpen(true);
            setTerrainCounter(c => c + 1);
            if (activeTool === 'add_spine_point') {
                setActiveTool('select');
            }
            window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));

            let segDetail = '';
            if (lastPt && count > 0) {
                const seg = calculatePointToPointSegment(
                    count - 1,
                    count,
                    { lat: lastPt.lat, lng: lastPt.lng, z: lastPt.peakHeightM, label: lastPt.name },
                    { lat: newPt.lat, lng: newPt.lng, z: newPt.peakHeightM, label: newPt.name }
                );
                const arrow = seg.type === 'incline' ? '↗' : seg.type === 'decline' ? '↘' : '→';
                const sign = seg.elevationDeltaM > 0 ? '+' : '';
                segDetail = ` • 📏 ${seg.distanceM}m • ${arrow} ${sign}${seg.inclinePct}% (${seg.angleDeg}°)`;
            }

            toast.success(isKa 
                ? `ბორცვის წერტილი ${newPt.name} დაემატა (+${newPt.peakHeightM}მ)${segDetail}` 
                : `Hill point ${newPt.name} placed (+${newPt.peakHeightM}m)${segDetail}`);
            return;
        }

        if (activeTool === 'add_drone') {
            setTestDroneMission(prev => ({
                ...prev,
                currentLat: lat,
                currentLng: lng,
                waypoints: [
                    { id: `wp-${Date.now()}-1`, lat, lng, altM: prev.altitudeM, leg: 'outbound' }
                ]
            }));
            setSelectedObject({ type: 'drone', data: testDroneMission });
            setActiveTool('select');
            toast.success(isKa ? 'დრონის პოზიცია დაფიქსირდა!' : 'Drone mission position placed!');
            return;
        }

        if (activeTool === 'drone_direction') {
            if (!directionStart) {
                setDirectionStart([lat, lng]);
                toast.info(isKa ? '📍 საწყისი წერტილი (A) დაფიქსირდა. დააწკაპუნეთ ბოლო წერტილზე (B)' : '📍 Start Point (A) set. Click for Finish Point (B)');
            } else if (!directionEnd) {
                setDirectionEnd([lat, lng]);
                // Set drone direction waypoints along this path
                const newWps = [
                    { id: `wp-${Date.now()}-1`, lat: directionStart[0], lng: directionStart[1], altM: testDroneMission.altitudeM, leg: 'outbound' as const },
                    { id: `wp-${Date.now()}-2`, lat: (directionStart[0] + lat) / 2, lng: (directionStart[1] + lng) / 2, altM: testDroneMission.altitudeM, leg: 'outbound' as const },
                    { id: `wp-${Date.now()}-3`, lat, lng, altM: testDroneMission.altitudeM, leg: 'return' as const }
                ];
                setTestDroneMission(prev => ({
                    ...prev,
                    waypoints: newWps,
                    directionDeg: drawnBearing
                }));
                toast.success(isKa ? `ფრენის მიმართულება A → B (აზიმუტი: ${drawnBearing}°) დაფიქსირდა!` : `Flight direction A → B (Bearing: ${drawnBearing}°) plotted!`);
                setActiveTool('select');
            } else {
                setDirectionStart([lat, lng]);
                setDirectionEnd(null);
            }
        } else if (activeTool === 'move_camera') {
            if (selectedObject?.type === 'camera') {
                const targetId = selectedObject.data.id;
                setTestCameras(prev => prev.map(c => c.id === targetId ? { ...c, lat, lng } : c));
                setSelectedObject({ type: 'camera', data: { ...selectedObject.data, lat, lng } });
                setActiveTool('select');
                toast.success(isKa ? `კამერა გადატანილია ახალ პოზიციაზე [${lat.toFixed(5)}, ${lng.toFixed(5)}]` : `Camera relocated to [${lat.toFixed(5)}, ${lng.toFixed(5)}]`);
            } else {
                setActiveTool('select');
            }
        } else if (activeTool === 'add_camera') {
            const elev = getElevationAtCoords(lat, lng, baseLat, baseLng);
            const { slopeDeg } = getSlopeAndAspect(lat, lng, baseLat, baseLng);
            const newCam: PlantationCamera = {
                id: `sand-cam-${Date.now()}`,
                name: `Camera #${testCameras.length + 1} (4K ColorVu)`,
                channel: testCameras.length + 1,
                model: 'Hikvision DS-2CD2087G2-LU (4K ColorVu)',
                ipAddress: `192.168.1.${130 + testCameras.length}`,
                rtspPort: 554,
                locationName: `Field Position (${elev.toFixed(1)}m ASL, ${slopeDeg.toFixed(1)}° Slope)`,
                lat,
                lng,
                mountHeightM: 6,
                azimuthDeg: 90,
                fovAngleDeg: 102,
                rangeM: 75,
                tiltAngleDeg: 4, // 4 degrees default tilt angle
                isPtz: false,
                isNightVision: true,
                status: 'ONLINE'
            };
            setTestCameras(prev => [...prev, newCam]);
            setSelectedObject({ type: 'camera', data: newCam });
            setActiveTool('select');
            toast.success(isKa ? `კამერა დაემატა (${lat.toFixed(5)}, ${lng.toFixed(5)}) • Tilt 4° • ${elev.toFixed(1)}m ASL` : `Camera added at (${lat.toFixed(5)}, ${lng.toFixed(5)}) • Tilt 4° • ${elev.toFixed(1)}m ASL`);
        } else if (activeTool === 'drone_waypoint') {
            const leg = testDroneMission.waypoints.length % 2 === 0 ? 'outbound' : 'return';
            const newWp = {
                id: `wp-${Date.now()}`,
                lat,
                lng,
                altM: testDroneMission.altitudeM,
                leg: leg as 'outbound' | 'return'
            };
            setTestDroneMission(prev => ({
                ...prev,
                waypoints: [...prev.waypoints, newWp]
            }));
            toast.success(isKa ? `დრონის წერტილი #${testDroneMission.waypoints.length + 1} დაემატა` : `Drone waypoint #${testDroneMission.waypoints.length + 1} added`);
        } else if (activeTool === 'add_soil') {
            const newSoil: SandboxSoilSensor = {
                id: `soil-${Date.now()}`,
                name: `Soil Node #${testSoilSensors.length + 1}`,
                type: 'SOIL_MOISTURE_NPK',
                lat,
                lng,
                moistureVwc: Number((24 + Math.random() * 8).toFixed(1)),
                temperatureC: Number((18 + Math.random() * 5).toFixed(1)),
                ecMsCm: 1.15,
                nitrogenPpm: 45,
                phosphorusPpm: 20,
                potassiumPpm: 165,
                batteryPct: 98,
                signalRssi: -70,
                depthCm: 30,
                status: 'OPTIMAL'
            };
            setTestSoilSensors(prev => [...prev, newSoil]);
            setSelectedObject({ type: 'soil', data: newSoil });
            toast.success(isKa ? `ნიადაგის სენსორი დაემატა` : `Soil sensor placed`);
        } else if (activeTool === 'add_water') {
            const newWater: SandboxWaterSensor = {
                id: `water-${Date.now()}`,
                name: `Water Flow Station #${testWaterSensors.length + 1}`,
                type: 'FLOW_METER',
                lat,
                lng,
                flowRateLpm: 120,
                totalVolumeM3: 450,
                waterLevelM: 12.5,
                pressureBar: 3.2,
                batteryPct: 96,
                status: 'FLOWING'
            };
            setTestWaterSensors(prev => [...prev, newWater]);
            setSelectedObject({ type: 'water', data: newWater });
            toast.success(isKa ? `წყლის სენსორი დაემატა` : `Water station placed`);
        } else if (activeTool === 'add_worker') {
            const newWorker: SandboxWorkerGps = {
                id: `wrk-${Date.now()}`,
                workerName: `Worker Badge #${testWorkersGps.length + 1}`,
                badgeCode: `GPS-BADGE-#${100 + testWorkersGps.length + 1}`,
                role: 'Field Worker',
                lat,
                lng,
                speedKmh: 3.2,
                batteryPct: 90,
                heartRateBpm: 75,
                status: 'ACTIVE'
            };
            setTestWorkersGps(prev => [...prev, newWorker]);
            setSelectedObject({ type: 'worker', data: newWorker });
            toast.success(isKa ? `თანამშრომლის GPS ტრეკერი დაემატა` : `Worker GPS tracker placed`);
        } else if (activeTool === 'add_weather') {
            const newStation: SandboxWeatherStation = {
                id: `weather-${Date.now()}`,
                name: `Weather Station #${testWeatherStations.length + 1}`,
                model: 'Davis Vantage Pro2 Plus',
                ipAddress: `192.168.1.${150 + testWeatherStations.length}`,
                port: 22222,
                lat,
                lng,
                tempC: Number((18 + Math.random() * 4).toFixed(1)),
                humidityPct: Math.round(55 + Math.random() * 15),
                windSpeedKmh: Number((8 + Math.random() * 6).toFixed(1)),
                windDirectionDeg: Math.round(Math.random() * 360),
                solarRadiationWm2: Math.round(500 + Math.random() * 200),
                rainMm: 0.0,
                pressureHpa: 1016.2,
                status: 'ONLINE',
                lastUpdated: 'Just now'
            };
            setTestWeatherStations(prev => {
                const updated = [...prev, newStation];
                safeStorage.setItem('agrimap_sandbox_test_weather_stations', JSON.stringify(updated));
                return updated;
            });
            setSelectedObject({ type: 'weather', data: newStation });
            toast.success(isKa ? `მეტეო სადგური დაემატა რუკაზე` : `Weather station placed on map`);
        }
    };

    // Quick Add Multiple Perimeter Cameras (4 Poles: N, S, E, W)
    const handleAddPerimeterCameras = () => {
        const offset = 0.0015;
        const batch: PlantationCamera[] = [
            {
                id: `sand-cam-${Date.now()}-N`,
                name: 'North Gate ColorVu 4K',
                channel: testCameras.length + 1,
                model: 'Hikvision DS-2CD2087G2-LU (4K ColorVu)',
                ipAddress: `192.168.1.${140 + testCameras.length}`,
                rtspPort: 554,
                locationName: 'North Perimeter Pole',
                lat: baseLat + offset,
                lng: baseLng,
                mountHeightM: 8,
                azimuthDeg: 180,
                fovAngleDeg: 102,
                rangeM: 80,
                tiltAngleDeg: 4,
                isPtz: false,
                isNightVision: true,
                status: 'ONLINE'
            },
            {
                id: `sand-cam-${Date.now()}-S`,
                name: 'South Boundary AcuSense',
                channel: testCameras.length + 2,
                model: 'Hikvision DS-2CD2386G2-ISU (4mm AcuSense)',
                ipAddress: `192.168.1.${141 + testCameras.length}`,
                rtspPort: 554,
                locationName: 'South Gate Mast',
                lat: baseLat - offset,
                lng: baseLng,
                mountHeightM: 7,
                azimuthDeg: 0,
                fovAngleDeg: 89,
                rangeM: 75,
                tiltAngleDeg: 4,
                isPtz: false,
                isNightVision: true,
                status: 'ONLINE'
            },
            {
                id: `sand-cam-${Date.now()}-E`,
                name: 'East Ridge PTZ Surveillance',
                channel: testCameras.length + 3,
                model: 'Hikvision DS-2DE4425IW-DE (25x PTZ)',
                ipAddress: `192.168.1.${142 + testCameras.length}`,
                rtspPort: 554,
                locationName: 'East Ridge Mast',
                lat: baseLat,
                lng: baseLng + offset,
                mountHeightM: 10,
                azimuthDeg: 270,
                fovAngleDeg: 60,
                rangeM: 160,
                tiltAngleDeg: 5,
                isPtz: true,
                isNightVision: true,
                status: 'ONLINE'
            },
            {
                id: `sand-cam-${Date.now()}-W`,
                name: 'West Trench Corridor Cam',
                channel: testCameras.length + 4,
                model: 'Hikvision DS-2CD2T86G2-4I (6mm Telephoto)',
                ipAddress: `192.168.1.${143 + testCameras.length}`,
                rtspPort: 554,
                locationName: 'West Trench Corridor',
                lat: baseLat,
                lng: baseLng - offset,
                mountHeightM: 6,
                azimuthDeg: 90,
                fovAngleDeg: 53,
                rangeM: 110,
                tiltAngleDeg: 4,
                isPtz: false,
                isNightVision: true,
                status: 'ONLINE'
            }
        ];
        setTestCameras(prev => [...prev, ...batch]);
        setSelectedObject({ type: 'camera', data: batch[0] });
        toast.success(isKa ? 'დაემატა 4 პერიმეტრული კამერა (ColorVu, AcuSense, Telephoto, PTZ)' : 'Added 4 Perimeter Cameras (ColorVu, AcuSense, Telephoto, PTZ)');
    };

    // Drone Command: Take Photo of Target Object (e.g. Seed 44)
    const handleDroneTakePhoto = (targetName: string) => {
        const photo = {
            id: `photo-${Date.now()}`,
            type: 'photo' as const,
            title: `Aerial Photo: ${targetName}`,
            target: targetName,
            timestamp: new Date().toLocaleTimeString(),
            url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=600&q=80'
        };
        setCapturedMedia(prev => [photo, ...prev]);
        toast.success(isKa ? `📸 ფოტო გადაღებულია: ${targetName}` : `📸 High-Res Photo Captured: ${targetName}`);
    };

    // Drone Command: Record Video of Target Object
    const handleDroneToggleRecordVideo = (targetName: string) => {
        const isRec = !testDroneMission.isRecordingVideo;
        setTestDroneMission(prev => ({ ...prev, isRecordingVideo: isRec }));
        if (isRec) {
            toast.info(isKa ? `🎥 ვიდეოჩაწერა დაიწყო: ${targetName}` : `🎥 4K Video Recording Started: ${targetName}`);
        } else {
            const video = {
                id: `video-${Date.now()}`,
                type: 'video' as const,
                title: `Aerial Inspection Video: ${targetName}`,
                target: targetName,
                timestamp: new Date().toLocaleTimeString(),
                url: 'https://assets.mixkit.co/videos/preview/mixkit-drone-view-of-a-farm-and-fields-41315-large.mp4'
            };
            setCapturedMedia(prev => [video, ...prev]);
            toast.success(isKa ? `💾 ვიდეო შენახულია (${testDroneMission.recordingSeconds}წმ): ${targetName}` : `💾 Video Saved (${testDroneMission.recordingSeconds}s): ${targetName}`);
        }
    };

    // Drone Command: Fly to Target Location & Inspect
    const handleDroneFlyToTarget = (targetLat: number, targetLng: number, targetName: string) => {
        setTestDroneMission(prev => ({
            ...prev,
            currentLat: targetLat,
            currentLng: targetLng,
            isSimulating: true
        }));
        setIsDroneLiveCameraOpen(true);
        toast.success(isKa ? `🛸 დრონი მიემართება ობიექტისკენ: ${targetName}` : `🛸 Drone navigating to target: ${targetName}`);
    };

    // Toggle Trench in Drone Configuration
    const handleToggleTrench = (trenchNum: number) => {
        setTestDroneMission(prev => {
            const current = Array.isArray(prev?.selectedTrenches) ? prev.selectedTrenches : [3, 4, 5];
            const updated = (current || []).includes(trenchNum)
                ? current.filter(t => t !== trenchNum)
                : [...current, trenchNum].sort((a, b) => a - b);
            return { ...prev, selectedTrenches: updated };
        });
    };

    // Execute Drone Flight over Selected Trenches & Open Live Camera
    const handleFlySelectedTrenches = () => {
        const trenchesList = Array.isArray(testDroneMission?.selectedTrenches) ? testDroneMission.selectedTrenches : [3, 4, 5];
        // Build waypoints across selected trenches
        const selectedTrenchData = testTrenches.filter(t => (trenchesList || []).includes(t.id));
        if (selectedTrenchData.length === 0) {
            toast.warning(isKa ? 'გთხოვთ აირჩიოთ მინიმუმ ერთი თხრილი' : 'Please select at least one trench');
            return;
        }

        const newWaypoints: { id: string; lat: number; lng: number; altM: number; leg: 'outbound' | 'return' }[] = [];
        selectedTrenchData.forEach((tr, idx) => {
            newWaypoints.push({
                id: `tr-start-${tr.id}`,
                lat: tr.coords[0][0],
                lng: tr.coords[0][1],
                altM: testDroneMission.altitudeM,
                leg: 'outbound'
            });
            newWaypoints.push({
                id: `tr-end-${tr.id}`,
                lat: tr.coords[1][0],
                lng: tr.coords[1][1],
                altM: testDroneMission.altitudeM,
                leg: idx === selectedTrenchData.length - 1 ? 'return' : 'outbound'
            });
        });

        setTestDroneMission(prev => ({
            ...prev,
            waypoints: newWaypoints,
            isSimulating: true,
            simulatedProgress: 0
        }));

        setIsDroneLiveCameraOpen(true);
        toast.success(
            isKa 
                ? `🚀 დრონი აფრინდა! პლანტაცია: ${testDroneMission.plantationName}, სექტორი: ${testDroneMission.sectorName}, თხრილები: #${trenchesList.join(', #')}` 
                : `🚀 Drone in Flight! Sector: ${testDroneMission.sectorName}, Trenches: #${trenchesList.join(', #')}`
        );
    };

    // Save Edited Object Data from Details View
    const handleSaveObjectEdits = () => {
        if (!selectedObject) return;
        const { type } = selectedObject;

        if (type === 'camera') {
            setTestCameras(prev => prev.map(c => c.id === editFormData.id ? { ...c, ...editFormData } : c));
            setSelectedObject({ type: 'camera', data: { ...selectedObject.data, ...editFormData } });
            toast.success(isKa ? 'კამერის პარამეტრები განახლდა' : 'Camera parameters updated');
        } else if (type === 'drone') {
            setTestDroneMission(prev => ({ ...prev, ...editFormData }));
            setSelectedObject({ type: 'drone', data: { ...selectedObject.data, ...editFormData } });
            toast.success(isKa ? 'დრონის პარამეტრები განახლდა' : 'Drone mission updated');
        } else if (type === 'soil') {
            setTestSoilSensors(prev => prev.map(s => s.id === editFormData.id ? { ...s, ...editFormData } : s));
            setSelectedObject({ type: 'soil', data: { ...selectedObject.data, ...editFormData } });
            toast.success(isKa ? 'ნიადაგის სენსორი განახლდა' : 'Soil sensor updated');
        } else if (type === 'water') {
            setTestWaterSensors(prev => prev.map(w => w.id === editFormData.id ? { ...w, ...editFormData } : w));
            setSelectedObject({ type: 'water', data: { ...selectedObject.data, ...editFormData } });
            toast.success(isKa ? 'წყლის სენსორი განახლდა' : 'Water sensor updated');
        } else if (type === 'worker') {
            setTestWorkersGps(prev => prev.map(w => w.id === editFormData.id ? { ...w, ...editFormData } : w));
            setSelectedObject({ type: 'worker', data: { ...selectedObject.data, ...editFormData } });
            toast.success(isKa ? 'თანამშრომლის პროფილი განახლდა' : 'Worker profile updated');
        }

        setIsEditingDetails(false);
    };

    // Delete Object from Details View
    const handleDeleteSelectedObject = () => {
        if (!selectedObject) return;
        const { type, data } = selectedObject;

        if (type === 'camera') {
            setTestCameras(prev => prev.filter(c => c.id !== data.id));
            toast.info(isKa ? 'კამერა წაიშალა' : 'Camera deleted');
        } else if (type === 'soil') {
            setTestSoilSensors(prev => prev.filter(s => s.id !== data.id));
            toast.info(isKa ? 'ნიადაგის სენსორი წაიშალა' : 'Soil sensor deleted');
        } else if (type === 'water') {
            setTestWaterSensors(prev => prev.filter(w => w.id !== data.id));
            toast.info(isKa ? 'წყლის სენსორი წაიშალა' : 'Water sensor deleted');
        } else if (type === 'worker') {
            setTestWorkersGps(prev => prev.filter(w => w.id !== data.id));
            toast.info(isKa ? 'თანამშრომლის ტრეკერი წაიშალა' : 'Worker tracker deleted');
        } else if (type === 'drone') {
            setTestDroneMission(prev => ({ ...prev, waypoints: [], isSimulating: false }));
            toast.info(isKa ? 'დრონის მარშრუტი წაიშალა' : 'Drone route cleared');
        }

        setSelectedObject(null);
    };

    // Export Tested Sandbox Hardware as New Layer to Main Map Planner
    const handleCommitToMainMapPlanner = () => {
        const exportedFeatures: PlantationFeature[] = [];

        testCameras.forEach(cam => {
            const feat: any = {
                id: `feat-cam-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: cam.name,
                type: 'camera',
                subType: 'camera',
                geometry: [cam.lat, cam.lng],
                azimuthDeg: cam.azimuthDeg || 90,
                rangeM: cam.rangeM || 75,
                fovAngleDeg: cam.fovAngleDeg || 102,
                tiltAngleDeg: cam.tiltAngleDeg || 4,
                mountHeightM: cam.mountHeightM || 6,
                channel: cam.channel,
                model: cam.model,
                ipAddress: cam.ipAddress,
                rtspPort: cam.rtspPort,
                status: cam.status || 'ONLINE',
                strokeColor: '#3b82f6',
                fillColor: '#3b82f6',
                notes: `Hardware Lab Deployed • Tilt ${cam.tiltAngleDeg || 4}°`
            };
            exportedFeatures.push(feat);
        });

        if (testDroneMission.waypoints.length > 1) {
            const droneFeat: any = {
                id: `feat-drone-${Date.now()}`,
                name: testDroneMission.name,
                type: 'drone_path',
                subType: 'drone_flight_path',
                geometry: testDroneMission.waypoints.map(w => [w.lat, w.lng]),
                altitudeM: testDroneMission.altitudeM,
                speedMs: testDroneMission.speedMs,
                telemetryIntervalS: testDroneMission.telemetryIntervalS,
                directionDeg: testDroneMission.directionDeg,
                strokeColor: '#06b6d4',
                fillColor: '#06b6d4',
                notes: `Hardware Lab Drone Flight Mission • ${testDroneMission.waypoints.length} Waypoints`
            };
            exportedFeatures.push(droneFeat);
        }

        testSoilSensors.forEach(soil => {
            const soilFeat: any = {
                id: `feat-soil-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: soil.name,
                type: 'note',
                subType: 'soil_sensor_probe',
                geometry: [soil.lat, soil.lng],
                strokeColor: '#10b981',
                fillColor: '#10b981',
                notes: `VWC Moisture: ${soil.moistureVwc}% • Temp: ${soil.temperatureC}°C • NPK (${soil.nitrogenPpm}, ${soil.phosphorusPpm}, ${soil.potassiumPpm})`
            };
            exportedFeatures.push(soilFeat);
        });

        testWaterSensors.forEach(water => {
            const waterFeat: any = {
                id: `feat-water-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: water.name,
                type: 'note',
                subType: 'water_meter_probe',
                geometry: [water.lat, water.lng],
                strokeColor: '#0284c7',
                fillColor: '#0284c7',
                notes: `Flow: ${water.flowRateLpm} L/min • Pressure: ${water.pressureBar} bar • Well Level: ${water.waterLevelM}m`
            };
            exportedFeatures.push(waterFeat);
        });

        testWorkersGps.forEach(worker => {
            const workerFeat: any = {
                id: `feat-wrk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: `${worker.workerName} (${worker.badgeCode})`,
                type: 'checkpoint',
                subType: 'worker_gps_beacon',
                geometry: [worker.lat, worker.lng],
                strokeColor: '#8b5cf6',
                fillColor: '#8b5cf6',
                notes: `Worker GPS Tracker • Role: ${worker.role} • Speed: ${worker.speedKmh} km/h`
            };
            exportedFeatures.push(workerFeat);
        });

        try {
            const savedRaw = safeStorage.getItem('agrimap_plantation_features');
            const currentFeatures: PlantationFeature[] = savedRaw ? JSON.parse(savedRaw) : [];
            const merged = [...currentFeatures, ...exportedFeatures];
            safeStorage.setItem('agrimap_plantation_features', JSON.stringify(merged));

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('agrimap:add_custom_layer', {
                    detail: {
                        layerName: exportLayerName,
                        features: exportedFeatures
                    }
                }));
                window.dispatchEvent(new CustomEvent('agrimap:refresh_features', {
                    detail: { count: exportedFeatures.length }
                }));
            }

            if (onExportToMainMap) {
                onExportToMainMap(exportedFeatures, exportLayerName);
            }

            toast.success(
                isKa 
                    ? `წარმატებით დაემატა ${exportedFeatures.length} ობიექტი მთავარ რუკაზე ახალ ფენად!` 
                    : `Successfully added ${exportedFeatures.length} items to Main Map Planner as "${exportLayerName}"!`
            );
            setIsExportModalOpen(false);
        } catch (err) {
            console.error('Failed to export sandbox items to main map:', err);
            toast.error('Failed to export to main map.');
        }
    };

    // Clean, modern, compact circular Leaflet divIcons with Direction Arrow & Tilt
    // Clean, modern, compact circular Leaflet divIcons with Direction Arrow & Tilt (no cluttering text annotation)
    const createCleanCameraIcon = (c: PlantationCamera, isSelected: boolean, isHidden: boolean = false) => {
        const color = isHidden ? '#64748b' : isSelected ? '#10b981' : '#2563eb';
        const heading = c.azimuthDeg || 0;
        const opacity = isHidden ? '0.45' : '1';

        return L.divIcon({
            className: 'clean-cam-icon',
            html: `
                <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: grab; opacity: ${opacity};">
                    <div style="
                        width: 32px; height: 32px; border-radius: 50%;
                        background: ${color}; border: 2.5px solid #ffffff;
                        box-shadow: 0 4px 14px rgba(0,0,0,0.65);
                        display: flex; align-items: center; justify-content: center;
                        color: white; position: relative;
                        transition: transform 0.2s;
                        transform: scale(${isSelected ? 1.25 : 1});
                    ">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${heading}deg); transition: transform 0.2s;">
                            <polygon points="12 2 19 21 12 17 5 21 12 2" fill="white" />
                        </svg>
                        ${isHidden ? '<div style="position: absolute; top:-2px; right:-2px; background:#ef4444; width:10px; height:10px; border-radius:50%; border:1.5px solid white;"></div>' : ''}
                    </div>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
    };

    const createCleanSoilIcon = (s: SandboxSoilSensor, isSelected: boolean) => L.divIcon({
        className: 'clean-soil-icon',
        html: `
            <div style="
                width: 26px; height: 26px; border-radius: 50%;
                background: ${isSelected ? '#059669' : '#10b981'};
                border: 2px solid #ffffff;
                box-shadow: 0 4px 8px rgba(0,0,0,0.4);
                display: flex; align-items: center; justify-content: center;
                color: white; font-size: 12px; cursor: pointer;
                transform: scale(${isSelected ? 1.2 : 1});
            ">🌱</div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
    });

    const createCleanWaterIcon = (w: SandboxWaterSensor, isSelected: boolean) => L.divIcon({
        className: 'clean-water-icon',
        html: `
            <div style="
                width: 26px; height: 26px; border-radius: 50%;
                background: ${isSelected ? '#0369a1' : '#0284c7'};
                border: 2px solid #ffffff;
                box-shadow: 0 4px 8px rgba(0,0,0,0.4);
                display: flex; align-items: center; justify-content: center;
                color: white; font-size: 12px; cursor: pointer;
                transform: scale(${isSelected ? 1.2 : 1});
            ">💧</div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
    });

    const createCleanWorkerIcon = (wrk: SandboxWorkerGps, isSelected: boolean) => L.divIcon({
        className: 'clean-worker-icon',
        html: `
            <div style="
                width: 28px; height: 28px; border-radius: 50%;
                background: ${isSelected ? '#7c3aed' : '#8b5cf6'};
                border: 2px solid #ffffff;
                box-shadow: 0 4px 8px rgba(0,0,0,0.4);
                display: flex; align-items: center; justify-content: center;
                color: white; font-size: 13px; cursor: pointer;
                transform: scale(${isSelected ? 1.2 : 1});
            ">👷</div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });

    const createCleanDroneLiveIcon = (mission: SandboxDroneMission) => L.divIcon({
        className: 'clean-drone-icon',
        html: `
            <div style="
                width: 34px; height: 34px; border-radius: 50%;
                background: #06b6d4; border: 3px solid #ffffff;
                box-shadow: 0 0 16px rgba(6, 182, 212, 0.9);
                display: flex; align-items: center; justify-content: center;
                color: white; font-size: 16px; cursor: pointer;
                animation: pulse 1.5s infinite;
            ">🛸</div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
    });

    const createCleanSeedlingIcon = (isSelected: boolean) => L.divIcon({
        className: 'clean-seedling-icon',
        html: `
            <div style="
                width: 22px; height: 22px; border-radius: 50%;
                background: ${isSelected ? '#f59e0b' : '#eab308'};
                border: 2px solid #ffffff;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                display: flex; align-items: center; justify-content: center;
                color: #0f172a; font-size: 10px; font-weight: 900; cursor: pointer;
                transform: scale(${isSelected ? 1.25 : 1});
            ">44</div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });

    const createCleanWeatherIcon = (station: SandboxWeatherStation, isSelected: boolean) => L.divIcon({
        className: 'clean-weather-icon',
        html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); cursor: pointer;">
                <div style="
                    width: 32px; height: 32px; border-radius: 12px;
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    border: 2.5px solid #ffffff;
                    box-shadow: 0 4px 12px rgba(234, 88, 12, 0.55);
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-size: 16px;
                    transform: scale(${isSelected ? 1.25 : 1});
                    transition: transform 0.2s;
                ">🌦️</div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    return (
        <div className="relative w-full h-full min-h-[calc(100vh-64px)] flex-1 overflow-hidden select-none bg-slate-950 font-sans">
            {/* Non-intrusive tool status chip (does not obstruct map buttons or drawing area) */}
            {activeTool !== 'select' && (
                <div className="absolute top-16 left-4 z-[1150] px-3 py-1.5 bg-slate-900/90 border border-cyan-500/50 rounded-full shadow-lg backdrop-blur-md flex items-center gap-2 text-xs text-white animate-in fade-in duration-100">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[280px] sm:max-w-md">
                        {activeTool === 'add_camera' && (isKa ? '📹 დააწკაპუნეთ რუკაზე კამერის დასასმელად' : '📹 Click to place camera')}
                        {activeTool === 'drone_waypoint' && (isKa ? '🛸 დააწკაპუნეთ დრონის წერტილის დასამატებლად' : '🛸 Click to add drone waypoint')}
                        {activeTool === 'add_worker' && (isKa ? '👷 დააწკაპუნეთ მუშის დასასმელად' : '👷 Click to place worker GPS')}
                        {activeTool === 'add_soil' && (isKa ? '🌱 დააწკაპუნეთ ნიადაგის სენსორის დასასმელად' : '🌱 Click to place soil sensor')}
                        {activeTool === 'add_water' && (isKa ? '💧 დააწკაპუნეთ წყლის სადგურის დასასმელად' : '💧 Click to place water station')}
                        {activeTool === 'add_weather' && (isKa ? '🌦️ დააწკაპუნეთ მეტეო სადგურის დასასმელად' : '🌦️ Click to place weather station')}
                        {activeTool === 'live_stream' && (isKa ? '📹 აირჩიეთ კამერა სტრიმისთვის' : '📹 Select camera for stream')}
                        {activeTool === 'move_camera' && (isKa ? `📍 აირჩიეთ ახალი პოზიცია` : `📍 Select new position`)}
                        {activeTool === 'add_spine_point' && (isKa ? '🏔️ დააწკაპუნეთ ახალი განივი ჭრილის დასამატებლად' : '🏔️ Click to add cross-section point')}
                        {activeTool === 'draw_slope' && (isKa ? '📐 დააწკაპუნეთ რუკაზე ფერდობის პერიმეტრის წერტილების დასასმელად (P1, P2...)' : '📐 Click to place slope perimeter vertices (P1, P2, P3...)')}
                        {activeTool === 'draw_perimeter' && (isKa ? '📐 დააწკაპუნეთ პერიმეტრის წერტილების დასასმელად' : '📐 Click to place perimeter points')}
                    </span>
                    <button
                        type="button"
                        onClick={() => setActiveTool('select')}
                        className="p-0.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 cursor-pointer"
                        title={isKa ? 'დასრულება' : 'Close'}
                    >
                        <X size={12} />
                    </button>
                </div>
            )}

            {/* 2D MAP VIEWPORT CONTAINER (FULL SCREEN WHEN 2D IS MAIN, OR DRAGGABLE PIP WHEN 3D IS MAIN) */}
            <div 
                data-pip-container={is3dMainView ? "true" : undefined}
                style={is3dMainView && pipPos ? {
                    position: 'fixed',
                    left: `${pipPos.x}px`,
                    top: `${pipPos.y}px`,
                    bottom: 'auto',
                    right: 'auto'
                } : undefined}
                className={
                    !is3dMainView 
                        ? "absolute inset-0 z-0 w-full h-full"
                        : isPiPHidden
                            ? "w-0 h-0 overflow-hidden absolute pointer-events-none opacity-0"
                            : "fixed bottom-4 right-4 z-[1150] w-[380px] sm:w-[460px] h-[280px] sm:h-[350px] rounded-2xl bg-[#FAFBF8]/95 border border-[#D8E3D4] shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col transition-all text-[#163022]"
                }
            >
                {/* When in 3D Main View and 2D is PiP, show Header with Drag Handle, Swap and Close */}
                {is3dMainView && !isPiPHidden && (
                    <div 
                        onPointerDown={handlePipPointerDown}
                        onPointerMove={handlePipPointerMove}
                        onPointerUp={handlePipPointerUp}
                        className="p-2 sm:p-2.5 bg-[#EEF3EA] border-b border-[#D8E3D4] flex items-center justify-between text-xs shrink-0 select-none cursor-grab active:cursor-grabbing z-10 text-[#163022]"
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-black text-[#163022] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                🗺️ {isKa ? '2D ნავიგაციის რუკა' : '2D Navigation Map'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setIs3dMainView(false)}
                                className="px-2 py-0.5 bg-white text-[#1E3B2B] border border-[#CFDCCB] hover:bg-[#0284c7] hover:text-white hover:border-[#0284c7] font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-all duration-200 shadow-2xs"
                                title="Swap places: make 2D the full screen main window"
                            >
                                <span>⇄ Swap</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPiPHidden(true)}
                                className="p-1 text-[#5F7A69] hover:text-rose-600 rounded-lg hover:bg-white cursor-pointer transition-colors shadow-2xs"
                                title="Close 2D MiniMap to run 3D Full Screen"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 w-full h-full relative">
                    <MapContainer
                        center={currentCenter}
                        zoom={17}
                        maxZoom={20}
                        style={{ height: '100%', width: '100%', cursor: activeTool !== 'select' ? 'crosshair' : 'default' }}
                        attributionControl={false}
                    >
                        <MapResizeController is3dMainView={is3dMainView} isPiPHidden={isPiPHidden} />
                        <MapRecenterController center={currentCenter} trigger={recenterTrigger} />
                        <MapFlyController flyTarget={flyTarget} />
                        <SandboxMapEvents 
                            activeTool={activeTool} 
                            onMapClick={handleMapClick} 
                            onMapMove={(lat, lng) => setCurrentCenter([lat, lng])}
                        />

                {tileMode === 'satellite' ? (
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        maxZoom={19}
                    />
                ) : (
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        maxZoom={19}
                    />
                )}

                {/* Planting Mound Perimeter Outline Draped on Imagery (Purple line matching user sketch) */}
                {layerVisibility.hill1 !== false && visibility.showMoundSlope !== false && hillSpineProfile.enabled !== false && moundPerimeterPolygon.length > 2 && (
                    <Polygon
                        positions={moundPerimeterPolygon}
                        pathOptions={{
                            color: '#d946ef',
                            weight: 3.5,
                            dashArray: '6, 6',
                            fillColor: '#d946ef',
                            fillOpacity: 0.18
                        }}
                    >
                        <Tooltip direction="top" className="font-mono text-xs">
                            🏔️ {hillSpineProfile.name} • {isKa ? 'პერიმეტრი:' : 'Perimeter:'} {measuredMoundPerimeterM}m
                        </Tooltip>
                    </Polygon>
                )}

                {/* Custom Hand-Drawn Perimeter Boundary Polygon & Draggable Vertices (Matching user sketch) */}
                {layerVisibility.slope1 !== false && customSlopePerimeter.length >= 3 && (
                    <Polygon
                        positions={customSlopePerimeter}
                        pathOptions={{
                            color: '#d946ef',
                            weight: 3.5,
                            dashArray: '5, 5',
                            fillColor: '#d946ef',
                            fillOpacity: 0.22
                        }}
                    >
                        <Tooltip direction="top" className="font-mono text-xs">
                            📐 {isKa ? 'დახაზული პერიმეტრი' : 'Drawn Perimeter'} • {measuredCustomPerimeterM}m • {customPerimeterArea.ha} ha
                        </Tooltip>
                    </Polygon>
                )}

                {layerVisibility.slope1 !== false && customSlopePerimeter.length > 0 && (
                    <Polyline
                        positions={customSlopePerimeter}
                        pathOptions={{
                            color: '#ec4899',
                            weight: 3.5,
                            dashArray: '4, 4'
                        }}
                    />
                )}

                {/* POINT-TO-POINT DISTANCE & INCLINE/DECLINE BADGES ALONG PERIMETER SLOPE */}
                {layerVisibility.slope1 !== false && visibility.showMoundSlope !== false && (selectedLayerId === 'slope_1' || selectedLayerId.startsWith('slope') || activeTool === 'draw_slope' || activeTool === 'draw_perimeter' || isSlopeSculptorOpen) && slopeSegments.map((seg, idx) => {
                    const p1 = perimeterVertices[seg.fromIndex];
                    const p2 = perimeterVertices[seg.toIndex];
                    if (!p1 || !p2) return null;
                    const midLat = (p1.lat + p2.lat) / 2;
                    const midLng = (p1.lng + p2.lng) / 2;
                    const arrow = seg.type === 'incline' ? '↗' : seg.type === 'decline' ? '↘' : '→';
                    const sign = seg.elevationDeltaM > 0 ? '+' : '';
                    const color = seg.type === 'incline' ? '#10b981' : seg.type === 'decline' ? '#f43f5e' : '#ec4899';
                    return (
                        <Marker
                            key={`slope-seg-badge-${idx}`}
                            position={[midLat, midLng]}
                            interactive={false}
                            icon={L.divIcon({
                                className: 'slope-segment-badge',
                                html: `
                                    <div style="
                                        background: rgba(15, 23, 42, 0.94);
                                        border: 1.5px solid ${color};
                                        border-radius: 9999px;
                                        padding: 2px 7px;
                                        font-family: ui-monospace, monospace;
                                        font-size: 10px;
                                        font-weight: 800;
                                        color: #ffffff;
                                        box-shadow: 0 4px 12px rgba(0,0,0,0.65);
                                        display: flex;
                                        align-items: center;
                                        gap: 4px;
                                        white-space: nowrap;
                                        pointer-events: none;
                                        transform: translate(-50%, -50%);
                                    ">
                                        <span style="color: #f472b6;">${seg.distanceM}m</span>
                                        <span style="color: ${color}; font-weight: 900;">${arrow} ${sign}${seg.inclinePct}%</span>
                                        <span style="color: #94a3b8; font-size: 8px;">(${sign}${seg.elevationDeltaM}m)</span>
                                    </div>
                                `,
                                iconSize: [0, 0]
                            })}
                        />
                    );
                })}

                {/* Draggable Markers for Every Vertex of the Perimeter (Reshape perimeter freely with mouse) */}
                {layerVisibility.slope1 !== false && customSlopePerimeter.map((pt, idx) => (
                    <Marker
                        key={`custom-perim-pt-${idx}`}
                        position={pt}
                        draggable={!layerLocks.slope1}
                        icon={L.divIcon({
                            className: `custom-perim-marker-${idx}`,
                            html: `
                                <div style="
                                    width: 28px; height: 28px; border-radius: 50%;
                                    background: #d946ef; border: 2.5px solid #ffffff;
                                    box-shadow: 0 3px 10px rgba(0,0,0,0.7);
                                    display: flex; align-items: center; justify-content: center;
                                    color: #ffffff; font-weight: 900; font-family: monospace; font-size: 11px;
                                    cursor: grab;
                                ">
                                    P${idx + 1}
                                </div>
                            `,
                            iconSize: [28, 28],
                            iconAnchor: [14, 14]
                        })}
                        eventHandlers={{
                            drag: (e) => {
                                const pos = e.target.getLatLng();
                                setCustomSlopePerimeter(prev => {
                                    const copy = [...prev];
                                    copy[idx] = [pos.lat, pos.lng];
                                    safeStorage.setItem('agrimap_sandbox_custom_perimeter', JSON.stringify(copy));
                                    return copy;
                                });
                                setPerimeterVertices(prev => {
                                    const copy = [...prev];
                                    if (copy[idx]) {
                                        copy[idx] = { ...copy[idx], lat: pos.lat, lng: pos.lng };
                                    }
                                    safeStorage.setItem('agrimap_sandbox_perimeter_vertices', JSON.stringify(copy));
                                    return copy;
                                });
                                const targetSlopeId = selectedLayerId.startsWith('slope') ? selectedLayerId : 'slope_1';
                                setSlopeObjects(prev => {
                                    const updated = prev.map(s => {
                                        if (s.id === targetSlopeId && s.vertices?.[idx]) {
                                            const copyV = [...s.vertices];
                                            copyV[idx] = { ...copyV[idx], lat: pos.lat, lng: pos.lng };
                                            return { ...s, vertices: copyV };
                                        }
                                        return s;
                                    });
                                    safeStorage.setItem('agrimap_sandbox_slope_objects', JSON.stringify(updated));
                                    return updated;
                                });
                                setTerrainCounter(c => c + 1);
                                window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
                            },
                            contextmenu: (e) => {
                                (e as any).originalEvent?.preventDefault();
                                const targetV = perimeterVertices[idx];
                                if (targetV) {
                                    handleDeletePerimeterVertex(targetV.id);
                                } else {
                                    setCustomSlopePerimeter(prev => prev.filter((_, i) => i !== idx));
                                    setPerimeterVertices(prev => prev.filter((_, i) => i !== idx));
                                    setTerrainCounter(c => c + 1);
                                    window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
                                    toast.info(`Perimeter Point P${idx + 1} removed`);
                                }
                            }
                        }}
                    >
                        <Tooltip direction="top">
                            P{idx + 1} • {isKa ? 'გადაადგილეთ თაგვით / მარჯვენა წკაპი წასაშლელად' : 'Drag to reshape boundary / Right click to remove'}
                        </Tooltip>
                    </Marker>
                ))}

                {/* PHOTO PINS ON 2D MAP (EXIF GPS & COMPASS AZIMUTH ARROW) */}
                {layerVisibility.photoPins !== false && photoPins.map((pin) => (
                    <Marker
                        key={`map-photo-pin-${pin.id}`}
                        position={[pin.lat, pin.lng]}
                        icon={L.divIcon({
                            className: `map-photo-pin-${pin.id}`,
                            html: `
                                <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                    <div style="
                                        position: absolute; width: 42px; height: 42px; border-radius: 50%;
                                        border: 2px dashed #06b6d4; transform: rotate(${pin.azimuthDeg}deg);
                                        display: flex; align-items: flex-start; justify-content: center; pointer-events: none;
                                    ">
                                        <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 8px solid #06b6d4; margin-top: -6px;"></div>
                                    </div>
                                    <div style="
                                        width: 28px; height: 28px; border-radius: 10px; background: #082f49;
                                        border: 2px solid #38bdf8; color: #ffffff; display: flex; align-items: center; justify-content: center;
                                        font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,0.8);
                                    ">
                                        📷
                                    </div>
                                </div>
                            `,
                            iconSize: [36, 36],
                            iconAnchor: [18, 18]
                        })}
                        eventHandlers={{
                            click: () => {
                                setSelectedPhotoPin(pin);
                                setIsPhotoModalOpen(true);
                            }
                        }}
                    >
                        <Tooltip direction="top">
                            <div className="font-mono text-xs">
                                📷 <strong>{pin.name}</strong> • {pin.azimuthDeg}° heading • {pin.altitudeM}m ASL
                                <br />
                                <span className="text-[10px] text-cyan-400">{isKa ? 'დააწკაპუნეთ ფოტოს სანახავად' : 'Click to inspect photo'}</span>
                            </div>
                        </Tooltip>
                    </Marker>
                ))}

                {/* RIDGE SPINE LINE (CLEAN, NO INTRUSIVE PERMANENT ANNOTATION BADGE) */}
                {layerVisibility.hill1 !== false && visibility.showMoundSlope !== false && hillSpineProfile.enabled !== false && hillSpineProfile.points.length >= 2 && (
                    <Polyline
                        positions={hillSpineProfile.points.map(p => [p.lat, p.lng])}
                        pathOptions={{
                            color: isSlopeSculptorOpen && (selectedLayerId === 'hill_1' || selectedLayerId.startsWith('hill')) ? '#f59e0b' : '#fbbf24',
                            weight: isSlopeSculptorOpen && (selectedLayerId === 'hill_1' || selectedLayerId.startsWith('hill')) ? 5 : 3.5,
                            dashArray: '6, 6'
                        }}
                        eventHandlers={{
                            click: () => {
                                setSelectedLayerId('hill_1');
                                setIsSlopeSculptorOpen(true);
                            }
                        }}
                    >
                        <Tooltip direction="top">
                            <span className="font-mono font-bold text-xs">
                                📏 {isKa ? 'ქედის სიგრძე:' : 'Slope Length:'} {measuredHillLengthM} m
                            </span>
                        </Tooltip>
                    </Polyline>
                )}

                {/* POINT-TO-POINT DISTANCE & INCLINE/DECLINE BADGES ALONG HILL SPINE */}
                {layerVisibility.hill1 !== false && visibility.showMoundSlope !== false && hillSpineProfile.enabled !== false && (selectedLayerId === 'hill_1' || selectedLayerId.startsWith('hill') || activeTool === 'draw_hill' || isSlopeSculptorOpen) && hillSegments.map((seg, idx) => {
                    const p1 = hillSpineProfile.points[seg.fromIndex];
                    const p2 = hillSpineProfile.points[seg.toIndex];
                    if (!p1 || !p2) return null;
                    const midLat = (p1.lat + p2.lat) / 2;
                    const midLng = (p1.lng + p2.lng) / 2;
                    const arrow = seg.type === 'incline' ? '↗' : seg.type === 'decline' ? '↘' : '→';
                    const sign = seg.elevationDeltaM > 0 ? '+' : '';
                    const color = seg.type === 'incline' ? '#10b981' : seg.type === 'decline' ? '#f43f5e' : '#fbbf24';
                    return (
                        <Marker
                            key={`hill-seg-badge-${idx}`}
                            position={[midLat, midLng]}
                            interactive={false}
                            icon={L.divIcon({
                                className: 'hill-segment-badge',
                                html: `
                                    <div style="
                                        background: rgba(15, 23, 42, 0.94);
                                        border: 1.5px solid ${color};
                                        border-radius: 9999px;
                                        padding: 2px 7px;
                                        font-family: ui-monospace, monospace;
                                        font-size: 10px;
                                        font-weight: 800;
                                        color: #ffffff;
                                        box-shadow: 0 4px 12px rgba(0,0,0,0.65);
                                        display: flex;
                                        align-items: center;
                                        gap: 4px;
                                        white-space: nowrap;
                                        pointer-events: none;
                                        transform: translate(-50%, -50%);
                                    ">
                                        <span style="color: #fbbf24;">${seg.distanceM}m</span>
                                        <span style="color: ${color}; font-weight: 900;">${arrow} ${sign}${seg.inclinePct}%</span>
                                        <span style="color: #94a3b8; font-size: 8px;">(${sign}${seg.elevationDeltaM}m)</span>
                                    </div>
                                `,
                                iconSize: [0, 0]
                            })}
                        />
                    );
                })}

                {/* Move Entire Slope Gizmo - ONLY SHOW WHEN HILL 1 IS VISIBLE AND HILL LAYER IS ACTIVE (NEVER WHEN SLOPE LAYER IS ACTIVE) */}
                {layerVisibility.hill1 !== false && visibility.showMoundSlope !== false && hillSpineProfile.enabled !== false && !selectedLayerId?.startsWith('slope') && selectedLayerId !== 'slope_1' && activeTool !== 'draw_slope' && activeTool !== 'draw_perimeter' && (selectedLayerId === 'hill_1' || selectedLayerId.startsWith('hill') || activeTool === 'draw_hill') && hillSpineProfile.points.length >= 2 && (
                    <Marker
                        position={slopeCentroid}
                        draggable={!layerLocks.hill1}
                        icon={L.divIcon({
                            className: 'slope-centroid-move-handle',
                            html: `
                                <div style="
                                    width: 32px; height: 32px; border-radius: 50%;
                                    background: #10b981; border: 2.5px solid #ffffff;
                                    box-shadow: 0 4px 12px rgba(0,0,0,0.6);
                                    display: flex; align-items: center; justify-content: center;
                                    color: #ffffff; font-size: 15px; cursor: move;
                                " title="Move Entire Slope">
                                    ✋
                                </div>
                            `,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16]
                        })}
                        eventHandlers={{
                            drag: (e) => {
                                const pos = e.target.getLatLng();
                                const dLat = pos.lat - slopeCentroid[0];
                                const dLng = pos.lng - slopeCentroid[1];
                                handleMoveEntireSlope(dLat, dLng);
                            },
                            dragend: () => {
                                toast.success(isKa ? 'ქედი გადაადგილებულია' : 'Entire slope repositioned');
                            }
                        }}
                    >
                        <Tooltip direction="bottom">
                            ✋ {isKa ? 'მთლიანი ქედის გადაადგილება თაგვით' : 'Hold & drag to move entire slope across map'}
                        </Tooltip>
                    </Marker>
                )}

                {/* CROSS-SECTION WIDTH LINES & INDEPENDENT ASYMMETRIC HANDLES - ONLY SHOW WHEN HILL 1 IS VISIBLE AND HILL LAYER IS ACTIVE (NEVER WHEN SLOPE LAYER IS ACTIVE) */}
                {layerVisibility.hill1 !== false && visibility.showMoundSlope !== false && hillSpineProfile.enabled !== false && !selectedLayerId?.startsWith('slope') && selectedLayerId !== 'slope_1' && activeTool !== 'draw_slope' && activeTool !== 'draw_perimeter' && (selectedLayerId === 'hill_1' || selectedLayerId.startsWith('hill') || activeTool === 'draw_hill') && crossSectionBars.map((bar, idx) => {
                    const isBarSelected = bar.pointId === activePointId;
                    return (
                        <React.Fragment key={`bar-group-${bar.id}-${idx}`}>
                            <Polyline
                                positions={bar.line}
                                pathOptions={{
                                    color: isBarSelected ? '#06b6d4' : '#38bdf8',
                                    weight: isBarSelected ? 4 : 2.5,
                                    dashArray: isBarSelected ? undefined : '4, 4'
                                }}
                                eventHandlers={{
                                    click: () => {
                                        setActivePointId(bar.pointId);
                                        setIsSlopeSculptorOpen(true);
                                    }
                                }}
                            >
                                <Tooltip direction="bottom">
                                    <span className="font-mono text-xs">
                                        ↔ Left: {bar.leftWidthM}m | Right: {bar.rightWidthM}m (Total: {bar.widthM}m)
                                    </span>
                                </Tooltip>
                            </Polyline>

                            {/* Left Draggable Width Handle */}
                            <Marker
                                position={bar.leftEnd}
                                draggable={!layerLocks.hill1}
                                icon={L.divIcon({
                                    className: `wh-l-${bar.id}`,
                                    html: `
                                        <div style="
                                            min-width: 26px; height: 26px; padding: 0 4px;
                                            border-radius: 13px; 
                                            background: ${isBarSelected ? '#06b6d4' : '#0284c7'}; 
                                            border: 2px solid #ffffff; 
                                            box-shadow: 0 3px 10px rgba(0,0,0,0.6); 
                                            cursor: grab; 
                                            display: flex; align-items: center; justify-content: center; gap: 2px;
                                            color: white; font-family: monospace; font-size: 11px; font-weight: 900;
                                            user-select: none;
                                        " title="Left Width Handle (L)">
                                            <span>L</span>
                                            <span style="font-size: 9px; opacity: 0.9;">${bar.leftWidthM}m</span>
                                        </div>
                                    `,
                                    iconSize: [44, 26],
                                    iconAnchor: [22, 13]
                                })}
                                eventHandlers={{
                                    drag: (e) => {
                                        const pos = e.target.getLatLng();
                                        handleResizeLeftHandle(bar.pointId, [pos.lat, pos.lng], bar.center, false);
                                    },
                                    dragend: (e) => {
                                        const pos = e.target.getLatLng();
                                        handleResizeLeftHandle(bar.pointId, [pos.lat, pos.lng], bar.center, true);
                                    }
                                }}
                            >
                                <Tooltip direction="left" className="font-mono text-xs">
                                    <b>Left Side (L)</b>: {bar.leftWidthM}m ({isKa ? 'დამოუკიდებელი მარცხენა სიგანე' : 'Independent Left Width'})
                                </Tooltip>
                            </Marker>

                            {/* Right Draggable Width Handle */}
                            <Marker
                                position={bar.rightEnd}
                                draggable={!layerLocks.hill1}
                                icon={L.divIcon({
                                    className: `wh-r-${bar.id}`,
                                    html: `
                                        <div style="
                                            min-width: 26px; height: 26px; padding: 0 4px;
                                            border-radius: 13px; 
                                            background: ${isBarSelected ? '#06b6d4' : '#0d9488'}; 
                                            border: 2px solid #ffffff; 
                                            box-shadow: 0 3px 10px rgba(0,0,0,0.6); 
                                            cursor: grab; 
                                            display: flex; align-items: center; justify-content: center; gap: 2px;
                                            color: white; font-family: monospace; font-size: 11px; font-weight: 900;
                                            user-select: none;
                                        " title="Right Width Handle (R)">
                                            <span>R</span>
                                            <span style="font-size: 9px; opacity: 0.9;">${bar.rightWidthM}m</span>
                                        </div>
                                    `,
                                    iconSize: [44, 26],
                                    iconAnchor: [22, 13]
                                })}
                                eventHandlers={{
                                    drag: (e) => {
                                        const pos = e.target.getLatLng();
                                        handleResizeRightHandle(bar.pointId, [pos.lat, pos.lng], bar.center, false);
                                    },
                                    dragend: (e) => {
                                        const pos = e.target.getLatLng();
                                        handleResizeRightHandle(bar.pointId, [pos.lat, pos.lng], bar.center, true);
                                    }
                                }}
                            >
                                <Tooltip direction="right" className="font-mono text-xs">
                                    <b>Right Side (R)</b>: {bar.rightWidthM}m ({isKa ? 'დამოუკიდებელი მარჯვენა სიგანე' : 'Independent Right Width'})
                                </Tooltip>
                            </Marker>
                        </React.Fragment>
                    );
                })}

                {/* DRAGGABLE CONNECTION POINT MARKERS (POINTS A, B, C...) - ONLY SHOW WHEN HILL 1 IS VISIBLE AND HILL LAYER IS ACTIVE (NEVER WHEN SLOPE LAYER IS ACTIVE) */}
                {layerVisibility.hill1 !== false && visibility.showMoundSlope !== false && hillSpineProfile.enabled !== false && !selectedLayerId?.startsWith('slope') && selectedLayerId !== 'slope_1' && activeTool !== 'draw_slope' && activeTool !== 'draw_perimeter' && (selectedLayerId === 'hill_1' || selectedLayerId.startsWith('hill') || activeTool === 'draw_hill') && hillSpineProfile.points.map((pt, idx) => {
                    const isSelected = pt.id === activePointId;
                    const isMidpoint = idx === Math.floor(hillSpineProfile.points.length / 2);
                    const letter = String.fromCharCode(65 + idx);
                    return (
                        <Marker
                            key={`pt-marker-${pt.id}-${idx}`}
                            position={[pt.lat, pt.lng]}
                            draggable={!layerLocks.hill1}
                            icon={L.divIcon({
                                className: `pt-marker-${pt.id}-${idx}`,
                                html: `
                                    <div style="
                                        min-width: ${isMidpoint ? '40px' : '34px'}; 
                                        height: ${isMidpoint ? '40px' : '34px'}; 
                                        padding: 0 4px;
                                        border-radius: 20px;
                                        background: ${isSelected ? '#f59e0b' : isMidpoint ? '#d97706' : '#0284c7'};
                                        border: ${isMidpoint ? '3px solid #fef08a' : '2.5px solid #ffffff'};
                                        box-shadow: 0 4px 14px rgba(0,0,0,0.7);
                                        display: flex; flex-direction: column; align-items: center; justify-content: center;
                                        color: #ffffff; font-weight: 900; font-family: monospace;
                                        cursor: grab; transform: scale(${isSelected ? 1.15 : 1});
                                        transition: transform 0.15s; line-height: 1;
                                    ">
                                        <span style="font-size: ${isMidpoint ? '13px' : '11px'};">${letter}</span>
                                        <span style="font-size: 8px; opacity: 0.95; font-family: sans-serif; font-weight: 800;">${pt.peakHeightM >= 0 ? `+${pt.peakHeightM}m` : `${pt.peakHeightM}m`}</span>
                                    </div>
                                `,
                                iconSize: [isMidpoint ? 40 : 34, isMidpoint ? 40 : 34],
                                iconAnchor: [isMidpoint ? 20 : 17, isMidpoint ? 20 : 17]
                            })}
                            eventHandlers={{
                                click: () => {
                                    setActivePointId(pt.id);
                                    setSelectedObject({
                                        type: 'slope_point',
                                        data: pt
                                    });
                                },
                                drag: (e) => {
                                    const pos = e.target.getLatLng();
                                    handleMoveSpinePoint(pt.id, pos.lat, pos.lng, false);
                                },
                                dragend: (e) => {
                                    const marker = e.target;
                                    const pos = marker.getLatLng();
                                    handleMoveSpinePoint(pt.id, pos.lat, pos.lng, true);
                                    toast.success(isKa ? `საკვანძო წერტილი ${pt.name} განახლდა` : `${pt.name} relocated`);
                                },
                                contextmenu: (e) => {
                                    L.DomEvent.stopPropagation(e as any);
                                    if ((e as any).originalEvent) {
                                        (e as any).originalEvent.preventDefault();
                                        setContextMenu({
                                            x: (e as any).originalEvent.clientX,
                                            y: (e as any).originalEvent.clientY,
                                            type: 'slope_point',
                                            data: pt
                                        });
                                    }
                                }
                            }}
                        />
                    );
                })}

                {/* TEST CAMERAS WITH DRAGGABLE POLES, OPTICAL FOV CONES & BLIND ZONES */}
                {visibility.showCameras && testCameras.map((cam, idx) => {
                    if (!cam.lat || !cam.lng) return null;
                    const isHidden = hiddenCameraIds.includes(cam.id);
                    const isSelected = activeCamera.id === cam.id;
                    const fovPoly = computeFovConePolygon(cam.lat, cam.lng, cam.azimuthDeg || 0, cam.fovAngleDeg || 85, cam.rangeM || 75);
                    const blindPoly = computeBlindZonePolygon({
                        centerLat: cam.lat,
                        centerLng: cam.lng,
                        azimuthDeg: cam.azimuthDeg || 0,
                        fovAngleDeg: cam.fovAngleDeg || 85,
                        rangeM: cam.rangeM || 75,
                        mountHeightM: cam.mountHeightM || 6,
                        tiltAngleDeg: cam.tiltAngleDeg || 4
                    });

                    return (
                        <React.Fragment key={`cam-frag-${cam.id}-${idx}`}>
                            {!isHidden && (
                                <Polygon
                                    positions={fovPoly}
                                    pathOptions={{
                                        color: isSelected ? '#10b981' : '#3b82f6',
                                        weight: isSelected ? 2.5 : 1.2,
                                        dashArray: isSelected ? undefined : '4, 4',
                                        fillColor: isSelected ? '#10b981' : '#3b82f6',
                                        fillOpacity: isSelected ? 0.32 : 0.18
                                    }}
                                />
                            )}
                            {!isHidden && visibility.showBlindZones && blindPoly.length > 2 && (
                                <Polygon
                                    positions={blindPoly}
                                    pathOptions={{
                                        color: '#ef4444',
                                        weight: 1.5,
                                        dashArray: '2, 2',
                                        fillColor: '#ef4444',
                                        fillOpacity: 0.45
                                    }}
                                />
                            )}
                            <Marker
                                position={[cam.lat, cam.lng]}
                                icon={createCleanCameraIcon(cam, isSelected, isHidden)}
                                draggable={true}
                                eventHandlers={{
                                    click: () => {
                                        setActiveCameraId(cam.id);
                                        setSelectedObject({
                                            type: 'camera',
                                            data: cam
                                        });
                                        if (activeTool === 'live_stream') {
                                            setLiveStreamCamera(cam);
                                        }
                                    },
                                    contextmenu: (e) => {
                                        L.DomEvent.stopPropagation(e as any);
                                        if ((e as any).originalEvent) {
                                            (e as any).originalEvent.preventDefault();
                                            setContextMenu({
                                                x: (e as any).originalEvent.clientX,
                                                y: (e as any).originalEvent.clientY,
                                                type: 'camera',
                                                data: cam
                                            });
                                        }
                                    },
                                    dragend: (e) => {
                                        const marker = e.target;
                                        const pos = marker.getLatLng();
                                        updateActiveCamera({ lat: pos.lat, lng: pos.lng });
                                        toast.success(isKa ? `კამერა "${cam.name}" გადატანილია` : `Camera "${cam.name}" relocated`);
                                    }
                                }}
                            />
                        </React.Fragment>
                    );
                })}

                {/* Opposing Slope Blind Zones */}
                {opposingSlopeBlindZone.map((poly, idx) => (
                    <Polygon
                        key={`blind-slope-${idx}`}
                        positions={poly}
                        pathOptions={{
                            color: '#ef4444',
                            weight: 1.5,
                            dashArray: '3, 3',
                            fillColor: '#b91c1c',
                            fillOpacity: 0.55
                        }}
                    />
                ))}

                {/* Soil Sensors */}
                {visibility.showSoilSensors && testSoilSensors.map((soil, sIdx) => (
                    <Marker
                        key={`soil-sensor-${soil.id}-${sIdx}`}
                        position={[soil.lat, soil.lng]}
                        icon={createCleanSoilIcon(soil, selectedObject?.data?.id === soil.id)}
                        eventHandlers={{
                            click: () => {
                                setSelectedObject({ type: 'soil', data: soil });
                            },
                            contextmenu: (e) => {
                                L.DomEvent.stopPropagation(e as any);
                                if ((e as any).originalEvent) {
                                    (e as any).originalEvent.preventDefault();
                                    setContextMenu({
                                        x: (e as any).originalEvent.clientX,
                                        y: (e as any).originalEvent.clientY,
                                        type: 'soil',
                                        data: soil
                                    });
                                }
                            }
                        }}
                    />
                ))}

                {/* Water Sensors */}
                {visibility.showWaterSensors && testWaterSensors.map((w, wIdx) => (
                    <Marker
                        key={`water-sensor-${w.id}-${wIdx}`}
                        position={[w.lat, w.lng]}
                        icon={createCleanWaterIcon(w, selectedObject?.data?.id === w.id)}
                        eventHandlers={{
                            click: () => {
                                setSelectedObject({ type: 'water', data: w });
                            },
                            contextmenu: (e) => {
                                L.DomEvent.stopPropagation(e as any);
                                if ((e as any).originalEvent) {
                                    (e as any).originalEvent.preventDefault();
                                    setContextMenu({
                                        x: (e as any).originalEvent.clientX,
                                        y: (e as any).originalEvent.clientY,
                                        type: 'water',
                                        data: w
                                    });
                                }
                            }
                        }}
                    />
                ))}

                {/* Worker GPS Trackers */}
                {visibility.showWorkersGps && testWorkersGps.map((wrk, wrkIdx) => (
                    <Marker
                        key={`worker-gps-${wrk.id}-${wrkIdx}`}
                        position={[wrk.lat, wrk.lng]}
                        icon={createCleanWorkerIcon(wrk, selectedObject?.data?.id === wrk.id)}
                        draggable={true}
                        eventHandlers={{
                            click: () => {
                                setSelectedObject({ type: 'worker', data: wrk });
                            },
                            contextmenu: (e) => {
                                L.DomEvent.stopPropagation(e as any);
                                if ((e as any).originalEvent) {
                                    (e as any).originalEvent.preventDefault();
                                    setContextMenu({
                                        x: (e as any).originalEvent.clientX,
                                        y: (e as any).originalEvent.clientY,
                                        type: 'worker',
                                        data: wrk
                                    });
                                }
                            },
                            dragend: (e) => {
                                const pos = e.target.getLatLng();
                                setTestWorkersGps(prev => prev.map(w => w.id === wrk.id ? { ...w, lat: pos.lat, lng: pos.lng } : w));
                                toast.success(`${wrk.workerName} coordinates updated`);
                            }
                        }}
                    />
                ))}

                {/* Agro-Meteorological Weather Stations */}
                {visibility.showWeatherStations && testWeatherStations.map((station, sIdx) => (
                    <Marker
                        key={`weather-station-${station.id}-${sIdx}`}
                        position={[station.lat, station.lng]}
                        icon={createCleanWeatherIcon(station, selectedObject?.data?.id === station.id)}
                        draggable={true}
                        eventHandlers={{
                            click: () => {
                                setSelectedObject({ type: 'weather', data: station });
                            },
                            contextmenu: (e) => {
                                L.DomEvent.stopPropagation(e as any);
                                if ((e as any).originalEvent) {
                                    (e as any).originalEvent.preventDefault();
                                    setContextMenu({
                                        x: (e as any).originalEvent.clientX,
                                        y: (e as any).originalEvent.clientY,
                                        type: 'soil' as any,
                                        data: station
                                    });
                                }
                            },
                            dragend: (e) => {
                                const pos = e.target.getLatLng();
                                setTestWeatherStations(prev => prev.map(s => s.id === station.id ? { ...s, lat: pos.lat, lng: pos.lng } : s));
                                toast.success(isKa ? `მეტეო სადგური "${station.name}" გადაადგილდა` : `Weather station "${station.name}" relocated`);
                            }
                        }}
                    >
                        <Popup className="clean-weather-popup">
                            <div className="p-2 min-w-[220px] max-w-[260px] text-slate-900 space-y-2">
                                <div className="flex items-center justify-between border-b pb-1.5">
                                    <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-bold font-mono">
                                        🌦️ WEATHERLINK IP
                                    </span>
                                    <span className="text-[10px] font-mono text-emerald-600 font-bold">
                                        {station.status}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-black text-xs text-slate-900 leading-tight">
                                        {station.name}
                                    </h4>
                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        {station.model} • {station.ipAddress}:{station.port}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-50 rounded-xl text-[10px] font-mono border border-slate-200">
                                    <div>🌡️ Temp: <strong>{station.tempC}°C</strong></div>
                                    <div>💧 Hum: <strong>{station.humidityPct}%</strong></div>
                                    <div>💨 Wind: <strong>{station.windSpeedKmh} km/h</strong></div>
                                    <div>☀️ Solar: <strong>{station.solarRadiationWm2} W/m²</strong></div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Drone Waypoint Trajectory & Live Marker */}
                {visibility.showDronePath && testDroneMission.waypoints.length > 0 && (
                    <>
                        <Polyline
                            positions={testDroneMission.waypoints.map(w => [w.lat, w.lng])}
                            pathOptions={{
                                color: '#06b6d4',
                                weight: 3,
                                dashArray: '5, 5'
                            }}
                        />
                        <Marker
                            position={[testDroneMission.currentLat || testDroneMission.waypoints[0].lat, testDroneMission.currentLng || testDroneMission.waypoints[0].lng]}
                            icon={createCleanDroneLiveIcon(testDroneMission)}
                            eventHandlers={{
                                click: () => {
                                    const dLat = testDroneMission.currentLat || testDroneMission.waypoints[0].lat;
                                    const dLng = testDroneMission.currentLng || testDroneMission.waypoints[0].lng;
                                    setFlyTarget({ lat: dLat, lng: dLng, zoom: 19, timestamp: Date.now() });
                                },
                                contextmenu: (e) => {
                                    L.DomEvent.stopPropagation(e as any);
                                    if ((e as any).originalEvent) {
                                        (e as any).originalEvent.preventDefault();
                                        setContextMenu({
                                            x: (e as any).originalEvent.clientX,
                                            y: (e as any).originalEvent.clientY,
                                            type: 'drone',
                                            data: testDroneMission
                                        });
                                    }
                                }
                            }}
                        >
                            <Tooltip direction="top" className="font-mono text-xs">
                                🛸 {isKa ? 'დრონის მისია' : 'Drone Mission'}
                            </Tooltip>
                        </Marker>
                    </>
                )}
                    </MapContainer>

                    {/* 2D MAP COMPASS ROSE WIDGET (North Indicator) */}
                    <div className="absolute top-4 right-4 z-[1000] flex flex-col items-center pointer-events-auto select-none">
                        <button
                            type="button"
                            onClick={() => {
                                const target = labsPlantationCenter || currentCenter;
                                setFlyTarget({ lat: target[0], lng: target[1], zoom: 17, timestamp: Date.now() });
                                toast.info(isKa ? 'რუკა გასწორდა ჩრდილოეთზე' : '2D Map Re-centered to North (0° N)');
                            }}
                            className="w-12 h-12 rounded-full bg-slate-950/90 hover:bg-slate-900 border-2 border-cyan-500/70 shadow-2xl flex items-center justify-center backdrop-blur-md relative group hover:scale-105 active:scale-95 transition-all cursor-pointer"
                            title={isKa ? '2D კომპასი: ჩრდილოეთი (N)' : '2D Map Compass: True North (N)'}
                        >
                            <div className="w-full h-full rounded-full flex items-center justify-center relative">
                                <div className="absolute top-1.5 flex flex-col items-center">
                                    <span className="text-[10px] font-black text-rose-500 font-mono leading-none">N</span>
                                    <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[8px] border-b-rose-500 mt-0.5" />
                                </div>
                                <div className="absolute bottom-1.5 flex flex-col items-center">
                                    <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[8px] border-t-slate-400 mb-0.5" />
                                    <span className="text-[9px] font-bold text-slate-400 font-mono leading-none">S</span>
                                </div>
                                <span className="absolute right-1 text-[8px] font-bold text-slate-500 font-mono">E</span>
                                <span className="absolute left-1 text-[8px] font-bold text-slate-500 font-mono">W</span>
                                <div className="w-2 h-2 rounded-full bg-cyan-400 border border-slate-900" />
                            </div>
                        </button>
                        <div className="mt-1 px-1.5 py-0.5 rounded bg-slate-950/85 border border-slate-800 text-[9px] font-mono font-bold text-cyan-300 shadow">
                            0° N
                        </div>
                    </div>

                    {/* PLANTATION LOCATION PICKER BANNER */}
                    {isPickingPlantation && (
                        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1060] bg-slate-950/95 border-2 border-emerald-400 rounded-2xl p-3 shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-200">
                            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-xs font-bold text-emerald-200">
                                📍 {isKa ? 'დააწკაპუნეთ რუკაზე "აგრობარი" პლანტაციის ზუსტი ადგილის ასარჩევად' : 'Click anywhere on map to reposition Agrobari plantation'}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsPickingPlantation(false);
                                    if (activeTool === 'pick_plantation') setActiveTool('select');
                                }}
                                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                            >
                                {isKa ? 'გაუქმება' : 'Cancel'}
                            </button>
                        </div>
                    )}

                    {/* PERIMETER ACTION & GENERATION BAR */}
                    {(customSlopePerimeter.length >= 3 || activeTool === 'draw_perimeter' || activeTool === 'draw_slope') && (
                        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1050] bg-slate-950/95 border-2 border-fuchsia-500/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl flex flex-wrap items-center justify-center gap-2 max-w-[92vw] animate-in fade-in slide-in-from-top duration-200">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-fuchsia-950/70 rounded-xl text-fuchsia-300 font-mono text-xs border border-fuchsia-700/60">
                                <Hexagon size={14} className="text-fuchsia-400 animate-pulse" />
                                <span className="font-bold">{customSlopePerimeter.length} Points</span>
                            </div>

                            <button
                                type="button"
                                onClick={handleGenerateHillInsidePerimeter}
                                className="px-3 py-1.5 rounded-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs flex items-center gap-1.5 shadow active:scale-95 transition-all cursor-pointer"
                                title="Fit and generate 3D Hill / Ridge inside this perimeter"
                            >
                                <Mountain size={13} className="text-amber-200" />
                                <span>+ {isKa ? 'ბორცვის ჩასმა შიგნით' : 'Add Mound Inside'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleGenerateSlopeFromPerimeter}
                                className="px-3 py-1.5 rounded-xl font-bold bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white text-xs flex items-center gap-1.5 shadow active:scale-95 transition-all cursor-pointer"
                                title="Triangulate perimeter into 3D Uneven Slope Mesh layer"
                            >
                                <Sparkles size={13} className="text-fuchsia-200" />
                                <span>+ {isKa ? '3D ფერდობის გენერირება' : 'Generate 3D Slope'}</span>
                            </button>

                            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-300">
                                <span className="text-[10px] text-slate-400">Offset:</span>
                                <button
                                    type="button"
                                    onClick={() => handleElevatePerimeter(-2)}
                                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold cursor-pointer"
                                    title="Lower elevation offset -2m"
                                >
                                    -2m
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleElevatePerimeter(+2)}
                                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold cursor-pointer"
                                    title="Raise elevation offset +2m"
                                >
                                    +2m
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTool('select');
                                    toast.info(isKa ? 'პერიმეტრის რედაქტირება დასრულდა' : 'Finished drawing perimeter');
                                }}
                                className="px-2.5 py-1.5 rounded-xl font-bold bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                <Check size={13} />
                                <span>{isKa ? 'მზადაა' : 'Done'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleClearPerimeter}
                                className="p-1.5 rounded-xl bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-800 cursor-pointer transition-colors"
                                title="Clear perimeter"
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    )}

                    {/* FLOATING LIVE STREAM QUICK BAR & CAMERA SWITCHER DIRECTLY ON MAP */}
                    {testCameras.length > 0 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1050] max-w-[94vw] bg-[#FAFBF8]/95 border border-[#D8E3D4] rounded-2xl shadow-2xl backdrop-blur-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs text-[#163022] animate-in slide-in-from-bottom-2 duration-150">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                                <span className="font-black text-[11px] uppercase tracking-wider text-rose-600 flex items-center gap-1">
                                    <Video size={13} />
                                    {isKa ? 'ლაივ სტრიმი' : 'Live Stream'}
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-[#EEF3EA] text-[#4F6C5B] font-mono text-[10px] border border-[#D8E3D4] font-bold">
                                    {testCameras.length}
                                </span>
                            </div>

                            {/* Camera Channel Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[380px] sm:max-w-[480px] scrollbar-none py-0.5">
                                {testCameras.map(cam => {
                                    const isSelected = activeCameraId === cam.id;
                                    return (
                                        <button
                                            key={`live-strip-${cam.id}`}
                                            type="button"
                                            onClick={() => {
                                                setActiveCameraId(cam.id);
                                                setFlyTarget({ lat: cam.lat, lng: cam.lng, zoom: 19, timestamp: Date.now() });
                                                if (activeTool === 'live_stream') {
                                                    setLiveStreamCamera(cam);
                                                }
                                            }}
                                            className={`px-2 py-1 rounded-lg font-mono text-[10px] font-bold flex items-center gap-1 transition-all duration-200 shrink-0 cursor-pointer shadow-2xs ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-300 border border-blue-600'
                                                    : 'bg-white hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb] text-[#244130] border border-[#CFDCCB]'
                                            }`}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span>CH0{cam.channel}</span>
                                            <span className="max-w-[70px] truncate hidden sm:inline">{cam.name}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setLiveStreamCamera(activeCamera)}
                                    className="px-2.5 py-1 bg-white hover:bg-rose-600 hover:text-white hover:border-rose-600 text-[#244130] border border-[#CFDCCB] rounded-xl font-black uppercase text-[10px] tracking-wider flex items-center gap-1 shadow-2xs cursor-pointer transition-all duration-200 active:scale-95"
                                    title={isKa ? 'არჩეული კამერის პირდაპირი ეთერის ნახვა' : 'Watch active camera live RTSP stream'}
                                >
                                    <Video size={11} className="text-rose-500" />
                                    <span>{isKa ? 'ლაივ ეთერი' : 'Watch Live'}</span>
                                </button>

                                {/* Active Profile Plantation Quick Switcher & Fly Button */}
                                <div className="flex items-center gap-1 bg-white border border-[#CFDCCB] rounded-xl px-2 py-0.5 shadow-2xs">
                                    <Navigation size={11} className="text-[#16a34a] shrink-0" />
                                    <select
                                        value={selectedPlantationId}
                                        onChange={(e) => handleSelectPlantation(e.target.value)}
                                        className="bg-transparent text-[#1E3B2B] font-bold text-[10px] font-mono outline-none cursor-pointer max-w-[150px] truncate"
                                        title={isKa ? 'პლანტაციის არჩევა & გადაფრენა' : 'Select Plantation & Fly Map'}
                                    >
                                        {REGISTERED_PLANTATIONS.map((p, pIdx) => (
                                            <option key={`bottom-plant-${p.id}-${pIdx}`} value={p.id} className="bg-white text-[#163022]">
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectPlantation(selectedPlantationId)}
                                        className="p-1 hover:bg-[#16a34a] hover:text-white text-[#1E3B2B] rounded cursor-pointer transition-colors"
                                        title={isKa ? 'გადაფრენა' : 'Fly'}
                                    >
                                        <span className="text-[9px] font-black uppercase">FLY</span>
                                    </button>
                                </div>

                                {/* Device Control & Move Panel Quick Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveContextMode('camera');
                                        setIsModalPopUp(true);
                                        setIsPopUpMinimized(false);
                                    }}
                                    className="px-2.5 py-1 bg-white hover:bg-blue-600 hover:text-white hover:border-blue-600 text-[#244130] border border-[#CFDCCB] rounded-xl font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all duration-200 shadow-2xs"
                                    title={isKa ? 'მოწყობილობის მართვის პანელი & გადაადგილება' : 'Device Control Panel & Move Active Camera'}
                                >
                                    <Move size={11} className="text-blue-500" />
                                    <span>{isKa ? 'მართვა & გადატანა' : 'Device Control'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsAllCamerasWideOpen(true)}
                                    className="px-2.5 py-1 bg-white hover:bg-[#0891b2] hover:text-white hover:border-[#0891b2] text-[#244130] border border-[#CFDCCB] rounded-xl font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all duration-200 shadow-2xs"
                                    title={isKa ? 'ყველა კამერის სრული მატრიცა' : 'All Cameras Wide Matrix View'}
                                >
                                    <Layers size={11} />
                                    <span>{isKa ? 'მატრიცა' : 'Matrix'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsLanScannerModalOpen(true)}
                                    className="px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-[#244130] border border-[#CFDCCB] rounded-xl font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all duration-200 shadow-2xs"
                                    title={isKa ? 'LAN / NVR სკანერის გახსნა' : 'Open LAN / NVR Scanner'}
                                >
                                    <Radio size={11} />
                                    <span className="hidden sm:inline">LAN</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* FLOATING ONLINE WEATHER & AGRO MICROCLIMATE BADGE (Movable) */}
            <div className="absolute top-20 left-4 z-[2500]">
                <FloatingOnlineWeatherBadge
                    plantationFeatures={plantationFeatures}
                    activeOrgId={null}
                    isKa={isKa}
                    storageKey="agrimap_sandbox_weather_pos"
                    onFlyToCoords={(coords, name) => {
                        setFlyTarget({ lat: coords[0], lng: coords[1], zoom: 17, timestamp: Date.now() });
                        toast.success(isKa ? `რუკა გადაფრინდა: ${name}` : `Flying map to: ${name}`);
                    }}
                />
            </div>

            {/* FLOATING PERIMETER CONTROL CARD (When drawing or after drawing boundary) */}
            {(activeTool === 'draw_perimeter' || activeTool === 'draw_slope' || (customSlopePerimeter.length > 0 && selectedLayerId.startsWith('slope'))) && (
                <div className="absolute top-24 left-4 z-[1140] p-3 bg-[#FAFBF8]/95 border border-fuchsia-400 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col gap-2 text-xs text-[#163022] max-w-xs animate-in slide-in-from-left-2 duration-150">
                    <div className="flex items-center justify-between">
                        <span className="font-black text-fuchsia-800 flex items-center gap-1.5 uppercase text-[11px]">
                            📐 {isKa ? 'პერიმეტრის დახაზვა' : 'Perimeter Boundary'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-800 font-mono text-[10px] font-bold border border-fuchsia-300">
                            {customSlopePerimeter.length} pts
                        </span>
                    </div>
                    <p className="text-[11px] text-[#4F6C5B] leading-tight">
                        {isKa 
                            ? 'დააწკაპუნეთ რუკაზე წერტილების დასასმელად. წერტილები შეგიძლიათ გადაადგილოთ თაგვით.'
                            : 'Click map to place perimeter vertices. Drag any point to resize/reshape freely.'}
                    </p>
                    {customSlopePerimeter.length >= 2 && (
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#163022] bg-white p-1.5 rounded-lg border border-[#E2EBE0] shadow-2xs">
                            <span>Perimeter: <b>{measuredCustomPerimeterM}m</b></span>
                            {customPerimeterArea.ha > 0 && <span>Area: <b>{customPerimeterArea.ha} ha</b></span>}
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#D8E3D4]">
                        {customSlopePerimeter.length >= 3 && (
                            <button
                                type="button"
                                onClick={handleConvertPerimeterToSlope}
                                className="flex-1 py-1.5 px-2.5 bg-white hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500 hover:text-slate-950 text-[#1E3B2B] border border-[#CFDCCB] font-black rounded-xl text-[11px] flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition-all duration-200 active:scale-95"
                                title="Loft this perimeter into a 3D hill with central spine ridge & width cross-sections"
                            >
                                🏔️ {isKa ? '3D რელიეფად გარდაქმნა' : 'Loft to 3D Slope'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleDeleteLastEditedPoint}
                            disabled={customSlopePerimeter.length === 0}
                            className="py-1.5 px-2 bg-white hover:bg-rose-600 hover:text-white hover:border-rose-600 text-[#244130] font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 cursor-pointer border border-[#CFDCCB] shadow-2xs transition-all duration-200"
                            title="Delete last perimeter vertex (Backspace / ⌫)"
                        >
                            <Undo2 size={12} /> {isKa ? 'უკან' : 'Back'} ⌫
                        </button>
                        <button
                            type="button"
                            onClick={handleClearPerimeter}
                            className="py-1.5 px-2 bg-white hover:bg-red-600 hover:text-white hover:border-red-600 text-[#244130] font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 cursor-pointer border border-[#CFDCCB] shadow-2xs transition-all duration-200"
                            title="Clear drawn perimeter"
                        >
                            <Trash2 size={12} /> {isKa ? 'გასუფთავება' : 'Clear'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTool('select')}
                            className="py-1.5 px-2 bg-white hover:bg-[#0284c7] hover:text-white hover:border-[#0284c7] text-[#244130] font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 cursor-pointer border border-[#CFDCCB] shadow-2xs transition-all duration-200"
                        >
                            ✓ {isKa ? 'დასრულება' : 'Done'}
                        </button>
                    </div>
                </div>
            )}

            {/* FLOATING DRAW HILL RIDGE HELPER CARD */}
            {activeTool === 'draw_hill' && (
                <div className="absolute top-24 left-4 z-[1140] p-3 bg-[#FAFBF8]/95 border border-amber-400 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col gap-2 text-xs text-[#163022] max-w-xs animate-in slide-in-from-left-2 duration-150">
                    <div className="flex items-center justify-between">
                        <span className="font-black text-amber-800 flex items-center gap-1.5 uppercase text-[11px]">
                            🏔️ {isKa ? 'ბორცვის ქედის დახატვა' : 'Drawing Hill Ridge Spine'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono text-[10px] font-bold border border-amber-300">
                            {hillSpineProfile.points.length} pts
                        </span>
                    </div>
                    <p className="text-[11px] text-[#4F6C5B] leading-tight">
                        {isKa 
                            ? 'დააწკაპუნეთ რუკაზე წერტილების (A, B, C...) დასასმელად. წასაშლელად გამოიყენეთ Back ღილაკი ან Backspace.'
                            : 'Click on map to drop ridge points (A, B, C...). Press Back button or Backspace key to remove the last edited point.'}
                    </p>
                    {hillSpineProfile.points.length >= 2 && (
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#163022] bg-white p-1.5 rounded-lg border border-[#E2EBE0] shadow-2xs">
                            <span>Length: <b>{measuredHillLengthM}m</b></span>
                            <span>Apex: <b>+{activePoint.peakHeightM}m</b></span>
                        </div>
                    )}

                    {/* Pre-set Height for Next Point */}
                    <div className="p-2 rounded-xl bg-white border border-[#E2EBE0] space-y-1.5 font-mono text-[11px] shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-amber-800 font-bold flex items-center gap-1">
                                <Mountain size={12} /> {isKa ? 'წერტილის სიმაღლე (Z):' : 'Point Height (Z):'}
                            </span>
                            <span className="text-[#163022] font-black text-xs">
                                +{drawingPointHeight}m
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <input
                                type="range"
                                min="-10"
                                max="60"
                                value={drawingPointHeight}
                                onChange={(e) => setDrawingPointHeight(Number(e.target.value))}
                                className="flex-1 accent-amber-500 cursor-pointer"
                            />
                            <div className="flex items-center gap-1">
                                {[10, 20, 30, 45].map((h) => (
                                    <button
                                        key={`quick-h-${h}`}
                                        type="button"
                                        onClick={() => setDrawingPointHeight(h)}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all duration-200 border border-[#CFDCCB] shadow-2xs ${
                                            drawingPointHeight === h 
                                                ? 'bg-amber-500 text-slate-950 border-amber-500 font-black' 
                                                : 'bg-[#EEF3EA] text-[#244130] hover:bg-amber-500 hover:text-slate-900'
                                        }`}
                                    >
                                        +{h}m
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#D8E3D4]">
                        <button
                            type="button"
                            onClick={handleDeleteLastEditedPoint}
                            disabled={hillSpineProfile.points.length === 0}
                            className="flex-1 py-1.5 px-2 bg-white hover:bg-rose-600 hover:text-white hover:border-rose-600 text-[#244130] font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 cursor-pointer border border-[#CFDCCB] shadow-2xs transition-all duration-200"
                            title="Delete last edited point (Backspace / ⌫)"
                        >
                            <Undo2 size={12} /> {isKa ? 'უკან წაშლა' : 'Back'} ⌫
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteWholeSlope}
                            className="py-1.5 px-2 bg-white hover:bg-red-600 hover:text-white hover:border-red-600 text-[#244130] font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 cursor-pointer border border-[#CFDCCB] shadow-2xs transition-all duration-200"
                            title="Delete whole slope"
                        >
                            <Trash2 size={12} /> {isKa ? 'წაშლა' : 'Delete Slope'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTool('select')}
                            className="py-1.5 px-2 bg-white hover:bg-[#0284c7] hover:text-white hover:border-[#0284c7] text-[#244130] font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 cursor-pointer border border-[#CFDCCB] shadow-2xs transition-all duration-200"
                        >
                            ✓ {isKa ? 'დასრულება' : 'Done'}
                        </button>
                    </div>
                </div>
            )}

            {/* FLOATING TOP TOOLBAR */}
            <SandboxFloatingTopToolbar
                onOpenPlannerImport={() => setIsPlannerImportOpen(true)}
                activeTool={activeTool}
                onSelectTool={setActiveTool}
                isSlopeSculptorOpen={isSlopeSculptorOpen}
                onToggleSlopeSculptor={() => setIsSlopeSculptorOpen(!isSlopeSculptorOpen)}
                is3dWindowOpen={is3dWindowOpen}
                onToggle3dWindow={() => setIs3dWindowOpen(!is3dWindowOpen)}
                isLayerTreeOpen={isLayerTreeOpen}
                onToggleLayerTree={() => setIsLayerTreeOpen(!isLayerTreeOpen)}
                onUploadPhotoClick={() => photoInputRef.current?.click()}
                isVisibilityMenuOpen={isVisibilityMenuOpen}
                onToggleVisibilityMenu={() => setIsVisibilityMenuOpen(!isVisibilityMenuOpen)}
                hasSelectedObject={selectedObject !== null}
                onToggleDevicePanel={() => {
                    if (selectedObject) {
                        setSelectedObject(null);
                    } else {
                        setSelectedObject({ type: 'camera', data: activeCamera });
                    }
                }}
                tileMode={tileMode}
                onToggleTileMode={() => setTileMode(tileMode === 'satellite' ? 'streets' : 'satellite')}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                onOpenHardwareList={onSwitchTab ? () => onSwitchTab('bluetooth') : undefined}
                onFlyToPlantation={handleFlyToPlantation}
                onSaveCurrentAsPlantation={handleSaveCurrentAsPlantation}
                onSyncPlantationFromPlanner={handleSyncPlantationFromPlanner}
                onPickPlantationOnMap={handleStartPickPlantationLocation}
                isPickingPlantation={isPickingPlantation}
                savedPlantationCoords={labsPlantationCenter}
                savedPlantationName={mainPlantation.name}
                onSwap2d3d={() => setIs3dMainView(!is3dMainView)}
                onDeleteLastPoint={handleDeleteLastEditedPoint}
                canDeleteLastPoint={hillSpineProfile.points.length > 0 || customSlopePerimeter.length > 0}
                onDeleteSlope={handleDeleteWholeSlope}
                hasSlope={hillSpineProfile.points.length > 0 || customSlopePerimeter.length > 0}
                onClearMapFully={() => setIsClearMapConfirmOpen(true)}
                onOpenLanScanner={() => setIsLanScannerModalOpen(true)}
                onOpenLiveStreamTool={() => {
                    setActiveTool(activeTool === 'live_stream' ? 'select' : 'live_stream');
                    if (testCameras.length > 0) {
                        setLiveStreamCamera(activeCamera);
                    }
                }}
                onOpenAllCamerasWide={() => setIsAllCamerasWideOpen(true)}
                is3dMainView={is3dMainView}
                searchBar={
                    <SandboxLocationSearchBar
                        testCameras={testCameras}
                        testWorkersGps={testWorkersGps}
                        testDroneMission={testDroneMission}
                        testSoilSensors={testSoilSensors}
                        testWaterSensors={testWaterSensors}
                        hillSpineProfile={hillSpineProfile}
                        plantationFeatures={plantationFeatures}
                        onSelectLocation={(lat, lng, zoom, item) => {
                            setFlyTarget({ lat, lng, zoom: zoom || 19, timestamp: Date.now() });
                            if (item?.raw) {
                                const { type, data } = item.raw;
                                if (type === 'camera') {
                                    setActiveCameraId(data.id);
                                } else if (type === 'slope') {
                                    setIsSlopeSculptorOpen(true);
                                }
                            }
                        }}
                        isKa={isKa}
                    />
                }
                hiddenItemsCount={hiddenCameraIds.length}
                isKa={isKa}
            />

            {/* FLOATING VISIBILITY & LAYERS MENU */}
            <SandboxFloatingVisibilityMenu
                isOpen={isVisibilityMenuOpen}
                onClose={() => setIsVisibilityMenuOpen(false)}
                visibility={visibility}
                onToggleVisibilityKey={handleToggleVisibilityKey}
                onHideAll={() => {
                    handleToggleAllVisibility();
                    setHiddenCameraIds(testCameras.map(c => c.id));
                }}
                onShowAll={() => {
                    setVisibility({
                        showAll: true,
                        showCameras: true,
                        showDronePath: true,
                        showSoilSensors: true,
                        showWaterSensors: true,
                        showWorkersGps: true,
                        showWeatherStations: true,
                        showTrenches: false,
                        showSeedlings: false,
                        showBlindZones: true,
                        showDirections: true,
                        showMoundSlope: true,
                        showSectors: true,
                        showTopToolbar: true,
                        showTrenchConfigBar: false,
                        showBottomHud: true,
                        showFleetTable: false
                    });
                    setHiddenCameraIds([]);
                    toast.success(isKa ? 'ყველა ელემენტი გამოჩნდა' : 'All items visible on map');
                }}
                counts={{
                    cameras: testCameras.length,
                    workers: testWorkersGps.length,
                    soil: testSoilSensors.length,
                    water: testWaterSensors.length,
                    spinePoints: hillSpineProfile.points.length
                }}
                isKa={isKa}
            />

            {/* FLOATING LEFT PANEL: DEVICE CONFIGURATION (Camera, Drone, Worker, Soil, Water) */}
            <SandboxFloatingLeftPanel
                selectedObject={selectedObject}
                onClose={() => setSelectedObject(null)}
                testCameras={testCameras}
                activeCamera={activeCamera}
                onSelectCameraId={(id) => {
                    setActiveCameraId(id);
                    const cam = testCameras.find(c => c.id === id);
                    if (cam) setSelectedObject({ type: 'camera', data: cam });
                }}
                onUpdateActiveCamera={updateActiveCamera}
                onAddCamera={handleQuickAddCamera}
                onDuplicateCamera={handleDuplicateActiveCamera}
                onDeleteCamera={handleDeleteActiveCamera}
                hiddenCameraIds={hiddenCameraIds}
                onToggleHideCamera={handleToggleHideCamera}
                onMoveCameraOnMap={() => {
                    setActiveTool(activeTool === 'move_camera' ? 'select' : 'move_camera');
                    toast.info(isKa ? `დააწკაპუნეთ რუკაზე "${activeCamera.name}"-ის ახალ პოზიციაზე გადასაყვანად` : `Click anywhere on map to relocate "${activeCamera.name}" or drag its marker.`);
                }}
                isMovingCamera={activeTool === 'move_camera'}
                onOpenLiveStream={(cam) => setLiveStreamCamera(cam)}
                testDroneMission={testDroneMission}
                onUpdateDroneMission={(patch) => setTestDroneMission(prev => ({ ...prev, ...patch }))}
                onToggleTrench={handleToggleTrench}
                onFlySelectedTrenches={handleFlySelectedTrenches}
                plantationFeatures={plantationFeatures}
                testWorkersGps={testWorkersGps}
                testSoilSensors={testSoilSensors}
                testWaterSensors={testWaterSensors}
                isKa={isKa}
            />

            {/* Hidden Input for Field Photo (EXIF GPS & Compass Orientation) */}
            <input
                type="file"
                ref={photoInputRef}
                accept="image/*"
                onChange={handlePhotoFileUpload}
                className="hidden"
            />

            {/* WORKSPACE & LAYER TREE PANEL (Base Grid, Hill 1, Slope 1, Photo Pins) */}
            <SandboxLayerTreePanel
                isOpen={isLayerTreeOpen}
                onClose={() => setIsLayerTreeOpen(false)}
                selectedLayerId={selectedLayerId}
                onSelectLayer={(layerId) => {
                    setSelectedLayerId(layerId);
                    if (layerId.startsWith('hill') || layerId === 'hill_1') {
                        const found = hillProfiles.find(h => h.id === layerId);
                        if (found) setHillSpineProfile(found);
                        setIsSlopeSculptorOpen(true);
                    } else if (layerId.startsWith('slope') || layerId === 'slope_1') {
                        const found = slopeObjects.find(s => s.id === layerId) || (layerId === 'slope_1' ? slopeObjects[0] : undefined);
                        if (found && Array.isArray(found.vertices) && found.vertices.length > 0) {
                            setPerimeterVertices(found.vertices);
                            setCustomSlopePerimeter(found.vertices.map(v => [v.lat, v.lng]));
                        } else if (perimeterVertices.length > 0) {
                            setSlopeObjects(prev => prev.map(s => s.id === layerId ? { ...s, vertices: perimeterVertices } : s));
                        }
                        setIsSlopeSculptorOpen(true);
                    } else if (layerId === 'photo_pins' && photoPins.length > 0) {
                        setSelectedPhotoPin(photoPins[0]);
                        setIsPhotoModalOpen(true);
                    }
                }}
                hillProfiles={hillProfiles}
                slopeObjects={slopeObjects}
                photoPins={photoPins}
                baseGridVisible={layerVisibility.baseGrid}
                onToggleBaseGridVisibility={() => handleToggleLayerVisibility('baseGrid')}
                baseGridLocked={layerLocks.baseGrid}
                onToggleBaseGridLock={() => handleToggleLayerLock('baseGrid')}
                onAddHillLayer={handleAddHillLayer}
                onAddSlopeLayer={handleAddSlopeLayer}
                onDeleteHillLayer={handleDeleteHillLayer}
                onDeleteSlopeLayer={handleDeleteSlopeLayer}
                onToggleHillVisibility={handleToggleHillVisibility}
                onToggleSlopeVisibility={handleToggleSlopeVisibility}
                onToggleHillLock={handleToggleHillLock}
                onToggleSlopeLock={handleToggleSlopeLock}
                layerVisibility={layerVisibility}
                onToggleLayerVisibility={handleToggleLayerVisibility}
                layerLocks={layerLocks}
                onToggleLayerLock={handleToggleLayerLock}
                hillSpineProfile={hillSpineProfile}
                perimeterVertices={perimeterVertices}
                onUploadPhotoClick={() => photoInputRef.current?.click()}
                onSelectPhotoPin={(pin) => {
                    setSelectedPhotoPin(pin);
                    setIsPhotoModalOpen(true);
                }}
                onDeletePhotoPin={handleDeletePhotoPin}
                measuredHillLengthM={measuredHillLengthM}
                isKa={isKa}
            />

            {/* PHOTO INSPECTION MODAL (EXIF GPS & COMPASS HEADING VIEWER) */}
            {isPhotoModalOpen && selectedPhotoPin && (
                <PhotoInspectionModal
                    photo={selectedPhotoPin}
                    onClose={() => {
                        setIsPhotoModalOpen(false);
                        setSelectedPhotoPin(null);
                    }}
                    onDelete={(id) => {
                        handleDeletePhotoPin(id);
                    }}
                    onUpdateAzimuth={(id, azimuth) => {
                        const nextPins = photoPins.map(p => p.id === id ? { ...p, azimuthDeg: azimuth } : p);
                        setPhotoPins(nextPins);
                        savePhotoPins(nextPins);
                        setSelectedPhotoPin(prev => prev && prev.id === id ? { ...prev, azimuthDeg: azimuth } : prev);
                        setTerrainCounter(c => c + 1);
                    }}
                    isKa={isKa}
                />
            )}

            {/* FLOATING RIGHT PANEL: 3D MOUND & SLOPE SCULPTOR */}
            {isSlopeSculptorOpen && (
                <SandboxFloatingRightPanel
                    isOpen={isSlopeSculptorOpen}
                    onClose={() => setIsSlopeSculptorOpen(false)}
                    selectedLayerId={selectedLayerId}
                    onSelectLayer={(id) => setSelectedLayerId(id)}
                    hillSpineProfile={hillSpineProfile}
                    activePoint={activePoint}
                    activePointId={activePointId}
                    onSelectPointId={setActivePointId}
                    onUpdateActivePoint={updateActivePoint}
                    onUpdateHillSpineProfile={handleUpdateHillSpineProfile}
                    onAddSpinePoint={handleAddSpinePoint}
                    onInsertSpinePointAtMidpoint={handleInsertSpinePointAtMidpoint}
                    onDeleteSpinePoint={handleDeleteSpinePoint}
                    onDeleteLastPoint={handleDeleteLastEditedPoint}
                    canDeleteLastPoint={hillSpineProfile.points.length > 0 || customSlopePerimeter.length > 0}
                    onClearSlope={handleDeleteWholeSlope}
                    onDeleteWholeSlope={handleDeleteWholeSlope}
                    onStartDrawSlope={handleStartNewSlope}
                    onFitSlopeToOrchard={handleFitSlopeToOrchard}
                    measuredHillLengthM={measuredHillLengthM}
                    moundMetrics={moundMetrics}
                    isAiSlopeScanning={isAiSlopeScanning}
                    onAiAutoDetectSlope={handleAiAutoDetectSlope}
                    onLoadSatelliteDem={handleLoadSatelliteDem}
                    baseElevationM={480}
                    perimeterVertices={perimeterVertices}
                    onUpdatePerimeterVertex={handleUpdatePerimeterVertex}
                    onAddPerimeterVertex={handleAddPerimeterVertex}
                    onDeletePerimeterVertex={handleDeletePerimeterVertex}
                    onStartDrawPerimeter={() => {
                        setActiveTool('draw_perimeter');
                        toast.info(isKa ? 'დააწკაპუნეთ რუკაზე პერიმეტრის წერტილების დასასმელად' : 'Click on map to place perimeter boundary points');
                    }}
                    isKa={isKa}
                />
            )}

            {/* 3D FULL VIEW MODE (WHEN 3D IS SWAPPED TO MAIN VIEWPORT) */}
            {is3dMainView && (
                <div className="absolute inset-0 z-0 w-full h-full bg-slate-950 overflow-hidden">
                    {!is3dConnected ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-radial from-slate-900 to-slate-950 text-slate-100 select-none">
                            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/5">
                                <Layers className="w-8 h-8" />
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] font-mono text-emerald-400 mb-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                {isKa ? 'გარე ინსტრუმენტი (Standby)' : 'External Tool (Zero-RAM Standby)'}
                            </div>
                            <h3 className="text-base font-black text-white tracking-wide mb-1">
                                {isKa ? '3D DEM რელიეფის ძრავა (Three.js WebGL)' : '3D DEM Terrain Studio (WebGL)'}
                            </h3>
                            <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-5">
                                {isKa 
                                    ? '3D რელიეფი დგას პროექტის გარეთ ოპტიმალური სისწრაფისთვის. დააჭირეთ დაკავშირების ღილაკს მხოლოდ მაშინ, როდესაც გჭირდებათ 3D რელიეფის შემოწმება.'
                                    : 'The 3D Terrain Engine stands outside the project to maximize speed and preserve GPU memory. Connect it only when 3D inspection is required.'}
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleConnect3D}
                                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>{isKa ? '3D-ს პროექტთან დაკავშირება' : 'Connect 3D View to Project'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIs3dMainView(false)}
                                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                                >
                                    {isKa ? '2D რუკაზე დაბრუნება' : 'Back to 2D Map'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Top Disconnect Action Bar */}
                            <div className="absolute top-4 left-4 z-[1200] flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleDisconnect3D}
                                    className="px-3 py-1.5 bg-red-600/90 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer transition-all active:scale-95"
                                    title={isKa ? '3D-ს გათიშვა Standby რეჟიმში' : 'Disconnect 3D to Standby'}
                                >
                                    <span>🔌 {isKa ? '3D-ს გათიშვა (Standby)' : 'Disconnect 3D (Standby)'}</span>
                                </button>
                            </div>

                            <Suspense fallback={
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-mono text-xs gap-3">
                                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    <span>Loading 3D Three.js Terrain Engine...</span>
                                </div>
                            }>
                                <Sandbox3DTerrainCanvas
                                    cameras={testCameras}
                                    activeCameraId={activeCamera.id}
                                    onSelectCamera={setActiveCameraId}
                                    onSelectDevice={handleSelectDevice}
                                    elevationExaggeration={elevationExaggeration}
                                    soilSensors={testSoilSensors}
                                    waterSensors={testWaterSensors}
                                    workersGps={testWorkersGps}
                                    droneMission={testDroneMission}
                                    baseLat={baseLat}
                                    baseLng={baseLng}
                                    hillSpineProfile={hillSpineProfile}
                                    hillProfiles={hillProfiles}
                                    slopeObjects={slopeObjects}
                                    onAddSpinePoint={handleAddSpinePointAtCoords}
                                    onUpdateSpinePoint={updatePointById}
                                    onUpdatePerimeterVertex={handleUpdatePerimeterVertex}
                                    onDeleteLastPoint={handleDeleteLastEditedPoint}
                                    onDeleteSlope={handleDeleteWholeSlope}
                                    onDeleteSpinePoint={handleDeleteSpinePoint}
                                    showBaseGrid={layerVisibility.baseGrid}
                                    showHill1={layerVisibility.hill1}
                                    showSlope1={layerVisibility.slope1}
                                    showPhotoPins={layerVisibility.photoPins}
                                    perimeterVertices={perimeterVertices}
                                    photoPins={photoPins}
                                    onSelectPhotoPin={(pin) => {
                                        setSelectedPhotoPin(pin);
                                        setIsPhotoModalOpen(true);
                                    }}
                                    viewMode={sandbox3dMode}
                                    hiddenCameraIds={hiddenCameraIds}
                                    isSatelliteDemLoaded={isSatelliteDemLoaded}
                                    terrainUpdateCounter={terrainCounter}
                                    isMainFullView={true}
                                    onSwap2d3d={() => setIs3dMainView(false)}
                                    onSwitchTo2D={() => setIs3dMainView(false)}
                                    isKa={isKa}
                                />
                            </Suspense>
                        </>
                    )}

                    {/* Restore 2D MiniMap floating button if PiP was closed */}
                    {isPiPHidden && (
                        <button
                            type="button"
                            onClick={() => setIsPiPHidden(false)}
                            className="fixed bottom-4 right-4 z-[1200] px-4 py-2 bg-[#FAFBF8]/95 border border-[#CFDCCB] text-[#1E3B2B] hover:bg-[#0284c7] hover:text-white hover:border-[#0284c7] rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-2xl backdrop-blur-xl cursor-pointer transition-all duration-200 active:scale-95"
                        >
                            <MapIcon size={14} className="text-[#0284c7]" />
                            <span>🗺️ {isKa ? '2D რუკის გამოჩენა' : 'Show 2D MiniMap'}</span>
                        </button>
                    )}
                </div>
            )}

            {/* FLOATING 3D PIP VIEWPORT WINDOW (WHEN 2D IS MAIN) */}
            {!is3dMainView && is3dWindowOpen && (
                <div 
                    data-pip-container="true"
                    style={pipPos ? {
                        position: 'absolute',
                        left: `${pipPos.x}px`,
                        top: `${pipPos.y}px`,
                        bottom: 'auto',
                        right: 'auto'
                    } : undefined}
                    className={`
                        ${is3dWindowMaximized 
                            ? 'fixed inset-4 z-[2500] rounded-3xl' 
                            : is3dMinimized
                                ? 'absolute bottom-4 right-4 z-[1150] w-auto h-auto'
                                : 'absolute bottom-4 right-4 z-[1150] w-[360px] sm:w-[460px] h-[280px] sm:h-[350px] rounded-2xl'
                        }
                        bg-[#FAFBF8]/95 border border-[#D8E3D4] shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col transition-all text-[#163022]
                    `}
                >
                    {is3dMinimized ? (
                        <div className="p-2 bg-[#EEF3EA] border border-[#D8E3D4] rounded-xl flex items-center gap-2 text-xs text-[#163022]">
                            <span className="w-2 h-2 rounded-full bg-[#0284c7] animate-pulse" />
                            <span className="font-mono font-bold text-[#163022]">3D DEM PiP</span>
                            <button
                                type="button"
                                onClick={() => setIs3dMinimized(false)}
                                className="px-2.5 py-1 bg-white hover:bg-[#0284c7] hover:text-white text-[#244130] border border-[#CFDCCB] text-[10px] font-bold rounded cursor-pointer transition-all duration-200"
                            >
                                Expand
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* PiP Header with Drag Handle */}
                            <div 
                                onPointerDown={handlePipPointerDown}
                                onPointerMove={handlePipPointerMove}
                                onPointerUp={handlePipPointerUp}
                                className="p-2 sm:p-2.5 bg-[#EEF3EA] border-b border-[#D8E3D4] flex items-center justify-between text-xs shrink-0 select-none cursor-grab active:cursor-grabbing text-[#163022]"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#0284c7] animate-pulse" />
                                    <span className="font-black text-[#163022] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                        🌐 3D DEM Sandbox
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    {/* Disconnect 3D button when active */}
                                    {is3dConnected && (
                                        <button
                                            type="button"
                                            onClick={handleDisconnect3D}
                                            className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                                            title={isKa ? '3D-ს გათიშვა Standby რეჟიმში' : 'Disconnect 3D to external standby'}
                                        >
                                            <span>🔌 {isKa ? 'გათიშვა' : 'Disconnect'}</span>
                                        </button>
                                    )}

                                    {/* Swap 2D / 3D Button */}
                                    <button
                                        type="button"
                                        onClick={() => setIs3dMainView(true)}
                                        className="px-2.5 py-1 bg-white hover:bg-[#0284c7] hover:text-white text-[#244130] border border-[#CFDCCB] font-bold rounded text-[10px] flex items-center gap-1 cursor-pointer transition-all duration-200 shadow-2xs"
                                        title="Swap places: make 3D the full screen main window"
                                    >
                                        <span>⇄ Swap</span>
                                    </button>

                                    {/* 3D View Angle Mode Buttons */}
                                    <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-[#CFDCCB] text-[10px]">
                                        <button
                                            type="button"
                                            onClick={() => setSandbox3dMode('orbit')}
                                            className={`px-2 py-0.5 rounded font-bold transition-all duration-200 ${sandbox3dMode === 'orbit' ? 'bg-[#0284c7] text-white shadow-xs' : 'text-[#244130] hover:bg-[#0284c7] hover:text-white'}`}
                                            title="3D Orbit Mode"
                                        >
                                            Orbit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSandbox3dMode('drone_cockpit')}
                                            className={`px-2 py-0.5 rounded font-bold transition-all duration-200 ${sandbox3dMode === 'drone_cockpit' ? 'bg-[#0284c7] text-white shadow-xs' : 'text-[#244130] hover:bg-[#0284c7] hover:text-white'}`}
                                            title="Drone POV Cockpit"
                                        >
                                            Drone
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSandbox3dMode('camera_fov')}
                                            className={`px-2 py-0.5 rounded font-bold transition-all duration-200 ${sandbox3dMode === 'camera_fov' ? 'bg-[#2563eb] text-white shadow-xs' : 'text-[#244130] hover:bg-[#2563eb] hover:text-white'}`}
                                            title="Active Camera Lens POV"
                                        >
                                            Cam
                                        </button>
                                    </div>

                                    {/* Minimize */}
                                    <button
                                        type="button"
                                        onClick={() => setIs3dMinimized(true)}
                                        className="p-1 text-[#4A6753] hover:text-[#163022] rounded hover:bg-[#D8E3D4] cursor-pointer transition-colors"
                                        title="Minimize 3D Window"
                                    >
                                        <Minimize2 size={13} />
                                    </button>

                                    {/* Maximize / Solo */}
                                    <button
                                        type="button"
                                        onClick={() => setIs3dWindowMaximized(!is3dWindowMaximized)}
                                        className="p-1 text-[#4A6753] hover:text-[#163022] rounded hover:bg-[#D8E3D4] cursor-pointer transition-colors"
                                        title={is3dWindowMaximized ? 'Restore Window' : 'Maximize 3D Window'}
                                    >
                                        <Maximize2 size={13} />
                                    </button>

                                    {/* Close */}
                                    <button
                                        type="button"
                                        onClick={() => setIs3dWindowOpen(false)}
                                        className="p-1 text-[#4A6753] hover:text-[#163022] rounded hover:bg-[#D8E3D4] cursor-pointer transition-colors"
                                        title="Close 3D Window"
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                            </div>

                            {/* 3D Canvas Body */}
                            <div className="flex-1 w-full relative bg-slate-950 overflow-hidden">
                                {!is3dConnected ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-radial from-slate-900 to-slate-950 select-none">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2.5">
                                            <Layers className="w-6 h-6" />
                                        </div>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-emerald-400 mb-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            {isKa ? 'გარე ინსტრუმენტი (Standby)' : 'Standby (Zero-RAM Tool)'}
                                        </div>
                                        <p className="text-[11px] text-slate-400 max-w-xs mb-3 leading-relaxed">
                                            {isKa 
                                                ? '3D რელიეფის ძრავა დგას პროექტის გარეთ. დააჭირეთ დაკავშირებას მხოლოდ საჭიროებისას.' 
                                                : '3D Terrain Engine stands outside the project. Connect only when needed.'}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleConnect3D}
                                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/30 transition-transform active:scale-95"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>{isKa ? '3D-ს დაკავშირება' : 'Connect 3D View'}</span>
                                        </button>
                                    </div>
                                ) : (
                                    <Suspense fallback={
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-mono text-xs gap-2">
                                            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                            <span>Loading 3D Three.js Engine...</span>
                                        </div>
                                    }>
                                        <Sandbox3DTerrainCanvas
                                            cameras={testCameras}
                                            activeCameraId={activeCamera.id}
                                            onSelectCamera={setActiveCameraId}
                                            onSelectDevice={handleSelectDevice}
                                            elevationExaggeration={elevationExaggeration}
                                            soilSensors={testSoilSensors}
                                            waterSensors={testWaterSensors}
                                            workersGps={testWorkersGps}
                                            droneMission={testDroneMission}
                                            baseLat={baseLat}
                                            baseLng={baseLng}
                                            hillSpineProfile={hillSpineProfile}
                                            hillProfiles={hillProfiles}
                                            slopeObjects={slopeObjects}
                                            onAddSpinePoint={handleAddSpinePointAtCoords}
                                            onUpdateSpinePoint={updatePointById}
                                            onUpdatePerimeterVertex={handleUpdatePerimeterVertex}
                                            onDeleteLastPoint={handleDeleteLastEditedPoint}
                                            onDeleteSlope={handleDeleteWholeSlope}
                                            onDeleteSpinePoint={handleDeleteSpinePoint}
                                            showBaseGrid={layerVisibility.baseGrid}
                                            showHill1={layerVisibility.hill1}
                                            showSlope1={layerVisibility.slope1}
                                            showPhotoPins={layerVisibility.photoPins}
                                            perimeterVertices={perimeterVertices}
                                            photoPins={photoPins}
                                            onSelectPhotoPin={(pin) => {
                                                setSelectedPhotoPin(pin);
                                                setIsPhotoModalOpen(true);
                                            }}
                                            viewMode={sandbox3dMode}
                                            hiddenCameraIds={hiddenCameraIds}
                                            isSatelliteDemLoaded={isSatelliteDemLoaded}
                                            terrainUpdateCounter={terrainCounter}
                                            onSwap2d3d={() => setIs3dMainView(true)}
                                            isKa={isKa}
                                        />
                                    </Suspense>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Floating Measurement HUD pill on Map */}
            {visibility.showBottomHud !== false && (
                <div className="absolute bottom-3 left-3 z-[1000] flex flex-wrap items-center gap-2 pointer-events-none select-none">
                    <div className="px-3 py-1.5 bg-slate-950/90 border border-slate-800/90 rounded-xl text-xs font-mono text-slate-300 shadow-xl backdrop-blur-md flex items-center gap-2.5 pointer-events-auto">
                        <span className="flex items-center gap-1 text-amber-400 font-bold">
                            <Mountain size={13} /> Ridge: {measuredHillLengthM}m
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="flex items-center gap-1 text-cyan-400 font-bold">
                            Peak: {activePoint.peakHeightM > 0 ? `+${activePoint.peakHeightM}` : activePoint.peakHeightM}m
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                            Perimeter: {measuredMoundPerimeterM}m
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-blue-400 font-bold">
                            Cameras: {testCameras.length - hiddenCameraIds.length}/{testCameras.length}
                        </span>
                    </div>
                </div>
            )}

            {/* BOTTOM DEVICE INSPECTOR PANEL (Appears when clicking device next to Ridge or on map) */}
            <SandboxBottomDevicePanel
                selectedObject={selectedObject}
                onClose={() => setSelectedObject(null)}
                onOpenLiveStream={(cam) => setLiveStreamCamera(cam)}
                onMoveDeviceOnMap={(type) => {
                    if (type === 'camera') {
                        setActiveTool(activeTool === 'move_camera' ? 'select' : 'move_camera');
                        toast.info(isKa ? 'დააწკაპუნეთ რუკაზე ახალი პოზიციის ასარჩევად' : 'Click on map to set new position');
                    }
                }}
                onDeleteDevice={(type, id) => {
                    if (type === 'camera') {
                        setTestCameras(prev => prev.filter(c => c.id !== id));
                        setSelectedObject(null);
                        toast.success(isKa ? 'კამერა წაშლილია' : 'Camera deleted');
                    } else if (type === 'soil') {
                        setTestSoilSensors(prev => prev.filter(s => s.id !== id));
                        setSelectedObject(null);
                        toast.success(isKa ? 'სენსორი წაშლილია' : 'Soil sensor removed');
                    } else if (type === 'water') {
                        setTestWaterSensors(prev => prev.filter(w => w.id !== id));
                        setSelectedObject(null);
                        toast.success(isKa ? 'სადგური წაშლილია' : 'Water station removed');
                    } else if (type === 'weather') {
                        setTestWeatherStations(prev => prev.filter(w => w.id !== id));
                        setSelectedObject(null);
                        toast.success(isKa ? 'მეტეო სადგური წაშლილია' : 'Weather station removed');
                    } else if (type === 'slope_point') {
                        handleDeleteSpinePoint(id);
                        setSelectedObject(null);
                    } else if (type === 'worker') {
                        setTestWorkersGps(prev => prev.filter(w => w.id !== id));
                        setSelectedObject(null);
                        toast.success(isKa ? 'მუშაკი წაშლილია' : 'Worker removed');
                    }
                }}
                onToggleHideCamera={handleToggleHideCamera}
                isHiddenCamera={selectedObject?.type === 'camera' ? hiddenCameraIds.includes(selectedObject.data?.id) : false}
                onUpdateCamera={updateActiveCamera}
                ridgeElevationBaseM={480}
                isKa={isKa}
            />

            {/* FLOATING DRONE LIVE CAMERA STREAM WINDOW */}
            {isDroneLiveCameraOpen && (
                <div className="fixed bottom-4 right-4 z-[2600] w-96 bg-[#FAFBF8]/95 border border-[#D8E3D4] rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl text-xs text-[#163022]">
                    <div className="p-3 bg-[#EEF3EA] border-b border-[#D8E3D4] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#0284c7] animate-pulse" />
                            <span className="font-black uppercase tracking-wider text-[#163022] text-xs">
                                🛸 {isKa ? 'დრონის პირდაპირი კამერის ხედი' : 'Drone Live Gimbal Feed'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {testDroneMission.isRecordingVideo && (
                                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-mono text-[9px] font-bold animate-pulse flex items-center gap-1 shadow-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white" /> REC 00:{testDroneMission.recordingSeconds < 10 ? `0${testDroneMission.recordingSeconds}` : testDroneMission.recordingSeconds}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsDroneLiveCameraOpen(false)}
                                className="p-1 text-[#4A6753] hover:text-[#163022] rounded-lg hover:bg-[#D8E3D4] cursor-pointer transition-colors"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                    <div className="relative w-full h-52 bg-slate-900 overflow-hidden flex items-center justify-center">
                        <img 
                            src="https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=800&q=80" 
                            alt="Drone Aerial Feed" 
                            className="w-full h-full object-cover brightness-95 contrast-105"
                        />
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-20 h-20 border border-cyan-400/50 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                            </div>
                        </div>
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg font-mono text-[10px] text-cyan-300">
                            ALT: {testDroneMission.currentAlt}m • SPD: {testDroneMission.speedMs} m/s
                        </div>
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg font-mono text-[10px] text-emerald-400">
                            BAT: {testDroneMission.batteryPct}% • ZOOM: {testDroneMission.opticalZoom}x
                        </div>
                    </div>

                    <div className="p-3 bg-[#FAFBF8] flex items-center justify-between gap-2 border-t border-[#D8E3D4]">
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleDroneTakePhoto('Active Aerial View')}
                                className="px-3 py-1.5 bg-white hover:bg-[#0284c7] hover:text-white text-[#244130] border border-[#CFDCCB] rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-all duration-200 shadow-2xs"
                            >
                                <PhotoIcon size={12} /> Photo
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDroneToggleRecordVideo('Active Aerial View')}
                                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-all duration-200 shadow-2xs ${
                                    testDroneMission.isRecordingVideo 
                                        ? 'bg-red-600 text-white border border-red-600' 
                                        : 'bg-white hover:bg-[#dc2626] hover:text-white text-[#244130] border border-[#CFDCCB]'
                                }`}
                            >
                                <Film size={12} /> {testDroneMission.isRecordingVideo ? 'Stop' : 'Record'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LIVE SURVEILLANCE CAMERA STREAM MODAL */}
            {liveStreamCamera && (
                <CameraLiveMonitorWindow
                    camera={liveStreamCamera}
                    onClose={() => setLiveStreamCamera(null)}
                    onOpenAllCamerasWide={() => {
                        setIsAllCamerasWideOpen(true);
                    }}
                />
            )}

            {/* WIDE SURVEILLANCE ALL CAMERAS MATRIX MODAL */}
            {isAllCamerasWideOpen && (
                <AllCamerasWideModal
                    isOpen={isAllCamerasWideOpen}
                    onClose={() => setIsAllCamerasWideOpen(false)}
                    cameras={testCameras}
                    onSelectCameraForDetail={(cam) => {
                        setActiveCameraId(cam.id);
                        setLiveStreamCamera(cam);
                    }}
                />
            )}

            {/* UNIVERSAL LAN & NVR HARDWARE SCANNER MODAL */}
            {isLanScannerModalOpen && (
                <UniversalLanDeviceScannerModal
                    isOpen={isLanScannerModalOpen}
                    onClose={() => setIsLanScannerModalOpen(false)}
                    mapCenter={plantationCenter}
                    onDeployCamera={(cam) => {
                        setTestCameras(prev => {
                            const exists = prev.some(c => c.id === cam.id || c.ipAddress === cam.ipAddress);
                            const updated = exists ? prev.map(c => c.ipAddress === cam.ipAddress ? cam : c) : [...prev, cam];
                            safeStorage.setItem('agrimap_sandbox_test_cameras', JSON.stringify(updated));
                            return updated;
                        });
                        setActiveCameraId(cam.id);
                    }}
                    onDeployAllNvrCameras={(cams) => {
                        setTestCameras(prev => {
                            const map = new Map(prev.map(c => [c.id, c]));
                            cams.forEach(c => map.set(c.id, c));
                            const updated = Array.from(map.values());
                            safeStorage.setItem('agrimap_sandbox_test_cameras', JSON.stringify(updated));
                            return updated;
                        });
                        if (cams.length > 0) setActiveCameraId(cams[0].id);
                    }}
                    onDeployDrone={(droneData) => {
                        setTestDroneMission(prev => ({
                            ...prev,
                            droneName: droneData.name,
                            flightMode: droneData.flightMode || 'LOITER',
                            batteryPct: droneData.batteryPct || 94
                        }));
                    }}
                    onDeployGps={(gpsData) => {
                        setTestWorkersGps(prev => {
                            const newWorker: SandboxWorkerGps = {
                                id: gpsData.id || `gps-${Date.now()}`,
                                workerName: gpsData.workerName || 'RTK Field Worker',
                                badgeCode: `RTK-0${prev.length + 1}`,
                                role: 'Field Rover GNSS',
                                lat: gpsData.lat,
                                lng: gpsData.lng,
                                speedKmh: 0.8,
                                batteryPct: gpsData.batteryPct || 95,
                                heartRateBpm: 72,
                                status: 'ACTIVE'
                            };
                            const updated = [...prev, newWorker];
                            safeStorage.setItem('agrimap_sandbox_test_workers', JSON.stringify(updated));
                            return updated;
                        });
                    }}
                    onDeploySoilSensor={(soilData) => {
                        setTestSoilSensors(prev => {
                            const newSoil: SandboxSoilSensor = {
                                id: soilData.id || `soil-${Date.now()}`,
                                name: soilData.name || 'Discovered Soil Station',
                                type: 'SOIL_MOISTURE_NPK',
                                lat: soilData.lat,
                                lng: soilData.lng,
                                moistureVwc: soilData.moisturePct || 32,
                                temperatureC: 18,
                                ecMsCm: soilData.soilEcDsm || 1.2,
                                nitrogenPpm: 45,
                                phosphorusPpm: 22,
                                potassiumPpm: 88,
                                batteryPct: 95,
                                signalRssi: -65,
                                depthCm: soilData.depthCm || 40,
                                status: 'OPTIMAL'
                            };
                            const updated = [...prev, newSoil];
                            safeStorage.setItem('agrimap_sandbox_test_soil', JSON.stringify(updated));
                            return updated;
                        });
                    }}
                    onDeployWeatherStation={(weatherData) => {
                        setTestWeatherStations(prev => {
                            const newStation: SandboxWeatherStation = {
                                id: weatherData.id || `weather-${Date.now()}`,
                                name: weatherData.name || 'Davis Vantage Pro2 Weather Station',
                                model: weatherData.model || 'Davis Vantage Pro2 Plus',
                                ipAddress: weatherData.ipAddress || '192.168.1.150',
                                port: weatherData.port || 22222,
                                lat: weatherData.lat,
                                lng: weatherData.lng,
                                tempC: weatherData.tempC || 19.2,
                                humidityPct: weatherData.humidityPct || 58,
                                windSpeedKmh: weatherData.windSpeedKmh || 9.4,
                                windDirectionDeg: 240,
                                solarRadiationWm2: weatherData.solarRadiationWm2 || 620,
                                rainMm: 0.0,
                                pressureHpa: 1016.2,
                                status: 'ONLINE',
                                lastUpdated: 'Just now'
                            };
                            const updated = [...prev.filter(w => w.id !== newStation.id), newStation];
                            safeStorage.setItem('agrimap_sandbox_test_weather_stations', JSON.stringify(updated));
                            return updated;
                        });
                    }}
                    onOpenLiveStream={(cam) => {
                        setLiveStreamCamera(cam);
                    }}
                />
            )}

            {/* EXPORT CONFIRMATION MODAL */}
            {isExportModalOpen && (
                <div className="fixed inset-0 z-[3000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-[#FAFBF8] border border-[#D8E3D4] rounded-3xl p-6 shadow-2xl space-y-4 text-[#163022]">
                        <div className="flex items-center justify-between border-b border-[#D8E3D4] pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-[#EEF3EA] text-[#16a34a] border border-[#CFDCCB]">
                                    <Layers size={18} />
                                </div>
                                <h3 className="text-base font-black text-[#163022] uppercase tracking-wide">
                                    {isKa ? 'მთავარ რუკაზე ახალ ფენად დამატება' : 'Export Tested Hardware as New Layer'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsExportModalOpen(false)}
                                className="p-1.5 text-[#4A6753] hover:text-[#163022] rounded-xl hover:bg-[#EEF3EA] cursor-pointer transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <p className="text-xs text-[#4A6753] leading-relaxed">
                            {isKa 
                                ? 'თქვენ მიერ ლაბორატორიაში წარმატებით გამოცდილი მოწყობილობები დაემატება მთავარ რუკაზე დამოუკიდებელ ახალ ფენად.' 
                                : 'All tested hardware components will be committed as a pristine new layer on your Main Map Planner.'}
                        </p>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-[#4A6753]">
                                {isKa ? 'ფენის დასახელება' : 'New Layer Name'}
                            </label>
                            <input
                                type="text"
                                value={exportLayerName}
                                onChange={(e) => setExportLayerName(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white border border-[#CFDCCB] rounded-xl text-[#163022] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                            />
                        </div>

                        <div className="p-3 bg-[#EEF3EA] rounded-2xl border border-[#D8E3D4] space-y-1 text-xs font-mono text-[#2D4536]">
                            <div className="text-blue-700 font-bold">• {testCameras.length} Surveillance Cameras (ColorVu / PTZ with Tilt 4°)</div>
                            <div className="text-cyan-700 font-bold">• 1 Drone Mission ({testDroneMission.waypoints.length} Waypoints)</div>
                            <div className="text-emerald-700 font-bold">• {testSoilSensors.length} Soil Moisture & NPK Probes</div>
                            <div className="text-sky-700 font-bold">• {testWaterSensors.length} Water Flow Stations</div>
                            <div className="text-purple-700 font-bold">• {testWorkersGps.length} Worker GPS Trackers</div>
                            <div className="text-amber-700 font-bold">• 3D Ridge Slope Profile ({measuredHillLengthM}m, {hillSpineProfile.points.length} Cross-sections)</div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#D8E3D4]">
                            <button
                                type="button"
                                onClick={() => setIsExportModalOpen(false)}
                                className="px-4 py-2 bg-white hover:bg-[#64748b] hover:text-white text-[#244130] border border-[#CFDCCB] rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs"
                            >
                                {isKa ? 'გაუქმება' : 'Cancel'}
                            </button>
                            <button
                                type="button"
                                onClick={handleCommitToMainMapPlanner}
                                className="px-5 py-2.5 bg-white hover:bg-[#16a34a] hover:text-white text-[#16a34a] border border-[#16a34a] rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 transition-all duration-200"
                            >
                                <Check size={14} className="stroke-[3]" />
                                <span>{isKa ? 'დადასტურება & ფენის დამატება' : 'Confirm & Deploy Layer'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MASTER HARDWARE POP-UP (ONLY IF EXPLICITLY OPENED) */}
            <HardwareAndDroneControlPopUp
                isOpen={isModalPopUp}
                onClose={() => setIsModalPopUp(false)}
                isMinimized={isPopUpMinimized}
                onToggleMinimize={() => setIsPopUpMinimized(!isPopUpMinimized)}
                isMaximized={isPopUpMaximized}
                onToggleMaximize={() => setIsPopUpMaximized(!isPopUpMaximized)}
                activeMode={activeContextMode}
                onChangeMode={setActiveContextMode}
                registeredPlantations={REGISTERED_PLANTATIONS}
                selectedPlantationId={selectedPlantationId}
                onSelectPlantation={handleSelectPlantation}
                testCameras={testCameras}
                activeCamera={activeCamera}
                onSelectCamera={(id) => {
                    setActiveCameraId(id);
                    const cam = testCameras.find(c => c.id === id);
                    if (cam) setSelectedObject({ type: 'camera', data: cam });
                }}
                onUpdateActiveCamera={updateActiveCamera}
                onAddCamera={handleQuickAddCamera}
                onDuplicateCamera={handleDuplicateActiveCamera}
                onDeleteActiveCamera={handleDeleteActiveCamera}
                hiddenCameraIds={hiddenCameraIds}
                onToggleHideCamera={handleToggleHideCamera}
                onToggleHideAllCameras={handleToggleAllCamerasVisibility}
                onMoveActiveCameraOnMap={() => {
                    setActiveTool(activeTool === 'move_camera' ? 'select' : 'move_camera');
                    toast.info(isKa ? `დააწკაპუნეთ რუკაზე "${activeCamera.name}"-ის ახალ პოზიციაზე გადასაყვანად` : `Click anywhere on map to relocate "${activeCamera.name}" or drag its marker.`);
                }}
                isMovingCamera={activeTool === 'move_camera'}
                onOpenLiveCameraStream={(cam) => setLiveStreamCamera(cam)}
                testDroneMission={testDroneMission}
                onUpdateDroneMission={(patch) => setTestDroneMission(prev => ({ ...prev, ...patch }))}
                onFlySelectedTrenches={handleFlySelectedTrenches}
                onToggleTrench={handleToggleTrench}
                onDroneTakePhoto={handleDroneTakePhoto}
                onDroneToggleRecordVideo={handleDroneToggleRecordVideo}
                isDroneLiveFeedOpen={isDroneLiveCameraOpen}
                onToggleDroneLiveFeed={setIsDroneLiveCameraOpen}
                is3dWindowOpen={is3dWindowOpen}
                onToggle3dWindow={setIs3dWindowOpen}
                hillSpineProfile={hillSpineProfile}
                activePointId={activePointId}
                onSelectPointId={setActivePointId}
                onUpdateActivePoint={updateActivePoint}
                onAddSpinePoint={handleAddSpinePoint}
                onDeleteSpinePoint={handleDeleteSpinePoint}
                elevationExaggeration={elevationExaggeration}
                onChangeExaggeration={setElevationExaggeration}
                isSatelliteDemLoaded={isSatelliteDemLoaded}
                onLoadSatelliteDem={handleLoadSatelliteDem}
                isAiSlopeScanning={isAiSlopeScanning}
                onAiAutoDetectSlope={handleAiAutoDetectSlope}
                visibility={visibility}
                onToggleVisibility={handleToggleVisibilityKey}
                isKa={isKa}
                baseLat={baseLat}
                baseLng={baseLng}
            />

            {/* RIGHT-CLICK CONTEXT MENU ON DEVICES & FEATURES */}
            <SandboxContextMenu
                menu={contextMenu}
                onClose={() => setContextMenu(null)}
                onOpenLiveStream={(cam) => setLiveStreamCamera(cam)}
                onOpenProperties={(type, data) => {
                    if (type === 'camera') {
                        setActiveCameraId(data.id);
                        setSelectedObject({ type: 'camera', data });
                    } else if (type === 'slope_point') {
                        setActivePointId(data.id);
                        setIsSlopeSculptorOpen(true);
                    } else {
                        setSelectedObject({ type: type as any, data });
                    }
                }}
                onFlyTo={(lat, lng) => {
                    setFlyTarget({ lat, lng, zoom: 19, timestamp: Date.now() });
                }}
                onMove={(type, data) => {
                    if (type === 'camera') {
                        setActiveCameraId(data.id);
                        setActiveTool('move_camera');
                        toast.info(isKa ? `დააწკაპუნეთ რუკაზე "${data.name}"-ის ახალ პოზიციაზე გადასაყვანად` : `Click anywhere on map to relocate "${data.name}" or drag its marker`);
                    } else if (type === 'worker') {
                        toast.info(isKa ? `გადაათრიეთ მუშის მარკერი რუკაზე` : `Drag worker marker on the map to relocate`);
                    } else {
                        toast.info(isKa ? `გადაათრიეთ მარკერი ან დააწკაპუნეთ რუკაზე` : `Drag marker or click on map to reposition`);
                    }
                }}
                onDuplicate={(type, data) => {
                    if (type === 'camera') {
                        handleDuplicateActiveCamera();
                    } else if (type === 'soil') {
                        const newSoil: SandboxSoilSensor = {
                            ...data,
                            id: `soil-${Date.now()}`,
                            name: `${data.name} (Copy)`,
                            lat: data.lat + 0.0003,
                            lng: data.lng + 0.0003
                        };
                        setTestSoilSensors(prev => [...prev, newSoil]);
                        toast.success(isKa ? 'ნიადაგის სენსორი დუბლირებულია' : 'Soil sensor duplicated');
                    } else if (type === 'water') {
                        const newWater: SandboxWaterSensor = {
                            ...data,
                            id: `water-${Date.now()}`,
                            name: `${data.name} (Copy)`,
                            lat: data.lat + 0.0003,
                            lng: data.lng + 0.0003
                        };
                        setTestWaterSensors(prev => [...prev, newWater]);
                        toast.success(isKa ? 'წყლის სადგური დუბლირებულია' : 'Water sensor duplicated');
                    } else if (type === 'worker') {
                        const newWrk: SandboxWorkerGps = {
                            ...data,
                            id: `wrk-${Date.now()}`,
                            workerName: `${data.workerName} (2)`,
                            lat: data.lat + 0.0003,
                            lng: data.lng + 0.0003
                        };
                        setTestWorkersGps(prev => [...prev, newWrk]);
                        toast.success(isKa ? 'მუშა დუბლირებულია' : 'Worker duplicated');
                    }
                }}
                onResetDefaults={(type, data) => {
                    if (type === 'camera') {
                        updateActiveCamera({ mountHeightM: 6, azimuthDeg: 0, tiltAngleDeg: 4, fovAngleDeg: 85, rangeM: 75 });
                        toast.success(isKa ? 'კამერის პარამეტრები დაბრუნდა საწყისზე' : 'Camera reset to factory defaults');
                    } else if (type === 'soil') {
                        setTestSoilSensors(prev => prev.map(s => s.id === data.id ? { ...s, moistureVwc: 42, ecMsCm: 1.2, depthCm: 30 } : s));
                        toast.success(isKa ? 'სენსორი დაბრუნდა საწყისზე' : 'Soil sensor reset to defaults');
                    } else if (type === 'water') {
                        setTestWaterSensors(prev => prev.map(w => w.id === data.id ? { ...w, flowRateLpm: 32, pressureBar: 2.8 } : w));
                        toast.success(isKa ? 'წყლის სადგური დაბრუნდა საწყისზე' : 'Water sensor reset to defaults');
                    }
                }}
                onToggleVisibility={(type, data) => {
                    if (type === 'camera') {
                        handleToggleHideCamera(data.id);
                    }
                }}
                onDelete={(type, data) => {
                    if (type === 'camera') {
                        setTestCameras(prev => prev.filter(c => c.id !== data.id));
                        if (selectedObject?.data?.id === data.id) setSelectedObject(null);
                        toast.success(isKa ? 'კამერა წაშლილია' : 'Camera deleted');
                    } else if (type === 'soil') {
                        setTestSoilSensors(prev => prev.filter(s => s.id !== data.id));
                        if (selectedObject?.data?.id === data.id) setSelectedObject(null);
                        toast.success(isKa ? 'ნიადაგის სენსორი წაშლილია' : 'Soil sensor deleted');
                    } else if (type === 'water') {
                        setTestWaterSensors(prev => prev.filter(w => w.id !== data.id));
                        if (selectedObject?.data?.id === data.id) setSelectedObject(null);
                        toast.success(isKa ? 'წყლის სადგური წაშლილია' : 'Water sensor deleted');
                    } else if (type === 'worker') {
                        setTestWorkersGps(prev => prev.filter(w => w.id !== data.id));
                        if (selectedObject?.data?.id === data.id) setSelectedObject(null);
                        toast.success(isKa ? 'მუშა ამოღებულია' : 'Worker removed');
                    } else if (type === 'slope_point') {
                        handleDeleteSpinePoint(data.id);
                    }
                }}
                isKa={isKa}
            />

            {/* CLEAR MAP FULLY CONFIRMATION MODAL */}
            {isClearMapConfirmOpen && (
                <div className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#FAFBF8] border border-[#D8E3D4] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-[#163022]">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-[#163022]">
                                    {isKa ? 'რუკის სრული გასუფთავება?' : 'Clear Map Fully?'}
                                </h3>
                                <p className="text-xs text-[#4A6753] mt-0.5">
                                    {isKa
                                        ? 'ეს მოქმედება სრულად წაშლის ყველა დაყენებულ კამერას, დრონის მარშრუტს, სენსორებს, მუშებს და 3D რელიეფის ქედს.'
                                        : 'This will remove all placed surveillance cameras, drone waypoints, soil & water sensors, worker beacons, and 3D slope profiles from the map.'}
                                </p>
                            </div>
                        </div>

                        <div className="p-3 bg-[#EEF3EA] rounded-2xl border border-[#D8E3D4] text-xs space-y-1.5 font-mono text-[#2D4536]">
                            <div className="flex justify-between">
                                <span>📹 {isKa ? 'კამერები' : 'Surveillance Cameras'}:</span>
                                <span className="font-bold text-red-600">{testCameras.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>🏔️ {isKa ? 'ქედის საკვანძო წერტილები' : 'Slope Ridge Points'}:</span>
                                <span className="font-bold text-amber-700">{hillSpineProfile.points.length} pts</span>
                            </div>
                            {customSlopePerimeter.length > 0 && (
                                <div className="flex justify-between">
                                    <span>📐 {isKa ? 'პერიმეტრის წერტილები' : 'Perimeter Vertices'}:</span>
                                    <span className="font-bold text-purple-700">{customSlopePerimeter.length} pts</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span>🚁 {isKa ? 'დრონის მარშრუტი' : 'Drone Waypoints'}:</span>
                                <span className="font-bold text-cyan-700">{testDroneMission.waypoints.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>🌱 {isKa ? 'ნიადაგის/წყლის სენსორები' : 'Sensors'}:</span>
                                <span className="font-bold text-emerald-700">{testSoilSensors.length + testWaterSensors.length}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsClearMapConfirmOpen(false)}
                                className="flex-1 py-2.5 px-4 bg-white hover:bg-[#64748b] hover:text-white text-[#244130] border border-[#CFDCCB] rounded-xl font-bold text-xs cursor-pointer transition-all duration-200 shadow-2xs"
                            >
                                {isKa ? 'გაუქმება' : 'Cancel'}
                            </button>
                            <button
                                type="button"
                                onClick={executeClearMapFully}
                                className="flex-1 py-2.5 px-4 bg-white hover:bg-[#dc2626] hover:text-white text-[#dc2626] border border-[#dc2626] rounded-xl font-black uppercase tracking-wider text-xs shadow-sm cursor-pointer transition-all duration-200 active:scale-95"
                            >
                                {isKa ? 'დიახ, გასუფთავება' : 'Yes, Clear Map'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PLANNER IMPORT MODAL */}
            {isPlannerImportOpen && (
                <SandboxPlannerImportModal
                    isOpen={isPlannerImportOpen}
                    onClose={() => setIsPlannerImportOpen(false)}
                    plantationFeatures={plantationFeatures}
                    onImportBoundaryOnly={handleImportBoundaryOnly}
                    onImportSelectedComponents={handleImportSelectedComponents}
                    isKa={isKa}
                />
            )}
        </div>
    );
};
