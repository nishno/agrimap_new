
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import { XCircleIcon, BellIcon, AtSignIcon, HashIcon, CheckIcon, TrashIcon } from './Icons';
import { Alert, JoinRequest, User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface NotificationHubProps {
    isOpen: boolean;
    onClose: () => void;
    alerts: Alert[];
    onClearAll: () => void;
    onMarkAsRead: (id: string) => void;
    onAlertClick: (alert: Alert) => void;
    currentUser: User | null;
    joinRequests?: JoinRequest[];
    onApproveJoinRequest?: (request: JoinRequest) => Promise<void> | void;
    onDeclineJoinRequest?: (request: JoinRequest) => Promise<void> | void;
}

export const NotificationHub: React.FC<NotificationHubProps> = ({
    isOpen,
    onClose,
    alerts,
    onClearAll,
    onMarkAsRead,
    onAlertClick,
    currentUser,
    joinRequests = [],
    onApproveJoinRequest,
    onDeclineJoinRequest
}) => {
    const { language } = useLanguage();
    const isKa = language === 'ka';
    const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
    const pendingJoinRequests = joinRequests.filter(r => r.status === 'pending');
    const totalCount = alerts.length + pendingJoinRequests.length;
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[4000]"
                    />
                    <motion.div 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[4001] flex flex-col pt-safe"
                    >
                        <div className="p-8 border-b flex justify-between items-center bg-slate-900 text-white">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                    <BellIcon className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black uppercase tracking-tight leading-none">Notifications</h2>
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Updates & Alerts</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-2xl transition-colors">
                                <XCircleIcon className="h-8 w-8 text-white/30" />
                            </button>
                        </div>

                        <div className="p-4 bg-slate-50 border-b flex justify-between items-center px-8">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                {totalCount} {isKa ? 'შეტყობინება' : 'New Alerts'}
                            </span>
                            <button 
                                onClick={onClearAll}
                                className="flex items-center gap-1.5 text-[10px] font-black text-red-600 uppercase tracking-widest hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <TrashIcon size={12} /> Clear All
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 px-8">
                            {pendingJoinRequests.length > 0 && (
                                <div className="space-y-3 pb-2 border-b border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                                            <UserPlus className="w-3.5 h-3.5" />
                                            {isKa ? 'გაწევრიანების მოთხოვნები' : 'Pending Join Requests'}
                                        </span>
                                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md tabular-nums">
                                            {pendingJoinRequests.length}
                                        </span>
                                    </div>
                                    {pendingJoinRequests.map(req => {
                                        const isBusy = busyRequestId === req.id;
                                        return (
                                            <div
                                                key={req.id}
                                                className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2.5"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h4 className="font-black text-slate-900 text-xs truncate">{req.userName}</h4>
                                                        {req.userEmail && (
                                                            <p className="text-[11px] text-slate-500 truncate">{req.userEmail}</p>
                                                        )}
                                                        <p className="text-[10px] font-semibold text-slate-500 mt-1">
                                                            {req.organizationName} • {new Date(req.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                {req.message && (
                                                    <p className="text-xs text-slate-600 leading-relaxed">{req.message}</p>
                                                )}
                                                <div className="flex items-center gap-2 pt-1">
                                                    <button
                                                        type="button"
                                                        disabled={isBusy || !onApproveJoinRequest}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (!onApproveJoinRequest) return;
                                                            setBusyRequestId(req.id);
                                                            try {
                                                                await onApproveJoinRequest(req);
                                                            } finally {
                                                                setBusyRequestId(null);
                                                            }
                                                        }}
                                                        className="px-3.5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                                                    >
                                                        {isBusy ? (isKa ? '...' : 'Working...') : (isKa ? 'დადასტურება' : 'Approve')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isBusy || !onDeclineJoinRequest}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (!onDeclineJoinRequest) return;
                                                            setBusyRequestId(req.id);
                                                            try {
                                                                await onDeclineJoinRequest(req);
                                                            } finally {
                                                                setBusyRequestId(null);
                                                            }
                                                        }}
                                                        className="px-3.5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
                                                    >
                                                        {isKa ? 'უარყოფა' : 'Decline'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {alerts.length === 0 && pendingJoinRequests.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-12">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                        <BellIcon className="h-10 w-10 text-slate-300" />
                                    </div>
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">All Caught Up</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 leading-relaxed">No new notifications at the moment.</p>
                                </div>
                            ) : (
                                alerts.map(alert => (
                                    <motion.div 
                                        key={alert.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => onAlertClick(alert)}
                                        className={`p-6 rounded-[2rem] border transition-all relative group cursor-pointer hover:shadow-md ${
                                            alert.type === 'error' ? 'bg-red-50 border-red-100' : 
                                            alert.type === 'warning' ? 'bg-amber-50 border-amber-100' : 
                                            'bg-white border-slate-100 shadow-sm'
                                        }`}
                                    >
                                        <div className="flex gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                alert.type === 'error' ? 'bg-red-100 text-red-600' : 
                                                alert.type === 'warning' ? 'bg-amber-100 text-amber-600' : 
                                                'bg-blue-50 text-blue-600'
                                            }`}>
                                                {alert.content.includes('@') ? <AtSignIcon size={20} /> :
                                                 alert.content.includes('#') ? <HashIcon size={20} /> :
                                                 <BellIcon size={20} />}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-black text-slate-900 text-xs uppercase tracking-tight mb-1">{alert.title}</h4>
                                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                    {renderContentWithMentions(alert.content)}
                                                </p>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4 block">
                                                    {new Date(alert.timestamp).toLocaleTimeString()} • {new Date(alert.timestamp).toLocaleDateString()}
                                                </span>
                                                {alert.metadata?.resolvedStatus === 'approved' || alert.metadata?.resolvedStatus === 'declined' ? (
                                                    <div className="mt-3">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                                                            alert.metadata.resolvedStatus === 'approved'
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                                        }`}>
                                                            {alert.metadata.resolvedStatus === 'approved'
                                                                ? (isKa ? '✓ დადასტურებულია' : '✓ Approved')
                                                                : (isKa ? '✕ უარყოფილია' : '✕ Declined')}
                                                        </span>
                                                    </div>
                                                ) : alert.actions && alert.actions.length > 0 ? (
                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        {alert.actions.map((action, i) => {
                                                            const isDecline = action.actionType === 'decline_join';
                                                            const isApprove = action.actionType === 'approve_join';
                                                            const localizedLabel = isApprove && isKa
                                                                ? 'დადასტურება'
                                                                : isDecline && isKa
                                                                    ? 'უარყოფა'
                                                                    : action.label;
                                                            return (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (onAlertClick) {
                                                                            onAlertClick({ ...alert, metadata: { ...alert.metadata, _clickedAction: action } });
                                                                        }
                                                                    }}
                                                                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors cursor-pointer ${
                                                                        isDecline
                                                                            ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white'
                                                                            : isApprove
                                                                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                                    }`}
                                                                >
                                                                    {localizedLabel}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => onMarkAsRead(alert.id)}
                                            className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-xl"
                                        >
                                            <CheckIcon size={14} />
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        <div className="p-8 border-t bg-slate-50 space-y-4">
                            <div className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <AtSignIcon size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Mention Tips</p>
                                    <p className="text-[9px] text-slate-400 font-medium">Use <span className="font-bold text-indigo-600">@user</span> or <span className="font-bold text-emerald-600">#topic</span> in chats to trigger notifications.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const renderContentWithMentions = (content?: string) => {
    if (!content) return null;
    const parts = content.split(/(@\w+|#\w+)/g);
    return parts.map((part, i) => {
        if (part.startsWith('@')) {
            return <span key={i} className="text-indigo-600 font-black px-1.5 py-0.5 bg-indigo-50 rounded-lg mx-0.5">{part}</span>;
        }
        if (part.startsWith('#')) {
            return <span key={i} className="text-emerald-600 font-black px-1.5 py-0.5 bg-emerald-50 rounded-lg mx-0.5">{part}</span>;
        }
        return part;
    });
};
