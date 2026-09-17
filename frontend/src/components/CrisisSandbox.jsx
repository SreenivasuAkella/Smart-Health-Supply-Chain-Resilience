'use client';
import React, { useState } from 'react';
import { Zap, AlertTriangle, CheckCircle2, CloudRain, Flame, ArrowRight, MapPin, Pill, Truck, Database } from 'lucide-react';
import { triggerCrisisScenario } from '../services/api';

export default function CrisisSandbox({ onNavigateToMap }) {
  const [activeScenario, setActiveScenario] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const scenarios = [
    {
      id: "DENGUE_OUTBREAK_UP",
      name: "Monsoon Dengue Epidemic Surge (Eastern UP)",
      icon: CloudRain,
      color: "text-cyan-400",
      description: "450% surge in pediatric admissions across Varanasi/Chandauli. IV fluid & ORS stocks facing rapid depletion.",
      badge: "High Morbidity"
    },
    {
      id: "BRAHMAPUTRA_FLOOD_ASSAM",
      name: "Brahmaputra Flood & Submerged Access (Morigaon, Assam)",
      icon: AlertTriangle,
      color: "text-rose-400",
      description: "Road access to riverine PHCs cut off. Critical snakebite & malaria antidote emergency requiring drone rebalancing.",
      badge: "Severe Climate Shock"
    },
    {
      id: "POWER_GRID_FAILURE_PATNA",
      name: "Cold-Chain Central Depot Power Failure (Patna)",
      icon: Flame,
      color: "text-amber-400",
      description: "Urban power grid breakdown with ambient temperatures reaching 43°C. Walk-in cold room backup activated.",
      badge: "Infrastructure Breakdown"
    }
  ];

  const handleTrigger = async (scenarioId) => {
    setActiveScenario(scenarioId);
    setLoading(true);
    setSimulationResult(null);
    const res = await triggerCrisisScenario(scenarioId);
    setSimulationResult(res?.data || res);
    setLoading(false);
  };

  const result = simulationResult;

  return (
    <div className="space-y-6">
      {/* Compact Scenario Drill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5">
            <Zap size={13} /> Multi-Agent Stress-Test Sandbox
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Select a crisis scenario to trigger autonomous rerouting, stock buffering, and drone dispatch
          </span>
        </div>
        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
          3 Scenarios Available
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isSelected = activeScenario === sc.id;
          return (
            <div key={sc.id} onClick={() => handleTrigger(sc.id)}
              className={`p-5 rounded-2xl cursor-pointer transition-all ${isSelected ? 'glass-panel-glow border-cyan-400' : 'glass-panel hover:border-slate-700 hover:scale-[1.01]'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 ${sc.color}`}><Icon size={20} /></div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded">{sc.badge}</span>
              </div>
              <h4 className="font-bold text-white text-sm mb-1">{sc.name}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{sc.description}</p>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-cyan-400 font-semibold">{loading && isSelected ? 'Simulating...' : 'Click to Simulate Shock'}</span>
                <ArrowRight size={14} className="text-cyan-400" />
              </div>
            </div>
          );
        })}
      </div>

      {result && (
        <div className="glass-panel-glow p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <div>
              <span className="bg-cyan-500/20 text-cyan-300 text-xs px-2.5 py-0.5 rounded font-semibold">Autonomous AI Mitigation Active</span>
              <h3 className="text-lg font-bold text-white mt-1">{result.scenario}</h3>
            </div>
            <button onClick={onNavigateToMap} className="btn-primary text-xs px-3 py-1.5">
              <span>View Live Map Reroute</span><ArrowRight size={14} />
            </button>
          </div>

          <p className="text-xs text-slate-300 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
            <strong>Impact Assessment:</strong> {result.impact_summary}
          </p>

          {result.target_facility && (
            <div className="bg-slate-900/80 p-4 rounded-xl border border-indigo-500/20 space-y-2">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5"><MapPin size={12} /> Affected Facility</span>
              <div className="text-sm font-semibold text-white">{result.target_facility.name}</div>
              <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 mt-1">
                <span>📍 {result.target_facility.district}, {result.target_facility.state}</span>
                {result.target_facility.bed_capacity && <span>🛏 {result.target_facility.bed_capacity} beds ({result.target_facility.beds_occupied} occupied)</span>}
                {result.target_facility.daily_footfall && <span>👥 {result.target_facility.daily_footfall} patients/day</span>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5"><Pill size={12} /> Critical Shortage Commodities:</span>
              <ul className="space-y-1 text-xs text-slate-200">
                {result.critical_shortage_items?.map((item, i) => (
                  <li key={i} className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" /><span>{item}</span></li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={12} /> Sanjeevani AI Autonomous Interventions:</span>
              <ul className="space-y-1 text-xs text-slate-200">
                {result.ai_action_plan?.map((action, i) => (
                  <li key={i} className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400 shrink-0" /><span>{action}</span></li>
                ))}
              </ul>
            </div>
          </div>

          {result.detailed_stockout_analysis?.length > 0 && (
            <div className="bg-slate-900/80 p-4 rounded-xl border border-amber-500/20 space-y-3">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5"><Database size={12} /> Per-Drug Stockout Risk Analysis (Live OpenFDA Inventory)</span>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="text-left pb-2 font-semibold">Medicine</th>
                      <th className="text-right pb-2 font-semibold">Stock</th>
                      <th className="text-right pb-2 font-semibold">Days Left</th>
                      <th className="text-right pb-2 font-semibold">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.detailed_stockout_analysis.map((item, i) => (
                      <tr key={i} className="border-b border-slate-800/50">
                        <td className="py-1.5 text-slate-200">{item.medicine_name}</td>
                        <td className="py-1.5 text-right text-slate-300">{item.current_stock}</td>
                        <td className="py-1.5 text-right font-bold" style={{color: item.days_to_stockout <= 3 ? '#f87171' : item.days_to_stockout <= 7 ? '#fbbf24' : '#34d399'}}>{item.days_to_stockout}d</td>
                        <td className="py-1.5 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.risk_level === 'CRITICAL' ? 'bg-red-500/20 text-red-300' : item.risk_level === 'HIGH' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>{item.risk_level}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.nearest_donor_facility && (
            <div className="bg-slate-900/80 p-4 rounded-xl border border-emerald-500/20 space-y-2">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5"><Truck size={12} /> Nearest Donor Facility Identified</span>
              <div className="text-sm font-semibold text-white">{result.nearest_donor_facility.facility_name}</div>
              <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
                <span>📍 {result.nearest_donor_facility.district}, {result.nearest_donor_facility.state}</span>
                <span>📦 {result.nearest_donor_facility.available_stock} units available</span>
                <span>🛣 {result.nearest_donor_facility.distance_km} km away</span>
                <span>⏱ ETA ~{result.nearest_donor_facility.estimated_transit_minutes} mins</span>
              </div>
            </div>
          )}

          {result.data_sources?.length > 0 && (
            <div className="text-[10px] text-slate-600 flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-slate-800">
              <span className="text-slate-500 font-semibold">Data:</span>
              {result.data_sources.map((src, i) => <span key={i}>{src}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
