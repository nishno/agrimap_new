import React, { useState, useMemo } from 'react';
import type { DailyLogEntry, Employee } from '../types';
import { 
    Users, Briefcase, ChevronRight, CheckCircle2, 
    XCircle, Clock, ChevronDown, ChevronUp, Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

export interface StaffAttendanceWidgetProps {
    logs?: DailyLogEntry[];
    employees?: Employee[];
    onSetDailyLogs?: (logs: DailyLogEntry[]) => void;
    onNavigateMode?: (mode: string) => void;
}

export const StaffAttendanceWidget: React.FC<StaffAttendanceWidgetProps> = ({
    logs = [],
    employees = [],
    onSetDailyLogs,
    onNavigateMode
}) => {
    const { t } = useLanguage();
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isExpanded, setIsExpanded] = useState<boolean>(true);

    const stats = useMemo(() => {
        const todayLogs = logs.filter(l => l.date && l.date.startsWith(date));
        const present = todayLogs.filter(l => l.logType === 'Present').length;
        const absent = todayLogs.filter(l => l.logType === 'Absent').length;
        const late = todayLogs.filter(l => l.logType === 'Late').length;
        return { present, absent, late, total: employees.length };
    }, [logs, date, employees]);

    const handleLog = (empId: string, logType: 'Present' | 'Absent' | 'Late') => {
        if (!onSetDailyLogs) return;
        const otherLogs = logs.filter(l => !(l.employeeId === empId && l.date && l.date.startsWith(date)));
        const newEntry: DailyLogEntry = {
            id: `log-${Date.now()}-${empId}`,
            employeeId: empId,
            date,
            logType
        };
        onSetDailyLogs([...otherLogs, newEntry]);
        toast.success(`Marked ${logType} for today`);
    };

    const handleMarkAllPresent = () => {
        if (!onSetDailyLogs) return;
        const otherLogs = logs.filter(l => !(l.date && l.date.startsWith(date)));
        const newEntries: DailyLogEntry[] = employees.map(emp => ({
            id: `log-${Date.now()}-${emp.id}`,
            employeeId: emp.id,
            date,
            logType: 'Present'
        }));
        onSetDailyLogs([...otherLogs, ...newEntries]);
        toast.success(`Marked all ${employees.length} employees Present`);
    };

    const getStatus = (empId: string) => {
        const log = logs.find(l => l.employeeId === empId && l.date && l.date.startsWith(date));
        return log?.logType;
    };

    // Default employees if list is empty for demo/preview
    const displayEmployees = employees.length > 0 ? employees : [
        { id: 'emp-1', name: 'David Beridze', employeeType: 'Chief Agronomist' },
        { id: 'emp-2', name: 'Levan Maisuradze', employeeType: 'Tractor Operator' },
        { id: 'emp-3', name: 'Nino Kalandadze', employeeType: 'Quality Inspector' },
        { id: 'emp-4', name: 'Giorgi Tkeshelashvili', employeeType: 'Irrigation Lead' }
    ] as unknown as Employee[];

    return (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-full flex flex-col justify-between">
            <div>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {t('dash.widget.attendance')}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                                {t('staff_widget.hr_synced')}
                            </span>
                        </div>
                        <p className="text-xl font-black text-slate-800 tracking-tight mt-0.5">
                            {t('staff_widget.present_summary')
                                .replace('{present}', String(stats.present))
                                .replace('{total}', String(stats.total || displayEmployees.length))}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Quick Access to HR Button */}
                        <button
                            onClick={() => {
                                if (onNavigateMode) onNavigateMode('tools');
                                else window.dispatchEvent(new CustomEvent('agrimap_set_mode', { detail: 'tools' }));
                            }}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            title={t('staff_widget.open_hr_quick')}
                        >
                            <Briefcase size={12} />
                            <span>{t('staff_widget.open_hr_quick')}</span>
                        </button>

                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            className="bg-slate-50 px-2 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 outline-none border border-slate-200" 
                        />
                    </div>
                </div>

                {/* KPI stats */}
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                    <div className="text-center p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-[8px] text-emerald-600 font-black uppercase tracking-widest mb-0.5">{t('staff_widget.present')}</p>
                        <p className="text-xl font-black text-emerald-700">{stats.present}</p>
                    </div>
                    <div className="text-center p-3 bg-rose-50 rounded-2xl border border-rose-100">
                        <p className="text-[8px] text-rose-600 font-black uppercase tracking-widest mb-0.5">{t('staff_widget.absent')}</p>
                        <p className="text-xl font-black text-rose-700">{stats.absent}</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-2xl border border-amber-100">
                        <p className="text-[8px] text-amber-600 font-black uppercase tracking-widest mb-0.5">{t('staff_widget.late')}</p>
                        <p className="text-xl font-black text-amber-700">{stats.late}</p>
                    </div>
                </div>

                {/* Quick actions & list */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        {t('staff_widget.roster').replace('{count}', String(displayEmployees.length))}
                    </span>
                    <div className="flex items-center gap-2">
                        {onSetDailyLogs && (
                            <button
                                type="button"
                                onClick={handleMarkAllPresent}
                                className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider transition-colors cursor-pointer"
                            >
                                {t('staff_widget.mark_all_present')}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsExpanded(prev => !prev)}
                            className="text-[9px] font-black text-slate-500 hover:text-slate-700 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                        >
                            {isExpanded ? t('staff_widget.collapse') : t('staff_widget.expand')}
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                    </div>
                </div>

                {isExpanded && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {displayEmployees.map(emp => {
                            const status = getStatus(emp.id);
                            return (
                                <div key={emp.id} className="flex justify-between items-center p-2.5 bg-slate-50/80 border border-slate-100 rounded-xl">
                                    <div className="min-w-0 pr-2">
                                        <span className="text-xs font-black text-slate-800 truncate block">{emp.name}</span>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider truncate">{emp.employeeType || 'Staff'}</p>
                                    </div>
                                    <div className="flex gap-1 shrink-0 items-center">
                                        <button
                                            type="button"
                                            onClick={() => handleLog(emp.id, 'Present')}
                                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                status === 'Present' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-500 border border-slate-200 hover:text-emerald-600'
                                            }`}
                                            title="Mark Present"
                                        >
                                            P
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleLog(emp.id, 'Absent')}
                                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                status === 'Absent' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-slate-500 border border-slate-200 hover:text-rose-600'
                                            }`}
                                            title="Mark Absent"
                                        >
                                            A
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleLog(emp.id, 'Late')}
                                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                status === 'Late' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white text-slate-500 border border-slate-200 hover:text-amber-600'
                                            }`}
                                            title="Mark Late"
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

            {/* Operational Footer with prominent Open HR Module Action */}
            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center gap-2">
                <button
                    onClick={() => {
                        if (onNavigateMode) onNavigateMode('tools');
                        else window.dispatchEvent(new CustomEvent('agrimap_set_mode', { detail: 'tools' }));
                    }}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm shadow-indigo-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                    <Briefcase size={13} />
                    <span>{t('staff_widget.open_hr_full')}</span>
                    <ChevronRight size={13} />
                </button>
            </div>
        </div>
    );
};
