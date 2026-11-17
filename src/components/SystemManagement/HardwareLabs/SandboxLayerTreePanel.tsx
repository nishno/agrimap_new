import React, { useState, useRef, useMemo } from 'react';
import { 
    Layers, Eye, EyeOff, Lock, Unlock, ChevronRight, ChevronDown, 
    Mountain, Grid3X3, Hexagon, Camera, Plus, Trash2, X, GripVertical,
    Activity, MapPin, Compass, ArrowUpRight, Check, Sparkles, Sliders
} from 'lucide-react';
import type { HillSpineProfile, PhotoGpsPin, PerimeterSlopeObject, PerimeterSlopeVertex } from '../../../utils/demTerrainViewshed';

export type LayerId = string;

interface SandboxLayerTreePanelProps {
    isOpen: boolean;
    onClose: () => void;
    selectedLayerId: string;
    onSelectLayer: (layerId: string) => void;
    // Multi-Layer collections
    hillProfiles?: HillSpineProfile[];
    slopeObjects?: PerimeterSlopeObject[];
    photoPins?: PhotoGpsPin[];
    baseGridVisible?: boolean;
    onToggleBaseGridVisibility?: () => void;
    baseGridLocked?: boolean;
    onToggleBaseGridLock?: () => void;
    onAddHillLayer?: () => void;
    onAddSlopeLayer?: () => void;
    onDeleteHillLayer?: (id: string) => void;
    onDeleteSlopeLayer?: (id: string) => void;
    onToggleHillVisibility?: (id: string) => void;
    onToggleSlopeVisibility?: (id: string) => void;
    onToggleHillLock?: (id: string) => void;
    onToggleSlopeLock?: (id: string) => void;
    onUploadPhotoClick: () => void;
    onSelectPhotoPin: (pin: PhotoGpsPin) => void;
    onDeletePhotoPin: (id: string) => void;
    photoPinsVisible?: boolean;
    onTogglePhotoPinsVisibility?: () => void;
    // Fallback legacy props for backward compatibility
    hillSpineProfile?: HillSpineProfile;
    perimeterVertices?: PerimeterSlopeVertex[];
    layerVisibility?: {
        baseGrid: boolean;
        hill1: boolean;
        slope1: boolean;
        photoPins: boolean;
    };
    onToggleLayerVisibility?: (layerKey: any) => void;
    layerLocks?: {
        baseGrid: boolean;
        hill1: boolean;
        slope1: boolean;
        photoPins: boolean;
    };
    onToggleLayerLock?: (layerKey: any) => void;
    measuredHillLengthM?: number;
    isKa?: boolean;
}

export const SandboxLayerTreePanel: React.FC<SandboxLayerTreePanelProps> = ({
    isOpen,
    onClose,
    selectedLayerId,
    onSelectLayer,
    hillProfiles = [],
    slopeObjects = [],
    photoPins = [],
    baseGridVisible = true,
    onToggleBaseGridVisibility,
    baseGridLocked = false,
    onToggleBaseGridLock,
    onAddHillLayer,
    onAddSlopeLayer,
    onDeleteHillLayer,
    onDeleteSlopeLayer,
    onToggleHillVisibility,
    onToggleSlopeVisibility,
    onToggleHillLock,
    onToggleSlopeLock,
    onUploadPhotoClick,
    onSelectPhotoPin,
    onDeletePhotoPin,
    photoPinsVisible = true,
    onTogglePhotoPinsVisibility,
    hillSpineProfile,
    perimeterVertices = [],
    layerVisibility,
    onToggleLayerVisibility,
    layerLocks,
    onToggleLayerLock,
    measuredHillLengthM = 0,
    isKa = false
}) => {
    // Draggable position
    const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

    // Expand / Collapse state per layer
    const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({
        base_grid: false,
        hills_group: true,
        slopes_group: true,
        photos_group: true
    });

    const [isAddMenuOpen, setIsAddMenuOpen] = useState<boolean>(false);

    // Normalize hills list: only show hills with actual control points and deduplicate IDs
    const effectiveHills: HillSpineProfile[] = useMemo(() => {
        const rawHills = (hillProfiles && hillProfiles.length > 0)
            ? hillProfiles.filter(h => h && h.points && h.points.length > 0)
            : (hillSpineProfile && hillSpineProfile.points && hillSpineProfile.points.length > 0 ? [hillSpineProfile] : []);
        const seen = new Set<string>();
        const unique: HillSpineProfile[] = [];
        for (const h of rawHills) {
            const id = h.id || `hill_${unique.length + 1}`;
            if (!seen.has(id)) {
                seen.add(id);
                unique.push({ ...h, id });
            }
        }
        return unique;
    }, [hillProfiles, hillSpineProfile]);

    // Normalize slopes list: only show slopes with actual vertices and deduplicate IDs
    const effectiveSlopes: PerimeterSlopeObject[] = useMemo(() => {
        const rawSlopes = (slopeObjects && slopeObjects.length > 0)
            ? slopeObjects.filter(s => s && s.vertices && s.vertices.length > 0)
            : (perimeterVertices && perimeterVertices.length > 0 ? [{
                id: 'slope_1',
                name: 'Slope 1 (Uneven Terrain)',
                enabled: layerVisibility?.slope1 ?? true,
                locked: layerLocks?.slope1 ?? false,
                vertices: perimeterVertices,
                hasRoadZeroLevel: true
            }] : []);
        const seen = new Set<string>();
        const unique: PerimeterSlopeObject[] = [];
        for (const s of rawSlopes) {
            const id = s.id || `slope_${unique.length + 1}`;
            if (!seen.has(id)) {
                seen.add(id);
                unique.push({ ...s, id });
            }
        }
        return unique;
    }, [slopeObjects, perimeterVertices, layerVisibility?.slope1, layerLocks?.slope1]);

    const toggleExpand = (layerId: string) => {
        setExpandedLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button, input, select, textarea')) return;
        e.preventDefault();
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (_) {}

        const rect = containerRef.current?.getBoundingClientRect();
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startLeft: rect ? rect.left : 16,
            startTop: rect ? rect.top : 76
        };
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragRef.current) return;
        e.preventDefault();
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        const newX = Math.max(8, Math.min(window.innerWidth - 300, dragRef.current.startLeft + dx));
        const newY = Math.max(8, Math.min(window.innerHeight - 200, dragRef.current.startTop + dy));
        setPanelPos({ x: newX, y: newY });
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragRef.current) return;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (_) {}
        dragRef.current = null;
    };

    if (!isOpen) return null;

    const totalActiveObjects = (baseGridVisible ? 1 : 0) + 
        effectiveHills.filter(h => h.enabled).length + 
        effectiveSlopes.filter(s => s.enabled).length + 
        photoPins.length;

    return (
        <div
            ref={containerRef}
            style={panelPos ? {
                position: 'absolute',
                left: `${panelPos.x}px`,
                top: `${panelPos.y}px`,
                bottom: 'auto',
                maxHeight: 'calc(100vh - 100px)'
            } : undefined}
            className={`z-[1250] w-84 sm:w-92 max-w-[calc(100vw-24px)] bg-[#FAFBF8]/95 border border-[#D8E3D4] rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-in slide-in-from-left duration-200 text-[#163022] ${
                panelPos ? '' : 'absolute left-4 top-20 bottom-8'
            }`}
        >
            {/* Header */}
            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="p-3 bg-[#EEF3EA] border-b border-[#D8E3D4] flex items-center justify-between shrink-0 select-none cursor-grab active:cursor-grabbing"
            >
                <div className="flex items-center gap-2">
                    <GripVertical size={14} className="text-[#6A8272] hover:text-[#1E3B2B]" />
                    <div className="w-6 h-6 rounded-lg bg-white border border-[#D8E3D4] flex items-center justify-center text-[#1E3B2B] shadow-2xs">
                        <Layers size={14} />
                    </div>
                    <div>
                        <h4 className="font-black text-xs text-[#163022] uppercase tracking-wider flex items-center gap-1.5">
                            {isKa ? 'შრეების ხე (Layer Tree)' : 'Workspace & Layer Tree'}
                        </h4>
                        <span className="text-[10px] text-[#3B5B47] font-mono font-bold">
                            {totalActiveObjects} Active Objects • Multi-Layer
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-[#5F7A69] hover:text-rose-600 rounded-xl bg-white border border-[#CFDCCB] hover:bg-rose-50 hover:border-rose-300 transition-colors cursor-pointer shadow-2xs"
                        title="Close layer tree"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Quick Action Toolbar: + Add Layer */}
            <div className="p-2.5 bg-[#F6F8F4] border-b border-[#D8E3D4] flex items-center justify-between relative">
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                        className="px-3 py-1.5 bg-white text-[#1E3B2B] border border-[#CFDCCB] hover:bg-[#0284c7] hover:text-white hover:border-[#0284c7] rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all duration-200 cursor-pointer"
                    >
                        <Plus size={13} className="stroke-[3]" />
                        <span>{isKa ? '+ ახალი შრე' : '+ Add New Layer'}</span>
                        <ChevronDown size={12} />
                    </button>

                    {/* Add Layer Dropdown Menu */}
                    {isAddMenuOpen && (
                        <div className="absolute left-0 top-full mt-1.5 z-50 w-56 bg-white border border-[#CFDCCB] rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in duration-150 text-[#163022]">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddMenuOpen(false);
                                    if (onAddHillLayer) onAddHillLayer();
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-amber-50 text-[#244130] hover:text-amber-900 flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer"
                            >
                                <Mountain size={14} className="text-amber-600" />
                                <div>
                                    <div>{isKa ? '🏔️ ახალი ბორცვი / ქედი' : '🏔️ New Hill / Ridge Layer'}</div>
                                    <div className="text-[9px] text-[#5F7A69] font-normal">Crest curve, length & width</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddMenuOpen(false);
                                    if (onAddSlopeLayer) onAddSlopeLayer();
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-fuchsia-50 text-[#244130] hover:text-fuchsia-900 flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer"
                            >
                                <Hexagon size={14} className="text-fuchsia-600" />
                                <div>
                                    <div>{isKa ? '📐 ახალი ფერდობი / პერიმეტრი' : '📐 New Slope / Perimeter'}</div>
                                    <div className="text-[9px] text-[#5F7A69] font-normal">Uneven terrain, Road 0 level</div>
                                </div>
                            </button>

                            <div className="h-[1px] bg-[#E2EBE0] my-1" />

                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddMenuOpen(false);
                                    onUploadPhotoClick();
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-cyan-50 text-[#244130] hover:text-cyan-900 flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer"
                            >
                                <Camera size={13} className="text-cyan-600" />
                                <span>{isKa ? '📷 + ფოტოს პინი (EXIF GPS)' : '📷 + Upload Photo Pin'}</span>
                            </button>
                        </div>
                    )}
                </div>

                <span className="text-[10px] text-[#5F7A69] font-mono">
                    Focus: <strong className="text-[#1E3B2B]">{selectedLayerId.replace(/_/g, ' ')}</strong>
                </span>
            </div>

            {/* Layer Tree List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs text-[#163022]">

                {/* LAYER 1: BASE GRID */}
                <div
                    className={`rounded-xl border transition-all ${
                        selectedLayerId === 'base_grid'
                            ? 'bg-sky-50/70 border-sky-400 shadow-sm ring-1 ring-sky-300'
                            : 'bg-white border-[#E2EBE0] hover:border-sky-300 shadow-2xs'
                    }`}
                >
                    <div 
                        onClick={() => onSelectLayer('base_grid')}
                        className="p-2.5 flex items-center justify-between cursor-pointer select-none"
                    >
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand('base_grid');
                                }}
                                className="text-[#6A8272] hover:text-[#1E3B2B] cursor-pointer"
                            >
                                {expandedLayers.base_grid ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <Grid3X3 size={14} className="text-sky-600" />
                            <div>
                                <span className="font-bold text-xs text-[#163022]">Base Grid</span>
                                <span className="text-[9px] text-[#5F7A69] block font-mono">624m x 624m (+30% Free Area)</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onToggleBaseGridVisibility) onToggleBaseGridVisibility();
                                    else if (onToggleLayerVisibility) onToggleLayerVisibility('baseGrid');
                                }}
                                className={`p-1.5 rounded-lg border border-[#D0DCCF] bg-white cursor-pointer transition-all duration-200 shadow-2xs ${
                                    baseGridVisible ? 'text-[#1E3B2B] hover:bg-[#0284c7] hover:text-white hover:border-[#0284c7]' : 'text-slate-400 hover:bg-[#0284c7] hover:text-white hover:border-[#0284c7]'
                                }`}
                                title="Toggle Base Grid visibility"
                            >
                                {baseGridVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (onToggleBaseGridLock) onToggleBaseGridLock();
                                    else if (onToggleLayerLock) onToggleLayerLock('baseGrid');
                                }}
                                className={`p-1.5 rounded-lg border border-[#D0DCCF] bg-white cursor-pointer transition-all duration-200 shadow-2xs ${
                                    baseGridLocked ? 'text-amber-600 hover:bg-amber-500 hover:text-slate-900 hover:border-amber-500' : 'text-[#405646] hover:bg-amber-500 hover:text-slate-900 hover:border-amber-500'
                                }`}
                                title="Lock / Unlock Base Grid"
                            >
                                {baseGridLocked ? <Lock size={13} /> : <Unlock size={13} />}
                            </button>
                        </div>
                    </div>

                    {expandedLayers.base_grid && (
                        <div className="px-3 pb-2.5 pt-1 border-t border-[#E2EBE0] bg-[#F7FAF5] font-mono text-[10px] text-[#5F7A69] space-y-1">
                            <div className="flex justify-between">
                                <span>Reference Level:</span>
                                <strong className="text-[#1E3B2B]">0.0 m (Road Level)</strong>
                            </div>
                            <div className="flex justify-between">
                                <span>Grid Area:</span>
                                <strong className="text-[#1E3B2B]">38.9 Hectares</strong>
                            </div>
                        </div>
                    )}
                </div>

                {/* =====================================================================
                    HILLS GROUP (Dynamic Multi-Layer: Hill 1, Hill 2, ...)
                   ===================================================================== */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1 text-[10px] font-black uppercase text-amber-800 tracking-wider">
                        <span className="flex items-center gap-1">
                            <Mountain size={11} className="text-amber-600" />
                            <span>Hills & Mounds ({effectiveHills.length})</span>
                        </span>
                        {onAddHillLayer && (
                            <button
                                type="button"
                                onClick={onAddHillLayer}
                                className="text-[9px] text-[#244130] bg-white border border-[#D0DCCF] hover:bg-[#d97706] hover:text-white hover:border-[#d97706] px-1.5 py-0.5 rounded-lg shadow-2xs flex items-center gap-0.5 cursor-pointer transition-all duration-200"
                            >
                                <Plus size={10} /> Add Hill
                            </button>
                        )}
                    </div>

                    {effectiveHills.length === 0 ? (
                        <div className="p-3 rounded-xl bg-white border border-dashed border-[#CFDCCB] text-[11px] text-[#6A8272] italic text-center">
                            {isKa ? 'ბორცვები ჯერ არ არის დახატული' : 'No hills drawn yet. Click "Draw Hill" in toolbar.'}
                        </div>
                    ) : (
                        effectiveHills.map((hill, idx) => {
                        const isSelected = selectedLayerId === hill.id || (idx === 0 && selectedLayerId === 'hill_1');
                        const isLocked = hill.locked ?? (layerLocks?.hill1 ?? false);
                        const isVisible = hill.enabled ?? (layerVisibility?.hill1 ?? true);
                        const maxH = Math.max(...(hill.points.map(p => p.peakHeightM || 0)), 0);

                        return (
                            <div
                                key={`hill-layer-${hill.id || idx}-${idx}`}
                                className={`rounded-xl border transition-all ${
                                    isSelected
                                        ? 'bg-amber-50/70 border-amber-400 shadow-sm ring-1 ring-amber-300'
                                        : 'bg-white border-[#E2EBE0] hover:border-amber-300 shadow-2xs'
                                }`}
                            >
                                <div
                                    onClick={() => onSelectLayer(hill.id)}
                                    className="p-2.5 flex items-center justify-between cursor-pointer select-none"
                                >
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleExpand(hill.id);
                                            }}
                                            className="text-[#6A8272] hover:text-[#1E3B2B] cursor-pointer"
                                        >
                                            {expandedLayers[hill.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>
                                        <Mountain size={14} className="text-amber-600" />
                                        <div>
                                            <span className="font-bold text-xs text-[#163022]">{hill.name || `Hill ${idx + 1}`}</span>
                                            <span className="text-[9px] text-[#5F7A69] block font-mono">
                                                {hill.points.length} Cross-Sections • Peak +{maxH}m
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (onToggleHillVisibility) onToggleHillVisibility(hill.id);
                                                else if (onToggleLayerVisibility) onToggleLayerVisibility('hill1');
                                            }}
                                            className={`p-1.5 rounded-lg border border-[#D0DCCF] bg-white cursor-pointer transition-all duration-200 shadow-2xs ${
                                                isVisible ? 'text-[#1E3B2B] hover:bg-[#d97706] hover:text-white hover:border-[#d97706]' : 'text-slate-400 hover:bg-[#d97706] hover:text-white hover:border-[#d97706]'
                                            }`}
                                            title="Toggle Hill visibility"
                                        >
                                            {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (onToggleHillLock) onToggleHillLock(hill.id);
                                                else if (onToggleLayerLock) onToggleLayerLock('hill1');
                                            }}
                                            className={`p-1.5 rounded-lg border border-[#D0DCCF] bg-white cursor-pointer transition-all duration-200 shadow-2xs ${
                                                isLocked ? 'text-amber-600 hover:bg-amber-500 hover:text-slate-900 hover:border-amber-500' : 'text-[#405646] hover:bg-amber-500 hover:text-slate-900 hover:border-amber-500'
                                            }`}
                                            title="Lock / Unlock Hill"
                                        >
                                            {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                                        </button>

                                        {onDeleteHillLayer && (
                                            <button
                                                type="button"
                                                onClick={() => onDeleteHillLayer(hill.id)}
                                                className="p-1.5 rounded-lg border border-[#D0DCCF] bg-white text-[#405646] hover:text-white hover:bg-rose-600 hover:border-rose-600 cursor-pointer transition-all duration-200 shadow-2xs"
                                                title="Delete this Hill layer"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {expandedLayers[hill.id] && (
                                    <div className="px-3 pb-2.5 pt-1 border-t border-[#E2EBE0] bg-[#FDFBF7] font-mono text-[10px] text-[#5F7A69] space-y-1">
                                        <div className="flex justify-between">
                                            <span>Mode:</span>
                                            <strong className="text-amber-700 capitalize">{hill.generationMode || 'elongated_ridge'}</strong>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Control Vertices:</span>
                                            <strong className="text-[#1E3B2B]">{hill.points.map(p => p.name || p.id).join(' → ')}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }))}
                </div>

                {/* =====================================================================
                    SLOPES GROUP (Dynamic Multi-Layer: Slope 1, Slope 2, ...)
                   ===================================================================== */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1 text-[10px] font-black uppercase text-fuchsia-800 tracking-wider">
                        <span className="flex items-center gap-1">
                            <Hexagon size={11} className="text-fuchsia-600" />
                            <span>Slopes & Uneven Terrains ({effectiveSlopes.length})</span>
                        </span>
                        {onAddSlopeLayer && (
                            <button
                                type="button"
                                onClick={onAddSlopeLayer}
                                className="text-[9px] text-[#244130] bg-white border border-[#D0DCCF] hover:bg-[#c026d3] hover:text-white hover:border-[#c026d3] px-1.5 py-0.5 rounded-lg shadow-2xs flex items-center gap-0.5 cursor-pointer transition-all duration-200"
                            >
                                <Plus size={10} /> Add Slope
                            </button>
                        )}
                    </div>

                    {effectiveSlopes.length === 0 ? (
                        <div className="p-3 rounded-xl bg-white border border-dashed border-[#CFDCCB] text-[11px] text-[#6A8272] italic text-center">
                            {isKa ? 'ფერდობები ჯერ არ არის დახატული' : 'No slopes drawn yet. Click "Draw Slope" in toolbar.'}
                        </div>
                    ) : (
                        effectiveSlopes.map((slope, idx) => {
                        const isSelected = selectedLayerId === slope.id || (idx === 0 && selectedLayerId === 'slope_1');
                        const isLocked = slope.locked ?? (layerLocks?.slope1 ?? false);
                        const isVisible = slope.enabled ?? (layerVisibility?.slope1 ?? true);
                        const vCount = (slope.vertices?.length || 0) + (slope.interiorPoints?.length || 0);

                        return (
                            <div
                                key={`slope-layer-${slope.id || idx}-${idx}`}
                                className={`rounded-xl border transition-all ${
                                    isSelected
                                        ? 'bg-fuchsia-50/70 border-fuchsia-400 shadow-sm ring-1 ring-fuchsia-300'
                                        : 'bg-white border-[#E2EBE0] hover:border-fuchsia-300 shadow-2xs'
                                }`}
                            >
                                <div
                                    onClick={() => onSelectLayer(slope.id)}
                                    className="p-2.5 flex items-center justify-between cursor-pointer select-none"
                                >
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleExpand(slope.id);
                                            }}
                                            className="text-[#6A8272] hover:text-[#1E3B2B] cursor-pointer"
                                        >
                                            {expandedLayers[slope.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>
                                        <Hexagon size={14} className="text-fuchsia-600" />
                                        <div>
                                            <span className="font-bold text-xs text-[#163022]">{slope.name || `Slope ${idx + 1}`}</span>
                                            <span className="text-[9px] text-[#5F7A69] block font-mono">
                                                {vCount} Vertices (3D Mesh) {slope.hasRoadZeroLevel ? '• Road 0 Level' : ''}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (onToggleSlopeVisibility) onToggleSlopeVisibility(slope.id);
                                                else if (onToggleLayerVisibility) onToggleLayerVisibility('slope1');
                                            }}
                                            className={`p-1.5 rounded-lg border border-[#D0DCCF] bg-white cursor-pointer transition-all duration-200 shadow-2xs ${
                                                isVisible ? 'text-[#1E3B2B] hover:bg-[#c026d3] hover:text-white hover:border-[#c026d3]' : 'text-slate-400 hover:bg-[#c026d3] hover:text-white hover:border-[#c026d3]'
                                            }`}
                                            title="Toggle Slope visibility"
                                        >
                                            {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (onToggleSlopeLock) onToggleSlopeLock(slope.id);
                                                else if (onToggleLayerLock) onToggleLayerLock('slope1');
                                            }}
                                            className={`p-1.5 rounded-lg border border-[#D0DCCF] bg-white cursor-pointer transition-all duration-200 shadow-2xs ${
                                                isLocked ? 'text-amber-600 hover:bg-amber-500 hover:text-slate-900 hover:border-amber-500' : 'text-[#405646] hover:bg-amber-500 hover:text-slate-900 hover:border-amber-500'
                                            }`}
                                            title="Lock / Unlock Slope"
                                        >
                                            {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                                        </button>

                                        {onDeleteSlopeLayer && (
                                            <button
                                                type="button"
                                                onClick={() => onDeleteSlopeLayer(slope.id)}
                                                className="p-1.5 rounded-lg border border-[#D0DCCF] bg-white text-[#405646] hover:text-white hover:bg-rose-600 hover:border-rose-600 cursor-pointer transition-all duration-200 shadow-2xs"
                                                title="Delete this Slope layer"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {expandedLayers[slope.id] && (
                                    <div className="px-3 pb-2.5 pt-1 border-t border-[#E2EBE0] bg-[#FAF7FD] font-mono text-[10px] text-[#5F7A69] space-y-1">
                                        <div className="flex justify-between">
                                            <span>Perimeter Boundary:</span>
                                            <strong className="text-[#1E3B2B]">{slope.vertices?.length || 0} pts</strong>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Interior Moving Points:</span>
                                            <strong className="text-fuchsia-700">{slope.interiorPoints?.length || 0} pts</strong>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }))}
                </div>

                {/* =====================================================================
                    PHOTO PINS (GPS EXIF INSPECTION PINS)
                   ===================================================================== */}
                <div
                    className={`rounded-xl border transition-all ${
                        selectedLayerId === 'photo_pins'
                            ? 'bg-cyan-50/70 border-cyan-400 shadow-sm ring-1 ring-cyan-300'
                            : 'bg-white border-[#E2EBE0] hover:border-cyan-300 shadow-2xs'
                    }`}
                >
                    <div 
                        onClick={() => onSelectLayer('photo_pins')}
                        className="p-2.5 flex items-center justify-between cursor-pointer select-none"
                    >
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand('photos_group');
                                }}
                                className="text-[#6A8272] hover:text-[#1E3B2B] cursor-pointer"
                            >
                                {expandedLayers.photos_group ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <Camera size={14} className="text-cyan-600" />
                            <div>
                                <span className="font-bold text-xs text-[#163022]">Photo Pins (GPS)</span>
                                <span className="text-[9px] text-[#5F7A69] block font-mono">{photoPins.length} Geotagged Photos</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onTogglePhotoPinsVisibility) onTogglePhotoPinsVisibility();
                                    else if (onToggleLayerVisibility) onToggleLayerVisibility('photoPins');
                                }}
                                className={`p-1.5 rounded-lg border border-[#D0DCCF] bg-white cursor-pointer transition-all duration-200 shadow-2xs ${
                                    photoPinsVisible ? 'text-[#1E3B2B] hover:bg-[#0891b2] hover:text-white hover:border-[#0891b2]' : 'text-slate-400 hover:bg-[#0891b2] hover:text-white hover:border-[#0891b2]'
                                }`}
                                title="Toggle Photo Pins visibility"
                            >
                                {photoPinsVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                            </button>

                            <button
                                type="button"
                                onClick={onUploadPhotoClick}
                                className="p-1.5 text-[#244130] bg-white border border-[#D0DCCF] hover:bg-[#0891b2] hover:text-white hover:border-[#0891b2] rounded-lg transition-all duration-200 cursor-pointer shadow-2xs"
                                title="Upload new photo with GPS"
                            >
                                <Plus size={13} />
                            </button>
                        </div>
                    </div>

                    {expandedLayers.photos_group && (
                        <div className="px-2.5 pb-2.5 pt-1 border-t border-[#E2EBE0] bg-[#F7FAF5] space-y-1.5">
                            {photoPins.length === 0 ? (
                                <div className="text-center py-2 text-[#6A8272] text-[10px]">
                                    No photos uploaded yet. Click + to add.
                                </div>
                            ) : (
                                photoPins.map((pin) => (
                                    <div
                                        key={pin.id}
                                        onClick={() => onSelectPhotoPin(pin)}
                                        className="p-1.5 bg-white rounded-lg border border-[#E2EBE0] flex items-center justify-between gap-2 hover:border-cyan-500 cursor-pointer transition-colors shadow-2xs"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <img
                                                src={pin.dataUrl}
                                                alt={pin.name}
                                                className="w-8 h-8 rounded object-cover border border-[#CFDCCB] shrink-0"
                                            />
                                            <div className="overflow-hidden">
                                                <span className="text-[10px] text-[#163022] font-bold truncate block">
                                                    {pin.name}
                                                </span>
                                                <span className="text-[9px] text-[#0891b2] font-mono block font-bold">
                                                    {pin.azimuthDeg}° • {pin.altitudeM}m ASL
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeletePhotoPin(pin.id);
                                            }}
                                            className="p-1 text-[#6A8272] hover:text-white hover:bg-rose-600 rounded cursor-pointer transition-colors"
                                            title="Delete photo pin"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
