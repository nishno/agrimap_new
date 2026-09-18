import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    X,
    AlertTriangle, 
    CheckCircle2, 
    CloudLightning, 
    CloudUpload, 
    Database, 
    RefreshCcw, 
    ShieldCheck, 
    Sparkles, 
    TableProperties, 
    Tablet, 
    Trash2, 
    Wifi,
    Lock,
    Boxes,
    MapPin,
    Users,
    TrendingUp,
    FileText,
    GitCompare,
    Eye,
    Check,
    Layers,
    ArrowRightLeft,
    Clock,
    Scale,
    Wheat,
    Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { syncManager } from '../../services/SyncManager';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
    getDetailedSyncQueue, 
    clearSyncQueue, 
    deleteSyncLogEntries,
    db, 
    doc,
    getDoc,
    collection, 
    query, 
    where, 
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    updateSyncLogEntry
} from '../../firebase';
import { describeFlightRecord } from './DataStateAuditor';

interface SyncConflictModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPushToCloud: () => Promise<void>;
    onOpenDetailedAuditor: () => void;
}

type ModuleFilterType恒 = 'all' | 'harvest' | 'inventory' | 'maps' | 'finance' | 'directory';

export const SyncConflictModal: React.FC<SyncConflictModalProps> = ({
    isOpen,
    onClose,
    onPushToCloud,
    onOpenDetailedAuditor
}) => {
    const { language } = useLanguage();
    const isKa = language === 'ka';

    const [isProcessing, setIsProcessing] = useState(false);
    const [cloudTotalsMap, setCloudTotalsMap] = useState<Record<string, { weight: number, boxes: number, name: string }>>({});
    const [isLoadingCloud, setIsLoadingCloud] = useState(false);
    const [isStorageGuarded, setIsStorageGuarded] = useState(false);
    const [selectedModuleFilter, setSelectedModuleFilter] = useState<ModuleFilterType恒>('all');

    // Single item diff state
    const [inspectingItem, setInspectingItem] = useState<any | null>(null);
    const [cloudInspectDoc, setCloudInspectDoc] = useState<any | null>(null);
    const [isLoadingInspect, setIsLoadingInspect] = useState(false);

    // Retrieve persistent storage status from device OS
    useEffect(() => {
        if (isOpen && typeof window !== 'undefined' && navigator.storage && navigator.storage.persisted) {
            navigator.storage.persisted().then(setIsStorageGuarded).catch(console.error);
        }
    }, [isOpen]);

    // Retrieve pending items from local storage queue
    const syncQueue = useMemo(() => {
        return getDetailedSyncQueue().filter(i => i.status === 'pending' || i.status === 'error');
    }, [isOpen]);

    // Compute Module-by-Module counts
    const moduleCounts = useMemo(() => {
        const harvest = syncQueue.filter(i => i.path.startsWith('harvestEntries/') || i.path.startsWith('harvestEvents/') || i.path.startsWith('harvestLogs/') || i.path.startsWith('pallets/')).length;
        const inventory受 = syncQueue.filter(i => i.path.startsWith('inventoryItems/') || i.path.startsWith('stockTransactions/')).length;
        const maps = syncQueue.filter(i => i.path.startsWith('plantationFeatures/') || i.path.startsWith('layers/')).length;
        const finance = syncQueue.filter(i => i.path.startsWith('transactions/') || i.path.startsWith('accounts/')).length;
        const directory = syncQueue.filter(i => i.path.startsWith('employees/') || i.path.startsWith('roles/')).length;
        const other = syncQueue.length - harvest - inventory受 - maps - finance - directory;
        
        return { harvest, inventory: inventory受, maps, finance, directory, other };
    }, [syncQueue]);

    // Filter queue by active module card
    const filteredQueue = useMemo(() => {
        if (selectedModuleFilter === 'all') return syncQueue;
        if (selectedModuleFilter === 'harvest') return syncQueue.filter(i => i.path.startsWith('harvestEntries/') || i.path.startsWith('harvestEvents/') || i.path.startsWith('harvestLogs/') || i.path.startsWith('pallets/'));
        if (selectedModuleFilter === 'inventory') return syncQueue.filter(i => i.path.startsWith('inventoryItems/') || i.path.startsWith('stockTransactions/'));
        if (selectedModuleFilter === 'maps') return syncQueue.filter(i => i.path.startsWith('plantationFeatures/') || i.path.startsWith('layers/'));
        if (selectedModuleFilter === 'finance') return syncQueue.filter(i => i.path.startsWith('transactions/') || i.path.startsWith('accounts/'));
        if (selectedModuleFilter === 'directory') return syncQueue.filter(i => i.path.startsWith('employees/') || i.path.startsWith('roles/'));
        return syncQueue;
    }, [syncQueue, selectedModuleFilter]);

    // Group pending items by category
    const summaryCol = useMemo(() => {
        let totalPendingWeight = 0;
        let totalPendingBoxes = 0;
        const eventPendingMap: Record<string, { weight: number, boxes: number }> = {};

        syncQueue.forEach(item => {
            if (item.path.startsWith('harvestEntries/') && (item.type === 'set' || item.type === 'update') && item.data) {
                const weight述 = parseFloat(item.data.netWeightKg) || 0;
                const boxes述 = parseInt(item.data.boxCount) || 1;
                const evId = item.data.harvestEventId || 'unknown';

                totalPendingWeight += weight述;
                totalPendingBoxes += boxes述;

                if (!eventPendingMap[evId]) {
                    eventPendingMap[evId] = { weight: 0, boxes: 0 };
                }
                eventPendingMap[evId].weight += weight述;
                eventPendingMap[evId].boxes += boxes述;
            }
        });

        return {
            totalCount: syncQueue.length,
            totalPendingWeight,
            totalPendingBoxes,
            eventPendingMap
        };
    }, [syncQueue]);

    // Live query Cloud Firestore for selected active events in the queue
    useEffect(() => {
        if (!isOpen || Object.keys(summaryCol.eventPendingMap).length === 0) return;

        const fetchCloudData = async () => {
            setIsLoadingCloud(true);
            try {
                const affectedIds = Object.keys(summaryCol.eventPendingMap).filter(id => id !== 'unknown');
                const results: Record<string, { weight: number, boxes: number, name: string }> = {};

                for (const evId of affectedIds) {
                    try {
                        const eventRef = collection(db, 'harvestEvents');
                        const q = query(eventRef);
                        const snap = await getDocs(q);
                        const match = snap.docs.find(d => d.id === evId);
                        if (match) {
                            const data = match.data();
                            results[evId] = {
                                weight: parseFloat(data.totalNetWeightKg) || 0,
                                boxes: parseInt(data.totalBoxes) || 0,
                                name: data.name || (isKa ? `კრეფა #${evId.slice(-4)}` : `Harvest #${evId.slice(-4)}`)
                            };
                        } else {
                            results[evId] = { weight: 0, boxes: 0, name: isKa ? 'ახალი მოვლენა' : 'New Event' };
                        }
                    } catch (err) {
                        console.warn(`Could not fetch cloud details for ${evId}:`, err);
                    }
                }
                setCloudTotalsMap(results);
            } catch (err) {
                console.error("Cloud totals load error", err);
            } finally {
                setIsLoadingCloud(false);
            }
        };

        const timer = setTimeout(() => {
            fetchCloudData();
        }, 100);
        return () => clearTimeout(timer);
    }, [isOpen, summaryCol.eventPendingMap, isKa]);

    if (!isOpen || syncQueue.length === 0) return null;

    const handleConfirmMerge = async () => {
        setIsProcessing(true);
        toast.loading(isKa ? "მიმდინარეობს სინქრონიზაცია Cloud-თან..." : "Merging with Cloud Database...", { id: 'conflict-sync' });
        
        try {
            const success = await syncManager.pushAllToCloud();
            if (success) {
                toast.success(
                    isKa 
                    ? "🎉 სინქრონიზაცია წარმატებით დასრულდა! მუშათა და კრეფის მონაცემები უსაფრთხოდ გაერთიანდა." 
                    : "🎉 Data merged successfully! Core modules synced atomically with 0% data collision.", 
                    { id: 'conflict-sync', duration: 5000 }
                );
                onClose();
            } else {
                toast.error(isKa ? "სინქრონიზაცია ვერ მოხერხდა. სცადეთ მოგვიანებით." : "Merge failed. Please verify connection and retry.", { id: 'conflict-sync' });
            }
        } catch (err) {
            console.error(err);
            toast.error(isKa ? "მიერთება ჩაიშალა." : "Merge process crashed.", { id: 'conflict-sync' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDiscardLocal = () => {
        const confirmMsg述 = isKa 
            ? "⚠️ გაფრთხილება: ამ ტაბლეტზე არსებული ყველა ლოკალური, გაუსინქრონებელი ჩანაწერი წაიშლება და ჩანაცვლდება თბილისის/Cloud-ის მონაცემებით. გსურთ გაგრძელება?"
            : "⚠️ CRITICAL WARNING: This will discard all unsynced data on this tablet and overwrite it with current Cloud data. Continue?";
        
        if (window.confirm(confirmMsg述)) {
            clearSyncQueue();
            localStorage.removeItem('fb_cache_harvestEntries');
            toast.error(isKa ? "ლოკალური ჩანაწერები გაუქმებულია. მონაცემები განახლდება Cloud-დან." : "Local modifications discarded. System is reloading from Cloud.");
            onClose();
            setTimeout(() => window.location.reload(), 1200);
        }
    };

    const handlePushSingle = async (item: any) => {
        try {
            const pathParts = item.path.split('/');
            if (pathParts.length >= 2) {
                const docRef = doc(db, pathParts[0], pathParts[1]);
                if (item.type === 'set') await setDoc(docRef, item.data);
                else if (item.type === 'update') await updateDoc(docRef, item.data);
                else if (item.type === 'delete') await deleteDoc(docRef);
            }
            updateSyncLogEntry(item.id, { status: 'cloud_synced' });
            deleteSyncLogEntries([item.id]);
            toast.success(isKa ? "ჩანაწერი გაიგზავნა Cloud-ზე" : "Entry synchronized to Cloud");
            if (inspectingItem?.id === item.id) setInspectingItem(null);
        } catch (err: any) {
            console.error(err);
            toast.error(isKa ? "გაგზავნა ვერ მოხერხდა" : "Failed to push entry");
        }
    };

    const handleDeleteSingle = (id: string) => {
        deleteSyncLogEntries([id]);
        toast.info(isKa ? "ჩანაწერი წაიშალა რიგიდან" : "Entry removed from queue");
        if (inspectingItem?.id === id) setInspectingItem(null);
    };

    const handleInspectDiff = async (item: any) => {
        setInspectingItem(item);
        setIsLoadingInspect(true);
        setCloudInspectDoc(null);

        try {
            const pathParts = item.path.split('/');
            if (pathParts.length >= 2) {
                const docRef = doc(db, pathParts[0], pathParts[1]);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setCloudInspectDoc(snap.data());
                } else {
                    setCloudInspectDoc({ _status: isKa ? 'ჩანაწერი არ არსებობს Cloud-ზე (ახალი დოკუმენტი)' : 'Does not exist on Cloud (New Draft)' });
                }
            }
        } catch (err: any) {
            console.error("Inspect query error:", err);
            setCloudInspectDoc({ _error: err.message });
        } finally {
            setIsLoadingInspect(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: 'spring', duration: 0.4 }}
                    className="bg-white rounded-[32px] shadow-2xl p-6 md:p-8 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-indigo-200"
                >
                    {/* Header Alert banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 mb-4 relative shrink-0">
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
                            title={isKa ? "დახურვა" : "Close"}
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <div className="flex items-center gap-4 pr-8">
                            <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/20">
                                <AlertTriangle className="h-6 w-6 animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                    {isKa ? "🔄 სინქრონიზაციის უსაფრთხოების აუდიტი & ვერსიები" : "🔄 Multi-Module Sync Safety Auditor"}
                                </h2>
                                <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest mt-0.5">
                                    {isKa 
                                        ? `${syncQueue.length} ლოკალური ცვლილება მომლოდინეა გასინქრონებისთვის` 
                                        : `${syncQueue.length} durable offline modifications queued on this device.`}
                                </p>
                            </div>
                        </div>

                        {/* OS Native Persistence status */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider self-start sm:self-auto">
                            <Lock className="h-3 w-3 text-indigo-600" />
                            {isStorageGuarded ? (
                                <span>{isKa ? "დაცული მეხსიერება: აქტიური" : "OS Persistence: Active"}</span>
                            ) : (
                                <span>{isKa ? "OS მეხსიერება: დაცულია" : "Persistence Guard: Enabled"}</span>
                            )}
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 pr-1 space-y-5">
                        
                        {/* Interactive Clickable Module Cards */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {isKa ? "აირჩიეთ მოდული დეტალების სანახავად და გასაფილტრად:" : "CLICK MODULE CARD TO INSPECT QUEUE & RUN DIFF:"}
                                </span>
                                {selectedModuleFilter !== 'all' && (
                                    <button 
                                        onClick={() => setSelectedModuleFilter('all')}
                                        className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800"
                                    >
                                        {isKa ? "ყველას ჩვენება (Reset)" : "Show All Modules"}
                                    </button>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                {/* Harvest card */}
                                <button 
                                    onClick={() => setSelectedModuleFilter(prev => prev === 'harvest' ? 'all' : 'harvest')}
                                    className={`text-left rounded-2xl p-3.5 flex flex-col justify-between transition-all border cursor-pointer ${
                                        selectedModuleFilter === 'harvest'
                                            ? 'bg-indigo-50 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                                            : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 hover:border-indigo-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1 text-slate-400">
                                        <TrendingUp className="h-4 w-4 text-[#5d5aeb]" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#5d5aeb]">Harvest</span>
                                    </div>
                                    <span className="text-2xl font-black text-slate-900">{moduleCounts.harvest}</span>
                                    <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{isKa ? "აწონვები & ყუთები" : "Weighs & Crates"}</span>
                                </button>

                                {/* Stock card */}
                                <button 
                                    onClick={() => setSelectedModuleFilter(prev => prev === 'inventory' ? 'all' : 'inventory')}
                                    className={`text-left rounded-2xl p-3.5 flex flex-col justify-between transition-all border cursor-pointer ${
                                        selectedModuleFilter === 'inventory'
                                            ? 'bg-amber-50 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                                            : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 hover:border-amber-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1 text-slate-400">
                                        <Boxes className="h-4 w-4 text-amber-600" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Stock</span>
                                    </div>
                                    <span className="text-2xl font-black text-slate-900">{moduleCounts.inventory}</span>
                                    <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{isKa ? "აგრო-ხარჯი & მარაგი" : "Agro-Inputs & Stock"}</span>
                                </button>

                                {/* Maps card */}
                                <button 
                                    onClick={() => setSelectedModuleFilter(prev => prev === 'maps' ? 'all' : 'maps')}
                                    className={`text-left rounded-2xl p-3.5 flex flex-col justify-between transition-all border cursor-pointer ${
                                        selectedModuleFilter === 'maps'
                                            ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                                            : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 hover:border-emerald-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1 text-slate-400">
                                        <MapPin className="h-4 w-4 text-emerald-600" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Maps</span>
                                    </div>
                                    <span className="text-2xl font-black text-slate-900">{moduleCounts.maps}</span>
                                    <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{isKa ? "რუკის ნახაზები" : "Drawn Plots"}</span>
                                </button>

                                {/* Finance card */}
                                <button 
                                    onClick={() => setSelectedModuleFilter(prev => prev === 'finance' ? 'all' : 'finance')}
                                    className={`text-left rounded-2xl p-3.5 flex flex-col justify-between transition-all border cursor-pointer ${
                                        selectedModuleFilter === 'finance'
                                            ? 'bg-sky-50 border-sky-500 shadow-md ring-2 ring-sky-500/20'
                                            : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 hover:border-sky-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1 text-slate-400">
                                        <FileText className="h-4 w-4 text-sky-600" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-sky-600">Finances</span>
                                    </div>
                                    <span className="text-2xl font-black text-slate-900">{moduleCounts.finance}</span>
                                    <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{isKa ? "ფინანსური ლოგი" : "Opex Ledger"}</span>
                                </button>

                                {/* Directory card */}
                                <button 
                                    onClick={() => setSelectedModuleFilter(prev => prev === 'directory' ? 'all' : 'directory')}
                                    className={`text-left rounded-2xl p-3.5 flex flex-col justify-between transition-all border cursor-pointer ${
                                        selectedModuleFilter === 'directory'
                                            ? 'bg-purple-50 border-purple-500 shadow-md ring-2 ring-purple-500/20'
                                            : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 hover:border-purple-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1 text-slate-400">
                                        <Users className="h-4 w-4 text-purple-600" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">Staff</span>
                                    </div>
                                    <span className="text-2xl font-black text-slate-900">{moduleCounts.directory}</span>
                                    <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{isKa ? "მუშები & როლები" : "Workers & Roles"}</span>
                                </button>
                            </div>
                        </div>

                        {/* Interactive Drill-Down Queue Inspector */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-indigo-600" />
                                    {isKa ? `საოპერაციო რიგის დეტალური რეესტრი (${filteredQueue.length})` : `Interactive Queue Inspector (${filteredQueue.length})`}
                                </h4>
                                <span className="text-[10px] font-bold text-slate-500">
                                    {selectedModuleFilter.toUpperCase()} FILTER
                                </span>
                            </div>

                            <div className="max-h-56 overflow-y-auto divide-y divide-slate-200/80">
                                {filteredQueue.map(item => {
                                    const narr = describeFlightRecord(item, isKa);
                                    return (
                                        <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-white/80 px-2 rounded-xl transition-all">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${narr.badgeColor}`}>
                                                    {narr.badge}
                                                </span>
                                                <div className="truncate">
                                                    <p className="text-xs font-black text-slate-900 truncate">{narr.headline}</p>
                                                    <p className="text-[10px] text-slate-500 truncate">{narr.story}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button 
                                                    onClick={() => handleInspectDiff(item)}
                                                    className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm"
                                                    title="Compare Local vs Cloud Snapshot"
                                                >
                                                    <GitCompare size={11} />
                                                    {isKa ? "Diff" : "Diff"}
                                                </button>
                                                <button 
                                                    onClick={() => handlePushSingle(item)}
                                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm"
                                                    title="Push Single Delta"
                                                >
                                                    <CloudUpload size={11} />
                                                    {isKa ? "Sync" : "Sync"}
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteSingle(item.id)}
                                                    className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all"
                                                    title="Discard"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {filteredQueue.length === 0 && (
                                    <p className="py-8 text-center text-xs text-slate-400 font-bold uppercase">
                                        {isKa ? "ამ მოდულში მომლოდინე ჩანაწერები არ არის." : "No pending items in this module filter."}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Event weight comparison (if harvest items present) */}
                        {Object.keys(summaryCol.eventPendingMap).length > 0 && (
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <TableProperties className="h-4 w-4 text-indigo-600" />
                                    {isKa ? "კრეფის სესიების შედარებითი ანალიზი" : "Projected Session Weight Recalculation"}
                                </h4>

                                {isLoadingCloud ? (
                                    <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-400 font-bold">
                                        <RefreshCcw className="h-4 w-4 animate-spin text-indigo-600" />
                                        {isKa ? "მიმდინარეობს Cloud მონაცემების გამოკითხვა..." : "Querying Cloud database metrics..."}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-black text-[9px]">
                                                    <th className="py-2">{isKa ? "კრეფის ღონისძიება" : "Harvest Session"}</th>
                                                    <th className="py-2 text-center">{isKa ? "არსებული Cloud წონა" : "Current Cloud Weight"}</th>
                                                    <th className="py-2 text-center text-amber-600">{isKa ? "+ ლოკალური სხვაობა" : "+ Local Pending"}</th>
                                                    <th className="py-2 text-center text-indigo-600 font-black">{isKa ? "სულ გაერთიანებული" : "Projected Total"}</th>
                                                    <th className="py-2 text-right">{isKa ? "უსაფრთხოება" : "Sync Architecture"}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(summaryCol.eventPendingMap).map(([evId, local]) => {
                                                    const cloudObj = cloudTotalsMap[evId] || { weight: 0, name: isKa ? `კრეფა #${evId.slice(-4)}` : `Harvest #${evId.slice(-4)}` };
                                                    const cloudW = cloudObj.weight;
                                                    const localW述 = local.weight;
                                                    const projectedW = cloudW + localW述;

                                                    return (
                                                        <tr key={evId} className="border-b border-slate-100 hover:bg-slate-100/50">
                                                            <td className="py-2.5 font-extrabold text-slate-900">{cloudObj.name}</td>
                                                            <td className="py-2.5 text-center text-slate-500 font-bold">{cloudW.toFixed(2)} KG</td>
                                                            <td className="py-2.5 text-center text-amber-600 font-extrabold">+{localW述.toFixed(2)} KG</td>
                                                            <td className="py-2.5 text-center text-indigo-600 font-black bg-indigo-50/50">{projectedW.toFixed(2)} KG</td>
                                                            <td className="py-2.5 text-right font-bold text-[10px] text-emerald-600 uppercase">
                                                                <span>🔋 Atomic Add</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Explain collision resolution mechanism */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                                    {isKa ? "კრეფის და მარაგების დაცვა" : "Weight & Inventory Protection"}
                                </h4>
                                <p className="text-[11px] text-indigo-900 leading-relaxed font-semibold">
                                    {isKa 
                                        ? "ყუთებს აქვთ უნიკალური ID. მარაგების ხარჯი კი ანგარიშდება გარდამავალი (delta) სხვაობით. ასე თავიდან ვიცილებთ მონაცემთა გადაწერას." 
                                        : "Scales are logged as unique documents, and stock balances are stored as atomic deltas in server streams. Multiple tablet submissions join correctly as additive values."}
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                    <Sparkles className="h-4 w-4 text-emerald-600" />
                                    {isKa ? "რუკის ნახაზების შერწყმა" : "Continuous Map Syncing"}
                                </h4>
                                <p className="text-[11px] text-emerald-900 leading-relaxed font-semibold">
                                    {isKa 
                                        ? "რუკაზე გაკეთებული ნახაზები და სამუშაოები გაერთიანდება ისე, რომ სხვადასხვა მუშის მიერ გაყვანილი არხები ერთმანეთს არ წაშლის." 
                                        : "Trenches drawn on different tablets union smoothly with other field surveyors' updates."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100 shrink-0 mt-2">
                        <button
                            onClick={handleDiscardLocal}
                            disabled={isProcessing}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                            <Trash2 className="h-4 w-4" />
                            {isKa ? "ლოკალური გაუქმება და გადმოწერა" : "Discard Local Drafts"}
                        </button>

                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <button
                                onClick={onOpenDetailedAuditor}
                                disabled={isProcessing}
                                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-black text-xs uppercase tracking-wider transition-all text-center cursor-pointer"
                            >
                                {isKa ? "დეტალური Flight Recorder" : "System Flight Recorder"}
                            </button>
                            <button
                                onClick={handleConfirmMerge}
                                disabled={isProcessing}
                                className="bg-indigo-600 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-indigo-500 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-indigo-600/30"
                            >
                                <CloudUpload className="h-4 w-4" />
                                {isKa ? "უსაფრთხო შერწყმა & გასინქრონება" : "Secure Merge & Sync"}
                            </button>
                        </div>
                    </div>

                    {/* Diff Inspector Modal */}
                    {inspectingItem && (
                        <div className="fixed inset-0 bg-slate-950/85 z-[1000] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setInspectingItem(null)}>
                            <div className="bg-white rounded-[28px] p-6 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-indigo-100" onClick={e => e.stopPropagation()}>
                                <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                            <GitCompare size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-slate-900">
                                                {isKa ? "ვერსიების შედარება (3-Way Diff)" : "Version Diff: Local vs Cloud"}
                                            </h3>
                                            <p className="text-[11px] font-mono text-slate-400">Path: {inspectingItem.path}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setInspectingItem(null)} className="p-1 text-slate-400 hover:text-slate-700">
                                        ✕
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto p-1 text-xs">
                                    {/* Local Tablet Record */}
                                    <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-200/80 flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-indigo-700 mb-2 flex items-center gap-1">
                                            <Tablet size={12} /> {isKa ? "ტაბლეტის ლოკალური ჩანაწერი" : "Local Tablet Snapshot"}
                                        </span>
                                        <pre className="font-mono text-[11px] text-indigo-950 flex-1 overflow-x-auto whitespace-pre-wrap">
                                            {JSON.stringify(inspectingItem.data, null, 2)}
                                        </pre>
                                    </div>

                                    {/* Cloud Record */}
                                    <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200/80 flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-emerald-700 mb-2 flex items-center gap-1">
                                            <Globe size={12} /> {isKa ? "Cloud სერვერის მიმდინარე მონაცემი" : "Cloud Server Snapshot"}
                                        </span>
                                        {isLoadingInspect ? (
                                            <p className="text-slate-400 italic py-8 text-center">{isKa ? "იტვირთება..." : "Loading..."}</p>
                                        ) : (
                                            <pre className="font-mono text-[11px] text-emerald-950 flex-1 overflow-x-auto whitespace-pre-wrap">
                                                {JSON.stringify(cloudInspectDoc, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex justify-between items-center mt-3">
                                    <button 
                                        onClick={() => handleDeleteSingle(inspectingItem.id)}
                                        className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-black uppercase tracking-wider"
                                    >
                                        {isKa ? "ლოკალურის წაშლა" : "Discard"}
                                    </button>

                                    <button 
                                        onClick={() => handlePushSingle(inspectingItem)}
                                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5"
                                    >
                                        <CloudUpload size={13} />
                                        {isKa ? "ამ ჩანაწერის გასინქრონება" : "Merge & Push to Cloud"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
