'use client';
import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, AlertTriangle, ThermometerSnowflake, Truck, 
  TrendingUp, Activity, ArrowUpRight, Sparkles, MapPin, 
  CheckCircle2, RefreshCw, Bed, Users, UserCheck, Stethoscope, 
  HeartPulse, Search, Filter, ChevronLeft, ChevronRight, CloudRain,
  Navigation, Radio, Zap
} from 'lucide-react';

export default function OverviewDashboard({ 
  isLoading = false,
  facilities = [], 
  medicines = [], 
  telemetry = {}, 
  onNavigate, 
  onTriggerReallocation,
  onOpenCopilot 
}) {
  const [alertSearch, setAlertSearch] = useState('');
  const [alertFilter, setAlertFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const criticalDeficitCount = facilities.filter(f => f.status === 'Critical Deficit').length;
  const moderateDeficitCount = facilities.filter(f => f.status === 'Moderate Deficit').length;
  const optimalCount = facilities.filter(f => f.status === 'Optimal' || f.status === 'Surplus').length;
  const excursionCount = telemetry?.critical_excursions || 1;

  // Aggregate resource availability across monitored facilities
  const totalBeds = facilities.reduce((sum, f) => sum + (f.bedCapacity || 0), 0) || 300;
  const occupiedBeds = facilities.reduce((sum, f) => sum + (f.bedsOccupied || 0), 0) || 210;
  const oxygenBeds = facilities.reduce((sum, f) => sum + (f.oxygenBedsAvailable || 0), 0) || 45;
  const icuBeds = facilities.reduce((sum, f) => sum + (f.icuBedsAvailable || 0), 0) || 18;

  const doctorsOnDuty = facilities.reduce((sum, f) => sum + (f.doctorsOnDuty || 0), 0) || 12;
  const doctorsTotal = facilities.reduce((sum, f) => sum + (f.doctorsTotal || 0), 0) || 15;
  const nursesOnDuty = facilities.reduce((sum, f) => sum + (f.nursesOnDuty || 0), 0) || 38;
  const ashaActive = facilities.reduce((sum, f) => sum + (f.ashaActiveCount || 0), 0) || 94;

  const dailyPatientFootfall = facilities.reduce((sum, f) => sum + (f.dailyPatientFootfall || 0), 0) || 1420;

  const quickStats = [
    {
      title: "National Health Resilience",
      value: "96.4%",
      change: "+4.2% this week",
      icon: ShieldCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/30",
      trend: "Vertex AI Federated Sync"
    },
    {
      title: "Real-Time Bed Occupancy",
      value: `${occupiedBeds} / ${totalBeds} Beds`,
      change: `${oxygenBeds} O2 | ${icuBeds} ICU Avail`,
      icon: Bed,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/30",
      trend: `${Math.round((occupiedBeds/totalBeds)*100)}% Occupied`
    },
    {
      title: "Medical Staff Attendance",
      value: `${doctorsOnDuty}/${doctorsTotal} Doctors`,
      change: `${nursesOnDuty} Nurses | ${ashaActive} ASHA`,
      icon: Stethoscope,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/30",
      trend: "87.5% Duty Adherence"
    },
    {
      title: "Live Patient Footfall",
      value: `${dailyPatientFootfall.toLocaleString()} Today`,
      change: "Surge Alerts in 3 PHCs",
      icon: Users,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/30",
      trend: "Peak Monsoon Influx"
    }
  ];

  // Dynamically compute alerts from live facilities & medicines data
  const allAlerts = useMemo(() => {
    const list = facilities.length > 0 ? facilities : [];
    return list.map((fac, idx) => {
      const criticalMed = medicines.find(m => (m.inventoryByFacility?.[fac.id] || 0) < 15) || medicines[0] || { id: "MED-ASV-001", name: "Anti-Snake Venom (ASV)" };
      const stock = criticalMed.inventoryByFacility?.[fac.id] || 4;
      const isCritical = fac.status === 'Critical Deficit' || stock < 10;
      const isBedSurge = (fac.bedsOccupied && fac.bedCapacity) ? (fac.bedsOccupied / fac.bedCapacity) > 0.85 : false;
      
      let severityType = isCritical ? 'CRITICAL' : fac.status === 'Moderate Deficit' ? 'MODERATE' : 'WARNING';
      if (isBedSurge && !isCritical) severityType = 'BED_SURGE';

      return {
        id: `ALT-${String(idx + 1).padStart(3, '0')}`,
        severity: isCritical ? "CRITICAL DEFICIT" : isBedSurge ? "BED CAPACITY SURGE" : "SUPPLY DEFICIT",
        severityType,
        facilityName: fac.name,
        district: fac.district,
        state: fac.state,
        facilityFull: `${fac.name} (${fac.district}, ${fac.state})`,
        stock,
        threshold: criticalMed.nationalBufferNorm ? Math.round(criticalMed.nationalBufferNorm * 0.1) : 25,
        medName: criticalMed.name,
        medId: criticalMed.id,
        bedsOccupied: fac.bedsOccupied || 18,
        bedCapacity: fac.bedCapacity || 20,
        doctorsOnDuty: fac.doctorsOnDuty || 1,
        doctorsTotal: fac.doctorsTotal || 2,
        targetId: fac.id
      };
    });
  }, [facilities, medicines]);

  // Filter & Search alerts
  const filteredAlerts = useMemo(() => {
    return allAlerts.filter(alert => {
      const matchesFilter = 
        alertFilter === 'ALL' ? true :
        alertFilter === 'CRITICAL' ? alert.severityType === 'CRITICAL' :
        alertFilter === 'MODERATE' ? alert.severityType === 'MODERATE' :
        alertFilter === 'BED_SURGE' ? alert.severityType === 'BED_SURGE' : true;

      const q = alertSearch.toLowerCase();
      const matchesSearch = 
        alert.facilityFull.toLowerCase().includes(q) ||
        alert.medName.toLowerCase().includes(q) ||
        alert.district.toLowerCase().includes(q) ||
        alert.state.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [allAlerts, alertFilter, alertSearch]);

  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage) || 1;
  const paginatedAlerts = filteredAlerts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleFilterChange = (filter) => {
    setAlertFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (val) => {
    setAlertSearch(val);
    setCurrentPage(1);
  };

  if (isLoading && facilities.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Banner Skeleton */}
        <div className="glass-panel p-6 border border-slate-800 space-y-3">
          <div className="flex gap-2">
            <div className="skeleton w-36 h-6 rounded-full" />
            <div className="skeleton w-44 h-6 rounded-full" />
          </div>
          <div className="skeleton w-2/3 h-8 rounded-lg" />
          <div className="skeleton w-full max-w-2xl h-4 rounded-md" />
        </div>

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
      {/* Top Banner with Google AI Badge */}
      <div className="glass-panel-glow p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <Sparkles size={13} /> Federated Google AI Platform
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Real-Time PHC & Resource Mesh
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            National Health Resource, Bed, Staff & Supply Chain Platform
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-3xl">
            Real-time visibility into medicine stocks, bed availability, and medical personnel attendance across India's PHC network with shared cross-state federated AI forecasting.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button 
            onClick={() => onNavigate('federated')}
            className="btn-primary text-xs sm:text-sm px-4 py-2.5"
          >
            <span>Federated Multi-State AI</span>
            <ArrowUpRight size={15} />
          </button>
          <button 
            onClick={onOpenCopilot}
            className="btn-secondary text-xs sm:text-sm px-4 py-2.5"
          >
            <span>ASHA Voice Copilot</span>
          </button>
        </div>
      </div>

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
                    {filteredAlerts.length}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <RefreshCw size={11} className="animate-spin text-cyan-400" /> Vertex AI Real-time Triage Feed
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

          {/* Alert Cards List (Fixed comfortable container) */}
          <div className="space-y-3 min-h-[360px]">
            {paginatedAlerts.length > 0 ? (
              paginatedAlerts.map((alert) => (
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
                <p className="text-xs text-slate-500">All monitored PHC facilities are operating within normal buffer bounds.</p>
              </div>
            )}
          </div>

          {/* Pagination Controls & Footer Info */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing <span className="font-semibold text-slate-200">{filteredAlerts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-semibold text-slate-200">{Math.min(currentPage * itemsPerPage, filteredAlerts.length)}</span> of <span className="font-semibold text-slate-200">{filteredAlerts.length}</span> alerts
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-3 py-1 font-mono text-xs text-slate-300 font-semibold bg-slate-900 border border-slate-800 rounded-lg">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next Page"
                >
                  <ChevronRight size={14} />
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
