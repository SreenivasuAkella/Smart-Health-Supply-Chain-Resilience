'use client';
import React, { useState, useEffect } from 'react';
import { ThermometerSnowflake, AlertTriangle, BatteryCharging, Radio, CheckCircle2, Wrench, RefreshCw, Cpu } from 'lucide-react';
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

  if (loading || !telemetryData) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="glass-panel p-6 border border-slate-800 space-y-3">
          <div className="flex gap-2">
            <div className="skeleton w-44 h-6 rounded-full" />
            <div className="skeleton w-48 h-6 rounded-full" />
          </div>
          <div className="skeleton w-1/2 h-7 rounded-lg" />
          <div className="skeleton w-full max-w-xl h-4 rounded" />
        </div>

        {/* 6 Sensor Cards Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-panel p-5 border border-slate-800 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="skeleton w-16 h-3 rounded" />
                  <div className="skeleton w-36 h-5 rounded" />
                  <div className="skeleton w-28 h-3 rounded" />
                </div>
                <div className="skeleton w-20 h-5 rounded-full" />
              </div>

              <div className="flex justify-between items-baseline py-2">
                <div className="space-y-1">
                  <div className="skeleton w-24 h-9 rounded" />
                  <div className="skeleton w-28 h-3 rounded" />
                </div>
                <div className="space-y-1">
                  <div className="skeleton w-24 h-3 rounded" />
                  <div className="skeleton w-16 h-5 rounded" />
                </div>
              </div>

              {/* Sparkline Skeleton */}
              <div className="space-y-1.5">
                <div className="skeleton w-40 h-3 rounded" />
                <div className="skeleton w-full h-10 rounded-lg" />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <div className="skeleton h-4 rounded" />
                <div className="skeleton h-4 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-cyan-500/20 text-cyan-300 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <Radio size={13} className="text-cyan-400 animate-pulse" /> Firebase Real-Time IoT Bridge
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1 rounded-full font-semibold">
              Live Sensor Influx: {telemetryData.active_sensors_count} Units
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Cold-Chain Digital Twin & Thermal Excursion Watchdog
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
            Monitors real-time ILR and walk-in freezer temperatures, calculating kinetic potency degradation (MKT) and preventing vaccine spoilage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSendSOS}
            className="btn-danger text-xs px-4 py-2"
          >
            <Wrench size={14} />
            <span>{dispatchAlertSent ? 'Technicians Alerted!' : 'Emergency Tech SOS'}</span>
          </button>
        </div>
      </div>

      {/* Sensor Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {telemetryData.sensors?.map((sensor) => {
          const isBreach = sensor.currentTemp > 8.0 || (sensor.currentTemp < 2.0 && !sensor.equipmentType.includes('Cryo'));
          return (
            <div 
              key={sensor.sensorId} 
              className={`p-5 rounded-2xl transition-all ${
                isBreach 
                  ? 'glass-panel-alert' 
                  : 'glass-panel hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 block">{sensor.sensorId}</span>
                  <h4 className="font-bold text-white text-sm mt-0.5">{sensor.facilityName}</h4>
                  <span className="text-xs text-slate-400">{sensor.equipmentType}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isBreach ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {isBreach ? 'EXCURSION' : 'NORMAL'}
                </span>
              </div>

              {/* Temperature Reading */}
              <div className="my-4 flex items-baseline justify-between">
                <div>
                  <div className={`text-3xl font-extrabold tracking-tight ${isBreach ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {sensor.currentTemp}°C
                  </div>
                  <span className="text-[11px] text-slate-400">Range: {sensor.targetTempRange}</span>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-400 block text-[11px]">Mean Kinetic Temp (MKT)</span>
                  <span className="font-mono font-bold text-white text-sm">{sensor.mkt}°C</span>
                </div>
              </div>

              {/* Simulated 12h Sparkline Bar Chart */}
              <div className="space-y-1 my-3">
                <span className="text-[10px] text-slate-400 font-semibold block">12-Hour Temperature Fluctuation Profile:</span>
                <div className="flex items-end gap-1 h-10 bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                  {sensor.tempHistory12h?.map((t, idx) => {
                    const heightPct = Math.min(100, Math.max(15, (t / 12.0) * 100));
                    const isBarBreach = t > 8.0 || (t < 2.0 && !sensor.equipmentType.includes('Cryo'));
                    return (
                      <div
                        key={idx}
                        style={{ height: `${heightPct}%` }}
                        className={`flex-1 rounded-sm ${isBarBreach ? 'bg-rose-500' : 'bg-cyan-500/70'}`}
                        title={`${t}°C`}
                      ></div>
                    );
                  })}
                </div>
              </div>

              {/* Sensor Diagnostics */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 block">Battery Reserve:</span>
                  <span className="font-semibold text-white flex items-center gap-1">
                    <BatteryCharging size={13} className="text-emerald-400" /> {sensor.batteryBackupLevel}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Power Feed:</span>
                  <span className="font-semibold text-slate-300">{sensor.powerSource}</span>
                </div>
              </div>

              <div className="mt-3 bg-slate-900/60 p-2.5 rounded-lg text-[11px] text-slate-300 flex items-center justify-between">
                <span>Potency Status:</span>
                <span className={`font-semibold ${isBreach ? 'text-rose-300 font-bold' : 'text-emerald-400'}`}>
                  {sensor.estimated_shelf_life_impact}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
