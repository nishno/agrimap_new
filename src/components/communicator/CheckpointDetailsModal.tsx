import React from 'react';
import {
    X,
    Phone,
    Mail,
    MapPin,
    Sprout,
    Maximize2,
    Briefcase,
    MessageSquare,
    Ticket,
    Copy,
    Building2,
    UserCheck,
    Clock,
    Navigation
} from 'lucide-react';
import { toast } from 'sonner';
import type { ForumPost } from '../../types';
import type { MapCheckpointItem } from './communicatorData';
import { formatContractLabel } from './communicatorData';

interface CheckpointDetailsModalProps {
    checkpoint: MapCheckpointItem | null;
    onClose: () => void;
    onSendMessage: (checkpoint: MapCheckpointItem, announcement?: ForumPost) => void;
    onSendTicket: (checkpoint: MapCheckpointItem, announcement?: ForumPost) => void;
    onFocusOnMap: (checkpoint: MapCheckpointItem) => void;
    isKa?: boolean;
}

export const CheckpointDetailsModal: React.FC<CheckpointDetailsModalProps> = ({
    checkpoint,
    onClose,
    onSendMessage,
    onSendTicket,
    onFocusOnMap,
    isKa = false
}) => {
    if (!checkpoint) return null;

    const isOffer = checkpoint.kind === 'service_offer';
    const isHiring = checkpoint.announcements.some(a => a.announcementData?.category === 'company_hiring');

    const copyText = (val: string, label: string) => {
        if (!val) return;
        navigator.clipboard?.writeText(val);
        toast.success(isKa ? `${label} დაკოპირდა` : `${label} copied`);
    };

    return (
        <div
            className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/70">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                            {isOffer ? (
                                <UserCheck size={14} className="text-blue-600 shrink-0" />
                            ) : (
                                <Building2 size={14} className="text-emerald-600 shrink-0" />
                            )}
                            <span>
                                {isOffer
                                    ? (isKa ? 'სერვისის მიმწოდებელი' : 'Service Provider')
                                    : (isKa ? 'კომპანია / პლანტაცია' : 'Company & Plantation')}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{checkpoint.region}</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mt-1 leading-tight">
                            {checkpoint.name}
                        </h3>
                        {checkpoint.subtitle && (
                            <p className="text-xs text-slate-500 mt-0.5">{checkpoint.subtitle}</p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
                        aria-label="Close details"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Key Stats & Contact Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Contact Info */}
                        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                            <h4 className="text-xs font-semibold text-slate-500">
                                {isKa ? 'საკონტაქტო ინფორმაცია' : 'Contact Information'}
                            </h4>

                            <div className="space-y-2.5 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Phone size={15} className="text-emerald-600 shrink-0" />
                                        {checkpoint.phone ? (
                                            <a
                                                href={`tel:${checkpoint.phone}`}
                                                className="font-medium text-slate-900 hover:text-emerald-700 truncate tabular-nums"
                                            >
                                                {checkpoint.phone}
                                            </a>
                                        ) : (
                                            <span className="text-slate-400 text-xs">
                                                {isKa ? 'ტელეფონი არ არის მითითებული' : 'Phone not listed'}
                                            </span>
                                        )}
                                    </div>
                                    {checkpoint.phone && (
                                        <button
                                            type="button"
                                            onClick={() => copyText(checkpoint.phone, isKa ? 'ტელეფონი' : 'Phone')}
                                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                                            title={isKa ? 'კოპირება' : 'Copy phone'}
                                        >
                                            <Copy size={13} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Mail size={15} className="text-blue-600 shrink-0" />
                                        {checkpoint.email ? (
                                            <a
                                                href={`mailto:${checkpoint.email}`}
                                                className="font-medium text-slate-900 hover:text-blue-700 truncate"
                                            >
                                                {checkpoint.email}
                                            </a>
                                        ) : (
                                            <span className="text-slate-400 text-xs">
                                                {isKa ? 'ელ-ფოსტა არ არის მითითებული' : 'Email not listed'}
                                            </span>
                                        )}
                                    </div>
                                    {checkpoint.email && (
                                        <button
                                            type="button"
                                            onClick={() => copyText(checkpoint.email, isKa ? 'ელ-ფოსტა' : 'Email')}
                                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                                            title={isKa ? 'კოპირება' : 'Copy email'}
                                        >
                                            <Copy size={13} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2.5 text-xs text-slate-500 pt-1">
                                    <MapPin size={14} className="text-slate-400 shrink-0" />
                                    <span className="tabular-nums">
                                        {checkpoint.region} ({checkpoint.coordinates[0].toFixed(4)}, {checkpoint.coordinates[1].toFixed(4)})
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Plantation Area & Overview */}
                        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                            <h4 className="text-xs font-semibold text-slate-500">
                                {isKa ? 'პლანტაციის ფართობი და კულტურა' : 'Plantation Area & Agriculture'}
                            </h4>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <Maximize2 size={12} className="text-emerald-600" />
                                        <span>{isKa ? 'ფართობი' : 'Total Area'}</span>
                                    </p>
                                    <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                                        {checkpoint.areaHa > 0 ? `${checkpoint.areaHa} ha` : (isKa ? 'N/A' : 'Not specified')}
                                    </p>
                                    {checkpoint.sectorCount > 0 && (
                                        <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                                            {checkpoint.sectorCount} {isKa ? 'სექტორი რუკაზე' : 'mapped sectors'}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <Sprout size={12} className="text-emerald-600" />
                                        <span>{isKa ? 'ძირითადი მიმართულება' : 'Primary Plants'}</span>
                                    </p>
                                    <p className="text-sm font-semibold text-slate-900 mt-1 leading-snug">
                                        {checkpoint.agricultureType}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Crops & Varieties Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                <Sprout size={16} className="text-emerald-600" />
                                <span>{isKa ? 'კულტურები და ჯიშები' : 'Crops & Varieties'}</span>
                            </h4>
                            <span className="text-xs text-slate-500 tabular-nums">
                                {checkpoint.cropsAndVarieties.length} {isKa ? 'კულტურა' : checkpoint.cropsAndVarieties.length === 1 ? 'crop' : 'crops'}
                            </span>
                        </div>

                        {checkpoint.cropsAndVarieties.length === 0 ? (
                            <p className="text-sm text-slate-500 py-3 border-t border-slate-100">
                                {isKa
                                    ? `ძირითადი მიმართულება: ${checkpoint.agricultureType} (კონკრეტული ჯიშები ჯერ არ არის დამატებული).`
                                    : `Primary agriculture: ${checkpoint.agricultureType}. Specific varieties have not been registered yet.`}
                            </p>
                        ) : (
                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                                {checkpoint.cropsAndVarieties.map((entry, idx) => (
                                    <div key={`${entry.crop}-${idx}`} className="px-4 py-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <span className="text-sm font-semibold text-slate-900">
                                            {entry.crop}
                                        </span>
                                        <span className="text-xs text-slate-600">
                                            {entry.varieties.length > 0
                                                ? entry.varieties.join(' · ')
                                                : (isKa ? 'სტანდარტული ჯიში' : 'Standard variety')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Work / Service Needs OR Service Offered Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                <Briefcase size={16} className={isOffer ? 'text-blue-600' : 'text-amber-600'} />
                                <span>
                                    {isOffer
                                        ? (isKa ? 'შეთავაზებული სერვისი / სამუშაო' : 'Service / Work Offered')
                                        : (isKa ? 'რა ტიპის სამუშაოს ან სერვისს ეძებენ' : 'Work & Services They Are Looking For')}
                                </span>
                            </h4>
                            <span className="text-xs text-slate-500 tabular-nums">
                                {checkpoint.announcements.length} {isKa ? 'აქტიური განცხადება' : 'active'}
                            </span>
                        </div>

                        {checkpoint.announcements.length === 0 ? (
                            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                                <p className="text-sm text-slate-700 font-medium">
                                    {isKa
                                        ? 'ამჟამად ღია ვაკანსია არ არის გამოქვეყნებული.'
                                        : 'No specific job announcement is currently posted for this plantation.'}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {isKa
                                        ? 'შეგიძლიათ გაუგზავნოთ პირდაპირი შეტყობინება ან ტიკეტი თქვენი სერვისის შესათავაზებლად.'
                                        : 'You can still send a direct message or submit an official ticket to offer your services or inquire about seasonal work.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {checkpoint.announcements.map(ann => {
                                    const ad = ann.announcementData!;
                                    return (
                                        <div
                                            key={ann.id}
                                            className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h5 className="text-sm font-bold text-slate-900 leading-snug">
                                                        {ann.title || ad.workType}
                                                    </h5>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1">
                                                        <span className="font-semibold text-amber-700">{ad.workType}</span>
                                                        <span aria-hidden="true">·</span>
                                                        <span className="inline-flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {formatContractLabel(ad.contractType, ad.customContractLabel, isKa)}
                                                        </span>
                                                        {ad.workersNeeded && ad.workersNeeded > 0 && (
                                                            <>
                                                                <span aria-hidden="true">·</span>
                                                                <span className="tabular-nums">
                                                                    {ad.workersNeeded} {isKa ? 'პოზიცია' : ad.workersNeeded === 1 ? 'position' : 'positions'}
                                                                </span>
                                                            </>
                                                        )}
                                                        {ad.compensation && (
                                                            <>
                                                                <span aria-hidden="true">·</span>
                                                                <span className="font-semibold text-emerald-700 tabular-nums">
                                                                    {ad.compensation}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => onSendTicket(checkpoint, ann)}
                                                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                                >
                                                    {isKa ? 'გამოხმაურება (ტიკეტი)' : 'Apply / Ticket'}
                                                </button>
                                            </div>
                                            {ann.content && (
                                                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                                    {ann.content}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            onFocusOnMap(checkpoint);
                            onClose();
                        }}
                        className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                        <Navigation size={14} />
                        <span>{isKa ? 'რუკაზე ჩვენება' : 'Focus on Map'}</span>
                    </button>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => onSendMessage(checkpoint, checkpoint.primaryAnnouncement)}
                            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        >
                            <MessageSquare size={14} />
                            <span>{isKa ? 'შეტყობინების გაგზავნა' : 'Send Message'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onSendTicket(checkpoint, checkpoint.primaryAnnouncement)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                        >
                            <Ticket size={14} />
                            <span>
                                {isHiring
                                    ? (isKa ? 'ტიკეტის გაგზავნა / შეთავაზება' : 'Send Ticket / Offer Service')
                                    : (isKa ? 'ტიკეტის გაგზავნა' : 'Send Ticket')}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckpointDetailsModal;
