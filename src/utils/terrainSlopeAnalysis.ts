/**
 * Terrain Slope & Distance Analysis Utility
 * Precision Geodesic Distances, Elevation Incline/Decline Calculations, and Polygon Metrics
 * Synchronized for 2D Map & 3D WebGL Terrain Canvas
 */

export interface PointWithElevation {
    id?: string;
    lat: number;
    lng: number;
    z: number; // Elevation in meters
    label?: string;
}

export interface TerrainSegmentMetrics {
    fromIndex: number;
    toIndex: number;
    fromLabel: string;
    toLabel: string;
    fromZ: number;
    toZ: number;
    distanceM: number;           // Horizontal 2D distance in meters
    elevationDeltaM: number;     // Vertical difference (toZ - fromZ)
    inclinePct: number;          // Slope grade percentage: (deltaZ / distance) * 100
    angleDeg: number;            // Incline/decline angle in degrees
    direct3dDistanceM: number;   // True 3D Euclidean distance: sqrt(dist^2 + deltaZ^2)
    type: 'incline' | 'decline' | 'flat';
    bearingDeg: number;          // Compass bearing from p1 to p2 (0 - 360 deg)
}

/**
 * Calculates geodesic horizontal distance between two WGS84 lat/lng coordinates in meters.
 */
export function calculateGeodesicDistanceM(p1: [number, number], p2: [number, number]): number {
    const lat1 = p1[0];
    const lng1 = p1[1];
    const lat2 = p2[0];
    const lng2 = p2[1];

    const meanLatRad = ((lat1 + lat2) / 2) * (Math.PI / 180);
    const mPerDegLat = 111132.954 - 559.822 * Math.cos(2 * meanLatRad) + 1.175 * Math.cos(4 * meanLatRad);
    const mPerDegLng = 111412.84 * Math.cos(meanLatRad) - 93.5 * Math.cos(3 * meanLatRad);

    const dLat = (lat2 - lat1) * mPerDegLat;
    const dLng = (lng2 - lng1) * mPerDegLng;

    return Number(Math.hypot(dLat, dLng).toFixed(2));
}

/**
 * Computes compass bearing from p1 to p2 in degrees (0 = North, 90 = East, 180 = South, 270 = West).
 */
export function calculateBearingDeg(p1: [number, number], p2: [number, number]): number {
    const lat1 = (p1[0] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const dLng = ((p2[1] - p1[1]) * Math.PI) / 180;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return Math.round((bearing + 360) % 360);
}

/**
 * Analyzes a single segment between two points with elevation.
 */
export function calculatePointToPointSegment(
    fromIndex: number,
    toIndex: number,
    p1: PointWithElevation,
    p2: PointWithElevation
): TerrainSegmentMetrics {
    const horizontalDist = calculateGeodesicDistanceM([p1.lat, p1.lng], [p2.lat, p2.lng]);
    const deltaZ = p2.z - p1.z;
    const effectiveDist = Math.max(0.1, horizontalDist);

    const inclinePct = Number(((deltaZ / effectiveDist) * 100).toFixed(1));
    const angleDeg = Number(((Math.atan(Math.abs(deltaZ) / effectiveDist) * 180) / Math.PI).toFixed(1));
    const direct3d = Number(Math.hypot(horizontalDist, deltaZ).toFixed(2));
    const bearing = calculateBearingDeg([p1.lat, p1.lng], [p2.lat, p2.lng]);

    let type: 'incline' | 'decline' | 'flat' = 'flat';
    if (deltaZ > 0.1) type = 'incline';
    else if (deltaZ < -0.1) type = 'decline';

    return {
        fromIndex,
        toIndex,
        fromLabel: p1.label || `Point #${fromIndex + 1}`,
        toLabel: p2.label || `Point #${toIndex + 1}`,
        fromZ: p1.z,
        toZ: p2.z,
        distanceM: horizontalDist,
        elevationDeltaM: Number(deltaZ.toFixed(2)),
        inclinePct,
        angleDeg,
        direct3dDistanceM: direct3d,
        type,
        bearingDeg: bearing
    };
}

/**
 * Analyzes all consecutive segments in a sequence of points (either open spine or closed polygon).
 */
export function calculatePathSegments(
    points: PointWithElevation[],
    isClosed: boolean = false
): TerrainSegmentMetrics[] {
    if (!points || points.length < 2) return [];

    const segments: TerrainSegmentMetrics[] = [];
    const count = isClosed ? points.length : points.length - 1;

    for (let i = 0; i < count; i++) {
        const nextIdx = (i + 1) % points.length;
        segments.push(calculatePointToPointSegment(i, nextIdx, points[i], points[nextIdx]));
    }

    return segments;
}

/**
 * Computes polygon area in m² & hectares and perimeter length in meters using spherical projection.
 */
export function calculatePolygonAreaAndPerimeter(coords: [number, number][]): {
    areaM2: number;
    areaHa: number;
    perimeterM: number;
} {
    if (!coords || coords.length < 3) {
        return { areaM2: 0, areaHa: 0, perimeterM: 0 };
    }

    let perimeterM = 0;
    for (let i = 0; i < coords.length; i++) {
        const next = coords[(i + 1) % coords.length];
        perimeterM += calculateGeodesicDistanceM(coords[i], next);
    }

    // Centroid for local projection
    let sumLat = 0;
    coords.forEach(([lat]) => { sumLat += lat; });
    const meanLatRad = (sumLat / coords.length) * (Math.PI / 180);
    const mPerDegLat = 111132.954;
    const mPerDegLng = 111412.84 * Math.cos(meanLatRad);

    // Green's theorem / Shoelace on projected metric coordinates
    let doubleArea = 0;
    for (let i = 0; i < coords.length; i++) {
        const [lat1, lng1] = coords[i];
        const [lat2, lng2] = coords[(i + 1) % coords.length];
        const x1 = lng1 * mPerDegLng;
        const y1 = lat1 * mPerDegLat;
        const x2 = lng2 * mPerDegLng;
        const y2 = lat2 * mPerDegLat;
        doubleArea += (x1 * y2 - x2 * y1);
    }

    const areaM2 = Math.round(Math.abs(doubleArea) / 2);
    const areaHa = Number((areaM2 / 10000).toFixed(2));

    return {
        areaM2,
        areaHa,
        perimeterM: Math.round(perimeterM)
    };
}
