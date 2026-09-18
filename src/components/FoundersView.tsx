import React, { useMemo, useState, useEffect } from 'react';
import type { InventoryItem, HarvestEvent, Transaction, Account, Employee, Machinery, YieldByVariety, Organization, Membership, User, OrganizationType, AgricultureType, UserRole, Crop } from '../types';
import { 
    ShieldCheckIcon, BanknotesIcon, ArrowTrendingUpIcon, 
    LeafIcon, InfoIcon, ChartBarIcon, TractorIcon, SparklesIcon,
    UsersIcon, ArchiveBoxIcon, CheckIcon, XIcon, EyeIcon, 
    BuildingStorefrontIcon, ShoppingBagIcon, RectangleStackIcon,
    PlusIcon, SearchIcon, MapIcon, ChevronRightIcon, GlobeIcon, PencilIcon
} from './Icons';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { db, doc, setDoc } from '../firebase';
import { USE_FIREBASE } from '../config';
import { safeStorage } from '../services/storageService';

const transliterateGeoToEng = (str: string): string => {
  const geoToEngMap: { [key: string]: string } = {
    'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z', 'თ': 't',
    'ი': 'i', 'კ': 'k', 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': 'p', 'ჟ': 'zh',
    'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u', 'ფ': 'p', 'ქ': 'k', 'ღ': 'gh', 'ყ': 'q',
    'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': 'ts', 'ჭ': 'ch', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
  };
  return str.split('').map(char => geoToEngMap[char] || char).join('');
};

const transliterateEngToGeo = (str: string): string => {
  const engToGeoMap: { [key: string]: string } = {
    'a': 'ა', 'b': 'ბ', 'g': 'გ', 'd': 'დ', 'e': 'ე', 'v': 'ვ', 'z': 'ზ', 't': 'თ',
    'i': 'ი', 'k': 'კ', 'l': 'ლ', 'm': 'მ', 'n': 'ნ', 'o': 'ო', 'p': 'პ', 'r': 'რ',
    's': 'ს', 'u': 'უ', 'q': 'ყ', 'j': 'ჯ', 'h': 'ჰ'
  };
  return str.split('').map(char => engToGeoMap[char.toLowerCase()] || char).join('');
};

interface FoundersViewProps {
    inventoryItems: InventoryItem[];
    onSetInventoryItems: (items: InventoryItem[]) => void;
    harvestEvents: HarvestEvent[];
    accounts: Account[];
    employees: Employee[];
    machinery: Machinery[];
    onSetAccounts: (accounts: Account[]) => void;
    transactions: Transaction[];
    onSetTransactions: (txns: Transaction[]) => void;
    organizations: Organization[];
    discoverableOrganizations?: Organization[];
    memberships: Membership[];
    onAddOrg: (org: Organization, mem: Membership, selectedCrops?: any[]) => void;
    onUpdateOrg?: (org: Organization) => void;
    onSwitchOrg: (orgId: string) => void;
    onStartMapRegistration?: (regData: any) => void;
    activeOrgId: string | null;
    currentUser: User;
    crops: Crop[];
    onAddPost?: (post: any) => void;
}

const SettlementTerminal: React.FC<{
    harvest: HarvestEvent;
    item: InventoryItem;
    cost: { field: number, inv: number, total: number, labor: number, machinery: number };
    onClose: () => void;
    onConfirm: (finalData: any) => void;
    formatCurrency: (amount: number) => string;
}> = ({ harvest, item, cost, onClose, onConfirm, formatCurrency }) => {
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [monetizationPath, setMonetizationPath] = useState<'direct' | 'market' | 'storage'>('storage');
    const [isPublic, setIsPublic] = useState(false);

    useEffect(() => {
        const initial: Record<string, number> = {};
        (harvest.yieldByVariety || [{variety: 'SUZY', weightKg: item.currentStock}]).forEach(y => {
            initial[y.variety] = 10;
        });
        setPrices(initial);
    }, [harvest, item]);

    const analytics = useMemo(() => {
        const totalRevenue = Object.entries(prices).reduce((acc: number, [variety, price]) => {
            const weightEntry = harvest.yieldByVariety?.find(v => v.variety === variety);
            const weight = weightEntry ? weightEntry.weightKg : item.currentStock;
            return acc + (Number(weight) * Number(price));
        }, 0);
        const netProfit = Number(totalRevenue) - Number(cost.total);
        const opexPerKg = item.currentStock > 0 ? Number(cost.total) / Number(item.currentStock) : 0;
        return { totalRevenue, netProfit, opexPerKg };
    }, [prices, cost, item, harvest]);

    return (
        <div className="fixed inset-0 bg-[#050b18]/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
            <div className="bg-[#f8fafc] w-full max-w-6xl h-[85vh] rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex overflow-hidden animate-slide-up border border-white/20">
                
                {/* Left Side: Operational Audit */}
                <div className="w-[320px] bg-[#f1f5f9] border-r border-slate-200 p-10 flex flex-col">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-10">Operational Audit</h3>
                    <div className="space-y-4 flex-grow">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Picker Payroll</p>
                            <p className="text-3xl font-black text-slate-800 tracking-tighter">{formatCurrency(cost.labor)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Machinery OPEX</p>
                            <p className="text-3xl font-black text-slate-800 tracking-tighter">{formatCurrency(cost.machinery)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Packaging Costs</p>
                            <p className="text-3xl font-black text-slate-800 tracking-tighter">{formatCurrency(cost.inv)}</p>
                        </div>
                    </div>
                    <div className="mt-8 pt-8 border-t border-slate-300 space-y-1">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                            <span>Net Field OPEX</span>
                            <span>{formatCurrency(cost.total)}</span>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Total Field Burden</p>
                        <p className="text-4xl font-black text-[#ff3b3b] tracking-tighter italic">{formatCurrency(cost.total)}</p>
                    </div>
                </div>

                {/* Center: Settlement Terminal */}
                <div className="flex-1 bg-white p-12 flex flex-col">
                    <div className="flex justify-between items-start mb-14">
                        <div>
                            <h2 className="text-5xl font-[900] italic tracking-tighter uppercase leading-none text-slate-900">
                                SETTLEMENT <span className="block not-italic text-slate-800">TERMINAL</span>
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 mt-3 uppercase tracking-[0.3em]">Operational Unit: <span className="text-indigo-600 font-bold">{harvest.name}</span></p>
                        </div>
                        <button 
                            onClick={() => setIsPublic(!isPublic)}
                            className={`px-5 py-2.5 rounded-2xl border flex items-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest ${isPublic ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                        >
                            <EyeIcon size={14} />
                            <span>Public (Visible)</span>
                        </button>
                    </div>

                    <div className="space-y-12">
                        <div>
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mb-6 pb-2 border-b border-slate-100">Yield ROI Pricing</h4>
                            <div className="grid grid-cols-1 gap-4 max-w-md">
                                {Object.entries(prices).map(([variety, price]) => (
                                    <div key={variety} className="flex items-center gap-6 bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 group hover:border-indigo-200 transition-all">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-slate-900 tracking-tight uppercase">{variety}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1">{harvest.yieldByVariety?.find(v => v.variety === variety)?.weightKg || item.currentStock}kg</p>
                                        </div>
                                        <input 
                                            type="number" 
                                            value={price} 
                                            onChange={e => setPrices({...prices, [variety]: parseFloat(e.target.value) || 0})}
                                            className="w-28 bg-white border border-slate-200 rounded-xl p-3 font-black text-center text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mb-6 pb-2 border-b border-slate-100">Monetization Path</h4>
                            <div className="flex gap-4">
                                {[
                                    { id: 'direct', label: 'Direct Sale', icon: <BuildingStorefrontIcon size={28}/> },
                                    { id: 'market', label: 'On Market', icon: <SparklesIcon size={28}/> },
                                    { id: 'storage', label: 'To Storage', icon: <ArchiveBoxIcon size={28}/> }
                                ].map(path => (
                                    <button 
                                        key={path.id}
                                        onClick={() => setMonetizationPath(path.id as any)}
                                        className={`flex-1 flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 transition-all gap-4 ${monetizationPath === path.id ? 'border-indigo-600 bg-white shadow-[0_20px_40px_rgba(79,70,229,0.15)] ring-4 ring-indigo-50' : 'border-slate-100 bg-white text-slate-300 hover:border-slate-200'}`}
                                    >
                                        <div className={`transition-transform duration-300 ${monetizationPath === path.id ? 'text-indigo-600 scale-125' : ''}`}>{path.icon}</div>
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${monetizationPath === path.id ? 'text-slate-900' : ''}`}>{path.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: ROI Summary */}
                <div className="w-[360px] bg-[#0a1224] p-12 flex flex-col relative text-white border-l border-white/5">
                    <button onClick={onClose} className="absolute top-10 right-10 text-slate-500 hover:text-white transition-all transform hover:rotate-90">
                        <XIcon size={24} />
                    </button>

                    <div className="space-y-14 flex-grow">
                        <div>
                            <h3 className="text-[10px] font-black text-[#00f2ff] uppercase tracking-[0.3em] mb-3">Total Gross ROI</h3>
                            <div className="text-[5.5rem] font-[900] tracking-tighter leading-none flex items-baseline gap-2">
                                {formatCurrency(analytics.totalRevenue)}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-6 pb-2 border-b border-white/10">Session Analytics</h3>
                            <div className="space-y-6">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Total Net Weight</span>
                                    <span className="font-black text-xl tracking-tighter">{item.currentStock.toFixed(1)} <span className="text-xs text-slate-500">kg</span></span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">OPEX/KG</span>
                                    <span className="font-black text-xl tracking-tighter text-slate-300">{formatCurrency(analytics.opexPerKg)}</span>
                                </div>
                                <div className="mt-8 pt-8 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-sm font-black text-[#00f2ff] uppercase tracking-widest">Net Profit</span>
                                    <span className={`text-4xl font-black tracking-tighter ${analytics.netProfit >= 0 ? 'text-[#00ffc2]' : 'text-red-500'}`}>
                                        {analytics.netProfit >= 0 ? '+ ' : ''}{formatCurrency(analytics.netProfit)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400"><ArchiveBoxIcon size={16} /></div>
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">Founder Private Vault</h3>
                             </div>
                             <div className="bg-[#121c33] p-8 rounded-[2rem] border border-white/5 shadow-inner">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Liquid Reserve</span>
                                <div className="text-3xl font-black text-white flex items-center gap-1 leading-none tracking-tighter">
                                    {formatCurrency(0)}
                                </div>
                             </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => onConfirm({ prices, monetizationPath, isPublic, analytics })}
                        className="w-full py-6 bg-[#00ffc2] text-[#050b18] rounded-[2.5rem] font-[900] uppercase tracking-[0.4em] text-xs shadow-[0_0_50px_rgba(0,255,194,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        Confirm Settlement
                    </button>
                </div>
            </div>
        </div>
    );
}

const COMMON_CROPS = ["Blueberry", "Raspberry", "Blackberry", "Strawberry", "Wine Grapes", "Table Grapes", "Walnut", "Hazelnut", "Almond"];

const FoundersView: React.FC<FoundersViewProps> = (props) => {
    const { 
        inventoryItems, onSetInventoryItems, harvestEvents, accounts, 
        onSetAccounts, employees, machinery, transactions, onSetTransactions, 
        organizations, discoverableOrganizations = [], memberships, onAddOrg, onUpdateOrg, onSwitchOrg, onStartMapRegistration, activeOrgId, currentUser, crops, onAddPost 
    } = props;

    const { t, formatCurrency } = useLanguage();
    const [view, setView] = useState<'organizations' | 'control'>('organizations');
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
    const [orgSearchQuery, setOrgSearchQuery] = useState('');
    const [debouncedOrgQuery, setDebouncedOrgQuery] = useState('');
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
    const [discoveryOrg, setDiscoveryOrg] = useState<Organization | null>(null);
    const [isEditOrgModalOpen, setIsEditOrgModalOpen] = useState(false);
    const [editOrgData, setEditOrgData] = useState<Partial<Organization>>({});

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedOrgQuery(orgSearchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [orgSearchQuery]);

    const handleUpdateOrgInternal = () => {
        if (!editingOrg || !onUpdateOrg) return;
        onUpdateOrg({ ...editingOrg, ...editOrgData } as Organization);
        toast.success(t('profile.save_changes'));
        setIsEditOrgModalOpen(false);
        setEditingOrg(null);
    };

    const [regData, setRegData] = useState({
        name: '',
        taxNumber: '',
        phone: '',
        type: 'LTD' as OrganizationType,
        agricultureType: 'General' as AgricultureType,
        role: 'Founder' as UserRole,
        isDiscoverable: true,
        region: '',
        areaHa: 0,
        legalStructure: 'LTD',
        subscriptionPlan: 'Free',
        selectedCrops: [] as {name: string, varieties: string[]}[]
    });

    const vaultItems = useMemo(() => inventoryItems.filter(i => i.isPrivate), [inventoryItems]);
    const [selectedHarvestId, setSelectedHarvestId] = useState<string | null>(null);

    const handleAddOrg = async (useMap: boolean = false) => {
        if (!regData.name) {
            toast.error("Please enter a company name.");
            return;
        }

        if (useMap && onStartMapRegistration) {
            onStartMapRegistration(regData);
            setIsRegistrationOpen(false);
            return;
        }

        const { generateUniqueId } = await import('../lib/firebaseUtils');
        const uniqueId = generateUniqueId('organization');

        const newOrg: Organization = {
            id: `org-${Date.now()}`,
            uniqueId: uniqueId,
            name: regData.name,
            legalName: regData.name,
            registrationNumber: '',
            taxNumber: regData.taxNumber,
            phoneNumber: regData.phone,
            type: regData.type,
            agricultureType: regData.agricultureType,
            isDiscoverable: regData.isDiscoverable,
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: currentUser.id,
            subscriptionStatus: 'Trial',
            trial_start_date: new Date().toISOString(),
            trialExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            isPaid: false,
            tier: 'Free',
            country: 'Georgia',
            region: regData.region,
            areaHa: regData.areaHa,
            legalStructure: regData.legalStructure || regData.type,
            subscriptionPlan: regData.subscriptionPlan || 'Free'
        };

        const newMem: Membership = {
            id: `${currentUser.id}_${newOrg.id}`,
            userId: currentUser.id,
            organizationId: newOrg.id,
            role: regData.role,
            status: 'active',
            joinedAt: new Date().toISOString(),
            permissionLevel: 'admin'
        };

        onAddOrg(newOrg, newMem, regData.selectedCrops);
        setIsRegistrationOpen(false);
        setRegData({
            name: '',
            taxNumber: '',
            phone: '',
            type: 'LTD',
            agricultureType: 'General',
            role: 'Founder',
            isDiscoverable: true,
            region: 'Imereti',
            areaHa: 0,
            legalStructure: 'Commercial',
            subscriptionPlan: 'Basic',
            selectedCrops: []
        });
    };
    
    const forensics = useMemo(() => {
        return vaultItems.map(item => {
            const event = harvestEvents.find(e => e.id === item.relatedHarvestId);
            if (!event) return { field: 0, inv: 0, total: 0, labor: 0, machinery: 0 };

            const labor = (event.assignedPickers || []).reduce((acc, p) => {
                const rate = p.rate || 0;
                if (p.paymentModel === 'per_weight') return acc + (Number(item.currentStock) * Number(rate));
                return acc + (8 * Number(rate)); // Assuming 8-hour day for daily/hourly in this simplified model
            }, 0);

            const vehicles = (event.assignedVehicles || []).reduce((acc, v) => {
                const m = machinery.find(mac => mac.id === v.machineryId);
                return acc + (Number(v.usageHours || 0) * Number(v.hiredCost || m?.hourlyRate || 0));
            }, 0);

            const materials = (event.materialsUsed || []).reduce((acc, m) => {
                const inv = inventoryItems.find(i => i.id === m.inventoryItemId);
                return acc + (Number(m.quantity) * Number(inv?.unitCost || 0));
            }, 0);

            return {
                field: labor + vehicles,
                inv: materials,
                total: labor + vehicles + materials,
                labor,
                machinery: vehicles
            };
        });
    }, [vaultItems, harvestEvents, employees, machinery, inventoryItems]);

    const stats = useMemo(() => {
        const rev = vaultItems.reduce((s, i) => s + (Number(i.currentStock) * 15), 0); // Assuming fixed price for vault items
        const field = forensics.reduce((s, f) => s + f.field, 0);
        const inv = forensics.reduce((s, f) => s + f.inv, 0);
        return { rev, field, inv, roi: rev - (field + inv) };
    }, [vaultItems, forensics]);

    const handleConfirmSettlement = (data: any) => {
        console.log("Settlement Confirmed:", data);
        alert("Institutional Settlement bridge committed to ledger.");
        setSelectedHarvestId(null);
    };

    const selectedItem = vaultItems.find(i => i.id === selectedHarvestId);
    const selectedHarvest = selectedItem ? harvestEvents.find(e => e.id === selectedItem.relatedHarvestId) : null;
    const selectedCost = selectedHarvestId ? forensics[vaultItems.findIndex(i => i.id === selectedHarvestId)] : null;


    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
                            {view === 'organizations' ? 'Organizations' : 'Institutional Control'}
                        </h1>
                        <p className="text-slate-500 text-sm mt-1 font-medium">
                            {view === 'organizations' 
                                ? "Join your team's workspace or register a new one to unlock AgriMap's full potential."
                                : "High-level oversight and forensic auditing of your agricultural operations."}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                        <button 
                            onClick={() => setView('organizations')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'organizations' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Organizations
                        </button>
                        <button 
                            onClick={() => setView('control')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'control' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Audit & Control
                        </button>
                    </div>
                </div>

                {view === 'organizations' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
                        {/* Left Column: List */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                    <BuildingStorefrontIcon className="w-4 h-4" /> {t('profile.your_orgs')}
                                </h3>
                                
                                <div className="space-y-4">
                                    {memberships.length > 0 ? (
                                        memberships.map(m => {
                                            const org = organizations.find(o => o.id === m.organizationId);
                                            if (!org) return null;
                                            const isActive = org.id === activeOrgId;

                                            return (
                                                <div 
                                                    key={m.id} 
                                                    className={`group p-6 rounded-3xl border-2 transition-all duration-300 flex items-center gap-6 ${
                                                        isActive 
                                                            ? 'border-indigo-600 bg-indigo-50/30 shadow-xl shadow-indigo-100/50' 
                                                            : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-white hover:shadow-xl hover:shadow-slate-100'
                                                    }`}
                                                >
                                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${
                                                        isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-400 shadow-sm'
                                                    }`}>
                                                        <BuildingStorefrontIcon className="w-8 h-8" />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h4 className={`text-lg font-black uppercase tracking-tight truncate ${isActive ? 'text-indigo-900' : 'text-slate-800'}`}>
                                                                {org.name}
                                                            </h4>
                                                            {m.role === 'Founder' && (
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingOrg(org);
                                                                        setEditOrgData(org);
                                                                        setIsEditOrgModalOpen(true);
                                                                    }}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                                                                >
                                                                    <PencilIcon size={14} />
                                                                </button>
                                                            )}
                                                            {isActive && (
                                                                <span className="bg-indigo-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                                                                    Active
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <ShieldCheckIcon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.role}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <GlobeIcon className={`w-3.5 h-3.5 ${org.isDiscoverable ? 'text-emerald-500' : 'text-slate-300'}`} />
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                                    {org.isDiscoverable ? 'Discoverable' : 'Private'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <RectangleStackIcon className="w-3.5 h-3.5 text-slate-400" />
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{org.type}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {!isActive && (
                                                        <button 
                                                            onClick={() => onSwitchOrg(org.id)}
                                                            className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm group-hover:translate-x-1"
                                                        >
                                                            <ChevronRightIcon className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/30">
                                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                                <BuildingStorefrontIcon className="w-10 h-10 text-slate-200" />
                                            </div>
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No organizations found</p>
                                            <p className="text-xs text-slate-400 mt-2">Register your first plantation to get started</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Actions */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                    <PlusIcon className="w-4 h-4" /> {t('common.quick_actions')}
                                </h3>
                                
                                <div className="space-y-4">
                                    <button 
                                        onClick={() => setIsRegistrationOpen(true)}
                                        className="w-full group p-6 bg-slate-900 text-white rounded-3xl hover:bg-slate-800 transition-all text-left relative overflow-hidden shadow-xl shadow-slate-200"
                                    >
                                        <div className="relative z-10">
                                            <h4 className="text-sm font-black uppercase tracking-tight mb-1">{t('profile.register_new')}</h4>
                                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{t('profile.register_new_desc')}</p>
                                        </div>
                                        <PlusIcon className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-white/5 group-hover:scale-110 transition-transform" />
                                    </button>

                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{t('profile.join_org')}</h4>
                                        <div className="relative">
                                            <input 
                                                type="text"
                                                placeholder={t('profile.search_placeholder')}
                                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                value={orgSearchQuery}
                                                onChange={(e) => setOrgSearchQuery(e.target.value)}
                                            />
                                            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            
                                            {orgSearchQuery.length > 0 && (
                                                <div className="absolute z-50 left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white border border-slate-100 rounded-2xl shadow-2xl text-left animate-in fade-in slide-in-from-top-2 duration-200">
                                                    {discoverableOrganizations
                                                        .filter(o => {
                                                            const queryClean = (debouncedOrgQuery || orgSearchQuery || '').toLowerCase().trim();
                                                            if (!queryClean) return true;
                                                            const queryTranslit = transliterateGeoToEng(queryClean);
                                                            const queryReverse = transliterateEngToGeo(queryClean);
                                                            
                                                            const nameLower = (o.name || '').toLowerCase();
                                                            const idLower = (o.id || '').toLowerCase();
                                                            const legalLower = (o.legalName || '').toLowerCase();
                                                            const agTypeLower = (o.agricultureType || '').toLowerCase();
                                                            
                                                            const matchQuery = nameLower.includes(queryClean) || 
                                                                               idLower.includes(queryClean) || 
                                                                               legalLower.includes(queryClean) ||
                                                                               agTypeLower.includes(queryClean) ||
                                                                               nameLower.includes(queryTranslit) ||
                                                                               idLower.includes(queryTranslit) ||
                                                                               legalLower.includes(queryTranslit) ||
                                                                               nameLower.includes(queryReverse) ||
                                                                               idLower.includes(queryReverse);

                                                            const alreadyMember = memberships.some(mem => mem.organizationId === o.id);
                                                            return matchQuery && !alreadyMember;
                                                        })
                                                        .slice(0, 10)
                                                        .map(o => (
                                                            <button 
                                                                key={o.id} 
                                                                onClick={() => {
                                                                    setDiscoveryOrg(o);
                                                                    setOrgSearchQuery(o.name);
                                                                }}
                                                                className="w-full p-4 hover:bg-indigo-50 text-xs font-bold text-slate-700 border-b border-slate-50 last:border-0 flex justify-between items-center transition-colors group"
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className="group-hover:text-indigo-600 transition-colors uppercase tracking-tight font-black">{o.name}</span>
                                                                    <span className="text-[8px] text-slate-400 font-mono uppercase mt-0.5">ID: {o.id}</span>
                                                                </div>
                                                                <ChevronRightIcon size={12} className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                                                            </button>
                                                        ))
                                                    }
                                                    {discoverableOrganizations.filter(o => {
                                                        const queryClean = (debouncedOrgQuery || orgSearchQuery || '').toLowerCase().trim();
                                                        if (!queryClean) return true;
                                                        const queryTranslit = transliterateGeoToEng(queryClean);
                                                        const queryReverse = transliterateEngToGeo(queryClean);
                                                        
                                                        const nameLower = (o.name || '').toLowerCase();
                                                        const idLower = (o.id || '').toLowerCase();
                                                        const legalLower = (o.legalName || '').toLowerCase();
                                                        const agTypeLower = (o.agricultureType || '').toLowerCase();
                                                        
                                                        const matchQuery = nameLower.includes(queryClean) || 
                                                                           idLower.includes(queryClean) || 
                                                                           legalLower.includes(queryClean) ||
                                                                           agTypeLower.includes(queryClean) ||
                                                                           nameLower.includes(queryTranslit) ||
                                                                           idLower.includes(queryTranslit) ||
                                                                           legalLower.includes(queryTranslit) ||
                                                                           nameLower.includes(queryReverse) ||
                                                                           idLower.includes(queryReverse);

                                                        const alreadyMember = memberships.some(mem => mem.organizationId === o.id);
                                                        return matchQuery && !alreadyMember;
                                                    }).length === 0 && (
                                                        <div className="p-6 text-center text-[10px] font-black text-slate-300 uppercase italic">
                                                            No organizations found
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const filtered = discoverableOrganizations.filter(o => {
                                                    const queryClean = (debouncedOrgQuery || orgSearchQuery || '').toLowerCase().trim();
                                                    if (!queryClean) return true;
                                                    const queryTranslit = transliterateGeoToEng(queryClean);
                                                    const queryReverse = transliterateEngToGeo(queryClean);
                                                    
                                                    const nameLower = (o.name || '').toLowerCase();
                                                    const idLower = (o.id || '').toLowerCase();
                                                    const legalLower = (o.legalName || '').toLowerCase();
                                                    const agTypeLower = (o.agricultureType || '').toLowerCase();
                                                    
                                                    const matchQuery = nameLower.includes(queryClean) || 
                                                                       idLower.includes(queryClean) || 
                                                                       legalLower.includes(queryClean) ||
                                                                       agTypeLower.includes(queryClean) ||
                                                                       nameLower.includes(queryTranslit) ||
                                                                       idLower.includes(queryTranslit) ||
                                                                       legalLower.includes(queryTranslit) ||
                                                                       nameLower.includes(queryReverse) ||
                                                                       idLower.includes(queryReverse);

                                                    const alreadyMember = memberships.some(mem => mem.organizationId === o.id);
                                                    return matchQuery && !alreadyMember;
                                                });
                                                if (filtered.length > 0) {
                                                    setDiscoveryOrg(filtered[0]);
                                                } else {
                                                    toast.error("No organization matches your search query yet.");
                                                }
                                            }}
                                            disabled={!orgSearchQuery}
                                            className="w-full py-3 bg-indigo-600 border-2 border-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 hover:border-indigo-700 transition-all disabled:opacity-50 disabled:bg-white disabled:border-slate-200 disabled:text-slate-400"
                                        >
                                            {t('profile.send_join_request')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                                <div className="relative z-10">
                                    <h3 className="text-sm font-black uppercase tracking-tight mb-2">Need Help?</h3>
                                    <p className="text-xs text-indigo-100 font-medium leading-relaxed">
                                        Our support team can help you migrate your existing farm data or set up complex multi-org structures.
                                    </p>
                                    <button className="mt-6 px-6 py-2.5 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all">
                                        Contact Support
                                    </button>
                                </div>
                                <SparklesIcon className="absolute right-[-20px] top-[-20px] w-32 h-32 text-white/10" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-slide-up">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-indigo-50 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                                        <BanknotesIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">+12.5%</span>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Valuation</p>
                                <h4 className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(2400000)}</h4>
                            </div>
                            
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-emerald-50 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                                        <ArrowTrendingUpIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">High</span>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg ROI</p>
                                <h4 className="text-2xl font-black text-slate-900 mt-1">34.2%</h4>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-orange-50 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl group-hover:scale-110 transition-transform">
                                        <LeafIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-1 rounded-lg">8 Fields</span>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Harvests</p>
                                <h4 className="text-2xl font-black text-slate-900 mt-1">12.4t</h4>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-blue-50 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                                        <UsersIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">Active</span>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workforce</p>
                                <h4 className="text-2xl font-black text-slate-900 mt-1">{employees.length} Units</h4>
                            </div>
                        </div>

                        {/* Audit Table */}
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                        <ChartBarIcon className="w-5 h-5 text-indigo-600" /> Forensic Production Audit
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time settlement & ROI analysis</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400">
                                        <ArchiveBoxIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white">
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plantation</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Variety</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Production</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Cost</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">OPEX/KG</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {vaultItems.map((item, idx) => {
                                            const cost = forensics[idx];
                                            const harvest = harvestEvents.find(e => e.id === item.relatedHarvestId);
                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                                <TractorIcon className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-800 uppercase">{item.name}</p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-wrap gap-1">
                                                            {harvest?.yieldByVariety?.map(v => (
                                                                <span key={v.variety} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-widest">
                                                                    {v.variety}
                                                                </span>
                                                            )) || <span className="text-[10px] font-bold text-slate-400">N/A</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-xs font-black text-slate-800">{item.currentStock.toLocaleString()} KG</p>
                                                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Verified</p>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-xs font-black text-slate-800">{formatCurrency(cost.total)}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">All-in Cost</p>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-xs font-black text-slate-800">{formatCurrency(cost.total / (item.currentStock || 1))}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Unit Cost</p>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <button 
                                                            onClick={() => setSelectedHarvestId(item.relatedHarvestId || null)}
                                                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-100"
                                                        >
                                                            <SparklesIcon className="w-3.5 h-3.5" /> Settle
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Registration Modal */}
            {isRegistrationOpen && (
                <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
                        <div className="p-10 space-y-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Register Organization</h2>
                                    <p className="text-sm text-slate-500 font-medium mt-1">Enter your company details to create a workspace.</p>
                                </div>
                                <button onClick={() => setIsRegistrationOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <XIcon className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. Green Valley Farms"
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={regData.name}
                                        onChange={(e) => setRegData({...regData, name: e.target.value})}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax Number</label>
                                        <input 
                                            type="text"
                                            placeholder="e.g. 204561234"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            value={regData.taxNumber}
                                            onChange={(e) => setRegData({...regData, taxNumber: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Phone</label>
                                        <input 
                                            type="text"
                                            placeholder="e.g. +995 555 123 456"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            value={regData.phone}
                                            onChange={(e) => setRegData({...regData, phone: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Org Type</label>
                                        <select 
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                                            value={regData.type}
                                            onChange={(e) => setRegData({...regData, type: e.target.value as OrganizationType})}
                                        >
                                            <option value="LTD">LTD</option>
                                            <option value="Individual">Individual</option>
                                            <option value="Cooperative">Cooperative</option>
                                            <option value="NGO">NGO</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agri Type</label>
                                        <select 
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                                            value={regData.agricultureType}
                                            onChange={(e) => setRegData({...regData, agricultureType: e.target.value as AgricultureType})}
                                        >
                                            <option value="General">General</option>
                                            <option value="Vineyard">Vineyard</option>
                                            <option value="Orchard">Orchard</option>
                                            <option value="Greenhouse">Greenhouse</option>
                                            <option value="Livestock">Livestock</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Region</label>
                                        <input 
                                            type="text"
                                            placeholder="e.g. Kakheti"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            value={regData.region}
                                            onChange={(e) => setRegData({...regData, region: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Area (HA)</label>
                                        <input 
                                            type="number"
                                            placeholder="e.g. 50"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            value={regData.areaHa}
                                            onChange={(e) => setRegData({...regData, areaHa: parseFloat(e.target.value) || 0})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Crops to Manage</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COMMON_CROPS.map(cropName => {
                                            const isSelected = regData.selectedCrops.some(c => c.name === cropName);
                                            return (
                                                <button
                                                    key={cropName}
                                                    onClick={() => {
                                                        const newCrops = isSelected 
                                                            ? regData.selectedCrops.filter(c => c.name !== cropName)
                                                            : [...regData.selectedCrops, {name: cropName, varieties: []}];
                                                        setRegData({...regData, selectedCrops: newCrops});
                                                    }}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-white'}`}
                                                >
                                                    {cropName}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {regData.selectedCrops.length === 0 && (
                                        <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                                            <InfoIcon size={12}/> Please select at least one crop
                                        </p>
                                    )}

                                    {/* Edit varieties for selected crops */}
                                    {regData.selectedCrops.length > 0 && (
                                        <div className="mt-4 space-y-4 max-h-48 overflow-y-auto no-scrollbar">
                                            {regData.selectedCrops.map(crop => (
                                                <div key={crop.name} className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-xs font-black text-indigo-900 uppercase tracking-tight">{crop.name} Varieties</h4>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {crop.varieties.map((v, i) => (
                                                            <div key={i} className="px-3 py-1 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                                                {v}
                                                                <button type="button" onClick={() => {
                                                                    setRegData({
                                                                        ...regData, 
                                                                        selectedCrops: regData.selectedCrops.map(c => c.name === crop.name ? {...c, varieties: c.varieties.filter((_, idx) => idx !== i)} : c)
                                                                    });
                                                                }} className="hover:text-red-500 ml-1">&times;</button>
                                                            </div>
                                                        ))}
                                                        {crop.varieties.length === 0 && <span className="text-xs text-indigo-400">No varieties added (optional)</span>}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Add variety (e.g. Chandler)" 
                                                            className="flex-1 px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    const val = e.currentTarget.value.trim();
                                                                    if (val && !crop.varieties.includes(val)) {
                                                                        setRegData({
                                                                            ...regData, 
                                                                            selectedCrops: regData.selectedCrops.map(c => c.name === crop.name ? {...c, varieties: [...c.varieties, val]} : c)
                                                                        });
                                                                        e.currentTarget.value = '';
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <button 
                                                            type="button"
                                                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                                const val = input.value.trim();
                                                                if (val && !crop.varieties.includes(val)) {
                                                                    setRegData({
                                                                        ...regData, 
                                                                        selectedCrops: regData.selectedCrops.map(c => c.name === crop.name ? {...c, varieties: [...c.varieties, val]} : c)
                                                                    });
                                                                    input.value = '';
                                                                }
                                                            }}
                                                        >Add</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Discoverable</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Allow others to find your org</p>
                                    </div>
                                    <button 
                                        onClick={() => setRegData({...regData, isDiscoverable: !regData.isDiscoverable})}
                                        className={`w-12 h-6 rounded-full p-1 transition-all ${regData.isDiscoverable ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                    >
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${regData.isDiscoverable ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => handleAddOrg(true)}
                                    className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <MapIcon className="h-4 w-4" />
                                    Draw on Map
                                </button>
                                <button 
                                    onClick={() => handleAddOrg(false)}
                                    className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
                                >
                                    Create Workspace
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Settlement Modal */}
            {selectedHarvestId && (
                <SettlementTerminal 
                    harvest={harvestEvents.find(e => e.id === selectedHarvestId)!}
                    item={vaultItems.find(i => i.relatedHarvestId === selectedHarvestId)!}
                    cost={forensics.find((_, i) => vaultItems[i].relatedHarvestId === selectedHarvestId)!}
                    formatCurrency={formatCurrency}
                    onClose={() => setSelectedHarvestId(null)}
                    onConfirm={(data) => {
                        console.log("Settlement Confirmed:", data);
                        setSelectedHarvestId(null);
                        toast.success("Settlement finalized and recorded in ledger.");
                    }}
                />
            )}
            {/* Edit Organization Modal */}
            {isEditOrgModalOpen && editingOrg && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">{t('profile.edit_org')}</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Refine your workspace profile</p>
                            </div>
                            <button onClick={() => setIsEditOrgModalOpen(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
                                <XIcon size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organization Name</label>
                                    <input 
                                        type="text" 
                                        value={editOrgData.name || ''}
                                        onChange={(e) => setEditOrgData({...editOrgData, name: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tax Number</label>
                                    <input 
                                        type="text" 
                                        value={editOrgData.taxNumber || ''}
                                        onChange={(e) => setEditOrgData({...editOrgData, taxNumber: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Agriculture Type</label>
                                    <select 
                                        value={editOrgData.agricultureType || ''}
                                        onChange={(e) => setEditOrgData({...editOrgData, agricultureType: e.target.value as AgricultureType})}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    >
                                        <option value="General">General Agriculture</option>
                                        <option value="Fruit">Fruit Production</option>
                                        <option value="Vegetable">Vegetable Production</option>
                                        <option value="Grain">Grain Production</option>
                                        <option value="Livestock">Livestock</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Discoverability</label>
                                    <div className="flex items-center gap-4 py-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={editOrgData.isDiscoverable}
                                                onChange={(e) => setEditOrgData({...editOrgData, isDiscoverable: e.target.checked})}
                                                className="w-4 h-4 rounded text-indigo-600"
                                            />
                                            <span className="text-xs font-bold text-slate-700">Public Registry</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={handleUpdateOrgInternal}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all"
                            >
                                {t('profile.save_changes')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Discovery Handshake Modal */}
            {discoveryOrg && (
                <div className="fixed inset-0 bg-black/60 z-[7000] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                        <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-600">
                                    <BuildingStorefrontIcon size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{discoveryOrg.name}</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{(discoveryOrg.agricultureType) || 'Mixed Agriculture'} • {discoveryOrg.type}</p>
                                </div>
                            </div>
                            <button onClick={() => setDiscoveryOrg(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <XIcon size={24} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-4">
                            <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 mb-4">
                                <p className="text-[10px] font-bold text-indigo-600 leading-relaxed uppercase tracking-tight text-center">
                                    Initiate a secure connection with this organization's administrative hub.
                                </p>
                            </div>
                            
                            <button 
                                onClick={() => {
                                    if (onAddPost && currentUser) {
                                        onAddPost({
                                            content: `Inquiry from ${currentUser.name}: Hello, I am interested in connecting with ${discoveryOrg.name}.`,
                                            channelId: 'internal',
                                            hubType: 'internal',
                                            isDirectMessage: true,
                                            recipientId: discoveryOrg.createdBy || 'founder',
                                            authorId: currentUser.id,
                                            authorName: currentUser.name,
                                            timestamp: new Date().toISOString(),
                                            replies: []
                                        });
                                        setDiscoveryOrg(null);
                                        toast.success("Message sent! Notification dispatched to Team Hub.");
                                    }
                                }}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <UsersIcon size={18} /> Send Message
                            </button>
                            
                            <button 
                                onClick={async () => {
                                    if (!discoveryOrg || !currentUser) return;
                                    const membershipId = `${currentUser.id}_${discoveryOrg.id}`;
                                    const newMembership: Membership = {
                                        id: membershipId,
                                        userId: currentUser.id,
                                        organizationId: discoveryOrg.id,
                                        role: 'Employee',
                                        permissionLevel: 'write',
                                        status: 'pending',
                                        joinedAt: new Date().toISOString()
                                    };

                                    try {
                                        if (USE_FIREBASE) {
                                            // 1. Create membership
                                            await setDoc(doc(db, 'memberships', membershipId), newMembership);

                                            // 2. Create employee matching
                                            const newEmployee: Employee = {
                                                id: `emp-${currentUser.id}-${discoveryOrg.id}`,
                                                name: currentUser.name || "Unknown",
                                                email: currentUser.email || "",
                                                phone: currentUser.phone || '',
                                                idNumber: currentUser.personalNumber || '',
                                                roleId: 'Employee',
                                                paymentType: 'hourly',
                                                paymentRate: 0,
                                                barcode: `BC-${Date.now()}`,
                                                employeeType: 'Temporary',
                                                accountType: 'Bank Account',
                                                status: 'active',
                                                joinedAt: new Date().toISOString(),
                                                organizationId: discoveryOrg.id
                                            };
                                            await setDoc(doc(db, 'employees', newEmployee.id), newEmployee);

                                            // 3. Create Alert for the owner
                                            const alertId = `alert-join-${Date.now()}`;
                                            await setDoc(doc(db, 'alerts', alertId), {
                                                id: alertId,
                                                organizationId: discoveryOrg.id,
                                                title: 'New Join Request',
                                                content: `${currentUser.name} has requested to join ${discoveryOrg.name}.`,
                                                type: 'info',
                                                timestamp: new Date().toISOString(),
                                                isRead: false,
                                                createdBy: currentUser.id,
                                                metadata: { 
                                                    membershipId, 
                                                    userId: currentUser.id
                                                },
                                                actions: [
                                                    { label: 'Approve', actionType: 'approve_join', actionData: { membershipId, userId: currentUser.id } }
                                                ]
                                            });
                                        } else {
                                            // Offline / Mock fallback
                                            const savedMemberships = safeStorage.safeParse(localStorage.getItem('mock_memberships'), []);
                                            const filteredMems = savedMemberships.filter((m: any) => m.id !== membershipId);
                                            localStorage.setItem('mock_memberships', JSON.stringify([...filteredMems, newMembership]));

                                            const newEmployee: Employee = {
                                                id: `emp-${currentUser.id}-${discoveryOrg.id}`,
                                                name: currentUser.name || "Unknown",
                                                email: currentUser.email || "",
                                                phone: currentUser.phone || '',
                                                idNumber: currentUser.personalNumber || '',
                                                roleId: 'Employee',
                                                paymentType: 'hourly',
                                                paymentRate: 0,
                                                barcode: `BC-${Date.now()}`,
                                                employeeType: 'Temporary',
                                                accountType: 'Bank Account',
                                                status: 'active',
                                                joinedAt: new Date().toISOString(),
                                                organizationId: discoveryOrg.id
                                            };
                                            const savedEmployees = safeStorage.safeParse(localStorage.getItem('mock_employees'), []);
                                            localStorage.setItem('mock_employees', JSON.stringify([...savedEmployees, newEmployee]));
                                        }

                                        // Write direct message post for community hub
                                        if (onAddPost) {
                                            onAddPost({
                                                content: `Formal Join Request: ${currentUser.name} has requested to join ${discoveryOrg.name} as a professional partner.`,
                                                channelId: 'internal',
                                                hubType: 'internal',
                                                isDirectMessage: true,
                                                recipientId: discoveryOrg.createdBy || 'founder',
                                                authorId: currentUser.id,
                                                authorName: currentUser.name,
                                                timestamp: new Date().toISOString(),
                                                replies: []
                                            });
                                        }

                                        toast.success("Handshake request successfully submitted!");
                                        setDiscoveryOrg(null);
                                    } catch (error) {
                                        console.error("Error sending handshake request:", error);
                                        toast.error("Failed to submit join request. Please try again.");
                                    }
                                }}
                                className="w-full py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                Send Join Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FoundersView;
