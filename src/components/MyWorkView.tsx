import React, { useMemo, useState } from 'react';
import {
    Briefcase,
    Clock,
    Scale,
    Wallet,
    ChevronDown,
    ChevronRight,
    Compass,
    UserCheck,
    Star,
    FileText,
    CheckCircle2,
    Building2
} from 'lucide-react';
import type {
    AppMode,
    Employee,
    HarvestEntry,
    Membership,
    Organization,
    Review,
    Role,
    Transaction,
    User,
    WorkAssignment
} from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkerAccount } from '../worker/useWorkerAccount';
import { personalTasks } from '../worker/activities';
import { summarizeWorker } from '../worker/summary';
import { OfferServiceModal } from './OfferServiceModal';

interface MyWorkViewProps {
    currentUser: User | null;
    activeOrg: Organization | null;
    memberships: Membership[];
    organizations: Organization[];
    discoverableOrganizations?: Organization[];
    employees?: Employee[];
    harvestEntries?: HarvestEntry[];
    transactions?: Transaction[];
    workAssignments?: WorkAssignment[];
    reviews?: Review[];
    roles?: Role[];
    onUpdateUser?: (user: User) => void | Promise<void>;
    onNavigateMode: (mode: AppMode) => void;
}

export const MyWorkView: React.FC<MyWorkViewProps> = ({
    currentUser,
    activeOrg,
    memberships,
    organizations,
    discoverableOrganizations = [],
    employees = [],
    harvestEntries = [],
    transactions = [],
    workAssignments = [],
    reviews = [],
    onUpdateUser,
    onNavigateMode
}) => {
    const { language } = useLanguage();
    const isKa = language === 'ka';

    const [detailTab, setDetailTab] = useState<'activities' | 'harvest' | 'payroll'>('activities');
    const [showWorkDetails, setShowWorkDetails] = useState(true);
    const [showProfileDrawer, setShowProfileDrawer] = useState(false);
    const [isOfferServiceOpen, setIsOfferServiceOpen] = useState(false);

    const {
        activeMembership,
        linkedEmployee,
        activities,
        harvestEntries: workerHarvest,
        transactions: workerTx,
        reviews: workerReviews
    } = useWorkerAccount({
        currentUser,
        activeOrg,
        memberships,
        employees,
        harvestEntries,
        transactions,
        workAssignments,
        reviews
    });

    const summary = useMemo(
        () =>
            summarizeWorker({
                harvestEntries: workerHarvest,
                activities,
                transactions: workerTx
            }),
        [workerHarvest, activities, workerTx]
    );

    const assignedTasks = useMemo(
        () => personalTasks(linkedEmployee?.id, workAssignments),
        [linkedEmployee?.id, workAssignments]
    );

    const currentEmployer = useMemo(() => {
        const orgId = activeMembership?.organizationId || activeOrg?.id;
        if (!orgId) return null;
        return (
            organizations.find(o => o.id === orgId) ||
            discoverableOrganizations.find(o => o.id === orgId) ||
            null
        );
    }, [activeMembership?.organizationId, activeOrg?.id, organizations, discoverableOrganizations]);

    const services = currentUser?.servicesOffered || [];
    const experiences = currentUser?.workHistory || [];

    return (
        <div className="flex-1 h-full overflow-y-auto bg-slate-50/80 p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-700 flex items-center justify-center shrink-0">
                            <Wallet size={22} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                                {isKa ? 'ჩემი სამუშაო და ანაზღაურება' : 'My Work & Earnings'}
                            </h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {currentEmployer ? (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Building2 size={13} className="text-emerald-600" />
                                        <strong className="text-slate-700">{currentEmployer.name}</strong>
                                        <span>·</span>
                                        <span>{activeMembership?.role || linkedEmployee?.role || 'Employee'}</span>
                                    </span>
                                ) : (
                                    <span>
                                        {isKa
                                            ? 'დამოუკიდებელი ანგარიში — დაუკავშირდით კომპანიებს ან შესთავაზეთ სერვისი'
                                            : 'Independent account — connect with farms or offer services'}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onNavigateMode('community')}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                        >
                            <Compass size={15} />
                            <span>{isKa ? 'პარტნიორისა და სამუშაოს ძიება' : 'Find Partner & Work'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onNavigateMode('profile')}
                            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                            {isKa ? 'პროფილი და არჩევანი' : 'Profile & Onboarding'}
                        </button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                            <span>{isKa ? 'დაკრეფილი მოსავალი' : 'Picked Harvest'}</span>
                            <Scale size={16} className="text-emerald-600" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 mt-2 tabular-nums">
                            {summary.totalPickedKg.toLocaleString()} <span className="text-xs font-semibold text-slate-500">kg</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                            {summary.recentHarvestCount} {isKa ? 'ჩანაწერი' : 'weighings'}
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                            <span>{isKa ? 'სამუშაო საათები' : 'Work Hours'}</span>
                            <Clock size={16} className="text-indigo-600" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 mt-2 tabular-nums">
                            {summary.totalWorkHours.toLocaleString()} <span className="text-xs font-semibold text-slate-500">h</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                            {summary.completedCount} {isKa ? 'დასრულებული' : 'completed'} · {summary.pendingCount} {isKa ? 'მიმდინარე' : 'active'}
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                            <span>{isKa ? 'დავალებები' : 'Assigned Tasks'}</span>
                            <Briefcase size={16} className="text-amber-600" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 mt-2 tabular-nums">
                            {assignedTasks.length}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                            {linkedEmployee
                                ? (isKa ? 'მიბმულია თანამშრომლის ჩანაწერზე' : 'Linked to employee record')
                                : (isKa ? 'კომპანიაზე მიბმა არ არის' : 'No linked employee yet')}
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                            <span>{isKa ? 'სახელფასო ბალანსი' : 'Payroll Balances'}</span>
                            <Wallet size={16} className="text-emerald-600" />
                        </div>
                        {summary.balancesByCurrency.length === 0 ? (
                            <>
                                <p className="text-2xl font-black text-slate-900 mt-2 tabular-nums">0.00</p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    {isKa ? 'ტრანზაქციები ჯერ არ არის' : 'No payroll transactions yet'}
                                </p>
                            </>
                        ) : (
                            <div className="mt-2 space-y-1.5">
                                {summary.balancesByCurrency.map(b => (
                                    <div key={b.currency} className="flex items-baseline justify-between gap-2">
                                        <span className="text-xs font-bold text-slate-500">{b.currency}</span>
                                        <span className="text-base font-black text-slate-900 tabular-nums">
                                            {b.balance.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                                <p className="text-[10px] text-slate-400">
                                    {isKa ? 'თითოეული ვალუტა ნაჩვენებია კონვერტაციის გარეშე' : 'Exact per-currency balances (no FX conversion)'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Per-Currency Payroll Breakdown (if any) */}
                {summary.balancesByCurrency.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                            {isKa ? 'ანაზღაურების დეტალები ვალუტების მიხედვით' : 'Earnings & Payouts by Currency'}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {summary.balancesByCurrency.map(b => (
                                <div key={b.currency} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-900">{b.currency}</span>
                                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md tabular-nums">
                                            {isKa ? 'ნაშთი:' : 'Due:'} {b.balance.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-600 tabular-nums">
                                        <span>{isKa ? 'დარიცხული:' : 'Accrued:'}</span>
                                        <span className="font-semibold text-slate-800">{b.accrued.toFixed(2)} {b.currency}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-600 tabular-nums">
                                        <span>{isKa ? 'გაცემული:' : 'Paid:'}</span>
                                        <span className="font-semibold text-emerald-700">{b.paid.toFixed(2)} {b.currency}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Expandable Work History & Earnings Detail */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowWorkDetails(v => !v)}
                        className="w-full px-5 py-4 flex items-center justify-between bg-slate-50/70 border-b border-slate-200 text-left cursor-pointer"
                    >
                        <div className="flex items-center gap-2.5">
                            {showWorkDetails ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                            <span className="text-sm font-bold text-slate-900">
                                {isKa ? 'სამუშაოს, მოსავლისა და ანაზღაურების ჩანაწერები' : 'Work, Harvest & Payroll History'}
                            </span>
                        </div>
                        <span className="text-xs text-slate-500 tabular-nums">
                            {activities.length + workerTx.length} {isKa ? 'ჩანაწერი' : 'records'}
                        </span>
                    </button>

                    {showWorkDetails && (
                        <div className="p-5 space-y-4">
                            <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
                                {([
                                    { id: 'activities', label: isKa ? `აქტივობები (${activities.length})` : `Activities (${activities.length})` },
                                    { id: 'harvest', label: isKa ? `მოსავალი (${workerHarvest.length})` : `Harvest (${workerHarvest.length})` },
                                    { id: 'payroll', label: isKa ? `ანაზღაურება (${workerTx.length})` : `Payroll (${workerTx.length})` }
                                ] as const).map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setDetailTab(tab.id)}
                                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                            detailTab === tab.id
                                                ? 'bg-slate-900 text-white border-slate-900'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {detailTab === 'activities' && (
                                activities.length === 0 ? (
                                    <p className="text-xs text-slate-500 py-6 text-center">
                                        {isKa ? 'სამუშაო აქტივობები ჯერ არ არის დაფიქსირებული.' : 'No work activities recorded yet.'}
                                    </p>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {activities.slice(0, 30).map(act => {
                                            const sourceLabel = String(act.source || (act as any).kind || 'activity').replace(/_/g, ' ');
                                            const parsedDate = act.date ? new Date(act.date) : null;
                                            const dateLabel =
                                                parsedDate && !Number.isNaN(parsedDate.getTime())
                                                    ? parsedDate.toLocaleDateString()
                                                    : String(act.date || '—');
                                            return (
                                                <div key={act.id} className="py-3 flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-slate-900 truncate">
                                                            {act.title || (isKa ? 'სამუშაო აქტივობა' : 'Work Activity')}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                                                            {dateLabel} · {sourceLabel}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0 text-xs tabular-nums">
                                                        {act.hours ? <span className="font-semibold text-indigo-700">{act.hours} h</span> : null}
                                                        {act.kg ? <span className="font-semibold text-emerald-700">{act.kg} kg</span> : null}
                                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                                                            {act.status || 'logged'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}

                            {detailTab === 'harvest' && (
                                workerHarvest.length === 0 ? (
                                    <p className="text-xs text-slate-500 py-6 text-center">
                                        {isKa ? 'მოსავლის ჩანაწერები ჯერ არ არის.' : 'No harvest entries recorded yet.'}
                                    </p>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {workerHarvest.slice(0, 30).map((entry: any) => (
                                            <div key={entry.id} className="py-3 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-slate-900 truncate">
                                                        {entry.cropName || entry.variety || (isKa ? 'მოსავლის აწონვა' : 'Harvest Weighing')}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 tabular-nums">
                                                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : entry.date || '—'}
                                                    </p>
                                                </div>
                                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg tabular-nums shrink-0">
                                                    {Number(entry.weightKg ?? entry.netWeight ?? entry.weight ?? 0).toFixed(2)} kg
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}

                            {detailTab === 'payroll' && (
                                workerTx.length === 0 ? (
                                    <p className="text-xs text-slate-500 py-6 text-center">
                                        {isKa ? 'სახელფასო ტრანზაქციები ჯერ არ არის.' : 'No payroll transactions found.'}
                                    </p>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {workerTx.slice(0, 30).map((tx: any) => (
                                            <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-slate-900 truncate">
                                                        {tx.description || tx.category || (isKa ? 'ანაზღაურება' : 'Payroll Entry')}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 tabular-nums">
                                                        {tx.date ? new Date(tx.date).toLocaleDateString() : '—'}
                                                    </p>
                                                </div>
                                                <span className="text-xs font-bold text-slate-900 tabular-nums shrink-0">
                                                    {Number(tx.amount || 0).toFixed(2)} {String(tx.currency || 'GEL').toUpperCase()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* Collapsible CV, Services & Reviews Drawer */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowProfileDrawer(v => !v)}
                        className="w-full px-5 py-4 flex items-center justify-between bg-slate-50/70 border-b border-slate-200 text-left cursor-pointer"
                    >
                        <div className="flex items-center gap-2.5">
                            {showProfileDrawer ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                            <UserCheck size={16} className="text-emerald-600" />
                            <span className="text-sm font-bold text-slate-900">
                                {isKa ? 'ჩემი CV, სერვისები და შეფასებები' : 'My CV, Services & Reviews'}
                            </span>
                        </div>
                        <span className="text-xs text-slate-500 tabular-nums">
                            {services.length} {isKa ? 'სერვისი' : 'services'} · {workerReviews.length} {isKa ? 'შეფასება' : 'reviews'}
                        </span>
                    </button>

                    {showProfileDrawer && (
                        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
                            {/* Services Offered */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                        <Briefcase size={13} />
                                        {isKa ? 'შეთავაზებული სერვისები' : 'Services Offered'}
                                    </h3>
                                    {currentUser && onUpdateUser && (
                                        <button
                                            type="button"
                                            onClick={() => setIsOfferServiceOpen(true)}
                                            className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                                        >
                                            {isKa ? 'რედაქტირება' : 'Manage'}
                                        </button>
                                    )}
                                </div>
                                {services.length === 0 ? (
                                    <p className="text-xs text-slate-500">
                                        {isKa ? 'სერვისები ჯერ არ არის მითითებული.' : 'No services added yet.'}
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {services.map(s => (
                                            <span key={s} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold inline-flex items-center gap-1">
                                                <CheckCircle2 size={12} />
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Work Experience / CV */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <FileText size={13} />
                                    {isKa ? 'სამუშაო გამოცდილება (CV)' : 'Work Experience (CV)'}
                                </h3>
                                {experiences.length === 0 ? (
                                    <p className="text-xs text-slate-500">
                                        {isKa ? 'დაამატეთ გამოცდილება პროფილის გვერდიდან.' : 'Add work history from your Profile page.'}
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {experiences.slice(0, 5).map(exp => (
                                            <div key={exp.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                                                <p className="text-xs font-bold text-slate-900">{exp.title}</p>
                                                <p className="text-[11px] text-slate-600">{exp.company}</p>
                                                <p className="text-[10px] text-slate-400 tabular-nums mt-0.5">
                                                    {exp.startDate} – {exp.endDate || (isKa ? 'დღემდე' : 'Present')}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Reviews */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <Star size={13} />
                                    {isKa ? 'შეფასებები' : 'Reviews'}
                                </h3>
                                {workerReviews.length === 0 ? (
                                    <p className="text-xs text-slate-500">
                                        {isKa ? 'შეფასებები ჯერ არ არის.' : 'No reviews yet.'}
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {workerReviews.slice(0, 5).map((rev: any) => (
                                            <div key={rev.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-slate-800">{rev.reviewerName || 'Reviewer'}</span>
                                                    <span className="text-xs font-bold text-amber-600 tabular-nums">{rev.rating}/5</span>
                                                </div>
                                                {rev.comment && <p className="text-[11px] text-slate-600">{rev.comment}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {currentUser && onUpdateUser && (
                <OfferServiceModal
                    isOpen={isOfferServiceOpen}
                    onClose={() => setIsOfferServiceOpen(false)}
                    user={currentUser}
                    onUpdateUser={onUpdateUser}
                    organizations={organizations}
                />
            )}
        </div>
    );
};

export default MyWorkView;
