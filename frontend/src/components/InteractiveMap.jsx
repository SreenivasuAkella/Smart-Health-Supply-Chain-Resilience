'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Navigation, Truck, RefreshCw, Layers, ShieldCheck, AlertCircle, Building2, Phone } from 'lucide-react';
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

export default function InteractiveMap({ facilities = [], activeReallocation, onSelectFacility }) {
  const [isClient, setIsClient] = useState(false);
  const [selectedState, setSelectedState] = useState('All');
  const [reallocationPlan, setReallocationPlan] = useState(activeReallocation || null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [customIcons, setCustomIcons] = useState(null);

  useEffect(() => {
    setIsClient(true);
    // Initialize Leaflet Icons on Client
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const createCustomIcon = (color) => {
        return L.divIcon({
          className: 'custom-pin',
          html: `<div style="background-color: ${color}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 12px ${color};"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });
      };

      setCustomIcons({
        critical: createCustomIcon('#f43f5e'),
        optimal: createCustomIcon('#10b981'),
        warning: createCustomIcon('#f59e0b'),
        warehouse: createCustomIcon('#38bdf8')
      });
    }
  }, []);

  const handleSimulateRoute = async (facilityId, medId = "MED-ASV-001") => {
    setLoadingRoute(true);
    const plan = await optimizeReallocationPlan(facilityId, medId, 25);
    setReallocationPlan(plan);
    setLoadingRoute(false);
  };

  const filteredFacilities = selectedState === 'All' 
    ? facilities 
    : facilities.filter(f => f.state === selectedState);

  const getMarkerIcon = (facility) => {
    if (!customIcons) return undefined;
    if (facility.type === 'Regional Warehouse') return customIcons.warehouse;
    if (facility.status === 'Critical Deficit') return customIcons.critical;
    if (facility.status === 'Warning') return customIcons.warning;
    return customIcons.optimal;
  };

  return (
    <div className="space-y-4">
      {/* Map Control Bar */}
      <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/15 border border-cyan-500/30 rounded-lg">
            <Navigation size={20} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Geospatial Reallocation & Cold-Chain Routing</h3>
            <p className="text-xs text-slate-400">
              Interactive Google Maps compliant route simulation between surplus hubs and rural deficit clinics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Filter State:</span>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="All">All India (National Grid)</option>
            <option value="Uttar Pradesh">Uttar Pradesh</option>
            <option value="Bihar">Bihar</option>
            <option value="Assam">Assam</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Kerala">Kerala</option>
          </select>

          <button
            onClick={() => handleSimulateRoute("PHC-BARAGAON-03")}
            disabled={loadingRoute}
            className="btn-primary text-xs px-3 py-1.5"
          >
            {loadingRoute ? <RefreshCw size={13} className="animate-spin" /> : <Truck size={13} />}
            <span>Simulate Active Transfer</span>
          </button>
        </div>
      </div>

      {/* Map Viewport */}
      <div className="glass-panel p-2 relative h-[520px] rounded-2xl overflow-hidden border border-slate-800">
        {isClient ? (
          <MapContainer
            center={[25.3176, 82.9739]}
            zoom={6}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
          >
            {/* CartoDB Dark Matter Tiles */}
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a> | Sanjeevani AI'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {filteredFacilities.map((fac) => (
              <Marker
                key={fac.id}
                position={[fac.lat, fac.lng]}
                icon={getMarkerIcon(fac)}
              >
                <Popup>
                  <div className="p-1 space-y-2 text-slate-900 text-xs min-w-[220px]">
                    <div className="font-bold text-sm text-slate-950 flex items-center gap-1">
                      <Building2 size={14} className="text-cyan-600" />
                      {fac.name}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <strong>Type:</strong> {fac.type} | {fac.district}, {fac.state}
                    </div>
                    <div className="text-[11px]">
                      <strong>Cold Storage:</strong> {fac.coldChainType}
                    </div>
                    <div className="text-[11px] flex items-center gap-1 text-slate-700">
                      <Phone size={11} /> {fac.contact}
                    </div>
                    <div className="pt-1 flex items-center justify-between border-t border-slate-200">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        fac.status === 'Critical Deficit' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {fac.status}
                      </span>
                      {fac.status === 'Critical Deficit' && (
                        <button
                          onClick={() => handleSimulateRoute(fac.id)}
                          className="bg-cyan-600 text-white font-semibold text-[10px] px-2 py-1 rounded hover:bg-cyan-700"
                        >
                          Auto Route
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Render Active Transfer Polyline */}
            {reallocationPlan?.route_coordinates && (
              <Polyline
                positions={reallocationPlan.route_coordinates}
                color="#06b6d4"
                weight={4}
                dashArray="6, 8"
              />
            )}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            <RefreshCw className="animate-spin text-cyan-400 mr-2" size={18} />
            Loading Geospatial Network...
          </div>
        )}

        {/* Floating Active Dispatch Slip */}
        {reallocationPlan && (
          <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 glass-panel-glow p-4 space-y-2 z-[1000] border-cyan-500/50">
            <div className="flex items-center justify-between">
              <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <Truck size={12} /> {reallocationPlan.dispatch_id}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold animate-pulse">
                • {reallocationPlan.status}
              </span>
            </div>

            <div className="text-xs text-white font-semibold">
              Emergency Transfer: 25 Vials of Anti-Snake Venom
            </div>

            <div className="text-[11px] text-slate-300 space-y-0.5">
              <div><strong>From (Donor):</strong> {reallocationPlan.selected_donor?.facility_name}</div>
              <div><strong>To (Recipient):</strong> {reallocationPlan.target_facility?.name}</div>
              <div><strong>Transit Distance:</strong> {reallocationPlan.selected_donor?.distance_km} km (Est: {reallocationPlan.selected_donor?.estimated_transit_minutes} mins)</div>
              <div><strong>Cold Box:</strong> WHO PQS Insulated Carrier (Holdover 36h)</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
