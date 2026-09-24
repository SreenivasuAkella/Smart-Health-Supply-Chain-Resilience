'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Bed, Users, Stethoscope, HeartPulse, Activity, AlertTriangle, 
  Search, Filter, CheckCircle2, Clock, MapPin, 
  ShieldCheck, RefreshCw, ChevronRight, ChevronsLeft, ChevronsRight,
  Sparkles, Thermometer, UserCheck, Building2, Flame, TrendingUp,
  BarChart3, LayoutGrid, List, ArrowUpRight
} from 'lucide-react';
import { fetchFacilitiesPaginated, fetchAttendanceSummary } from '../services/api';

export default function ClinicalHospitalOps({ onNavigate }) {
  const [activeSubTab, setActiveSubTab] = useState('beds'); // 'beds' | 'attendance' | 'footfall'
  
  // Individual Search States for each table
  const [bedSearch, setBedSearch] = useState('');
  const [debouncedBedSearch, setDebouncedBedSearch] = useState('');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [footfallSearch, setFootfallSearch] = useState('');
  
  // Dropdown Filter States
  const [filterOccupancy, setFilterOccupancy] = useState('ALL'); // 'ALL' | 'SURGE' | 'BUSY' | 'OPTIMAL'
  const [filterTier, setFilterTier] = useState('ALL'); // 'ALL' | 'District Hospital' | 'CHC' | 'PHC'
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);

  // Backend Data
  const [facilities, setFacilities] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [nationalAggregates, setNationalAggregates] = useState({
    total_facilities: 1188,
    total_beds: 362409,
    occupied_beds: 281191,
    oxygen_beds: 72456,
    icu_beds: 27848,
    doctors_on_duty: 8971,
    doctors_total: 11961,
    nurses_on_duty: 20863,
    nurses_total: 26500,
    asha_active: 98010,
    daily_patient_footfall: 1153112
  });

  const [pagination, setPagination] = useState({
    total_records: 1188,
    page: 1,
    page_size: 10,
    total_pages: 119,
    has_next: true,
    has_prev: false
  });

  // Debounce bed search for server query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedBedSearch(bedSearch);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [bedSearch]);

  // Load facilities and attendance from backend
  const loadData = useCallback(async (pg, size, search, isInitial = false) => {
    if (isInitial) setIsLoading(true);
    else setIsTableLoading(true);

    try {
      const [facRes, attRes] = await Promise.all([
        fetchFacilitiesPaginated(pg, size, { search: search || undefined }),
        fetchAttendanceSummary(pg, size, "")
      ]);

      if (facRes && facRes.items) {
        setFacilities(facRes.items);
        if (facRes.pagination) setPagination(facRes.pagination);
        if (facRes.metadata?.national_aggregates) {
          setNationalAggregates(facRes.metadata.national_aggregates);
        }
      }

      if (attRes && attRes.items) {
        setAttendanceRecords(attRes.items);
      }
    } catch (err) {
      console.error("Clinical tab data error:", err);
    } finally {
      setIsLoading(false);
      setIsTableLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(currentPage, pageSize, debouncedBedSearch, facilities.length === 0);
  }, [currentPage, pageSize, debouncedBedSearch, loadData]);

  // Key National Metrics
  const totalBeds = nationalAggregates.total_beds || 362409;
  const occupiedBeds = nationalAggregates.occupied_beds || 281191;
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);
  const bedOccupancyPct = Math.round((occupiedBeds / Math.max(1, totalBeds)) * 100);
  const doctorAdherencePct = Math.round((nationalAggregates.doctors_on_duty / Math.max(1, nationalAggregates.doctors_total)) * 100);
  const totalDailyFootfall = nationalAggregates.daily_patient_footfall || 1153112;

  // Filter facilities by occupancy status and tier
  const displayedFacilities = useMemo(() => {
    return facilities.filter(fac => {
      const cap = fac.bedCapacity || 20;
      const occ = fac.bedsOccupied || Math.round(cap * 0.75);
      const pct = (occ / cap) * 100;

      if (filterOccupancy === 'SURGE' && pct < 85) return false;
      if (filterOccupancy === 'BUSY' && (pct < 70 || pct >= 85)) return false;
      if (filterOccupancy === 'OPTIMAL' && pct >= 70) return false;

      if (filterTier !== 'ALL' && fac.type !== filterTier) return false;

      return true;
    });
  }, [facilities, filterOccupancy, filterTier]);

  // Filter attendance records by individual attendanceSearch
  const displayedAttendanceRecords = useMemo(() => {
    if (!attendanceSearch.trim()) return attendanceRecords;
    const q = attendanceSearch.toLowerCase();
    return attendanceRecords.filter(r => 
      (r.facility_name && r.facility_name.toLowerCase().includes(q)) ||
      (r.district && r.district.toLowerCase().includes(q)) ||
      (r.type && r.type.toLowerCase().includes(q))
    );
  }, [attendanceRecords, attendanceSearch]);

  // Filter footfall facilities by individual footfallSearch
  const displayedFootfallFacilities = useMemo(() => {
    if (!footfallSearch.trim()) return facilities;
    const q = footfallSearch.toLowerCase();
    return facilities.filter(fac => 
      (fac.name && fac.name.toLowerCase().includes(q)) ||
      (fac.district && fac.district.toLowerCase().includes(q)) ||
      (fac.state && fac.state.toLowerCase().includes(q))
    );
  }, [facilities, footfallSearch]);

  const totalPages = pagination.total_pages || 1;

  if (isLoading && facilities.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="skeleton w-28 h-3 rounded" />
              <div className="skeleton w-20 h-7 rounded" />
            </div>
          ))}
        </div>
        <div className="skeleton w-full h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. COMPACT TOP SUMMARY STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-300 shadow-md hover:shadow-cyan-500/5 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 font-mono">
              <Bed size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>National Bed In-Use</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              {bedOccupancyPct}%
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="text-2xl font-extrabold text-white tracking-tight font-display">
              {occupiedBeds.toLocaleString()}
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">
              {availableBeds.toLocaleString()} Free
            </span>
          </div>
          <div className="w-full bg-slate-950/80 rounded-full h-1.5 mt-3 overflow-hidden border border-slate-800/50">
            <div className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${bedOccupancyPct}%` }} />
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-300 shadow-md hover:shadow-indigo-500/5 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 font-mono">
              <HeartPulse size={14} className="text-indigo-400 group-hover:scale-110 transition-transform" />
              <span>ICU & O₂ Buffer</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              Ventilators
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="text-2xl font-extrabold text-white tracking-tight font-display">
              {nationalAggregates.icu_beds.toLocaleString()}
            </div>
            <span className="text-[11px] font-mono text-indigo-300">
              {nationalAggregates.oxygen_beds.toLocaleString()} O₂ Ready
            </span>
          </div>
          <div className="w-full bg-slate-950/80 rounded-full h-1.5 mt-3 overflow-hidden border border-slate-800/50">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-400 h-full rounded-full w-[78%] transition-all duration-500" />
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 hover:border-emerald-500/40 transition-all duration-300 shadow-md hover:shadow-emerald-500/5 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 font-mono">
              <Stethoscope size={14} className="text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Doctors on Duty</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {doctorAdherencePct}% Adherence
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="text-2xl font-extrabold text-white tracking-tight font-display">
              {nationalAggregates.doctors_on_duty.toLocaleString()}
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {nationalAggregates.nurses_on_duty.toLocaleString()} Nurses
            </span>
          </div>
          <div className="w-full bg-slate-950/80 rounded-full h-1.5 mt-3 overflow-hidden border border-slate-800/50">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${doctorAdherencePct}%` }} />
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 hover:border-amber-500/40 transition-all duration-300 shadow-md hover:shadow-amber-500/5 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 font-mono">
              <Users size={14} className="text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Daily Patient Footfall</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              All India
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="text-2xl font-extrabold text-white tracking-tight font-display">
              {(totalDailyFootfall / 1000000).toFixed(2)}M
            </div>
            <span className="text-[11px] font-mono text-amber-300/80">
              Consultations/day
            </span>
          </div>
          <div className="w-full bg-slate-950/80 rounded-full h-1.5 mt-3 overflow-hidden border border-slate-800/50">
            <div className="bg-gradient-to-r from-amber-500 to-orange-400 h-full rounded-full w-[85%] transition-all duration-500" />
          </div>
        </div>
      </div>

      {/* 2. UNIFIED CONTINUOUS CLINICAL COMMAND WORKSPACE */}
      <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
        {/* ROW 1: INTEGRATED SUB-TAB NAVIGATION */}
        <div className="px-3.5 py-2.5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="inline-flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 gap-1 overflow-x-auto">
            {[
              { id: 'beds', label: 'Bed & ICU Availability Matrix', icon: Bed, badge: `${bedOccupancyPct}% Occupancy` },
              { id: 'attendance', label: 'Cadre Attendance', icon: UserCheck, badge: `${nationalAggregates.doctors_on_duty.toLocaleString()} On-Duty` },
              { id: 'footfall', label: 'Patient Footfall & Velocity', icon: BarChart3, badge: '1.15M/day' }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700/90'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-cyan-400' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25' : 'bg-slate-950 text-slate-500'
                  }`}>
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ROW 2: INTEGRATED CONTEXT TOOLBAR (DROPDOWNS & SEARCH DIRECTLY ATTACHED) */}
        {activeSubTab === 'beds' && (
          <div className="px-3.5 py-2.5 border-b border-slate-800/80 bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Dropdown Filters */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Filter size={13} className="text-cyan-400 shrink-0" />
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Occupancy:</span>
                <select
                  value={filterOccupancy}
                  onChange={(e) => setFilterOccupancy(e.target.value)}
                  className="bg-slate-950/90 text-slate-200 border border-slate-700/80 hover:border-slate-600 rounded-lg px-2.5 py-1 text-xs font-medium focus:border-cyan-500/60 outline-none transition-all cursor-pointer"
                >
                  <option value="ALL">All Occupancy Levels (All Clinics)</option>
                  <option value="SURGE">🚨 Surge Capacity (&gt;85%)</option>
                  <option value="BUSY">⚡ Moderate Load (70–85%)</option>
                  <option value="OPTIMAL">✅ Normal (&lt;70%)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Tier:</span>
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="bg-slate-950/90 text-slate-200 border border-slate-700/80 hover:border-slate-600 rounded-lg px-2.5 py-1 text-xs font-medium focus:border-cyan-500/60 outline-none transition-all cursor-pointer"
                >
                  <option value="ALL">All Facility Tiers</option>
                  <option value="District Hospital">District Hospitals</option>
                  <option value="CHC">Community Health Centres (CHC)</option>
                  <option value="PHC">Primary Health Centres (PHC)</option>
                </select>
              </div>

              <span className="text-[11px] font-mono text-slate-500 pl-1 hidden sm:inline">
                ({displayedFacilities.length} clinics matching)
              </span>
            </div>

            {/* Individual Search for Bed Table */}
            <div className="relative w-full md:w-80">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={bedSearch}
                onChange={(e) => setBedSearch(e.target.value)}
                placeholder="Search clinics by name, district, or state..."
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-cyan-500/60 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all shadow-inner"
              />
            </div>
          </div>
        )}

        {activeSubTab === 'attendance' && (
          <div className="px-3.5 py-2.5 border-b border-slate-800/80 bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                <UserCheck size={14} className="text-cyan-400" />
                <span>Facility Cadre Attendance (WHO HWF Benchmark)</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">NHSRC HRMIS 2023 Sentinel Records</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
                placeholder="Filter personnel records..."
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-cyan-500/60 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none shadow-inner"
              />
            </div>
          </div>
        )}

        {activeSubTab === 'footfall' && (
          <div className="px-3.5 py-2.5 border-b border-slate-800/80 bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                <BarChart3 size={14} className="text-cyan-400" />
                <span>Patient Footfall vs Medicine Burn Velocity by Facility</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">Continuous Sentinel Stress-Test Velocity Ratio</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={footfallSearch}
                onChange={(e) => setFootfallSearch(e.target.value)}
                placeholder="Filter footfall clinics..."
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-cyan-500/60 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none shadow-inner"
              />
            </div>
          </div>
        )}

        {/* ROW 3: CONTINUOUS TABLE BODY (SEAMLESSLY BLEEDING WITHOUT BREAKS) */}
        {activeSubTab === 'beds' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800/90 text-slate-400 text-[10px] uppercase font-mono bg-slate-950/50 tracking-wider">
                  <th className="py-3 px-4 min-w-[260px] whitespace-nowrap">Facility Name & Location</th>
                  <th className="py-3 px-4 min-w-[200px] whitespace-nowrap">Occupancy Status</th>
                  <th className="py-3 px-3 min-w-[110px] whitespace-nowrap">ICU Units</th>
                  <th className="py-3 px-3 min-w-[110px] whitespace-nowrap">Oxygen Ready</th>
                  <th className="py-3 px-4 min-w-[190px] whitespace-nowrap">Staff on Duty</th>
                  <th className="py-3 px-4 min-w-[130px] text-right whitespace-nowrap">Redistribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {displayedFacilities.length > 0 ? (
                  displayedFacilities.map((fac) => {
                    const cap = fac.bedCapacity || 20;
                    const occ = fac.bedsOccupied || Math.round(cap * 0.75);
                    const occPct = Math.round((occ / cap) * 100);
                    const isSurge = occPct >= 85;
                    const isBusy = occPct >= 70 && occPct < 85;

                    return (
                      <tr key={fac.id} className="hover:bg-slate-800/40 transition-colors group">
                        {/* Facility Name & Location */}
                        <td className="py-2.5 px-4 min-w-[260px] whitespace-nowrap">
                          <div className="font-semibold text-white font-sans text-xs group-hover:text-cyan-300 transition-colors whitespace-nowrap">
                            {fac.name}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 whitespace-nowrap font-sans">
                            <MapPin size={11} className="text-slate-500 shrink-0" />
                            <span>{fac.district}, {fac.state}</span>
                          </div>
                        </td>


                        {/* Occupancy Status + Mini Progress Bar */}
                        <td className="py-2.5 px-4 min-w-[200px] whitespace-nowrap">
                          <div className="flex flex-col gap-1 whitespace-nowrap">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap inline-flex items-center gap-1 ${
                                isSurge
                                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                  : isBusy
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              }`}>
                                {isSurge && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />}
                                {occPct}% {isSurge ? 'SURGE' : isBusy ? 'BUSY' : 'OPTIMAL'}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                                ({occ}/{cap} Beds)
                              </span>
                            </div>
                            <div className="w-28 bg-slate-950 rounded-full h-1 overflow-hidden border border-slate-800/60">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isSurge ? 'bg-rose-500' : isBusy ? 'bg-amber-400' : 'bg-emerald-400'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(5, occPct))}%` }}
                              />
                            </div>
                          </div>
                        </td>


                        {/* ICU Ventilators */}
                        <td className="py-2.5 px-3 min-w-[110px] whitespace-nowrap">
                          <span className="font-mono font-semibold text-indigo-300 text-xs whitespace-nowrap">
                            {fac.icuBeds || 1} Units
                          </span>
                        </td>

                        {/* Oxygen Beds */}
                        <td className="py-2.5 px-3 min-w-[110px] whitespace-nowrap">
                          <span className="font-mono font-semibold text-cyan-300 text-xs whitespace-nowrap">
                            {fac.oxygenBeds || 2} O₂ Beds
                          </span>
                        </td>

                        {/* Staff on Duty */}
                        <td className="py-2.5 px-4 min-w-[190px] whitespace-nowrap">
                          <div className="text-xs font-mono whitespace-nowrap text-slate-300 flex items-center gap-1.5">
                            <strong className="text-white font-semibold whitespace-nowrap">{fac.doctorsOnDuty || 1} Docs</strong>
                            <span className="text-slate-600">•</span>
                            <strong className="text-slate-300 whitespace-nowrap">{fac.nursesOnDuty || 2} Nurses</strong>
                          </div>
                        </td>

                        {/* Action Button */}
                        <td className="py-2.5 px-4 min-w-[130px] text-right whitespace-nowrap">
                          <button
                            onClick={() => onNavigate('map')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-semibold whitespace-nowrap transition-all shadow-sm group-hover:translate-x-0.5"
                          >
                            <span>Rebalance</span>
                            <ArrowUpRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      No facilities matched the selected occupancy or tier filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === 'attendance' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-mono bg-slate-950/50 tracking-wider">
                  <th className="py-3 px-4 min-w-[260px] whitespace-nowrap">Facility Name</th>
                  <th className="py-3 px-3 min-w-[120px] whitespace-nowrap">Tier</th>
                  <th className="py-3 px-3 min-w-[130px] whitespace-nowrap">District</th>
                  <th className="py-3 px-3 min-w-[140px] whitespace-nowrap">Doctors on Duty</th>
                  <th className="py-3 px-3 min-w-[140px] whitespace-nowrap">Nurses on Duty</th>
                  <th className="py-3 px-3 min-w-[120px] whitespace-nowrap">ASHA Workers</th>
                  <th className="py-3 px-3 min-w-[130px] whitespace-nowrap">Duty Adherence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {displayedAttendanceRecords.length > 0 ? (
                  displayedAttendanceRecords.map((att) => (
                    <tr key={att.facility_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 min-w-[260px] font-semibold text-white font-sans whitespace-nowrap">{att.facility_name}</td>
                      <td className="py-2.5 px-3 min-w-[120px] whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700/80 whitespace-nowrap inline-block">
                          {att.type || 'PHC'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 min-w-[130px] text-slate-300 font-sans whitespace-nowrap">{att.district}</td>
                      <td className="py-2.5 px-3 min-w-[140px] text-emerald-400 font-bold whitespace-nowrap">
                        {att.doctors_on_duty} / {att.doctors_total || 2}
                      </td>
                      <td className="py-2.5 px-3 min-w-[140px] text-indigo-300 font-bold whitespace-nowrap">
                        {att.nurses_on_duty} / {att.nurses_total || 4}
                      </td>
                      <td className="py-2.5 px-3 min-w-[120px] text-amber-300 font-bold whitespace-nowrap">{att.asha_active}</td>
                      <td className="py-2.5 px-3 min-w-[130px] whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 whitespace-nowrap">
                          {att.duty_adherence_pct}% Adherence
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                      No cadre attendance records match &quot;{attendanceSearch}&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === 'footfall' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-mono bg-slate-950/50 tracking-wider">
                  <th className="py-3 px-4 min-w-[260px] whitespace-nowrap">Facility Name</th>
                  <th className="py-3 px-3 min-w-[130px] whitespace-nowrap">District</th>
                  <th className="py-3 px-3 min-w-[140px] whitespace-nowrap">Daily Footfall</th>
                  <th className="py-3 px-3 min-w-[120px] whitespace-nowrap">Bed Capacity</th>
                  <th className="py-3 px-3 min-w-[140px] whitespace-nowrap">Footfall / Bed Ratio</th>
                  <th className="py-3 px-3 min-w-[160px] whitespace-nowrap">Medicine Burn Velocity</th>
                  <th className="py-3 px-3 min-w-[130px] whitespace-nowrap">Supply Resilience</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {displayedFootfallFacilities.map((fac, idx) => {
                  const footfall = fac.dailyPatientFootfall || Math.round((fac.bedCapacity || 20) * 4.2);
                  const beds = fac.bedCapacity || 20;
                  const ratio = (footfall / beds).toFixed(1);
                  const isHighStress = ratio > 4.5 || fac.status === 'Critical Deficit';

                  return (
                    <tr key={fac.id || idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 min-w-[260px] font-semibold text-white font-sans whitespace-nowrap">{fac.name}</td>
                      <td className="py-2.5 px-3 min-w-[130px] text-slate-300 font-sans whitespace-nowrap">{fac.district}</td>
                      <td className="py-2.5 px-3 min-w-[140px] text-cyan-300 font-bold whitespace-nowrap">{footfall.toLocaleString()} pts/day</td>
                      <td className="py-2.5 px-3 min-w-[120px] text-slate-300 whitespace-nowrap">{beds} Beds</td>
                      <td className="py-2.5 px-3 min-w-[140px] whitespace-nowrap">
                        <span className={`font-bold whitespace-nowrap ${isHighStress ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {ratio}x
                        </span>
                      </td>
                      <td className="py-2.5 px-3 min-w-[160px] text-slate-300 whitespace-nowrap">
                        {isHighStress ? (
                          <span className="text-rose-400 font-bold flex items-center gap-1 whitespace-nowrap">
                            <TrendingUp size={11} /> +45% Surge
                          </span>
                        ) : (
                          <span className="text-emerald-400 whitespace-nowrap">Normal (Baseline)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 min-w-[130px] whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                          fac.status === 'Critical Deficit'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {fac.status || 'Optimal'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ROW 4: INTEGRATED FOOTER PAGINATION */}
        <div className="px-4 py-3 border-t border-slate-800/80 bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <div>
              Showing <strong className="text-slate-200">{(pagination.page - 1) * pagination.page_size + 1}</strong> to <strong className="text-slate-200">{Math.min(pagination.page * pagination.page_size, pagination.total_records)}</strong> of <strong className="text-cyan-400">{pagination.total_records.toLocaleString()}</strong> Facilities
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Per Page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-700/80 rounded px-2 py-0.5 text-xs text-slate-300 font-mono cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
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
    </div>
  );
}
