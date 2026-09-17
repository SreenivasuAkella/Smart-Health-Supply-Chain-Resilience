'use client';
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  MapPin, Navigation, Truck, RefreshCw, Layers, ShieldCheck, 
  AlertCircle, Building2, Phone, Sparkles, ShieldAlert, AlertTriangle, 
  CheckCircle2, Bot, History, X, Clock, ArrowRight, Gauge, Thermometer,
  RotateCcw
} from 'lucide-react';
import { 
  optimizeReallocationPlan, 
  triggerAutoRelocationAgent, 
  fetchReallocationHistory, 
  updateReallocationStatus 
} from '../services/api';

// Dynamic import of Leaflet components with SSR disabled
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

export default function InteractiveMap({ isLoading = false, facilities = [], activeReallocation, onSelectFacility }) {
  const [isClient, setIsClient] = useState(false);
  const [selectedState, setSelectedState] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [mapLayer, setMapLayer] = useState('google-roadmap');
  const [reallocationPlan, setReallocationPlan] = useState(activeReallocation || null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [triggeringAI, setTriggeringAI] = useState(false);
  const [customIcons, setCustomIcons] = useState(null);
  const [vehicleIcon, setVehicleIcon] = useState(null);
  const [vehicleIndex, setVehicleIndex] = useState(0);
  
  // History Drawer State
  const [showHistory, setShowHistory] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showTrace, setShowTrace] = useState(false);

  // Sync external activeReallocation prop whenever updated (e.g. from SSE stream)
  useEffect(() => {
    if (activeReallocation) {
      setReallocationPlan(activeReallocation);
      setVehicleIndex(0);
    }
  }, [activeReallocation]);

  const tileUrls = {
    'google-roadmap': {
      url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      attribution: '&copy; Google Maps Platform'
    },
    'google-hybrid': {
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attribution: '&copy; Google Maps Platform / Google Earth Engine'
    },
    'google-terrain': {
      url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
      attribution: '&copy; Google Maps Platform Terrain'
    },
    'osm': {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors'
    }
  };

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const createCustomIcon = (color, pulseColor) => {
        return L.divIcon({
          className: 'custom-pin',
          html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 12px ${pulseColor || color};"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
      };

      const createVehicleIcon = (arrived = false) => {
        const themeColor = arrived ? '#10b981' : '#06b6d4';
        const strokeColor = arrived ? '#34d399' : '#22d3ee';
        return L.divIcon({
          className: 'vehicle-marker',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
              ${!arrived ? `<div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(6, 182, 212, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : `<div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(16, 185, 129, 0.25);"></div>`}
              <div style="width: 28px; height: 28px; border-radius: 50%; background: #0f172a; border: 2px solid ${themeColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px ${themeColor};">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 17h4V5H2v12h3"/>
                  <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/>
                  <circle cx="7.5" cy="17.5" r="2.5"/>
                  <circle cx="17.5" cy="17.5" r="2.5"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });
      };

      setCustomIcons({
        critical: createCustomIcon('#f43f5e', '#fb7185'),
        optimal: createCustomIcon('#10b981', '#34d399'),
        warning: createCustomIcon('#f59e0b', '#fbbf24'),
        warehouse: createCustomIcon('#38bdf8', '#0284c7'),
        donorActive: createCustomIcon('#10b981', '#34d399')
      });

      setVehicleIcon({
        inTransit: createVehicleIcon(false),
        arrived: createVehicleIcon(true)
      });
    }
  }, []);

  // Turn-by-turn Google Maps-style road navigation: moves from Donor to PHC and stops at destination
  useEffect(() => {
    if (!reallocationPlan?.route_coordinates || reallocationPlan.route_coordinates.length < 2) {
      setVehicleIndex(0);
      return;
    }
    const count = reallocationPlan.route_coordinates.length;
    setVehicleIndex(0);

    // Dynamic pacing derived from AI Fleet Routing assessment
    const aiStepDelay = reallocationPlan?.logistics_parameters?.simulation_step_delay_ms
      || reallocationPlan?.simulation_step_delay_ms
      || Math.max(150, Math.min(500, Math.round(18000 / count)));

    const interval = setInterval(() => {
      setVehicleIndex(prev => {
        if (prev < count - 1) {
          return prev + 1;
        }
        clearInterval(interval);
        return count - 1; // Terminates at destination PHC without looping back
      });
    }, aiStepDelay);

    return () => clearInterval(interval);
  }, [reallocationPlan]);

  const handleReplayTransit = () => {
    if (!reallocationPlan?.route_coordinates || reallocationPlan.route_coordinates.length < 2) return;
    const count = reallocationPlan.route_coordinates.length;
    setVehicleIndex(0);

    const aiStepDelay = reallocationPlan?.logistics_parameters?.simulation_step_delay_ms
      || reallocationPlan?.simulation_step_delay_ms
      || Math.max(150, Math.min(500, Math.round(18000 / count)));

    const interval = setInterval(() => {
      setVehicleIndex(prev => {
        if (prev < count - 1) {
          return prev + 1;
        }
        clearInterval(interval);
        return count - 1;
      });
    }, aiStepDelay);
  };

  const handleSimulateRoute = async (facilityId = "DH-VAR-001", medId = "PUB-MED-001") => {
    setLoadingRoute(true);
    const plan = await optimizeReallocationPlan(facilityId, medId, 25);
    if (plan) {
      setReallocationPlan(plan);
      setVehicleIndex(0);
    }
    setLoadingRoute(false);
  };

  const handleTriggerAI = async () => {
    setTriggeringAI(true);
    const record = await triggerAutoRelocationAgent();
    if (record) {
      setReallocationPlan(record);
      setVehicleIndex(0);
    }
    setTriggeringAI(false);
  };

  const handleOpenHistory = async () => {
    setShowHistory(true);
    setLoadingHistory(true);
    const list = await fetchReallocationHistory(50);
    setHistoryRecords(list || []);
    setLoadingHistory(false);
  };

  const handleSelectHistoryItem = (item) => {
    setReallocationPlan(item);
    setVehicleIndex(0);
    setShowHistory(false);
  };

  const handleMarkDelivered = async (dispatchId) => {
    if (!dispatchId) return;
    const res = await updateReallocationStatus(dispatchId, "DELIVERED");
    if (res) {
      setReallocationPlan(prev => prev ? { ...prev, status: "DELIVERED" } : null);
    }
  };

  // Dynamically extract all states across India
  const availableStates = ['All', ...Array.from(new Set(facilities.map(f => f.state).filter(Boolean))).sort()];

  // Filter facilities by state and status
  const filteredFacilities = facilities.filter(f => {
    const matchState = selectedState === 'All' || f.state === selectedState;
    const matchStatus = statusFilter === 'All' || 
      (statusFilter === 'Critical Deficit' && f.status === 'Critical Deficit') ||
      (statusFilter === 'Warning' && f.status === 'Warning') ||
      (statusFilter === 'Regional Depot' && (f.status === 'Regional Depot' || f.type === 'District Hospital')) ||
      (statusFilter === 'Optimal' && f.status === 'Optimal');
    return matchState && matchStatus;
  });

  const criticalCount = facilities.filter(f => f.status === 'Critical Deficit').length;
  const warningCount = facilities.filter(f => f.status === 'Warning').length;
  const depotCount = facilities.filter(f => f.status === 'Regional Depot' || f.type === 'District Hospital').length;
  const optimalCount = facilities.filter(f => f.status === 'Optimal').length;

  const getMarkerIcon = (facility) => {
    if (!customIcons) return undefined;
    if (facility.status === 'Critical Deficit') return customIcons.critical;
    if (facility.status === 'Warning') return customIcons.warning;
    if (facility.type === 'District Hospital' || facility.status === 'Regional Depot') return customIcons.warehouse;
    return customIcons.optimal;
  };

  // Normalizing fields from plan
  const donorName = reallocationPlan?.donor_facility_name || reallocationPlan?.selected_donor?.facility_name || reallocationPlan?.donor_facility || "Regional Surplus Depot";
  const targetName = reallocationPlan?.target_facility_name || reallocationPlan?.target_facility?.name || reallocationPlan?.target_facility || "Emergency PHC Node";
  const distanceKm = reallocationPlan?.estimated_distance_km || reallocationPlan?.distance_km || reallocationPlan?.logistics_parameters?.distance_km || reallocationPlan?.selected_donor?.distance_km || 42.5;
  const transitHours = reallocationPlan?.safe_transit_window_hours || reallocationPlan?.logistics_parameters?.safe_transit_window_hours || reallocationPlan?.logistics_parameters?.temperature_holdover_hours || 48.0;
  
  // AI-analyzed dynamic transit ETA and Velocity
  const etaMins = reallocationPlan?.logistics_parameters?.estimated_transit_minutes 
    || reallocationPlan?.estimated_transit_minutes 
    || reallocationPlan?.selected_donor?.estimated_transit_minutes 
    || Math.max(2, Math.round((distanceKm / 36.0) * 60));
  const aiSpeedKmh = reallocationPlan?.logistics_parameters?.ai_average_speed_kmh 
    || reallocationPlan?.ai_average_speed_kmh 
    || Math.round(distanceKm / (Math.max(1, etaMins) / 60.0));

  const routeWaypoints = reallocationPlan?.route_coordinates || [];
  const waypointsCount = routeWaypoints.length;
  const isArrived = waypointsCount > 1 && vehicleIndex >= waypointsCount - 1;
  const transitProgressPercent = waypointsCount > 1 
    ? Math.min(100, Math.round((vehicleIndex / (waypointsCount - 1)) * 100)) 
    : (isArrived ? 100 : 0);
  const remainingEtaMins = isArrived ? 0 : Math.max(0, Math.round(etaMins * (1 - (vehicleIndex / Math.max(1, waypointsCount - 1)))));

  const vehicleCoord = routeWaypoints.length > 0 
    ? routeWaypoints[Math.min(vehicleIndex, routeWaypoints.length - 1)] 
    : null;
  const vehicleType = reallocationPlan?.vehicle_details?.vehicle_type || reallocationPlan?.logistics_parameters?.transport_mode || "Solar-Cooled Emergency Vaccine Van (SDD-ILR)";
  const registrationNo = reallocationPlan?.vehicle_details?.vehicle_id || reallocationPlan?.vehicle_details?.registration_no || "UP-65-MED-8492";
  const driverName = reallocationPlan?.vehicle_details?.driver_name || "Rajesh Kumar Verma";
  const driverContact = reallocationPlan?.vehicle_details?.driver_contact || "+91 94501 28471";
  const medicineName = reallocationPlan?.medicine_details?.name || "Essential Emergency Stock";
  const requestedQty = reallocationPlan?.target_facility?.requested_quantity || reallocationPlan?.quantity || 25;
  const rawStatus = reallocationPlan?.status || "APPROVED & EN ROUTE";
  const dispatchStatus = isArrived ? "ARRIVED & DELIVERED" : (transitProgressPercent > 0 ? `EN ROUTE (${transitProgressPercent}%)` : rawStatus);
  const aiReasoning = reallocationPlan?.ai_reasoning || reallocationPlan?.agent_ai_briefings?.fleet_logistics_assessment;

  if (isLoading && facilities.length === 0) {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Compact Map Control Bar Skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="skeleton w-48 h-6 rounded-lg" />
            <div className="skeleton w-36 h-4 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton w-36 h-7 rounded-lg" />
            <div className="skeleton w-28 h-7 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel p-3 border border-slate-800 space-y-2">
              <div className="skeleton w-36 h-3" />
              <div className="skeleton w-24 h-6" />
              <div className="skeleton w-32 h-3" />
            </div>
          ))}
        </div>
        <div className="glass-panel p-2 h-[560px] rounded-2xl border border-slate-800 flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
          <div className="skeleton w-64 h-4" />
          <div className="skeleton w-44 h-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5">
            <Navigation size={13} className="text-cyan-400" /> 4-Agent Sentinel Routing
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            {facilities.length} Healthcare Nodes &bull; Flood Risk Corridors
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Map Layer Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setMapLayer('google-roadmap')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                mapLayer === 'google-roadmap' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Street
            </button>
            <button
              onClick={() => setMapLayer('google-hybrid')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                mapLayer === 'google-hybrid' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapLayer('google-terrain')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                mapLayer === 'google-terrain' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Terrain
            </button>
          </div>

          {/* Dynamic Pan-India State Selector */}
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 max-w-xs cursor-pointer"
          >
            <option value="All">All India ({facilities.length} Facilities)</option>
            {availableStates.filter(s => s !== 'All').map((stateName) => {
              const count = facilities.filter(f => f.state === stateName).length;
              return (
                <option key={stateName} value={stateName}>
                  {stateName} ({count} Facilities)
                </option>
              );
            })}
          </select>

          {/* AI Sentinel Auto-Relocate Action Button */}
          <button
            onClick={handleTriggerAI}
            disabled={triggeringAI}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Scan network and auto-dispatch nearest surplus to critical deficit"
          >
            {triggeringAI ? <RefreshCw size={13} className="animate-spin" /> : <Bot size={14} className="text-emerald-200" />}
            <span>{triggeringAI ? "AI Scanning..." : "Auto-Relocate (AI)"}</span>
          </button>

          {/* Database History Drawer Toggle */}
          <button
            onClick={handleOpenHistory}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
          >
            <History size={13} className="text-cyan-400" />
            <span>DB Records</span>
          </button>
        </div>
      </div>

      {/* Live Status Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter(statusFilter === 'Critical Deficit' ? 'All' : 'Critical Deficit')}
          className={`glass-panel p-3 text-left transition-all border ${
            statusFilter === 'Critical Deficit' ? 'border-rose-500 bg-rose-500/15 ring-2 ring-rose-500/30' : 'border-rose-500/30 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
              <ShieldAlert size={13} /> Critical Stockout Emergency
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          </div>
          <p className="text-xl font-black text-white mt-1">{criticalCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Deficit &le; 3 days &bull; Auto-relocate targets</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'Warning' ? 'All' : 'Warning')}
          className={`glass-panel p-3 text-left transition-all border ${
            statusFilter === 'Warning' ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30' : 'border-amber-500/30 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
              <AlertTriangle size={13} /> Depleting Buffer Warning
            </span>
          </div>
          <p className="text-xl font-black text-white mt-1">{warningCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Supply 4&ndash;7 days remaining</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'Regional Depot' ? 'All' : 'Regional Depot')}
          className={`glass-panel p-3 text-left transition-all border ${
            statusFilter === 'Regional Depot' ? 'border-cyan-500 bg-cyan-500/15 ring-2 ring-cyan-500/30' : 'border-cyan-500/30 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
              <Building2 size={13} /> Regional Surplus Depots
            </span>
          </div>
          <p className="text-xl font-black text-white mt-1">{depotCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Equipped with Cold ILR Vans</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'Optimal' ? 'All' : 'Optimal')}
          className={`glass-panel p-3 text-left transition-all border ${
            statusFilter === 'Optimal' ? 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30' : 'border-emerald-500/30 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <ShieldCheck size={13} /> Optimal Buffer Centers
            </span>
          </div>
          <p className="text-xl font-black text-white mt-1">{optimalCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">&gt; 14 days stock resilience</p>
        </button>
      </div>

      {/* Main Map Canvas Area */}
      <div className="glass-panel p-2 h-[600px] rounded-2xl border border-slate-800 relative overflow-hidden shadow-2xl">
        {isClient ? (
          <MapContainer
            center={[22.5937, 78.9629]}
            zoom={5}
            className="w-full h-full rounded-xl"
            zoomControl={true}
          >
            <TileLayer
              url={tileUrls[mapLayer].url}
              attribution={tileUrls[mapLayer].attribution}
            />

            {/* Render Network Facilities */}
            {filteredFacilities.map((fac) => (
              <Marker
                key={fac.id}
                position={[fac.lat, fac.lng]}
                icon={getMarkerIcon(fac)}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-2 space-y-2 text-slate-100 min-w-[220px]">
                    <div className="border-b border-slate-800 pb-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider">
                          {fac.id}
                        </span>
                        <span className="text-[10px] text-slate-400">{fac.type}</span>
                      </div>
                      <h4 className="font-bold text-white text-sm mt-0.5 leading-snug">{fac.name}</h4>
                      <p className="text-xs text-slate-400">{fac.district}, {fac.state}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-1">
                      <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Supply Window</span>
                        <span className={`font-bold ${fac.medicine_days_of_supply <= 3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {fac.medicine_days_of_supply || 14} days
                        </span>
                      </div>
                      <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Cold Storage</span>
                        <span className="font-bold text-cyan-300">
                          {fac.coldChainType || 'ILR Solar'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-800/80">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        fac.status === 'Critical Deficit' 
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm' 
                          : fac.status === 'Warning'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : fac.type === 'District Hospital' || fac.status === 'Regional Depot'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {fac.status}
                      </span>
                      <button
                        onClick={() => onSelectFacility && onSelectFacility(fac)}
                        className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition-all shadow-md shadow-cyan-500/20 hover:scale-[1.02] flex items-center gap-1 shrink-0"
                      >
                        <span>Dispatch Corridor</span>
                        <span>&rarr;</span>
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Render Road Corridor Polyline - Google Maps Navigation Style */}
            {reallocationPlan && routeWaypoints.length > 0 && (
              <>
                {/* Outer casing / road edge shadow */}
                <Polyline
                  positions={routeWaypoints}
                  pathOptions={{
                    color: '#0f172a',
                    weight: 8,
                    opacity: 0.7,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
                {/* Main navigation corridor (Google Maps blue road route) */}
                <Polyline
                  positions={routeWaypoints}
                  pathOptions={{
                    color: '#0284c7',
                    weight: 5,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
                {/* Active navigation pulse dashes */}
                <Polyline
                  positions={routeWaypoints}
                  pathOptions={{
                    color: '#38bdf8',
                    weight: 3,
                    dashArray: '6, 10',
                    opacity: 0.9,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
              </>
            )}

            {/* Render Live Vehicle Marker along route */}
            {vehicleCoord && vehicleIcon && (
              <Marker 
                position={vehicleCoord} 
                icon={isArrived ? (vehicleIcon.arrived || vehicleIcon) : (vehicleIcon.inTransit || vehicleIcon)}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-2 space-y-1.5 text-xs text-slate-100 min-w-[200px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                      <span className="font-bold text-cyan-400 flex items-center gap-1">
                        <Truck size={13} /> {isArrived ? "Delivered at Destination" : "Active Dispatch Carrier"}
                      </span>
                      <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-mono px-1.5 py-0.5 rounded">
                        {aiSpeedKmh} km/h (AI)
                      </span>
                    </div>
                    <p className="font-semibold text-white">{vehicleType}</p>
                    <p className="text-[11px] text-slate-400">Reg: <span className="text-slate-200 font-mono">{registrationNo}</span></p>
                    <p className="text-[11px] text-slate-400">Driver: <span className="text-white">{driverName}</span> ({driverContact})</p>
                    <div className="pt-1 border-t border-slate-800 text-[11px] flex justify-between">
                      <span className="text-emerald-400 font-bold">Cargo: 3.4°C Safe</span>
                      <span className="text-cyan-300 font-bold">{isArrived ? "Arrived at PHC" : `ETA: ~${remainingEtaMins}m`}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Initializing Pan-India Google Maps Engine...
          </div>
        )}

        {/* Floating Comprehensive Logistics HUD Card */}
        {reallocationPlan && (
          <div className="absolute bottom-6 left-6 z-[1000] glass-panel p-4 max-w-md w-[calc(100%-3rem)] sm:w-auto border border-cyan-500/50 bg-slate-950/95 shadow-2xl backdrop-blur-md rounded-2xl space-y-3 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <Truck size={15} /> Active Stock Rebalancing Corridor
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isArrived || dispatchStatus === 'DELIVERED' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}>
                  {dispatchStatus}
                </span>
                <button 
                  onClick={() => setReallocationPlan(null)}
                  className="text-slate-400 hover:text-white text-sm leading-none p-1"
                  title="Close Corridor"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Corridor Nodes Flow */}
            <div className="grid grid-cols-7 items-center gap-2 text-xs bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <div className="col-span-3">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Surplus Donor</span>
                <p className="font-bold text-white truncate text-xs">{donorName}</p>
                <span className="text-[10px] text-slate-400">Hub Dispatch Center</span>
              </div>
              <div className="col-span-1 flex flex-col items-center justify-center text-cyan-400">
                <ArrowRight size={16} />
              </div>
              <div className="col-span-3 text-right">
                <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">Emergency PHC</span>
                <p className="font-bold text-white truncate text-xs">{targetName}</p>
                <span className="text-[10px] text-slate-400">Deficit Recipient</span>
              </div>
            </div>

            {/* Live Navigation Progress */}
            {waypointsCount > 1 && (
              <div className="space-y-1 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Navigation size={10} className="text-cyan-400" /> Route Progress
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {transitProgressPercent}% &bull; {isArrived ? "Delivered at Destination" : `Waypoint ${vehicleIndex + 1}/${waypointsCount}`}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 rounded-full ${
                      isArrived 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    }`}
                    style={{ width: `${transitProgressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* 3 Core Logistics Metrics: Vehicle Distance, Transit ETA, Cargo Specs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl">
                <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                  <Gauge size={11} className="text-cyan-400" /> Vehicle Distance
                </div>
                <p className="text-base font-extrabold text-white mt-0.5">
                  {distanceKm} <span className="text-[11px] font-normal text-slate-400">km</span>
                </p>
                <span className="text-[9px] text-cyan-400 font-mono">Road Network</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl">
                <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                  <Clock size={11} className="text-emerald-400" /> {isArrived ? "Trip Completed" : "Transit ETA"}
                </div>
                <p className="text-base font-extrabold text-white mt-0.5">
                  {isArrived ? 0 : remainingEtaMins} <span className="text-[11px] font-normal text-slate-400">mins</span>
                </p>
                <span className="text-[9px] text-emerald-400 font-mono">~{aiSpeedKmh} km/h (AI Fleet)</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl">
                <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                  <Thermometer size={11} className="text-indigo-400" /> Safe Holdover
                </div>
                <p className="text-base font-extrabold text-white mt-0.5">
                  {transitHours} <span className="text-[11px] font-normal text-slate-400">hrs</span>
                </p>
                <span className="text-[9px] text-indigo-400 font-mono">2&ndash;8°C Cold ILR</span>
              </div>
            </div>

            {/* Carrier & Driver Info */}
            <div className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300">
                  <Truck size={14} />
                </div>
                <div>
                  <p className="font-semibold text-white text-[11px]">{vehicleType}</p>
                  <p className="text-[10px] text-slate-400">Driver: {driverName} &bull; <span className="text-cyan-300">{driverContact}</span></p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Payload</span>
                <span className="text-xs font-bold text-white">{requestedQty} Units</span>
              </div>
            </div>

            {/* AI Agent Decision Reasoning */}
            {aiReasoning && (
              <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-2.5 text-[11px] text-cyan-200">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                    <Bot size={13} className="text-cyan-400" />
                    <span>Google Cloud Vertex AI Supervisor</span>
                  </div>
                  {reallocationPlan?.holdover_safety_factor && (
                    <span className="text-[9px] font-mono bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">
                      Safety Margin: {reallocationPlan.holdover_safety_factor}x
                    </span>
                  )}
                </div>
                <p className="italic leading-relaxed">{aiReasoning}</p>

                {/* Toggle MCP Agentic Trace */}
                {reallocationPlan?.execution_trace && reallocationPlan.execution_trace.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-cyan-500/20">
                    <button
                      onClick={() => setShowTrace(!showTrace)}
                      className="text-[10px] font-bold text-cyan-300 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <Sparkles size={11} className="text-cyan-400" />
                      <span>{showTrace ? "Hide Agentic Trace & MCP Tools ▲" : "Inspect Agentic Trace & MCP Tools ▼"}</span>
                    </button>

                    {showTrace && (
                      <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {reallocationPlan.execution_trace.map((step) => (
                          <div key={step.step_number} className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-lg text-[10px] space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                Step {step.step_number}: {step.agent_name}
                              </span>
                              <span className="text-[9px] font-mono text-cyan-400">{step.duration_ms}ms</span>
                            </div>
                            <div className="text-slate-400 text-[9px] flex items-center gap-1">
                              <span className="text-cyan-300 font-mono">mcp:{step.mcp_tool_called}</span>
                            </div>
                            <p className="text-slate-300 text-[10px] leading-tight">{step.action_summary}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="flex gap-2 pt-1">
              {isArrived && (
                <button
                  onClick={handleReplayTransit}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-1.5"
                  title="Replay Route Transit Animation"
                >
                  <RotateCcw size={13} />
                  <span>Replay Transit</span>
                </button>
              )}
              {dispatchStatus !== 'DELIVERED' && (
                <button
                  onClick={() => handleMarkDelivered(reallocationPlan?.dispatch_id)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={13} />
                  <span>Mark as Delivered</span>
                </button>
              )}
              <button
                onClick={() => setReallocationPlan(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2 px-3 rounded-xl transition-all"
              >
                Dismiss HUD
              </button>
            </div>
          </div>
        )}

        {/* Database History Drawer Modal */}
        {showHistory && (
          <div className="absolute inset-y-0 right-0 z-[1100] w-full sm:w-96 glass-panel border-l border-cyan-500/40 bg-slate-950/98 shadow-2xl p-4 flex flex-col animate-slide-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History size={16} className="text-cyan-400" />
                <h4 className="font-bold text-white text-sm">Reallocation Database Ledger</h4>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 mb-3">
              Persistent records retrieved from SQLite &amp; Firebase dual-synced database.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-2 text-slate-400">
                  <RefreshCw size={20} className="animate-spin text-cyan-400" />
                  <span className="text-xs">Querying database records...</span>
                </div>
              ) : historyRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No previous dispatch records found.
                </div>
              ) : (
                historyRecords.map((item) => (
                  <div
                    key={item.dispatch_id}
                    onClick={() => handleSelectHistoryItem(item)}
                    className="p-3 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 rounded-xl cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold truncate max-w-[170px]">
                        {item.dispatch_id}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        item.status === 'DELIVERED' 
                          ? 'bg-emerald-500/20 text-emerald-300' 
                          : 'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-white truncate">
                        <span>{item.donor_facility_name}</span>
                        <ArrowRight size={12} className="text-cyan-400 shrink-0" />
                        <span>{item.target_facility_name}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Drug: <span className="text-slate-200">{item.medicine_details?.name}</span> ({item.target_facility?.requested_quantity || 25} units)
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
                      <span>Dist: <strong className="text-white">{item.estimated_distance_km || item.distance_km || 0} km</strong></span>
                      <span className="text-cyan-400 group-hover:underline flex items-center gap-0.5">
                        Load Map Route &rarr;
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
