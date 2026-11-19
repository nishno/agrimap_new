import type { PlantationFeature } from '../types';

export type ExternalModuleId = 'vision' | 'drone' | 'gps_iot';
export type ServerMode = 'CLOUD' | 'LOCAL';

export interface PlantationCamera {
  id: string;
  name: string;
  channel: number;
  model: string;
  ipAddress: string;
  rtspPort: number;
  streamUrl?: string;
  locationName: string;
  lat: number;
  lng: number;
  mountHeightM: number;
  azimuthDeg: number;
  fovAngleDeg: number;
  rangeM: number;
  tiltAngleDeg: number;
  focalLengthMm?: number;
  opticalZoomLevel?: number;
  blindZoneRadiusM?: number;
  isPtz: boolean;
  isNightVision: boolean;
  status: 'ONLINE' | 'STANDBY' | 'RECORDING' | 'OFFLINE';
  ptzSpeed?: number;
  currentPreset?: number;
  isPatrolling?: boolean;
  resolution?: string;
  fps?: number;
  subStreamUrl?: string;
  onvifPort?: number;
  ptzPresets?: { id: number; name: string; azimuth: number; tilt: number; range: number; zoom: number }[];
}

export interface DroneFlightWaypoint {
  id: string;
  lat: number;
  lng: number;
  altitudeM: number;
  speedMs: number;
  leg: 'takeoff' | 'outbound' | 'sector_orbit' | 'return' | 'landing';
  name?: string;
  altM?: number;
  action?: 'takeoff' | 'photo' | 'video' | 'turn' | 'land' | 'hover';
}

export interface DroneFlightMission {
  id: string;
  name: string;
  mode: 'waypoints' | 'circle_sector';
  waypoints: DroneFlightWaypoint[];
  altitudeM: number;
  speedMs: number;
  timeIntervalSec: number;
  headingDeg: number;
  circleCenter?: [number, number];
  circleRadiusM?: number;
  sectorId?: string;
  isHidden: boolean;
  telemetryIntervalS?: number;
  directionDeg?: number;
  missionType?: 'waypoints' | 'circle_sector';
  status?: 'planned' | 'in_flight' | 'completed';
  selectedSectorIds?: string[];
  selectedTrenchIds?: string[];
}

export interface GpsDevice {
  id: string;
  name: string;
  type: 'worker_jacket' | 'vehicle_tractor' | 'vehicle_truck' | 'foreman_badge';
  assignedTo?: string;
  protocol: 'TELTONIKA_GH5200' | 'TELTONIKA_FMB920' | 'TRACCAR_OSMAND' | 'MQTT' | 'NMEA_0183' | 'WEBHOOK';
  imei: string;
  status: 'ONLINE' | 'STANDBY' | 'GEOFENCE_ALERT' | 'OFFLINE';
  batteryPct: number;
  speedKmh: number;
  headingDeg: number;
  lat: number;
  lng: number;
  altitudeM: number;
  accuracyM: number;
  lastPingTime: string;
  rowAssignment?: string;
  history: [number, number][];
}

export type DeviceRegistryType =
  | 'CAMERA'
  | 'DRONE'
  | 'GPS_TRACKER'
  | 'SOIL_SENSOR'
  | 'WEATHER_STATION'
  | 'PRINTER'
  | 'SCANNER'
  | 'SCALE';

export interface DeviceRegistryRecord {
  id: string;
  organizationId: string;
  type: DeviceRegistryType;
  name: string;
  model?: string;
  connectionType?: 'USB' | 'BLUETOOTH' | 'RTSP' | 'WEBRTC' | 'MAVLINK' | 'LTE' | 'WIFI_HALOW' | 'LORAWAN' | 'LOCAL' | 'LAN';
  connectionInfo?: string;
  ipAddress?: string;
  streamUrl?: string;
  rtspPort?: number;
  fovConfig?: {
    azimuthDeg: number;
    fovAngleDeg: number;
    rangeM: number;
    mountHeightM?: number;
    tiltAngleDeg?: number;
    isPtz?: boolean;
    isNightVision?: boolean;
  };
  coords?: { lat: number; lng: number };
  status: 'ONLINE' | 'OFFLINE' | 'STANDBY' | 'RECORDING';
  lastPing?: string;
  sectorId?: string;
  assignedWorkerId?: string;
  assignedMachineryId?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemNotificationRecord {
  id: string;
  organizationId: string;
  sourceApp: ExternalModuleId;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  sectorId?: string;
  deviceId?: string;
  coords?: { lat: number; lng: number };
  isRead: boolean;
  createdAt: string;
}

export type SeedlingHealthStatus = 'HEALTHY' | 'SUSPICIOUS' | 'DRIED';

export interface AgronomistDiagnosisRecord {
  id: string;
  organizationId: string;
  sectorId?: string;
  seedlingId?: string;
  droneId?: string;
  title: string;
  diagnosis: string;
  healthStatus: SeedlingHealthStatus;
  confidence?: number;
  photoRef?: string;
  coords?: { lat: number; lng: number };
  recommendedAction?: string;
  createdAt: string;
}

export interface LiveTelemetryRecord {
  deviceId: string;
  organizationId: string;
  assetType: 'worker' | 'machinery' | 'drone';
  workerId?: string;
  machineryId?: string;
  label?: string;
  lat: number;
  lng: number;
  speed: number;
  battery: number;
  headingDeg?: number;
  sectorId?: string;
  trenchId?: string;
  updatedAt: string;
}

export interface SoilTelemetryRecord {
  id: string;
  organizationId: string;
  sectorId: string;
  deviceId?: string;
  soil_ph: number;
  soil_ec: number;
  moisture: number;
  temp_c: number;
  humidity_pct?: number;
  wind_kmh?: number;
  rain_mm?: number;
  recordedAt: string;
}

export interface GeoJsonFeaturePayload {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: any;
  };
  properties: {
    featureType: string;
    name: string;
    variety?: string;
    healthStatus?: string;
    parentId?: string;
    sectorId?: string;
    [key: string]: any;
  };
}

export interface AgriMapGeoJsonExport {
  type: 'FeatureCollection';
  organizationId: string;
  serverMode: ServerMode;
  targetSectorId?: string;
  targetCameraId?: string;
  center: [number, number];
  exportedAt: string;
  features: GeoJsonFeaturePayload[];
  rawFeatures?: PlantationFeature[];
}

export interface ExternalTelemetryReturn {
  type: 'NOTIFICATION' | 'DIAGNOSIS' | 'TELEMETRY' | 'DEVICE_STATUS' | 'SEEDLING_HEALTH';
  organizationId: string;
  sourceApp: ExternalModuleId;
  payload: Record<string, any>;
  timestamp: string;
}

export interface ExternalLaunchPayload {
  launchCode: string;
  moduleId: ExternalModuleId;
  orgId: string;
  userId: string;
  userName?: string;
  userRole?: string;
  serverMode: ServerMode;
  localServerUrl?: string;
  /** Short-lived Firebase ID token or Local Server session grant (NEVER passed in URL) */
  authToken?: string;
  localSessionToken?: string;
  targetId?: string;
  sectorId?: string;
  center: [number, number];
  geoJsonContext: AgriMapGeoJsonExport;
  devices: DeviceRegistryRecord[];
  cameras?: PlantationCamera[];
  workers?: { id: string; name: string; barcode?: string; role?: string }[];
  machinery?: { id: string; name: string; type?: string }[];
  issuedAt: string;
  expiresAt: string;
}

export interface ExternalBridgeLaunchParams {
  launchCode: string;
  module: ExternalModuleId;
  serverMode: ServerMode;
  targetId?: string;
  sectorId?: string;
  parentOrigin: string;
  localServerUrl?: string;
}

export interface ExternalModuleConfigEntry {
  id: ExternalModuleId;
  name: string;
  subtitle: string;
  cloudUrl: string;
  localUrl: string;
  sameOriginEntryPath: string;
  trustedOrigins: string[];
  requiredCapabilities: string[];
}
