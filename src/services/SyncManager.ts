import {
    db,
    auth,
    getCloudDb,
    getCloudAuth,
    SyncLogEntry,
    bulkUpdateSyncStatus,
    getDocFromServer,
    getDoc,
    increment,
    testFirestoreConnection,
    setConnectionState,
    doc,
    writeBatch
} from '../firebase';
import { USE_FIREBASE } from '../config';
import { toast } from 'sonner';

export const CLOUD_SYNC_TOAST_ID = 'agrimap-cloud-sync';

export interface PushToCloudOptions {
    toastId?: string;
    silent?: boolean;
    includeErrored?: boolean;
    forceOnline?: boolean;
}

let activePushPromise: Promise<boolean> | null = null;

/**
 * Resolves potential collisions on parent records (e.g., harvestEvents totals, inventoryItems stocks, drawn map features)
 * by querying current server state and calculating precise atomic increments or union arrays.
 */
async function applySmartCollisionMerge(
    syncDb: any, 
    colPath: string, 
    docId: string, 
    localItem: SyncLogEntry, 
    batch: any,
    allPendingItems?: SyncLogEntry[]
): Promise<boolean> {
    const docRef = doc(syncDb, colPath, docId);
    
    try {
        let serverDoc: any = null;
        try {
            serverDoc = await getDocFromServer(docRef);
        } catch (fetchErr) {
            console.warn(`[SyncManager] getDocFromServer failed for ${colPath}/${docId}, falling back to getDoc:`, fetchErr);
            try {
                serverDoc = await getDoc(docRef);
            } catch (fallbackErr) {
                console.warn(`[SyncManager] Cache fallback also failed for ${colPath}/${docId}:`, fallbackErr);
            }
        }

        if (!serverDoc || !serverDoc.exists()) {
            // Document doesn't exist on server yet - safe to do absolute set
            batch.set(docRef, localItem.data || {});
            return true;
        }

        const serverData = serverDoc.data() || {};

        if (colPath === 'harvestEvents') {
            // Sum up pending entries in this sync session to get the EXACT deltas
            const queue: SyncLogEntry[] = allPendingItems || JSON.parse(localStorage.getItem('agrimap-pending-sync') || '[]');
            const pendingEntriesForEvent = queue.filter(item => 
                item.path.startsWith('harvestEntries/') && 
                (allPendingItems ? true : (item.status === 'pending' || item.status === 'error')) &&
                item.data && String(item.data.harvestEventId) === String(docId)
            );

            const serverWeight = parseFloat(serverData.totalNetWeightKg) || 0;
            const hasZeroServerTotals = serverWeight === 0;

            // CRITICAL SYNC RESILIENCE FIX:
            // If there are no pending entries in the queue, or if the server has zero totals but the client has actual values,
            // we MUST write the client's absolute values directly to prevent wiping out data or staying at zero.
            if (pendingEntriesForEvent.length === 0 || (hasZeroServerTotals && (localItem.data?.totalNetWeightKg || 0) > 0)) {
                batch.set(docRef, {
                    ...(localItem.data || {}),
                    isSyncRequired: false,
                    syncedAt: new Date().toISOString()
                }, { merge: true });
                console.info(`[SyncManager] Synced harvestEvents/${docId} with absolute values (Pending items: ${pendingEntriesForEvent.length}, Server weight: ${serverWeight}kg).`);
                return true;
            }

            // Calculate precise increments and decrements (deletions) from pending entries
            let deltaWeight = 0;
            let deltaBoxes = 0;
            let deltaGross = 0;

            // Reconstruct variety tallies safely by combining lists
            const mergedYields = [...(serverData.yieldByVariety || [])];

            pendingEntriesForEvent.forEach(item => {
                const isDeleted = item.data.isDeleted === true || item.data.status === 'deleted';
                const weight = parseFloat(item.data.netWeightKg) || 0;
                const boxes = parseInt(item.data.boxCount) || 1;
                const gross = parseFloat(item.data.grossWeightKg ?? item.data.netWeightKg) || 0;

                if (isDeleted) {
                    deltaWeight -= weight;
                    deltaBoxes -= boxes;
                    deltaGross -= gross;

                    if (item.data.variety) {
                        const matchIdx = mergedYields.findIndex(y => y.variety === item.data.variety);
                        if (matchIdx > -1) {
                            mergedYields[matchIdx].weightKg -= weight;
                            if (mergedYields[matchIdx].weightKg < 0) {
                                mergedYields[matchIdx].weightKg = 0;
                            }
                        }
                    }
                } else {
                    deltaWeight += weight;
                    deltaBoxes += boxes;
                    deltaGross += gross;

                    if (item.data.variety) {
                        const matchIdx = mergedYields.findIndex(y => y.variety === item.data.variety);
                        if (matchIdx > -1) {
                            mergedYields[matchIdx].weightKg += weight;
                        } else {
                            mergedYields.push({ variety: item.data.variety, weightKg: weight });
                        }
                    }
                }
            });

            // Clean up variety list to filter out zero weight entries
            const finalYields = mergedYields.filter(y => y.weightKg > 0);

            // Safely omit absolute values from localItem.data so we don't overwrite the atomic increments!
            const { 
                totalNetWeightKg, 
                totalBoxes, 
                totalGrossWeightKg, 
                yieldByVariety, 
                isSyncRequired, 
                syncedAt, 
                ...remainingLocalData 
            } = localItem.data || {};

            // Perform server-side atomic updates so no concurrent tablet data is overwritten!
            batch.update(docRef, {
                ...remainingLocalData,
                totalNetWeightKg: increment(deltaWeight),
                totalBoxes: increment(deltaBoxes),
                totalGrossWeightKg: increment(deltaGross),
                yieldByVariety: finalYields,
                isSyncRequired: false,
                syncedAt: new Date().toISOString()
            });

            console.info(`[SyncManager] Merged harvestEvents/${docId} atomically: +${deltaWeight}kg, +${deltaBoxes} crates.`);
            return true;
        } 
        
        if (colPath === 'inventoryItems') {
            // For stock levels, avoid overwriting with stale client numbers
            // Calculate delta of stock change from localItem data
            const localStock = parseFloat(localItem.data?.currentStock) || 0;
            
            // Try to find the pre-edited cache value to compute exact offset, falling back to simple difference or 0
            const cacheStr = localStorage.getItem('fb_cache_inventoryItems');
            let originalCacheVal = localStock;
            if (cacheStr) {
                try {
                    const cacheArr = JSON.parse(cacheStr);
                    const matchedItem = cacheArr.find((i: any) => i.id === docId);
                    if (matchedItem) {
                        originalCacheVal = parseFloat(matchedItem.currentStock) || localStock;
                    }
                } catch (e) {}
            }
            
            const deltaOffset = localStock - originalCacheVal;
            
            // Safely omit currentStock and syncedAt from the metadata update to avoid overwriting!
            const { currentStock, syncedAt, ...remainingInventoryData } = localItem.data || {};

            if (deltaOffset !== 0) {
                batch.update(docRef, {
                    ...remainingInventoryData,
                    currentStock: increment(deltaOffset),
                    syncedAt: new Date().toISOString()
                });
                console.info(`[SyncManager] Merged inventoryItems/${docId} atomically: stock offset delta of ${deltaOffset}`);
            } else {
                // If no delta, just update metadata safely
                batch.update(docRef, {
                    ...remainingInventoryData,
                    syncedAt: new Date().toISOString()
                });
            }
            return true;
        }

        if (colPath === 'plantationFeatures') {
            // For map features drawn or modified, combine opex log arrays and details safely
            const mergedOpex = [...(serverData.historicalOpex || [])];
            (localItem.data?.historicalOpex || []).forEach((item: any) => {
                if (!mergedOpex.some(o => o.id === item.id)) {
                    mergedOpex.push(item);
                }
            });

            batch.set(docRef, {
                ...(localItem.data || {}),
                historicalOpex: mergedOpex,
                syncedAt: new Date().toISOString()
            }, { merge: true });
            console.info(`[SyncManager] Merged plantationFeatures/${docId} arrays safely.`);
            return true;
        }

        // Default: update other fields while maintaining ID
        batch.set(docRef, {
            ...(localItem.data || {}),
            syncedAt: new Date().toISOString()
        }, { merge: true });
        return true;

    } catch (err) {
        console.warn(`[SyncManager] Could not perform transaction-merge, falling back to overwriting for ${colPath}/${docId}:`, err);
        // Fallback: batch write absolutely with merge to prevent NOT_FOUND batch abort
        if (localItem.type === 'set') {
            batch.set(docRef, localItem.data || {});
        } else {
            batch.set(docRef, localItem.data || {}, { merge: true });
        }
        return false;
    }
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`)), timeoutMs);
            })
        ]);
    } finally {
        if (timer !== undefined) clearTimeout(timer);
    }
};

/**
 * Manages data synchronization between local storage (Offline), 
 * a Local Network Server, and Google Cloud Firestore.
 */
export const syncManager = {
    isSyncing: () => activePushPromise !== null,

    /**
     * Pushes all pending local operations to the cloud.
     * Coalesces concurrent invocations so duplicate sync toasts and parallel batches never pile up.
     */
    pushAllToCloud: async (options: PushToCloudOptions = {}): Promise<boolean> => {
        if (activePushPromise) {
            console.info('[SyncManager] Sync already in progress; coalescing concurrent pushAllToCloud call.');
            return activePushPromise;
        }

        const run = async (): Promise<boolean> => {
            const toastId = options.toastId || CLOUD_SYNC_TOAST_ID;
            const silent = Boolean(options.silent);

            const savedLocalConfig = localStorage.getItem('agrimap-local-config');
            let isLocalMode = false;
            try {
                if (savedLocalConfig) isLocalMode = JSON.parse(savedLocalConfig).isLocalMode;
            } catch (e) {}

            // Use cloudDb only if it actually has an authenticated session; otherwise primary db is already connected to Cloud Firestore
            const cloudAuthUser = getCloudAuth()?.currentUser;
            const syncDb = (isLocalMode && cloudAuthUser) ? getCloudDb() : db;

            if (!syncDb) {
                if (!silent) toast.error("Database configuration missing.", { id: toastId, duration: 4000 });
                return false;
            }

            let syncQueue: SyncLogEntry[] = [];
            try {
                syncQueue = JSON.parse(localStorage.getItem('agrimap-pending-sync') || '[]');
            } catch {
                syncQueue = [];
            }
            
            // AUTO-CLEANUP: Mark guest profile syncs as completed immediately. They should never have been queued for Cloud.
            const invalidSyncIds = syncQueue
                .filter(i => (i.status === 'pending' || i.status === 'error') && (i.path === 'users/guest' || i.path.startsWith('users/guest/')))
                .map(i => i.id);
                
            if (invalidSyncIds.length > 0) {
                bulkUpdateSyncStatus(invalidSyncIds, 'cloud_synced');
                console.log(`[SyncManager] Auto-resolved ${invalidSyncIds.length} invalid guest sync entries.`);
            }

            const allowedStatuses = options.includeErrored ? ['pending', 'error'] : ['pending'];
            const pendingItems = syncQueue.filter(
                i => allowedStatuses.includes(i.status) && !(i.path === 'users/guest' || i.path.startsWith('users/guest/'))
            );
            
            if (pendingItems.length === 0) {
                if (!silent) {
                    toast.info("No pending changes to sync.", { id: toastId, duration: 3000 });
                } else if (options.toastId) {
                    toast.dismiss(toastId);
                }
                return true;
            }

            // PRE-FLIGHT CONNECTIVITY & AUTH GUARDS
            // Prevent Firestore batch.commit() from hanging indefinitely when network is offline or disabled!
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                if (!silent) {
                    toast.error("Cloud Sync: Device is offline. Changes remain safely queued.", { id: toastId, duration: 4000 });
                } else if (options.toastId) {
                    toast.dismiss(toastId);
                }
                return false;
            }

            const isManualOffline = localStorage.getItem('agrimap-manual-offline') === 'true';
            if (isManualOffline && !options.forceOnline) {
                if (!silent) {
                    toast.warning("Offline mode is active. Disable Offline Mode to sync with Cloud.", { id: toastId, duration: 4000 });
                } else if (options.toastId) {
                    toast.dismiss(toastId);
                }
                return false;
            }

            if (USE_FIREBASE) {
                const activeUid = auth.currentUser?.uid || cloudAuthUser?.uid || '';
                if (!activeUid) {
                    if (!silent) {
                        toast.error("Please sign in to your Cloud account to sync offline changes.", { id: toastId, duration: 4500 });
                    } else if (options.toastId) {
                        toast.dismiss(toastId);
                    }
                    return false;
                }

                const reachable = await testFirestoreConnection(4000);
                if (!reachable && !options.forceOnline) {
                    if (!silent) {
                        toast.error("Cloud Sync: Could not complete synchronization with server. Please verify connection.", { id: toastId, duration: 4000 });
                    } else if (options.toastId) {
                        toast.dismiss(toastId);
                    }
                    return false;
                }

                // Ensure primary Firestore network is enabled before issuing batch.commit()
                await setConnectionState(true);
            }

            if (!silent) {
                toast.loading(`Syncing ${pendingItems.length} operations with Atomic Collisons Shield...`, { id: toastId });
            }

            let successCount = 0;
            let lastBatchErrorMsg = '';
            const activeOrgId = localStorage.getItem('agri-planter-active-org') || '';
            const activeUid = auth.currentUser?.uid || cloudAuthUser?.uid || '';

            const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

            try {
                // Cellular Timeout Guard: Maximum 100 Firestore operations per batch transaction
                const batchSize = 100; 
                for (let i = 0; i < pendingItems.length; i += batchSize) {
                    if (i > 0) {
                        await sleep(200);
                    }

                    const chunk = pendingItems.slice(i, i + batchSize);
                    const batch = writeBatch(syncDb);
                    const chunkIds: string[] = [];
                    const skippedMalformedIds: string[] = [];

                    // Bounded parallel lookup for idempotency tokens (speeds up 40+ item queues drastically)
                    const tokenExistsMap = new Map<string, boolean>();
                    const itemsWithTokens = chunk.filter(item => Boolean(item.idempotencyToken));
                    const lookupConcurrency = 10;
                    for (let tIdx = 0; tIdx < itemsWithTokens.length; tIdx += lookupConcurrency) {
                        const slice = itemsWithTokens.slice(tIdx, tIdx + lookupConcurrency);
                        await Promise.all(slice.map(async (item) => {
                            const token = item.idempotencyToken!;
                            try {
                                const tokenRef = doc(syncDb, 'processedTokens', token);
                                let tokenSnap: any = null;
                                try {
                                    tokenSnap = await withTimeout(getDocFromServer(tokenRef), 5000, 'Token check');
                                } catch {
                                    tokenSnap = await getDoc(tokenRef).catch(() => null);
                                }
                                tokenExistsMap.set(token, Boolean(tokenSnap && tokenSnap.exists()));
                            } catch (tokenErr) {
                                console.warn(`[SyncManager-Idempotence] Error querying processedToken ${token}, fallback to standard execution`, tokenErr);
                                tokenExistsMap.set(token, false);
                            }
                        }));
                    }

                    for (const item of chunk) {
                        try {
                            const parts = (item.path || '').split('/').filter(Boolean);
                            const colPath = parts[0];
                            const docId = parts[1];
                            if (!colPath || !docId) {
                                skippedMalformedIds.push(item.id);
                                continue;
                            }

                            // Idempotency token check
                            if (item.idempotencyToken) {
                                const alreadyProcessed = tokenExistsMap.get(item.idempotencyToken) === true;
                                if (alreadyProcessed) {
                                    console.warn(`[SyncManager] Token ${item.idempotencyToken} has already been processed on the cloud. Avoiding duplicate delta count.`);
                                    chunkIds.push(item.id);
                                    continue;
                                }

                                const tokenRef = doc(syncDb, 'processedTokens', item.idempotencyToken);
                                batch.set(tokenRef, {
                                    processedAt: new Date().toISOString(),
                                    path: item.path,
                                    type: item.type,
                                    organizationId: item.organizationId || activeOrgId || '',
                                    createdBy: activeUid || ''
                                });
                            }
                            
                            const docRef = doc(syncDb, colPath, docId);

                            switch (item.type) {
                                case 'set':
                                case 'update':
                                case 'add':
                                    if (!item.data || typeof item.data !== 'object') {
                                        skippedMalformedIds.push(item.id);
                                        continue;
                                    }
                                    if (['harvestEvents', 'inventoryItems', 'plantationFeatures'].includes(colPath)) {
                                        await applySmartCollisionMerge(syncDb, colPath, docId, item, batch, pendingItems);
                                    } else {
                                        if (item.type === 'set' || item.type === 'add') {
                                            batch.set(docRef, item.data);
                                        } else {
                                            // Merge prevents NOT_FOUND errors on missing docs from failing the entire batch
                                            batch.set(docRef, item.data, { merge: true });
                                        }
                                    }
                                    break;
                                case 'delete':
                                    batch.delete(docRef);
                                    break;
                            }
                            chunkIds.push(item.id);
                        } catch (err) {
                            console.error(`Readying batch failed for item ${item.id}:`, err);
                        }
                    }

                    if (skippedMalformedIds.length > 0) {
                        bulkUpdateSyncStatus(skippedMalformedIds, 'error', 'Malformed sync entry path or payload');
                    }

                    if (chunkIds.length === 0) {
                        continue;
                    }

                    try {
                        await withTimeout(batch.commit(), 20000, 'Firestore batch commit');
                        bulkUpdateSyncStatus(chunkIds, 'cloud_synced');
                        successCount += chunkIds.length;
                    } catch (batchError: any) {
                        console.error("Batch commit failed:", batchError);
                        lastBatchErrorMsg = batchError?.message || "Batch failed";
                        bulkUpdateSyncStatus(chunkIds, 'error', lastBatchErrorMsg);
                    }
                }

                if (successCount > 0) {
                    if (!silent) {
                        toast.success(`Cloud Sync Complete: ${successCount} operations synchronized atomically.`, { id: toastId, duration: 4000 });
                    } else if (options.toastId) {
                        toast.dismiss(toastId);
                    }
                    return true;
                } else {
                    if (!silent) {
                        const errText = lastBatchErrorMsg
                            ? `Batch failed: ${lastBatchErrorMsg}`
                            : "Cloud Sync: Could not complete synchronization with server. Please verify connection.";
                        toast.error(errText, { id: toastId, duration: 4500 });
                    } else if (options.toastId) {
                        toast.dismiss(toastId);
                    }
                    return false;
                }
            } catch (error: any) {
                console.error("Cloud Sync Failed:", error);
                if (!silent) {
                    toast.error("Batch synchronization failed. Retrying in background...", { id: toastId, duration: 5000 });
                } else if (options.toastId) {
                    toast.dismiss(toastId);
                }
                return false;
            }
        };

        activePushPromise = run().finally(() => {
            activePushPromise = null;
        });

        return activePushPromise;
    },

    /**
     * Active analyzer to identify structural or data conflicts.
     * Prevents headless background sync from executing on collision risks without explicit visual consent.
     */
    isConflictPresent: () => {
        const syncQueue: SyncLogEntry[] = JSON.parse(localStorage.getItem('agrimap-pending-sync') || '[]');
        const activeItems = syncQueue.filter(i => {
            const isIgnoredPath = i.path === 'users/guest' || i.path.startsWith('users/guest/');
            return (i.status === 'pending' || i.status === 'error') && !isIgnoredPath;
        });

        // 1. Any existing operation in error status is a conflict requiring auditing
        if (activeItems.some(i => i.status === 'error')) {
            return true;
        }

        // 2. Edits to existing crucial shared enterprise objects (events and Stock balances)
        const conflictPaths = ['harvestEvents', 'inventoryItems'];
        const hasRisk = activeItems.some(item => {
            const col = item.path.split('/')[0];
            // creations (add / set on non-existing path is fine, but updates/sets to pre-existing rows represent conflict potentials)
            return conflictPaths.includes(col) && item.type !== 'add';
        });

        return hasRisk;
    },

    /**
     * Clears local cache.
     */
    clearLocalCache: () => {
        localStorage.removeItem('agrimap-pending-sync');
        return true;
    }
};
