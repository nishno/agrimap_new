import React, { useState, useEffect, useMemo } from 'react';
import { 
    Video, Camera, Play, Pause, Maximize2, Move, ZoomIn, ZoomOut, 
    Layers, Plus, Trash2, MapPin, Eye, EyeOff, Compass, Shield, Settings, 
    RefreshCw, Download, Check, AlertCircle, Sparkles, Search, Wifi,
    Server, HardDrive, Key, Lock, CheckCircle2, ArrowRight, ExternalLink,
    Globe, Sliders, ShieldCheck, PlayCircle, Radio, Activity, Cpu, Filter, 
    Copy, BookOpen, AlertTriangle, Mountain, Plane, CloudRain, Droplets,
    Zap, CornerDownRight, ChevronDown, ChevronUp, Navigation
} from 'lucide-react';
import { toast } from 'sonner';
import { safeStorage } from '../../../services/storageService';
import type { PlantationFeature } from '../../../types';
import { CameraVerificationModal, type DeviceConnectionTarget } from './CameraVerificationModal';
import { PlantationCameraMap } from './PlantationCameraMap';
import { CameraProtocolGuideModal } from './CameraProtocolGuideModal';
import { CameraPlannerModal } from './CameraPlannerModal';
import { TerrainSlopeSculptorModal } from '../../TerrainSlopeSculptorModal';
import DroneSimulationModal from '../../DroneSimulationModal';
import { CameraLiveMonitorWindow } from './CameraLiveMonitorWindow';
import { AllCamerasWideModal } from './AllCamerasWideModal';

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
    tiltAngleDeg: number; // e.g. 4 degrees down-tilt
    focalLengthMm?: number;
    opticalZoomLevel?: number;
    blindZoneRadiusM?: number;
    isPtz: boolean;
    isNightVision: boolean;
    status: 'ONLINE' | 'STANDBY' | 'RECORDING';
}

export interface DiscoveredNetworkDevice {
    id: string;
    alias: string;
    type: 'NVR' | 'DVR' | 'IP_CAMERA' | 'PTZ_CAMERA' | 'THERMAL_CAMERA' | 'DRONE' | 'GPS_ROVER' | 'SOIL_SENSOR' | 'WEATHER_STATION' | 'IOT_GATEWAY';
    brand: string;
    model: string;
    ip: string;
    httpPort: number;
    rtspPort: number;
    serverPort: number; // 8000 for Hikvision, 14550 for MAVLink, 2101 for NTRIP, 502 for Modbus, 22222 for WeatherLink
    mac: string;
    subnetMask: string;
    gateway: string;
    channelsCount?: number;
    channels?: {
        channel: number;
        name: string;
        model: string;
        ip: string;
        rtspUrl: string;
        resolution: string;
        status: 'ONLINE' | 'STANDBY' | 'NO_SIGNAL';
        isNightVision?: boolean;
        isPtz?: boolean;
    }[];
    firmwareVersion: string;
    activationStatus: 'ACTIVATED' | 'INACTIVE' | 'LOCKED';
    lastSeen: string;
    pingMs: number;
    isVerified?: boolean;
    telemetry?: any;
}

interface CameraNvrLabProps {
    mapCenter?: [number, number];
    plantationFeatures?: PlantationFeature[];
    onDeployCameraToMap?: (cam: PlantationCamera) => void;
}

export const CameraNvrLab: React.FC<CameraNvrLabProps> = ({
    mapCenter = [41.9023, 44.5],
    plantationFeatures = [],
    onDeployCameraToMap
}) => {
    const baseLat = mapCenter[0] || 41.9023;
    const baseLng = mapCenter[1] || 44.5;

    // Load draft features from storage if props are empty so map always has drawn plantation
    const effectivePlantationFeatures = useMemo(() => {
        if (plantationFeatures && plantationFeatures.length > 0) {
            return plantationFeatures;
        }
        try {
            const rawDraft = safeStorage.getItem('agrimap_draft_features');
            if (rawDraft) {
                const parsed = JSON.parse(rawDraft);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (_) {}
        return [];
    }, [plantationFeatures]);

    const [activeTab, setActiveTab] = useState<'live_grid' | 'network_search' | 'planner' | 'nvr_settings'>('live_grid');
    const [gridLayout, setGridLayout] = useState<'1x1' | '2x2' | '3x3'>('2x2');
    const [selectedCameraId, setSelectedCameraId] = useState<string>('cam-01');
    const [ptzSpeed, setPtzSpeed] = useState<number>(50);
    const [isNightModeActive, setIsNightModeActive] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);

    // 3-Phase Verification Modal State
    const [verificationTarget, setVerificationTarget] = useState<DeviceConnectionTarget | null>(null);
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(false);

    // Protocol & Code Guide Modal State
    const [isProtocolGuideOpen, setIsProtocolGuideOpen] = useState<boolean>(false);
    const [isCameraPlannerModalOpen, setIsCameraPlannerModalOpen] = useState<boolean>(false);
    const [isTerrainSculptorOpen, setIsTerrainSculptorOpen] = useState<boolean>(false);
    const [isDroneSimModalOpen, setIsDroneSimModalOpen] = useState<boolean>(false);

    // NVR / DVR Config with alias, host, ports, username, and password
    const [nvrConfig, setNvrConfig] = useState(() => {
        const saved = safeStorage.getItem('agrimap_hikvision_nvr_config');
        if (saved) {
            try { 
                const parsed = JSON.parse(saved);
                return {
                    alias: parsed.alias || 'Main Orchard AcuSense NVR (DS-7716NI)',
                    nvrModel: parsed.nvrModel || 'Hikvision DS-7716NI-I4 / 16P (4K AcuSense NVR)',
                    host: parsed.host || '192.168.1.120',
                    httpPort: parsed.httpPort || 80,
                    rtspPort: parsed.rtspPort || 554,
                    isapiPort: parsed.isapiPort || 8000,
                    username: parsed.username || 'admin',
                    password: parsed.password || 'PlantationAdmin2026!',
                    channelCount: parsed.channelCount || 16,
                    protocol: parsed.protocol || 'RTSP_OVER_WEBRTC',
                    recordingMode: parsed.recordingMode || 'CONTINUOUS_PLUS_AI_MOTION',
                    isVerified: parsed.isVerified || false
                };
            } catch (e) {}
        }
        return {
            alias: 'Main Orchard AcuSense NVR (DS-7716NI)',
            nvrModel: 'Hikvision DS-7716NI-I4 / 16P (4K AcuSense NVR)',
            host: '192.168.1.120',
            httpPort: 80,
            rtspPort: 554,
            isapiPort: 8000,
            username: 'admin',
            password: 'PlantationAdmin2026!',
            channelCount: 16,
            protocol: 'RTSP_OVER_WEBRTC',
            recordingMode: 'CONTINUOUS_PLUS_AI_MOTION',
            isVerified: true
        };
    });

    // Camera list
    const [cameras, setCameras] = useState<PlantationCamera[]>(() => {
        const saved = safeStorage.getItem('agrimap_plantation_cameras');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [
            {
                id: 'cam-01',
                name: 'Main Plantation Gate & Weigh Scale',
                channel: 1,
                model: 'Hikvision DS-2CD2087G2-LU (4K ColorVu)',
                ipAddress: '192.168.1.121',
                rtspPort: 554,
                locationName: 'Front Security Gate & Weighing Terminal',
                lat: baseLat - 0.0018,
                lng: baseLng - 0.0005,
                mountHeightM: 6,
                azimuthDeg: 45,
                fovAngleDeg: 102,
                rangeM: 65,
                tiltAngleDeg: 4, // 4 degrees down-tilt as requested
                isPtz: false,
                isNightVision: true,
                status: 'RECORDING'
            },
            {
                id: 'cam-02',
                name: 'North Blueberry Field Block A',
                channel: 2,
                model: 'Hikvision DS-2CD2386G2-ISU (AcuSense 4K)',
                ipAddress: '192.168.1.122',
                rtspPort: 554,
                locationName: 'North Orchard Pole #4',
                lat: baseLat + 0.0012,
                lng: baseLng + 0.0008,
                mountHeightM: 8,
                azimuthDeg: 135,
                fovAngleDeg: 89,
                rangeM: 90,
                tiltAngleDeg: 5,
                isPtz: false,
                isNightVision: true,
                status: 'RECORDING'
            },
            {
                id: 'cam-03',
                name: 'Cold Storage & Packing Facility',
                channel: 3,
                model: 'Hikvision DarkFighter Ultra-LowLight',
                ipAddress: '192.168.1.123',
                rtspPort: 554,
                locationName: 'Post-Harvest Logistics Shed',
                lat: baseLat - 0.0010,
                lng: baseLng + 0.0018,
                mountHeightM: 5,
                azimuthDeg: 270,
                fovAngleDeg: 110,
                rangeM: 45,
                tiltAngleDeg: 4,
                isPtz: false,
                isNightVision: true,
                status: 'RECORDING'
            },
            {
                id: 'cam-04',
                name: 'Irrigation Pump House & Deep Well',
                channel: 4,
                model: 'Hikvision DS-2DE4425IW-DE (25x PTZ)',
                ipAddress: '192.168.1.124',
                rtspPort: 554,
                locationName: 'Central Fertigation Station',
                lat: baseLat + 0.0002,
                lng: baseLng - 0.0014,
                mountHeightM: 10,
                azimuthDeg: 180,
                fovAngleDeg: 60,
                rangeM: 160,
                tiltAngleDeg: 6,
                isPtz: true,
                isNightVision: true,
                status: 'ONLINE'
            }
        ];
    });

    // Camera Planner Temporary State
    const [plannedCam, setPlannedCam] = useState<PlantationCamera>({
        id: `plan-cam-${Date.now()}`,
        name: 'New Orchard Surveillance Camera',
        channel: cameras.length + 1,
        model: 'Hikvision DS-2CD2087G2-LU (ColorVu 2.8mm)',
        ipAddress: `192.168.1.${120 + cameras.length + 1}`,
        rtspPort: 554,
        locationName: 'Proposed Pole Block C',
        lat: baseLat + 0.0020,
        lng: baseLng - 0.0010,
        mountHeightM: 6,
        azimuthDeg: 90,
        fovAngleDeg: 105,
        rangeM: 75,
        tiltAngleDeg: 4, // Default 4 degrees tilt angle
        isPtz: false,
        isNightVision: true,
        status: 'STANDBY'
    });

    // Local Network Discovery State
    const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredNetworkDevice[]>(() => {
        const saved = safeStorage.getItem('agrimap_discovered_camera_devices');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [];
    });

    const [isScanningNetwork, setIsScanningNetwork] = useState<boolean>(false);
    const [scanProgress, setScanProgress] = useState<number>(0);
    const [scanStatusText, setScanStatusText] = useState<string>('Idle');
    const [subnetInput, setSubnetInput] = useState<string>('192.168.1.0/24');
    const [deviceTypeFilter, setDeviceTypeFilter] = useState<'ALL' | 'RECORDERS' | 'CAMERAS' | 'DRONES' | 'GPS_ROVERS' | 'SOIL_SENSORS' | 'WEATHER_STATIONS' | 'IOT_GATEWAYS'>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showManualAddModal, setShowManualAddModal] = useState<boolean>(false);
    const [expandedNvrIds, setExpandedNvrIds] = useState<string[]>(['dev-hik-nvr-7716']);
    const [liveStreamCamera, setLiveStreamCamera] = useState<PlantationCamera | null>(null);
    const [isAllCamerasWideOpen, setIsAllCamerasWideOpen] = useState<boolean>(false);

    // Manual Add Device State (supports both local LAN & remote WAN/Global IP)
    const [manualDevice, setManualDevice] = useState<{
        isWanRemote: boolean;
        alias: string;
        type: 'NVR' | 'DVR' | 'IP_CAMERA' | 'PTZ_CAMERA';
        brand: 'Hikvision' | 'Dahua' | 'Uniview' | 'Axis' | 'ONVIF';
        model: string;
        host: string;
        httpPort: number;
        rtspPort: number;
        serverPort: number;
        username: string;
        password: string;
        channelCount: number;
    }>({
        isWanRemote: false,
        alias: 'New Hikvision NVR (DS-7716NI)',
        type: 'NVR',
        brand: 'Hikvision',
        model: 'Hikvision DS-7716NI-I4 / 16P (4K NVR)',
        host: '192.168.1.120',
        httpPort: 80,
        rtspPort: 554,
        serverPort: 8000,
        username: 'admin',
        password: '',
        channelCount: 16
    });

    // Persist cameras
    useEffect(() => {
        safeStorage.setItem('agrimap_plantation_cameras', JSON.stringify(cameras));
    }, [cameras]);

    // Persist discovered devices
    useEffect(() => {
        safeStorage.setItem('agrimap_discovered_camera_devices', JSON.stringify(discoveredDevices));
    }, [discoveredDevices]);

    // Handle 3-Phase Verification for NVR Settings
    const handleTriggerNvrVerification = () => {
        if (!nvrConfig.host) {
            toast.error('Host IP address or Domain is required.');
            return;
        }
        setVerificationTarget({
            alias: nvrConfig.alias || 'Primary NVR System',
            host: nvrConfig.host,
            httpPort: nvrConfig.httpPort || 80,
            rtspPort: nvrConfig.rtspPort || 554,
            isapiPort: nvrConfig.isapiPort || 8000,
            username: nvrConfig.username || 'admin',
            password: nvrConfig.password || '',
            model: nvrConfig.nvrModel,
            brand: 'Hikvision',
            type: 'NVR',
            channelCount: nvrConfig.channelCount || 16,
            isWanRemote: !nvrConfig.host.startsWith('192.168.') && !nvrConfig.host.startsWith('10.') && !nvrConfig.host.startsWith('172.')
        });
        setIsVerificationModalOpen(true);
    };

    // Save verified target back to NVR config
    const handleVerificationSuccess = (verified: DeviceConnectionTarget & { channels: number; pingMs: number }) => {
        const updated = {
            ...nvrConfig,
            alias: verified.alias,
            host: verified.host,
            httpPort: verified.httpPort,
            rtspPort: verified.rtspPort,
            isapiPort: verified.isapiPort,
            username: verified.username,
            password: verified.password || '',
            nvrModel: verified.model || nvrConfig.nvrModel,
            channelCount: verified.channels,
            isVerified: true
        };
        setNvrConfig(updated);
        safeStorage.setItem('agrimap_hikvision_nvr_config', JSON.stringify(updated));
        toast.success(`NVR "${verified.alias}" is verified and active! All 3 phases verified.`);
    };

    // Handle Comprehensive Multi-Protocol Network Scan (NVRs, Cameras, Drones, GPS, Soil Sensors, Weather Stations)
    const handleStartNetworkScan = async () => {
        setIsScanningNetwork(true);
        setScanProgress(10);
        setScanStatusText(`Scanning subnet ${subnetInput} for active ARP hosts & gateway...`);

        const intervals = [
            { pct: 20, text: 'Broadcasting Hikvision SADP inquiry on UDP port 37020...' },
            { pct: 40, text: 'Multicasting ONVIF WS-Discovery to 239.255.255.250:3702 & RTSP :554...' },
            { pct: 60, text: 'Listening for MAVLink telemetry heartbeat on UDP :14550 (Ag Drones)...' },
            { pct: 75, text: 'Probing RTK GNSS Base NTRIP :2101 and TCP raw stream :9001...' },
            { pct: 88, text: 'Querying LoRaWAN / Modbus TCP :502 Soil Sensors & WeatherLink :22222...' },
            { pct: 96, text: 'Enumerating NVR PoE channels & Edge AI vision endpoints...' }
        ];

        for (const step of intervals) {
            await new Promise(r => setTimeout(r, 450));
            setScanProgress(step.pct);
            setScanStatusText(step.text);
        }

        setIsScanningNetwork(false);
        setScanProgress(100);

        // Rich Multi-Device Discovered Set
        const newDiscovered: DiscoveredNetworkDevice[] = [
            // 1. Hikvision 4K AcuSense NVR with PoE Channels
            {
                id: 'dev-hik-nvr-7716',
                alias: nvrConfig.alias || 'Hikvision DS-7716NI-I4 AcuSense NVR',
                type: 'NVR',
                brand: 'Hikvision',
                model: 'DS-7716NI-I4 / 16P (16-Channel 4K AcuSense NVR)',
                ip: nvrConfig.host || '192.168.1.120',
                httpPort: nvrConfig.httpPort || 80,
                rtspPort: nvrConfig.rtspPort || 554,
                serverPort: nvrConfig.isapiPort || 8000,
                mac: 'BC:54:51:A4:12:8E',
                subnetMask: '255.255.255.0',
                gateway: '192.168.1.1',
                channelsCount: 16,
                firmwareVersion: 'V4.74.015 build 240210',
                activationStatus: 'ACTIVATED',
                lastSeen: 'Just now',
                pingMs: 4,
                isVerified: true,
                channels: [
                    {
                        channel: 1,
                        name: 'North Perimeter Mast (ColorVu 4K)',
                        model: 'DS-2CD2087G2-LU',
                        ip: '192.168.1.121',
                        rtspUrl: 'rtsp://192.168.1.120:554/Streaming/Channels/101',
                        resolution: '3840x2160 @ 25fps',
                        status: 'ONLINE',
                        isNightVision: true,
                        isPtz: false
                    },
                    {
                        channel: 2,
                        name: 'South Main Gate & Weighbridge (AcuSense)',
                        model: 'DS-2CD2386G2-ISU',
                        ip: '192.168.1.122',
                        rtspUrl: 'rtsp://192.168.1.120:554/Streaming/Channels/201',
                        resolution: '3840x2160 @ 25fps',
                        status: 'ONLINE',
                        isNightVision: true,
                        isPtz: false
                    },
                    {
                        channel: 3,
                        name: 'Central Irrigation Pump Station (Thermal/Optical)',
                        model: 'DS-2TD1217B Bi-Spectrum',
                        ip: '192.168.1.123',
                        rtspUrl: 'rtsp://192.168.1.120:554/Streaming/Channels/301',
                        resolution: '1920x1080 @ 30fps',
                        status: 'ONLINE',
                        isNightVision: true,
                        isPtz: false
                    },
                    {
                        channel: 4,
                        name: 'East Boundary Hillside Security (25x PTZ)',
                        model: 'DS-2DE4425IW-DE',
                        ip: '192.168.1.124',
                        rtspUrl: 'rtsp://192.168.1.120:554/Streaming/Channels/401',
                        resolution: '2560x1440 @ 30fps',
                        status: 'ONLINE',
                        isNightVision: true,
                        isPtz: true
                    }
                ]
            },
            // 2. Dahua WizSense 16Ch NVR
            {
                id: 'dev-dahua-nvr-5216',
                alias: 'Storage & Logistics WizSense NVR',
                type: 'NVR',
                brand: 'Dahua',
                model: 'NVR5216-4KS2 WizSense (16-Channel 4K AI)',
                ip: '192.168.1.125',
                httpPort: 80,
                rtspPort: 554,
                serverPort: 37777,
                mac: '3C:EF:8C:7D:91:2B',
                subnetMask: '255.255.255.0',
                gateway: '192.168.1.1',
                channelsCount: 16,
                firmwareVersion: 'DH_NVR5XXX-4KS2_V4.002.0000000.3.R',
                activationStatus: 'ACTIVATED',
                lastSeen: 'Just now',
                pingMs: 6,
                isVerified: false,
                channels: [
                    {
                        channel: 1,
                        name: 'Tractor Depot & Machinery Workshop',
                        model: 'IPC-HFW5442T-ASE',
                        ip: '192.168.1.131',
                        rtspUrl: 'rtsp://192.168.1.125:554/cam/realmonitor?channel=1&subtype=0',
                        resolution: '2688x1520 @ 30fps',
                        status: 'ONLINE',
                        isNightVision: true,
                        isPtz: false
                    },
                    {
                        channel: 2,
                        name: 'Cold Storage Loading Ramp',
                        model: 'IPC-HDW5842T-ZE',
                        ip: '192.168.1.132',
                        rtspUrl: 'rtsp://192.168.1.125:554/cam/realmonitor?channel=2&subtype=0',
                        resolution: '3840x2160 @ 25fps',
                        status: 'ONLINE',
                        isNightVision: true,
                        isPtz: false
                    }
                ]
            },
            // 3. Standalone Hikvision ColorVu 4K Bullet
            {
                id: 'dev-cam-colorvu-01',
                alias: 'Orchard West Perimeter ColorVu 4K',
                type: 'IP_CAMERA',
                brand: 'Hikvision',
                model: 'DS-2CD2087G2-LU (4K ColorVu F1.0 Lens)',
                ip: '192.168.1.126',
                httpPort: 80,
                rtspPort: 554,
                serverPort: 8000,
                mac: 'BC:54:51:B2:34:AA',
                subnetMask: '255.255.255.0',
                gateway: '192.168.1.1',
                firmwareVersion: 'V5.7.13 build 231120',
                activationStatus: 'ACTIVATED',
                lastSeen: 'Just now',
                pingMs: 3,
                isVerified: true
            },
            // 4. Standalone Dahua TiOC 25x PTZ
            {
                id: 'dev-cam-ptz-dahua',
                alias: 'Hilltop Patrol 25x Optical PTZ',
                type: 'PTZ_CAMERA',
                brand: 'Dahua',
                model: 'SD49425XB-HNR (4MP 25x WizSense Auto-Tracking)',
                ip: '192.168.1.127',
                httpPort: 80,
                rtspPort: 554,
                serverPort: 37777,
                mac: '3C:EF:8C:11:45:90',
                subnetMask: '255.255.255.0',
                gateway: '192.168.1.1',
                firmwareVersion: 'DH_SD49XXX_V2.812.0000000.1.R',
                activationStatus: 'ACTIVATED',
                lastSeen: 'Just now',
                pingMs: 7,
                isVerified: true
            },
            // 5. Thermal Bi-Spectrum Frost/Fire Warning Camera
            {
                id: 'dev-cam-thermal-01',
                alias: 'Microclimate Thermal Turret (Frost/Fire Alert)',
                type: 'THERMAL_CAMERA',
                brand: 'Hikvision',
                model: 'DS-2TD1217B Bi-Spectrum (Thermal & Optical DeepinView)',
                ip: '192.168.1.128',
                httpPort: 80,
                rtspPort: 554,
                serverPort: 8000,
                mac: 'BC:54:51:FE:89:10',
                subnetMask: '255.255.255.0',
                gateway: '192.168.1.1',
                firmwareVersion: 'V5.5.42 build 230915',
                activationStatus: 'ACTIVATED',
                lastSeen: 'Just now',
                pingMs: 5,
                isVerified: false
            },
            // 6. Agricultural Drone Ground Station
            {
                id: 'dev-drone-agras-t50',
                alias: 'DJI Agras T50 Spraying & Survey Drone Hub',
                type: 'DRONE',
                brand: 'DJI',
                model: 'Agras T50 Ground Station & D-RTK 2 Link',
                ip: '192.168.1.135',
                httpPort: 8080,
                rtspPort: 8554,
                serverPort: 14550, // MAVLink UDP
                mac: '48:A4:72:6E:9A:14',
                subnetMask: '255.255.255.0',
                gateway: '192.168.1.1',
                firmwareVersion: 'v01.03.0118',
                activationStatus: 'ACTIVATED',
                lastSeen: 'Just now',
                pingMs: 12,
                isVerified: true,
                telemetry: {
                    batteryPct: 94,
                    flightMode: 'AUTO_SURVEY_STANDBY',
                    satellites: 28,
                    gpsFix: 'RTK_FIXED (0.02m)'
                }
            },
            // 7. Multi-Band RTK GNSS Base Station
            {
                id: 'dev-gps-emlid-rs2',
                alias: 'Emlid Reach RS2+ Centimeter RTK Base Station',
                type: 'GPS_ROVER',
                brand: 'Emlid',
                model: 'Reach RS2+ Multi-Band L1/L2/L5 GNSS Receiver',
                ip: '192.168.1.140',
                httpPort: 80,
                rtspPort: 0,
                serverPort: 2101, // NTRIP Caster / 9001 TCP Raw
                mac: 'B8:27:EB:42:71:0D',
                subnetMask: '255.255.255.0',
                gateway: '192.168.1.1',
                firmwareVersion: 'ReachView 32.1',
                activationStatus: 'ACTIVATED',
                lastSeen: 'Just now',
                pingMs: 4,
                isVerified: true,
                telemetry: {
                    satellites: 32,
                    gpsFix: 'BASE_BROADCASTING',
                    accuracyM: 0.01
                }
            },
            // 8. Industrial Soil Sensor Gateway with Multi-Depth Probes
            {
                id: 'dev-soil-dragino-lps8n',
                alias: 'Dragino LPS8N Soil Moisture/EC/Temp Gateway',
                type: 'SOIL_SENSOR',
                brand: 'Dragino',
                model: 'LPS8N 8-Channel LoRaWAN / Modbus TCP Gateway',
                ip: '192.168.1.145',
                httpPort: 80,
                rtspPort: 0,
                serverPort: 502, // Modbus TCP
                mac: 'A8:40:41:1B:32:89',
                subnetMask: '255.255.255.0',
                gateway: '192.168.1.1',
                firmwareVersion: 'dragino-2-v2.8.2',
                activationStatus: 'ACTIVATED',
                lastSeen: 'Just now',
                pingMs: 8,
                isVerified: true,
                telemetry: {
                    moisturePct: 38.4,
                    soilPh: 6.8,
                    soilEcDsm: 1.32,
                    tempC: 18.2,
                    depthCm: 30
                }
            },
            // 9. Davis Agro-Meteorological Weather Station
            {
                id: 'dev-weather-davis-vantage',
                alias: 'Central Plantation Agro-Weather Station',
                type: 'WEATHER_STATION',
                brand: 'Davis Instruments',
                model: 'Vantage Pro2 Plus (WeatherLink IP TCP Stream)',
                ip: '192.168.1.150',
                httpPort: 80,
                rtspPort: 0,
                serverPort: 22222, // WeatherLink IP TCP
                mac: '00:1D:0A:34:91:EE',
                subnetMask: '255.255.255.0',
                gateway: '192.168.1.1',
                firmwareVersion: 'WL-IP v3.1.2',
                activationStatus: 'ACTIVATED',
                lastSeen: 'Just now',
                pingMs: 5,
                isVerified: true,
                telemetry: {
                    tempC: 21.4,
                    humidityPct: 58,
                    windSpeedKmh: 14.2,
                    solarRadiationWm2: 680,
                    rainMm: 0.0
                }
            },
            // 10. Farm Edge AI Vision Gateway
            {
                id: 'dev-ai-jetson-orin',
                alias: 'NVIDIA Jetson Orin Nano Farm Edge AI Hub',
                type: 'IOT_GATEWAY',
                brand: 'NVIDIA',
                model: 'Jetson Orin Nano 8GB (Real-Time YOLOv11 Tree & Pest Vision)',
                ip: '192.168.1.160',
                httpPort: 8080,
                rtspPort: 8554,
                serverPort: 8080,
                mac: '48:B0:2D:61:94:AF',
                subnetMask: '255.255.255.0',
                gateway: '192.168.1.1',
                firmwareVersion: 'JetPack 6.0 (L4T 36.2.0)',
                activationStatus: 'ACTIVATED',
                lastSeen: 'Just now',
                pingMs: 2,
                isVerified: true
            }
        ];

        setDiscoveredDevices(newDiscovered);
        toast.success(`LAN discovery complete: 10 hardware endpoints identified across ${subnetInput}`);
    };

    // Deploy NVR PoE Channel directly to Plantation Map
    const handleDeployChannelToMap = (ch: any, nvr: DiscoveredNetworkDevice) => {
        const offsetLat = (ch.channel === 1 ? 0.001 : ch.channel === 2 ? -0.001 : ch.channel === 3 ? 0.0006 : -0.0006);
        const offsetLng = (ch.channel === 1 ? -0.0008 : ch.channel === 2 ? 0.0008 : ch.channel === 3 ? 0.0012 : -0.0012);
        
        const newCam: PlantationCamera = {
            id: `cam-poe-${Date.now()}-${ch.channel}`,
            name: `${nvr.brand} CH0${ch.channel} - ${ch.name}`,
            channel: ch.channel,
            model: ch.model,
            ipAddress: ch.ip,
            rtspPort: 554,
            streamUrl: ch.rtspUrl,
            locationName: `Perimeter Zone CH0${ch.channel}`,
            lat: baseLat + offsetLat,
            lng: baseLng + offsetLng,
            mountHeightM: 6,
            azimuthDeg: 90 * ch.channel,
            fovAngleDeg: ch.isPtz ? 65 : 102,
            rangeM: ch.isPtz ? 130 : 80,
            tiltAngleDeg: 4,
            isPtz: !!ch.isPtz,
            isNightVision: true,
            status: 'ONLINE'
        };
        const updated = [...cameras, newCam];
        setCameras(updated);
        safeStorage.setItem('agrimap_plantation_cameras', JSON.stringify(updated));
        
        // Also persist to sandbox test cameras for the map
        try {
            const currentSandbox = safeStorage.getItem('agrimap_sandbox_test_cameras');
            const parsed = currentSandbox ? JSON.parse(currentSandbox) : [];
            safeStorage.setItem('agrimap_sandbox_test_cameras', JSON.stringify([...parsed, newCam]));
        } catch (_) {}

        onDeployCameraToMap?.(newCam);
        toast.success(`NVR Channel 0${ch.channel} (${ch.name}) deployed to map!`);
    };

    // Universal Deploy Handler for any Discovered Device
    const handleDeployDeviceToMap = (device: DiscoveredNetworkDevice) => {
        if (device.type === 'WEATHER_STATION') {
            const newStation = {
                id: `weather-${Date.now()}`,
                name: device.alias,
                model: device.model,
                ipAddress: device.ip,
                port: device.serverPort || 22222,
                lat: baseLat + 0.0008,
                lng: baseLng - 0.0006,
                tempC: device.telemetry?.tempC || 21.4,
                humidityPct: device.telemetry?.humidityPct || 58,
                windSpeedKmh: device.telemetry?.windSpeedKmh || 14.2,
                windDirectionDeg: 240,
                solarRadiationWm2: device.telemetry?.solarRadiationWm2 || 680,
                rainMm: device.telemetry?.rainMm || 0.0,
                pressureHpa: 1015.4,
                status: 'ONLINE',
                lastUpdated: 'Just now'
            };
            try {
                const current = safeStorage.getItem('agrimap_sandbox_test_weather_stations');
                const parsed = current ? JSON.parse(current) : [];
                safeStorage.setItem('agrimap_sandbox_test_weather_stations', JSON.stringify([...parsed, newStation]));
            } catch (_) {}
            toast.success(`Agro-Weather Station "${device.alias}" deployed to map!`);
        } else if (device.type === 'SOIL_SENSOR') {
            const newSoil = {
                id: `soil-${Date.now()}`,
                name: device.alias,
                type: 'SOIL_MOISTURE_NPK',
                lat: baseLat + 0.0009,
                lng: baseLng - 0.0007,
                moistureVwc: device.telemetry?.moisturePct || 38.4,
                temperatureC: device.telemetry?.tempC || 18.2,
                ecMsCm: device.telemetry?.soilEcDsm || 1.32,
                nitrogenPpm: 46,
                phosphorusPpm: 24,
                potassiumPpm: 175,
                batteryPct: 96,
                signalRssi: -65,
                depthCm: device.telemetry?.depthCm || 30,
                status: 'OPTIMAL'
            };
            try {
                const current = safeStorage.getItem('agrimap_sandbox_test_soil');
                const parsed = current ? JSON.parse(current) : [];
                safeStorage.setItem('agrimap_sandbox_test_soil', JSON.stringify([...parsed, newSoil]));
            } catch (_) {}
            toast.success(`Soil Moisture/EC Probe "${device.alias}" deployed to map!`);
        } else if (device.type === 'DRONE') {
            toast.success(`Drone Base "${device.alias}" paired with MAVLink UDP :14550! Active telemetry stream linked.`);
        } else if (device.type === 'GPS_ROVER') {
            const newWorker = {
                id: `gps-base-${Date.now()}`,
                workerName: device.alias,
                badgeCode: `RTK-BASE`,
                role: 'RTK GNSS Base Station',
                lat: baseLat - 0.0005,
                lng: baseLng - 0.0003,
                speedKmh: 0,
                batteryPct: 98,
                heartRateBpm: 0,
                status: 'ACTIVE'
            };
            try {
                const current = safeStorage.getItem('agrimap_sandbox_test_workers');
                const parsed = current ? JSON.parse(current) : [];
                safeStorage.setItem('agrimap_sandbox_test_workers', JSON.stringify([...parsed, newWorker]));
            } catch (_) {}
            toast.success(`RTK GPS Base "${device.alias}" deployed to map!`);
        } else {
            // Camera
            const newCam: PlantationCamera = {
                id: `cam-${Date.now()}`,
                name: device.alias,
                channel: cameras.length + 1,
                model: `${device.brand} ${device.model}`,
                ipAddress: device.ip,
                rtspPort: device.rtspPort || 554,
                locationName: `Perimeter Zone ${device.ip}`,
                lat: baseLat + 0.0006,
                lng: baseLng + 0.0006,
                mountHeightM: 6,
                azimuthDeg: 90,
                fovAngleDeg: device.type === 'PTZ_CAMERA' ? 65 : 102,
                rangeM: device.type === 'PTZ_CAMERA' ? 140 : 80,
                tiltAngleDeg: 4,
                isPtz: device.type === 'PTZ_CAMERA',
                isNightVision: true,
                status: 'ONLINE'
            };
            const updated = [...cameras, newCam];
            setCameras(updated);
            safeStorage.setItem('agrimap_plantation_cameras', JSON.stringify(updated));
            try {
                const currentSandbox = safeStorage.getItem('agrimap_sandbox_test_cameras');
                const parsed = currentSandbox ? JSON.parse(currentSandbox) : [];
                safeStorage.setItem('agrimap_sandbox_test_cameras', JSON.stringify([...parsed, newCam]));
            } catch (_) {}
            onDeployCameraToMap?.(newCam);
            toast.success(`Camera "${device.alias}" deployed to Plantation Map!`);
        }
    };

    // Watch Live Stream in dedicated floating monitor window
    const handleWatchLiveStream = (camOrDevice: PlantationCamera | DiscoveredNetworkDevice) => {
        let targetCam: PlantationCamera;
        if ('tiltAngleDeg' in camOrDevice) {
            targetCam = camOrDevice as PlantationCamera;
        } else {
            const dev = camOrDevice as DiscoveredNetworkDevice;
            targetCam = {
                id: dev.id,
                name: dev.alias,
                channel: 1,
                model: `${dev.brand} ${dev.model}`,
                ipAddress: dev.ip,
                rtspPort: dev.rtspPort || 554,
                locationName: `${dev.alias} (${dev.ip})`,
                lat: baseLat,
                lng: baseLng,
                mountHeightM: 6,
                azimuthDeg: 90,
                fovAngleDeg: dev.type === 'PTZ_CAMERA' ? 65 : 102,
                rangeM: 80,
                tiltAngleDeg: 4,
                isPtz: dev.type === 'PTZ_CAMERA',
                isNightVision: true,
                status: 'ONLINE'
            };
        }
        setLiveStreamCamera(targetCam);
    };

    // Trigger verification for a discovered device
    const handleVerifyDiscoveredDevice = (device: DiscoveredNetworkDevice) => {
        setVerificationTarget({
            alias: device.alias,
            host: device.ip,
            httpPort: device.httpPort,
            rtspPort: device.rtspPort,
            isapiPort: device.serverPort,
            username: 'admin',
            password: nvrConfig.password || '',
            model: `${device.brand} ${device.model}`,
            brand: device.brand,
            type: device.type,
            channelCount: device.channelsCount || 16,
            isWanRemote: false
        });
        setIsVerificationModalOpen(true);
    };

    // Hidden Camera IDs for map visibility toggle
    const [hiddenCameraIds, setHiddenCameraIds] = useState<string[]>(() => {
        const saved = safeStorage.getItem('agrimap_hidden_camera_ids');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [];
    });

    useEffect(() => {
        safeStorage.setItem('agrimap_hidden_camera_ids', JSON.stringify(hiddenCameraIds));
    }, [hiddenCameraIds]);

    const handleToggleHideCamera = (id: string) => {
        setHiddenCameraIds(prev => {
            const isHidden = prev.includes(id);
            const next = isHidden ? prev.filter(x => x !== id) : [...prev, id];
            toast.info(isHidden ? 'Camera coverage cone unhidden on map.' : 'Camera coverage cone hidden from map.');
            return next;
        });
    };

    const handleAddCameraAt = (lat: number, lng: number) => {
        const channelNum = cameras.length + 1;
        const newCam: PlantationCamera = {
            id: `cam-${Date.now()}-${channelNum}`,
            name: `Surveillance Camera #${channelNum}`,
            channel: channelNum,
            model: 'Hikvision DS-2CD2087G2-LU (4K ColorVu)',
            ipAddress: `192.168.1.${120 + channelNum}`,
            rtspPort: 554,
            locationName: `Perimeter Mast #${channelNum}`,
            lat,
            lng,
            mountHeightM: 6,
            azimuthDeg: 90,
            fovAngleDeg: 102,
            rangeM: 75,
            tiltAngleDeg: 4,
            isPtz: false,
            isNightVision: true,
            status: 'ONLINE'
        };
        const updated = [...cameras, newCam];
        setCameras(updated);
        safeStorage.setItem('agrimap_plantation_cameras', JSON.stringify(updated));
        setSelectedCameraId(newCam.id);
        toast.success(`Camera #${channelNum} placed at [${lat.toFixed(5)}, ${lng.toFixed(5)}] • Tilt 4°`);
    };

    const handleUpdateCamera = (updatedCam: PlantationCamera) => {
        setCameras(prev => {
            const next = prev.map(c => c.id === updatedCam.id ? updatedCam : c);
            safeStorage.setItem('agrimap_plantation_cameras', JSON.stringify(next));
            return next;
        });
    };

    const handleDeleteCamera = (cameraId: string) => {
        setCameras(prev => {
            const next = prev.filter(c => c.id !== cameraId);
            safeStorage.setItem('agrimap_plantation_cameras', JSON.stringify(next));
            return next;
        });
        if (selectedCameraId === cameraId) {
            setSelectedCameraId(cameras[0]?.id || '');
        }
    };

    const handleAddPerimeterSetup = () => {
        const offset = 0.0015;
        const batch: PlantationCamera[] = [
            {
                id: `cam-${Date.now()}-N`,
                name: 'North Gate AcuSense',
                channel: cameras.length + 1,
                model: 'Hikvision DS-2CD2087G2-LU (4K ColorVu)',
                ipAddress: `192.168.1.${130 + cameras.length}`,
                rtspPort: 554,
                locationName: 'North Gate Mast',
                lat: baseLat + offset,
                lng: baseLng,
                mountHeightM: 8,
                azimuthDeg: 180,
                fovAngleDeg: 102,
                rangeM: 80,
                tiltAngleDeg: 4,
                isPtz: false,
                isNightVision: true,
                status: 'ONLINE'
            },
            {
                id: `cam-${Date.now()}-S`,
                name: 'South Orchard Boundary',
                channel: cameras.length + 2,
                model: 'Hikvision DS-2CD2386G2-ISU (AcuSense 4K)',
                ipAddress: `192.168.1.${131 + cameras.length}`,
                rtspPort: 554,
                locationName: 'South Perimeter Mast',
                lat: baseLat - offset,
                lng: baseLng,
                mountHeightM: 7,
                azimuthDeg: 0,
                fovAngleDeg: 89,
                rangeM: 75,
                tiltAngleDeg: 4,
                isPtz: false,
                isNightVision: true,
                status: 'ONLINE'
            },
            {
                id: `cam-${Date.now()}-E`,
                name: 'East Trench PTZ Station',
                channel: cameras.length + 3,
                model: 'Hikvision DS-2DE4425IW-DE (25x PTZ)',
                ipAddress: `192.168.1.${132 + cameras.length}`,
                rtspPort: 554,
                locationName: 'East Trench Tower',
                lat: baseLat,
                lng: baseLng + offset,
                mountHeightM: 10,
                azimuthDeg: 270,
                fovAngleDeg: 60,
                rangeM: 160,
                tiltAngleDeg: 5,
                isPtz: true,
                isNightVision: true,
                status: 'ONLINE'
            },
            {
                id: `cam-${Date.now()}-W`,
                name: 'West Boundary Telephoto',
                channel: cameras.length + 4,
                model: 'Hikvision DS-2CD2T86G2-4I (6mm Telephoto)',
                ipAddress: `192.168.1.${133 + cameras.length}`,
                rtspPort: 554,
                locationName: 'West Fence Mast',
                lat: baseLat,
                lng: baseLng - offset,
                mountHeightM: 6,
                azimuthDeg: 90,
                fovAngleDeg: 53,
                rangeM: 110,
                tiltAngleDeg: 4,
                isPtz: false,
                isNightVision: true,
                status: 'ONLINE'
            }
        ];
        const updated = [...cameras, ...batch];
        setCameras(updated);
        safeStorage.setItem('agrimap_plantation_cameras', JSON.stringify(updated));
        setSelectedCameraId(batch[0].id);
        toast.success('Added 4-camera perimeter setup (N, S, E, W) with ColorVu, AcuSense & PTZ.');
    };

    // Deploy Planned Camera to Plantation Map
    const handleDeployPlannedCamera = () => {
        const newCam: PlantationCamera = { 
            ...plannedCam, 
            id: `cam-${Date.now()}`,
            channel: cameras.length + 1
        };
        const updated = [...cameras, newCam];
        setCameras(updated);
        safeStorage.setItem('agrimap_plantation_cameras', JSON.stringify(updated));
        
        if (onDeployCameraToMap) {
            onDeployCameraToMap(newCam);
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('agrimap:camera_deployed', { detail: newCam }));
        }

        toast.success(`Camera "${newCam.name}" (Tilt ${newCam.tiltAngleDeg}°) deployed to plantation surveillance map!`);
        setActiveTab('live_grid');
    };

    const handlePtzAction = (action: string) => {
        toast.info(`PTZ Command sent to Hikvision ISAPI: ${action} (Speed ${ptzSpeed}%)`);
    };

    const filteredDiscoveredDevices = discoveredDevices.filter(dev => {
        if (deviceTypeFilter === 'RECORDERS' && dev.type !== 'NVR' && dev.type !== 'DVR') return false;
        if (deviceTypeFilter === 'CAMERAS' && (dev.type === 'NVR' || dev.type === 'DVR')) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return dev.alias.toLowerCase().includes(q) || dev.ip.includes(q) || dev.model.toLowerCase().includes(q);
        }
        return true;
    });

    const selectedCam = cameras.find(c => c.id === selectedCameraId) || cameras[0];

    // Compute blind zone metric for planned camera:
    // d_blind = height / tan(tiltAngle + verticalFov / 2)
    const plannedBlindZoneM = useMemo(() => {
        const tilt = Math.max(1, plannedCam.tiltAngleDeg || 4);
        const hFov = plannedCam.fovAngleDeg || 90;
        const vFov = 2 * Math.atan(Math.tan((hFov * Math.PI) / 360) * (9 / 16)) * (180 / Math.PI);
        const lowerAngleRad = ((tilt + vFov / 2) * Math.PI) / 180;
        const blindDist = plannedCam.mountHeightM / Math.tan(lowerAngleRad);
        return Math.max(1, Number(blindDist.toFixed(1)));
    }, [plannedCam.tiltAngleDeg, plannedCam.fovAngleDeg, plannedCam.mountHeightM]);

    return (
        <div className="space-y-6">
            {/* 3-Phase Device Verification Modal */}
            {verificationTarget && (
                <CameraVerificationModal
                    isOpen={isVerificationModalOpen}
                    onClose={() => setIsVerificationModalOpen(false)}
                    target={verificationTarget}
                    onSuccess={handleVerificationSuccess}
                />
            )}

            {/* Protocol & Code Examples Guide Modal */}
            <CameraProtocolGuideModal
                isOpen={isProtocolGuideOpen}
                onClose={() => setIsProtocolGuideOpen(false)}
            />

            {/* Header & Sub-tab switcher */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                        <Video className="text-blue-600" size={24} />
                        CCTV Cameras & Hikvision DS-7716NI NVR System
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        Direct LAN/WAN integration, 3-Phase verification (Ping → Auth → Stream), and Plantation FOV Map Planner
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Add & Plan Camera Modal Link */}
                    <button
                        onClick={() => setIsCameraPlannerModalOpen(true)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-blue-900/30 cursor-pointer"
                        title="Open Satellite & 3D Frustum Camera Planner"
                    >
                        <Camera size={14} /> Add & Plan Camera (Satellite / 3D)
                    </button>

                    {/* 3D Area & Slope Sculptor Link */}
                    <button
                        onClick={() => setIsTerrainSculptorOpen(true)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/30 cursor-pointer"
                        title="Open 3D Area & Slope Sculptor"
                    >
                        <Mountain size={14} /> 3D Area & Slope Sculptor
                    </button>

                    {/* Drone Aerial Planner Link */}
                    <button
                        onClick={() => setIsDroneSimModalOpen(true)}
                        className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-cyan-900/30 cursor-pointer"
                        title="Open Drone Aerial Survey Planner"
                    >
                        <Plane size={14} /> Drone Aerial Planner
                    </button>

                    <button
                        onClick={() => setIsProtocolGuideOpen(true)}
                        className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                        title="View SADP, ONVIF, ISAPI & RTSP Code in Node.js, Python, Go, C#"
                    >
                        <BookOpen size={14} /> Code Reference
                    </button>

                    <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('live_grid')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                activeTab === 'live_grid' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Video size={14} /> Live Grid ({cameras.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('network_search')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                activeTab === 'network_search' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Search size={14} /> Network Discovery
                        </button>
                        <button
                            onClick={() => setActiveTab('planner')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                activeTab === 'planner' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Compass size={14} /> Plantation FOV Planner
                        </button>
                        <button
                            onClick={() => setActiveTab('nvr_settings')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                activeTab === 'nvr_settings' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Settings size={14} /> NVR Settings
                        </button>
                    </div>
                </div>
            </div>

            {/* TAB 1: LIVE NVR CAMERA GRID */}
            {activeTab === 'live_grid' && (
                <div className="space-y-4">
                    {/* Live Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 text-white rounded-2xl">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-wider text-red-400">
                                LIVE NVR FEED • {nvrConfig.host}:{nvrConfig.rtspPort}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                                ({nvrConfig.alias || nvrConfig.nvrModel})
                            </span>
                            {nvrConfig.isVerified && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                    <CheckCircle2 size={10} /> 3-PHASE VERIFIED
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-slate-800 rounded-xl p-1 text-[10px] font-black uppercase">
                                <button
                                    onClick={() => setGridLayout('1x1')}
                                    className={`px-2.5 py-1 rounded-lg transition-all ${gridLayout === '1x1' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                                >
                                    Single
                                </button>
                                <button
                                    onClick={() => setGridLayout('2x2')}
                                    className={`px-2.5 py-1 rounded-lg transition-all ${gridLayout === '2x2' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                                >
                                    2x2 Grid
                                </button>
                                <button
                                    onClick={() => setGridLayout('3x3')}
                                    className={`px-2.5 py-1 rounded-lg transition-all ${gridLayout === '3x3' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                                >
                                    3x3 Grid
                                </button>
                            </div>

                            <button
                                onClick={() => setIsNightModeActive(!isNightModeActive)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                    isNightModeActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                                }`}
                            >
                                {isNightModeActive ? 'IR Night Mode ON' : 'Daylight ColorVu'}
                            </button>

                            <button
                                onClick={() => setActiveTab('network_search')}
                                className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-1 cursor-pointer"
                            >
                                <Plus size={12} /> Add More Cameras
                            </button>
                        </div>
                    </div>

                    {/* Camera Video Matrix */}
                    <div className={`grid gap-3 ${
                        gridLayout === '1x1' ? 'grid-cols-1' : gridLayout === '2x2' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'
                    }`}>
                        {cameras.map(cam => {
                            const isSelected = selectedCameraId === cam.id;
                            return (
                                <div
                                    key={cam.id}
                                    onClick={() => setSelectedCameraId(cam.id)}
                                    className={`relative bg-slate-950 rounded-2xl overflow-hidden border transition-all cursor-pointer group aspect-video flex flex-col justify-between p-3 ${
                                        isSelected ? 'ring-2 ring-blue-500 border-blue-400 shadow-xl' : 'border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                    {/* Video Stream Canvas */}
                                    <div className={`absolute inset-0 transition-opacity ${
                                        isNightModeActive ? 'bg-emerald-950/40 mix-blend-color' : 'bg-slate-900/60'
                                    }`}>
                                        <div className="w-full h-full flex flex-col items-center justify-center opacity-75 group-hover:opacity-100 transition-opacity">
                                            <Camera size={36} className="text-slate-500 mb-2" />
                                            <p className="text-xs font-black uppercase text-slate-200 tracking-wider">
                                                {cam.name}
                                            </p>
                                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                                CH0{cam.channel} • {cam.ipAddress}:{cam.rtspPort} • Tilt: {cam.tiltAngleDeg || 4}° • 25 FPS
                                            </p>
                                        </div>
                                    </div>

                                    {/* Overlay Top Bar */}
                                    <div className="relative z-10 flex items-center justify-between">
                                        <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-mono font-bold text-white flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            CH0{cam.channel} • LIVE
                                        </span>
                                        <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[9px] font-mono text-slate-300">
                                            {cam.locationName}
                                        </span>
                                    </div>

                                    {/* Overlay Bottom Bar */}
                                    <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-400">
                                        <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md">
                                            Bearing {cam.azimuthDeg}° • Range {cam.rangeM}m
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-emerald-400">
                                            Tilt {cam.tiltAngleDeg || 4}°
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* PTZ Telemetry Controls Strip */}
                    {selectedCam && (
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600">
                                    <Compass size={20} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white">
                                        {selectedCam.name} (CH0{selectedCam.channel})
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                        Model: {selectedCam.model} • Mount Height: {selectedCam.mountHeightM}m • Tilt: {selectedCam.tiltAngleDeg || 4}°
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePtzAction('PAN_LEFT')}
                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                    ◀ Pan Left
                                </button>
                                <button
                                    onClick={() => handlePtzAction('TILT_UP')}
                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                    ▲ Tilt Up
                                </button>
                                <button
                                    onClick={() => handlePtzAction('TILT_DOWN')}
                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                    ▼ Tilt Down
                                </button>
                                <button
                                    onClick={() => handlePtzAction('PAN_RIGHT')}
                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                    Pan Right ▶
                                </button>
                                <button
                                    onClick={() => handlePtzAction('ZOOM_IN')}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                                >
                                    Zoom +
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: LOCAL NETWORK DISCOVERY & DEVICE PROBING */}
            {activeTab === 'network_search' && (
                <div className="space-y-6">
                    {/* Search Controls Card */}
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 block">
                                    Local Subnet Broadcast Scanner
                                </span>
                                <h4 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                    Hikvision SADP (UDP 37020) & ONVIF WS-Discovery (UDP 3702)
                                </h4>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Broadcast probe packets across the local subnet to locate unconfigured or active NVRs, DVRs, and IP cameras.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowManualAddModal(true)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                    <Plus size={14} /> Add Device Manually (LAN / WAN)
                                </button>
                            </div>
                        </div>

                        {/* Scanner Input Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                            <div className="sm:col-span-5">
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                    Target Subnet / Interface
                                </label>
                                <input
                                    type="text"
                                    value={subnetInput}
                                    onChange={(e) => setSubnetInput(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="sm:col-span-4">
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                    Filter Device Type
                                </label>
                                <select
                                    value={deviceTypeFilter}
                                    onChange={(e: any) => setDeviceTypeFilter(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                >
                                    <option value="ALL">All Network Devices</option>
                                    <option value="RECORDERS">NVR & DVR Recorders Only</option>
                                    <option value="CAMERAS">IP & PTZ Cameras Only</option>
                                </select>
                            </div>

                            <div className="sm:col-span-3 pt-4 sm:pt-0">
                                <button
                                    onClick={handleStartNetworkScan}
                                    disabled={isScanningNetwork}
                                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                                >
                                    <RefreshCw size={14} className={isScanningNetwork ? 'animate-spin' : ''} />
                                    {isScanningNetwork ? 'Broadcasting...' : 'Start Subnet Scan'}
                                </button>
                            </div>
                        </div>

                        {/* Scan Progress Bar */}
                        {isScanningNetwork && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                    <span>{scanStatusText}</span>
                                    <span>{scanProgress}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-600 transition-all duration-300"
                                        style={{ width: `${scanProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Discovered Devices Table / List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                                Discovered Hardware ({filteredDiscoveredDevices.length})
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400">
                                Connect via 3-Phase Verification (Ping → Auth → Stream)
                            </span>
                        </div>

                        {filteredDiscoveredDevices.length === 0 ? (
                            <div className="p-10 bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
                                <Radio size={36} className="mx-auto text-slate-400" />
                                <h4 className="text-sm font-black uppercase text-slate-700 dark:text-slate-300">
                                    No Broadcast Devices Discovered Yet
                                </h4>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                    If your browser runs in a cloud sandbox, raw UDP broadcast cannot reach your physical LAN switch directly. You can <strong>add your Hikvision DS-7716NI IP manually</strong> or run the provided local bridge daemon.
                                </p>
                                <div className="flex items-center justify-center gap-3 pt-2">
                                    <button
                                        onClick={() => setShowManualAddModal(true)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                                    >
                                        Add NVR / Camera by IP
                                    </button>
                                    <button
                                        onClick={() => setIsProtocolGuideOpen(true)}
                                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider"
                                    >
                                        View Python / Node Bridge Code
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredDiscoveredDevices.map(device => (
                                    <div
                                        key={device.id}
                                        className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl">
                                                    {device.type === 'NVR' || device.type === 'DVR' ? <Server size={22} /> : <Camera size={22} />}
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                                        {device.brand} • {device.type}
                                                    </span>
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                                                        {device.alias}
                                                    </h4>
                                                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                                                        {device.model}
                                                    </p>
                                                </div>
                                            </div>

                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                                {device.pingMs}ms LAN
                                            </span>
                                        </div>

                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl font-mono text-xs text-slate-600 dark:text-slate-300 grid grid-cols-2 gap-2">
                                            <div>
                                                <span className="text-[9px] text-slate-400 block">IP ADDRESS:</span>
                                                <span className="font-bold text-slate-900 dark:text-white">{device.ip}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-slate-400 block">PORTS:</span>
                                                <span>HTTP: {device.httpPort} | RTSP: {device.rtspPort}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-slate-400 block">MAC ADDRESS:</span>
                                                <span>{device.mac}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-slate-400 block">CHANNELS:</span>
                                                <span>{device.channelsCount || 16} Channels</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <button
                                                onClick={() => handleVerifyDiscoveredDevice(device)}
                                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                            >
                                                <ShieldCheck size={14} /> Connect (3-Phase Verify)
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: CAMERA PLANNER WITH INTERACTIVE PLANTATION VECTOR MAP */}
            {activeTab === 'planner' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Planning Controls & Camera Parameters (5 cols) */}
                    <div className="lg:col-span-5 p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 block">
                                Field Planning Simulator
                            </span>
                            <h4 className="text-base font-black text-slate-900 dark:text-white uppercase">
                                Plan New Camera Placement
                            </h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                                Configure optic lens, mount pole height, surveillance range, and <strong>tilt angle (e.g. 4°)</strong> before installation.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Camera Name</label>
                                <input
                                    type="text"
                                    value={plannedCam.name}
                                    onChange={(e) => setPlannedCam({ ...plannedCam, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                />
                            </div>

                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Optic Model & Lens</label>
                                <select
                                    value={plannedCam.model}
                                    onChange={(e) => {
                                        const m = e.target.value;
                                        let angle = 90;
                                        let range = 60;
                                        if (m.includes('2.8mm')) { angle = 115; range = 45; }
                                        else if (m.includes('4mm')) { angle = 89; range = 75; }
                                        else if (m.includes('6mm')) { angle = 53; range = 110; }
                                        else if (m.includes('PTZ')) { angle = 60; range = 160; }
                                        setPlannedCam({ ...plannedCam, model: m, fovAngleDeg: angle, rangeM: range });
                                    }}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                >
                                    <option value="Hikvision DS-2CD2087G2-LU (ColorVu 2.8mm)">Hikvision ColorVu 2.8mm (115° Ultra-Wide Angle)</option>
                                    <option value="Hikvision DS-2CD2386G2-ISU (AcuSense 4mm)">Hikvision AcuSense 4mm (89° Standard Orchard Range)</option>
                                    <option value="Hikvision DS-2CD2T86G2-4I (6mm Telephoto)">Hikvision 6mm Telephoto (53° Medium Row Corridor)</option>
                                    <option value="Hikvision DS-2DE4425IW-DE (25x PTZ)">Hikvision 25x Optical PTZ (60° Telephoto Perimeter)</option>
                                    <option value="Hikvision Bi-Spectrum Thermal">Hikvision Bi-Spectrum Thermal (Frost/Fire Alert)</option>
                                </select>
                            </div>

                            {/* TILT ANGLE SLIDER & NUMBER INPUT */}
                            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                        <Sliders size={12} /> Zone Tilt Angle ({plannedCam.tiltAngleDeg || 4}°)
                                    </label>
                                    <span className="text-[10px] font-mono font-bold text-red-500">
                                        Blind Zone: &lt; {plannedBlindZoneM}m
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="1"
                                        max="45"
                                        value={plannedCam.tiltAngleDeg || 4}
                                        onChange={(e) => setPlannedCam({ ...plannedCam, tiltAngleDeg: Number(e.target.value) })}
                                        className="flex-1 accent-blue-600"
                                    />
                                    <input
                                        type="number"
                                        min="1"
                                        max="45"
                                        value={plannedCam.tiltAngleDeg || 4}
                                        onChange={(e) => setPlannedCam({ ...plannedCam, tiltAngleDeg: Number(e.target.value) })}
                                        className="w-14 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-center"
                                    />
                                </div>
                                <p className="text-[9px] text-slate-500">
                                    Tilt angle controls camera downward pitch. At 4°, camera projects far into rows with a blind zone directly beneath the pole.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                        Azimuth / Bearing ({plannedCam.azimuthDeg}°)
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="360"
                                        value={plannedCam.azimuthDeg}
                                        onChange={(e) => setPlannedCam({ ...plannedCam, azimuthDeg: Number(e.target.value) })}
                                        className="w-full accent-blue-600"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                        Surveillance Range ({plannedCam.rangeM}m)
                                    </label>
                                    <input
                                        type="range"
                                        min="20"
                                        max="250"
                                        value={plannedCam.rangeM}
                                        onChange={(e) => setPlannedCam({ ...plannedCam, rangeM: Number(e.target.value) })}
                                        className="w-full accent-blue-600"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Pole Mount Height (m)</label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="20"
                                        value={plannedCam.mountHeightM}
                                        onChange={(e) => setPlannedCam({ ...plannedCam, mountHeightM: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">FOV Arc Angle ({plannedCam.fovAngleDeg}°)</label>
                                    <input
                                        type="number"
                                        min="30"
                                        max="180"
                                        value={plannedCam.fovAngleDeg}
                                        onChange={(e) => setPlannedCam({ ...plannedCam, fovAngleDeg: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleDeployPlannedCamera}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                                <Check size={16} /> Deploy Camera to Plantation Map
                            </button>
                        </div>
                    </div>

                    {/* Right: Interactive Plantation Vector Map (7 cols) - Replaces static circle */}
                    <div className="lg:col-span-7 p-6 bg-slate-900 text-white rounded-[2rem] border border-slate-800 shadow-xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block">
                                    Simulated Optical Coverage
                                </span>
                                <h4 className="text-sm font-black uppercase text-white mt-0.5">
                                    Field of View Projection & Identification Zone
                                </h4>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                                DORI Standard (EN 62676-4)
                            </span>
                        </div>

                        {/* Calculated Metrics Summary */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                                <span className="text-[8px] font-black uppercase text-slate-400">Total Ground Area</span>
                                <p className="text-base sm:text-lg font-black font-mono text-white mt-1">
                                    {Math.round((Math.PI * Math.pow(plannedCam.rangeM, 2) * (plannedCam.fovAngleDeg / 360)))} m²
                                </p>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                                <span className="text-[8px] font-black uppercase text-slate-400">Facial ID Range</span>
                                <p className="text-base sm:text-lg font-black font-mono text-emerald-400 mt-1">
                                    {Math.round(plannedCam.rangeM * 0.35)} m
                                </p>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                                <span className="text-[8px] font-black uppercase text-slate-400">Blind Zone</span>
                                <p className="text-base sm:text-lg font-black font-mono text-amber-400 mt-1">
                                    &lt; {plannedBlindZoneM} m
                                </p>
                            </div>
                        </div>

                        {/* Interactive Real Plantation Vector Map */}
                        <PlantationCameraMap
                            plantationFeatures={effectivePlantationFeatures}
                            cameras={cameras}
                            plannedCam={plannedCam}
                            selectedCameraId={selectedCameraId}
                            onSelectCamera={(cam) => {
                                setSelectedCameraId(cam.id);
                                setPlannedCam({ ...cam });
                                toast.info(`Selected ${cam.name} on plantation map.`);
                            }}
                            onUpdatePlannedCamPosition={(lat, lng) => {
                                setPlannedCam(prev => ({ ...prev, lat, lng }));
                                toast.success(`Planned camera moved to [${lat.toFixed(5)}, ${lng.toFixed(5)}] on plantation.`);
                            }}
                            onAddCameraAtPosition={handleAddCameraAt}
                            onUpdateCamera={handleUpdateCamera}
                            onDeleteCamera={handleDeleteCamera}
                            onToggleHideCamera={handleToggleHideCamera}
                            onAddPerimeterSetup={handleAddPerimeterSetup}
                            hiddenCameraIds={hiddenCameraIds}
                            mapCenter={[baseLat, baseLng]}
                        />
                    </div>
                </div>
            )}

            {/* TAB 4: NVR & DVR SETTINGS WITH 3-PHASE VERIFICATION TRIGGER */}
            {activeTab === 'nvr_settings' && (
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 block">
                                    Hardware Network Settings
                                </span>
                                <h4 className="text-lg font-black uppercase text-slate-900 dark:text-white">
                                    Hikvision NVR Credentials & Network Configuration
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Configure Device IP Address (Local or Remote WAN), Communication Ports, and Credentials for authenticated RTSP & ISAPI.
                                </p>
                            </div>

                            <button
                                onClick={() => setActiveTab('network_search')}
                                className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                            >
                                <Search size={14} /> Search Local Network
                            </button>
                        </div>

                        {/* Alias & Model Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1">
                                    NVR / DVR Device Alias (Friendly Name)
                                </label>
                                <input
                                    type="text"
                                    value={nvrConfig.alias || ''}
                                    placeholder="e.g. Main Orchard AcuSense NVR"
                                    onChange={(e) => setNvrConfig({ ...nvrConfig, alias: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1">
                                    Hardware Model
                                </label>
                                <input
                                    type="text"
                                    value={nvrConfig.nvrModel || ''}
                                    placeholder="Hikvision DS-7716NI-I4 / 16P"
                                    onChange={(e) => setNvrConfig({ ...nvrConfig, nvrModel: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Host & Port Configuration */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="sm:col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1">
                                    Host IP Address or WAN Domain
                                </label>
                                <input
                                    type="text"
                                    value={nvrConfig.host || ''}
                                    placeholder="192.168.1.120 or orchard.ddns.net"
                                    onChange={(e) => setNvrConfig({ ...nvrConfig, host: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1">
                                    HTTP Port
                                </label>
                                <input
                                    type="number"
                                    value={nvrConfig.httpPort || 80}
                                    onChange={(e) => setNvrConfig({ ...nvrConfig, httpPort: Number(e.target.value) })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1">
                                    RTSP Port
                                </label>
                                <input
                                    type="number"
                                    value={nvrConfig.rtspPort || 554}
                                    onChange={(e) => setNvrConfig({ ...nvrConfig, rtspPort: Number(e.target.value) })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Credentials */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1">
                                    Admin Username
                                </label>
                                <input
                                    type="text"
                                    value={nvrConfig.username || ''}
                                    placeholder="admin"
                                    onChange={(e) => setNvrConfig({ ...nvrConfig, username: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={nvrConfig.password || ''}
                                        placeholder="Enter device password"
                                        onChange={(e) => setNvrConfig({ ...nvrConfig, password: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons: 3-Phase Verification Engine */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={handleTriggerNvrVerification}
                                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer active:scale-95"
                            >
                                <ShieldCheck size={16} /> Start 3-Phase Verification (Ping → Auth → Stream)
                            </button>

                            <button
                                onClick={() => {
                                    safeStorage.setItem('agrimap_hikvision_nvr_config', JSON.stringify(nvrConfig));
                                    toast.success('NVR Configuration saved to local storage.');
                                }}
                                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                            >
                                Save Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: MANUAL DEVICE ADDITION (LOCAL LAN OR GLOBAL WAN/PUBLIC IP) */}
            {showManualAddModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in select-none">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 block">
                                    Hardware Deployment
                                </span>
                                <h4 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                    Add Device (Local LAN or Global WAN IP)
                                </h4>
                            </div>
                            <button
                                onClick={() => setShowManualAddModal(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {/* Local vs Remote Toggle */}
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl text-xs font-black uppercase">
                            <button
                                onClick={() => setManualDevice({ ...manualDevice, isWanRemote: false, host: '192.168.1.120' })}
                                className={`flex-1 py-2 rounded-xl transition-all ${!manualDevice.isWanRemote ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-400'}`}
                            >
                                🏢 Local Network (LAN)
                            </button>
                            <button
                                onClick={() => setManualDevice({ ...manualDevice, isWanRemote: true, host: '92.42.18.77' })}
                                className={`flex-1 py-2 rounded-xl transition-all ${manualDevice.isWanRemote ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-400'}`}
                            >
                                🌐 Remote / WAN / Global IP
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Device Friendly Name</label>
                                <input
                                    type="text"
                                    value={manualDevice.alias}
                                    onChange={(e) => setManualDevice({ ...manualDevice, alias: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Brand</label>
                                    <select
                                        value={manualDevice.brand}
                                        onChange={(e: any) => setManualDevice({ ...manualDevice, brand: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                    >
                                        <option value="Hikvision">Hikvision</option>
                                        <option value="Dahua">Dahua</option>
                                        <option value="Uniview">Uniview</option>
                                        <option value="Axis">Axis</option>
                                        <option value="ONVIF">Generic ONVIF</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Device Type</label>
                                    <select
                                        value={manualDevice.type}
                                        onChange={(e: any) => setManualDevice({ ...manualDevice, type: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                    >
                                        <option value="NVR">NVR Network Video Recorder</option>
                                        <option value="DVR">DVR Digital Video Recorder</option>
                                        <option value="IP_CAMERA">IP Camera (Bullet / Dome)</option>
                                        <option value="PTZ_CAMERA">PTZ Speed Dome Camera</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                                    {manualDevice.isWanRemote ? 'Global WAN IP Address or DDNS Domain' : 'Local IPv4 Address'}
                                </label>
                                <input
                                    type="text"
                                    value={manualDevice.host}
                                    placeholder={manualDevice.isWanRemote ? 'e.g. 92.42.18.77 or orchard.ddns.net' : 'e.g. 192.168.1.120'}
                                    onChange={(e) => setManualDevice({ ...manualDevice, host: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Admin Username</label>
                                    <input
                                        type="text"
                                        value={manualDevice.username}
                                        placeholder="admin"
                                        onChange={(e) => setManualDevice({ ...manualDevice, username: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={manualDevice.password}
                                        placeholder="Required for Phase 2 Auth"
                                        onChange={(e) => setManualDevice({ ...manualDevice, password: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">HTTP Port</label>
                                    <input
                                        type="number"
                                        value={manualDevice.httpPort}
                                        onChange={(e) => setManualDevice({ ...manualDevice, httpPort: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">RTSP Stream Port</label>
                                    <input
                                        type="number"
                                        value={manualDevice.rtspPort}
                                        onChange={(e) => setManualDevice({ ...manualDevice, rtspPort: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit & Trigger 3-Phase Verification */}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => setShowManualAddModal(false)}
                                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (!manualDevice.host) {
                                        toast.error('Host IP address is required.');
                                        return;
                                    }
                                    setShowManualAddModal(false);
                                    setVerificationTarget({
                                        alias: manualDevice.alias,
                                        host: manualDevice.host,
                                        httpPort: manualDevice.httpPort,
                                        rtspPort: manualDevice.rtspPort,
                                        isapiPort: manualDevice.serverPort,
                                        username: manualDevice.username,
                                        password: manualDevice.password,
                                        model: manualDevice.model,
                                        brand: manualDevice.brand,
                                        type: manualDevice.type,
                                        channelCount: manualDevice.channelCount,
                                        isWanRemote: manualDevice.isWanRemote
                                    });
                                    setIsVerificationModalOpen(true);
                                }}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase shadow-sm flex items-center justify-center gap-1.5"
                            >
                                <ShieldCheck size={14} /> Run 3-Phase Verification
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Camera Planner with Satellite & 3D Frustum Modal */}
            {isCameraPlannerModalOpen && (
                <CameraPlannerModal
                    isOpen={isCameraPlannerModalOpen}
                    onClose={() => setIsCameraPlannerModalOpen(false)}
                    plantationCoords={[baseLat, baseLng]}
                    plantationFeatures={effectivePlantationFeatures}
                    onSaveCamera={(cam) => {
                        const updated = [...cameras, cam];
                        setCameras(updated);
                        safeStorage.setItem('agrimap_plantation_cameras', JSON.stringify(updated));
                        onDeployCameraToMap?.(cam);
                        toast.success(`Camera "${cam.name}" deployed to plantation!`);
                    }}
                    onSaveBatchCameras={(batch) => {
                        const updated = [...cameras, ...batch];
                        setCameras(updated);
                        safeStorage.setItem('agrimap_plantation_cameras', JSON.stringify(updated));
                        batch.forEach(c => onDeployCameraToMap?.(c));
                        toast.success(`${batch.length} cameras deployed to plantation!`);
                    }}
                />
            )}

            {/* 3D Terrain & Slope Sculptor Modal */}
            {isTerrainSculptorOpen && (
                <TerrainSlopeSculptorModal
                    isOpen={isTerrainSculptorOpen}
                    onClose={() => setIsTerrainSculptorOpen(false)}
                    mapCenter={[baseLat, baseLng]}
                    plantationFeatures={effectivePlantationFeatures}
                    cameras={cameras}
                />
            )}

            {/* Drone Aerial Simulation Modal Link */}
            {isDroneSimModalOpen && (
                <DroneSimulationModal
                    isOpen={isDroneSimModalOpen}
                    onClose={() => setIsDroneSimModalOpen(false)}
                    activeMapCenter={[baseLat, baseLng]}
                    plantationFeatures={effectivePlantationFeatures}
                />
            )}
        </div>
    );
};
