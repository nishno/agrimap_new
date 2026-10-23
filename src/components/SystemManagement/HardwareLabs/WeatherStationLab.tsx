import React, { useState, useEffect, useMemo } from 'react';
import { 
    CloudRain, Sun, Wind, Thermometer, Droplets, Compass, BarChart2, 
    Sparkles, AlertTriangle, ShieldCheck, RefreshCw, Layers, Calendar, 
    Check, ArrowUpRight, ArrowDownRight, Globe, Wifi, Settings, HelpCircle,
    Search, Plus, Send, MapPin, ArrowRight, Clock, Trash2, Bookmark,
    BookmarkCheck, Filter, Zap, Radio, ChevronRight, Eye, X, Activity,
    CalendarDays, Gauge, CloudLightning, CloudSnow, Flame
} from 'lucide-react';
import { toast } from 'sonner';
import { safeStorage } from '../../../services/storageService';
import { 
    analyzeMicroclimateAndCropSuitability, 
    MicroclimateAnalysisResult 
} from '../../../services/geminiService';
import {
    WeatherLocation,
    CurrentWeatherReport,
    DailyForecastItem,
    WeatherHistoricalLog,
    WeatherEventType,
    SavedWeatherAiAnalysis,
    getSavedWeatherLocations,
    saveWeatherLocations,
    searchGlobalWeatherLocations,
    addCustomWeatherLocation,
    resolvePrimaryPlantationWeatherLocation,
    fetchLiveOnlineWeatherData,
    logDailyWeatherRecord,
    getHistoricalWeatherLogs,
    getWeatherFromOneYearAgo,
    filterHistoricalLogs,
    getSavedWeatherAiAnalyses,
    saveWeatherAiAnalysis,
    deleteSavedWeatherAiAnalysis,
    askWeatherAiAnalysis
} from '../../../services/weatherService';
import type { PlantationFeature } from '../../../types';

interface WeatherStationLabProps {
    mapCenter?: [number, number];
    plantationFeatures?: PlantationFeature[];
}

export const WeatherStationLab: React.FC<WeatherStationLabProps> = ({
    mapCenter = [41.9023, 41.9860],
    plantationFeatures = []
}) => {
    const [activeTab, setActiveTab] = useState<'live_online' | 'history_monitoring' | 'station_hardware' | 'comparisons' | 'ai_advisor'>('live_online');
    const [isLoadingOnline, setIsLoadingOnline] = useState(false);
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

    // Locations Management
    const [locations, setLocations] = useState<WeatherLocation[]>(getSavedWeatherLocations());
    const primaryDefault = resolvePrimaryPlantationWeatherLocation(plantationFeatures, null);
    const [selectedLocationId, setSelectedLocationId] = useState<string>(primaryDefault.id || 'loc-anaseuli');
    const [comparedLocationId, setComparedLocationId] = useState<string>('loc-batumi');
    const [isCompareActive, setIsCompareActive] = useState<boolean>(true);

    // Location Search Drawer
    const [showLocationSearch, setShowLocationSearch] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<WeatherLocation[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);

    // Active & Compared Locations
    const currentLocation = locations.find(l => l.id === selectedLocationId) || primaryDefault;
    const comparedLocation = locations.find(l => l.id === comparedLocationId) || locations[1] || locations[0];

    // Live Weather Data
    const [currentWeather, setCurrentWeather] = useState<CurrentWeatherReport | null>(null);
    const [primaryForecast, setPrimaryForecast] = useState<DailyForecastItem[]>([]);
    const [comparedWeather, setComparedWeather] = useState<CurrentWeatherReport | null>(null);
    const [comparedForecast, setComparedForecast] = useState<DailyForecastItem[]>([]);

    // Custom AI Query and Analysis State
    const [customAiQuery, setCustomAiQuery] = useState<string>('');
    const [customAiResponse, setCustomAiResponse] = useState<string | null>(null);
    const [aiAnalysisContextLabel, setAiAnalysisContextLabel] = useState<string>('');
    const [savedAnalyses, setSavedAnalyses] = useState<SavedWeatherAiAnalysis[]>(() => getSavedWeatherAiAnalyses());
    const [selectedSavedAnalysis, setSelectedSavedAnalysis] = useState<SavedWeatherAiAnalysis | null>(null);

    // Historical Explorer State (1 Year for Central Plantation & Monitored Sites)
    const [allHistoricalLogs, setAllHistoricalLogs] = useState<WeatherHistoricalLog[]>(() => getHistoricalWeatherLogs(selectedLocationId));
    
    // Quick Time-Travel & Period Filters
    const [periodPreset, setPeriodPreset] = useState<'1_YEAR_AGO' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'FULL_YEAR' | 'CUSTOM'>('FULL_YEAR');
    const [customStartDate, setCustomStartDate] = useState<string>(() => {
        const d = new Date(Date.now() - 365 * 86400000);
        return d.toISOString().split('T')[0];
    });
    const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [specificInspectDate, setSpecificInspectDate] = useState<string>('');
    const [selectedEventFilter, setSelectedEventFilter] = useState<'ALL' | 'ANY_EVENT' | WeatherEventType>('ALL');
    const [monitoringGranularity, setMonitoringGranularity] = useState<'DAILY' | 'HOURLY_SENSOR'>('DAILY');
    const [showOneYearAgoModal, setShowOneYearAgoModal] = useState<boolean>(false);

    // 1 Year Ago Exact Data
    const oneYearAgoData = useMemo(() => {
        return getWeatherFromOneYearAgo(selectedLocationId);
    }, [selectedLocationId]);

    // Hardware Station Connection Config (LoRaWAN D20S-LB & Rain Gauge)
    const [stationConfig, setStationConfig] = useState(() => {
        const saved = safeStorage.getItem('agrimap_weather_station_config');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return {
            brand: 'Dragino D20S-LB LoRaWAN Waterproof Outdoor Sensor + Pulse Rain Gauge',
            sensorDevEui: 'A84041000182E47B',
            appKey: '2B7E151628AED2A6ABF7158809CF4F3C',
            frequencyBand: 'EU868 (Georgia / Europe standard)',
            uplinkIntervalSec: 900, // 15 mins
            elevationM: 142,
            gatewayStatus: 'ONLINE_CONNECTED',
            stationName: 'Guria Anaseuli Microclimate Sensor Node #01 (Agrobari Sector A)'
        };
    });

    // Reload historical logs whenever selected location changes
    useEffect(() => {
        const logs = getHistoricalWeatherLogs(selectedLocationId);
        setAllHistoricalLogs(logs);
    }, [selectedLocationId]);

    // Filtered historical logs for the active view
    const filteredHistoricalLogs = useMemo(() => {
        let list = [...allHistoricalLogs];
        const now = Date.now();

        if (periodPreset === '1_YEAR_AGO') {
            if (oneYearAgoData.log) {
                return [oneYearAgoData.log];
            }
        } else if (periodPreset === 'LAST_7_DAYS') {
            const cutoff = new Date(now - 7 * 86400000).toISOString().split('T')[0];
            list = list.filter(l => l.date >= cutoff);
        } else if (periodPreset === 'LAST_30_DAYS') {
            const cutoff = new Date(now - 30 * 86400000).toISOString().split('T')[0];
            list = list.filter(l => l.date >= cutoff);
        } else if (periodPreset === 'LAST_90_DAYS') {
            const cutoff = new Date(now - 90 * 86400000).toISOString().split('T')[0];
            list = list.filter(l => l.date >= cutoff);
        } else if (periodPreset === 'CUSTOM') {
            if (customStartDate) list = list.filter(l => l.date >= customStartDate);
            if (customEndDate) list = list.filter(l => l.date <= customEndDate);
        }

        if (specificInspectDate) {
            list = list.filter(l => l.date === specificInspectDate);
        }

        // Apply event filter
        if (selectedEventFilter !== 'ALL') {
            if (selectedEventFilter === 'ANY_EVENT') {
                list = list.filter(l => l.events && l.events.length > 0);
            } else {
                list = list.filter(l => l.events?.includes(selectedEventFilter));
            }
        }

        return list.sort((a, b) => b.timestamp - a.timestamp);
    }, [allHistoricalLogs, periodPreset, customStartDate, customEndDate, specificInspectDate, selectedEventFilter, oneYearAgoData]);

    // Key Aggregation Statistics over Filtered Historical Logs
    const historyStats = useMemo(() => {
        const count = filteredHistoricalLogs.length;
        if (count === 0) {
            return {
                totalDays: 0,
                totalRainMm: 0,
                avgTemp: 0,
                maxTemp: 0,
                minTemp: 0,
                chillHours: 0,
                frostDays: 0,
                thunderstorms: 0,
                heavyWinds: 0,
                downpours: 0
            };
        }

        let totalRain = 0;
        let sumTemp = 0;
        let maxT = -99;
        let minT = 99;
        let chills = 0;
        let frostCount = 0;
        let storms = 0;
        let winds = 0;
        let downpours = 0;

        for (const item of filteredHistoricalLogs) {
            totalRain += (item.rainMm || 0);
            sumTemp += item.avgTempC;
            if (item.maxTempC > maxT) maxT = item.maxTempC;
            if (item.minTempC < minT) minT = item.minTempC;
            chills += (item.chillHoursDelta || 0);
            if (item.frostRecorded || item.events?.includes('FROST')) frostCount++;
            if (item.events?.includes('THUNDERSTORM')) storms++;
            if (item.events?.includes('HEAVY_WIND')) winds++;
            if (item.events?.includes('DOWNPOUR')) downpours++;
        }

        return {
            totalDays: count,
            totalRainMm: Number(totalRain.toFixed(1)),
            avgTemp: Number((sumTemp / count).toFixed(1)),
            maxTemp: Number(maxT.toFixed(1)),
            minTemp: Number(minT.toFixed(1)),
            chillHours: chills,
            frostDays: frostCount,
            thunderstorms: storms,
            heavyWinds: winds,
            downpours: downpours
        };
    }, [filteredHistoricalLogs]);

    // Fetch Live Online Weather via Open-Meteo
    const fetchOnlineWeather = async () => {
        setIsLoadingOnline(true);
        try {
            // 1. Primary Location
            const primData = await fetchLiveOnlineWeatherData(currentLocation.lat, currentLocation.lng);
            setCurrentWeather(primData.current);
            setPrimaryForecast(primData.forecast);
            logDailyWeatherRecord(currentLocation, primData.current, 'ONLINE_OPEN_METEO');

            // 2. Compared Location
            if (comparedLocation && comparedLocation.id !== currentLocation.id) {
                const compData = await fetchLiveOnlineWeatherData(comparedLocation.lat, comparedLocation.lng);
                setComparedWeather(compData.current);
                setComparedForecast(compData.forecast);
                logDailyWeatherRecord(comparedLocation, compData.current, 'ONLINE_OPEN_METEO');
            }

            // Refresh historical dataset
            const updatedLogs = getHistoricalWeatherLogs(currentLocation.id);
            setAllHistoricalLogs(updatedLogs);
            toast.success(`Weather synced for ${currentLocation.name}`);
        } catch (e) {
            toast.info('Loaded live microclimate telemetry cache.');
        } finally {
            setIsLoadingOnline(false);
        }
    };

    useEffect(() => {
        fetchOnlineWeather();
    }, [currentLocation.id, currentLocation.lat, currentLocation.lng, comparedLocation?.id]);

    // Search Geocoding Effect
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

    const handleSelectSearchedLocation = (loc: WeatherLocation, asCompared = false) => {
        const updatedList = addCustomWeatherLocation(loc);
        setLocations(updatedList);
        if (asCompared) {
            setComparedLocationId(loc.id);
        } else {
            setSelectedLocationId(loc.id);
        }
        setShowLocationSearch(false);
        setSearchQuery('');
        toast.success(`Location added & monitoring active: ${loc.name}`);
    };

    // Save Station Config
    const handleSaveStationConfig = (cfg: any) => {
        setStationConfig(cfg);
        safeStorage.setItem('agrimap_weather_station_config', JSON.stringify(cfg));
        toast.success('Weather station & LoRaWAN parameters saved.');
    };

    // Run AI Microclimate, Historical & Crop Suitability Analysis
    const handleRunAiAnalysis = async (userPrompt?: string, contextOverride?: string) => {
        setIsAiAnalyzing(true);
        try {
            const hist = filteredHistoricalLogs.slice(0, 45);
            const contextText = contextOverride || (periodPreset === '1_YEAR_AGO'
                ? `Analyzing weather 1 year ago (${oneYearAgoData.targetDateStr}) vs today for ${currentLocation.name}`
                : `Analyzing historical weather period for ${currentLocation.name} (${historyStats.totalDays} days, total rain: ${historyStats.totalRainMm}mm, frost days: ${historyStats.frostDays}, chill hours: ${historyStats.chillHours})`);

            const prompt = userPrompt || (customAiQuery.trim()
                ? customAiQuery.trim()
                : `Deep agronomic and microclimate analysis for ${currentLocation.name}. Period stats: ${historyStats.totalDays} recorded days, ${historyStats.totalRainMm}mm rain, ${historyStats.frostDays} frost days, ${historyStats.thunderstorms} thunderstorms. Compare with coastal/regional dynamics (e.g. Batumi), assess chill hours for blueberry cultivars (Duke, Legacy), and provide exact hardware sensor configuration recommendations for D20S-LB probes and rain detectors.`);

            const result = await askWeatherAiAnalysis({
                prompt: `${prompt}\n\n[Context: ${contextText}]`,
                primaryLocation: currentLocation,
                comparedLocation: isCompareActive ? comparedLocation : null,
                primaryWeather: currentWeather || {
                    tempC: historyStats.avgTemp || 18,
                    feelsLikeC: historyStats.avgTemp || 18,
                    dewPointC: 12,
                    humidityPct: 70,
                    windSpeedKmh: 12,
                    windGustsKmh: 18,
                    windDirectionDeg: 240,
                    pressureHpa: 1015,
                    solarRadiationWm2: 500,
                    uvIndex: 4,
                    rainRateMmh: 0,
                    dailyRainTotalMm: 0,
                    weatherCode: 1,
                    weatherDescription: 'Partly Cloudy',
                    frostRisk: 'LOW',
                    timestamp: new Date().toLocaleTimeString()
                },
                comparedWeather: isCompareActive ? comparedWeather : null,
                primaryForecast,
                comparedForecast: isCompareActive ? comparedForecast : [],
                historicalLogs: hist,
                isKa: false
            });

            setCustomAiResponse(result);
            setAiAnalysisContextLabel(contextText);
            setActiveTab('ai_advisor');
            toast.success('AI Microclimate & Sensor Analysis generated!');
        } catch (err: any) {
            toast.error('AI Analysis failed to complete');
        } finally {
            setIsAiAnalyzing(false);
        }
    };

    // Save AI Analysis with specific retention period
    const handleSaveAiAnalysis = (retention: 'ALL_TIME' | '1_YEAR' | '1_MONTH') => {
        if (!customAiResponse) return;
        const keyEvents: string[] = [];
        if (historyStats.thunderstorms > 0) keyEvents.push(`${historyStats.thunderstorms} Thunderstorms`);
        if (historyStats.frostDays > 0) keyEvents.push(`${historyStats.frostDays} Frost Days`);
        if (historyStats.heavyWinds > 0) keyEvents.push(`${historyStats.heavyWinds} Gale Winds`);

        const saved = saveWeatherAiAnalysis({
            title: `Weather & Agro Advisory: ${currentLocation.name.split(',')[0]} (${new Date().toLocaleDateString()})`,
            prompt: customAiQuery.trim() || `Historical period analysis (${periodPreset})`,
            content: customAiResponse,
            locationId: currentLocation.id,
            locationName: currentLocation.name,
            periodLabel: periodPreset === '1_YEAR_AGO' ? `1 Year Ago (${oneYearAgoData.targetDateStr}) vs Today` : `${historyStats.totalDays} Days Aggregation`,
            retention,
            keyEventsSummary: keyEvents
        });

        setSavedAnalyses(getSavedWeatherAiAnalyses());
        const label = retention === 'ALL_TIME' ? 'All Time (სამუდამოდ)' : (retention === '1_YEAR' ? '1 Year (1 წლით)' : '1 Month (1 თვით)');
        toast.success(`Analysis saved successfully for ${label}!`);
    };

    const handleDeleteSavedAnalysis = (id: string) => {
        deleteSavedWeatherAiAnalysis(id);
        setSavedAnalyses(getSavedWeatherAiAnalyses());
        if (selectedSavedAnalysis?.id === id) {
            setSelectedSavedAnalysis(null);
        }
        toast.success('Saved analysis deleted.');
    };

    return (
        <div className="space-y-6">
            {/* Top Bar with Mode Switcher & Location Selector */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                        <CloudRain className="text-blue-600" size={24} />
                        Weather Station & Multi-Location Telemetry Hub
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        Central plantation 1-year archive, D20S-LB LoRaWAN telemetry, 1-year ago comparison & AI advisory
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Primary Location Dropdown */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-sky-500/40 shadow-sm text-xs">
                        <MapPin size={14} className="text-sky-500 shrink-0" />
                        <select
                            value={selectedLocationId}
                            onChange={(e) => {
                                if (e.target.value === '__add_new__') {
                                    setShowLocationSearch(true);
                                } else {
                                    setSelectedLocationId(e.target.value);
                                }
                            }}
                            className="bg-transparent text-slate-800 dark:text-sky-200 font-bold font-mono outline-none cursor-pointer max-w-[190px] truncate"
                            title="Primary weather location (defaults to Guria, Anaseuli)"
                        >
                            {locations.map(loc => (
                                <option key={`loc-${loc.id}`} value={loc.id} className="bg-slate-950 text-white">
                                    {loc.isDefault ? `🌿 ${loc.name}` : `📍 ${loc.name}`}
                                </option>
                            ))}
                            <option value="__add_new__" className="bg-slate-950 text-sky-400 font-bold">
                                ➕ Add other location...
                            </option>
                        </select>
                    </div>

                    {/* Quick 1 Year Ago Inspection Button */}
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('history_monitoring');
                            setPeriodPreset('1_YEAR_AGO');
                            setShowOneYearAgoModal(true);
                        }}
                        className="px-3 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/40 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                        title="View and compare weather from exactly 1 year ago"
                    >
                        <Clock size={13} className="text-amber-500" />
                        <span>1 Year Ago (1 წლის წინ)</span>
                    </button>

                    {/* Add Location Search Button */}
                    <button
                        type="button"
                        onClick={() => setShowLocationSearch(true)}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                        title="Search and add any city/location globally"
                    >
                        <Search size={13} />
                        <span>Search Location</span>
                    </button>

                    <button
                        onClick={() => handleRunAiAnalysis()}
                        disabled={isAiAnalyzing}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                        <Sparkles size={15} />
                        {isAiAnalyzing ? 'Analyzing...' : 'AI Crop & Variety Advisor'}
                    </button>

                    <button
                        onClick={fetchOnlineWeather}
                        disabled={isLoadingOnline}
                        className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
                        title="Refresh live weather"
                    >
                        <RefreshCw size={15} className={isLoadingOnline ? 'animate-spin text-blue-500' : ''} />
                    </button>
                </div>
            </div>

            {/* Global Location Search Drawer */}
            {showLocationSearch && (
                <div className="p-4 bg-slate-900 border border-sky-500/50 rounded-3xl space-y-3 animate-in fade-in duration-150 text-white">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-black uppercase text-xs text-sky-400 flex items-center gap-2">
                            <Search size={14} /> Search & Add Online Weather Location Globally
                        </span>
                        <button
                            type="button"
                            onClick={() => setShowLocationSearch(false)}
                            className="text-slate-400 hover:text-white text-sm"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search any town, city, or district (e.g. Batumi, Kobuleti, Tbilisi, Senaki)..."
                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500"
                        />
                        {isSearching && (
                            <RefreshCw size={14} className="animate-spin text-sky-400 absolute right-3 top-3" />
                        )}
                    </div>

                    {searchResults.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pt-1">
                            {searchResults.map(res => (
                                <div
                                    key={res.id}
                                    className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl flex items-center justify-between text-xs border border-slate-700/60"
                                >
                                    <div>
                                        <p className="font-black text-white">{res.name}</p>
                                        <p className="text-[10px] text-slate-400">{res.region} ({res.lat.toFixed(2)}, {res.lng.toFixed(2)})</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleSelectSearchedLocation(res, false)}
                                            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-bold uppercase"
                                        >
                                            Set Primary
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectSearchedLocation(res, true)}
                                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase"
                                        >
                                            Compare
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Custom AI Query Input Bar */}
            <div className="p-4 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-700/50 rounded-3xl space-y-2 text-white">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-indigo-400" />
                        Ask AI Agronomist on Weather, Humidity, Freezes, 1-Year History & Sensor Hardware
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                        Monitoring: {currentLocation.name.split('(')[0]}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={customAiQuery}
                        onChange={(e) => setCustomAiQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRunAiAnalysis();
                        }}
                        placeholder="Ask anything (e.g. 'Compare this spring rainfall with last year', 'How does Guria compare to Batumi for blueberry frost risk?', 'Where to place D20S-LB probes?')..."
                        className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-2xl text-xs text-white placeholder-slate-500 outline-none"
                    />
                    <button
                        type="button"
                        onClick={() => handleRunAiAnalysis()}
                        disabled={isAiAnalyzing}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                        <Send size={13} className={isAiAnalyzing ? 'animate-spin' : ''} />
                        <span>{isAiAnalyzing ? 'Analyzing...' : 'Ask AI'}</span>
                    </button>
                </div>
            </div>

            {/* Main Navigation Sub-tabs */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('live_online')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'live_online' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    Online Weather (Active)
                </button>
                <button
                    onClick={() => setActiveTab('history_monitoring')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'history_monitoring' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <CalendarDays size={14} /> Historical Data & 1-Year Archive
                </button>
                <button
                    onClick={() => setActiveTab('station_hardware')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'station_hardware' ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Radio size={14} /> Station Hardware & D20S-LB
                </button>
                <button
                    onClick={() => setActiveTab('comparisons')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'comparisons' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    Location Comparison Matrix
                </button>
                <button
                    onClick={() => setActiveTab('ai_advisor')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'ai_advisor' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Sparkles size={14} /> AI Advisory & Saved Reports ({savedAnalyses.length})
                </button>
            </div>

            {/* TAB 1: LIVE ONLINE WEATHER TOOL */}
            {activeTab === 'live_online' && currentWeather && (
                <div className="space-y-6">
                    {/* Live Main Banner */}
                    <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2.5rem] shadow-xl relative overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                            <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Live Online • Open-Meteo High-Resolution Model
                                </span>
                                <div className="flex items-baseline gap-3 mt-3">
                                    <h2 className="text-5xl font-black tracking-tighter">
                                        {currentWeather.tempC.toFixed(1)}°C
                                    </h2>
                                    <span className="text-lg text-blue-200 font-bold">
                                        Feels like {currentWeather.feelsLikeC.toFixed(1)}°C
                                    </span>
                                </div>
                                <p className="text-xs text-blue-100 font-bold mt-1">
                                    Dew Point: {currentWeather.dewPointC}°C • RH: {currentWeather.humidityPct}% • Pressure: {currentWeather.pressureHpa} hPa • Wind: {currentWeather.windSpeedKmh} km/h
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-200 block">Rainfall Today</span>
                                    <p className="text-lg font-black mt-0.5">{currentWeather.dailyRainTotalMm.toFixed(1)} mm</p>
                                </div>
                                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-200 block">Solar Radiation</span>
                                    <p className="text-lg font-black mt-0.5">{currentWeather.solarRadiationWm2} W/m²</p>
                                </div>
                                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-200 block">Frost Hazard</span>
                                    <p className={`text-lg font-black mt-0.5 ${currentWeather.frostRisk === 'CRITICAL' ? 'text-red-300' : 'text-emerald-300'}`}>
                                        {currentWeather.frostRisk}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 7-Day Forecast Strip */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Calendar size={14} className="text-blue-500" />
                            7-Day Precision Forecast for {currentLocation.name.split(',')[0]}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                            {primaryForecast.map((f, idx) => (
                                <div key={idx} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-center space-y-1">
                                    <p className="text-[10px] font-black uppercase text-slate-400">{f.dayOfWeek}</p>
                                    <p className="text-base font-black text-slate-800 dark:text-white">{f.maxTempC}° <span className="text-xs text-slate-400 font-normal">{f.minTempC}°</span></p>
                                    <p className="text-[9px] font-bold text-sky-600 dark:text-sky-400">💧 {f.rainMm} mm</p>
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                        f.frostRisk === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                        f.frostRisk === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                        {f.frostRisk === 'LOW' ? 'Frost Safe' : 'Freeze Risk'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: HISTORICAL DATA & 1-YEAR MONITORING WINDOW */}
            {activeTab === 'history_monitoring' && (
                <div className="space-y-6">
                    {/* Header Banner & Mode Controls */}
                    <div className="p-6 bg-slate-900 text-white rounded-[2.5rem] border border-slate-800 shadow-xl space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[9px] font-black uppercase tracking-widest">
                                    <ShieldCheck size={12} /> Company Plantation 365-Day Historical Data Engine
                                </span>
                                <h3 className="text-2xl font-black uppercase tracking-tight mt-1 text-white">
                                    {currentLocation.name} • 1-Year Historical Archive
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Daily weather telemetry saved for year-round tracking, frost records, thunderstorms, gales, and AI trend modeling.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => handleRunAiAnalysis(
                                        `Conduct deep agronomic evaluation of this historical period for ${currentLocation.name}. Analyze chilling hours, frost frequency, thunderstorm spikes, and compare with current requirements for blueberry cultivation (Duke, Legacy, Draper).`,
                                        `Historical Aggregate (${historyStats.totalDays} days)`
                                    )}
                                    disabled={isAiAnalyzing}
                                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Sparkles size={14} />
                                    <span>Analyze Period with AI</span>
                                </button>
                            </div>
                        </div>

                        {/* Summary Metrics Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-800">
                            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Recorded Days</span>
                                <p className="text-lg font-black text-white mt-0.5">{historyStats.totalDays} Days</p>
                                <span className="text-[9px] text-emerald-400 font-bold">1-Year Storage Active</span>
                            </div>

                            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Cumulative Rain</span>
                                <p className="text-lg font-black text-sky-400 mt-0.5">{historyStats.totalRainMm} mm</p>
                                <span className="text-[9px] text-slate-400 font-bold">{historyStats.downpours} Downpours</span>
                            </div>

                            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Avg / Max / Min Temp</span>
                                <p className="text-lg font-black text-amber-300 mt-0.5">{historyStats.avgTemp}°C</p>
                                <span className="text-[9px] text-slate-400 font-bold">{historyStats.minTemp}°C .. {historyStats.maxTemp}°C</span>
                            </div>

                            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Chill Hours (&lt;7.2°C)</span>
                                <p className="text-lg font-black text-cyan-300 mt-0.5">{historyStats.chillHours} hrs</p>
                                <span className="text-[9px] text-cyan-400 font-bold">Optimal for Blueberries</span>
                            </div>

                            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Frost & Freezes</span>
                                <p className="text-lg font-black text-rose-400 mt-0.5">{historyStats.frostDays} Days</p>
                                <span className="text-[9px] text-rose-300 font-bold">Freezing Events</span>
                            </div>

                            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Thunderstorms & Gales</span>
                                <p className="text-lg font-black text-purple-300 mt-0.5">{historyStats.thunderstorms + historyStats.heavyWinds}</p>
                                <span className="text-[9px] text-purple-400 font-bold">{historyStats.thunderstorms} ⛈️ / {historyStats.heavyWinds} 💨</span>
                            </div>
                        </div>
                    </div>

                    {/* Filter Bar: Quick Presets, Date Range Pickers & Key Event Filter */}
                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            {/* Preset Buttons */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-black uppercase text-slate-400 mr-1 flex items-center gap-1">
                                    <Clock size={12} /> პერიოდი:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPeriodPreset('1_YEAR_AGO');
                                        setSpecificInspectDate('');
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        periodPreset === '1_YEAR_AGO' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    ⚡ 1 წლის წინ დღეს
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPeriodPreset('LAST_7_DAYS');
                                        setSpecificInspectDate('');
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        periodPreset === 'LAST_7_DAYS' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    ბოლო 7 დღე
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPeriodPreset('LAST_30_DAYS');
                                        setSpecificInspectDate('');
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        periodPreset === 'LAST_30_DAYS' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    ბოლო 30 დღე
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPeriodPreset('LAST_90_DAYS');
                                        setSpecificInspectDate('');
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        periodPreset === 'LAST_90_DAYS' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    ბოლო 3 თვე
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPeriodPreset('FULL_YEAR');
                                        setSpecificInspectDate('');
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        periodPreset === 'FULL_YEAR' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    სრული 1 წელი (365 დღე)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPeriodPreset('CUSTOM');
                                        setSpecificInspectDate('');
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        periodPreset === 'CUSTOM' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    📅 თარიღის არჩევა
                                </button>
                            </div>

                            {/* Granularity Switcher */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                                <button
                                    type="button"
                                    onClick={() => setMonitoringGranularity('DAILY')}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all ${
                                        monitoringGranularity === 'DAILY' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                                    }`}
                                >
                                    დღიური აგრეგაცია
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMonitoringGranularity('HOURLY_SENSOR')}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all flex items-center gap-1 ${
                                        monitoringGranularity === 'HOURLY_SENSOR' ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-sm' : 'text-slate-500'
                                    }`}
                                    title="High frequency LoRaWAN D20S-LB sensor pulses"
                                >
                                    <Activity size={10} /> სენსორის სიღრმისეული
                                </button>
                            </div>
                        </div>

                        {/* Custom Date Range Controls */}
                        {periodPreset === 'CUSTOM' && (
                            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-500">დან:</span>
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl font-mono text-xs outline-none"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-500">მდე:</span>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl font-mono text-xs outline-none"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-500">კონკრეტული დღე:</span>
                                    <input
                                        type="date"
                                        value={specificInspectDate}
                                        onChange={(e) => setSpecificInspectDate(e.target.value)}
                                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl font-mono text-xs outline-none"
                                    />
                                    {specificInspectDate && (
                                        <button
                                            type="button"
                                            onClick={() => setSpecificInspectDate('')}
                                            className="text-xs text-rose-500 hover:underline"
                                        >
                                            გასუფთავება
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Key Weather Events Badges & Filters */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-black uppercase text-slate-400 mr-1 flex items-center gap-1">
                                <Filter size={11} /> მოვლენების ფილტრი:
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedEventFilter('ALL')}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                                    selectedEventFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                ყველა ({allHistoricalLogs.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedEventFilter('ANY_EVENT')}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1 ${
                                    selectedEventFilter === 'ANY_EVENT' ? 'bg-amber-600 text-white' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                                }`}
                            >
                                ⚡ მხოლოდ ექსტრემალური
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedEventFilter('THUNDERSTORM')}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1 ${
                                    selectedEventFilter === 'THUNDERSTORM' ? 'bg-purple-600 text-white' : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                                }`}
                            >
                                ⛈️ ჭექა-ქუხილი ({allHistoricalLogs.filter(l => l.events?.includes('THUNDERSTORM')).length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedEventFilter('HEAVY_WIND')}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1 ${
                                    selectedEventFilter === 'HEAVY_WIND' ? 'bg-cyan-600 text-white' : 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800'
                                }`}
                            >
                                💨 ძლიერი ქარი / შტორმი ({allHistoricalLogs.filter(l => l.events?.includes('HEAVY_WIND')).length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedEventFilter('FROST')}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1 ${
                                    selectedEventFilter === 'FROST' ? 'bg-rose-600 text-white' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                }`}
                            >
                                ❄️ წაყინვა / ყინვა ({allHistoricalLogs.filter(l => l.events?.includes('FROST') || l.frostRecorded).length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedEventFilter('DOWNPOUR')}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1 ${
                                    selectedEventFilter === 'DOWNPOUR' ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                }`}
                            >
                                🌧️ ძლიერი თქეში ({allHistoricalLogs.filter(l => l.events?.includes('DOWNPOUR')).length})
                            </button>
                        </div>
                    </div>

                    {/* SIDE-BY-SIDE: 1 YEAR AGO VS TODAY COMPARISON CARD */}
                    {oneYearAgoData.log && currentWeather && (
                        <div className="p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-700/60 text-white rounded-[2.5rem] shadow-xl space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                        <Clock size={13} /> შედარება: ზუსტად 1 წლის წინ vs დღეს
                                    </span>
                                    <h4 className="text-lg font-black uppercase tracking-tight text-white mt-0.5">
                                        {currentLocation.name} • Time-Travel Microclimate Analysis
                                    </h4>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleRunAiAnalysis(
                                        `Detailed comparative agronomic study for ${currentLocation.name}: Compare conditions 1 year ago (${oneYearAgoData.targetDateStr}: ${oneYearAgoData.log?.avgTempC}°C, ${oneYearAgoData.log?.humidityPct}%, ${oneYearAgoData.log?.rainMm}mm) versus today (${currentWeather.tempC}°C, ${currentWeather.humidityPct}%, ${currentWeather.dailyRainTotalMm}mm). How does this affect blueberry bud break, chill unit status, disease hazard, and sensor calibration?`,
                                        `1 Year Ago vs Today Comparison (${oneYearAgoData.targetDateStr})`
                                    )}
                                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                                >
                                    <Sparkles size={13} />
                                    <span>AI შედარება & ანალიზი</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* 1 Year Ago Box */}
                                <div className="p-4 bg-slate-800/70 rounded-2xl border border-slate-700 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-amber-400">
                                            📅 1 წლის წინ ({oneYearAgoData.targetDateStr})
                                        </span>
                                        <span className="text-[9px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-md font-mono">
                                            {oneYearAgoData.log.condition}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-center pt-1 font-mono">
                                        <div className="p-2 bg-slate-900 rounded-xl">
                                            <span className="text-[8px] text-slate-400 block uppercase">ტემპერატურა</span>
                                            <span className="text-sm font-black text-amber-300">{oneYearAgoData.log.avgTempC}°C</span>
                                        </div>
                                        <div className="p-2 bg-slate-900 rounded-xl">
                                            <span className="text-[8px] text-slate-400 block uppercase">ტენიანობა</span>
                                            <span className="text-sm font-black text-cyan-300">{oneYearAgoData.log.humidityPct}%</span>
                                        </div>
                                        <div className="p-2 bg-slate-900 rounded-xl">
                                            <span className="text-[8px] text-slate-400 block uppercase">ნალექი</span>
                                            <span className="text-sm font-black text-sky-400">{oneYearAgoData.log.rainMm} mm</span>
                                        </div>
                                        <div className="p-2 bg-slate-900 rounded-xl">
                                            <span className="text-[8px] text-slate-400 block uppercase">ქარი</span>
                                            <span className="text-sm font-black text-slate-300">{oneYearAgoData.log.windSpeedKmh} კმ/სთ</span>
                                        </div>
                                    </div>
                                    {oneYearAgoData.log.events && oneYearAgoData.log.events.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {oneYearAgoData.log.events.map(ev => (
                                                <span key={ev} className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[9px] font-black">
                                                    ⚠️ {ev}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Today Box */}
                                <div className="p-4 bg-slate-800/70 rounded-2xl border border-slate-700 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-emerald-400">
                                            🌿 დღეს (პირდაპირი ონლაინ მონაცემები)
                                        </span>
                                        <span className="text-[9px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md font-mono">
                                            {currentWeather.weatherDescription}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-center pt-1 font-mono">
                                        <div className="p-2 bg-slate-900 rounded-xl">
                                            <span className="text-[8px] text-slate-400 block uppercase">ტემპერატურა</span>
                                            <span className="text-sm font-black text-emerald-300">{currentWeather.tempC.toFixed(1)}°C</span>
                                        </div>
                                        <div className="p-2 bg-slate-900 rounded-xl">
                                            <span className="text-[8px] text-slate-400 block uppercase">ტენიანობა</span>
                                            <span className="text-sm font-black text-cyan-300">{currentWeather.humidityPct}%</span>
                                        </div>
                                        <div className="p-2 bg-slate-900 rounded-xl">
                                            <span className="text-[8px] text-slate-400 block uppercase">ნალექი</span>
                                            <span className="text-sm font-black text-sky-400">{currentWeather.dailyRainTotalMm.toFixed(1)} mm</span>
                                        </div>
                                        <div className="p-2 bg-slate-900 rounded-xl">
                                            <span className="text-[8px] text-slate-400 block uppercase">ქარი</span>
                                            <span className="text-sm font-black text-slate-300">{currentWeather.windSpeedKmh} კმ/სთ</span>
                                        </div>
                                    </div>
                                    <div className="p-2 bg-slate-900/90 rounded-xl flex items-center justify-between text-[10px] font-bold text-slate-300">
                                        <span>ტემპერატურის სხვაობა (ΔT):</span>
                                        <span className={currentWeather.tempC >= oneYearAgoData.log.avgTempC ? 'text-amber-400' : 'text-cyan-400'}>
                                            {(currentWeather.tempC - oneYearAgoData.log.avgTempC) >= 0 ? '+' : ''}
                                            {(currentWeather.tempC - oneYearAgoData.log.avgTempC).toFixed(1)}°C {currentWeather.tempC >= oneYearAgoData.log.avgTempC ? 'უფრო თბილია' : 'უფრო ცივია'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Historical Records Table / List */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                    <CalendarDays size={14} className="text-emerald-500" />
                                    დღიური ისტორიული ჟურნალი ({filteredHistoricalLogs.length} ჩანაწერი)
                                </h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                    სრული პარამეტრები: ტემპერატურა, ტენიანობა, ნალექი, წაყინვის რისკი, სიცივის საათები, მოვლენები
                                </p>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                                სენსორის ტიპი: LoRaWAN D20S-LB & Open-Meteo
                            </span>
                        </div>

                        <div className="overflow-x-auto max-h-[500px]">
                            <table className="w-full text-left text-xs font-medium">
                                <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="py-3 px-4">თარიღი</th>
                                        <th className="py-3 px-3">მდგომარეობა</th>
                                        <th className="py-3 px-3">საშ / მინ / მაქს ტემპ</th>
                                        <th className="py-3 px-3">ტენიანობა</th>
                                        <th className="py-3 px-3">ნალექი (მმ)</th>
                                        <th className="py-3 px-3">ქარი</th>
                                        <th className="py-3 px-3">მოვლენები & საფრთხეები</th>
                                        <th className="py-3 px-3 text-right">მოქმედება</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                                    {filteredHistoricalLogs.map((log) => {
                                        const hasStorm = log.events?.includes('THUNDERSTORM');
                                        const hasWind = log.events?.includes('HEAVY_WIND');
                                        const hasFrost = log.events?.includes('FROST') || log.frostRecorded;
                                        const hasDownpour = log.events?.includes('DOWNPOUR');
                                        const hasHeat = log.events?.includes('HEATWAVE');

                                        return (
                                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="py-3 px-4 font-bold text-slate-800 dark:text-white whitespace-nowrap">
                                                    {log.date}
                                                </td>
                                                <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-300 font-sans text-[11px]">
                                                    {log.condition || 'Clear / Sunny'}
                                                </td>
                                                <td className="py-3 px-3 whitespace-nowrap">
                                                    <span className="font-bold text-slate-900 dark:text-white">{log.avgTempC}°C</span>
                                                    <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({log.minTempC}° .. {log.maxTempC}°)</span>
                                                </td>
                                                <td className="py-3 px-3 whitespace-nowrap text-cyan-600 dark:text-cyan-400 font-bold">
                                                    {log.humidityPct}%
                                                </td>
                                                <td className="py-3 px-3 whitespace-nowrap">
                                                    <span className={`font-bold ${log.rainMm > 15 ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {log.rainMm > 0 ? `${log.rainMm} mm` : '0 mm'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                                                    {log.windSpeedKmh} კმ/სთ
                                                </td>
                                                <td className="py-3 px-3 whitespace-nowrap font-sans">
                                                    <div className="flex flex-wrap items-center gap-1">
                                                        {hasStorm && (
                                                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 rounded text-[9px] font-black">
                                                                ⛈️ ჭექა-ქუხილი
                                                            </span>
                                                        )}
                                                        {hasWind && (
                                                            <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 rounded text-[9px] font-black">
                                                                💨 ძლიერი ქარი
                                                            </span>
                                                        )}
                                                        {hasFrost && (
                                                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded text-[9px] font-black">
                                                                ❄️ წაყინვა ({log.minTempC}°)
                                                            </span>
                                                        )}
                                                        {hasDownpour && !hasStorm && (
                                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded text-[9px] font-black">
                                                                🌧️ თქეში ({log.rainMm}მმ)
                                                            </span>
                                                        )}
                                                        {hasHeat && (
                                                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded text-[9px] font-black">
                                                                🔥 სიცხე ({log.maxTempC}°)
                                                            </span>
                                                        )}
                                                        {!hasStorm && !hasWind && !hasFrost && !hasDownpour && !hasHeat && (
                                                            <span className="text-[10px] text-slate-400">ნორმალური</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-right whitespace-nowrap font-sans">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRunAiAnalysis(
                                                            `Analyze telemetry from ${log.date} for ${currentLocation.name}. Recorded: ${log.avgTempC}°C (min ${log.minTempC}°, max ${log.maxTempC}°), humidity ${log.humidityPct}%, rain ${log.rainMm}mm, condition: "${log.condition}". Assess microclimate implications for orchard health and crop response.`,
                                                            `Single Day Inspection: ${log.date}`
                                                        )}
                                                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                                                        title="Analyze this specific day with AI"
                                                    >
                                                        ანალიზი
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: STATION HARDWARE & D20S-LB LORAWAN TELEMETRY */}
            {activeTab === 'station_hardware' && (
                <div className="space-y-6">
                    <div className="p-6 bg-slate-900 text-white rounded-[2.5rem] border border-amber-500/40 shadow-xl space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[9px] font-black uppercase tracking-widest">
                                    <Radio size={12} className="animate-pulse" /> LoRaWAN Precision Hardware Node
                                </span>
                                <h3 className="text-2xl font-black uppercase tracking-tight mt-1 text-white">
                                    Dragino D20S-LB & Outdoor Rain Gauge Protocol
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Ultra-low-power outdoor IP68 sensor array for high-frequency plantation temperature, humidity, and rainfall detection.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-black uppercase">
                                    ● Gateway: Active EU868
                                </span>
                            </div>
                        </div>

                        {/* Hardware Spec Card Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1">
                                        <Thermometer size={14} /> D20S-LB LoRaWAN Probe
                                    </span>
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                </div>
                                <p className="text-sm font-black text-white">Outdoor Waterproof Temp/RH</p>
                                <p className="text-[10px] text-slate-400">
                                    IP68 waterproof probe casing, -40°C to +85°C operating range, battery life up to 5-8 years on 8500mAh Li-SOCl2.
                                </p>
                                <div className="pt-2 border-t border-slate-700/80 text-[10px] font-mono text-slate-300 flex justify-between">
                                    <span>DevEUI: {stationConfig.sensorDevEui}</span>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-sky-400 flex items-center gap-1">
                                        <Droplets size={14} /> Rain Detection Pulse Gauge
                                    </span>
                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                </div>
                                <p className="text-sm font-black text-white">Tipping-Bucket Pulse Interface</p>
                                <p className="text-[10px] text-slate-400">
                                    0.2mm resolution per bucket tip. Uplinks rainfall rate (mm/h) and total accumulation on event trigger or 15-min intervals.
                                </p>
                                <div className="pt-2 border-t border-slate-700/80 text-[10px] font-mono text-slate-300 flex justify-between">
                                    <span>Sensitivity: 0.2mm / pulse</span>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-purple-400 flex items-center gap-1">
                                        <Zap size={14} /> Multi-Zone Node Deployment
                                    </span>
                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                </div>
                                <p className="text-sm font-black text-white">Orchard Sector Distribution</p>
                                <p className="text-[10px] text-slate-400">
                                    Recommended: Install 1 node per 1.5 - 2.0 hectares at 1.5m above ground level within crop canopy to avoid heat reflection.
                                </p>
                                <div className="pt-2 border-t border-slate-700/80 text-[10px] font-mono text-slate-300 flex justify-between">
                                    <span>Range: up to 5-10 km Line-of-Sight</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sensor Configuration Editor */}
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            <Settings size={16} className="text-blue-500" />
                            LoRaWAN Hardware & Gateway Settings
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400">Station / Node Name</label>
                                <input
                                    type="text"
                                    value={stationConfig.stationName}
                                    onChange={(e) => setStationConfig({ ...stationConfig, stationName: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400">Device EUI (Hex 16)</label>
                                <input
                                    type="text"
                                    value={stationConfig.sensorDevEui}
                                    onChange={(e) => setStationConfig({ ...stationConfig, sensorDevEui: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400">Frequency Band</label>
                                <input
                                    type="text"
                                    value={stationConfig.frequencyBand}
                                    onChange={(e) => setStationConfig({ ...stationConfig, frequencyBand: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400">Uplink Interval (Seconds)</label>
                                <input
                                    type="number"
                                    value={stationConfig.uplinkIntervalSec}
                                    onChange={(e) => setStationConfig({ ...stationConfig, uplinkIntervalSec: Number(e.target.value) })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={() => handleSaveStationConfig(stationConfig)}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                            >
                                Save LoRaWAN Sensor Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: LOCATION COMPARISON MATRIX */}
            {activeTab === 'comparisons' && (
                <div className="space-y-4">
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                                    Microclimate Multi-Location Comparison Matrix
                                </h4>
                                <p className="text-[10px] text-slate-500">
                                    Compare Guria (Anaseuli) with Batumi or custom monitored locations over 7 days and full historical logs.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowLocationSearch(true)}
                                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                            >
                                <Plus size={12} /> Add More Locations
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Primary Location Card */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                                <span className="text-[10px] font-black uppercase text-sky-600 block">
                                    🌿 Primary Plantation: {currentLocation.name}
                                </span>
                                {currentWeather && (
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold pt-1">
                                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                                            <span className="text-slate-400 block text-[9px]">Temp</span>
                                            <span className="text-sky-600">{currentWeather.tempC.toFixed(1)}°C</span>
                                        </div>
                                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                                            <span className="text-slate-400 block text-[9px]">Humidity</span>
                                            <span className="text-emerald-600">{currentWeather.humidityPct}%</span>
                                        </div>
                                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                                            <span className="text-slate-400 block text-[9px]">Rainfall</span>
                                            <span className="text-blue-600">{currentWeather.dailyRainTotalMm}mm</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Compared Location Card */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                                <span className="text-[10px] font-black uppercase text-indigo-600 block">
                                    ⚖️ Comparison Site: {comparedLocation.name}
                                </span>
                                {comparedWeather && (
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold pt-1">
                                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                                            <span className="text-slate-400 block text-[9px]">Temp</span>
                                            <span className="text-indigo-600">{comparedWeather.tempC.toFixed(1)}°C</span>
                                        </div>
                                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                                            <span className="text-slate-400 block text-[9px]">Humidity</span>
                                            <span className="text-indigo-600">{comparedWeather.humidityPct}%</span>
                                        </div>
                                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                                            <span className="text-slate-400 block text-[9px]">Rainfall</span>
                                            <span className="text-indigo-600">{comparedWeather.dailyRainTotalMm}mm</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: AI ADVISOR & SAVED REPORTS MANAGEMENT */}
            {activeTab === 'ai_advisor' && (
                <div className="space-y-6">
                    {/* Active AI Result Display with Save/Delete Action Controls */}
                    {customAiResponse && (
                        <div className="p-6 bg-slate-900 text-white rounded-[2.5rem] border border-purple-700/60 shadow-xl space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                                <div>
                                    <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                        <Sparkles size={14} /> AI Microclimate, Historical & Crop Advisory
                                    </span>
                                    {aiAnalysisContextLabel && (
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{aiAnalysisContextLabel}</p>
                                    )}
                                </div>

                                {/* CRITICAL: Retention Action Buttons */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => handleSaveAiAnalysis('ALL_TIME')}
                                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                                        title="Save this analysis permanently"
                                    >
                                        <Bookmark size={11} /> სამუდამოდ შენახვა
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSaveAiAnalysis('1_YEAR')}
                                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                                        title="Save this analysis for 1 year"
                                    >
                                        <Calendar size={11} /> 1 წლით შენახვა
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSaveAiAnalysis('1_MONTH')}
                                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                                        title="Save this analysis for 1 month"
                                    >
                                        <Clock size={11} /> 1 თვით შენახვა
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCustomAiResponse(null);
                                            toast.info('AI analysis discarded.');
                                        }}
                                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                                        title="Delete / discard current analysis"
                                    >
                                        <Trash2 size={11} /> წაშლა
                                    </button>
                                </div>
                            </div>

                            <div className="text-slate-200 text-xs leading-relaxed whitespace-pre-line font-medium pr-1 max-h-96 overflow-y-auto">
                                {customAiResponse}
                            </div>
                        </div>
                    )}

                    {/* Saved AI Reports Archive List */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 space-y-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                    <BookmarkCheck size={16} className="text-purple-600" />
                                    შენახული AI ანალიზები & აგრო-დასკვნები ({savedAnalyses.length})
                                </h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                    არქივირებული ანალიზები: სამუდამო, 1-წლიანი და 1-თვიანი შენახვის ვადით
                                </p>
                            </div>

                            {savedAnalyses.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        savedAnalyses.forEach(a => deleteSavedWeatherAiAnalysis(a.id));
                                        setSavedAnalyses([]);
                                        toast.success('All saved analyses cleared.');
                                    }}
                                    className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <Trash2 size={11} /> ყველა შენახულის გასუფთავება
                                </button>
                            )}
                        </div>

                        {savedAnalyses.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 space-y-2">
                                <Sparkles size={32} className="mx-auto text-purple-400/60" />
                                <p className="text-xs font-bold uppercase tracking-wider">არ არის შენახული ანალიზები</p>
                                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                                    შეასრულეთ AI ანალიზი და დააჭირეთ &quot;სამუდამოდ შენახვა&quot;, &quot;1 წლით შენახვა&quot; ან &quot;1 თვით შენახვა&quot; ღილაკს.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {savedAnalyses.map(item => (
                                    <div
                                        key={item.id}
                                        className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2.5 flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                    item.retention === 'ALL_TIME' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                                    item.retention === '1_YEAR' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                                                    'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                                }`}>
                                                    {item.retention === 'ALL_TIME' ? 'სამუდამო შენახვა' : (item.retention === '1_YEAR' ? '1 წლით შენახული' : '1 თვით შენახული')}
                                                </span>
                                                <span className="text-[10px] font-mono text-slate-400">{item.dateStr}</span>
                                            </div>

                                            <h5 className="text-xs font-black text-slate-900 dark:text-white mt-1.5 line-clamp-1">
                                                {item.title}
                                            </h5>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                                                &quot;{item.prompt}&quot;
                                            </p>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3 mt-1.5 leading-relaxed font-medium">
                                                {item.content}
                                            </p>
                                        </div>

                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCustomAiResponse(item.content);
                                                    setAiAnalysisContextLabel(item.periodLabel);
                                                }}
                                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                                            >
                                                <Eye size={12} /> სრულად ნახვა
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleDeleteSavedAnalysis(item.id)}
                                                className="text-[10px] font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                                                title="Delete this analysis"
                                            >
                                                <Trash2 size={11} /> წაშლა
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
