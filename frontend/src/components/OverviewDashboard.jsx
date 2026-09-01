'use client';
import React from 'react';
import { 
  ShieldCheck, AlertTriangle, ThermometerSnowflake, Truck, 
  TrendingUp, Activity, ArrowUpRight, Sparkles, MapPin, 
  CheckCircle2, RefreshCw 
} from 'lucide-react';

export default function OverviewDashboard({ 
  facilities = [], 
  medicines = [], 
  telemetry = {}, 
  onNavigate, 
  onTriggerReallocation,
  onOpenCopilot 
}) {
  const criticalDeficitCount = facilities.filter(f => f.status === 'Critical Deficit').length;
  const optimalCount = facilities.filter(f => f.status === 'Optimal' || f.status === 'Surplus').length;
  const excursionCount = telemetry?.critical_excursions || 1;

  const quickStats = [
    {
      title: "National Health Resilience Score",
      value: "96.4%",
      change: "+4.2% this week",
      icon: ShieldCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/30",
      trend: "Vertex AI Outbreak-Ready"
    },
    {
      title: "Active Facilities Monitored",
      value: `${facilities.length} Centers`,
      change: `${optimalCount} Optimal / ${criticalDeficitCount} Critical`,
      icon: Activity,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/30",
      trend: "6 States & UTs"
    },
    {
      title: "Cold-Chain IoT Excursions",
      value: `${excursionCount} Alert`,
      change: "PHC Baragaon (8.7°C > 8°C)",
      icon: ThermometerSnowflake,
      color: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/30",
      trend: "Autonomous SOS Dispatched"
    },
    {
      title: "AI Reallocations In-Transit",
      value: "8 Shipments",
      change: "Avg ETA: 42 Mins",
      icon: Truck,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/30",
      trend: "Google Maps Route Optimized"
    }
  ];

  const highPriorityAlerts = [
    {
      id: "ALT-01",
      severity: "CRITICAL",
      facility: "PHC Baragaon (Varanasi, UP)",
      message: "Anti-Snake Venom buffer collapsed to 3 vials (Threshold: 25). Monsoon snake-bite surge in progress.",
      action: "Execute Emergency Rebalancing",
      targetId: "PHC-BARAGAON-03",
      medId: "MED-ASV-001"
    },
    {
      id: "ALT-02",
      severity: "CRITICAL",
      facility: "PHC Laharighat (Morigaon, Assam)",
      message: "Brahmaputra flood alert: Artesunate Malaria injectable stock is ZERO vials. Immediate riverine / drone dispatch needed.",
      action: "Execute Emergency Rebalancing",
      targetId: "PHC-MORIGAON-08",
      medId: "MED-ART-006"
    },
    {
      id: "ALT-03",
      severity: "WARNING",
      facility: "PHC Meppadi (Wayanad, Kerala)",
      message: "Highland landslide season: Human Insulin stock at 5 vials. 14-day stockout forecast probability is 88%.",
      action: "Execute Emergency Rebalancing",
      targetId: "PHC-MEPPADI-12",
      medId: "MED-INS-003"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Google AI Badge */}
      <div className="glass-panel-glow p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <Sparkles size={13} /> Powered by Google Gemini 1.5 Flash & Vertex AI
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live National Sync
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            National Health & Vaccine Supply Chain Resilience Hub
          </h2>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Autonomous multi-tier redistribution engine preventing drug stockouts, mitigating cold-chain spoilage, and alerting frontline ASHA workers across Indian districts.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => onNavigate('vision')}
            className="btn-primary text-sm px-4 py-2.5"
          >
            <Sparkles size={16} />
            <span>Scan Medicine Pack</span>
          </button>
          <button 
            onClick={onOpenCopilot}
            className="btn-secondary text-sm px-4 py-2.5"
          >
            <span>Launch ASHA Voice Copilot</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-panel p-5 relative overflow-hidden transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {stat.title}
                </span>
                <div className={`p-2.5 rounded-xl border ${stat.bg}`}>
                  <Icon size={20} className={stat.color} />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-white tracking-tight">
                {stat.value}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">{stat.change}</span>
                <span className="text-cyan-400 font-semibold">{stat.trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Split: Critical Alerts & Immediate AI Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Urgent AI Action Feed */}
        <div className="lg:col-span-2 glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-rose-400" size={20} />
              <h3 className="font-bold text-lg text-white">
                Live Epidemic & Stockout Crisis Alerts ({highPriorityAlerts.length})
              </h3>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <RefreshCw size={12} className="animate-spin text-cyan-400" /> Real-time Vertex Feed
            </span>
          </div>

          <div className="space-y-3">
            {highPriorityAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className="bg-slate-900/80 border border-slate-800 hover:border-rose-500/40 rounded-xl p-4 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                        {alert.severity}
                      </span>
                      <span className="font-semibold text-sm text-white flex items-center gap-1">
                        <MapPin size={13} className="text-cyan-400" /> {alert.facility}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {alert.message}
                    </p>
                  </div>

                  <button
                    onClick={() => onTriggerReallocation(alert.targetId, alert.medId)}
                    className="shrink-0 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1 transition-all"
                  >
                    <span>Auto Reallocate</span>
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-between items-center text-xs text-slate-400">
            <span>Synchronized with National IDSP Outbreak Surveillance Portal</span>
            <button 
              onClick={() => onNavigate('forecasting')} 
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              View 30-Day Outbreak Projections <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        {/* Cold-Chain Quick Monitor */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <ThermometerSnowflake className="text-cyan-400" size={20} />
              <h3 className="font-bold text-lg text-white">Cold-Chain IoT Guard</h3>
            </div>
            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-medium">
              IoT Active
            </span>
          </div>

          <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-rose-300">THERMAL EXCURSION DETECTED</span>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-3xl font-extrabold text-white">8.7°C</div>
                <div className="text-[11px] text-slate-400">Target Range: 2.0°C - 8.0°C</div>
              </div>
              <div className="text-right text-xs">
                <div className="text-rose-400 font-bold">+0.7°C Overheat</div>
                <div className="text-slate-400">PHC Baragaon (ILR)</div>
              </div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 h-2 w-[85%]"></div>
            </div>
            <p className="text-[11px] text-slate-300">
              Mean Kinetic Temperature (MKT) degradation rate: <strong>-12% potency loss / 6h</strong>. Solar battery reserve low.
            </p>
          </div>

          <button
            onClick={() => onNavigate('coldchain')}
            className="w-full btn-secondary text-xs justify-center py-2.5"
          >
            <span>Open Cold-Chain Digital Twin</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}
