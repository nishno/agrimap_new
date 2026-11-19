import { auth } from '../firebase';
import { USE_FIREBASE } from '../config';
import {
  getLocalServerBaseUrl,
  getResolvedModuleConfig,
  getTrustedOriginsForModule,
  resolveExternalModuleUrl,
} from '../config/externalModulesConfig';
import type {
  AgriMapGeoJsonExport,
  DeviceRegistryRecord,
  ExternalLaunchPayload,
  ExternalModuleId,
  ExternalTelemetryReturn,
  GeoJsonFeaturePayload,
  PlantationCamera,
  ServerMode,
} from '../types/hardwareContract';
import type { Employee, Machinery, PlantationFeature } from '../types';

export interface LaunchExternalModuleOptions {
  moduleId: ExternalModuleId;
  orgId: string;
  userId: string;
  userName?: string;
  userRole?: string;
  serverMode?: ServerMode;
  targetId?: string;
  sectorId?: string;
  center?: [number, number];
  plantationFeatures?: PlantationFeature[];
  devices?: DeviceRegistryRecord[];
  cameras?: PlantationCamera[];
  employees?: Employee[];
  machinery?: Machinery[];
  openInNewTab?: boolean;
}

export interface PreparedBridgeSession {
  launchCode: string;
  launchUrl: string;
  targetOrigin: string;
  moduleId: ExternalModuleId;
  serverMode: ServerMode;
  payload: ExternalLaunchPayload;
}

// Ephemeral in-memory single-use launch code store (never persisted to URLs)
const pendingLaunchSessions = new Map<string, { payload: ExternalLaunchPayload; expiresAtMs: number }>();

const generateRandomLaunchCode = (): string => {
  const bytes = new Uint8Array(18);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `lc_${Date.now().toString(36)}_${hex}`;
};

export function detectActiveServerMode(): ServerMode {
  if (typeof window === 'undefined') return 'CLOUD';
  try {
    const raw = localStorage.getItem('agrimap-local-config');
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg?.isLocalMode) return 'LOCAL';
    }
    if (localStorage.getItem('agrimap-manual-offline') === 'true') {
      return 'LOCAL';
    }
  } catch {}
  return navigator.onLine ? 'CLOUD' : 'LOCAL';
}

const toGeoJsonGeometry = (feature: PlantationFeature): { type: 'Point' | 'LineString' | 'Polygon'; coordinates: any } | null => {
  const geom: any = (feature as any).geometry;
  if (!geom) return null;

  // Point: [lat, lng] -> GeoJSON [lng, lat]
  if (Array.isArray(geom) && geom.length === 2 && typeof geom[0] === 'number' && typeof geom[1] === 'number') {
    return { type: 'Point', coordinates: [geom[1], geom[0]] };
  }

  // Polyline / Polygon: [[lat, lng], ...] -> GeoJSON [lng, lat]
  if (Array.isArray(geom) && geom.length > 0 && Array.isArray(geom[0])) {
    const coords = geom
      .filter((p: any) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map((p: any) => [p[1], p[0]]);
    if (coords.length === 0) return null;

    if (feature.type === 'area' || feature.type === 'boundary') {
      const ring = [...coords];
      if (ring.length >= 3 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
        ring.push(ring[0]);
      }
      return { type: 'Polygon', coordinates: [ring] };
    }
    return { type: 'LineString', coordinates: coords };
  }

  return null;
};

export function buildGeoJsonContext(
  features: PlantationFeature[] = [],
  options: {
    organizationId: string;
    serverMode: ServerMode;
    targetSectorId?: string;
    targetCameraId?: string;
    center?: [number, number];
  }
): AgriMapGeoJsonExport {
  const relevantTypes = new Set(['area', 'boundary', 'line', 'seedling', 'camera', 'drone_path']);
  const geoFeatures: GeoJsonFeaturePayload[] = [];
  const rawFeatures: PlantationFeature[] = [];

  for (const f of features) {
    if (!f || !relevantTypes.has(f.type)) continue;
    // If sectorId filter is active for Drone mission, keep boundaries + matching sector + children
    if (options.targetSectorId) {
      const isTarget =
        f.id === options.targetSectorId ||
        (f as any).parentId === options.targetSectorId ||
        f.type === 'boundary' ||
        f.type === 'camera';
      if (!isTarget) continue;
    }

    const geometry = toGeoJsonGeometry(f);
    if (!geometry) continue;

    rawFeatures.push(f);
    geoFeatures.push({
      type: 'Feature',
      id: f.id,
      geometry,
      properties: {
        featureType: f.type,
        name: f.name || f.id,
        variety: (f as any).variety,
        healthStatus: (f as any).condition || (f as any).healthStatus,
        parentId: (f as any).parentId,
        sectorId: f.type === 'area' ? f.id : (f as any).parentId,
        lineType: (f as any).lineType,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    organizationId: options.organizationId,
    serverMode: options.serverMode,
    targetSectorId: options.targetSectorId,
    targetCameraId: options.targetCameraId,
    center: options.center || [41.9023, 44.5],
    exportedAt: new Date().toISOString(),
    features: geoFeatures,
    rawFeatures,
  };
}

async function getShortLivedFirebaseToken(serverMode: ServerMode): Promise<string | undefined> {
  if (serverMode === 'LOCAL' || !USE_FIREBASE || !auth?.currentUser) {
    return undefined;
  }
  try {
    return await auth.currentUser.getIdToken(false);
  } catch {
    return undefined;
  }
}

export async function createLaunchSession(opts: LaunchExternalModuleOptions): Promise<PreparedBridgeSession> {
  const serverMode: ServerMode = opts.serverMode || detectActiveServerMode();
  const launchCode = generateRandomLaunchCode();
  const issuedAtMs = Date.now();
  const expiresAtMs = issuedAtMs + 60_000; // 60-second short-lived single-use launch code
  const center: [number, number] = opts.center || [41.9023, 44.5];

  const geoJsonContext = buildGeoJsonContext(opts.plantationFeatures || [], {
    organizationId: opts.orgId,
    serverMode,
    targetSectorId: opts.sectorId,
    targetCameraId: opts.moduleId === 'vision' ? opts.targetId : undefined,
    center,
  });

  const authToken = await getShortLivedFirebaseToken(serverMode);
  const localServerUrl = getLocalServerBaseUrl();

  const payload: ExternalLaunchPayload = {
    launchCode,
    moduleId: opts.moduleId,
    orgId: opts.orgId,
    userId: opts.userId,
    userName: opts.userName,
    userRole: opts.userRole,
    serverMode,
    localServerUrl,
    authToken,
    targetId: opts.targetId,
    sectorId: opts.sectorId,
    center,
    geoJsonContext,
    devices: (opts.devices || []).filter(d => !d.organizationId || d.organizationId === opts.orgId),
    cameras: opts.cameras || [],
    workers: (opts.employees || []).map(e => ({
      id: e.id,
      name: e.name,
      barcode: e.barcode || e.idNumber,
      role: e.roleId,
    })),
    machinery: (opts.machinery || []).map(m => ({
      id: m.id,
      name: m.name,
      type: m.type,
    })),
    issuedAt: new Date(issuedAtMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
  };

  // Store in ephemeral in-memory map for postMessage handshake
  pendingLaunchSessions.set(launchCode, { payload, expiresAtMs });

  // Register launch code on the Core/Local server when reachable so autonomous LAN / pop-out tabs
  // can exchange the one-time code completely independently of Firebase or postMessage.
  try {
    const endpoint =
      serverMode === 'LOCAL' && localServerUrl !== window.location.origin
        ? `${localServerUrl}/api/bridge/launch-code`
        : '/api/bridge/launch-code';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        launchCode,
        moduleId: opts.moduleId,
        orgId: opts.orgId,
        userId: opts.userId,
        userName: opts.userName,
        userRole: opts.userRole,
        serverMode,
        targetId: opts.targetId,
        sectorId: opts.sectorId,
        center,
        geoJsonContext,
        devices: payload.devices,
        cameras: payload.cameras,
        workers: payload.workers,
        machinery: payload.machinery,
      }),
    });

    if (res.ok) {
      const serverData = await res.json();
      if (serverData?.localSessionToken) {
        payload.localSessionToken = serverData.localSessionToken;
      }
    }
  } catch {
    // Non-fatal: in Cloud iframe mode or offline cache mode, postMessage handshake delivers the payload
  }

  const baseTargetUrl = resolveExternalModuleUrl(
    opts.moduleId,
    serverMode,
    serverMode === 'LOCAL' ? localServerUrl : undefined
  );
  const urlObj = new URL(baseTargetUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  // CRITICAL SECURITY INVARIANT: Never put authToken or localSessionToken in URL query parameters!
  urlObj.searchParams.set('launchCode', launchCode);
  urlObj.searchParams.set('module', opts.moduleId);
  urlObj.searchParams.set('serverMode', serverMode);
  if (opts.targetId) urlObj.searchParams.set('targetId', opts.targetId);
  if (opts.sectorId) urlObj.searchParams.set('sectorId', opts.sectorId);
  if (typeof window !== 'undefined') {
    urlObj.searchParams.set('parentOrigin', window.location.origin);
  }
  if (serverMode === 'LOCAL') {
    urlObj.searchParams.set('localServerUrl', localServerUrl);
  }

  return {
    launchCode,
    launchUrl: urlObj.toString(),
    targetOrigin: urlObj.origin,
    moduleId: opts.moduleId,
    serverMode,
    payload,
  };
}

export function consumeLaunchSession(launchCode: string, origin: string, moduleId: ExternalModuleId): ExternalLaunchPayload | null {
  if (!verifyBridgeMessageOrigin(origin, moduleId)) {
    console.warn(`[ExternalModuleBridge] Rejected bridge handshake from untrusted origin: ${origin}`);
    return null;
  }

  const record = pendingLaunchSessions.get(launchCode);
  if (!record) return null;

  if (Date.now() > record.expiresAtMs) {
    pendingLaunchSessions.delete(launchCode);
    return null;
  }

  // Single-use enforcement
  pendingLaunchSessions.delete(launchCode);
  return record.payload;
}

export function verifyBridgeMessageOrigin(origin: string, moduleId: ExternalModuleId): boolean {
  if (!origin) return false;
  if (typeof window !== 'undefined' && origin === window.location.origin) {
    return true;
  }
  const trusted = getTrustedOriginsForModule(moduleId);
  return trusted.includes(origin);
}

export async function launchExternalModule(opts: LaunchExternalModuleOptions): Promise<PreparedBridgeSession> {
  const session = await createLaunchSession(opts);
  if (typeof window !== 'undefined') {
    if (opts.openInNewTab) {
      // Keep session available briefly for window.opener postMessage or server exchange
      pendingLaunchSessions.set(session.launchCode, {
        payload: session.payload,
        expiresAtMs: Date.now() + 60_000,
      });
      window.open(session.launchUrl, `agrimap_${opts.moduleId}`, 'noopener');
    } else {
      window.dispatchEvent(new CustomEvent('agrimap:open-external-module', { detail: session }));
    }
  }
  return session;
}

export function openExternalBridgeSettings(moduleId?: ExternalModuleId): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrimap:open-external-bridge-settings', { detail: { moduleId } }));
  }
}

export function dispatchTelemetryReturnToCore(msg: ExternalTelemetryReturn): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agrimap:external-telemetry-return', { detail: msg }));
  }
}

export function getExternalModuleLabel(moduleId: ExternalModuleId): string {
  return getResolvedModuleConfig(moduleId).name;
}
