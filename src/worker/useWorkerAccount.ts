import { useEffect, useMemo, useState } from 'react';
import { USE_FIREBASE } from '../config';
import { auth, db, collection, onSnapshot, query, where } from '../firebase';
import type { Employee, HarvestEntry, Membership, Organization, Review, Transaction, User, WorkAssignment } from '../types';
import { projectActivities, type WorkerActivity } from './activities';

export function useWorkerAccount(params: {
    currentUser: User | null;
    activeOrg: Organization | null;
    memberships: Membership[];
    employees?: Employee[];
    harvestEntries?: HarvestEntry[];
    transactions?: Transaction[];
    workAssignments?: WorkAssignment[];
    reviews?: Review[];
}) {
    const {
        currentUser,
        activeOrg,
        memberships,
        employees = [],
        harvestEntries = [],
        transactions = [],
        workAssignments = [],
        reviews = []
    } = params;

    const [remoteActivities, setRemoteActivities] = useState<WorkerActivity[]>([]);

    const activeMembership = useMemo(() => {
        if (!currentUser || currentUser.isGuest) return null;
        const active = memberships.filter(m => m.userId === currentUser.id && (m.status === 'active' || !m.status));
        if (activeOrg) {
            return active.find(m => m.organizationId === activeOrg.id) || active[0] || null;
        }
        return active[0] || null;
    }, [currentUser, activeOrg, memberships]);

    const linkedEmployee = useMemo(() => {
        if (!currentUser) return null;
        if (activeMembership?.employeeId) {
            const byMem = employees.find(e => e.id === activeMembership.employeeId);
            if (byMem) return byMem;
        }
        const orgId = activeMembership?.organizationId || activeOrg?.id;
        return (
            employees.find(
                e =>
                    (!orgId || e.organizationId === orgId) &&
                    (e.userId === currentUser.id ||
                        (currentUser.email && e.email && e.email.toLowerCase() === currentUser.email.toLowerCase()))
            ) || null
        );
    }, [currentUser, activeMembership, activeOrg?.id, employees]);

    useEffect(() => {
        const orgId = activeMembership?.organizationId || activeOrg?.id;
        const empId = linkedEmployee?.id || activeMembership?.employeeId;
        if (!USE_FIREBASE || !auth.currentUser || !orgId || !empId) {
            setRemoteActivities([]);
            return;
        }

        const unsub = onSnapshot(
            query(
                collection(db, 'workerActivities'),
                where('organizationId', '==', orgId),
                where('employeeId', '==', empId)
            ),
            (snap: any) => {
                const rows: WorkerActivity[] = (snap.docs || []).map((d: any) => {
                    const raw = (d.data() || {}) as any;
                    return {
                        ...raw,
                        id: d.id,
                        source: raw.source || raw.kind || 'work_assignment',
                        title: String(raw.title || raw.workType || 'Work Activity'),
                        date: String(raw.date || '')
                    };
                });
                setRemoteActivities(rows);
            },
            () => {
                setRemoteActivities([]);
            }
        );

        return () => unsub?.();
    }, [activeMembership?.organizationId, activeMembership?.employeeId, activeOrg?.id, linkedEmployee?.id]);

    const workerHarvestEntries = useMemo(() => {
        if (!linkedEmployee) return [];
        return harvestEntries.filter(
            (h: any) => h.employeeId === linkedEmployee.id || h.pickerId === linkedEmployee.id
        );
    }, [harvestEntries, linkedEmployee]);

    const workerTransactions = useMemo(() => {
        if (!linkedEmployee) return [];
        return transactions.filter(
            (tx: any) =>
                tx.employeeId === linkedEmployee.id ||
                tx.payeeId === linkedEmployee.id ||
                (linkedEmployee.name &&
                    String(tx.description || '')
                        .toLowerCase()
                        .includes(linkedEmployee.name.toLowerCase()))
        );
    }, [transactions, linkedEmployee]);

    const activities = useMemo(() => {
        const orgId = activeMembership?.organizationId || activeOrg?.id || '';
        const empId = linkedEmployee?.id || activeMembership?.employeeId || '';
        const localProjected = empId
            ? projectActivities({
                  organizationId: orgId,
                  employeeId: empId,
                  workAssignments,
                  harvestEntries: workerHarvestEntries
              })
            : [];
        const byId = new Map<string, WorkerActivity>();
        for (const a of localProjected) byId.set(a.id, a);
        for (const r of remoteActivities) byId.set(r.id, r);
        return Array.from(byId.values()).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    }, [activeMembership, activeOrg?.id, linkedEmployee?.id, workAssignments, workerHarvestEntries, remoteActivities]);

    const workerReviews = useMemo(() => {
        if (!currentUser) return [];
        return reviews.filter((r: any) => r.targetUserId === currentUser.id || r.revieweeId === currentUser.id);
    }, [reviews, currentUser]);

    return {
        activeMembership,
        linkedEmployee,
        activities,
        harvestEntries: workerHarvestEntries,
        transactions: workerTransactions,
        reviews: workerReviews
    };
}
