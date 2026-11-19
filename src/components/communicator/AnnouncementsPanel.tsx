import React, { useMemo, useState } from 'react';
import {
    Plus,
    Search,
    MapPin,
    Briefcase,
    UserCheck,
    Building2,
    MessageSquare,
    Ticket,
    Crosshair,
    X,
    RotateCcw,
    Sprout,
    Clock,
    CheckCircle2,
    Eye
} from 'lucide-react';
import { toast } from 'sonner';
import type {
    AnnouncementCategory,
    AnnouncementCropEntry,
    Crop,
    ForumPost,
    Organization,
    PlantationFeature,
    User,
    WorkContractType
} from '../../types';
import {
    COMMON_AGRICULTURE_CROPS,
    CONTRACT_TYPE_OPTIONS,
    DEFAULT_ANNOUNCEMENT_FILTERS,
    GEORGIAN_REGIONS,
    WORK_TYPE_OPTIONS,
    formatContractLabel,
    getRegionCoordinates,
    resolveOrgAreaAndCenter,
    resolveOrgCropsAndVarieties,
    type AnnouncementFilters,
    type MapCheckpointItem
} from './communicatorData';

interface AnnouncementsPanelProps {
    currentUser: User | null;
    activeOrganization: Organization | null;
    organizations: Organization[];
    allPlantationFeatures: PlantationFeature[];
    crops: Crop[];
    cropVarieties: any[];
    checkpoints: MapCheckpointItem[];
    allCheckpointsCount: number;
    filters: AnnouncementFilters;
    onChangeFilters: (next: AnnouncementFilters) => void;
    onAddAnnouncement: (post: Partial<ForumPost>) => void;
    onUpdatePost?: (postId: string, updates: Partial<ForumPost>) => void;
    onOpenDetails: (checkpoint: MapCheckpointItem) => void;
    onSendMessage: (checkpoint: MapCheckpointItem, announcement?: ForumPost) => void;
    onSendTicket: (checkpoint: MapCheckpointItem, announcement?: ForumPost) => void;
    onFocusCheckpoint: (checkpoint: MapCheckpointItem) => void;
    onFitAllFiltered: () => void;
    isPickingLocation: boolean;
    pickedLocation: [number, number] | null;
    onTogglePickLocation: (picking: boolean) => void;
    onClearPickedLocation: () => void;
    isKa?: boolean;
}

export const AnnouncementsPanel: React.FC<AnnouncementsPanelProps> = ({
    currentUser,
    activeOrganization,
    organizations,
    allPlantationFeatures,
    crops,
    cropVarieties,
    checkpoints,
    allCheckpointsCount,
    filters,
    onChangeFilters,
    onAddAnnouncement,
    onUpdatePost,
    onOpenDetails,
    onSendMessage,
    onSendTicket,
    onFocusCheckpoint,
    onFitAllFiltered,
    isPickingLocation,
    pickedLocation,
    onTogglePickLocation,
    onClearPickedLocation,
    isKa = false
}) => {
    const [isComposerOpen, setIsComposerOpen] = useState(false);

    // Composer form state
    const [category, setCategory] = useState<AnnouncementCategory>(
        activeOrganization ? 'company_hiring' : 'service_offer'
    );
    const [title, setTitle] = useState('');
    const [workType, setWorkType] = useState('Field Worker');
    const [customWorkType, setCustomWorkType] = useState('');
    const [contractType, setContractType] = useState<WorkContractType>('daily');
    const [customContractLabel, setCustomContractLabel] = useState('');
    const [region, setRegion] = useState<string>(
        activeOrganization?.region || currentUser?.region || 'Guria'
    );
    const [agricultureType, setAgricultureType] = useState<string>(
        activeOrganization?.agricultureType && activeOrganization.agricultureType !== 'General'
            ? activeOrganization.agricultureType
            : 'Blueberry'
    );
    const [varietiesInput, setVarietiesInput] = useState('');
    const [areaHaInput, setAreaHaInput] = useState<string>(
        activeOrganization?.areaHa ? String(activeOrganization.areaHa) : ''
    );
    const [workersNeeded, setWorkersNeeded] = useState<string>('1');
    const [compensation, setCompensation] = useState('');
    const [contactPhone, setContactPhone] = useState(
        activeOrganization?.phoneNumber || currentUser?.phone || ''
    );
    const [contactEmail, setContactEmail] = useState(
        activeOrganization?.email || currentUser?.email || ''
    );
    const [companyNameInput, setCompanyNameInput] = useState(activeOrganization?.name || '');
    const [description, setDescription] = useState('');

    // Dynamic options for filters derived from current app data
    const availableRegions = useMemo(() => {
        const set = new Set<string>(GEORGIAN_REGIONS);
        organizations.forEach(o => { if (o.region) set.add(o.region); });
        checkpoints.forEach(cp => { if (cp.region && cp.region !== 'Georgia') set.add(cp.region); });
        return Array.from(set);
    }, [organizations, checkpoints]);

    const availableCrops = useMemo(() => {
        const set = new Set<string>(COMMON_AGRICULTURE_CROPS);
        crops.forEach(c => { if (c.name) set.add(c.name); });
        checkpoints.forEach(cp => {
            cp.cropsAndVarieties.forEach(e => { if (e.crop) set.add(e.crop); });
        });
        return Array.from(set);
    }, [crops, checkpoints]);

    const availableWorkTypes = useMemo(() => {
        const base = WORK_TYPE_OPTIONS.filter(w => w.value !== 'Other').map(w => w.value);
        const set = new Set<string>(base);
        checkpoints.forEach(cp => cp.workTypes.forEach(w => { if (w) set.add(w); }));
        return Array.from(set);
    }, [checkpoints]);

    const hasActiveFilters =
        filters.search.trim() !== '' ||
        filters.kind !== 'ALL' ||
        filters.region !== 'ALL' ||
        filters.workType !== 'ALL' ||
        filters.contractType !== 'ALL' ||
        filters.crop !== 'ALL';

    const openComposer = (initialCategory?: AnnouncementCategory) => {
        const nextCat = initialCategory || (activeOrganization ? 'company_hiring' : 'service_offer');
        setCategory(nextCat);

        if (nextCat === 'company_hiring' && activeOrganization) {
            const orgFeatures = allPlantationFeatures.filter(f => f.organizationId === activeOrganization.id);
            const { agricultureType: ag, cropsAndVarieties } = resolveOrgCropsAndVarieties(
                activeOrganization,
                crops,
                cropVarieties,
                orgFeatures
            );
            const { areaHa } = resolveOrgAreaAndCenter(activeOrganization, orgFeatures);
            setCompanyNameInput(activeOrganization.name || '');
            setRegion(activeOrganization.region || currentUser?.region || 'Guria');
            setAgricultureType(cropsAndVarieties[0]?.crop || ag || 'Blueberry');
            setVarietiesInput(cropsAndVarieties.flatMap(c => c.varieties).join(', '));
            setAreaHaInput(areaHa > 0 ? String(areaHa) : '');
            setContactPhone(activeOrganization.phoneNumber || currentUser?.phone || '');
            setContactEmail(activeOrganization.email || currentUser?.email || '');
        } else {
            setRegion(currentUser?.region || 'Guria');
            setContactPhone(currentUser?.phone || '');
            setContactEmail(currentUser?.email || '');
            if (currentUser?.servicesOffered && currentUser.servicesOffered.length > 0) {
                const matched = WORK_TYPE_OPTIONS.find(w =>
                    currentUser.servicesOffered!.some(s => s.toLowerCase().includes(w.value.toLowerCase()))
                );
                if (matched) setWorkType(matched.value);
            }
        }

        setIsComposerOpen(true);
    };

    const handlePublish = (e: React.FormEvent) => {
        e.preventDefault();
        const resolvedWork = workType === 'Other' ? customWorkType.trim() : workType;
        if (!resolvedWork) {
            toast.error(isKa ? 'მიუთითეთ სამუშაოს ან სერვისის ტიპი' : 'Please specify the work or service type.');
            return;
        }
        if (!description.trim() && !title.trim()) {
            toast.error(isKa ? 'შეიყვანეთ განცხადების სათაური ან აღწერა' : 'Please add a title or description for your announcement.');
            return;
        }

        const parsedVarieties = varietiesInput
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);

        let cropsAndVarieties: AnnouncementCropEntry[] = [];
        if (category === 'company_hiring' && activeOrganization) {
            const orgFeatures = allPlantationFeatures.filter(f => f.organizationId === activeOrganization.id);
            const resolved = resolveOrgCropsAndVarieties(activeOrganization, crops, cropVarieties, orgFeatures);
            cropsAndVarieties = resolved.cropsAndVarieties;
        }
        if (agricultureType.trim()) {
            const existingIdx = cropsAndVarieties.findIndex(
                c => c.crop.toLowerCase() === agricultureType.trim().toLowerCase()
            );
            if (existingIdx >= 0) {
                const mergedVars = Array.from(new Set([...cropsAndVarieties[existingIdx].varieties, ...parsedVarieties]));
                cropsAndVarieties[existingIdx] = { crop: cropsAndVarieties[existingIdx].crop, varieties: mergedVars };
            } else {
                cropsAndVarieties = [
                    { crop: agricultureType.trim(), varieties: parsedVarieties },
                    ...cropsAndVarieties
                ];
            }
        }

        let resolvedLocation: [number, number] | undefined = pickedLocation || undefined;
        if (!resolvedLocation && category === 'company_hiring' && activeOrganization) {
            const orgFeatures = allPlantationFeatures.filter(f => f.organizationId === activeOrganization.id);
            resolvedLocation = resolveOrgAreaAndCenter(activeOrganization, orgFeatures).center;
        }
        if (!resolvedLocation) {
            resolvedLocation = getRegionCoordinates(region, `${Date.now()}-${resolvedWork}`);
        }

        const generatedTitle =
            title.trim() ||
            (category === 'company_hiring'
                ? `${resolvedWork} (${formatContractLabel(contractType, customContractLabel, isKa)})`
                : `${resolvedWork} — ${isKa ? 'სერვისის შეთავაზება' : 'Available for Work'}`);

        const announcementId = `ann-${Date.now()}`;
        onAddAnnouncement({
            id: announcementId,
            title: generatedTitle,
            content: description.trim() || generatedTitle,
            hubType: 'global',
            channelId: 'announcements',
            isDirectMessage: false,
            isAnnouncement: true,
            organizationId: category === 'company_hiring' ? (activeOrganization?.id || 'personal') : 'personal',
            announcementData: {
                category,
                workType: resolvedWork,
                contractType,
                customContractLabel: contractType === 'other' ? customContractLabel.trim() : undefined,
                region,
                companyId: category === 'company_hiring' ? activeOrganization?.id : undefined,
                companyName: category === 'company_hiring' ? (companyNameInput.trim() || activeOrganization?.name || currentUser?.name) : undefined,
                contactPhone: contactPhone.trim() || undefined,
                contactEmail: contactEmail.trim() || undefined,
                agricultureType: agricultureType.trim() || undefined,
                cropsAndVarieties,
                areaHa: areaHaInput ? Number(areaHaInput) : undefined,
                compensation: compensation.trim() || undefined,
                workersNeeded: category === 'company_hiring' ? (Number(workersNeeded) || 1) : undefined,
                location: resolvedLocation,
                status: 'open'
            }
        });

        setTitle('');
        setDescription('');
        setCompensation('');
        setCustomWorkType('');
        setCustomContractLabel('');
        onTogglePickLocation(false);
        onClearPickedLocation();
        setIsComposerOpen(false);
        toast.success(
            isKa
                ? 'განცხადება გამოქვეყნდა და აისახა რუკაზე!'
                : 'Announcement published and pinned to the map!'
        );
    };

    const handleCloseAnnouncement = (post: ForumPost) => {
        if (!onUpdatePost || !post.announcementData) return;
        onUpdatePost(post.id, {
            announcementData: {
                ...post.announcementData,
                status: 'closed'
            }
        });
        toast.success(isKa ? 'განცხადება დაიხურა' : 'Announcement marked as closed');
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* Header & Primary Action */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-200 bg-white space-y-3 shrink-0">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                            {isKa ? 'განცხადებები და პლანტაციები' : 'Announcements & Plantations'}
                        </h3>
                        <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                            {checkpoints.length} {isKa ? 'ნაჩვენები' : 'shown'} · {allCheckpointsCount} {isKa ? 'სულ რუკაზე' : 'total on map'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => (isComposerOpen ? setIsComposerOpen(false) : openComposer())}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                        {isComposerOpen ? <X size={14} /> : <Plus size={14} />}
                        <span>
                            {isComposerOpen
                                ? (isKa ? 'დახურვა' : 'Close')
                                : (isKa ? 'განცხადების დამატება' : 'Post Announcement')}
                        </span>
                    </button>
                </div>

                {/* Search Input */}
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={e => onChangeFilters({ ...filters, search: e.target.value })}
                        placeholder={
                            isKa
                                ? 'ძიება: კომპანია, სამუშაო, რეგიონი, კულტურა, ჯიში...'
                                : 'Search company, work type, region, crop, variety...'
                        }
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                    />
                </div>

                {/* Segmented Kind Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    {(
                        [
                            { id: 'ALL', en: 'All', ka: 'ყველა' },
                            { id: 'HIRING', en: 'Hiring', ka: 'ვაკანსიები' },
                            { id: 'OFFERS', en: 'Service Offers', ka: 'შეთავაზებები' },
                            { id: 'PLANTATIONS', en: 'Plantations', ka: 'პლანტაციები' }
                        ] as const
                    ).map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onChangeFilters({ ...filters, kind: tab.id })}
                            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                                filters.kind === tab.id
                                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            {isKa ? tab.ka : tab.en}
                        </button>
                    ))}
                </div>

                {/* Filter Dropdowns Row (Synchronized with Map Checkpoints) */}
                <div className="grid grid-cols-2 gap-2">
                    <select
                        value={filters.region}
                        onChange={e => onChangeFilters({ ...filters, region: e.target.value })}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium outline-none focus:border-emerald-500"
                        aria-label="Filter by region"
                    >
                        <option value="ALL">{isKa ? 'ყველა რეგიონი' : 'All Regions'}</option>
                        {availableRegions.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>

                    <select
                        value={filters.workType}
                        onChange={e => onChangeFilters({ ...filters, workType: e.target.value })}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium outline-none focus:border-emerald-500"
                        aria-label="Filter by work or service"
                    >
                        <option value="ALL">{isKa ? 'ყველა სამუშაო' : 'All Work / Services'}</option>
                        {availableWorkTypes.map(w => (
                            <option key={w} value={w}>{w}</option>
                        ))}
                    </select>

                    <select
                        value={filters.contractType}
                        onChange={e => onChangeFilters({ ...filters, contractType: e.target.value })}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium outline-none focus:border-emerald-500"
                        aria-label="Filter by contract type"
                    >
                        <option value="ALL">{isKa ? 'ყველა კონტრაქტი' : 'All Contracts'}</option>
                        {CONTRACT_TYPE_OPTIONS.map(c => (
                            <option key={c.value} value={c.value}>
                                {isKa ? c.labelKa : c.labelEn}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filters.crop}
                        onChange={e => onChangeFilters({ ...filters, crop: e.target.value })}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium outline-none focus:border-emerald-500"
                        aria-label="Filter by crop"
                    >
                        <option value="ALL">{isKa ? 'ყველა კულტურა' : 'All Crops / Plants'}</option>
                        {availableCrops.map(crop => (
                            <option key={crop} value={crop}>{crop}</option>
                        ))}
                    </select>
                </div>

                {/* Map Fit & Filter Reset Controls */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                    <button
                        type="button"
                        onClick={onFitAllFiltered}
                        className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 cursor-pointer"
                    >
                        <MapPin size={13} />
                        <span>{isKa ? 'ყველას ჩვენება რუკაზე' : 'Fit All Checkpoints on Map'}</span>
                    </button>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={() => onChangeFilters(DEFAULT_ANNOUNCEMENT_FILTERS)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                        >
                            <RotateCcw size={12} />
                            <span>{isKa ? 'გასუფთავება' : 'Reset Filters'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Announcement Creation Drawer */}
            {isComposerOpen && (
                <form
                    onSubmit={handlePublish}
                    className="p-4 border-b border-slate-200 bg-slate-50/90 overflow-y-auto max-h-[65%] space-y-3.5 shrink-0"
                >
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900">
                            {isKa ? 'ახალი განცხადების შექმნა' : 'Create New Announcement'}
                        </h4>
                        <button
                            type="button"
                            onClick={() => {
                                setIsComposerOpen(false);
                                onTogglePickLocation(false);
                            }}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* Category Toggle: Company Looking for Service vs User Offering Service */}
                    <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setCategory('company_hiring')}
                            className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                                category === 'company_hiring'
                                    ? 'bg-white text-amber-800 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Briefcase size={13} />
                            <span>{isKa ? 'კომპანია ეძებს სერვისს' : 'Company Seeking Work/Service'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCategory('service_offer')}
                            className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                                category === 'service_offer'
                                    ? 'bg-white text-blue-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <UserCheck size={13} />
                            <span>{isKa ? 'მომხმარებელი სთავაზობს' : 'Offer My Service / Job'}</span>
                        </button>
                    </div>

                    <div className="space-y-2.5">
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={
                                category === 'company_hiring'
                                    ? (isKa ? 'სათაური (მაგ: გვჭირდება მოცვის მკრეფავები და დარაჯი)' : 'Title (e.g. Looking for 10 Blueberry Pickers & Night Keeper)')
                                    : (isKa ? 'სათაური (მაგ: ვთავაზობ აგრონომის ან ტრაქტორისტის სერვისს)' : 'Title (e.g. Experienced Agronomist / Tractor Operator Available)')
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500"
                        />

                        {category === 'company_hiring' && (
                            <input
                                type="text"
                                value={companyNameInput}
                                onChange={e => setCompanyNameInput(e.target.value)}
                                placeholder={isKa ? 'კომპანიის დასახელება' : 'Company / Plantation Name'}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500"
                            />
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                    {isKa ? 'სამუშაო / სერვისი' : 'Work / Service Role'}
                                </label>
                                <select
                                    value={workType}
                                    onChange={e => setWorkType(e.target.value)}
                                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-emerald-500"
                                >
                                    {WORK_TYPE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {isKa ? opt.labelKa : opt.labelEn}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                    {isKa ? 'კონტრაქტის ტიპი' : 'Contract Type'}
                                </label>
                                <select
                                    value={contractType}
                                    onChange={e => setContractType(e.target.value as WorkContractType)}
                                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-emerald-500"
                                >
                                    {CONTRACT_TYPE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {isKa ? opt.labelKa : opt.labelEn}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {workType === 'Other' && (
                            <input
                                type="text"
                                value={customWorkType}
                                onChange={e => setCustomWorkType(e.target.value)}
                                placeholder={isKa ? 'მიუთითეთ სხვა სერვისი ან პოზიცია...' : 'Specify custom service or work role...'}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500"
                            />
                        )}

                        {contractType === 'other' && (
                            <input
                                type="text"
                                value={customContractLabel}
                                onChange={e => setCustomContractLabel(e.target.value)}
                                placeholder={isKa ? 'მიუთითეთ კონტრაქტის პირობა...' : 'Specify custom contract arrangement...'}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500"
                            />
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                    {isKa ? 'რეგიონი' : 'Region'}
                                </label>
                                <select
                                    value={region}
                                    onChange={e => setRegion(e.target.value)}
                                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-emerald-500"
                                >
                                    {availableRegions.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                    {isKa ? 'კულტურა / მცენარე' : 'Agriculture / Crop'}
                                </label>
                                <input
                                    type="text"
                                    list="agrimap-crop-options"
                                    value={agricultureType}
                                    onChange={e => setAgricultureType(e.target.value)}
                                    placeholder="e.g. Blueberry, Hazelnut"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500"
                                />
                                <datalist id="agrimap-crop-options">
                                    {availableCrops.map(c => (
                                        <option key={c} value={c} />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                    {isKa ? 'ჯიშები (მძიმით გამოყოფილი)' : 'Varieties (comma separated)'}
                                </label>
                                <input
                                    type="text"
                                    value={varietiesInput}
                                    onChange={e => setVarietiesInput(e.target.value)}
                                    placeholder="Duke, Legacy, Bluecrop"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                        {isKa ? 'ფართობი (ჰა)' : 'Area (ha)'}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={areaHaInput}
                                        onChange={e => setAreaHaInput(e.target.value)}
                                        placeholder="15.5"
                                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500 tabular-nums"
                                    />
                                </div>
                                {category === 'company_hiring' ? (
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                            {isKa ? 'რაოდენობა' : 'Needed'}
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={workersNeeded}
                                            onChange={e => setWorkersNeeded(e.target.value)}
                                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500 tabular-nums"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                            {isKa ? 'ანაზღაურება' : 'Rate'}
                                        </label>
                                        <input
                                            type="text"
                                            value={compensation}
                                            onChange={e => setCompensation(e.target.value)}
                                            placeholder="80 GEL/day"
                                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {category === 'company_hiring' && (
                            <input
                                type="text"
                                value={compensation}
                                onChange={e => setCompensation(e.target.value)}
                                placeholder={isKa ? 'ანაზღაურება (არასავალდებულო, მაგ: 70 ლარი/დღე)' : 'Compensation / Budget (optional, e.g. 75 GEL/day or 2200 GEL/mo)'}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500"
                            />
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="tel"
                                value={contactPhone}
                                onChange={e => setContactPhone(e.target.value)}
                                placeholder={isKa ? 'ტელეფონის ნომერი' : 'Contact Phone'}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500"
                            />
                            <input
                                type="email"
                                value={contactEmail}
                                onChange={e => setContactEmail(e.target.value)}
                                placeholder={isKa ? 'ელ-ფოსტა' : 'Contact Email'}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-500"
                            />
                        </div>

                        {/* Map Checkpoint Picker */}
                        <div className="flex items-center justify-between gap-2 p-2.5 bg-white border border-slate-200 rounded-lg">
                            <div className="text-xs text-slate-600 min-w-0">
                                <span className="font-medium text-slate-800 block">
                                    {isKa ? 'რუკის წერტილი (ჩეკპოინტი)' : 'Map Checkpoint Pin'}
                                </span>
                                <span className="text-[11px] text-slate-500 tabular-nums truncate block">
                                    {pickedLocation
                                        ? `${pickedLocation[0].toFixed(5)}, ${pickedLocation[1].toFixed(5)}`
                                        : (isKa ? `ავტომატური (${region})` : `Auto from ${region} / plantation`)}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => onTogglePickLocation(!isPickingLocation)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                    isPickingLocation
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                }`}
                            >
                                <Crosshair size={13} />
                                <span>
                                    {isPickingLocation
                                        ? (isKa ? 'დააწკაპეთ რუკაზე...' : 'Click Map Now...')
                                        : (isKa ? 'რუკაზე მონიშვნა' : 'Pick on Map')}
                                </span>
                            </button>
                        </div>

                        <textarea
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder={
                                category === 'company_hiring'
                                    ? (isKa ? 'აღწერეთ სამუშაოს დეტალები, მოთხოვნები და გრაფიკი...' : 'Describe work requirements, schedule, accommodation, or tools provided...')
                                    : (isKa ? 'აღწერეთ თქვენი გამოცდილება, სერვისი და მზადყოფნა...' : 'Describe your experience, equipment, availability, and regions you cover...')
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-emerald-500 resize-none"
                        />

                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsComposerOpen(false);
                                    onTogglePickLocation(false);
                                }}
                                className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                                {isKa ? 'გაუქმება' : 'Cancel'}
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-slate-900 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                                {isKa ? 'გამოქვეყნება' : 'Publish Announcement'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Feed of Filtered Announcements & Plantations */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {checkpoints.length === 0 ? (
                    <div className="p-8 text-center space-y-3">
                        <p className="text-sm font-semibold text-slate-700">
                            {isKa ? 'ფილტრებით ჩეკპოინტი ვერ მოიძებნა' : 'No matching announcements or plantations'}
                        </p>
                        <p className="text-xs text-slate-500">
                            {isKa
                                ? 'შეცვალეთ ფილტრები ან დაამატეთ ახალი განცხადება კომპანიისთვის ან სერვისის შესათავაზებლად.'
                                : 'Adjust your region, work, or crop filters, or post a new announcement for companies and workers.'}
                        </p>
                        <div className="flex items-center justify-center gap-2 pt-1">
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={() => onChangeFilters(DEFAULT_ANNOUNCEMENT_FILTERS)}
                                    className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                    {isKa ? 'ფილტრების გასუფთავება' : 'Reset Filters'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => openComposer()}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                            >
                                {isKa ? 'განცხადების დამატება' : 'Post Announcement'}
                            </button>
                        </div>
                    </div>
                ) : (
                    checkpoints.map(cp => {
                        const primaryAnn = cp.primaryAnnouncement;
                        const ad = primaryAnn?.announcementData;
                        const isOffer = cp.kind === 'service_offer';
                        const isHiring = cp.kind === 'company_hiring';
                        const isAuthor = primaryAnn && currentUser && primaryAnn.authorId === currentUser.id;

                        return (
                            <div
                                key={cp.id}
                                className="p-4 hover:bg-slate-50/80 transition-colors space-y-2.5"
                            >
                                {/* Top quiet kicker */}
                                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        {isOffer ? (
                                            <UserCheck size={13} className="text-blue-600 shrink-0" />
                                        ) : isHiring ? (
                                            <Briefcase size={13} className="text-amber-600 shrink-0" />
                                        ) : (
                                            <Building2 size={13} className="text-emerald-600 shrink-0" />
                                        )}
                                        <span className={`font-semibold truncate ${isOffer ? 'text-blue-700' : isHiring ? 'text-amber-700' : 'text-emerald-700'}`}>
                                            {isOffer
                                                ? (isKa ? 'სერვისის შეთავაზება' : 'Service Offer')
                                                : isHiring
                                                    ? (isKa ? 'სამუშაოს / სერვისის ძიება' : 'Hiring / Service Needed')
                                                    : (isKa ? 'პლანტაცია' : 'Plantation')}
                                        </span>
                                        <span aria-hidden="true">·</span>
                                        <span className="truncate">{cp.region}</span>
                                        {cp.areaHa > 0 && (
                                            <>
                                                <span aria-hidden="true">·</span>
                                                <span className="tabular-nums whitespace-nowrap">{cp.areaHa} ha</span>
                                            </>
                                        )}
                                    </div>

                                    {isAuthor && primaryAnn && onUpdatePost && (
                                        <button
                                            type="button"
                                            onClick={() => handleCloseAnnouncement(primaryAnn)}
                                            className="text-[11px] font-medium text-slate-400 hover:text-emerald-700 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                                            title={isKa ? 'განცხადების დახურვა' : 'Mark as filled / close'}
                                        >
                                            <CheckCircle2 size={12} />
                                            <span>{isKa ? 'დახურვა' : 'Close'}</span>
                                        </button>
                                    )}
                                </div>

                                {/* Title & Entity Name */}
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => onOpenDetails(cp)}
                                        className="text-left text-sm font-bold text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer leading-snug"
                                    >
                                        {primaryAnn?.title || cp.name}
                                    </button>
                                    {primaryAnn?.title && primaryAnn.title !== cp.name && (
                                        <p className="text-xs font-medium text-slate-600 mt-0.5">
                                            {cp.name}
                                        </p>
                                    )}
                                </div>

                                {/* Clean unboxed metadata row */}
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                                    <span className="inline-flex items-center gap-1">
                                        <Sprout size={12} className="text-emerald-600 shrink-0" />
                                        <span className="font-medium text-slate-800">{cp.agricultureType}</span>
                                    </span>
                                    {ad?.workType && (
                                        <>
                                            <span aria-hidden="true" className="text-slate-300">·</span>
                                            <span className="font-medium text-slate-800">{ad.workType}</span>
                                        </>
                                    )}
                                    {ad?.contractType && (
                                        <>
                                            <span aria-hidden="true" className="text-slate-300">·</span>
                                            <span className="inline-flex items-center gap-1 text-slate-500">
                                                <Clock size={11} />
                                                {formatContractLabel(ad.contractType, ad.customContractLabel, isKa)}
                                            </span>
                                        </>
                                    )}
                                    {ad?.compensation && (
                                        <>
                                            <span aria-hidden="true" className="text-slate-300">·</span>
                                            <span className="font-semibold text-emerald-700 tabular-nums">{ad.compensation}</span>
                                        </>
                                    )}
                                    {cp.announcements.length > 1 && (
                                        <>
                                            <span aria-hidden="true" className="text-slate-300">·</span>
                                            <span className="text-amber-700 font-medium tabular-nums">
                                                +{cp.announcements.length - 1} {isKa ? 'სხვა განცხადება' : 'more listings'}
                                            </span>
                                        </>
                                    )}
                                </div>

                                {primaryAnn?.content && primaryAnn.content !== primaryAnn.title && (
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                        {primaryAnn.content}
                                    </p>
                                )}

                                {/* Action Row */}
                                <div className="flex items-center gap-1.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => onOpenDetails(cp)}
                                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                                    >
                                        <Eye size={12} />
                                        <span>{isKa ? 'დეტალები' : 'Details'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onSendTicket(cp, primaryAnn)}
                                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                                    >
                                        <Ticket size={12} />
                                        <span>{isKa ? 'ტიკეტი' : 'Send Ticket'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onSendMessage(cp, primaryAnn)}
                                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                                    >
                                        <MessageSquare size={12} />
                                        <span>{isKa ? 'მიწერა' : 'Message'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onFocusCheckpoint(cp)}
                                        className="ml-auto p-1.5 bg-white hover:bg-slate-100 text-slate-500 hover:text-emerald-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                        title={isKa ? 'რუკაზე ჩვენება' : 'Show on Map'}
                                    >
                                        <MapPin size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default AnnouncementsPanel;
