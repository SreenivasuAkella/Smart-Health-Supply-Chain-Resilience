'use client';
import React, { useState } from 'react';
import { 
  Menu, 
  RefreshCw, 
  Cpu, 
  Key, 
  Languages, 
  CheckCircle2, 
  Bell,
  Activity, 
  ShieldAlert, 
  MapPin, 
  Sparkles, 
  ThermometerSnowflake, 
  Network, 
  Zap, 
  FileSpreadsheet,
  Wifi,
  WifiOff,
  Lock,
  LogOut,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import { triggerLiveDatasetSync } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getRoleTitle, getUserJurisdiction } from '../utils/rbac';

const TAB_METADATA = {
  overview: { title: "National Command Center", subtitle: "Real-time PHC Resource, Bed Occupancy & Staff Mesh", icon: Activity },
  map: { title: "Geospatial Rebalancer", subtitle: "Dynamic Road Flood Risk Routing & Pre-positioning", icon: MapPin },
  inventory: { title: "e-Aushadhi National Ledger", subtitle: "Real-Time Rural Clinic Medicine Inventory & Burn Rates", icon: FileSpreadsheet },
  forecasting: { title: "Epidemic Outbreak Forecasting", subtitle: "BigQuery IMD Weather & IDSP Morbidity Time-Series Models", icon: ShieldAlert },
  coldchain: { title: "Cold-Chain IoT Digital Twin", subtitle: "Firebase Real-Time Thermal Watchdog & Mean Kinetic Temp", icon: ThermometerSnowflake },
  federated: { title: "Federated Multi-State AI", subtitle: "Privacy-Preserving Cross-State Healthcare Model Aggregation", icon: Network },
  simulation: { title: "Crisis Sandbox Drills", subtitle: "Monsoon Inundation & Supply Disruption Resilience Simulator", icon: Zap },
  vision: { title: "Gemini Vision Scanner", subtitle: "Multimodal Visual Expiry, Batch & Damage Diagnostics", icon: Sparkles },
  voice: { title: "ASHA Voice Copilot", subtitle: "8-Language Multilingual Clinical & Reorder Assistant", icon: Languages }
};

export default function TopHeader({
  activeTab,
  onOpenMobileMenu,
  onOpenTechModal,
  onOpenKeyModal,
  onOpenCopilot,
  isKeyConfigured,
  onDataRefresh,
  sseConnected = true,
  onOpenLoginModal
}) {
  const { user, isAuthenticated, logout, openLoginModal } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const currentTab = TAB_METADATA[activeTab] || TAB_METADATA.overview;
  const CurrentIcon = currentTab.icon;

  const handleSyncPublicData = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    try {
      await triggerLiveDatasetSync();
      if (onDataRefresh) await onDataRefresh();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3.5">
      <div className="flex items-center justify-between gap-4">
        
        {/* Left: Mobile Toggle & Page Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Open Navigation Menu"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 items-center justify-center text-cyan-400">
              <CurrentIcon size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {currentTab.title}
                </h2>
                <span className="hidden md:inline-flex items-center gap-1.5 bg-slate-900 text-slate-300 border border-slate-800 text-[10px] font-mono px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>{getUserJurisdiction(user)}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-md">
                {currentTab.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* SSE Live Stream Status Pill */}
          <div
            title={sseConnected ? "Live SSE stream connected" : "SSE stream reconnecting..."}
            className={`hidden sm:flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-full border transition-all duration-500 ${
              sseConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            {sseConnected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <Wifi size={11} />
                <span>Live</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <WifiOff size={11} />
                <span>Reconnecting</span>
              </>
            )}
          </div>

          {/* Live Data Sync Button */}
          <button
            onClick={handleSyncPublicData}
            disabled={syncing}
            className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-cyan-300 text-xs font-semibold px-3 py-2 rounded-xl transition-all shadow-sm"
            title="Fetch live IMD/data.gov.in datasets into BigQuery and Firebase"
          >
            <RefreshCw size={13} className={syncing ? "animate-spin text-cyan-400" : ""} />
            <span className="hidden sm:inline">{syncing ? "Syncing..." : syncSuccess ? "Synced!" : "Sync Public APIs"}</span>
            {syncSuccess && <CheckCircle2 size={13} className="text-emerald-400" />}
          </button>

          {/* Voice Copilot Quick Launch */}
          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
            title="Launch ASHA Multilingual Voice Copilot"
          >
            <Languages size={14} className="text-indigo-400" />
            <span className="hidden md:inline">Voice Copilot</span>
          </button>

          {/* Google AI Stack Architecture Modal */}
          <button
            onClick={onOpenTechModal}
            className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
            title="View Google Cloud & AI Platform Architecture"
          >
            <Cpu size={14} className="text-cyan-400" />
            <span className="hidden lg:inline">Google AI Stack</span>
          </button>

          {/* Gemini Key Config Button */}
          <button
            onClick={onOpenKeyModal}
            className={`
              flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all border
              ${isKeyConfigured 
                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30' 
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'}
            `}
            title="Configure Google Gemini API Key"
          >
            <Key size={13} />
            <span className="hidden xl:inline">{isKeyConfigured ? "Gemini Ready" : "Set Gemini Key"}</span>
          </button>

          {/* User Profile Badge / Sign In Button */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/70 rounded-xl px-2.5 py-1.5 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-slate-950 font-bold text-xs shadow-inner">
                {user.full_name ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-[11px] font-bold text-white leading-tight truncate max-w-[130px]">
                  {user.full_name || user.email}
                </span>
                <span className="text-[9px] font-mono text-cyan-300 truncate max-w-[130px]">
                  {getRoleTitle(user.role)}
                </span>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors ml-1"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLoginModal || openLoginModal}
              className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md shadow-cyan-500/20"
              title="Official Healthcare Personnel Access"
            >
              <Lock size={13} />
              <span>Sign In</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
