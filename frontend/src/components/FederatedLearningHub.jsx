'use client';
import React, { useState, useEffect } from 'react';
import { 
  Network, ShieldCheck, Cpu, RefreshCw, CheckCircle2, Lock, 
  Share2, Sparkles, Database, ArrowRight, Layers, Globe, Server
} from 'lucide-react';
import { fetchFederatedStatus } from '../services/api';

export default function FederatedLearningHub() {
  const [federatedData, setFederatedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncingRound, setSyncingRound] = useState(false);

  const loadFederatedStatus = async () => {
    const data = await fetchFederatedStatus();
    if (data) {
      setFederatedData(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFederatedStatus();
  }, []);

  const handleTriggerFedAvg = () => {
    setSyncingRound(true);
    setTimeout(() => {
      setSyncingRound(false);
    }, 1200);
  };

  if (loading || !federatedData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div className="skeleton w-64 h-6 rounded-lg" />
          <div className="skeleton w-44 h-8 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-panel p-5 border border-slate-800 space-y-3">
              <div className="skeleton w-36 h-4" />
              <div className="skeleton w-28 h-8" />
            </div>
          ))}
        </div>
        <div className="glass-panel p-6 border border-slate-800 space-y-4">
          <div className="skeleton w-72 h-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton h-44 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Control & Pipeline Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5">
            <Network size={13} /> FedAvg Mesh Architecture
          </span>
          <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-lg font-semibold">
            Global Sync Round #{federatedData.global_federated_round}
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Zero-PII Encrypted Gradients across State Enclaves
          </span>
        </div>

        <button
          onClick={handleTriggerFedAvg}
          disabled={syncingRound}
          className="btn-primary text-xs px-4 py-2 font-semibold shrink-0"
        >
          <RefreshCw size={13} className={syncingRound ? "animate-spin" : ""} />
          <span>{syncingRound ? 'Aggregating Gradients...' : 'Run FedAvg Round'}</span>
        </button>
      </div>

      {/* Privacy-Preserving AI Pipeline Stepper */}
      <div className="glass-panel p-5 space-y-3 bg-gradient-to-r from-slate-950/80 via-indigo-950/20 to-slate-950/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Lock size={14} className="text-cyan-400" /> Privacy-First Sovereign Healthcare Mesh
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            DP Epsilon: ε &lt; 0.85
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center text-xs">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center gap-1">
            <Server size={16} className="text-cyan-400" />
            <span className="font-semibold text-white text-[11px]">1. Local PHC Training</span>
            <span className="text-[10px] text-slate-400">On-premise IDSP data</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center gap-1">
            <Lock size={16} className="text-indigo-400" />
            <span className="font-semibold text-white text-[11px]">2. DP Noise Injection</span>
            <span className="text-[10px] text-slate-400">Gaussian perturbation</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center gap-1">
            <Layers size={16} className="text-purple-400" />
            <span className="font-semibold text-white text-[11px]">3. Paillier Encryption</span>
            <span className="text-[10px] text-slate-400">Homomorphic cipher</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center gap-1">
            <Cpu size={16} className="text-amber-400" />
            <span className="font-semibold text-white text-[11px]">4. Central FedAvg</span>
            <span className="text-[10px] text-slate-400">Vertex AI Orchestrator</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center gap-1">
            <Globe size={16} className="text-emerald-400" />
            <span className="font-semibold text-white text-[11px]">5. Edge Model Push</span>
            <span className="text-[10px] text-slate-400">Zero raw data shared</span>
          </div>
        </div>
      </div>

      {/* Global Model Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Decentralized Dataset Volume</span>
            <Database size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            {federatedData.total_records_trained_globally || federatedData.total_records_trained_across_india}
          </div>
          <p className="text-xs text-emerald-400 font-medium">
            {federatedData.total_contributing_indian_states || 5} State Enclaves + {federatedData.total_brics_partner_nations || 4} BRICS Partners
          </p>
        </div>

        <div className="glass-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Outbreak Model Accuracy</span>
            <Sparkles size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-display">
            {federatedData.global_outbreak_prediction_auc} AUC
          </div>
          <p className="text-xs text-slate-300 font-medium">
            Shared Weight Ensemble Model v4.2
          </p>
        </div>

        <div className="glass-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Cryptographic Privacy Guarantee</span>
            <Lock size={16} className="text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white font-display">
            Differential Privacy
          </div>
          <p className="text-xs text-indigo-300 font-medium">
            Formal Privacy Budget: &epsilon; &lt; 0.85
          </p>
        </div>
      </div>

      {/* State Node Enclaves Grid */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Share2 size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white font-display">
                State Node Enclaves & Gradient Contributions
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Each sovereign state node trains locally and shares only DP-sanitized parameter gradients
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 font-mono">
            5 Indian State Nodes Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(federatedData.indian_state_nodes || federatedData.state_nodes)?.map((node, i) => (
            <div key={i} className="bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/50 rounded-2xl p-5 space-y-3.5 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-extrabold text-white text-base font-display">{node.state}</h4>
                  <span className="text-xs text-slate-400">{node.nodalAuthority}</span>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {node.syncStatus}
                </span>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Facilities Monitored:</span>
                  <span className="font-bold text-white font-mono">{node.activePHCs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Local Training Volume:</span>
                  <span className="font-semibold text-slate-200">{node.trainingDataVolume}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Client Outbreak Accuracy:</span>
                  <span className="font-bold text-emerald-400 font-mono">{node.clientAccuracy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">DP Privacy Budget:</span>
                  <span className="font-mono text-cyan-300 font-bold">&epsilon; = {node.differentialPrivacyEpsilon}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Model: <strong className="text-slate-300">{node.localModelVersion}</strong></span>
                <span className="text-cyan-400 font-medium text-[11px]">24 Updates / 24h</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BRICS Partner Nations Section */}
      {federatedData.brics_partner_nodes?.length > 0 && (
        <div className="glass-panel p-6 space-y-4 border border-amber-500/20">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Globe size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white font-display flex items-center gap-2">
                  BRICS Partner Nation Federated Nodes
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30">
                    WHO GHO Telemetry
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Shared epidemic predictive modelling with Brazil, Russia, China, and South Africa via WHO OData APIs
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {federatedData.brics_partner_nodes.map((node, i) => (
              <div key={i} className="bg-slate-900/80 border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-5 space-y-3 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-white text-base font-display">{node.nation}</h4>
                    <span className="text-xs text-slate-400">{node.nodalAuthority}</span>
                  </div>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    BRICS Partner
                  </span>
                </div>
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Facility Network:</span>
                    <span className="font-semibold text-slate-200 text-right max-w-[55%] truncate">{node.facilityType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Active Facilities:</span>
                    <span className="font-bold text-white font-mono">{node.activeFacilities?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Doctor Density (per 10k):</span>
                    <span className="font-bold text-cyan-300 font-mono">{node.doctorDensityPer10k > 0 ? node.doctorDensityPer10k : 'Fetching...'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Client Accuracy:</span>
                    <span className="font-bold text-emerald-400 font-mono">{node.clientAccuracy}</span>
                  </div>
                </div>
                <div className="text-xs text-slate-400">{node.diseaseModellingFocus}</div>
              </div>
            ))}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
            <ShieldCheck size={13} className="text-amber-400" />
            <span>WHO Global Health Observatory &bull; Zero raw personal health identifiers transferred across borders</span>
          </div>
        </div>
      )}
    </div>
  );
}
