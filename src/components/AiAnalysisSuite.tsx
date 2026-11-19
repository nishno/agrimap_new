import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    Archive,
    Beaker,
    Camera,
    CheckCircle2,
    ClipboardList,
    FileText,
    Loader2,
    Plus,
    RefreshCw,
    Save,
    Search,
    Send,
    Sparkles,
    Stethoscope,
    Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import type { NutritionPlan, User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { executeGeminiCall } from '../services/geminiService';
import {
    deleteClinicalRecordTombstone,
    loadClinicalRecords,
    saveClinicalRecord,
    type ClinicalAnalysisType,
    type ClinicalRecipeElement,
    type ClinicalSourceCategory,
    type SavedAgroAnalysisRecord
} from '../services/clinicalAnalysisService';

export interface AiAnalysisSuiteProps {
    mode?: 'full' | 'compact';
    activeOrgId?: string;
    currentUser?: User | null;
    sectorOptions?: string[];
    onAddTask?: (task: any) => void;
    onAddNutritionPlan?: (plan: NutritionPlan) => void | Promise<void>;
}

const SEVERITIES: Array<'Mild' | 'Moderate' | 'Severe' | 'Critical'> = ['Mild', 'Moderate', 'Severe', 'Critical'];
const UNITS = ['kg', 'g', 'L', 'mL', 'kg/ha', 'L/ha', 'g/100L', 'mL/100L'];

const emptyRecipeRow = (): ClinicalRecipeElement => ({
    inventoryItemId: '',
    newItemName: '',
    quantity: 0,
    unit: 'kg/ha'
});

const fileToBase64 = (file: File): Promise<{ mimeType: string; data: string; dataUrl: string }> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result || '');
            const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
            resolve({ mimeType: file.type || 'image/jpeg', data: base64, dataUrl });
        };
        reader.onerror = err => reject(err);
        reader.readAsDataURL(file);
    });

export const AiAnalysisSuite: React.FC<AiAnalysisSuiteProps> = ({
    activeOrgId = '',
    currentUser = null,
    sectorOptions = [],
    onAddNutritionPlan
}) => {
    const { language } = useLanguage();
    const isKa = language === 'ka';

    const canDispatchToAgronomy = Boolean(activeOrgId && activeOrgId !== 'ALL' && onAddNutritionPlan);

    const [activeTab, setActiveTab] = useState<'disease' | 'document' | 'agro_image' | 'archive'>('disease');

    // AI Analysis Input & Result State
    const [analysisTitle, setAnalysisTitle] = useState('');
    const [symptomsOrPrompt, setSymptomsOrPrompt] = useState('');
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
    const [uploadedImagePayload, setUploadedImagePayload] = useState<{ mimeType: string; data: string } | null>(null);
    const [uploadedDocNames, setUploadedDocNames] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Explicit AI-Generated Plan Section (always separated & marked as requiring specialist review)
    const [aiRawResult, setAiRawResult] = useState<any>(null);
    const [aiSummaryText, setAiSummaryText] = useState('');
    const [aiSuggestedPlan, setAiSuggestedPlan] = useState('');

    // Manual / Combined Agronomist Conclusion & Structured Prescription Editor (NO default chemicals/dosages)
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [severity, setSeverity] = useState<'Mild' | 'Moderate' | 'Severe' | 'Critical'>('Moderate');
    const [targetSector, setTargetSector] = useState('');
    const [conclusionNotes, setConclusionNotes] = useState('');
    const [treatmentNotes, setTreatmentNotes] = useState('');
    const [nutritionNotes, setNutritionNotes] = useState('');
    const [preventionNotes, setPreventionNotes] = useState('');
    const [recipeRows, setRecipeRows] = useState<ClinicalRecipeElement[]>([]);

    const [isSaving, setIsSaving] = useState(false);
    const [isDispatching, setIsDispatching] = useState(false);

    // Archive State
    const [archiveRecords, setArchiveRecords] = useState<SavedAgroAnalysisRecord[]>([]);
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [archiveSearch, setArchiveSearch] = useState('');
    const [archiveFilter, setArchiveFilter] = useState<'ALL' | ClinicalSourceCategory>('ALL');
    const [selectedArchiveRecord, setSelectedArchiveRecord] = useState<SavedAgroAnalysisRecord | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const refreshArchive = useCallback(async () => {
        setArchiveLoading(true);
        try {
            const rows = await loadClinicalRecords({
                ownerId: currentUser?.id,
                organizationId: activeOrgId,
                authorName: currentUser?.name
            });
            setArchiveRecords(rows);
        } finally {
            setArchiveLoading(false);
        }
    }, [currentUser?.id, currentUser?.name, activeOrgId]);

    useEffect(() => {
        refreshArchive();
    }, [refreshArchive]);

    const filteredArchive = useMemo(() => {
        const q = archiveSearch.trim().toLowerCase();
        return archiveRecords.filter(r => {
            if (archiveFilter !== 'ALL' && (r.sourceCategory || 'AI-generated') !== archiveFilter) {
                return false;
            }
            if (!q) return true;
            const hay = `${r.title} ${r.agronomistConclusion?.targetSectorOrPlot || ''} ${r.agronomistConclusion?.notes || ''} ${r.sourceCategory || ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [archiveRecords, archiveSearch, archiveFilter]);

    const resetEditor = () => {
        setEditingRecordId(null);
        setAnalysisTitle('');
        setSymptomsOrPrompt('');
        setUploadedImageUrl('');
        setUploadedImagePayload(null);
        setUploadedDocNames([]);
        setAiRawResult(null);
        setAiSummaryText('');
        setAiSuggestedPlan('');
        setSeverity('Moderate');
        setTargetSector('');
        setConclusionNotes('');
        setTreatmentNotes('');
        setNutritionNotes('');
        setPreventionNotes('');
        setRecipeRows([]);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const first = files[0];
        if (first.type.startsWith('image/')) {
            const encoded = await fileToBase64(first);
            setUploadedImageUrl(encoded.dataUrl);
            setUploadedImagePayload({ mimeType: encoded.mimeType, data: encoded.data });
            setUploadedDocNames(Array.from(files).map(f => f.name));
        } else {
            setUploadedDocNames(Array.from(files).map(f => f.name));
            const text = await first.text().catch(() => '');
            if (text) {
                setSymptomsOrPrompt(prev => (prev ? `${prev}\n\n${text.slice(0, 4000)}` : text.slice(0, 4000)));
            }
        }
    };

    const handleRunAiAnalysis = async () => {
        if (!symptomsOrPrompt.trim() && !uploadedImagePayload) {
            toast.error(isKa ? 'შეიყვანეთ სიმპტომები/დოკუმენტი ან ატვირთეთ ფოტო.' : 'Enter symptoms/notes or upload a photo first.');
            return;
        }
        setIsAnalyzing(true);
        try {
            const parts: any[] = [
                {
                    text: [
                        `Task: Agricultural clinical assessment (${activeTab}).`,
                        `Language: ${isKa ? 'Georgian (ka)' : 'English (en)'}.`,
                        `Important safety rules: Do NOT fabricate lab test results, recovery percentages, or unverified chemical dosages. Clearly separate observations from suggested steps and note that every treatment requires licensed agronomist review.`,
                        targetSector ? `Target Sector/Plot: ${targetSector}` : '',
                        `User input:\n${symptomsOrPrompt.trim() || 'Inspect the attached plant/field image.'}`
                    ]
                        .filter(Boolean)
                        .join('\n')
                }
            ];
            if (uploadedImagePayload) {
                parts.push({
                    inlineData: {
                        mimeType: uploadedImagePayload.mimeType,
                        data: uploadedImagePayload.data
                    }
                });
            }

            const resp = await executeGeminiCall({
                contents: [{ role: 'user', parts }]
            });

            const text =
                typeof resp === 'string'
                    ? resp
                    : resp?.text ||
                      resp?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('\n') ||
                      '';

            if (!text.trim()) {
                throw new Error(isKa ? 'AI-მ პასუხი ვერ დააბრუნა.' : 'AI returned an empty response.');
            }

            const title =
                analysisTitle.trim() ||
                (activeTab === 'disease'
                    ? isKa ? 'მცენარის დაავადების AI შეფასება' : 'AI Plant Disease Assessment'
                    : activeTab === 'document'
                    ? isKa ? 'დოკუმენტის AI შეფასება' : 'AI Document Assessment'
                    : isKa ? 'ვიზუალური ინსპექტირების AI შეფასება' : 'AI Field Vision Assessment');

            setAnalysisTitle(title);
            setAiRawResult({ text, model: resp?.model || 'gemini', analyzedAt: new Date().toISOString() });
            setAiSummaryText(text);
            setAiSuggestedPlan(text);

            // Archive every successful AI analysis automatically as AI-generated
            const saved = await saveClinicalRecord({
                ownerId: currentUser?.id,
                organizationId: canDispatchToAgronomy ? activeOrgId : '',
                sourceCategory: 'AI-generated',
                type: activeTab as ClinicalAnalysisType,
                title,
                imageDataUrl: uploadedImageUrl || undefined,
                fileNames: uploadedDocNames.length ? uploadedDocNames : undefined,
                rawAiResult: { text, analyzedAt: new Date().toISOString() },
                agronomistConclusion: {
                    notes: '',
                    severity,
                    prescribedTreatment: '',
                    activeIngredients: [],
                    recommendedDosage: '',
                    prescribedNutrition: '',
                    preventiveMeasures: '',
                    targetSectorOrPlot: targetSector,
                    authorName: currentUser?.name || 'User',
                    authorRole: currentUser?.roles?.[0] || 'User',
                    authorId: currentUser?.id,
                    isVerified: false,
                    updatedAt: new Date().toISOString()
                }
            });

            setEditingRecordId(saved.id);
            await refreshArchive();
            toast.success(isKa ? 'AI ანალიზი დასრულდა და დაარქივდა' : 'AI analysis completed and archived');
        } catch (err: any) {
            toast.error(err?.message || (isKa ? 'AI ანალიზი ვერ შესრულდა' : 'AI analysis failed'));
        } finally {
            setIsAnalyzing(false);
        }
    };

    const resolveSourceCategory = (): ClinicalSourceCategory => {
        const hasAi = Boolean(aiRawResult || aiSummaryText.trim());
        const hasManual = Boolean(
            conclusionNotes.trim() ||
                treatmentNotes.trim() ||
                nutritionNotes.trim() ||
                preventionNotes.trim() ||
                recipeRows.some(r => r.newItemName.trim())
        );
        if (hasAi && hasManual) return 'Combined';
        if (hasManual) return 'Agronomist-created';
        return 'AI-generated';
    };

    const handleAddRecipeRow = () => {
        setRecipeRows(prev => [...prev, emptyRecipeRow()]);
    };

    const handleUpdateRecipeRow = (index: number, patch: Partial<ClinicalRecipeElement>) => {
        setRecipeRows(prev => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
    };

    const handleRemoveRecipeRow = (index: number) => {
        setRecipeRows(prev => prev.filter((_, idx) => idx !== index));
    };

    const buildRecordPayload = () => {
        const cleanedElements = recipeRows
            .filter(r => r.newItemName.trim().length > 0)
            .map(r => ({
                ...r,
                newItemName: r.newItemName.trim(),
                quantity: Number(r.quantity) || 0,
                unit: r.unit || 'kg/ha'
            }));

        const title =
            analysisTitle.trim() ||
            (targetSector.trim()
                ? `${isKa ? 'დანიშნულება' : 'Prescription'} — ${targetSector.trim()}`
                : isKa ? 'აგრონომიული დასკვნა' : 'Agronomist Conclusion');

        const sourceCategory = resolveSourceCategory();

        return {
            id: editingRecordId || undefined,
            ownerId: currentUser?.id,
            organizationId: canDispatchToAgronomy ? activeOrgId : '',
            sourceCategory,
            type: (activeTab === 'archive' ? 'disease' : activeTab) as ClinicalAnalysisType,
            title,
            imageDataUrl: uploadedImageUrl || undefined,
            fileNames: uploadedDocNames.length ? uploadedDocNames : undefined,
            rawAiResult: aiRawResult || { summary: aiSummaryText || '' },
            plan: {
                treatment: treatmentNotes.trim(),
                dosage: cleanedElements.map(e => `${e.newItemName}: ${e.quantity} ${e.unit}`).join('; '),
                nutrition: nutritionNotes.trim(),
                prevention: preventionNotes.trim(),
                elements: cleanedElements
            },
            agronomistConclusion: {
                notes: conclusionNotes.trim(),
                severity,
                prescribedTreatment: treatmentNotes.trim(),
                activeIngredients: cleanedElements.map(e => e.newItemName),
                recommendedDosage: cleanedElements.map(e => `${e.quantity} ${e.unit}`).join(', '),
                prescribedNutrition: nutritionNotes.trim(),
                preventiveMeasures: preventionNotes.trim(),
                targetSectorOrPlot: targetSector.trim(),
                authorName: currentUser?.name || currentUser?.email || 'Agronomist',
                authorRole: currentUser?.roles?.[0] || 'Agronomist',
                authorId: currentUser?.id,
                isVerified: sourceCategory !== 'AI-generated',
                updatedAt: new Date().toISOString()
            }
        };
    };

    const handleSaveOnly = async (): Promise<SavedAgroAnalysisRecord | null> => {
        const hasAnyContent =
            analysisTitle.trim() ||
            conclusionNotes.trim() ||
            treatmentNotes.trim() ||
            nutritionNotes.trim() ||
            preventionNotes.trim() ||
            aiSummaryText.trim() ||
            recipeRows.some(r => r.newItemName.trim());

        if (!hasAnyContent) {
            toast.error(isKa ? 'შეავსეთ დასკვნა ან დანიშნულება შენახვამდე.' : 'Add a conclusion or prescription before saving.');
            return null;
        }

        setIsSaving(true);
        try {
            // Explicitly NEVER executes treatment or deducts inventory
            const saved = await saveClinicalRecord(buildRecordPayload());
            setEditingRecordId(saved.id);
            await refreshArchive();
            toast.success(
                isKa
                    ? 'დასკვნა შენახულია არქივში (მარაგი არ ჩამოწერილა).'
                    : 'Conclusion saved to clinical archive (no treatment executed or stock deducted).'
            );
            return saved;
        } catch (err: any) {
            toast.error(err?.message || (isKa ? 'შენახვა ვერ მოხერხდა' : 'Could not save clinical record'));
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAndDispatchToAgronomy = async () => {
        if (!canDispatchToAgronomy || !onAddNutritionPlan) {
            toast.error(isKa ? 'აგრონომიაში გადაცემა ხელმისაწვდომია მხოლოდ მენეჯმენტისთვის.' : 'Dispatching to Agronomy is restricted to company management.');
            return;
        }

        if (!targetSector.trim()) {
            toast.error(isKa ? 'მიუთითეთ სამიზნე სექტორი აგრონომიაში გადაცემამდე.' : 'Target sector is required before dispatching to Agronomy.');
            return;
        }

        const validElements = recipeRows.filter(r => r.newItemName.trim().length > 0);
        if (validElements.length === 0) {
            toast.error(isKa ? 'დაამატეთ მინიმუმ ერთი პრეპარატი/მასალა რაოდენობით.' : 'Add at least one recipe material with quantity before dispatching.');
            return;
        }

        const missingQty = validElements.find(r => !Number.isFinite(Number(r.quantity)) || Number(r.quantity) <= 0);
        if (missingQty) {
            toast.error(
                isKa
                    ? `მიუთითეთ დადებითი რაოდენობა მასალისთვის: ${missingQty.newItemName}`
                    : `Specify a positive quantity for material: ${missingQty.newItemName}`
            );
            return;
        }

        setIsDispatching(true);
        try {
            const saved = await handleSaveOnly();
            if (!saved) return;

            const stablePlanId = `clinical-${saved.id}`;
            const nowIso = new Date().toISOString();
            const plan: NutritionPlan = {
                id: stablePlanId,
                organizationId: activeOrgId,
                name: `${saved.title} (${targetSector.trim()})`,
                targetFeatureIds: [],
                crop: targetSector.trim(),
                status: 'Planned',
                startDate: nowIso.slice(0, 10),
                endDate: nowIso.slice(0, 10),
                notes: [
                    `Severity: ${severity}`,
                    conclusionNotes.trim() ? `Conclusion: ${conclusionNotes.trim()}` : '',
                    treatmentNotes.trim() ? `Treatment: ${treatmentNotes.trim()}` : '',
                    nutritionNotes.trim() ? `Nutrition: ${nutritionNotes.trim()}` : '',
                    preventionNotes.trim() ? `Prevention: ${preventionNotes.trim()}` : ''
                ]
                    .filter(Boolean)
                    .join('\n'),
                elements: validElements.map(r => ({
                    inventoryItemId: r.inventoryItemId || '',
                    name: r.newItemName.trim(),
                    quantity: Number(r.quantity),
                    unit: r.unit || 'kg/ha'
                })) as any,
                createdAt: saved.createdAt,
                updatedAt: nowIso
            } as NutritionPlan;

            await onAddNutritionPlan(plan);
            toast.success(
                isKa
                    ? 'დანიშნულება შენახულია და გადაეცა აგრონომიის მოდულს (განმეორება განაახლებს იგივე გეგმას).'
                    : 'Prescription saved and dispatched to Agronomy (retrying updates this plan without duplicates).'
            );
        } catch (err: any) {
            toast.error(err?.message || (isKa ? 'აგრონომიაში გადაცემა ვერ მოხერხდა' : 'Failed to dispatch plan to Agronomy'));
        } finally {
            setIsDispatching(false);
        }
    };

    const handleLoadFromArchive = (rec: SavedAgroAnalysisRecord, asReuse: boolean) => {
        setEditingRecordId(asReuse ? null : rec.id);
        setAnalysisTitle(asReuse ? `${rec.title} (${isKa ? 'ასლი' : 'Copy'})` : rec.title);
        setTargetSector(rec.agronomistConclusion?.targetSectorOrPlot || '');
        setSeverity(rec.agronomistConclusion?.severity || 'Moderate');
        setConclusionNotes(rec.agronomistConclusion?.notes || '');
        setTreatmentNotes(rec.plan?.treatment || rec.agronomistConclusion?.prescribedTreatment || '');
        setNutritionNotes(rec.plan?.nutrition || rec.agronomistConclusion?.prescribedNutrition || '');
        setPreventionNotes(rec.plan?.prevention || rec.agronomistConclusion?.preventiveMeasures || '');
        setRecipeRows(rec.plan?.elements ? rec.plan.elements.map(e => ({ ...e })) : []);
        setAiRawResult(rec.rawAiResult || null);
        setAiSummaryText(rec.rawAiResult?.text || rec.rawAiResult?.summary || '');
        setAiSuggestedPlan(rec.rawAiResult?.text || '');
        setUploadedImageUrl(rec.imageDataUrl || '');
        setActiveTab(rec.type === 'document' ? 'document' : rec.type === 'agro_image' ? 'agro_image' : 'disease');
        toast.info(asReuse ? (isKa ? 'ჩანაწერი გახსნილია ახალ შაბლონად' : 'Loaded as reusable draft') : (isKa ? 'ჩანაწერი გახსნილია რედაქტირებისთვის' : 'Loaded record for editing'));
    };

    const handleConfirmDelete = async (rec: SavedAgroAnalysisRecord) => {
        await deleteClinicalRecordTombstone(rec);
        if (selectedArchiveRecord?.id === rec.id) setSelectedArchiveRecord(null);
        if (editingRecordId === rec.id) setEditingRecordId(null);
        setConfirmDeleteId(null);
        await refreshArchive();
        toast.success(isKa ? 'ჩანაწერი წაიშალა არქივიდან' : 'Record removed from archive');
    };

    const categoryBadgeClass = (cat?: ClinicalSourceCategory) => {
        if (cat === 'Agronomist-created') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (cat === 'Combined') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        return 'bg-amber-50 text-amber-700 border-amber-200';
    };

    return (
        <div className="flex-1 h-full overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-5">
                {/* Top Suite Navigation */}
                <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {([
                            { id: 'disease', label: isKa ? 'დაავადების შეფასება' : 'Disease Assessment', icon: <Stethoscope size={15} /> },
                            { id: 'document', label: isKa ? 'დოკუმენტები / ანალიზი' : 'Documents & Lab Notes', icon: <FileText size={15} /> },
                            { id: 'agro_image', label: isKa ? 'ფოტო ინსპექტირება' : 'Field Vision', icon: <Camera size={15} /> },
                            { id: 'archive', label: isKa ? `არქივი (${archiveRecords.length})` : `Clinical Archive (${archiveRecords.length})`, icon: <Archive size={15} /> }
                        ] as const).map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                    activeTab === tab.id
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {activeTab !== 'archive' && (
                        <button
                            type="button"
                            onClick={resetEditor}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1.5 cursor-pointer"
                        >
                            <RefreshCw size={13} />
                            <span>{isKa ? 'ახალი ჩანაწერი' : 'New Record'}</span>
                        </button>
                    )}
                </div>

                {/* ARCHIVE TAB */}
                {activeTab === 'archive' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={archiveSearch}
                                    onChange={e => setArchiveSearch(e.target.value)}
                                    placeholder={isKa ? 'ძიება სათაურით ან სექტორით...' : 'Search by title or sector...'}
                                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                />
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                {(['ALL', 'AI-generated', 'Agronomist-created', 'Combined'] as const).map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setArchiveFilter(cat)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                                            archiveFilter === cat
                                                ? 'bg-slate-900 text-white border-slate-900'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        {cat === 'ALL' ? (isKa ? 'ყველა' : 'All') : cat}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                                {archiveLoading ? (
                                    <div className="py-10 flex items-center justify-center text-slate-400 text-xs gap-2">
                                        <Loader2 size={15} className="animate-spin" />
                                        <span>{isKa ? 'იტვირთება...' : 'Loading archive...'}</span>
                                    </div>
                                ) : filteredArchive.length === 0 ? (
                                    <div className="py-10 text-center text-xs text-slate-400">
                                        {isKa ? 'არქივში ჩანაწერები არ მოიძებნა.' : 'No archived clinical records found.'}
                                    </div>
                                ) : (
                                    filteredArchive.map(rec => {
                                        const isSelected = selectedArchiveRecord?.id === rec.id;
                                        return (
                                            <button
                                                key={rec.id}
                                                type="button"
                                                onClick={() => setSelectedArchiveRecord(rec)}
                                                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                                                    isSelected
                                                        ? 'bg-emerald-50/60 border-emerald-400'
                                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-xs font-bold text-slate-900 line-clamp-1">{rec.title}</p>
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 ${categoryBadgeClass(rec.sourceCategory)}`}>
                                                        {rec.sourceCategory || 'AI-generated'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                                    <span className="truncate">{rec.agronomistConclusion?.targetSectorOrPlot || (isKa ? 'პერსონალური ჩანაწერი' : 'Personal record')}</span>
                                                    <span className="tabular-nums shrink-0">{new Date(rec.updatedAt || rec.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                            {!selectedArchiveRecord ? (
                                <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center text-slate-400 p-6">
                                    <Archive size={28} className="mb-2 opacity-60" />
                                    <p className="text-xs font-semibold text-slate-600">
                                        {isKa ? 'აირჩიეთ ჩანაწერი დეტალების სანახავად' : 'Select an archived record to view details'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-base font-bold text-slate-900">{selectedArchiveRecord.title}</h3>
                                                <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${categoryBadgeClass(selectedArchiveRecord.sourceCategory)}`}>
                                                    {selectedArchiveRecord.sourceCategory || 'AI-generated'}
                                                </span>
                                                {selectedArchiveRecord.migrationSource === 'legacy' && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                        {isKa ? 'ისტორიული იმპორტი' : 'Historical Import'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 tabular-nums">
                                                {new Date(selectedArchiveRecord.createdAt).toLocaleString()}
                                                {selectedArchiveRecord.agronomistConclusion?.targetSectorOrPlot
                                                    ? ` · ${selectedArchiveRecord.agronomistConclusion.targetSectorOrPlot}`
                                                    : ''}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleLoadFromArchive(selectedArchiveRecord, false)}
                                                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                                            >
                                                {isKa ? 'რედაქტირება' : 'Edit'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleLoadFromArchive(selectedArchiveRecord, true)}
                                                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold cursor-pointer"
                                            >
                                                {isKa ? 'ხელახლა გამოყენება' : 'Reuse'}
                                            </button>
                                            {confirmDeleteId === selectedArchiveRecord.id ? (
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleConfirmDelete(selectedArchiveRecord)}
                                                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                                                    >
                                                        {isKa ? 'დადასტურება' : 'Confirm'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer"
                                                    >
                                                        {isKa ? 'გაუქმება' : 'Cancel'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDeleteId(selectedArchiveRecord.id)}
                                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                                                    title={isKa ? 'წაშლა' : 'Delete'}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {selectedArchiveRecord.agronomistConclusion?.notes && (
                                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                {isKa ? 'აგრონომის დასკვნა' : 'Agronomist Conclusion'}
                                            </p>
                                            <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                                                {selectedArchiveRecord.agronomistConclusion.notes}
                                            </p>
                                        </div>
                                    )}

                                    {selectedArchiveRecord.plan?.elements && selectedArchiveRecord.plan.elements.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                {isKa ? 'რეცეპტის შემადგენლობა' : 'Structured Recipe'}
                                            </p>
                                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                                                {selectedArchiveRecord.plan.elements.map((el, idx) => (
                                                    <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between text-xs bg-white">
                                                        <span className="font-semibold text-slate-900">{el.newItemName}</span>
                                                        <span className="font-bold text-emerald-700 tabular-nums">
                                                            {el.quantity} {el.unit}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(selectedArchiveRecord.rawAiResult?.text || selectedArchiveRecord.rawAiResult?.summary) && (
                                        <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-1.5">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                                                <Sparkles size={12} />
                                                {isKa ? 'AI შეფასება (საჭიროებს სპეციალისტის გადამოწმებას)' : 'AI-Generated Output (Requires Agronomist Review)'}
                                            </p>
                                            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                {selectedArchiveRecord.rawAiResult.text || selectedArchiveRecord.rawAiResult.summary}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* WORKSPACE: LEFT = AI ANALYSIS & AI-GENERATED PLAN, RIGHT = MANUAL/COMBINED AGRONOMIST EDITOR */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Left Column: AI Input + Explicit AI-Generated Plan Section */}
                        <div className="lg:col-span-5 space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3.5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Sparkles size={16} className="text-emerald-600" />
                                        <span>{isKa ? 'AI ანალიზის მოთხოვნა' : 'AI Diagnostic Input'}</span>
                                    </h2>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        {isKa ? 'სათაური' : 'Case Title'}
                                    </label>
                                    <input
                                        type="text"
                                        value={analysisTitle}
                                        onChange={e => setAnalysisTitle(e.target.value)}
                                        placeholder={isKa ? 'მაგ: ფოთლის სიყვითლე — ბლოკი B' : 'e.g. Leaf chlorosis — Block B'}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        {activeTab === 'document'
                                            ? isKa ? 'ლაბორატორიული ტექსტი ან დოკუმენტი' : 'Lab Report Notes or Document'
                                            : isKa ? 'სიმპტომების და ველის აღწერა' : 'Symptoms & Field Observations'}
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={symptomsOrPrompt}
                                        onChange={e => setSymptomsOrPrompt(e.target.value)}
                                        placeholder={isKa ? 'აღწერეთ მცენარის მდგომარეობა, ნიადაგის მონაცემები ან ამინდი...' : 'Describe crop symptoms, soil observations, or recent weather...'}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        {isKa ? 'ფოტო ან დოკუმენტის ატვირთვა (არასავალდებულო)' : 'Attach Photo or Document (optional)'}
                                    </label>
                                    <input
                                        type="file"
                                        accept={activeTab === 'document' ? '.txt,.csv,.json,.md,image/*' : 'image/*'}
                                        onChange={handleFileUpload}
                                        className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                                    />
                                    {uploadedImageUrl && (
                                        <img
                                            src={uploadedImageUrl}
                                            alt="Uploaded sample"
                                            className="mt-2.5 w-full h-36 object-cover rounded-xl border border-slate-200"
                                        />
                                    )}
                                </div>

                                <button
                                    type="button"
                                    disabled={isAnalyzing}
                                    onClick={handleRunAiAnalysis}
                                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                >
                                    {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    <span>{isAnalyzing ? (isKa ? 'მიმდინარეობს ანალიზი...' : 'Analyzing...') : (isKa ? 'AI ანალიზის გაშვება' : 'Run AI Analysis')}</span>
                                </button>
                            </div>

                            {/* Explicit AI-Generated Plan Section */}
                            <div className="bg-white rounded-2xl border border-amber-200/90 p-5 space-y-3 shadow-xs">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                            <AlertTriangle size={14} className="text-amber-600" />
                                            <span>{isKa ? 'AI-ს გენერირებული გეგმა' : 'AI-Generated Plan'}</span>
                                        </h3>
                                        <p className="text-[11px] text-amber-800 mt-0.5">
                                            {isKa
                                                ? 'AI შემოთავაზებები საჭიროებს აგრონომის გადამოწმებას და დადასტურებას.'
                                                : 'AI suggestions require agronomist review before any field action.'}
                                        </p>
                                    </div>
                                </div>

                                {aiSuggestedPlan ? (
                                    <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                                        {aiSuggestedPlan}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic py-3">
                                        {isKa
                                            ? 'AI გეგმა გამოჩნდება ანალიზის შემდეგ. ასევე შეგიძლიათ შექმნათ მექანიკური დანიშნულება მარჯვნივ.'
                                            : 'AI output appears here after running analysis. You can also author a manual prescription directly on the right.'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Manual / Combined Agronomist Conclusion & Prescription Editor */}
                        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <ClipboardList size={16} className="text-emerald-600" />
                                        <span>{isKa ? 'აგრონომის დასკვნა და რეცეპტი (მექანიკური / კომბინირებული)' : 'Agronomist Conclusion & Prescription (Manual / Combined)'}</span>
                                    </h2>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        {isKa
                                            ? 'დანიშნულების შენახვა არ ახორციელებს დამუშავებას და არ ჩამოწერს საწყობის მარაგს.'
                                            : 'Saving a prescription records your plan only — it never executes treatment or deducts inventory.'}
                                    </p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${categoryBadgeClass(resolveSourceCategory())}`}>
                                    {resolveSourceCategory()}
                                </span>
                            </div>

                            {/* Severity & Target Sector */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        {isKa ? 'სიმძიმის ხარისხი' : 'Severity'}
                                    </label>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {SEVERITIES.map(level => (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => setSeverity(level)}
                                                className={`py-2 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                                                    severity === level
                                                        ? level === 'Critical' || level === 'Severe'
                                                            ? 'bg-rose-600 text-white border-rose-600'
                                                            : 'bg-slate-900 text-white border-slate-900'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        {isKa ? 'სამიზნე სექტორი / ნაკვეთი' : 'Target Sector / Plot'}
                                    </label>
                                    <input
                                        type="text"
                                        list="clinical-sector-options"
                                        value={targetSector}
                                        onChange={e => setTargetSector(e.target.value)}
                                        placeholder={isKa ? 'აირჩიეთ ან ჩაწერეთ სექტორი' : 'Select or type sector / plot'}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    />
                                    <datalist id="clinical-sector-options">
                                        {sectorOptions.map(opt => (
                                            <option key={opt} value={opt} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            {/* Agronomist Conclusion / Comment */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    {isKa ? 'აგრონომის დასკვნა / კომენტარი' : 'Agronomist Conclusion / Comment'}
                                </label>
                                <textarea
                                    rows={3}
                                    value={conclusionNotes}
                                    onChange={e => setConclusionNotes(e.target.value)}
                                    placeholder={isKa ? 'ჩაწერეთ თქვენი პროფესიული დასკვნა და დაკვირვებები...' : 'Enter verified clinical conclusion and specialist comments...'}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                />
                            </div>

                            {/* Explicit Structured Recipe Rows (Zero default chemicals or dosages) */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                        <Beaker size={13} className="text-emerald-600" />
                                        <span>{isKa ? 'რეცეპტის მასალები (მასალა, რაოდენობა, ერთეული)' : 'Prescription Recipe (Material, Quantity, Unit)'}</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddRecipeRow}
                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus size={13} />
                                        <span>{isKa ? 'მასალის დამატება' : 'Add Material'}</span>
                                    </button>
                                </div>

                                {recipeRows.length === 0 ? (
                                    <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-center text-xs text-slate-500">
                                        {isKa
                                            ? 'პრეპარატები ავტომატურად არ ემატება. დააჭირეთ „მასალის დამატებას“ რეცეპტის შესადგენად.'
                                            : 'No default chemicals or dosages are prefilled. Click "Add Material" to specify verified inputs.'}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {recipeRows.map((row, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={row.newItemName}
                                                    onChange={e => handleUpdateRecipeRow(idx, { newItemName: e.target.value })}
                                                    placeholder={isKa ? 'მასალის / პრეპარატის დასახელება' : 'Material / product name'}
                                                    className="col-span-6 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                                />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={row.quantity || ''}
                                                    onChange={e => handleUpdateRecipeRow(idx, { quantity: parseFloat(e.target.value) || 0 })}
                                                    placeholder={isKa ? 'რაოდ.' : 'Qty'}
                                                    className="col-span-3 px-3 py-2 rounded-xl border border-slate-200 text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                                />
                                                <select
                                                    value={row.unit}
                                                    onChange={e => handleUpdateRecipeRow(idx, { unit: e.target.value })}
                                                    className="col-span-2 px-2 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                                >
                                                    {UNITS.map(u => (
                                                        <option key={u} value={u}>
                                                            {u}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRecipeRow(idx)}
                                                    className="col-span-1 p-2 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center cursor-pointer"
                                                    title={isKa ? 'წაშლა' : 'Remove'}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Treatment / Nutrition / Prevention Notes */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        {isKa ? 'დამუშავების ინსტრუქცია' : 'Treatment Notes'}
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={treatmentNotes}
                                        onChange={e => setTreatmentNotes(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        {isKa ? 'კვების პროტოკოლი' : 'Nutrition Notes'}
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={nutritionNotes}
                                        onChange={e => setNutritionNotes(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        {isKa ? 'პრევენცია' : 'Prevention'}
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={preventionNotes}
                                        onChange={e => setPreventionNotes(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                    <span>
                                        {canDispatchToAgronomy
                                            ? isKa
                                                ? 'შეგიძლიათ შეინახოთ არქივში ან გადასცეთ აგრონომიის გეგმებში.'
                                                : 'Save to archive or dispatch directly to Agronomy nutrition plans.'
                                            : isKa
                                            ? 'პერსონალური რეჟიმი: ჩანაწერები ინახება თქვენს პირად არქივში.'
                                            : 'Personal mode: records are saved privately to your archive.'}
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={isSaving || isDispatching}
                                        onClick={handleSaveOnly}
                                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        <span>{isKa ? 'შენახვა' : 'Save'}</span>
                                    </button>

                                    {canDispatchToAgronomy && (
                                        <button
                                            type="button"
                                            disabled={isSaving || isDispatching}
                                            onClick={handleSaveAndDispatchToAgronomy}
                                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            {isDispatching ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                            <span>{isKa ? 'შენახვა და აგრონომიაში დამატება' : 'Save & Add to Agronomy'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiAnalysisSuite;
