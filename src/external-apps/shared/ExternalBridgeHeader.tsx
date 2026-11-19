import React, { useState } from 'react';
import { ShieldCheck, Wifi, Globe, Radio, X } from 'lucide-react';
import type { BridgeSessionHookResult } from './useBridgeSession';
import type { ServerMode } from '../../types/hardwareContract';

interface ExternalBridgeHeaderProps {
  title: string;
  subtitle?: string;
  session: BridgeSessionHookResult;
  tabs?: { id: string; label: string }[];
  activeTab?: string;
  onSelectTab?: (id: string) => void;
  rightActions?: React.ReactNode;
}

export const ExternalBridgeHeader: React.FC<ExternalBridgeHeaderProps> = ({
  title,
  subtitle,
  session,
  tabs,
  activeTab,
  onSelectTab,
  rightActions,
}) => {
  const [showManualConnect, setShowManualConnect] = useState(false);
  const [manualOrg, setManualOrg] = useState(session.orgId || 'agribest-guria');
  const [manualMode, setManualMode] = useState<ServerMode>(session.serverMode);
  const [manualLocalUrl, setManualLocalUrl] = useState(session.payload.localServerUrl || 'http://192.168.10.152:3000');

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-slate-100 shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-tight text-white truncate">{title}</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 tabular-nums">
              {session.serverMode === 'LOCAL' ? <Wifi size={12} className="text-amber-400" /> : <Globe size={12} className="text-sky-400" />}
              {session.serverMode}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 tabular-nums truncate">
            <span>ORG: {session.orgId}</span>
            <span>&bull;</span>
            {session.status === 'connected' ? (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <ShieldCheck size={12} /> Bridge Authenticated
              </span>
            ) : session.status === 'handshaking' ? (
              <span className="inline-flex items-center gap-1 text-amber-300">
                <Radio size={12} className="animate-pulse" /> Waiting for Core Handshake...
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowManualConnect(s => !s)}
                className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                Standalone Mode (Configure Target Org)
              </button>
            )}
            {subtitle && (
              <>
                <span>&bull;</span>
                <span className="text-slate-400 font-sans truncate">{subtitle}</span>
              </>
            )}
          </div>
        </div>

        {tabs && tabs.length > 0 && onSelectTab && (
          <nav className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTab(t.id)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {rightActions}
        <button
          type="button"
          onClick={session.requestClose}
          className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close external module"
        >
          <X size={15} />
        </button>
      </div>

      {showManualConnect && (
        <div className="w-full pt-2 mt-1 border-t border-slate-800 flex flex-wrap items-end gap-3 text-xs">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Organization ID</label>
            <input
              type="text"
              value={manualOrg}
              onChange={e => setManualOrg(e.target.value)}
              className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Transport Mode</label>
            <select
              value={manualMode}
              onChange={e => setManualMode(e.target.value as ServerMode)}
              className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs"
            >
              <option value="CLOUD">CLOUD (Firestore)</option>
              <option value="LOCAL">LOCAL (Farm LAN)</option>
            </select>
          </div>
          {manualMode === 'LOCAL' && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">LAN Server URL</label>
              <input
                type="text"
                value={manualLocalUrl}
                onChange={e => setManualLocalUrl(e.target.value)}
                className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs w-56"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              session.connectManually({ orgId: manualOrg, serverMode: manualMode, localServerUrl: manualLocalUrl });
              setShowManualConnect(false);
            }}
            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
          >
            Connect
          </button>
        </div>
      )}
    </header>
  );
};
