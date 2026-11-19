import { useEffect, useState, useCallback } from 'react';
import { USE_FIREBASE } from '../config';
import {
    auth,
    db,
    collection,
    doc,
    onSnapshot,
    query,
    where,
    setDoc,
    runTransaction
} from '../firebase';
import type { Employee, JoinRequest, Membership, Organization, User } from '../types';

const LOCAL_JOIN_REQUESTS_KEY = 'agrimap_join_requests_v1';
const LOCAL_JOIN_EVENT = 'agrimap-join-requests-updated';

export const isLocalFarmRuntime = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
        const raw = localStorage.getItem('agrimap-local-config');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        return Boolean(parsed?.isLocalMode && parsed?.serverIp);
    } catch {
        return false;
    }
};

const readLocalRequests = (): JoinRequest[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(LOCAL_JOIN_REQUESTS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeLocalRequests = (rows: JoinRequest[]) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(LOCAL_JOIN_REQUESTS_KEY, JSON.stringify(rows));
        window.dispatchEvent(new CustomEvent(LOCAL_JOIN_EVENT));
    } catch {
        // Ignore storage quota errors
    }
};

const upsertLocalRequest = (record: JoinRequest) => {
    const existing = readLocalRequests();
    const idx = existing.findIndex(r => r.id === record.id);
    if (idx >= 0) {
        existing[idx] = { ...existing[idx], ...record };
    } else {
        existing.unshift(record);
    }
    writeLocalRequests(existing);
};

export interface CreateJoinRequestResult {
    ok: boolean;
    reason?: 'local_farm' | 'unauthenticated' | 'error';
    request?: JoinRequest;
    message?: string;
}

export async function createPersistedJoinRequest(
    user: User | null | undefined,
    org: Organization
): Promise<CreateJoinRequestResult> {
    if (!user || user.isGuest) {
        return {
            ok: false,
            reason: 'unauthenticated',
            message: 'Sign in with a registered account to request company membership.'
        };
    }

    if (isLocalFarmRuntime()) {
        return {
            ok: false,
            reason: 'local_farm',
            message: 'Ask the local farm owner to link your account to an employee record.'
        };
    }

    const requestId = `${user.id}_${org.id}`;
    const payload: JoinRequest = {
        id: requestId,
        userId: user.id,
        userName: user.name || user.email || 'User',
        userEmail: user.email || '',
        organizationId: org.id,
        organizationName: org.name,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    try {
        if (USE_FIREBASE && auth.currentUser) {
            await setDoc(doc(db, 'joinRequests', requestId), {
                id: payload.id,
                userId: payload.userId,
                userName: payload.userName,
                userEmail: payload.userEmail || '',
                organizationId: payload.organizationId,
                organizationName: payload.organizationName || '',
                status: 'pending',
                createdAt: payload.createdAt
            });
        }
        upsertLocalRequest(payload);
        return { ok: true, request: payload };
    } catch (err: any) {
        console.error('[JoinRequests] Failed to persist join request:', err);
        return {
            ok: false,
            reason: 'error',
            message: err?.message || 'Join request could not be saved. Please check access rules.'
        };
    }
}

export interface TransactionalApproveParams {
    request: JoinRequest;
    organization: Organization;
    reviewerId?: string;
    memberships?: Membership[];
    employees?: Employee[];
    onSetMemberships?: (next: Membership[]) => void;
    onSetEmployees?: (next: Employee[]) => void;
}

export interface JoinDecisionResult {
    ok: boolean;
    message: string;
}

export async function approveJoinRequestTransactional({
    request,
    organization,
    reviewerId,
    memberships = [],
    employees = [],
    onSetMemberships,
    onSetEmployees
}: TransactionalApproveParams): Promise<JoinDecisionResult> {
    if (isLocalFarmRuntime()) {
        return {
            ok: false,
            message: 'Local farms use owner-managed local accounts.'
        };
    }

    const membershipId = `${request.userId}_${organization.id}`;
    const employeeId = request.id;
    const nowIso = new Date().toISOString();

    try {
        if (USE_FIREBASE && auth.currentUser) {
            await runTransaction(db, async (transaction: any) => {
                const memberRef = doc(db, 'memberships', membershipId);
                const requestRef = doc(db, 'joinRequests', request.id);
                const employeeRef = doc(db, 'employees', employeeId);

                const [currentMemberSnap, pendingRequestSnap, employeeSnap] = await Promise.all([
                    transaction.get(memberRef),
                    transaction.get(requestRef),
                    transaction.get(employeeRef)
                ]);

                if (currentMemberSnap.exists()) {
                    throw new Error('Membership already exists; use company account controls.');
                }
                if (!pendingRequestSnap.exists() || (pendingRequestSnap.data() as any)?.status !== 'pending') {
                    throw new Error('Join request was already reviewed.');
                }
                if (employeeSnap.exists() && (employeeSnap.data() as any)?.userId && (employeeSnap.data() as any)?.userId !== request.userId) {
                    throw new Error('Employee identity mismatch.');
                }

                transaction.set(memberRef, {
                    id: membershipId,
                    userId: request.userId,
                    organizationId: organization.id,
                    role: 'Employee',
                    permissionLevel: 'read',
                    status: 'active',
                    employeeId,
                    joinedAt: nowIso
                });

                transaction.set(
                    employeeRef,
                    {
                        id: employeeId,
                        organizationId: organization.id,
                        userId: request.userId,
                        name: request.userName,
                        email: request.userEmail || '',
                        phone: '',
                        idNumber: '',
                        employeeType: 'Local Worker',
                        roleId: 'role-employee',
                        role: 'Employee',
                        paymentType: 'daily',
                        paymentRate: 0,
                        accountType: 'Global',
                        status: 'active',
                        joinedAt: nowIso
                    },
                    { merge: true }
                );

                transaction.set(
                    requestRef,
                    {
                        status: 'approved',
                        reviewedAt: nowIso,
                        ...(reviewerId ? { reviewedBy: reviewerId } : {})
                    },
                    { merge: true }
                );
            });
        } else {
            const existingMem = memberships.find(
                m => m.id === membershipId || (m.userId === request.userId && m.organizationId === organization.id)
            );
            if (existingMem && (existingMem.status === 'active' || !existingMem.status)) {
                throw new Error('Membership already exists; use company account controls.');
            }
            const localReqs = readLocalRequests();
            const currentReq = localReqs.find(r => r.id === request.id) || request;
            if (currentReq.status !== 'pending') {
                throw new Error('Join request was already reviewed.');
            }
            const existingEmp = employees.find(e => e.id === employeeId);
            if (existingEmp && existingEmp.userId && existingEmp.userId !== request.userId) {
                throw new Error('Employee identity mismatch.');
            }
        }

        upsertLocalRequest({
            ...request,
            status: 'approved',
            reviewedAt: nowIso,
            reviewedBy: reviewerId
        });

        if (onSetMemberships) {
            const exists = memberships.some(m => m.id === membershipId);
            if (!exists) {
                const newMembership: Membership = {
                    id: membershipId,
                    userId: request.userId,
                    organizationId: organization.id,
                    role: 'Employee',
                    permissionLevel: 'read',
                    status: 'active',
                    employeeId,
                    joinedAt: nowIso
                };
                onSetMemberships([...memberships, newMembership]);
            }
        }

        if (onSetEmployees) {
            const existsEmp = employees.some(e => e.id === employeeId);
            if (!existsEmp) {
                const newEmployee: Employee = {
                    id: employeeId,
                    organizationId: organization.id,
                    userId: request.userId,
                    name: request.userName,
                    email: request.userEmail || '',
                    phone: '',
                    idNumber: '',
                    employeeType: 'Local Worker',
                    roleId: 'role-employee',
                    role: 'Employee',
                    paymentType: 'daily',
                    paymentRate: 0,
                    accountType: 'Global',
                    status: 'active',
                    joinedAt: nowIso
                };
                onSetEmployees([...employees, newEmployee]);
            }
        }

        return { ok: true, message: `Approved ${request.userName} for ${organization.name}.` };
    } catch (err: any) {
        return {
            ok: false,
            message: err?.message || 'Could not approve join request.'
        };
    }
}

export async function declineJoinRequest(
    request: JoinRequest,
    reviewerId?: string
): Promise<JoinDecisionResult> {
    if (isLocalFarmRuntime()) {
        return {
            ok: false,
            message: 'Local farms use owner-managed local accounts.'
        };
    }

    const nowIso = new Date().toISOString();
    try {
        if (USE_FIREBASE && auth.currentUser) {
            await setDoc(
                doc(db, 'joinRequests', request.id),
                {
                    status: 'declined',
                    reviewedAt: nowIso,
                    ...(reviewerId ? { reviewedBy: reviewerId } : {})
                },
                { merge: true }
            );
        }

        upsertLocalRequest({
            ...request,
            status: 'declined',
            reviewedAt: nowIso,
            reviewedBy: reviewerId
        });

        return { ok: true, message: `Declined join request from ${request.userName}.` };
    } catch (err: any) {
        return {
            ok: false,
            message: err?.message || 'Could not decline join request.'
        };
    }
}

export function useJoinRequests(params: {
    currentUser: User | null;
    activeOrgId?: string | null;
    canManage: boolean;
}) {
    const { currentUser, activeOrgId, canManage } = params;
    const [incomingRequests, setIncomingRequests] = useState<JoinRequest[]>([]);
    const [myRequests, setMyRequests] = useState<JoinRequest[]>([]);
    const [loading, setLoading] = useState(false);

    const mergeWithLocal = useCallback(
        (remote: JoinRequest[], predicate: (r: JoinRequest) => boolean): JoinRequest[] => {
            const map = new Map<string, JoinRequest>();
            for (const row of readLocalRequests().filter(predicate)) {
                map.set(row.id, row);
            }
            for (const row of remote) {
                map.set(row.id, { ...(map.get(row.id) || {}), ...row });
            }
            return [...map.values()].sort((a, b) =>
                String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
            );
        },
        []
    );

    useEffect(() => {
        if (!currentUser || currentUser.isGuest || !canManage || !activeOrgId || activeOrgId === 'ALL') {
            setIncomingRequests([]);
            return;
        }

        const pred = (r: JoinRequest) => r.organizationId === activeOrgId;
        setIncomingRequests(mergeWithLocal([], pred));

        const handleLocal = () => {
            setIncomingRequests(prev => mergeWithLocal(prev, pred));
        };
        window.addEventListener(LOCAL_JOIN_EVENT, handleLocal);

        let unsub: (() => void) | undefined;
        if (USE_FIREBASE && auth.currentUser) {
            setLoading(true);
            unsub = onSnapshot(
                query(collection(db, 'joinRequests'), where('organizationId', '==', activeOrgId)),
                (snapshot: any) => {
                    const docs: JoinRequest[] = (snapshot.docs || []).map((d: any) => ({
                        ...(d.data() as any),
                        id: d.id
                    }));
                    setIncomingRequests(mergeWithLocal(docs, pred));
                    setLoading(false);
                },
                () => {
                    setLoading(false);
                }
            );
        }

        return () => {
            window.removeEventListener(LOCAL_JOIN_EVENT, handleLocal);
            unsub?.();
        };
    }, [currentUser?.id, currentUser?.isGuest, activeOrgId, canManage, mergeWithLocal]);

    useEffect(() => {
        if (!currentUser || currentUser.isGuest) {
            setMyRequests([]);
            return;
        }

        const pred = (r: JoinRequest) => r.userId === currentUser.id;
        setMyRequests(mergeWithLocal([], pred));

        const handleLocal = () => {
            setMyRequests(prev => mergeWithLocal(prev, pred));
        };
        window.addEventListener(LOCAL_JOIN_EVENT, handleLocal);

        let unsub: (() => void) | undefined;
        if (USE_FIREBASE && auth.currentUser) {
            unsub = onSnapshot(
                query(collection(db, 'joinRequests'), where('userId', '==', currentUser.id)),
                (snapshot: any) => {
                    const docs: JoinRequest[] = (snapshot.docs || []).map((d: any) => ({
                        ...(d.data() as any),
                        id: d.id
                    }));
                    setMyRequests(mergeWithLocal(docs, pred));
                },
                () => {}
            );
        }

        return () => {
            window.removeEventListener(LOCAL_JOIN_EVENT, handleLocal);
            unsub?.();
        };
    }, [currentUser?.id, currentUser?.isGuest, mergeWithLocal]);

    return {
        incomingRequests,
        pendingIncomingRequests: incomingRequests.filter(r => r.status === 'pending'),
        myRequests,
        loading
    };
}
