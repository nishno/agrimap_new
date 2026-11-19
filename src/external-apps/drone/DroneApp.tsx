import React, { useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Plane } from 'lucide-react';
import { useBridgeSession } from '../shared/useBridgeSession';
import { ExternalBridgeHeader } from '../shared/ExternalBridgeHeader';
import { DroneHardwareLab } from '../../components/SystemManagement/HardwareLabs/DroneHardwareLab';
import DroneSimulationModal from '../../components/DroneSimulationModal';
import { DroneFlightPathPlanner } from '../../components/DroneFlightPathPlanner';
import type { DroneFlightMission } from '../../types/hardwareContract';

export const DroneApp: React.FC = () => {
  const session = useBridgeSession('drone');
  const [activeTab, setActiveTab] = useState<'simulation_3d' | 'hardware_link' | 'path_planner'>('simulation_3d');
  const [mission, setMission] = useState<DroneFlightMission>(() => ({
    id: `mission_${Date.now()}`,
    name: session.sectorId ? `Sector ${session.sectorId} Survey` : 'Plantation Autonomous Survey',
    mode: 'waypoints',
    waypoints: [],
    altitudeM: 35,
    speedMs: 8,
    timeIntervalSec: 3,
    headingDeg: 0,
    sectorId: session.sectorId,
    isHidden: false,
  }));

  const targetSeedlings = useMemo(
    () =>
      session.plantationFeatures.filter(
        f => f.type === 'seedling' && (!session.sectorId || (f as any).parentId === session.sectorId)
      ),
    [session.plantationFeatures, session.sectorId]
  );

  const handlePublishFieldDiagnosis = async (status: 'DRIED' | 'SUSPICIOUS') => {
    const sampleSeedling = targetSeedlings[0];
    const diagId = `diag_drone_${Date.now()}`;
    const coords =
      sampleSeedling && Array.isArray((sampleSeedling as any).geometry)
        ? { lat: (sampleSeedling as any).geometry[0], lng: (sampleSeedling as any).geometry[1] }
        : { lat: session.center[0], lng: session.center[1] };

    const diagRecord = {
      id: diagId,
      organizationId: session.orgId,
      sectorId: session.sectorId || (sampleSeedling as any)?.parentId || 'sector-1',
      seedlingId: sampleSeedling?.id,
      droneId: session.targetId || 'drone-mavlink-01',
      title: status === 'DRIED' ? 'Dried Seedling Canopy Detected (NDVI Drop)' : 'Suspicious Water Stress Cluster',
      diagnosis:
        status === 'DRIED'
          ? 'Multispectral RGB/NDVI pass identified canopy desiccation and chlorophyll loss.'
          : 'Thermal anomaly detected along drip irrigation lateral; inspect emitter pressure.',
      healthStatus: status,
      confidence: 0.93,
      coords,
      recommendedAction:
        status === 'DRIED'
          ? 'Schedule immediate emitter flush and replacement seedling inspection.'
          : 'Verify drip line pressure and tensiometer moisture in target row.',
      createdAt: new Date().toISOString(),
    };

    await session.writeHardwareRecord('agronomistDiagnoses', diagId, diagRecord);
    if (sampleSeedling?.id) {
      await session.updateSeedlingHealth(sampleSeedling.id, status);
    }
    session.sendTelemetryReturn('DIAGNOSIS', diagRecord);
    toast.success(`Published "${diagRecord.title}" back to Core Agronomist Alerts.`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b1220] text-slate-100">
      <Toaster position="top-right" richColors />
      <ExternalBridgeHeader
        title="Drone 3D & Mission Control"
        subtitle={`${targetSeedlings.length} Sector Seedlings in Context`}
        session={session}
        tabs={[
          { id: 'simulation_3d', label: '3D Terrain & Flight Sim' },
          { id: 'hardware_link', label: 'MAVLink Telemetry HUD' },
          { id: 'path_planner', label: 'Flight Path Planner' },
        ]}
        activeTab={activeTab}
        onSelectTab={id => setActiveTab(id as 'simulation_3d' | 'hardware_link' | 'path_planner')}
        rightActions={
          <>
            <button
              type="button"
              onClick={() => handlePublishFieldDiagnosis('DRIED')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white cursor-pointer"
            >
              <AlertTriangle size={13} /> Flag Dried Seedling
            </button>
            <button
              type="button"
              onClick={() => handlePublishFieldDiagnosis('SUSPICIOUS')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 cursor-pointer"
            >
              <CheckCircle2 size={13} /> Log Sector Report
            </button>
          </>
        }
      />

      <main className="flex-1 overflow-auto p-3 sm:p-4">
        {activeTab === 'simulation_3d' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden min-h-[720px] relative">
            <DroneSimulationModal
              isOpen={true}
              onClose={() => setActiveTab('hardware_link')}
              plantationFeatures={session.plantationFeatures}
              activeMapCenter={session.center}
            />
          </div>
        )}

        {activeTab === 'hardware_link' && (
          <div className="rounded-xl border border-slate-800 bg-white dark:bg-slate-900 overflow-hidden p-4">
            <DroneHardwareLab mapCenter={session.center} />
          </div>
        )}

        {activeTab === 'path_planner' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden p-4">
            <DroneFlightPathPlanner
              isOpen={true}
              onClose={() => setActiveTab('simulation_3d')}
              mission={mission}
              onChangeMission={updated => {
                if (updated) setMission(updated);
              }}
              plantationFeatures={session.plantationFeatures}
              onStartSimulation={() => setActiveTab('simulation_3d')}
            />
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <Plane size={14} className="text-emerald-400" />
              <span>GeoJSON mission boundaries loaded from Core Map Planner ({session.plantationFeatures.length} features).</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
