import React, { useMemo, useRef } from 'react';
import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import { ArrowRight, Sprout, Briefcase, UserCheck, Building2 } from 'lucide-react';
import type { MapCheckpointItem } from './communicatorData';
import { formatContractLabel } from './communicatorData';

interface MapCheckpointsLayerProps {
    checkpoints: MapCheckpointItem[];
    selectedCheckpointId?: string | null;
    onOpenDetails: (checkpoint: MapCheckpointItem) => void;
    isKa?: boolean;
}

function createCheckpointPinIcon(checkpoint: MapCheckpointItem, isSelected: boolean): L.DivIcon {
    const isHiring = checkpoint.kind === 'company_hiring';
    const isOffer = checkpoint.kind === 'service_offer';
    const announcementCount = checkpoint.announcements.length;

    const bgColor = isOffer ? '#2563eb' : isHiring ? '#d97706' : '#059669';
    const ringColor = isSelected ? '#0f172a' : '#ffffff';
    const scale = isSelected ? 1.15 : 1;

    const iconSvg = isOffer
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>`
        : isHiring
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>`;

    const countBadge =
        announcementCount > 0 && checkpoint.recipientType === 'org'
            ? `<span style="position:absolute;top:-5px;right:-5px;min-width:17px;height:17px;padding:0 4px;border-radius:9999px;background:#0f172a;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);">${announcementCount}</span>`
            : '';

    const html = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:scale(${scale});transition:transform 160ms cubic-bezier(0.16,1,0.3,1);">
            <div style="position:relative;width:36px;height:36px;border-radius:14px 14px 14px 4px;transform:rotate(-45deg);background:${bgColor};border:2.5px solid ${ringColor};box-shadow:0 8px 20px rgba(15,23,42,0.32);display:flex;align-items:center;justify-content:center;">
                <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;">
                    ${iconSvg}
                </div>
            </div>
            ${countBadge}
        </div>
    `;

    return L.divIcon({
        html,
        className: 'agrimap-checkpoint-pin',
        iconSize: [38, 42],
        iconAnchor: [19, 38],
        popupAnchor: [0, -36]
    });
}

const CheckpointPinMarker: React.FC<{
    checkpoint: MapCheckpointItem;
    isSelected: boolean;
    onOpenDetails: (checkpoint: MapCheckpointItem) => void;
    isKa: boolean;
}> = ({ checkpoint, isSelected, onOpenDetails, isKa }) => {
    const markerRef = useRef<L.Marker | null>(null);
    const closeTimerRef = useRef<number | null>(null);
    const isPinnedRef = useRef(false);

    const icon = useMemo(
        () => createCheckpointPinIcon(checkpoint, isSelected),
        [checkpoint.id, checkpoint.kind, checkpoint.announcements.length, isSelected]
    );

    const cancelClose = () => {
        if (closeTimerRef.current !== null) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    };

    const scheduleClose = () => {
        if (isPinnedRef.current) return;
        cancelClose();
        closeTimerRef.current = window.setTimeout(() => {
            markerRef.current?.closePopup();
        }, 320);
    };

    const primaryAnn = checkpoint.primaryAnnouncement;
    const isHiring = checkpoint.kind === 'company_hiring';
    const isOffer = checkpoint.kind === 'service_offer';

    return (
        <Marker
            ref={markerRef}
            position={checkpoint.coordinates}
            icon={icon}
            zIndexOffset={isSelected ? 1200 : isHiring ? 900 : 800}
            eventHandlers={{
                mouseover: (e) => {
                    cancelClose();
                    e.target.openPopup();
                },
                mouseout: () => {
                    scheduleClose();
                },
                click: (e) => {
                    cancelClose();
                    isPinnedRef.current = true;
                    e.target.openPopup();
                },
                popupclose: () => {
                    isPinnedRef.current = false;
                }
            }}
        >
            <Popup
                closeButton={false}
                autoPan={false}
                offset={[0, -6]}
                className="agrimap-checkpoint-hover-popup"
            >
                <div
                    className="w-[248px] bg-white rounded-xl overflow-hidden text-slate-900 select-none"
                    onMouseEnter={cancelClose}
                    onMouseLeave={scheduleClose}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-3.5 space-y-2.5">
                        {/* Entity / Company Name & Kind */}
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                                    {isOffer ? (
                                        <UserCheck size={12} className="text-blue-600 shrink-0" />
                                    ) : isHiring ? (
                                        <Briefcase size={12} className="text-amber-600 shrink-0" />
                                    ) : (
                                        <Building2 size={12} className="text-emerald-600 shrink-0" />
                                    )}
                                    <span className="truncate">
                                        {isOffer
                                            ? (isKa ? 'სერვისის შეთავაზება' : 'Service Offer')
                                            : isHiring
                                                ? (isKa ? 'ვაკანსია / სერვისის ძიება' : 'Looking for Work / Service')
                                                : (isKa ? 'პლანტაცია / კომპანია' : 'Plantation / Company')}
                                    </span>
                                </p>
                                <h4 className="text-sm font-bold text-slate-900 leading-snug mt-0.5 truncate">
                                    {checkpoint.name}
                                </h4>
                            </div>
                        </div>

                        {/* Agriculture / Plants Type */}
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                            <div className="flex items-start gap-1.5 text-xs">
                                <Sprout size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    <span className="text-slate-500 font-medium">
                                        {isKa ? 'კულტურა: ' : 'Agriculture: '}
                                    </span>
                                    <span className="font-semibold text-slate-800">
                                        {checkpoint.agricultureType}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 tabular-nums">
                                <span className="truncate">{checkpoint.region}</span>
                                {checkpoint.areaHa > 0 && (
                                    <>
                                        <span aria-hidden="true">·</span>
                                        <span className="whitespace-nowrap font-medium text-slate-700">
                                            {checkpoint.areaHa} ha
                                        </span>
                                    </>
                                )}
                                {primaryAnn?.announcementData?.workType && (
                                    <>
                                        <span aria-hidden="true">·</span>
                                        <span className="truncate font-medium text-amber-700">
                                            {primaryAnn.announcementData.workType}
                                        </span>
                                    </>
                                )}
                            </div>

                            {primaryAnn?.announcementData?.contractType && (
                                <p className="text-[11px] text-slate-500 truncate">
                                    {formatContractLabel(
                                        primaryAnn.announcementData.contractType,
                                        primaryAnn.announcementData.customContractLabel,
                                        isKa
                                    )}
                                    {primaryAnn.announcementData.compensation
                                        ? ` · ${primaryAnn.announcementData.compensation}`
                                        : ''}
                                </p>
                            )}
                        </div>

                        {/* Interactive See More Details Button */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                markerRef.current?.closePopup();
                                onOpenDetails(checkpoint);
                            }}
                            className="w-full mt-1 py-2 px-3 bg-slate-900 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        >
                            <span>{isKa ? 'მეტი დეტალის ნახვა' : 'See More Details'}</span>
                            <ArrowRight size={13} />
                        </button>
                    </div>
                </div>
            </Popup>
        </Marker>
    );
};

export const MapCheckpointsLayer: React.FC<MapCheckpointsLayerProps> = ({
    checkpoints,
    selectedCheckpointId,
    onOpenDetails,
    isKa = false
}) => {
    return (
        <>
            {checkpoints.map(cp => (
                <CheckpointPinMarker
                    key={cp.id}
                    checkpoint={cp}
                    isSelected={selectedCheckpointId === cp.id}
                    onOpenDetails={onOpenDetails}
                    isKa={isKa}
                />
            ))}
        </>
    );
};

export default MapCheckpointsLayer;
