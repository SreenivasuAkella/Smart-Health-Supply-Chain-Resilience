'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShieldCheck, AlertTriangle, ThermometerSnowflake, Truck, 
  Activity, ArrowUpRight, Sparkles, MapPin, CheckCircle2, 
  RefreshCw, Bed, Users, Stethoscope, Search, ChevronRight, 
  CloudRain, Zap, ChevronsLeft, ChevronsRight, Loader2,
  Languages, Pill, HeartPulse, ExternalLink, ShieldAlert,
  Flame, Database, Radio, ArrowRight, Building2, Check
} from 'lucide-react';
import { fetchFacilitiesPaginated, fetchFederatedStatus } from '../services/api';

export default function OverviewDashboard({ 
  isLoading: parentLoading = false,
  telemetry = {}, 
  user = null,
  onNavigate, 
  onTriggerReallocation,
  onOpenCopilot,
  onOpenGuideModal 
}) {
  const [alertSearch, setAlertSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [alertFilter, setAlertFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [dispatchedId, setDispatchedId] = useState(null);

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
    critical_deficits: 3,
    total_beds: 362409,
    occupied_beds: 281191,
    oxygen_beds: 72456,
    icu_beds: 27848,
    doctors_on_duty: 8971,
    doctors_total: 11961,
    nurses_on_duty: 20863,
    asha_active: 98010
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(alertSearch);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [alertSearch]);

  // Load paginated data
  const loadAlerts = useCallback(async (pg, size, filter, search, isInitial = false) => {
    if (isInitial) setIsDataLoading(true);
    else setIsTableLoading(true);
    try {
      const res = await fetchFacilitiesPaginated(pg, size, {
        status: filter !== 'ALL' ? filter : undefined,
        search: search || undefined
      });
      if (res && res.items) {
        setFacilities(res.items);
        if (res.pagination) setPagination(res.pagination);
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

  // Handle immediate dispatch with visual confirmation
  const handleImmediateDispatch = (targetId, medId, quantity = 25) => {
    setDispatchedId(targetId);
    setTimeout(() => {
      onTriggerReallocation(targetId, medId, quantity);
    }, 400);
  };

  const totalBeds = nationalAggregates.total_beds || 362409;
  const occupiedBeds = nationalAggregates.occupied_beds || 281191;
  const bedOccupancyPct = Math.round((occupiedBeds / Math.max(1, totalBeds)) * 100);
  const doctorDutyPct = Math.round((nationalAggregates.doctors_on_duty / Math.max(1, nationalAggregates.doctors_total)) * 100);

  // Computed live alerts
  const displayedAlerts = useMemo(() => {
    return facilities.map((fac, idx) => {
      const isCritical = fac.status === 'Critical Deficit';
      const isBedSurge = (fac.bedsOccupied && fac.bedCapacity) ? (fac.bedsOccupied / fac.bedCapacity) > 0.85 : false;
      const stock = isCritical ? 4 : (fac.bedsOccupied ? Math.max(8, Math.round(fac.bedsOccupied * 0.15)) : 18);
      
      const severityType = isCritical ? 'CRITICAL' : isBedSurge ? 'BED_SURGE' : 'MODERATE';
      const aiRationale = isCritical
        ? `Monsoon rainfall (88mm) in ${fac.district} threatens bridge access on NH-31. Anti-Snake Venom is down to ${stock} units (< 2 days buffer). Recommended: Pre-position 25 vials from District Hospital.`
        : isBedSurge
        ? `Bed occupancy at ${fac.name} reached ${fac.bedsOccupied || 19}/${fac.bedCapacity || 20} (95%) due to seasonal fever influx. Oxygen buffer headroom is tight.`
        : `Weekly burn rate of essential medications surged +45% in ${fac.district}. Recommended replenishment before weekend road cutoff.`;

      return {
        id: fac.id || `FAC-${idx}`,
        facilityName: fac.name,
        district: fac.district,
        state: fac.state,
        severityType,
        severityLabel: isCritical ? "CRITICAL DEFICIT" : isBedSurge ? "BED CAPACITY SURGE" : "SUPPLY REORDER",
        stock,
        daysRemaining: isCritical ? "1.5" : "4.0",
        medName: "Anti-Snake Venom (ASV)",
        medId: "PUB-MED-001",
        bedsOccupied: fac.bedsOccupied || 9,
        bedCapacity: fac.bedCapacity || 10,
        doctorsOnDuty: fac.doctorsOnDuty || 1,
        doctorsTotal: fac.doctorsTotal || 2,
        aiRationale
      };
    });
  }, [facilities]);

  const totalPages = pagination.total_pages || 1;

  if ((isDataLoading || parentLoading) && facilities.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="skeleton w-32 h-4 rounded-md" />
              <div className="skeleton w-24 h-8 rounded-lg" />
              <div className="skeleton w-full h-2 rounded-full" />
            </div>
          ))}
        </div>
        <div className="skeleton w-full h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. HERO OPERATIONAL BANNER */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-cyan-500/25 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="badge-pill-cyan">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Pan-India Command Grid</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold flex items-center gap-1">
                <CheckCircle2 size={11} /> 1,188 Facilities Monitored
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Vertex AI Autonomous Sentinel
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-2 font-display">
              National Health Supply Chain & Clinical Resilience
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Instant situation awareness across rural clinics, cold-chain temperature sensors, bed occupancy, and automated drug rebalancing during monsoon and climate crises.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => onNavigate('clinical')}
              className="btn-secondary text-xs px-3.5 py-2 font-semibold text-cyan-300 hover:text-white"
            >
              <Bed size={14} />
              <span>Beds & Staff Roster</span>
            </button>
            <button
              onClick={() => onNavigate('map')}
              className="btn-primary text-xs px-4 py-2 font-bold shadow-lg shadow-cyan-500/20"
            >
              <Truck size={14} />
              <span>Geospatial Rebalance</span>
            </button>
          </div>
        </div>

        {/* Quick Grid Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate">Grid Status: <strong className="text-emerald-400 font-mono">OPTIMAL</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
            <span className="truncate">Free Beds: <strong className="text-white font-mono">81,218</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
            <span className="truncate">Active Doctors: <strong className="text-white font-mono">8,971</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0" />
            <span className="truncate">Critical Hotspots: <strong className="text-rose-400 font-mono">3 Clinics</strong></span>
          </div>
        </div>
      </div>

      {/* 2. FOUR HIGH-IMPACT METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Resilience Index */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-emerald-500/30 hover:border-emerald-500/50 transition-all space-y-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
              <ShieldCheck size={16} /> Resilience Index
            </span>
            <span className="badge-pill-emerald">96.4%</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-display">96.4%</div>
            <span className="text-[11px] text-emerald-300 font-mono font-bold">+1.2% this week</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-400 h-full rounded-full w-[96.4%]" />
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            1,188 monitored facilities safely above stockout thresholds
          </p>
        </div>

        {/* Card 2: Bed & Oxygen Capacity -> Links to Clinical Tab */}
        <div 
          onClick={() => onNavigate('clinical')}
          className="glass-panel p-4 sm:p-5 rounded-2xl border border-cyan-500/30 hover:border-cyan-500/60 transition-all space-y-3 cursor-pointer group"
          title="Click to view full Clinical & Bed details"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 font-mono">
              <Bed size={16} /> Bed Occupancy
            </span>
            <span className="badge-pill-cyan flex items-center gap-1">
              <span>{bedOccupancyPct}%</span>
              <ArrowUpRight size={10} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {occupiedBeds.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">of {totalBeds.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${bedOccupancyPct}%` }} />
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            72,456 Oxygen Beds • 27,848 ICU Beds ready
          </p>
        </div>

        {/* Card 3: Clinical Staff on Duty -> Links to Clinical Tab */}
        <div 
          onClick={() => onNavigate('clinical')}
          className="glass-panel p-4 sm:p-5 rounded-2xl border border-indigo-500/30 hover:border-indigo-500/60 transition-all space-y-3 cursor-pointer group"
          title="Click to inspect doctor & nurse duty rosters"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 font-mono">
              <Stethoscope size={16} /> Staff on Duty
            </span>
            <span className="badge-pill-indigo flex items-center gap-1">
              <span>{doctorDutyPct}%</span>
              <ArrowUpRight size={10} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {nationalAggregates.doctors_on_duty.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Doctors Active</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${doctorDutyPct}%` }} />
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            20,863 Nurses • 98,010 ASHA Workers Active
          </p>
        </div>

        {/* Card 4: Critical Priority Deficits */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-rose-500/30 hover:border-rose-500/50 transition-all space-y-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 font-mono">
              <AlertTriangle size={16} /> Priority Hotspots
            </span>
            <span className="badge-pill-rose">3 Action Needed</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-display">
              3 Facilities
            </div>
            <span className="text-[11px] text-rose-300 font-mono font-bold">&lt; 48h Stock</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full w-[85%]" />
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            Varanasi & East Godavari flood isolation risks
          </p>
        </div>
      </div>

      {/* 3. MAIN SPLIT COMMAND INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT 7 COLS: EARLY WARNING TRIAGE HOTSPOTS (Zero Clutter, Action Oriented) */}
        <div className="lg:col-span-7 glass-panel p-5 sm:p-6 space-y-4 rounded-2xl border border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-white font-display">
                  Early Warning Deficit & Incident Stream
                </h2>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">
                  {pagination.total_records.toLocaleString()} Clinics
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                AI continuously evaluates medicine burn rates, weather alerts, and road flood risk.
              </p>
            </div>

            <button
              onClick={() => onNavigate('map')}
              className="btn-secondary text-xs px-3 py-1.5 self-start sm:self-auto text-cyan-300 hover:text-white"
            >
              <span>View On GIS</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {/* Search & Fast Filters */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={alertSearch}
                onChange={(e) => setAlertSearch(e.target.value)}
                placeholder="Search facility name, district, medicine..."
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500/60 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'ALL', label: 'All Alerts' },
                { id: 'Critical Deficit', label: 'Critical' },
                { id: 'Moderate Deficit', label: 'Moderate' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setAlertFilter(f.id);
                    setCurrentPage(1);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                    alertFilter === f.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alert Cards List */}
          <div className="space-y-3 min-h-[320px] relative">
            {isTableLoading && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-10 rounded-xl flex items-center justify-center">
                <div className="bg-slate-900 border border-cyan-500/40 rounded-xl px-4 py-2 flex items-center gap-2 text-cyan-300 text-xs">
                  <Loader2 size={16} className="animate-spin text-cyan-400" />
                  <span>Loading alerts...</span>
                </div>
              </div>
            )}

            {displayedAlerts.length > 0 ? (
              displayedAlerts.map((alert) => {
                const isCritical = alert.severityType === 'CRITICAL';
                const isDispatched = dispatchedId === alert.id;

                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      isCritical
                        ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/25 via-slate-900/80 to-slate-900/90 shadow-md'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-2 flex-1 min-w-0">
                        {/* Title Row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          }`}>
                            {alert.severityLabel}
                          </span>
                          <div className="flex items-center gap-1 text-xs font-bold text-white truncate">
                            <MapPin size={13} className="text-cyan-400 shrink-0" />
                            <span className="truncate">{alert.facilityName}</span>
                            <span className="text-slate-400 font-normal">({alert.district}, {alert.state})</span>
                          </div>
                        </div>

                        {/* Plain English Reason */}
                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                          {alert.aiRationale}
                        </p>

                        {/* Inventory & Clinical Status */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-0.5">
                          <span className="text-rose-300 font-semibold flex items-center gap-1">
                            <Pill size={12} className="text-rose-400" />
                            {alert.medName}: <strong className="text-white">{alert.stock} units</strong> ({alert.daysRemaining} days left)
                          </span>
                          <span className="flex items-center gap-1">
                            <Bed size={12} className="text-slate-400" />
                            Beds: <strong className="text-slate-200">{alert.bedsOccupied}/{alert.bedCapacity}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Stethoscope size={12} className="text-slate-400" />
                            Duty: <strong className="text-slate-200">{alert.doctorsOnDuty}/{alert.doctorsTotal} Docs</strong>
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex sm:flex-col gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleImmediateDispatch(alert.id, alert.medId)}
                          disabled={isDispatched}
                          className="btn-primary text-xs px-3.5 py-2 font-bold shadow-md shadow-cyan-500/20 whitespace-nowrap"
                        >
                          {isDispatched ? (
                            <>
                              <Check size={14} className="text-emerald-300" />
                              <span>Dispatching...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={14} className="text-amber-300" />
                              <span>Dispatch Surplus</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-14 text-slate-400 space-y-2.5">
                <CheckCircle2 size={36} className="mx-auto text-emerald-400" />
                <p className="text-sm font-semibold text-slate-200">All monitored facilities optimal</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Medicine stocks and bed capacity are within safety thresholds.
                </p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing <strong className="text-slate-200">{pagination.total_records > 0 ? (pagination.page - 1) * pagination.page_size + 1 : 0}</strong> to <strong className="text-slate-200">{Math.min(pagination.page * pagination.page_size, pagination.total_records)}</strong> of <strong className="text-cyan-400">{pagination.total_records.toLocaleString()}</strong>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || isTableLoading}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={!pagination.has_prev || isTableLoading}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30"
                >
                  <ChevronRight size={14} className="rotate-180" />
                </button>
                <span className="px-3 py-1 font-mono text-xs text-slate-300 font-semibold bg-slate-900 border border-slate-800 rounded-lg">
                  {pagination.page} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={!pagination.has_next || isTableLoading}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || isTableLoading}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 5 COLS: RECOMMENDED ACTIONS & PERSISTENT WATCHDOGS */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Action Center: Top 3 High-Impact Steps */}
          <div className="glass-panel p-5 space-y-3.5 rounded-2xl border border-cyan-500/25">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="text-amber-400" size={17} />
                <h3 className="font-bold text-sm sm:text-base text-white font-display">
                  Recommended Immediate Actions
                </h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
                Today&apos;s Focus
              </span>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: 1,
                  title: "Pre-position 50 ASV Vials to PHC Baragaon",
                  desc: "NH-31 bridge wash risk imminent. Surplus donor: Pt. Deen Dayal Hospital.",
                  urgency: "HIGH",
                  badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
                  action: () => handleImmediateDispatch("PHC-BARAGAON-03", "PUB-MED-001", 50)
                },
                {
                  id: 2,
                  title: "Inspect Cold-Chain Thermal Drift (Unit ILR-B-03)",
                  desc: "Current temp: 8.7°C. Switch to backup solar inverter battery.",
                  urgency: "URGENT",
                  badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
                  action: () => onNavigate('coldchain')
                },
                {
                  id: 3,
                  title: "Check Clinical Staff & ICU Bed Headroom",
                  desc: "Verify on-duty doctors and ICU ventilators for emergency admissions.",
                  urgency: "CLINICAL",
                  badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
                  action: () => onNavigate('clinical')
                }
              ].map((act) => (
                <div key={act.id} className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3 space-y-2 transition-all">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${act.badgeColor}`}>
                      {act.urgency}
                    </span>
                    <span className="text-[10px] text-slate-500">Autonomous Sentinel</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-snug">{act.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{act.desc}</p>
                  </div>
                  <button
                    onClick={act.action}
                    className="w-full btn-secondary text-xs justify-center py-1.5 font-semibold text-cyan-300 hover:text-white"
                  >
                    <span>Execute Action</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Cold-Chain IoT Live Watchdog Card */}
          <div className="glass-panel p-5 space-y-3.5 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ThermometerSnowflake className="text-cyan-400" size={17} />
                <h3 className="font-bold text-sm sm:text-base text-white font-display">
                  Cold-Chain IoT Watchdog
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Firebase RTDB
              </span>
            </div>

            <div className="bg-slate-900/80 border border-rose-500/30 rounded-xl p-3.5 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-rose-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  Thermal Excursion Alert (Unit ILR-B-03)
                </span>
                <span className="text-[10px] font-mono text-slate-400">PHC Baragaon</span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-extrabold text-rose-400 font-display">8.7°C</div>
                  <div className="text-[10px] text-slate-400">Safe Band: 2.0°C – 8.0°C</div>
                </div>
                <div className="text-right">
                  <div className="text-rose-400 font-bold text-xs">+0.7°C Drift</div>
                  <div className="text-[10px] text-slate-400">Solar Backup: 14%</div>
                </div>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 h-1.5 w-[87%]" />
              </div>
            </div>

            <button
              onClick={() => onNavigate('coldchain')}
              className="w-full btn-secondary text-xs justify-center py-2 font-semibold text-cyan-300 hover:text-white"
            >
              <span>Inspect Full Digital Twin Telemetry</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {/* Quick Jump Command Grid to New Dedicated Tabs */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Dedicated Command Consoles:
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate('clinical')}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <Bed size={15} className="text-cyan-400" />
                  <ArrowRight size={12} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
                <div className="text-xs font-bold text-white mt-1">Clinical & Beds</div>
                <div className="text-[10px] text-slate-400">Doctors, nurses, triage</div>
              </button>

              <button
                onClick={() => onNavigate('cloud-data')}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <Database size={15} className="text-indigo-400" />
                  <ArrowRight size={12} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                </div>
                <div className="text-xs font-bold text-white mt-1">BigQuery Studio</div>
                <div className="text-[10px] text-slate-400">10M SQL & Firebase</div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
