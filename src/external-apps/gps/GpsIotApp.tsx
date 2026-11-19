import React, { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { Activity, Radio } from 'lucide-react';
import { useBridgeSession } from '../shared/useBridgeSession';
import { ExternalBridgeHeader } from '../shared/ExternalBridgeHeader';
import { GpsTrackerLab } from '../../components/SystemManagement/HardwareLabs/GpsTrackerLab';
import { HardwareTestingSandboxMap } from '../../components/SystemManagement/HardwareLabs/HardwareTestingSandboxMap';
import { SoilSensorsLab } from '../../components/SystemManagement/HardwareLabs/SoilSensorsLab';
import { WeatherStationLab } from '../../components/SystemManagement/HardwareLabs/WeatherStationLab';

export const GpsIotApp: React.FC = () => {
  const session = useBridgeSession('gps_iot');
  const [activeTab, setActiveTab] = useState<'gps_fleet' | 'sandbox_map' | 'soil_probes' | 'weather_station'>('gps_fleet');
  const [isStreamingLive, setIsStreamingLive] = useState(false);

  // Optional live 5s telemetry push to liveTelemetry & soilTelemetry when enabled by operator
  useEffect(() => {
    if (!isStreamingLive) return;
    const interval = setInterval(async () => {
      const worker = session.payload.workers?.[0];
      const lat = session.center[0] + (Math.random() - 0.5) * 0.0012;
      const lng = session.center[1] + (Math.random() - 0.5) * 0.0012;
      const devId = session.targetId || 'gps-tracker-01';
      await session.writeHardwareRecord('liveTelemetry', devId, {
        deviceId: devId,
        organizationId: session.orgId,
        assetType: 'worker',
        workerId: worker?.id || 'W-1001',
        label: worker?.name || 'Field Tracker #1',
        lat,
        lng,
        speed: Number((2.2 + Math.random() * 1.4).toFixed(1)),
        battery: 88,
        sectorId: session.sectorId || 'sector-1',
        updatedAt: new Date().toISOString(),
      });
      await session.writeHardwareRecord('soilTelemetry', `soil_${session.sectorId || 'sector-1'}`, {
        id: `soil_${session.sectorId || 'sector-1'}`,
        organizationId: session.orgId,
        sectorId: session.sectorId || 'sector-1',
        soil_ph: Number((4.9 + Math.random() * 0.25).toFixed(2)),
        soil_ec: Number((1.35 + Math.random() * 0.18).toFixed(2)),
        moisture: Number((33 + Math.random() * 4).toFixed(1)),
        temp_c: Number((17.5 + Math.random() * 1.2).toFixed(1)),
        recordedAt: new Date().toISOString(),
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isStreamingLive, session]);

  const handleTriggerGeofenceAlert = async () => {
    const notifId = `notif_gps_${Date.now()}`;
    const alertPayload = {
      id: notifId,
      organizationId: session.orgId,
      sourceApp: 'gps_iot',
      severity: 'critical',
      title: 'Machinery Geofence Exit Warning',
      message: 'Tractor GPS tracker crossed assigned plantation perimeter boundary.',
      sectorId: session.sectorId || 'sector-1',
      deviceId: session.targetId || 'gps-tractor-01',
      coords: { lat: session.center[0], lng: session.center[1] },
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    await session.writeHardwareRecord('systemNotifications', notifId, alertPayload);
    session.sendTelemetryReturn('NOTIFICATION', alertPayload);
    toast.warning('Geofence boundary alert pushed to Core Notification Hub.');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b1220] text-slate-100">
      <Toaster position="top-right" richColors />
      <ExternalBridgeHeader
        title="GPS Fleet & IoT Telemetry Hub"
        subtitle={`${session.payload.workers?.length || 0} Workers • ${session.payload.machinery?.length || 0} Machinery`}
        session={session}
        tabs={[
          { id: 'gps_fleet', label: 'GPS Fleet' },
          { id: 'sandbox_map', label: 'IoT Field Map' },
          { id: 'soil_probes', label: 'Soil pH / EC' },
          { id: 'weather_station', label: 'Weather Stations' },
        ]}
        activeTab={activeTab}
        onSelectTab={id => setActiveTab(id as 'gps_fleet' | 'sandbox_map' | 'soil_probes' | 'weather_station')}
        rightActions={
          <>
            <button
              type="button"
              onClick={() => {
                setIsStreamingLive(s => !s);
                toast.info(!isStreamingLive ? '5s Live Telemetry Stream Started' : 'Live Telemetry Stream Paused');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                isStreamingLive
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <Radio size={13} className={isStreamingLive ? 'animate-pulse' : ''} />
              {isStreamingLive ? 'Streaming 5s Telemetry' : 'Start 5s Stream'}
            </button>
            <button
              type="button"
              onClick={handleTriggerGeofenceAlert}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-xs font-semibold text-white cursor-pointer"
            >
              <Activity size={13} /> Test Geofence Alert
            </button>
          </>
        }
      />

      <main className="flex-1 overflow-auto p-3 sm:p-4">
        {activeTab === 'gps_fleet' && (
          <div className="rounded-xl border border-slate-800 bg-white dark:bg-slate-900 overflow-hidden p-4">
            <GpsTrackerLab
              activeOrgId={session.orgId}
              mapCenter={session.center}
              employees={(session.payload.workers || []).map(w => ({
                id: w.id,
                name: w.name,
                barcode: w.barcode,
                roleId: w.role || 'picker',
              })) as any}
            />
          </div>
        )}

        {activeTab === 'sandbox_map' && (
          <div className="rounded-xl border border-slate-800 bg-white dark:bg-slate-900 overflow-hidden min-h-[720px]">
            <HardwareTestingSandboxMap
              plantationFeatures={session.plantationFeatures}
              mapCenter={session.center}
            />
          </div>
        )}

        {activeTab === 'soil_probes' && (
          <div className="rounded-xl border border-slate-800 bg-white dark:bg-slate-900 overflow-hidden p-4">
            <SoilSensorsLab mapCenter={session.center} />
          </div>
        )}

        {activeTab === 'weather_station' && (
          <div className="rounded-xl border border-slate-800 bg-white dark:bg-slate-900 overflow-hidden p-4">
            <WeatherStationLab
              mapCenter={session.center}
              plantationFeatures={session.plantationFeatures}
            />
          </div>
        )}
      </main>
    </div>
  );
};
