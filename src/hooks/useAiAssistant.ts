import { useState } from 'react';
import { Type } from "@google/genai";
import { AssistantMessage, AnalysisResult, GroundingSource, SoilAnalysisResult, UploadedDocument, PlantDiseaseAnalysis, SoilData, NutritionPlan } from '../types';
import { 
    generateAgriBusinessAnalysis, 
    analyzePlantDisease, 
    analyzeAgriImage, 
    generateDocumentComparison, 
    generateSoilAnalysis,
    executeGeminiCall,
    getActiveGeminiApiKey
} from '../services/geminiService';
import { exportToExcel } from '../utils/excelExporter';
import { safeStorage } from '../services/storageService';
import { godAIKnowledgeEngine } from '../new_engine/ai/GodAIKnowledgeEngine';
import { AIAssistantMode } from '../new_engine/types';

interface AutonomousAction {
    type: 'task' | 'note' | 'reminder' | 'excel_export' | 'none';
    title?: string;
    date?: string;
    priority?: 'low' | 'medium' | 'high';
}

interface AutonomousAssistantResult {
    text: string;
    action?: AutonomousAction;
}

const triggerHarvestSalesExcelExport = (context: any): boolean => {
    const produceItems = (context?.inventoryItems || []).filter((i: any) => 
        i.category === 'Produce' && !i.isPrivate && i.status !== 'COLD_STORAGE_RETURNED'
    );

    if (produceItems && produceItems.length > 0) {
        try {
            const dateStr = new Date().toISOString().split('T')[0];
            const fileName = `harvest_sales_ai_${dateStr}`;
            
            const exportRows = produceItems.map((item: any) => {
                const currentStock = item.currentStock || 0;
                const unitCost = item.unitCost || 0;
                const rate = item.rate || 1;
                const grossRevenue = currentStock * unitCost * rate;
                
                return {
                    'Date / თარიღი': item.date?.split('T')[0] || '',
                    'Batch / პარტია': item.batch_id || 'N/A',
                    'Produce Name / დასახელება': item.name || '',
                    'Cultivar Variety / ჯიში': item.variety || 'Unknown',
                    'Weight (KG) / წონა (კგ)': Number(currentStock.toFixed(2)),
                    'Unit Price / ფასი': Number(unitCost.toFixed(2)),
                    'Exchange Rate / კურსი': Number(rate.toFixed(2)),
                    'Gross Revenue / ბრუნვა': Number(grossRevenue.toFixed(2)),
                    'LLC Deposit / ბანკი (LLC)': Number((item.depositLLC || 0).toFixed(2)),
                    'Cash Deposit / ნაღდი': Number((item.physicalCash || 0).toFixed(2)),
                    'Opex Labor/Vehicles / საოპერაციო ხარჯი': 0,
                    'Packaging Materials / მასალები': 0,
                    'Net Revenue / წმინდა მოგება': Number(grossRevenue.toFixed(2)),
                    'Buyer / მყიდველი': item.buyer || '',
                    'Paid / გადახდილი': item.depositedDeposit ? 'YES / კი' : 'NO / არა',
                    'Status / სტატუსი': item.status || ''
                };
            });

            exportToExcel(exportRows, fileName, 'Harvest Sales (AI Assistant)');
            return true;
        } catch (exportErr) {
            console.warn("[AI Assistant] Excel export notice:", exportErr);
            return false;
        }
    }
    return false;
};

const generateAutonomousAssistantResponse = (
    command: string, 
    context: any, 
    effectiveMode: AIAssistantMode, 
    errReason?: string
): AutonomousAssistantResult => {
    const lower = (command || '').toLowerCase().trim();
    const isCreditDepleted = (errReason || '').includes('429') || (errReason || '').includes('RESOURCE_EXHAUSTED') || (errReason || '').includes('prepayment credits');
    const noticeFooter = isCreditDepleted 
        ? '\n\n*(⚡ Generated via Autonomous Local Agronomy Engine. Cloud prepayment credits depleted; update your key in ⚙️ AI Settings to restore live cloud model querying).*'
        : '\n\n*(⚡ Generated via Autonomous Local Agronomy Engine).*';

    // 1. Presentation request (especially focused on harvest module and weigh station)
    if (lower.includes('presentation') || (lower.includes('harvest') && (lower.includes('weigh') || lower.includes('weight'))) || lower.includes('slide') || lower.includes('guide')) {
        return {
            text: `📊 **AgriMap Enterprise Architecture Presentation: Harvest Operations & Weigh Station Logistics**

### 1. Harvest Operations Pipeline
- **Field & Parcel Selection**: Geo-referenced plantation plots loaded directly from GIS vectors, matching active cultivar and maturity stages.
- **Team & Picker Assignment**: Field supervisors register pickers and assign individual QR badges for strict traceability from branch to pallet.
- **Real-Time Monitoring**: Live tracking of crate collection rates, picker speeds, and hourly harvest velocity.

### 2. Weigh Station Field Precision Logistics
- **Sub-Second Picker Identification**: Immediate QR badge scan on field scales to attribute crates directly to individual workers.
- **Dynamic Tare Deduction**: Precision tare calibration (subtracting standard empty crate weight, baseline 0.35 kg) ensures 100% net fruit yield accuracy.
- **Real-Time Quality Grading**: Produce is triaged directly on the platform (Export Grade A, Domestic Grade B, Industrial / Processing).
- **Cold Chain Buffer Integration**: Automated generation of cold storage pallet tickets; timestamps enforce the 45-minute maximum field-to-chiller window to preserve fruit firmness, bloom, and Brix.
- **Offline Reliability**: All scale weights and ticket logs persist locally in offline storage and sync automatically once GSM/Wi-Fi is re-established.

### 3. Presentation & Architecture Exports
You can generate and download this full presentation directly from the **"Manual Architecture & AI Guide"** module in:
- **PDF format** (clean vector document)
- **PowerPoint PPTX format** (fully editable slides)
- **Interactive HTML format** (live browser presentation)${noticeFooter}`,
            action: { type: 'none' }
        };
    }

    // 2. Excel export / harvest sales
    if (lower.includes('excel') || (lower.includes('harvest') && (lower.includes('sale') || lower.includes('sales'))) || lower.includes('export')) {
        const produceItems = (context?.inventoryItems || []).filter((i: any) => 
            i.category === 'Produce' && !i.isPrivate && i.status !== 'COLD_STORAGE_RETURNED'
        );
        if (produceItems.length > 0) {
            return {
                text: `📊 **Harvest Sales Excel Generated**\n\nI have compiled ${produceItems.length} active produce batch record(s) into an Excel spreadsheet with net weights, unit prices, cash/LLC revenues, and varieties. The download has been triggered automatically.${noticeFooter}`,
                action: { type: 'excel_export', title: 'Harvest Sales' }
            };
        } else {
            return {
                text: `📊 **Harvest Sales Interface**\n\nThere are currently 0 active produce batches in this session. I am redirecting you directly to the Stock module's Harvest Sale interface where you can view inventory records and use the Excel export tools.${noticeFooter}`,
                action: { type: 'excel_export', title: 'Harvest Sales' }
            };
        }
    }

    // 3. Task Creation
    if (lower.startsWith('add task') || lower.startsWith('create task') || lower.startsWith('task:') || lower.includes('new task') || lower.includes('schedule task')) {
        let taskTitle = command.replace(/^(add task|create task|task:|new task|schedule task)\s*/i, '').trim();
        if (!taskTitle) taskTitle = 'Agricultural Field Task';
        return {
            text: `✅ **Task Scheduled**\n\nCreated new work assignment: **"${taskTitle}"**. It has been recorded in your project planner and dashboard.${noticeFooter}`,
            action: { type: 'task', title: taskTitle }
        };
    }

    // 4. Reminder Creation
    if (lower.startsWith('remind') || lower.includes('add reminder') || lower.includes('set reminder')) {
        let reminderTitle = command.replace(/^(remind me to|remind me|add reminder|set reminder)\s*/i, '').trim();
        if (!reminderTitle) reminderTitle = 'Agri-Reminder';
        return {
            text: `⏰ **Reminder Set**\n\nAdded reminder: **"${reminderTitle}"** to your schedule and alerts list.${noticeFooter}`,
            action: { type: 'reminder', title: reminderTitle }
        };
    }

    // 5. Note Creation
    if (lower.startsWith('note') || lower.startsWith('add note') || lower.includes('take note') || lower.includes('record note')) {
        let noteText = command.replace(/^(note:|add note|take note|record note)\s*/i, '').trim();
        if (!noteText) noteText = command;
        return {
            text: `📝 **Field Note Saved**\n\nLogged note: **"${noteText}"** to your field notebook.${noticeFooter}`,
            action: { type: 'note', title: noteText }
        };
    }

    // 6. Agronomic / Pest / Spraying / Pruning / Irrigation
    if (lower.includes('bt') || lower.includes('spray') || lower.includes('pesticide') || lower.includes('fungicide') || lower.includes('copper') || lower.includes('prun') || lower.includes('irrigat') || lower.includes('fertil') || lower.includes('pest') || lower.includes('disease')) {
        const heuristics = godAIKnowledgeEngine.getHeuristics();
        const adviceList = heuristics.slice(0, 3).map(h => `• **${h.title}**: ${h.description} *(Recommendation: ${h.recommendationAction})*`).join('\n\n');
        return {
            text: `🌿 **Agronomic Intelligence & Treatment Protocols**\n\nBased on regional berry and orchard field benchmarks:\n\n${adviceList}\n\n**Operational Best Practices**:\n1. Calibrate drip fertigation line pressures and verify soil moisture tension (target 15-25 kPa for blueberries).\n2. Schedule biological sprays (*Bacillus thuringiensis*) in late afternoon or overcast skies to minimize UV photodegradation.\n3. Verify copper fungicide intervals and observe strict post-spray withholding periods before harvest.${noticeFooter}`,
            action: { type: 'none' }
        };
    }

    // 7. Bottlenecks & PM Analysis
    if (lower.includes('bottleneck') || lower.includes('velocity') || lower.includes('productivity') || lower.includes('labor') || lower.includes('worker') || lower.includes('analy')) {
        const analysis = godAIKnowledgeEngine.analyzeWorksAndTasks({
            organizationId: context?.activeOrgId || '',
            workAssignments: context?.workAssignments || [],
            harvestEntries: context?.harvestEntries || [],
            plantationFeatures: context?.plantationFeatures || [],
            employees: context?.employees || [],
            machinery: context?.machinery || [],
            nutritionPlans: context?.nutritionPlans || [],
            notes: context?.notes || []
        });
        return {
            text: `📈 **Operational Performance & Bottleneck Analysis**\n\n- **Total Registered Tasks**: ${analysis.totalTasks}\n- **Overall Completion Rate**: ${analysis.overallCompletionRate}%\n- **Labor Productivity Index**: ${analysis.laborProductivityIndex}/100\n- **Active Machinery**: ${analysis.machineryUtilizationSummary.activeUnits} units (${analysis.machineryUtilizationSummary.utilizationScore}% utilization)\n- **Critical Bottlenecks Detected**: ${analysis.criticalBottlenecks.length > 0 ? analysis.criticalBottlenecks.map((b: any) => typeof b === 'string' ? b : (b?.name || b?.title || 'Bottleneck')).join(', ') : 'None detected. Work velocity is optimal.'}\n\n**Recommendation**: Align worker crew assignments with planned task durations to prevent field labor slippage.${noticeFooter}`,
            action: { type: 'none' }
        };
    }

    // 8. SOP Guide
    if (lower.includes('sop') || lower.includes('guide') || lower.includes('how to') || lower.includes('help') || lower.includes('start') || lower.includes('steps')) {
        return {
            text: `📋 **AgriMap Pro Standard Operating Procedure (SOP) Guide**\n\n1. **Profile Verification**: Open *My Profile* and verify user credentials.\n2. **Company Registration**: Navigate to *Company Enterprise*, configure target crops and custom varieties.\n3. **Map Planner**: Go to *Map / Dashboard* to draw plot boundaries, trenches, and sector blocks.\n4. **Register Workers & Teams**: Under *Individual Tools*, register pickers, generate QR badges, and assign work crews.\n5. **Manage Stock**: Under *Stock*, manage fertilizers, packaging containers, and cost rates.\n6. **Start Harvest Session**: Launch *Harvesting Module*, select target sectors and active picking teams.\n7. **Live Monitoring**: Monitor pickers and crate throughput in real-time.\n8. **Weigh Station**: Scan picker QR badges on field scales, auto-deduct crate tare (0.35kg baseline), and log net weights.\n9. **Cold Storage & Market**: Conclude sessions and transfer fruit crates directly into Cold Storage inventory.${noticeFooter}`,
            action: { type: 'none' }
        };
    }

    // 9. Default enterprise-aware fallback
    const orgName = context?.activeOrgName || 'Active Farm Enterprise';
    const taskCount = (context?.workAssignments || []).length;
    const harvestCount = (context?.harvestEntries || []).length;
    const notesCount = (context?.notes || []).length;

    return {
        text: `🌾 **AgriMap Agricultural Operations Assistant**\n\nI am connected to your enterprise (**${orgName}**).\n\n**Active System State**:\n- **Registered Tasks**: ${taskCount} work items\n- **Harvest Batches**: ${harvestCount} sessions recorded\n- **Field Notes**: ${notesCount} active observations\n\nI am ready to assist you with:\n- **Harvest & Weigh Station Management**: Step-by-step SOP for QR check-ins, tare deduction, and cold storage handoff.\n- **Excel Exports**: Instant spreadsheets for harvest sales and produce revenue.\n- **Agronomic Guidance**: Timed spray schedules, drip fertigation, and pruning velocity.\n- **Presentation Generation**: Creating downloadable PDF/PPTX/HTML architecture presentations.\n- **Task & Reminder Scheduling**: Creating tasks, notes, and alerts.${noticeFooter}`,
        action: { type: 'none' }
    };
};

export const useAiAssistant = (language: string) => {
    const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
        { id: '1', type: 'bot', text: 'Hello! I am your Agri-Assistant. How can I help you today?', timestamp: new Date().toISOString() }
    ]);
    const [assistantMode, setAssistantModeState] = useState<AIAssistantMode>(() => {
        try {
            const saved = safeStorage.getItem('agrimap_assistant_mode');
            if (saved === 'expert' || saved === 'god_ai' || saved === 'standard') return saved as AIAssistantMode;
        } catch {}
        return 'standard';
    });

    const setAssistantMode = (mode: AIAssistantMode) => {
        setAssistantModeState(mode);
        try {
            safeStorage.setItem('agrimap_assistant_mode', mode);
        } catch {}
        
        let introText = '';
        if (mode === 'expert') {
            introText = '🌿 Switched to Expert Agronomist & PM Mode. Attached to your active enterprise. I monitor work assignments, task designs, bottlenecks, labor efficiency, machinery, and phenology.';
        } else if (mode === 'god_ai') {
            introText = '👑 Switched to Omniscient God AI Mode (Super Admin). Cross-enterprise learning active across all registered companies. Synthesizing macro benchmarks and evolutionary heuristics.';
        } else {
            introText = '🤖 Switched to Standard Agri-Assistant Mode. Ready to assist with SOP navigation, tasks, notes, and records.';
        }
        
        setAssistantMessages(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'bot', text: introText, timestamp: new Date().toISOString() }
        ]);
    };
    const [isAssistantLoading, setIsAssistantLoading] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [marketAnalysisResult, setMarketAnalysisResult] = useState<AnalysisResult | null>(null);
    const [sources, setSources] = useState<GroundingSource[]>([]);
    const [soilAnalysisResult, setSoilAnalysisResult] = useState<SoilAnalysisResult | null>(null);
    const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
    const [documentAnalysisResult, setDocumentAnalysisResult] = useState<string | null>(null);
    const [uploadedPlantImage, setUploadedPlantImage] = useState<{ dataUrl: string; file: File } | null>(null);
    const [plantDiseaseAnalysis, setPlantDiseaseAnalysis] = useState<PlantDiseaseAnalysis | null>(null);
    const [uploadedAgriImage, setUploadedAgriImage] = useState<{ dataUrl: string; file: File } | null>(null);
    const [agriImageAnalysis, setAgriImageAnalysis] = useState<{ subject: string; condition: string; metrics: string; recommendations: string[] } | null>(null);

    const handleSendCommand = async (command: string, context: any) => {
        if (!command.trim()) return;
        
        const effectiveMode = (context?.assistantMode || assistantMode) as AIAssistantMode;
        const userMsg: AssistantMessage = { id: Date.now().toString(), type: 'user', text: command };
        setAssistantMessages(prev => [...prev, userMsg]);
        setIsAssistantLoading(true);

        try {
            const produceItemsList = (context?.inventoryItems || []).filter((i: any) => 
                i.category === 'Produce' && !i.isPrivate && i.status !== 'COLD_STORAGE_RETURNED'
            );
            const produceLength = produceItemsList.length;

            const notesList = (context?.notes || []).map((n: any) => ({
                id: n.id,
                content: n.content,
                timestamp: n.timestamp,
                moduleName: n.moduleName || 'General',
                tags: n.tags || [],
                authorName: n.authorName || 'Anon',
                isVoiceNote: !!n.isVoiceNote
            }));

            // Mode-specific intelligence injection
            let modeContextStr = '';
            let modeRolePrompt = '';

            const isSysAdmin = Boolean(
                context?.isSystemAdmin || 
                context?.currentUser?.isSystemAdmin || 
                context?.currentUser?.role === 'system_admin' ||
                (context?.currentUser?.roles as any)?.includes?.('system_admin')
            );

            if (effectiveMode === 'expert') {
                const taskAnalysis = godAIKnowledgeEngine.analyzeWorksAndTasks({
                    organizationId: context?.activeOrgId || '',
                    workAssignments: context?.workAssignments || [],
                    harvestEntries: context?.harvestEntries || [],
                    plantationFeatures: context?.plantationFeatures || [],
                    employees: context?.employees || [],
                    machinery: context?.machinery || [],
                    nutritionPlans: context?.nutritionPlans || [],
                    notes: context?.notes || []
                });

                const topHeuristics = godAIKnowledgeEngine.getHeuristics().slice(0, 4);

                modeContextStr = `
                [OPERATIONAL INTELLIGENCE - COMPANY EXPERT MODE]
                Attached Company / Enterprise: ${context?.activeOrgName || context?.activeOrgId || 'Current Workspace'}
                Total Registered Tasks: ${taskAnalysis.totalTasks}
                Task Completion Velocity: ${taskAnalysis.overallCompletionRate}%
                Labor Productivity Index: ${taskAnalysis.laborProductivityIndex}/100
                Critical Bottlenecks Detected (${taskAnalysis.criticalBottlenecks.length}): ${JSON.stringify(taskAnalysis.criticalBottlenecks)}
                Machinery Status: ${taskAnalysis.machineryUtilizationSummary.activeUnits} units active (${taskAnalysis.machineryUtilizationSummary.utilizationScore}% utilization)
                Agronomic Synergy Scores: Spray Timeliness: ${taskAnalysis.agronomicTaskSynergy.sprayTimelinessScore}%, Irrigation: ${taskAnalysis.agronomicTaskSynergy.irrigationConsistencyScore}%, Harvest Pacing: ${taskAnalysis.agronomicTaskSynergy.harvestPacingScore}%
                Task Delivery By Type: ${JSON.stringify(taskAnalysis.taskMetricsByType)}
                Learned Agronomic Heuristics: ${JSON.stringify(topHeuristics)}
                `;

                modeRolePrompt = `You are an ELITE SENIOR AGRONOMIST and AGRICULTURAL PROJECT MANAGER operating in COMPANY EXPERT MODE attached to "${context?.activeOrgName || 'the assigned enterprise'}". 
                You have an extensive background in orchard & berry agronomy (blueberries, hazelnuts, vineyards), drip irrigation hydraulics, crop protection schedules (Bt bio-pesticides, copper fungicides, pruning windows), and project delivery.
                Directly monitor work designs, task velocity, labor allocations, delays, and harvest synchronization. Provide clear, mathematically sound, actionable advice.`;
            } else if (effectiveMode === 'god_ai') {
                if (isSysAdmin) {
                    const matrix = godAIKnowledgeEngine.synthesizeOmniscientGodAIMatrix(
                        true,
                        context?.organizations || [],
                        context?.workAssignments || [],
                        context?.harvestEntries || [],
                        context?.plantationFeatures || [],
                        []
                    );

                    modeContextStr = `
                    [ECOSYSTEM INTELLIGENCE - OMNISCIENT GOD AI MODE]
                    Total Registered Enterprises Monitored: ${matrix.totalOrganizationsMonitored}
                    Total Tasks Across Entire Ecosystem: ${matrix.totalTasksAnalyzed}
                    Total Harvest Monitored: ${matrix.totalHarvestKgAnalyzed} kg
                    Clinical Cases Evaluated: ${matrix.totalClinicalCasesAnalyzed}
                    Cross-Enterprise Labor Benchmarks: ${JSON.stringify(matrix.crossCompanyLaborBenchmarks)}
                    Cross-Enterprise Cultivar Yield Averages: ${JSON.stringify(matrix.crossCompanyCropYieldAverages)}
                    Universal Pathogen Vulnerability Radar: ${JSON.stringify(matrix.universalPathogenTrends)}
                    Multi-Year Learned Knowledge Base: ${JSON.stringify(matrix.learnedHeuristics)}
                    Super Admin Macro Insights: ${JSON.stringify(matrix.systemAdminMacroInsights)}
                    `;

                    modeRolePrompt = `You are the OMNISCIENT GOD AI - Universal Master Agronomist and Cross-Enterprise Portfolio Overseer (Exclusive Super Admin Mode). 
                    You monitor and synthesize operational and agronomic intelligence across ALL companies registered in the application. 
                    Identify macro benchmarks, systemic bottlenecks across multiple farms, cross-enterprise labor efficiency percentiles, and regional pathogen curves. Provide high-level, authoritative strategic counsel.`;
                } else {
                    modeRolePrompt = `You are the Agri-Assistant. Notice: Omniscient God AI Mode requires Super Admin authorization. Please explain this politely and provide standard expert agronomic assistance for the user's current company.`;
                }
            } else {
                modeRolePrompt = `You are an AI Agri-Assistant. You assist with navigating the app, tasks, notes, reminders, and harvest records.`;
            }

            const contextStr = context ? `
            Context:
            - Active Mode: ${effectiveMode.toUpperCase()}
            - Global Field & Voice Notes Index (${notesList.length} notes total): ${JSON.stringify(notesList)}
            - Harvest Entries: ${JSON.stringify(context.harvestEntries || [])}
            - Current Work Assignments: ${JSON.stringify(context.workAssignments || [])}
            - System Harvest Sales / Produce Record Count: ${produceLength}
            - Current Date: ${new Date().toISOString().split('T')[0]}
            ${modeContextStr}
            ` : '';

            const sopGuidance = `
            Standard Operating Procedure (SOP) Guide for the app:
            1. Profile Verification: Go to My Profile, verify identity.
            2. Company Registration: Go to Company Enterprise, create org, and add target crops along with custom varieties.
            3. Map Planner (Boundaries): Go to Map/Dashboard, draw operational boundaries, sections, trenches.
            4. Register Workers & Teams: Go to Individual Tools, register employees, create groups, assign IDs/QRs.
            5. Manage Stock: Go to Stock, add packaging, assign weights, upload invoices.
            6. Start Harvest Session: Go to Harvesting Module, select fields, teams.
            7. Live Monitoring: Stay in Harvesting Module, monitor operations.
            8. Weigh Station: In Harvesting Module, use the Weigh Station to scan QRs and input box weights.
            9. Storage/Market: Finish session, stock goes to Cold Storage, list it to Market.
            Use this SOP to guide the user if they ask how to use the app or how to do a specific process.
            `;

            const response = await executeGeminiCall({
                contents: `${modeRolePrompt}
                The user says: "${command}". 
                ${contextStr}
                ${sopGuidance}
                
                You can help with:
                - In-depth work and task analysis (detecting bottlenecks, evaluating planned vs actual hours, suggesting labor reassignments)
                - Practical agronomic advice (Bt spray timings, drip fertigation, fungicide windows, post-harvest fruit chilling)
                - Omniscient cross-company macro benchmarks (if in God AI mode)
                - Navigating the app (using the SOP Guide above)
                - Reminders, Tasks, Notes
                - Generating/exporting excel reports for harvest sales (set action type to "excel_export" if requested).
                
                IMPORTANT: If they ask to generate a harvest sale Excel:
                - If 'System Harvest Sales / Produce Record Count' is greater than 0, tell them you are generating and downloading their Excel spreadsheet now using active system records. Set 'action.type' to 'excel_export'.
                - If 'System Harvest Sales / Produce Record Count' is 0, let them know there are no active sales records in the current session. Explain that you are forwarding them directly to the Stock module's Harvest Sale (Produce) interface where they can manage logs and use the Export Excel button. Set 'action.type' to 'excel_export' (the client-side coordinator will then redirect them automatically).
                - Respond in a helpful, concise way.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING, description: "The conversational response to the user." },
                            action: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING, enum: ["task", "note", "reminder", "excel_export", "none"] },
                                    title: { type: Type.STRING },
                                    date: { type: Type.STRING, description: "ISO date string if applicable" },
                                    priority: { type: Type.STRING, enum: ["low", "medium", "high"] }
                                }
                            }
                        },
                        required: ["text"]
                    }
                }
            });
            
            const result = JSON.parse(response.text);
            
            const botMsg: AssistantMessage = { 
                id: (Date.now() + 1).toString(), 
                type: 'bot', 
                text: result.text || "I'm sorry, I couldn't process that.", 
            };
            setAssistantMessages(prev => [...prev, botMsg]);

            if (result.action && result.action.type !== 'none') {
                const title = result.action.title || command;
                if (result.action.type === 'task') {
                    if (context?.onAddTask) context.onAddTask(title);
                } else if (result.action.type === 'reminder') {
                    if (context?.onAddReminder) context.onAddReminder(title);
                    else if (context?.onAddTask) context.onAddTask(title);
                } else if (result.action.type === 'note') {
                    if (context?.onAddNote) context.onAddNote(title);
                } else if (result.action.type === 'excel_export') {
                    triggerHarvestSalesExcelExport(context);
                    if (context?.setAppMode) {
                        context.setAppMode('stock');
                    }
                }
            }
        } catch (error: any) {
            const errStr = error?.message || String(error);
            console.warn("[AI Assistant] Remote Gemini call unavailable, falling back to autonomous local agronomy engine:", errStr);
            
            const autonomous = generateAutonomousAssistantResponse(command, context, effectiveMode, errStr);
            
            const botMsg: AssistantMessage = { 
                id: (Date.now() + 1).toString(), 
                type: 'bot', 
                text: autonomous.text 
            };
            setAssistantMessages(prev => [...prev, botMsg]);

            if (autonomous.action && autonomous.action.type !== 'none') {
                const title = autonomous.action.title || command;
                if (autonomous.action.type === 'task') {
                    if (context?.onAddTask) context.onAddTask(title);
                } else if (autonomous.action.type === 'reminder') {
                    if (context?.onAddReminder) context.onAddReminder(title);
                    else if (context?.onAddTask) context.onAddTask(title);
                } else if (autonomous.action.type === 'note') {
                    if (context?.onAddNote) context.onAddNote(title);
                } else if (autonomous.action.type === 'excel_export') {
                    triggerHarvestSalesExcelExport(context);
                    if (context?.setAppMode) {
                        context.setAppMode('stock');
                    }
                }
            }
        } finally {
            setIsAssistantLoading(false);
        }
    };

    const handleMarketAnalysis = async (query: string) => {
        setIsAiLoading(true);
        setAiError(null);
        try {
            const result = await generateAgriBusinessAnalysis(query, language);
            setMarketAnalysisResult(result.analysis);
            setSources(result.sources); 
        } catch (err: any) {
            const errStr = err?.message || String(err);
            if (errStr.includes("GEMINI_KEY_MISSING") || errStr.includes("key is missing")) {
                setAiError('Gemini API key is missing. Please configure it in AI Settings.');
            } else if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
                setAiError('Gemini API quota/credits depleted (Error 429). Please update your key in AI Settings.');
            } else {
                setAiError('Failed to generate market analysis.');
            }
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSoilAnalysis = async (data: SoilData) => {
        setIsAiLoading(true);
        setAiError(null);
        try {
            const result = await generateSoilAnalysis(data, language);
            setSoilAnalysisResult(result);
        } catch (err: any) {
            const errStr = err?.message || String(err);
            if (errStr.includes("GEMINI_KEY_MISSING") || errStr.includes("key is missing")) {
                setAiError('Gemini API key is missing. Please configure it in AI Settings.');
            } else if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
                setAiError('Gemini API quota/credits depleted (Error 429). Please update your key in AI Settings.');
            } else {
                setAiError('Failed to analyze soil data.');
            }
        } finally {
            setIsAiLoading(false);
        }
    };

    const handlePlantDiseaseAnalysis = async (file: File) => {
        setIsAiLoading(true);
        setAiError(null);
        try {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const base64Data = await base64Promise;
            
            const result = await analyzePlantDisease(base64Data, file.type, language);
            setPlantDiseaseAnalysis(result);
        } catch (err) {
            setAiError('Failed to analyze plant disease.');
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleCompareDocuments = async (docs: UploadedDocument[]) => {
        setIsAiLoading(true);
        setAiError(null);
        try {
            const result = await generateDocumentComparison(docs, language);
            setDocumentAnalysisResult(result);
        } catch (err) {
            setAiError('Failed to compare documents.');
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleAgriImageAnalysis = async (file: File) => {
        setIsAiLoading(true);
        setAiError(null);
        try {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const base64Data = await base64Promise;
            
            const result = await analyzeAgriImage(base64Data, file.type, language);
            setAgriImageAnalysis(result);
        } catch (err) {
            setAiError('Failed to analyze agricultural image.');
        } finally {
            setIsAiLoading(false);
        }
    };

    return {
        assistantMessages,
        assistantMode,
        setAssistantMode,
        isAssistantLoading,
        isAiLoading,
        aiError,
        marketAnalysisResult,
        sources,
        soilAnalysisResult,
        uploadedDocuments,
        setUploadedDocuments,
        documentAnalysisResult,
        uploadedPlantImage,
        setUploadedPlantImage,
        plantDiseaseAnalysis,
        uploadedAgriImage,
        setUploadedAgriImage,
        agriImageAnalysis,
        setAgriImageAnalysis,
        handleSendCommand,
        handleMarketAnalysis,
        handleSoilAnalysis,
        handlePlantDiseaseAnalysis,
        handleAgriImageAnalysis,
        handleCompareDocuments
    };
};
