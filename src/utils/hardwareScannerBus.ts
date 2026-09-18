// Hardware USB & Bluetooth Scanner Event Bus & Driver Interceptor

export interface HardwareScanResult {
    code: string;
    raw: string;
    source: string;
    timestamp: number;
    parsedId?: string;
    parsedPayload?: any;
}

// POS Barcode Scanner Audio Confirmation Beep
export const playScannerBeep = (pitch: 'success' | 'warning' | 'error' = 'success') => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (pitch === 'success') {
            // Crisp, pleasant double-chirp typical of Honeywell / Zebra POS scanners
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2000, ctx.currentTime);
            osc.frequency.setValueAtTime(2500, ctx.currentTime + 0.04);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.12);
        } else if (pitch === 'warning') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1100, ctx.currentTime);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(450, ctx.currentTime);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch (e) {
        // AudioContext may be blocked before first user gesture
    }
};

// Parse QR/Barcode raw string (handles JSON, URLs, Key-Value, and pure serials)
export const parseBarcodePayload = (raw: string): { cleanCode: string; parsedId?: string; parsedPayload?: any } => {
    if (!raw) return { cleanCode: '' };
    const trimmed = raw.trim();

    // 1. JSON Payload Check (e.g. {"id":"EMP-102","name":"John"})
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            const parsed = JSON.parse(trimmed);
            const extractedId = parsed.id || parsed.workerId || parsed.employeeId || parsed.barcode || parsed.serialNumber || parsed.code;
            if (extractedId) {
                return {
                    cleanCode: String(extractedId).trim(),
                    parsedId: String(extractedId).trim(),
                    parsedPayload: parsed,
                };
            }
            return {
                cleanCode: trimmed,
                parsedPayload: parsed,
            };
        } catch (e) {
            // Not JSON
        }
    }

    // 2. URL Check with Query Params (e.g. https://...?workerId=EMP-102)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            const url = new URL(trimmed);
            const paramId = url.searchParams.get('workerId') || 
                            url.searchParams.get('id') || 
                            url.searchParams.get('code') || 
                            url.searchParams.get('barcode');
            if (paramId) {
                return {
                    cleanCode: paramId.trim(),
                    parsedId: paramId.trim(),
                    parsedPayload: { url: trimmed },
                };
            }
        } catch (e) {}
    }

    // 3. Prefix stripping (e.g. ID: EMP-101 or PRE_BIND_EMP-101)
    if (trimmed.toUpperCase().startsWith('ID:')) {
        const clean = trimmed.substring(3).trim();
        return { cleanCode: clean, parsedId: clean };
    }

    return {
        cleanCode: trimmed,
        parsedId: trimmed,
    };
};

// Retrieve active adopted scanner from storage
export const getActiveAdoptedScanner = () => {
    try {
        const hwStr = localStorage.getItem('hardware_devices');
        const selectedId = localStorage.getItem('agrimap_selected_scanner');
        if (hwStr) {
            const devices = JSON.parse(hwStr);
            const scanners = devices.filter((d: any) => d.type === 'scanner');
            if (scanners.length > 0) {
                const active = scanners.find((s: any) => s.id === selectedId) || scanners[0];
                return active;
            }
        }
    } catch (e) {}
    return null;
};

// Global Dispatcher for Hardware Scanners
export const dispatchHardwareScan = (rawCode: string, sourceName?: string) => {
    if (!rawCode || typeof rawCode !== 'string') return;
    const { cleanCode, parsedId, parsedPayload } = parseBarcodePayload(rawCode);
    const activeScanner = getActiveAdoptedScanner();
    const source = sourceName || activeScanner?.name || 'USB HID Scanner';

    const result: HardwareScanResult = {
        code: cleanCode,
        raw: rawCode,
        source,
        timestamp: Date.now(),
        parsedId,
        parsedPayload,
    };

    // Store in localStorage for audit & active access
    try {
        localStorage.setItem('agrimap_last_scanner_code', cleanCode);
        localStorage.setItem('agrimap_last_scan_time', String(Date.now()));
        localStorage.setItem('agrimap_last_scan_source', source);
    } catch (e) {}

    playScannerBeep('success');

    // Dispatch Custom Event
    const evt = new CustomEvent('agrimap:hardware_scan', { detail: result });
    window.dispatchEvent(evt);

    return result;
};

// Global Keyboard Wedge Listener for USB & Bluetooth Scanners
let isGlobalListenerInitialized = false;

export const initGlobalHardwareScannerListener = () => {
    if (typeof window === 'undefined' || isGlobalListenerInitialized) return;
    isGlobalListenerInitialized = true;

    let buffer = '';
    let lastKeyTime = 0;
    let keyIntervals: number[] = [];

    window.addEventListener('keydown', (e: KeyboardEvent) => {
        const now = performance.now();
        const interval = now - lastKeyTime;
        lastKeyTime = now;

        // Enter or Tab typically terminates a barcode scan from physical wedge scanners
        if (e.key === 'Enter' || e.key === 'Tab') {
            // Check if characters were typed rapidly (average interval < 60ms) or buffer length >= 3
            const avgInterval = keyIntervals.length > 0 
                ? keyIntervals.reduce((a, b) => a + b, 0) / keyIntervals.length 
                : 999;
            
            const isRapidTyping = (avgInterval < 60 && buffer.length >= 3) || buffer.length >= 6;

            if (buffer.length >= 3 && (isRapidTyping || !isInsideInteractiveInput(e.target))) {
                const scannedText = buffer.trim();
                buffer = '';
                keyIntervals = [];

                if (scannedText) {
                    // Suppress enter event from submitting unrelated forms
                    e.preventDefault();
                    e.stopPropagation();
                    dispatchHardwareScan(scannedText);
                }
                return;
            }

            // Reset
            buffer = '';
            keyIntervals = [];
            return;
        }

        // Only single printable characters
        if (e.key && e.key.length === 1) {
            // If typing into an input very slowly, do not accumulate as scanner wedge
            if (isInsideInteractiveInput(e.target) && interval > 150) {
                buffer = '';
                keyIntervals = [];
                return;
            }

            buffer += e.key;
            keyIntervals.push(interval);

            // Cap buffer to avoid memory leaks
            if (buffer.length > 256) {
                buffer = buffer.slice(-128);
                keyIntervals = keyIntervals.slice(-128);
            }
        }
    }, true); // Capture phase to intercept wedge input before form handlers
};

const isInsideInteractiveInput = (target: EventTarget | null): boolean => {
    if (!target) return false;
    const el = target as HTMLElement;
    const tagName = el.tagName?.toUpperCase();
    if (tagName === 'TEXTAREA' || tagName === 'SELECT') return true;
    if (tagName === 'INPUT') {
        const inputType = (el as HTMLInputElement).type?.toLowerCase();
        // Allow scanner accumulation even inside text inputs if burst is fast
        return inputType === 'text' || inputType === 'search' || inputType === 'number';
    }
    return el.isContentEditable || false;
};
