import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Map, 
    ArrowUpRight, 
    ArrowRight,
    Search,
    ShoppingBag,
    MessageSquare,
    Sparkles,
    Cpu,
    Video,
    Plane,
    Radio,
    Scale,
    Layers,
    CheckCircle2,
    Shield,
    Leaf,
    Users,
    Activity,
    Compass,
    X,
    Building2,
    Database,
    HardDrive,
    ExternalLink,
    ChevronDown
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { AppMode } from '../types';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRegister: () => void;
    onExplore: () => void;
    onLogin: (email: string, pass: string) => Promise<void>;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ 
    isOpen, 
    onClose, 
    onRegister, 
    onExplore,
    onLogin: _onLogin
}) => {
    const { language, setLanguage } = useLanguage();
    const isKa = language === 'ka';

    const [selectedRegion, setSelectedRegion] = useState<string>('all');
    const [selectedCropCategory, setSelectedCropCategory] = useState<string>('all');
    const [activePillarTab, setActivePillarTab] = useState<'all' | 'services' | 'market' | 'ai' | 'iot' | 'plantation'>('all');

    if (!isOpen) return null;

    const handleNavigate = (mode: AppMode) => {
        window.dispatchEvent(new CustomEvent('agrimap-mode-changed', { detail: { mode } }));
        onExplore();
    };

    const regions = [
        { id: 'all', nameKa: 'ყველა რეგიონი', nameEn: 'All Regions' },
        { id: 'guria', nameKa: 'გურია (ოზურგეთი, ლანჩხუთი)', nameEn: 'Guria (Ozurgeti, Lanchkhuti)' },
        { id: 'samegrelo', nameKa: 'სამეგრელო (ზუგდიდი, სენაკი)', nameEn: 'Samegrelo (Zugdidi, Senaki)' },
        { id: 'kakheti', nameKa: 'კახეთი (ყვარელი, თელავი)', nameEn: 'Kakheti (Kvareli, Telavi)' },
        { id: 'imereti', nameKa: 'იმერეთი (წყალტუბო, სამტრედია)', nameEn: 'Imereti (Tskaltubo, Samtredia)' },
        { id: 'kartli', nameKa: 'ქვემო & შიდა ქართლი', nameEn: 'Kvemo & Shida Kartli' },
        { id: 'adjara', nameKa: 'აჭარა (ქობულეთი, ჩაქვი)', nameEn: 'Adjara (Kobuleti, Chakvi)' },
    ];

    const cropCategories = [
        { id: 'all', nameKa: 'ყველა კულტურა', nameEn: 'All Crops' },
        { id: 'blueberry', nameKa: 'მოცვი (Duke, Legacy, Draper)', nameEn: 'Blueberries (Duke, Legacy, Draper)' },
        { id: 'hazelnut', nameKa: 'თხილი & კაკლოვნები (ანაკლიური)', nameEn: 'Hazelnuts & Nuts' },
        { id: 'grape', nameKa: 'ყურძენი & მევენახეობა (საფერავი)', nameEn: 'Grapes & Vineyards' },
        { id: 'citrus', nameKa: 'ციტრუსი (მანდარინი, ფორთოხალი)', nameEn: 'Citrus (Tangerine, Orange)' },
        { id: 'greenhouse', nameKa: 'სასათბურე ბოსტნეული & მწვანილი', nameEn: 'Greenhouse Vegetables' }
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[7000] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-[#16271c]/60 backdrop-blur-md overflow-hidden animate-fade-in">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 15 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="w-full h-full max-w-7xl max-h-[96vh] bg-[#FAFBF8] text-[#1D3224] rounded-none sm:rounded-[2.5rem] shadow-[0_20px_70px_rgba(18,36,25,0.35)] overflow-hidden border border-[#D8E3D4] flex flex-col relative"
                >
                    {/* Top Website Header Navbar matching FERE_7cfe5525.jpg */}
                    <header className="px-6 md:px-10 py-4 bg-[#FAFBF8] border-b border-[#E3EBE0] flex items-center justify-between shrink-0 z-30">
                        {/* Logo Left */}
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#1E3B2B] text-white flex items-center justify-center shadow-sm">
                                <Leaf className="w-5 h-5 text-[#86D49C]" />
                            </div>
                            <div>
                                <span className="text-xl md:text-2xl font-black tracking-tight text-[#163022] font-serif">
                                    GeoBlueBerry
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-[#4A7258] font-bold block leading-none">
                                    AgriMap Pro · sonik G2.0.1.4
                                </span>
                            </div>
                        </div>

                        {/* Center Navigation Links (matching FERE_7cfe5525.jpg) */}
                        <nav className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-[#385342]">
                            <button 
                                type="button"
                                onClick={() => handleNavigate('design')}
                                className="hover:text-[#163022] transition-colors cursor-pointer"
                            >
                                {isKa ? 'ჩვენი ბაღები' : 'Our Plantations'}
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleNavigate('marketplace')}
                                className="hover:text-[#163022] transition-colors cursor-pointer"
                            >
                                {isKa ? 'ჩვენი მოცვი' : 'Our Blueberries'}
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleNavigate('stock')}
                                className="hover:text-[#163022] transition-colors cursor-pointer"
                            >
                                {isKa ? 'ექსპორტი & საწყობი' : 'Export & Stock'}
                            </button>
                            <a 
                                href="https://agrimappro.com" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1 hover:text-[#163022] font-semibold text-[#1E3B2B] transition-colors"
                            >
                                AgriMap <ArrowUpRight className="w-3.5 h-3.5 text-[#2E6B47]" />
                            </a>
                        </nav>

                        {/* Right Actions: Request Quote, Language Dropdown & Close */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onRegister}
                                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1E3B2B] hover:bg-[#142A1E] text-white text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer active:scale-95"
                            >
                                <span>{isKa ? 'მოითხოვეთ შეთავაზება' : 'Request a Quote'}</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>

                            {/* Language Switcher Dropdown */}
                            <button
                                type="button"
                                onClick={() => setLanguage(isKa ? 'en' : 'ka')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#CFDCCB] bg-white text-[#22402E] text-xs font-semibold hover:bg-[#F2F7EF] transition-colors cursor-pointer shadow-2xs"
                            >
                                <span>{isKa ? 'ქართული' : 'English'}</span>
                                <ChevronDown className="w-3 h-3 text-[#5A7E67]" />
                            </button>

                            {/* Close Modal button */}
                            <button
                                type="button"
                                onClick={onExplore}
                                className="p-2 text-[#4E6B58] hover:text-[#163022] hover:bg-[#EEF4EB] rounded-full transition-colors cursor-pointer"
                                aria-label="Close"
                                title={isKa ? 'დახურვა' : 'Close'}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </header>

                    {/* Scrollable Website Body */}
                    <div className="flex-1 overflow-y-auto px-5 sm:px-8 md:px-12 py-6 md:py-8 space-y-10 custom-scrollbar bg-[#FAFBF8]">
                        
                        {/* Section 1: Hero Container (Light Pastel Herbal Sage from FERE_7cfe5525.jpg) */}
                        <section className="bg-[#EDF2E8] border border-[#DCE4D6] rounded-[2rem] p-6 sm:p-10 relative overflow-hidden shadow-xs">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                                
                                {/* Left Hero Copy */}
                                <div className="lg:col-span-7 space-y-5">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-[#CBD8C6] text-[#28573A] text-xs font-bold uppercase tracking-wider">
                                        <Sparkles className="w-3.5 h-3.5 text-[#2E6B47]" />
                                        <span>{isKa ? 'ციფრული სოფლის მეურნეობა · AGRIMAP PRO' : 'Digital Agriculture · AgriMap Pro'}</span>
                                    </div>

                                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#142A1E] font-serif leading-[1.15] tracking-tight">
                                        {isKa ? (
                                            <>
                                                სრული აგრონომიული კონტროლი, მარაგების <span className="text-[#2B6843] italic font-normal">ავტო-ჩამოწერა</span> და ანალიტიკა
                                            </>
                                        ) : (
                                            <>
                                                Mapping the Future of Farming — Stock, <span className="text-[#2B6843] italic font-normal">Agronomy</span> & Smart Logistics
                                            </>
                                        )}
                                    </h1>

                                    <p className="text-sm md:text-base text-[#385342] font-normal leading-relaxed max-w-2xl">
                                        {isKa
                                            ? 'AgriMap Pro ავტომატურად აკავშირებს მცენარეთა მკურნალობას, სასუქებსა და პესტიციდებს საწყობის ნაშთებთან. ნებისმიერი აგრო-ღონისძიების შესრულებისას მარაგი მყისიერად ჩამოიწერება, ხარჯები ნაწილდება ნაკვეთებზე და გენერირდება სრული სტატისტიკური ანგარიშგება.'
                                            : 'AgriMap Pro seamlessly interconnects field operations, fertilizer treatments, and spray records directly with real-time warehouse inventory. Logging any agronomy event instantly deducts stock balances, calculates per-hectare cost allocations, and consolidates high-precision reporting.'}
                                    </p>

                                    {/* Primary CTA and Quick Links */}
                                    <div className="flex flex-wrap items-center gap-3.5 pt-2">
                                        <button
                                            type="button"
                                            onClick={onExplore}
                                            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#1E3B2B] hover:bg-[#142A1E] text-white font-bold text-sm tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
                                        >
                                            <span>{isKa ? 'აპლიკაციის დაშბორდზე გადასვლა' : 'Launch Application Dashboard'}</span>
                                            <ArrowUpRight className="w-4 h-4" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleNavigate('marketplace')}
                                            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-[#F2F7EF] border border-[#CBD8C6] text-[#20422F] font-bold text-sm transition-all cursor-pointer shadow-2xs"
                                        >
                                            <ShoppingBag className="w-4 h-4 text-[#2B6843]" />
                                            <span>{isKa ? 'ბაზარი & პროდუქცია' : 'Market & Produce'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Right Minimalist Grid Symbols from FERE_7cfe5525.jpg */}
                                <div className="lg:col-span-5 grid grid-cols-2 gap-3 sm:gap-4">
                                    <div className="p-4 sm:p-5 rounded-2xl bg-white/90 border border-[#D5E1D0] space-y-1.5 shadow-2xs">
                                        <span className="text-xl text-[#2B6843] font-light">◎</span>
                                        <p className="text-sm font-black text-[#163022]">
                                            {isKa ? 'GIS ნაკვეთების რუკა' : 'GIS Field Mapping'}
                                        </p>
                                        <p className="text-xs text-[#52705D] leading-snug">
                                            {isKa ? 'საზღვრების, რიგებისა და ჯიშების ზუსტი ზონირება.' : 'Precise parcel, row, and crop zoning.'}
                                        </p>
                                    </div>

                                    <div className="p-4 sm:p-5 rounded-2xl bg-white/90 border border-[#D5E1D0] space-y-1.5 shadow-2xs">
                                        <span className="text-xl text-[#2B6843] font-light">❄</span>
                                        <p className="text-sm font-black text-[#163022]">
                                            {isKa ? 'საცივრე & ამწონი' : 'Cold Chain & Scales'}
                                        </p>
                                        <p className="text-xs text-[#52705D] leading-snug">
                                            {isKa ? 'ავტომატური აწონვა, ტარის მოჭრა და QR იარლიყები.' : 'Bluetooth scale capture & QR tagging.'}
                                        </p>
                                    </div>

                                    <div className="p-4 sm:p-5 rounded-2xl bg-white/90 border border-[#D5E1D0] space-y-1.5 shadow-2xs">
                                        <span className="text-xl text-[#2B6843] font-light">↗</span>
                                        <p className="text-sm font-black text-[#163022]">
                                            {isKa ? 'ექსპორტი & მარკეტი' : 'Export & Trading'}
                                        </p>
                                        <p className="text-xs text-[#52705D] leading-snug">
                                            {isKa ? 'B2B გაყიდვები პირდაპირ მწარმოებლიდან.' : 'Direct grower-to-buyer transactions.'}
                                        </p>
                                    </div>

                                    <div className="p-4 sm:p-5 rounded-2xl bg-white/90 border border-[#D5E1D0] space-y-1.5 shadow-2xs">
                                        <span className="text-xl text-[#2B6843] font-light">☷</span>
                                        <p className="text-sm font-black text-[#163022]">
                                            {isKa ? '100% ავტო-ჩამოწერა' : '100% Auto Depletion'}
                                        </p>
                                        <p className="text-xs text-[#52705D] leading-snug">
                                            {isKa ? 'საწყობის ნაშთების მყისიერი განახლება.' : 'Zero-error real-time stock deductions.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 2: Split Showcase (The Orchard Image & Editorial Copy from FERE_7cfe5525.jpg) */}
                        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
                            
                            {/* Left Column: Blueberry Orchard Photo with Holographic/GIS Hotspots */}
                            <div className="lg:col-span-6">
                                <div className="relative rounded-[2rem] overflow-hidden border border-[#D8E3D4] shadow-xl bg-slate-100 group">
                                    <img
                                        src="/assets/aistudio/FERE_7cfe5525.jpg"
                                        alt="AgriMap Plantation"
                                        className="w-full h-[380px] sm:h-[460px] object-cover object-bottom transition-transform duration-700 group-hover:scale-[1.02]"
                                    />
                                    
                                    {/* Subtle Top-Left Badge */}
                                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/60 shadow-sm">
                                        <span className="text-xs font-bold text-[#1E3B2B] flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-[#34A853] animate-pulse"></span>
                                            {isKa ? 'თქვენი ბაღი. ერთიან ქსელში.' : 'Your orchard. In a single network.'}
                                        </span>
                                    </div>

                                    {/* Hotspot 1: Soil Sensor */}
                                    <div className="absolute top-[32%] left-[24%] bg-[#1E3B2B]/90 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 shadow-md border border-white/30 animate-bounce duration-1000">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#86D49C]"></span>
                                        <span>{isKa ? 'ნიადაგის სენსორი' : 'Soil Sensor'}</span>
                                    </div>

                                    {/* Hotspot 2: Weather Station */}
                                    <div className="absolute top-[52%] right-[18%] bg-[#1E3B2B]/90 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 shadow-md border border-white/30">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#4FC3F7]"></span>
                                        <span>{isKa ? 'მეტეოსადგური' : 'Weather Station'}</span>
                                    </div>

                                    {/* Hotspot 3: Harvest Recording & Scale Station */}
                                    <div className="absolute bottom-[28%] left-[28%] bg-[#1E3B2B]/90 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 shadow-md border border-white/30">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#FFD54F]"></span>
                                        <span>{isKa ? 'მოსავლის აღრიცხვა' : 'Harvest Intake'}</span>
                                    </div>

                                    {/* Bottom Card Overlay on Image (Exact replica from FERE_7cfe5525.jpg) */}
                                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-[#DCE4D6] shadow-lg flex items-center gap-3.5">
                                        <div className="w-9 h-9 rounded-xl bg-[#EDF2E8] text-[#1E3B2B] flex items-center justify-center shrink-0">
                                            <Activity className="w-5 h-5 text-[#2B6843]" />
                                        </div>
                                        <div>
                                            <p className="text-xs sm:text-sm font-black text-[#163022]">
                                                {isKa ? 'პლანტაციის მონიტორინგი და მართვა.' : 'Plantation Monitoring & Management.'}
                                            </p>
                                            <p className="text-[11px] text-[#557060]">
                                                {isKa ? 'საოპერაციო მონაცემები ერთ პლატფორმაზე.' : 'All operational data in a unified platform.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Editorial Typography & Copy (Exact replica from FERE_7cfe5525.jpg) */}
                            <div className="lg:col-span-6 space-y-6">
                                <div className="space-y-3">
                                    <span className="text-xs font-black uppercase tracking-widest text-[#4C755B]">
                                        {isKa ? 'გაიცანით AGRIMAP' : 'DISCOVER AGRIMAP'}
                                    </span>
                                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#142A1E] font-serif leading-[1.15]">
                                        {isKa ? (
                                            <>
                                                მართვა.<br />
                                                <span className="italic font-normal text-[#2B6843]">მონაცემებზე დაფუძნებული</span> გადაწყვეტილებები.
                                            </>
                                        ) : (
                                            <>
                                                Management.<br />
                                                <span className="italic font-normal text-[#2B6843]">Data-driven</span> decisions.
                                            </>
                                        )}
                                    </h2>
                                </div>

                                <div className="space-y-4 text-sm sm:text-base text-[#385342] leading-relaxed font-normal">
                                    <p>
                                        {isKa 
                                            ? 'შექმენით თქვენი პლანტაციის ციფრული ტყუპი AgriMap-ით. დააკავშირეთ IoT მოწყობილობები, კამერები, დრონები და მეტეოსადგურები, რათა უკეთ დაინახოთ, რა ხდება თქვენს მიწაზე.'
                                            : 'Create a comprehensive digital twin of your plantation with AgriMap. Connect IoT sensors, surveillance cameras, drones, and microclimate stations to see exactly what is happening in your soil and rows.'}
                                    </p>
                                    <p>
                                        {isKa
                                            ? 'მართეთ ყოველი ეტაპი, გააანალიზეთ მონაცემები ხელოვნური ინტელექტით და გაამარტივეთ მოსავლის აღრიცხვა QR კოდებითა და ავტომატური აწონვით.'
                                            : 'Manage every production phase, analyze data with embedded artificial intelligence, and streamline harvest recording with batch QR codes and automated Bluetooth scale capture.'}
                                    </p>
                                </div>

                                {/* Metric Badges */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                    <div className="p-3 bg-[#EDF2E8] border border-[#DCE4D6] rounded-2xl text-center">
                                        <span className="text-xl font-black text-[#1E3B2B] block">100%</span>
                                        <span className="text-[10px] font-bold text-[#557060] uppercase">{isKa ? 'ავტო-ჩამოწერა' : 'Auto Stock'}</span>
                                    </div>
                                    <div className="p-3 bg-[#EDF2E8] border border-[#DCE4D6] rounded-2xl text-center">
                                        <span className="text-xl font-black text-[#2B6843] block">GIS</span>
                                        <span className="text-[10px] font-bold text-[#557060] uppercase">{isKa ? 'ნაკვეთის რუკა' : 'Field GIS'}</span>
                                    </div>
                                    <div className="p-3 bg-[#EDF2E8] border border-[#DCE4D6] rounded-2xl text-center">
                                        <span className="text-xl font-black text-[#1E3B2B] block">AI</span>
                                        <span className="text-[10px] font-bold text-[#557060] uppercase">{isKa ? 'აგრონომი' : 'Agro AI'}</span>
                                    </div>
                                    <div className="p-3 bg-[#EDF2E8] border border-[#DCE4D6] rounded-2xl text-center">
                                        <span className="text-xl font-black text-[#2B6843] block">OPEX</span>
                                        <span className="text-[10px] font-bold text-[#557060] uppercase">{isKa ? 'რეპორტინგი' : 'Reports'}</span>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleNavigate('design')}
                                        className="inline-flex items-center gap-2 text-sm font-bold text-[#1E3B2B] hover:text-[#2B6843] transition-colors cursor-pointer"
                                    >
                                        <span>{isKa ? 'გაიგეთ მეტი პლანტაციის ციფრული მართვის შესახებ' : 'Learn more about digital plantation management'}</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Section 3: Key Points & Interactive Filters Requested by User */}
                        <section className="space-y-6 pt-4 border-t border-[#E3EBE0]">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                <div>
                                    <span className="text-xs font-black uppercase tracking-widest text-[#4C755B]">
                                        {isKa ? 'პლატფორმის ძირითადი მიმართულებები & სერვისები' : 'Core Platform Capabilities & Regional Services'}
                                    </span>
                                    <h3 className="text-2xl sm:text-3xl font-black text-[#163022] font-serif mt-1">
                                        {isKa ? 'ყველა აგრო-ინსტრუმენტი ერთ ეკოსისტემაში' : 'Integrated Precision Agriculture Ecosystem'}
                                    </h3>
                                </div>

                                {/* Regional Filter Selector */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-[#52705D] shrink-0">
                                        {isKa ? 'რეგიონი:' : 'Region:'}
                                    </span>
                                    <select
                                        value={selectedRegion}
                                        onChange={(e) => setSelectedRegion(e.target.value)}
                                        className="px-3.5 py-2 rounded-xl bg-white border border-[#CBD8C6] text-xs font-bold text-[#1E3B2B] outline-none cursor-pointer hover:border-[#1E3B2B] transition-colors shadow-2xs"
                                    >
                                        {regions.map(r => (
                                            <option key={r.id} value={r.id}>
                                                {isKa ? r.nameKa : r.nameEn}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* 6 Core Functional Modules as Bright, Elegant Website Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                
                                {/* 1. Regional Services & Field Discovery */}
                                <div 
                                    onClick={() => handleNavigate('marketplace')}
                                    className="p-6 rounded-3xl bg-[#FAFBF8] border border-[#DCE4D6] hover:border-[#1E3B2B] hover:shadow-md transition-all cursor-pointer group space-y-3"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-[#EDF2E8] group-hover:bg-[#1E3B2B] text-[#1E3B2B] group-hover:text-white transition-colors flex items-center justify-center">
                                        <Search className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-base font-black text-[#163022] group-hover:text-[#2B6843] transition-colors">
                                        {isKa ? 'სერვისების შეთავაზება & ძიება რეგიონებში' : 'Regional Services & Provider Search'}
                                    </h4>
                                    <p className="text-xs text-[#4F6C5B] leading-relaxed">
                                        {isKa
                                            ? 'იპოვეთ და შესთავაზეთ აგრონომიული სერვისები საქართველოს რეგიონების მიხედვით (გურია, სამეგრელო, კახეთი, ქართლი): ნიადაგის ლაბორატორია, დრონით წამლობა, ტექნიკა და საცივრეები.'
                                            : 'Discover and offer localized agricultural services across Georgian regions: soil lab testing, drone precision spraying, harvesting equipment, and cold-storage logistics.'}
                                    </p>
                                    <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-[#1E3B2B] group-hover:underline">
                                        <span>{isKa ? 'სერვისების გახსნა' : 'Explore Services'}</span>
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </div>
                                </div>

                                {/* 2. B2B Market & Variety Search with AI */}
                                <div 
                                    onClick={() => handleNavigate('marketplace')}
                                    className="p-6 rounded-3xl bg-[#FAFBF8] border border-[#DCE4D6] hover:border-[#1E3B2B] hover:shadow-md transition-all cursor-pointer group space-y-3"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-[#EDF2E8] group-hover:bg-[#1E3B2B] text-[#1E3B2B] group-hover:text-white transition-colors flex items-center justify-center">
                                        <ShoppingBag className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-base font-black text-[#163022] group-hover:text-[#2B6843] transition-colors">
                                        {isKa ? 'აგრო მარკეტი & ჯიშების ძიება რუკაზე' : 'Agro Market & Crop Variety Search'}
                                    </h4>
                                    <p className="text-xs text-[#4F6C5B] leading-relaxed">
                                        {isKa
                                            ? 'პროდუქციის ყიდვა-გაყიდვა კულტურებისა და ჯიშების მიხედვით (მოცვი, თხილი, ყურძენი). AI ასისტენტი ეხმარება მყიდველებსა და ფერმერებს პირდაპირ გარიგებაში.'
                                            : 'Buy and sell agricultural harvest by crop and specific variety on the interactive map. AI assistant matches buyers and producers directly for price and volume transparency.'}
                                    </p>
                                    <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-[#1E3B2B] group-hover:underline">
                                        <span>{isKa ? 'მარკეტზე გადასვლა' : 'Open Marketplace'}</span>
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </div>
                                </div>

                                {/* 3. Communicator & Knowledge Forum */}
                                <div 
                                    onClick={() => handleNavigate('community')}
                                    className="p-6 rounded-3xl bg-[#FAFBF8] border border-[#DCE4D6] hover:border-[#1E3B2B] hover:shadow-md transition-all cursor-pointer group space-y-3"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-[#EDF2E8] group-hover:bg-[#1E3B2B] text-[#1E3B2B] group-hover:text-white transition-colors flex items-center justify-center">
                                        <MessageSquare className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-base font-black text-[#163022] group-hover:text-[#2B6843] transition-colors">
                                        {isKa ? 'კომუნიკატორი & ცოდნის ფორუმი' : 'Communicator & Knowledge Forum'}
                                    </h4>
                                    <p className="text-xs text-[#4F6C5B] leading-relaxed">
                                        {isKa
                                            ? 'ცოცხალი კავშირი თანამშრომლებს, კომპანიებს, მყიდველებსა და გამყიდველებს შორის ფასების სტაბილიზაციის, ხარისხის სტანდარტებისა და გამოცდილების გაზიარებისთვის.'
                                            : 'Unified communication between field workers, farm owners, sellers, and buyers to stabilize commodity pricing and maintain certified export quality standards.'}
                                    </p>
                                    <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-[#1E3B2B] group-hover:underline">
                                        <span>{isKa ? 'ფორუმის ნახვა' : 'Open Forum'}</span>
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </div>
                                </div>

                                {/* 4. AI Analysis & Offline Local God AI */}
                                <div 
                                    onClick={() => handleNavigate('ai')}
                                    className="p-6 rounded-3xl bg-[#FAFBF8] border border-[#DCE4D6] hover:border-[#1E3B2B] hover:shadow-md transition-all cursor-pointer group space-y-3"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-[#EDF2E8] group-hover:bg-[#1E3B2B] text-[#1E3B2B] group-hover:text-white transition-colors flex items-center justify-center">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-base font-black text-[#163022] group-hover:text-[#2B6843] transition-colors">
                                        {isKa ? 'აგრო ანალიტიკა & ლოკალური God AI' : 'Agro AI Analytics & Offline LAN Knowledge'}
                                    </h4>
                                    <p className="text-xs text-[#4F6C5B] leading-relaxed">
                                        {isKa
                                            ? 'AI ასისტენტი ყველა მოდულში: დაავადებების ამოცნობა ფოტოთი, წამლობის რეცეპტები და ლოკალური God AI ბაზა, რომელიც ინტერნეტის გარეშეც მუშაობს ფერმის ლოკალურ სერვერზე.'
                                            : 'AI assistance in every module: photo disease diagnosis, soil prescriptions, and centralized offline God AI knowledge running on your local network farm node.'}
                                    </p>
                                    <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-[#1E3B2B] group-hover:underline">
                                        <span>{isKa ? 'AI ანალიტიკოსის გახსნა' : 'Launch AI Analyst'}</span>
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </div>
                                </div>

                                {/* 5. IoT Cameras, Drones, GPS & 3D Modeling */}
                                <div 
                                    onClick={() => handleNavigate('labs')}
                                    className="p-6 rounded-3xl bg-[#FAFBF8] border border-[#DCE4D6] hover:border-[#1E3B2B] hover:shadow-md transition-all cursor-pointer group space-y-3"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-[#EDF2E8] group-hover:bg-[#1E3B2B] text-[#1E3B2B] group-hover:text-white transition-colors flex items-center justify-center">
                                        <Plane className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-base font-black text-[#163022] group-hover:text-[#2B6843] transition-colors">
                                        {isKa ? 'IoT კამერები, დრონები & GPS 3D მოდელი' : 'IoT Cameras, Drones & GPS 3D Models'}
                                    </h4>
                                    <p className="text-xs text-[#4F6C5B] leading-relaxed">
                                        {isKa
                                            ? 'პირდაპირი WebRTC ვიდეო სტრიმინგი, დრონის ორთოფოტო რუკები, 3D რელიეფის მოდელირება და მკრეფავთა GPS ID-ბარათები შრომის ხარისხის ზუსტი მონიტორინგისთვის.'
                                            : 'Live WebRTC camera feeds, drone orthophoto elevation models, and GPS ID-card tracking for precision labor productivity and work quality control.'}
                                    </p>
                                    <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-[#1E3B2B] group-hover:underline">
                                        <span>{isKa ? 'ტელემეტრიის ლაბორატორია' : 'View Hardware Labs'}</span>
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </div>
                                </div>

                                {/* 6. Plantation Management & Stock Auto-Depletion */}
                                <div 
                                    onClick={() => handleNavigate('harvesting')}
                                    className="p-6 rounded-3xl bg-[#FAFBF8] border border-[#DCE4D6] hover:border-[#1E3B2B] hover:shadow-md transition-all cursor-pointer group space-y-3"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-[#EDF2E8] group-hover:bg-[#1E3B2B] text-[#1E3B2B] group-hover:text-white transition-colors flex items-center justify-center">
                                        <Scale className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-base font-black text-[#163022] group-hover:text-[#2B6843] transition-colors">
                                        {isKa ? 'პლანტაციის მართვა & საწყობის ავტო-ჩამოწერა' : 'Plantation System & Stock Auto-Depletion'}
                                    </h4>
                                    <p className="text-xs text-[#4F6C5B] leading-relaxed">
                                        {isKa
                                            ? 'ციფრული სასწორები (Yaohua / CAS), ავტომატური აწონვა, ტარის გამოკლება და QR იარლიყები. სასუქისა და წამლობის შეტანისას საწყობი ავტომატურად ჩამოიწერება.'
                                            : 'Hardware scale bridge (Yaohua/CAS), auto-tare deduction, harvest QR codes, and zero-error stock deduction when chemical or fertilizer runs are executed.'}
                                    </p>
                                    <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-[#1E3B2B] group-hover:underline">
                                        <span>{isKa ? 'მოსავლის აღრიცხვა' : 'Harvest Intake'}</span>
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </div>
                                </div>

                            </div>
                        </section>

                    </div>

                    {/* Clean Website Footer Bar */}
                    <footer className="px-6 md:px-10 py-4 bg-[#EDF2E8] border-t border-[#DCE4D6] flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 z-30">
                        <div className="flex items-center gap-3 text-xs text-[#456852]">
                            <span className="font-bold text-[#163022]">AgriMap Pro</span>
                            <span>•</span>
                            <span>{isKa ? 'საქართველოს ციფრული აგრონომიული ინფრასტრუქტურა' : 'Georgian Precision Agriculture Digital Platform'}</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <a
                                href="https://agrimappro.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#F2F7EF] border border-[#CBD8C6] text-xs font-bold text-[#1E3B2B] transition-colors shadow-2xs"
                            >
                                <ExternalLink className="w-3.5 h-3.5 text-[#2B6843]" />
                                <span>AGRIMAPPRO.COM</span>
                            </a>

                            <button
                                type="button"
                                onClick={onExplore}
                                className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-[#1E3B2B] hover:bg-[#142A1E] text-white text-xs font-bold tracking-wide transition-all shadow-xs cursor-pointer active:scale-95"
                            >
                                <span>{isKa ? 'აპლიკაციის დაშბორდზე გადასვლა' : 'Launch Dashboard'}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </footer>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default WelcomeModal;
