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
            className={`z-[1250] w-84 sm:w-92 max-w-[calc(100vw-24px)] bg-slate-950/95 border border-cyan-500/50 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-in slide-in-from-left duration-200 ${
                panelPos ? '' : 'absolute left-4 top-20 bottom-8'
            }`}
        >
            {/* Header */}
            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 select-none cursor-grab active:cursor-grabbing"
            >
                <div className="flex items-center gap-2">
                    <GripVertical size={14} className="text-slate-500 hover:text-cyan-400" />
                    <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
                        <Layers size={14} />
                    </div>
                    <div>
                        <h4 className="font-black text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                            {isKa ? 'შრეების ხე (Layer Tree)' : 'Workspace & Layer Tree'}
                        </h4>
                        <span className="text-[10px] text-cyan-300 font-mono">
                            {totalActiveObjects} Active Objects • Multi-Layer
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Close layer tree"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Quick Action Toolbar: + Add Layer */}
            <div className="p-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between relative">
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                        <Plus size={13} className="stroke-[3]" />
                        <span>{isKa ? '+ ახალი შრე' : '+ Add New Layer'}</span>
                        <ChevronDown size={12} />
                    </button>

                    {/* Add Layer Dropdown Menu */}
                    {isAddMenuOpen && (
                        <div className="absolute left-0 top-full mt-1.5 z-50 w-56 bg-slate-900 border border-cyan-500/60 rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in duration-150">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddMenuOpen(false);
                                    if (onAddHillLayer) onAddHillLayer();
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-amber-950/60 text-amber-200 flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer"
                            >
                                <Mountain size={14} className="text-amber-400" />
                                <div>
                                    <div>{isKa ? '🏔️ ახალი ბორცვი / ქედი' : '🏔️ New Hill / Ridge Layer'}</div>
                                    <div className="text-[9px] text-slate-400 font-normal">Crest curve, length & width</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddMenuOpen(false);
                                    if (onAddSlopeLayer) onAddSlopeLayer();
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-fuchsia-950/60 text-fuchsia-200 flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer"
                            >
                                <Hexagon size={14} className="text-fuchsia-400" />
                                <div>
                                    <div>{isKa ? '📐 ახალი ფერდობი / პერიმეტრი' : '📐 New Slope / Perimeter'}</div>
                                    <div className="text-[9px] text-slate-400 font-normal">Uneven terrain, Road 0 level</div>
                                </div>
                            </button>

                            <div className="h-[1px] bg-slate-800 my-1" />

                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddMenuOpen(false);
                                    onUploadPhotoClick();
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-cyan-300 flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer"
                            >
                                <Camera size={13} className="text-cyan-400" />
                                <span>{isKa ? '📷 + ფოტოს პინი (EXIF GPS)' : '📷 + Upload Photo Pin'}</span>
                            </button>
                        </div>
                    )}
                </div>

                <span className="text-[10px] text-slate-400 font-mono">
                    Focus: <strong className="text-cyan-300">{selectedLayerId.replace(/_/g, ' ')}</strong>
                </span>
            </div>

            {/* Layer Tree List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs text-slate-200">

                {/* LAYER 1: BASE GRID */}
                <div
                    className={`rounded-xl border transition-all ${
                        selectedLayerId === 'base_grid'
                            ? 'bg-slate-900/90 border-cyan-400 shadow-md ring-1 ring-cyan-400/40'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
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
                                className="text-slate-400 hover:text-white cursor-pointer"
                            >
                                {expandedLayers.base_grid ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <Grid3X3 size={14} className="text-cyan-400" />
                            <div>
                                <span className="font-bold text-xs text-white">Base Grid</span>
                                <span className="text-[9px] text-slate-400 block font-mono">624m x 624m (+30% Free Area)</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onToggleBaseGridVisibility) onToggleBaseGridVisibility();
                                    else if (onToggleLayerVisibility) onToggleLayerVisibility('baseGrid');
                                }}
                                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                    baseGridVisible ? 'text-cyan-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-800'
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
                                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                    baseGridLocked ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'
                                }`}
                                title="Lock / Unlock Base Grid"
                            >
                                {baseGridLocked ? <Lock size={13} /> : <Unlock size={13} />}
                            </button>
                        </div>
                    </div>

                    {expandedLayers.base_grid && (
                        <div className="px-3 pb-2.5 pt-1 border-t border-slate-800/80 bg-slate-950/60 font-mono text-[10px] text-slate-400 space-y-1">
                            <div className="flex justify-between">
                                <span>Reference Level:</span>
                                <strong className="text-slate-200">0.0 m (Road Level)</strong>
                            </div>
                            <div className="flex justify-between">
                                <span>Grid Area:</span>
                                <strong className="text-slate-200">38.9 Hectares</strong>
                            </div>
                        </div>
                    )}
                </div>

                {/* =====================================================================
                    HILLS GROUP (Dynamic Multi-Layer: Hill 1, Hill 2, ...)
                   ===================================================================== */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1 text-[10px] font-black uppercase text-amber-300/80 tracking-wider">
                        <span className="flex items-center gap-1">
                            <Mountain size={11} className="text-amber-400" />
                            <span>Hills & Mounds ({effectiveHills.length})</span>
                        </span>
                        {onAddHillLayer && (
                            <button
                                type="button"
                                onClick={onAddHillLayer}
                                className="text-[9px] text-amber-300 hover:text-white flex items-center gap-0.5 cursor-pointer"
                            >
                                <Plus size={10} /> Add Hill
                            </button>
                        )}
                    </div>

                    {effectiveHills.length === 0 ? (
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-[11px] text-slate-500 italic text-center">
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
                                        ? 'bg-amber-950/30 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
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
                                            className="text-slate-400 hover:text-white cursor-pointer"
                                        >
                                            {expandedLayers[hill.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>
                                        <Mountain size={14} className="text-amber-400" />
                                        <div>
                                            <span className="font-bold text-xs text-white">{hill.name || `Hill ${idx + 1}`}</span>
                                            <span className="text-[9px] text-slate-400 block font-mono">
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
                                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                                isVisible ? 'text-amber-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-800'
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
                                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                                isLocked ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'
                                            }`}
                                            title="Lock / Unlock Hill"
                                        >
                                            {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                                        </button>

                                        {onDeleteHillLayer && (
                                            <button
                                                type="button"
                                                onClick={() => onDeleteHillLayer(hill.id)}
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 cursor-pointer transition-colors"
                                                title="Delete this Hill layer"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {expandedLayers[hill.id] && (
                                    <div className="px-3 pb-2.5 pt-1 border-t border-slate-800/80 bg-slate-950/60 font-mono text-[10px] text-slate-400 space-y-1">
                                        <div className="flex justify-between">
                                            <span>Mode:</span>
                                            <strong className="text-amber-300 capitalize">{hill.generationMode || 'elongated_ridge'}</strong>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Control Vertices:</span>
                                            <strong className="text-slate-200">{hill.points.map(p => p.name || p.id).join(' → ')}</strong>
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
                    <div className="flex items-center justify-between px-1 text-[10px] font-black uppercase text-fuchsia-300/80 tracking-wider">
                        <span className="flex items-center gap-1">
                            <Hexagon size={11} className="text-fuchsia-400" />
                            <span>Slopes & Uneven Terrains ({effectiveSlopes.length})</span>
                        </span>
                        {onAddSlopeLayer && (
                            <button
                                type="button"
                                onClick={onAddSlopeLayer}
                                className="text-[9px] text-fuchsia-300 hover:text-white flex items-center gap-0.5 cursor-pointer"
                            >
                                <Plus size={10} /> Add Slope
                            </button>
                        )}
                    </div>

                    {effectiveSlopes.length === 0 ? (
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-[11px] text-slate-500 italic text-center">
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
                                        ? 'bg-fuchsia-950/30 border-fuchsia-400 shadow-md ring-1 ring-fuchsia-400/40'
                                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
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
                                            className="text-slate-400 hover:text-white cursor-pointer"
                                        >
                                            {expandedLayers[slope.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>
                                        <Hexagon size={14} className="text-fuchsia-400" />
                                        <div>
                                            <span className="font-bold text-xs text-white">{slope.name || `Slope ${idx + 1}`}</span>
                                            <span className="text-[9px] text-slate-400 block font-mono">
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
                                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                                isVisible ? 'text-fuchsia-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-800'
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
                                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                                isLocked ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'
                                            }`}
                                            title="Lock / Unlock Slope"
                                        >
                                            {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                                        </button>

                                        {onDeleteSlopeLayer && (
                                            <button
                                                type="button"
                                                onClick={() => onDeleteSlopeLayer(slope.id)}
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 cursor-pointer transition-colors"
                                                title="Delete this Slope layer"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {expandedLayers[slope.id] && (
                                    <div className="px-3 pb-2.5 pt-1 border-t border-slate-800/80 bg-slate-950/60 font-mono text-[10px] text-slate-400 space-y-1">
                                        <div className="flex justify-between">
                                            <span>Perimeter Boundary:</span>
                                            <strong className="text-slate-200">{slope.vertices?.length || 0} pts</strong>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Interior Moving Points:</span>
                                            <strong className="text-fuchsia-300">{slope.interiorPoints?.length || 0} pts</strong>
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
                            ? 'bg-slate-900/90 border-cyan-400 shadow-md ring-1 ring-cyan-400/40'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
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
                                className="text-slate-400 hover:text-white cursor-pointer"
                            >
                                {expandedLayers.photos_group ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <Camera size={14} className="text-cyan-400" />
                            <div>
                                <span className="font-bold text-xs text-white">Photo Pins (GPS)</span>
                                <span className="text-[9px] text-slate-400 block font-mono">{photoPins.length} Geotagged Photos</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onTogglePhotoPinsVisibility) onTogglePhotoPinsVisibility();
                                    else if (onToggleLayerVisibility) onToggleLayerVisibility('photoPins');
                                }}
                                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                    photoPinsVisible ? 'text-cyan-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-800'
                                }`}
                                title="Toggle Photo Pins visibility"
                            >
                                {photoPinsVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                            </button>

                            <button
                                type="button"
                                onClick={onUploadPhotoClick}
                                className="p-1.5 text-cyan-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Upload new photo with GPS"
                            >
                                <Plus size={13} />
                            </button>
                        </div>
                    </div>

                    {expandedLayers.photos_group && (
                        <div className="px-2.5 pb-2.5 pt-1 border-t border-slate-800/80 bg-slate-950/60 space-y-1.5">
                            {photoPins.length === 0 ? (
                                <div className="text-center py-2 text-slate-500 text-[10px]">
                                    No photos uploaded yet. Click + to add.
                                </div>
                            ) : (
                                photoPins.map((pin) => (
                                    <div
                                        key={pin.id}
                                        onClick={() => onSelectPhotoPin(pin)}
                                        className="p-1.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between gap-2 hover:border-cyan-500/50 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <img
                                                src={pin.dataUrl}
                                                alt={pin.name}
                                                className="w-8 h-8 rounded object-cover border border-slate-700 shrink-0"
                                            />
                                            <div className="overflow-hidden">
                                                <span className="text-[10px] text-white font-bold truncate block">
                                                    {pin.name}
                                                </span>
                                                <span className="text-[9px] text-cyan-300 font-mono block">
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
                                            className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 cursor-pointer"
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
