'use client';
import React, { useState } from 'react';
import { 
  Zap, AlertTriangle, CheckCircle2, CloudRain, Flame, ArrowRight, 
  MapPin, Pill, Truck, Database, ShieldAlert, Activity, Navigation, Loader2
} from 'lucide-react';
import { triggerCrisisScenario } from '../services/api';

export default function CrisisSandbox({ onNavigateToMap }) {
  const [activeScenario, setActiveScenario] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const scenarios = [
    {
      id: "DENGUE_OUTBREAK_UP",
      name: "Monsoon Dengue Surge (Eastern UP)",
      icon: CloudRain,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/15 border-cyan-500/30",
      description: "450% surge in pediatric admissions across Varanasi & Chandauli. IV fluids and ORS facing rapid depletion.",
      badge: "Vector Epidemic Shock",
      badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
    },
    {
      id: "BRAHMAPUTRA_FLOOD_ASSAM",
      name: "Brahmaputra Flood & Cutoff (Morigaon, Assam)",
      icon: AlertTriangle,
      color: "text-rose-400",
      bgColor: "bg-rose-500/15 border-rose-500/30",
      description: "Road access to riverine PHCs cut off by floodwaters. Critical snakebite & antivenom emergency requiring drone dispatch.",
      badge: "Severe Climate Disaster",
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40"
    },
    {
      id: "POWER_GRID_FAILURE_PATNA",
      name: "Cold-Chain Central Grid Failure (Patna)",
      icon: Flame,
      color: "text-amber-400",
      bgColor: "bg-amber-500/15 border-amber-500/30",
      description: "Urban power grid breakdown with ambient temperatures reaching 43°C. Solar SDD backup auto-engaged.",
      badge: "Infrastructure Breakdown",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40"
    }
  ];

  const handleTrigger = async (scenarioId) => {
    setActiveScenario(scenarioId);
    setLoading(true);
    setSimulationResult(null);
    try {
      const res = await triggerCrisisScenario(scenarioId);
      setSimulationResult(res?.data || res);
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const result = simulationResult;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Compact Scenario Drill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5">
            <Zap size={13} /> Multi-Agent Stress-Test Sandbox
          </span>
          <span className="text-xs text-slate-400">
            Select a crisis scenario to test autonomous dynamic rerouting, stock buffering, and drone dispatch
          </span>
        </div>
        <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
          3 Scenarios Available
        </span>
      </div>

      {/* Scenario Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isSelected = activeScenario === sc.id;
          return (
            <div 
              key={sc.id} 
              onClick={() => handleTrigger(sc.id)}
              className={`p-6 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                isSelected 
                  ? 'glass-panel-glow border-cyan-400 ring-2 ring-cyan-500/30' 
                  : 'glass-panel hover:border-slate-700 hover:scale-[1.01]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl border ${sc.bgColor} ${sc.color}`}>
                    <Icon size={22} />
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${sc.badgeColor}`}>
                    {sc.badge}
                  </span>
                </div>
                <h4 className="font-extrabold text-white text-base mb-1.5 font-display">{sc.name}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{sc.description}</p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-cyan-400 font-semibold flex items-center gap-1">
                  {loading && isSelected ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Simulating Shock Response...</span>
                    </>
                  ) : (
                    <span>Click to Simulate Shock</span>
                  )}
                </span>
                <ArrowRight size={14} className="text-cyan-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulation Result Briefing */}
      {result && (
        <div className="glass-panel-glow p-6 sm:p-7 space-y-6 rounded-2xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
            <div>
              <span className="bg-cyan-500/20 text-cyan-300 text-xs px-3 py-1 rounded-lg font-bold border border-cyan-500/30">
                Autonomous AI Mitigation Active
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-2 font-display">
                {result.scenario}
              </h3>
            </div>
            <button onClick={onNavigateToMap} className="btn-primary text-xs px-4 py-2 self-start sm:self-auto font-semibold">
              <span>View On Live Map</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 text-xs text-slate-200 leading-relaxed">
            <strong className="text-cyan-300 font-bold block mb-1">Incident Impact Briefing:</strong>
            {result.impact_summary}
          </div>

          {result.target_facility && (
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-indigo-500/30 space-y-2">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                <MapPin size={14} /> Primary Affected Node
              </span>
              <div className="text-base font-extrabold text-white font-display">
                {result.target_facility.name}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1">
                <span>📍 {result.target_facility.district}, {result.target_facility.state}</span>
                {result.target_facility.bed_capacity && (
                  <span>🛏 {result.target_facility.bed_capacity} Beds ({result.target_facility.beds_occupied} Occupied)</span>
                )}
                {result.target_facility.daily_footfall && (
                  <span>👥 {result.target_facility.daily_footfall} Patients / Day</span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-rose-500/30 space-y-3">
              <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Pill size={14} /> Critical Stockout Commodities
              </span>
              <ul className="space-y-2 text-xs text-slate-200">
                {result.critical_shortage_items?.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0 animate-ping" />
                    <span className="font-semibold">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-2xl border border-emerald-500/30 space-y-3">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
                <CheckCircle2 size={14} /> Autonomous AI Interventions
              </span>
              <ul className="space-y-2 text-xs text-slate-200">
                {result.ai_action_plan?.map((action, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {result.detailed_stockout_analysis?.length > 0 && (
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-amber-500/30 space-y-3">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Database size={14} /> Per-Drug Stockout Risk Analysis (OpenFDA Inventory)
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                      <th className="text-left pb-2 font-semibold">Medicine</th>
                      <th className="text-right pb-2 font-semibold">Current Stock</th>
                      <th className="text-right pb-2 font-semibold">Supply Left</th>
                      <th className="text-right pb-2 font-semibold">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {result.detailed_stockout_analysis.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2.5 text-slate-200 font-semibold">{item.medicine_name}</td>
                        <td className="py-2.5 text-right text-slate-300 font-mono">{item.current_stock}</td>
                        <td className="py-2.5 text-right font-mono font-bold" style={{
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

          {result.nearest_donor_facility && (
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-emerald-500/30 space-y-2">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Truck size={14} /> Nearest Identified Surplus Donor Node
              </span>
              <div className="text-base font-extrabold text-white font-display">
                {result.nearest_donor_facility.facility_name}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1">
                <span>📍 {result.nearest_donor_facility.district}, {result.nearest_donor_facility.state}</span>
                <span>📦 {result.nearest_donor_facility.available_stock} Units Available</span>
                <span>🛣 {result.nearest_donor_facility.distance_km} km Road Distance</span>
                <span>⏱ ETA ~{result.nearest_donor_facility.estimated_transit_minutes} mins</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
