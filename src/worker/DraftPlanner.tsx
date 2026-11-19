import React, { useState } from 'react';
import { Building2, Info } from 'lucide-react';
import DesignView from '../components/DesignView';
import type { MapComponentProps } from '../components/MapComponent';
import type { ActiveDrawingTool, Layer, Membership, Organization, PlantationFeature, User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface DraftPlannerProps {
    user: User | null;
    mapProps: MapComponentProps;
    onAddOrg: (org: Organization, mem: Membership, selectedCrops?: any[]) => void;
    onSwitchOrg: (orgId: string) => void;
    onRegister: () => void;
}

/**
 * Isolated memory-only Map Planner preview for newly registered users with no active company membership.
 * - Starts with a valid empty drawing tool `{ tool: null }` and its own draft layer.
 * - Never reads/writes shared company `safeStorage` (`draftOnly`).
 * - Preview activity logging is a strict no-op (cannot overwrite company logs).
 * - Save/Publish explicitly opens company registration; leaving discards memory-only drafts.
 */
export const DraftPlanner: React.FC<DraftPlannerProps> = ({
    user,
    mapProps,
    onAddOrg,
    onSwitchOrg,
    onRegister
}) => {
    const { language } = useLanguage();
    const isKa = language === 'ka';

    const [layers, setLayers] = useState<Layer[]>([
        {
            id: 'draft-preview-layer',
            name: isKa ? 'პლანტაციის მონახაზი' : 'Draft Preview',
            isFolder: false,
            isVisible: true,
            organizationId: 'draft-preview'
        }
    ]);
    const [features, setFeatures] = useState<PlantationFeature[]>([]);
    const [tool, setTool] = useState<ActiveDrawingTool>({ tool: null });
    const [selected, setSelected] = useState<string[]>([]);

    const handleFeatureDrawn = (type: any, geometry: any, _clickPos?: any, metadata?: any) => {
        const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const layerId = layers[0]?.id || 'draft-preview-layer';
        const newFeature: any = {
            id,
            name: metadata?.name || `${isKa ? 'მონახაზი' : 'Draft'} ${features.length + 1}`,
            type: type || 'area',
            geometry,
            layerId,
            organizationId: 'draft-preview',
            color: tool.color || '#10b981',
            createdAt: new Date().toISOString(),
            ...metadata
        };
        setFeatures(prev => [...prev, newFeature]);
        setSelected([id]);
    };

    const handleUpdateFeature = (updated: PlantationFeature) => {
        setFeatures(prev => prev.map(f => (f.id === updated.id ? updated : f)));
    };

    const handleUpdateLayer = (updated: Layer) => {
        setLayers(prev => prev.map(l => (l.id === updated.id ? updated : l)));
    };

    const handleDeleteItems = (ids: string[]) => {
        const setIds = new Set(ids);
        setFeatures(prev => prev.filter(f => !setIds.has(f.id)));
        setSelected(prev => prev.filter(id => !setIds.has(id)));
    };

    const handleAddLayer = (name: string, isFolder: boolean): Layer => {
        const next: Layer = {
            id: `draft-layer-${Date.now()}`,
            name,
            isFolder,
            isVisible: true,
            organizationId: 'draft-preview'
        };
        setLayers(prev => [...prev, next]);
        return next;
    };

    const isolatedMapProps: MapComponentProps = {
        ...mapProps,
        plantationFeatures: features,
        layers,
        selectedFeatureIds: selected,
        onSelectFeature: (id) => setSelected(id ? [id] : []),
        activeDrawingTool: tool,
        onSetActiveDrawingTool: setTool,
        onFeatureDrawn: handleFeatureDrawn,
        onUpdateFeature: handleUpdateFeature
    };

    return (
        <div className="flex flex-col h-full min-h-0 bg-slate-50">
            <div className="shrink-0 px-4 py-2.5 bg-emerald-950 text-white border-b border-emerald-900 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                        <Info size={16} className="text-emerald-300" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-white leading-tight">
                            {isKa ? 'რუკის დამგეგმავის პრევიუ (მხოლოდ მეხსიერებაში)' : 'Map Planner Preview (Memory-Only Draft)'}
                        </p>
                        <p className="text-[11px] text-emerald-200/80 truncate">
                            {isKa
                                ? 'მონიშნეთ ნაკვეთი სატესტოდ. შენახვისთვის საჭიროა კომპანიის რეგისტრაცია; გვერდიდან გასვლისას მონახაზი წაიშლება.'
                                : 'Explore land and draw a preview. Saving requires company registration; drafts clear when leaving this page.'}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onRegister}
                    className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                >
                    <Building2 size={14} />
                    <span>{isKa ? 'კომპანიის რეგისტრაცია და შენახვა' : 'Register Company to Save'}</span>
                </button>
            </div>

            <div className="flex-1 min-h-0">
                <DesignView
                    draftOnly
                    layers={layers}
                    plantationFeatures={features}
                    activeDrawingTool={tool}
                    onSetActiveDrawingTool={setTool}
                    onFeatureDrawn={handleFeatureDrawn}
                    selectedFeatureIds={selected}
                    onSelectFeature={(id) => setSelected(id ? [id] : [])}
                    onUpdateFeature={handleUpdateFeature}
                    onUpdateLayer={handleUpdateLayer}
                    onDeleteItems={handleDeleteItems}
                    mapProps={isolatedMapProps}
                    onSetFlyToBounds={mapProps.onSetFlyToBounds || (() => {})}
                    onGenerateTrenches={() => {}}
                    onGenerateSeedlings={() => {}}
                    onReparentFeature={() => {}}
                    crops={[]}
                    onAddLayer={handleAddLayer}
                    onGenerateIrrigation={() => {}}
                    onSendCommand={() => {}}
                    canUndo={false}
                    canRedo={false}
                    onUndo={() => {}}
                    onRedo={() => {}}
                    onImport={() => {}}
                    templates={[]}
                    onSetPlacingTemplate={() => {}}
                    appMode="design"
                    onClearMap={() => setFeatures([])}
                    onPublishDraftFeatures={async () => {
                        onRegister();
                    }}
                    onLogActivity={async () => {}}
                    currentUser={user}
                    activeOrg={null}
                    organizations={[]}
                    onAddOrg={onAddOrg}
                    onSwitchOrg={onSwitchOrg}
                    onStartMapRegistration={() => onRegister()}
                />
            </div>
        </div>
    );
};

export default DraftPlanner;
