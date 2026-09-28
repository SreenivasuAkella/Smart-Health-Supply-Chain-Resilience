'use client';
import React, { useState, useEffect } from 'react';
import { 
  Zap, AlertTriangle, CheckCircle2, CloudRain, Flame, ArrowRight, 
  MapPin, Pill, Truck, Database, ShieldAlert, Activity, Navigation, 
  Loader2, Play, Pause, FastForward, Clock, ShieldCheck, RefreshCw,
  Sun, Waves, Wind, Radio, Info
} from 'lucide-react';
import { 
  fetchSimulationScenarios, 
  runCrisisSimulation, 
  executeDrillMitigation, 
  fetchFacilities, 
  fetchClockStatus, 
  triggerClockTick, 
  startClock, 
  stopClock 
} from '../services/api';

const SCENARIO_ICONS = {
  FLOOD_INUNDATION: Waves,
  VECTOR_OUTBREAK: CloudRain,
  COLD_CHAIN_GRID_FAILURE: Flame,
  HEATWAVE_SURGE: Sun,
  CYCLONE_COASTAL: Wind,
  WATERBORNE_EPIDEMIC: AlertTriangle
};

const SCENARIO_COLORS = {
  rose: { text: "text-rose-400", bg: "bg-rose-500/15 border-rose-500/30", badge: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
  cyan: { text: "text-cyan-400", bg: "bg-cyan-500/15 border-cyan-500/30", badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
  amber: { text: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30", badge: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  purple: { text: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/30", badge: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  orange: { text: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30", badge: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" }
};

export default function CrisisSandbox({ onNavigateToMap }) {
  const [scenarios, setScenarios] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState('AUTO');
  const [selectedState, setSelectedState] = useState('ALL');
  const [severity, setSeverity] = useState('HIGH');
  const [simulationResult, setSimulationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(null);

  // Clock State
  const [clockStatus, setClockStatus] = useState(null);
  const [clockLoading, setClockLoading] = useState(false);

  // 1. Initial Load: Scenarios, Facilities, Clock Status
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [scRes, facRes, clkRes] = await Promise.allSettled([
          fetchSimulationScenarios(),
          fetchFacilities(),
          fetchClockStatus()
        ]);

        if (mounted) {
          const loadedFacilities = facRes.status === 'fulfilled' && Array.isArray(facRes.value) ? facRes.value : [];
          if (loadedFacilities.length > 0) {
            setFacilities(loadedFacilities);
          }

          if (scRes.status === 'fulfilled' && Array.isArray(scRes.value) && scRes.value.length > 0) {
            setScenarios(scRes.value);
            setSelectedScenarioId(scRes.value[0].id);
          } else {
            const categories = [
              { crisis_class: "FLOOD_INUNDATION", name: "Monsoon Riverine Inundation Cutoff", badge: "Monsoon Flood Inundation", badge_color: "rose", burn: 4.5, desc: "Surface road access cut off by surging floodwaters. Critical antivenom and rehydration buffers require aerial Drone Corridor delivery." },
              { crisis_class: "CYCLONE_COASTAL", name: "Severe Coastal Cyclone Surge", badge: "Coastal Storm Surge", badge_color: "purple", burn: 4.0, desc: "Severe coastal storm landfall with severed surface logistics. Emergency trauma antibiotics, wound dressings, and antivenom required." },
              { crisis_class: "VECTOR_OUTBREAK", name: "Vector-Borne Epidemic Surge (Dengue / Malaria)", badge: "Vector Epidemic Shock", badge_color: "cyan", burn: 5.0, desc: "Rapid surge in pediatric admissions. Platelet buffers, paracetamol, and IV fluids facing accelerated depletion." },
              { crisis_class: "COLD_CHAIN_GRID_FAILURE", name: "Cold-Chain Thermal Power Outage", badge: "Thermal Excursion Risk", badge_color: "amber", burn: 3.0, desc: "Primary substation failure during peak heat. Temperature-sensitive vaccines and biologics at imminent excursion risk." },
              { crisis_class: "HEATWAVE_SURGE", name: "Extreme Arid Heatwave Emergency", badge: "Thermal Climate Extreme", badge_color: "orange", burn: 3.5, desc: "Thermal emergency with 45°C+ ambient heat causing mass dehydration and heat exhaustion across peripheral clinics." },
              { crisis_class: "WATERBORNE_EPIDEMIC", name: "Acute Waterborne Diarrheal Cluster", badge: "Waterborne Outbreak", badge_color: "emerald", burn: 4.2, desc: "Drinking water source contamination triggering acute diarrheal surge. High-volume ORS, IV saline, and antibiotic replenishment needed." }
            ];
            const dynamicList = categories.map((cat) => ({
              id: cat.crisis_class,
              crisis_class: cat.crisis_class,
              name: cat.name,
              description: cat.desc,
              badge: cat.badge,
              badge_color: cat.badge_color,
              burn_multiplier: cat.burn
            }));
            setScenarios(dynamicList);
            setSelectedScenarioId(dynamicList[0]?.id);
          }

          if (clkRes.status === 'fulfilled' && clkRes.value) {
            setClockStatus(clkRes.value);
          }
        }
      } catch (err) {
        console.error("Crisis sandbox load error:", err);
      }
    }

    loadData();
    return () => { mounted = false; };
  }, []);

  // Compute available states and filtered facilities
  const uniqueStates = React.useMemo(() => {
    const s = new Set();
    facilities.forEach(f => { if (f.state) s.add(f.state); });
    return Array.from(s).sort();
  }, [facilities]);

  const filteredFacilities = React.useMemo(() => {
    if (selectedState === 'ALL') return facilities;
    return facilities.filter(f => f.state === selectedState);
  }, [facilities, selectedState]);

  // Handle Trigger Simulation
  const handleTriggerSimulation = async (scenarioOverrideId = null) => {
    const targetScenarioId = scenarioOverrideId || selectedScenarioId;
    if (scenarioOverrideId) {
      setSelectedScenarioId(scenarioOverrideId);
    }
    setLoading(true);
    setDispatchSuccess(null);

    const scenarioObj = scenarios.find(s => s.id === targetScenarioId) || {};
    const burnMult = severity === 'CATASTROPHIC' ? 5.5 : severity === 'MODERATE' ? 2.2 : (scenarioObj.burn_multiplier || 3.8);

    let effectiveFacilityId = selectedFacilityId !== 'AUTO' ? selectedFacilityId : null;
    if (!effectiveFacilityId && selectedState !== 'ALL' && filteredFacilities.length > 0) {
      const deficitInState = filteredFacilities.find(f => f.status === 'Critical Deficit') || filteredFacilities[0];
      effectiveFacilityId = deficitInState?.id || null;
    }

    try {
      const res = await runCrisisSimulation({
        crisisType: scenarioObj.crisis_class || targetScenarioId,
        targetFacilityId: effectiveFacilityId,
        severity: severity,
        burnMultiplier: burnMult
      });
      setSimulationResult(res?.data || res);
    } catch (err) {
      console.error("Simulation trigger failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Autonomous Mitigation Dispatch Execution
  const handleExecuteMitigation = async () => {
    if (!simulationResult?.target_facility?.id) return;
    setDispatchLoading(true);
    try {
      const res = await executeDrillMitigation({
        targetFacilityId: simulationResult.target_facility.id,
        medicineId: simulationResult.primary_medicine_id,
        quantity: 30,
        crisisType: simulationResult.crisis_class
      });
      setDispatchSuccess(res?.data || res);
    } catch (err) {
      console.error("Failed to execute mitigation dispatch:", err);
    } finally {
      setDispatchLoading(false);
    }
  };

  // Handle Clock Tick (+1 Virtual Day)
  const handleClockTick = async () => {
    setClockLoading(true);
    try {
      const res = await triggerClockTick();
      if (res) {
        setClockStatus(prev => ({
          ...prev,
          virtual_day: res.virtual_day,
          is_running: res.is_running !== undefined ? res.is_running : prev?.is_running,
          last_tick_timestamp: res.timestamp || new Date().toISOString(),
          tick_interval_seconds: res.tick_interval_seconds || prev?.tick_interval_seconds || 60
        }));
      }
    } catch (err) {
      console.error("Clock tick failed:", err);
    } finally {
      setClockLoading(false);
    }
  };

  // Handle Start / Pause Clock
  const handleToggleClock = async () => {
    setClockLoading(true);
    try {
      let res;
      if (clockStatus?.is_running) {
        res = await stopClock();
      } else {
        res = await startClock(60.0);
      }
      if (res) {
        setClockStatus(res);
      } else {
        const st = await fetchClockStatus();
        if (st) setClockStatus(st);
      }
    } catch (err) {
      console.error("Clock toggle failed:", err);
    } finally {
      setClockLoading(false);
    }
  };

  const currentScenarioObj = scenarios.find(s => s.id === selectedScenarioId) || scenarios[0] || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Simulation Clock & Drill Orchestration Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Clock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-white font-mono uppercase tracking-wider">
                Virtual Simulation Clock
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                clockStatus?.is_running 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {clockStatus?.is_running ? 'Continuous Running (60s = 1 Day)' : 'Manual Step Mode'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Virtual Day: <strong className="text-cyan-300 font-mono">Day {clockStatus?.virtual_day ?? 1}</strong> • Next Central Push in: <span className="font-mono text-slate-300">{clockStatus?.virtual_day ? (7 - ((clockStatus.virtual_day - 1) % 7)) : 7}d</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleClockTick}
            disabled={clockLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
            title="Advance 1 Virtual Day to trigger inventory decay and auto-reallocation"
          >
            <FastForward size={14} className={clockLoading ? "animate-spin text-cyan-400" : "text-cyan-400"} />
            <span>Advance 1 Day (+Tick)</span>
          </button>

          <button
            onClick={handleToggleClock}
            disabled={clockLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              clockStatus?.is_running
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
            }`}
          >
            {clockStatus?.is_running ? <Pause size={14} /> : <Play size={14} />}
            <span>{clockStatus?.is_running ? 'Pause Clock' : 'Start Continuous Clock'}</span>
          </button>
        </div>
      </div>

      {/* Dynamic Drill Configuration Controls */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
              <Zap size={14} className="text-cyan-400" /> Operational Shock & Crisis Parameters
            </span>
          </div>

          <button
            onClick={() => handleTriggerSimulation()}
            disabled={loading}
            className="btn-primary text-xs px-5 py-2 font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50 shrink-0 flex items-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            <span>{loading ? "Simulating Shock..." : "Run Crisis Simulation Drill"}</span>
          </button>
        </div>

        {/* Filters: State, Facility, Severity */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5 font-mono">
              Filter By State
            </label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedFacilityId('AUTO');
              }}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="ALL">All States (National Registry)</option>
              {uniqueStates.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5 font-mono">
              Target Facility Node
            </label>
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="AUTO">⚡ Auto-Select Highest Deficit Facility</option>
              {filteredFacilities.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.district || f.state} - {f.status || 'Active'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5 font-mono">
              Shock Severity Level
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'MODERATE', label: 'Moderate (2.2x)', color: 'text-amber-400 border-amber-500/30' },
                { id: 'HIGH', label: 'High (3.8x)', color: 'text-rose-400 border-rose-500/30' },
                { id: 'CATASTROPHIC', label: 'Catastrophic (5.5x)', color: 'text-purple-400 border-purple-500/30' }
              ].map(sev => (
                <button
                  key={sev.id}
                  type="button"
                  onClick={() => setSeverity(sev.id)}
                  className={`text-[10px] font-bold py-2 rounded-xl border transition-all text-center ${
                    severity === sev.id
                      ? 'bg-slate-800 text-white border-cyan-400 ring-1 ring-cyan-400/30'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {sev.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Scenario Cards Grid */}
        <div className="space-y-2 pt-2">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
            Select Crisis Archetype ({scenarios.length} Available):
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {scenarios.map((sc) => {
              const Icon = SCENARIO_ICONS[sc.crisis_class] || Zap;
              const colorTheme = SCENARIO_COLORS[sc.badge_color] || SCENARIO_COLORS.cyan;
              const isSelected = selectedScenarioId === sc.id;

              return (
                <div
                  key={sc.id}
                  onClick={() => {
                    setSelectedScenarioId(sc.id);
                    handleTriggerSimulation(sc.id);
                  }}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border flex flex-col justify-between ${
                    isSelected
                      ? 'glass-panel-glow border-cyan-400 ring-2 ring-cyan-500/30'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-xl border ${colorTheme.bg} ${colorTheme.text}`}>
                        <Icon size={18} />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorTheme.badge}`}>
                        {sc.badge}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-white text-sm mb-1 font-display">{sc.name}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{sc.description}</p>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-cyan-400 font-semibold flex items-center gap-1">
                      {loading && isSelected ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Simulating...</span>
                        </>
                      ) : (
                        <span>Simulate Archetype</span>
                      )}
                    </span>
                    <ArrowRight size={13} className="text-cyan-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dispatch Confirmation Banner if active mitigation triggered */}
      {dispatchSuccess && (
        <div className="bg-emerald-950/90 border border-emerald-500/60 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-white font-mono">
                  Autonomous Mitigation Corridor #{dispatchSuccess.dispatch_id || 'DISP-LIVE'} Deployed!
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.2 rounded font-bold border border-emerald-500/40">
                  Live In Transit
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                Vehicle: <strong className="text-white">{dispatchSuccess.saved_record?.vehicle_type || 'Aerial Drone Corridor'}</strong> • 
                Origin: <span className="font-mono">{dispatchSuccess.saved_record?.donor_facility_name || 'Regional Surplus Depot'}</span> → 
                Destination: <span className="font-mono">{dispatchSuccess.saved_record?.target_facility_name || simulationResult?.target_facility?.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToMap}
            className="btn-primary text-xs px-4 py-2 font-bold shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Navigation size={14} />
            <span>Track Corridor On Live Map</span>
          </button>
        </div>
      )}

      {/* Simulation Results Briefing */}
      {simulationResult && (
        <div className="glass-panel-glow p-5 sm:p-7 space-y-6 rounded-2xl border border-slate-700/80 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-rose-500/20 text-rose-300 text-xs px-3 py-1 rounded-lg font-bold border border-rose-500/30">
                  Active Simulation Output ({simulationResult.severity} Severity)
                </span>
                <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  Burn Rate Multiplier: {simulationResult.burn_multiplier}x
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                  Engine: {simulationResult.ai_engine}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-2 font-display">
                {simulationResult.scenario}
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              <button
                onClick={handleExecuteMitigation}
                disabled={dispatchLoading}
                className="btn-primary text-xs px-4 py-2 font-bold shadow-lg shadow-indigo-500/25 disabled:opacity-50 flex items-center gap-1.5"
              >
                {dispatchLoading ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                <span>{dispatchLoading ? "Deploying Corridor..." : "Deploy Autonomous Mitigation Corridor"}</span>
              </button>

              <button
                onClick={onNavigateToMap}
                className="btn-secondary text-xs px-3.5 py-2 font-semibold flex items-center gap-1.5"
              >
                <Navigation size={13} />
                <span>View On Map</span>
              </button>
            </div>
          </div>

          {/* Incident Impact Briefing */}
          <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed">
            <strong className="text-cyan-300 font-bold block mb-1">Incident Impact Briefing:</strong>
            {simulationResult.impact_summary}
          </div>

          {/* Primary Affected Node Card */}
          {simulationResult.target_facility && (
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-indigo-500/30 space-y-2">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <MapPin size={14} /> Primary Affected Healthcare Node
              </span>
              <div className="text-base font-extrabold text-white font-display">
                {simulationResult.target_facility.name}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1">
                <span>📍 {simulationResult.target_facility.district}, {simulationResult.target_facility.state}</span>
                {simulationResult.target_facility.bed_capacity && (
                  <span>🛏 {simulationResult.target_facility.bed_capacity} Beds ({simulationResult.target_facility.beds_occupied || 0} Occupied)</span>
                )}
                {simulationResult.target_facility.daily_footfall && (
                  <span>👥 {simulationResult.target_facility.daily_footfall} Daily Patients</span>
                )}
                <span className="font-mono text-cyan-400">GPS: [{simulationResult.target_facility.lat}, {simulationResult.target_facility.lng}]</span>
              </div>
            </div>
          )}

          {/* Critical Shortages & Gemini AI Action Plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-rose-500/30 space-y-3">
              <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <Pill size={14} /> Critical Stockout Commodities Under Stress
              </span>
              <ul className="space-y-2 text-xs text-slate-200">
                {simulationResult.critical_shortage_items?.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0 animate-ping" />
                    <span className="font-semibold">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-2xl border border-emerald-500/30 space-y-3">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <CheckCircle2 size={14} /> Gemini Autonomous Action Plan
              </span>
              <ul className="space-y-2 text-xs text-slate-200">
                {simulationResult.ai_action_plan?.map((action, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Per-Drug Stockout Risk Analysis Table */}
          {simulationResult.detailed_stockout_analysis?.length > 0 && (
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                  <Database size={14} /> Dynamic Drug Depletion & Buffer Burn Analysis
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Calculated using live OpenFDA registry buffer norms
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                      <th className="text-left pb-2 font-semibold">Medicine</th>
                      <th className="text-right pb-2 font-semibold">Current Stock</th>
                      <th className="text-right pb-2 font-semibold">National Buffer Norm</th>
                      <th className="text-right pb-2 font-semibold">Crisis Burn Rate</th>
                      <th className="text-right pb-2 font-semibold">Days to Stockout</th>
                      <th className="text-right pb-2 font-semibold">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {simulationResult.detailed_stockout_analysis.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2.5 text-slate-200 font-sans font-semibold">{item.medicine_name}</td>
                        <td className="py-2.5 text-right text-slate-300">{item.current_stock}</td>
                        <td className="py-2.5 text-right text-slate-400">{item.national_buffer_norm}</td>
                        <td className="py-2.5 text-right text-cyan-300 font-bold">{item.daily_burn_rate} / day</td>
                        <td className="py-2.5 text-right font-bold" style={{
                          color: item.days_to_stockout <= 3 ? '#f87171' : item.days_to_stockout <= 7 ? '#fbbf24' : '#34d399'
                        }}>
                          {item.days_to_stockout}d
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.risk_level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                            item.risk_level === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {item.risk_level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Identified Nearest Donor Node */}
          {simulationResult.nearest_donor_facility && (
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-emerald-500/30 space-y-2">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <Truck size={14} /> Nearest Identified Surplus Donor Node
              </span>
              <div className="text-base font-extrabold text-white font-display">
                {simulationResult.nearest_donor_facility.facility_name}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1">
                <span>📍 {simulationResult.nearest_donor_facility.district}, {simulationResult.nearest_donor_facility.state}</span>
                <span>📦 {simulationResult.nearest_donor_facility.available_stock} Surplus Units</span>
                <span>🛣 {simulationResult.nearest_donor_facility.distance_km} km Distance</span>
                <span>⏱ ETA ~{simulationResult.nearest_donor_facility.estimated_transit_minutes} mins</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
