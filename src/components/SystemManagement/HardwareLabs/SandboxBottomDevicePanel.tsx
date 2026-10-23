import React, { useState } from 'react';
import { 
    Camera, Navigation, User, Droplets, Video, 
    X, Trash2, Eye, EyeOff, Move, ShieldCheck, 
    Sliders, Check, Activity, ChevronUp, ChevronDown, 
    Mountain, Radio, CloudRain, ExternalLink, RefreshCw
} from 'lucide-react';
import type { PlantationCamera } from './CameraNvrLab';
import type { SandboxSoilSensor, SandboxWaterSensor, SandboxWorkerGps, SandboxDroneMission, SandboxWeatherStation } from './HardwareTestingSandboxMap';
import type { SpineControlPoint } from '../../../utils/demTerrainViewshed';

interface SandboxBottomDevicePanelProps {
    selectedObject: {
        type: 'camera' | 'drone' | 'soil' | 'water' | 'worker' | 'seedling' | 'trench' | 'weather' | 'slope_point';
        data: any;
    } | null;
    onClose: () => void;
    
    // Actions
    onOpenLiveStream?: (cam: PlantationCamera) => void;
    onMoveDeviceOnMap?: (type: string, id: string) => void;
    onDeleteDevice?: (type: string, id: string) => void;
    onToggleHideCamera?: (id: string) => void;
    isHiddenCamera?: boolean;
    onUpdateCamera?: (patch: Partial<PlantationCamera>) => void;
    onUpdateSpinePoint?: (id: string, patch: Partial<SpineControlPoint>) => void;

    // Nearest Ridge metadata
    ridgeElevationBaseM?: number;
    isKa?: boolean;
}

export const SandboxBottomDevicePanel: React.FC<SandboxBottomDevicePanelProps> = ({
    selectedObject,
    onClose,
    onOpenLiveStream,
    onMoveDeviceOnMap,
    onDeleteDevice,
    onToggleHideCamera,
    isHiddenCamera = false,
    onUpdateCamera,
    onUpdateSpinePoint,
    ridgeElevationBaseM = 480,
    isKa = false
}) => {
    const [isMinimized, setIsMinimized] = useState(false);
    const [activeTab, setActiveTab] = useState<'telemetry' | 'controls'>('telemetry');

    if (!selectedObject) return null;

    const { type, data } = selectedObject;

    // Device Category Styling
    const getCategoryDetails = () => {
        switch (type) {
            case 'camera':
                return {
                    title: isKa ? 'სათვალთვალო კამერა' : 'Surveillance Optical Camera',
                    badge: isKa ? 'ქედის სათვალთვალო წერტილი' : 'Ridge Optical Node',
                    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                    accentColor: '#3b82f6',
                    icon: Camera
                };
            case 'slope_point':
                return {
                    title: isKa ? `რელიეფის ქედის წერტილი (${data?.name || 'Ridge Point'})` : `Terrain Slope Ridge Point (${data?.name || 'Point'})`,
                    badge: isKa ? '3D რელიეფის ქედი / ზურგი' : '3D Mound Spine & Cross-Section',
                    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                    accentColor: '#f59e0b',
                    icon: Mountain
                };
            case 'soil':
                return {
                    title: isKa ? 'ნიადაგის NPK & ტენიანობის სენსორი' : 'Soil NPK & Moisture Station',
                    badge: isKa ? 'ნიადაგის მონიტორინგი' : 'Telemetry Node',
                    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                    accentColor: '#10b981',
                    icon: Droplets
                };
            case 'water':
                return {
                    title: isKa ? 'წყლის ხარჯის & სარწყავი სადგური' : 'Irrigation & Flow Telemetry',
                    badge: isKa ? 'სარწყავი კვანძი' : 'Hydraulic Station',
                    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
                    accentColor: '#0ea5e9',
                    icon: Droplets
                };
            case 'weather':
                return {
                    title: isKa ? 'აგრო-მეტეო სადგური' : 'Agro-Meteorological Station',
                    badge: isKa ? 'მიკროკლიმატის სენსორი' : 'Atmospheric Sensor',
                    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
                    accentColor: '#f97316',
                    icon: CloudRain
                };
            case 'worker':
                return {
                    title: isKa ? 'მუშის GPS ტრეკერი' : 'Worker GPS Field Beacon',
                    badge: isKa ? 'პერსონალის ტრეკინგი' : 'Active Personnel',
                    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                    accentColor: '#8b5cf6',
                    icon: User
                };
            case 'drone':
                return {
                    title: isKa ? 'აგრო-დრონის მისია' : 'Autonomous Drone Gimbal',
                    badge: isKa ? 'აერო პატრულირება' : 'Aerial Mission',
                    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                    accentColor: '#06b6d4',
                    icon: Navigation
                };
            default:
                return {
                    title: isKa ? 'მოწყობილობის პარამეტრები' : 'Hardware Device Node',
                    badge: isKa ? 'აქტიური მოწყობილობა' : 'Active Node',
                    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
                    accentColor: '#64748b',
                    icon: ShieldCheck
                };
        }
    };

    const details = getCategoryDetails();
    const CategoryIcon = details.icon;

    return (
        <div className="absolute bottom-0 inset-x-0 z-[1250] pointer-events-auto transition-all duration-300 ease-out select-none">
            <div className="mx-auto max-w-7xl px-3 sm:px-6 pb-3">
                <div className="bg-slate-950/95 border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-2xl text-slate-100 overflow-hidden ring-1 ring-white/10">
                    
                    {/* Header Bar */}
                    <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-slate-900/90 via-slate-950/90 to-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div 
                                className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                                style={{ backgroundColor: details.accentColor }}
                            >
                                <CategoryIcon size={18} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                                        {data?.name || data?.workerName || details.title}
                                    </h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${details.badgeColor}`}>
                                        {details.badge}
                                    </span>
                                    {type === 'camera' && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                                            CH0{data?.channel || 1} • {data?.status || 'ONLINE'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                    <span>Lat: {typeof data?.lat === 'number' ? data.lat.toFixed(6) : '41.902'}</span>
                                    <span>•</span>
                                    <span>Lng: {typeof data?.lng === 'number' ? data.lng.toFixed(6) : '44.500'}</span>
                                    <span>•</span>
                                    <span className="text-amber-400 font-bold">Adjacent to Ridge</span>
                                </p>
                            </div>
                        </div>

                        {/* Top Action Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                            {type === 'camera' && onOpenLiveStream && (
                                <button
                                    type="button"
                                    onClick={() => onOpenLiveStream(data as PlantationCamera)}
                                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-900/40 transition-all cursor-pointer active:scale-95"
                                >
                                    <Video size={13} />
                                    <span>{isKa ? 'პირდაპირი ეთერი' : 'Live RTSP Stream'}</span>
                                </button>
                            )}

                            {type === 'camera' && onToggleHideCamera && (
                                <button
                                    type="button"
                                    onClick={() => onToggleHideCamera(data?.id)}
                                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                        isHiddenCamera 
                                            ? 'bg-red-950 text-red-300 border-red-800' 
                                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                                    }`}
                                    title={isHiddenCamera ? 'Unhide on map' : 'Hide from map'}
                                >
                                    {isHiddenCamera ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            )}

                            {onMoveDeviceOnMap && (
                                <button
                                    type="button"
                                    onClick={() => onMoveDeviceOnMap(type, data?.id)}
                                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
                                    title={isKa ? 'პოზიციის შეცვლა რუკაზე' : 'Move device on map'}
                                >
                                    <Move size={14} />
                                </button>
                            )}

                            {onDeleteDevice && (
                                <button
                                    type="button"
                                    onClick={() => onDeleteDevice(type, data?.id)}
                                    className="p-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 transition-all cursor-pointer"
                                    title={isKa ? 'მოწყობილობის წაშლა' : 'Delete device'}
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
                                title={isMinimized ? 'Expand panel' : 'Minimize panel'}
                            >
                                {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>

                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
                                title={isKa ? 'დახურვა' : 'Close panel'}
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                    {/* Symmetrical Details & Telemetry Grid (Hidden when minimized) */}
                    {!isMinimized && (
                        <div className="p-4 sm:p-5 bg-slate-950/70">
                            {/* CAMERA DEVICE METRICS */}
                            {type === 'camera' && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'აზიმუტი (მიმართულება)' : 'Azimuth Heading'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-cyan-400">
                                            {data?.azimuthDeg || 0}°
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'დახრის კუთხე (Tilt)' : 'Tilt Angle'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-emerald-400">
                                            {data?.tiltAngleDeg || 4}°
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'ხედვის კუთხე (FOV)' : 'Optic FOV'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-blue-400">
                                            {data?.fovAngleDeg || 85}°
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'ბოძის სიმაღლე' : 'Pole Height'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-amber-400">
                                            {data?.mountHeightM || 6.0}m
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'ეფექტური მანძილი' : 'Detection Range'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-purple-400">
                                            {data?.rangeM || 75}m
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'ქსელის IP' : 'Network IP'}
                                        </span>
                                        <span className="text-xs font-bold font-mono text-slate-200 truncate block">
                                            {data?.ipAddress || '192.168.1.100'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* RIDGE / SLOPE POINT METRICS */}
                            {type === 'slope_point' && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'ქედის შემაღლება' : 'Ridge Crest Elevation'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-amber-400">
                                            +{data?.peakHeightM || 3.0}m ({ridgeElevationBaseM + (data?.peakHeightM || 3)}m ASL)
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'განივი ჭრილის სიგანე' : 'Cross-Section Width'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-cyan-400">
                                            {(data?.widthLeftM || 12) + (data?.widthRightM || 12)}m
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'მარცხენა / მარჯვენა ფრთა' : 'Left / Right Berm'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-emerald-400">
                                            {data?.widthLeftM || 12}m / {data?.widthRightM || 12}m
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'ქედის პროფილი' : 'Spine Curvature'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-purple-400">
                                            Crest Parabolic Mode
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* SOIL SENSOR METRICS */}
                            {type === 'soil' && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'ნიადაგის ტენიანობა' : 'Volumetric Moisture'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-emerald-400">
                                            {data?.moistureVwc || 34.2}% VWC
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'ნიადაგის ტემპერატურა' : 'Soil Temperature'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-cyan-400">
                                            {data?.temperatureC || 18.5}°C
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'ელექტროგამტარობა (EC)' : 'Electrical Conductivity'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-amber-400">
                                            {data?.ecMsCm || 1.4} mS/cm
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'აზოტის დონე (Nitrogen)' : 'Nitrogen NPK Level'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-purple-400">
                                            {data?.nitrogenPpm || 48} ppm
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* WATER SENSOR METRICS */}
                            {type === 'water' && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'წყლის ნაკადი' : 'Flow Rate'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-sky-400">
                                            {data?.flowRateLpm || 142} L/min
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'მილის წნევა' : 'Line Pressure'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-cyan-400">
                                            {data?.pressureBar || 3.2} Bar
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'სარქვლის მდგომარეობა' : 'Valve Actuator'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-emerald-400">
                                            {data?.valveOpen ? 'OPEN (100%)' : 'CLOSED'}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'ჭის დონე' : 'Well Level'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-indigo-400">
                                            {data?.wellLevelM || 18.4}m
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* WEATHER STATION METRICS */}
                            {type === 'weather' && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'ჰაერის ტემპერატურა' : 'Air Temperature'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-orange-400">
                                            {data?.tempC || 21.4}°C
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'ფარდობითი ტენიანობა' : 'Air Humidity'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-cyan-400">
                                            {data?.humidityPct || 58}%
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'ქარის სიჩქარე' : 'Wind Speed'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-emerald-400">
                                            {data?.windSpeedKmh || 8.4} km/h
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'ნალექი (24სთ)' : 'Precipitation 24h'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-blue-400">
                                            {data?.rainMm || 0.0} mm
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* WORKER GPS METRICS */}
                            {type === 'worker' && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'თანამშრომლის როლი' : 'Duty / Assignment'}
                                        </span>
                                        <span className="text-xs font-black text-purple-300 truncate block">
                                            {data?.role || 'Field Operator'}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'გადაადგილების სიჩქარე' : 'Ground Speed'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-emerald-400">
                                            {data?.speedKmh || 2.4} km/h
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'ბატარეის მუხტი' : 'Beacon Battery'}
                                        </span>
                                        <span className="text-sm font-black font-mono text-cyan-400">
                                            {data?.batteryPct || 92}%
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            {isKa ? 'სტატუსი' : 'Telemetry Link'}
                                        </span>
                                        <span className="text-xs font-black text-emerald-400 flex items-center justify-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            {data?.status || 'ACTIVE'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
