import type { DailyLogEntry, HarvestEntry, WorkAssignment } from '../types';

export interface WorkerActivity {
    id: string;
    organizationId: string;
    employeeId: string;
    source: 'work_assignment' | 'daily_log' | 'harvest_entry';
    sourceId?: string;
    date: string;
    title: string;
    hours?: number;
    kg?: number;
    status?: string;
    publishedBy?: string;
    publishedAt?: string;
}

export const digest = (parts: Array<string | number | undefined | null>): string => {
    const raw = parts.map(p => String(p ?? '')).join('|');
    let hash = 5381;
    for (let i = 0; i < raw.length; i += 1) {
        hash = ((hash << 5) + hash + raw.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36);
};

export const completedActivity = (a: WorkerActivity): boolean => {
    const st = String(a.status || '').toLowerCase();
    return st === 'completed' || st === 'done' || st === 'verified' || st === 'approved' || st === 'paid';
};

export const projectActivities = (params: {
    organizationId: string;
    employeeId: string;
    workAssignments?: WorkAssignment[];
    dailyLogs?: DailyLogEntry[];
    harvestEntries?: HarvestEntry[];
}): WorkerActivity[] => {
    const { organizationId, employeeId, workAssignments = [], dailyLogs = [], harvestEntries = [] } = params;
    const out: WorkerActivity[] = [];

    for (const w of workAssignments) {
        const assigned = Array.isArray((w as any).assignedTo)
            ? (w as any).assignedTo
            : (w as any).employeeId
            ? [(w as any).employeeId]
            : [];
        if (!assigned.includes(employeeId)) continue;
        const hrs = Number((w as any).hoursWorked ?? (w as any).durationHours ?? 0);
        out.push({
            id: `wa_${digest([organizationId, employeeId, w.id])}`,
            organizationId,
            employeeId,
            source: 'work_assignment',
            sourceId: w.id,
            date: String((w as any).dueDate || (w as any).date || (w as any).startDate || ''),
            title: String((w as any).title || (w as any).workType || 'Work Assignment'),
            hours: Number.isFinite(hrs) && hrs > 0 ? hrs : undefined,
            status: String((w as any).status || 'pending')
        });
    }

    for (const d of dailyLogs) {
        if ((d as any).employeeId !== employeeId) continue;
        const hrs = Number((d as any).hoursWorked ?? (d as any).hours ?? 0);
        out.push({
            id: `dl_${digest([organizationId, employeeId, d.id])}`,
            organizationId,
            employeeId,
            source: 'daily_log',
            sourceId: d.id,
            date: String((d as any).date || ''),
            title: String((d as any).taskDescription || (d as any).notes || 'Daily Work Log'),
            hours: Number.isFinite(hrs) && hrs > 0 ? hrs : undefined,
            status: 'completed'
        });
    }

    for (const h of harvestEntries) {
        if ((h as any).employeeId !== employeeId && (h as any).pickerId !== employeeId) continue;
        const kg = Number((h as any).weightKg ?? (h as any).weight ?? (h as any).netWeight ?? 0);
        out.push({
            id: `he_${digest([organizationId, employeeId, h.id])}`,
            organizationId,
            employeeId,
            source: 'harvest_entry',
            sourceId: h.id,
            date: String((h as any).timestamp || (h as any).date || ''),
            title: String((h as any).cropName || (h as any).variety || 'Harvest Entry'),
            kg: Number.isFinite(kg) && kg > 0 ? kg : undefined,
            status: 'completed'
        });
    }

    return out.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
};

export const personalTasks = (
    employeeId: string | null | undefined,
    workAssignments: WorkAssignment[] = []
): WorkAssignment[] => {
    if (!employeeId) return [];
    return workAssignments.filter(w => {
        const assigned = Array.isArray((w as any).assignedTo)
            ? (w as any).assignedTo
            : (w as any).employeeId
            ? [(w as any).employeeId]
            : [];
        return assigned.includes(employeeId);
    });
};
