import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  ExternalLink,
  Settings,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Video,
  Plane,
  Navigation,
  Wifi,
  Globe,
} from 'lucide-react';
import {
  consumeLaunchSession,
  dispatchTelemetryReturnToCore,
  getExternalModuleLabel,
  launchExternalModule,
  openExternalBridgeSettings,
  type PreparedBridgeSession,
  verifyBridgeMessageOrigin,
} from '../services/ExternalModuleBridge';
import type { ExternalModuleId, ExternalTelemetryReturn } from '../types/hardwareContract';

interface ExternalModuleModalProps {
  session: PreparedBridgeSession | null;
  onClose: () => void;
  onUpdateSession?: (nextSession: PreparedBridgeSession) => void;
}

const MODULE_ICONS: Record<ExternalModuleId, React.ReactNode> = {
  vision: <Video size={16} className="text-sky-600 dark:text-sky-400" />,
  drone: <Plane size={16} className="text-emerald-600 dark:text-emerald-400" />,
  gps_iot: <Navigation size={16} className="text-amber-600 dark:text-amber-400" />,
};

export const ExternalModuleModal: React.FC<ExternalModuleModalProps> = ({
  session,
  onClose,
  onUpdateSession,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [handshakeState, setHandshakeState] = useState<'connecting' | 'authenticated' | 'timeout'>('connecting');
  const [reloadNonce, setReloadNonce] = useState(0);

  // Reset handshake timer when session or reloadNonce changes
  useEffect(() => {
    if (!session) return;
    setHandshakeState('connecting');
    const timer = setTimeout(() => {
      setHandshakeState(prev => (prev === 'connecting' ? 'timeout' : prev));
    }, 9000);
    return () => clearTimeout(timer);
  }, [session?.launchCode, reloadNonce]);

  // Listen for postMessage handshake and telemetry return events from external module iframe/tab
  useEffect(() => {
    if (!session) return;

    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (!verifyBridgeMessageOrigin(event.origin, session.moduleId)) {
        return;
      }

      if (msg.type === 'AGRIMAP_BRIDGE_READY') {
        if (msg.moduleId && msg.moduleId !== session.moduleId) return;
        const incomingCode = typeof msg.launchCode === 'string' ? msg.launchCode : session.launchCode;
        const payload = consumeLaunchSession(incomingCode, event.origin, session.moduleId) || session.payload;

        const targetWin = iframeRef.current?.contentWindow || (event.source as Window | null);
        if (targetWin) {
          targetWin.postMessage(
            {
              type: 'AGRIMAP_BRIDGE_INIT',
              payload,
            },
            event.origin
          );
          setHandshakeState('authenticated');
        }
        return;
      }

      if (msg.type === 'AGRIMAP_BRIDGE_RETURN' && msg.data) {
        dispatchTelemetryReturnToCore(msg.data as ExternalTelemetryReturn);
        return;
      }

      if (msg.type === 'AGRIMAP_BRIDGE_CLOSE') {
        onClose();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [session, onClose]);

  if (!session) return null;

  const moduleTitle = getExternalModuleLabel(session.moduleId);

  const handlePopOutToTab = async () => {
    // Issue a fresh single-use launchCode for the popped-out browser tab (never leaks authToken in URL)
    const popSession = await launchExternalModule({
      moduleId: session.moduleId,
      orgId: session.payload.orgId,
      userId: session.payload.userId,
      userName: session.payload.userName,
      userRole: session.payload.userRole,
      serverMode: session.serverMode,
      targetId: session.payload.targetId,
      sectorId: session.payload.sectorId,
      center: session.payload.center,
      devices: session.payload.devices,
      cameras: session.payload.cameras,
      plantationFeatures: session.payload.geoJsonContext?.rawFeatures,
      openInNewTab: true,
    });
    if (onUpdateSession) {
      onUpdateSession(popSession);
    }
    onClose();
  };

  const handleRetry = () => {
    setReloadNonce(n => n + 1);
  };

  return (
    <div className="fixed inset-0 z-[2900] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4">
      <div className="w-full h-full max-w-[1440px] max-h-[92vh] bg-white dark:bg-[#0b1220] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Bridge Control Bar */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center shrink-0">
              {MODULE_ICONS[session.moduleId]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {moduleTitle}
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                  {session.serverMode === 'LOCAL' ? <Wifi size={12} className="text-amber-500" /> : <Globe size={12} className="text-sky-500" />}
                  {session.serverMode}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate tabular-nums">
                <span>Org: {session.payload.orgId}</span>
                <span>&bull;</span>
                {handshakeState === 'authenticated' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <ShieldCheck size={12} /> Session Active
                  </span>
                ) : handshakeState === 'timeout' ? (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                    <AlertTriangle size={12} /> Handshake Delayed / Standalone Mode
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <RefreshCw size={11} className="animate-spin" /> Handshaking via postMessage...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Reload module frame"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:inline">Reload</span>
            </button>

            <button
              type="button"
              onClick={() => openExternalBridgeSettings(session.moduleId)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Configure Cloud / LAN Server URL"
            >
              <Settings size={13} />
              <span className="hidden md:inline">Endpoints</span>
            </button>

            <button
              type="button"
              onClick={handlePopOutToTab}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Pop out to dedicated browser tab"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">Pop out to Tab</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors cursor-pointer ml-1"
              aria-label="Close external module"
            >
              <X size={14} />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>
        </div>

        {/* Unreachable / Delayed Handshake Helper Strip */}
        {handshakeState === 'timeout' && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                Module at <code className="font-mono">{session.targetOrigin}</code> did not complete the bridge handshake. Check LAN server status or endpoint configuration.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetry}
                className="px-2.5 py-1 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 font-medium hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => openExternalBridgeSettings(session.moduleId)}
                className="px-2.5 py-1 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 font-medium hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
              >
                Change Endpoint
              </button>
            </div>
          </div>
        )}

        {/* Embedded Module Viewport */}
        <div className="relative flex-1 bg-slate-950 overflow-hidden">
          <iframe
            key={`${session.launchCode}_${reloadNonce}`}
            ref={iframeRef}
            src={session.launchUrl}
            title={moduleTitle}
            className="w-full h-full border-0"
            allow="camera; microphone; geolocation; fullscreen; autoplay"
          />
        </div>
      </div>
    </div>
  );
};
