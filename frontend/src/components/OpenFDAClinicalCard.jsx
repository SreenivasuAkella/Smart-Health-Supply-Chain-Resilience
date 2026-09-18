'use client';
import React, { useState } from 'react';
import { 
  ShieldAlert, ThermometerSnowflake, Activity, AlertTriangle, 
  ExternalLink, ChevronDown, ChevronUp, Sparkles, CheckCircle2, 
  HeartPulse, Pill, Info
} from 'lucide-react';

export default function OpenFDAClinicalCard({ insights, compact = false }) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  if (!insights) return null;

  const {
    fda_drug_name,
    pharmacologic_class,
    clinical_indications_summary,
    storage_and_cold_chain_protocol,
    is_cold_chain_strictly_required,
    temperature_envelope,
    critical_clinical_warnings = [],
    major_drug_interactions = [],
    adverse_reactions_summary,
    asha_frontline_counseling_points = [],
    openfda_source_url,
    ai_analyzer_engine,
    verified_at
  } = insights;

  const isColdChain = is_cold_chain_strictly_required || temperature_envelope?.includes('COLD_CHAIN');

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border border-cyan-500/40 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xl transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-sm shrink-0">
            <Activity size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                {fda_drug_name || "FDA Drug Safety Monograph"}
              </span>
              <span className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={10} /> OpenFDA + Gemini
              </span>
            </div>
            {pharmacologic_class && (
              <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                Class: <strong className="text-indigo-300 font-semibold">{pharmacologic_class}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Cold-Chain / Storage Status Badge */}
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
            isColdChain 
              ? 'bg-blue-500/15 text-blue-300 border-blue-500/40' 
              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
          }`}>
            <ThermometerSnowflake size={12} className={isColdChain ? "text-cyan-300 animate-pulse" : "text-emerald-400"} />
            <span>{isColdChain ? '2°C – 8°C Cold Chain' : 'Room Temp (15-30°C)'}</span>
          </span>

          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-cyan-300 transition-colors rounded-lg bg-slate-900 border border-slate-800"
            title={isExpanded ? "Collapse Details" : "Expand Details"}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Clinical Indications Summary */}
      {clinical_indications_summary && (
        <div className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60 flex items-start gap-2">
          <Info size={14} className="text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block mb-0.5">
              FDA Approved Clinical Indications
            </span>
            <p className="text-[11px] text-slate-300">{clinical_indications_summary}</p>
          </div>
        </div>
      )}

      {/* Expandable Deep Clinical Insights */}
      {isExpanded && (
        <div className="space-y-3 pt-1 animate-fade-in text-xs">
          {/* Storage Protocol Details */}
          {storage_and_cold_chain_protocol && (
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                <ThermometerSnowflake size={12} /> Storage & Integrity Protocol
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {storage_and_cold_chain_protocol}
              </p>
            </div>
          )}

          {/* Critical Warnings */}
          {critical_clinical_warnings && critical_clinical_warnings.length > 0 && (
            <div className="bg-rose-950/20 p-2.5 rounded-xl border border-rose-500/30 space-y-1.5">
              <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={12} /> Critical Safety Warnings & Precautions
              </span>
              <ul className="space-y-1 text-[11px] text-rose-200/90 list-disc list-inside">
                {critical_clinical_warnings.map((warn, wIdx) => (
                  <li key={wIdx} className="leading-relaxed">{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Frontline ASHA Patient Counseling Checklist */}
          {asha_frontline_counseling_points && asha_frontline_counseling_points.length > 0 && (
            <div className="bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/30 space-y-1.5">
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={12} /> Frontline ASHA Patient Counseling Points
              </span>
              <ul className="space-y-1 text-[11px] text-slate-200">
                {asha_frontline_counseling_points.map((pt, pIdx) => (
                  <li key={pIdx} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Major Drug Interactions */}
          {major_drug_interactions && major_drug_interactions.length > 0 && (
            <div className="space-y-1 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Significant Drug-Drug Interactions
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {major_drug_interactions.map((drug, dIdx) => (
                  <span key={dIdx} className="bg-amber-500/10 text-amber-200 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-md font-medium">
                    {drug}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer with OpenFDA citation and live endpoint */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
            <span className="flex items-center gap-1 font-mono">
              Engine: <strong className="text-slate-300">{ai_analyzer_engine || "Google Gemini"}</strong>
            </span>
            {openfda_source_url && (
              <a 
                href={openfda_source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors"
              >
                <span>Live OpenFDA Label API</span>
                <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
