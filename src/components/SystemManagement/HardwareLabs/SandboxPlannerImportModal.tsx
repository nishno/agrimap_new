import React, { useState, useMemo } from 'react';
import { 
    X, Download, CheckSquare, Square, Hexagon, Layers, 
    Footprints, Video, Sparkles, MapPin, Check, Trees, ArrowRight
} from 'lucide-react';
import type { 
    PlantationFeature, 
    AreaPlantationFeature, 
    LinePlantationFeature, 
    BoundaryPlantationFeature,
    CameraPlantationFeature 
} from '../../../types';
import { calculatePolygonAreaAndPerimeter } from '../../../utils/terrainSlopeAnalysis';

interface SandboxPlannerImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    plantationFeatures?: PlantationFeature[];
    onImportBoundaryOnly: (coords: [number, number][], name: string, areaHa: number) => void;
    onImportSelectedComponents: (selected: {
        importBoundary: boolean;
        boundaryCoords?: [number, number][];
        boundaryName?: string;
        boundaryAreaHa?: number;
        sectors: AreaPlantationFeature[];
        trenches: LinePlantationFeature[];
        cameras: CameraPlantationFeature[];
        includeSeedlings: boolean;
    }) => void;
    isKa?: boolean;
}

export const SandboxPlannerImportModal: React.FC<SandboxPlannerImportModalProps> = ({
    isOpen,
    onClose,
    plantationFeatures = [],
    onImportBoundaryOnly,
    onImportSelectedComponents,
    isKa = false
}) => {
    // Locate Boundary Polygon from Planner features (or fallback to largest sector)
    const boundaryFeature = useMemo<BoundaryPlantationFeature | null>(() => {
        const direct = plantationFeatures.find(f => f.type === 'boundary') as BoundaryPlantationFeature | undefined;
        if (direct && Array.isArray(direct.geometry) && direct.geometry.length >= 3) {
            return direct;
        }
        // Fallback: look for an area with name containing boundary or the largest polygon
        const areas = plantationFeatures.filter(f => (f.type === 'area' || (f as any).type === 'sector') && Array.isArray(f.geometry) && f.geometry.length >= 3) as AreaPlantationFeature[];
        if (areas.length > 0) {
            return {
                id: areas[0].id,
                name: areas[0].name || 'Main Plantation Boundary',
                type: 'boundary',
                geometry: areas[0].geometry
            } as BoundaryPlantationFeature;
        }
        return null;
    }, [plantationFeatures]);

    // Boundary metrics
    const boundaryMetrics = useMemo(() => {
        if (!boundaryFeature?.geometry || boundaryFeature.geometry.length < 3) {
            return null;
        }
        return calculatePolygonAreaAndPerimeter(boundaryFeature.geometry);
    }, [boundaryFeature]);

    // Sectors / Blocks
    const sectors = useMemo<AreaPlantationFeature[]>(() => {
        return plantationFeatures.filter(f => 
            (f.type === 'area' || (f as any).type === 'sector') && 
            f.id !== boundaryFeature?.id &&
            Array.isArray(f.geometry) && 
            f.geometry.length >= 3
        ) as AreaPlantationFeature[];
    }, [plantationFeatures, boundaryFeature]);

    // Trenches / Rows
    const trenches = useMemo<LinePlantationFeature[]>(() => {
        return plantationFeatures.filter(f => 
            f.type === 'line' && 
            Array.isArray(f.geometry) && 
            f.geometry.length >= 2
        ) as LinePlantationFeature[];
    }, [plantationFeatures]);

    // Cameras
    const cameras = useMemo<CameraPlantationFeature[]>(() => {
        return plantationFeatures.filter(f => 
            f.type === 'camera' && 
            Array.isArray(f.geometry) && 
            f.geometry.length === 2
        ) as CameraPlantationFeature[];
    }, [plantationFeatures]);

    // Seedlings count
    const seedlingsCount = useMemo(() => {
        return plantationFeatures.filter(f => f.type === 'seedling').length;
    }, [plantationFeatures]);

    // Selection State
    const [importBoundaryChecked, setImportBoundaryChecked] = useState<boolean>(true);
    const [selectedSectorIds, setSelectedSectorIds] = useState<Record<string, boolean>>({});
    const [selectedTrenchIds, setSelectedTrenchIds] = useState<Record<string, boolean>>({});
    const [selectedCameraIds, setSelectedCameraIds] = useState<Record<string, boolean>>({});
    const [includeSeedlingsChecked, setIncludeSeedlingsChecked] = useState<boolean>(false);

    // Initial check all available items on first open
    React.useEffect(() => {
        if (isOpen) {
            const secMap: Record<string, boolean> = {};
            sectors.forEach(s => { secMap[s.id] = true; });
            setSelectedSectorIds(secMap);

            const trMap: Record<string, boolean> = {};
            trenches.forEach(t => { trMap[t.id] = true; });
            setSelectedTrenchIds(trMap);

            const camMap: Record<string, boolean> = {};
            cameras.forEach(c => { camMap[c.id] = true; });
            setSelectedCameraIds(camMap);
        }
    }, [isOpen, sectors, trenches, cameras]);

    if (!isOpen) return null;

    const toggleSector = (id: string) => {
        setSelectedSectorIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleTrench = (id: string) => {
        setSelectedTrenchIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleCamera = (id: string) => {
        setSelectedCameraIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSelectAll = () => {
        setImportBoundaryChecked(true);
        const secMap: Record<string, boolean> = {};
        sectors.forEach(s => { secMap[s.id] = true; });
        setSelectedSectorIds(secMap);

        const trMap: Record<string, boolean> = {};
        trenches.forEach(t => { trMap[t.id] = true; });
        setSelectedTrenchIds(trMap);

        const camMap: Record<string, boolean> = {};
        cameras.forEach(c => { camMap[c.id] = true; });
        setSelectedCameraIds(camMap);

        if (seedlingsCount > 0) setIncludeSeedlingsChecked(true);
    };

    const handleDeselectAll = () => {
        setImportBoundaryChecked(false);
        setSelectedSectorIds({});
        setSelectedTrenchIds({});
        setSelectedCameraIds({});
        setIncludeSeedlingsChecked(false);
    };

    const totalSelectedCount = (importBoundaryChecked && boundaryFeature ? 1 : 0) +
        Object.values(selectedSectorIds).filter(Boolean).length +
        Object.values(selectedTrenchIds).filter(Boolean).length +
        Object.values(selectedCameraIds).filter(Boolean).length +
        (includeSeedlingsChecked ? 1 : 0);

    const handleExecuteImport = () => {
        const chosenSectors = sectors.filter(s => selectedSectorIds[s.id]);
        const chosenTrenches = trenches.filter(t => selectedTrenchIds[t.id]);
        const chosenCameras = cameras.filter(c => selectedCameraIds[c.id]);

        onImportSelectedComponents({
            importBoundary: importBoundaryChecked && !!boundaryFeature,
            boundaryCoords: boundaryFeature?.geometry,
            boundaryName: boundaryFeature?.name || 'Company Boundary',
            boundaryAreaHa: boundaryMetrics?.areaHa || 0,
            sectors: chosenSectors,
            trenches: chosenTrenches,
            cameras: chosenCameras,
            includeSeedlings: includeSeedlingsChecked
        });
        onClose();
    };

    const handleQuickBoundaryOnly = () => {
        if (!boundaryFeature?.geometry) return;
        onImportBoundaryOnly(
            boundaryFeature.geometry,
            boundaryFeature.name || 'Company Boundary',
            boundaryMetrics?.areaHa || 0
        );
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[3000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-[#FAFBF8] border border-[#D8E3D4] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#163022]">
                
                {/* Header */}
                <div className="p-4 sm:p-5 bg-[#EEF3EA] border-b border-[#D8E3D4] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white border border-[#CFDCCB] flex items-center justify-center text-[#16a34a] shadow-2xs">
                            <Download size={20} />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-[#163022] flex items-center gap-2">
                                <span>{isKa ? 'დამგეგმავიდან LABS-ში იმპორტი' : 'Import from Map Planner to LABS'}</span>
                                <span className="px-2 py-0.5 rounded-full bg-white text-[#16a34a] text-[10px] font-mono font-bold border border-[#CFDCCB]">
                                    {plantationFeatures.length} Features
                                </span>
                            </h3>
                            <p className="text-xs text-[#4A6753]">
                                {isKa 
                                    ? 'აირჩიეთ მთავარი პერიმეტრის პოლიგონი ან ცალკეული სექტორები/კომპონენტები'
                                    : 'Import the registered company polygon boundary or pick specific sectors and components'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-[#4A6753] hover:text-[#163022] bg-white hover:bg-[#D8E3D4] border border-[#CFDCCB] transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

                    {/* Section 1: Main Outer Boundary Polygon (Primary Focus) */}
                    <div className="p-4 rounded-2xl bg-white border border-[#D8E3D4] shadow-xs space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setImportBoundaryChecked(!importBoundaryChecked)}
                                    className="mt-0.5 text-[#c026d3] hover:text-[#a21caf] cursor-pointer"
                                    disabled={!boundaryFeature}
                                >
                                    {importBoundaryChecked && boundaryFeature ? <CheckSquare size={18} /> : <Square size={18} />}
                                </button>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Hexagon size={16} className="text-[#c026d3] stroke-[2.5]" />
                                        <h4 className="font-black text-sm text-[#163022]">
                                            {boundaryFeature?.name || (isKa ? 'კომპანიის საზღვრის პოლიგონი' : 'Company Outer Boundary Polygon')}
                                        </h4>
                                        <span className="px-1.5 py-0.5 bg-fuchsia-50 text-fuchsia-800 rounded text-[9px] font-mono font-bold border border-fuchsia-200">
                                            {isKa ? 'მთავარი პერიმეტრი' : 'PRIMARY BOUNDARY'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#4A6753] mt-0.5">
                                        {isKa 
                                            ? 'რეგისტრაციისას დახაზული საზღვარი, რომლის შიგნითაც განლაგებულია სექტორები და ნარგავები' 
                                            : 'The main perimeter boundary drawn when registering the company, inside which sectors are nested.'}
                                    </p>
                                </div>
                            </div>

                            {boundaryFeature && (
                                <button
                                    type="button"
                                    onClick={handleQuickBoundaryOnly}
                                    className="py-1.5 px-3 bg-white hover:bg-[#c026d3] hover:text-white text-[#244130] border border-[#CFDCCB] font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all duration-200 active:scale-95 shrink-0"
                                    title="Quick import: only import the outer boundary polygon"
                                >
                                    <Sparkles size={13} className="text-[#c026d3]" />
                                    <span>{isKa ? 'მხოლოდ პოლიგონის იმპორტი' : 'Import Only Polygon'}</span>
                                </button>
                            )}
                        </div>

                        {/* Boundary Metrics Card */}
                        {boundaryMetrics ? (
                            <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#EEF3EA] rounded-xl border border-[#D8E3D4] font-mono text-xs">
                                <div>
                                    <span className="text-[10px] text-[#4A6753] uppercase block">{isKa ? 'ფართობი (ha)' : 'Area (Hectares)'}</span>
                                    <strong className="text-fuchsia-700 text-sm font-black">{boundaryMetrics.areaHa} ha</strong>
                                </div>
                                <div>
                                    <span className="text-[10px] text-[#4A6753] uppercase block">{isKa ? 'კვადრატულობა' : 'Area (m²)'}</span>
                                    <strong className="text-[#163022] text-xs font-bold">{boundaryMetrics.areaM2.toLocaleString()} m²</strong>
                                </div>
                                <div>
                                    <span className="text-[10px] text-[#4A6753] uppercase block">{isKa ? 'პერიმეტრი' : 'Perimeter'}</span>
                                    <strong className="text-emerald-700 text-xs font-bold">{boundaryMetrics.perimeterM.toLocaleString()} m</strong>
                                </div>
                            </div>
                        ) : (
                            <div className="p-2.5 text-xs text-[#6A8A73] italic bg-[#EEF3EA] rounded-xl border border-dashed border-[#D8E3D4]">
                                {isKa 
                                    ? 'დამგეგმავში საზღვრის პოლიგონი ჯერ არ არის დახაზული. შეგიძლიათ ხელით დახატოთ რუკაზე ან იმპორტირება გაუკეთოთ სექტორებს ქვემოთ.'
                                    : 'No boundary polygon found in map planner. You can draw one manually in LABS or import sectors below.'}
                            </div>
                        )}
                    </div>

                    {/* Section 2: Other Components Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Layers size={15} className="text-[#0284c7]" />
                                <h4 className="font-black text-xs uppercase tracking-wider text-[#163022]">
                                    {isKa ? 'დამგეგმავის სხვა კომპონენტები (სურვილისამებრ)' : 'Other Planner Components (Selectable)'}
                                </h4>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    className="text-[#0284c7] hover:underline font-bold cursor-pointer"
                                >
                                    {isKa ? 'ყველას მონიშვნა' : 'Select All'}
                                </button>
                                <span className="text-[#CFDCCB]">•</span>
                                <button
                                    type="button"
                                    onClick={handleDeselectAll}
                                    className="text-[#4A6753] hover:text-[#163022] cursor-pointer"
                                >
                                    {isKa ? 'გასუფთავება' : 'Clear'}
                                </button>
                            </div>
                        </div>

                        {/* Sectors / Sub-areas */}
                        {sectors.length > 0 && (
                            <div className="p-3 bg-white rounded-2xl border border-[#D8E3D4] space-y-2 shadow-2xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A6753] flex items-center justify-between">
                                    <span>🌾 {isKa ? 'სექტორები / ბლოკები' : 'Sectors & Blocks'} ({sectors.length})</span>
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {sectors.map(sec => {
                                        const isChecked = !!selectedSectorIds[sec.id];
                                        const m = sec.geometry ? calculatePolygonAreaAndPerimeter(sec.geometry) : null;
                                        return (
                                            <div
                                                key={`sec-${sec.id}`}
                                                onClick={() => toggleSector(sec.id)}
                                                className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 select-none shadow-2xs ${
                                                    isChecked
                                                        ? 'bg-sky-50 border-sky-400 text-[#163022]'
                                                        : 'bg-[#FAFBF8] border-[#E2EBE0] text-[#4A6753] hover:border-sky-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <span className="text-[#0284c7]">
                                                        {isChecked ? <CheckSquare size={15} /> : <Square size={15} />}
                                                    </span>
                                                    <div className="truncate">
                                                        <span className="text-xs font-bold block truncate text-[#163022]">{sec.name || 'Unnamed Sector'}</span>
                                                        <span className="text-[10px] text-[#4A6753] font-mono">
                                                            {m ? `${m.areaHa} ha • ${sec.geometry.length} pts` : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div
                                                    className="w-3 h-3 rounded-full shrink-0 border border-[#CFDCCB]"
                                                    style={{ backgroundColor: (sec as any).fillColor || '#06b6d4' }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Trenches / Rows */}
                        {trenches.length > 0 && (
                            <div className="p-3 bg-white rounded-2xl border border-[#D8E3D4] space-y-2 shadow-2xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A6753]">
                                    🌱 {isKa ? 'კვლები & სარწყავი ხაზები' : 'Trench & Irrigation Lines'} ({trenches.length})
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {trenches.map(tr => {
                                        const isChecked = !!selectedTrenchIds[tr.id];
                                        return (
                                            <div
                                                key={`tr-${tr.id}`}
                                                onClick={() => toggleTrench(tr.id)}
                                                className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 select-none shadow-2xs ${
                                                    isChecked
                                                        ? 'bg-emerald-50 border-emerald-400 text-[#163022]'
                                                        : 'bg-[#FAFBF8] border-[#E2EBE0] text-[#4A6753] hover:border-emerald-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="text-[#16a34a]">
                                                        {isChecked ? <CheckSquare size={15} /> : <Square size={15} />}
                                                    </span>
                                                    <span className="text-xs font-bold truncate text-[#163022]">{tr.name || 'Trench Row'}</span>
                                                </div>
                                                <span className="text-[10px] text-[#4A6753] font-mono shrink-0">
                                                    {tr.geometry.length} pts
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Cameras */}
                        {cameras.length > 0 && (
                            <div className="p-3 bg-white rounded-2xl border border-[#D8E3D4] space-y-2 shadow-2xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A6753]">
                                    📹 {isKa ? 'დაყენებული კამერები' : 'Installed Security Cameras'} ({cameras.length})
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {cameras.map(cam => {
                                        const isChecked = !!selectedCameraIds[cam.id];
                                        return (
                                            <div
                                                key={`cam-${cam.id}`}
                                                onClick={() => toggleCamera(cam.id)}
                                                className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 select-none shadow-2xs ${
                                                    isChecked
                                                        ? 'bg-blue-50 border-blue-400 text-[#163022]'
                                                        : 'bg-[#FAFBF8] border-[#E2EBE0] text-[#4A6753] hover:border-blue-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="text-[#2563eb]">
                                                        {isChecked ? <CheckSquare size={15} /> : <Square size={15} />}
                                                    </span>
                                                    <span className="text-xs font-bold truncate text-[#163022]">{cam.name || 'CCTV Camera'}</span>
                                                </div>
                                                <span className="text-[10px] text-blue-700 font-mono shrink-0 font-bold">
                                                    CH0{cam.channel || 1}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Seedlings count */}
                        {seedlingsCount > 0 && (
                            <div 
                                onClick={() => setIncludeSeedlingsChecked(!includeSeedlingsChecked)}
                                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all duration-200 select-none shadow-2xs ${
                                    includeSeedlingsChecked
                                        ? 'bg-lime-50 border-lime-400 text-[#163022]'
                                        : 'bg-white border-[#E2EBE0] text-[#4A6753] hover:border-lime-300'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="text-lime-600">
                                        {includeSeedlingsChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                                    </span>
                                    <Trees size={16} className="text-lime-600" />
                                    <div>
                                        <span className="text-xs font-bold block text-[#163022]">{isKa ? 'ნერგები & ხეები' : 'Seedlings & Orchard Trees'}</span>
                                        <span className="text-[10px] text-[#4A6753] font-mono">{seedlingsCount} registered seedlings</span>
                                    </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-lime-100 text-lime-800 font-mono text-[10px] font-bold border border-lime-200">
                                    {seedlingsCount} trees
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-[#EEF3EA] border-t border-[#D8E3D4] flex items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white hover:bg-[#64748b] hover:text-white text-[#244130] font-bold border border-[#CFDCCB] rounded-xl text-xs cursor-pointer transition-all duration-200 shadow-2xs"
                    >
                        {isKa ? 'გაუქმება' : 'Cancel'}
                    </button>

                    <div className="flex items-center gap-2">
                        {boundaryFeature && (
                            <button
                                type="button"
                                onClick={handleQuickBoundaryOnly}
                                className="px-3.5 py-2 bg-white hover:bg-[#c026d3] hover:text-white text-[#244130] border border-[#CFDCCB] font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all duration-200 shadow-2xs active:scale-95"
                            >
                                <Hexagon size={13} className="text-[#c026d3]" />
                                <span>{isKa ? 'მხოლოდ საზღვარი' : 'Boundary Only'}</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleExecuteImport}
                            disabled={totalSelectedCount === 0}
                            className="px-4 py-2 bg-white hover:bg-[#0284c7] hover:text-white text-[#0284c7] border border-[#0284c7] font-black rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Download size={13} />
                            <span>
                                {isKa ? `არჩეულის იმპორტი (${totalSelectedCount})` : `Import Selected (${totalSelectedCount})`}
                            </span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
