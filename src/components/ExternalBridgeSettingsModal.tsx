import React, { useState, useEffect } from 'react';
import { X, Server, Globe, Wifi, RotateCcw, CheckCircle2, AlertCircle, Video, Plane, Navigation, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_EXTERNAL_MODULES_CONFIG,
  ExternalModuleOverrideMap,
  getExternalModuleOverrides,
  getLocalServerBaseUrl,
  saveExternalModuleOverrides,
} from '../config/externalModulesConfig';
import type { ExternalModuleId } from '../types/hardwareContract';

interface ExternalBridgeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  focusModuleId?: ExternalModuleId;
}

const MODULE_META: Record<ExternalModuleId, { icon: React.ReactNode; defaultPort: number }> = {
  vision: { icon: <Video size={16} className="text-sky-600 dark:text-sky-400" />, defaultPort: 3005 },
  drone: { icon: <Plane size={16} className="text-emerald-600 dark:text-emerald-400" />, defaultPort: 3006 },
  gps_iot: { icon: <Navigation size={16} className="text-amber-600 dark:text-amber-400" />, defaultPort: 3007 },
};

export const ExternalBridgeSettingsModal: React.FC<ExternalBridgeSettingsModalProps> = ({
  isOpen,
  onClose,
  focusModuleId,
}) => {
  const [draft, setDraft] = useState<ExternalModuleOverrideMap>({});
  const [probeStatus, setProbeStatus] = useState<Record<string, 'idle' | 'testing' | 'ok' | 'error'>>({});
  const [localNodeBase, setLocalNodeBase] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setDraft(getExternalModuleOverrides());
    setLocalNodeBase(getLocalServerBaseUrl());
    setProbeStatus({});
  }, [isOpen]);

  if (!isOpen) return null;

  const moduleIds: ExternalModuleId[] = ['vision', 'drone', 'gps_iot'];

  const getValue = (id: ExternalModuleId, field: 'cloudUrl' | 'localUrl') => {
    return draft[id]?.[field] ?? DEFAULT_EXTERNAL_MODULES_CONFIG[id][field];
  };

  const setField = (id: ExternalModuleId, field: 'cloudUrl' | 'localUrl', value: string) => {
    setDraft(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }));
  };

  const handleTestEndpoint = async (id: ExternalModuleId, mode: 'cloud' | 'local') => {
    const key = `${id}_${mode}`;
    const rawUrl = mode === 'cloud' ? getValue(id, 'cloudUrl') : getValue(id, 'localUrl');
    const targetUrl =
      mode === 'local' && rawUrl.startsWith('/') && localNodeBase
        ? `${localNodeBase.replace(/\/$/, '')}${rawUrl}`
        : rawUrl;

    setProbeStatus(prev => ({ ...prev, [key]: 'testing' }));
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(targetUrl, { method: 'GET', signal: controller.signal });
      clearTimeout(t);
      if (res.ok || res.type === 'opaque') {
        setProbeStatus(prev => ({ ...prev, [key]: 'ok' }));
        toast.success(`Reachable: ${targetUrl}`);
      } else {
        setProbeStatus(prev => ({ ...prev, [key]: 'error' }));
        toast.error(`HTTP ${res.status} from ${targetUrl}`);
      }
    } catch {
      setProbeStatus(prev => ({ ...prev, [key]: 'error' }));
      toast.error(`Cannot reach ${targetUrl} (check CORS or LAN host)`);
    }
  };

  const handleResetDefaults = () => {
    setDraft({});
    saveExternalModuleOverrides({});
    toast.success('External hardware endpoints reset to built-in standalone routes.');
  };

  const handleSave = () => {
    const cleaned: ExternalModuleOverrideMap = {};
    for (const id of moduleIds) {
      const cloudUrl = (draft[id]?.cloudUrl ?? '').trim();
      const localUrl = (draft[id]?.localUrl ?? '').trim();
      if (cloudUrl || localUrl) {
        cleaned[id] = {
          ...(cloudUrl ? { cloudUrl } : {}),
          ...(localUrl ? { localUrl } : {}),
        };
      }
    }
    saveExternalModuleOverrides(cleaned);
    toast.success('External hardware endpoints updated.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[3200] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Server size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                External Hardware Service Endpoints
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Configure Cloud or Plantation LAN URLs for decoupled Vision, Drone 3D, and GPS/IoT apps
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close endpoint settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Security Notice Banner */}
        <div className="px-5 py-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-200/70 dark:border-emerald-900/50 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <ShieldCheck size={15} className="shrink-0" />
            <span>
              Zero-URL-Token Bridge: auth passes via short-lived <code className="font-mono font-semibold">launchCode</code> + verified <code className="font-mono font-semibold">postMessage</code> / LAN exchange.
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 tabular-nums shrink-0">
            LAN: {localNodeBase}
          </span>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {moduleIds.map(id => {
            const cfg = DEFAULT_EXTERNAL_MODULES_CONFIG[id];
            const isFocused = focusModuleId === id;
            const cloudStatus = probeStatus[`${id}_cloud`] || 'idle';
            const localStatus = probeStatus[`${id}_local`] || 'idle';

            return (
              <div
                key={id}
                className={`rounded-xl border p-4 transition-colors ${
                  isFocused
                    ? 'border-emerald-500/70 bg-emerald-50/20 dark:bg-emerald-950/15'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {MODULE_META[id].icon}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{cfg.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{cfg.subtitle}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                    Default port :{MODULE_META[id].defaultPort} / {cfg.sameOriginEntryPath}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Cloud URL */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      <Globe size={12} /> Cloud / Remote URL
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={getValue(id, 'cloudUrl')}
                        onChange={e => setField(id, 'cloudUrl', e.target.value)}
                        placeholder={cfg.sameOriginEntryPath}
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleTestEndpoint(id, 'cloud')}
                        disabled={cloudStatus === 'testing'}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 flex items-center gap-1 cursor-pointer"
                        title="Test endpoint"
                      >
                        {cloudStatus === 'testing' ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : cloudStatus === 'ok' ? (
                          <CheckCircle2 size={13} className="text-emerald-600" />
                        ) : cloudStatus === 'error' ? (
                          <AlertCircle size={13} className="text-rose-500" />
                        ) : (
                          'Test'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Local LAN URL */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      <Wifi size={12} /> Plantation LAN URL (Offline)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={getValue(id, 'localUrl')}
                        onChange={e => setField(id, 'localUrl', e.target.value)}
                        placeholder={`http://192.168.10.152:${MODULE_META[id].defaultPort} or ${cfg.sameOriginEntryPath}`}
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleTestEndpoint(id, 'local')}
                        disabled={localStatus === 'testing'}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 flex items-center gap-1 cursor-pointer"
                        title="Test local LAN endpoint"
                      >
                        {localStatus === 'testing' ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : localStatus === 'ok' ? (
                          <CheckCircle2 size={13} className="text-emerald-600" />
                        ) : localStatus === 'error' ? (
                          <AlertCircle size={13} className="text-rose-500" />
                        ) : (
                          'Test'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} /> Reset to Built-In Entries
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              Save Endpoints
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
