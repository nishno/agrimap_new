import React, { useState, useRef } from 'react';
import { 
    Camera, Navigation, User, Droplets, Mountain, 
    Layers, Eye, Sliders, Satellite, Map as MapIcon, 
    Save, Plus, GripHorizontal, Cpu, RotateCcw,
    RefreshCw, MapPin, Minimize2, Maximize2, ChevronUp, ChevronDown,
    Edit3, PenTool, Hexagon, Move, MousePointer, Trash2, Undo2,
    Video, Wifi, CloudRain, Radio, Download
} from 'lucide-react';

interface SandboxFloatingTopToolbarProps {
    onOpenPlannerImport?: () => void;
    activeTool: string;
    onSelectTool: (tool: any) => void;
    isSlopeSculptorOpen: boolean;
    onToggleSlopeSculptor: () => void;
    is3dWindowOpen: boolean;
    onToggle3dWindow: () => void;
    isVisibilityMenuOpen: boolean;
    onToggleVisibilityMenu: () => void;
    hasSelectedObject: boolean;
    onToggleDevicePanel: () => void;
    tileMode: 'satellite' | 'streets' | '3d';
    onToggleTileMode?: () => void;
    onOpenExportModal?: () => void;
    onOpenHardwareList?: () => void;
    onFlyToPlantation?: () => void;
    onSwap2d3d?: () => void;
    onDeleteLastPoint?: () => void;
    canDeleteLastPoint?: boolean;
    onDeleteSlope?: () => void;
    hasSlope?: boolean;
    onClearMapFully?: () => void;
    onOpenLanScanner?: () => void;
    onOpenLiveStreamTool?: () => void;
    onOpenAllCamerasWide?: () => void;
    is3dMainView?: boolean;
    searchBar?: React.ReactNode;
    hiddenItemsCount: number;
    isLayerTreeOpen?: boolean;
    onToggleLayerTree?: () => void;
    onUploadPhotoClick?: () => void;
    // LABS Plantation Location controls
    onSaveCurrentAsPlantation?: () => void;
    onSyncPlantationFromPlanner?: () => void;
    onPickPlantationOnMap?: () => void;
    isPickingPlantation?: boolean;
    savedPlantationCoords?: [number, number];
    savedPlantationName?: string;
    isKa?: boolean;
}

export const SandboxFloatingTopToolbar: React.FC<SandboxFloatingTopToolbarProps> = ({
    onOpenPlannerImport,
    activeTool,
    onSelectTool,
    isSlopeSculptorOpen,
    onToggleSlopeSculptor,
    is3dWindowOpen,
    onToggle3dWindow,
    isVisibilityMenuOpen,
    onToggleVisibilityMenu,
    hasSelectedObject,
    onToggleDevicePanel,
    tileMode,
    onToggleTileMode,
    onOpenExportModal,
    onOpenHardwareList,
    onFlyToPlantation,
    onSaveCurrentAsPlantation,
    onSyncPlantationFromPlanner,
    onPickPlantationOnMap,
    isPickingPlantation = false,
    savedPlantationCoords,
    savedPlantationName,
    onSwap2d3d,
    onDeleteLastPoint,
    canDeleteLastPoint = false,
    onDeleteSlope,
    hasSlope = false,
    onClearMapFully,
    onOpenLanScanner,
    onOpenLiveStreamTool,
    onOpenAllCamerasWide,
    is3dMainView = false,
    searchBar,
    hiddenItemsCount,
    isLayerTreeOpen = false,
    onToggleLayerTree,
    onUploadPhotoClick,
    isKa = false
}) => {
    // Movable / Draggable Position State
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
    const [isMinimized, setIsMinimized] = useState<boolean>(false);
    const [isPlantationMenuOpen, setIsPlantationMenuOpen] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button, input, select, textarea')) return;
        e.preventDefault();
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {}

        const rect = containerRef.current?.getBoundingClientRect();
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startLeft: rect ? rect.left : (window.innerWidth / 2 - 250),
            startTop: rect ? rect.top : 64
        };
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragRef.current) return;
        e.preventDefault();
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        const newX = Math.max(8, Math.min(window.innerWidth - 120, dragRef.current.startLeft + dx));
        const newY = Math.max(8, Math.min(window.innerHeight - 80, dragRef.current.startTop + dy));
        setPos({ x: newX, y: newY });
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragRef.current) return;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (err) {}
        dragRef.current = null;
    };

    // Minimized View
    if (isMinimized) {
        return (
            <div
                ref={containerRef}
                style={pos ? {
                    position: 'absolute',
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    transform: 'none'
                } : undefined}
                className={`z-[1100] flex items-center gap-2 p-1.5 rounded-2xl bg-[#FAFBF8]/95 border border-[#D8E3D4] shadow-xl backdrop-blur-xl text-xs select-none ${
                    pos ? '' : 'absolute top-16 left-1/2 -translate-x-1/2'
                }`}
            >
                <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="px-2 py-1 cursor-grab active:cursor-grabbing text-[#5F7A69] hover:text-[#1E3B2B] flex items-center gap-1.5"
                    title="Drag anywhere"
                >
                    <GripHorizontal size={14} />
                    <span className="font-black text-[#1E3B2B] uppercase tracking-wider text-[11px]">
                        🛠️ {isKa ? 'ხელსაწყოები (დაკეცილი)' : 'Tools (Minimized)'}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setIsMinimized(false)}
                    className="px-2.5 py-1 bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb] rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                    title="Expand Toolbar"
                >
                    <ChevronDown size={13} />
                    <span>{isKa ? 'გაშლა' : 'Expand'}</span>
                </button>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            style={pos ? {
                position: 'absolute',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: 'none'
            } : undefined}
            className={`z-[1100] max-w-[96vw] flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#FAFBF8]/95 border border-[#D8E3D4] shadow-2xl backdrop-blur-xl flex-wrap justify-center text-xs select-none text-[#163022] ${
                pos ? '' : 'absolute top-16 left-1/2 -translate-x-1/2'
            }`}
        >
            {/* Movable Drag Grip Handle */}
            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onDoubleClick={() => setPos(null)}
                className="px-1.5 py-2 cursor-grab active:cursor-grabbing text-[#6A8272] hover:text-[#1E3B2B] flex items-center justify-center transition-colors rounded-lg hover:bg-[#EEF3EA]"
                title={isKa ? 'გადაადგილება რუკაზე (ორჯერ დაწკაპუნება - საწყის ადგილზე დაბრუნება)' : 'Drag toolbar anywhere on map (double click to reset)'}
            >
                <GripHorizontal size={14} />
            </div>

            {/* Optional Integrated Search Bar */}
            {searchBar && (
                <div className="shrink-0 mr-0.5">
                    {searchBar}
                </div>
            )}

            {/* Core Modeling Tools: Select, Draw Ridge, Draw Perimeter */}
            <div className="flex items-center gap-1">
                {/* Select / Move Tool */}
                <button
                    type="button"
                    onClick={() => onSelectTool('select')}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs ${
                        activeTool === 'select'
                            ? 'bg-[#0284c7] text-white shadow-md ring-2 ring-sky-300 border border-[#0284c7]'
                            : 'bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#0284c7] hover:text-white hover:border-[#0284c7]'
                    }`}
                    title={isKa ? 'წერტილების და ხაზების გადაადგილება / არჩევა' : 'Select & Move points, lines, devices freely'}
                >
                    <Move size={13} />
                    <span>{isKa ? 'გადაადგილება' : 'Move'}</span>
                </button>

                {/* Draw Slope Tool (Uneven Terrain & 3D Slope Polygon Mesh) */}
                <button
                    type="button"
                    onClick={() => onSelectTool(activeTool === 'draw_slope' ? 'select' : 'draw_slope')}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs ${
                        activeTool === 'draw_slope'
                            ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-black shadow-lg ring-2 ring-fuchsia-300 border border-fuchsia-600'
                            : 'bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#c026d3] hover:text-white hover:border-[#c026d3]'
                    }`}
                    title={isKa ? 'ფერდობის დახატვა: დააწკაპუნეთ რუკაზე წერტილების დასასმელად (3D ბადე სინქრონიზდება მყისიერად)' : 'Draw Slope: Click on map to place 3D uneven slope vertices (syncs live to 3D map)'}
                >
                    <Hexagon size={13} className="stroke-[2.5]" />
                    <span>📐 {isKa ? 'ფერდობის დახატვა' : 'Draw Slope'}</span>
                </button>

                {/* Draw Hill Tool (Mound / Ridge Spine Points with Cross-Sections) */}
                <button
                    type="button"
                    onClick={() => onSelectTool(activeTool === 'draw_hill' ? 'select' : 'draw_hill')}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs ${
                        activeTool === 'draw_hill'
                            ? 'bg-amber-500 text-slate-950 font-black shadow ring-2 ring-amber-300 border border-amber-500'
                            : 'bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#d97706] hover:text-white hover:border-[#d97706]'
                    }`}
                    title={isKa ? 'ბორცვის დახატვა: დააწკაპუნეთ რუკაზე ქედის წერტილების (Point A, B, C...) დასასმელად' : 'Draw Hill: Click on map to place ridge spine points (Point A, B, C...) with cross-sections'}
                >
                    <Mountain size={13} className="stroke-[2.5]" />
                    <span>🏔️ {isKa ? 'ბორცვის დახატვა' : 'Draw Hill'}</span>
                </button>

                {/* Back / Undo Last Point */}
                {canDeleteLastPoint && onDeleteLastPoint && (
                    <button
                        type="button"
                        onClick={onDeleteLastPoint}
                        className="px-2.5 py-1.5 rounded-xl font-bold bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#e11d48] hover:text-white hover:border-[#e11d48] shadow-2xs flex items-center gap-1 cursor-pointer transition-all duration-200 active:scale-95"
                        title={isKa ? 'ბოლო წერტილის წაშლა (⌫)' : 'Delete last point (Backspace)'}
                    >
                        <Undo2 size={12} className="stroke-[2.5]" />
                        <span>{isKa ? 'უკან' : 'Back'}</span>
                    </button>
                )}
            </div>

            {/* Import Boundary Polygon & Components from Map Planner */}
            {onOpenPlannerImport && (
                <button
                    type="button"
                    onClick={onOpenPlannerImport}
                    className="px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#0891b2] hover:text-white hover:border-[#0891b2] shadow-2xs active:scale-95"
                    title={isKa ? 'დამგეგმავიდან პოლიგონის (საზღვრის) და კომპონენტების იმპორტი' : 'Migrate & Import Boundary Polygon and components from Map Planner'}
                >
                    <Download size={13} className="stroke-[2.5]" />
                    <span>📥 {isKa ? 'დამგეგმავი' : 'Import Planner'}</span>
                </button>
            )}

            <div className="w-[1px] h-6 bg-[#D8E3D4] mx-0.5" />

            {/* Layer Tree Toggle Button */}
            {onToggleLayerTree && (
                <button
                    type="button"
                    onClick={onToggleLayerTree}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs ${
                        isLayerTreeOpen
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black shadow-lg ring-2 ring-cyan-300 border border-cyan-600'
                            : 'bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#0284c7] hover:text-white hover:border-[#0284c7]'
                    }`}
                    title={isKa ? 'შრეების ხე (Layer Tree: Base Grid, Hill layers, Slope layers, Photo Pins)' : 'Workspace & Layer Tree (Base Grid, Hills, Slopes, Photo Pins)'}
                >
                    <Layers size={13} className="stroke-[2.5]" />
                    <span>🗂️ {isKa ? 'შრეები' : 'Layers Tree'}</span>
                </button>
            )}

            {/* 3D Mound & Slope Sculptor Toggle (Right Floating Panel) */}
            <button
                type="button"
                onClick={onToggleSlopeSculptor}
                className={`px-3.5 py-1.5 rounded-xl font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs ${
                    isSlopeSculptorOpen
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg ring-2 ring-amber-300 border border-amber-500'
                        : 'bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#d97706] hover:text-white hover:border-[#d97706]'
                }`}
                title={isKa ? '3D რელიეფის, ქედის და განივი ხაზების პანელი (სიგრძე / სიგანე)' : '3D Mound & Slope sculptor panel (Length & Width controls)'}
            >
                <Mountain size={13} className="stroke-[2.5]" />
                <span>🏔️ {isKa ? '3D რელიეფი' : '3D Sculptor'}</span>
            </button>

            <div className="w-[1px] h-6 bg-[#D8E3D4] mx-0.5" />

            {/* 3D View Window Toggle */}
            <button
                type="button"
                onClick={onToggle3dWindow}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs ${
                    is3dWindowOpen
                        ? 'bg-cyan-600 text-white shadow ring-2 ring-cyan-300 border border-cyan-600'
                        : 'bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#0891b2] hover:text-white hover:border-[#0891b2]'
                }`}
                title={isKa ? '3D ხედის ფანჯარა' : 'Floating 3D PiP Viewport Window'}
            >
                <Layers size={13} />
                <span>🧊 {isKa ? '3D ხედი' : '3D View'}</span>
            </button>

            {/* 2D / 3D Fullscreen Swap Button */}
            {onSwap2d3d && (
                <button
                    type="button"
                    onClick={onSwap2d3d}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs ${
                        is3dMainView
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg ring-2 ring-cyan-300 border border-cyan-600'
                            : 'bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#0284c7] hover:text-white hover:border-[#0284c7]'
                    }`}
                    title={isKa ? '2D და 3D ხედების გაცვლა (3D სრული ეკრანით გაშვება)' : 'Swap 2D and 3D views (run 3D in full screen)'}
                >
                    <RefreshCw size={12} className={is3dMainView ? 'animate-spin' : ''} />
                    <span>{is3dMainView ? '🗺️ 2D Main' : '🧊 3D Main'}</span>
                </button>
            )}

            {/* Enhanced Plantation Button with Location Picker & Save for LABS module */}
            <div className="relative">
                <div className="flex items-center rounded-xl bg-white/95 border border-[#CFDCCB] text-[#244130] overflow-hidden shadow-2xs hover:border-[#16a34a] transition-all">
                    <button
                        type="button"
                        onClick={onFlyToPlantation}
                        className="px-2.5 py-1.5 font-bold flex items-center gap-1.5 hover:bg-[#16a34a] hover:text-white transition-all duration-200 cursor-pointer"
                        title={isKa ? 'დააწკაპუნეთ შენახულ პლანტაციაზე გადასაფრენად' : 'Fly to saved LABS plantation location'}
                    >
                        <MapPin size={13} className="text-[#2D5A3D]" />
                        <span>{isKa ? 'პლანტაცია' : 'Plantation'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsPlantationMenuOpen(!isPlantationMenuOpen)}
                        className="px-1.5 py-1.5 text-[#4D6A59] hover:bg-[#16a34a] hover:text-white border-l border-[#CFDCCB] transition-colors cursor-pointer"
                        title={isKa ? 'პლანტაციის ლოკაციის შენახვა / არჩევა LABS მოდულისთვის' : 'Save / Choose Plantation Location for LABS module'}
                    >
                        <ChevronDown size={11} />
                    </button>
                </div>

                {/* Plantation Settings Dropdown Menu */}
                {isPlantationMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 z-50 w-72 bg-[#FAFBF8] border border-[#D8E3D4] rounded-2xl shadow-2xl p-3 space-y-2 animate-in fade-in duration-150 text-[#163022]">
                        <div className="flex items-center justify-between border-b border-[#D8E3D4] pb-2">
                            <span className="font-black text-xs text-[#1E3B2B] flex items-center gap-1">
                                <MapPin size={13} className="text-[#16a34a]" />
                                <span>{isKa ? 'LABS პლანტაციის ადგილი' : 'LABS Plantation Place'}</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsPlantationMenuOpen(false)}
                                className="text-[#6A8272] hover:text-[#1E3B2B] p-0.5"
                            >
                                <ChevronUp size={12} />
                            </button>
                        </div>

                        {savedPlantationCoords && (
                            <div className="p-2 rounded-xl bg-white border border-[#E2EBE0] text-[10px] font-mono space-y-0.5">
                                <div className="text-[#5F7A69]">{isKa ? 'შენახული კოორდინატები:' : 'Saved Coordinates:'}</div>
                                <div className="text-[#1E3B2B] font-bold">
                                    {savedPlantationCoords[0].toFixed(5)}, {savedPlantationCoords[1].toFixed(5)}
                                </div>
                                {savedPlantationName && (
                                    <div className="text-[#3B5B47] text-[9px] truncate">
                                        🏷️ {savedPlantationName}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            {onPickPlantationOnMap && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPlantationMenuOpen(false);
                                        onPickPlantationOnMap();
                                    }}
                                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 ${
                                        isPickingPlantation
                                            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 animate-pulse'
                                            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                                    }`}
                                >
                                    <MapPin size={13} className="text-white shrink-0" />
                                    <div>
                                        <div>{isKa ? '📍 რუკაზე დაწკაპუნებით არჩევა' : '📍 Click Map to Pick Location'}</div>
                                        <div className="text-[9px] font-normal opacity-90">{isKa ? 'დააწკაპუნეთ რუკაზე ზუსტი ადგილის დასანიშნად' : 'Click on map to set plantation coordinates'}</div>
                                    </div>
                                </button>
                            )}

                            {onFlyToPlantation && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPlantationMenuOpen(false);
                                        onFlyToPlantation();
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-xl bg-white border border-[#CFDCCB] hover:bg-[#16a34a] hover:text-white text-[#244130] text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                                >
                                    <Navigation size={12} className="text-[#16a34a]" />
                                    <span>{isKa ? 'გადაფრენა პლანტაციაზე' : 'Fly Map to Plantation'}</span>
                                </button>
                            )}

                            {onSaveCurrentAsPlantation && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPlantationMenuOpen(false);
                                        onSaveCurrentAsPlantation();
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-xl bg-white border border-[#CFDCCB] hover:bg-[#0284c7] hover:text-white text-[#244130] text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                                >
                                    <Save size={12} className="text-[#0284c7]" />
                                    <span>{isKa ? 'მიმდინარე ხედის შენახვა LABS-ისთვის' : 'Save Current View for LABS'}</span>
                                </button>
                            )}

                            {onSyncPlantationFromPlanner && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPlantationMenuOpen(false);
                                        onSyncPlantationFromPlanner();
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-xl bg-white border border-[#CFDCCB] hover:bg-[#d97706] hover:text-white text-[#244130] text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                                >
                                    <RefreshCw size={12} className="text-[#d97706]" />
                                    <span>{isKa ? 'Map Planner-იდან სინქრონიზაცია' : 'Sync from Map Planner'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Upload Photo Button */}
            {onUploadPhotoClick && (
                <button
                    type="button"
                    onClick={onUploadPhotoClick}
                    className="px-2.5 py-1.5 rounded-xl font-bold bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#0891b2] hover:text-white hover:border-[#0891b2] flex items-center gap-1.5 cursor-pointer transition-all duration-200 active:scale-95 shadow-2xs"
                    title={isKa ? 'ფოტოს ატვირთვა (EXIF GPS & კომპასის ხედვის კუთხე)' : 'Upload Field Photo (EXIF GPS & Compass Heading)'}
                >
                    <Camera size={13} />
                    <span>📷 {isKa ? '+ფოტო' : '+Photo'}</span>
                </button>
            )}

            {/* Direct Live Stream Tool */}
            {onOpenLiveStreamTool && (
                <button
                    type="button"
                    onClick={() => {
                        onSelectTool(activeTool === 'live_stream' ? 'select' : 'live_stream');
                        onOpenLiveStreamTool();
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs ${
                        activeTool === 'live_stream'
                            ? 'bg-rose-600 text-white font-black shadow-lg ring-2 ring-rose-300 border border-rose-600'
                            : 'bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#e11d48] hover:text-white hover:border-[#e11d48]'
                    }`}
                    title={isKa ? 'პირდაპირი ვიდეო ნაკადის ნახვა (RTSP/WebRTC) რუკიდან' : 'Live Stream View (RTSP/WebRTC) directly from map'}
                >
                    <Video size={13} className="stroke-[2.5]" />
                    <span>📹 {isKa ? 'ლაივი' : 'Live Stream'}</span>
                </button>
            )}

            <div className="w-[1px] h-6 bg-[#D8E3D4] mx-0.5" />

            {/* Layers & Visibility Filter Popover Toggle */}
            <button
                type="button"
                onClick={onToggleVisibilityMenu}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs ${
                    isVisibilityMenuOpen
                        ? 'bg-indigo-600 text-white shadow ring-2 ring-indigo-300 border border-indigo-600'
                        : 'bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#4f46e5] hover:text-white hover:border-[#4f46e5]'
                }`}
                title={isKa ? 'ყველა ან ცალკეული ელემენტის დამალვა/გამოჩენა' : 'Hide all items or some items from the map'}
            >
                <Eye size={13} />
                <span>{isKa ? 'ხილვადობა' : 'Visibility'}</span>
                {hiddenItemsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-800 text-[10px] font-mono font-bold border border-amber-500/40">
                        {hiddenItemsCount}
                    </span>
                )}
            </button>

            {/* Device Configuration Panel Toggle (Left Floating Panel) */}
            <button
                type="button"
                onClick={onToggleDevicePanel}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-2xs ${
                    hasSelectedObject
                        ? 'bg-blue-600 text-white shadow border border-blue-600'
                        : 'bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb]'
                }`}
                title={isKa ? 'მოწყობილობების მართვის პანელი (მარცხნიდან)' : 'Device configuration panel (floats from left)'}
            >
                <Sliders size={13} />
                <span>{hasSelectedObject ? (isKa ? 'პანელის დახურვა' : 'Close Panel') : (isKa ? 'მოწყობილობები' : 'Device Panel')}</span>
            </button>

            {/* Hardware Devices List Link Button */}
            {onOpenHardwareList && (
                <button
                    type="button"
                    onClick={onOpenHardwareList}
                    className="px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb] transition-all duration-200 cursor-pointer shadow-2xs active:scale-95"
                    title={isKa ? 'მოწყობილობების სრული სია & დაბალი დონის დრაივერები' : 'Open full Hardware & Devices List with all driver management tools'}
                >
                    <Cpu size={13} />
                    <span>{isKa ? '🔌 მოწყობილობები' : '🔌 Devices'}</span>
                </button>
            )}

            {/* Scan LAN & NVR Hardware Button */}
            {onOpenLanScanner && (
                <button
                    type="button"
                    onClick={onOpenLanScanner}
                    className="px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#4f46e5] hover:text-white hover:border-[#4f46e5] shadow-2xs transition-all duration-200 cursor-pointer active:scale-95"
                    title={isKa ? 'ლოკალური ქსელის (LAN) სკანირება: NVR, კამერები, დრონები, GPS, სენსორები, მეტეო' : 'Scan LAN for NVRs, Cameras, Drones, GPS, Soil Sensors & Weather Stations'}
                >
                    <Wifi size={13} />
                    <span>📡 {isKa ? 'LAN სკანერი' : 'Scan LAN'}</span>
                </button>
            )}

            {/* All Cameras Wide Matrix View */}
            {onOpenAllCamerasWide && (
                <button
                    type="button"
                    onClick={onOpenAllCamerasWide}
                    className="px-2.5 py-1.5 bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#0891b2] hover:text-white hover:border-[#0891b2] rounded-xl font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all duration-200 shadow-2xs"
                    title={isKa ? 'ვიდეოთვალთვალის სრული მატრიცის გახსნა (ყველა კამერის ერთდროული ნახვა)' : 'Open Wide Matrix for all surveillance cameras'}
                >
                    <Video size={12} />
                    <span>📺 {isKa ? 'მატრიცა' : 'Matrix'}</span>
                </button>
            )}

            {/* Tile Layer Mode Switcher */}
            {onToggleTileMode && (
                <button
                    type="button"
                    onClick={onToggleTileMode}
                    className="px-2.5 py-1.5 bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#334155] hover:text-white hover:border-[#334155] rounded-xl font-bold text-[11px] cursor-pointer shadow-2xs transition-all duration-200"
                    title="Toggle Satellite / Streets Map"
                >
                    {tileMode === 'satellite' ? '🛰️ Sat' : '🗺️ Street'}
                </button>
            )}

            {/* Export as Layer to Map Planner */}
            {onOpenExportModal && (
                <button
                    type="button"
                    onClick={onOpenExportModal}
                    className="px-3 py-1.5 bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#16a34a] hover:text-white hover:border-[#16a34a] rounded-xl font-black uppercase text-[10px] tracking-wider flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all duration-200"
                    title={isKa ? 'მთავარ რუკაზე ექსპორტი ახალ ფენად' : 'Export tested hardware to Map Planner'}
                >
                    <Save size={12} />
                    <span>{isKa ? 'ექსპორტი' : 'Export'}</span>
                </button>
            )}

            {/* Clear Map Fully Button */}
            {onClearMapFully && (
                <button
                    type="button"
                    onClick={onClearMapFully}
                    className="px-2.5 py-1.5 bg-white/95 text-[#244130] border border-[#CFDCCB] hover:bg-[#dc2626] hover:text-white hover:border-[#dc2626] rounded-xl font-black uppercase text-[10px] tracking-wider flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all duration-200"
                    title={isKa ? 'რუკის სრულად გასუფთავება (ყველა მოწყობილობა, რელიეფი, მარშრუტები)' : 'Clear map fully (remove all devices, slope, waypoints)'}
                >
                    <Trash2 size={12} />
                    <span>🧹 {isKa ? 'გასუფთავება' : 'Clear Map'}</span>
                </button>
            )}

            {/* Minimize Toolbar Button */}
            <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1.5 text-[#6A8272] hover:text-[#1E3B2B] rounded-lg hover:bg-[#EEF3EA] cursor-pointer transition-colors"
                title="Minimize toolbar"
            >
                <ChevronUp size={13} />
            </button>

            {pos && (
                <button
                    type="button"
                    onClick={() => setPos(null)}
                    className="p-1.5 text-[#6A8272] hover:text-[#1E3B2B] cursor-pointer"
                    title="Reset position to top center"
                >
                    <RotateCcw size={11} />
                </button>
            )}
        </div>
    );
};
