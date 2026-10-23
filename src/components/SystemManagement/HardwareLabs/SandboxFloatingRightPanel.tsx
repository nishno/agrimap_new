import React, { useState, useRef, useMemo } from 'react';
import { 
    Mountain, Plus, Trash2, X, Sparkles, Satellite, 
    Layers, RefreshCw, ChevronRight, Activity, Sliders,
    GripVertical, RotateCcw, ChevronUp, ChevronDown, Undo2,
    Compass, Move, Split, ArrowDownRight, ArrowUpRight,
    Hexagon, Lock, Eye, CheckCircle2
} from 'lucide-react';
import type { 
    HillSpineProfile, 
    SpineControlPoint, 
    ProfileBreakPoint,
    LongitudinalControlPoint,
    PerimeterSlopeVertex 
} from '../../../utils/demTerrainViewshed';
import type { LayerId } from './SandboxLayerTreePanel';
import { calculatePathSegments, type TerrainSegmentMetrics } from '../../../utils/terrainSlopeAnalysis';

interface SandboxFloatingRightPanelProps {
    isOpen: boolean;
    onClose: () => void;
    selectedLayerId?: LayerId;
    onSelectLayer?: (layerId: LayerId) => void;
    hillSpineProfile: HillSpineProfile;
    activePoint: SpineControlPoint;
    activePointId: string;
    onSelectPointId: (id: string) => void;
    onUpdateActivePoint: (patch: Partial<SpineControlPoint>) => void;
    onUpdateHillSpineProfile?: (patch: Partial<HillSpineProfile>) => void;
    onAddSpinePoint: () => void;
    onInsertSpinePointAtMidpoint: () => void;
    onDeleteSpinePoint: (id: string) => void;
    onDeleteLastPoint?: () => void;
    canDeleteLastPoint?: boolean;
    onStartDrawSlope?: () => void;
    onFitSlopeToOrchard?: () => void;
    onClearSlope?: () => void;
    onDeleteWholeSlope?: () => void;
    measuredHillLengthM: number;
    moundMetrics: { maxH: number; minH: number; avgWidth: number; maxWidth: number };
    isAiSlopeScanning: boolean;
    onAiAutoDetectSlope: () => void;
    onLoadSatelliteDem: () => void;
    baseElevationM?: number;
    // Slope 1 Perimeter Vertices
    perimeterVertices?: PerimeterSlopeVertex[];
    onUpdatePerimeterVertex?: (id: string, patch: Partial<PerimeterSlopeVertex>) => void;
    onAddPerimeterVertex?: () => void;
    onDeletePerimeterVertex?: (id: string, index?: number) => void;
    onStartDrawPerimeter?: () => void;
    isKa?: boolean;
}

export const SandboxFloatingRightPanel: React.FC<SandboxFloatingRightPanelProps> = ({
    isOpen,
    onClose,
    selectedLayerId = 'hill_1',
    onSelectLayer,
    hillSpineProfile,
    activePoint,
    activePointId,
    onSelectPointId,
    onUpdateActivePoint,
    onUpdateHillSpineProfile,
    onAddSpinePoint,
    onInsertSpinePointAtMidpoint,
    onDeleteSpinePoint,
    onDeleteLastPoint,
    canDeleteLastPoint,
    onStartDrawSlope,
    onFitSlopeToOrchard,
    onClearSlope,
    onDeleteWholeSlope,
    measuredHillLengthM,
    moundMetrics,
    isAiSlopeScanning,
    onAiAutoDetectSlope,
    onLoadSatelliteDem,
    baseElevationM = 480,
    perimeterVertices = [],
    onUpdatePerimeterVertex,
    onAddPerimeterVertex,
    onDeletePerimeterVertex,
    onStartDrawPerimeter,
    isKa = false
}) => {
    // Panel Position & Fold State
    const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
    const [isMinimized, setIsMinimized] = useState<boolean>(false);
    const [profileDimension, setProfileDimension] = useState<'width' | 'length'>('width');

    const containerRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);

    // Dragging state on 2D Profile diagrams
    const [draggingDraftItem, setDraggingDraftItem] = useState<{
        type: 'apex' | 'plat_start' | 'plat_end' | 'left_width' | 'right_width' | 'breakpoint' | 'long_ascent' | 'long_apex' | 'long_descent';
        bpId?: string;
    } | null>(null);

    // Calculated Point-to-Point Distances & Inclines / Declines for Hill Ridge Spine
    const hillSegments = useMemo<TerrainSegmentMetrics[]>(() => {
        if (!hillSpineProfile?.points || hillSpineProfile.points.length < 2) return [];
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
    }, [hillSpineProfile?.points]);

    // Calculated Point-to-Point Distances & Inclines / Declines for Slope 3D Perimeter
    const slopeSegments = useMemo<TerrainSegmentMetrics[]>(() => {
        if (!perimeterVertices || perimeterVertices.length < 2) return [];
        return calculatePathSegments(
            perimeterVertices.map((v, idx) => ({
                id: v.id,
                lat: v.lat,
                lng: v.lng,
                z: v.elevationOffsetM,
                label: `Vertex #${idx + 1}`
            })),
            perimeterVertices.length >= 3
        );
    }, [perimeterVertices]);

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
            startLeft: rect ? rect.left : (window.innerWidth - 440),
            startTop: rect ? rect.top : 64
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

    const estimatedVolumeM3 = Math.round(measuredHillLengthM * (moundMetrics.avgWidth || 45) * Math.max(1, moundMetrics.maxH || 25) * 0.42);

    // Cross-Section Canvas constants
    const SVG_W = 360;
    const SVG_H = 190;
    const BASE_Y = 145; // Baseline elevation 0
    const CENTER_X = 180; // 0m apex center
    const scaleX = 2.2; // 1m = 2.2px
    const scaleY = 1.8; // 1m = 1.8px

    const toSvgX = (distM: number) => CENTER_X + distM * scaleX;
    const fromSvgX = (svgX: number) => Math.round((svgX - CENTER_X) / scaleX);
    const toSvgY = (heightM: number) => BASE_Y - heightM * scaleY;
    const fromSvgY = (svgY: number) => Math.round((BASE_Y - svgY) / scaleY);

    const leftW = activePoint?.leftWidthM ?? (activePoint?.widthM ? Math.round(activePoint.widthM / 2) : 35);
    const rightW = activePoint?.rightWidthM ?? (activePoint?.widthM ? Math.round(activePoint.widthM / 2) : 25);
    const platStart = activePoint?.plateauStartM !== undefined ? activePoint.plateauStartM : -(activePoint?.startOffsetM || 4);
    const platEnd = activePoint?.plateauEndM !== undefined ? activePoint.plateauEndM : (activePoint?.startOffsetM || 4);
    const H = activePoint?.peakHeightM !== undefined ? activePoint.peakHeightM : 25;
    const breakPoints = activePoint?.breakPoints || [];

    // Longitudinal profile data (along spine length 0m to L)
    const effectiveSpineLength = Math.max(40, measuredHillLengthM || 240);
    const longPoints: LongitudinalControlPoint[] = useMemo(() => {
        if (hillSpineProfile.longitudinalPoints && hillSpineProfile.longitudinalPoints.length >= 3) {
            return hillSpineProfile.longitudinalPoints;
        }
        return [
            { id: 'lp-0', distM: 0, heightM: 0 },
            { id: 'lp-1', distM: 20, heightM: Math.round(H * 0.45), breakPoint: true },
            { id: 'lp-2', distM: Math.round(effectiveSpineLength * 0.5), heightM: H },
            { id: 'lp-3', distM: Math.round(effectiveSpineLength * 0.8), heightM: Math.round(H * 0.35), breakPoint: true },
            { id: 'lp-4', distM: effectiveSpineLength, heightM: 0 }
        ];
    }, [hillSpineProfile.longitudinalPoints, effectiveSpineLength, H]);

    // Longitudinal SVG mapping
    const longScaleX = (SVG_W - 40) / effectiveSpineLength;
    const toLongSvgX = (distM: number) => 20 + distM * longScaleX;
    const fromLongSvgX = (svgX: number) => Math.round(Math.max(0, Math.min(effectiveSpineLength, (svgX - 20) / longScaleX)));

    // Drag handlers
    const handleStartDrag = (
        e: React.PointerEvent,
        type: 'apex' | 'plat_start' | 'plat_end' | 'left_width' | 'right_width' | 'breakpoint' | 'long_ascent' | 'long_apex' | 'long_descent',
        bpId?: string
    ) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            (e.target as Element).setPointerCapture(e.pointerId);
        } catch (_) {}
        setDraggingDraftItem({ type, bpId });
    };

    const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        if (!draggingDraftItem || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const svgX = (clickX / rect.width) * SVG_W;
        const svgY = (clickY / rect.height) * SVG_H;

        if (profileDimension === 'width') {
            const distM = fromSvgX(svgX);
            const heightM = Math.max(-25, Math.min(65, fromSvgY(svgY)));

            if (draggingDraftItem.type === 'apex') {
                onUpdateActivePoint({ peakHeightM: heightM });
            } else if (draggingDraftItem.type === 'plat_start') {
                const clamped = Math.min(-1, Math.max(-leftW + 2, distM));
                onUpdateActivePoint({ plateauStartM: clamped });
            } else if (draggingDraftItem.type === 'plat_end') {
                const clamped = Math.max(1, Math.min(rightW - 2, distM));
                onUpdateActivePoint({ plateauEndM: clamped });
            } else if (draggingDraftItem.type === 'left_width') {
                const newL = Math.max(2, Math.abs(distM));
                onUpdateActivePoint({ leftWidthM: newL, widthM: Math.round((newL + rightW) / 2) });
            } else if (draggingDraftItem.type === 'right_width') {
                const newR = Math.max(2, Math.abs(distM));
                onUpdateActivePoint({ rightWidthM: newR, widthM: Math.round((leftW + newR) / 2) });
            } else if (draggingDraftItem.type === 'breakpoint') {
                const nextBps = breakPoints.map(b => {
                    if (b.id === draggingDraftItem.bpId) {
                        return { ...b, distanceM: distM, heightM: Math.max(0, heightM) };
                    }
                    return b;
                });
                onUpdateActivePoint({ breakPoints: nextBps });
            }
        } else {
            // Longitudinal Mode (Length along Z axis)
            const distM = fromLongSvgX(svgX);
            const heightM = Math.max(0, Math.min(65, fromSvgY(svgY)));

            if (onUpdateHillSpineProfile) {
                const updated = longPoints.map(p => {
                    if (draggingDraftItem.type === 'long_ascent' && p.id === 'lp-1') {
                        return { ...p, distM: Math.max(4, Math.min(distM, effectiveSpineLength * 0.45)), heightM };
                    }
                    if (draggingDraftItem.type === 'long_apex' && p.id === 'lp-2') {
                        return { ...p, distM: Math.max(effectiveSpineLength * 0.2, Math.min(distM, effectiveSpineLength * 0.75)), heightM };
                    }
                    if (draggingDraftItem.type === 'long_descent' && p.id === 'lp-3') {
                        return { ...p, distM: Math.max(effectiveSpineLength * 0.55, Math.min(distM, effectiveSpineLength - 4)), heightM };
                    }
                    return p;
                });
                onUpdateHillSpineProfile({ longitudinalPoints: updated });
            }
        }

        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
    };

    const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
        if (draggingDraftItem) {
            try {
                (e.target as Element).releasePointerCapture(e.pointerId);
            } catch (_) {}
            setDraggingDraftItem(null);
            window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
        }
    };

    const handleAddBreakPoint = (distM = -20, hM = 12) => {
        const newBp: ProfileBreakPoint = {
            id: `bp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            distanceM: distM,
            heightM: hM
        };
        const nextBps = [...breakPoints, newBp].sort((a, b) => a.distanceM - b.distanceM);
        onUpdateActivePoint({ breakPoints: nextBps });
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
    };

    const handleDeleteBreakPoint = (bpId: string) => {
        const nextBps = breakPoints.filter(b => b.id !== bpId);
        onUpdateActivePoint({ breakPoints: nextBps });
        window.dispatchEvent(new CustomEvent('agrimap:terrain_mesh_sync'));
    };

    // Construct Smooth Bézier Curve D-String for Cross-Section (Width)
    const nodes: [number, number][] = [
        [toSvgX(-leftW), toSvgY(0)],
        ...breakPoints.filter(b => b.distanceM < platStart).map(b => [toSvgX(b.distanceM), toSvgY(b.heightM)] as [number, number]),
        [toSvgX(platStart), toSvgY(H)],
        [toSvgX(0), toSvgY(H)],
        [toSvgX(platEnd), toSvgY(H)],
        ...breakPoints.filter(b => b.distanceM > platEnd).map(b => [toSvgX(b.distanceM), toSvgY(b.heightM)] as [number, number]),
        [toSvgX(rightW), toSvgY(0)]
    ];

    let profileCurveD = `M ${nodes[0][0].toFixed(1)} ${nodes[0][1].toFixed(1)}`;
    for (let i = 0; i < nodes.length - 1; i++) {
        const p1 = nodes[i];
        const p2 = nodes[i + 1];
        const dx = p2[0] - p1[0];
        const cx1 = p1[0] + dx * 0.45;
        const cy1 = p1[1];
        const cx2 = p1[0] + dx * 0.55;
        const cy2 = p2[1];
        profileCurveD += ` C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    const profileAreaD = `${profileCurveD} L ${toSvgX(rightW).toFixed(1)} ${toSvgY(0)} L ${toSvgX(-leftW).toFixed(1)} ${toSvgY(0)} Z`;

    // Construct Smooth Bézier Curve D-String for Longitudinal Profile (Length along Z)
    const longNodes: [number, number][] = longPoints.map(p => [toLongSvgX(p.distM), toSvgY(p.heightM)]);
    let longCurveD = `M ${longNodes[0][0].toFixed(1)} ${longNodes[0][1].toFixed(1)}`;
    for (let i = 0; i < longNodes.length - 1; i++) {
        const p1 = longNodes[i];
        const p2 = longNodes[i + 1];
        const dx = p2[0] - p1[0];
        const cx1 = p1[0] + dx * 0.45;
        const cy1 = p1[1];
        const cx2 = p1[0] + dx * 0.55;
        const cy2 = p2[1];
        longCurveD += ` C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    const longAreaD = `${longCurveD} L ${toLongSvgX(effectiveSpineLength).toFixed(1)} ${toSvgY(0)} L ${toLongSvgX(0).toFixed(1)} ${toSvgY(0)} Z`;

    const leftAscentDist = Math.max(1, Math.abs(platStart - (-leftW)));
    const leftSlopeDeg = Math.round(Math.atan2(Math.abs(H), leftAscentDist) * (180 / Math.PI));
    const rightDescentDist = Math.max(1, Math.abs(rightW - platEnd));
    const rightSlopeDeg = Math.round(Math.atan2(Math.abs(H), rightDescentDist) * (180 / Math.PI));

    const isSlopeLayerActive = selectedLayerId === 'slope_1' || (typeof selectedLayerId === 'string' && selectedLayerId.startsWith('slope'));

    return (
        <div 
            ref={containerRef}
            style={panelPos ? {
                position: 'absolute',
                left: `${panelPos.x}px`,
                top: `${panelPos.y}px`,
                bottom: 'auto',
                maxHeight: 'calc(100vh - 80px)'
            } : undefined}
            className={`z-[1200] w-92 sm:w-[430px] max-w-[calc(100vw-24px)] bg-slate-950/95 border border-cyan-500/50 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 ${
                panelPos ? '' : 'absolute right-3 top-16 bottom-4'
            }`}
        >
            {/* Header with Movable Grip & Layer Switcher */}
            <div 
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 select-none cursor-grab active:cursor-grabbing"
            >
                <div className="flex items-center gap-2 flex-1">
                    <GripVertical size={15} className="text-slate-500 hover:text-cyan-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <div>
                        <h4 className="font-black text-xs sm:text-sm text-cyan-300 uppercase tracking-tight flex items-center gap-1.5">
                            {isSlopeLayerActive ? <Hexagon size={15} className="text-fuchsia-400" /> : <Mountain size={15} className="text-amber-400" />}
                            {isSlopeLayerActive ? 'Slope 1: 3D Triangulated Mesh' : (isKa ? '3D რელიეფის & ქედის მოდელირება' : '3D Mound & Slope Sculptor')}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                            Focus: <strong className="text-white">{isSlopeLayerActive ? 'Slope 1 (Uneven Terrain)' : 'Hill 1 (Ridge Spine)'}</strong>
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {onSelectLayer && (
                        <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                            <button
                                type="button"
                                onClick={() => onSelectLayer('hill_1')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                    !isSlopeLayerActive ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                                }`}
                                title="Focus Hill 1"
                            >
                                Hill 1
                            </button>
                            <button
                                type="button"
                                onClick={() => onSelectLayer('slope_1')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                    isSlopeLayerActive ? 'bg-fuchsia-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                                title="Focus Slope 1"
                            >
                                Slope 1
                            </button>
                        </div>
                    )}

                    {panelPos && (
                        <button
                            type="button"
                            onClick={() => setPanelPos(null)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
                            title="Reset position to right"
                        >
                            <RotateCcw size={12} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                        {isMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                        <X size={15} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs text-slate-200">

                {/* =========================================================================
                    MODE A: SLOPE 1 (UNEVEN TERRAIN PERIMETER & 3D TRIANGULATION)
                   ========================================================================= */}
                {isSlopeLayerActive ? (
                    <div className="space-y-3.5">
                        {/* Stat Card */}
                        <div className="p-3 bg-gradient-to-r from-fuchsia-950/80 via-slate-900 to-slate-950 border border-fuchsia-500/60 rounded-2xl flex items-center justify-between shadow-lg">
                            <div>
                                <span className="text-[10px] text-fuchsia-300/90 font-black uppercase tracking-wider block">
                                    Uneven Terrain Perimeter (3D Mesh)
                                </span>
                                <span className="text-2xl font-mono font-black text-fuchsia-300 tracking-tight">
                                    {perimeterVertices.length} Vertices
                                </span>
                            </div>
                            <div className="text-right font-mono text-[10px] text-slate-400 space-y-0.5">
                                <div className="text-emerald-400 font-bold">3D Triangulation Active</div>
                                <div className="text-slate-300">X, Y, Z Editable</div>
                            </div>
                        </div>

                        {/* Action buttons & Delete Slope */}
                        <div className="flex items-center gap-2">
                            {onDeleteWholeSlope && (
                                <button
                                    type="button"
                                    onClick={onDeleteWholeSlope}
                                    className="py-1.5 px-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/60 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow"
                                    title={isKa ? 'მთლიანი ფერდობის წაშლა' : 'Delete entire slope'}
                                >
                                    <Trash2 size={11} className="text-rose-400" />
                                    <span>{isKa ? 'წაშლა' : 'Delete Slope'}</span>
                                </button>
                            )}
                            {onStartDrawPerimeter && (
                                <button
                                    type="button"
                                    onClick={onStartDrawPerimeter}
                                    className="flex-1 py-1.5 px-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow active:scale-95 transition-all"
                                >
                                    <Hexagon size={12} />
                                    <span>Draw Perimeter on Map</span>
                                </button>
                            )}
                            {onAddPerimeterVertex && (
                                <button
                                    type="button"
                                    onClick={onAddPerimeterVertex}
                                    className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-fuchsia-300 border border-fuchsia-700/60 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                >
                                    <Plus size={11} />
                                    <span>+ 3D Vertex</span>
                                </button>
                            )}
                        </div>

                        {/* Vertices List with X, Y, Z controls */}
                        <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Multi-Point 3D Vertices (Lateral X/Y & Elevation Z):
                            </span>

                            {perimeterVertices.length === 0 ? (
                                <div className="p-3 text-center text-slate-500 text-[11px] italic bg-slate-950 rounded-xl border border-dashed border-slate-800">
                                    No perimeter vertices drawn yet. Click "Draw Perimeter on Map" or "+ 3D Vertex".
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                    {perimeterVertices.map((v, idx) => (
                                        <div 
                                            key={v.id}
                                            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-[10px] font-mono"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-fuchsia-300 flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
                                                    Vertex #{idx + 1}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-emerald-300 font-bold">
                                                        Z: +{v.elevationOffsetM}m
                                                    </span>
                                                    {onDeletePerimeterVertex && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                onDeletePerimeterVertex(v.id, idx);
                                                            }}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-950/80 active:scale-95 cursor-pointer transition-all border border-transparent hover:border-rose-700/50"
                                                            title={`Delete Vertex #${idx + 1}`}
                                                        >
                                                            <Trash2 size={13} className="text-rose-400" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Z Elevation Slider */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-500 text-[8px] uppercase shrink-0">Elevation (Z):</span>
                                                <input
                                                    type="range"
                                                    min="-15"
                                                    max="45"
                                                    value={v.elevationOffsetM}
                                                    onChange={(e) => onUpdatePerimeterVertex && onUpdatePerimeterVertex(v.id, { elevationOffsetM: Number(e.target.value) })}
                                                    className="flex-1 accent-fuchsia-400 cursor-pointer"
                                                />
                                                <span className="w-10 text-right text-fuchsia-200 font-bold">
                                                    +{v.elevationOffsetM}m
                                                </span>
                                            </div>

                                            {/* X & Y (Lat/Lng) fine-tune inputs */}
                                            <div className="grid grid-cols-2 gap-2 text-[9px]">
                                                <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                                    <span className="text-slate-500">Lat:</span>
                                                    <input
                                                        type="number"
                                                        step="0.00005"
                                                        value={Number(v.lat.toFixed(5))}
                                                        onChange={(e) => onUpdatePerimeterVertex && onUpdatePerimeterVertex(v.id, { lat: Number(e.target.value) })}
                                                        className="w-full bg-transparent text-slate-200 font-mono text-[9px]"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                                    <span className="text-slate-500">Lng:</span>
                                                    <input
                                                        type="number"
                                                        step="0.00005"
                                                        value={Number(v.lng.toFixed(5))}
                                                        onChange={(e) => onUpdatePerimeterVertex && onUpdatePerimeterVertex(v.id, { lng: Number(e.target.value) })}
                                                        className="w-full bg-transparent text-slate-200 font-mono text-[9px]"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* SLOPE POINT-TO-POINT DISTANCE & INCLINE/DECLINE METRICS */}
                        {slopeSegments.length > 0 && (
                            <div className="p-3 bg-slate-900/90 rounded-2xl border border-fuchsia-500/50 shadow-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-fuchsia-300 flex items-center gap-1">
                                        📐 {isKa ? 'წერტილთაშორისი მანძილი და დახრილობა' : 'Point-to-Point Distance & Incline/Decline'}
                                    </span>
                                    <span className="text-[9px] font-mono text-slate-400">
                                        {slopeSegments.length} Segments
                                    </span>
                                </div>
                                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                                    {slopeSegments.map((seg, idx) => {
                                        const isInc = seg.type === 'incline';
                                        const isDec = seg.type === 'decline';
                                        const colorCls = isInc ? 'text-emerald-400' : isDec ? 'text-rose-400' : 'text-fuchsia-300';
                                        const bgCls = isInc ? 'bg-emerald-950/30 border-emerald-800/40' : isDec ? 'bg-rose-950/30 border-rose-800/40' : 'bg-slate-950 border-slate-800';
                                        const arrow = isInc ? '↗' : isDec ? '↘' : '→';
                                        const sign = seg.elevationDeltaM > 0 ? '+' : '';

                                        return (
                                            <div 
                                                key={`slope-seg-${idx}`}
                                                className={`p-2 rounded-xl border ${bgCls} flex items-center justify-between text-[10px] font-mono`}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-fuchsia-300">{seg.fromLabel} → {seg.toLabel}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-slate-300 font-bold">{seg.distanceM}m</span>
                                                    <span className={`font-black ${colorCls}`}>
                                                        {arrow} {sign}{seg.inclinePct}% ({seg.angleDeg}°)
                                                    </span>
                                                    <span className="text-slate-400 text-[9px]">ΔZ: {sign}{seg.elevationDeltaM}m</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* =========================================================================
                        MODE B: HILL 1 (3D RIDGE MOUND & LONGITUDINAL/CROSS-SECTION PROFILES)
                       ========================================================================= */
                    <div className="space-y-3.5">
                        {/* DELETE ENTIRE HILL BUTTON */}
                        {onDeleteWholeSlope && (
                            <button
                                type="button"
                                onClick={onDeleteWholeSlope}
                                className="w-full py-2 px-3 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-600/70 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                                title={isKa ? 'მთლიანი ბორცვის / ქედის წაშლა 2D და 3D-დან' : 'Delete entire hill / ridge from 2D & 3D'}
                            >
                                <Trash2 size={13} className="text-rose-400" />
                                <span>{isKa ? 'მთლიანი ბორცვის / ქედის წაშლა' : 'Delete Entire Hill / Ridge'}</span>
                            </button>
                        )}

                        {/* PROMINENT SLOPE LENGTH STAT CARD */}
                        <div className="p-3 bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-950 border border-amber-500/60 rounded-2xl flex items-center justify-between shadow-lg">
                            <div>
                                <span className="text-[10px] text-amber-300/90 font-black uppercase tracking-wider block">
                                    {isKa ? 'ქედის სიგრძე (Slope Spine Length)' : 'Measured Slope Length (Line)'}
                                </span>
                                <span className="text-2xl font-mono font-black text-amber-300 tracking-tight">
                                    {measuredHillLengthM} m
                                </span>
                            </div>
                            <div className="text-right font-mono text-[10px] text-slate-400 space-y-0.5">
                                <div className="text-slate-300 font-bold">{hillSpineProfile.points.length} Cross-Sections</div>
                                <div className="text-cyan-400">Vol: ~{estimatedVolumeM3.toLocaleString()} m³</div>
                                <div className="text-emerald-400">Avg W: {moundMetrics.avgWidth}m</div>
                            </div>
                        </div>

                        {/* TOGGLE SYSTEM: [WIDTH] AND [LENGTH] CONTROLS */}
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                2D Curve Profile Mode (Synchronous 3D):
                            </span>
                            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setProfileDimension('width')}
                                    className={`py-2 px-3 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                        profileDimension === 'width'
                                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md ring-2 ring-cyan-300'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                    }`}
                                >
                                    <Sliders size={13} />
                                    <span>[Width] Cross-Section (X)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProfileDimension('length')}
                                    className={`py-2 px-3 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                        profileDimension === 'length'
                                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md ring-2 ring-amber-300'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                    }`}
                                >
                                    <Activity size={13} />
                                    <span>[Length] Longitudinal (Z)</span>
                                </button>
                            </div>
                        </div>

                        {/* AXIAL POINTS SELECTOR (When in Width mode) */}
                        {profileDimension === 'width' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Cross-Section Points:
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={onInsertSpinePointAtMidpoint}
                                            className="px-2 py-0.5 bg-blue-900/70 hover:bg-blue-800 text-blue-200 border border-blue-600/50 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                        >
                                            <Plus size={10} />
                                            <span>Midpoint</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={onAddSpinePoint}
                                            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow"
                                        >
                                            <Plus size={10} />
                                            <span>+ Point</span>
                                        </button>
                                        {onDeleteSpinePoint && activePointId && (
                                            <button
                                                type="button"
                                                onClick={() => onDeleteSpinePoint(activePointId)}
                                                className="px-2 py-0.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/60 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow"
                                                title={isKa ? 'არჩეული წერტილის წაშლა' : 'Delete selected point'}
                                            >
                                                <Trash2 size={10} className="text-rose-400" />
                                                <span>{isKa ? 'წერტილის წაშლა' : 'Delete Pt'}</span>
                                            </button>
                                        )}
                                        {onDeleteLastPoint && (
                                            <button
                                                type="button"
                                                onClick={onDeleteLastPoint}
                                                disabled={!canDeleteLastPoint && hillSpineProfile.points.length === 0}
                                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                                title={isKa ? 'ბოლო წერტილის გაუქმება' : 'Undo last point'}
                                            >
                                                <Undo2 size={10} />
                                                <span>Back ⌫</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {hillSpineProfile.points.map((pt, idx) => {
                                        const isSelected = pt.id === activePointId;
                                        const letter = String.fromCharCode(65 + idx);
                                        const isMid = idx === Math.floor(hillSpineProfile.points.length / 2);
                                        return (
                                            <div
                                                key={`sculpt-pt-${pt.id}-${idx}`}
                                                className={`px-2 py-1 rounded-xl font-mono text-xs font-bold flex items-center gap-1 transition-all ${
                                                    isSelected
                                                        ? 'bg-amber-500 text-slate-950 font-black shadow-md ring-2 ring-amber-300'
                                                        : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                                                }`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => onSelectPointId(pt.id)}
                                                    className="flex items-center gap-1 cursor-pointer"
                                                >
                                                    <span>{letter}</span>
                                                    {isMid && <span className="text-[8px] px-1 bg-amber-950 text-amber-300 rounded font-sans font-bold">Apex</span>}
                                                    <span className="text-[9px] opacity-80">{pt.peakHeightM > 0 ? `+${pt.peakHeightM}` : pt.peakHeightM}m</span>
                                                    <span className="text-[8px] text-cyan-300">W:{pt.widthM}m</span>
                                                </button>
                                                {onDeleteSpinePoint && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteSpinePoint(pt.id);
                                                        }}
                                                        className="ml-0.5 p-0.5 rounded text-rose-300 hover:text-white hover:bg-rose-900/80 cursor-pointer font-bold text-[11px]"
                                                        title={`Delete Point ${letter}`}
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* ACTIVE POINT HEIGHT (Z) CONTROL */}
                                {activePoint && (
                                    <div className="p-2.5 bg-slate-950 rounded-xl border border-amber-500/40 space-y-1.5 font-mono text-[10px]">
                                        <div className="flex items-center justify-between">
                                            <span className="text-amber-300 font-bold flex items-center gap-1">
                                                <Mountain size={11} /> {activePoint.name || `Point ${activePointId}`} {isKa ? 'სიმაღლე (Z)' : 'Height (Z)'}:
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-black text-xs">
                                                    {activePoint.peakHeightM >= 0 ? `+${activePoint.peakHeightM}m` : `${activePoint.peakHeightM}m`}
                                                </span>
                                                {onDeleteSpinePoint && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onDeleteSpinePoint(activePoint.id)}
                                                        className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                                        title={isKa ? 'ამ წერტილის წაშლა' : 'Delete this point'}
                                                    >
                                                        <Trash2 size={10} />
                                                        <span>{isKa ? 'წაშლა' : 'Delete'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onUpdateActivePoint({ peakHeightM: Math.max(-10, (activePoint.peakHeightM || 0) - 1) })}
                                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                                            >
                                                -1m
                                            </button>
                                            <input
                                                type="range"
                                                min="-10"
                                                max="60"
                                                value={activePoint.peakHeightM}
                                                onChange={(e) => onUpdateActivePoint({ peakHeightM: Number(e.target.value) })}
                                                className="flex-1 accent-amber-400 cursor-pointer"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => onUpdateActivePoint({ peakHeightM: Math.min(80, (activePoint.peakHeightM || 0) + 1) })}
                                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                                            >
                                                +1m
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* HERO DRAFTING WORKBENCH: LIVE SVG PROFILE CANVAS */}
                        <div className="p-3 bg-slate-900/90 rounded-2xl border border-cyan-500/40 shadow-xl space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Activity size={14} className={profileDimension === 'width' ? 'text-cyan-400' : 'text-amber-400'} />
                                    <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300">
                                        {profileDimension === 'width' 
                                            ? 'Cross-Section (X-Axis): Peak, Plateau & Tangents'
                                            : 'Longitudinal Section (Z-Axis): Ascent, Peak & Descent'}
                                    </span>
                                </div>
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                                    {profileDimension === 'width' ? activePoint.name : `${measuredHillLengthM}m Ridge`}
                                </span>
                            </div>

                            <p className="text-[10px] text-slate-400 leading-tight">
                                {profileDimension === 'width'
                                    ? 'Drag Blue vertex for Peak (H), Orange lines for Plateau guides, Break Points for side tangents, L/R handles for widths.'
                                    : 'Drag Start (0m), 20m Break Point (gradual ascent), Apex Peak, and Descent Break Point to model hill length in 3D.'}
                            </p>

                            {/* SVG CANVAS */}
                            <div className="relative w-full h-[210px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 select-none shadow-inner">
                                <svg
                                    ref={svgRef}
                                    viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                                    className="w-full h-full cursor-crosshair"
                                    onPointerMove={handleSvgPointerMove}
                                    onPointerUp={handleSvgPointerUp}
                                >
                                    <defs>
                                        <linearGradient id="slopeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor={profileDimension === 'width' ? '#06b6d4' : '#f59e0b'} stopOpacity="0.45" />
                                            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.05" />
                                        </linearGradient>
                                        <pattern id="draftGrid" width="22" height="18" patternUnits="userSpaceOnUse">
                                            <path d="M 22 0 L 0 0 0 18" fill="none" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="1,2" />
                                        </pattern>
                                    </defs>

                                    {/* Grid & Baseline */}
                                    <rect width={SVG_W} height={SVG_H} fill="url(#draftGrid)" />
                                    <line x1="10" y1={BASE_Y} x2={SVG_W - 10} y2={BASE_Y} stroke="#475569" strokeWidth="1.2" strokeDasharray="3,3" />
                                    <text x="14" y={BASE_Y - 4} fill="#64748b" fontSize="8" fontFamily="monospace">Z = 0m (Base ASL: {baseElevationM}m)</text>

                                    {/* WIDTH (CROSS-SECTION) RENDERING */}
                                    {profileDimension === 'width' && (
                                        <>
                                            {/* Center Apex Axis */}
                                            <line x1={CENTER_X} y1="12" x2={CENTER_X} y2={BASE_Y + 12} stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.6" />
                                            <text x={CENTER_X} y={BASE_Y + 10} fill="#38bdf8" fontSize="8" fontFamily="monospace" textAnchor="middle">0m (Apex)</text>

                                            {/* Shaded Area & Blue Curve */}
                                            <path d={profileAreaD} fill="url(#slopeGrad)" />
                                            <path d={profileCurveD} fill="none" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                                            {/* Orange Plateau Guides */}
                                            <line x1={toSvgX(platStart)} y1={toSvgY(H)} x2={toSvgX(platStart)} y2={BASE_Y + 12} stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,2" />
                                            <g transform={`translate(${toSvgX(platStart)}, ${toSvgY(H)})`} onPointerDown={(e) => handleStartDrag(e, 'plat_start')} className="cursor-ew-resize">
                                                <rect x="-12" y="-14" width="24" height="14" rx="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.2" />
                                                <text x="0" y="-4" fill="#0f172a" fontSize="7" fontWeight="bold" textAnchor="middle">{Math.round(platStart)}m</text>
                                            </g>

                                            <line x1={toSvgX(platEnd)} y1={toSvgY(H)} x2={toSvgX(platEnd)} y2={BASE_Y + 12} stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,2" />
                                            <g transform={`translate(${toSvgX(platEnd)}, ${toSvgY(H)})`} onPointerDown={(e) => handleStartDrag(e, 'plat_end')} className="cursor-ew-resize">
                                                <rect x="-12" y="-14" width="24" height="14" rx="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.2" />
                                                <text x="0" y="-4" fill="#0f172a" fontSize="7" fontWeight="bold" textAnchor="middle">+{Math.round(platEnd)}m</text>
                                            </g>

                                            {/* Draggable Apex */}
                                            <g transform={`translate(${CENTER_X}, ${toSvgY(H)})`} onPointerDown={(e) => handleStartDrag(e, 'apex')} className="cursor-ns-resize">
                                                <circle r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
                                                <rect x="-18" y="-20" width="36" height="13" rx="4" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
                                                <text x="0" y="-11" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">{H > 0 ? `+${H}m` : `${H}m`}</text>
                                            </g>

                                            {/* Break Points */}
                                            {breakPoints.map((bp) => (
                                                <g key={bp.id} transform={`translate(${toSvgX(bp.distanceM)}, ${toSvgY(bp.heightM)})`} onPointerDown={(e) => handleStartDrag(e, 'breakpoint', bp.id)} className="cursor-move">
                                                    <circle r="5" fill="#a855f7" stroke="#ffffff" strokeWidth="1.5" />
                                                    <rect x="-18" y="-18" width="36" height="12" rx="3" fill="#6b21a8" stroke="#d8b4fe" strokeWidth="0.8" />
                                                    <text x="0" y="-9" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">{Math.round(bp.distanceM)}m | {Math.round(bp.heightM)}m</text>
                                                </g>
                                            ))}

                                            {/* Width Guideline */}
                                            <line x1={toSvgX(-leftW)} y1={BASE_Y + 22} x2={toSvgX(rightW)} y2={BASE_Y + 22} stroke="#10b981" strokeWidth="2" />
                                            <g transform={`translate(${toSvgX(-leftW)}, ${BASE_Y + 22})`} onPointerDown={(e) => handleStartDrag(e, 'left_width')} className="cursor-ew-resize">
                                                <rect x="-14" y="-8" width="28" height="16" rx="8" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                                                <text x="0" y="3" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">L {leftW}m</text>
                                            </g>
                                            <g transform={`translate(${toSvgX(rightW)}, ${BASE_Y + 22})`} onPointerDown={(e) => handleStartDrag(e, 'right_width')} className="cursor-ew-resize">
                                                <rect x="-14" y="-8" width="28" height="16" rx="8" fill="#0d9488" stroke="#ffffff" strokeWidth="1.5" />
                                                <text x="0" y="3" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">R {rightW}m</text>
                                            </g>
                                        </>
                                    )}

                                    {/* LENGTH (LONGITUDINAL) RENDERING */}
                                    {profileDimension === 'length' && (
                                        <>
                                            <path d={longAreaD} fill="url(#slopeGrad)" />
                                            <path d={longCurveD} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                                            {/* Start Point (0m) */}
                                            <g transform={`translate(${toLongSvgX(0)}, ${toSvgY(0)})`}>
                                                <circle r="4" fill="#64748b" stroke="#ffffff" strokeWidth="1.5" />
                                                <text x="0" y="14" fill="#94a3b8" fontSize="7" fontFamily="monospace" textAnchor="middle">Start 0m</text>
                                            </g>

                                            {/* Ascent Break Point (e.g. 20m Mark) */}
                                            <g 
                                                transform={`translate(${toLongSvgX(longPoints[1].distM)}, ${toSvgY(longPoints[1].heightM)})`}
                                                onPointerDown={(e) => handleStartDrag(e, 'long_ascent')}
                                                className="cursor-move"
                                            >
                                                <circle r="6" fill="#a855f7" stroke="#ffffff" strokeWidth="2" />
                                                <rect x="-24" y="-18" width="48" height="13" rx="4" fill="#6b21a8" stroke="#d8b4fe" strokeWidth="1" />
                                                <text x="0" y="-9" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">
                                                    BP: {Math.round(longPoints[1].distM)}m | +{Math.round(longPoints[1].heightM)}m
                                                </text>
                                            </g>

                                            {/* Longitudinal Peak Apex */}
                                            <g 
                                                transform={`translate(${toLongSvgX(longPoints[2].distM)}, ${toSvgY(longPoints[2].heightM)})`}
                                                onPointerDown={(e) => handleStartDrag(e, 'long_apex')}
                                                className="cursor-move"
                                            >
                                                <circle r="6.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                                                <rect x="-26" y="-20" width="52" height="14" rx="4" fill="#b45309" stroke="#ffffff" strokeWidth="1" />
                                                <text x="0" y="-10" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                                                    Apex: {Math.round(longPoints[2].distM)}m | +{Math.round(longPoints[2].heightM)}m
                                                </text>
                                            </g>

                                            {/* Descent Break Point */}
                                            <g 
                                                transform={`translate(${toLongSvgX(longPoints[3].distM)}, ${toSvgY(longPoints[3].heightM)})`}
                                                onPointerDown={(e) => handleStartDrag(e, 'long_descent')}
                                                className="cursor-move"
                                            >
                                                <circle r="6" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
                                                <rect x="-24" y="-18" width="48" height="13" rx="4" fill="#0284c7" stroke="#7dd3fc" strokeWidth="1" />
                                                <text x="0" y="-9" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">
                                                    BP: {Math.round(longPoints[3].distM)}m | +{Math.round(longPoints[3].heightM)}m
                                                </text>
                                            </g>

                                            {/* End Point (Lm) */}
                                            <g transform={`translate(${toLongSvgX(effectiveSpineLength)}, ${toSvgY(0)})`}>
                                                <circle r="4" fill="#64748b" stroke="#ffffff" strokeWidth="1.5" />
                                                <text x="0" y="14" fill="#94a3b8" fontSize="7" fontFamily="monospace" textAnchor="middle">
                                                    End {effectiveSpineLength}m
                                                </text>
                                            </g>
                                        </>
                                    )}
                                </svg>

                                {profileDimension === 'width' && (
                                    <div className="absolute top-2 right-2 flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleAddBreakPoint(-20, Math.round(H * 0.55))}
                                            className="px-2 py-0.5 bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-500/60 rounded-md text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow"
                                        >
                                            <Plus size={9} />
                                            <span>+ Break Point</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* TANGENT METRICS */}
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 space-y-0.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-blue-300 font-bold flex items-center gap-1">
                                            <ArrowUpRight size={11} /> Left Ascent
                                        </span>
                                        <span className="font-mono font-bold text-white">{leftSlopeDeg}°</span>
                                    </div>
                                    <div className="text-[9px] text-slate-400">
                                        {leftSlopeDeg < 25 ? 'Gradual Incline' : leftSlopeDeg < 40 ? 'Moderate Slope' : 'Steep Wall'}
                                    </div>
                                </div>

                                <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 space-y-0.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-teal-300 font-bold flex items-center gap-1">
                                            <ArrowDownRight size={11} /> Right Descent
                                        </span>
                                        <span className="font-mono font-bold text-white">{rightSlopeDeg}°</span>
                                    </div>
                                    <div className="text-[9px] text-slate-400">
                                        {rightSlopeDeg < 25 ? 'Gentle Runoff' : rightSlopeDeg < 40 ? 'Moderate Drop' : 'Steep Cliff'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* HILL POINT-TO-POINT DISTANCE & INCLINE/DECLINE METRICS */}
                        {hillSegments.length > 0 && (
                            <div className="p-3 bg-slate-900/90 rounded-2xl border border-amber-500/50 shadow-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                                        📏 {isKa ? 'წერტილთაშორისი მანძილი და დახრილობა' : 'Point-to-Point Distance & Incline/Decline'}
                                    </span>
                                    <span className="text-[9px] font-mono text-slate-400">
                                        {hillSegments.length} Segments
                                    </span>
                                </div>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {hillSegments.map((seg, idx) => {
                                        const isInc = seg.type === 'incline';
                                        const isDec = seg.type === 'decline';
                                        const colorCls = isInc ? 'text-emerald-400' : isDec ? 'text-rose-400' : 'text-cyan-400';
                                        const bgCls = isInc ? 'bg-emerald-950/30 border-emerald-800/40' : isDec ? 'bg-rose-950/30 border-rose-800/40' : 'bg-slate-950 border-slate-800';
                                        const arrow = isInc ? '↗' : isDec ? '↘' : '→';
                                        const sign = seg.elevationDeltaM > 0 ? '+' : '';

                                        return (
                                            <div 
                                                key={`hill-seg-${idx}`}
                                                className={`p-2 rounded-xl border ${bgCls} flex items-center justify-between text-[10px] font-mono`}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-amber-300">{seg.fromLabel} → {seg.toLabel}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-slate-300 font-bold">{seg.distanceM}m</span>
                                                    <span className={`font-black ${colorCls}`}>
                                                        {arrow} {sign}{seg.inclinePct}% ({seg.angleDeg}°)
                                                    </span>
                                                    <span className="text-slate-400 text-[9px]">ΔZ: {sign}{seg.elevationDeltaM}m</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* AI AUTO-DETECT & SATELLITE DEM */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onAiAutoDetectSlope}
                                disabled={isAiSlopeScanning}
                                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/60 cursor-pointer active:scale-95 transition-all"
                            >
                                <Sparkles size={13} className={isAiSlopeScanning ? 'animate-spin' : ''} />
                                <span>{isAiSlopeScanning ? 'Scanning...' : 'AI Auto-Detect Slope'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={onLoadSatelliteDem}
                                className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                                title="Load InSAR Satellite DEM Radar Elevation"
                            >
                                <Satellite size={13} />
                                <span>DEM</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
            )}
        </div>
    );
};
