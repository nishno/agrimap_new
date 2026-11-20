import React, { useEffect, useMemo, useState } from 'react';
import {
    Search, BookOpen, CheckCircle2, ChevronDown, ChevronUp,
    ArrowRight, MessageSquare, Shield, Layers, Users, FileText, Download,
    Image as ImageIcon, ZoomIn, X, Upload
} from 'lucide-react';
import { AppMode } from '../../types';
import {
    ROOT_MANUAL_SOPS,
    RootManualSopItem,
    SopRoleTag
} from '../../data/rootManualSopData';
import { getDefaultScreenshotForStep } from '../../utils/defaultScreenshots';

interface RootDocsSopManualProps {
    language: string;
    isOwnerOrRoot: boolean;
    isSopAdmin?: boolean;
    stepImages?: Record<string, string[]>;
    onUploadSopImage?: (stepKey: string, file: File) => void;
    onNavigateMode: (mode: AppMode) => void;
    onAskAiGuide: (prompt: string) => void;
}

const ROLE_FILTERS: Array<{ id: SopRoleTag; labelEn: string; labelKa: string }> = [
    { id: 'all', labelEn: 'All Roles', labelKa: 'ყველა როლი' },
    { id: 'worker', labelEn: 'Workers & Field Staff', labelKa: 'მუშაკები & საველე პერსონალი' },
    { id: 'agronomist', labelEn: 'Agronomist', labelKa: 'აგრონომი' },
    { id: 'manager', labelEn: 'Farm Manager', labelKa: 'მენეჯერი' },
    { id: 'accountant', labelEn: 'Accounting', labelKa: 'ბუღალტერია' },
    { id: 'founder', labelEn: 'Founder / Owner', labelKa: 'დამფუძნებელი' },
    { id: 'buyer', labelEn: 'Buyer / Market', labelKa: 'მყიდველი' },
];

const buildSvgUri = (svg: string) =>
    'data:image/svg+xml;utf8,' + encodeURIComponent(svg.trim());

/** Maps each Root-Docs SOP ID to its corresponding Firestore/Default screenshot key */
export const SOP_TO_STEP_KEY: Record<string, string> = {
    'sop-sys-00': 'top-navigation-bar',
    'sop-mod-01': 'dashboard-layout',
    'sop-mod-02': 'profile-verification',
    'sop-mod-03': 'register-company',
    'sop-mod-04': 'draw-boundaries',
    'sop-mod-05': 'smart-sensors',
    'sop-mod-06': 'field-works',
    'sop-mod-07': 'weigh-station',
    'sop-mod-08': 'manage-stock',
    'sop-mod-09': 'register-workers',
    'sop-mod-10': 'company-ledger',
    'sop-mod-11': 'storage-market',
    'sop-mod-12': 'ai-coordinator',
    'sop-mod-13': 'comms-intercom',
    'sop-mod-14': 'offline-sync',
    'sop-mod-15': 'root-admin-console',
};

export const getCustomSopSvgScreenshot = (sop: RootManualSopItem): string => {
    const stepKey = SOP_TO_STEP_KEY[sop.id];
    if (
        stepKey &&
        [
            'profile-verification',
            'register-company',
            'draw-boundaries',
            'smart-sensors',
            'field-works',
            'weigh-station',
            'manage-stock',
            'register-workers',
            'company-ledger',
            'storage-market',
            'ai-coordinator',
            'offline-sync',
        ].includes(stepKey)
    ) {
        return getDefaultScreenshotForStep(stepKey);
    }

    if (sop.id === 'sop-sys-00') {
        return buildSvgUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 280" width="100%" height="100%">
  <rect width="460" height="280" rx="16" fill="#0f172a" stroke="#10b981" stroke-width="2"/>
  <text x="20" y="28" font-family="Inter, sans-serif" font-size="10" font-weight="900" fill="#94a3b8" letter-spacing="1.4">SOP-SYS-00 • TOP NAVIGATION &amp; MOVABLE TOOLBAR</text>
  <rect x="16" y="42" width="428" height="44" rx="10" fill="#ffffff"/>
  <rect x="24" y="51" width="90" height="26" rx="7" fill="#eef2ff" stroke="#c7d2fe"/>
  <text x="69" y="67" font-family="Inter, sans-serif" font-size="8.5" font-weight="800" fill="#312e81" text-anchor="middle">Workspace ▾</text>
  <rect x="120" y="51" width="76" height="26" rx="7" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="158" y="67" font-family="Inter, sans-serif" font-size="8.5" font-weight="700" fill="#64748b" text-anchor="middle">🔍 Search ⌘K</text>
  <rect x="202" y="53" width="18" height="22" rx="5" fill="#ecfdf5" stroke="#34d399"/>
  <text x="211" y="67" font-family="Inter, sans-serif" font-size="10" font-weight="900" fill="#047857" text-anchor="middle">‹</text>
  <rect x="224" y="51" width="52" height="26" rx="7" fill="#ecfdf5" stroke="#a7f3d0"/>
  <text x="250" y="67" font-family="Inter, sans-serif" font-size="8.5" font-weight="800" fill="#047857" text-anchor="middle">● Cloud</text>
  <rect x="280" y="51" width="38" height="26" rx="7" fill="#f0fdf4" stroke="#86efac"/>
  <text x="299" y="67" font-family="Inter, sans-serif" font-size="8.5" font-weight="800" fill="#15803d" text-anchor="middle">AI 10</text>
  <rect x="322" y="51" width="42" height="26" rx="7" fill="#166534"/>
  <text x="343" y="67" font-family="Inter, sans-serif" font-size="8.5" font-weight="900" fill="#ffffff" text-anchor="middle">Save</text>
  <rect x="368" y="53" width="18" height="22" rx="5" fill="#ecfdf5" stroke="#34d399"/>
  <text x="377" y="67" font-family="Inter, sans-serif" font-size="10" font-weight="900" fill="#047857" text-anchor="middle">›</text>
  <rect x="392" y="51" width="44" height="26" rx="7" fill="#eef2ff" stroke="#c7d2fe"/>
  <text x="414" y="67" font-family="Inter, sans-serif" font-size="8.5" font-weight="800" fill="#4338ca" text-anchor="middle">Help</text>
  <!-- Callout Badges -->
  <rect x="20" y="106" width="204" height="72" rx="12" fill="#1e293b" stroke="#334155"/>
  <text x="32" y="126" font-family="Inter, sans-serif" font-size="9" font-weight="900" fill="#34d399">1. DRAG / ARROW MOVABLE BAR</text>
  <text x="32" y="143" font-family="Inter, sans-serif" font-size="8" fill="#cbd5e1">Use ‹ › arrows, mouse wheel, or</text>
  <text x="32" y="157" font-family="Inter, sans-serif" font-size="8" fill="#cbd5e1">click-drag on PC to reach every control.</text>
  <rect x="236" y="106" width="204" height="72" rx="12" fill="#1e293b" stroke="#334155"/>
  <text x="248" y="126" font-family="Inter, sans-serif" font-size="9" font-weight="900" fill="#818cf8">2. GLOBAL SEARCH (⌘K) &amp; SYNC</text>
  <text x="248" y="143" font-family="Inter, sans-serif" font-size="8" fill="#cbd5e1">Jump to any sector, worker, or lot</text>
  <text x="248" y="157" font-family="Inter, sans-serif" font-size="8" fill="#cbd5e1">and monitor offline queue status.</text>
  <rect x="20" y="192" width="420" height="68" rx="12" fill="#064e3b" stroke="#10b981"/>
  <text x="34" y="214" font-family="Inter, sans-serif" font-size="9.5" font-weight="900" fill="#ecfdf5">3. QUICK OVERFLOW MENU (⋯) &amp; LANGUAGE / CURRENCY</text>
  <text x="34" y="232" font-family="Inter, sans-serif" font-size="8.5" fill="#a7f3d0">Switch EN / KA, USD / GEL / EUR, or open All Controls popover from any screen size.</text>
</svg>`);
    }

    if (sop.id === 'sop-mod-01') {
        return buildSvgUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 280" width="100%" height="100%">
  <rect width="460" height="280" rx="16" fill="#0f172a" stroke="#6366f1" stroke-width="2"/>
  <text x="20" y="28" font-family="Inter, sans-serif" font-size="10" font-weight="900" fill="#94a3b8" letter-spacing="1.4">SOP-MOD-01 • DASHBOARD LAYOUT &amp; WIDGET CONTROLS</text>
  <!-- Banner -->
  <rect x="20" y="40" width="420" height="48" rx="12" fill="#1e293b" stroke="#334155"/>
  <text x="34" y="62" font-family="Inter, sans-serif" font-size="12" font-weight="900" fill="#ffffff">Plantation Dashboard</text>
  <text x="34" y="76" font-family="Inter, sans-serif" font-size="8" fill="#94a3b8">Real-time KPIs, Map Position &amp; Hide/Show Widgets</text>
  <rect x="356" y="52" width="72" height="24" rx="8" fill="#4f46e5" stroke="#818cf8"/>
  <text x="392" y="67" font-family="Inter, sans-serif" font-size="9" font-weight="900" fill="#ffffff" text-anchor="middle">⚙ Layout</text>
  <!-- Widget Grid -->
  <rect x="20" y="100" width="134" height="74" rx="10" fill="#111827" stroke="#10b981"/>
  <text x="32" y="120" font-family="Inter, sans-serif" font-size="8.5" font-weight="900" fill="#34d399">Field Summary</text>
  <text x="32" y="142" font-family="Inter, sans-serif" font-size="16" font-weight="900" fill="#ffffff">84.5 ha</text>
  <text x="142" y="120" font-family="Inter, sans-serif" font-size="9" fill="#94a3b8" text-anchor="end">👁 ✓</text>

  <rect x="163" y="100" width="134" height="74" rx="10" fill="#111827" stroke="#3b82f6"/>
  <text x="175" y="120" font-family="Inter, sans-serif" font-size="8.5" font-weight="900" fill="#60a5fa">Harvest Pulse</text>
  <text x="175" y="142" font-family="Inter, sans-serif" font-size="16" font-weight="900" fill="#ffffff">14.3 t</text>
  <text x="285" y="120" font-family="Inter, sans-serif" font-size="9" fill="#94a3b8" text-anchor="end">👁 ✓</text>

  <rect x="306" y="100" width="134" height="74" rx="10" fill="#111827" stroke="#f59e0b" stroke-dasharray="4,3"/>
  <text x="318" y="120" font-family="Inter, sans-serif" font-size="8.5" font-weight="900" fill="#fbbf24">Command Center</text>
  <text x="318" y="140" font-family="Inter, sans-serif" font-size="8" fill="#cbd5e1">Hide / Show Anytime</text>
  <text x="318" y="156" font-family="Inter, sans-serif" font-size="8" fill="#fbbf24">via Layout Modal</text>

  <!-- Onboarding rule -->
  <rect x="20" y="188" width="420" height="72" rx="12" fill="#1e1b4b" stroke="#6366f1"/>
  <text x="34" y="210" font-family="Inter, sans-serif" font-size="9.5" font-weight="900" fill="#c7d2fe">SMART ONBOARDING AUTO-CLEAR RULE</text>
  <text x="34" y="228" font-family="Inter, sans-serif" font-size="8.5" fill="#e2e8f0">• Unverified Profile / Missing Role → Blinks prominently until completed.</text>
  <text x="34" y="244" font-family="Inter, sans-serif" font-size="8.5" fill="#a7f3d0">• Verified &amp; Role Chosen → Automatically removed to keep Dashboard clean.</text>
</svg>`);
    }

    if (sop.id === 'sop-mod-13') {
        return buildSvgUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 280" width="100%" height="100%">
  <rect width="460" height="280" rx="16" fill="#0f172a" stroke="#06b6d4" stroke-width="2"/>
  <text x="20" y="28" font-family="Inter, sans-serif" font-size="10" font-weight="900" fill="#94a3b8" letter-spacing="1.4">SOP-MOD-13 • FIELD VOICE NOTES, CHAT &amp; VIDEO</text>
  <rect x="20" y="46" width="205" height="140" rx="12" fill="#111827" stroke="#1e293b"/>
  <text x="34" y="68" font-family="Inter, sans-serif" font-size="9.5" font-weight="900" fill="#22d3ee">🎙 VOICE FIELD NOTES</text>
  <text x="34" y="90" font-family="Inter, sans-serif" font-size="8.5" fill="#cbd5e1">• Record GPS-tagged field memos</text>
  <text x="34" y="108" font-family="Inter, sans-serif" font-size="8.5" fill="#cbd5e1">• Auto-transcribe into tasks</text>
  <text x="34" y="126" font-family="Inter, sans-serif" font-size="8.5" fill="#cbd5e1">• Share directly with agronomists</text>
  <rect x="34" y="144" width="176" height="26" rx="8" fill="#083344" stroke="#06b6d4"/>
  <text x="122" y="160" font-family="Inter, sans-serif" font-size="8.5" font-weight="900" fill="#67e8f9" text-anchor="middle">● RECORDING READY</text>

  <rect x="235" y="46" width="205" height="140" rx="12" fill="#111827" stroke="#1e293b"/>
  <text x="249" y="68" font-family="Inter, sans-serif" font-size="9.5" font-weight="900" fill="#34d399">💬 TEAM CHAT &amp; MEET</text>
  <text x="249" y="90" font-family="Inter, sans-serif" font-size="8.5" fill="#cbd5e1">• Sector dispatch channels</text>
  <text x="249" y="108" font-family="Inter, sans-serif" font-size="8.5" fill="#cbd5e1">• 1-click Google Meet rooms</text>
  <text x="249" y="126" font-family="Inter, sans-serif" font-size="8.5" fill="#cbd5e1">• Pin GPS alerts on live map</text>
  <rect x="249" y="144" width="176" height="26" rx="8" fill="#064e3b" stroke="#10b981"/>
  <text x="337" y="160" font-family="Inter, sans-serif" font-size="8.5" font-weight="900" fill="#6ee7b7" text-anchor="middle">LIVE INTERCOM ONLINE</text>

  <rect x="20" y="200" width="420" height="60" rx="12" fill="#1e293b" stroke="#334155"/>
  <text x="34" y="222" font-family="Inter, sans-serif" font-size="9" font-weight="900" fill="#ffffff">FLOATING TOOLS DOCK INTEGRATION</text>
  <text x="34" y="240" font-family="Inter, sans-serif" font-size="8.5" fill="#94a3b8">Accessible from any module via the bottom-right AI &amp; Communications floating launcher.</text>
</svg>`);
    }

    return buildSvgUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 280" width="100%" height="100%">
  <rect width="460" height="280" rx="16" fill="#0f172a" stroke="#f43f5e" stroke-width="2"/>
  <text x="20" y="28" font-family="Inter, sans-serif" font-size="10" font-weight="900" fill="#fda4af" letter-spacing="1.4">${sop.code} • SYSTEM GOVERNANCE &amp; ARCHITECTURE</text>
  <rect x="20" y="48" width="420" height="96" rx="12" fill="#111827" stroke="#334155"/>
  <text x="36" y="74" font-family="Inter, sans-serif" font-size="13" font-weight="900" fill="#ffffff">${sop.titleEn.replace(/&/g, '&amp;')}</text>
  <text x="36" y="96" font-family="Inter, sans-serif" font-size="9" fill="#94a3b8">Restricted to Root Super Admin &amp; Platform Owner accounts</text>
  <rect x="36" y="110" width="124" height="20" rx="6" fill="#881337"/>
  <text x="98" y="123" font-family="Inter, sans-serif" font-size="8" font-weight="900" fill="#fecdd3" text-anchor="middle">RBAC PROTECTED</text>
  <rect x="20" y="160" width="420" height="98" rx="12" fill="#1e293b" stroke="#334155"/>
  <text x="36" y="186" font-family="Inter, sans-serif" font-size="9" font-weight="900" fill="#34d399">ACTIVE CONTROLS</text>
  <text x="36" y="206" font-family="Inter, sans-serif" font-size="8.5" fill="#e2e8f0">• Role &amp; Permission Matrix, Quota Allocation &amp; Audit Logs</text>
  <text x="36" y="224" font-family="Inter, sans-serif" font-size="8.5" fill="#e2e8f0">• AI Module Architecture Topology &amp; Exportable Documentation</text>
  <text x="36" y="242" font-family="Inter, sans-serif" font-size="8.5" fill="#e2e8f0">• Hidden automatically from field workers and standard staff</text>
</svg>`);
};

export const RootDocsSopManual: React.FC<RootDocsSopManualProps> = ({
    language,
    isOwnerOrRoot,
    isSopAdmin = false,
    stepImages = {},
    onUploadSopImage,
    onNavigateMode,
    onAskAiGuide,
}) => {
    const isKa = language === 'ka';
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<SopRoleTag>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [zoomedShot, setZoomedShot] = useState<{ src: string; title: string; code: string } | null>(null);
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
        'sop-sys-00': true,
        'sop-mod-01': true,
        'sop-mod-02': true,
        'sop-mod-07': true
    });

    useEffect(() => {
        const focusTargetSop = (targetId?: string | null) => {
            if (!targetId) return;
            setSearchQuery('');
            setSelectedRole('all');
            setSelectedCategory('All');
            setExpandedIds(prev => ({ ...prev, [targetId]: true }));
            setTimeout(() => {
                const el = document.getElementById(`sop-card-${targetId}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 120);
        };

        try {
            const storedId = sessionStorage.getItem('agrimap_focus_sop_id');
            if (storedId) {
                focusTargetSop(storedId);
                sessionStorage.removeItem('agrimap_focus_sop_id');
            }
        } catch {
            // ignore storage errors
        }

        const onFocusEvent = (e: Event) => {
            const id = (e as CustomEvent)?.detail;
            if (typeof id === 'string') focusTargetSop(id);
        };
        window.addEventListener('agrimap_focus_sop_id', onFocusEvent);
        return () => window.removeEventListener('agrimap_focus_sop_id', onFocusEvent);
    }, []);

    const visibleSops = useMemo(() => {
        return ROOT_MANUAL_SOPS.filter(sop => (isOwnerOrRoot ? true : !sop.rootOnly));
    }, [isOwnerOrRoot]);

    const categories = useMemo(() => {
        const cats = Array.from(new Set(visibleSops.map(s => s.category)));
        return ['All', ...cats];
    }, [visibleSops]);

    const filteredSops = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return visibleSops.filter(sop => {
            const matchesCategory = selectedCategory === 'All' || sop.category === selectedCategory;
            const matchesRole =
                selectedRole === 'all' ||
                sop.roles.includes('all') ||
                sop.roles.includes(selectedRole);

            if (!matchesCategory || !matchesRole) return false;
            if (!q) return true;

            const haystack = [
                sop.code,
                sop.titleEn,
                sop.titleKa,
                sop.purposeEn,
                sop.purposeKa,
                ...sop.optionsEn,
                ...sop.optionsKa,
                ...sop.stepsEn,
                ...sop.stepsKa
            ].join(' ').toLowerCase();

            return haystack.includes(q);
        });
    }, [visibleSops, selectedCategory, selectedRole, searchQuery]);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const expandAll = () => {
        const next: Record<string, boolean> = {};
        filteredSops.forEach(s => { next[s.id] = true; });
        setExpandedIds(next);
    };

    const collapseAll = () => {
        setExpandedIds({});
    };

    const getSopScreenshots = (sop: RootManualSopItem): string[] => {
        const stepKey = SOP_TO_STEP_KEY[sop.id] || sop.id;
        const customUploaded = stepImages[stepKey] || stepImages[sop.id] || [];
        if (customUploaded.length > 0) {
            return customUploaded;
        }
        return [getCustomSopSvgScreenshot(sop)];
    };

    const handleDownloadSopMarkdown = () => {
        const lines: string[] = [
            isKa
                ? '# AgriMap Pro — ოფიციალური SOP სახელმძღვანელო (ყველა მოდული და პარამეტრი)'
                : '# AgriMap Pro — Official Standard Operating Procedures (All Modules & Options)',
            '',
            isKa
                ? `გენერირებულია პლატფორმის ძირითადი დოკუმენტაციიდან — სულ ${filteredSops.length} პროცედურა.`
                : `Generated from root platform documentation — ${filteredSops.length} procedures.`,
            '',
            '---',
            ''
        ];

        filteredSops.forEach((sop) => {
            const title = isKa ? sop.titleKa : sop.titleEn;
            const purpose = isKa ? sop.purposeKa : sop.purposeEn;
            const options = isKa ? sop.optionsKa : sop.optionsEn;
            const steps = isKa ? sop.stepsKa : sop.stepsEn;

            lines.push(`## ${sop.code}: ${title}`);
            lines.push(`**${isKa ? 'კატეგორია' : 'Category'}:** ${sop.category} | **${isKa ? 'წყარო' : 'Source'}:** ${sop.sourceDoc}`);
            lines.push('');
            lines.push(purpose);
            lines.push('');
            lines.push(`### ${isKa ? 'მოდულის ფუნქციები და პარამეტრები' : 'Available Options & Controls'}`);
            options.forEach((opt) => lines.push(`- ${opt}`));
            lines.push('');
            lines.push(`### ${isKa ? 'შესრულების ნაბიჯები (SOP)' : 'Step-by-Step Checklist'}`);
            steps.forEach((step, idx) => lines.push(`${idx + 1}. ${step}`));
            lines.push('');
            lines.push('---');
            lines.push('');
        });

        const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = isKa ? 'AgriMap_SOP_Manual_KA.md' : 'AgriMap_SOP_Manual_EN.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-5 sm:space-y-6">
            {/* Hero Intro Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                                <BookOpen className="w-3.5 h-3.5" />
                                {isKa ? 'ვიზუალური SOP სახელმძღვანელო სქრინშოთებით' : 'Visual SOP Manual with Screenshots'}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400">
                                {filteredSops.length} {isKa ? 'პროცედურა' : 'Standard Procedures'}
                            </span>
                        </div>
                        <h2 className="text-lg sm:text-2xl font-black text-slate-900 mt-2 tracking-tight">
                            {isKa
                                ? 'ყველა მოდულის SOP გზამკვლევი — სქრინშოთები და ნაბიჯები'
                                : 'Complete Operations SOP Guide — Screenshots & Step-by-Step'}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 max-w-3xl">
                            {isKa
                                ? 'შედგენილია პლატფორმის დოკუმენტაციის მიხედვით. თითოეულ პროცედურას ახლავს ეკრანის ვიზუალური სქრინშოთი (გასადიდებლად დააკლიკეთ), ფუნქციების სია და ჩექლისტი.'
                                : 'Generated from root platform manuals. Every procedure includes a zoomable visual screen guide, available controls, and a step-by-step operational checklist.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                            type="button"
                            onClick={handleDownloadSopMarkdown}
                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>{isKa ? 'SOP (.md)' : 'Export SOP (.md)'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={expandAll}
                            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                        >
                            {isKa ? 'ყველას გაშლა' : 'Expand All'}
                        </button>
                        <button
                            type="button"
                            onClick={collapseAll}
                            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                        >
                            {isKa ? 'ჩაკეცვა' : 'Collapse All'}
                        </button>
                    </div>
                </div>

                {/* Search + Role Filter + Category Filter */}
                <div className="mt-4 sm:mt-5 space-y-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={
                                isKa
                                    ? 'ძებნა SOP-ებში (მაგ: სასწორი, დასწრება, Scan ID, რუკა, ოფლაინ, საწყობი)...'
                                    : 'Search SOPs, options, or buttons (e.g. Weigh Station, Scan ID, Attendance, Offline, Map)...'
                            }
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition"
                        />
                    </div>

                    {/* Role Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {isKa ? 'როლი:' : 'Role:'}
                        </span>
                        {ROLE_FILTERS.map(role => (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => setSelectedRole(role.id)}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                                    selectedRole === role.id
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {isKa ? role.labelKa : role.labelEn}
                            </button>
                        ))}
                    </div>

                    {/* Category Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer border ${
                                    selectedCategory === cat
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* SOP Accordion Cards with Visual Screenshots */}
            <div className="space-y-4">
                {filteredSops.map((sop: RootManualSopItem) => {
                    const isOpen = Boolean(expandedIds[sop.id]);
                    const title = isKa ? sop.titleKa : sop.titleEn;
                    const purpose = isKa ? sop.purposeKa : sop.purposeEn;
                    const options = isKa ? sop.optionsKa : sop.optionsEn;
                    const steps = isKa ? sop.stepsKa : sop.stepsEn;
                    const screenshots = getSopScreenshots(sop);
                    const primaryScreenshot = screenshots[0];
                    const stepKey = SOP_TO_STEP_KEY[sop.id] || sop.id;

                    return (
                        <div
                            key={sop.id}
                            id={`sop-card-${sop.id}`}
                            className={`bg-white rounded-2xl sm:rounded-3xl border transition-all overflow-hidden scroll-mt-20 ${
                                isOpen ? 'border-indigo-200 shadow-md' : 'border-slate-200 shadow-xs hover:border-slate-300'
                            }`}
                        >
                            {/* Header Row */}
                            <button
                                type="button"
                                onClick={() => toggleExpand(sop.id)}
                                className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-3 sm:gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                            >
                                <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                                    {/* Mini Visual Screenshot Thumbnail */}
                                    <div className="hidden sm:block w-24 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shrink-0 shadow-2xs">
                                        <img
                                            src={primaryScreenshot}
                                            alt={title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    <div className="space-y-1.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                            <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-mono text-[10px] font-black tracking-wider">
                                                {sop.code}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold">
                                                {sop.category}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold inline-flex items-center gap-1">
                                                <ImageIcon className="w-3 h-3" />
                                                {screenshots.length} {isKa ? 'სქრინშოთი' : screenshots.length === 1 ? 'Screenshot' : 'Screenshots'}
                                            </span>
                                            {sop.rootOnly && (
                                                <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-black uppercase inline-flex items-center gap-1">
                                                    <Shield className="w-3 h-3" /> ROOT ONLY
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight">
                                            {title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                                            {purpose}
                                        </p>
                                    </div>
                                </div>

                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                            </button>

                            {/* Expanded Details with Visual Screen Guide */}
                            {isOpen && (
                                <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-3 border-t border-slate-100 space-y-4 sm:space-y-5 bg-slate-50/40">
                                    {/* Visual Screen Guide / Screenshots Section */}
                                    <div className="bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-slate-800 shadow-sm">
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                                    <ImageIcon className="w-3 h-3" />
                                                    {isKa ? 'ვიზუალური სქრინშოთი & ინტერფეისი' : 'Visual Screen Guide & Screenshot'}
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                                                    {isKa ? 'გასადიდებლად დააკლიკეთ სურათზე' : 'Click screenshot to zoom fullscreen'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isSopAdmin && onUploadSopImage && (
                                                    <label className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition">
                                                        <Upload className="w-3 h-3 text-emerald-400" />
                                                        <span>{isKa ? 'სქრინშოთის ატვირთვა' : 'Upload Screenshot'}</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const f = e.target.files?.[0];
                                                                if (f) onUploadSopImage(stepKey, f);
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                    </label>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setZoomedShot({ src: primaryScreenshot, title, code: sop.code })}
                                                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                                                >
                                                    <ZoomIn className="w-3 h-3" />
                                                    <span>{isKa ? 'გადიდება' : 'Zoom'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className={`grid gap-3 ${screenshots.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                            {screenshots.map((shotSrc, shotIdx) => (
                                                <button
                                                    key={shotIdx}
                                                    type="button"
                                                    onClick={() => setZoomedShot({ src: shotSrc, title, code: sop.code })}
                                                    className="group relative rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 text-left cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                                >
                                                    <img
                                                        src={shotSrc}
                                                        alt={`${sop.code} - ${title} (${shotIdx + 1})`}
                                                        className="w-full max-h-[280px] object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.01]"
                                                    />
                                                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-slate-950/80 text-white text-[10px] font-bold opacity-85 group-hover:opacity-100 inline-flex items-center gap-1 border border-white/10">
                                                        <ZoomIn className="w-3 h-3 text-emerald-400" />
                                                        <span>{isKa ? 'სრული ზომა' : 'Full View'}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                                        {/* Available Options & Controls */}
                                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80">
                                            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-3">
                                                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                                {isKa ? 'მოდულის ფუნქციები და პარამეტრები' : 'Available Options & Controls'}
                                            </h4>
                                            <ul className="space-y-2">
                                                {options.map((opt, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                                        <span>{opt}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Step-by-Step SOP Checklist */}
                                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200/80">
                                            <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 mb-3">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                {isKa ? 'სტანდარტული შესრულების ეტაპები (SOP)' : 'Step-by-Step Operational Checklist'}
                                            </h4>
                                            <ol className="space-y-2.5">
                                                {steps.map((step, idx) => (
                                                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                                                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="leading-relaxed">{step}</span>
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>
                                                {isKa ? 'დოკუმენტის წყარო:' : 'Reference:'} {sop.sourceDoc}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                                type="button"
                                                onClick={() => onAskAiGuide(isKa ? sop.aiPromptKa : sop.aiPromptEn)}
                                                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                <span>{isKa ? 'ჰკითხე AI ასისტენტს' : 'Ask AI Guide'}</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => onNavigateMode(sop.moduleMode)}
                                                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                                            >
                                                <span>{isKa ? 'მოდულის გახსნა' : 'Open Module'}</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredSops.length === 0 && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center">
                        <p className="text-sm font-bold text-slate-500">
                            {isKa
                                ? 'შესაბამისი SOP პროცედურა ვერ მოიძებნა. სცადეთ სხვა საძიებო სიტყვა.'
                                : 'No matching SOP procedures found. Try clearing your search or role filter.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Responsive Fullscreen Screenshot Lightbox */}
            {zoomedShot && (
                <div
                    className="fixed inset-0 z-[9500] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
                    onClick={() => setZoomedShot(null)}
                >
                    <div
                        className="relative w-full max-w-4xl max-h-[calc(100dvh-1.5rem)] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-black shrink-0">
                                    {zoomedShot.code}
                                </span>
                                <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                    {zoomedShot.title}
                                </h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setZoomedShot(null)}
                                className="w-8 h-8 rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-sm"
                                title={isKa ? 'დახურვა' : 'Close'}
                                aria-label="Close screenshot preview"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-5 flex items-center justify-center bg-slate-950/60">
                            <img
                                src={zoomedShot.src}
                                alt={zoomedShot.title}
                                className="max-w-full max-h-[calc(100dvh-9rem)] object-contain rounded-xl shadow-lg"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
