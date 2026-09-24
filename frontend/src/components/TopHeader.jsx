'use client';
import React from 'react';
import { 
  Menu, Activity, ShieldAlert, MapPin, Sparkles, 
  ThermometerSnowflake, Network, Zap, FileSpreadsheet, 
  Languages, Settings, Compass, Cpu, Bed, Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserJurisdiction } from '../utils/rbac';

const TAB_METADATA = {
  overview: { title: "National Command Center", subtitle: "Real-time PHC Resource, Bed Occupancy & Autonomous Rebalancing", icon: Activity },
  clinical: { title: "PHC Capacity & Personnel Attendance", subtitle: "Real-time Bed Availability, Medical Personnel Attendance & Patient Footfall", icon: Bed },
  map: { title: "Geospatial Rebalancer", subtitle: "Dynamic Road Flood Risk Routing & Pre-positioning", icon: MapPin },
  inventory: { title: "e-Aushadhi National Ledger", subtitle: "Real-Time Rural Clinic Medicine Inventory & Burn Rates", icon: FileSpreadsheet },
  forecasting: { title: "Epidemic Outbreak Forecasting", subtitle: "BigQuery IMD Weather & IDSP Morbidity Time-Series Models", icon: ShieldAlert },
  coldchain: { title: "Cold-Chain IoT Digital Twin", subtitle: "Firebase Real-Time Thermal Watchdog & Mean Kinetic Temp", icon: ThermometerSnowflake },
  'cloud-data': { title: "Google BigQuery & Firebase Hub", subtitle: "Live SQL Studio Over 10M+ Health Records & RTDB Telemetry Stream", icon: Database },
  federated: { title: "Federated Sovereign AI", subtitle: "Privacy-Preserving Cross-State Healthcare Model Aggregation", icon: Network },
  simulation: { title: "Crisis Sandbox Drills", subtitle: "Monsoon Inundation & Supply Disruption Resilience Simulator", icon: Zap },
  vision: { title: "Gemini Vision Scanner", subtitle: "Multimodal Visual Expiry, Batch & Damage Diagnostics", icon: Sparkles },
  voice: { title: "ASHA Voice Copilot", subtitle: "8-Language Multilingual Clinical & Reorder Assistant", icon: Languages },
  settings: { title: "System Settings & Cloud Integrations", subtitle: "Google AI Studio Keys, BigQuery Architecture & Data Feeds", icon: Settings }
};

export default function TopHeader({
  activeTab,
  onOpenMobileMenu,
  onOpenGuideModal,
  onOpenTechModal
}) {
  const { user } = useAuth();

  const currentTab = TAB_METADATA[activeTab] || TAB_METADATA.overview;
  const CurrentIcon = currentTab.icon;

  return (
    <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3 transition-all">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        
        {/* Left: Mobile Menu Toggle & Clean Page Header */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Open Navigation Menu"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/10 border border-cyan-500/30 items-center justify-center text-cyan-400 shrink-0 shadow-sm">
              <CurrentIcon size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate font-display">
                  {currentTab.title}
                </h2>
                <span className="hidden md:inline-flex items-center gap-1.5 bg-slate-900/90 text-slate-300 border border-slate-800 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="truncate max-w-[140px]">{getUserJurisdiction(user)}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden lg:block truncate max-w-md">
                {currentTab.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Guide & Arch Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenGuideModal}
            className="flex items-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm group"
            title="Open Interactive Platform Guide"
          >
            <Compass size={14} className="text-cyan-400 group-hover:rotate-45 transition-transform" />
            <span>Guide</span>
          </button>

          <button
            onClick={onOpenTechModal}
            className="flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm group"
            title="View Full Google AI & Cloud Platform Architecture"
          >
            <Cpu size={14} className="text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Arch</span>
          </button>
        </div>

      </div>
    </header>
  );
}
