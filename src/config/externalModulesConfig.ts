import type { ExternalModuleConfigEntry, ExternalModuleId, ServerMode } from '../types/hardwareContract';

export const EXTERNAL_MODULE_OVERRIDES_STORAGE_KEY = 'agrimap_external_module_overrides_v1';

const getOriginSafe = (urlStr: string): string | null => {
  try {
    if (typeof window !== 'undefined') {
      return new URL(urlStr, window.location.origin).origin;
    }
    if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
      return new URL(urlStr).origin;
    }
    return null;
  } catch {
    return null;
  }
};

export interface ExternalModuleOverrideMap {
  vision?: { cloudUrl?: string; localUrl?: string; preferStandaloneHost?: boolean };
  drone?: { cloudUrl?: string; localUrl?: string; preferStandaloneHost?: boolean };
  gps_iot?: { cloudUrl?: string; localUrl?: string; preferStandaloneHost?: boolean };
}

export const DEFAULT_EXTERNAL_MODULES_CONFIG: Record<ExternalModuleId, ExternalModuleConfigEntry> = {
  vision: {
    id: 'vision',
    name: 'Vision & NVR Hub',
    subtitle: 'RTSP / WebRTC Cameras, FOV Cones & Sector Motion Alerts',
    cloudUrl: (import.meta as any).env?.VITE_VISION_APP_URL || '/vision.html',
    localUrl: (import.meta as any).env?.VITE_VISION_LOCAL_URL || '/vision.html',
    sameOriginEntryPath: '/vision.html',
    trustedOrigins: [
      'https://vision.agrimap.pro',
      'http://localhost:3000',
      'http://localhost:3005',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3005',
      'http://192.168.10.152:3000',
      'http://192.168.10.152:3005',
    ],
    requiredCapabilities: ['deviceRegistry:CAMERA', 'plantationFeatures:SECTOR', 'systemNotifications:WRITE'],
  },
  drone: {
    id: 'drone',
    name: 'Drone 3D & Mission Control',
    subtitle: 'Three.js 3D DEM Terrain, MAVLink Telemetry & Seedling Diagnostics',
    cloudUrl: (import.meta as any).env?.VITE_DRONE_APP_URL || '/drone.html',
    localUrl: (import.meta as any).env?.VITE_DRONE_LOCAL_URL || '/drone.html',
    sameOriginEntryPath: '/drone.html',
    trustedOrigins: [
      'https://drone.agrimap.pro',
      'http://localhost:3000',
      'http://localhost:3006',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3006',
      'http://192.168.10.152:3000',
      'http://192.168.10.152:3006',
    ],
    requiredCapabilities: ['plantationFeatures:READ', 'deviceRegistry:DRONE', 'agronomistDiagnoses:WRITE'],
  },
  gps_iot: {
    id: 'gps_iot',
    name: 'GPS Fleet & IoT Telemetry Hub',
    subtitle: 'Live Worker & Tractor Geofencing, Soil pH/EC & Weather Telemetry',
    cloudUrl: (import.meta as any).env?.VITE_GPS_APP_URL || '/gps.html',
    localUrl: (import.meta as any).env?.VITE_GPS_LOCAL_URL || '/gps.html',
    sameOriginEntryPath: '/gps.html',
    trustedOrigins: [
      'https://iot.agrimap.pro',
      'http://localhost:3000',
      'http://localhost:3007',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3007',
      'http://192.168.10.152:3000',
      'http://192.168.10.152:3007',
    ],
    requiredCapabilities: ['workers:READ', 'fleetAssets:READ', 'liveTelemetry:WRITE', 'soilTelemetry:WRITE'],
  },
};

export function getExternalModuleOverrides(): ExternalModuleOverrideMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(EXTERNAL_MODULE_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export function saveExternalModuleOverrides(overrides: ExternalModuleOverrideMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EXTERNAL_MODULE_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new CustomEvent('agrimap:external-modules-config-updated', { detail: overrides }));
  } catch (e) {
    console.warn('[ExternalModulesConfig] Failed to save overrides:', e);
  }
}

export function getLocalServerBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://192.168.10.152:3000';
  try {
    const raw = localStorage.getItem('agrimap-local-config');
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg?.serverIp) {
        const ip = String(cfg.serverIp).trim();
        const port = cfg.serverPort || 3000;
        if (ip.startsWith('http://') || ip.startsWith('https://')) {
          return ip.replace(/\/$/, '');
        }
        return `http://${ip}:${port}`;
      }
    }
  } catch {}
  return window.location.origin;
}

export function getResolvedModuleConfig(moduleId: ExternalModuleId): ExternalModuleConfigEntry {
  const base = DEFAULT_EXTERNAL_MODULES_CONFIG[moduleId];
  const overrides = getExternalModuleOverrides();
  const modOverride = overrides[moduleId] || {};
  const cloudUrl = (modOverride.cloudUrl || base.cloudUrl).trim();
  const localUrl = (modOverride.localUrl || base.localUrl).trim();

  const origins = new Set<string>(base.trustedOrigins);
  if (typeof window !== 'undefined') {
    origins.add(window.location.origin);
  }
  const cOrigin = getOriginSafe(cloudUrl);
  const lOrigin = getOriginSafe(localUrl);
  const localNodeOrigin = getOriginSafe(getLocalServerBaseUrl());
  if (cOrigin) origins.add(cOrigin);
  if (lOrigin) origins.add(lOrigin);
  if (localNodeOrigin) origins.add(localNodeOrigin);

  return {
    ...base,
    cloudUrl,
    localUrl,
    trustedOrigins: Array.from(origins),
  };
}

export function resolveExternalModuleUrl(
  moduleId: ExternalModuleId,
  serverMode: ServerMode,
  localServerIpOverride?: string
): string {
  const cfg = getResolvedModuleConfig(moduleId);
  const rawTarget = serverMode === 'LOCAL' ? cfg.localUrl : cfg.cloudUrl;

  // If user configured a standalone relative path (/vision.html) and provided a custom LAN IP in Local Mode:
  if (serverMode === 'LOCAL' && rawTarget.startsWith('/') && localServerIpOverride) {
    const cleanHost = localServerIpOverride.trim().replace(/\/$/, '');
    if (cleanHost.startsWith('http://') || cleanHost.startsWith('https://')) {
      return `${cleanHost}${rawTarget}`;
    }
    return `http://${cleanHost}:3000${rawTarget}`;
  }

  return rawTarget;
}

export function getTrustedOriginsForModule(moduleId: ExternalModuleId): string[] {
  return getResolvedModuleConfig(moduleId).trustedOrigins;
}
