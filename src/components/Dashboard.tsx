
import React, { useMemo, useState, useEffect } from 'react';
import type { 
  User, PlantationFeature, AreaPlantationFeature, NotePlantationFeature, 
  SeedlingPlantationFeature, WeatherData, AssistantMessage, DashboardWidget, 
  WorkAssignment, InventoryItem, HarvestEvent, NutritionPlan, Account, 
  DailyLogEntry, Listing, DashboardWidgetType, HarvestEntry, Crop, Employee,
  AiAnomalyAlert, AiAnalysisReport, AiAnalysisScheduleConfig, AnalysisModuleScope, AnalysisTriggerMode
} from '../types';
import {
  LeafIcon, TractorIcon, WaterDropIcon, ArrowTrendingUpIcon,
  SunIcon, SearchIcon, RectangleGroupIcon,
  ArrowsPointingOutIcon, ArrowsPointingInIcon, CheckIcon, AlertTriangleIcon, XCircleIcon, CameraIcon, MapPinIcon, WindIcon, WrenchScrewdriverIcon, BeakerIcon, BanknotesIcon, BriefcaseIcon, ChevronUpIcon, ChevronDownIcon, XIcon, ChartBarIcon, SparklesIcon, CalendarDaysIcon, ArrowPathIcon, UsersIcon, ShoppingBagIcon, HeartIcon
} from './Icons';
import { Video, MessageSquare, Mic, Sparkles, ArrowRight } from 'lucide-react';
import { MapComponent, MapComponentProps } from './MapComponent';
import { getSphericalPolygonArea } from '../services/geospatialService';
import { useLanguage } from '../contexts/LanguageContext';
import { getDailyBriefing } from '../services/geminiService';
import CropManagementModal from './CropManagementModal';
import DashboardAiStream from './DashboardAiStream';
import AiCrossModuleAnalysisModal from './AiCrossModuleAnalysisModal';
import { 
  detectCrossModuleAnomalies, getSavedAnalysisConfig, 
  getStoredAnalysisReports, runMultiModuleAiAnalysis 
} from '../services/crossModuleAnalysisService';


interface DashboardProps extends Omit<MapComponentProps, 'onUpdateFeature' | 'activeDrawingTool' | 'onFeatureDrawn'> {
  isMapFullScreen: boolean;
  onSetIsMapFullScreen: (isFull: boolean) => void;
  onUpdateFeature?: (feature: PlantationFeature) => void;
  plantationFeatures: PlantationFeature[];
  assistantMessages: AssistantMessage[];
  onSendCommand: (command: string) => void;
  isAssistantLoading: boolean;
  dashboardLayout: DashboardWidget[];
  onSetDashboardLayout: (layout: DashboardWidget[]) => void;
  workAssignments: WorkAssignment[];
  inventoryItems: InventoryItem[];
  harvestEvents: HarvestEvent[];
  nutritionPlans: NutritionPlan[];
  accounts: Account[];
  dailyLogs: DailyLogEntry[];
  onSetDailyLogs?: (logs: DailyLogEntry[]) => void;
  employees?: Employee[];
  listings: Listing[];
  harvestEntries: HarvestEntry[];
  users: User[];
  organizations: any[];
  crops: Crop[];
  activeOrgId: string | null;
  onOpenMeet?: () => void;
  onOpenChat?: () => void;
  onOpenNotes?: () => void;
  onOpenAssistant?: () => void;
  notes?: any[];
}

const WidgetManagerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    layout: DashboardWidget[];
    onUpdate: (layout: DashboardWidget[]) => void;
}> = ({ isOpen, onClose, layout, onUpdate }) => {
    const types: {type: DashboardWidgetType, label: string}[] = [
        { type: 'attendance', label: 'Attendance' },
        { type: 'market_feed', label: 'Marketplace Feed' },
        { type: 'seedling_summary', label: 'Seedling Summary' },
        { type: 'harvest_pulse', label: 'Harvest Pulse' },
        { type: 'daily_news', label: 'Daily Briefing' },
        { type: 'field_summary', label: 'Field Summary' },
        { type: 'tasks', label: 'Upcoming Tasks' },
        { type: 'guest_stats', label: 'Global Stats' },
        { type: 'crops_summary', label: 'Crops & Varieties' },
    ];

    if (!isOpen) return null;

    const toggle = (type: DashboardWidgetType) => {
        const existing = layout.find(w => w.type === type);
        if (existing) {
            onUpdate(layout.map(w => w.type === type ? { ...w, isVisible: !w.isVisible } : w));
        } else {
            const newWidget: DashboardWidget = {
                id: `w-${Date.now()}`,
                type,
                isVisible: true,
                order: layout.length,
                title: type.split('_').join(' ')
            };
            onUpdate([...layout, newWidget]);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[4000] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-8 border-b flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">Customize</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select widgets to display</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><XIcon className="h-6 w-6 text-slate-400" /></button>
                </div>
                <div className="p-8 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                    {types.map(t => {
                        const widget = layout.find(w => w.type === t.type);
                        const isVisible = widget?.isVisible ?? false;
                        return (
                            <div key={t.type} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-200 transition-all">
                                <span className="font-bold text-slate-700 text-sm">{t.label}</span>
                                <button 
                                    onClick={() => toggle(t.type)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isVisible ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}
                                >
                                    {isVisible ? 'Visible' : 'Hidden'}
                                </button>
                            </div>
                        );
                    })}
                </div>
                <div className="p-8 bg-slate-50 border-t">
                    <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Done</button>
                </div>
            </div>
        </div>
    );
};

interface AttendanceWidgetProps {
  logs: DailyLogEntry[];
  employees?: Employee[];
  onSetDailyLogs?: (logs: DailyLogEntry[]) => void;
}

const AttendanceWidget: React.FC<AttendanceWidgetProps> = ({ logs = [], employees = [], onSetDailyLogs }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isExpanded, setIsExpanded] = useState(false);

    const stats = useMemo(() => {
        const dateLogs = logs.filter(l => l.date && l.date.startsWith(date));
        return {
            present: dateLogs.filter(l => l.logType === 'Present').length,
            absent: dateLogs.filter(l => l.logType === 'Absent').length,
            late: dateLogs.filter(l => l.logType === 'Late').length,
        };
    }, [logs, date]);

    const handleLog = (employeeId: string, type: DailyLogEntry['logType']) => {
        if (!onSetDailyLogs) return;
        const newLog: DailyLogEntry = {
            id: `dl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            employeeId,
            date,
            logType: type
        };
        const filtered = logs.filter(l => !(l.employeeId === employeeId && l.date && l.date.startsWith(date)));
        onSetDailyLogs([...filtered, newLog]);
    };

    const handleMarkAllPresent = () => {
        if (!onSetDailyLogs || employees.length === 0) return;
        const otherLogs = logs.filter(l => !(l.date && l.date.startsWith(date)));
        const newEntries: DailyLogEntry[] = employees.map(emp => ({
            id: `dl-${Date.now()}-${emp.id}`,
            employeeId: emp.id,
            date,
            logType: 'Present'
        }));
        onSetDailyLogs([...otherLogs, ...newEntries]);
    };

    const getStatus = (empId: string) => {
        const log = logs.find(l => l.employeeId === empId && l.date && l.date.startsWith(date));
        return log?.logType;
    };

    return (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-full flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <UsersIcon className="h-4 w-4 text-indigo-600" />
                        Staff Daily Attendance
                    </h3>
                    <div className="flex items-center gap-2">
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            className="bg-slate-50 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 outline-none border border-slate-200" 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest mb-1">Present</p>
                        <p className="text-2xl font-black text-emerald-700">{stats.present}</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-2xl border border-red-100">
                        <p className="text-[9px] text-red-600 font-black uppercase tracking-widest mb-1">Absent</p>
                        <p className="text-2xl font-black text-red-700">{stats.absent}</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-2xl border border-amber-100">
                        <p className="text-[9px] text-amber-600 font-black uppercase tracking-widest mb-1">Late</p>
                        <p className="text-2xl font-black text-amber-700">{stats.late}</p>
                    </div>
                </div>

                {employees.length > 0 && (
                    <div className="mt-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                Personnel ({employees.length})
                            </span>
                            <div className="flex items-center gap-2">
                                {onSetDailyLogs && (
                                    <button
                                        type="button"
                                        onClick={handleMarkAllPresent}
                                        className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider transition-colors cursor-pointer"
                                    >
                                        Mark All Present
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsExpanded(prev => !prev)}
                                    className="text-[9px] font-black text-slate-500 hover:text-slate-700 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                >
                                    {isExpanded ? 'Collapse' : 'Manage'}
                                    {isExpanded ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
                                </button>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1 pt-1">
                                {employees.map(emp => {
                                    const status = getStatus(emp.id);
                                    return (
                                        <div key={emp.id} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                                            <div className="min-w-0 pr-2">
                                                <span className="text-xs font-black text-slate-800 truncate block">{emp.name}</span>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider truncate">{emp.employeeType || 'Staff'}</p>
                                            </div>
                                            <div className="flex gap-1.5 shrink-0 items-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleLog(emp.id, 'Present')}
                                                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                        status === 'Present' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-500 border border-slate-200 hover:text-emerald-600'
                                                    }`}
                                                >
                                                    P
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleLog(emp.id, 'Absent')}
                                                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                        status === 'Absent' ? 'bg-red-600 text-white shadow-xs' : 'bg-white text-slate-500 border border-slate-200 hover:text-red-600'
                                                    }`}
                                                >
                                                    A
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleLog(emp.id, 'Late')}
                                                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                        status === 'Late' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white text-slate-500 border border-slate-200 hover:text-amber-600'
                                                    }`}
                                                >
                                                    L
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <p className="text-[8px] text-slate-300 mt-4 text-center uppercase font-black tracking-[0.2em]">
                Attendance: {date}
            </p>
        </div>
    );
};

const FieldSummaryWidget: React.FC<{ features: PlantationFeature[] }> = ({ features }) => {
    const { t } = useLanguage();
    const stats = useMemo(() => {
        const areas = features.filter(f => f.type === 'area' || f.type === 'sector') as AreaPlantationFeature[];
        const totalAreaM2 = areas.reduce((sum, a) => {
            try { return sum + getSphericalPolygonArea(a.geometry); } catch { return sum; }
        }, 0);
        const totalPlants = areas.reduce((sum, a) => sum + (a.plantCount || 0), 0);
        const varieties = new Set<string>();
        areas.forEach(a => {
            if (Array.isArray(a.cropVariety)) a.cropVariety.forEach(v => varieties.add(v));
            else if (a.cropVariety) varieties.add(a.cropVariety);
        });
        return { totalAreaHa: totalAreaM2 / 10000, totalPlants, varietyCount: varieties.size };
    }, [features]);

    return (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-full">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <RectangleGroupIcon className="h-4 w-4 text-emerald-600" />
                {t('dash.field_summary')}
            </h3>
            <div className="grid grid-cols-3 gap-6">
                <div className="space-y-1">
                    <p className="text-2xl font-black text-slate-800 tracking-tighter">{stats.totalAreaHa.toFixed(2)}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hectares</p>
                </div>
                <div className="space-y-1">
                    <p className="text-2xl font-black text-slate-800 tracking-tighter">{stats.totalPlants.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Plants</p>
                </div>
                <div className="space-y-1">
                    <p className="text-2xl font-black text-slate-800 tracking-tighter">{stats.varietyCount}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Varieties</p>
                </div>
            </div>
        </div>
    );
};

const MarketFeedWidget: React.FC<{ listings: Listing[] }> = ({ listings }) => {
    const latest = useMemo(() => [...listings].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5), [listings]);
    return (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-full flex flex-col">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShoppingBagIcon className="h-4 w-4 text-blue-600" />
                Marketplace Feed
            </h3>
            <div className="space-y-2 flex-grow overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                {latest.map(l => (
                    <div key={l.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-300 cursor-pointer transition-all group">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{l.type}</span>
                            <span className="text-[9px] font-bold text-slate-400">{new Date(l.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm font-black text-slate-800 truncate group-hover:text-blue-700 transition-colors">{l.title}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{l.quantity} {l.unit} @ ${l.pricePerUnit || l.auctionDetails?.currentPrice}</p>
                    </div>
                ))}
                {latest.length === 0 && <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest py-12">No active listings.</p>}
            </div>
        </div>
    );
};

const SeedlingSummaryWidget: React.FC<{ features: PlantationFeature[] }> = ({ features }) => {
    const seedlings = useMemo(() => features.filter(f => f.type === 'seedling') as SeedlingPlantationFeature[], [features]);
    const stats = useMemo(() => {
        const total = seedlings.length;
        const byVariety: Record<string, number> = {};
        const byHealth: Record<string, number> = {};
        const byArea: Record<string, number> = {};

        seedlings.forEach(s => {
            const v = s.cropVariety || 'Unknown';
            byVariety[v] = (byVariety[v] || 0) + 1;

            const h = s.condition || 'Good';
            byHealth[h] = (byHealth[h] || 0) + 1;

            const trench = features.find(f => f.id === s.parentId);
            const area = trench ? features.find(f => f.id === trench.parentId) : null;
            const areaName = area?.name || 'Unassigned';
            byArea[areaName] = (byArea[areaName] || 0) + 1;
        });

        const g = byHealth['Good'] || 0;
        const s = byHealth['Suspicious'] || 0;
        const d = byHealth['Dried'] || 0;

        return { 
            total, 
            byVariety, 
            byHealth, 
            byArea,
            gp: total > 0 ? (g/total)*100 : 0, 
            sp: total > 0 ? (s/total)*100 : 0, 
            dp: total > 0 ? (d/total)*100 : 0 
        };
    }, [seedlings, features]);

    return (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-full space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Seedling Summary</h3>
                    <p className="text-3xl font-black text-slate-800 tracking-tighter">{stats.total.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Total Census</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <LeafIcon className="h-6 w-6 text-emerald-600" />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                        <div style={{ width: `${stats.gp}%` }} className="bg-emerald-500 h-full transition-all duration-1000"></div>
                        <div style={{ width: `${stats.sp}%` }} className="bg-amber-500 h-full transition-all duration-1000"></div>
                        <div style={{ width: `${stats.dp}%` }} className="bg-red-500 h-full transition-all duration-1000"></div>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">By Variety</p>
                        <div className="space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
                            {Object.entries(stats.byVariety).map(([variety, count]) => (
                                <div key={variety} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-600 uppercase truncate pr-2">{variety}</span>
                                    <span className="text-[10px] font-black text-blue-600">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">By Health</p>
                        <div className="space-y-2">
                            {Object.entries(stats.byHealth).map(([health, count]) => (
                                <div key={health} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${health === 'Good' ? 'bg-emerald-500' : health === 'Dried' ? 'bg-red-500' : 'bg-amber-500'}`} />
                                        <span className="text-[10px] font-bold text-slate-600 uppercase">{health}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-800">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">By Sector / Area</p>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(stats.byArea).map(([area, count]) => (
                            <div key={area} className="px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-2">
                                <RectangleGroupIcon className="h-3 w-3 text-indigo-400" />
                                <span className="text-[9px] font-black text-indigo-900 uppercase">{area}</span>
                                <span className="text-[9px] font-black text-indigo-600 bg-white px-1.5 py-0.5 rounded-lg">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const HarvestPulseWidget: React.FC<{ events: HarvestEvent[] }> = ({ events }) => {
    const historical = useMemo(() => events.filter(e => e.status === 'completed').reduce((s, e) => s + (e.finalNetYieldKg || 0), 0), [events]);
    const ongoing = useMemo(() => events.filter(e => e.status === 'active').reduce((s, e) => s + (e.totalNetWeightKg || 0), 0), [events]);
    return (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-full">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TractorIcon className="h-4 w-4 text-orange-600" />
                Harvest Pulse
            </h3>
            <div className="space-y-3">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Seasonal Yield</p>
                    <p className="text-3xl font-black text-slate-800 tracking-tighter">{historical.toLocaleString()} kg</p>
                </div>
                <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 flex justify-between items-center shadow-sm">
                    <div>
                        <p className="text-[9px] text-orange-600 font-black uppercase tracking-widest mb-1">Active Today</p>
                        <p className="text-2xl font-black text-orange-700 tracking-tighter">+{ongoing.toLocaleString()} kg</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center animate-pulse">
                        <ArrowTrendingUpIcon className="h-6 w-6 text-orange-600" />
                    </div>
                </div>
            </div>
        </div>
    );
}

const DailyNewsWidget: React.FC = () => {
    const [news, setNews] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { language } = useLanguage();
    const fetchNews = async () => {
        setLoading(true);
        try {
            const content = await getDailyBriefing(language);
            setNews(content);
        } catch (e) { setNews("Failed to load news."); } finally { setLoading(false); }
    };
    useEffect(() => { fetchNews(); }, [language]);
    return (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CalendarDaysIcon className="h-4 w-4 text-blue-600"/>
                    Daily Briefing
                </h3>
                <button onClick={fetchNews} disabled={loading} className={`p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all ${loading ? 'animate-spin' : ''}`}><ArrowPathIcon className="h-5 w-5" /></button>
            </div>
            <div className="flex-grow overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                {loading && !news ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-4 py-12">
                        <SparklesIcon className="h-10 w-10 animate-pulse text-blue-400"/>
                        <p className="text-[10px] font-black uppercase tracking-widest">Curating Intelligence...</p>
                    </div>
                ) : (
                    <div className="prose prose-slate max-w-none text-slate-600 whitespace-pre-wrap text-sm leading-relaxed font-medium">
                        {news || 'No news available at the moment.'}
                    </div>
                )}
            </div>
        </div>
    );
};

const GuestStatsWidget: React.FC<{ users: User[], organizations: any[] }> = ({ users, organizations }) => {
    const stats = useMemo(() => {
        const roles = users.reduce((acc, u) => {
            const role = u.roles?.[0] || 'Guest';
            acc[role] = (acc[role] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalUsers: users.length,
            totalOrgs: organizations.length,
            roles
        };
    }, [users, organizations]);

    return (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-full">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-indigo-600" />
                Global Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <p className="text-3xl font-black text-indigo-900 tracking-tighter">{stats.totalOrgs}</p>
                    <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Plantations</p>
                </div>
                <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-3xl font-black text-emerald-900 tracking-tighter">{stats.totalUsers}</p>
                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Users</p>
                </div>
            </div>
            <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Roles Distribution</p>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.roles).map(([role, count]) => (
                        <div key={role} className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-600 uppercase">{role}</span>
                            <span className="text-[9px] font-black text-indigo-600 bg-white px-1.5 py-0.5 rounded-lg">{count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const Dashboard: React.FC<DashboardProps> = (props) => {
  const { isMapFullScreen, onSetIsMapFullScreen, dashboardLayout = [], onSetDashboardLayout, crops = [], activeOrgId } = props;
  const { t, language } = useLanguage();
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // AI Stream & Anomaly Engine State
  const [aiConfig, setAiConfig] = useState<AiAnalysisScheduleConfig>(getSavedAnalysisConfig());
  const [latestReport, setLatestReport] = useState<AiAnalysisReport | null>(() => {
    const stored = getStoredAnalysisReports();
    return stored.length > 0 ? stored[0] : null;
  });
  const [anomalies, setAnomalies] = useState<AiAnomalyAlert[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalMode, setAiModalMode] = useState<AnalysisTriggerMode>('scheduled');
  const [aiModalModule, setAiModalModule] = useState<AnalysisModuleScope | undefined>(undefined);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Compute live anomalies on mount / when datasets update
  useEffect(() => {
    const detected = detectCrossModuleAnomalies({
      inventoryItems: props.inventoryItems,
      nutritionPlans: props.nutritionPlans,
      planExecutions: [],
      workAssignments: props.workAssignments,
      dailyLogs: props.dailyLogs,
      harvests: props.harvestEvents,
      accounts: props.accounts,
      language: language === 'ka' ? 'ka' : 'en'
    });
    setAnomalies(detected);
  }, [props.inventoryItems, props.nutritionPlans, props.workAssignments, props.dailyLogs, props.harvestEvents, props.accounts, language]);

  const handleOpenAiHub = (mode: AnalysisTriggerMode = 'scheduled', preselectedModule?: AnalysisModuleScope) => {
    setAiModalMode(mode);
    setAiModalModule(preselectedModule);
    setIsAiModalOpen(true);
  };

  const handleRefreshAnalysis = async () => {
    setIsAiLoading(true);
    try {
      const report = await runMultiModuleAiAnalysis({
        triggerMode: 'scheduled',
        cadence: aiConfig.cadence,
        selectedModules: aiConfig.selectedModules,
        inventoryItems: props.inventoryItems,
        nutritionPlans: props.nutritionPlans,
        planExecutions: [],
        workAssignments: props.workAssignments,
        dailyLogs: props.dailyLogs,
        harvests: props.harvestEvents,
        accounts: props.accounts,
        language: language === 'ka' ? 'ka' : 'en'
      });
      setLatestReport(report);
      setAnomalies(report.anomalies);
    } catch (e) {
      console.error("AI Analysis refresh error:", e);
    } finally {
      setIsAiLoading(false);
    }
  };


  const sortedWidgets = useMemo(() => {

      const defaultWidgets: DashboardWidget[] = [
          { id: 'w1', type: 'daily_news', title: 'Daily Briefing', isVisible: true, order: 0 },
          { id: 'w_att', type: 'attendance', title: 'Daily Personnel Attendance', isVisible: true, order: 1 },
          { id: 'w5', type: 'seedling_summary', title: 'Seedling Summary', isVisible: true, order: 2 },
          { id: 'w2', type: 'field_summary', title: 'Field Summary', isVisible: true, order: 3 },
          { id: 'w3', type: 'market_feed', title: 'Market Feed', isVisible: true, order: 4 },
          { id: 'w4', type: 'guest_stats', title: 'Global Stats', isVisible: true, order: 5 }
      ];
      const layout = dashboardLayout.length > 0 ? dashboardLayout : defaultWidgets;
      return [...layout].filter(w => w.isVisible).sort((a, b) => a.order - b.order);
  }, [dashboardLayout]);

  const renderWidget = (widget: DashboardWidget) => {
      switch (widget.type) {
          case 'attendance': return (
              <AttendanceWidget 
                  logs={props.dailyLogs} 
                  employees={props.employees} 
                  onSetDailyLogs={props.onSetDailyLogs} 
              />
          );
          case 'market_feed': return <MarketFeedWidget listings={props.listings} />;
          case 'seedling_summary': return <SeedlingSummaryWidget features={props.plantationFeatures} />;
          case 'seedling_health': return <SeedlingSummaryWidget features={props.plantationFeatures} />;
          case 'seedling_stats': return <SeedlingSummaryWidget features={props.plantationFeatures} />;
          case 'harvest_pulse': return <HarvestPulseWidget events={props.harvestEvents} />;
          case 'daily_news': return <DailyNewsWidget />;
          case 'field_summary': return <FieldSummaryWidget features={props.plantationFeatures} />;
          case 'guest_stats': return <GuestStatsWidget users={props.users} organizations={props.organizations} />;
          case 'crops_summary': return (
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-full flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <LeafIcon className="h-4 w-4 text-emerald-600" />
                          Crops & Varieties
                      </h3>
                      <button 
                        onClick={() => setIsCropModalOpen(true)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                      >
                        Manage
                      </button>
                  </div>
                  <div className="space-y-3 overflow-y-auto flex-grow max-h-[250px] custom-scrollbar pr-2">
                      {crops.map(c => (
                          <div key={c.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <p className="text-sm font-black text-slate-800 uppercase mb-2">{c.name}</p>
                              <div className="flex flex-wrap gap-1.5">
                                  {c.varieties?.map(v => (
                                      <span key={v} className="px-2 py-1 bg-white text-slate-500 text-[8px] font-black rounded-lg border border-slate-100 uppercase">{v}</span>
                                  ))}
                              </div>
                          </div>
                      ))}
                      {crops.length === 0 && <p className="text-center py-10 text-[10px] font-bold text-slate-400 uppercase tracking-widest">No crops added.</p>}
                  </div>
              </div>
          );
          case 'tasks': return (
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-full">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <BriefcaseIcon className="h-4 w-4 text-indigo-600" />
                    Upcoming Tasks
                  </h3>
                  <div className="space-y-3">
                      {props.workAssignments.filter(w => w.status !== 'completed').slice(0, 4).map(task => {
                          const displayName = typeof task.workName === 'string' ? task.workName : ((task.workName as any)?.name || (task.workName as any)?.title || 'Task');
                          return (
                              <div key={task.id} className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl flex justify-between items-center transition-all hover:bg-indigo-50 group">
                                  <span className="font-black text-sm text-indigo-900 truncate pr-4 group-hover:text-indigo-700">{displayName}</span>
                                  <span className="text-[9px] font-black text-indigo-400 uppercase whitespace-nowrap">{new Date(task.date).toLocaleDateString()}</span>
                              </div>
                          );
                      })}
                      {props.workAssignments.filter(w => w.status !== 'completed').length === 0 && (
                        <div className="text-center py-12 text-slate-300">
                             <CheckIcon className="h-10 w-10 mx-auto mb-2 opacity-30 text-emerald-500" />
                             <p className="text-[10px] font-black uppercase tracking-widest">All tasks completed</p>
                        </div>
                      )}
                  </div>
              </div>
          );
          default: return <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm text-slate-400 font-black uppercase text-[10px] tracking-widest text-center py-20">{widget.title || 'Widget'}</div>;
      }
  };
    
  return (
      <main className={`flex-1 bg-slate-50 overflow-y-auto ${isMapFullScreen ? 'p-0' : 'p-4 md:p-8'} safe-area-bottom`}>
        <div className={isMapFullScreen ? "h-full w-full" : "max-w-7xl mx-auto space-y-6 md:space-y-8 pb-24 md:pb-8"}>
          {!isMapFullScreen && (
            <>
            <div className="flex justify-between items-end">
                <div className="h-40 md:h-52 w-full rounded-[2.5rem] bg-cover bg-center bg-no-repeat p-6 md:p-10 flex flex-col justify-center text-white relative shadow-2xl overflow-hidden group" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.5)), url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000')" }}>
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500"></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl md:text-4xl font-black tracking-tighter uppercase" style={{textShadow: '0 4px 12px rgba(0,0,0,0.5)'}}>{t('dash.title')}</h2>
                        <p className="mt-2 text-sm md:text-lg text-white/90 font-medium max-w-lg" style={{textShadow: '0 2px 6px rgba(0,0,0,0.5)'}}>{t('dash.subtitle')}</p>
                    </div>
                    <button onClick={() => setIsManageModalOpen(true)} className="absolute bottom-6 right-6 bg-white/20 hover:bg-white/40 backdrop-blur-xl border border-white/30 text-white px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl">
                        <WrenchScrewdriverIcon className="h-4 w-4 mr-2 inline-block" /> Layout
                    </button>
                </div>
            </div>

            {/* AI Autonomous Stream & Anomaly Engine Panel */}
            <DashboardAiStream
                anomalies={anomalies}
                latestReport={latestReport}
                config={aiConfig}
                onOpenAiHub={handleOpenAiHub}
                onRefreshAnalysis={handleRefreshAnalysis}
                isLoading={isAiLoading}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {sortedWidgets.map(widget => {
                    const isWide = widget.type === 'weather' || widget.type === 'field_summary' || widget.type === 'daily_news' || widget.type === 'seedling_summary';
                    let colClass = isWide ? 'sm:col-span-2 lg:col-span-2' : 'col-span-1';
                    if (widget.type === 'field_summary' || widget.type === 'seedling_summary') colClass = 'sm:col-span-2 lg:col-span-3';
                    
                    return <div key={widget.id} className={`${colClass} animate-slide-up transition-transform`}>{renderWidget(widget)}</div>;
                })}
            </div>
            </>
          )}
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8 mt-6 md:mt-8">
            <div className={`bg-white rounded-[2.5rem] shadow-sm p-1.5 md:p-2 border border-slate-100 transition-all ${isMapFullScreen ? 'fixed inset-0 z-[3000] rounded-none' : 'xl:col-span-2 h-[450px] md:h-[600px]'}`}>
                <div className="h-full w-full relative overflow-hidden rounded-[2rem]">
                     <MapComponent {...props} />
                     <button onClick={() => onSetIsMapFullScreen(!isMapFullScreen)} className="absolute top-16 md:top-12 right-2.5 z-[1000] bg-white/90 backdrop-blur p-2.5 rounded-2xl shadow-xl hover:bg-white transition-all hover:scale-110 active:scale-90 text-slate-700">
                        {isMapFullScreen ? <ArrowsPointingInIcon className="h-6 w-6" /> : <ArrowsPointingOutIcon className="h-6 w-6" />}
                    </button>
                </div>
            </div>
             {!isMapFullScreen && (
                <div className="xl:col-span-1 hidden md:flex flex-col gap-4">
                    <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-[2.5rem] p-6 text-white border border-slate-800 shadow-xl flex flex-col justify-between h-[450px] md:h-[600px] overflow-hidden relative">
                        {/* Background Glow Accents */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                        {/* Card Header */}
                        <div className="relative z-10">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-sm uppercase tracking-wider text-white">AI & Live Hub</h3>
                                        <p className="text-[10px] text-slate-400 font-medium">Operations, Notes & Meetings</p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    Ready
                                </span>
                            </div>

                            {/* 4 Interactive Operations Tiles */}
                            <div className="grid grid-cols-2 gap-2.5 mt-4">
                                {/* Tile 1: AI Assistant */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (props.onOpenAssistant) props.onOpenAssistant();
                                        else window.dispatchEvent(new CustomEvent('agrimap_open_assistant'));
                                    }}
                                    className="p-3 bg-slate-800/80 hover:bg-emerald-900/30 border border-slate-700 hover:border-emerald-500/50 rounded-2xl text-left transition-all group cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                        <Sparkles size={16} />
                                    </div>
                                    <div className="font-bold text-xs text-slate-100 group-hover:text-emerald-300">AI Assistant</div>
                                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Crop plans & answers</div>
                                </button>

                                {/* Tile 2: AI Voice Notes */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (props.onOpenNotes) props.onOpenNotes();
                                        else window.dispatchEvent(new CustomEvent('agrimap_open_voice_notes'));
                                    }}
                                    className="p-3 bg-slate-800/80 hover:bg-amber-900/30 border border-slate-700 hover:border-amber-500/50 rounded-2xl text-left transition-all group cursor-pointer"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Mic size={16} />
                                        </div>
                                        {props.notes && props.notes.length > 0 && (
                                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-black bg-amber-950 text-amber-300 border border-amber-800">
                                                {props.notes.length}
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-bold text-xs text-slate-100 group-hover:text-amber-300">AI Voice Notes</div>
                                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Speech & GPS memos</div>
                                </button>

                                {/* Tile 3: Google Meet */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (props.onOpenMeet) props.onOpenMeet();
                                        else window.dispatchEvent(new CustomEvent('agrimap_open_meet'));
                                    }}
                                    className="p-3 bg-slate-800/80 hover:bg-blue-900/30 border border-slate-700 hover:border-blue-500/50 rounded-2xl text-left transition-all group cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                        <Video size={16} />
                                    </div>
                                    <div className="font-bold text-xs text-slate-100 group-hover:text-blue-300">Google Meet</div>
                                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Live video & map share</div>
                                </button>

                                {/* Tile 4: Google Chat */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (props.onOpenChat) props.onOpenChat();
                                        else window.dispatchEvent(new CustomEvent('agrimap_open_chat'));
                                    }}
                                    className="p-3 bg-slate-800/80 hover:bg-teal-900/30 border border-slate-700 hover:border-teal-500/50 rounded-2xl text-left transition-all group cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                        <MessageSquare size={16} />
                                    </div>
                                    <div className="font-bold text-xs text-slate-100 group-hover:text-teal-300">Google Chat</div>
                                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Team farm discussions</div>
                                </button>
                            </div>
                        </div>

                        {/* Quick AI Field Prompts */}
                        <div className="relative z-10 mt-auto pt-4 border-t border-slate-800/80">
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                                Instant AI Agronomy Inquiries
                            </div>
                            <div className="space-y-1.5">
                                {[
                                    "Analyze current plantation health and harvest readiness",
                                    "Check irrigation and weather advisory for today",
                                    "List pending tasks and equipment maintenance"
                                ].map((prompt, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            window.dispatchEvent(new CustomEvent('agrimap_open_assistant'));
                                            props.onSendCommand(prompt);
                                        }}
                                        className="w-full text-left px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-[11px] text-slate-300 hover:text-white transition-colors flex items-center justify-between group cursor-pointer"
                                    >
                                        <span className="truncate">{prompt}</span>
                                        <ArrowRight size={12} className="text-slate-500 group-hover:text-emerald-400 flex-shrink-0 ml-2" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
             )}
          </div>
        </div>
        
        <WidgetManagerModal 
            isOpen={isManageModalOpen} 
            onClose={() => setIsManageModalOpen(false)} 
            layout={dashboardLayout} 
            onUpdate={onSetDashboardLayout} 
        />

        {activeOrgId && (
            <CropManagementModal 
                isOpen={isCropModalOpen}
                onClose={() => setIsCropModalOpen(false)}
                crops={crops}
                organizationId={activeOrgId}
            />
        )}

        <AiCrossModuleAnalysisModal
            isOpen={isAiModalOpen}
            onClose={() => setIsAiModalOpen(false)}
            initialMode={aiModalMode}
            preselectedModule={aiModalModule}
            inventoryItems={props.inventoryItems}
            nutritionPlans={props.nutritionPlans}
            planExecutions={[]}
            workAssignments={props.workAssignments}
            dailyLogs={props.dailyLogs}
            harvestEvents={props.harvestEvents}
            accounts={props.accounts}
            config={aiConfig}
            onUpdateConfig={setAiConfig}
            onAnalysisCompleted={(report) => {
                setLatestReport(report);
                setAnomalies(report.anomalies);
            }}
        />
        
        <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
            @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </main>
  );
};

export default Dashboard;
