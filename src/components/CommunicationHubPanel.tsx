import React, { useState, useMemo, useEffect } from 'react';
import L from 'leaflet';
import { Marker } from 'react-leaflet';
import { toast } from 'sonner';
import type {
    User,
    ForumPost,
    PlantationFeature,
    AppMode,
    Employee,
    Organization,
    Crop,
    Membership,
    Role,
    Alert,
    JoinRequest
} from '../types';
import {
    SparklesIcon,
    UserGroupIcon,
    PaperAirplaneIcon,
    MapPinIcon,
    UserCircleIcon,
    HashtagIcon,
    SearchIcon,
    XIcon,
    MapIcon,
    BuildingStorefrontIcon
} from './Icons';
import { Megaphone, MessageSquare, Check, X, Compass, Crosshair, UserPlus } from 'lucide-react';
import MapComponent, { type MapComponentProps } from './MapComponent';
import ResizableDivider from './common/ResizableDivider';
import { safeStorage } from '../services/storageService';
import { USE_FIREBASE } from '../config';
import { auth, db, doc, setDoc } from '../firebase';
import {
    getTicketResolutionState,
    isCompanyJoinTicketPost,
    resolveCompanyTicketOrJoin,
    resolveTicketTargetOrgId
} from '../utils/companyTicketActions';
import {
    DEFAULT_ANNOUNCEMENT_FILTERS,
    buildUnifiedCheckpoints,
    filterCheckpoints,
    formatContractLabel,
    type AnnouncementFilters,
    type MapCheckpointItem
} from './communicator/communicatorData';
import AnnouncementsPanel from './communicator/AnnouncementsPanel';
import MapCheckpointsLayer from './communicator/MapCheckpointsLayer';
import CheckpointDetailsModal from './communicator/CheckpointDetailsModal';

interface CommunicationHubPanelProps {
    currentUser: User | null;
    forumPosts: ForumPost[];
    onAddPost: (post: Partial<ForumPost>) => void;
    onAddReply: (postId: string, content: string) => void;
    plantationFeatures: PlantationFeature[];
    allPlantationFeatures?: PlantationFeature[];
    onSetFlyToBounds: (bounds: L.LatLngBoundsExpression) => void;
    onSetAppMode: (mode: AppMode) => void;
    employees: Employee[];
    mapProps: MapComponentProps;
    allUsers?: User[];
    organizations?: Organization[];
    allOrganizations?: Organization[];
    crops?: Crop[];
    cropVarieties?: any[];
    onClearInitialConversation?: () => void;
    initialConversationId?: string | null;
    onForwardToAnalyst?: (data: any) => void;
    isManualOffline?: boolean;
    alerts?: Alert[];
    setAlerts?: React.Dispatch<React.SetStateAction<Alert[]>>;
    onSetAiTab?: (tab: 'agro' | 'global' | 'market') => void;
    onMarkPostAsRead?: (postId: string) => void;
    activeOrgId?: string | null;
    memberships?: Membership[];
    onSetMemberships?: (memberships: Membership[]) => void;
    onSetEmployees?: (employees: Employee[]) => void;
    onSetUsers?: (users: User[]) => void;
    roles?: Role[];
    onUpdatePost?: (postId: string, updates: Partial<ForumPost>) => void;
    joinRequests?: JoinRequest[];
    canManageJoinRequests?: boolean;
    onApproveJoinRequest?: (request: JoinRequest) => Promise<void> | void;
    onDeclineJoinRequest?: (request: JoinRequest) => Promise<void> | void;
}

interface QuickMessageRecipient {
    id: string;
    name: string;
    type: 'user' | 'org';
    initialMode?: 'chat' | 'ticket';
    contextTitle?: string;
    contextSummary?: string;
    organizationId?: string;
}

const QuickMessageModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    recipient: QuickMessageRecipient;
    onSend: (text: string, type: 'chat' | 'ticket') => void;
    isKa?: boolean;
}> = ({ isOpen, onClose, recipient, onSend, isKa = false }) => {
    const [text, setText] = useState(recipient.contextSummary || '');
    const [type, setType] = useState<'chat' | 'ticket'>(recipient.initialMode || 'chat');

    useEffect(() => {
        setType(recipient.initialMode || 'chat');
        setText(recipient.contextSummary || '');
    }, [recipient]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[6500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center gap-3">
                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900 truncate">
                            {isKa ? `მიმღები: ${recipient.name}` : `Direct to ${recipient.name}`}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {recipient.contextTitle || (isKa ? 'აირჩიეთ გაგზავნის რეჟიმი' : 'Choose message or official ticket dispatch')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                    >
                        <XIcon size={20} className="text-slate-400" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setType('chat')}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                type === 'chat'
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {isKa ? 'შეტყობინება' : 'Direct Message'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('ticket')}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                type === 'ticket'
                                    ? 'bg-white text-emerald-700 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {isKa ? 'ოფიციალური ტიკეტი / შეთავაზება' : 'Send Official Ticket'}
                        </button>
                    </div>
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder={
                            type === 'chat'
                                ? (isKa ? 'დაწერეთ შეტყობინება...' : 'Write your message...')
                                : (isKa ? 'აღწერეთ თქვენი სერვისის შეთავაზება, გამოცდილება ან მოთხოვნა...' : 'Describe your service offer, availability, or official ticket inquiry...')
                        }
                        className="w-full h-36 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all resize-none"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                        >
                            {isKa ? 'გაუქმება' : 'Cancel'}
                        </button>
                        <button
                            type="button"
                            disabled={!text.trim()}
                            onClick={() => {
                                if (!text.trim()) return;
                                onSend(text.trim(), type);
                                onClose();
                            }}
                            className="px-5 py-2.5 bg-slate-900 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                        >
                            {type === 'chat'
                                ? (isKa ? 'შეტყობინების გაგზავნა' : 'Send Message')
                                : (isKa ? 'ტიკეტის გაგზავნა' : 'Dispatch Ticket')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const isUserOnline = (user?: User) => {
    if (!user?.lastActive) return false;
    const lastActiveDate = new Date(user.lastActive);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60);
    return diffMinutes < 5;
};

const pickedLocationIcon = L.divIcon({
    html: `<div style="width:20px;height:20px;border-radius:9999px;background:#dc2626;border:3px solid #ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.35);"></div>`,
    className: 'agrimap-checkpoint-pin',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const CommunicationHubPanel: React.FC<CommunicationHubPanelProps> = (props) => {
    const {
        allUsers = [],
        organizations = [],
        allOrganizations = [],
        crops = [],
        cropVarieties = [],
        allPlantationFeatures = [],
        plantationFeatures = [],
        onSetAppMode,
        mapProps,
        onAddPost,
        currentUser,
        forumPosts,
        initialConversationId,
        onClearInitialConversation,
        onForwardToAnalyst,
        alerts = [],
        setAlerts,
        onSetAiTab,
        onMarkPostAsRead,
        activeOrgId = null,
        memberships = [],
        onSetMemberships,
        employees = [],
        onSetEmployees,
        onSetUsers,
        roles = [],
        onUpdatePost,
        joinRequests = [],
        canManageJoinRequests = false,
        onApproveJoinRequest,
        onDeclineJoinRequest
    } = props;

    // Google Chat & Google Meet removed from Communicator (kept in toolbars); Announcements is the primary tab.
    const [mainTab, setMainTab] = useState<'ANNOUNCEMENTS' | 'COMMUNICATOR' | 'PARTNERS' | 'JOIN_REQUESTS'>('ANNOUNCEMENTS');
    const [processingJoinId, setProcessingJoinId] = useState<string | null>(null);

    const pendingJoinRequests = useMemo(
        () => joinRequests.filter(r => r.status === 'pending'),
        [joinRequests]
    );
    const resolvedJoinRequests = useMemo(
        () => joinRequests.filter(r => r.status !== 'pending').slice(0, 12),
        [joinRequests]
    );

    useEffect(() => {
        if (!canManageJoinRequests && mainTab === 'JOIN_REQUESTS') {
            setMainTab('ANNOUNCEMENTS');
        }
    }, [canManageJoinRequests, mainTab]);
    const [hubType, setHubType] = useState<'INTERNAL' | 'REGIONAL' | 'GLOBAL'>('INTERNAL');
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('ALL');
    const [sortByOnline, setSortByOnline] = useState(false);

    // Announcements & Map Checkpoints Synchronized State
    const [announcementFilters, setAnnouncementFilters] = useState<AnnouncementFilters>(DEFAULT_ANNOUNCEMENT_FILTERS);
    const [selectedCheckpoint, setSelectedCheckpoint] = useState<MapCheckpointItem | null>(null);
    const [focusedCheckpointId, setFocusedCheckpointId] = useState<string | null>(null);
    const [isPickingLocation, setIsPickingLocation] = useState(false);
    const [pickedLocation, setPickedLocation] = useState<[number, number] | null>(null);

    const [communicatorPanelWidth, setCommunicatorPanelWidth] = useState<number>(() => {
        const saved = safeStorage.getItem('communicator_panel_width');
        const parsed = saved ? parseInt(saved, 10) : 520;
        return Number.isFinite(parsed) && parsed >= 320 ? parsed : 520;
    });

    const [viewMode, setViewMode] = useState<'panel' | 'map'>('panel');
    const [isDesktop, setIsDesktop] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth >= 1024);

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isKa = typeof window !== 'undefined' && localStorage.getItem('agri-app-lang') === 'ka';

    const [postTitle, setPostTitle] = useState('');
    const [postContent, setPostContent] = useState('');
    const [replyToPostId, setReplyToPostId] = useState<string | null>(null);
    const [quickMessageRecipient, setQuickMessageRecipient] = useState<QuickMessageRecipient | null>(null);
    const [ticketRolesByPost, setTicketRolesByPost] = useState<Record<string, string>>({});
    const [processingTicketPostId, setProcessingTicketPostId] = useState<string | null>(null);

    const mergedFeatures = useMemo(() => {
        if (allPlantationFeatures && allPlantationFeatures.length > 0) return allPlantationFeatures;
        return plantationFeatures;
    }, [allPlantationFeatures, plantationFeatures]);

    const activeOrganization = useMemo(() => {
        if (!activeOrgId || activeOrgId === 'ALL' || activeOrgId === 'personal') return null;
        return (
            allOrganizations.find(o => o.id === activeOrgId) ||
            organizations.find(o => o.id === activeOrgId) ||
            null
        );
    }, [activeOrgId, allOrganizations, organizations]);

    // Unified Plantations + Announcements Checkpoints
    const allCheckpoints = useMemo(() => {
        return buildUnifiedCheckpoints({
            organizations,
            allOrganizations,
            allPlantationFeatures: mergedFeatures,
            crops,
            cropVarieties,
            allUsers,
            forumPosts
        });
    }, [organizations, allOrganizations, mergedFeatures, crops, cropVarieties, allUsers, forumPosts]);

    const filteredCheckpoints = useMemo(() => {
        return filterCheckpoints(allCheckpoints, announcementFilters);
    }, [allCheckpoints, announcementFilters]);

    // Keep open details modal synced if new announcements are added
    useEffect(() => {
        if (!selectedCheckpoint) return;
        const fresh = allCheckpoints.find(cp => cp.id === selectedCheckpoint.id);
        if (fresh) {
            setSelectedCheckpoint(fresh);
        }
    }, [allCheckpoints]);

    const handleFocusCheckpoint = (cp: MapCheckpointItem) => {
        setFocusedCheckpointId(cp.id);
        const [lat, lng] = cp.coordinates;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            props.onSetFlyToBounds([
                [lat - 0.015, lng - 0.015],
                [lat + 0.015, lng + 0.015]
            ]);
            if (!isDesktop) setViewMode('map');
        }
    };

    const handleFitAllFilteredCheckpoints = () => {
        if (filteredCheckpoints.length === 0) {
            toast.info(isKa ? 'რუკაზე ჩეკპოინტები არ არის' : 'No checkpoints to fit on map.');
            return;
        }
        if (filteredCheckpoints.length === 1) {
            handleFocusCheckpoint(filteredCheckpoints[0]);
            return;
        }
        const lats = filteredCheckpoints.map(cp => cp.coordinates[0]);
        const lngs = filteredCheckpoints.map(cp => cp.coordinates[1]);
        const padLat = Math.max((Math.max(...lats) - Math.min(...lats)) * 0.15, 0.05);
        const padLng = Math.max((Math.max(...lngs) - Math.min(...lngs)) * 0.15, 0.05);
        props.onSetFlyToBounds([
            [Math.min(...lats) - padLat, Math.min(...lngs) - padLng],
            [Math.max(...lats) + padLat, Math.max(...lngs) + padLng]
        ]);
        if (!isDesktop) setViewMode('map');
    };

    const openMessageForCheckpoint = (cp: MapCheckpointItem, announcement?: ForumPost) => {
        const ad = announcement?.announcementData;
        const summary = ad
            ? (isKa
                ? `გამარჯობა, გწერთ განცხადებასთან დაკავშირებით: "${announcement?.title || ad.workType}" (${ad.workType}, ${formatContractLabel(ad.contractType, ad.customContractLabel, true)}).`
                : `Hello, I am reaching out regarding "${announcement?.title || ad.workType}" (${ad.workType}, ${formatContractLabel(ad.contractType, ad.customContractLabel, false)}).`)
            : '';
        setQuickMessageRecipient({
            id: cp.recipientId,
            name: cp.name,
            type: cp.recipientType,
            organizationId: cp.organizationId,
            initialMode: 'chat',
            contextTitle: announcement?.title || `${cp.name} · ${cp.agricultureType}`,
            contextSummary: summary
        });
    };

    const openTicketForCheckpoint = (cp: MapCheckpointItem, announcement?: ForumPost) => {
        const ad = announcement?.announcementData;
        const summary = ad
            ? (isKa
                ? `განცხადებაზე გამოხმაურება / სერვისის შეთავაზება: "${announcement?.title || ad.workType}"\nსამუშაოს ტიპი: ${ad.workType}\nკონტრაქტი: ${formatContractLabel(ad.contractType, ad.customContractLabel, true)}\nრეგიონი: ${ad.region}\n\nჩემი გამოცდილება და კონტაქტი: `
                : `Application / Service Offer for "${announcement?.title || ad.workType}"\nRole: ${ad.workType}\nContract: ${formatContractLabel(ad.contractType, ad.customContractLabel, false)}\nRegion: ${ad.region}\n\nMy details & availability: `)
            : (isKa
                ? `სერვისის შეთავაზება / თანამშრომლობის მოთხოვნა კომპანიისთვის ${cp.name} (${cp.region}, ${cp.agricultureType}): `
                : `Service offer / work inquiry for ${cp.name} (${cp.region}, ${cp.agricultureType}): `);

        setQuickMessageRecipient({
            id: cp.recipientId,
            name: cp.name,
            type: cp.recipientType,
            organizationId: cp.organizationId,
            initialMode: 'ticket',
            contextTitle: announcement?.title || `${cp.name} · ${cp.region}`,
            contextSummary: summary
        });
    };

    // Forum & Hub posts (exclude structured announcements so tabs remain focused)
    const filteredPosts = useMemo(() => {
        return forumPosts
            .filter(p => {
                if (p.isAnnouncement) return false;
                if (mainTab === 'COMMUNICATOR') {
                    if (hubType === 'INTERNAL') return p.hubType === 'internal' && !p.isDirectMessage;
                    if (hubType === 'REGIONAL') return (p.hubType === 'regional' || (!p.hubType && p.channelId === 'general')) && !p.isDirectMessage;
                    if (hubType === 'GLOBAL') return p.hubType === 'global' && !p.isDirectMessage;
                    return !p.isDirectMessage;
                }
                return !p.isDirectMessage;
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [forumPosts, hubType, mainTab]);

    const filteredPartners = useMemo(() => {
        const query = searchQuery.toLowerCase();

        let individualPartners = allUsers.filter(u => {
            if (u.id === currentUser?.id) return false;
            if (!u.isPubliclyVisible && !u.isProfileDiscoverable) return false;

            const matchesRole =
                roleFilter === 'ALL' ||
                (roleFilter === 'BUYER' && u.roles?.includes('Buyer')) ||
                (roleFilter === 'SELLER' && u.roles?.includes('seller')) ||
                (roleFilter === 'WORKER' && u.roles?.includes('worker')) ||
                (roleFilter === 'AGRONOMIST' && u.roles?.includes('Agronomist')) ||
                (roleFilter === 'SHOP' && u.roles?.includes('Agro-Shop'));

            const matchesSearch =
                u.name.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query) ||
                u.region?.toLowerCase().includes(query);

            return matchesRole && matchesSearch;
        });

        if (sortByOnline) {
            individualPartners = [...individualPartners].sort((a, b) => {
                const aOnline = isUserOnline(a);
                const bOnline = isUserOnline(b);
                if (aOnline && !bOnline) return -1;
                if (!aOnline && bOnline) return 1;
                return 0;
            });
        }

        const orgPartners = organizations.filter(o => {
            if (!o.isDiscoverable) return false;
            if (roleFilter !== 'ALL' && roleFilter !== 'COMPANY') return false;

            const matchesSearch =
                o.name.toLowerCase().includes(query) ||
                o.region?.toLowerCase().includes(query) ||
                o.type.toLowerCase().includes(query);
            return matchesSearch;
        });

        return [...individualPartners, ...orgPartners];
    }, [allUsers, organizations, currentUser, roleFilter, searchQuery, sortByOnline]);

    const handleExportPartners = () => {
        const headers = ['Name', 'Type', 'Region', 'Crops', 'Area', 'Contact Email'];
        const rows = filteredPartners.map(p => {
            const partnerCrops = crops
                .filter(c => c.organizationId === (p as any).id || (p as any).organizationId === c.organizationId)
                .map(c => c.name)
                .join(', ');
            return [
                p.name,
                (p as any).type ? 'Company' : 'Individual',
                p.region || 'N/A',
                partnerCrops || 'N/A',
                (p as any).areaHa || 'N/A',
                (p as any).email || 'N/A'
            ].join(',');
        });
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'agrimap_partners_export.csv');
        link.click();
    };

    useEffect(() => {
        if (initialConversationId) {
            setMainTab('COMMUNICATOR');
            const conversationExists = forumPosts.some(p => p.channelId === initialConversationId);
            if (!conversationExists) {
                const userId = initialConversationId.replace('dm_', '').split('_').find(id => id !== currentUser?.id);
                const partner = allUsers.find(u => u.id === userId);
                if (partner) {
                    onAddPost({
                        title: `Secure Session with ${partner.name}`,
                        content: `Starting a professional dialogue with ${partner.name}.`,
                        isDirectMessage: true,
                        recipientId: partner.id,
                        recipientName: partner.name,
                        hubType: 'internal',
                        channelId: initialConversationId
                    });
                }
            }
            onClearInitialConversation?.();
        }
    }, [initialConversationId, forumPosts, currentUser, allUsers, onAddPost, onClearInitialConversation]);

    const renderContentWithMentions = (content: string) => {
        const parts = content.split(/(\s+)/);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                return (
                    <span key={index} className="text-blue-600 font-bold cursor-pointer hover:underline">
                        {part}
                    </span>
                );
            }
            if (part.startsWith('#')) {
                return (
                    <span key={index} className="text-emerald-600 font-bold cursor-pointer hover:underline">
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    // Live summary counts for compact map legend
    const mapSummary = useMemo(() => {
        const plantations = filteredCheckpoints.filter(c => c.kind === 'plantation').length;
        const hiring = filteredCheckpoints.filter(c => c.kind === 'company_hiring').length;
        const offers = filteredCheckpoints.filter(c => c.kind === 'service_offer').length;
        return { plantations, hiring, offers };
    }, [filteredCheckpoints]);

    useEffect(() => {
        if (!currentUser || !onMarkPostAsRead) return;

        filteredPosts.forEach(post => {
            const isUnread = !(post.readBy || []).includes(currentUser.id);
            const isTarget = post.isDirectMessage
                ? post.recipientId === currentUser.id
                : post.content.includes(`@${currentUser.name}`);

            if (isUnread && isTarget) {
                onMarkPostAsRead(post.id);
            }
        });
    }, [filteredPosts, currentUser, onMarkPostAsRead]);

    const openAnnouncementsCount = useMemo(
        () => forumPosts.filter(p => p.isAnnouncement && p.announcementData?.status !== 'closed').length,
        [forumPosts]
    );

    return (
        <main className="w-full h-full bg-white overflow-hidden flex flex-col lg:flex-row min-h-0 relative">
            {/* Switcher Button: Map vs Panel (Mobile & Tablet only) */}
            <div className="lg:hidden absolute top-3 right-3 z-[1005] flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => setViewMode(viewMode === 'map' ? 'panel' : 'map')}
                    className="px-3.5 py-2 bg-slate-900/95 hover:bg-black text-white rounded-xl shadow-lg flex items-center gap-2 border border-slate-700/80 backdrop-blur-md text-xs font-semibold cursor-pointer"
                >
                    {viewMode === 'map' ? (
                        <>
                            <MessageSquare size={15} className="text-emerald-400 shrink-0" />
                            <span>{isKa ? 'პანელი' : 'Panel'}</span>
                        </>
                    ) : (
                        <>
                            <MapIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{isKa ? 'რუკა' : 'Map'}</span>
                        </>
                    )}
                </button>
            </div>

            {/* Left Panel */}
            {(isDesktop || viewMode !== 'map') && (
                <div
                    className={`h-full bg-white relative z-20 min-h-0 flex flex-col flex-shrink-0 ${
                        isDesktop ? 'border-r border-slate-200' : 'w-full flex-1'
                    }`}
                    style={{ width: isDesktop ? `${communicatorPanelWidth}px` : undefined }}
                >
                    {/* Main Tabs: Announcements (replaces Google Chat & Meet), Forum & Hub, Partners Find */}
                    <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide bg-slate-50/90 shrink-0 min-h-[52px] h-[52px] items-stretch">
                        <button
                            type="button"
                            onClick={() => setMainTab('ANNOUNCEMENTS')}
                            className={`flex-1 py-3 px-3.5 flex items-center justify-center gap-2 text-xs font-semibold transition-colors border-b-2 whitespace-nowrap shrink-0 h-full cursor-pointer ${
                                mainTab === 'ANNOUNCEMENTS'
                                    ? 'border-emerald-600 text-emerald-700 bg-white'
                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <Megaphone size={15} className="shrink-0" />
                            <span>
                                {isKa ? 'განცხადებები' : 'Announcements'}
                                {openAnnouncementsCount > 0 ? ` (${openAnnouncementsCount})` : ''}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMainTab('COMMUNICATOR')}
                            className={`flex-1 py-3 px-3.5 flex items-center justify-center gap-2 text-xs font-semibold transition-colors border-b-2 whitespace-nowrap shrink-0 h-full cursor-pointer ${
                                mainTab === 'COMMUNICATOR'
                                    ? 'border-indigo-600 text-indigo-700 bg-white'
                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <UserGroupIcon size={15} className="shrink-0" />
                            <span>{isKa ? 'ფორუმი და ჰაბი' : 'Forum & Hub'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMainTab('PARTNERS')}
                            className={`flex-1 py-3 px-3.5 flex items-center justify-center gap-2 text-xs font-semibold transition-colors border-b-2 whitespace-nowrap shrink-0 h-full cursor-pointer ${
                                mainTab === 'PARTNERS'
                                    ? 'border-slate-900 text-slate-900 bg-white'
                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <SearchIcon size={15} className="shrink-0" />
                            <span>{isKa ? 'პარტნიორების ძიება' : 'Partners Find'}</span>
                        </button>
                        {canManageJoinRequests && (
                            <button
                                type="button"
                                onClick={() => setMainTab('JOIN_REQUESTS')}
                                className={`flex-1 py-3 px-3.5 flex items-center justify-center gap-2 text-xs font-semibold transition-colors border-b-2 whitespace-nowrap shrink-0 h-full cursor-pointer ${
                                    mainTab === 'JOIN_REQUESTS'
                                        ? 'border-emerald-600 text-emerald-700 bg-white'
                                        : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <UserPlus size={15} className="shrink-0" />
                                <span>
                                    {isKa ? 'მოთხოვნები' : 'Join Requests'}
                                    {pendingJoinRequests.length > 0 ? ` (${pendingJoinRequests.length})` : ''}
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Sub Content View */}
                    <div className="flex-grow flex flex-col overflow-hidden min-h-0">
                        {/* Tab 1: Announcements & Plantations Discovery */}
                        {mainTab === 'ANNOUNCEMENTS' && (
                            <AnnouncementsPanel
                                currentUser={currentUser}
                                activeOrganization={activeOrganization}
                                organizations={organizations}
                                allPlantationFeatures={mergedFeatures}
                                crops={crops}
                                cropVarieties={cropVarieties}
                                checkpoints={filteredCheckpoints}
                                allCheckpointsCount={allCheckpoints.length}
                                filters={announcementFilters}
                                onChangeFilters={setAnnouncementFilters}
                                onAddAnnouncement={onAddPost}
                                onUpdatePost={onUpdatePost}
                                onOpenDetails={cp => setSelectedCheckpoint(cp)}
                                onSendMessage={openMessageForCheckpoint}
                                onSendTicket={openTicketForCheckpoint}
                                onFocusCheckpoint={handleFocusCheckpoint}
                                onFitAllFiltered={handleFitAllFilteredCheckpoints}
                                isPickingLocation={isPickingLocation}
                                pickedLocation={pickedLocation}
                                onTogglePickLocation={setIsPickingLocation}
                                onClearPickedLocation={() => setPickedLocation(null)}
                                isKa={isKa}
                            />
                        )}

                        {/* Tab 2: Forum & Hub */}
                        {mainTab === 'COMMUNICATOR' && (
                            <>
                                <div className="p-3.5 flex gap-1.5 shrink-0 bg-white border-b border-slate-100">
                                    {(['INTERNAL', 'REGIONAL', 'GLOBAL'] as const).map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setHubType(t)}
                                            className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                                hubType === t
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            {t === 'INTERNAL' ? (isKa ? 'შიდა' : 'Internal') : t === 'REGIONAL' ? (isKa ? 'რეგიონული' : 'Regional') : (isKa ? 'გლობალური' : 'Global')}
                                        </button>
                                    ))}
                                </div>

                                <div className="px-4 py-2 shrink-0 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 text-xs text-slate-500">
                                    <HashtagIcon size={13} className="text-indigo-500" />
                                    <span className="font-medium">{isKa ? 'სამუშაო ფორუმი და შეტყობინებები' : 'Community Forum & Tickets'}</span>
                                </div>

                                <div className="flex-grow overflow-y-auto p-4 space-y-3">
                                    {filteredPosts.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                                            {isKa ? 'დისკუსიები ჯერ არ არის.' : 'No conversations here yet.'}
                                        </div>
                                    ) : (
                                        filteredPosts.map(post => (
                                            <div key={post.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                                            <UserCircleIcon size={22} className="text-slate-400" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-semibold text-slate-900 text-xs truncate">
                                                                {post.title || (post.isDirectMessage ? `Chat with ${post.authorId === currentUser?.id ? post.recipientName : post.authorName}` : 'Conversation')}
                                                            </h4>
                                                            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                                                <span>{post.authorName}</span>
                                                                <span aria-hidden="true">·</span>
                                                                <span className="tabular-nums">{new Date(post.timestamp).toLocaleTimeString()}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                    {renderContentWithMentions(post.content)}
                                                </p>
                                                {isCompanyJoinTicketPost(post) && post.authorId !== currentUser?.id && (() => {
                                                    const targetOrgId = resolveTicketTargetOrgId({
                                                        post,
                                                        activeOrgId,
                                                        organizations,
                                                        memberships
                                                    });
                                                    const resolutionState = getTicketResolutionState(post, memberships, targetOrgId);
                                                    const targetOrg = organizations.find(o => o.id === targetOrgId);
                                                    const availableRoles = Array.from(
                                                        new Set(['Employee', 'Field Manager', 'Admin', 'Agronomist', 'Accountant', ...(roles || []).map(r => r.name).filter(Boolean)])
                                                    );
                                                    const chosenRole = ticketRolesByPost[post.id] || 'Employee';
                                                    const isBusy = processingTicketPostId === post.id;

                                                    if (resolutionState === 'approved') {
                                                        return (
                                                            <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-700 text-xs font-semibold">
                                                                <Check size={14} />
                                                                <span>{isKa ? 'დამტკიცებულია · დამატებულია კომპანიაში' : 'Approved · Added to Company'}</span>
                                                            </div>
                                                        );
                                                    }
                                                    if (resolutionState === 'declined') {
                                                        return (
                                                            <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-semibold">
                                                                <X size={14} />
                                                                <span>{isKa ? 'უარყოფილია' : 'Request Declined'}</span>
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-xs font-semibold text-slate-800">
                                                                    {isKa ? 'კომპანიაში დამატების / სერვისის ტიკეტი' : 'Company Service / Join Ticket'}
                                                                </span>
                                                                <select
                                                                    value={chosenRole}
                                                                    onChange={e => setTicketRolesByPost(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                                    disabled={isBusy}
                                                                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none"
                                                                >
                                                                    {availableRoles.map(rName => (
                                                                        <option key={rName} value={rName}>{rName}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button
                                                                    type="button"
                                                                    disabled={isBusy}
                                                                    onClick={async () => {
                                                                        if (!targetOrgId) {
                                                                            toast.error(isKa ? 'აირჩიეთ კომპანია დასამატებლად' : 'Please select an active organization first.');
                                                                            return;
                                                                        }
                                                                        setProcessingTicketPostId(post.id);
                                                                        try {
                                                                            await resolveCompanyTicketOrJoin({
                                                                                decision: 'approve',
                                                                                userId: post.authorId,
                                                                                userName: post.authorName,
                                                                                orgId: targetOrgId,
                                                                                orgName: targetOrg?.name || post.ticketOrgName,
                                                                                membershipId: post.ticketMembershipId,
                                                                                selectedRole: chosenRole,
                                                                                postId: post.id,
                                                                                currentUser,
                                                                                memberships,
                                                                                onSetMemberships,
                                                                                employees,
                                                                                onSetEmployees,
                                                                                users: allUsers,
                                                                                allUsers,
                                                                                onSetUsers,
                                                                                roles,
                                                                                organizations,
                                                                                forumPosts,
                                                                                onAddPost,
                                                                                onUpdatePost,
                                                                                alerts,
                                                                                onSetAlerts: setAlerts,
                                                                                isKa
                                                                            });
                                                                        } finally {
                                                                            setProcessingTicketPostId(null);
                                                                        }
                                                                    }}
                                                                    className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                                                                >
                                                                    <Check size={13} />
                                                                    <span>{isKa ? 'მიღება' : 'Approve'}</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={isBusy}
                                                                    onClick={async () => {
                                                                        setProcessingTicketPostId(post.id);
                                                                        try {
                                                                            await resolveCompanyTicketOrJoin({
                                                                                decision: 'decline',
                                                                                userId: post.authorId,
                                                                                userName: post.authorName,
                                                                                orgId: targetOrgId,
                                                                                orgName: targetOrg?.name || post.ticketOrgName,
                                                                                membershipId: post.ticketMembershipId,
                                                                                postId: post.id,
                                                                                currentUser,
                                                                                memberships,
                                                                                onSetMemberships,
                                                                                employees,
                                                                                onSetEmployees,
                                                                                users: allUsers,
                                                                                allUsers,
                                                                                onSetUsers,
                                                                                roles,
                                                                                organizations,
                                                                                forumPosts,
                                                                                onAddPost,
                                                                                onUpdatePost,
                                                                                alerts,
                                                                                onSetAlerts: setAlerts,
                                                                                isKa
                                                                            });
                                                                        } finally {
                                                                            setProcessingTicketPostId(null);
                                                                        }
                                                                    }}
                                                                    className="py-2 bg-white hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                                                                >
                                                                    <X size={13} />
                                                                    <span>{isKa ? 'უარყოფა' : 'Decline'}</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                                <div className="flex items-center justify-between pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setReplyToPostId(post.id);
                                                            setPostContent(`@${post.authorName} `);
                                                        }}
                                                        className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                                                    >
                                                        {isKa ? 'პასუხი' : 'Reply'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Post Input UI */}
                                <div className="p-4 border-t border-slate-200 bg-white">
                                    {replyToPostId && (
                                        <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-t-lg mb-2">
                                            <p className="text-xs font-medium text-indigo-700">{isKa ? 'პასუხი პოსტზე' : 'Replying to post'}</p>
                                            <button type="button" onClick={() => setReplyToPostId(null)} className="text-indigo-500 hover:text-indigo-700 cursor-pointer">
                                                <XIcon size={14} />
                                            </button>
                                        </div>
                                    )}
                                    <div className="space-y-2.5">
                                        <input
                                            type="text"
                                            placeholder={isKa ? 'სათაური (არასავალდებულო)...' : 'Post title (Optional)...'}
                                            value={postTitle}
                                            onChange={e => setPostTitle(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                                        />
                                        <textarea
                                            placeholder={isKa ? 'დაწერეთ შეტყობინება...' : 'Type your message...'}
                                            rows={2}
                                            value={postContent}
                                            onChange={e => setPostContent(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 outline-none resize-none"
                                        />
                                        <div className="flex items-center justify-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!postContent.trim()) return;
                                                    onAddPost({
                                                        title: postTitle,
                                                        content: postContent,
                                                        hubType: hubType.toLowerCase() as any,
                                                        isDirectMessage: false,
                                                        parentPostId: replyToPostId || undefined
                                                    });
                                                    setPostTitle('');
                                                    setPostContent('');
                                                    setReplyToPostId(null);
                                                }}
                                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                <span>{isKa ? 'გაგზავნა' : 'Post'}</span>
                                                <PaperAirplaneIcon size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Tab 3: Partners Find */}
                        {mainTab === 'PARTNERS' && (
                            <div className="flex flex-col h-full overflow-hidden">
                                <div className="p-4 border-b border-slate-200 space-y-3 shrink-0">
                                    <div className="relative">
                                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder={isKa ? 'პარტნიორების ძიება...' : 'Search partners, companies, regions...'}
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-slate-400 outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setSortByOnline(!sortByOnline)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                                sortByOnline
                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            Online First
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (onSetAiTab) onSetAiTab('market');
                                                onSetAppMode('ai');
                                            }}
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
                                        >
                                            Market Intelligence
                                        </button>
                                        {['ALL', 'COMPANY', 'BUYER', 'SELLER', 'WORKER', 'AGRONOMIST', 'SHOP'].map(role => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setRoleFilter(role)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                                    roleFilter === role
                                                        ? 'bg-slate-900 text-white border-slate-900'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                {role === 'ALL' ? 'All' : role.charAt(0) + role.slice(1).toLowerCase()}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={handleExportPartners}
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer ml-auto"
                                        >
                                            Export CSV
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-grow overflow-y-auto divide-y divide-slate-100">
                                    {filteredPartners.map(partner => {
                                        const isOrg = (partner as any).type !== undefined;
                                        const partnerCrops = crops.filter(
                                            c => c.organizationId === (partner as any).id || (partner as any).organizationId === c.organizationId
                                        );
                                        const matchedCheckpoint = allCheckpoints.find(
                                            cp => cp.organizationId === partner.id || cp.recipientId === partner.id
                                        );

                                        return (
                                            <div
                                                key={partner.id}
                                                className="p-4 bg-white hover:bg-slate-50/70 transition-colors group relative space-y-2.5"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shrink-0">
                                                        {(partner as any).avatar ? (
                                                            <img src={(partner as any).avatar} alt={partner.name} className="w-full h-full object-cover" />
                                                        ) : isOrg ? (
                                                            <BuildingStorefrontIcon size={20} className="text-emerald-600" />
                                                        ) : (
                                                            <UserCircleIcon size={24} className="text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h4
                                                            className="font-bold text-slate-900 text-sm hover:text-emerald-700 cursor-pointer truncate"
                                                            onClick={() => {
                                                                if (matchedCheckpoint) setSelectedCheckpoint(matchedCheckpoint);
                                                                else onSetAppMode('profile');
                                                            }}
                                                        >
                                                            {partner.name}
                                                        </h4>
                                                        <p className="text-xs text-slate-500 truncate">
                                                            {isOrg
                                                                ? (partner as any).type
                                                                : (partner as User).roles?.find(r => ['Buyer', 'seller', 'worker', 'Agronomist', 'Agro-Shop'].includes(r || '')) || 'Partner'}
                                                            {' · '}
                                                            {partner.region || 'Georgia'}
                                                            {!isOrg && isUserOnline(partner as User) ? ' · Online' : ''}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onForwardToAnalyst?.({
                                                                name: partner.name,
                                                                region: partner.region,
                                                                crops: partnerCrops.map(c => c.name),
                                                                areaHa: (partner as any).areaHa
                                                            })
                                                        }
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                                        title="Forward to Market Intelligence"
                                                    >
                                                        <SparklesIcon size={16} />
                                                    </button>
                                                </div>

                                                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                                    {(partner as any).publicData?.description ||
                                                        (partner as any).description ||
                                                        `${isOrg ? (partner as any).type : (partner as User).roles?.join(', ')} active in ${partner.region || 'Georgia'}.`}
                                                </p>

                                                <div className="flex items-center gap-2">
                                                    {matchedCheckpoint && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedCheckpoint(matchedCheckpoint)}
                                                            className="px-3 py-1.5 bg-slate-900 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs transition-colors cursor-pointer"
                                                        >
                                                            {isKa ? 'დეტალები' : 'Details'}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setQuickMessageRecipient({
                                                                id: partner.id,
                                                                name: partner.name,
                                                                type: isOrg ? 'org' : 'user',
                                                                organizationId: isOrg ? partner.id : undefined,
                                                                initialMode: 'chat'
                                                            });
                                                        }}
                                                        className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg font-medium text-xs transition-colors cursor-pointer"
                                                    >
                                                        {isKa ? 'მიწერა / ტიკეტი' : 'Message / Ticket'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (matchedCheckpoint) {
                                                                handleFocusCheckpoint(matchedCheckpoint);
                                                                return;
                                                            }
                                                            const latlng = (partner as any).location;
                                                            if (latlng && Array.isArray(latlng) && latlng.length === 2) {
                                                                const lat = Number(latlng[0]);
                                                                const lng = Number(latlng[1]);
                                                                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                                                                    props.onSetFlyToBounds([[lat - 0.01, lng - 0.01], [lat + 0.01, lng + 0.01]]);
                                                                    return;
                                                                }
                                                            }
                                                            toast.info('Partner has no registered map location.');
                                                        }}
                                                        className="p-1.5 bg-white text-slate-500 hover:bg-slate-100 hover:text-emerald-700 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                                                        title={isKa ? 'რუკაზე ჩვენება' : 'Show on Map'}
                                                    >
                                                        <MapPinIcon size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Tab 4: Manager-Only Persisted Join Requests Queue */}
                        {mainTab === 'JOIN_REQUESTS' && canManageJoinRequests && (
                            <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50/60">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                                            {isKa ? 'გაწევრიანების მოთხოვნები' : 'Company Join Requests'}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {isKa
                                                ? 'დადასტურება ამოწმებს წევრობას და ქმნის თანამშრომლის ჩანაწერს ტრანზაქციით.'
                                                : 'Approval verifies existing membership and links employee identity atomically.'}
                                        </p>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700 tabular-nums">
                                        {pendingJoinRequests.length} {isKa ? 'მომლოდინე' : 'pending'}
                                    </span>
                                </div>

                                {pendingJoinRequests.length === 0 ? (
                                    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                                        <UserPlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm font-bold text-slate-700">
                                            {isKa ? 'მომლოდინე მოთხოვნები არ არის' : 'No pending join requests'}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {isKa
                                                ? 'როდესაც მომხმარებლები გაგზავნიან გაწევრიანების მოთხოვნას, აქ გამოჩნდება.'
                                                : 'When applicants request to join your company, they will appear here for review.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pendingJoinRequests.map(req => {
                                            const isBusy = processingJoinId === req.id;
                                            return (
                                                <div
                                                    key={req.id}
                                                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-900 truncate">{req.userName}</p>
                                                            {req.userEmail && (
                                                                <p className="text-xs text-slate-500 truncate">{req.userEmail}</p>
                                                            )}
                                                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                                                                <span className="font-semibold text-slate-700">{req.organizationName}</span>
                                                                {req.requestedRole && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>{req.requestedRole}</span>
                                                                    </>
                                                                )}
                                                                <span>•</span>
                                                                <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-bold uppercase tracking-wider text-amber-700 shrink-0">
                                                            {isKa ? 'მომლოდინე' : 'Pending'}
                                                        </span>
                                                    </div>

                                                    {req.message && (
                                                        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-2.5 leading-relaxed">
                                                            {req.message}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-2 pt-1">
                                                        <button
                                                            type="button"
                                                            disabled={isBusy || !onApproveJoinRequest}
                                                            onClick={async () => {
                                                                if (!onApproveJoinRequest) return;
                                                                setProcessingJoinId(req.id);
                                                                try {
                                                                    await onApproveJoinRequest(req);
                                                                } finally {
                                                                    setProcessingJoinId(null);
                                                                }
                                                            }}
                                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
                                                        >
                                                            <Check size={14} />
                                                            <span>{isBusy ? (isKa ? 'მუშავდება...' : 'Processing...') : (isKa ? 'დადასტურება' : 'Approve')}</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isBusy || !onDeclineJoinRequest}
                                                            onClick={async () => {
                                                                if (!onDeclineJoinRequest) return;
                                                                setProcessingJoinId(req.id);
                                                                try {
                                                                    await onDeclineJoinRequest(req);
                                                                } finally {
                                                                    setProcessingJoinId(null);
                                                                }
                                                            }}
                                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 disabled:opacity-50 text-rose-600 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                                                        >
                                                            <X size={14} />
                                                            <span>{isKa ? 'უარყოფა' : 'Decline'}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {resolvedJoinRequests.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-slate-200">
                                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                            {isKa ? 'ბოლო გადაწყვეტილებები' : 'Recent Decisions'}
                                        </p>
                                        <div className="space-y-2">
                                            {resolvedJoinRequests.map(req => (
                                                <div
                                                    key={req.id}
                                                    className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-800 truncate">{req.userName}</p>
                                                        <p className="text-[11px] text-slate-400 truncate">
                                                            {req.userEmail || req.organizationName}
                                                            {req.reviewedAt ? ` • ${new Date(req.reviewedAt).toLocaleDateString()}` : ''}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                                                            req.status === 'approved'
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                                        }`}
                                                    >
                                                        {req.status === 'approved'
                                                            ? (isKa ? 'დადასტურებულია' : 'Approved')
                                                            : (isKa ? 'უარყოფილია' : 'Declined')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Resizable Divider on PC Desktop */}
            <ResizableDivider
                direction="horizontal"
                currentSize={communicatorPanelWidth}
                onResize={setCommunicatorPanelWidth}
                minSize={360}
                maxSize={typeof window !== 'undefined' ? Math.max(window.innerWidth - 340, 720) : 800}
                storageKey="communicator_panel_width"
                isKa={isKa}
                className="hidden lg:flex"
            />

            {/* Map Area */}
            {(isDesktop || viewMode === 'map') && (
                <div className="w-full lg:w-auto h-full flex-1 relative overflow-hidden bg-slate-200 min-w-0">
                    {/* Mobile Back to Panel */}
                    <div className="lg:hidden absolute top-4 left-4 z-[1005]">
                        <button
                            type="button"
                            onClick={() => setViewMode('panel')}
                            className="px-3.5 py-2 bg-slate-900/95 hover:bg-black text-white rounded-xl shadow-lg flex items-center gap-2 border border-slate-700/80 text-xs font-semibold cursor-pointer"
                        >
                            <Megaphone size={14} className="text-emerald-400 shrink-0" />
                            <span>{isKa ? 'პანელზე დაბრუნება' : 'Back to Panel'}</span>
                        </button>
                    </div>

                    {/* Pick Location Helper Banner */}
                    {isPickingLocation && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1010] bg-amber-600 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold">
                            <Crosshair size={15} />
                            <span>{isKa ? 'დააწკაპეთ რუკაზე განცხადების წერტილის დასამატებლად' : 'Click anywhere on the map to set the announcement checkpoint'}</span>
                            <button
                                type="button"
                                onClick={() => setIsPickingLocation(false)}
                                className="ml-1 p-0.5 hover:bg-amber-700 rounded cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    <MapComponent
                        {...mapProps}
                        showSearch={false}
                        externalUsers={
                            mainTab === 'PARTNERS'
                                ? (allUsers || []).filter(
                                      u => (u.isPubliclyVisible || u.isProfileDiscoverable) && (u.location || u.workingArea?.center)
                                  )
                                : []
                        }
                        externalOrganizations={
                            mainTab === 'PARTNERS'
                                ? (organizations || []).filter(o => o.isDiscoverable && (o.location || o.areaGeometry))
                                : []
                        }
                        onMapClick={ll => {
                            if (isPickingLocation) {
                                setPickedLocation([ll.lat, ll.lng]);
                                setIsPickingLocation(false);
                                toast.success(
                                    isKa
                                        ? `კოორდინატები არჩეულია: ${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)}`
                                        : `Checkpoint location pinned: ${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)}`
                                );
                                return;
                            }
                            if (mainTab === 'PARTNERS') {
                                setSearchQuery(`${ll.lat.toFixed(2)}, ${ll.lng.toFixed(2)}`);
                            }
                        }}
                    >
                        {/* Interactive Plantation & Announcement Checkpoints with Hover Cards */}
                        <MapCheckpointsLayer
                            checkpoints={filteredCheckpoints}
                            selectedCheckpointId={focusedCheckpointId}
                            onOpenDetails={cp => {
                                setFocusedCheckpointId(cp.id);
                                setSelectedCheckpoint(cp);
                            }}
                            isKa={isKa}
                        />

                        {/* Temporary pin while composing a new announcement */}
                        {pickedLocation && (
                            <Marker position={pickedLocation} icon={pickedLocationIcon} zIndexOffset={1500} />
                        )}
                    </MapComponent>

                    {/* Top-Left Functional Checkpoint Summary & Fit View Control */}
                    <div className="hidden lg:flex absolute top-4 left-4 z-[1000] items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl px-3.5 py-2 shadow-lg text-xs">
                        <span className="font-semibold text-slate-900 tabular-nums">
                            {filteredCheckpoints.length} {isKa ? 'ჩეკპოინტი' : filteredCheckpoints.length === 1 ? 'Checkpoint' : 'Checkpoints'}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-emerald-700 font-medium tabular-nums">
                            {mapSummary.plantations} {isKa ? 'პლანტაცია' : 'Plantations'}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-amber-700 font-medium tabular-nums">
                            {mapSummary.hiring} {isKa ? 'ვაკანსია' : 'Hiring'}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-blue-700 font-medium tabular-nums">
                            {mapSummary.offers} {isKa ? 'შეთავაზება' : 'Offers'}
                        </span>
                        <button
                            type="button"
                            onClick={handleFitAllFilteredCheckpoints}
                            className="ml-1.5 px-2.5 py-1 bg-slate-900 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                        >
                            <Compass size={12} />
                            <span>{isKa ? 'ყველას ნახვა' : 'Fit View'}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Full Checkpoint Details Modal */}
            <CheckpointDetailsModal
                checkpoint={selectedCheckpoint}
                onClose={() => setSelectedCheckpoint(null)}
                onSendMessage={(cp, ann) => openMessageForCheckpoint(cp, ann)}
                onSendTicket={(cp, ann) => openTicketForCheckpoint(cp, ann)}
                onFocusOnMap={cp => handleFocusCheckpoint(cp)}
                isKa={isKa}
            />

            {/* Direct Message & Official Ticket Dispatch Modal */}
            {quickMessageRecipient && (
                <QuickMessageModal
                    isOpen={!!quickMessageRecipient}
                    onClose={() => setQuickMessageRecipient(null)}
                    recipient={quickMessageRecipient}
                    isKa={isKa}
                    onSend={async (text, type) => {
                        if (type === 'chat') {
                            onAddPost({
                                title: quickMessageRecipient.contextTitle
                                    ? `Message: ${quickMessageRecipient.contextTitle}`
                                    : `Direct Session: ${quickMessageRecipient.name}`,
                                content: text,
                                isDirectMessage: true,
                                recipientId: quickMessageRecipient.id,
                                recipientName: quickMessageRecipient.name,
                                hubType: 'internal'
                            });
                            toast.success(
                                isKa
                                    ? `შეტყობინება გაიგზავნა (${quickMessageRecipient.name})`
                                    : `Message sent to ${quickMessageRecipient.name}`
                            );
                            setMainTab('COMMUNICATOR');
                        } else {
                            const ticketPostId = `ticket-${Date.now()}`;
                            const allKnownOrgs = [...allOrganizations, ...organizations];
                            const resolvedTargetOrg =
                                quickMessageRecipient.organizationId
                                    ? allKnownOrgs.find(o => o.id === quickMessageRecipient.organizationId)
                                    : quickMessageRecipient.type === 'org'
                                        ? allKnownOrgs.find(o => o.id === quickMessageRecipient.id)
                                        : allKnownOrgs.find(o => o.createdBy === quickMessageRecipient.id) ||
                                          (() => {
                                              const ownerMem = memberships.find(
                                                  m =>
                                                      m.userId === quickMessageRecipient.id &&
                                                      (m.status === 'active' || !m.status) &&
                                                      ['Founder', 'Admin', 'Co-Founder'].includes(m.role)
                                              );
                                              return ownerMem ? allKnownOrgs.find(o => o.id === ownerMem.organizationId) : undefined;
                                          })();
                            const targetOrgId =
                                resolvedTargetOrg?.id ||
                                (activeOrgId && activeOrgId !== 'ALL' && activeOrgId !== 'personal' ? activeOrgId : undefined);
                            const targetRecipientUserId =
                                quickMessageRecipient.type === 'user' ? quickMessageRecipient.id : resolvedTargetOrg?.createdBy;
                            const membershipId = currentUser?.id && targetOrgId ? `${currentUser.id}_${targetOrgId}` : undefined;

                            // Create pending membership so request also surfaces directly in HR Module & Notification Center
                            if (currentUser?.id && targetOrgId && membershipId) {
                                const alreadyActive = memberships.some(
                                    m => m.userId === currentUser.id && m.organizationId === targetOrgId && m.status === 'active'
                                );
                                if (!alreadyActive) {
                                    const pendingMem: Membership = {
                                        id: membershipId,
                                        userId: currentUser.id,
                                        organizationId: targetOrgId,
                                        role: 'Employee',
                                        permissionLevel: 'write',
                                        status: 'pending',
                                        joinedAt: new Date().toISOString()
                                    };
                                    if (onSetMemberships) {
                                        onSetMemberships([...memberships.filter(m => m.id !== membershipId), pendingMem]);
                                    } else {
                                        const savedMems = safeStorage.safeParse(localStorage.getItem('mock_memberships'), []);
                                        localStorage.setItem(
                                            'mock_memberships',
                                            JSON.stringify([...savedMems.filter((m: any) => m.id !== membershipId), pendingMem])
                                        );
                                    }
                                    if (USE_FIREBASE && auth.currentUser && currentUser.id !== 'root-system') {
                                        setDoc(doc(db, 'memberships', membershipId), pendingMem).catch(err =>
                                            console.warn('[Ticket] Pending membership write failed:', err)
                                        );
                                    }
                                }
                            }

                            onAddPost({
                                id: ticketPostId,
                                title: `Official Ticket for ${quickMessageRecipient.name}`,
                                content: `[TICKET-REQUEST]\n${text}`,
                                isDirectMessage: false,
                                channelId: ticketPostId,
                                hubType: 'internal',
                                recipientId: targetRecipientUserId,
                                recipientName: quickMessageRecipient.name,
                                organizationId: targetOrgId || activeOrgId || 'personal',
                                ticketType: 'company_join',
                                ticketStatus: 'pending',
                                ticketOrgId: targetOrgId,
                                ticketOrgName: resolvedTargetOrg?.name || quickMessageRecipient.name,
                                ticketMembershipId: membershipId
                            });

                            const alertId = `alert-ticket-${Date.now()}`;
                            const ticketAlert: Alert = {
                                id: alertId,
                                organizationId: targetOrgId || 'personal',
                                recipientId: targetRecipientUserId,
                                createdBy: currentUser?.id,
                                title: isKa ? 'განცხადებაზე გამოხმაურება / ტიკეტი' : `Service / Announcement Ticket`,
                                content: `${currentUser?.name || 'User'} sent an official ticket to ${resolvedTargetOrg?.name || quickMessageRecipient.name}: "${text}"`,
                                type: 'info',
                                timestamp: new Date().toISOString(),
                                isRead: false,
                                metadata: {
                                    membershipId,
                                    userId: currentUser?.id,
                                    userName: currentUser?.name,
                                    orgId: targetOrgId,
                                    orgName: resolvedTargetOrg?.name || quickMessageRecipient.name,
                                    postId: ticketPostId
                                },
                                actions: [
                                    {
                                        label: 'Approve',
                                        actionType: 'approve_join',
                                        actionData: {
                                            membershipId,
                                            userId: currentUser?.id,
                                            userName: currentUser?.name,
                                            orgId: targetOrgId,
                                            orgName: resolvedTargetOrg?.name || quickMessageRecipient.name,
                                            postId: ticketPostId
                                        }
                                    },
                                    {
                                        label: 'Decline',
                                        actionType: 'decline_join',
                                        actionData: {
                                            membershipId,
                                            userId: currentUser?.id,
                                            userName: currentUser?.name,
                                            orgId: targetOrgId,
                                            orgName: resolvedTargetOrg?.name || quickMessageRecipient.name,
                                            postId: ticketPostId
                                        }
                                    }
                                ]
                            };

                            if (USE_FIREBASE && auth.currentUser && currentUser?.id !== 'root-system') {
                                const firestoreAlert: Record<string, any> = { ...ticketAlert };
                                Object.keys(firestoreAlert).forEach(k => {
                                    if (firestoreAlert[k] === undefined) delete firestoreAlert[k];
                                });
                                setDoc(doc(db, 'alerts', alertId), firestoreAlert).catch(err =>
                                    console.warn('[Ticket] Firestore alert creation failed:', err)
                                );
                            } else {
                                const savedAlerts = safeStorage.safeParse(localStorage.getItem('mock_alerts'), []);
                                localStorage.setItem('mock_alerts', JSON.stringify([ticketAlert, ...savedAlerts]));
                            }

                            if (setAlerts) {
                                setAlerts(prev => [ticketAlert, ...prev]);
                            }

                            toast.success(
                                isKa
                                    ? 'ტიკეტი წარმატებით გაიგზავნა და აისახა შეტყობინებებსა და HR-ში.'
                                    : 'Ticket dispatched to company Intercom, Notification Center, and HR.'
                            );
                        }
                    }}
                />
            )}
        </main>
    );
};

export default CommunicationHubPanel;
