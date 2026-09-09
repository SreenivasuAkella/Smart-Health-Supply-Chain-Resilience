'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  MapPin, Navigation, Truck, RefreshCw, Layers, ShieldCheck, 
  AlertCircle, Building2, Phone, Sparkles, ShieldAlert, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { optimizeReallocationPlan } from '../services/api';

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
  const [customIcons, setCustomIcons] = useState(null);

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
          html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 10px ${pulseColor || color};"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
      };

      setCustomIcons({
        critical: createCustomIcon('#f43f5e', '#fb7185'),
        optimal: createCustomIcon('#10b981', '#34d399'),
        warning: createCustomIcon('#f59e0b', '#fbbf24'),
        warehouse: createCustomIcon('#38bdf8', '#0284c7')
      });
    }
  }, []);

  const handleSimulateRoute = async (facilityId = "DH-VAR-001", medId = "PUB-MED-001") => {
    setLoadingRoute(true);
    const plan = await optimizeReallocationPlan(facilityId, medId, 25);
    setReallocationPlan(plan);
    setLoadingRoute(false);
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

  if (isLoading && facilities.length === 0) {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Map Control Bar Skeleton */}
        <div className="glass-panel p-4 border border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="skeleton w-10 h-10 rounded-lg" />
            <div className="space-y-1.5">
              <div className="skeleton w-64 h-5" />
              <div className="skeleton w-48 h-3" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="skeleton w-44 h-8 rounded-lg" />
            <div className="skeleton w-36 h-8 rounded-lg" />
          </div>
        </div>

        {/* 4 Metric Bar Skeletons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel p-3 border border-slate-800 space-y-2">
              <div className="skeleton w-36 h-3" />
              <div className="skeleton w-24 h-6" />
              <div className="skeleton w-32 h-3" />
            </div>
          ))}
        </div>

        {/* Map Viewport Skeleton */}
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
      {/* Map Control Bar */}
      <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/15 border border-cyan-500/30 rounded-lg">
            <Navigation size={20} className="text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">Google Maps Geospatial Rebalancing & Routing</h3>
              <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <Sparkles size={11} /> Google Maps Platform
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live multi-hazard health grid across {facilities.length} healthcare centers & 594 districts
            </p>
          </div>
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
              Google Street
            </button>
            <button
              onClick={() => setMapLayer('google-hybrid')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                mapLayer === 'google-hybrid' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Google Satellite
            </button>
            <button
              onClick={() => setMapLayer('google-terrain')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                mapLayer === 'google-terrain' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Google Terrain
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

          <button
            onClick={() => handleSimulateRoute("DH-VAR-001")}
            disabled={loadingRoute}
            className="btn-primary text-xs px-3 py-1.5"
          >
            {loadingRoute ? <RefreshCw size={13} className="animate-spin" /> : <Truck size={13} />}
            <span>Simulate Active Transfer</span>
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
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
          </div>
          <div className="text-lg font-bold text-white mt-1">{criticalCount} PHC Nodes</div>
          <span className="text-[10px] text-slate-400">&le; 3 Days Medicine Supply Left</span>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'Warning' ? 'All' : 'Warning')}
          className={`glass-panel p-3 text-left transition-all border ${
            statusFilter === 'Warning' ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30' : 'border-amber-500/30 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
              <AlertTriangle size={13} /> Supply Replenishment Alert
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          </div>
          <div className="text-lg font-bold text-white mt-1">{warningCount} PHC Nodes</div>
          <span className="text-[10px] text-slate-400">3 to 7 Days Medicine Buffer</span>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'Regional Depot' ? 'All' : 'Regional Depot')}
          className={`glass-panel p-3 text-left transition-all border ${
            statusFilter === 'Regional Depot' ? 'border-cyan-500 bg-cyan-500/15 ring-2 ring-cyan-500/30' : 'border-cyan-500/30 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
              <Building2 size={13} /> Regional Depot Surplus Hubs
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
          </div>
          <div className="text-lg font-bold text-white mt-1">{depotCount} Civil Hospitals</div>
          <span className="text-[10px] text-slate-400">Surplus Rebalancing Donors (&gt; 18 Days)</span>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'Optimal' ? 'All' : 'Optimal')}
          className={`glass-panel p-3 text-left transition-all border ${
            statusFilter === 'Optimal' ? 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30' : 'border-emerald-500/30 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={13} /> Optimal Buffer PHCs
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-lg font-bold text-white mt-1">{optimalCount} PHC Nodes</div>
          <span className="text-[10px] text-slate-400">&gt; 7 to 14 Days Stable Inventory</span>
        </button>
      </div>

      {/* Map Viewport */}
      <div className="glass-panel p-2 relative h-[560px] rounded-2xl overflow-hidden border border-slate-800">
        {isClient ? (
          <MapContainer
            center={[22.5937, 78.9629]}
            zoom={5}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
          >
            {/* Google Maps Tiles */}
            <TileLayer
              key={mapLayer}
              attribution={tileUrls[mapLayer].attribution}
              url={tileUrls[mapLayer].url}
              maxZoom={20}
            />

            {filteredFacilities.map((fac) => (
              <Marker
                key={fac.id}
                position={[fac.lat, fac.lng]}
                icon={getMarkerIcon(fac)}
              >
                <Popup>
                  <div className="space-y-3 text-slate-100 text-xs min-w-[260px] max-w-[300px]">
                    {/* Header */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                        <Building2 size={16} />
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="font-extrabold text-sm text-white tracking-tight leading-tight">
                          {fac.name}
                        </h4>
                        <span className="text-[11px] text-cyan-300/90 font-medium">
                          {fac.type} &bull; {fac.district}, {fac.state}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Bed Capacity:</span>
                        <strong className="text-slate-100 font-semibold">{fac.bedCapacity} ({fac.oxygenBedsAvailable || 0} O2 &bull; {fac.icuBedsAvailable || 0} ICU)</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Cold Chain:</span>
                        <span className="text-cyan-300 font-mono text-[10px] truncate max-w-[150px] text-right" title={fac.coldChainType}>
                          {fac.coldChainType}
                        </span>
                      </div>
                      {fac.contact && (
                        <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/80">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Phone size={10} /> Contact:
                          </span>
                          <span className="font-mono text-[10px] text-slate-200">{fac.contact}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
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
                        <span>Rebalance Stock</span>
                        <span>&rarr;</span>
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Render Simulated Reallocation Route if active */}
            {reallocationPlan && reallocationPlan.route_coordinates && (
              <Polyline
                positions={reallocationPlan.route_coordinates}
                color="#06b6d4"
                weight={4}
                dashArray="6, 8"
              />
            )}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Initializing Pan-India Google Maps Engine...
          </div>
        )}

        {/* Floating Route Info Box */}
        {reallocationPlan && (
          <div className="absolute bottom-6 left-6 z-[1000] glass-panel p-4 max-w-sm border border-cyan-500/40 bg-slate-950/90 shadow-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                <Truck size={14} /> Active Stock Rebalancing Corridor
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">
                Verified
              </span>
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <div>
                <strong>Donor Node:</strong> {reallocationPlan.donor_facility_name || "Regional Surplus Depot"}
              </div>
              <div>
                <strong>Target Facility:</strong> {reallocationPlan.target_facility_name || "Emergency PHC Node"}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                <span>Distance: <strong className="text-white">{reallocationPlan.estimated_distance_km || 42.5} km</strong></span>
                <span>Transit Window: <strong className="text-emerald-400">{reallocationPlan.safe_transit_window_hours || 4.2} hrs</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
