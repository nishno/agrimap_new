import { toast } from 'sonner';
import { auth, db, deleteDoc, doc, setDoc, updateDoc } from '../firebase';
import { USE_FIREBASE } from '../config';
import { safeStorage } from '../services/storageService';
import type {
    Alert,
    Employee,
    ForumPost,
    Membership,
    Organization,
    Role,
    User,
    UserRole
} from '../types';

const stripUndefined = <T extends Record<string, any>>(obj: T): T => {
    const out: Record<string, any> = {};
    Object.keys(obj).forEach((key) => {
        if (obj[key] !== undefined) {
            out[key] = obj[key];
        }
    });
    return out as T;
};

export const isCompanyJoinTicketPost = (post?: Partial<ForumPost> | null): boolean => {
    if (!post) return false;
    const title = (post.title || '').trim();
    const content = (post.content || '').trim();
    return (
        post.ticketType === 'company_join' ||
        title === 'Join Request' ||
        title.startsWith('Official Ticket for ') ||
        content.startsWith('[TICKET-REQUEST]') ||
        content.includes('Formal Join Request:') ||
        content.includes('handshake request to join')
    );
};

export const extractTicketDisplayBody = (post?: Partial<ForumPost> | null): string => {
    const raw = (post?.content || '').trim();
    if (raw.startsWith('[TICKET-REQUEST]')) {
        return raw.replace(/^\[TICKET-REQUEST\]\s*/i, '').trim() || raw;
    }
    return raw;
};

export const resolveTicketTargetOrgId = (params: {
    post?: Partial<ForumPost> | null;
    activeOrgId?: string | null;
    organizations?: Organization[];
    memberships?: Membership[];
}): string | undefined => {
    const { post, activeOrgId, organizations = [], memberships = [] } = params;
    const isRealOrg = (id?: string | null) => !!id && id !== 'ALL' && id !== 'personal';

    if (post?.ticketOrgId && isRealOrg(post.ticketOrgId)) {
        return post.ticketOrgId;
    }
    if (post?.recipientId && organizations.some((o) => o.id === post.recipientId)) {
        return post.recipientId;
    }
    if (post?.organizationId && isRealOrg(post.organizationId)) {
        return post.organizationId;
    }
    if (post?.recipientId) {
        const ownedOrg = organizations.find((o) => o.createdBy === post.recipientId);
        if (ownedOrg) return ownedOrg.id;
        const adminMem = memberships.find(
            (m) =>
                m.userId === post.recipientId &&
                (m.status === 'active' || !m.status) &&
                ['Founder', 'Admin', 'Co-Founder'].includes(m.role)
        );
        if (adminMem) return adminMem.organizationId;
    }
    if (post?.title?.startsWith('Official Ticket for ')) {
        const recipientLabel = post.title.replace('Official Ticket for ', '').trim().toLowerCase();
        const namedOrg = organizations.find((o) => o.name.toLowerCase() === recipientLabel);
        if (namedOrg) return namedOrg.id;
    }
    if (isRealOrg(activeOrgId)) {
        return activeOrgId as string;
    }
    return undefined;
};

export const getTicketResolutionState = (
    post: Partial<ForumPost> | null | undefined,
    memberships: Membership[] = [],
    targetOrgId?: string | null
): 'pending' | 'approved' | 'declined' => {
    if (post?.ticketStatus === 'approved') return 'approved';
    if (post?.ticketStatus === 'declined') return 'declined';

    const matchedMembership = memberships.find((m) => {
        if (post?.ticketMembershipId && m.id === post.ticketMembershipId) return true;
        if (!post?.authorId || m.userId !== post.authorId) return false;
        if (targetOrgId && targetOrgId !== 'ALL') {
            return m.organizationId === targetOrgId;
        }
        return true;
    });

    if (matchedMembership?.status === 'active') return 'approved';
    if (matchedMembership?.status === 'declined') return 'declined';
    return 'pending';
};

export interface ResolveCompanyTicketParams {
    decision: 'approve' | 'decline';
    userId: string;
    userName?: string;
    orgId?: string | null;
    orgName?: string;
    membershipId?: string;
    selectedRole?: string;
    postId?: string;
    alertId?: string;
    currentUser?: User | null;
    memberships?: Membership[];
    onSetMemberships?: (memberships: Membership[]) => void;
    employees?: Employee[];
    onSetEmployees?: (employees: Employee[]) => void;
    users?: User[];
    allUsers?: User[];
    onSetUsers?: (users: User[]) => void;
    roles?: Role[];
    organizations?: Organization[];
    forumPosts?: ForumPost[];
    onAddPost?: (post: Partial<ForumPost>) => void;
    onUpdatePost?: (postId: string, updates: Partial<ForumPost>) => void;
    alerts?: Alert[];
    onSetAlerts?: React.Dispatch<React.SetStateAction<Alert[]>> | ((alerts: Alert[]) => void);
    isKa?: boolean;
}

export const resolveCompanyTicketOrJoin = async (
    params: ResolveCompanyTicketParams
): Promise<{ success: boolean; status: 'approved' | 'declined' }> => {
    const {
        decision,
        userId,
        userName,
        orgId,
        orgName,
        membershipId,
        selectedRole = 'Employee',
        postId,
        alertId,
        currentUser,
        memberships = [],
        onSetMemberships,
        employees = [],
        onSetEmployees,
        users = [],
        allUsers = [],
        onSetUsers,
        roles = [],
        organizations = [],
        forumPosts = [],
        onAddPost,
        onUpdatePost,
        alerts = [],
        onSetAlerts,
        isKa = false
    } = params;

    const now = new Date().toISOString();
    const resolvedOrgId = orgId && orgId !== 'ALL' && orgId !== 'personal' ? orgId : undefined;
    const resolvedOrgName =
        orgName ||
        organizations.find((o) => o.id === resolvedOrgId)?.name ||
        (isKa ? 'კომპანია' : 'the company');

    const userPool = allUsers.length > 0 ? allUsers : users;
    const requestingUser = userPool.find((u) => u.id === userId) || users.find((u) => u.id === userId);
    const resolvedUserName = userName || requestingUser?.name || (isKa ? 'მომხმარებელი' : 'Partner');

    const effectiveMembershipId =
        membershipId || (resolvedOrgId && userId ? `${userId}_${resolvedOrgId}` : undefined);

    const permissionLevel: 'read' | 'write' | 'admin' =
        selectedRole === 'Admin' || selectedRole === 'Founder' || selectedRole === 'Co-Founder'
            ? 'admin'
            : selectedRole === 'Field Manager'
                ? 'write'
                : 'read';

    const newStatus: 'approved' | 'declined' = decision === 'approve' ? 'approved' : 'declined';

    try {
        // 1. Update Membership (both state/mock and Firestore)
        if (effectiveMembershipId && resolvedOrgId && userId) {
            const existingMem = memberships.find(
                (m) =>
                    m.id === effectiveMembershipId ||
                    (m.userId === userId && m.organizationId === resolvedOrgId)
            );
            const targetMem: Membership = {
                id: existingMem?.id || effectiveMembershipId,
                userId,
                organizationId: resolvedOrgId,
                role: (decision === 'approve' ? selectedRole : existingMem?.role || 'Employee') as UserRole,
                permissionLevel: decision === 'approve' ? permissionLevel : 'read',
                status: decision === 'approve' ? 'active' : 'declined',
                joinedAt: existingMem?.joinedAt || now
            };

            const nextMemberships = existingMem
                ? memberships.map((m) => (m.id === existingMem.id ? targetMem : m))
                : [...memberships, targetMem];

            if (onSetMemberships) {
                await Promise.resolve(onSetMemberships(nextMemberships));
            } else {
                const savedMems = safeStorage.safeParse(localStorage.getItem('mock_memberships'), []);
                const updatedMockMems = savedMems.some((m: any) => m.id === targetMem.id)
                    ? savedMems.map((m: any) => (m.id === targetMem.id ? targetMem : m))
                    : [...savedMems, targetMem];
                localStorage.setItem('mock_memberships', JSON.stringify(updatedMockMems));
            }

            if (USE_FIREBASE && auth.currentUser && currentUser?.id !== 'root-system') {
                await setDoc(doc(db, 'memberships', targetMem.id), stripUndefined(targetMem), { merge: true }).catch(
                    (err) => console.warn('[TicketAction] Firestore membership sync failed:', err)
                );
            }
        }

        // 2. Sync HR Employee record
        if (resolvedOrgId && userId) {
            const deterministicEmpId = `emp-${userId}-${resolvedOrgId}`;
            const roleDef = roles.find(
                (r) => r.name?.toLowerCase() === selectedRole.toLowerCase() || r.id === selectedRole
            );
            const resolvedRoleId = roleDef?.id || selectedRole || 'Employee';

            if (decision === 'approve') {
                const existingEmp = employees.find(
                    (e) =>
                        e.id === deterministicEmpId ||
                        (e.organizationId === resolvedOrgId &&
                            ((requestingUser?.email &&
                                e.email &&
                                e.email.toLowerCase() === requestingUser.email.toLowerCase()) ||
                                (requestingUser?.personalNumber &&
                                    e.idNumber &&
                                    e.idNumber === requestingUser.personalNumber)))
                );

                const targetEmp: Employee = existingEmp
                    ? {
                          ...existingEmp,
                          roleId: resolvedRoleId,
                          status: 'active',
                          employeeType: existingEmp.employeeType === 'Temporary' ? 'Permanent' : existingEmp.employeeType,
                          isGlobalUser: true,
                          organizationId: resolvedOrgId
                      }
                    : {
                          id: deterministicEmpId,
                          name: resolvedUserName,
                          email: requestingUser?.email || '',
                          phone: requestingUser?.phone || '',
                          idNumber: requestingUser?.personalNumber || '',
                          roleId: resolvedRoleId,
                          paymentType: 'hourly',
                          paymentRate: 0,
                          barcode: `BC-${Date.now()}`,
                          employeeType: 'Permanent',
                          accountType: 'Bank Account',
                          status: 'active',
                          joinedAt: now,
                          organizationId: resolvedOrgId,
                          isGlobalUser: true
                      };

                const nextEmployees = existingEmp
                    ? employees.map((e) => (e.id === existingEmp.id ? targetEmp : e))
                    : [...employees, targetEmp];

                if (onSetEmployees) {
                    await Promise.resolve(onSetEmployees(nextEmployees));
                } else {
                    const savedEmps = safeStorage.safeParse(localStorage.getItem('mock_employees'), []);
                    const updatedMockEmps = existingEmp
                        ? savedEmps.map((e: any) => (e.id === existingEmp.id ? targetEmp : e))
                        : [...savedEmps.filter((e: any) => e.id !== deterministicEmpId), targetEmp];
                    localStorage.setItem('mock_employees', JSON.stringify(updatedMockEmps));
                    if (USE_FIREBASE && auth.currentUser && currentUser?.id !== 'root-system') {
                        await setDoc(doc(db, 'employees', targetEmp.id), stripUndefined(targetEmp), {
                            merge: true
                        }).catch((err) => console.warn('[TicketAction] Firestore employee approve failed:', err));
                    }
                }
            } else {
                // Decline: remove temporary pending employee created at handshake time (if any)
                const pendingTempEmps = employees.filter(
                    (e) =>
                        e.id === deterministicEmpId ||
                        (e.organizationId === resolvedOrgId &&
                            e.employeeType === 'Temporary' &&
                            requestingUser?.email &&
                            e.email?.toLowerCase() === requestingUser.email.toLowerCase())
                );
                if (pendingTempEmps.length > 0) {
                    const removeIds = new Set(pendingTempEmps.map((e) => e.id));
                    const nextEmployees = employees.filter((e) => !removeIds.has(e.id));
                    if (onSetEmployees) {
                        await Promise.resolve(onSetEmployees(nextEmployees));
                    } else {
                        const savedEmps = safeStorage.safeParse(localStorage.getItem('mock_employees'), []);
                        localStorage.setItem(
                            'mock_employees',
                            JSON.stringify(savedEmps.filter((e: any) => !removeIds.has(e.id)))
                        );
                        if (USE_FIREBASE && auth.currentUser && currentUser?.id !== 'root-system') {
                            for (const remId of removeIds) {
                                await deleteDoc(doc(db, 'employees', remId)).catch((err) =>
                                    console.warn('[TicketAction] Firestore employee cleanup failed:', err)
                                );
                            }
                        }
                    }
                }
            }
        }

        // 3. Update requester user roles on approve
        if (decision === 'approve' && requestingUser && onSetUsers) {
            const currentUserList = users.length > 0 ? users : allUsers;
            const roleToAdd = selectedRole as UserRole;
            const updatedUser: User = {
                ...requestingUser,
                currentOrgId: requestingUser.currentOrgId || resolvedOrgId,
                roles: [roleToAdd, ...(requestingUser.roles || []).filter((r) => r !== roleToAdd && r !== 'Guest')]
            };
            const existsInList = currentUserList.some((u) => u.id === requestingUser.id);
            const nextUsers = existsInList
                ? currentUserList.map((u) => (u.id === requestingUser.id ? updatedUser : u))
                : [...currentUserList, updatedUser];
            await Promise.resolve(onSetUsers(nextUsers));
        }

        // 4. Update matching ForumPost ticket(s) so ticketStatus persists & buttons don't stay stale
        const matchingPosts = forumPosts.filter((p) => {
            if (postId && p.id === postId) return true;
            if (!isCompanyJoinTicketPost(p)) return false;
            if (p.authorId !== userId) return false;
            if (p.ticketStatus === 'approved' || p.ticketStatus === 'declined') return false;
            const pOrgId = resolveTicketTargetOrgId({ post: p, organizations, memberships });
            if (resolvedOrgId && pOrgId && pOrgId !== resolvedOrgId) return false;
            return true;
        });

        const postUpdates: Partial<ForumPost> = {
            ticketStatus: newStatus,
            ticketResolvedBy: currentUser?.id,
            ticketResolvedAt: now
        };

        if (matchingPosts.length > 0) {
            for (const p of matchingPosts) {
                if (onUpdatePost) {
                    await Promise.resolve(onUpdatePost(p.id, postUpdates));
                } else if (USE_FIREBASE && auth.currentUser && currentUser?.id !== 'root-system') {
                    await updateDoc(doc(db, 'forumPosts', p.id), stripUndefined(postUpdates)).catch((err) =>
                        console.warn('[TicketAction] Firestore post update failed:', err)
                    );
                }
            }
        } else if (postId) {
            if (onUpdatePost) {
                await Promise.resolve(onUpdatePost(postId, postUpdates));
            } else if (USE_FIREBASE && auth.currentUser && currentUser?.id !== 'root-system') {
                await updateDoc(doc(db, 'forumPosts', postId), stripUndefined(postUpdates)).catch((err) =>
                    console.warn('[TicketAction] Firestore post update failed:', err)
                );
            }
        }

        // 5. Mark matching Alert(s) as resolved & read
        const matchingAlerts = alerts.filter((a) => {
            if (alertId && a.id === alertId) return true;
            if (effectiveMembershipId && a.metadata?.membershipId === effectiveMembershipId) return true;
            if (postId && a.metadata?.postId === postId) return true;
            if (
                userId &&
                resolvedOrgId &&
                a.metadata?.userId === userId &&
                (a.organizationId === resolvedOrgId || a.metadata?.orgId === resolvedOrgId)
            ) {
                return true;
            }
            return false;
        });

        const resolvedAlertIds = new Set(matchingAlerts.map((a) => a.id));
        if (alertId) resolvedAlertIds.add(alertId);

        if (resolvedAlertIds.size > 0) {
            if (onSetAlerts) {
                const applyAlertUpdate = (prev: Alert[]) =>
                    prev.map((a) =>
                        resolvedAlertIds.has(a.id)
                            ? {
                                  ...a,
                                  isRead: true,
                                  actions: [],
                                  metadata: { ...(a.metadata || {}), resolvedStatus: newStatus }
                              }
                            : a
                    );
                if (typeof onSetAlerts === 'function') {
                    // Support both React Dispatch and array setter gracefully
                    const nextLocal = applyAlertUpdate(alerts);
                    try {
                        (onSetAlerts as any)((prev: any) =>
                            Array.isArray(prev) ? applyAlertUpdate(prev) : nextLocal
                        );
                    } catch {
                        (onSetAlerts as any)(nextLocal);
                    }
                }
            }

            if (!USE_FIREBASE) {
                const savedAlerts = safeStorage.safeParse(localStorage.getItem('mock_alerts'), []);
                if (Array.isArray(savedAlerts) && savedAlerts.length > 0) {
                    const updatedMockAlerts = savedAlerts.map((a: any) =>
                        resolvedAlertIds.has(a.id)
                            ? {
                                  ...a,
                                  isRead: true,
                                  actions: [],
                                  metadata: { ...(a.metadata || {}), resolvedStatus: newStatus }
                              }
                            : a
                    );
                    localStorage.setItem('mock_alerts', JSON.stringify(updatedMockAlerts));
                }
            } else if (auth.currentUser && currentUser?.id !== 'root-system') {
                for (const aId of resolvedAlertIds) {
                    const existing = alerts.find((a) => a.id === aId);
                    await updateDoc(doc(db, 'alerts', aId), {
                        isRead: true,
                        actions: [],
                        metadata: { ...(existing?.metadata || {}), resolvedStatus: newStatus }
                    }).catch((err) => console.warn('[TicketAction] Firestore alert resolve failed:', err));
                }
            }
        }

        // 6. Send response / status message to requester
        if (onAddPost && userId) {
            const messageContent =
                decision === 'approve'
                    ? isKa
                        ? `მოთხოვნა დამტკიცდა! კეთილი იყოს თქვენი მობრძანება კომპანიაში "${resolvedOrgName}" როლით: ${selectedRole}.`
                        : `Welcome to ${resolvedOrgName}! Your request to join as ${selectedRole} has been approved.`
                    : isKa
                        ? `კომპანიაში "${resolvedOrgName}" გაწევრიანების მოთხოვნა უარყოფილია.`
                        : `Your request to join ${resolvedOrgName} has been declined.`;

            onAddPost({
                title:
                    decision === 'approve'
                        ? isKa
                            ? 'მოთხოვნა დადასტურდა'
                            : 'Request Approved'
                        : isKa
                            ? 'მოთხოვნა უარყოფილია'
                            : 'Request Declined',
                content: messageContent,
                channelId: 'internal',
                hubType: 'internal',
                isDirectMessage: true,
                recipientId: userId,
                recipientName: resolvedUserName,
                organizationId: resolvedOrgId,
                ticketStatus: newStatus,
                replies: []
            });
        }

        toast.success(
            decision === 'approve'
                ? isKa
                    ? `${resolvedUserName} დაემატა კომპანიაში (${selectedRole})`
                    : `${resolvedUserName} approved & added as ${selectedRole}`
                : isKa
                    ? `${resolvedUserName}-ის მოთხოვნა უარყოფილია`
                    : `Request from ${resolvedUserName} declined`
        );

        return { success: true, status: newStatus };
    } catch (err) {
        console.error('[TicketAction] Failed to resolve company ticket/join request:', err);
        toast.error(
            isKa
                ? 'მოთხოვნის დამუშავება ვერ მოხერხდა'
                : 'Failed to process company request.'
        );
        return { success: false, status: newStatus };
    }
};
