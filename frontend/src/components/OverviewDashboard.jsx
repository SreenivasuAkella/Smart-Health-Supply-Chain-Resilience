'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShieldCheck, AlertTriangle, ThermometerSnowflake, Truck, 
  TrendingUp, Activity, ArrowUpRight, Sparkles, MapPin, 
  CheckCircle2, RefreshCw, Bed, Users, UserCheck, Stethoscope, 
  HeartPulse, Search, Filter, ChevronLeft, ChevronRight, CloudRain,
  Navigation, Radio, Zap, ChevronsLeft, ChevronsRight, Loader2,
  Languages, Pill, Clock
} from 'lucide-react';
import { fetchFacilitiesPaginated } from '../services/api';

export default function OverviewDashboard({ 
  isLoading: parentLoading = false,
  telemetry = {}, 
  onNavigate, 
  onTriggerReallocation,
  onOpenCopilot 
}) {
  const [alertSearch, setAlertSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [alertFilter, setAlertFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);

  const [facilities, setFacilities] = useState([]);
  const [pagination, setPagination] = useState({
    total_records: 1188,
    page: 1,
    page_size: 5,
    total_pages: 238,
    has_next: true,
    has_prev: false
  });

  const [nationalAggregates, setNationalAggregates] = useState({
    total_facilities: 1188,
    critical_deficits: 131,
    moderate_deficits: 0,
    total_beds: 362409,
    occupied_beds: 281191,
    oxygen_beds: 72456,
    icu_beds: 27848,
    doctors_on_duty: 8971,
    doctors_total: 11961,
    nurses_on_duty: 20863,
    asha_active: 98010,
    daily_patient_footfall: 1153112
  });

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(alertSearch);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [alertSearch]);

  // Load paginated data from backend API
  const loadAlerts = useCallback(async (pg, size, filter, search, isInitial = false) => {
    if (isInitial) {
      setIsDataLoading(true);
    } else {
      setIsTableLoading(true);
    }
    try {
      const res = await fetchFacilitiesPaginated(pg, size, {
        status: filter !== 'ALL' ? filter : undefined,
        search: search || undefined
      });
      if (res && res.items) {
        setFacilities(res.items);
        if (res.pagination) {
          setPagination(res.pagination);
        }
        if (res.metadata?.national_aggregates) {
          setNationalAggregates(res.metadata.national_aggregates);
        }
      }
    } catch (err) {
      console.error("Failed to load paginated facilities:", err);
    } finally {
      setIsDataLoading(false);
      setIsTableLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts(currentPage, pageSize, alertFilter, debouncedSearch, facilities.length === 0);
  }, [currentPage, pageSize, alertFilter, debouncedSearch, loadAlerts]);

  // Full Network Quick Stats
  const totalBeds = nationalAggregates.total_beds || 362409;
  const occupiedBeds = nationalAggregates.occupied_beds || 281191;
  const oxygenBeds = nationalAggregates.oxygen_beds || 72456;
  const icuBeds = nationalAggregates.icu_beds || 27848;

  const doctorsOnDuty = nationalAggregates.doctors_on_duty || 8971;
  const doctorsTotal = nationalAggregates.doctors_total || 11961;
  const nursesOnDuty = nationalAggregates.nurses_on_duty || 20863;
  const ashaActive = nationalAggregates.asha_active || 98010;

  const dailyPatientFootfall = nationalAggregates.daily_patient_footfall || 1153112;
  const totalFacilities = nationalAggregates.total_facilities || 1188;

  const bedOccupancyPct = Math.round((occupiedBeds / Math.max(1, totalBeds)) * 100);
  const doctorDutyPct = Math.round((doctorsOnDuty / Math.max(1, doctorsTotal)) * 100);

  const quickStats = [
    {
      title: "Health Resilience Score",
      value: "96.4%",
      subtitle: `${totalFacilities.toLocaleString()} Monitored Facilities`,
      icon: ShieldCheck,
      color: "text-emerald-400",
      borderColor: "border-emerald-500/30 hover:border-emerald-500/60",
      dotBg: "bg-emerald-400",
      barColor: "bg-emerald-400",
      badge: "Optimal",
      badgeColor: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
      progress: 96.4
    },
    {
      title: "Real-Time Bed Occupancy",
      value: `${bedOccupancyPct}%`,
      subtitle: `${occupiedBeds.toLocaleString()} of ${totalBeds.toLocaleString()} In Use`,
      icon: Bed,
      color: "text-cyan-400",
      borderColor: "border-cyan-500/30 hover:border-cyan-500/60",
      dotBg: "bg-cyan-400",
      barColor: "bg-cyan-400",
      badge: `${oxygenBeds.toLocaleString()} O2 Avail`,
      badgeColor: "text-cyan-300 bg-cyan-500/15 border-cyan-500/30",
      progress: bedOccupancyPct
    },
    {
      title: "Medical Duty Adherence",
      value: `${doctorDutyPct}%`,
      subtitle: `${doctorsOnDuty.toLocaleString()} Doctors • ${nursesOnDuty.toLocaleString()} Nurses`,
      icon: Stethoscope,
      color: "text-indigo-400",
      borderColor: "border-indigo-500/30 hover:border-indigo-500/60",
      dotBg: "bg-indigo-400",
      barColor: "bg-indigo-400",
      badge: `${ashaActive.toLocaleString()} ASHA`,
      badgeColor: "text-indigo-300 bg-indigo-500/15 border-indigo-500/30",
      progress: doctorDutyPct
    },
    {
      title: "Daily Patient Influx",
      value: `${dailyPatientFootfall.toLocaleString()}`,
      subtitle: `${nationalAggregates.critical_deficits || 131} Active Hotspot PHCs`,
      icon: Users,
      color: "text-amber-400",
      borderColor: "border-amber-500/30 hover:border-amber-500/60",
      dotBg: "bg-amber-400",
      barColor: "bg-amber-400",
      badge: "Peak Surge Monitored",
      badgeColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
      progress: 74
    }
  ];

  // Dynamically compute alerts from live paginated facilities data
  const displayedAlerts = useMemo(() => {
    return facilities.map((fac, idx) => {
      const isCritical = fac.status === 'Critical Deficit';
      const isBedSurge = (fac.bedsOccupied && fac.bedCapacity) ? (fac.bedsOccupied / fac.bedCapacity) > 0.85 : false;
      const stock = isCritical ? 4 : (fac.bedsOccupied ? Math.max(8, Math.round(fac.bedsOccupied * 0.15)) : 18);
      
      let severityType = isCritical ? 'CRITICAL' : fac.status === 'Moderate Deficit' ? 'MODERATE' : 'WARNING';
      if (isBedSurge && !isCritical) severityType = 'BED_SURGE';

      return {
        id: fac.id || `ALT-${String((pagination.page - 1) * pagination.page_size + idx + 1).padStart(3, '0')}`,
        severity: isCritical ? "CRITICAL DEFICIT" : isBedSurge ? "BED CAPACITY SURGE" : "SUPPLY DEFICIT",
        severityType,
        facilityName: fac.name,
        district: fac.district,
        state: fac.state,
        stock,
        threshold: 25,
        medName: "Anti-Snake Venom (ASV)",
        medId: "PUB-MED-001",
        bedsOccupied: fac.bedsOccupied || 18,
        bedCapacity: fac.bedCapacity || 20,
        doctorsOnDuty: fac.doctorsOnDuty || 1,
        doctorsTotal: fac.doctorsTotal || 2,
        targetId: fac.id
      };
    });
  }, [facilities, pagination.page, pagination.page_size]);

  const handleFilterChange = (filter) => {
    setAlertFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (val) => {
    setAlertSearch(val);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const totalPages = pagination.total_pages || 1;

  if ((isDataLoading || parentLoading) && facilities.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* KPI Card Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="flex justify-between items-center">
                <div className="skeleton w-36 h-4 rounded-md" />
                <div className="skeleton w-2.5 h-2.5 rounded-full" />
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <div className="skeleton w-28 h-7 rounded-lg" />
                <div className="skeleton w-16 h-4 rounded-full" />
              </div>
              <div className="pt-2 border-t border-slate-800/60 space-y-2">
                <div className="skeleton w-full h-1.5 rounded-full" />
                <div className="skeleton w-44 h-3 rounded-md" />
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 glass-panel p-6 border border-slate-800/80 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="skeleton w-56 h-6" />
              <div className="skeleton w-24 h-7 rounded-lg" />
            </div>
            <div className="skeleton w-full h-10 rounded-xl" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <div className="skeleton w-48 h-5" />
                    <div className="skeleton w-28 h-7 rounded-xl" />
                  </div>
                  <div className="skeleton w-3/4 h-3" />
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5 space-y-5">
            <div className="glass-panel p-5 border border-slate-800/80 space-y-3">
              <div className="skeleton w-44 h-5" />
              <div className="skeleton w-full h-24 rounded-xl" />
            </div>
            <div className="glass-panel p-5 border border-slate-800/80 space-y-3">
              <div className="skeleton w-44 h-5" />
              <div className="skeleton w-full h-24 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              className={`glass-panel p-4 sm:p-5 rounded-2xl relative overflow-hidden transition-all duration-200 border ${stat.borderColor} hover:shadow-lg flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[12px] sm:text-[13px] font-bold ${stat.color} flex items-center gap-1.5`}>
                    <Icon size={14} className="shrink-0" />
                    <span>{stat.title}</span>
                  </span>
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${stat.dotBg}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${stat.dotBg}`} />
                  </span>
                </div>

                <div className="mt-2.5 flex items-baseline justify-between">
                  <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
                    {stat.value}
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${stat.badgeColor}`}>
                    {stat.badge}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/60">
                <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden mb-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${stat.barColor}`}
                    style={{ width: `${Math.min(100, Math.max(5, stat.progress))}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {stat.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Split: Interactive Alert Feed & Intelligence Suite */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 7 Cols: Crisis Alert Center */}
        <div className="lg:col-span-7 glass-panel p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-sm">
                <AlertTriangle size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base sm:text-lg text-white font-display">
                    Early Warning Triage Center
                  </h3>
                  <span className="bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                    {pagination.total_records.toLocaleString()} Alerts
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <RefreshCw size={11} className={`text-cyan-400 ${isTableLoading ? 'animate-spin' : ''}`} />
                  Vertex AI Continuous Sentinel Stream
                </span>
              </div>
            </div>

            <button 
              onClick={() => onNavigate('map')} 
              className="btn-secondary text-xs px-3 py-1.5 self-start sm:self-auto"
            >
              <span>View On GIS Map</span>
              <ArrowUpRight size={13} className="text-cyan-400" />
            </button>
          </div>

          {/* Search and Category Filter Chips */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={alertSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search facility name, district, medicine..."
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500/60 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'ALL', label: 'All Alerts' },
                { id: 'CRITICAL', label: 'Critical' },
                { id: 'MODERATE', label: 'Moderate' },
                { id: 'BED_SURGE', label: 'Bed Surge' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFilterChange(f.id)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                    alertFilter === f.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alert Cards List with Loading Overlay */}
          <div className="space-y-3 min-h-[340px] relative">
            {isTableLoading && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-10 rounded-xl flex items-center justify-center">
                <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-cyan-300 text-xs shadow-xl">
                  <Loader2 size={16} className="animate-spin text-cyan-400" />
                  <span>Loading alerts page {currentPage}...</span>
                </div>
              </div>
            )}

            {displayedAlerts.length > 0 ? (
              displayedAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/90 rounded-xl p-4 transition-all duration-150 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          alert.severityType === 'CRITICAL'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : alert.severityType === 'BED_SURGE'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                        }`}>
                          {alert.severity}
                        </span>
                        <div className="flex items-center gap-1 text-xs font-bold text-white truncate">
                          <MapPin size={13} className="text-cyan-400 shrink-0" />
                          <span className="truncate">{alert.facilityName}</span>
                          <span className="text-slate-400 font-normal text-xs">({alert.district}, {alert.state})</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
                        <span className="flex items-center gap-1.5 text-rose-300 font-medium">
                          <Pill size={13} className="text-rose-400 shrink-0" />
                          {alert.medName}: <strong>{alert.stock} units left</strong> (Safety: {alert.threshold})
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Bed size={13} className="text-slate-400 shrink-0" />
                          Beds: <strong className="text-slate-200">{alert.bedsOccupied}/{alert.bedCapacity}</strong>
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Stethoscope size={13} className="text-slate-400 shrink-0" />
                          Duty: <strong className="text-slate-200">{alert.doctorsOnDuty}/{alert.doctorsTotal}</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onTriggerReallocation(alert.targetId, alert.medId)}
                      className="shrink-0 btn-primary text-xs px-3.5 py-2 font-semibold shadow-md self-end sm:self-auto"
                    >
                      <span>Dispatch Surplus</span>
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-14 text-slate-400 space-y-2.5">
                <CheckCircle2 size={36} className="mx-auto text-emerald-400 opacity-90" />
                <p className="text-sm font-semibold text-slate-200">No active alerts for this filter</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  All surveyed facilities are stocked above the 14-day threshold.
                </p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-3 flex-wrap">
              <span>
                Showing <strong className="text-slate-200">{pagination.total_records > 0 ? (pagination.page - 1) * pagination.page_size + 1 : 0}</strong> to <strong className="text-slate-200">{Math.min(pagination.page * pagination.page_size, pagination.total_records)}</strong> of <strong className="text-cyan-400">{pagination.total_records.toLocaleString()}</strong>
              </span>

              <div className="flex items-center gap-1.5 ml-1">
                <span className="text-[11px] text-slate-500">Per page:</span>
                {[5, 10, 20].map(size => (
                  <button
                    key={size}
                    onClick={() => handlePageSizeChange(size)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      pageSize === size
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || isTableLoading}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={!pagination.has_prev || isTableLoading}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-3 py-1 font-mono text-xs text-slate-300 font-semibold bg-slate-900 border border-slate-800 rounded-lg">
                  {pagination.page} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={!pagination.has_next || isTableLoading}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || isTableLoading}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Strategic Intelligence Suite */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Cold-Chain IoT Guard */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ThermometerSnowflake className="text-cyan-400" size={18} />
                <h3 className="font-bold text-sm sm:text-base text-white font-display">
                  Cold-Chain IoT Watchdog
                </h3>
              </div>
              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Firebase RTDB
              </span>
            </div>

            <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  Active Thermal Excursion
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                  Unit: ILR-B-03
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <div className="text-3xl font-extrabold text-rose-400 tracking-tight font-display">
                    8.7°C
                  </div>
                  <div className="text-xs text-slate-400">Safe Target: 2.0°C – 8.0°C</div>
                </div>
                <div className="text-right">
                  <div className="text-rose-400 font-bold text-xs">+0.7°C Overheat</div>
                  <div className="text-xs text-slate-400">PHC Baragaon (Varanasi)</div>
                </div>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 h-2 w-[85%]" />
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Mean Kinetic Temperature (MKT) excursion: <strong className="text-rose-300">-12% potency loss / 6h</strong>. Solar battery reserve: 14%.
              </p>
            </div>

            <button
              onClick={() => onNavigate('coldchain')}
              className="w-full btn-secondary text-xs justify-center py-2 font-semibold"
            >
              <span>Inspect Cold-Chain Digital Twin</span>
              <ArrowUpRight size={13} className="text-cyan-400" />
            </button>
          </div>

          {/* Monsoon & Epidemiological Weather Radar */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CloudRain className="text-indigo-400" size={18} />
                <h3 className="font-bold text-sm sm:text-base text-white font-display">
                  Monsoon & Flood Risk Radar
                </h3>
              </div>
              <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                IMD Synced
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <MapPin size={13} className="text-amber-400" /> Varanasi & East Godavari
                </span>
                <span className="text-amber-400 font-mono font-bold text-xs">88mm / 24h Rain</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Vertex AI forecast predicts 3.4x spike in Snakebite and Leptospirosis incidents. Recommended protocol: Pre-position 50 ASV vials before roadway washouts.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onNavigate('forecasting')}
                className="btn-secondary text-xs justify-center py-2 font-semibold"
              >
                <span>Outbreak Forecast</span>
                <ArrowUpRight size={12} className="text-cyan-400" />
              </button>
              <button
                onClick={() => onNavigate('simulation')}
                className="bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 transition-colors font-semibold text-xs"
              >
                <Zap size={13} />
                <span>Crisis Sandbox</span>
              </button>
            </div>
          </div>

          {/* Multilingual Voice Copilot Callout */}
          <div className="glass-panel p-5 bg-gradient-to-br from-indigo-950/40 to-slate-950/80 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Languages size={18} className="text-indigo-400" />
                <h4 className="text-sm font-bold text-white font-display">
                  ASHA Voice Copilot
                </h4>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30 font-bold">
                8 Indian Languages
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Real-time voice ordering and triage in Hindi, Telugu, Tamil, Marathi, Bengali, Kannada, Malayalam, and English.
            </p>
            <button
              onClick={() => onNavigate('voice')}
              className="w-full btn-primary text-xs justify-center py-2 font-semibold"
            >
              <span>Launch Voice Console</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
