'use client';
import React from 'react';
import { 
  ShieldCheck, AlertTriangle, ThermometerSnowflake, Truck, 
  TrendingUp, Activity, ArrowUpRight, Sparkles, MapPin, 
  CheckCircle2, RefreshCw, Bed, Users, UserCheck, Stethoscope, HeartPulse
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

  // Aggregate resource availability across monitored facilities
  const totalBeds = facilities.reduce((sum, f) => sum + (f.bedCapacity || 0), 0);
  const occupiedBeds = facilities.reduce((sum, f) => sum + (f.bedsOccupied || 0), 0);
  const oxygenBeds = facilities.reduce((sum, f) => sum + (f.oxygenBedsAvailable || 0), 0);
  const icuBeds = facilities.reduce((sum, f) => sum + (f.icuBedsAvailable || 0), 0);

  const doctorsOnDuty = facilities.reduce((sum, f) => sum + (f.doctorsOnDuty || 0), 0);
  const doctorsTotal = facilities.reduce((sum, f) => sum + (f.doctorsTotal || 0), 0);
  const nursesOnDuty = facilities.reduce((sum, f) => sum + (f.nursesOnDuty || 0), 0);
  const ashaActive = facilities.reduce((sum, f) => sum + (f.ashaActiveCount || 0), 0);

  const dailyPatientFootfall = facilities.reduce((sum, f) => sum + (f.dailyPatientFootfall || 0), 0);

  const quickStats = [
    {
      title: "National Health Resilience",
      value: "96.4%",
      change: "+4.2% this week",
      icon: ShieldCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/30",
      trend: "Vertex AI Federated Sync"
    },
    {
      title: "Real-Time Bed Occupancy",
      value: `${occupiedBeds} / ${totalBeds} Beds`,
      change: `${oxygenBeds} O2 Beds | ${icuBeds} ICU Avail`,
      icon: Bed,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/30",
      trend: `${Math.round((occupiedBeds/totalBeds)*100)}% National Occupancy`
    },
    {
      title: "Medical Staff Attendance",
      value: `${doctorsOnDuty}/${doctorsTotal} Doctors`,
      change: `${nursesOnDuty} Nurses | ${ashaActive} ASHA Active`,
      icon: Stethoscope,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/30",
      trend: "87.5% Duty Adherence"
    },
    {
      title: "Live Patient Footfall",
      value: `${dailyPatientFootfall.toLocaleString()} Today`,
      change: "Surge Alerts in 3 PHCs",
      icon: Users,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/30",
      trend: "Peak Monsoon Influx"
    }
  ];

  const highPriorityAlerts = [
    {
      id: "ALT-01",
      severity: "CRITICAL DEFICIT",
      facility: "PHC Baragaon (Varanasi, UP)",
      message: "Anti-Snake Venom buffer collapsed to 3 vials (Threshold: 25). Beds at 100% capacity; patient footfall surge at 130%.",
      action: "Execute Emergency Rebalancing",
      targetId: "PHC-BARAGAON-03",
      medId: "MED-ASV-001"
    },
    {
      id: "ALT-02",
      severity: "CLIMATE CRISIS",
      facility: "PHC Laharighat (Morigaon, Assam)",
      message: "Brahmaputra flood alert: Artesunate Malaria injectable stock is ZERO. Riverine emergency drone dispatch required.",
      action: "Execute Emergency Rebalancing",
      targetId: "PHC-MORIGAON-08",
      medId: "MED-ART-006"
    },
    {
      id: "ALT-03",
      severity: "HIGH VULNERABILITY",
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
              <Sparkles size={13} /> Federated Google AI Platform
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Real-Time PHC & Resource Mesh
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            National Health Resource, Bed, Staff & Supply Chain Platform
          </h2>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Real-time visibility into medicine stocks, bed availability, and medical personnel attendance across India's PHC network with shared cross-state federated AI forecasting.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => onNavigate('federated')}
            className="btn-primary text-sm px-4 py-2.5"
          >
            <span>Federated Multi-State AI</span>
            <ArrowUpRight size={15} />
          </button>
          <button 
            onClick={onOpenCopilot}
            className="btn-secondary text-sm px-4 py-2.5"
          >
            <span>ASHA Voice Copilot</span>
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
                Early Warning Crisis Alerts ({highPriorityAlerts.length})
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
            <span>Synchronized with National IDSP & e-Aushadhi Surveillance Portal</span>
            <button 
              onClick={() => onNavigate('map')} 
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              Open Cross-District Google Maps Router <ArrowUpRight size={13} />
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
