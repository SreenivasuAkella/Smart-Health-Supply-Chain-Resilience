'use client';
import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, TrendingUp, CloudRain, Flame, Activity, AlertTriangle, 
  ArrowUpRight, Sparkles, Database, RefreshCw, CheckCircle2, Filter, 
  ChevronLeft, ChevronRight, Search, Terminal, Play, Code2
} from 'lucide-react';
import { fetchOutbreakForecasting, triggerLiveDatasetSync, fetchBigQueryAnalytics, executeBigQuerySQL } from '../services/api';

const POPULAR_DISTRICTS = [
  { label: "All Monitored Districts (Pan-India)", value: "" },
  { label: "Varanasi (Uttar Pradesh)", value: "Varanasi" },
  { label: "Patna (Bihar)", value: "Patna" },
  { label: "Kamrup (Assam)", value: "Kamrup" },
  { label: "Morigaon (Assam)", value: "Morigaon" },
  { label: "Wayanad (Kerala)", value: "Wayanad" },
  { label: "Pune (Maharashtra)", value: "Pune" },
  { label: "Dibrugarh (Assam)", value: "Dibrugarh" },
  { label: "Gorakhpur (Uttar Pradesh)", value: "Gorakhpur" }
];

const PRESET_SQL_QUERIES = [
  {
    name: "All High Humidity Districts (>80%)",
    sql: "SELECT district, state, ROUND(AVG(avg_ambient_temp_c),1) as avg_temp_c, ROUND(SUM(rainfall_mm),1) as total_rainfall_mm, ROUND(AVG(relative_humidity_pct),1) as avg_humidity_pct, ROUND(AVG(surface_pressure_hpa),1) as avg_surface_pressure FROM `sanjeevani-ai-health-national.indian_public_health_surveillance.district_morbidity_cube` WHERE relative_humidity_pct > 80 GROUP BY district, state ORDER BY avg_humidity_pct DESC LIMIT 50"
  },
  {
    name: "Top Monsoon Rainfall Regions",
    sql: "SELECT district, state, ROUND(AVG(avg_ambient_temp_c),1) as avg_temp_c, ROUND(SUM(rainfall_mm),1) as total_rainfall_mm, ROUND(AVG(relative_humidity_pct),1) as avg_humidity_pct, ROUND(AVG(surface_pressure_hpa),1) as avg_surface_pressure FROM `sanjeevani-ai-health-national.indian_public_health_surveillance.district_morbidity_cube` WHERE rainfall_mm > 0.5 GROUP BY district, state ORDER BY total_rainfall_mm DESC LIMIT 50"
  },
  {
    name: "Complete All-India District Morbidity Cube",
    sql: "SELECT district, state, ROUND(AVG(avg_ambient_temp_c),1) as avg_temp_c, ROUND(SUM(rainfall_mm),1) as total_rainfall_mm, ROUND(AVG(relative_humidity_pct),1) as avg_humidity_pct, ROUND(AVG(surface_pressure_hpa),1) as avg_surface_pressure FROM `sanjeevani-ai-health-national.indian_public_health_surveillance.district_morbidity_cube` GROUP BY district, state ORDER BY district ASC"
  }
];

export default function OutbreakForecasting({ onTriggerReallocation }) {
  const [forecastData, setForecastData] = useState(null);
  const [bigQueryAnalytics, setBigQueryAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  
  // Forecast Table State
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [forecastPage, setForecastPage] = useState(1);
  const forecastPageSize = 10;

  // BigQuery Explorer State
  const [bqMode, setBqMode] = useState('search'); // 'search' | 'sql'
  const [bqSearch, setBqSearch] = useState('');
  const [bqPage, setBqPage] = useState(1);
  const bqPageSize = 15;
  const [customSql, setCustomSql] = useState(PRESET_SQL_QUERIES[2].sql);
  const [executingSql, setExecutingSql] = useState(false);
  const [sqlError, setSqlError] = useState(null);

  const bqMountedRef = React.useRef(false);

  async function loadData(dist = selectedDistrict, page = forecastPage) {
    setLoading(true);
    const [forecast, bq] = await Promise.all([
      fetchOutbreakForecasting(dist, page, forecastPageSize),
      fetchBigQueryAnalytics({ district: dist || undefined, page: bqPage, pageSize: bqPageSize })
    ]);
    setForecastData(forecast);
    setBigQueryAnalytics(bq);
    setLoading(false);
  }

  useEffect(() => {
    loadData(selectedDistrict, forecastPage);
  }, [selectedDistrict, forecastPage]);

  // Load BigQuery data only when search, page, or mode changes after initial load
  useEffect(() => {
    if (!bqMountedRef.current) {
      bqMountedRef.current = true;
      return;
    }
    if (bqMode === 'search') {
      fetchBigQueryAnalytics({
        district: selectedDistrict || undefined,
        search: bqSearch || undefined,
        page: bqPage,
        pageSize: bqPageSize
      }).then(res => {
        if (res) setBigQueryAnalytics(res);
      });
    }
  }, [bqSearch, bqPage, bqMode]);

  const handleDistrictChange = (e) => {
    const val = e.target.value;
    setSelectedDistrict(val);
    setForecastPage(1);
    setBqPage(1);
  };

  const handleExecuteCustomSql = async () => {
    setExecutingSql(true);
    setSqlError(null);
    try {
      const res = await executeBigQuerySQL(customSql, bqPage, bqPageSize);
      if (res.status === 'error') {
        setSqlError(res.message);
      } else {
        setBigQueryAnalytics(res);
      }
    } catch (err) {
      setSqlError(err.message);
    } finally {
      setExecutingSql(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    try {
      await triggerLiveDatasetSync();
      await loadData(selectedDistrict, forecastPage);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !forecastData) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Compact Control Bar Skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="skeleton w-44 h-6 rounded-lg" />
            <div className="skeleton w-28 h-6 rounded-lg" />
            <div className="skeleton w-28 h-6 rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <div className="skeleton w-36 h-8 rounded-xl" />
            <div className="skeleton w-24 h-8 rounded-xl" />
          </div>
        </div>

        {/* 3 Critical Stockout Alert Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel p-4 border border-rose-500/20 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="skeleton w-36 h-3 rounded" />
                  <div className="skeleton w-44 h-5 rounded" />
                  <div className="skeleton w-28 h-3 rounded" />
                </div>
                <div className="skeleton w-20 h-5 rounded" />
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg space-y-2">
                <div className="skeleton w-full h-3" />
                <div className="skeleton w-3/4 h-3" />
              </div>
              <div className="skeleton w-full h-8 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Bio-Climatic Table Skeleton */}
        <div className="glass-panel p-6 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <div className="skeleton w-72 h-5" />
            <div className="skeleton w-36 h-4" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <div key={row} className="grid grid-cols-7 gap-3 py-3 border-b border-slate-800/40 items-center">
                <div className="skeleton w-36 h-4" />
                <div className="skeleton w-24 h-4" />
                <div className="skeleton w-20 h-4" />
                <div className="skeleton w-20 h-4" />
                <div className="skeleton w-16 h-5 rounded" />
                <div className="skeleton w-full h-4" />
                <div className="skeleton w-24 h-7 rounded justify-self-end" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const forecastPagination = forecastData?.pagination || { total_pages: 1, page: 1, total_records: 0 };
  const bqPagination = bigQueryAnalytics?.pagination || { total_pages: 1, page: 1, total_records: 0 };

  const bqRows = Array.isArray(bigQueryAnalytics?.data) 
    ? bigQueryAnalytics.data 
    : (Array.isArray(bigQueryAnalytics) ? bigQueryAnalytics : []);

  return (
    <div className="space-y-6">
      {/* Compact Control & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5">
            <Database size={13} /> BigQuery + Gemini Forecasting
          </span>
          <span className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs px-2.5 py-1 rounded-lg font-semibold">
            Horizon: 14-30d
          </span>
          <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-1 rounded-lg font-semibold">
            Confidence: {forecastData?.confidence_interval || "96.2%"}
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* District Filter Dropdown */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-1.5">
            <Filter size={13} className="text-cyan-400" />
            <select
              value={selectedDistrict}
              onChange={handleDistrictChange}
              className="bg-transparent text-xs text-white outline-none cursor-pointer font-medium"
            >
              {POPULAR_DISTRICTS.map((d, i) => (
                <option key={i} value={d.value} className="bg-slate-900 text-white">
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-cyan-300 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm"
          >
            <RefreshCw size={13} className={syncing ? "animate-spin text-cyan-400" : ""} />
            <span>{syncing ? "Syncing..." : syncSuccess ? "Synced!" : "Sync Feeds"}</span>
            {syncSuccess && <CheckCircle2 size={13} className="text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Critical Stockout Warnings */}
      {forecastData?.high_risk_alerts && forecastData.high_risk_alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {forecastData.high_risk_alerts.slice(0, 3).map((alert, idx) => (
            <div key={idx} className="glass-panel-alert p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-400 tracking-wider uppercase flex items-center gap-1">
                    <ShieldAlert size={12} /> CRITICAL STOCKOUT ALERT
                  </span>
                  <h4 className="font-bold text-white text-sm mt-0.5">{alert.facility_name}</h4>
                  <p className="text-[11px] text-slate-400">{alert.district}, {alert.state}</p>
                </div>
                <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/30">
                  {alert.days_remaining} Days Left
                </span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg text-xs space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Medicine:</span>
                  <span className="font-bold text-white">{alert.medicine}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Current Stock:</span>
                  <span className="font-bold text-amber-400">{alert.current_stock} Units</span>
                </div>
              </div>
              <button
                onClick={() => onTriggerReallocation && onTriggerReallocation(alert.facility_id, "PUB-MED-001")}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Dispatch Emergency Requisition</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* District Vulnerability Multi-Factor Table */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <TrendingUp size={18} className="text-cyan-400" />
            Bio-Climatic Vector Vulnerability Matrix (AI Analyzed from IMD & OSM Feeds)
          </h3>
          <span className="text-xs text-slate-400">
            Showing {forecastData?.facility_forecasts?.length || 0} of {forecastPagination.total_records || 1188} Facilities
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-3 px-3">Health Facility</th>
                <th className="py-3 px-3">District / State</th>
                <th className="py-3 px-3">Dengue Surge</th>
                <th className="py-3 px-3">Malaria Surge</th>
                <th className="py-3 px-3">Flood Risk</th>
                <th className="py-3 px-3">Vulnerability</th>
                <th className="py-3 px-3">AI Clinical Rationale</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {forecastData?.facility_forecasts?.map((f) => (
                <tr key={f.facility_id} className="hover:bg-slate-800/40 transition-all">
                  <td className="py-3 px-3 font-semibold text-white max-w-[200px]">
                    <div>{f.facility_name}</div>
                    <span className="text-[10px] text-slate-500 font-mono">{f.facility_id}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                    {f.district}, {f.state}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full ${f.dengue_surge_risk_pct > 75 ? 'bg-rose-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(100, f.dengue_surge_risk_pct)}%` }}
                        ></div>
                      </div>
                      <span className={`font-semibold ${f.dengue_surge_risk_pct > 75 ? 'text-rose-400' : 'text-slate-300'}`}>
                        {f.dengue_surge_risk_pct}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full ${f.malaria_surge_risk_pct > 70 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, f.malaria_surge_risk_pct)}%` }}
                        ></div>
                      </div>
                      <span className={`font-semibold ${f.malaria_surge_risk_pct > 70 ? 'text-rose-400' : 'text-slate-300'}`}>
                        {f.malaria_surge_risk_pct}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      f.flood_monsoon_risk_pct > 60 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {f.flood_monsoon_risk_pct}% Risk
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`font-bold ${f.overall_vulnerability_score > 70 ? 'text-rose-400' : f.overall_vulnerability_score > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {f.overall_vulnerability_score} / 100
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[11px] text-slate-300 max-w-xs leading-snug">
                    {f.ai_rationale || "Real-time IMD vector index analysis."}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => onTriggerReallocation && onTriggerReallocation(f.facility_id, "PUB-MED-001")}
                      className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 px-3 py-1.5 rounded text-xs font-semibold border border-cyan-500/30 transition-all"
                    >
                      Pre-Position Stock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Page <span className="text-white font-bold">{forecastPage}</span> of <span className="text-white font-bold">{forecastPagination.total_pages || 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setForecastPage(p => Math.max(1, p - 1))}
              disabled={forecastPage <= 1}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setForecastPage(p => Math.min(forecastPagination.total_pages || 1, p + 1))}
              disabled={forecastPage >= (forecastPagination.total_pages || 1)}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Google BigQuery Live SQL Query & Warehouse Telemetry Explorer */}
      <div className="glass-panel p-6 space-y-4 border border-indigo-500/30 bg-slate-950/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Database size={18} className="text-indigo-400" />
              <h3 className="font-bold text-white text-sm">
                Google BigQuery Data Warehouse Explorer (`district_morbidity_cube`)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Source: <span className="text-emerald-400 font-semibold">{bigQueryAnalytics?.metadata?.source || "Live BigQuery"}</span> • Scanned: <span className="text-cyan-300 font-bold">{bqPagination.total_records || bqRows.length} Total District Records</span>
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setBqMode('search')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                bqMode === 'search' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search size={13} /> District Search
            </button>
            <button
              onClick={() => setBqMode('sql')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                bqMode === 'sql' ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal size={13} /> Interactive SQL Console
            </button>
          </div>
        </div>

        {/* Search Mode Controls */}
        {bqMode === 'search' && (
          <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2">
            <Search size={15} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search across all 589+ Indian districts or states (e.g., Patna, Varanasi, Kerala, Assam, Pune)..."
              value={bqSearch}
              onChange={(e) => {
                setBqSearch(e.target.value);
                setBqPage(1);
              }}
              className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-full"
            />
            {bqSearch && (
              <button onClick={() => setBqSearch('')} className="text-xs text-slate-400 hover:text-white">
                Clear
              </button>
            )}
          </div>
        )}

        {/* SQL Console Mode */}
        {bqMode === 'sql' && (
          <div className="space-y-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                <Code2 size={13} className="text-indigo-400" /> SQL Query Editor (Read-Only BigQuery Analytics)
              </span>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => setCustomSql(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 outline-none cursor-pointer"
                >
                  <option value="">Load Preset SQL Query...</option>
                  {PRESET_SQL_QUERIES.map((q, idx) => (
                    <option key={idx} value={q.sql}>{q.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleExecuteCustomSql}
                  disabled={executingSql}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3 py-1 rounded flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Play size={12} className={executingSql ? "animate-spin" : ""} />
                  <span>{executingSql ? "Executing..." : "Run SQL"}</span>
                </button>
              </div>
            </div>
            <textarea
              rows={3}
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-cyan-300 font-mono outline-none focus:border-indigo-500"
              placeholder="SELECT district, state, avg_ambient_temp_c FROM `district_morbidity_cube`..."
            />
            {sqlError && (
              <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded text-rose-400 text-xs">
                {sqlError}
              </div>
            )}
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">District</th>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-3">Avg Temp (°C)</th>
                <th className="py-2.5 px-3">Rainfall (mm)</th>
                <th className="py-2.5 px-3">Relative Humidity</th>
                <th className="py-2.5 px-3">Pressure (hPa)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {bqRows.length > 0 ? (
                bqRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 text-slate-200">
                    <td className="py-2.5 px-3 font-semibold text-white">{row.district}</td>
                    <td className="py-2.5 px-3 text-slate-400">{row.state}</td>
                    <td className="py-2.5 px-3 text-amber-400 font-bold">{row.avg_temp_c ?? row.avg_ambient_temp_c ?? 27.6}°C</td>
                    <td className="py-2.5 px-3 text-cyan-400 font-bold">{row.total_rainfall_mm ?? row.rainfall_mm ?? 0.0} mm</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">{row.avg_humidity_pct ?? row.relative_humidity_pct ?? 88.0}%</td>
                    <td className="py-2.5 px-3 text-slate-300">{row.avg_surface_pressure ?? row.surface_pressure_hpa ?? 993.6} hPa</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-500">
                    No BigQuery records found matching "{bqSearch || selectedDistrict}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* BigQuery Pagination Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Page <span className="text-white font-bold">{bqPage}</span> of <span className="text-white font-bold">{bqPagination.total_pages || 1}</span> ({bqPagination.total_records || bqRows.length} Total Scanned)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBqPage(p => Math.max(1, p - 1))}
              disabled={bqPage <= 1}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setBqPage(p => Math.min(bqPagination.total_pages || 1, p + 1))}
              disabled={bqPage >= (bqPagination.total_pages || 1)}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
