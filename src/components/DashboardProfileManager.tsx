import React, { useMemo, useState } from 'react';
import { 
    User, PlantationFeature, Employee, InventoryItem, 
    HarvestEvent, Account, WorkAssignment, Listing, AppMode, NutritionPlan 
} from '../types';
import { 
    User as UserIcon, ShieldCheck, Building2, MapPin, 
    Tractor, Package, Banknote, Users, Sparkles, BookOpen, 
    ArrowRight, AlertCircle, ShoppingBag, 
    Activity, ChevronRight, ChevronUp, ChevronDown, Compass, Cpu,
    Sprout, CheckSquare, ShieldAlert
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { safeStorage } from '../services/storageService';
import { ModuleSopGuideModal, MODULE_TO_SOP_ID } from './Help/ModuleSopGuideModal';

export interface UserOnboardingStatus {
    isProfileVerified: boolean;
    isCompanyRegistered: boolean;
    isRoleChosen: boolean;
    needsAttention: boolean;
}

export const getUserOnboardingStatus = (
    currentUser?: User | null,
    activeOrgId?: string | null,
    organizations: any[] = [],
    memberships: any[] = []
): UserOnboardingStatus => {
    const isGuest = !currentUser || Boolean(currentUser.isGuest) || currentUser.id === 'guest' || currentUser.email?.toLowerCase() === 'guest@agrimap.io';

    const isProfileVerified = Boolean(
        currentUser &&
        !isGuest &&
        (
            currentUser.verificationStatus === 'verified' ||
            (currentUser.verificationStatus as any) === 'full_verified' ||
            currentUser.kycStatus === 'approved' ||
            currentUser.isVerified === true
        )
    );

    const isRoleChosen = Boolean(
        currentUser &&
        !isGuest &&
        (
            (currentUser.primaryGoal && String(currentUser.primaryGoal).toUpperCase() !== 'GUEST') ||
            (Array.isArray(currentUser.roles) && currentUser.roles.some(r => r && String(r).toLowerCase() !== 'guest')) ||
            (currentUser.activeRole && String(currentUser.activeRole).toLowerCase() !== 'guest')
        )
    );

    const isCompanyRegistered = Boolean(
        !isGuest && (
            activeOrgId ||
            (organizations || []).some(
                o =>
                    (currentUser?.id && o?.createdBy === currentUser.id) ||
                    (currentUser?.currentOrgId && o?.id === currentUser.currentOrgId) ||
                    (memberships || []).some(m => m?.userId === currentUser?.id && m?.organizationId === o?.id)
            ) ||
            currentUser?.companyUniqueId ||
            currentUser?.companyName?.trim()
        )
    );

    return {
        isProfileVerified,
        isCompanyRegistered,
        isRoleChosen,
        needsAttention: !isProfileVerified || !isRoleChosen
    };
};

export const useProfileCompleteness = (currentUser: User | null | undefined, isKa: boolean) => {
    return useMemo(() => {
        if (!currentUser) return { score: 20, missing: [isKa ? 'პროფილის შექმნა' : 'Profile creation'] };
        let points = 0;
        const missing: string[] = [];

        if (currentUser.name && currentUser.name.trim() && currentUser.name !== 'Guest User' && currentUser.name !== 'Guest Explorer') {
            points += 20;
        } else {
            missing.push(isKa ? 'სრული სახელი' : 'Full Name');
        }

        if (currentUser.email && currentUser.email.trim() && currentUser.email !== 'guest@agrimap.io') {
            points += 20;
        } else {
            missing.push(isKa ? 'ელ-ფოსტა' : 'Email Address');
        }

        if (currentUser.phone && currentUser.phone.trim()) {
            points += 20;
        } else {
            missing.push(isKa ? 'ტელეფონის ნომერი' : 'Phone Number');
        }

        if (currentUser.country && currentUser.country.trim()) {
            points += 15;
        } else {
            missing.push(isKa ? 'ქვეყანა / რეგიონი' : 'Country/Region');
        }

        if (
            !currentUser.isGuest &&
            (currentUser.verificationStatus === 'verified' ||
                (currentUser.verificationStatus as any) === 'full_verified' ||
                currentUser.kycStatus === 'approved' ||
                currentUser.isVerified === true)
        ) {
            points += 25;
        } else {
            missing.push(isKa ? 'პირადობის ვერიფიკაცია (KYC)' : 'Identity Verification (KYC)');
        }

        return { score: Math.min(100, Math.max(15, points)), missing };
    }, [currentUser, isKa]);
};

export interface DashboardProfileManagerProps {
    currentUser?: User | null;
    plantationFeatures?: PlantationFeature[];
    organizations?: any[];
    memberships?: any[];
    activeOrgId?: string | null;
    employees?: Employee[];
    inventoryItems?: InventoryItem[];
    harvestEvents?: HarvestEvent[];
    accounts?: Account[];
    workAssignments?: WorkAssignment[];
    nutritionPlans?: NutritionPlan[];
    listings?: Listing[];
    onNavigateMode?: (mode: AppMode) => void;
    onOpenProfile?: () => void;
    onOpenHelp?: () => void;
}

const isUserRootAdmin = (currentUser?: User | null): boolean => {
    if (!currentUser) return false;
    return Boolean(
        currentUser.roles?.includes('ROOT_SUPER_ADMIN') ||
        currentUser.roles?.some(r => ['root', 'superadmin', 'super_admin', 'root_super_admin'].includes(String(r).toLowerCase())) ||
        (currentUser as any)?.role === 'ROOT_SUPER_ADMIN' ||
        (currentUser as any)?.role === 'root' ||
        (currentUser as any)?.role === 'superadmin' ||
        (currentUser as any)?.isRoot === true ||
        currentUser.id === 'root-system' ||
        currentUser.email?.toLowerCase() === 'nishno@agrimap.pro' ||
        currentUser.email?.toLowerCase() === 'giorgi.nishno@gmail.com' ||
        currentUser.email?.toLowerCase() === 'giorgi@agrimap.pro' ||
        currentUser.email?.toLowerCase() === 'admin@agrimap.io'
    );
};

// 1. STANDALONE PROFILE & KYC VERIFICATION WIDGET
export const ProfileVerificationWidget: React.FC<DashboardProfileManagerProps> = ({
    currentUser,
    organizations = [],
    memberships = [],
    activeOrgId,
    onNavigateMode,
    onOpenProfile,
}) => {
    const { language } = useLanguage();
    const isKa = language === 'ka';
    const profileCompleteness = useProfileCompleteness(currentUser, isKa);
    const onboarding = useMemo(
        () => getUserOnboardingStatus(currentUser, activeOrgId, organizations, memberships),
        [currentUser, activeOrgId, organizations, memberships]
    );
    const isRootOrSuperAdmin = useMemo(() => isUserRootAdmin(currentUser), [currentUser]);
    const currentOrg = useMemo(() => {
        if (!activeOrgId) return null;
        return organizations.find(o => o.id === activeOrgId || o.organizationId === activeOrgId);
    }, [organizations, activeOrgId]);

    const shouldBlink = !onboarding.isProfileVerified || !onboarding.isRoleChosen;

    return (
        <div
            className={`h-full bg-white rounded-[2.5rem] p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group transition-all ${
                shouldBlink
                    ? 'border-2 border-amber-400 shadow-lg shadow-amber-200/60 agrimap-blink-alert'
                    : 'border border-slate-200/80 shadow-sm hover:border-indigo-200'
            }`}
        >
            <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10 ${
                shouldBlink ? 'bg-amber-100/70' : 'bg-indigo-50/50'
            }`} />

            <div className="relative z-10">
                {/* Blinking Verification / Role Alert Banner */}
                {shouldBlink && (
                    <div className="mb-3.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border border-amber-300 flex items-center justify-between gap-2 animate-pulse">
                        <div className="flex items-center gap-2 min-w-0">
                            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                            <span className="text-[11px] font-black text-rose-700 truncate">
                                {!onboarding.isProfileVerified && !onboarding.isRoleChosen
                                    ? (isKa ? 'საჭიროა პროფილის ვერიფიკაცია და როლის არჩევა!' : 'Verification & Role Selection Required!')
                                    : !onboarding.isProfileVerified
                                        ? (isKa ? 'გთხოვთ გაიაროთ პროფილის ვერიფიკაცია (KYC)!' : 'Action Required: Verify Your Profile (KYC)!')
                                        : (isKa ? 'გთხოვთ აირჩიოთ თქვენი სამუშაო როლი!' : 'Action Required: Choose Your Operational Role!')}
                            </span>
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                    </div>
                )}

                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-14 h-14 rounded-2xl text-white flex items-center justify-center font-black text-xl shadow-md uppercase shrink-0 ${
                            shouldBlink
                                ? 'bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 shadow-amber-200'
                                : 'bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-700 shadow-indigo-100'
                        }`}>
                            {currentUser?.name ? currentUser.name.charAt(0) : (currentUser?.email ? currentUser.email.charAt(0) : 'U')}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-black text-slate-800 text-base sm:text-lg tracking-tight truncate">
                                    {currentUser?.name || currentUser?.email || (isKa ? 'მომხმარებელი' : 'Valued User')}
                                </h3>
                                {isRootOrSuperAdmin && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 shrink-0">
                                        ROOT
                                    </span>
                                )}
                            </div>
                            <p className="text-xs font-semibold text-slate-400 truncate">
                                {currentUser?.email || 'authenticated-user@agrimap.pro'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (onOpenProfile) onOpenProfile();
                            else if (onNavigateMode) onNavigateMode('profile');
                        }}
                        className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer shadow-xs ${
                            shouldBlink
                                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-rose-200'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                        }`}
                        title={isKa ? 'პროფილის ვერიფიკაცია და მართვა' : 'Verify & Manage Profile'}
                    >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>{shouldBlink ? (isKa ? 'ვერიფიკაცია' : 'Verify Now') : (isKa ? 'პროფილი' : 'Profile')}</span>
                    </button>
                </div>

                {/* ID & Status Tags */}
                <div className="flex flex-wrap items-center gap-2 py-3 border-y border-slate-100 text-[11px]">
                    <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 font-mono font-bold text-slate-600">
                        <span className="text-slate-400 mr-1">ID:</span>
                        {currentUser?.globalUniqueId || currentUser?.individualUniqueId || currentUser?.id?.slice(0, 8) || 'G-001'}
                    </div>

                    <div className="px-2.5 py-1 rounded-lg bg-blue-50/80 border border-blue-100 font-medium text-blue-800 flex items-center gap-1.5 truncate max-w-[200px]">
                        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate font-bold">
                            {currentOrg?.name || (isKa ? 'პირადი სამუშაო სივრცე' : 'Personal Workspace')}
                        </span>
                    </div>

                    <div className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 ${
                        onboarding.isProfileVerified
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-300 animate-pulse'
                    }`}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>
                            {onboarding.isProfileVerified
                                ? (isKa ? 'ვერიფიცირებული' : 'Verified KYC')
                                : (isKa ? 'ვერიფიკაცია საჭიროა' : 'KYC Pending')}
                        </span>
                    </div>
                </div>

                {/* Profile Completeness Meter */}
                <div className="mt-4">
                    <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                        <span className="text-slate-500 uppercase text-[10px] tracking-wider">
                            {isKa ? 'პროფილის სისრულე' : 'Profile Completeness'}
                        </span>
                        <span className={`font-black ${profileCompleteness.score >= 80 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                            {profileCompleteness.score}%
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                                profileCompleteness.score >= 80
                                    ? 'bg-emerald-500'
                                    : shouldBlink
                                        ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                                        : 'bg-gradient-to-r from-indigo-500 to-blue-500'
                            }`}
                            style={{ width: `${profileCompleteness.score}%` }}
                        />
                    </div>
                    {profileCompleteness.missing.length > 0 && (
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium truncate">
                            <span className="font-bold text-slate-500">{isKa ? 'შესავსებია:' : 'Missing:'}</span> {profileCompleteness.missing.join(', ')}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

// 2. STANDALONE MANAGE PROFILE / INTELLIGENT ONBOARDING NAVIGATOR WIDGET
export const OnboardingNavigatorWidget: React.FC<DashboardProfileManagerProps> = ({
    currentUser,
    plantationFeatures = [],
    organizations = [],
    memberships = [],
    activeOrgId,
    employees = [],
    inventoryItems = [],
    harvestEvents = [],
    onNavigateMode,
    onOpenProfile,
    onOpenHelp,
}) => {
    const { language } = useLanguage();
    const isKa = language === 'ka';
    const profileCompleteness = useProfileCompleteness(currentUser, isKa);
    const onboarding = useMemo(
        () => getUserOnboardingStatus(currentUser, activeOrgId, organizations, memberships),
        [currentUser, activeOrgId, organizations, memberships]
    );
    const shouldBlink = !onboarding.isProfileVerified || !onboarding.isRoleChosen;

    const nextStepRecommendation = useMemo(() => {
        if (!onboarding.isProfileVerified || !onboarding.isRoleChosen || profileCompleteness.score < 60) {
            if (onboarding.isProfileVerified && !onboarding.isRoleChosen) {
                return {
                    stepNumber: 1,
                    title: isKa ? 'ეტაპი 1: აირჩიეთ თქვენი სამუშაო როლი' : 'Step 1: Choose Your Operational Role',
                    description: isKa
                        ? 'თქვენი პროფილი ვერიფიცირებულია! ახლა აირჩიეთ თქვენი როლი (ფერმერი, დამფუძნებელი, აგრონომი, მუშაკი ან მყიდველი), რათა სისტემა მოერგოს თქვენს სამუშაოს.'
                        : 'Your profile is verified! Now select your primary role (Company Manager, Worker, Agronomist, Service Provider, or Buyer) to unlock role-specific workspaces.',
                    actionText: isKa ? 'როლის არჩევა / პროფილი' : 'Choose Role & Manage Profile',
                    targetMode: 'profile' as AppMode,
                    icon: <UserIcon className="w-5 h-5 text-amber-400" />
                };
            }
            return {
                stepNumber: 1,
                title: isKa ? 'ეტაპი 1: პროფილის ვერიფიკაცია და როლის არჩევა' : 'Step 1: Complete Verification & Choose Your Role',
                description: isKa 
                    ? 'რეგისტრაციის შემდგომ პირველი აუცილებელი ნაბიჯია პირადი მონაცემების ვერიფიკაცია (KYC) და თქვენი სამუშაო როლის არჩევა.' 
                    : 'Verify your identity (KYC), complete contact details, and choose your operational role. Once completed, onboarding cards automatically clear from your dashboard.',
                actionText: isKa ? 'პროფილის მართვა' : 'Manage Profile',
                targetMode: 'profile' as AppMode,
                icon: <UserIcon className="w-5 h-5 text-amber-400" />
            };
        }

        if (!activeOrgId && (!organizations || organizations.length === 0)) {
            return {
                stepNumber: 2,
                title: isKa ? 'ეტაპი 2: აგრო-კომპანიის რეგისტრაცია' : 'Step 2: Register Your Company & Founders',
                description: isKa 
                    ? 'შექმენით თქვენი აგრო-საწარმო დამფუძნებელთა ჰაბში (Founders Hub), რათა მიიღოთ წვდომა პლანტაციებსა და გუნდზე.' 
                    : 'Register your agricultural company in Founders Hub to establish enterprise ownership, co-founders, and land management.',
                actionText: isKa ? 'კომპანიის რეგისტრაცია' : 'Register Company',
                targetMode: 'founders' as AppMode,
                icon: <Building2 className="w-5 h-5 text-purple-400" />
            };
        }

        const boundaryFeatures = plantationFeatures.filter(f => f.type === 'boundary' || f.type === 'area');
        if (boundaryFeatures.length === 0) {
            return {
                stepNumber: 3,
                title: isKa ? 'ეტაპი 3: პლანტაციის მოძიება რუკაზე და საზღვრების მოხაზვა' : 'Step 3: Locate Plantation & Draw Boundaries',
                description: isKa 
                    ? 'გადადით რუკაზე (Design), მოძებნეთ თქვენი მიწის ნაკვეთი სატელიტზე და მოხაზეთ პლანტაციის საზღვრის პოლიგონი.' 
                    : 'Locate your agricultural parcel on satellite imagery and draw your plantation boundary polygon to calculate hectares.',
                actionText: isKa ? 'რუკაზე გადასვლა' : 'Open Map & Design',
                targetMode: 'design' as AppMode,
                icon: <MapPin className="w-5 h-5 text-emerald-400" />
            };
        }

        if (employees.length === 0) {
            return {
                stepNumber: 4,
                title: isKa ? 'ეტაპი 4: მუშახელის და გუნდის რეგისტრაცია' : 'Step 4: Register Agricultural Personnel & Workers',
                description: isKa 
                    ? 'დაარეგისტრირეთ მკრეფავები, აგრონომები და თანამშრომლები HR & Tools მოდულში ყოველდღიური აღრიცხვისთვის.' 
                    : 'Add field pickers, agronomists, and machinery operators in HR & Tools for automated daily attendance and harvest piece-rates.',
                actionText: isKa ? 'თანამშრომლების დამატება' : 'Register Workers',
                targetMode: 'tools' as AppMode,
                icon: <Users className="w-5 h-5 text-blue-400" />
            };
        }

        if (inventoryItems.length === 0) {
            return {
                stepNumber: 5,
                title: isKa ? 'ეტაპი 5: საწყობისა და მარაგების დამატება' : 'Step 5: Setup Warehouse & Packaging Inventory',
                description: isKa 
                    ? 'დაამატეთ ყუთები, პუნეტები, სასუქები და ნერგები მარაგების მოდულში ავტომატური ჩამოწერისთვის.' 
                    : 'Add packaging crates, punets, and fertilizers in Warehouse Stock to enable automatic deductions during harvesting.',
                actionText: isKa ? 'მარაგების მართვა' : 'Setup Stock',
                targetMode: 'stock' as AppMode,
                icon: <Package className="w-5 h-5 text-amber-400" />
            };
        }

        const activeHarvest = harvestEvents.find(h => h.status === 'active');
        if (!activeHarvest) {
            return {
                stepNumber: 6,
                title: isKa ? 'ეტაპი 6: მოსავლის აღების სესიის ინიცირება' : 'Step 6: Initialize Harvest Session & Weigh Station',
                description: isKa 
                    ? 'სისტემა სრულად მზადაა! შექმენით მოსავლის ღონისძიება და გაუშვით ელექტრონული ამწონი პუნქტი.' 
                    : 'System is operational! Launch a Harvest Event and start live scale weighing or smart crate counting protocols.',
                actionText: isKa ? 'მოსავლის აღება' : 'Start Harvest',
                targetMode: 'harvesting' as AppMode,
                icon: <Tractor className="w-5 h-5 text-rose-400" />
            };
        }

        return {
            stepNumber: 7,
            title: isKa ? 'ოპერაციული რეჟიმი აქტიურია: მონიტორინგი & ანალიტიკა' : 'Live Operations Active: Telemetry & AI Stream',
            description: isKa 
                ? 'მიმდინარეობს მოსავლის აღება. აკონტროლეთ ცოცხალი ამწონი პუნქტი, მარაგები და AI ანომალიების ნაკადი.' 
                : 'Active harvesting session in progress. Supervise weigh stations, real-time box counts, and autonomous AI telemetry.',
            actionText: isKa ? 'მოსავლის მართვა' : 'Monitor Harvest',
            targetMode: 'harvesting' as AppMode,
            icon: <Activity className="w-5 h-5 text-emerald-400" />
        };
    }, [onboarding, profileCompleteness.score, activeOrgId, organizations, plantationFeatures, employees.length, inventoryItems.length, harvestEvents, isKa]);

    const handleExecuteNextStep = () => {
        if (nextStepRecommendation.targetMode === 'profile') {
            if (onOpenProfile) onOpenProfile();
            else if (onNavigateMode) onNavigateMode('profile');
        } else {
            if (onNavigateMode) onNavigateMode(nextStepRecommendation.targetMode);
        }
    };

    const handleForwardToHelp = () => {
        if (onOpenHelp) onOpenHelp();
        else if (onNavigateMode) onNavigateMode('guide');
    };

    return (
        <div
            className={`h-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-[2.5rem] p-6 sm:p-7 text-white shadow-xl flex flex-col justify-between relative overflow-hidden transition-all ${
                shouldBlink
                    ? 'border-2 border-amber-400 shadow-amber-500/25 agrimap-blink-alert'
                    : 'border border-slate-800'
            }`}
        >
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            shouldBlink ? 'bg-amber-500/30 text-amber-300 animate-pulse' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                                {isKa ? 'სისტემის ჭკვიანი გზამკვლევი' : 'Intelligent Onboarding Navigator'}
                            </span>
                            <h4 className="text-sm font-black text-slate-100 tracking-tight">
                                {shouldBlink
                                    ? (isKa ? 'საჭიროა დადასტურება' : 'Action Required to Continue')
                                    : (isKa ? 'რეკომენდებული შემდეგი ნაბიჯი' : 'Recommended Next Step')}
                            </h4>
                        </div>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                        shouldBlink
                            ? 'bg-amber-500/20 text-amber-200 border-amber-400/60 animate-pulse'
                            : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full animate-ping ${shouldBlink ? 'bg-amber-400' : 'bg-indigo-400'}`} />
                        {shouldBlink
                            ? (!onboarding.isProfileVerified
                                ? (isKa ? 'ვერიფიკაცია საჭიროა' : 'Verify Profile')
                                : (isKa ? 'აირჩიეთ როლი' : 'Choose Role'))
                            : (isKa ? `ეტაპი ${nextStepRecommendation.stepNumber} / 7` : `Phase ${nextStepRecommendation.stepNumber} of 7`)}
                    </span>
                </div>

                <div className="mt-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 shrink-0 mt-0.5">
                            {nextStepRecommendation.icon}
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                                {nextStepRecommendation.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed mt-1.5">
                                {nextStepRecommendation.description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative z-10 pt-5 mt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={handleExecuteNextStep}
                    className={`px-5 py-2.5 rounded-xl text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer ${
                        shouldBlink
                            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 shadow-amber-900/40 animate-pulse'
                            : 'bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-indigo-900/30'
                    }`}
                >
                    <span>{nextStepRecommendation.actionText}</span>
                    <ArrowRight className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onClick={handleForwardToHelp}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-bold text-xs transition-all flex items-center gap-2 active:scale-95 cursor-pointer group"
                    title={isKa ? 'დეტალური SOP გზამკვლევი დახმარებაში' : 'View step-by-step SOP in Help'}
                >
                    <BookOpen className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                    <span>{isKa ? 'დეტალები: გადასვლა დახმარებაში' : 'Details: Forward to Help'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>
        </div>
    );
};

// 3. STANDALONE SYSTEM COMMAND & OPERATIONS CENTER WIDGET
export const SystemCommandCenterWidget: React.FC<DashboardProfileManagerProps> = ({
    currentUser,
    plantationFeatures = [],
    organizations = [],
    employees = [],
    inventoryItems = [],
    harvestEvents = [],
    accounts = [],
    workAssignments = [],
    nutritionPlans = [],
    listings = [],
    onNavigateMode,
    onOpenProfile,
    onOpenHelp,
}) => {
    const { language } = useLanguage();
    const isKa = language === 'ka';
    const profileCompleteness = useProfileCompleteness(currentUser, isKa);

    const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
        try {
            return safeStorage.getItem('agrimap_control_panel_collapsed') === 'true';
        } catch {
            return false;
        }
    });

    const toggleCollapse = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            try {
                safeStorage.setItem('agrimap_control_panel_collapsed', String(next));
            } catch (e) {
                console.error('Error persisting collapse state:', e);
            }
            return next;
        });
    };

    const [activeSopModal, setActiveSopModal] = useState<{
        sopId: string;
        title: string;
        icon: React.ReactNode;
        color: string;
        moduleId: AppMode;
    } | null>(null);

    const handleOpenFullSopManual = (sopId: string) => {
        try {
            sessionStorage.setItem('agrimap_focus_sop_id', sopId);
        } catch {
            // ignore storage errors
        }
        if (onOpenHelp) onOpenHelp();
        else if (onNavigateMode) onNavigateMode('guide');
        else window.dispatchEvent(new CustomEvent('agrimap_set_mode', { detail: 'guide' }));
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('agrimap_open_sop_manual'));
            window.dispatchEvent(new CustomEvent('agrimap_focus_sop_id', { detail: sopId }));
        }, 80);
    };

    const handleAskAiGuideForModule = (prompt: string) => {
        try {
            sessionStorage.setItem('agrimap_pending_ai_prompt', prompt);
        } catch {
            // ignore storage errors
        }
        if (onOpenHelp) onOpenHelp();
        else if (onNavigateMode) onNavigateMode('guide');
        else window.dispatchEvent(new CustomEvent('agrimap_set_mode', { detail: 'guide' }));
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('agrimap_ask_ai_guide', { detail: prompt }));
        }, 80);
    };

    const systemModules: Array<{
        id: AppMode;
        title: string;
        desc: string;
        countLabel: string;
        countValue: number | string;
        icon: React.ReactNode;
        color: string;
    }> = [
        {
            id: 'profile',
            title: isKa ? 'პროფილი & იდენტობა' : 'Profile & Identity',
            desc: isKa ? 'პირადი და საკონტაქტო მონაცემები' : 'Personal & verification details',
            countLabel: isKa ? 'სისრულე' : 'Complete',
            countValue: `${profileCompleteness.score}%`,
            icon: <UserIcon className="w-5 h-5" />,
            color: 'from-indigo-600 to-blue-600 text-white'
        },
        {
            id: 'guide',
            title: isKa ? 'დახმარება & SOP გზამკვლევი' : 'Help, SOPs & AI Chat',
            desc: isKa ? 'AI ასისტენტი & მოდულების SOP' : 'AI guide assistant & module SOPs',
            countLabel: isKa ? 'ეტაპები' : 'Protocols',
            countValue: '17 SOPs',
            icon: <BookOpen className="w-5 h-5" />,
            color: 'from-teal-600 to-emerald-600 text-white'
        },
        {
            id: 'design',
            title: isKa ? 'რუკა & პლანტაციის დიზაინი' : 'Plantation Map & GIS',
            desc: isKa ? 'საზღვრები, რიგები, სატელიტი' : 'GPS boundaries, seedling rows',
            countLabel: isKa ? 'ობიექტი' : 'Features',
            countValue: plantationFeatures.length,
            icon: <Compass className="w-5 h-5" />,
            color: 'from-emerald-600 to-teal-700 text-white'
        },
        {
            id: 'founders',
            title: isKa ? 'საწარმო & დამფუძნებლები' : 'Founders & Enterprise',
            desc: isKa ? 'კომპანია, წილები, იურიდიული მონაცემები' : 'Company profile, equity, tax ID',
            countLabel: isKa ? 'საწარმო' : 'Entities',
            countValue: organizations.length || 1,
            icon: <Building2 className="w-5 h-5" />,
            color: 'from-purple-600 to-indigo-700 text-white'
        },
        {
            id: 'harvesting',
            title: isKa ? 'მოსავლის აღება & სასწორი' : 'Harvest & Weigh Station',
            desc: isKa ? 'ცოცხალი ამწონი, ყუთები, პალეტები' : 'Scale weighing, crates, 6 protocols',
            countLabel: isKa ? 'სესიები' : 'Sessions',
            countValue: harvestEvents.length,
            icon: <Tractor className="w-5 h-5" />,
            color: 'from-rose-600 to-pink-700 text-white'
        },
        {
            id: 'stock',
            title: isKa ? 'საწყობი & მარაგები' : 'Warehouse & Inventory',
            desc: isKa ? 'ტარა, სასუქი, ავტო-ჩამოწერა' : 'Crates, chemicals, auto-deduction',
            countLabel: isKa ? 'პოზიცია' : 'Items',
            countValue: inventoryItems.length,
            icon: <Package className="w-5 h-5" />,
            color: 'from-amber-600 to-orange-700 text-white'
        },
        {
            id: 'accounting',
            title: isKa ? 'ფინანსები & აღრიცხვა' : 'Accounting & Ledger',
            desc: isKa ? 'ხარჯები, გაყიდვები, ნაშთები' : 'Labor OPEX, direct sales revenue',
            countLabel: isKa ? 'ანგარიში' : 'Accounts',
            countValue: accounts.length,
            icon: <Banknote className="w-5 h-5" />,
            color: 'from-cyan-600 to-blue-700 text-white'
        },
        {
            id: 'tools',
            title: isKa ? 'HR & მუშახელის აღრიცხვა' : 'HR, Workers & Attendance',
            desc: isKa ? 'მკრეფავები, ტარიფები, დასწრება' : 'Personnel roster, piece-rate wages',
            countLabel: isKa ? 'პერსონალი' : 'Staff',
            countValue: employees.length,
            icon: <Users className="w-5 h-5" />,
            color: 'from-blue-600 to-indigo-800 text-white'
        },
        {
            id: 'marketplace',
            title: isKa ? 'აგრო-მარკეტი & გაყიდვები' : 'Marketplace & Sales',
            desc: isKa ? 'მოსავლის ლოტები, მყიდველები' : 'Direct wholesale lots & buyers',
            countLabel: isKa ? 'განცხადება' : 'Listings',
            countValue: listings.length,
            icon: <ShoppingBag className="w-5 h-5" />,
            color: 'from-violet-600 to-purple-800 text-white'
        },
        {
            id: 'agronomy',
            title: isKa ? 'აგრონომია & კვება' : 'Agronomy & Nutrition',
            desc: isKa ? 'კვების გეგმები, შეწამვლა, ნიადაგი' : 'Fertigation, spray plans & soil tests',
            countLabel: isKa ? 'გეგმა' : 'Plans',
            countValue: nutritionPlans.length || 0,
            icon: <Sprout className="w-5 h-5" />,
            color: 'from-emerald-600 to-teal-800 text-white'
        },
        {
            id: 'tasks',
            title: isKa ? 'სამუშაოები & დავალებები' : 'Work & Tasks Planner',
            desc: isKa ? 'საველე დავალებები, გრაფიკები, პასუხისმგებლები' : 'Field assignments, work orders & schedules',
            countLabel: isKa ? 'დავალება' : 'Tasks',
            countValue: workAssignments.length || 0,
            icon: <CheckSquare className="w-5 h-5" />,
            color: 'from-blue-600 to-indigo-800 text-white'
        },
        {
            id: 'ai',
            title: isKa ? 'AI ანალიტიკის სუიტა' : 'AI Intelligence Suite',
            desc: isKa ? 'ანომალიების ძიება, აგრო-დაავადებები' : 'Autonomous cross-module diagnosis',
            countLabel: isKa ? 'ინტელექტი' : 'Model',
            countValue: 'AI',
            icon: <Cpu className="w-5 h-5" />,
            color: 'from-slate-900 to-indigo-950 text-white'
        }
    ];

    return (
        <div className={`bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200/80 shadow-sm transition-all duration-300 h-full ${isCollapsed ? 'p-4 pt-12 sm:p-6 sm:pt-12 lg:pt-6' : 'p-4 pt-12 sm:p-6 sm:pt-12 lg:p-8'}`}>
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${isCollapsed ? 'mb-0' : 'mb-5 sm:mb-6'}`}>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                            {isKa ? 'სისტემის სრული მართვის პანელი' : 'System Command & Operations Center'}
                        </h3>
                        {isCollapsed && (
                            <span className="text-xs font-semibold text-slate-500 tabular-nums">
                                · {systemModules.length} {isKa ? 'მოდული' : 'modules'}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {isKa 
                            ? 'მართეთ აგრო-პლატფორმის ყველა მოდული და იხილეთ თითოეულის SOP გზამკვლევი პირდაპირ მთავარი დაფიდან' 
                            : 'Manage every module of your agricultural enterprise and open each module’s SOP & visual guide directly from the dashboard'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 lg:pr-36">
                    <button
                        type="button"
                        onClick={() => handleOpenFullSopManual('sop-mod-01')}
                        className="min-h-[38px] px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs transition-all flex items-center gap-1.5 border border-teal-200 cursor-pointer whitespace-nowrap shrink-0"
                    >
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span>{isKa ? 'სრული SOP სახელმძღვანელო' : 'Full SOP Manual'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={toggleCollapse}
                        id="collapse-control-panel-btn"
                        className="min-h-[38px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 border border-slate-200 cursor-pointer active:scale-95 shadow-2xs whitespace-nowrap shrink-0"
                        title={isKa ? (isCollapsed ? 'პანელის გაშლა' : 'პანელის ჩაკეცვა') : (isCollapsed ? 'Expand panel' : 'Collapse panel')}
                        aria-expanded={!isCollapsed}
                    >
                        {isCollapsed ? (
                            <>
                                <ChevronDown className="w-4 h-4 text-slate-600 shrink-0" />
                                <span>{isKa ? 'გაშლა' : 'Expand'}</span>
                            </>
                        ) : (
                            <>
                                <ChevronUp className="w-4 h-4 text-slate-600 shrink-0" />
                                <span>{isKa ? 'ჩაკეცვა' : 'Collapse'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3.5">
                    {systemModules.map((mod) => {
                        const sopId = MODULE_TO_SOP_ID[mod.id] || 'sop-mod-01';
                        const openModule = () => {
                            if (mod.id === 'profile' && onOpenProfile) onOpenProfile();
                            else if (mod.id === 'guide' && onOpenHelp) onOpenHelp();
                            else if (onNavigateMode) onNavigateMode(mod.id);
                        };
                        const openSopGuide = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            setActiveSopModal({
                                sopId,
                                title: mod.title,
                                icon: mod.icon,
                                color: mod.color,
                                moduleId: mod.id,
                            });
                        };

                        return (
                            <div
                                key={mod.id}
                                className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-indigo-400 hover:shadow-md transition-all text-left group flex flex-col justify-between min-h-[154px]"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                        <button
                                            type="button"
                                            onClick={openModule}
                                            className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${mod.color} flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0 cursor-pointer`}
                                            aria-label={mod.title}
                                        >
                                            {mod.icon}
                                        </button>

                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <button
                                                type="button"
                                                onClick={openSopGuide}
                                                className="min-h-[30px] px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-200/90 hover:border-teal-600 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                                title={isKa ? `${mod.title} — SOP და ვიზუალური გზამკვლევი` : `Open SOP & Visual Guide for ${mod.title}`}
                                            >
                                                <BookOpen className="w-3 h-3 shrink-0" />
                                                <span>{isKa ? 'SOP' : 'SOP & Guide'}</span>
                                            </button>
                                            <span className="text-[11px] font-bold font-mono tabular-nums text-slate-500 truncate">
                                                {mod.countValue}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={openModule}
                                        className="w-full text-left cursor-pointer focus:outline-none"
                                    >
                                        <h4 className="font-black text-xs sm:text-[13px] text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                            {mod.title}
                                        </h4>
                                        <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-0.5 leading-snug">
                                            {mod.desc}
                                        </p>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-slate-200/70">
                                    <button
                                        type="button"
                                        onClick={openModule}
                                        className="min-h-[30px] flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                                    >
                                        <span>{isKa ? 'მართვა' : 'Manage'}</span>
                                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={openSopGuide}
                                        className="min-h-[30px] text-[10px] font-semibold text-teal-700 hover:text-teal-900 hover:underline transition-colors cursor-pointer whitespace-nowrap"
                                    >
                                        {isKa ? 'ინსტრუქცია' : 'Guide'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ModuleSopGuideModal
                isOpen={Boolean(activeSopModal)}
                sopId={activeSopModal?.sopId || null}
                moduleTitle={activeSopModal?.title}
                moduleIcon={activeSopModal?.icon}
                moduleColor={activeSopModal?.color}
                language={language}
                onClose={() => setActiveSopModal(null)}
                onOpenModule={(mode) => {
                    if (mode === 'profile' && onOpenProfile) onOpenProfile();
                    else if (mode === 'guide' && onOpenHelp) onOpenHelp();
                    else if (onNavigateMode) onNavigateMode(mode);
                }}
                onOpenFullSopManual={handleOpenFullSopManual}
                onAskAiGuide={handleAskAiGuideForModule}
            />
        </div>
    );
};

// Backwards-compatible composite wrapper
export const DashboardProfileManager: React.FC<DashboardProfileManagerProps> = (props) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5">
                    <ProfileVerificationWidget {...props} />
                </div>
                <div className="lg:col-span-7">
                    <OnboardingNavigatorWidget {...props} />
                </div>
            </div>
            <SystemCommandCenterWidget {...props} />
        </div>
    );
};
