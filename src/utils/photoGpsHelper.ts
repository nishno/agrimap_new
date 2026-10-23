import exifr from 'exifr';
import type { PhotoGpsPin } from './demTerrainViewshed';
import { safeStorage } from '../services/storageService';

const STORAGE_KEY = 'agrimap_sandbox_photo_gps_pins';

export interface ExtractedPhotoResult {
    dataUrl: string;
    fileName: string;
    lat: number;
    lng: number;
    altitudeM: number;
    azimuthDeg: number;
    timestamp: string;
    hasExifGps: boolean;
    fileSizeKB: number;
}

/**
 * Parses an image file and extracts EXIF GPS coordinates, altitude, and compass heading.
 */
export async function extractPhotoMetadata(
    file: File,
    fallbackLat: number = 41.9023,
    fallbackLng: number = 44.5000
): Promise<ExtractedPhotoResult> {
    // 1. Convert file to Data URL
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });

    let lat = fallbackLat;
    let lng = fallbackLng;
    let altitudeM = 485;
    let azimuthDeg = 45;
    let hasExifGps = false;
    let timestamp = new Date().toLocaleString();

    try {
        const exif = await exifr.parse(file, {
            gps: true,
            tiff: true,
            exif: true
        });

        if (exif) {
            if (typeof exif.latitude === 'number' && typeof exif.longitude === 'number' && !isNaN(exif.latitude)) {
                lat = Number(exif.latitude.toFixed(6));
                lng = Number(exif.longitude.toFixed(6));
                hasExifGps = true;
            }

            if (typeof exif.GPSAltitude === 'number' && !isNaN(exif.GPSAltitude)) {
                altitudeM = Math.round(exif.GPSAltitude);
            }

            // Compass heading / viewing angle
            if (typeof exif.GPSImgDirection === 'number' && !isNaN(exif.GPSImgDirection)) {
                azimuthDeg = Math.round(exif.GPSImgDirection);
            } else if (typeof exif.GPSDestBearing === 'number' && !isNaN(exif.GPSDestBearing)) {
                azimuthDeg = Math.round(exif.GPSDestBearing);
            }

            if (exif.DateTimeOriginal) {
                try {
                    timestamp = new Date(exif.DateTimeOriginal).toLocaleString();
                } catch (_) {}
            }
        }
    } catch (e) {
        console.warn('Could not parse EXIF metadata from photo:', e);
    }

    return {
        dataUrl,
        fileName: file.name,
        lat,
        lng,
        altitudeM,
        azimuthDeg,
        timestamp,
        hasExifGps,
        fileSizeKB: Math.round(file.size / 1024)
    };
}

export function loadSavedPhotoPins(): PhotoGpsPin[] {
    const raw = safeStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

export function savePhotoPins(pins: PhotoGpsPin[]): void {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
}
