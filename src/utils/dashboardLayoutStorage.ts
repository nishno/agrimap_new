import type { DashboardWidget, DashboardWidgetType } from '../types';

export const DEFAULT_DASHBOARD_LAYOUT: DashboardWidget[] = [
    { id: 'w_profile_verification', type: 'profile_verification', title: 'Profile & KYC Verification', isVisible: true, order: 0, colSpan: 1 },
    { id: 'w_onboarding_navigator', type: 'onboarding_navigator', title: 'Manage Profile & Onboarding', isVisible: true, order: 1, colSpan: 2 },
    { id: 'w_system_command_center', type: 'system_command_center', title: 'System Command & Operations Center', isVisible: true, order: 2, colSpan: 3 },
    { id: 'w_ai_stream', type: 'ai_stream', title: 'AI Autonomous Stream & Anomalies', isVisible: true, order: 3, colSpan: 3 },
    { id: 'w_goal', type: 'choose_goal', title: 'Choose Your Goal', isVisible: true, order: 4, colSpan: 3 },
    { id: 'w_agronomy', type: 'agronomy_quick', title: 'Agronomy Quick Access', isVisible: true, order: 5, colSpan: 1 },
    { id: 'w_tasks', type: 'tasks', title: 'Work & Tasks Hub', isVisible: true, order: 6, colSpan: 1 },
    { id: 'w_planner', type: 'planner', title: 'Agro Planner & Schedule', isVisible: true, order: 7, colSpan: 2 },
    { id: 'w_hardware', type: 'hardware_labs', title: 'Hardware Labs & Telemetry', isVisible: true, order: 8, colSpan: 1 },
    { id: 'w_team', type: 'team_hubs', title: 'Team Hubs & Field Comms', isVisible: true, order: 9, colSpan: 2 },
    { id: 'w_weather', type: 'weather', title: 'Online Weather & Microclimate Station', isVisible: true, order: 10, colSpan: 1 },
    { id: 'w_field', type: 'field_summary', title: 'Field, Sectors & Trenches', isVisible: true, order: 11, colSpan: 3 },
    { id: 'w_seedling', type: 'seedling_summary', title: 'Seedling Census & Health', isVisible: true, order: 12, colSpan: 3 },
    { id: 'w_harvest', type: 'harvest_pulse', title: 'Harvest Pulse & Scale Station', isVisible: true, order: 13, colSpan: 1 },
    { id: 'w_att', type: 'attendance', title: 'Staff Attendance & HR', isVisible: true, order: 14, colSpan: 2 },
    { id: 'w_market', type: 'market_feed', title: 'Wholesale Marketplace Feed', isVisible: true, order: 15, colSpan: 1 },
    { id: 'w_news', type: 'daily_news', title: 'Daily Briefing', isVisible: true, order: 16, colSpan: 1 },
    { id: 'w_stats', type: 'guest_stats', title: 'Global Stats', isVisible: true, order: 17, colSpan: 2 },
    { id: 'w_crops', type: 'crops_summary', title: 'Crops & Varieties', isVisible: true, order: 18, colSpan: 1 }
];

const DEFAULT_BY_TYPE = new Map<string, DashboardWidget>(
    DEFAULT_DASHBOARD_LAYOUT.map(w => [w.type, w])
);

const TOP_PRIORITY_WIDGET_TYPES = new Set<string>([
    'profile_verification',
    'onboarding_navigator',
    'system_command_center',
    'ai_stream'
]);

/**
 * Guarantees every known dashboard widget (except the Map) exists exactly once,
 * deduplicated by widget.type, preserving the user's explicit visibility,
 * manualVisibilityOverride, colSpan, heightPx, and ordering.
 */
export const normalizeDashboardLayout = (rawLayout?: DashboardWidget[] | null): DashboardWidget[] => {
    if (!Array.isArray(rawLayout) || rawLayout.length === 0) {
        return DEFAULT_DASHBOARD_LAYOUT.map((w, idx) => ({ ...w, order: idx }));
    }

    const seenTypes = new Set<string>();
    const dedupedExisting: DashboardWidget[] = [];

    const sortedInput = [...rawLayout].sort((a, b) => (a?.order ?? 999) - (b?.order ?? 999));

    for (const item of sortedInput) {
        if (!item || !item.type) continue;
        if (!DEFAULT_BY_TYPE.has(item.type)) {
            if (item.type === 'custom_stat' || item.type === 'custom_text') {
                dedupedExisting.push({
                    ...item,
                    isVisible: item.isVisible !== false,
                    manualVisibilityOverride: Boolean(item.manualVisibilityOverride)
                });
            }
            continue;
        }
        if (seenTypes.has(item.type)) continue;
        seenTypes.add(item.type);

        const canonical = DEFAULT_BY_TYPE.get(item.type)!;
        dedupedExisting.push({
            ...canonical,
            ...item,
            id: canonical.id,
            isVisible: item.isVisible !== false,
            manualVisibilityOverride: Boolean(item.manualVisibilityOverride),
            colSpan: item.colSpan ?? canonical.colSpan
        });
    }

    const missingTop: DashboardWidget[] = [];
    const missingOther: DashboardWidget[] = [];

    for (const dw of DEFAULT_DASHBOARD_LAYOUT) {
        if (!seenTypes.has(dw.type)) {
            if (TOP_PRIORITY_WIDGET_TYPES.has(dw.type)) {
                missingTop.push({ ...dw });
            } else {
                missingOther.push({ ...dw });
            }
        }
    }

    return [...missingTop, ...dedupedExisting, ...missingOther].map((w, idx) => ({
        ...w,
        order: idx
    }));
};

export const getSavedDashboardLayout = (userId?: string | null): DashboardWidget[] => {
    try {
        const userKey = userId ? `agrimap_layout_${userId}` : 'agrimap_layout_guest';
        const raw = localStorage.getItem(userKey) || localStorage.getItem('agrimap_layout_shared');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return normalizeDashboardLayout(parsed);
            }
        }
    } catch (e) {
        console.warn('Could not retrieve saved dashboard layout:', e);
    }
    return normalizeDashboardLayout(DEFAULT_DASHBOARD_LAYOUT);
};

export const saveDashboardLayout = (layout: DashboardWidget[], userId?: string | null): void => {
    try {
        const normalized = normalizeDashboardLayout(layout);
        const userKey = userId ? `agrimap_layout_${userId}` : 'agrimap_layout_guest';
        const serialized = JSON.stringify(normalized);
        localStorage.setItem(userKey, serialized);
        localStorage.setItem('agrimap_layout_shared', serialized);

        window.dispatchEvent(new CustomEvent('agrimap_layout_updated', { detail: { layout: normalized, userId } }));
    } catch (e) {
        console.warn('Could not save dashboard layout:', e);
    }
};
