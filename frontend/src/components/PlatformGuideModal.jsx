'use client';
import React, { useState } from 'react';
import { 
  X, Sparkles, Activity, MapPin, ThermometerSnowflake, ShieldAlert, 
  Languages, Network, Zap, Eye, CheckCircle2, ArrowRight, HelpCircle, 
  BookOpen, Compass, ShieldCheck, Cpu, Database, AlertTriangle, Layers
} from 'lucide-react';

export default function PlatformGuideModal({ isOpen, onClose, onNavigate }) {
  const [activeGuideTab, setActiveGuideTab] = useState('workflow'); // 'workflow' | 'modules' | 'glossary'

  if (!isOpen) return null;

  const workflowSteps = [
    {
      step: "01",
      title: "Telemetric Sentinel (Detect)",
      subtitle: "Instant Stockout & Bed Surge Alerting",
      badge: "Real-Time Telemetry",
      badgeColor: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      icon: Activity,
      iconColor: "text-rose-400",
      description: "Continuously monitors 1,188 Primary Health Centres (PHCs) and Community Health Centres (CHCs). When inventory drops below a 14-day threshold or bed occupancy exceeds 85%, an emergency triage event is automatically raised.",
      targetTab: "overview",
      actionText: "View Command Center"
    },
    {
      step: "02",
      title: "Multi-Hazard Intelligence (Forecast)",
      subtitle: "IMD Weather + IDSP Disease Correlation",
      badge: "BigQuery & Vertex AI",
      badgeColor: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
      icon: ShieldAlert,
      iconColor: "text-indigo-400",
      description: "Correlates seasonal monsoon precipitation data from IMD with historical disease morbidity. Vertex AI predicts a 3.4x spike in Snakebite and Leptospirosis up to 30 days ahead, triggering proactive stockpiling before roads flood.",
      targetTab: "forecasting",
      actionText: "Inspect Forecasts"
    },
    {
      step: "03",
      title: "Autonomous Geospatial Rebalancer (Rebalance)",
      subtitle: "Inundation-Aware Emergency Dispatch",
      badge: "GIS & Multi-Criteria Optimization",
      badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      icon: MapPin,
      iconColor: "text-cyan-400",
      description: "Finds the optimal donor hospital with surplus inventory. Evaluates active road inundations and bridge washouts, routing electric supply vans or autonomous medical drones along unflooded corridors.",
      targetTab: "map",
      actionText: "Open GIS Rebalancer"
    },
    {
      step: "04",
      title: "Field Diagnostics & Integrity (Protect)",
      subtitle: "IoT Cold-Chain & Frontline Multimodal AI",
      badge: "Firebase RTDB & Gemini 2.0",
      badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      icon: ThermometerSnowflake,
      iconColor: "text-emerald-400",
      description: "IoT sensors compute Mean Kinetic Temperature (MKT) to protect heat-sensitive antivenoms and vaccines. Frontline ASHA workers use Gemini Vision to inspect damaged packaging and the 8-language Voice Copilot to place orders.",
      targetTab: "coldchain",
      actionText: "Check Cold-Chain Twin"
    }
  ];

  const modulesList = [
    {
      id: "overview",
      name: "National Command Center",
      badge: "Core Hub",
      icon: Activity,
      color: "text-cyan-400",
      summary: "Executive resilience dashboard aggregating hospital bed occupancy, doctor rosters, critical stockout triage feed, and immediate priority actions across India."
    },
    {
      id: "map",
      name: "Geospatial Rebalancer",
      badge: "GIS & Routing",
      icon: MapPin,
      color: "text-indigo-400",
      summary: "Interactive Leaflet map showing 1,188 facilities, flood inundation zones, drone flight corridors, and real-time vehicle dispatch tracking."
    },
    {
      id: "inventory",
      name: "e-Aushadhi National Ledger",
      badge: "Supply Ledger",
      icon: Layers,
      color: "text-blue-400",
      summary: "Unified national pharmaceutical ledger tracking critical medicines, burn rates, lot numbers, batch expiries, and reorder thresholds."
    },
    {
      id: "forecasting",
      name: "Epidemic Outbreak Forecasting",
      badge: "Vertex AI",
      icon: ShieldAlert,
      color: "text-rose-400",
      summary: "Predictive machine learning models correlating weather extremes with epidemiological surge risks 14 to 30 days in advance."
    },
    {
      id: "coldchain",
      name: "Cold-Chain IoT Digital Twin",
      badge: "Firebase RTDB",
      icon: ThermometerSnowflake,
      color: "text-emerald-400",
      summary: "Real-time thermal telemetry for solar Ice-Lined Refrigerators (ILRs), Mean Kinetic Temperature monitoring, and power outage safety buffers."
    },
    {
      id: "federated",
      name: "Federated Sovereign AI Mesh",
      badge: "Differential Privacy",
      icon: Network,
      color: "text-purple-400",
      summary: "Decentralized cross-state & BRICS collaborative machine learning (DP-FedAvg) preserving patient privacy while training national predictive models."
    },
    {
      id: "simulation",
      name: "Crisis Sandbox Drills",
      badge: "Stress Testing",
      icon: Zap,
      color: "text-amber-400",
      summary: "Simulate category-4 cyclones, severe monsoon road cutoffs, and sudden demand shocks to test supply chain resilience before real crises hit."
    },
    {
      id: "vision",
      name: "Gemini Vision Scanner",
      badge: "Multimodal AI",
      icon: Eye,
      color: "text-cyan-400",
      summary: "Instant camera OCR scanning of medicine blister packs and vials to detect expiry dates, illegible lot numbers, and packaging breaches."
    },
    {
      id: "voice",
      name: "ASHA Voice Copilot",
      badge: "8 Indian Languages",
      icon: Languages,
      color: "text-indigo-400",
      summary: "Hands-free conversational assistant in Hindi, Telugu, Tamil, Marathi, Bengali, Kannada, Malayalam, and English for rural healthcare workers."
    }
  ];

  const glossaryItems = [
    {
      term: "MKT (Mean Kinetic Temperature)",
      definition: "A single calculated temperature that represents the overall thermal degradation effect on medicines over time. An excursion above 8.0°C accelerates drug potency loss."
    },
    {
      term: "PHC / CHC / DH",
      definition: "Primary Health Centre (village level, 20-30 beds), Community Health Centre (block level), and District Hospital (apex facility with major medicine reserves and ICU beds)."
    },
    {
      term: "DP-FedAvg (Differential Privacy Federated Averaging)",
      definition: "An algorithm that allows state healthcare servers and BRICS nodes to jointly train outbreak models without ever sharing sensitive patient records (ε < 0.85 guarantee)."
    },
    {
      term: "Inundation-Aware Routing",
      definition: "Dynamic GIS routing that checks real-time road flooding alerts (IMD / ISRO Bhuvan) to steer emergency delivery vehicles and drones around washed-out bridges."
    },
    {
      term: "e-Aushadhi",
      definition: "The Government of India's web-based supply chain management application for public health facilities, synchronized into Sanjeevani's real-time resilience grid."
    }
  ];

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div 
        className="glass-panel-glow w-full max-w-4xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 relative border border-cyan-500/40 shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
              <Compass size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight font-display">
                  Sanjeevani AI — Platform Architecture & Guide
                </h2>
                <span className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  v2.4
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Self-explanatory guide to India's Autonomous Health Supply Chain Resilience Mesh
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            aria-label="Close Guide"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs inside Guide */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
          <button
            onClick={() => setActiveGuideTab('workflow')}
            className={`flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all ${
              activeGuideTab === 'workflow'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
            }`}
          >
            <Zap size={14} className="text-cyan-400" />
            <span>4-Step Crisis Pipeline</span>
          </button>
          <button
            onClick={() => setActiveGuideTab('modules')}
            className={`flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all ${
              activeGuideTab === 'modules'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
            }`}
          >
            <BookOpen size={14} className="text-indigo-400" />
            <span>Core Modules Directory</span>
          </button>
          <button
            onClick={() => setActiveGuideTab('glossary')}
            className={`flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all ${
              activeGuideTab === 'glossary'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
            }`}
          >
            <HelpCircle size={14} className="text-amber-400" />
            <span>Concepts & Glossary</span>
          </button>
        </div>

        {/* Tab 1: 4-Step Crisis Workflow */}
        {activeGuideTab === 'workflow' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 leading-relaxed">
              <strong className="text-white font-semibold">How Sanjeevani AI Works: </strong>
              During severe monsoons or disease outbreaks, rural clinics run out of life-saving medicines (like Anti-Snake Venom). Sanjeevani automates the entire detection, forecasting, routing, and protection workflow in real-time.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {workflowSteps.map((ws) => {
                const Icon = ws.icon;
                return (
                  <div 
                    key={ws.step}
                    className="glass-panel-interactive p-4 sm:p-5 rounded-2xl border border-slate-800/90 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-extrabold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                          STEP {ws.step}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${ws.badgeColor}`}>
                          {ws.badge}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 mt-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0">
                          <Icon size={16} className={ws.iconColor} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white">{ws.title}</h3>
                          <p className="text-[11px] text-slate-400">{ws.subtitle}</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                        {ws.description}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        if (onNavigate) onNavigate(ws.targetTab);
                      }}
                      className="btn-secondary text-xs w-full justify-center py-2 mt-2"
                    >
                      <span>{ws.actionText}</span>
                      <ArrowRight size={13} className="text-cyan-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Core Modules Directory */}
        {activeGuideTab === 'modules' && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs text-slate-400">
              Select any module below to immediately jump to its dedicated dashboard:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {modulesList.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      onClose();
                      if (onNavigate) onNavigate(m.id);
                    }}
                    className="glass-panel-interactive p-4 rounded-xl text-left border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Icon size={18} className={m.color} />
                        <span className="text-[9px] font-mono font-medium px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                          {m.badge}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-cyan-300 transition-colors">
                        {m.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        {m.summary}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-cyan-400 font-semibold">
                      <span>Launch module</span>
                      <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Concepts & Glossary */}
        {activeGuideTab === 'glossary' && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs text-slate-400">
              Clear definitions of medical supply chain, IoT, and AI terminology used across the platform:
            </p>
            <div className="space-y-2.5">
              {glossaryItems.map((item, idx) => (
                <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                  <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>{item.term}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pl-5">
                    {item.definition}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Self-Guiding Operational Health OS</span>
          </span>
          <button
            onClick={onClose}
            className="btn-primary text-xs px-4 py-1.5 font-bold"
          >
            Got It, Proceed to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
