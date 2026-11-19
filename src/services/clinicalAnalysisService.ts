/**
 * clinicalAnalysisService.ts
 *
 * Persistent storage and management service for AI Agricultural Analysis,
 * Agronomist Clinical Conclusions, Structured Treatment/Nutrition Prescriptions,
 * and Clinical Archive (`clinicalRecords`) with safe legacy migration and tombstones.
 */

import { USE_FIREBASE } from '../config';
import {
    auth,
    db,
    collection,
    query,
    where,
    getDocs,
    setDoc,
    doc
} from '../firebase';
import type { AgronomistDiagnosis } from '../new_engine/types';

export type ClinicalAnalysisType = 'disease' | 'document' | 'agro_image' | 'soil';
export type ClinicalSourceCategory = 'AI-generated' | 'Agronomist-created' | 'Combined';

export interface ClinicalRecipeElement {
    inventoryItemId: string;
    newItemName: string;
    quantity: number;
    unit: string;
}

export interface ClinicalStructuredPlan {
    treatment: string;
    dosage: string;
    nutrition: string;
    prevention: string;
    elements: ClinicalRecipeElement[];
}

export interface AgronomistPrescriptionConclusion {
    notes: string;
    severity: 'Mild' | 'Moderate' | 'Severe' | 'Critical';
    prescribedTreatment: string;
    activeIngredients: string[];
    recommendedDosage: string;
    prescribedNutrition: string;
    preventiveMeasures: string;
    targetSectorOrPlot?: string;
    inspectionCadence?: string;
    authorName: string;
    authorRole: string;
    authorId?: string;
    isVerified: boolean;
    updatedAt: string;
}

export interface PeerComparisonCase {
    agronomistName: string;
    organization: string;
    condition: string;
    prescribedTreatment: string;
    prescribedNutrition: string;
    preventiveMeasure: string;
    recoveryOutcomePercent: number;
    dosage: string;
    activeIngredient: string;
    date: string;
}

export interface PeerComparisonData {
    targetCondition: string;
    similarCasesFound: number;
    topActiveIngredients: {
        ingredient: string;
        usagePercentage: number;
        avgRecoveryRate: number;
    }[];
    consensusTreatmentProtocol: string;
    consensusNutritionStrategy: string;
    preventiveRecommendation: string;
    observedCases: PeerComparisonCase[];
}

export interface SavedAgroAnalysisRecord {
    id: string;
    ownerId?: string;
    sourceCategory?: ClinicalSourceCategory;
    updatedAt?: string;
    plan?: ClinicalStructuredPlan;
    type: ClinicalAnalysisType;
    title: string;
    createdAt: string;
    organizationId: string;
    imageDataUrl?: string;
    fileNames?: string[];
    rawAiResult: any;
    agronomistConclusion?: AgronomistPrescriptionConclusion;
    aiLearnedInsights?: string;
    peerComparison?: PeerComparisonData;
    migrationSource?: 'legacy';
    isDeleted?: boolean;
}

const LEGACY_LOCAL_KEY = 'agri_saved_clinical_analyses';
const LOCAL_CLINICAL_RECORDS_KEY = 'agrimap_clinical_records_v1';

const readLocalClinicalRecords = (): SavedAgroAnalysisRecord[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(LOCAL_CLINICAL_RECORDS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeLocalClinicalRecords = (rows: SavedAgroAnalysisRecord[]) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(LOCAL_CLINICAL_RECORDS_KEY, JSON.stringify(rows));
    } catch {
        // Ignore storage quota errors
    }
};

const upsertLocalClinicalRecord = (record: SavedAgroAnalysisRecord) => {
    const existing = readLocalClinicalRecords();
    const idx = existing.findIndex(r => r.id === record.id);
    if (idx >= 0) {
        existing[idx] = { ...existing[idx], ...record };
    } else {
        existing.unshift(record);
    }
    writeLocalClinicalRecords(existing);
};

const readLegacyLocalRecords = (): SavedAgroAnalysisRecord[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(LEGACY_LOCAL_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const isSeededUnownedRecord = (rec: any): boolean => {
    const id = String(rec?.id || '');
    if (id.startsWith('analysis-seed-') || id.startsWith('seed-') || id.startsWith('demo-')) return true;
    const authorId = rec?.agronomistConclusion?.authorId || rec?.ownerId;
    if (!authorId && !rec?.organizationId) return true;
    return false;
};

const matchesScope = (
    rec: SavedAgroAnalysisRecord,
    ownerId?: string | null,
    organizationId?: string | null
): boolean => {
    if (organizationId && organizationId !== 'ALL') {
        if (rec.organizationId === organizationId) return true;
    }
    if (ownerId && rec.ownerId === ownerId && (!rec.organizationId || rec.organizationId === organizationId)) {
        return true;
    }
    return false;
};

export async function loadClinicalRecords(params: {
    ownerId?: string | null;
    organizationId?: string | null;
    authorName?: string | null;
}): Promise<SavedAgroAnalysisRecord[]> {
    const { ownerId, organizationId, authorName } = params;
    const orgScope = organizationId && organizationId !== 'ALL' ? organizationId : '';

    const byId = new Map<string, SavedAgroAnalysisRecord>();
    for (const localRec of readLocalClinicalRecords()) {
        if (matchesScope(localRec, ownerId, orgScope)) {
            byId.set(localRec.id, localRec);
        }
    }

    if (USE_FIREBASE && auth.currentUser) {
        try {
            const queries: Promise<any>[] = [];
            if (ownerId) {
                queries.push(getDocs(query(collection(db, 'clinicalRecords'), where('ownerId', '==', ownerId))));
            }
            if (orgScope) {
                queries.push(getDocs(query(collection(db, 'clinicalRecords'), where('organizationId', '==', orgScope))));
            }
            const snaps = await Promise.all(queries);
            for (const snap of snaps) {
                for (const d of snap.docs || []) {
                    const data = { ...(d.data() as any), id: d.id } as SavedAgroAnalysisRecord;
                    if (matchesScope(data, ownerId, orgScope)) {
                        byId.set(data.id, data);
                    }
                }
            }
        } catch (err) {
            console.warn('[ClinicalRecords] Firestore load fallback to local cache:', err);
        }
    }

    // Safe one-way legacy import of real company agronomistDiagnoses (skipping tombstoned IDs)
    if (USE_FIREBASE && auth.currentUser && orgScope) {
        try {
            const diagSnap = await getDocs(
                query(collection(db, 'agronomistDiagnoses'), where('organizationId', '==', orgScope))
            );
            for (const d of diagSnap.docs || []) {
                const diag = { ...(d.data() as any), id: d.id } as AgronomistDiagnosis;
                const legacyId = `legacy-diag-${diag.id}`;
                if (byId.has(legacyId)) continue;
                const imported: SavedAgroAnalysisRecord = {
                    id: legacyId,
                    ownerId: ownerId || '',
                    organizationId: orgScope,
                    sourceCategory: 'Agronomist-created',
                    type: 'agro_image',
                    title: diag.title || 'Historical Field Diagnosis',
                    createdAt: diag.createdAt || new Date().toISOString(),
                    updatedAt: diag.updatedAt || diag.createdAt || new Date().toISOString(),
                    rawAiResult: { summary: diag.diagnosis || '', recommendedAction: diag.recommendedAction || '' },
                    agronomistConclusion: {
                        notes: diag.diagnosis || '',
                        severity: diag.healthStatus === 'DRIED' ? 'Severe' : diag.healthStatus === 'SUSPICIOUS' ? 'Moderate' : 'Mild',
                        prescribedTreatment: diag.recommendedAction || '',
                        activeIngredients: [],
                        recommendedDosage: '',
                        prescribedNutrition: '',
                        preventiveMeasures: '',
                        targetSectorOrPlot: diag.sectorId || '',
                        authorName: 'Imported Historical Record',
                        authorRole: 'Historical',
                        isVerified: false,
                        updatedAt: diag.updatedAt || diag.createdAt || new Date().toISOString()
                    },
                    migrationSource: 'legacy'
                };
                byId.set(legacyId, imported);
            }
        } catch {
            // Non-blocking historical import
        }
    }

    // Safe import of author-matched local legacy records (excluding unowned seeds; original key retained)
    const legacyLocal = readLegacyLocalRecords();
    for (const leg of legacyLocal) {
        if (!leg?.id || isSeededUnownedRecord(leg)) continue;
        const legacyId = leg.id.startsWith('legacy-local-') ? leg.id : `legacy-local-${leg.id}`;
        if (byId.has(legacyId) || byId.has(leg.id)) continue;

        const matchesOrg = Boolean(orgScope && leg.organizationId && leg.organizationId === orgScope);
        const matchesAuthor = Boolean(
            (ownerId && (leg.ownerId === ownerId || leg.agronomistConclusion?.authorId === ownerId)) ||
            (authorName &&
                leg.agronomistConclusion?.authorName &&
                leg.agronomistConclusion.authorName.trim().toLowerCase() === authorName.trim().toLowerCase())
        );

        if (!matchesOrg && !matchesAuthor) continue;

        const imported: SavedAgroAnalysisRecord = {
            ...leg,
            id: legacyId,
            ownerId: leg.ownerId || ownerId || '',
            organizationId: matchesOrg ? orgScope : '',
            sourceCategory: leg.sourceCategory || (leg.agronomistConclusion ? 'Combined' : 'AI-generated'),
            agronomistConclusion: leg.agronomistConclusion
                ? { ...leg.agronomistConclusion, isVerified: false }
                : undefined,
            migrationSource: 'legacy'
        };
        byId.set(legacyId, imported);
    }

    return Array.from(byId.values())
        .filter(rec => !rec.isDeleted)
        .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
}

export async function saveClinicalRecord(
    record: Omit<SavedAgroAnalysisRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
): Promise<SavedAgroAnalysisRecord> {
    const nowIso = new Date().toISOString();
    const id = record.id || `clinical-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullRecord: SavedAgroAnalysisRecord = {
        ...record,
        id,
        ownerId: record.ownerId || auth.currentUser?.uid || 'local-user',
        organizationId: record.organizationId || '',
        sourceCategory: record.sourceCategory || 'AI-generated',
        createdAt: record.createdAt || nowIso,
        updatedAt: nowIso,
        isDeleted: false
    };

    upsertLocalClinicalRecord(fullRecord);

    if (USE_FIREBASE && auth.currentUser) {
        try {
            await setDoc(doc(db, 'clinicalRecords', id), fullRecord);
        } catch (err) {
            console.warn('[ClinicalRecords] Firestore save error (kept locally):', err);
        }
    }

    return fullRecord;
}

export async function deleteClinicalRecordTombstone(record: SavedAgroAnalysisRecord): Promise<void> {
    const nowIso = new Date().toISOString();
    const tombstone: SavedAgroAnalysisRecord = {
        ...record,
        ownerId: record.ownerId || auth.currentUser?.uid || 'local-user',
        organizationId: record.organizationId || '',
        sourceCategory: record.sourceCategory || 'AI-generated',
        updatedAt: nowIso,
        isDeleted: true
    };

    upsertLocalClinicalRecord(tombstone);

    if (USE_FIREBASE && auth.currentUser) {
        try {
            await setDoc(doc(db, 'clinicalRecords', record.id), tombstone, { merge: true });
        } catch (err) {
            console.warn('[ClinicalRecords] Firestore tombstone write warning:', err);
        }
    }
}

/**
 * Honest peer comparison: never fabricates recovery percentages or synthetic peer cases.
 */
export function generatePeerComparison(condition: string): PeerComparisonData {
    return {
        targetCondition: condition || 'Unspecified condition',
        similarCasesFound: 0,
        topActiveIngredients: [],
        consensusTreatmentProtocol: '',
        consensusNutritionStrategy: '',
        preventiveRecommendation: '',
        observedCases: []
    };
}

// Legacy compatibility exports for any callers importing old function names
export const getSavedClinicalAnalyses = (orgId?: string): SavedAgroAnalysisRecord[] => {
    return readLocalClinicalRecords().filter(r => !r.isDeleted && (!orgId || r.organizationId === orgId));
};

export const saveClinicalAnalysis = async (
    record: Omit<SavedAgroAnalysisRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
): Promise<SavedAgroAnalysisRecord> => saveClinicalRecord(record);

export const clinicalAnalysisService = {
    getSavedAnalyses: async (organizationId?: string | null, ownerId?: string | null): Promise<SavedAgroAnalysisRecord[]> => {
        return loadClinicalRecords({
            organizationId: organizationId || '',
            ownerId: ownerId || auth.currentUser?.uid || ''
        });
    },
    saveAnalysis: saveClinicalRecord,
    deleteAnalysis: deleteClinicalRecordTombstone,
    generatePeerComparison,
    loadClinicalRecords
};

