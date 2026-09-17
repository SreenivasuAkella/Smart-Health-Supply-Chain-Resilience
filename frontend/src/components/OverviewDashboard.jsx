'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShieldCheck, AlertTriangle, ThermometerSnowflake, Truck, 
  TrendingUp, Activity, ArrowUpRight, Sparkles, MapPin, 
  CheckCircle2, RefreshCw, Bed, Users, UserCheck, Stethoscope, 
  HeartPulse, Search, Filter, ChevronLeft, ChevronRight, CloudRain,
  Navigation, Radio, Zap, ChevronsLeft, ChevronsRight, Loader2
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

  // Trigger paginated API call whenever page, pageSize, filter, or search changes
  useEffect(() => {
    loadAlerts(currentPage, pageSize, alertFilter, debouncedSearch, facilities.length === 0);
  }, [currentPage, pageSize, alertFilter, debouncedSearch, loadAlerts]);

  // Full Network Quick Stats from national aggregates
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

  const quickStats = [
    {
      title: "National Health Resilience",
      value: "96.4%",
      change: `${totalFacilities.toLocaleString()} Active Facilities`,
      icon: ShieldCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/30",
      trend: "Vertex AI Federated Sync"
    },
    {
      title: "Real-Time Bed Occupancy",
      value: `${occupiedBeds.toLocaleString()} / ${totalBeds.toLocaleString()} Beds`,
      change: `${oxygenBeds.toLocaleString()} O2 | ${icuBeds.toLocaleString()} ICU Avail`,
      icon: Bed,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/30",
      trend: `${Math.round((occupiedBeds / totalBeds) * 100)}% Occupied`
    },
    {
      title: "Medical Staff Attendance",
      value: `${doctorsOnDuty.toLocaleString()}/${doctorsTotal.toLocaleString()} Doctors`,
      change: `${nursesOnDuty.toLocaleString()} Nurses | ${ashaActive.toLocaleString()} ASHA`,
      icon: Stethoscope,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/30",
      trend: `${Math.round((doctorsOnDuty / doctorsTotal) * 100)}% Duty Adherence`
    },
    {
      title: "Live Patient Footfall",
      value: `${dailyPatientFootfall.toLocaleString()} Today`,
      change: `${nationalAggregates.critical_deficits || 131} Critical Hotspots`,
      icon: Users,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/30",
      trend: "Peak Influx Monitored"
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
        facilityFull: `${fac.name} (${fac.district}, ${fac.state})`,
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
        {/* 4 KPI Card Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel p-5 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <div className="skeleton w-24 h-3.5" />
                <div className="skeleton w-9 h-9 rounded-xl" />
              </div>
              <div className="skeleton w-32 h-7" />
              <div className="flex justify-between items-center pt-1">
                <div className="skeleton w-20 h-3" />
                <div className="skeleton w-28 h-3" />
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column Skeletons */}
          <div className="lg:col-span-7 glass-panel p-6 border border-slate-800 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="skeleton w-9 h-9 rounded-lg" />
                <div className="space-y-1.5">
                  <div className="skeleton w-48 h-5" />
                  <div className="skeleton w-32 h-3" />
                </div>
              </div>
              <div className="skeleton w-24 h-7 rounded-lg" />
            </div>

            <div className="flex gap-3">
              <div className="skeleton flex-1 h-9 rounded-xl" />
              <div className="skeleton w-36 h-9 rounded-xl" />
            </div>

            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <div className="skeleton w-20 h-4 rounded" />
                      <div className="skeleton w-44 h-4 rounded" />
                    </div>
                    <div className="skeleton w-28 h-7 rounded-xl" />
                  </div>
                  <div className="flex gap-4">
                    <div className="skeleton w-32 h-3" />
                    <div className="skeleton w-20 h-3" />
                    <div className="skeleton w-24 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column Skeletons */}
          <div className="lg:col-span-5 space-y-5">
            <div className="glass-panel p-5 border border-slate-800 space-y-4">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
                <div className="skeleton w-36 h-5" />
                <div className="skeleton w-20 h-4 rounded-full" />
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="skeleton w-48 h-4" />
                <div className="flex justify-between items-baseline">
                  <div className="skeleton w-24 h-8" />
                  <div className="skeleton w-28 h-4" />
                </div>
                <div className="skeleton w-full h-2 rounded-full" />
                <div className="skeleton w-full h-3" />
              </div>
              <div className="skeleton w-full h-9 rounded-xl" />
            </div>

            <div className="glass-panel p-5 border border-slate-800 space-y-4">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
                <div className="skeleton w-44 h-5" />
                <div className="skeleton w-16 h-4 rounded-full" />
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="skeleton w-36 h-4" />
                <div className="skeleton w-full h-3" />
                <div className="skeleton w-4/5 h-3" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="skeleton h-8 rounded-xl" />
                <div className="skeleton h-8 rounded-xl" />
              </div>
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
            <div key={idx} className="glass-panel p-4 sm:p-5 relative overflow-hidden transition-all hover:scale-[1.01] hover:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {stat.title}
                </span>
                <div className={`p-2 rounded-xl border ${stat.bg}`}>
                  <Icon size={18} className={stat.color} />
                </div>
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-bold text-white tracking-tight">
                {stat.value}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">{stat.change}</span>
                <span className="text-cyan-400 font-semibold">{stat.trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Split: Interactive Alert Feed & Balanced Intelligence Suite */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 7 Cols: Paginated & Filterable Crisis Alert Center */}
        <div className="lg:col-span-7 glass-panel p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base sm:text-lg text-white">
                    Early Warning Crisis Alerts
                  </h3>
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                    {pagination.total_records.toLocaleString()} Total
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <RefreshCw size={11} className={`text-cyan-400 ${isTableLoading ? 'animate-spin' : ''}`} /> Vertex AI Real-time Triage Feed
                </span>
              </div>
            </div>

            {/* Quick Map Router Jump */}
            <button 
              onClick={() => onNavigate('map')} 
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 self-start sm:self-auto bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-cyan-500/40 transition-colors"
            >
              <span>Map Rebalancer</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {/* Search and Category Filter Chips */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={alertSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search facility, medicine, or district..."
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'CRITICAL', label: 'Critical' },
                { id: 'MODERATE', label: 'Moderate' },
                { id: 'BED_SURGE', label: 'Bed Surge' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFilterChange(f.id)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    alertFilter === f.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alert Cards List with Loading Transition */}
          <div className="space-y-3 min-h-[360px] relative">
            {isTableLoading && (
              <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px] z-10 rounded-xl flex items-center justify-center">
                <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl px-4 py-2 flex items-center gap-2 text-cyan-300 text-xs shadow-xl">
                  <Loader2 size={16} className="animate-spin text-cyan-400" />
                  <span>Loading network page {currentPage}...</span>
                </div>
              </div>
            )}

            {displayedAlerts.length > 0 ? (
              displayedAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 sm:p-4 transition-all hover:bg-slate-900 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          alert.severityType === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : alert.severityType === 'BED_SURGE'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        }`}>
                          {alert.severity}
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-white truncate flex items-center gap-1">
                          <MapPin size={13} className="text-cyan-400 shrink-0" />
                          <span className="truncate">{alert.facilityName}</span>
                          <span className="text-slate-400 font-normal text-xs">({alert.district})</span>
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                        <span className="text-rose-300 font-medium">
                          {alert.medName}: <strong>{alert.stock} units</strong> (Norm: {alert.threshold})
                        </span>
                        <span className="text-slate-400">
                          Beds: <strong className="text-slate-200">{alert.bedsOccupied}/{alert.bedCapacity}</strong>
                        </span>
                        <span className="text-slate-400">
                          Doctors: <strong className="text-slate-200">{alert.doctorsOnDuty}/{alert.doctorsTotal}</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onTriggerReallocation(alert.targetId, alert.medId)}
                      className="shrink-0 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-xs font-semibold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm group-hover:bg-cyan-500 group-hover:text-slate-950"
                    >
                      <span>Auto Reallocate</span>
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400 opacity-80" />
                <p className="text-sm font-semibold text-slate-300">No alerts match the current filter criteria</p>
                <p className="text-xs text-slate-500">All monitored facilities are operating within normal buffer bounds.</p>
              </div>
            )}
          </div>

          {/* Server-Side Pagination Controls & Footer Info */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-3 flex-wrap">
              <span>
                Showing <span className="font-semibold text-slate-200">{pagination.total_records > 0 ? (pagination.page - 1) * pagination.page_size + 1 : 0}</span> to <span className="font-semibold text-slate-200">{Math.min(pagination.page * pagination.page_size, pagination.total_records)}</span> of <span className="font-semibold text-cyan-400">{pagination.total_records.toLocaleString()}</span> facilities
              </span>

              {/* Rows per page selector */}
              <div className="flex items-center gap-1.5 ml-1">
                <span className="text-[11px] text-slate-500">Per page:</span>
                {[5, 10, 20, 50].map(size => (
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
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  title="First Page"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={!pagination.has_prev || isTableLoading}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-3 py-1 font-mono text-xs text-slate-300 font-semibold bg-slate-900 border border-slate-800 rounded-lg">
                  {pagination.page} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={!pagination.has_next || isTableLoading}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || isTableLoading}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Last Page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Balanced Real-Time Intelligence Suite */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Cold-Chain IoT Live Watchdog */}
          <div className="glass-panel p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ThermometerSnowflake className="text-cyan-400" size={18} />
                <h3 className="font-bold text-sm sm:text-base text-white">Cold-Chain IoT Guard</h3>
              </div>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                IoT RTDB Live
              </span>
            </div>

            <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-3.5 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  Thermal Excursion Detected
                </span>
                <span className="text-[10px] font-mono text-slate-400">Unit: ILR-B-03</span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">8.7°C</div>
                  <div className="text-[11px] text-slate-400">Target Range: 2.0°C - 8.0°C</div>
                </div>
                <div className="text-right">
                  <div className="text-rose-400 font-bold text-xs">+0.7°C Overheat</div>
                  <div className="text-[11px] text-slate-400">PHC Baragaon (Varanasi)</div>
                </div>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 h-2 w-[85%]"></div>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                Mean Kinetic Temperature (MKT) degradation: <strong className="text-rose-300">-12% potency loss / 6h</strong>. Solar battery reserve low (14%).
              </p>
            </div>

            <button
              onClick={() => onNavigate('coldchain')}
              className="w-full btn-secondary text-xs justify-center py-2 font-semibold"
            >
              <span>Open Cold-Chain Digital Twin</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {/* Monsoon & Vector Surge Risk Radar */}
          <div className="glass-panel p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CloudRain className="text-indigo-400" size={18} />
                <h3 className="font-bold text-sm sm:text-base text-white">Monsoon Inundation & Vector Radar</h3>
              </div>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                IMD Alert
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <MapPin size={13} className="text-amber-400" /> East Godavari & Varanasi
                </span>
                <span className="text-amber-400 font-mono font-bold text-[11px]">88mm / 24h Rain</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Vertex AI warns of heightened Snakebite & Leptospirosis surge over next 72h. Recommended action: Pre-position 50 ASV vials before roadway washouts.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onNavigate('forecasting')}
                className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 transition-colors font-semibold text-[11px]"
              >
                <span>Outbreak Forecast</span>
                <ArrowUpRight size={12} />
              </button>
              <button
                onClick={() => onNavigate('simulation')}
                className="bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 transition-colors font-semibold text-[11px]"
              >
                <Zap size={12} />
                <span>Crisis Sandbox</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
