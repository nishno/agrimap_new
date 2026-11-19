import React, { useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { Bell, RefreshCw, Video } from 'lucide-react';
import { useBridgeSession } from '../shared/useBridgeSession';
import { ExternalBridgeHeader } from '../shared/ExternalBridgeHeader';
import { NvrCameraMasterConsole } from '../../components/SystemManagement/HardwareLabs/NvrCameraMasterConsole';
import { AllCamerasWideModal } from '../../components/SystemManagement/HardwareLabs/AllCamerasWideModal';
import { CameraLiveMonitorWindow } from '../../components/SystemManagement/HardwareLabs/CameraLiveMonitorWindow';
import type { PlantationCamera } from '../../types/hardwareContract';

export const VisionApp: React.FC = () => {
  const session = useBridgeSession('vision');
  const [activeTab, setActiveTab] = useState<'nvr_console' | 'wide_matrix'>('nvr_console');
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(session.targetId);

  const activeCamera: PlantationCamera | undefined = useMemo(() => {
    const id = selectedCameraId || session.targetId;
    if (!id) return session.cameras[0];
    return session.cameras.find(c => c.id === id) || session.cameras[0];
  }, [selectedCameraId, session.cameras, session.targetId]);

  const handleEmitMotionAlert = async () => {
    const cam = activeCamera;
    const notifId = `notif_vision_${Date.now()}`;
    const payload = {
      id: notifId,
      organizationId: session.orgId,
      sourceApp: 'vision',
      severity: 'warning',
      title: `Perimeter Motion Detected${cam ? ` — ${cam.name}` : ''}`,
      message: cam
        ? `Motion trigger reported on channel CH0${cam.channel} (${cam.ipAddress}) in ${cam.locationName}.`
        : 'Motion trigger reported in sector perimeter zone.',
      sectorId: session.sectorId || 'sector-1',
      deviceId: cam?.id || 'cam-01',
      coords: cam ? { lat: cam.lat, lng: cam.lng } : { lat: session.center[0], lng: session.center[1] },
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    await session.writeHardwareRecord('systemNotifications', notifId, payload);
    session.sendTelemetryReturn('NOTIFICATION', payload);
    toast.success('Sector motion alert pushed to Core Notification Hub.');
  };

  const handleSyncCameraStatuses = async () => {
    const list = session.cameras.length > 0 ? session.cameras : [];
    for (const cam of list) {
      await session.writeHardwareRecord('deviceRegistry', cam.id, {
        id: cam.id,
        organizationId: session.orgId,
        type: 'CAMERA',
        name: cam.name,
        model: cam.model,
        connectionType: 'RTSP',
        ipAddress: cam.ipAddress,
        rtspPort: cam.rtspPort,
        streamUrl: cam.streamUrl || '',
        coords: { lat: cam.lat, lng: cam.lng },
        status: cam.status === 'OFFLINE' ? 'OFFLINE' : 'ONLINE',
        lastPing: new Date().toISOString(),
      });
    }
    session.sendTelemetryReturn('DEVICE_STATUS', {
      updatedCount: list.length,
      status: 'ONLINE',
    });
    toast.success(`Synced ${list.length} camera status records to Core device registry.`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b1220] text-slate-100">
      <Toaster position="top-right" richColors />
      <ExternalBridgeHeader
        title="Vision & NVR Security Hub"
        subtitle={activeCamera ? `Focused: ${activeCamera.name}` : `${session.cameras.length} Cameras`}
        session={session}
        tabs={[
          { id: 'nvr_console', label: 'NVR Master Console' },
          { id: 'wide_matrix', label: 'Multi-Camera Wall' },
        ]}
        activeTab={activeTab}
        onSelectTab={id => setActiveTab(id as 'nvr_console' | 'wide_matrix')}
        rightActions={
          <>
            <button
              type="button"
              onClick={handleSyncCameraStatuses}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 cursor-pointer"
            >
              <RefreshCw size={13} /> Sync Status
            </button>
            <button
              type="button"
              onClick={handleEmitMotionAlert}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-xs font-semibold text-white cursor-pointer"
            >
              <Bell size={13} /> Report Motion Alert
            </button>
          </>
        }
      />

      <main className="flex-1 overflow-auto p-3 sm:p-4">
        {activeTab === 'nvr_console' ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-800 overflow-hidden min-h-[720px]">
            <NvrCameraMasterConsole
              isModal={false}
              mapCenter={session.center}
              plantationFeatures={session.plantationFeatures}
              onDeployCameraToMap={cam => {
                session.writeHardwareRecord('deviceRegistry', cam.id, {
                  id: cam.id,
                  organizationId: session.orgId,
                  type: 'CAMERA',
                  name: cam.name,
                  model: cam.model,
                  connectionType: 'RTSP',
                  ipAddress: cam.ipAddress,
                  rtspPort: cam.rtspPort,
                  coords: { lat: cam.lat, lng: cam.lng },
                  fovConfig: {
                    azimuthDeg: cam.azimuthDeg,
                    fovAngleDeg: cam.fovAngleDeg,
                    rangeM: cam.rangeM,
                    mountHeightM: cam.mountHeightM,
                    tiltAngleDeg: cam.tiltAngleDeg,
                    isPtz: cam.isPtz,
                    isNightVision: cam.isNightVision,
                  },
                  status: 'ONLINE',
                  lastPing: new Date().toISOString(),
                });
                session.sendTelemetryReturn('DEVICE_STATUS', { camera: cam });
                toast.success(`Camera "${cam.name}" synced to Core registry.`);
              }}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900 p-4">
            <AllCamerasWideModal
              isOpen={true}
              onClose={() => setActiveTab('nvr_console')}
              cameras={session.cameras}
              onSelectCameraForDetail={cam => setSelectedCameraId(cam.id)}
            />
          </div>
        )}

        {session.targetId && activeCamera && activeTab === 'nvr_console' && (
          <CameraLiveMonitorWindow
            camera={activeCamera}
            onClose={() => setSelectedCameraId(undefined)}
            onOpenAllCamerasWide={() => setActiveTab('wide_matrix')}
          />
        )}

        {!activeCamera && session.cameras.length === 0 && (
          <div className="mt-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center gap-3 text-xs text-slate-400">
            <Video size={16} className="text-sky-400 shrink-0" />
            <span>No map cameras imported yet. Use the NVR Master Console above to discover or add cameras.</span>
          </div>
        )}
      </main>
    </div>
  );
};
