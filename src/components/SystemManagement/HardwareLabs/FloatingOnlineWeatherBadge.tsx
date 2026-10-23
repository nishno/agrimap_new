import React, { useState, useEffect, useRef } from 'react';
import { 
    CloudRain, Sun, Wind, Droplets, Thermometer, 
    X, ChevronDown, RefreshCw, BarChart2, Sparkles, 
    MapPin, Calendar, GripVertical, Search, Plus, Send,
    ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { safeStorage } from '../../../services/storageService';
import { 
    WeatherLocation, 
    CurrentWeatherReport, 
    DailyForecastItem, 
    getSavedWeatherLocations,
    saveWeatherLocations,
    searchGlobalWeatherLocations,
    addCustomWeatherLocation,
    resolvePrimaryPlantationWeatherLocation,
    fetchLiveOnlineWeatherData, 
    logDailyWeatherRecord,
    getHistoricalWeatherLogs,
    askWeatherAiAnalysis
} from '../../../services/weatherService';
import type { PlantationFeature } from '../../../types';

interface FloatingOnlineWeatherBadgeProps {
    plantationFeatures?: PlantationFeature[];
    activeOrgId?: string | null;
    isKa?: boolean;
    defaultExpanded?: boolean;
    onFlyToCoords?: (coords: [number, number], name: string) => void;
    storageKey?: string;
    initialPosition?: { x?: number; y?: number };
}

export const FloatingOnlineWeatherBadge: React.FC<FloatingOnlineWeatherBadgeProps> = ({
    plantationFeatures = [],
    activeOrgId,
    isKa = false,
    defaultExpanded = false,
    onFlyToCoords,
    storageKey = 'agrimap_weather_badge_pos'
}) => {
    const [locations, setLocations] = useState<WeatherLocation[]>(getSavedWeatherLocations());
    const primaryDefault = resolvePrimaryPlantationWeatherLocation(plantationFeatures, activeOrgId);
    
    const [selectedLocationId, setSelectedLocationId] = useState<string>(primaryDefault.id || 'loc-anaseuli');
    const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
    const [weather, setWeather] = useState<CurrentWeatherReport | null>(null);
    const [forecast, setForecast] = useState<DailyForecastItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
    const [aiAdvisory, setAiAdvisory] = useState<string | null>(null);
    const [customAiQuery, setCustomAiQuery] = useState<string>('');

    // Search & Add Location State
    const [showLocationSearch, setShowLocationSearch] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<WeatherLocation[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);

    // Draggable position state
    const [badgePos, setBadgePos] = useState<{ x: number; y: number } | null>(() => {
        try {
            const raw = safeStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) return parsed;
            }
        } catch (_) {}
        return null;
    });

    const badgeRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

    const currentLocation = locations.find(l => l.id === selectedLocationId) || primaryDefault;

    // Load weather data for chosen location
    const loadWeather = async (loc: WeatherLocation) => {
        setIsLoading(true);
        try {
            const data = await fetchLiveOnlineWeatherData(loc.lat, loc.lng);
            setWeather(data.current);
            setForecast(data.forecast);
            logDailyWeatherRecord(loc, data.current, 'ONLINE_OPEN_METEO');
        } catch (e) {
            console.warn('[FloatingOnlineWeatherBadge] Fallback weather active:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadWeather(currentLocation);
    }, [currentLocation.id, currentLocation.lat, currentLocation.lng]);

    // Handle Location Search
    useEffect(() => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            const res = await searchGlobalWeatherLocations(searchQuery);
            setSearchResults(res);
            setIsSearching(false);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectSearchedLocation = (loc: WeatherLocation) => {
        const updatedList = addCustomWeatherLocation(loc);
        setLocations(updatedList);
        setSelectedLocationId(loc.id);
        setShowLocationSearch(false);
        setSearchQuery('');
        if (onFlyToCoords) {
            onFlyToCoords([loc.lat, loc.lng], loc.name);
        }
        toast.success(isKa ? `ლოკაცია დაემატა: ${loc.name}` : `Location added: ${loc.name}`);
    };

    // Handle Custom or Preset AI Advisory
    const handleRunAiAnalysis = async (overridePrompt?: string) => {
        if (!weather) return;
        setIsAiLoading(true);
        try {
            const hist = getHistoricalWeatherLogs(currentLocation.id);
            const prompt = overridePrompt || (customAiQuery.trim()
                ? customAiQuery.trim()
                : `Analyze microclimate, humidity, frost hazard, and crop/variety suitability for ${currentLocation.name}. Recommend physical sensors like D20S-LB and rain gauge.`);

            const result = await askWeatherAiAnalysis({
                prompt,
                primaryLocation: currentLocation,
                primaryWeather: weather,
                primaryForecast: forecast,
                historicalLogs: hist,
                isKa
            });
            setAiAdvisory(result);
            toast.success(isKa ? 'AI ანალიზი მზადაა' : 'AI Analysis ready');
        } catch (e) {
            toast.error(isKa ? 'AI ანალიზი ვერ შესრულდა' : 'AI analysis failed');
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSelectLocation = (locId: string) => {
        if (locId === '__add_new__') {
            setShowLocationSearch(true);
            return;
        }
        setSelectedLocationId(locId);
        const loc = locations.find(l => l.id === locId);
        if (loc && onFlyToCoords) {
            onFlyToCoords([loc.lat, loc.lng], loc.name);
            toast.success(isKa ? `რუკა გადაფრინდა: ${loc.name}` : `Flying map to: ${loc.name}`);
        }
    };

    // Draggable handlers with window listeners for smooth tablet/mobile dragging
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const targetEl = e.currentTarget;
        try { targetEl.setPointerCapture(e.pointerId); } catch {}
        const rect = badgeRef.current?.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = rect ? rect.left : 16;
        const startTop = rect ? rect.top : 70;
        const badgeWidth = rect?.width || 310;
        const badgeHeight = rect?.height || 60;

        const onPointerMove = (moveEvt: PointerEvent) => {
            moveEvt.preventDefault();
            const deltaX = moveEvt.clientX - startX;
            const deltaY = moveEvt.clientY - startY;
            const newLeft = Math.max(8, Math.min(window.innerWidth - badgeWidth - 8, startLeft + deltaX));
            const newTop = Math.max(8, Math.min(window.innerHeight - badgeHeight - 8, startTop + deltaY));
            setBadgePos({ x: Math.round(newLeft), y: Math.round(newTop) });
        };

        const onPointerUp = (upEvt: PointerEvent) => {
            try { targetEl.releasePointerCapture(upEvt.pointerId); } catch {}
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            setBadgePos(curr => {
                if (curr) safeStorage.setItem(storageKey, JSON.stringify(curr));
                return curr;
            });
        };

        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerUp, { passive: false });
    };

    if (!weather) {
        return (
            <div className="bg-slate-900/90 text-white px-2.5 py-1.5 rounded-2xl border border-sky-500/40 shadow-xl backdrop-blur-md text-[10px] flex items-center gap-1.5 font-bold pointer-events-auto">
                <CloudRain size={13} className="text-sky-400 animate-pulse" />
                <span>{isKa ? 'ამინდის სინქრონიზაცია...' : 'Syncing weather...'}</span>
            </div>
        );
    }

    return (
        <div 
            ref={badgeRef}
            style={badgePos ? {
                position: 'fixed',
                left: `${badgePos.x}px`,
                top: `${badgePos.y}px`,
                zIndex: 3200
            } : undefined}
            className={`bg-slate-950/95 border border-sky-500/50 text-white rounded-2xl shadow-2xl backdrop-blur-xl transition-all select-none w-[310px] sm:w-[350px] pointer-events-auto ${badgePos ? '' : 'relative'}`}
        >
            {/* Top Bar with Drag Handle & Collapsed Header */}
            <div className="p-2 flex items-center justify-between gap-1.5 text-xs border-b border-slate-800/80">
                {/* Drag Handle */}
                <div
                    onPointerDown={handlePointerDown}
                    className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-grab active:cursor-grabbing transition-colors shrink-0 touch-none min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title={isKa ? 'გადაათრიეთ ამინდის პანელი ეკრანზე' : 'Drag to move weather widget anywhere'}
                >
                    <GripVertical size={16} />
                </div>

                {/* Weather Pill Summary */}
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex-1 flex items-center gap-2 text-left cursor-pointer hover:opacity-90 transition-opacity min-w-0"
                    title={isKa ? 'დააწკაპუნეთ გასაშლელად/ჩასაკეცად' : 'Click to expand/collapse'}
                >
                    <div className="p-1.5 bg-sky-950 text-sky-400 border border-sky-700/60 rounded-xl shrink-0">
                        <CloudRain size={14} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="font-black text-sky-300 text-xs">
                                {weather.tempC}°C
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                                {weather.humidityPct}% 💧
                            </span>
                            <span className={`px-1 py-0.2 rounded text-[8px] font-black uppercase ${
                                weather.frostRisk === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                                weather.frostRisk === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-800' :
                                weather.frostRisk === 'MEDIUM' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                                'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}>
                                {weather.frostRisk}
                            </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold block truncate">
                            📍 {currentLocation.name}
                        </span>
                    </div>
                </button>

                {/* Location Selector & Expand Arrow */}
                <div className="flex items-center gap-1 shrink-0">
                    <select
                        value={selectedLocationId}
                        onChange={(e) => handleSelectLocation(e.target.value)}
                        className="bg-slate-900 border border-slate-700 hover:border-sky-400 rounded-xl px-1.5 py-1 text-[10px] font-bold text-sky-200 outline-none cursor-pointer max-w-[100px] truncate"
                        title={isKa ? 'ლოკაციის არჩევა' : 'Choose location'}
                    >
                        {locations.map(loc => (
                            <option key={loc.id} value={loc.id} className="bg-slate-950 text-white">
                                {loc.name}
                            </option>
                        ))}
                        <option value="__add_new__" className="bg-slate-950 text-sky-400 font-bold">
                            ➕ {isKa ? 'სხვა ქალაქი / ლოკაცია...' : 'Add Location...'}
                        </option>
                    </select>

                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                        <ChevronDown size={14} className={isExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    </button>
                </div>
            </div>

            {/* Quick Location Search Modal / Drawer */}
            {showLocationSearch && (
                <div className="p-2.5 bg-slate-900 border-b border-slate-800 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] font-bold text-sky-300">
                        <span className="flex items-center gap-1">
                            <Search size={12} /> {isKa ? 'მოძებნეთ ქალაქი ან რეგიონი:' : 'Search City / Region:'}
                        </span>
                        <button
                            type="button"
                            onClick={() => setShowLocationSearch(false)}
                            className="text-slate-400 hover:text-white p-0.5"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isKa ? 'მაგ. Batumi, Kobuleti, Kutaisi...' : 'e.g. Batumi, Kobuleti, Tbilisi...'}
                            className="w-full pl-7 pr-2.5 py-1 bg-slate-950 border border-slate-700 focus:border-sky-400 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                            autoFocus
                        />
                        <Search size={12} className="absolute left-2.5 top-2 text-slate-400 pointer-events-none" />
                    </div>

                    {isSearching && (
                        <div className="text-[10px] text-sky-400 animate-pulse text-center py-1 font-bold">
                            {isKa ? 'ძიება Open-Meteo ბაზაში...' : 'Searching Open-Meteo...'}
                        </div>
                    )}

                    {searchResults.length > 0 && (
                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                            {searchResults.map((res) => (
                                <button
                                    key={res.id}
                                    type="button"
                                    onClick={() => handleSelectSearchedLocation(res)}
                                    className="w-full p-1.5 bg-slate-950 hover:bg-sky-950/60 border border-slate-800 hover:border-sky-500/60 rounded-xl text-left text-xs flex items-center justify-between transition-colors group cursor-pointer"
                                >
                                    <div className="truncate mr-2">
                                        <span className="font-bold text-white block text-[11px] truncate">{res.name}</span>
                                        <span className="text-[9px] text-slate-400 font-mono">[{res.lat.toFixed(3)}, {res.lng.toFixed(3)}]</span>
                                    </div>
                                    <Plus size={12} className="text-sky-400 shrink-0 group-hover:scale-125 transition-transform" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Expanded Microclimate & Forecast Body */}
            {isExpanded && (
                <div className="p-3 space-y-2.5 text-xs animate-in slide-in-from-top-2 duration-150">
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                        <div className="p-1.5 bg-slate-900/90 rounded-xl border border-slate-800">
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">გრძნობა</span>
                            <span className="font-black text-sky-200">{weather.feelsLikeC}°C</span>
                        </div>
                        <div className="p-1.5 bg-slate-900/90 rounded-xl border border-slate-800">
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">ნალექი</span>
                            <span className="font-black text-blue-300">{weather.dailyRainTotalMm} მმ</span>
                        </div>
                        <div className="p-1.5 bg-slate-900/90 rounded-xl border border-slate-800">
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">ქარი</span>
                            <span className="font-black text-amber-200">{weather.windSpeedKmh} კმ/სთ</span>
                        </div>
                    </div>

                    {/* 5-Day Forecast Strip */}
                    {forecast.length > 0 && (
                        <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                                7-დღიანი პროგნოზი (Open-Meteo):
                            </span>
                            <div className="grid grid-cols-5 gap-1 text-center">
                                {forecast.slice(0, 5).map((f, idx) => (
                                    <div key={`badge-fc-${f.date}-${idx}`} className="p-1 bg-slate-900/80 rounded-lg border border-slate-800">
                                        <span className="text-[8px] text-slate-400 block uppercase font-bold">
                                            {f.dayOfWeek.slice(0, 3)}
                                        </span>
                                        <span className="text-[9px] font-black text-white">
                                            {f.maxTempC}°
                                        </span>
                                        <span className="text-[8px] text-slate-400 block font-normal">
                                            {f.minTempC}°
                                        </span>
                                        {f.rainMm > 0 && (
                                            <span className="text-[7px] text-blue-400 font-bold block font-mono">
                                                {f.rainMm}მმ
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Custom Question to AI Field */}
                    <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-indigo-300 flex items-center gap-1">
                            <Sparkles size={11} className="text-indigo-400" />
                            {isKa ? 'ჰკითხეთ AI-ს კონკრეტული ანალიზი:' : 'Ask AI specific question on weather:'}
                        </span>
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                value={customAiQuery}
                                onChange={(e) => setCustomAiQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRunAiAnalysis();
                                }}
                                placeholder={isKa ? 'მაგ. მოცვისთვის ყინვის რისკი ან D20S-LB...' : 'e.g. frost impact on blueberries or D20S-LB...'}
                                className="flex-1 px-2.5 py-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg text-[10px] text-white placeholder-slate-500 outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => handleRunAiAnalysis()}
                                disabled={isAiLoading}
                                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer transition-colors shrink-0 disabled:opacity-50"
                                title="Run AI Analysis"
                            >
                                <Send size={11} className={isAiLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* AI Advisory Drawer */}
                    {aiAdvisory && (
                        <div className="p-2.5 bg-indigo-950/70 border border-indigo-700/60 rounded-xl space-y-1 text-[10px]">
                            <div className="flex items-center justify-between text-indigo-300 font-bold">
                                <span className="flex items-center gap-1">
                                    <Sparkles size={11} /> AI აგრო-რეკომენდაცია:
                                </span>
                                <button type="button" onClick={() => setAiAdvisory(null)} className="text-slate-400 hover:text-white">✕</button>
                            </div>
                            <p className="text-slate-200 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-line pr-1 font-medium text-[10px]">
                                {aiAdvisory}
                            </p>
                        </div>
                    )}

                    {/* Bottom Action Strip */}
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={() => handleRunAiAnalysis()}
                            disabled={isAiLoading}
                            className="py-1 px-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                        >
                            <Sparkles size={11} className={isAiLoading ? 'animate-spin' : ''} />
                            <span>{isAiLoading ? 'ანალიზი...' : 'AI აგრო-ანალიზი'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowLocationSearch(true)}
                            className="py-1 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                            <Plus size={11} />
                            <span>{isKa ? 'ლოკაცია' : 'Location'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => loadWeather(currentLocation)}
                            disabled={isLoading}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl cursor-pointer transition-colors shrink-0"
                            title="Refresh weather data"
                        >
                            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
