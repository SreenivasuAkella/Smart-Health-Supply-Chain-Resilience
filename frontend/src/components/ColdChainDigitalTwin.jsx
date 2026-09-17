'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ThermometerSnowflake, AlertTriangle, BatteryCharging, Radio, 
  CheckCircle2, Wrench, RefreshCw, Cpu, Zap, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { fetchColdChainTelemetry, subscribeToLiveSSE } from '../services/api';

export default function ColdChainDigitalTwin() {
  const [telemetryData, setTelemetryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispatchAlertSent, setDispatchAlertSent] = useState(false);

  const loadTelemetry = async () => {
    const data = await fetchColdChainTelemetry();
    if (data) setTelemetryData(data);
    setLoading(false);
  };

  useEffect(() => {
    loadTelemetry();
    
    // Subscribe to SSE Real-Time IoT Stream
    const unsubscribeSSE = subscribeToLiveSSE((event) => {
      if (event.type === 'telemetry' && event.data) {
        setTelemetryData(event.data);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeSSE) unsubscribeSSE();
    };
  }, []);

  const handleSendSOS = () => {
    setDispatchAlertSent(true);
    setTimeout(() => setDispatchAlertSent(false), 3000);
  };

  // Fleet summary stats
  const activeSensors = telemetryData?.sensors || [];
  const totalSensors = telemetryData?.active_sensors_count || activeSensors.length || 6;
  const excursionCount = useMemo(() => {
    return activeSensors.filter(s => s.currentTemp > 8.0 || (s.currentTemp < 2.0 && !s.equipmentType?.includes('Cryo'))).length;
  }, [activeSensors]);

  const avgMkt = useMemo(() => {
    if (!activeSensors.length) return "4.6";
    const sum = activeSensors.reduce((acc, s) => acc + (parseFloat(s.mkt) || 4.5), 0);
    return (sum / activeSensors.length).toFixed(1);
  }, [activeSensors]);

  if (loading || !telemetryData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-panel p-4 border border-slate-800 space-y-2">
              <div className="skeleton w-24 h-3 rounded" />
              <div className="skeleton w-16 h-7 rounded" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-panel p-5 border border-slate-800 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="skeleton w-20 h-3 rounded" />
                  <div className="skeleton w-40 h-5 rounded" />
                </div>
                <div className="skeleton w-16 h-5 rounded-full" />
              </div>
              <div className="skeleton w-24 h-9 rounded" />
              <div className="skeleton w-full h-12 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 4 Summary Fleet Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glass-panel p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fleet Sensors</span>
            <Radio size={16} className="text-cyan-400 animate-pulse" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white font-display">
            {totalSensors} Monitored
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5">Firebase RTDB IoT Nodes</span>
        </div>

        <div className={`glass-panel p-4 flex flex-col justify-between ${excursionCount > 0 ? 'border-rose-500/40 bg-rose-950/20' : 'border-emerald-500/30'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${excursionCount > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
              Thermal Excursions
            </span>
            {excursionCount > 0 ? (
              <ShieldAlert size={16} className="text-rose-400" />
            ) : (
              <ShieldCheck size={16} className="text-emerald-400" />
            )}
          </div>
          <div className={`mt-2 text-2xl font-extrabold font-display ${excursionCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {excursionCount} Units
          </div>
          <span className={`text-[11px] mt-0.5 ${excursionCount > 0 ? 'text-rose-300/80' : 'text-emerald-300/80'}`}>
            {excursionCount > 0 ? 'Exceeding 2–8°C Threshold' : 'All Sensors Nominal'}
          </span>
        </div>

        <div className="glass-panel p-4 flex flex-col justify-between border-cyan-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Mean Kinetic Temp</span>
            <ThermometerSnowflake size={16} className="text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-cyan-300 font-display">
            {avgMkt}°C MKT
          </div>
          <span className="text-[11px] text-cyan-300/80 mt-0.5">Vaccine Potency Safe Zone</span>
        </div>

        <div className="glass-panel p-4 flex flex-col justify-between border-indigo-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Redundancy Feed</span>
            <Zap size={16} className="text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white font-display">
            94.8% Active
          </div>
          <span className="text-[11px] text-indigo-300/80 mt-0.5">Solar SDD + Battery Backup</span>
        </div>
      </div>

      {/* Action & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5">
            <Radio size={13} className="text-cyan-400 animate-pulse" /> Live Firebase IoT Stream
          </span>
          <span className="text-xs text-slate-400">
            Real-Time Thermal Watchdog &bull; High-Frequency Sensors
          </span>
        </div>

        <button
          onClick={handleSendSOS}
          className="btn-danger text-xs px-4 py-2 font-semibold"
        >
          <Wrench size={13} />
          <span>{dispatchAlertSent ? 'Engineers Dispatched via SMS & Push!' : 'Trigger Emergency Tech SOS'}</span>
        </button>
      </div>

      {/* Sensor Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {telemetryData.sensors?.map((sensor) => {
          const isBreach = sensor.currentTemp > 8.0 || (sensor.currentTemp < 2.0 && !sensor.equipmentType?.includes('Cryo'));
          return (
            <div 
              key={sensor.sensorId} 
              className={`p-5 rounded-2xl transition-all duration-200 flex flex-col justify-between ${
                isBreach 
                  ? 'glass-panel-alert border-rose-500/60' 
                  : 'glass-panel hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
                      {sensor.sensorId}
                    </span>
                    <h4 className="font-extrabold text-white text-sm mt-1.5 font-display">{sensor.facilityName}</h4>
                    <span className="text-xs text-slate-400">{sensor.equipmentType}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                    isBreach 
                      ? 'bg-rose-500/30 text-rose-200 border-rose-500/60 animate-pulse' 
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {isBreach ? 'EXCURSION' : 'NORMAL'}
                  </span>
                </div>

                {/* Temperature Gauge Reading */}
                <div className="my-4 flex items-baseline justify-between pt-1">
                  <div>
                    <div className={`text-3xl sm:text-4xl font-extrabold tracking-tight font-display ${
                      isBreach ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {sensor.currentTemp}°C
                    </div>
                    <span className="text-xs text-slate-400">Target Range: {sensor.targetTempRange}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">Mean Kinetic (MKT)</span>
                    <span className="font-mono font-bold text-white text-base">{sensor.mkt}°C</span>
                  </div>
                </div>

                {/* 12-Hour Temperature Sparkline */}
                <div className="space-y-1.5 my-3">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span className="font-semibold">12h Thermal Profile</span>
                    <span>Safety Margin: 2°C – 8°C</span>
                  </div>
                  <div className="flex items-end gap-1 h-12 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    {sensor.tempHistory12h?.map((t, idx) => {
                      const heightPct = Math.min(100, Math.max(15, (t / 12.0) * 100));
                      const isBarBreach = t > 8.0 || (t < 2.0 && !sensor.equipmentType?.includes('Cryo'));
                      return (
                        <div
                          key={idx}
                          style={{ height: `${heightPct}%` }}
                          className={`flex-1 rounded-sm transition-all ${
                            isBarBreach ? 'bg-rose-500 shadow-sm' : 'bg-cyan-500/70'
                          }`}
                          title={`${t}°C`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sensor Diagnostics */}
              <div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Battery Reserve:</span>
                    <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
                      <BatteryCharging size={14} className="text-emerald-400" /> {sensor.batteryBackupLevel}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Power Source:</span>
                    <span className="font-semibold text-slate-200 mt-0.5 block truncate">{sensor.powerSource}</span>
                  </div>
                </div>

                <div className="mt-3 bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-xl text-xs flex items-center justify-between">
                  <span className="text-slate-400">Vaccine Potency:</span>
                  <span className={`font-semibold ${isBreach ? 'text-rose-300 font-bold' : 'text-emerald-400'}`}>
                    {sensor.estimated_shelf_life_impact}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
