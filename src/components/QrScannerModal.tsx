import React, { useRef, useState, useEffect } from 'react';
import { CameraIcon, XCircleIcon } from './Icons';
import { toast } from 'sonner';
import jsQR from 'jsqr';
import { 
    dispatchHardwareScan, 
    getActiveAdoptedScanner, 
    initGlobalHardwareScannerListener 
} from '../utils/hardwareScannerBus';
import { ScanLine, Bluetooth, Usb, Camera, Upload, CheckCircle2, Sparkles, User, Package, Layers } from 'lucide-react';

export type ScannerCategory = 'auto' | 'worker' | 'material';

interface QrScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (result: string, category?: ScannerCategory) => void;
    title?: string;
    description?: string;
    mockEmployees?: Array<{ id: string; name: string; barcode?: string; idNumber?: string }>;
    initialCategory?: ScannerCategory;
}

const QrScannerModal: React.FC<QrScannerModalProps> = ({ 
    isOpen, 
    onClose, 
    onScan, 
    title = "Scan QR / Barcode", 
    description = "Scan Worker ID, Material SKU or Crate Tag",
    mockEmployees = [],
    initialCategory = 'auto'
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanMode, setScanMode] = useState<'hardware' | 'camera'>('hardware');
    const [manualCode, setManualCode] = useState('');
    const [activeScanner, setActiveScanner] = useState<any>(null);
    const [category, setCategory] = useState<ScannerCategory>(initialCategory);

    useEffect(() => {
        if (isOpen) {
            setCategory(initialCategory);
        }
    }, [isOpen, initialCategory]);

    useEffect(() => {
        if (isOpen) {
            initGlobalHardwareScannerListener();
            const adopted = getActiveAdoptedScanner();
            setActiveScanner(adopted);

            // Listen for scan bus while modal is open
            const handleHwScan = (e: any) => {
                const code = e.detail?.code;
                if (code) {
                    onScan(code, category);
                    onClose();
                }
            };
            window.addEventListener('agrimap:hardware_scan', handleHwScan);
            return () => {
                window.removeEventListener('agrimap:hardware_scan', handleHwScan);
            };
        }
    }, [isOpen, onScan, onClose, category]);

    useEffect(() => {
        if (isOpen && scanMode === 'camera') {
            startCamera();
        } else {
            stopCamera();
        }
        return () => {
            stopCamera();
        };
    }, [isOpen, scanMode]);

    const startCamera = async () => {
        try {
            setIsScanning(true);
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Camera API not available. Use USB/Bluetooth scanner or photo upload.");
            }
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            } catch (envErr) {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute('playsinline', 'true');
                videoRef.current.setAttribute('muted', 'true');
                videoRef.current.muted = true;
                videoRef.current.playsInline = true;
                
                try {
                    await videoRef.current.play();
                    startDecodingLoop();
                } catch (playErr) {
                    console.error("Video play failed:", playErr);
                }
            }
        } catch (err) {
            console.error("Camera access failed:", err);
            setIsScanning(false);
            const errorMsg = err instanceof Error ? err.message : String(err);
            toast.warning("Camera unavailable. Using USB/Bluetooth Scanner mode.");
            setScanMode('hardware');
        }
    };

    const startDecodingLoop = () => {
        const video = videoRef.current;
        if (!video) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const scanFrame = () => {
            if (!streamRef.current || video.paused || video.ended) {
                return;
            }
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    try {
                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "attemptBoth",
                        });
                        if (code && code.data) {
                            dispatchHardwareScan(code.data, "Camera QR Scanner");
                            onScan(code.data, category);
                            onClose();
                            return;
                        }
                    } catch (e) {
                        console.error("Frame decoding error:", e);
                    }
                }
            }
            requestRef.current = requestAnimationFrame(scanFrame);
        };

        requestRef.current = requestAnimationFrame(scanFrame);
    };

    const stopCamera = () => {
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsScanning(false);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode.trim()) {
            dispatchHardwareScan(manualCode.trim(), "Manual Input");
            onScan(manualCode.trim(), category);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[5000] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative animate-fade-in text-white">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black uppercase tracking-tight">{title}</h2>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        </div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">
                            {description}
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-white/10 rounded-2xl transition-colors text-slate-400 hover:text-white"
                    >
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Target Category Selector (Auto / Worker / Material) */}
                <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <Layers size={11} className="text-emerald-400" />
                        Scan Target:
                    </span>
                    <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                        <button
                            type="button"
                            onClick={() => setCategory('auto')}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                category === 'auto'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Sparkles size={10} />
                            <span>Auto</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCategory('worker')}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                category === 'worker'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <User size={10} />
                            <span>Worker</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCategory('material')}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                category === 'material'
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Package size={10} />
                            <span>Material</span>
                        </button>
                    </div>
                </div>

                {/* Mode Selector */}
                <div className="px-6 pt-4 pb-2 flex gap-2 border-b border-slate-800/80 bg-slate-950/40">
                    <button
                        type="button"
                        onClick={() => setScanMode('hardware')}
                        className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                            scanMode === 'hardware'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <Usb size={13} />
                        <span>USB / Bluetooth Scanner</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setScanMode('camera')}
                        className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                            scanMode === 'camera'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <Camera size={13} />
                        <span>Camera Scanner</span>
                    </button>
                </div>

                {/* Hardware Scanner Mode View */}
                {scanMode === 'hardware' && (
                    <div className="p-6 space-y-6">
                        <div className="p-5 bg-gradient-to-br from-slate-800 to-slate-850 rounded-2xl border border-slate-700/60 text-center relative overflow-hidden">
                            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 shadow-inner">
                                <ScanLine size={28} className="animate-pulse" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-white">
                                {activeScanner?.name || "USB / Bluetooth Scanner Ready"}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                Pull trigger on your handheld scanner at any time. Keystrokes are captured automatically.
                            </p>
                            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                Driver Listening On HID Keyboard Wedge
                            </div>
                        </div>

                        {/* Scanner Input / Barcode reader target */}
                        <form onSubmit={handleManualSubmit} className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                Scanner Ingest Field (or Type Barcode Manually)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={manualCode}
                                    onChange={(e) => setManualCode(e.target.value)}
                                    placeholder="Scan barcode or type code..."
                                    autoFocus
                                    className="flex-1 px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!manualCode.trim()}
                                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                >
                                    Ingest
                                </button>
                            </div>
                        </form>

                        {/* Quick Test / Demo Worker Buttons */}
                        {mockEmployees.length > 0 && (
                            <div className="border-t border-slate-800 pt-4">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                                    Quick Simulate Scan:
                                </span>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                                    {mockEmployees.slice(0, 5).map(emp => {
                                        const code = emp.barcode || emp.idNumber || emp.id;
                                        return (
                                            <button
                                                key={emp.id}
                                                type="button"
                                                onClick={() => {
                                                    dispatchHardwareScan(code, "Simulated Scan");
                                                    onScan(code, 'worker');
                                                    onClose();
                                                }}
                                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[9px] font-black text-slate-200 uppercase tracking-wider transition-all flex items-center gap-1.5"
                                            >
                                                <User size={10} className="text-blue-400" />
                                                <span>{emp.name} ({code})</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Camera Mode View */}
                {scanMode === 'camera' && (
                    <div className="relative aspect-[3/4] bg-black">
                        {isScanning ? (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                                    <div className="absolute inset-0 border-2 border-indigo-500 rounded-xl relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500/50 animate-scan pointer-events-none shadow-[0_0_8px_2px_rgba(99,102,241,0.5)]"></div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 gap-3">
                                <CameraIcon className="w-10 h-10" />
                                <p className="text-xs font-bold uppercase tracking-wider">Starting camera...</p>
                            </div>
                        )}

                        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
                            <label className="bg-slate-800/90 hover:bg-slate-700 text-white font-black py-2.5 px-5 rounded-xl shadow-xl transition-all text-[10px] tracking-widest uppercase border border-white/10 cursor-pointer flex items-center gap-2">
                                <Upload size={12} />
                                <span>Upload QR Image</span>
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        try {
                                            const { processQrImageFile } = await import('../utils/qrFileScanner');
                                            const result = await processQrImageFile(file);
                                            toast.success("QR read successfully from image.");
                                            dispatchHardwareScan(result, "QR Image File");
                                            onScan(result);
                                            onClose();
                                        } catch (err: any) {
                                            toast.error(err.message || 'Failed to read QR code');
                                        }
                                    }
                                }} />
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QrScannerModal;
