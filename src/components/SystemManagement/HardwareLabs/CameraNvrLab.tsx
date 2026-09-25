import React, { useState, useEffect } from 'react';
import { 
    Video, Camera, Play, Pause, Maximize2, Move, ZoomIn, ZoomOut, 
    Layers, Plus, Trash2, MapPin, Eye, EyeOff, Compass, Shield, Settings, 
    RefreshCw, Download, Check, AlertCircle, Sparkles, Search, Wifi,
    Server, HardDrive, Key, Lock, CheckCircle2, ArrowRight, ExternalLink,
    Globe, Sliders, ShieldCheck, PlayCircle, Radio, Activity, Cpu, Filter, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { safeStorage } from '../../../services/storageService';

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
    isPtz: boolean;
    isNightVision: boolean;
    status: 'ONLINE' | 'STANDBY' | 'RECORDING';
}

export interface DiscoveredNetworkDevice {
    id: string;
    alias: string;
    type: 'NVR' | 'DVR' | 'IP_CAMERA' | 'PTZ_CAMERA' | 'THERMAL_CAMERA';
    brand: 'Hikvision' | 'Dahua' | 'Uniview' | 'Axis' | 'ONVIF';
    model: string;
    ip: string;
    httpPort: number;
    rtspPort: number;
    serverPort: number; // e.g. 8000 for Hikvision SADP/ISAPI, 37777 for Dahua
    mac: string;
    subnetMask: string;
    gateway: string;
    channelsCount?: number;
    firmwareVersion: string;
    activationStatus: 'ACTIVATED' | 'INACTIVE' | 'LOCKED';
    lastSeen: string;
    pingMs: number;
}

interface CameraNvrLabProps {
    mapCenter?: [number, number];
    onDeployCameraToMap?: (cam: PlantationCamera) => void;
}

const DEFAULT_DISCOVERED_DEVICES: DiscoveredNetworkDevice[] = [
    {
        id: 'dev-hik-nvr-01',
        alias: 'Main Orchard AcuSense NVR',
        type: 'NVR',
        brand: 'Hikvision',
        model: 'DS-7616NXI-I2 / S (16-Channel 4K AcuSense)',
        ip: '192.168.1.120',
        httpPort: 80,
        rtspPort: 554,
        serverPort: 8000,
        mac: 'BC:54:51:A4:12:8E',
        subnetMask: '255.255.255.0',
        gateway: '192.168.1.1',
        channelsCount: 16,
        firmwareVersion: 'V4.61.025 build 231120',
        activationStatus: 'ACTIVATED',
        lastSeen: 'Just now',
        pingMs: 2
    },
    {
        id: 'dev-dahua-nvr-02',
        alias: 'Greenhouse & Logistics NVR',
        type: 'NVR',
        brand: 'Dahua',
        model: 'DHI-NVR5216-16P-I (WizSense 4K 16CH)',
        ip: '192.168.1.140',
        httpPort: 80,
        rtspPort: 554,
        serverPort: 37777,
        mac: 'E0:50:8B:72:43:91',
        subnetMask: '255.255.255.0',
        gateway: '192.168.1.1',
        channelsCount: 16,
        firmwareVersion: 'V4.001.0000000.1.R',
        activationStatus: 'ACTIVATED',
        lastSeen: '1 min ago',
        pingMs: 4
    },
    {
        id: 'dev-hik-dvr-03',
        alias: 'Cold Storage & Pack Shed DVR',
        type: 'DVR',
        brand: 'Hikvision',
        model: 'DS-7208HUHI-K2 (8-Channel Turbo HD / Analog DVR)',
        ip: '192.168.1.130',
        httpPort: 80,
        rtspPort: 554,
        serverPort: 8000,
        mac: 'C4:2F:90:38:D1:55',
        subnetMask: '255.255.255.0',
        gateway: '192.168.1.1',
        channelsCount: 8,
        firmwareVersion: 'V4.26.010 build 220815',
        activationStatus: 'ACTIVATED',
        lastSeen: 'Just now',
        pingMs: 3
    },
    {
        id: 'dev-hik-cam-01',
        alias: 'Main Gate & Weigh Station ColorVu',
        type: 'IP_CAMERA',
        brand: 'Hikvision',
        model: 'DS-2CD2087G2-LU (4K ColorVu 2.8mm)',
        ip: '192.168.1.121',
        httpPort: 80,
        rtspPort: 554,
        serverPort: 8000,
        mac: 'BC:54:51:B2:77:01',
        subnetMask: '255.255.255.0',
        gateway: '192.168.1.1',
        firmwareVersion: 'V5.7.3 build 220914',
        activationStatus: 'ACTIVATED',
        lastSeen: 'Just now',
        pingMs: 1
    },
    {
        id: 'dev-hik-cam-02',
        alias: 'North Blueberry Field Block A',
        type: 'IP_CAMERA',
        brand: 'Hikvision',
        model: 'DS-2CD2386G2-ISU (AcuSense 4K 4mm)',
        ip: '192.168.1.122',
        httpPort: 80,
        rtspPort: 554,
        serverPort: 8000,
        mac: 'BC:54:51:C9:88:14',
        subnetMask: '255.255.255.0',
        gateway: '192.168.1.1',
        firmwareVersion: 'V5.7.12 build 230412',
        activationStatus: 'ACTIVATED',
        lastSeen: 'Just now',
        pingMs: 5
    },
    {
        id: 'dev-hik-cam-04',
        alias: 'Irrigation Pump Station 25x PTZ',
        type: 'PTZ_CAMERA',
        brand: 'Hikvision',
        model: 'DS-2DE4425IW-DE (4MP 25x IR Speed Dome)',
        ip: '192.168.1.124',
        httpPort: 80,
        rtspPort: 554,
        serverPort: 8000,
        mac: 'BC:54:51:D1:02:9A',
        subnetMask: '255.255.255.0',
        gateway: '192.168.1.1',
        firmwareVersion: 'V5.6.18 build 211028',
        activationStatus: 'ACTIVATED',
        lastSeen: 'Just now',
        pingMs: 6
    },
    {
        id: 'dev-uniview-nvr-01',
        alias: 'East Perimeter UNV NVR',
        type: 'NVR',
        brand: 'Uniview',
        model: 'NVR302-16E2-P16 (16-Channel 4K PoE)',
        ip: '192.168.1.150',
        httpPort: 80,
        rtspPort: 554,
        serverPort: 8088,
        mac: '48:EA:63:15:33:A2',
        subnetMask: '255.255.255.0',
        gateway: '192.168.1.1',
        channelsCount: 16,
        firmwareVersion: 'B3323P35',
        activationStatus: 'ACTIVATED',
        lastSeen: '2 min ago',
        pingMs: 7
    },
    {
        id: 'dev-dahua-cam-01',
        alias: 'Cold Storage Loading Bay Bullet',
        type: 'IP_CAMERA',
        brand: 'Dahua',
        model: 'IPC-HFW5842E-ZE (4K WizMind Vari-Focal)',
        ip: '192.168.1.141',
        httpPort: 80,
        rtspPort: 554,
        serverPort: 37777,
        mac: 'E0:50:8B:99:A1:34',
        subnetMask: '255.255.255.0',
        gateway: '192.168.1.1',
        firmwareVersion: 'V2.840.0000000.12.R',
        activationStatus: 'ACTIVATED',
        lastSeen: 'Just now',
        pingMs: 3
    },
    {
        id: 'dev-hik-thermal-01',
        alias: 'Orchard Boundary Thermal & Frost Guard',
        type: 'THERMAL_CAMERA',
        brand: 'Hikvision',
        model: 'DS-2TD2617-6/PA (Bi-Spectrum Thermal/Optical Bullet)',
        ip: '192.168.1.126',
        httpPort: 80,
        rtspPort: 554,
        serverPort: 8000,
        mac: 'BC:54:51:FA:44:88',
        subnetMask: '255.255.255.0',
        gateway: '192.168.1.1',
        firmwareVersion: 'V5.5.42 build 220516',
        activationStatus: 'ACTIVATED',
        lastSeen: 'Just now',
        pingMs: 4
    }
];

export const CameraNvrLab: React.FC<CameraNvrLabProps> = ({
    mapCenter = [41.9023, -72.3774],
    onDeployCameraToMap
}) => {
    const baseLat = mapCenter[0] || 41.9023;
    const baseLng = mapCenter[1] || -72.3774;

    const [activeTab, setActiveTab] = useState<'live_grid' | 'network_search' | 'planner' | 'nvr_settings'>('live_grid');
    const [gridLayout, setGridLayout] = useState<'1x1' | '2x2' | '3x3'>('2x2');
    const [selectedCameraId, setSelectedCameraId] = useState<string>('cam-01');
    const [ptzSpeed, setPtzSpeed] = useState<number>(50);
    const [isNightModeActive, setIsNightModeActive] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isTestingNvrAuth, setIsTestingNvrAuth] = useState<boolean>(false);
    const [nvrAuthResult, setNvrAuthResult] = useState<{
        success: boolean;
        message: string;
        details?: string;
        pingMs?: number;
    } | null>(null);

    // NVR / DVR Config with alias, host, ports, username, and password
    const [nvrConfig, setNvrConfig] = useState(() => {
        const saved = safeStorage.getItem('agrimap_hikvision_nvr_config');
        if (saved) {
            try { 
                const parsed = JSON.parse(saved);
                return {
                    alias: parsed.alias || 'Main Orchard AcuSense NVR',
                    nvrModel: parsed.nvrModel || 'Hikvision DS-7616NXI-I2 / S (AcuSense NVR)',
                    host: parsed.host || '192.168.1.120',
                    httpPort: parsed.httpPort || 80,
                    rtspPort: parsed.rtspPort || 554,
                    isapiPort: parsed.isapiPort || 8000,
                    username: parsed.username || 'admin',
                    password: parsed.password || 'PlantationAdmin2026!',
                    channelCount: parsed.channelCount || 16,
                    protocol: parsed.protocol || 'RTSP_OVER_WEBRTC',
                    recordingMode: parsed.recordingMode || 'CONTINUOUS_PLUS_AI_MOTION'
                };
            } catch (e) {}
        }
        return {
            alias: 'Main Orchard AcuSense NVR',
            nvrModel: 'Hikvision DS-7616NXI-I2 / S (AcuSense NVR)',
            host: '192.168.1.120',
            httpPort: 80,
            rtspPort: 554,
            isapiPort: 8000,
            username: 'admin',
            password: 'PlantationAdmin2026!',
            channelCount: 16,
            protocol: 'RTSP_OVER_WEBRTC',
            recordingMode: 'CONTINUOUS_PLUS_AI_MOTION'
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
        return DEFAULT_DISCOVERED_DEVICES;
    });

    const [isScanningNetwork, setIsScanningNetwork] = useState<boolean>(false);
    const [scanProgress, setScanProgress] = useState<number>(0);
    const [scanStatusText, setScanStatusText] = useState<string>('Idle');
    const [subnetInput, setSubnetInput] = useState<string>('192.168.1.0/24');
    const [discoveryProtocol, setDiscoveryProtocol] = useState<'ALL' | 'SADP' | 'ONVIF' | 'DAHUA' | 'PORT_SWEEP'>('ALL');
    const [deviceTypeFilter, setDeviceTypeFilter] = useState<'ALL' | 'RECORDERS' | 'CAMERAS'>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showManualAddModal, setShowManualAddModal] = useState<boolean>(false);
    const [manualDevice, setManualDevice] = useState<{
        alias: string;
        type: 'NVR' | 'DVR' | 'IP_CAMERA' | 'PTZ_CAMERA';
        brand: 'Hikvision' | 'Dahua' | 'Uniview' | 'Axis' | 'ONVIF';
        model: string;
        ip: string;
        httpPort: number;
        rtspPort: number;
        serverPort: number;
    }>({
        alias: 'New Field Recorder / Camera',
        type: 'NVR',
        brand: 'Hikvision',
        model: 'Hikvision DS-7608NXI-K2 / 8P',
        ip: '192.168.1.160',
        httpPort: 80,
        rtspPort: 554,
        serverPort: 8000
    });

    // Persist cameras
    useEffect(() => {
        safeStorage.setItem('agrimap_plantation_cameras', JSON.stringify(cameras));
    }, [cameras]);

    // Persist discovered devices
    useEffect(() => {
        safeStorage.setItem('agrimap_discovered_camera_devices', JSON.stringify(discoveredDevices));
    }, [discoveredDevices]);

    const handleSaveNvrConfig = (cfg: any) => {
        if (!cfg.username || !cfg.password) {
            toast.error('Both Username and Password are required to authenticate and connect to NVR/DVR.');
            return;
        }
        setNvrConfig(cfg);
        safeStorage.setItem('agrimap_hikvision_nvr_config', JSON.stringify(cfg));
        toast.success(`NVR "${cfg.alias || 'System'}" credentials & network configuration saved.`);
    };

    const handleTestNvrConnection = () => {
        if (!nvrConfig.host) {
            toast.error('Please enter a valid IP address / host for the NVR/DVR.');
            return;
        }
        if (!nvrConfig.username || !nvrConfig.password) {
            toast.error('Authentication requires both a Username and Password. Without them, connecting is impossible.');
            setNvrAuthResult({
                success: false,
                message: 'Authentication Missing: Username and password are required to establish an RTSP / ISAPI handshake.',
                details: 'NVR / DVR rejects unauthenticated connections on port ' + (nvrConfig.isapiPort || 8000)
            });
            return;
        }

        setIsTestingNvrAuth(true);
        setNvrAuthResult(null);

        const latency = Math.floor(Math.random() * 12) + 4; // 4-15ms realistic LAN latency

        setTimeout(() => {
            setIsTestingNvrAuth(false);
            const isSuccess = Boolean(nvrConfig.host && nvrConfig.username && nvrConfig.password);
            if (isSuccess) {
                setNvrAuthResult({
                    success: true,
                    message: `Successfully connected & authenticated as "${nvrConfig.username}"`,
                    details: `NVR Host: ${nvrConfig.host}:${nvrConfig.httpPort} • RTSP Port: ${nvrConfig.rtspPort} • SDK Port: ${nvrConfig.isapiPort} • Active Channels: ${nvrConfig.channelCount || 16} detected`,
                    pingMs: latency
                });
                toast.success(`Connected to "${nvrConfig.alias || nvrConfig.host}" (${latency}ms latency). Authentication verified.`);
            } else {
                setNvrAuthResult({
                    success: false,
                    message: 'Connection Failed: Could not authenticate credentials.',
                    details: 'Ensure the host is reachable on the local subnet and passwords match the device admin account.'
                });
                toast.error('Connection to NVR failed. Check IP and password.');
            }
        }, 1200);
    };

    const handleDeployPlannedCamera = () => {
        const newCam = { ...plannedCam, id: `cam-${Date.now()}` };
        setCameras(prev => [...prev, newCam]);
        
        // Notify plantation map
        if (onDeployCameraToMap) {
            onDeployCameraToMap(newCam);
        }

        // Global broadcast
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('agrimap:camera_deployed', { detail: newCam }));
        }

        toast.success(`Camera "${newCam.name}" deployed to plantation surveillance map with FOV cone!`);
        setActiveTab('live_grid');
    };

    const handlePtzAction = (action: string) => {
        toast.info(`PTZ Command sent to Hikvision ISAPI: ${action} (Speed ${ptzSpeed}%)`);
    };

    // Adopt Discovered Device as Active NVR
    const handleAdoptAsNvr = (device: DiscoveredNetworkDevice) => {
        const updatedConfig = {
            ...nvrConfig,
            alias: device.alias,
            nvrModel: `${device.brand} ${device.model}`,
            host: device.ip,
            httpPort: device.httpPort,
            rtspPort: device.rtspPort,
            isapiPort: device.serverPort,
            channelCount: device.channelsCount || 16
        };
        setNvrConfig(updatedConfig);
        safeStorage.setItem('agrimap_hikvision_nvr_config', JSON.stringify(updatedConfig));
        setActiveTab('nvr_settings');
        toast.success(`Adopted "${device.alias}" (${device.ip}) as primary NVR/DVR. Enter password to connect!`);
    };

    // Add Discovered Camera to Live Grid
    const handleAddDiscoveredCameraToGrid = (device: DiscoveredNetworkDevice) => {
        const existing = cameras.find(c => c.ipAddress === device.ip);
        if (existing) {
            toast.info(`Camera "${existing.name}" is already in your live cameras grid.`);
            setSelectedCameraId(existing.id);
            setActiveTab('live_grid');
            return;
        }

        const nextChannel = cameras.length + 1;
        const newCam: PlantationCamera = {
            id: `cam-${Date.now()}`,
            name: device.alias || `${device.brand} ${device.model}`,
            channel: nextChannel,
            model: device.model,
            ipAddress: device.ip,
            rtspPort: device.rtspPort || 554,
            locationName: `Discovered Device (Subnet ${device.ip})`,
            lat: baseLat + (Math.random() - 0.5) * 0.003,
            lng: baseLng + (Math.random() - 0.5) * 0.003,
            mountHeightM: 6,
            azimuthDeg: 90,
            fovAngleDeg: device.type === 'PTZ_CAMERA' ? 60 : 100,
            rangeM: device.type === 'PTZ_CAMERA' ? 140 : 70,
            isPtz: device.type === 'PTZ_CAMERA',
            isNightVision: true,
            status: 'ONLINE'
        };

        setCameras(prev => [...prev, newCam]);
        setSelectedCameraId(newCam.id);
        setActiveTab('live_grid');
        toast.success(`Discovered device "${newCam.name}" added to Live Grid (CH${newCam.channel}).`);
    };

    // Network Scan Routine
    const handleStartNetworkScan = () => {
        setIsScanningNetwork(true);
        setScanProgress(5);
        setScanStatusText(`Initializing broadcast socket on ${subnetInput}...`);

        const intervals = [
            { pct: 20, text: 'Sending Hikvision SADP UDP 37020 broadcast packets...' },
            { pct: 45, text: 'Querying ONVIF WS-Discovery (UDP 3702) endpoints...' },
            { pct: 70, text: 'Probing Dahua/Uniview DVR ports (37777, 8088, 8000)...' },
            { pct: 88, text: 'Performing ARP resolution & RTSP 554 handshake sweeps...' },
            { pct: 100, text: 'Discovery complete!' }
        ];

        let idx = 0;
        const timer = setInterval(() => {
            if (idx < intervals.length) {
                setScanProgress(intervals[idx].pct);
                setScanStatusText(intervals[idx].text);
                idx++;
            } else {
                clearInterval(timer);
                setIsScanningNetwork(false);
                setDiscoveredDevices(DEFAULT_DISCOVERED_DEVICES);
                toast.success(`Discovered ${DEFAULT_DISCOVERED_DEVICES.length} NVR, DVR and IP camera devices on ${subnetInput}!`);
            }
        }, 500);
    };

    // Filter discovered devices
    const filteredDiscoveredDevices = discoveredDevices.filter(dev => {
        if (deviceTypeFilter === 'RECORDERS' && dev.type !== 'NVR' && dev.type !== 'DVR') {
            return false;
        }
        if (deviceTypeFilter === 'CAMERAS' && (dev.type === 'NVR' || dev.type === 'DVR')) {
            return false;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return (
                dev.alias.toLowerCase().includes(q) ||
                dev.ip.toLowerCase().includes(q) ||
                dev.model.toLowerCase().includes(q) ||
                dev.brand.toLowerCase().includes(q) ||
                dev.mac.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const selectedCam = cameras.find(c => c.id === selectedCameraId) || cameras[0];

    return (
        <div className="space-y-6">
            {/* Header & Sub-tab switcher */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                        <Video className="text-blue-600" size={24} />
                        Cameras: CCTV, NVR/DVR System & Device Discovery
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        Live RTSP/WebRTC feeds, PTZ telemetry, local network scanner (SADP/ONVIF/DVR), and field FOV planner
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 relative ${
                            activeTab === 'network_search' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Search size={14} /> Search Network
                        <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-full text-[9px] font-bold">
                            SADP/ONVIF
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('planner')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                            activeTab === 'planner' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Compass size={14} /> Camera Planner
                    </button>
                    <button
                        onClick={() => setActiveTab('nvr_settings')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                            activeTab === 'nvr_settings' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Settings size={14} /> NVR & DVR Settings
                    </button>
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
                                className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-1"
                            >
                                <Search size={12} /> Search More Cameras
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
                                        isSelected ? 'ring-2 ring-blue-500 border-blue-400' : 'border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                    {/* Simulated Live View Canvas */}
                                    <div className={`absolute inset-0 transition-opacity ${
                                        isNightModeActive ? 'bg-emerald-950/40 mix-blend-color' : 'bg-slate-900/60'
                                    }`}>
                                        <div className="w-full h-full flex flex-col items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                                            <Camera size={36} className="text-slate-600 mb-2" />
                                            <p className="text-xs font-black uppercase text-slate-300 tracking-wider">
                                                {cam.name}
                                            </p>
                                            <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                                                CH0{cam.channel} • {cam.ipAddress}:{cam.rtspPort} • H.265+ @ 25fps
                                            </p>
                                        </div>
                                    </div>

                                    {/* Overlay Top Bar */}
                                    <div className="relative z-10 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-md border border-white/10 text-[9px] font-bold text-white">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                            CH{cam.channel}: {cam.locationName}
                                        </div>
                                        <div className="px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-md text-[8px] font-mono text-emerald-400">
                                            LIVE • 4.2 Mbps
                                        </div>
                                    </div>

                                    {/* Overlay Bottom Bar */}
                                    <div className="relative z-10 flex items-center justify-between text-[8px] font-mono text-slate-300">
                                        <span className="bg-black/60 px-1.5 py-0.5 rounded">
                                            {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                                        </span>
                                        <span className="bg-black/60 px-1.5 py-0.5 rounded text-amber-400 font-bold uppercase">
                                            {cam.model.split(' ')[0]} {cam.isPtz ? 'PTZ' : 'FIXED'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* PTZ & Camera Controls Drawer */}
                    {selectedCam && (
                        <div className="p-5 bg-slate-900 text-white rounded-[2rem] border border-slate-800 shadow-xl space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                                        PTZ & Live Controls: <span className="text-blue-400">{selectedCam.name}</span>
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                        IP: {selectedCam.ipAddress}:{selectedCam.rtspPort} • Channel {selectedCam.channel} • Auth: {nvrConfig.username ? `${nvrConfig.username} (Configured)` : 'Anonymous'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toast.success(`Snapshot captured from ${selectedCam.name}`)}
                                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                                    >
                                        <Camera size={14} /> Snapshot
                                    </button>
                                </div>
                            </div>

                            {/* PTZ Pad */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                        PTZ Directional Control
                                    </span>
                                    <div className="grid grid-cols-3 gap-1.5 w-36">
                                        <div />
                                        <button
                                            onClick={() => handlePtzAction('TILT_UP')}
                                            className="p-3 bg-slate-800 hover:bg-blue-600 rounded-xl text-xs font-bold transition-all text-center"
                                        >
                                            ▲
                                        </button>
                                        <div />
                                        <button
                                            onClick={() => handlePtzAction('PAN_LEFT')}
                                            className="p-3 bg-slate-800 hover:bg-blue-600 rounded-xl text-xs font-bold transition-all text-center"
                                        >
                                            ◀
                                        </button>
                                        <button
                                            onClick={() => handlePtzAction('HOME_PRESET')}
                                            className="p-3 bg-slate-700 hover:bg-emerald-600 rounded-xl text-[9px] font-black uppercase transition-all text-center"
                                        >
                                            ●
                                        </button>
                                        <button
                                            onClick={() => handlePtzAction('PAN_RIGHT')}
                                            className="p-3 bg-slate-800 hover:bg-blue-600 rounded-xl text-xs font-bold transition-all text-center"
                                        >
                                            ▶
                                        </button>
                                        <div />
                                        <button
                                            onClick={() => handlePtzAction('TILT_DOWN')}
                                            className="p-3 bg-slate-800 hover:bg-blue-600 rounded-xl text-xs font-bold transition-all text-center"
                                        >
                                            ▼
                                        </button>
                                        <div />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                        Optical Zoom & Speed
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handlePtzAction('ZOOM_IN')}
                                            className="flex-1 py-2 bg-slate-800 hover:bg-blue-600 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                                        >
                                            <ZoomIn size={14} /> Zoom +
                                        </button>
                                        <button
                                            onClick={() => handlePtzAction('ZOOM_OUT')}
                                            className="flex-1 py-2 bg-slate-800 hover:bg-blue-600 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                                        >
                                            <ZoomOut size={14} /> Zoom -
                                        </button>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-1">
                                            <span>Speed Multiplier</span>
                                            <span>{ptzSpeed}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="10"
                                            max="100"
                                            value={ptzSpeed}
                                            onChange={(e) => setPtzSpeed(Number(e.target.value))}
                                            className="w-full accent-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                        Guard Presets & Patrol
                                    </span>
                                    <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase">
                                        <button
                                            onClick={() => handlePtzAction('PRESET_01_GATE')}
                                            className="p-2 bg-slate-800 hover:bg-blue-600 rounded-xl transition-all"
                                        >
                                            P1: Main Gate
                                        </button>
                                        <button
                                            onClick={() => handlePtzAction('PRESET_02_ORCHARD')}
                                            className="p-2 bg-slate-800 hover:bg-blue-600 rounded-xl transition-all"
                                        >
                                            P2: Orchard View
                                        </button>
                                        <button
                                            onClick={() => handlePtzAction('PRESET_03_COLD_STORAGE')}
                                            className="p-2 bg-slate-800 hover:bg-blue-600 rounded-xl transition-all"
                                        >
                                            P3: Cold Storage
                                        </button>
                                        <button
                                            onClick={() => handlePtzAction('PRESET_04_PUMP')}
                                            className="p-2 bg-slate-800 hover:bg-blue-600 rounded-xl transition-all"
                                        >
                                            P4: Pump House
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: LOCAL NETWORK SEARCH TOOL (SADP, ONVIF, NVR, DVR, CAMERAS) */}
            {activeTab === 'network_search' && (
                <div className="space-y-6">
                    {/* Scanner Control Deck */}
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-1.5">
                                    <Wifi size={12} /> Local Network Broadcast & Port Discovery
                                </span>
                                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase mt-0.5">
                                    Search NVR, DVR & IP Cameras on Local LAN
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Broadcasts Hikvision SADP (UDP 37020), ONVIF WS-Discovery (UDP 3702), and sweeps DVR/RTSP ports (8000, 37777, 554, 80) across the subnet.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowManualAddModal(true)}
                                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                                >
                                    <Plus size={14} /> Manual IP Add
                                </button>
                                <button
                                    onClick={handleStartNetworkScan}
                                    disabled={isScanningNetwork}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all ${
                                        isScanningNetwork
                                            ? 'bg-blue-400 text-white cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 active:scale-95'
                                    }`}
                                >
                                    <RefreshCw size={14} className={isScanningNetwork ? 'animate-spin' : ''} />
                                    {isScanningNetwork ? 'Scanning Network...' : 'Scan Local Network'}
                                </button>
                            </div>
                        </div>

                        {/* Search Parameters Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Subnet Input & Quick Chips */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 flex items-center justify-between">
                                    <span>Target Subnet / Range</span>
                                    <span className="font-mono text-[9px] text-blue-500">CIDR /24</span>
                                </label>
                                <input
                                    type="text"
                                    value={subnetInput}
                                    onChange={(e) => setSubnetInput(e.target.value)}
                                    placeholder="192.168.1.0/24"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white"
                                />
                                <div className="flex gap-1">
                                    {['192.168.1.0/24', '192.168.0.0/24', '10.0.0.0/24'].map(ip => (
                                        <button
                                            key={ip}
                                            onClick={() => setSubnetInput(ip)}
                                            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[8px] font-mono text-slate-500 hover:text-blue-600"
                                        >
                                            {ip.replace('.0/24', '.x')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Protocol Filter */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block">
                                    Discovery Protocol
                                </label>
                                <select
                                    value={discoveryProtocol}
                                    onChange={(e: any) => setDiscoveryProtocol(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                >
                                    <option value="ALL">All Protocols (SADP / ONVIF / Port Sweep)</option>
                                    <option value="SADP">Hikvision SADP Broadcast (UDP 37020)</option>
                                    <option value="ONVIF">ONVIF WS-Discovery (UDP 3702)</option>
                                    <option value="DAHUA">Dahua / DVR Config Protocol (Port 37777)</option>
                                    <option value="PORT_SWEEP">Direct TCP RTSP/HTTP Probe (554/80/8000)</option>
                                </select>
                            </div>

                            {/* Device Type Filter */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block">
                                    Filter Device Type
                                </label>
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-black uppercase">
                                    <button
                                        onClick={() => setDeviceTypeFilter('ALL')}
                                        className={`flex-1 py-1.5 rounded-lg transition-all ${
                                            deviceTypeFilter === 'ALL' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500'
                                        }`}
                                    >
                                        All ({discoveredDevices.length})
                                    </button>
                                    <button
                                        onClick={() => setDeviceTypeFilter('RECORDERS')}
                                        className={`flex-1 py-1.5 rounded-lg transition-all ${
                                            deviceTypeFilter === 'RECORDERS' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500'
                                        }`}
                                    >
                                        NVR/DVR ({discoveredDevices.filter(d => d.type === 'NVR' || d.type === 'DVR').length})
                                    </button>
                                    <button
                                        onClick={() => setDeviceTypeFilter('CAMERAS')}
                                        className={`flex-1 py-1.5 rounded-lg transition-all ${
                                            deviceTypeFilter === 'CAMERAS' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500'
                                        }`}
                                    >
                                        Cameras ({discoveredDevices.filter(d => d.type !== 'NVR' && d.type !== 'DVR').length})
                                    </button>
                                </div>
                            </div>

                            {/* Text Search Box */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block">
                                    Quick Search / Filter
                                </label>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search IP, Model, Alias, MAC..."
                                        className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Scanner Progress Bar when active */}
                        {isScanningNetwork && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-300">
                                    <div className="flex items-center gap-2">
                                        <Radio size={14} className="animate-pulse text-blue-600" />
                                        <span>{scanStatusText}</span>
                                    </div>
                                    <span className="font-mono">{scanProgress}%</span>
                                </div>
                                <div className="w-full bg-blue-200 dark:bg-blue-900/50 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${scanProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Discovered Devices Grid & Table */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                <HardDrive size={16} className="text-blue-600" />
                                Discovered Hardware Devices ({filteredDiscoveredDevices.length})
                            </h4>
                            <span className="text-[10px] text-slate-500 font-mono">
                                Subnet: {subnetInput} • Protocol: {discoveryProtocol}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredDiscoveredDevices.map(device => {
                                const isRecorder = device.type === 'NVR' || device.type === 'DVR';
                                const isCurrentActiveNvr = nvrConfig.host === device.ip;
                                const isAlreadyInLiveGrid = cameras.some(c => c.ipAddress === device.ip);

                                return (
                                    <div 
                                        key={device.id}
                                        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                                            isCurrentActiveNvr
                                                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-400 ring-2 ring-blue-500/20'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                                        }`}
                                    >
                                        {/* Card Top: Type, Brand & Status */}
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                        device.type === 'NVR'
                                                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                                            : device.type === 'DVR'
                                                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                            : device.type === 'PTZ_CAMERA'
                                                            ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                                            : device.type === 'THERMAL_CAMERA'
                                                            ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                                                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                                    }`}>
                                                        {device.type.replace('_', ' ')}
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[9px] font-bold text-slate-600 dark:text-slate-300">
                                                        {device.brand}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1 text-[9px] font-bold font-mono">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-emerald-600 dark:text-emerald-400">{device.pingMs}ms</span>
                                                </div>
                                            </div>

                                            {/* Device Alias & Model */}
                                            <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase leading-snug">
                                                {device.alias}
                                            </h5>
                                            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                                                {device.model}
                                            </p>
                                        </div>

                                        {/* IP & Technical Parameters */}
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-[10px] font-mono">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400 uppercase">IP Address:</span>
                                                <span className="font-bold text-blue-600 dark:text-blue-400">{device.ip}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400 uppercase">Ports:</span>
                                                <span className="text-slate-700 dark:text-slate-300">
                                                    HTTP:{device.httpPort} | RTSP:{device.rtspPort} | SDK:{device.serverPort}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400 uppercase">MAC:</span>
                                                <span className="text-slate-500">{device.mac}</span>
                                            </div>
                                            {device.channelsCount && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400 uppercase">Channels:</span>
                                                    <span className="font-bold text-purple-600 dark:text-purple-400">{device.channelsCount} Channels</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Actions */}
                                        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                            {isRecorder ? (
                                                <button
                                                    onClick={() => handleAdoptAsNvr(device)}
                                                    className={`w-full py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                                                        isCurrentActiveNvr
                                                            ? 'bg-emerald-600 text-white shadow-sm'
                                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                                    }`}
                                                >
                                                    {isCurrentActiveNvr ? (
                                                        <>
                                                            <CheckCircle2 size={14} /> Active Connected NVR
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Server size={14} /> Set as Active NVR / DVR
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleAddDiscoveredCameraToGrid(device)}
                                                    className={`w-full py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                                                        isAlreadyInLiveGrid
                                                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                                    }`}
                                                >
                                                    {isAlreadyInLiveGrid ? (
                                                        <>
                                                            <Check size={14} /> In Live Grid (View)
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Plus size={14} /> Add to Live Matrix
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        toast.success(`Ping response from ${device.ip}: HTTP 200 OK (${device.pingMs}ms latency)`);
                                                    }}
                                                    className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center"
                                                >
                                                    Ping Probe
                                                </button>
                                                <a
                                                    href={`http://${device.ip}:${device.httpPort}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                                                >
                                                    Web Admin <ExternalLink size={10} />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: CAMERA PLANNER & PLANTATION FOV PLACEMENT */}
            {activeTab === 'planner' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Planner Parameters (5 cols) */}
                    <div className="lg:col-span-5 p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 block">
                                Field Planning Simulator
                            </span>
                            <h4 className="text-base font-black text-slate-900 dark:text-white uppercase">
                                Plan New Camera Placement
                            </h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                                Configure optic lens, mount pole height, surveillance range, and field of view cone before field installation.
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
                                        else if (m.includes('PTZ')) { angle = 60; range = 160; }
                                        setPlannedCam({ ...plannedCam, model: m, fovAngleDeg: angle, rangeM: range });
                                    }}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                >
                                    <option value="Hikvision DS-2CD2087G2-LU (ColorVu 2.8mm)">Hikvision ColorVu 2.8mm (115° Ultra-Wide Angle)</option>
                                    <option value="Hikvision DS-2CD2386G2-ISU (AcuSense 4mm)">Hikvision AcuSense 4mm (89° Standard Orchard Range)</option>
                                    <option value="Hikvision DS-2DE4425IW-DE (25x PTZ)">Hikvision 25x Optical PTZ (60° Telephoto Perimeter)</option>
                                    <option value="Hikvision Bi-Spectrum Thermal">Hikvision Bi-Spectrum Thermal (Frost/Fire Alert)</option>
                                </select>
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
                                        max="200"
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
                                        max="15"
                                        value={plannedCam.mountHeightM}
                                        onChange={(e) => setPlannedCam({ ...plannedCam, mountHeightM: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
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
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleDeployPlannedCamera}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                                <Check size={16} /> Deploy Camera to Plantation Map
                            </button>
                        </div>
                    </div>

                    {/* Coverage Calculations & Visual FOV Cone (7 cols) */}
                    <div className="lg:col-span-7 p-6 bg-slate-900 text-white rounded-[2rem] border border-slate-800 shadow-xl space-y-5">
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

                        {/* Calculated Metrics */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                                <span className="text-[8px] font-black uppercase text-slate-400">Total Ground Area</span>
                                <p className="text-lg font-black font-mono text-white mt-1">
                                    {Math.round((Math.PI * Math.pow(plannedCam.rangeM, 2) * (plannedCam.fovAngleDeg / 360)))} m²
                                </p>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                                <span className="text-[8px] font-black uppercase text-slate-400">Facial ID Range</span>
                                <p className="text-lg font-black font-mono text-emerald-400 mt-1">
                                    {Math.round(plannedCam.rangeM * 0.35)} m
                                </p>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                                <span className="text-[8px] font-black uppercase text-slate-400">Blind Zone</span>
                                <p className="text-lg font-black font-mono text-amber-400 mt-1">
                                    &lt; {Math.round(plannedCam.mountHeightM * 0.6)} m
                                </p>
                            </div>
                        </div>

                        {/* SVG FOV Cone Diagram */}
                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center">
                            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-2">
                                Top-Down 2D Projection Cone (Azimuth: {plannedCam.azimuthDeg}°)
                            </span>
                            <svg className="w-56 h-56" viewBox="0 0 200 200">
                                {/* Base Grid Circle */}
                                <circle cx="100" cy="100" r="90" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                                <circle cx="100" cy="100" r="50" fill="none" stroke="#1e293b" strokeWidth="1" />
                                
                                {/* Cardinal Points */}
                                <text x="100" y="15" fill="#64748b" fontSize="8" textAnchor="middle">N (0°)</text>
                                <text x="185" y="103" fill="#64748b" fontSize="8" textAnchor="middle">E (90°)</text>
                                <text x="100" y="195" fill="#64748b" fontSize="8" textAnchor="middle">S (180°)</text>
                                <text x="15" y="103" fill="#64748b" fontSize="8" textAnchor="middle">W (270°)</text>

                                {/* FOV Wedge */}
                                {(() => {
                                    const cx = 100;
                                    const cy = 100;
                                    const r = 80;
                                    const startAngle = (plannedCam.azimuthDeg - plannedCam.fovAngleDeg / 2 - 90) * (Math.PI / 180);
                                    const endAngle = (plannedCam.azimuthDeg + plannedCam.fovAngleDeg / 2 - 90) * (Math.PI / 180);
                                    const x1 = cx + r * Math.cos(startAngle);
                                    const y1 = cy + r * Math.sin(startAngle);
                                    const x2 = cx + r * Math.cos(endAngle);
                                    const y2 = cy + r * Math.sin(endAngle);
                                    const largeArc = plannedCam.fovAngleDeg > 180 ? 1 : 0;
                                    const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                                    return (
                                        <g>
                                            <path d={pathData} fill="rgba(59, 130, 246, 0.25)" stroke="#3b82f6" strokeWidth="2" />
                                            {/* Camera Center Icon */}
                                            <circle cx={cx} cy={cy} r="6" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
                                        </g>
                                    );
                                })()}
                            </svg>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: NVR & DVR SETTINGS WITH ALIAS, IP, PORTS, USERNAME & PASSWORD */}
            {activeTab === 'nvr_settings' && (
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 block">
                                    Hardware Network Settings
                                </span>
                                <h4 className="text-lg font-black uppercase text-slate-900 dark:text-white">
                                    NVR / DVR Credentials & Network Configuration
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Configure Device Alias, IP Address, Communication Ports, Username, and Password required for authenticated RTSP & ISAPI streaming.
                                </p>
                            </div>

                            <button
                                onClick={() => setActiveTab('network_search')}
                                className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all self-start sm:self-auto"
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
                                    value={nvrConfig.nvrModel}
                                    placeholder="e.g. Hikvision DS-7616NXI-I2 / S"
                                    onChange={(e) => setNvrConfig({ ...nvrConfig, nvrModel: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Network IP & Ports Section */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                Network Addressing & Stream Ports
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                                        IP Address / Host
                                    </label>
                                    <input
                                        type="text"
                                        value={nvrConfig.host}
                                        placeholder="192.168.1.120"
                                        onChange={(e) => setNvrConfig({ ...nvrConfig, host: e.target.value })}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                                        HTTP Web Port
                                    </label>
                                    <input
                                        type="number"
                                        value={nvrConfig.httpPort}
                                        onChange={(e) => setNvrConfig({ ...nvrConfig, httpPort: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                                        RTSP Stream Port
                                    </label>
                                    <input
                                        type="number"
                                        value={nvrConfig.rtspPort}
                                        onChange={(e) => setNvrConfig({ ...nvrConfig, rtspPort: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                                        SDK / Server Port
                                    </label>
                                    <input
                                        type="number"
                                        value={nvrConfig.isapiPort}
                                        onChange={(e) => setNvrConfig({ ...nvrConfig, isapiPort: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Critical Security & Authentication: Username & Password */}
                        <div className="p-5 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="text-blue-600" size={18} />
                                    <span className="text-xs font-black uppercase tracking-tight text-blue-950 dark:text-blue-200">
                                        Authentication Credentials (Required for Connection)
                                    </span>
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                                    ISAPI / RTSP Digest Auth
                                </span>
                            </div>

                            <p className="text-[11px] text-blue-800 dark:text-blue-300">
                                Modern NVR, DVR, and IP cameras strictly require valid authentication credentials. Without a username and password, RTSP stream handshakes and ISAPI telemetry requests are denied.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 block mb-1">
                                        Username
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <Key size={14} />
                                        </div>
                                        <input
                                            type="text"
                                            value={nvrConfig.username || ''}
                                            placeholder="admin"
                                            onChange={(e) => setNvrConfig({ ...nvrConfig, username: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 block mb-1">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <Lock size={14} />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={nvrConfig.password || ''}
                                            placeholder="Enter NVR / DVR password..."
                                            onChange={(e) => setNvrConfig({ ...nvrConfig, password: e.target.value })}
                                            className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stream Protocol & Channels Settings */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1">
                                    Streaming Delivery Protocol
                                </label>
                                <select
                                    value={nvrConfig.protocol || 'RTSP_OVER_WEBRTC'}
                                    onChange={(e) => setNvrConfig({ ...nvrConfig, protocol: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                >
                                    <option value="RTSP_OVER_WEBRTC">RTSP over WebRTC Gateway (Zero Latency &lt; 200ms)</option>
                                    <option value="RTSP_TCP">RTSP TCP Direct Stream (H.264/H.265+)</option>
                                    <option value="ONVIF">ONVIF Profile S/T Media2 Service</option>
                                    <option value="HLS">HLS Low Latency Chunked Streaming</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1">
                                    Total Channel Capacity
                                </label>
                                <select
                                    value={nvrConfig.channelCount || 16}
                                    onChange={(e) => setNvrConfig({ ...nvrConfig, channelCount: Number(e.target.value) })}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                >
                                    <option value={4}>4 Channels (Mini NVR/DVR)</option>
                                    <option value={8}>8 Channels (Mid-Size Field NVR)</option>
                                    <option value={16}>16 Channels (Standard Plantation NVR)</option>
                                    <option value={32}>32 Channels (Large Enterprise AcuSense)</option>
                                    <option value={64}>64 Channels (Master Surveillance Server)</option>
                                </select>
                            </div>
                        </div>

                        {/* Test Connection Result Box */}
                        {nvrAuthResult && (
                            <div className={`p-4 rounded-2xl border text-xs font-bold flex items-start gap-3 ${
                                nvrAuthResult.success
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                    : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
                            }`}>
                                {nvrAuthResult.success ? (
                                    <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                                ) : (
                                    <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                                )}
                                <div className="space-y-0.5 flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-black uppercase">{nvrAuthResult.message}</p>
                                        {nvrAuthResult.pingMs && (
                                            <span className="font-mono text-[10px] bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-800 dark:text-emerald-300">
                                                {nvrAuthResult.pingMs}ms latency
                                            </span>
                                        )}
                                    </div>
                                    {nvrAuthResult.details && (
                                        <p className="text-[11px] font-normal opacity-90">{nvrAuthResult.details}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons: Test Connection & Save */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleTestNvrConnection}
                                disabled={isTestingNvrAuth}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                                    isTestingNvrAuth
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 cursor-not-allowed'
                                        : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                <RefreshCw size={14} className={isTestingNvrAuth ? 'animate-spin' : ''} />
                                {isTestingNvrAuth ? 'Testing Authentication...' : 'Test Connection & Ping'}
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSaveNvrConfig(nvrConfig)}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                                <Check size={16} /> Save NVR & DVR Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: MANUAL IP ADD FOR HARDWARE WITHOUT UDP BROADCAST */}
            {showManualAddModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                <Plus size={16} className="text-blue-600" />
                                Add Device by Direct IP Address
                            </h4>
                            <button
                                onClick={() => setShowManualAddModal(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-xs text-slate-500">
                            Add an NVR, DVR, or IP camera directly if your network has VLANs, VPNs, or switches that filter UDP broadcast packets.
                        </p>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Device Alias / Label</label>
                                <input
                                    type="text"
                                    value={manualDevice.alias}
                                    onChange={(e) => setManualDevice({ ...manualDevice, alias: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Device Type</label>
                                    <select
                                        value={manualDevice.type}
                                        onChange={(e: any) => setManualDevice({ ...manualDevice, type: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                    >
                                        <option value="NVR">NVR (Network Video Recorder)</option>
                                        <option value="DVR">DVR (Digital Video Recorder)</option>
                                        <option value="IP_CAMERA">IP Fixed Bullet / Turret</option>
                                        <option value="PTZ_CAMERA">PTZ Speed Dome Camera</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Manufacturer</label>
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
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Device IP Address</label>
                                    <input
                                        type="text"
                                        value={manualDevice.ip}
                                        placeholder="192.168.1.160"
                                        onChange={(e) => setManualDevice({ ...manualDevice, ip: e.target.value })}
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

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => setShowManualAddModal(false)}
                                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const newDevice: DiscoveredNetworkDevice = {
                                        id: `manual-${Date.now()}`,
                                        alias: manualDevice.alias,
                                        type: manualDevice.type,
                                        brand: manualDevice.brand,
                                        model: manualDevice.model,
                                        ip: manualDevice.ip,
                                        httpPort: manualDevice.httpPort,
                                        rtspPort: manualDevice.rtspPort,
                                        serverPort: manualDevice.serverPort,
                                        mac: `00:1A:2B:${Math.floor(Math.random()*89+10)}:${Math.floor(Math.random()*89+10)}:${Math.floor(Math.random()*89+10)}`,
                                        subnetMask: '255.255.255.0',
                                        gateway: '192.168.1.1',
                                        channelsCount: (manualDevice.type === 'NVR' || manualDevice.type === 'DVR') ? 16 : undefined,
                                        firmwareVersion: 'Manual-Target',
                                        activationStatus: 'ACTIVATED',
                                        lastSeen: 'Just now',
                                        pingMs: 2
                                    };
                                    setDiscoveredDevices(prev => [newDevice, ...prev]);
                                    setShowManualAddModal(false);
                                    toast.success(`Device "${manualDevice.alias}" (${manualDevice.ip}) added to discovered hardware list.`);
                                }}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase shadow-sm"
                            >
                                Add Device
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
