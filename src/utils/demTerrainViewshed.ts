/**
 * Digital Elevation Model (DEM) & 3D Line-of-Sight (LOS) Viewshed Engine.
 * 
 * Computes:
 * 1. Elevation Z(lat, lng) with realistic agricultural terrain (slopes, hill ridges, ravines)
 * 2. Terrain slope angle (degrees) and aspect orientation
 * 3. 3D Raycasting Viewshed: projects rays from camera pole [Z_cam = Z_ground + mountHeight],
 *    detects terrain crests/obstacles (Z_crest > Z_ground), and marks slope shadows as Blind Zones.
 * 4. 3D Drone altitude AGL (Above Ground Level) and terrain collision clearance.
 */

export interface TerrainPoint {
    lat: number;
    lng: number;
    x: number; // Local Cartesian meters
    y: number;
    elevationZ: number; // Meters above sea level
    slopeDeg: number;
    aspectDeg: number;
}

export interface Camera3DSpecs {
    id: string;
    name: string;
    lat: number;
    lng: number;
    mountHeightM: number; // e.g. 6m above ground
    azimuthDeg: number;   // 0° = North, 90° = East
    tiltAngleDeg: number; // e.g. -4° or -15° downward tilt
    fovAngleDeg: number;  // Horizontal FOV (e.g. 95°)
    vFovAngleDeg?: number;// Vertical FOV (default ~ 60°)
    rangeM: number;       // Detection range (e.g. 80m)
}

export interface ViewshedResult {
    cameraOrigin: [number, number, number]; // [X, Y, Z] in meters
    visibleGroundPolygons: [number, number][][]; // Lat/Lng 2D polygons
    blindZoneGroundPolygons: [number, number][][]; // Lat/Lng 2D polygons of terrain shadow
    frustum3DVertices: [number, number, number][]; // 5 vertices of the 3D pyramid (Apex + 4 corners)
    slopeShadowDetected: boolean;
    maxShadowDistanceM: number;
}

export interface CustomTerrainSlope {
    id: string;
    name: string;
    centerLat: number;
    centerLng: number;
    peakHeightM: number; // H: positive = hill/mound (rise), negative = ravine/trench (excavation)
    radiusM: number;     // R: radius of influence
    slopeType: 'linear' | 'cosine' | 'plateau';
    polygonCoords?: [number, number][]; // Optional marked polygon for plateau or sector
    sourceType?: 'standing_location' | 'plantation_polygon' | 'drawn_sector' | 'custom_point';
    sourceName?: string;
    enabled: boolean;
}

export interface ProfileBreakPoint {
    id: string;
    distanceM: number; // Signed distance in meters from center (negative = left, positive = right)
    heightM: number;   // Height in meters at this point
}

export interface SpineControlPoint {
    id: string;
    name: string; // e.g. "Connection point A", "Connection point B"
    lat: number;
    lng: number;
    widthM: number;       // Width / Radius of influence (R)
    startOffsetM: number; // How many meters from center slope begins descent
    endDistanceM: number; // Distance in meters where slope meets base zero level
    peakHeightM: number;  // Peak height (+37m) or depth (-H)
    slopeFalloff: 'linear' | 'cosine' | 'plateau';
    leftLat?: number;     // Custom left endpoint latitude (asymmetric width handle)
    leftLng?: number;     // Custom left endpoint longitude (asymmetric width handle)
    rightLat?: number;    // Custom right endpoint latitude (asymmetric width handle)
    rightLng?: number;    // Custom right endpoint longitude (asymmetric width handle)
    leftWidthM?: number;  // Independent left width in meters
    rightWidthM?: number; // Independent right width in meters

    // 2D Profile Control Elements (Cross-section Drafting)
    plateauStartM?: number; // Left vertical guide line (meters from center, e.g. -6m)
    plateauEndM?: number;   // Right vertical guide line (meters from center, e.g. +6m)
    apexOffsetM?: number;   // Asymmetric apex crest horizontal position
    breakPoints?: ProfileBreakPoint[]; // User-defined vertices / break points along slope
    generationMode?: 'circular' | 'elongated_ridge'; // Revolve (Lathe 360) vs Extrude along path (Ridge)
}

export interface LongitudinalControlPoint {
    id: string;
    distM: number;       // Distance in meters from start along spine length (e.g. 0m, 20m, 120m, 240m)
    heightM: number;     // Elevation in meters at this longitudinal position
    breakPoint?: boolean;// Whether this point represents a slope break point
    tangent?: number;    // Tangent angle in degrees
}

export interface HillSpineProfile {
    id: string;
    name: string;
    points: SpineControlPoint[];
    enabled: boolean;
    locked?: boolean;
    generationMode?: 'circular' | 'elongated_ridge';
    longitudinalPoints?: LongitudinalControlPoint[];
}

export interface PerimeterSlopeVertex {
    id: string;
    lat: number;
    lng: number;
    elevationOffsetM: number; // Z-axis elevation in meters (custom height at this vertex)
}

export interface PerimeterSlopeObject {
    id: string;
    name: string;
    enabled: boolean;
    locked?: boolean;
    vertices: PerimeterSlopeVertex[];
    interiorPoints?: PerimeterSlopeVertex[]; // Moving points inside polygon (user sketch circle-triangles)
    crownHeightM?: number;
    falloffM?: number;
    hasRoadZeroLevel?: boolean; // Road 0 Level along the base edge
}

export interface PhotoGpsPin {
    id: string;
    name: string;
    dataUrl: string;
    lat: number;
    lng: number;
    altitudeM: number;
    azimuthDeg: number; // Compass heading / viewing direction (0-360)
    fovDeg?: number;    // Field of view cone angle (default 60 deg)
    timestamp?: string;
    hasExifGps: boolean;
    notes?: string;
}

let _activeSlopesCache: CustomTerrainSlope[] = [];
let _activeSpineProfilesCache: HillSpineProfile[] = [];
let _activePerimeterSlopesCache: PerimeterSlopeObject[] = [];

/**
 * Updates the in-memory cache of active slopes for instant elevation calculations.
 */
export function setActiveSlopesCache(slopes: CustomTerrainSlope[]): void {
    _activeSlopesCache = slopes.filter(s => s.enabled);
}

/**
 * Retrieves the currently active slopes cache.
 */
export function getActiveSlopesCache(): CustomTerrainSlope[] {
    return _activeSlopesCache;
}

/**
 * Updates the in-memory cache of active spine hill profiles for instant elevation calculations.
 */
export function setActiveSpineProfilesCache(profiles: HillSpineProfile[]): void {
    _activeSpineProfilesCache = profiles.filter(p => p.enabled);
}

/**
 * Retrieves the currently active spine profiles cache.
 */
export function getActiveSpineProfilesCache(): HillSpineProfile[] {
    return _activeSpineProfilesCache;
}

/**
 * Updates the in-memory cache of active perimeter triangulated slopes.
 */
export function setActivePerimeterSlopesCache(slopes: PerimeterSlopeObject[]): void {
    _activePerimeterSlopesCache = slopes.filter(s => s.enabled);
}

/**
 * Retrieves the currently active perimeter slopes cache.
 */
export function getActivePerimeterSlopesCache(): PerimeterSlopeObject[] {
    return _activePerimeterSlopesCache;
}

/**
 * Calculates normalized falloff value for non-linear hill and slope curves.
 */
export function calculateNormalizedFalloff(
    u: number, 
    H: number, 
    slopeType: 'linear' | 'cosine' | 'plateau'
): number {
    const clampedU = Math.max(0, Math.min(1, u));
    if (slopeType === 'linear') {
        return H * (1 - clampedU);
    }
    if (slopeType === 'cosine') {
        return H * ((1 + Math.cos(Math.PI * clampedU)) / 2);
    }
    if (slopeType === 'plateau') {
        if (clampedU <= 0.35) return H;
        const t = (clampedU - 0.35) / 0.65;
        return H * ((1 + Math.cos(Math.PI * t)) / 2);
    }
    return H * ((1 + Math.cos(Math.PI * clampedU)) / 2);
}

/**
 * Evaluates the cross-section profile elevation Z at signed distance (signedDistM) from apex/spine.
 * signedDistM < 0: Left side of slope (Ascent)
 * signedDistM > 0: Right side of slope (Descent)
 * Uses break points (vertices), vertical guide lines (plateauStartM/plateauEndM), and Bézier/cosine smoothing.
 */
export function evaluateProfileCrossSection(
    signedDistM: number,
    pt: SpineControlPoint
): number {
    const H = pt.peakHeightM;
    const leftW = Math.max(1, pt.leftWidthM ?? (pt.widthM !== undefined ? pt.widthM / 2 : 30));
    const rightW = Math.max(1, pt.rightWidthM ?? (pt.widthM !== undefined ? pt.widthM / 2 : 30));
    
    // Vertical guides defining the plateau crown
    const platStart = pt.plateauStartM !== undefined ? pt.plateauStartM : -(pt.startOffsetM || 0);
    const platEnd = pt.plateauEndM !== undefined ? pt.plateauEndM : (pt.startOffsetM || 0);

    // Outside bounds
    if (signedDistM <= -leftW || signedDistM >= rightW) {
        return 0;
    }

    // Inside plateau flat crown
    if (signedDistM >= platStart && signedDistM <= platEnd) {
        return H;
    }

    // Break points
    const bps = pt.breakPoints ? [...pt.breakPoints].sort((a, b) => a.distanceM - b.distanceM) : [];

    if (signedDistM < platStart) {
        // LEFT SIDE (Ascent from -leftW to platStart)
        const leftNodes: { d: number; h: number }[] = [
            { d: -leftW, h: 0 },
            ...bps.filter(b => b.distanceM > -leftW && b.distanceM < platStart).map(b => ({ d: b.distanceM, h: b.heightM })),
            { d: platStart, h: H }
        ];

        // Find the segment containing signedDistM
        for (let i = 0; i < leftNodes.length - 1; i++) {
            const n1 = leftNodes[i];
            const n2 = leftNodes[i + 1];
            if (signedDistM >= n1.d && signedDistM <= n2.d) {
                const span = n2.d - n1.d;
                if (span <= 0.001) return n2.h;
                const t = (signedDistM - n1.d) / span;
                // Natural Bézier / smooth cosine curve
                const smoothT = (1 - Math.cos(t * Math.PI)) / 2;
                return n1.h + (n2.h - n1.h) * smoothT;
            }
        }
        return 0;
    } else {
        // RIGHT SIDE (Descent from platEnd to +rightW)
        const rightNodes: { d: number; h: number }[] = [
            { d: platEnd, h: H },
            ...bps.filter(b => b.distanceM > platEnd && b.distanceM < rightW).map(b => ({ d: b.distanceM, h: b.heightM })),
            { d: rightW, h: 0 }
        ];

        // Find the segment containing signedDistM
        for (let i = 0; i < rightNodes.length - 1; i++) {
            const n1 = rightNodes[i];
            const n2 = rightNodes[i + 1];
            if (signedDistM >= n1.d && signedDistM <= n2.d) {
                const span = n2.d - n1.d;
                if (span <= 0.001) return n2.h;
                const t = (signedDistM - n1.d) / span;
                // Natural Bézier / smooth cosine curve
                const smoothT = (1 - Math.cos(t * Math.PI)) / 2;
                return n1.h + (n2.h - n1.h) * smoothT;
            }
        }
        return 0;
    }
}

/**
 * Calculates elevation delta Z(r) for non-linear hills using the Spine & Cross-Section Profile method.
 * Interpolates peak height, width, start of climb, and end of climb between axial connection points (A -> B...).
 */
export function calculateSpineElevationOffset(
    lat: number,
    lng: number,
    spine: HillSpineProfile
): number {
    if (!spine.enabled || !spine.points || spine.points.length === 0) return 0;
    
    const mLat = 111111;
    const mLng = 111111 * Math.cos((lat * Math.PI) / 180);

    // Single point fallback or Circular Revolve / Lathe Mode
    const isCircular = spine.generationMode === 'circular' || (spine.points.length === 1);
    if (isCircular) {
        let maxCirc = 0;
        for (const pt of spine.points) {
            const dLatM = (lat - pt.lat) * mLat;
            const dLngM = (lng - pt.lng) * mLng;
            const r = Math.hypot(dLatM, dLngM);
            const delta = evaluateProfileCrossSection(r, pt);
            if (Math.abs(delta) > Math.abs(maxCirc)) {
                maxCirc = delta;
            }
        }
        return maxCirc;
    }

    let maxOffset = 0;

    for (let i = 0; i < spine.points.length - 1; i++) {
        const p1 = spine.points[i];
        const p2 = spine.points[i + 1];

        const x1 = 0, y1 = 0;
        const x2 = (p2.lng - p1.lng) * mLng;
        const y2 = (p2.lat - p1.lat) * mLat;
        const px = (lng - p1.lng) * mLng;
        const py = (lat - p1.lat) * mLat;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const segLenSq = dx * dx + dy * dy;
        const segLen = Math.sqrt(segLenSq) || 1;
        const t = segLenSq === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / segLenSq));

        const projX = x1 + t * dx;
        const projY = y1 + t * dy;

        // Signed perpendicular distance: positive is right of spine vector, negative is left
        const cross = dx * (py - projY) - dy * (px - projX);
        const signedDist = cross / segLen;

        // Interpolated control point along spine at parameter t
        const interpPt: SpineControlPoint = {
            id: 'interp',
            name: 'interp',
            lat: (1 - t) * p1.lat + t * p2.lat,
            lng: (1 - t) * p1.lng + t * p2.lng,
            peakHeightM: (1 - t) * p1.peakHeightM + t * p2.peakHeightM,
            widthM: (1 - t) * (p1.widthM || 45) + t * (p2.widthM || 45),
            leftWidthM: (1 - t) * (p1.leftWidthM ?? (p1.widthM !== undefined ? p1.widthM / 2 : 25)) + t * (p2.leftWidthM ?? (p2.widthM !== undefined ? p2.widthM / 2 : 25)),
            rightWidthM: (1 - t) * (p1.rightWidthM ?? (p1.widthM !== undefined ? p1.widthM / 2 : 25)) + t * (p2.rightWidthM ?? (p2.widthM !== undefined ? p2.widthM / 2 : 25)),
            startOffsetM: (1 - t) * (p1.startOffsetM || 0) + t * (p2.startOffsetM || 0),
            endDistanceM: (1 - t) * (p1.endDistanceM || 50) + t * (p2.endDistanceM || 50),
            plateauStartM: (1 - t) * (p1.plateauStartM ?? 0) + t * (p2.plateauStartM ?? 0),
            plateauEndM: (1 - t) * (p1.plateauEndM ?? 0) + t * (p2.plateauEndM ?? 0),
            slopeFalloff: t < 0.5 ? p1.slopeFalloff : p2.slopeFalloff,
            breakPoints: t < 0.5 ? p1.breakPoints : p2.breakPoints
        };

        let delta = evaluateProfileCrossSection(signedDist, interpPt);

        // If longitudinal points exist (Length control), apply longitudinal height factor
        if (spine.longitudinalPoints && spine.longitudinalPoints.length > 0) {
            // Compute total spine length and current distance along spine
            let totalLen = 0;
            let currentDist = 0;
            for (let j = 0; j < spine.points.length - 1; j++) {
                const s1 = spine.points[j];
                const s2 = spine.points[j + 1];
                const sLen = Math.hypot((s2.lng - s1.lng) * mLng, (s2.lat - s1.lat) * mLat);
                if (j < i) {
                    currentDist += sLen;
                } else if (j === i) {
                    currentDist += t * sLen;
                }
                totalLen += sLen;
            }
            const longFactor = evaluateLongitudinalProfile(currentDist, totalLen, spine.longitudinalPoints, interpPt.peakHeightM);
            delta = delta * longFactor;
        }

        if (Math.abs(delta) > Math.abs(maxOffset)) {
            maxOffset = delta;
        }
    }

    return maxOffset;
}

/**
 * Evaluates the longitudinal profile along the ridge spine at distance distM (from start to end).
 * Returns a height multiplier based on the longitudinal curve and break points.
 */
export function evaluateLongitudinalProfile(
    distM: number,
    totalSpineLenM: number,
    longPoints?: LongitudinalControlPoint[],
    maxPeakH: number = 25
): number {
    if (!longPoints || longPoints.length === 0) {
        if (totalSpineLenM <= 0) return 1;
        const norm = Math.max(0, Math.min(1, distM / totalSpineLenM));
        return Math.sin(norm * Math.PI);
    }

    const sorted = [...longPoints].sort((a, b) => a.distM - b.distM);
    if (distM <= sorted[0].distM) return Math.max(0, sorted[0].heightM / (maxPeakH || 1));
    if (distM >= sorted[sorted.length - 1].distM) return Math.max(0, sorted[sorted.length - 1].heightM / (maxPeakH || 1));

    for (let i = 0; i < sorted.length - 1; i++) {
        const p1 = sorted[i];
        const p2 = sorted[i + 1];
        if (distM >= p1.distM && distM <= p2.distM) {
            const span = p2.distM - p1.distM;
            if (span <= 0.001) return Math.max(0, p2.heightM / (maxPeakH || 1));
            const t = (distM - p1.distM) / span;
            const smoothT = (1 - Math.cos(t * Math.PI)) / 2;
            const h = p1.heightM + (p2.heightM - p1.heightM) * smoothT;
            return Math.max(0, h / (maxPeakH || 1));
        }
    }
    return 1;
}

/**
 * Calculates elevation delta Z in meters for uneven terrain outlined by multi-point perimeter vertices.
 * Uses 2D barycentric / inverse distance interpolation from vertices with custom Z-axis elevations.
 */
export function calculatePerimeterSlopeElevation(
    lat: number,
    lng: number,
    slope: PerimeterSlopeObject
): number {
    if (!slope.enabled || !slope.vertices || slope.vertices.length < 3) return 0;

    const coords: [number, number][] = slope.vertices.map(v => [v.lat, v.lng]);
    const inside = isPointInPolygon(lat, lng, coords);
    const falloff = slope.falloffM || 18;

    let weightSum = 0;
    let weightedElev = 0;
    const mLat = 111111;
    const mLng = 111111 * Math.cos((lat * Math.PI) / 180);

    const allControlPoints = [...slope.vertices, ...(slope.interiorPoints || [])];
    for (const v of allControlPoints) {
        const dLatM = (lat - v.lat) * mLat;
        const dLngM = (lng - v.lng) * mLng;
        const dist = Math.hypot(dLatM, dLngM);
        if (dist < 0.2) {
            return Math.max(0, v.elevationOffsetM);
        }
        const w = 1 / (dist * dist);
        weightSum += w;
        weightedElev += v.elevationOffsetM * w;
    }

    const baseInterpolatedElev = weightSum > 0 ? weightedElev / weightSum : 0;
    const crown = slope.crownHeightM || 0;

    if (inside) {
        const distToEdge = minDistanceToPolygonM(lat, lng, coords);
        const centerFactor = Math.min(1, distToEdge / 20);
        return Math.max(0, baseInterpolatedElev + crown * centerFactor);
    }

    const distToEdge = minDistanceToPolygonM(lat, lng, coords);
    if (distToEdge >= falloff) return 0;
    const taper = (1 + Math.cos((Math.PI * distToEdge) / falloff)) / 2;
    return Math.max(0, baseInterpolatedElev * taper);
}

/**
 * Creates a bounded 3D HillSpineProfile inside a drawn perimeter polygon.
 * (Matching user sketch: Hill crest curve with plateau and falloff bounded by perimeter).
 */
export function createHillFromPerimeter(
    perimeter: [number, number][],
    name: string = 'Hill in Perimeter',
    peakHeightM: number = 28
): HillSpineProfile {
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    let sumLat = 0, sumLng = 0;
    perimeter.forEach(([lat, lng]) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        sumLat += lat;
        sumLng += lng;
    });
    const n = Math.max(1, perimeter.length);
    const centerLat = sumLat / n;
    const centerLng = sumLng / n;

    const spanLatM = (maxLat - minLat) * 111111;
    const spanLngM = (maxLng - minLng) * (111111 * Math.cos((centerLat * Math.PI) / 180));
    const isHorizontal = spanLngM >= spanLatM;

    const spinePoints: SpineControlPoint[] = [];
    const ptsCount = 3;
    const letters = ['A', 'B', 'C'];
    const heightWeights = [0.45, 1.0, 0.4];

    for (let i = 0; i < ptsCount; i++) {
        const t = (i + 0.5) / ptsCount;
        const ptLat = isHorizontal
            ? centerLat + (t - 0.5) * (maxLat - minLat) * 0.25
            : minLat + t * (maxLat - minLat);
        const ptLng = isHorizontal
            ? minLng + t * (maxLng - minLng)
            : centerLng + (t - 0.5) * (maxLng - minLng) * 0.25;

        const widthM = Math.max(15, Math.round((isHorizontal ? spanLatM : spanLngM) * 0.45));
        const pH = Math.round(peakHeightM * heightWeights[i]);

        spinePoints.push({
            id: `pt-${letters[i]}-${Date.now().toString().slice(-4)}`,
            name: `Crest Point ${letters[i]}`,
            lat: ptLat,
            lng: ptLng,
            widthM,
            startOffsetM: Math.round(widthM * 0.1),
            endDistanceM: Math.round(widthM * 0.65),
            peakHeightM: pH,
            plateauStartM: -Math.round(widthM * 0.15),
            plateauEndM: Math.round(widthM * 0.15),
            slopeFalloff: 'cosine'
        });
    }

    return {
        id: `hill-${Date.now()}`,
        name,
        enabled: true,
        points: spinePoints,
        generationMode: 'elongated_ridge',
        longitudinalPoints: [
            { id: 'lp-1', distM: 0, heightM: Math.round(peakHeightM * 0.35) },
            { id: 'lp-2', distM: Math.round(Math.max(spanLatM, spanLngM) * 0.45), heightM: peakHeightM, breakPoint: true },
            { id: 'lp-3', distM: Math.round(Math.max(spanLatM, spanLngM)), heightM: Math.round(peakHeightM * 0.25) }
        ]
    };
}

/**
 * Creates an uneven terrain 3D slope object with Road 0 Level along the bottom edge.
 * (Matching user sketch: Road 0 zero level at bottom with rising transects).
 */
export function createSlopeFromPerimeter(
    perimeter: [number, number][],
    name: string = 'Slope (Road 0 Level)',
    maxElevationM: number = 22
): PerimeterSlopeObject {
    let minLat = Infinity;
    let maxLat = -Infinity;
    perimeter.forEach(([lat]) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    });
    const latSpan = Math.max(0.00001, maxLat - minLat);

    const vertices: PerimeterSlopeVertex[] = perimeter.map((pt, idx) => {
        const normY = (pt[0] - minLat) / latSpan; // 0 at road level, 1 at top crest
        const elev = normY < 0.25 ? 0 : Math.round(normY * maxElevationM);
        return {
            id: `pv-${Date.now()}-${idx + 1}`,
            lat: pt[0],
            lng: pt[1],
            elevationOffsetM: elev
        };
    });

    let sumLat = 0, sumLng = 0;
    perimeter.forEach(([lat, lng]) => {
        sumLat += lat;
        sumLng += lng;
    });
    const cLat = sumLat / perimeter.length;
    const cLng = sumLng / perimeter.length;

    const interiorPoints: PerimeterSlopeVertex[] = [
        {
            id: `ip-${Date.now()}-1`,
            lat: cLat - latSpan * 0.1,
            lng: cLng - 0.0001,
            elevationOffsetM: Math.round(maxElevationM * 0.45)
        },
        {
            id: `ip-${Date.now()}-2`,
            lat: cLat + latSpan * 0.15,
            lng: cLng + 0.0001,
            elevationOffsetM: Math.round(maxElevationM * 0.75)
        }
    ];

    return {
        id: `slope-${Date.now()}`,
        name,
        enabled: true,
        vertices,
        interiorPoints,
        crownHeightM: 0,
        falloffM: 15,
        hasRoadZeroLevel: true
    };
}

/**
 * Checks if a point [lat, lng] is inside a 2D polygon.
 */
export function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
    if (!polygon || polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        const intersect = ((yi > lng) !== (yj > lng)) &&
            (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Calculates minimum distance in meters from a point to a polygon boundary.
 */
export function minDistanceToPolygonM(lat: number, lng: number, polygon: [number, number][]): number {
    if (!polygon || polygon.length < 2) return 0;
    let minD = Infinity;
    const mLat = 111111;
    const mLng = 111111 * Math.cos((lat * Math.PI) / 180);

    for (let i = 0; i < polygon.length; i++) {
        const j = (i + 1) % polygon.length;
        const p1 = polygon[i];
        const p2 = polygon[j];

        const x1 = 0, y1 = 0;
        const x2 = (p2[1] - p1[1]) * mLng;
        const y2 = (p2[0] - p1[0]) * mLat;
        const px = (lng - p1[1]) * mLng;
        const py = (lat - p1[0]) * mLat;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        const dist = Math.hypot(px - projX, py - projY);
        if (dist < minD) minD = dist;
    }
    return minD;
}

/**
 * Core Falloff Algorithm:
 * Calculates elevation delta Z(r) based on distance r, influence radius R, peak height H, and slope type.
 * 
 * 1. Linear slope (Linear / Cone):
 *    Z(r) = H * (1 - r / R)
 * 2. Smooth natural hill (Smoothstep / Cosine):
 *    Z(r) = H * (1 + cos(pi * r / R)) / 2
 * 3. Plateau:
 *    Height remains H inside inner zone, tapering to 0 at outer boundary R.
 */
export function calculateSlopeFalloff(
    r: number,
    R: number,
    H: number,
    slopeType: 'linear' | 'cosine' | 'plateau',
    innerRadiusRatio: number = 0.4
): number {
    if (R <= 0) return 0;
    if (r >= R) return 0;
    if (r <= 0) return H;

    if (slopeType === 'linear') {
        // Linear / Cone: Z(r) = H * (1 - r / R)
        return H * (1 - r / R);
    }

    if (slopeType === 'cosine') {
        // Smooth natural hill: Z(r) = H * (1 + cos(pi * r / R)) / 2
        return H * ((1 + Math.cos((Math.PI * r) / R)) / 2);
    }

    if (slopeType === 'plateau') {
        // Plateau: flat crown up to inner radius, then smooth taper to edge
        const rInner = R * innerRadiusRatio;
        if (r <= rInner) return H;
        const taperDist = (r - rInner) / (R - rInner);
        return H * ((1 + Math.cos(Math.PI * taperDist)) / 2);
    }

    return H * (1 - r / R);
}

/**
 * Calculates elevation offset contributed by a custom slope at [lat, lng].
 */
export function calculateSlopeElevationOffset(
    lat: number,
    lng: number,
    slope: CustomTerrainSlope
): number {
    if (!slope.enabled) return 0;

    const H = slope.peakHeightM;
    const R = slope.radiusM;

    // Polygon-based Plateau slope
    if (slope.polygonCoords && slope.polygonCoords.length >= 3 && slope.slopeType === 'plateau') {
        const inside = isPointInPolygon(lat, lng, slope.polygonCoords);
        if (inside) {
            return H;
        }
        // Outside polygon: taper out to buffer distance R
        const distToEdge = minDistanceToPolygonM(lat, lng, slope.polygonCoords);
        if (distToEdge >= R) return 0;
        const taperT = distToEdge / R;
        return H * ((1 + Math.cos(Math.PI * taperT)) / 2);
    }

    // Radial slope from center point
    const dLatM = (lat - slope.centerLat) * 111111;
    const dLngM = (lng - slope.centerLng) * (111111 * Math.cos((slope.centerLat * Math.PI) / 180));
    const r = Math.hypot(dLatM, dLngM);

    return calculateSlopeFalloff(r, R, H, slope.slopeType);
}

/**
 * Returns elevation Z in meters for given [lat, lng] relative to plantation base.
 * Emulates a real digital elevation model with regional topography plus all
 * actively sculpted custom slopes, hills, and ravines.
 */
export function getElevationAtCoords(
    lat: number,
    lng: number,
    baseLat: number = 41.9023,
    baseLng: number = 44.5000,
    baseElevation: number = 480, // 480 meters ASL
    customSlopes?: CustomTerrainSlope[]
): number {
    const dLatM = (lat - baseLat) * 111111;
    const dLngM = (lng - baseLng) * (111111 * Math.cos((baseLat * Math.PI) / 180));

    // Terrain feature 1: Western gentle slope (rise +0.04m per meter eastward)
    const regionalSlope = dLngM * 0.05 + dLatM * 0.02;

    // Terrain feature 2: North-East hill ridge (crest reaching +18m elevation)
    const ridgeDist = Math.hypot(dLngM - 80, dLatM - 60);
    const ridgeHeight = 16 * Math.exp(-Math.pow(ridgeDist / 55, 2));

    // Terrain feature 3: Small south-western knoll (+7m)
    const knollDist = Math.hypot(dLngM + 70, dLatM + 50);
    const knollHeight = 8 * Math.exp(-Math.pow(knollDist / 40, 2));

    // Terrain feature 4: Central irrigation ditch / slight depression (-3m)
    const ditchDist = Math.abs(dLngM * 0.3 - dLatM * 0.8);
    const ditchDepth = -2.5 * Math.exp(-Math.pow(ditchDist / 20, 2));

    // Terrain feature 5: Custom Sculpted Slopes (User-defined hills, ravines, plateaus)
    const slopesToApply = customSlopes || _activeSlopesCache;
    let customSlopeDelta = 0;
    if (slopesToApply && slopesToApply.length > 0) {
        for (const slope of slopesToApply) {
            customSlopeDelta += calculateSlopeElevationOffset(lat, lng, slope);
        }
    }

    // Terrain feature 6: Spine-based Non-Linear Hills & Planting Mounds (Ridge line A -> B)
    let spineDelta = 0;
    if (_activeSpineProfilesCache && _activeSpineProfilesCache.length > 0) {
        for (const spine of _activeSpineProfilesCache) {
            spineDelta += calculateSpineElevationOffset(lat, lng, spine);
        }
    }

    // Terrain feature 7: Multi-point Perimeter Triangulated Slopes
    let perimeterDelta = 0;
    if (_activePerimeterSlopesCache && _activePerimeterSlopesCache.length > 0) {
        for (const pSlope of _activePerimeterSlopesCache) {
            perimeterDelta += calculatePerimeterSlopeElevation(lat, lng, pSlope);
        }
    }

    const totalZ = baseElevation + regionalSlope + ridgeHeight + knollHeight + ditchDepth + customSlopeDelta + spineDelta + perimeterDelta;
    return Number(totalZ.toFixed(2));
}

/**
 * Calculates local slope (steepness in degrees) and aspect (orientation) at a point.
 */
export function getSlopeAndAspect(
    lat: number,
    lng: number,
    baseLat: number,
    baseLng: number
): { slopeDeg: number; aspectDeg: number } {
    const delta = 0.00005; // ~5 meters
    const zCenter = getElevationAtCoords(lat, lng, baseLat, baseLng);
    const zNorth = getElevationAtCoords(lat + delta, lng, baseLat, baseLng);
    const zSouth = getElevationAtCoords(lat - delta, lng, baseLat, baseLng);
    const zEast = getElevationAtCoords(lat, lng + delta, baseLat, baseLng);
    const zWest = getElevationAtCoords(lat, lng - delta, baseLat, baseLng);

    const distM = delta * 111111;
    const dzDx = (zEast - zWest) / (2 * distM);
    const dzDy = (zNorth - zSouth) / (2 * distM);

    const slopeRad = Math.atan(Math.sqrt(dzDx * dzDx + dzDy * dzDy));
    const slopeDeg = Math.round((slopeRad * 180) / Math.PI);

    let aspectRad = Math.atan2(-dzDx, dzDy);
    let aspectDeg = Math.round((aspectRad * 180) / Math.PI);
    if (aspectDeg < 0) aspectDeg += 360;

    return { slopeDeg: Math.min(65, slopeDeg), aspectDeg };
}

/**
 * 3D Line-of-Sight (LOS) Viewshed Raycasting Algorithm.
 * Shoots rays radially from the camera lens at height [Z_ground + mountHeight],
 * traces intersections with terrain, and identifies slope shadows (Blind Zones).
 */
export function computeTerrainViewshed(
    camera: Camera3DSpecs,
    baseLat: number,
    baseLng: number,
    raySteps: number = 36
): ViewshedResult {
    const camGroundZ = getElevationAtCoords(camera.lat, camera.lng, baseLat, baseLng);
    const camLensZ = camGroundZ + camera.mountHeightM;

    const latRad = (baseLat * Math.PI) / 180;
    const mPerDegLat = 111111;
    const mPerDegLng = 111111 * Math.cos(latRad);

    const camX = (camera.lng - baseLng) * mPerDegLng;
    const camY = (camera.lat - baseLat) * mPerDegLat;

    const vFovDeg = camera.vFovAngleDeg || 55;
    const halfHFov = camera.fovAngleDeg / 2;

    const visibleArcPoints: [number, number][] = [];
    const blindZoneArcs: [number, number][][] = [];
    let slopeShadowDetected = false;
    let maxShadowDistanceM = 0;

    // Raycast along horizontal angles
    for (let i = 0; i <= raySteps; i++) {
        const angleOffset = -halfHFov + (i / raySteps) * camera.fovAngleDeg;
        const rayAzimuth = ((camera.azimuthDeg + angleOffset) % 360 + 360) % 360;
        const rayAzimuthRad = (rayAzimuth * Math.PI) / 180;

        const dirX = Math.sin(rayAzimuthRad); // East
        const dirY = Math.cos(rayAzimuthRad); // North

        // Optical ray optical pitch: downward tilt + half vertical FOV
        const pitchRad = ((camera.tiltAngleDeg) * Math.PI) / 180;

        let maxAngleSoFar = -Infinity;
        let shadowStartM: number | null = null;
        let shadowEndM: number | null = null;
        let unobstructedReachM = camera.rangeM;

        // Step along the ray outwards in 2-meter increments
        const stepDistM = 2.5;
        const numSteps = Math.floor(camera.rangeM / stepDistM);

        for (let s = 1; s <= numSteps; s++) {
            const curDistM = s * stepDistM;
            const curX = camX + dirX * curDistM;
            const curY = camY + dirY * curDistM;

            const curLat = baseLat + curY / mPerDegLat;
            const curLng = baseLng + curX / mPerDegLng;

            const groundZ = getElevationAtCoords(curLat, curLng, baseLat, baseLng);

            // Angle from camera lens to this ground point
            const elevationAngle = Math.atan2(groundZ - camLensZ, curDistM);

            if (elevationAngle > maxAngleSoFar) {
                maxAngleSoFar = elevationAngle;
                // If we were in a shadow, the shadow ends here
                if (shadowStartM !== null && shadowEndM === null) {
                    shadowEndM = curDistM;
                }
            } else {
                // Slope drops behind a crest: line of sight is obstructed!
                if (shadowStartM === null) {
                    shadowStartM = curDistM;
                    slopeShadowDetected = true;
                    unobstructedReachM = Math.min(unobstructedReachM, curDistM);
                }
            }
        }

        // Visible reach coordinate on this ray
        const visDist = shadowStartM !== null ? shadowStartM : camera.rangeM;
        const visLat = camera.lat + (dirY * visDist) / mPerDegLat;
        const visLng = camera.lng + (dirX * visDist) / mPerDegLng;
        visibleArcPoints.push([visLat, visLng]);

        // If shadow was detected, record the blind zone slice
        if (shadowStartM !== null) {
            const endM = shadowEndM || camera.rangeM;
            const sLat1 = camera.lat + (dirY * shadowStartM) / mPerDegLat;
            const sLng1 = camera.lng + (dirX * shadowStartM) / mPerDegLng;
            const sLat2 = camera.lat + (dirY * endM) / mPerDegLat;
            const sLng2 = camera.lng + (dirX * endM) / mPerDegLng;
            blindZoneArcs.push([[sLat1, sLng1], [sLat2, sLng2]]);
            maxShadowDistanceM = Math.max(maxShadowDistanceM, endM - shadowStartM);
        }
    }

    // Closed visible ground polygon
    const visiblePolygon: [number, number][] = [
        [camera.lat, camera.lng],
        ...visibleArcPoints,
        [camera.lat, camera.lng]
    ];

    // Compute 3D Frustum pyramid vertices (Apex + 4 far corners)
    const range = camera.rangeM;
    const tanH = Math.tan((camera.fovAngleDeg * Math.PI) / 360);
    const tanV = Math.tan((vFovDeg * Math.PI) / 360);
    const halfW = range * tanH;
    const halfH = range * tanV;

    const azRad = (camera.azimuthDeg * Math.PI) / 180;
    const tiltRad = ((camera.tiltAngleDeg || 4) * Math.PI) / 180;

    // Vector pointing along camera optical axis
    const fwdX = Math.sin(azRad) * Math.cos(tiltRad);
    const fwdY = Math.cos(azRad) * Math.cos(tiltRad);
    const fwdZ = -Math.sin(tiltRad); // Downward tilt drops Z

    // Right vector (perpendicular to fwd in XY)
    const rightX = Math.cos(azRad);
    const rightY = -Math.sin(azRad);
    const rightZ = 0;

    // Up vector (cross product)
    const upX = -Math.sin(azRad) * Math.sin(tiltRad);
    const upY = -Math.cos(azRad) * Math.sin(tiltRad);
    const upZ = Math.cos(tiltRad);

    const centerFar: [number, number, number] = [
        camX + fwdX * range,
        camY + fwdY * range,
        camLensZ + fwdZ * range
    ];

    const frustumCorners: [number, number, number][] = [
        // Top-Left
        [
            centerFar[0] - rightX * halfW + upX * halfH,
            centerFar[1] - rightY * halfW + upY * halfH,
            centerFar[2] - rightZ * halfW + upZ * halfH
        ],
        // Top-Right
        [
            centerFar[0] + rightX * halfW + upX * halfH,
            centerFar[1] + rightY * halfW + upY * halfH,
            centerFar[2] + rightZ * halfW + upZ * halfH
        ],
        // Bottom-Right
        [
            centerFar[0] + rightX * halfW - upX * halfH,
            centerFar[1] + rightY * halfW - upY * halfH,
            centerFar[2] + rightZ * halfW - upZ * halfH
        ],
        // Bottom-Left
        [
            centerFar[0] - rightX * halfW - upX * halfH,
            centerFar[1] - rightY * halfW - upY * halfH,
            centerFar[2] - rightZ * halfW - upZ * halfH
        ]
    ];

    return {
        cameraOrigin: [camX, camY, camLensZ],
        visibleGroundPolygons: [visiblePolygon],
        blindZoneGroundPolygons: blindZoneArcs,
        frustum3DVertices: [[camX, camY, camLensZ], ...frustumCorners],
        slopeShadowDetected,
        maxShadowDistanceM: Math.round(maxShadowDistanceM)
    };
}

/**
 * Checks a drone 3D flight path for terrain clearance and returns collision alerts.
 */
export function checkDrone3DPathCollision(
    waypoints: { lat: number; lng: number; altM: number }[],
    baseLat: number,
    baseLng: number,
    minSafeClearanceM: number = 5 // Minimum 5 meters AGL
): {
    hasCollisionWarning: boolean;
    criticalWaypoints: { index: number; clearanceM: number; groundZM: number; droneZM: number }[];
} {
    const criticalWaypoints: { index: number; clearanceM: number; groundZM: number; droneZM: number }[] = [];

    waypoints.forEach((wp, idx) => {
        const groundZ = getElevationAtCoords(wp.lat, wp.lng, baseLat, baseLng);
        const droneZ = groundZ + wp.altM;
        const clearanceM = droneZ - groundZ;

        if (clearanceM < minSafeClearanceM || wp.altM < minSafeClearanceM) {
            criticalWaypoints.push({
                index: idx + 1,
                clearanceM: Number(clearanceM.toFixed(1)),
                groundZM: Number(groundZ.toFixed(1)),
                droneZM: Number(droneZ.toFixed(1))
            });
        }
    });

    return {
        hasCollisionWarning: criticalWaypoints.length > 0,
        criticalWaypoints
    };
}

/**
 * Automatically adjusts drone flight path waypoints upward to safely clear
 * terrain obstacles, newly formed hills, and slopes with a specified minimum AGL safety margin.
 */
export function adjustDroneFlightPathAGL<T extends { lat: number; lng: number; altitudeM?: number; altM?: number }>(
    waypoints: T[],
    baseLat: number,
    baseLng: number,
    minSafeClearanceM: number = 25,
    customSlopes?: CustomTerrainSlope[]
): { adjustedWaypoints: T[]; elevationsRaisedCount: number; maxGroundElevM: number } {
    let elevationsRaisedCount = 0;
    let maxGroundElevM = -Infinity;
    const baseEle = 480;

    const adjustedWaypoints = waypoints.map((wp) => {
        const groundZ = getElevationAtCoords(wp.lat, wp.lng, baseLat, baseLng, baseEle, customSlopes);
        maxGroundElevM = Math.max(maxGroundElevM, groundZ);
        const currentAlt = wp.altitudeM !== undefined ? wp.altitudeM : (wp.altM !== undefined ? wp.altM : minSafeClearanceM);
        
        // In local coordinates: ground elevation delta relative to base elevation
        const localGroundRise = Math.max(0, groundZ - baseEle);
        const safeAlt = Math.max(currentAlt, localGroundRise + minSafeClearanceM);

        if (safeAlt > currentAlt) {
            elevationsRaisedCount++;
        }

        return {
            ...wp,
            ...(wp.altitudeM !== undefined ? { altitudeM: Math.round(safeAlt) } : {}),
            ...(wp.altM !== undefined ? { altM: Math.round(safeAlt) } : {})
        };
    });

    return {
        adjustedWaypoints,
        elevationsRaisedCount,
        maxGroundElevM: Number(maxGroundElevM.toFixed(1))
    };
}
