import React, { useState } from 'react';
import { db, collection, addDoc, updateDoc, deleteDoc, doc } from '../firebase';
import type { Crop } from '../types';
import { XIcon, PlusIcon, TrashIcon, CheckIcon, LeafIcon } from './Icons';
import { toast } from 'sonner';
import { handleFirestoreError } from '../lib/firebaseUtils';

interface CropManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    crops: Crop[];
    organizationId: string;
}

const CropManagementModal: React.FC<CropManagementModalProps> = ({ isOpen, onClose, crops, organizationId }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
    const [newCropName, setNewCropName] = useState('');
    const [newVarieties, setNewVarieties] = useState<string[]>([]);
    const [currentVarietyInput, setCurrentVarietyInput] = useState('');

    if (!isOpen) return null;

    const handleSaveCrop = async () => {
        if (!newCropName.trim()) {
            toast.error("Crop name is required");
            return;
        }

        try {
            if (editingCrop) {
                await updateDoc(doc(db, 'crops', editingCrop.id), {
                    name: newCropName.trim(),
                    varieties: newVarieties
                });
                toast.success("Crop updated");
            } else {
                await addDoc(collection(db, 'crops'), {
                    name: newCropName.trim(),
                    varieties: newVarieties,
                    organizationId
                });
                toast.success("Crop added");
            }
            resetForm();
        } catch (error) {
            handleFirestoreError(error, 'write' as any, 'crops');
        }
    };

    const handleDeleteCrop = async (id: string) => {
        if (!window.confirm("Are you sure? This will remove this crop and its varieties from the system.")) return;
        try {
            await deleteDoc(doc(db, 'crops', id));
            toast.success("Crop deleted");
        } catch (error) {
            handleFirestoreError(error, 'delete' as any, `crops/${id}`);
        }
    };

    const resetForm = () => {
        setIsAdding(false);
        setEditingCrop(null);
        setNewCropName('');
        setNewVarieties([]);
        setCurrentVarietyInput('');
    };

    const addVariety = () => {
        if (currentVarietyInput.trim() && !newVarieties.includes(currentVarietyInput.trim())) {
            setNewVarieties([...newVarieties, currentVarietyInput.trim()]);
            setCurrentVarietyInput('');
        }
    };

    const removeVariety = (v: string) => {
        setNewVarieties(newVarieties.filter(item => item !== v));
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[5000] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-black text-2xl text-slate-800 uppercase tracking-tight">Crops & Varieties / კულტურები და ჯიშები</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage your agricultural products / აგრო პროდუქტების და ჯიშების მართვა</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                        <XIcon className="h-6 w-6 text-slate-400" />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    {isAdding || editingCrop ? (
                        <div className="space-y-6 animate-slide-up">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Crop Name / კულტურის სახელი</label>
                                <input 
                                    type="text"
                                    value={newCropName}
                                    onChange={(e) => setNewCropName(e.target.value)}
                                    placeholder="e.g. Blueberry, Hazelnut / მაგ. მოცვი, თხილი"
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Varieties / ჯიშები</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        value={currentVarietyInput}
                                        onChange={(e) => setCurrentVarietyInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addVariety()}
                                        placeholder="Add variety name / ჯიშის სახელი..."
                                        className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                                    />
                                    <button 
                                        onClick={addVariety}
                                        className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-90 transition-all cursor-pointer"
                                    >
                                        <PlusIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {newVarieties.map(v => (
                                        <div key={v} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 flex items-center gap-2 group">
                                            <span className="text-sm font-bold uppercase tracking-tight">{v}</span>
                                            <button onClick={() => removeVariety(v)} className="p-1 hover:bg-blue-100 rounded-full transition-colors cursor-pointer">
                                                <TrashIcon className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {newVarieties.length === 0 && (
                                        <p className="text-[10px] font-bold text-slate-400 uppercase italic">No varieties added yet / ჯიშები ჯერ არ არის დამატებული.</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    onClick={handleSaveCrop}
                                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all cursor-pointer"
                                >
                                    {editingCrop ? 'Update Crop / განახლება' : 'Save New Crop / შენახვა'}
                                </button>
                                <button 
                                    onClick={resetForm}
                                    className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs transition-all cursor-pointer"
                                >
                                    Cancel / გაუქმება
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Crops / აქტიური კულტურები: {crops.length}</p>
                                <button 
                                    onClick={() => setIsAdding(true)}
                                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 active:scale-95 transition-all cursor-pointer"
                                >
                                    <PlusIcon className="h-4 w-4" /> Add Crop / კულტურის დამატება
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {crops.map(crop => (
                                    <div key={crop.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:border-blue-200 transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-white rounded-2xl shadow-sm">
                                                    <LeafIcon className="h-5 w-5 text-emerald-500" />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-lg text-slate-800 uppercase tracking-tighter">{crop.name}</h4>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{crop.varieties?.length || 0} Varieties / ჯიში</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => {
                                                        setEditingCrop(crop);
                                                        setNewCropName(crop.name);
                                                        setNewVarieties(crop.varieties || []);
                                                    }}
                                                    className="p-2.5 bg-white text-slate-600 rounded-xl shadow-sm hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100 cursor-pointer"
                                                >
                                                    <PlusIcon className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteCrop(crop.id)}
                                                    className="p-2.5 bg-white text-slate-600 rounded-xl shadow-sm hover:bg-red-50 hover:text-red-600 transition-all border border-slate-100 cursor-pointer"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {crop.varieties?.map(v => (
                                                <span key={v} className="px-3 py-1 bg-white text-slate-500 text-[10px] font-bold rounded-lg border border-slate-100 uppercase tracking-tight">{v}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {crops.length === 0 && (
                                    <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                        <LeafIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                        <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">No crops defined yet / კულტურები არ არის შეყვანილი</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-slate-50 border-t flex items-center justify-between">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest max-w-[200px]">Changes are visible across all modules instantly / ცვლილებები მყისიერად აისახება სისტემაში.</p>
                    <button onClick={onClose} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all cursor-pointer">Close / დახურვა</button>
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default CropManagementModal;
