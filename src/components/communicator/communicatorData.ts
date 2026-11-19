import type {
    AnnouncementCategory,
    AnnouncementCropEntry,
    Crop,
    ForumPost,
    Organization,
    PlantationFeature,
    User,
    WorkContractType
} from '../../types';
import { calculateGeometryAreaHa, getFeatureCoordinatesCenter } from '../../utils/plantationHelper';

export const GEORGIAN_REGIONS = [
    'Kakheti',
    'Guria',
    'Imereti',
    'Samegrelo',
    'Adjara',
    'Shida Kartli',
    'Kvemo Kartli',
    'Kartli',
    'Racha',
    'Samtskhe-Javakheti',
    'Mtskheta-Mtianeti',
    'Tbilisi'
] as const;

export const REGION_CENTERS: Record<string, [number, number]> = {
    'Kakheti': [41.9198, 45.4731],
    'Guria': [41.9269, 42.0005],
    'Imereti': [42.2679, 42.6946],
    'Samegrelo': [42.5088, 41.8709],
    'Adjara': [41.6168, 41.6367],
    'Shida Kartli': [41.9842, 44.1158],
    'Kvemo Kartli': [41.5419, 44.9932],
    'Kartli': [41.9023, 44.5000],
    'Racha': [42.5211, 43.1622],
    'Samtskhe-Javakheti': [41.6390, 42.9826],
    'Mtskheta-Mtianeti': [41.8451, 44.7190],
    'Tbilisi': [41.7151, 44.8271]
};

export interface WorkTypeOption {
    value: string;
    labelEn: string;
    labelKa: string;
}

export const WORK_TYPE_OPTIONS: WorkTypeOption[] = [
    { value: 'Field Worker', labelEn: 'Field Worker', labelKa: 'მინდვრის მუშა' },
    { value: 'Keeper / Guard', labelEn: 'Keeper / Plantation Guard', labelKa: 'დარაჯი / მცველი' },
    { value: 'Harvester / Picker', labelEn: 'Harvester / Berry Picker', labelKa: 'მკრეფავი' },
    { value: 'Agronomist', labelEn: 'Agronomist', labelKa: 'აგრონომი' },
    { value: 'Tractor Operator', labelEn: 'Tractor / Machinery Operator', labelKa: 'ტრაქტორისტი / მექანიზატორი' },
    { value: 'Pruning Specialist', labelEn: 'Pruning Specialist', labelKa: 'გასხვლის სპეციალისტი' },
    { value: 'Irrigation Technician', labelEn: 'Irrigation Technician', labelKa: 'სარწყავი სისტემის ტექნიკოსი' },
    { value: 'Foreman', labelEn: 'Brigadier / Foreman', labelKa: 'ბრიგადირი' },
    { value: 'Driver / Logistics', labelEn: 'Driver / Cold-Chain Logistics', labelKa: 'მძღოლი / ლოგისტიკა' },
    { value: 'Agro Consultant', labelEn: 'Agro Consultant / Lab', labelKa: 'აგრო კონსულტანტი' },
    { value: 'Other', labelEn: 'Other (Specify)', labelKa: 'სხვა (მიუთითეთ)' }
];

export interface ContractTypeOption {
    value: WorkContractType;
    labelEn: string;
    labelKa: string;
}

export const CONTRACT_TYPE_OPTIONS: ContractTypeOption[] = [
    { value: 'daily', labelEn: 'Daily Work', labelKa: 'დღიური სამუშაო' },
    { value: 'seasonal', labelEn: 'Seasonal', labelKa: 'სეზონური' },
    { value: 'permanent', labelEn: 'Permanent Contract', labelKa: 'მუდმივი კონტრაქტი' },
    { value: 'project', labelEn: 'Project / Task-Based', labelKa: 'პროექტული / ერთჯერადი' },
    { value: 'part_time', labelEn: 'Part-Time', labelKa: 'ნახევარი განაკვეთი' },
    { value: 'other', labelEn: 'Other Contract', labelKa: 'სხვა პირობა' }
];

export const COMMON_AGRICULTURE_CROPS = [
    'Blueberry',
    'Hazelnut',
    'Grape',
    'Lemon',
    'Apple',
    'Walnut',
    'Tea',
    'Peach',
    'Tangerine',
    'Blackberry',
    'Raspberry',
    'Almond',
    'Kiwi',
    'Persimmon',
    'Vegetables',
    'Wheat / Grain'
];

const KNOWN_CROP_VARIETIES: Record<string, string[]> = {
    'blueberry': ['Duke', 'Legacy', 'Bluecrop', 'Draper'],
    'hazelnut': ['Anakliuri', 'Tonda di Giffoni', 'Gulshishvela'],
    'grape': ['Saperavi', 'Rkatsiteli', 'Kisi', 'Mtsvane'],
    'lemon': ['Meyer', 'Gruzinsky', 'Dioscuria'],
    'apple': ['Golden Delicious', 'Gala', 'Fuji', 'Kekhura'],
    'walnut': ['Chandler', 'Lara', 'Fernor'],
    'tea': ['Kolkhida', 'Kimyn'],
    'peach': ['Redhaven', 'Cresthaven'],
    'tangerine': ['Unshiu', 'Kovano-Vase'],
    'almond': ['Guara', 'Soleta']
};

export interface AnnouncementFilters {
    search: string;
    kind: 'ALL' | 'PLANTATIONS' | 'HIRING' | 'OFFERS';
    region: string;
    workType: string;
    contractType: string;
    crop: string;
}

export const DEFAULT_ANNOUNCEMENT_FILTERS: AnnouncementFilters = {
    search: '',
    kind: 'ALL',
    region: 'ALL',
    workType: 'ALL',
    contractType: 'ALL',
    crop: 'ALL'
};

export interface MapCheckpointItem {
    id: string;
    kind: 'plantation' | 'company_hiring' | 'service_offer';
    name: string;
    subtitle: string;
    agricultureType: string;
    cropsAndVarieties: AnnouncementCropEntry[];
    areaHa: number;
    sectorCount: number;
    region: string;
    phone: string;
    email: string;
    coordinates: [number, number];
    recipientId: string;
    recipientType: 'org' | 'user';
    organizationId?: string;
    announcements: ForumPost[];
    primaryAnnouncement?: ForumPost;
    workTypes: string[];
    contractTypes: WorkContractType[];
    description?: string;
}

export function formatContractLabel(
    contractType?: WorkContractType,
    customLabel?: string,
    isKa = false
): string {
    if (contractType === 'other' && customLabel?.trim()) {
        return customLabel.trim();
    }
    const found = CONTRACT_TYPE_OPTIONS.find(o => o.value === contractType);
    if (!found) return isKa ? 'შეთანხმებით' : 'Flexible';
    return isKa ? found.labelKa : found.labelEn;
}

export function getRegionCoordinates(region?: string, seedKey = ''): [number, number] {
    const clean = (region || '').trim();
    const matchedKey = Object.keys(REGION_CENTERS).find(
        k => k.toLowerCase() === clean.toLowerCase() || clean.toLowerCase().includes(k.toLowerCase())
    );
    const base = matchedKey ? REGION_CENTERS[matchedKey] : [42.02, 43.45];

    if (!seedKey) return [base[0], base[1]];

    // Deterministic gentle offset (~1.5km - 6km) so multiple checkpoints in the same region remain distinct
    let hash = 0;
    for (let i = 0; i < seedKey.length; i++) {
        hash = ((hash << 5) - hash) + seedKey.charCodeAt(i);
        hash |= 0;
    }
    const latOffset = (((hash & 0xff) / 255) - 0.5) * 0.08;
    const lngOffset = ((((hash >> 8) & 0xff) / 255) - 0.5) * 0.10;
    return [
        Math.round((base[0] + latOffset) * 100000) / 100000,
        Math.round((base[1] + lngOffset) * 100000) / 100000
    ];
}

function isValidCoordPair(loc: any): loc is [number, number] {
    if (!Array.isArray(loc) || loc.length < 2) return false;
    const lat = Number(loc[0]);
    const lng = Number(loc[1]);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0);
}

export function resolveOrgCropsAndVarieties(
    org: Organization,
    crops: Crop[],
    cropVarieties: any[],
    orgFeatures: PlantationFeature[]
): { agricultureType: string; cropsAndVarieties: AnnouncementCropEntry[] } {
    const map = new Map<string, Set<string>>();

    const addEntry = (cropName?: string, varieties?: string[]) => {
        const clean = (cropName || '').trim();
        if (!clean || clean.toLowerCase() === 'general' || clean.toLowerCase() === 'other') return;
        const existingKey = Array.from(map.keys()).find(k => k.toLowerCase() === clean.toLowerCase()) || clean;
        if (!map.has(existingKey)) map.set(existingKey, new Set<string>());
        const set = map.get(existingKey)!;
        (varieties || []).forEach(v => {
            const trimmed = (v || '').trim();
            if (trimmed) set.add(trimmed);
        });
    };

    // 1. From Crops collection belonging to this org
    crops
        .filter(c => c.organizationId === org.id)
        .forEach(c => addEntry(c.name, c.varieties || []));

    // 2. From CropVarieties collection belonging to this org
    (cropVarieties || [])
        .filter((cv: any) => !cv.organizationId || cv.organizationId === org.id)
        .forEach((cv: any) => {
            if (cv.cropName && cv.name) {
                addEntry(cv.cropName, [cv.name]);
            }
        });

    // 3. From PlantationFeatures (areas, sectors, seedlings) belonging to this org
    orgFeatures.forEach((f: any) => {
        if (f.cropType) {
            const vars = Array.isArray(f.cropVariety)
                ? f.cropVariety
                : typeof f.cropVariety === 'string' && f.cropVariety
                    ? [f.cropVariety]
                    : [];
            addEntry(f.cropType, vars);
        } else if (typeof f.cropVariety === 'string' && f.cropVariety && org.agricultureType) {
            addEntry(org.agricultureType, [f.cropVariety]);
        }
    });

    // 4. From org.crops / org.plantationCrops / org.agricultureType
    (org.plantationCrops || []).forEach(c => addEntry(c));
    (org.crops || []).forEach(c => addEntry(c));
    if (org.agricultureType && org.agricultureType !== 'General') {
        addEntry(org.agricultureType);
    }

    // Fill known varieties only if a crop has 0 varieties recorded so the details modal stays informative
    const entries: AnnouncementCropEntry[] = Array.from(map.entries()).map(([crop, varSet]) => {
        let vars = Array.from(varSet);
        if (vars.length === 0) {
            const fallback = KNOWN_CROP_VARIETIES[crop.toLowerCase()];
            if (fallback) vars = fallback.slice(0, 3);
        }
        return { crop, varieties: vars };
    });

    const agricultureType =
        entries.length > 0
            ? entries.map(e => e.crop).join(', ')
            : (org.agricultureType && org.agricultureType !== 'General' ? org.agricultureType : 'Mixed Agriculture');

    return { agricultureType, cropsAndVarieties: entries };
}

export function resolveOrgAreaAndCenter(
    org: Organization,
    orgFeatures: PlantationFeature[]
): { areaHa: number; sectorCount: number; center: [number, number] } {
    const polygonFeatures = orgFeatures.filter(
        f => (f.type === 'area' || f.type === 'sector' || f.type === 'boundary') && Array.isArray((f as any).geometry)
    );

    let computedArea = 0;
    let firstCenter: [number, number] | null = null;

    polygonFeatures.forEach(f => {
        const geom = (f as any).geometry;
        const c = getFeatureCoordinatesCenter(geom);
        if (c && !firstCenter) firstCenter = c;
        const a = calculateGeometryAreaHa(geom);
        if (a > 0) computedArea += a;
    });

    if (!firstCenter) {
        for (const f of orgFeatures) {
            const c = getFeatureCoordinatesCenter((f as any).geometry);
            if (c) {
                firstCenter = c;
                break;
            }
        }
    }

    let center: [number, number];
    if (firstCenter) {
        center = firstCenter;
    } else if (Array.isArray(org.areaGeometry) && org.areaGeometry.length >= 3) {
        center = getFeatureCoordinatesCenter(org.areaGeometry) || getRegionCoordinates(org.region, org.id);
    } else if (isValidCoordPair(org.location)) {
        center = [Number(org.location[0]), Number(org.location[1])];
    } else {
        center = getRegionCoordinates(org.region, org.id);
    }

    const geomOrgArea = Array.isArray(org.areaGeometry) && org.areaGeometry.length >= 3
        ? calculateGeometryAreaHa(org.areaGeometry)
        : 0;

    const finalArea =
        computedArea > 0
            ? Math.round(computedArea * 10) / 10
            : (org.areaHa && org.areaHa > 0 ? Math.round(org.areaHa * 10) / 10 : geomOrgArea);

    return {
        areaHa: finalArea,
        sectorCount: polygonFeatures.length,
        center
    };
}

export function buildUnifiedCheckpoints(params: {
    organizations: Organization[];
    allOrganizations?: Organization[];
    allPlantationFeatures: PlantationFeature[];
    crops: Crop[];
    cropVarieties?: any[];
    allUsers: User[];
    forumPosts: ForumPost[];
}): MapCheckpointItem[] {
    const {
        organizations = [],
        allOrganizations = [],
        allPlantationFeatures = [],
        crops = [],
        cropVarieties = [],
        allUsers = [],
        forumPosts = []
    } = params;

    // 1. Deduplicate all organizations (include user's own orgs + discoverable orgs)
    const orgMap = new Map<string, Organization>();
    [...allOrganizations, ...organizations].forEach(org => {
        if (!org || !org.id) return;
        const existing = orgMap.get(org.id);
        if (!existing) {
            orgMap.set(org.id, org);
        } else {
            // Merge so we keep richer fields (location, phone, email, areaHa)
            orgMap.set(org.id, {
                ...existing,
                ...org,
                location: isValidCoordPair(org.location) ? org.location : existing.location,
                phoneNumber: org.phoneNumber || existing.phoneNumber,
                email: org.email || existing.email,
                areaHa: org.areaHa || existing.areaHa,
                region: org.region || existing.region
            });
        }
    });

    const announcementPosts = forumPosts
        .filter(p => p.isAnnouncement && p.announcementData && p.announcementData.status !== 'closed')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const checkpoints: MapCheckpointItem[] = [];
    const consumedAnnouncementIds = new Set<string>();

    // 2. Build Plantation / Company checkpoints
    orgMap.forEach(org => {
        const orgFeatures = allPlantationFeatures.filter(f => f.organizationId === org.id);
        const { agricultureType, cropsAndVarieties } = resolveOrgCropsAndVarieties(
            org,
            crops,
            cropVarieties,
            orgFeatures
        );
        const { areaHa, sectorCount, center } = resolveOrgAreaAndCenter(org, orgFeatures);

        const creator = allUsers.find(u => u.id === org.createdBy);
        const phone = org.phoneNumber || creator?.phone || '';
        const email = org.email || creator?.email || '';

        // Link company hiring announcements belonging to this organization
        const linkedAnnouncements = announcementPosts.filter(p => {
            const ad = p.announcementData!;
            if (ad.category !== 'company_hiring') return false;
            return ad.companyId === org.id || p.organizationId === org.id;
        });

        // Merge any extra crops/varieties mentioned in announcements
        const mergedCropsMap = new Map<string, Set<string>>();
        cropsAndVarieties.forEach(entry => {
            mergedCropsMap.set(entry.crop, new Set(entry.varieties));
        });
        linkedAnnouncements.forEach(a => {
            (a.announcementData?.cropsAndVarieties || []).forEach(entry => {
                const key = Array.from(mergedCropsMap.keys()).find(k => k.toLowerCase() === entry.crop.toLowerCase()) || entry.crop;
                if (!mergedCropsMap.has(key)) mergedCropsMap.set(key, new Set());
                entry.varieties.forEach(v => mergedCropsMap.get(key)!.add(v));
            });
        });

        const finalCropsAndVarieties: AnnouncementCropEntry[] = Array.from(mergedCropsMap.entries()).map(
            ([crop, vars]) => ({ crop, varieties: Array.from(vars) })
        );

        const workTypes = Array.from(
            new Set(linkedAnnouncements.map(a => a.announcementData!.workType).filter(Boolean))
        );
        const contractTypes = Array.from(
            new Set(linkedAnnouncements.map(a => a.announcementData!.contractType).filter(Boolean))
        );

        // If an announcement has exact custom coords far from the org center, also render its own pin
        linkedAnnouncements.forEach(a => {
            const loc = a.announcementData?.location;
            if (!isValidCoordPair(loc)) {
                consumedAnnouncementIds.add(a.id);
            } else {
                const dist = Math.hypot(loc[0] - center[0], loc[1] - center[1]);
                if (dist < 0.015) {
                    consumedAnnouncementIds.add(a.id);
                }
            }
        });

        checkpoints.push({
            id: `cp-org-${org.id}`,
            kind: linkedAnnouncements.length > 0 ? 'company_hiring' : 'plantation',
            name: org.name,
            subtitle: `${org.type || 'Company'}${org.legalName && org.legalName !== org.name ? ` · ${org.legalName}` : ''}`,
            agricultureType: finalCropsAndVarieties.length > 0
                ? finalCropsAndVarieties.map(e => e.crop).join(', ')
                : agricultureType,
            cropsAndVarieties: finalCropsAndVarieties,
            areaHa,
            sectorCount,
            region: org.region || linkedAnnouncements[0]?.announcementData?.region || 'Georgia',
            phone,
            email,
            coordinates: center,
            recipientId: org.id,
            recipientType: 'org',
            organizationId: org.id,
            announcements: linkedAnnouncements,
            primaryAnnouncement: linkedAnnouncements[0],
            workTypes,
            contractTypes
        });
    });

    // 3. Build standalone Announcement checkpoints (User Service Offers + Company Announcements with custom pin or custom company)
    announcementPosts.forEach(post => {
        if (consumedAnnouncementIds.has(post.id)) return;
        const ad = post.announcementData!;
        const author = allUsers.find(u => u.id === post.authorId);
        const linkedOrg = ad.companyId ? orgMap.get(ad.companyId) : undefined;

        const coords: [number, number] = isValidCoordPair(ad.location)
            ? [Number(ad.location[0]), Number(ad.location[1])]
            : getRegionCoordinates(ad.region, post.id);

        const cropsList: AnnouncementCropEntry[] = ad.cropsAndVarieties && ad.cropsAndVarieties.length > 0
            ? ad.cropsAndVarieties
            : ad.agricultureType
                ? [{ crop: ad.agricultureType, varieties: KNOWN_CROP_VARIETIES[ad.agricultureType.toLowerCase()]?.slice(0, 2) || [] }]
                : [];

        const displayName =
            ad.category === 'company_hiring'
                ? (ad.companyName || linkedOrg?.name || post.authorName)
                : post.authorName;

        checkpoints.push({
            id: `cp-ann-${post.id}`,
            kind: ad.category === 'service_offer' ? 'service_offer' : 'company_hiring',
            name: displayName,
            subtitle: ad.category === 'service_offer'
                ? `Service Provider · ${ad.workType}`
                : `Hiring · ${ad.workType}`,
            agricultureType: ad.agricultureType || (cropsList.length > 0 ? cropsList.map(c => c.crop).join(', ') : ad.workType),
            cropsAndVarieties: cropsList,
            areaHa: ad.areaHa || linkedOrg?.areaHa || 0,
            sectorCount: 0,
            region: ad.region || 'Georgia',
            phone: ad.contactPhone || linkedOrg?.phoneNumber || author?.phone || '',
            email: ad.contactEmail || linkedOrg?.email || author?.email || '',
            coordinates: coords,
            recipientId: ad.category === 'company_hiring' && linkedOrg ? linkedOrg.id : post.authorId,
            recipientType: ad.category === 'company_hiring' && linkedOrg ? 'org' : 'user',
            organizationId: linkedOrg?.id || (ad.category === 'company_hiring' ? ad.companyId : undefined),
            announcements: [post],
            primaryAnnouncement: post,
            workTypes: ad.workType ? [ad.workType] : [],
            contractTypes: ad.contractType ? [ad.contractType] : [],
            description: post.content
        });
    });

    return checkpoints;
}

export function filterCheckpoints(
    checkpoints: MapCheckpointItem[],
    filters: AnnouncementFilters
): MapCheckpointItem[] {
    const q = filters.search.trim().toLowerCase();

    return checkpoints.filter(cp => {
        if (filters.kind === 'PLANTATIONS' && cp.kind === 'service_offer') {
            return false;
        }
        if (filters.kind === 'HIRING' && cp.announcements.filter(a => a.announcementData?.category === 'company_hiring').length === 0) {
            return false;
        }
        if (filters.kind === 'OFFERS' && cp.kind !== 'service_offer') {
            return false;
        }

        if (filters.region !== 'ALL') {
            if (!cp.region.toLowerCase().includes(filters.region.toLowerCase())) return false;
        }

        if (filters.workType !== 'ALL') {
            const wt = filters.workType.toLowerCase();
            const matchesWork =
                cp.workTypes.some(w => w.toLowerCase().includes(wt)) ||
                cp.announcements.some(a =>
                    (a.announcementData?.workType || '').toLowerCase().includes(wt) ||
                    (a.title || '').toLowerCase().includes(wt)
                );
            if (!matchesWork) return false;
        }

        if (filters.contractType !== 'ALL') {
            const matchesContract =
                cp.contractTypes.includes(filters.contractType as WorkContractType) ||
                cp.announcements.some(a => a.announcementData?.contractType === filters.contractType);
            if (!matchesContract) return false;
        }

        if (filters.crop !== 'ALL') {
            const cropLower = filters.crop.toLowerCase();
            const matchesCrop =
                cp.agricultureType.toLowerCase().includes(cropLower) ||
                cp.cropsAndVarieties.some(
                    c => c.crop.toLowerCase().includes(cropLower) || c.varieties.some(v => v.toLowerCase().includes(cropLower))
                );
            if (!matchesCrop) return false;
        }

        if (q) {
            const haystack = [
                cp.name,
                cp.subtitle,
                cp.region,
                cp.agricultureType,
                cp.phone,
                cp.email,
                ...cp.workTypes,
                ...cp.cropsAndVarieties.flatMap(c => [c.crop, ...c.varieties]),
                ...cp.announcements.flatMap(a => [a.title || '', a.content || '', a.announcementData?.workType || ''])
            ]
                .join(' ')
                .toLowerCase();
            if (!haystack.includes(q)) return false;
        }

        return true;
    });
}
