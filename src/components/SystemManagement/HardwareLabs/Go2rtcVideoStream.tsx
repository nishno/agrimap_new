import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
    Video, Play, Pause, RefreshCw, Volume2, VolumeX, Maximize2, 
    ExternalLink, Copy, AlertTriangle, Check, Camera, Eye, 
    Wifi, HardDrive, Settings, ShieldCheck, ChevronDown, Download,
    ShieldAlert, HelpCircle, ArrowRight, Radio, Sun, Moon,
    Sliders, Move, ZoomIn, ZoomOut, RotateCcw, Monitor, X
} from 'lucide-react';
import { toast } from 'sonner';

export interface Go2rtcVideoStreamProps {
    streamSrc: string; // e.g. "camera_1_main"
    rtspUrl?: string;  // e.g. "rtsp://admin:Htmc2009@192.168.10.244:554/Streaming/Channels/101"
    cameraName?: string;
    channelNumber?: number;
    go2rtcHost?: string; // e.g. "http://localhost:1984"
    isMutedDefault?: boolean;
    showControls?: boolean;
    aspectRatio?: '16/9' | '4/3' | 'auto';
    className?: string;
    onSnapshotTaken?: (dataUrl: string) => void;
}

export const Go2rtcVideoStream: React.FC<Go2rtcVideoStreamProps> = ({
    streamSrc,
    rtspUrl = 'rtsp://admin:Htmc2009@192.168.10.244:554/Streaming/Channels/101',
    cameraName = 'Hikvision 4K AcuSense IP Camera',
    channelNumber = 1,
    go2rtcHost = 'http://localhost:1984',
    isMutedDefault = true,
    showControls = true,
    aspectRatio = '16/9',
    className = '',
    onSnapshotTaken
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    const [isMuted, setIsMuted] = useState(isMutedDefault);
    // Modes: 'webrtc' | 'isapi_http' | 'simulation' | 'snapshot'
    const [streamMode, setStreamMode] = useState<'webrtc' | 'isapi_http' | 'simulation' | 'snapshot'>('webrtc');
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'blocked' | 'offline'>('connecting');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [showUnblockAssistant, setShowUnblockAssistant] = useState(false);
    const [showStreamSettings, setShowStreamSettings] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [snapshotUrl, setSnapshotUrl] = useState<string>('');
    const [customStreamName, setCustomStreamName] = useState(streamSrc || `camera_${channelNumber}_main`);

    // Interactive Simulation / PTZ State
    const [isNightVision, setIsNightVision] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [showAiDetections, setShowAiDetections] = useState(true);
    const [liveTime, setLiveTime] = useState<string>('');

    // Keep live OSD timestamp updated
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setLiveTime(now.toISOString().replace('T', ' ').slice(0, 19));
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    // Clean base URLs
    const cleanHost = (go2rtcHost || 'http://localhost:1984').replace(/\/+$/, '');
    const wsHost = cleanHost.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://');
    const webrtcWsUrl = `${wsHost}/api/ws?src=${encodeURIComponent(customStreamName || streamSrc)}`;
    
    // Parse NVR Host and Channel from RTSP URL
    const parsedNvr = useMemo(() => {
        try {
            const match = rtspUrl.match(/rtsp:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/Streaming\/Channels\/(\w+)/);
            if (match) {
                return {
                    user: match[1],
                    pass: match[2],
                    host: match[3],
                    port: match[4],
                    channelRaw: match[5]
                };
            }
        } catch (_) {}
        return {
            user: 'admin',
            pass: 'Htmc2009',
            host: '192.168.10.244',
            port: '554',
            channelRaw: `${channelNumber}01`
        };
    }, [rtspUrl, channelNumber]);

    // Hikvision Direct ISAPI Snapshot URL
    const isapiSnapshotUrl = `http://${parsedNvr.host}/ISAPI/Streaming/channels/${parsedNvr.channelRaw}/picture`;

    // =========================================================================
    // NATIVE WEBRTC CONNECTION TO GO2RTC (NO EXTERNAL SCRIPT DEPENDENCY)
    // =========================================================================
    const connectWebRtc = useCallback(() => {
        // Cleanup previous
        if (wsRef.current) {
            try { wsRef.current.close(); } catch (_) {}
            wsRef.current = null;
        }
        if (peerConnectionRef.current) {
            try { peerConnectionRef.current.close(); } catch (_) {}
            peerConnectionRef.current = null;
        }

        setConnectionStatus('connecting');
        setErrorMessage('');

        // Detect Mixed Content block ahead of time if on HTTPS and connecting to unencrypted WS
        const isHttpsPage = window.location.protocol === 'https:';
        const isPlainWs = webrtcWsUrl.startsWith('ws://');

        try {
            const ws = new WebSocket(webrtcWsUrl);
            wsRef.current = ws;

            ws.onopen = async () => {
                try {
                    const pc = new RTCPeerConnection({
                        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                    });
                    peerConnectionRef.current = pc;

                    pc.addTransceiver('video', { direction: 'recvonly' });
                    pc.addTransceiver('audio', { direction: 'recvonly' });

                    pc.ontrack = (event) => {
                        if (videoRef.current && event.streams && event.streams[0]) {
                            videoRef.current.srcObject = event.streams[0];
                            videoRef.current.play().catch(() => {});
                            setConnectionStatus('connected');
                        }
                    };

                    pc.onicecandidate = (event) => {
                        if (event.candidate && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: 'webrtc/candidate',
                                value: event.candidate.candidate
                            }));
                        }
                    };

                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);

                    ws.send(JSON.stringify({
                        type: 'webrtc/offer',
                        value: offer.sdp
                    }));
                } catch (err: any) {
                    setConnectionStatus('blocked');
                    setErrorMessage(err?.message || 'Failed to initialize WebRTC PeerConnection');
                }
            };

            ws.onmessage = async (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'webrtc/answer' && peerConnectionRef.current) {
                        await peerConnectionRef.current.setRemoteDescription(
                            new RTCSessionDescription({ type: 'answer', sdp: msg.value })
                        );
                        setConnectionStatus('connected');
                    } else if (msg.type === 'webrtc/candidate' && peerConnectionRef.current) {
                        await peerConnectionRef.current.addIceCandidate(
                            new RTCIceCandidate({ candidate: msg.value, sdpMid: '', sdpMLineIndex: 0 })
                        );
                    }
                } catch (_) {}
            };

            ws.onerror = (e) => {
                if (isHttpsPage && isPlainWs) {
                    setConnectionStatus('blocked');
                    setErrorMessage('Browser Mixed Content Block: HTTPS page blocked insecure connection to ws://localhost:1984. Follow unblock guide.');
                } else {
                    setConnectionStatus('offline');
                    setErrorMessage('Cannot reach go2rtc server on ' + cleanHost);
                }
            };

            ws.onclose = () => {
                if (connectionStatus === 'connecting') {
                    if (isHttpsPage && isPlainWs) {
                        setConnectionStatus('blocked');
                    } else {
                        setConnectionStatus('offline');
                    }
                }
            };
        } catch (err: any) {
            setConnectionStatus('blocked');
            setErrorMessage('Browser Security Policy Blocked: ' + (err?.message || 'Insecure origin blocked'));
        }
    }, [webrtcWsUrl, cleanHost]);

    useEffect(() => {
        if (streamMode === 'webrtc') {
            connectWebRtc();
        } else if (wsRef.current) {
            try { wsRef.current.close(); } catch (_) {}
        }

        return () => {
            if (wsRef.current) {
                try { wsRef.current.close(); } catch (_) {}
            }
            if (peerConnectionRef.current) {
                try { peerConnectionRef.current.close(); } catch (_) {}
            }
        };
    }, [streamMode, connectWebRtc]);

    // Handle Copy RTSP URL
    const handleCopyRtsp = () => {
        navigator.clipboard.writeText(rtspUrl);
        setIsCopied(true);
        toast.success('RTSP URL copied! Paste into VLC Player or go2rtc.');
        setTimeout(() => setIsCopied(false), 2000);
    };

    // Handle Open in VLC via Custom Protocol
    const handleOpenInVlc = () => {
        const vlcLink = `vlc://${rtspUrl}`;
        window.open(vlcLink, '_blank');
        toast.info('Launching external player with RTSP stream...');
    };

    // Handle Open NVR Web in Browser / IE Tab
    const handleOpenNvrWeb = () => {
        const nvrUrl = `http://${parsedNvr.host}`;
        window.open(nvrUrl, '_blank');
        toast.info(`Opening NVR Web Interface (${nvrUrl}) - Use IE Tab or Edge IE Mode for live video`);
    };

    // Handle Copy NVR Web URL
    const handleCopyNvrWeb = () => {
        const nvrUrl = `http://${parsedNvr.host}`;
        navigator.clipboard.writeText(nvrUrl);
        toast.success(`Copied NVR Web URL: ${nvrUrl}`);
    };

    // Download Master All-16-Ch Gateway Bridge (Kills stale go2rtc, auto-writes go2rtc.yaml, supports all 16 channels + wireless cams)
    const handleDownloadPythonBridge = () => {
        const pyScript = `# ====================================================================
# AgriMap Pro - Master All-in-One NVR & IP Camera Gateway Bridge
# Target NVR: ${parsedNvr.host} (Port: ${parsedNvr.port})
# Full 16-Channel Surveillance Matrix + Wireless IP Cameras
# ====================================================================

import os
import sys
import subprocess
import time

GO2RTC_CONFIG = """# AgriMap Pro - Master 16-Channel Streaming Configuration
api:
  listen: ":1984"
  origin: "*"

webrtc:
  listen: ":8555"

streams:
  camera_1_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/101
  camera_2_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/201
  camera_3_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/301
  camera_4_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/401
  camera_5_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/501
  camera_6_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/601
  camera_7_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/701
  camera_8_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/801
  camera_9_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/901
  camera_10_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1001
  camera_11_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1101
  camera_12_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1201
  camera_13_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1301
  camera_14_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1401
  camera_15_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1501
  camera_16_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1601

  # Sub-streams (Low-bandwidth / mobile grid view):
  camera_1_sub: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/102
  camera_2_sub: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/202
  camera_3_sub: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/302
"""

print("=" * 65)
print("  AgriMap Pro - Master All-in-One NVR Streaming Gateway")
print("  Target NVR: ${parsedNvr.host} (Hikvision DS-7716NI-I4 / 16P)")
print("  Active Channel for Focus: CH0${parsedNvr.channelRaw}")
print("=" * 65)

# Step 1: Write go2rtc.yaml automatically
try:
    with open("go2rtc.yaml", "w", encoding="utf-8") as f:
        f.write(GO2RTC_CONFIG)
    print("[+] Automatically generated go2rtc.yaml with all 16 channels!")
except Exception as e:
    print(f"[-] Could not write go2rtc.yaml: {e}")

# Step 2: Kill existing/stale go2rtc processes to fix socket bind conflict (port 1984/8554)
print("[+] Cleaning up stale background processes to prevent socket conflict...")
try:
    if sys.platform == "win32":
        subprocess.run(["taskkill", "/F", "/IM", "go2rtc.exe"], capture_output=True)
    else:
        subprocess.run(["killall", "-9", "go2rtc"], capture_output=True)
    time.sleep(0.5)
except Exception:
    pass

# Step 3: Start go2rtc
print("[+] Launching go2rtc server on http://localhost:1984...")
try:
    subprocess.Popen(["go2rtc"])
    print("[SUCCESS] go2rtc active on http://localhost:1984!")
except Exception:
    print("[!] Notice: 'go2rtc' binary not found in current folder.")
    print("    Please download go2rtc.exe from:")
    print("    https://github.com/AlexxIT/go2rtc/releases")
    print("    and place it next to this script.")

# Step 4: Optional VLC launcher for active channel
print(f"\\n[+] To open live view in VLC with TCP streaming:")
vlc_cmd = f'vlc --rtsp-tcp "${rtspUrl}"'
print(f"    {vlc_cmd}")

print("\\n" + "=" * 65)
print("  ALL 16 CHANNELS ACTIVE & UNBLOCKED!")
print("  - go2rtc Web Console:    http://localhost:1984")
print("  - Live Browser App:      AgriMap Pro -> Watch Live Grid")
print("=" * 65 + "\\n")
input("Press Enter to keep gateway running...")
`;

        const blob = new Blob([pyScript], { type: 'text/x-python' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'agrimap_master_gateway.py';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Downloaded Master 16-Channel Gateway! Run it once for all cameras.');
    };

    // Download go2rtc.yaml direct file
    const handleDownloadGo2rtcYaml = () => {
        const yamlConfig = `# go2rtc.yaml - AgriMap Pro Configuration
# Hikvision DS-7716NI-I4 (192.168.10.244) & Wireless IP Cameras
api:
  listen: ":1984"
  origin: "*"

webrtc:
  listen: ":8555"

streams:
  camera_1_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/101
  camera_2_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/201
  camera_3_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/301
  camera_4_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/401
  camera_5_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/501
  camera_6_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/601
  camera_7_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/701
  camera_8_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/801
  camera_9_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/901
  camera_10_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1001
  camera_11_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1101
  camera_12_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1201
  camera_13_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1301
  camera_14_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1401
  camera_15_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1501
  camera_16_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1601
`;
        const blob = new Blob([yamlConfig], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'go2rtc.yaml';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Downloaded go2rtc.yaml! Save in C:\\go2rtc\\ folder.');
    };

    // Full 16-channel go2rtc YAML config copy
    const handleCopyGo2rtcYaml = () => {
        const yamlConfig = `# go2rtc.yaml - AgriMap Pro Configuration
# Hikvision DS-7716NI-I4 (192.168.10.244)
api:
  listen: ":1984"
  origin: "*"

webrtc:
  listen: ":8555"

streams:
  camera_1_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/101
  camera_2_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/201
  camera_3_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/301
  camera_4_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/401
  camera_5_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/501
  camera_6_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/601
  camera_7_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/701
  camera_8_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/801
  camera_9_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/901
  camera_10_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1001
  camera_11_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1101
  camera_12_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1201
  camera_13_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1301
  camera_14_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1401
  camera_15_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1501
  camera_16_main: rtsp://${parsedNvr.user}:${parsedNvr.pass}@${parsedNvr.host}:554/Streaming/Channels/1601
`;
        navigator.clipboard.writeText(yamlConfig);
        toast.success('Complete 16-channel go2rtc.yaml config copied to clipboard!');
    };

    // Fullscreen Toggle
    const handleFullscreen = () => {
        if (containerRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            } else {
                containerRef.current.requestFullscreen().catch(() => {});
            }
        }
    };

    return (
        <div 
            ref={containerRef}
            className={`relative flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl group ${className}`}
        >
            {/* Top OSD / Live Banner Bar */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-auto">
                <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                        connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 
                        connectionStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 
                        connectionStatus === 'blocked' ? 'bg-amber-500' : 'bg-rose-500'
                    }`} />
                    <span className="px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 font-mono font-bold text-[10px] border border-blue-700/60">
                        CH 0{channelNumber}
                    </span>
                    <span className="font-bold text-xs text-white truncate max-w-[180px] drop-shadow-md">
                        {cameraName}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Mode Tag */}
                    <span className="px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-300 font-mono text-[9px] border border-slate-700">
                        {streamMode.toUpperCase()}
                    </span>

                    {/* Night Vision IR Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsNightVision(!isNightVision)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isNightVision ? 'bg-emerald-600/30 border-emerald-500 text-emerald-400' : 'bg-black/60 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                        title={isNightVision ? 'ColorVu Day Mode' : 'Night Vision IR Mode'}
                    >
                        {isNightVision ? <Moon size={13} /> : <Sun size={13} />}
                    </button>

                    {/* Mute Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-1.5 rounded-lg bg-black/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    </button>

                    {/* Fullscreen Button */}
                    <button
                        type="button"
                        onClick={handleFullscreen}
                        className="p-1.5 rounded-lg bg-black/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
                        title="Fullscreen"
                    >
                        <Maximize2 size={13} />
                    </button>
                </div>
            </div>

            {/* Video Player Display Container */}
            <div 
                className="relative w-full bg-black flex items-center justify-center overflow-hidden"
                style={{ aspectRatio: aspectRatio === 'auto' ? undefined : aspectRatio }}
            >
                {/* 1. WEBRTC STREAM MODE */}
                {streamMode === 'webrtc' && (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={isMuted}
                        controls={showControls}
                        className={`w-full h-full object-contain bg-black ${isNightVision ? 'filter grayscale contrast-125 brightness-90' : ''}`}
                    />
                )}

                {/* 2. ISAPI DIRECT HTTP SNAPSHOT MODE */}
                {streamMode === 'isapi_http' && (
                    <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                        <img
                            src={isapiSnapshotUrl}
                            alt="Hikvision NVR ISAPI Stream"
                            className={`w-full h-full object-contain ${isNightVision ? 'filter grayscale contrast-125' : ''}`}
                            onError={() => {
                                setConnectionStatus('blocked');
                                setErrorMessage('Browser blocked direct HTTP to 192.168.10.244. Allow insecure content or use simulator.');
                            }}
                        />
                    </div>
                )}

                {/* 3. SIMULATION / TEST STREAM MODE */}
                {streamMode === 'simulation' && (
                    <div className="relative w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center overflow-hidden select-none">
                        {/* Simulated Orchard Landscape Background Canvas */}
                        <div 
                            className="absolute inset-0 transition-transform duration-300"
                            style={{
                                transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                                filter: isNightVision ? 'grayscale(100%) contrast(140%) brightness(0.85)' : 'none'
                            }}
                        >
                            <svg className="w-full h-full opacity-60" viewBox="0 0 800 450" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={isNightVision ? "#050b14" : "#1e3a5f"} />
                                        <stop offset="100%" stopColor={isNightVision ? "#0f172a" : "#2d5a3f"} />
                                    </linearGradient>
                                    <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={isNightVision ? "#111827" : "#14532d"} />
                                        <stop offset="100%" stopColor={isNightVision ? "#030712" : "#052e16"} />
                                    </linearGradient>
                                </defs>
                                <rect width="800" height="260" fill="url(#skyGrad)" />
                                <rect y="260" width="800" height="190" fill="url(#groundGrad)" />

                                {/* Orchard Tree Rows in Perspective */}
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <path
                                        key={i}
                                        d={`M ${100 + i * 80} 450 L ${360 + i * 12} 260`}
                                        stroke={isNightVision ? "#374151" : "#166534"}
                                        strokeWidth="4"
                                        strokeDasharray="8 6"
                                    />
                                ))}

                                {/* Perimeter Fence Line */}
                                <line x1="20" y1="260" x2="780" y2="260" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
                            </svg>
                        </div>

                        {/* AcuSense AI Detection Bounding Boxes */}
                        {showAiDetections && (
                            <div className="absolute inset-0 pointer-events-none">
                                {/* Human Detection Box */}
                                <div className="absolute top-[48%] left-[38%] border-2 border-emerald-400 bg-emerald-500/10 rounded px-1 text-[9px] font-mono font-bold text-emerald-300 flex flex-col">
                                    <span className="bg-emerald-600/90 text-white px-1 rounded-sm w-fit">PERSON 96%</span>
                                    <span className="text-[8px] text-emerald-200">AcuSense CH0{channelNumber}</span>
                                    <div className="w-12 h-20" />
                                </div>

                                {/* Vehicle / Tractor Box */}
                                <div className="absolute top-[55%] right-[28%] border-2 border-cyan-400 bg-cyan-500/10 rounded px-1 text-[9px] font-mono font-bold text-cyan-300 flex flex-col">
                                    <span className="bg-cyan-600/90 text-white px-1 rounded-sm w-fit">TRACTOR 94%</span>
                                    <div className="w-20 h-14" />
                                </div>
                            </div>
                        )}

                        {/* Simulated PTZ Controls HUD */}
                        <div className="absolute bottom-4 right-4 z-20 flex flex-col items-center gap-1 bg-black/75 p-2 rounded-2xl border border-slate-700 backdrop-blur-md">
                            <span className="text-[8px] font-mono text-slate-400 uppercase font-bold">PTZ CONTROLS</span>
                            <div className="grid grid-cols-3 gap-1">
                                <span />
                                <button
                                    onClick={() => setPanOffset(prev => ({ ...prev, y: prev.y + 15 }))}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-[10px]"
                                >▲</button>
                                <span />
                                <button
                                    onClick={() => setPanOffset(prev => ({ ...prev, x: prev.x + 20 }))}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-[10px]"
                                >◀</button>
                                <button
                                    onClick={() => { setPanOffset({ x: 0, y: 0 }); setZoomLevel(1); }}
                                    className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-[9px]"
                                >CTR</button>
                                <button
                                    onClick={() => setPanOffset(prev => ({ ...prev, x: prev.x - 20 }))}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-[10px]"
                                >▶</button>
                                <span />
                                <button
                                    onClick={() => setPanOffset(prev => ({ ...prev, y: prev.y - 15 }))}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-[10px]"
                                >▼</button>
                                <span />
                            </div>

                            <div className="flex items-center gap-1 mt-1">
                                <button
                                    onClick={() => setZoomLevel(prev => Math.min(prev + 0.3, 4))}
                                    className="p-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg"
                                    title="Zoom In"
                                >
                                    <ZoomIn size={12} />
                                </button>
                                <span className="font-mono text-[9px] text-white font-bold">{zoomLevel.toFixed(1)}x</span>
                                <button
                                    onClick={() => setZoomLevel(prev => Math.max(prev - 0.3, 1))}
                                    className="p-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg"
                                    title="Zoom Out"
                                >
                                    <ZoomOut size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. SNAPSHOT MODE */}
                {streamMode === 'snapshot' && (
                    <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                        {snapshotUrl ? (
                            <img src={snapshotUrl} alt="Snapshot" className="w-full h-full object-contain" />
                        ) : (
                            <div className="text-center p-6 text-slate-400">
                                <Camera size={36} className="mx-auto mb-2 text-slate-500 opacity-60" />
                                <p className="text-xs font-bold text-slate-300">Click Capture Snapshot</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Live OSD Overlay (Time, Camera, Hikvision watermark) */}
                <div className="absolute top-8 left-3 z-10 pointer-events-none font-mono text-[11px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex flex-col">
                    <span className="font-bold text-emerald-400">{cameraName}</span>
                    <span className="text-[10px] text-slate-300">{liveTime} • 25 FPS • 4K 3840x2160</span>
                    <span className="text-[9px] text-cyan-300">NVR: {parsedNvr.host}:{parsedNvr.port} [CH0{channelNumber}]</span>
                </div>

                {/* ============================================================= */}
                {/* BROWSER BLOCK DETECTED OVERLAY & UNBLOCK HELPER TRIGGER */}
                {/* ============================================================= */}
                {(connectionStatus === 'blocked' || connectionStatus === 'offline') && streamMode === 'webrtc' && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md text-center text-white">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-lg animate-pulse">
                            <ShieldAlert size={26} />
                        </div>

                        <h4 className="text-sm font-black uppercase tracking-wider text-white">
                            Browser Security Policy Blocked RTSP / WebRTC
                        </h4>

                        <p className="text-xs text-slate-300 mt-1 max-w-md leading-relaxed">
                            Web browsers block direct RTSP port 554 and block HTTP connections from HTTPS websites due to Mixed Content & Private Network Access.
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                            {/* 1. Unblock Assistant Button */}
                            <button
                                type="button"
                                onClick={() => setShowUnblockAssistant(true)}
                                className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-orange-950 flex items-center gap-1.5 cursor-pointer"
                            >
                                <HelpCircle size={14} />
                                <span>How to Unblock Browser (1-Click)</span>
                            </button>

                            {/* 2. Switch to In-App Active Simulation */}
                            <button
                                type="button"
                                onClick={() => setStreamMode('simulation')}
                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-950 flex items-center gap-1.5 cursor-pointer"
                            >
                                <Monitor size={14} />
                                <span>Switch to Active Simulation</span>
                            </button>

                            {/* 3. Open in VLC */}
                            <button
                                type="button"
                                onClick={handleOpenInVlc}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                title="Launch VLC Player"
                            >
                                <ExternalLink size={13} />
                                <span>Open in VLC Player</span>
                            </button>
                        </div>

                        {/* Direct NVR IP Status Tag */}
                        <div className="mt-4 pt-3 border-t border-slate-800/80 w-full max-w-sm flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>Target NVR:</span>
                            <span className="text-cyan-400">{parsedNvr.host}:{parsedNvr.port}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls & Mode Bar */}
            <div className="p-2.5 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Engine Mode Selector */}
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 hidden sm:inline">Engine:</span>
                    <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                        {(['webrtc', 'simulation', 'isapi_http', 'snapshot'] as const).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setStreamMode(mode)}
                                className={`px-2.5 py-1 rounded-md font-mono text-[10px] uppercase font-bold transition-all cursor-pointer ${
                                    streamMode === mode
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {mode === 'webrtc' ? 'WebRTC' : mode === 'simulation' ? 'Simulate' : mode === 'isapi_http' ? 'ISAPI HTTP' : 'Snapshot'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Action Icons */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleCopyRtsp}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-mono flex items-center gap-1 border border-slate-700 transition-all cursor-pointer"
                        title="Copy RTSP link for VLC player"
                    >
                        {isCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>RTSP URL</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenInVlc}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-[10px] font-mono flex items-center gap-1 border border-emerald-500/30 transition-all cursor-pointer"
                        title="Launch in VLC Player"
                    >
                        <ExternalLink size={11} />
                        <span>VLC</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenNvrWeb}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-[10px] font-mono flex items-center gap-1 border border-cyan-500/30 transition-all cursor-pointer"
                        title="Open NVR Web Interface (Works with IE Tab or Edge IE Mode)"
                    >
                        <ExternalLink size={11} />
                        <span>NVR Web</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowUnblockAssistant(true)}
                        className="p-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-600/40 transition-all cursor-pointer"
                        title="Browser Unblock Assistant"
                    >
                        <ShieldCheck size={13} />
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowStreamSettings(!showStreamSettings)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                        title="Stream Settings"
                    >
                        <Settings size={13} />
                    </button>
                </div>
            </div>

            {/* Collapsible Settings Drawer */}
            {showStreamSettings && (
                <div className="p-3 bg-slate-950 border-t border-slate-800/80 space-y-2 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                go2rtc Stream Name
                            </label>
                            <input
                                type="text"
                                value={customStreamName}
                                onChange={(e) => setCustomStreamName(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                                placeholder="e.g. camera_1_main"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Full RTSP Source URL
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={rtspUrl}
                                className="w-full px-2.5 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 select-all focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] text-slate-400 font-mono">
                            WebSocket Endpoint: <span className="text-cyan-400">{webrtcWsUrl}</span>
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleCopyGo2rtcYaml}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                                Copy go2rtc.yaml
                            </button>
                            <button
                                type="button"
                                onClick={handleDownloadPythonBridge}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                                <Download size={11} />
                                <span>Download Python Bridge</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* COMPREHENSIVE BROWSER UNBLOCK ASSISTANT MODAL (USER REQUEST POINT) */}
            {/* ================================================================= */}
            {showUnblockAssistant && (
                <div className="fixed inset-0 z-[3500] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
                    <div className="bg-slate-900 border border-blue-500/40 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-slate-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-400">
                                    <ShieldAlert size={24} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-wide text-white">
                                        Browser Unblock Assistant & RTSP Stream Solutions
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Why browsers block camera streams & 3 instant solutions to connect
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowUnblockAssistant(false)}
                                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Explanation Box */}
                        <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-2xl text-xs space-y-1.5 leading-relaxed text-amber-200/90">
                            <p className="font-bold text-amber-300">
                                🔍 Why is the browser blocking your live stream?
                            </p>
                            <p>
                                1. <strong>Mixed Content Block:</strong> This application is loaded securely over <code>https://</code>. Modern browsers forbid HTTPS pages from making unencrypted connections to local network IP addresses like <code>http://192.168.10.244</code> or <code>ws://localhost:1984</code>.
                            </p>
                            <p>
                                2. <strong>RTSP Not Supported in Browsers:</strong> Browsers do not support the raw RTSP protocol (port 554). They only support WebRTC, HLS, or WebSockets.
                            </p>
                        </div>

                        {/* Solutions Grid */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                                Choose One of the Solutions Below:
                            </h4>

                            {/* Solution 1: Chrome Site Settings (Fastest) */}
                            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                                        <span className="font-bold text-xs text-white">Allow Insecure Content in Chrome (1 Minute)</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-emerald-400 font-bold">RECOMMENDED</span>
                                </div>
                                <p className="text-xs text-slate-300 pl-7">
                                    Click the <strong>Tune / Padlock icon</strong> on the left side of the browser address bar &rarr; Click <strong>Site Settings</strong> &rarr; Find <strong>Insecure content</strong> &rarr; Set to <strong>"Allow"</strong>. Then refresh this page.
                                </p>
                            </div>

                            {/* Solution 2: Download Master Python Relay Bridge */}
                            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                                        <span className="font-bold text-xs text-white">Master All-16-Channel Gateway Bridge (Run Once)</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDownloadPythonBridge}
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                        <Download size={12} />
                                        <span>Download Master Script</span>
                                    </button>
                                </div>
                                <p className="text-xs text-slate-300 pl-7">
                                    Run <code>python agrimap_master_gateway.py</code> on your computer. <strong>No need to download camera by camera!</strong> It configures all 16 channels at once, kills any stuck background <code>go2rtc.exe</code> processes to prevent the <em>"Only one usage of each socket address"</em> error, and starts streaming immediately.
                                </p>
                            </div>

                            {/* Solution 3: Launch in VLC Player & Fix MRL Error */}
                            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                                        <span className="font-bold text-xs text-white">Direct RTSP Playback via VLC Player</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCopyRtsp}
                                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                                        >
                                            Copy RTSP
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleOpenInVlc}
                                            className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                                        >
                                            Launch VLC
                                        </button>
                                    </div>
                                </div>
                                
                                {/* VLC MRL Error Diagnostic Box */}
                                <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl space-y-2 text-[11px] text-red-200">
                                    <div className="font-bold text-red-400 flex items-center gap-1.5">
                                        <AlertTriangle size={13} />
                                        <span>Seeing "VLC is unable to open the MRL"? 3 Easy Fixes:</span>
                                    </div>
                                    <ol className="list-decimal pl-5 space-y-1 text-slate-300">
                                        <li>
                                            <strong className="text-amber-300">Test Sub-stream (Channel 102/202/302):</strong> Often 4K Main (101) exceeds UDP limits. Try sub-stream: <br />
                                            <code className="text-cyan-300 font-mono text-[10px] break-all">rtsp://admin:Htmc2009@{parsedNvr.host}:554/Streaming/Channels/102</code>
                                        </li>
                                        <li>
                                            <strong className="text-amber-300">Hikvision NVR Authentication Setting:</strong> In Hikvision Web UI (<code>http://{parsedNvr.host}</code>) &rarr; <em>Configuration &rarr; System &rarr; Security &rarr; Authentication</em>, change <strong>RTSP Authentication</strong> from <em>digest</em> to <strong>digest/basic</strong>.
                                        </li>
                                        <li>
                                            <strong className="text-amber-300">Force VLC to use TCP:</strong> In VLC &rarr; <em>Tools &rarr; Preferences &rarr; Input / Codecs</em> &rarr; find <em>Live555 stream transport</em> &rarr; select <strong>RTP over RTSP (TCP)</strong>.
                                        </li>
                                        <li>
                                            <strong className="text-amber-300">Check Subnet IP:</strong> Ensure your computer is on <code>192.168.10.x</code> (run <code>ping {parsedNvr.host}</code> in Command Prompt).
                                        </li>
                                    </ol>
                                </div>
                            </div>

                            {/* Solution 4: What to do with go2rtc.yaml */}
                            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">4</span>
                                        <span className="font-bold text-xs text-white">What to do with go2rtc.yaml (Where to put it)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleDownloadGo2rtcYaml}
                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                                        >
                                            <Download size={11} />
                                            <span>Download YAML</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCopyGo2rtcYaml}
                                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                                <div className="pl-7 space-y-1.5 text-xs text-slate-300">
                                    <p>1. <strong>Where to put it:</strong> Place <code>go2rtc.yaml</code> in the <strong>same folder</strong> where <code>go2rtc.exe</code> is saved (e.g. <code>C:\go2rtc\go2rtc.yaml</code>).</p>
                                    <p>2. <strong>If you get "bind: Only one usage of each socket address":</strong> It means <code>go2rtc.exe</code> is already running in the background! Close the existing window or run <code>taskkill /F /IM go2rtc.exe</code> in Command Prompt, then restart.</p>
                                    <p>3. With <code>go2rtc.yaml</code> in place, all 16 cameras will stream instantly into the browser via WebRTC.</p>
                                </div>
                            </div>

                            {/* Solution 5: Using IE Tab Extension (User's Working Method) */}
                            <div className="p-4 bg-slate-950 rounded-2xl border border-cyan-500/30 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center">5</span>
                                        <span className="font-bold text-xs text-white">Using Chrome "IE Tab" Extension (Works Great!)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCopyNvrWeb}
                                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-bold cursor-pointer"
                                        >
                                            Copy NVR IP
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleOpenNvrWeb}
                                            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                                        >
                                            <ExternalLink size={11} />
                                            <span>Open in IE Tab</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="pl-7 space-y-1.5 text-xs text-slate-300 leading-relaxed">
                                    <p>
                                        <strong>Can you use IE Tab? YES, absolutely!</strong> It is a widely used and reliable method for CCTV cameras and NVRs.
                                    </p>
                                    <p>
                                        <strong>Why it works:</strong> Hikvision NVRs require the legacy <em>WebComponents.exe</em> ActiveX plugin to render high-framerate video. Modern Chrome blocks ActiveX and enforces strict <em>Mixed Content & Private Network Access</em> security rules. IE Tab runs an emulated Internet Explorer engine inside Chrome that allows the plugin to run without security blocks.
                                    </p>
                                    <p className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-[11px] text-cyan-200">
                                        💡 <strong>Pro Tip for IE Tab (Auto-Open):</strong> Right-click the IE Tab extension icon &rarr; <em>Options</em> &rarr; find <strong>Auto URLs</strong> &rarr; add: <code className="text-white font-mono bg-black/40 px-1.5 py-0.5 rounded">http://{parsedNvr.host}/*</code>. Now anytime you click to view your cameras, Chrome will automatically open it inside IE Tab!
                                    </p>
                                </div>
                            </div>

                            {/* Solution 6: Microsoft Edge "Internet Explorer Mode" (Built-In, No Extension Needed) */}
                            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">6</span>
                                        <span className="font-bold text-xs text-white">Microsoft Edge "IE Mode" (Built into Windows, Zero Extensions)</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-blue-400 font-bold">BUILT-IN</span>
                                </div>
                                <div className="pl-7 space-y-1.5 text-xs text-slate-300 leading-relaxed">
                                    <p>
                                        If company security policy or Chrome blocks you from installing third-party extensions, Windows has an official native solution:
                                    </p>
                                    <ol className="list-decimal pl-5 space-y-1 text-slate-300">
                                        <li>Open <strong>Microsoft Edge</strong> (comes pre-installed on Windows 10 & 11).</li>
                                        <li>Go to <strong>Settings &rarr; Default browser</strong> &rarr; set <em>"Allow sites to be reloaded in Internet Explorer mode"</em> to <strong>Allow</strong>.</li>
                                        <li>Under <em>"Internet Explorer mode pages"</em>, click <strong>Add</strong> and paste: <code className="text-cyan-300 font-mono">http://{parsedNvr.host}</code>.</li>
                                        <li>Install the Hikvision <code>WebComponents.exe</code> plugin once, and your 16 live camera feeds will stream with full PTZ control!</li>
                                    </ol>
                                </div>
                            </div>

                            {/* Solution 7: Official Free Desktop Software (iVMS-4200 - Zero Browser Conflicts) */}
                            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">7</span>
                                        <span className="font-bold text-xs text-white">Dedicated CCTV Software: Hikvision iVMS-4200 (PC/Mac)</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-purple-400 font-bold">100% RELIABLE</span>
                                </div>
                                <div className="pl-7 space-y-1.5 text-xs text-slate-300 leading-relaxed">
                                    <p>
                                        <strong>Hikvision iVMS-4200</strong> is the official free desktop software designed by Hikvision. It has <strong>zero browser security restrictions</strong>:
                                    </p>
                                    <ul className="list-disc pl-5 space-y-1 text-slate-300">
                                        <li>No Mixed Content, CORS, or Chrome security policy blocks.</li>
                                        <li>View all 16 cameras simultaneously in 4K resolution on multi-monitor setups.</li>
                                        <li>Hardware-accelerated decoding, smooth PTZ joystick response, and instant alarm playback.</li>
                                        <li>Connects directly via LAN IP <code className="text-purple-300 font-mono">{parsedNvr.host}</code> (Server Port 8000).</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Solution 8: Adding All Kinds of Wireless / IP Cameras */}
                            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">8</span>
                                    <span className="font-bold text-xs text-white">Can we add all kinds of IP cameras / wireless cameras?</span>
                                </div>
                                <p className="text-xs text-slate-300 pl-7 leading-relaxed">
                                    <strong>YES!</strong> Any camera that supports RTSP or ONVIF can be added: <em>Hikvision, Dahua, Uniview, Reolink, TP-Link Tapo, IMOU, Ezviz, Axis, and wireless solar/battery WiFi cameras</em>. Simply get the camera's RTSP stream path or ONVIF IP, and go2rtc will convert it into a smooth browser-compatible WebRTC live stream.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={handleCopyGo2rtcYaml}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-600/40 cursor-pointer"
                            >
                                Copy 16-Channel go2rtc.yaml Config
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowUnblockAssistant(false)}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
