'use client';
import React, { useState, useEffect } from 'react';
import { Network, ShieldCheck, Cpu, RefreshCw, CheckCircle2, Lock, Share2, Sparkles, Database } from 'lucide-react';

export default function FederatedLearningHub() {
  const [federatedData, setFederatedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncingRound, setSyncingRound] = useState(false);

  const loadFederatedStatus = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/federated/status");
      if (res.ok) {
        const data = await res.json();
        setFederatedData(data);
      }
    } catch (e) {
      console.warn("Federated fetch error:", e);
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
      <div className="glass-panel p-12 text-center text-slate-400">
        <RefreshCw className="animate-spin text-cyan-400 mx-auto mb-3" size={28} />
        <span>Connecting to National Federated Model Coordinator...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <Network size={13} /> Multi-State Federated AI (FedAvg + DP)
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1 rounded-full font-semibold">
              Global Round: #{federatedData.global_federated_round}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Federated Health Resource & Shared Predictive Modelling Hub
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
            Enables cross-state outbreak intelligence sharing between Uttar Pradesh, Bihar, Assam, Maharashtra, and Kerala without exposing raw patient PII or clinic confidential data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerFedAvg}
            disabled={syncingRound}
            className="btn-primary text-xs px-4 py-2"
          >
            <RefreshCw size={14} className={syncingRound ? "animate-spin" : ""} />
            <span>{syncingRound ? 'Aggregating Model Gradients...' : 'Trigger Federated Aggregation'}</span>
          </button>
        </div>
      </div>

      {/* Global Model Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Decentralized Dataset Volume</span>
            <Database size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {federatedData.total_records_trained_across_india}
          </div>
          <span className="text-xs text-emerald-400 font-medium">5 Contributing State Enclaves</span>
        </div>

        <div className="glass-panel p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Global Model Outbreak Accuracy</span>
            <Sparkles size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {federatedData.global_outbreak_prediction_auc} AUC
          </div>
          <span className="text-xs text-slate-300 font-medium">Shared Weight Ensemble v4.2</span>
        </div>

        <div className="glass-panel p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Privacy-Preserving Guarantee</span>
            <Lock size={16} className="text-indigo-400" />
          </div>
          <div className="text-base font-bold text-white">
            Differential Privacy (DP)
          </div>
          <span className="text-xs text-indigo-300 font-medium">ε &lt; 0.85 Privacy Budget</span>
        </div>
      </div>

      {/* State Node Grid */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Share2 size={18} className="text-cyan-400" />
          Active State Node Enclaves & Model Gradient Contributions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {federatedData.state_nodes?.map((node, i) => (
            <div key={i} className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 rounded-xl p-4 space-y-3 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">{node.state}</h4>
                  <span className="text-xs text-slate-400">{node.nodalAuthority}</span>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                  {node.syncStatus}
                </span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Active PHCs Monitored:</span>
                  <span className="font-bold text-white">{node.activePHCs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Local Training Volume:</span>
                  <span className="font-semibold text-slate-200">{node.trainingDataVolume}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Local Client Accuracy:</span>
                  <span className="font-bold text-emerald-400">{node.clientAccuracy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">DP Epsilon (Privacy):</span>
                  <span className="font-mono text-cyan-300">ε = {node.differentialPrivacyEpsilon}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Model: {node.localModelVersion}</span>
                <span className="text-cyan-400 font-medium">24 Updates Uploaded / 24h</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
