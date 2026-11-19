import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { USE_FIREBASE } from '../../config';
import { getLocalServerBaseUrl } from '../../config/externalModulesConfig';
import { verifyBridgeMessageOrigin } from '../../services/ExternalModuleBridge';
import type {
  ExternalLaunchPayload,
  ExternalModuleId,
  ExternalTelemetryReturn,
  PlantationCamera,
  SeedlingHealthStatus,
  ServerMode,
} from '../../types/hardwareContract';
import type { PlantationFeature } from '../../types';

export interface BridgeSessionHookResult {
  status: 'handshaking' | 'connected' | 'standalone';
  payload: ExternalLaunchPayload;
  serverMode: ServerMode;
  orgId: string;
  targetId?: string;
  sectorId?: string;
  center: [number, number];
  plantationFeatures: PlantationFeature[];
  cameras: PlantationCamera[];
  connectManually: (opts: { orgId: string; serverMode: ServerMode; localServerUrl?: string }) => void;
  sendTelemetryReturn: (
    type: ExternalTelemetryReturn['type'],
    data: Record<string, any>
  ) => void;
  writeHardwareRecord: (
    collectionName:
      | 'deviceRegistry'
      | 'systemNotifications'
      | 'agronomistDiagnoses'
      | 'liveTelemetry'
      | 'soilTelemetry',
    docId: string,
    record: Record<string, any>
  ) => Promise<boolean>;
  updateSeedlingHealth: (
    seedlingId: string,
    healthStatus: SeedlingHealthStatus
  ) => Promise<boolean>;
  requestClose: () => void;
}

const buildFallbackPayload = (moduleId: ExternalModuleId): ExternalLaunchPayload => {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const serverMode: ServerMode = params?.get('serverMode') === 'LOCAL' ? 'LOCAL' : 'CLOUD';
  const localServerUrl = params?.get('localServerUrl') || getLocalServerBaseUrl();
  const targetId = params?.get('targetId') || undefined;
  const sectorId = params?.get('sectorId') || undefined;

  let cachedFeatures: PlantationFeature[] = [];
  let cachedOrgId = 'agribest-guria';
  try {
    const orgRaw = localStorage.getItem('agrimap_active_org_id');
    if (orgRaw) cachedOrgId = orgRaw;
    const featRaw = localStorage.getItem('agrimap_cached_plantation_features');
    if (featRaw) {
      const parsed = JSON.parse(featRaw);
      if (Array.isArray(parsed)) cachedFeatures = parsed;
    }
  } catch {}

  return {
    launchCode: params?.get('launchCode') || 'standalone',
    moduleId,
    orgId: cachedOrgId,
    userId: 'standalone-operator',
    serverMode,
    localServerUrl,
    targetId,
    sectorId,
    center: [41.9023, 44.5],
    geoJsonContext: {
      type: 'FeatureCollection',
      organizationId: cachedOrgId,
      serverMode,
      targetSectorId: sectorId,
      targetCameraId: moduleId === 'vision' ? targetId : undefined,
      center: [41.9023, 44.5],
      exportedAt: new Date().toISOString(),
      features: [],
      rawFeatures: cachedFeatures,
    },
    devices: [],
    cameras: [],
    workers: [],
    machinery: [],
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  };
};

export function useBridgeSession(moduleId: ExternalModuleId): BridgeSessionHookResult {
  const [status, setStatus] = useState<'handshaking' | 'connected' | 'standalone'>('handshaking');
  const [payload, setPayload] = useState<ExternalLaunchPayload>(() => buildFallbackPayload(moduleId));
  const resolvedRef = useRef(false);

  const queryMeta = useMemo(() => {
    if (typeof window === 'undefined') {
      return { launchCode: '', parentOrigin: '', localServerUrl: '', serverMode: 'CLOUD' as ServerMode };
    }
    const p = new URLSearchParams(window.location.search);
    return {
      launchCode: p.get('launchCode') || '',
      parentOrigin: p.get('parentOrigin') || '',
      localServerUrl: p.get('localServerUrl') || getLocalServerBaseUrl(),
      serverMode: (p.get('serverMode') === 'LOCAL' ? 'LOCAL' : 'CLOUD') as ServerMode,
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { launchCode, parentOrigin, localServerUrl, serverMode } = queryMeta;

    const acceptPayload = (incoming: ExternalLaunchPayload) => {
      if (!incoming || typeof incoming !== 'object') return;
      resolvedRef.current = true;
      setPayload(incoming);
      setStatus('connected');
    };

    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (parentOrigin && event.origin !== parentOrigin && !verifyBridgeMessageOrigin(event.origin, moduleId)) {
        return;
      }
      if (msg.type === 'AGRIMAP_BRIDGE_INIT' && msg.payload) {
        acceptPayload(msg.payload as ExternalLaunchPayload);
      }
    };

    window.addEventListener('message', handleMessage);

    // 1. Signal Core parent / opener via verified postMessage
    if (launchCode) {
      const targetOrigin = parentOrigin || window.location.origin;
      const readyMsg = {
        type: 'AGRIMAP_BRIDGE_READY',
        moduleId,
        launchCode,
      };
      if (window.parent && window.parent !== window) {
        try {
          window.parent.postMessage(readyMsg, targetOrigin);
        } catch {}
      }
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage(readyMsg, targetOrigin);
        } catch {}
      }

      // 2. Also attempt server-side one-time launchCode exchange (handles pop-out noopener tabs & LAN mode)
      const exchangeBase =
        serverMode === 'LOCAL' && localServerUrl
          ? localServerUrl.replace(/\/$/, '')
          : '';
      fetch(`${exchangeBase}/api/bridge/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchCode, moduleId }),
      })
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (!resolvedRef.current && data?.ok && data.payload) {
            acceptPayload(data.payload as ExternalLaunchPayload);
          }
        })
        .catch(() => {});
    }

    const fallbackTimer = setTimeout(() => {
      if (!resolvedRef.current) {
        setStatus('standalone');
      }
    }, 2500);

    return () => {
      clearTimeout(fallbackTimer);
      window.removeEventListener('message', handleMessage);
    };
  }, [moduleId, queryMeta]);

  const connectManually = useCallback(
    (opts: { orgId: string; serverMode: ServerMode; localServerUrl?: string }) => {
      setPayload(prev => ({
        ...prev,
        orgId: opts.orgId.trim() || prev.orgId,
        serverMode: opts.serverMode,
        localServerUrl: opts.localServerUrl?.trim() || prev.localServerUrl,
      }));
      setStatus('connected');
    },
    []
  );

  const sendTelemetryReturn = useCallback(
    (type: ExternalTelemetryReturn['type'], data: Record<string, any>) => {
      if (typeof window === 'undefined') return;
      const msg: ExternalTelemetryReturn = {
        type,
        organizationId: payload.orgId,
        sourceApp: moduleId,
        payload: data,
        timestamp: new Date().toISOString(),
      };
      const targetOrigin = queryMeta.parentOrigin || window.location.origin;
      if (window.parent && window.parent !== window) {
        try {
          window.parent.postMessage({ type: 'AGRIMAP_BRIDGE_RETURN', data: msg }, targetOrigin);
        } catch {}
      }
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({ type: 'AGRIMAP_BRIDGE_RETURN', data: msg }, targetOrigin);
        } catch {}
      }
    },
    [moduleId, payload.orgId, queryMeta.parentOrigin]
  );

  const writeHardwareRecord = useCallback(
    async (
      collectionName:
        | 'deviceRegistry'
        | 'systemNotifications'
        | 'agronomistDiagnoses'
        | 'liveTelemetry'
        | 'soilTelemetry',
      docId: string,
      record: Record<string, any>
    ): Promise<boolean> => {
      const stamped = {
        ...record,
        id: docId,
        organizationId: payload.orgId,
        updatedAt: new Date().toISOString(),
      };

      if (payload.serverMode === 'LOCAL') {
        const base = (payload.localServerUrl || getLocalServerBaseUrl()).replace(/\/$/, '');
        if (!payload.localSessionToken) {
          return false;
        }
        try {
          const res = await fetch(`${base}/api/hardware/${collectionName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${payload.localSessionToken}`,
            },
            body: JSON.stringify(stamped),
          });
          return res.ok;
        } catch {
          return false;
        }
      }

      if (USE_FIREBASE && db) {
        try {
          await setDoc(doc(db, collectionName, docId), stamped, { merge: true });
          return true;
        } catch (err) {
          console.warn(`[Bridge:${moduleId}] Firestore write to ${collectionName}/${docId} skipped:`, err);
          return false;
        }
      }

      return false;
    },
    [moduleId, payload.localServerUrl, payload.localSessionToken, payload.orgId, payload.serverMode]
  );

  const updateSeedlingHealth = useCallback(
    async (seedlingId: string, healthStatus: SeedlingHealthStatus): Promise<boolean> => {
      const mappedCondition =
        healthStatus === 'DRIED' ? 'Dried' : healthStatus === 'SUSPICIOUS' ? 'Suspicious' : 'Good';
      if (payload.serverMode === 'LOCAL') {
        const base = (payload.localServerUrl || getLocalServerBaseUrl()).replace(/\/$/, '');
        if (payload.localSessionToken) {
          try {
            await fetch(`${base}/api/hardware/plantationFeatures`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${payload.localSessionToken}`,
              },
              body: JSON.stringify({
                id: seedlingId,
                organizationId: payload.orgId,
                condition: mappedCondition,
                healthStatus,
              }),
            });
          } catch {}
        }
      } else if (USE_FIREBASE && db) {
        try {
          await updateDoc(doc(db, 'plantationFeatures', seedlingId), {
            condition: mappedCondition,
            healthStatus,
            updatedAt: new Date().toISOString(),
          });
        } catch (err) {
          console.warn(`[Bridge:${moduleId}] Failed seedling update:`, err);
        }
      }

      sendTelemetryReturn('SEEDLING_HEALTH', { seedlingId, healthStatus });
      return true;
    },
    [moduleId, payload.localServerUrl, payload.localSessionToken, payload.orgId, payload.serverMode, sendTelemetryReturn]
  );

  const requestClose = useCallback(() => {
    if (typeof window === 'undefined') return;
    const targetOrigin = queryMeta.parentOrigin || window.location.origin;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'AGRIMAP_BRIDGE_CLOSE', moduleId }, targetOrigin);
    } else {
      window.close();
    }
  }, [moduleId, queryMeta.parentOrigin]);

  const plantationFeatures = useMemo(() => {
    return payload.geoJsonContext?.rawFeatures || [];
  }, [payload.geoJsonContext]);

  const cameras = useMemo(() => {
    if (payload.cameras && payload.cameras.length > 0) return payload.cameras;
    return plantationFeatures
      .filter((f: any) => f.type === 'camera')
      .map((f: any, idx: number) => ({
        id: f.id,
        name: f.name || `Camera ${idx + 1}`,
        channel: idx + 1,
        model: f.model || 'Hikvision IP',
        ipAddress: f.ipAddress || '192.168.10.244',
        rtspPort: f.rtspPort || 554,
        streamUrl: f.streamUrl,
        locationName: f.locationName || 'Plantation Sector',
        lat: Array.isArray(f.geometry) ? f.geometry[0] : payload.center[0],
        lng: Array.isArray(f.geometry) ? f.geometry[1] : payload.center[1],
        mountHeightM: f.mountHeightM || 6,
        azimuthDeg: f.azimuthDeg || 0,
        fovAngleDeg: f.fovAngleDeg || 95,
        rangeM: f.rangeM || 80,
        tiltAngleDeg: f.tiltAngleDeg || 4,
        isPtz: Boolean(f.isPtz),
        isNightVision: f.isNightVision !== false,
        status: 'ONLINE' as const,
      }));
  }, [payload.cameras, payload.center, plantationFeatures]);

  return {
    status,
    payload,
    serverMode: payload.serverMode,
    orgId: payload.orgId,
    targetId: payload.targetId,
    sectorId: payload.sectorId,
    center: payload.center || [41.9023, 44.5],
    plantationFeatures,
    cameras,
    connectManually,
    sendTelemetryReturn,
    writeHardwareRecord,
    updateSeedlingHealth,
    requestClose,
  };
}
