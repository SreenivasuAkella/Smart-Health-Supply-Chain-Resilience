'use client';
import React, { useState } from 'react';
import { Zap, AlertTriangle, ShieldCheck, RefreshCw, CheckCircle2, CloudRain, Flame, Radio, ArrowRight } from 'lucide-react';
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
    setSimulationResult(res);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-rose-500/20 text-rose-300 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
            <Zap size={13} /> Multi-Agent Crisis Sandbox
          </span>
        </div>
        <h2 className="text-xl font-bold text-white">
          Autonomous Supply Chain Resilience & Stress-Testing Sandbox
        </h2>
        <p className="text-xs text-slate-400 max-w-3xl mt-0.5">
          Simulate sudden epidemiological outbreaks, monsoon floods, and grid disruptions to test Sanjeevani AI's autonomous rerouting, stock buffering, and drone dispatch algorithms.
        </p>
      </div>

      {/* Scenario Pickers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isSelected = activeScenario === sc.id;
          return (
            <div 
              key={sc.id}
              onClick={() => handleTrigger(sc.id)}
              className={`p-5 rounded-2xl cursor-pointer transition-all ${
                isSelected 
                  ? 'glass-panel-glow border-cyan-400' 
                  : 'glass-panel hover:border-slate-700 hover:scale-[1.01]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 ${sc.color}`}>
                  <Icon size={20} />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                  {sc.badge}
                </span>
              </div>

              <h4 className="font-bold text-white text-sm mb-1">{sc.name}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{sc.description}</p>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-cyan-400 font-semibold">
                  {loading && isSelected ? 'Simulating...' : 'Click to Simulate Shock'}
                </span>
                <ArrowRight size={14} className="text-cyan-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulation Results View */}
      {simulationResult && (
        <div className="glass-panel-glow p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <div>
              <span className="bg-cyan-500/20 text-cyan-300 text-xs px-2.5 py-0.5 rounded font-semibold">
                Autonomous AI Mitigation Active
              </span>
              <h3 className="text-lg font-bold text-white mt-1">{simulationResult.scenario}</h3>
            </div>
            <button
              onClick={onNavigateToMap}
              className="btn-primary text-xs px-3 py-1.5"
            >
              <span>View Live Map Reroute</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <p className="text-xs text-slate-300 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
            <strong>Impact Assessment:</strong> {simulationResult.impact_summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-rose-400 block">Critical Shortage Commodities Flagged:</span>
              <ul className="space-y-1 text-xs text-slate-200">
                {simulationResult.critical_shortage_items?.map((item, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-emerald-400 block">Sanjeevani AI Autonomous Interventions:</span>
              <ul className="space-y-1 text-xs text-slate-200">
                {simulationResult.ai_action_plan?.map((action, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
