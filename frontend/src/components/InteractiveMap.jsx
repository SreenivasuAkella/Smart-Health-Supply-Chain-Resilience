'use client';
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  MapPin, Navigation, Truck, RefreshCw, Layers, ShieldCheck, 
  AlertCircle, Building2, Phone, Sparkles, ShieldAlert, AlertTriangle, 
  CheckCircle2, Bot, History, X, Clock, ArrowRight, Gauge, Thermometer,
  RotateCcw, Maximize2, Minimize2, Database
} from 'lucide-react';
import { 
  optimizeReallocationPlan, 
  triggerAutoRelocationAgent, 
  fetchReallocationHistory, 
  updateReallocationStatus,
  fetchActiveReallocations,
  fetchReallocationMetrics,
  dispatchFleet 
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

// Dynamic import of Leaflet resizer controller
const MapResizer = dynamic(
  () => import('react-leaflet').then((mod) => {
    const { useMap } = mod;
    return function MapResizerComponent({ isFullscreen }) {
      const map = useMap();
      useEffect(() => {
        const resize = () => {
          try {
            map.invalidateSize();
          } catch (e) {}
        };
        resize();
        const t1 = setTimeout(resize, 80);
        const t2 = setTimeout(resize, 250);
        const t3 = setTimeout(resize, 600);
        window.addEventListener('resize', resize);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
          window.removeEventListener('resize', resize);
        };
      }, [isFullscreen, map]);
      return null;
    };
  }),
  { ssr: false }
);

export const getVehicleStyle = (vehicleType = '', index = 0) => {
  const v = (vehicleType || '').toLowerCase();

  // 1. Autonomous eVTOL Drone
  if (v.includes('drone') || v.includes('vtol') || v.includes('uas') || v.includes('aerial')) {
    return {
      color: '#06b6d4',
      border: '#22d3ee',
      dash: '8, 8',
      isAerial: true,
      label: 'Autonomous Medical Drone',
      code: 'DRONE',
      iconSvg: (stroke) => `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <!-- Central Drone Pod -->
          <circle cx="12" cy="12" r="3.2" fill="${stroke}" fill-opacity="0.3"/>
          <path d="M12 10.5v3M10.5 12h3" stroke="#ffffff" stroke-width="1.8"/>
          <!-- 4 Rotor Arms -->
          <line x1="5.5" y1="5.5" x2="9.8" y2="9.8" stroke-width="1.8"/>
          <line x1="18.5" y1="5.5" x2="14.2" y2="9.8" stroke-width="1.8"/>
          <line x1="5.5" y1="18.5" x2="9.8" y2="14.2" stroke-width="1.8"/>
          <line x1="18.5" y1="18.5" x2="14.2" y2="14.2" stroke-width="1.8"/>
          <!-- 4 Spinning Rotor Discs -->
          <ellipse cx="4.5" cy="4.5" rx="3.5" ry="1.8" stroke="${stroke}" stroke-width="1.8"/>
          <ellipse cx="19.5" cy="4.5" rx="3.5" ry="1.8" stroke="${stroke}" stroke-width="1.8"/>
          <ellipse cx="4.5" cy="19.5" rx="3.5" ry="1.8" stroke="${stroke}" stroke-width="1.8"/>
          <ellipse cx="19.5" cy="19.5" rx="3.5" ry="1.8" stroke="${stroke}" stroke-width="1.8"/>
        </svg>
      `
    };
  }

  // 2. Solar-Cooled Vaccine Van (SDD-ILR)
  if (v.includes('van') || v.includes('ilr') || v.includes('sdd') || v.includes('solar')) {
    return {
      color: '#10b981',
      border: '#34d399',
      dash: '8, 12',
      label: 'Solar-Cooled ILR Van',
      code: 'VAN',
      iconSvg: (stroke) => `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <!-- Van Body -->
          <path d="M2.5 6.5h11v10.5h-11z" fill="${stroke}" fill-opacity="0.2"/>
          <path d="M13.5 8.5h4.2l2.8 3.5v5h-7"/>
          <!-- Solar Roof Grid -->
          <line x1="4.5" y1="4.5" x2="11.5" y2="4.5" stroke="#34d399" stroke-width="1.8"/>
          <line x1="8" y1="3.5" x2="8" y2="5.5" stroke="#34d399" stroke-width="1.8"/>
          <!-- Cold Cross -->
          <path d="M8 9.5v4M6 11.5h4" stroke="${stroke}" stroke-width="1.8"/>
          <!-- Wheels -->
          <circle cx="6.5" cy="17.5" r="2" fill="#090e17" stroke="${stroke}" stroke-width="2"/>
          <circle cx="17.5" cy="17.5" r="2" fill="#090e17" stroke="${stroke}" stroke-width="2"/>
        </svg>
      `
    };
  }

  // 3. Rapid Motorbike Carrier
  if (v.includes('bike') || v.includes('moto')) {
    return {
      color: '#f59e0b',
      border: '#fbbf24',
      dash: '6, 10',
      label: 'Rapid Motorbike Carrier',
      code: 'MOTO',
      iconSvg: (stroke) => `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <!-- Wheels -->
          <circle cx="5" cy="17" r="2.8" fill="#090e17" stroke="${stroke}" stroke-width="2"/>
          <circle cx="19" cy="17" r="2.8" fill="#090e17" stroke="${stroke}" stroke-width="2"/>
          <!-- Bike Frame -->
          <path d="M5 17l4-5.5h5l4 5.5" stroke-width="2"/>
          <path d="M9 11.5l2.5-4.5h3" stroke-width="2"/>
          <!-- Rear Cold Box -->
          <rect x="3.5" y="8" width="4" height="4" rx="1" fill="${stroke}" fill-opacity="0.35" stroke="${stroke}" stroke-width="1.6"/>
        </svg>
      `
    };
  }

  // 4. Deep-Cold Cryo Carrier
  if (v.includes('cryo') || v.includes('freeze') || v.includes('ultra')) {
    return {
      color: '#a855f7',
      border: '#c084fc',
      dash: '8, 12',
      label: 'Deep-Cold Cryo Carrier',
      code: 'CRYO',
      iconSvg: (stroke) => `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <!-- Cryo Snowflake / Cold-Chain Symbol -->
          <line x1="12" y1="2.5" x2="12" y2="21.5"/>
          <line x1="2.5" y1="12" x2="21.5" y2="12"/>
          <path d="m19 16-3-4 3-4M5 8l3 4-3 4M16 5l-4 3-4-3M8 19l4-3 4 3"/>
          <circle cx="12" cy="12" r="2.5" fill="${stroke}"/>
        </svg>
      `
    };
  }

  // 5. District Emergency Ambulance
  if (v.includes('amb') || v.includes('emergency')) {
    return {
      color: '#ef4444',
      border: '#f87171',
      dash: '5, 9',
      label: 'District Ambulance Transfer',
      code: 'AMB',
      iconSvg: (stroke) => `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <!-- Ambulance Body -->
          <path d="M2.5 7h12v10h-12z" fill="${stroke}" fill-opacity="0.2"/>
          <path d="M14.5 9h4l3 3.5V17h-7"/>
          <!-- Rooftop Siren Light -->
          <rect x="8.5" y="4.5" width="3" height="2" rx="0.5" fill="#ef4444" stroke="#f87171" stroke-width="1.4"/>
          <!-- Medical Cross -->
          <path d="M8.5 10v4M6.5 12h4" stroke="#ffffff" stroke-width="2"/>
          <!-- Wheels -->
          <circle cx="6.5" cy="17" r="2" fill="#090e17" stroke="${stroke}" stroke-width="2"/>
          <circle cx="17.5" cy="17" r="2" fill="#090e17" stroke="${stroke}" stroke-width="2"/>
        </svg>
      `
    };
  }

  // 6. Zero-Emission Electric Medical Courier
  if (v.includes('elec') || v.includes('ev') || v.includes('courier')) {
    return {
      color: '#38bdf8',
      border: '#7dd3fc',
      dash: '7, 11',
      label: 'Electric Medical Courier',
      code: 'ELEC',
      iconSvg: (stroke) => `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <!-- Vehicle Profile -->
          <path d="M3 9a2 2 0 0 1 2-2h9l4 3 3 1v6H3V9z" fill="${stroke}" fill-opacity="0.2"/>
          <!-- Lightning Energy Bolt -->
          <polygon points="12 4 8 11 12 11 10 17 16 9 12 9 14 4" fill="${stroke}" stroke="${stroke}" stroke-width="1"/>
          <!-- Wheels -->
          <circle cx="6.5" cy="17" r="2" fill="#090e17" stroke="${stroke}" stroke-width="2"/>
          <circle cx="17.5" cy="17" r="2" fill="#090e17" stroke="${stroke}" stroke-width="2"/>
        </svg>
      `
    };
  }

  // Fallback / Mutual-Aid Carrier
  const palette = [
    { color: '#10b981', border: '#34d399', label: 'Solar-Cooled Vaccine Van' },
    { color: '#06b6d4', border: '#22d3ee', label: 'Autonomous Medical Drone' },
    { color: '#f59e0b', border: '#fbbf24', label: 'Rapid Motorbike Carrier' },
    { color: '#a855f7', border: '#c084fc', label: 'Deep-Cold Cryo Carrier' }
  ];
  const choice = palette[index % palette.length];
  return {
    color: choice.color,
    border: choice.border,
    dash: '8, 12',
    label: choice.label,
    code: 'FLEET',
    iconSvg: (stroke) => `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 17h4V5H2v12h3"/>
        <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/>
        <circle cx="7.5" cy="17.5" r="2"/>
        <circle cx="17.5" cy="17.5" r="2"/>
      </svg>
    `
  };
};

export function getCorridorWaypoints(corridor) {
  if (!corridor) return [];
  const raw = corridor.route_coordinates || [];
  if (raw.length < 2) return raw;

  const vType = (corridor.vehicle_details?.vehicle_type || corridor.vehicle_type || '').toLowerCase();
  const vId = (corridor.vehicle_details?.vehicle_id || corridor.vehicle_id || '').toLowerCase();
  const isDrone = corridor.is_aerial || corridor.is_drone || vType.includes('drone') || vType.includes('vtol') || vId.includes('drone');

  // Drones fly direct as the crow flies across 3D airspace (never along winding road networks)
  if (isDrone && raw.length > 20) {
    const origin = raw[0];
    const dest = raw[raw.length - 1];
    const numPts = 18;
    const directPts = [];
    for (let i = 0; i < numPts; i++) {
      const frac = i / (numPts - 1);
      directPts.push([
        roundCoord(origin[0] + (dest[0] - origin[0]) * frac),
        roundCoord(origin[1] + (dest[1] - origin[1]) * frac)
      ]);
    }
    return directPts;
  }
  return raw;
}

function roundCoord(val) {
  return Math.round(val * 100000) / 100000;
}

export default function InteractiveMap({ isLoading = false, facilities = [], activeReallocation, onSelectFacility }) {
  const [localFacilities, setLocalFacilities] = useState(facilities || []);

  useEffect(() => {
    if (facilities && facilities.length > 0) {
      setLocalFacilities(facilities);
    }
  }, [facilities]);

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
  const [activeFleet, setActiveFleet] = useState([]);
  const [fleetIndices, setFleetIndices] = useState({});
  const [dispatchingFleet, setDispatchingFleet] = useState(false);
  const lastActiveDispatchIdRef = useRef(null);
  const deliveredDispatchesRef = useRef(new Set());
  const leafletRef = useRef(null);
  
  // History Drawer State
  const [showHistory, setShowHistory] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('ALL');
  const [showTrace, setShowTrace] = useState(false);

  // Fleet Convoys Side Panel State
  const [showFleetPanel, setShowFleetPanel] = useState(false);
  const [fleetFilter, setFleetFilter] = useState('ALL');
  const [reallocationStats, setReallocationStats] = useState(null);

  const refreshStats = async () => {
    try {
      const s = await fetchReallocationMetrics();
      if (s) setReallocationStats(s);
    } catch {}
  };

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen Expansion State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.debug('Native fullscreen request ignored, using fixed overlay:', err);
      }
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.debug('Exit fullscreen exception:', err);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!mapInstance) return;
    const triggerInvalidate = () => {
      try {
        mapInstance.invalidateSize();
      } catch (e) {}
    };
    triggerInvalidate();
    const t1 = setTimeout(triggerInvalidate, 80);
    const t2 = setTimeout(triggerInvalidate, 250);
    const t3 = setTimeout(triggerInvalidate, 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isFullscreen, mapInstance]);

  // Fetch active multi-vehicle fleet & recent history on initial component load
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetchActiveReallocations(),
      fetchReallocationHistory(1000)
    ]).then(([activeList, historyList]) => {
      if (!isMounted) return;
      const combinedMap = new Map();
      (activeList || []).forEach(item => {
        if (item && item.dispatch_id) combinedMap.set(item.dispatch_id, item);
      });
      (historyList || []).forEach(item => {
        if (item && item.dispatch_id && !combinedMap.has(item.dispatch_id)) {
          combinedMap.set(item.dispatch_id, item);
        }
      });
      const merged = Array.from(combinedMap.values());
      if (merged.length > 0) {
        setActiveFleet(merged);
        if (!reallocationPlan) {
          const firstInTransit = merged.find(m => m.status !== 'DELIVERED');
          setReallocationPlan(firstInTransit || merged[0]);
        }
      }
    }).catch(err => console.warn("Initial fleet load notice:", err));
    return () => { isMounted = false; };
  }, []);

  // Sync external activeReallocation prop whenever updated (e.g. from SSE stream)
  useEffect(() => {
    if (activeReallocation) {
      const isNewDispatch = activeReallocation.dispatch_id && activeReallocation.dispatch_id !== lastActiveDispatchIdRef.current;
      setReallocationPlan(activeReallocation);
      setActiveFleet(prev => {
        const exists = prev.some(p => p.dispatch_id === activeReallocation.dispatch_id);
        return exists ? prev.map(p => p.dispatch_id === activeReallocation.dispatch_id ? activeReallocation : p) : [activeReallocation, ...prev];
      });
      if (isNewDispatch) {
        lastActiveDispatchIdRef.current = activeReallocation.dispatch_id;
        setVehicleIndex(0);
        setFleetIndices(prev => ({ ...prev, [activeReallocation.dispatch_id]: 0 }));
      }
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
      leafletRef.current = L;
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const createCustomIcon = (color, pulseColor, hasPredictiveHalo = false) => {
        return L.divIcon({
          className: 'custom-pin',
          html: hasPredictiveHalo ? `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
              <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: rgba(245, 158, 11, 0.45); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 10px ${pulseColor || color};"></div>
            </div>
          ` : `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 12px ${pulseColor || color};"></div>`,
          iconSize: [hasPredictiveHalo ? 22 : 14, hasPredictiveHalo ? 22 : 14],
          iconAnchor: [hasPredictiveHalo ? 11 : 7, hasPredictiveHalo ? 11 : 7]
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
        predictiveAlert: createCustomIcon('#10b981', '#f59e0b', true),
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

  // Dynamic icon generator tailored to vehicle type & arrival state with sharp vehicle logos
  const getDynamicVehicleIcon = (vStyle, arrived = false, label = '') => {
    if (!leafletRef.current) return vehicleIcon?.inTransit;
    const themeColor = arrived ? '#10b981' : (vStyle?.color || '#06b6d4');
    const strokeColor = arrived ? '#34d399' : '#ffffff';
    return leafletRef.current.divIcon({
      className: 'vehicle-marker-wrapper',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 44px; height: 48px; pointer-events: auto;">
          ${label ? `<div style="font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 800; color: #fff; background: rgba(9, 14, 23, 0.95); border: 1.5px solid ${themeColor}; padding: 0.5px 5px; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.6); white-space: nowrap; margin-bottom: 2px;">${label}</div>` : ''}
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
            ${!arrived ? `<div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: ${themeColor}40; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : `<div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(16, 185, 129, 0.25);"></div>`}
            <div style="width: 30px; height: 30px; border-radius: 50%; background: #090e17; border: 2px solid ${themeColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px ${themeColor}aa, 0 4px 10px rgba(0,0,0,0.7); z-index: 2;">
              ${arrived ? `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              ` : (vStyle?.iconSvg ? vStyle.iconSvg(strokeColor) : '')}
            </div>
          </div>
        </div>
      `,
      iconSize: [44, 48],
      iconAnchor: [22, label ? 34 : 24]
    });
  };

  // Turn-by-turn road navigation engine for all active fleet corridors simultaneously
  useEffect(() => {
    if (!activeFleet || activeFleet.length === 0) return;

    const timer = setInterval(() => {
      setFleetIndices(prev => {
        let hasChanges = false;
        const next = { ...prev };

        activeFleet.forEach(plan => {
          const dispId = plan.dispatch_id;
          if (!dispId) return;
          const waypoints = getCorridorWaypoints(plan);
          if (waypoints.length < 2) return;
          const count = waypoints.length;

          // If already marked delivered, ensure pin is at destination
          if (plan.status === 'DELIVERED') {
            if (next[dispId] !== count - 1) {
              next[dispId] = count - 1;
              hasChanges = true;
            }
            return;
          }

          const cur = next[dispId] ?? 0;
          if (cur < count - 1) {
            const nextIdx = cur + 1;
            next[dispId] = nextIdx;
            hasChanges = true;

            // Trigger two-node delivery handshake when destination is reached
            if (nextIdx >= count - 1) {
              if (!deliveredDispatchesRef.current.has(dispId)) {
                deliveredDispatchesRef.current.add(dispId);
                const targetId = plan.target_facility?.id || plan.target_facility_id;
                const donorId = plan.selected_donor?.facility_id || plan.donor_facility_id;
                const qty = Number(plan.quantity || plan.target_facility?.requested_quantity || 25);
                handleMarkDelivered(dispId, targetId, donorId, qty);
              }
            }
          }
        });

        return hasChanges ? next : prev;
      });
    }, 1200); // 1.2s per waypoint step for realistic operational velocity (18-25s per mission)

    return () => clearInterval(timer);
  }, [activeFleet]);

  // Continuous patient consumption decay engine:
  // Models real-world OPD outpatient footfall and clinical medicine burn rate over time
  // Maintains a dynamic supply-demand equilibrium so red deficit dots never fully vanish
  useEffect(() => {
    const decayInterval = setInterval(() => {
      setLocalFacilities(prevList => {
        let changed = false;
        const now = Date.now();
        const criticalCount = prevList.filter(f => f.status === 'Critical Deficit').length;
        // Keep a sustained baseline of ~25-35 emergency stockout nodes for active fleet resilience
        const needMoreCritical = criticalCount < 28;

        const updated = prevList.map(fac => {
          // District Hospitals and Regional Depots maintain bulk statutory central reserves
          if (fac.status === 'Regional Depot' || fac.type === 'District Hospital') {
            return fac;
          }

          // If facility was just replenished within the last 18 seconds, respect the delivery grace window
          if (fac._justDelivered && fac._deliveredAt && (now - fac._deliveredAt < 18000)) {
            return fac;
          }

          const currentDos = Number(fac.medicine_days_of_supply || 5.0);
          if (currentDos <= 0.8) return fac; // Hard floor at 0.8 days

          // Daily patient footfall drives the clinical consumption decay
          const footfall = Number(fac.dailyPatientFootfall || 45);
          // Increased burn rate: ~0.15 to 0.35 days of supply consumed per 5-second cycle
          let burnStep = Math.max(0.15, Math.round(((footfall / 150.0) * 0.25) * 10) / 10);
          if (needMoreCritical && fac.status === 'Warning' && currentDos <= 4.8) {
            burnStep += 0.2; // Clinical surge pushes vulnerable warnings into deficit so red dots stay active
          }

          const nextDos = Math.max(0.8, Math.round((currentDos - burnStep) * 10) / 10);

          if (nextDos === currentDos) return fac;
          changed = true;

          // Recalculate status based on decayed Days of Supply:
          // <= 3.0 days = Critical Deficit (Red)
          // 3.1 - 7.0 days = Depleting Buffer Warning (Yellow)
          // > 7.0 days = Optimal Buffer (Green)
          const newStatus = nextDos <= 3.0 ? "Critical Deficit" : (nextDos <= 7.0 ? "Warning" : "Optimal");

          return {
            ...fac,
            medicine_days_of_supply: nextDos,
            status: newStatus,
            _justDelivered: false
          };
        });

        return changed ? updated : prevList;
      });
    }, 5000); // 5-second accelerated operational decay cycle to sustain active red dots

    return () => clearInterval(decayInterval);
  }, []);

  const handleReplayTransit = (corridorToReplay) => {
    const plan = corridorToReplay || reallocationPlan;
    const waypoints = getCorridorWaypoints(plan);
    if (!waypoints || waypoints.length < 2) return;
    const dispId = plan.dispatch_id;
    if (dispId) {
      deliveredDispatchesRef.current.delete(dispId);
      setFleetIndices(prev => ({ ...prev, [dispId]: 0 }));
      setReallocationPlan(plan);
      setActiveFleet(prev => prev.map(p => p.dispatch_id === dispId ? { ...p, status: "IN_TRANSIT" } : p));
    }
  };

  const isCorridorDelivered = (c) => {
    if (!c) return false;
    if (c.status === 'DELIVERED') return true;
    const waypts = getCorridorWaypoints(c);
    const curIdx = fleetIndices[c.dispatch_id] ?? 0;
    return waypts.length > 0 && curIdx >= waypts.length - 1;
  };

  const handleSimulateRoute = async (facilityId = "DH-VAR-001", medId = "PUB-MED-001") => {
    setLoadingRoute(true);
    const plan = await optimizeReallocationPlan(facilityId, medId, 25);
    if (plan) {
      setReallocationPlan(plan);
      const targetId = plan.target_facility?.id || plan.target_facility_id;
      // Replace any existing corridor to the exact same destination facility
      setActiveFleet(prev => [
        plan,
        ...prev.filter(p => p.dispatch_id !== plan.dispatch_id && (p.target_facility?.id || p.target_facility_id) !== targetId)
      ]);
      if (plan.dispatch_id) {
        setFleetIndices(prev => ({ ...prev, [plan.dispatch_id]: 0 }));
      }
    }
    setLoadingRoute(false);
  };

  const handleTriggerAI = async () => {
    setTriggeringAI(true);
    const record = await triggerAutoRelocationAgent();
    if (record) {
      setReallocationPlan(record);
      const targetId = record.target_facility?.id || record.target_facility_id;
      // Replace any existing corridor to the exact same destination facility
      setActiveFleet(prev => [
        record,
        ...prev.filter(p => p.dispatch_id !== record.dispatch_id && (p.target_facility?.id || p.target_facility_id) !== targetId)
      ]);
      if (record.dispatch_id) {
        setFleetIndices(prev => ({ ...prev, [record.dispatch_id]: 0 }));
      }
    }
    setTriggeringAI(false);
  };

  const handleDispatchFleet = async () => {
    setDispatchingFleet(true);
    try {
      const records = await dispatchFleet({ auto_multi: true, count: 3 });
      if (records && records.length > 0) {
        // Merge with existing active fleet dispatches without duplicate destination corridors
        setActiveFleet(prev => {
          const map = new Map();
          // Insert new records first
          records.forEach(r => {
            const tgtId = r.target_facility?.id || r.target_facility_id || r.dispatch_id;
            map.set(tgtId, r);
          });
          // Keep previous records whose destination isn't overwritten
          (prev || []).forEach(p => {
            const tgtId = p.target_facility?.id || p.target_facility_id || p.dispatch_id;
            if (!map.has(tgtId)) {
              map.set(tgtId, p);
            }
          });
          return Array.from(map.values());
        });
        setReallocationPlan(records[0]);
        setShowFleetPanel(true);
        setShowHistory(false);
        const newIndices = {};
        records.forEach(r => {
          newIndices[r.dispatch_id] = 0;
          deliveredDispatchesRef.current.delete(r.dispatch_id);
        });
        setFleetIndices(prev => ({ ...prev, ...newIndices }));
      }
    } catch (err) {
      console.error("handleDispatchFleet error:", err);
    }
    setDispatchingFleet(false);
  };


  const handleOpenHistory = async (statusOverride) => {
    setShowHistory(true);
    setShowFleetPanel(false);
    setLoadingHistory(true);
    refreshStats();
    const filterToUse = statusOverride !== undefined ? statusOverride : historyFilter;
    const list = await fetchReallocationHistory(100, filterToUse === 'ALL' ? undefined : filterToUse);
    setHistoryRecords(list || []);
    setLoadingHistory(false);
  };

  const handleSelectHistoryItem = (item) => {
    setReallocationPlan(item);
    setActiveFleet(prev => [item, ...prev.filter(p => p.dispatch_id !== item.dispatch_id)]);
    if (item.dispatch_id) {
      setFleetIndices(prev => ({ ...prev, [item.dispatch_id]: 0 }));
    }
    setShowHistory(false);
    setShowFleetPanel(true);
  };

  const handleMarkDelivered = async (dispatchId, targetFacIdOverride, donorFacIdOverride, qtyOverride) => {
    if (!dispatchId) return;
    const res = await updateReallocationStatus(dispatchId, "DELIVERED");
    if (res) {
      setReallocationPlan(prev => (prev && prev.dispatch_id === dispatchId) ? { ...prev, status: "DELIVERED" } : prev);
      setActiveFleet(prev => prev.map(p => p.dispatch_id === dispatchId ? { ...p, status: "DELIVERED" } : p));
      refreshStats();

      // Complete two-node delivery handshake: flip target facility pin from Red to Green!
      const dispRecord = activeFleet.find(p => p.dispatch_id === dispatchId) || reallocationPlan;
      const targetId = targetFacIdOverride || dispRecord?.target_facility?.id || dispRecord?.target_facility_id;
      const targetName = dispRecord?.target_facility?.name || dispRecord?.target_facility_name;
      const donorId = donorFacIdOverride || dispRecord?.selected_donor?.facility_id || dispRecord?.donor_facility_id;
      const qty = Number(qtyOverride || dispRecord?.quantity || dispRecord?.target_facility?.requested_quantity || 25);

      setLocalFacilities(prevList => prevList.map(fac => {
        const isTarget = (targetId && (fac.id === targetId || fac.id.includes(targetId) || targetId.includes(fac.id))) ||
                         (targetName && fac.name && (fac.name.toLowerCase() === targetName.toLowerCase() || fac.name.toLowerCase().includes(targetName.toLowerCase())));
        if (isTarget) {
          const currentDos = Number(fac.medicine_days_of_supply || 1.5);
          // Realistic consumption burn rate calculation (~3.5 to 5.0 units/day)
          const burnRate = Number(fac.effective_burn_rate || 4.2);
          const addedDos = Math.round((qty / burnRate) * 10) / 10;
          const restoredDos = Math.round((currentDos + addedDos) * 10) / 10;

          // Classify according to standard healthcare resilience thresholds:
          // > 7.0 days = Optimal Buffer (Green)
          // 3.1 to 7.0 days = Warning Buffer (Yellow)
          // <= 3.0 days = Critical Deficit (Red)
          const cappedDos = Math.min(9.5, Math.max(currentDos + 2.5, restoredDos));
          const newStatus = cappedDos > 7.0 ? "Optimal" : (cappedDos > 3.0 ? "Warning" : "Critical Deficit");
          return {
            ...fac,
            status: newStatus,
            medicine_days_of_supply: cappedDos,
            _justDelivered: true,
            _deliveredAt: Date.now()
          };
        }
        if (donorId && fac.id === donorId) {
          const currentDos = Number(fac.medicine_days_of_supply || 18.5);
          return {
            ...fac,
            medicine_days_of_supply: Math.max(12.0, Math.round((currentDos - (qty / 4.0)) * 10) / 10)
          };
        }
        return fac;
      }));

      // Autonomous Multi-Transport Chaining: After 10s operational turnaround & inspection window,
      // pick the next Critical Deficit facility and launch the next transit at realistic pace
      setTimeout(async () => {
        try {
          setLocalFacilities(currentList => {
            const activeTargets = new Set(
              (activeFleet || [])
                .filter(p => p.status !== 'DELIVERED')
                .map(p => p.target_facility?.id || p.target_facility_id)
            );
            if (targetId) activeTargets.add(targetId);

            // Find the next critical deficit facility requiring emergency dispatch
            const nextDeficit = currentList.find(f => 
              f.status === 'Critical Deficit' && !activeTargets.has(f.id)
            );

            if (nextDeficit) {
              const assignedVehType = dispRecord?.vehicle_details?.vehicle_type || dispRecord?.vehicle_type || "Autonomous Medical Drone";
              const isDroneVeh = assignedVehType.toLowerCase().includes('drone') || assignedVehType.toLowerCase().includes('vtol');
              const medToDispatch = isDroneVeh ? "PUB-MED-002" : "PUB-MED-001";

              optimizeReallocationPlan(nextDeficit.id, medToDispatch, 25).then(nextPlan => {
                if (nextPlan && nextPlan.dispatch_id) {
                  const assignedVeh = dispRecord?.vehicle_details || {
                    vehicle_id: `VEH-CHAIN-${Math.floor(Math.random() * 900 + 100)}`,
                    vehicle_type: assignedVehType
                  };
                  nextPlan.vehicle_details = assignedVeh;
                  nextPlan.vehicle_id = assignedVeh.vehicle_id;
                  nextPlan.vehicle_type = assignedVeh.vehicle_type;
                  nextPlan.is_drone = isDroneVeh;
                  nextPlan.is_aerial = isDroneVeh;
                  nextPlan.status = "IN_TRANSIT";

                  // If it's a drone, guarantee the corridor waypoints are direct airspace flight points
                  if (isDroneVeh && nextPlan.route_coordinates && nextPlan.route_coordinates.length > 20) {
                    const orig = nextPlan.route_coordinates[0];
                    const dst = nextPlan.route_coordinates[nextPlan.route_coordinates.length - 1];
                    nextPlan.route_coordinates = Array.from({ length: 18 }, (_, i) => [
                      orig[0] + (dst[0] - orig[0]) * (i / 17),
                      orig[1] + (dst[1] - orig[1]) * (i / 17)
                    ]);
                  }

                  deliveredDispatchesRef.current.delete(nextPlan.dispatch_id);

                  // Keep delivered transit in cumulative activeFleet so full count of all missions is preserved!
                  setActiveFleet(prev => [
                    nextPlan,
                    ...prev.map(p => p.dispatch_id === dispatchId ? { ...p, status: "DELIVERED" } : p)
                      .filter(p => p.dispatch_id !== nextPlan.dispatch_id)
                  ]);
                  setReallocationPlan(nextPlan);
                  setFleetIndices(prev => ({ ...prev, [nextPlan.dispatch_id]: 0 }));
                  refreshStats();
                }
              }).catch(err => console.debug("Auto-chain dispatch error:", err));
            }

            return currentList;
          });
        } catch (chainErr) {
          console.debug("Auto-chain next transit error:", chainErr);
        }
      }, 10000); // 10-second operational turnaround & reloading window
    }
  };

  // Dynamically extract all states across India
  const availableStates = ['All', ...Array.from(new Set(localFacilities.map(f => f.state).filter(Boolean))).sort()];

  // Filter facilities by state and status
  const filteredFacilities = localFacilities.filter(f => {
    if (!f || typeof f.lat !== 'number' || typeof f.lng !== 'number' || isNaN(f.lat) || isNaN(f.lng)) {
      return false;
    }
    const matchState = selectedState === 'All' || f.state === selectedState;
    const matchStatus = statusFilter === 'All' || 
      (statusFilter === 'Critical Deficit' && f.status === 'Critical Deficit') ||
      (statusFilter === 'Warning' && f.status === 'Warning') ||
      (statusFilter === 'Regional Depot' && (f.status === 'Regional Depot' || f.type === 'District Hospital')) ||
      (statusFilter === 'Optimal' && f.status === 'Optimal');
    return matchState && matchStatus;
  });

  const criticalCount = localFacilities.filter(f => f.status === 'Critical Deficit').length;
  const warningCount = localFacilities.filter(f => f.status === 'Warning').length;
  const depotCount = localFacilities.filter(f => f.status === 'Regional Depot' || f.type === 'District Hospital').length;
  const optimalCount = localFacilities.filter(f => f.status === 'Optimal').length;
  const inTransitCount = (activeFleet || []).filter(c => !isCorridorDelivered(c)).length;
  const deliveredCount = (activeFleet || []).filter(c => isCorridorDelivered(c)).length;

  const getMarkerIcon = (facility) => {
    if (!customIcons) return undefined;
    if (facility.status === 'Critical Deficit') return customIcons.critical;
    if (facility.predictive_vulnerability_score > 70 || facility.dengue_surge_risk_pct > 70) {
      return customIcons.predictiveAlert;
    }
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

  const routeWaypoints = getCorridorWaypoints(reallocationPlan);
  const waypointsCount = routeWaypoints.length;
  const curPlanDispId = reallocationPlan?.dispatch_id;
  const activePlanIndex = (curPlanDispId && fleetIndices[curPlanDispId] !== undefined)
    ? fleetIndices[curPlanDispId]
    : vehicleIndex;
  const isPlanDelivered = reallocationPlan?.status === 'DELIVERED';
  const isArrived = isPlanDelivered || (waypointsCount > 1 && activePlanIndex >= waypointsCount - 1);
  const transitProgressPercent = isArrived ? 100 : (waypointsCount > 1 
    ? Math.min(100, Math.round((activePlanIndex / (waypointsCount - 1)) * 100)) 
    : 0);
  const remainingEtaMins = isArrived ? 0 : Math.max(0, Math.round(etaMins * (1 - (activePlanIndex / Math.max(1, waypointsCount - 1)))));

  const vehicleCoord = routeWaypoints.length > 0 
    ? routeWaypoints[Math.min(activePlanIndex, routeWaypoints.length - 1)] 
    : null;
  const vehicleType = reallocationPlan?.vehicle_details?.vehicle_type || reallocationPlan?.logistics_parameters?.transport_mode || "Solar-Cooled Emergency Vaccine Van (SDD-ILR)";
  const registrationNo = reallocationPlan?.vehicle_details?.vehicle_id || reallocationPlan?.vehicle_details?.registration_no || "UP-65-MED-8492";
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
    <div className={
      isFullscreen
        ? "fixed inset-0 z-[50000] bg-slate-950/98 backdrop-blur-2xl flex flex-col p-3 sm:p-4 w-screen h-screen overflow-hidden animate-fade-in"
        : "space-y-4"
    }>
      {/* Compact Map Control Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-2.5 transition-all ${
        isFullscreen
          ? 'bg-slate-900/90 border border-slate-800/90 shadow-2xl shrink-0 backdrop-blur-md mb-2'
          : 'bg-slate-900/60 border border-slate-800/80'
      }`}>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5">
            <Navigation size={13} className="text-cyan-400" /> 
            {isFullscreen ? "Pan-India Sentinel Healthcare Grid" : "4-Agent Sentinel Routing"}
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            {facilities.length} Healthcare Nodes &bull; Flood Risk Corridors
          </span>

          {/* Fullscreen Quick-Filter Metric Pills */}
          {isFullscreen && (
            <div className="hidden xl:flex items-center gap-1.5 ml-2 border-l border-slate-800 pl-3">
              <button
                onClick={() => setStatusFilter(statusFilter === 'Critical Deficit' ? 'All' : 'Critical Deficit')}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border transition-all flex items-center gap-1.5 ${
                  statusFilter === 'Critical Deficit'
                    ? 'bg-rose-500/25 text-rose-300 border-rose-500 ring-1 ring-rose-500/40'
                    : 'bg-slate-900 text-rose-400 border-rose-500/30 hover:bg-slate-800'
                }`}
                title="Filter Critical Deficits"
              >
                <ShieldAlert size={11} /> Emergency: {criticalCount}
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === 'Warning' ? 'All' : 'Warning')}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border transition-all flex items-center gap-1.5 ${
                  statusFilter === 'Warning'
                    ? 'bg-amber-500/25 text-amber-300 border-amber-500 ring-1 ring-amber-500/40'
                    : 'bg-slate-900 text-amber-400 border-amber-500/30 hover:bg-slate-800'
                }`}
                title="Filter Warning Buffers"
              >
                <AlertTriangle size={11} /> Warning: {warningCount}
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === 'Regional Depot' ? 'All' : 'Regional Depot')}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border transition-all flex items-center gap-1.5 ${
                  statusFilter === 'Regional Depot'
                    ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500 ring-1 ring-cyan-500/40'
                    : 'bg-slate-900 text-cyan-400 border-cyan-500/30 hover:bg-slate-800'
                }`}
                title="Filter Regional Surplus Depots"
              >
                <Building2 size={11} /> Surplus: {depotCount}
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === 'Optimal' ? 'All' : 'Optimal')}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border transition-all flex items-center gap-1.5 ${
                  statusFilter === 'Optimal'
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500 ring-1 ring-emerald-500/40'
                    : 'bg-slate-900 text-emerald-400 border-emerald-500/30 hover:bg-slate-800'
                }`}
                title="Filter Optimal Centers"
              >
                <ShieldCheck size={11} /> Optimal: {optimalCount}
              </button>
            </div>
          )}
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

          {/* Autonomous Multi-Vehicle Fleet Corridoring Action Button */}
          <button
            onClick={handleDispatchFleet}
            disabled={dispatchingFleet}
            className="bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:via-indigo-500 hover:to-purple-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Dispatch 3 concurrent vehicles (eVTOL Drone, Solar Van, Motorbike) across critical facilities"
          >
            {dispatchingFleet ? <RefreshCw size={13} className="animate-spin" /> : <Layers size={14} className="text-cyan-200" />}
            <span>{dispatchingFleet ? "Launching Fleet..." : "Launch Fleet (3 Convoys)"}</span>
          </button>

          {/* Database History Drawer Toggle */}
          <button
            onClick={handleOpenHistory}
            className={`border px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              showHistory
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 ring-2 ring-cyan-500/30'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-200'
            }`}
          >
            <History size={13} className="text-cyan-400" />
            <span>DB Records</span>
          </button>

          {/* Fleet Convoys Side Panel Toggle */}
          <button
            onClick={() => {
              setShowFleetPanel(prev => !prev);
              setShowHistory(false);
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer ${
              showFleetPanel
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 ring-2 ring-cyan-500/30'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-white'
            }`}
            title="Toggle Fleet Convoys Side Panel"
          >
            <div className="relative flex items-center">
              <Truck size={13} className={showFleetPanel ? 'text-cyan-300' : 'text-cyan-400'} />
              {inTransitCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              )}
            </div>
            <span>Fleet Convoys</span>
            {inTransitCount > 0 && (
              <span className="bg-cyan-500/20 text-cyan-300 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold border border-cyan-500/30">
                {inTransitCount}
              </span>
            )}
          </button>

          {/* Fullscreen Expand Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm group hover:scale-[1.02] border ${
              isFullscreen
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/50 shadow-rose-500/10'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-white'
            }`}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand Map to Fullscreen"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 size={13} className="text-rose-400 group-hover:scale-110 transition-transform" />
                <span>Exit Fullscreen</span>
                <kbd className="hidden sm:inline bg-rose-950/60 border border-rose-800/60 text-[9px] text-rose-300/90 px-1 py-0.5 rounded font-mono ml-0.5">Esc</kbd>
              </>
            ) : (
              <>
                <Maximize2 size={13} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Status Metric Bar (Shown in Standard View) */}
      {!isFullscreen && (
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
      )}

      {/* Main Map Canvas Area */}
      <div className={`glass-panel p-2 rounded-2xl border border-slate-800 relative overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'flex-1 w-full min-h-0' : 'h-[600px]'
      }`}>
        {/* Floating Quick Action Controls on Map Top-Right */}
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
          {/* Quick Fleet Convoys Side Panel Toggle Button */}
          <button
            onClick={() => {
              setShowFleetPanel(prev => !prev);
              setShowHistory(false);
            }}
            className={`border px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl backdrop-blur-md shadow-2xl transition-all flex items-center gap-2 group hover:scale-105 active:scale-95 cursor-pointer ${
              showFleetPanel
                ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/80 shadow-cyan-500/20 ring-1 ring-cyan-500/30'
                : 'bg-slate-900/90 hover:bg-slate-800/95 text-slate-200 hover:text-white border-slate-700/80 hover:border-cyan-500/70'
            }`}
            title={showFleetPanel ? "Close Fleet Panel" : "Open Fleet Convoys Side Panel"}
          >
            <div className="relative flex items-center">
              <Layers size={15} className="text-cyan-400 group-hover:scale-110 transition-transform" />
              {inTransitCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                </span>
              )}
            </div>
            <span className="text-xs font-bold hidden sm:inline">Fleet Convoys</span>
            {inTransitCount > 0 && (
              <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full font-bold">
                {inTransitCount}
              </span>
            )}
          </button>

          {/* Floating Quick Fullscreen / Exit Button */}
          <button
            onClick={toggleFullscreen}
            className={`border px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl backdrop-blur-md shadow-2xl transition-all flex items-center gap-2 group hover:scale-105 active:scale-95 cursor-pointer ${
              isFullscreen
                ? 'bg-slate-900/90 hover:bg-slate-800/95 text-rose-300 border-rose-500/60 hover:border-rose-400'
                : 'bg-slate-900/90 hover:bg-slate-800/95 text-slate-200 hover:text-white border-slate-700/80 hover:border-cyan-500/70'
            }`}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand Map to Fullscreen"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 size={15} className="text-rose-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-rose-300 hidden sm:inline">Exit Fullscreen</span>
                <kbd className="hidden sm:inline bg-rose-950/80 border border-rose-800 text-[9px] text-rose-300 px-1 py-0.5 rounded font-mono">Esc</kbd>
              </>
            ) : (
              <>
                <Maximize2 size={15} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold hidden sm:inline">Expand Map</span>
              </>
            )}
          </button>
        </div>

        {isClient ? (
          <MapContainer
            ref={setMapInstance}
            center={[22.5937, 78.9629]}
            zoom={5}
            className="w-full h-full rounded-xl"
            zoomControl={true}
          >
            <MapResizer isFullscreen={isFullscreen} />
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

            {/* Render Multi-Vehicle Fleet Corridors and Real-Time Moving Carriers (Showing Latest 25) */}
            {(() => {
              // Sort fleet by newest timestamp first
              const sortedFleet = [...activeFleet].sort((a, b) => {
                const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return tB - tA;
              });

              // Show 25 latest missions on the map (20-30 range) while full list stays in drawer
              let corridorsToRender = sortedFleet.slice(0, 25);
              if (reallocationPlan && !corridorsToRender.some(c => c.dispatch_id === reallocationPlan.dispatch_id)) {
                corridorsToRender = [reallocationPlan, ...corridorsToRender.slice(0, 24)];
              }

              return corridorsToRender.map((corridor, cIdx) => {
                const waypoints = getCorridorWaypoints(corridor);
                if (waypoints.length < 2) return null;

                const dispId = corridor.dispatch_id || `CORRIDOR-${cIdx}`;
                const vStyle = getVehicleStyle(corridor.vehicle_details?.vehicle_type || corridor.vehicle_type, cIdx);
                const curIdx = fleetIndices[dispId] ?? (corridor.status === 'DELIVERED' ? waypoints.length - 1 : 0);
                const isArr = corridor.status === 'DELIVERED' || curIdx >= waypoints.length - 1;
                const vCoord = waypoints[Math.min(curIdx, waypoints.length - 1)];

                const vType = corridor.vehicle_details?.vehicle_type || corridor.vehicle_type || vStyle.label;
                const regNo = corridor.vehicle_details?.vehicle_id || corridor.vehicle_details?.registration_no || `VEH-0${cIdx + 1}`;
                const medName = corridor.medicine_details?.name || corridor.medicine_name || "Emergency Medical Consumable";
                const tgtName = corridor.target_facility?.name || corridor.target_facility_name || "Target Health Node";
                const totalEta = corridor.estimated_transit_minutes || corridor.logistics_parameters?.estimated_transit_minutes || 25;
                const remainingEta = isArr ? 0 : Math.max(1, Math.round(totalEta * (1 - (curIdx / Math.max(1, waypoints.length - 1)))));
                const speedKmh = corridor.ai_average_speed_kmh || corridor.logistics_parameters?.ai_average_speed_kmh || 42.0;

                const isAerialCorridor = vStyle.isAerial || corridor.is_aerial || corridor.is_drone || vType.toLowerCase().includes('drone');

                return (
                  <React.Fragment key={dispId}>
                    {/* Outer Casing / Air Glow */}
                    <Polyline
                      positions={waypoints}
                      pathOptions={{
                        color: vStyle.color,
                        weight: isAerialCorridor ? 6 : 8,
                        opacity: isAerialCorridor ? 0.25 : 0.3,
                        dashArray: isAerialCorridor ? '8, 8' : undefined,
                        lineCap: 'round',
                        lineJoin: 'round'
                      }}
                    />
                    {/* Main Nav Corridor (Air Vector for Drone, Road Network for Ground Fleet) */}
                    <Polyline
                      positions={waypoints}
                      pathOptions={{
                        color: vStyle.color,
                        weight: isAerialCorridor ? 3.5 : 4.5,
                        opacity: 0.9,
                        dashArray: isAerialCorridor ? '12, 8' : undefined,
                        lineJoin: 'round',
                        lineCap: 'round',
                      }}
                    />
                    {/* Dashed High-Speed Trajectory Ribbon */}
                    <Polyline
                      positions={waypoints}
                      pathOptions={{
                        color: isAerialCorridor ? '#e0f2fe' : '#ffffff',
                        weight: isAerialCorridor ? 1.5 : 2,
                        opacity: 0.85,
                        dashArray: isAerialCorridor ? '4, 8' : vStyle.dash,
                      }}
                    />

                    {/* Live Moving Vehicle Marker with Crisp Vector Logo */}
                    {vCoord && (
                      <Marker 
                        position={vCoord} 
                        icon={getDynamicVehicleIcon(vStyle, isArr, regNo.replace('VEH-', ''))}
                      >
                        <Popup className="custom-leaflet-popup">
                          <div className="p-2 space-y-1.5 text-xs text-slate-100 min-w-[210px]">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                              <span className="font-bold flex items-center gap-1" style={{ color: vStyle.color }}>
                                <Truck size={13} /> {isArr ? "Destination Restocked" : regNo}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: `${vStyle.color}25`, color: vStyle.color }}>
                                {isArr ? "DELIVERED" : `${speedKmh} km/h (AI)`}
                              </span>
                            </div>
                            <p className="font-semibold text-white">{vType}</p>
                            <p className="text-[11px] text-slate-300">Target: <strong className="text-white">{tgtName}</strong></p>
                            <p className="text-[11px] text-slate-300">Cargo: <span className="text-cyan-300 font-semibold">{medName}</span> ({corridor.target_facility?.requested_quantity || corridor.quantity || 25}u)</p>
                            <p className="text-[10px] text-slate-400">Fleet Unit: <span className="text-cyan-300 font-mono font-bold">{regNo}</span> &bull; <span className="text-emerald-400 font-medium">GPS Secured</span></p>
                            <div className="pt-1 border-t border-slate-800 text-[11px] flex justify-between">
                              <span className="text-emerald-400 font-bold">Cold-Chain: 2-8°C Safe</span>
                              <span className="font-bold" style={{ color: isArr ? '#10b981' : vStyle.color }}>
                                {isArr ? "Delivered at PHC" : `ETA: ~${remainingEta}m`}
                              </span>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </React.Fragment>
                );
              });
            })()}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Initializing Pan-India Google Maps Engine...
          </div>
        )}

        {/* Floating Comprehensive Logistics HUD Card */}
        {reallocationPlan && (
          <div 
            className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 z-[1000] w-[calc(100%-1.5rem)] sm:w-[440px] max-w-lg max-h-[calc(100%-1.5rem)] sm:max-h-[calc(100%-2rem)] flex flex-col glass-panel border border-cyan-500/50 bg-slate-950/95 shadow-2xl backdrop-blur-md rounded-2xl overflow-hidden animate-fade-in"
            onWheel={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Header (Pinned) */}
            <div className="flex items-center justify-between border-b border-slate-800/80 px-3.5 py-2.5 shrink-0 bg-slate-950/90 backdrop-blur-sm">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 truncate">
                  <Truck size={14} className="shrink-0" /> Active Stock Rebalancing Corridor
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isArrived || dispatchStatus === 'DELIVERED' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}>
                  {dispatchStatus}
                </span>
                <button 
                  onClick={() => setReallocationPlan(null)}
                  className="text-slate-400 hover:text-white text-base leading-none p-1 rounded hover:bg-slate-800/60 transition-colors"
                  title="Close Corridor"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 custom-scrollbar">
              {/* Corridor Nodes Flow */}
              <div className="grid grid-cols-7 items-center gap-2 text-xs bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <div className="col-span-3 min-w-0">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Surplus Donor</span>
                  <p className="font-bold text-white text-xs leading-snug break-words line-clamp-2" title={donorName}>{donorName}</p>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Hub Dispatch Center</span>
                </div>
                <div className="col-span-1 flex flex-col items-center justify-center text-cyan-400 shrink-0">
                  <ArrowRight size={16} />
                </div>
                <div className="col-span-3 text-right min-w-0">
                  <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">Emergency PHC</span>
                  <p className="font-bold text-white text-xs leading-snug break-words line-clamp-2" title={targetName}>{targetName}</p>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Deficit Recipient</span>
                </div>
              </div>

              {/* Live Navigation Progress */}
              {waypointsCount > 1 && (
                <div className="space-y-1 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Navigation size={10} className="text-cyan-400 shrink-0" /> Route Progress
                    </span>
                    <span className="font-mono text-cyan-300 font-bold">
                      {transitProgressPercent}% &bull; {isArrived ? "Delivered at Destination" : `Waypoint ${activePlanIndex + 1}/${waypointsCount}`}
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
                    <Gauge size={11} className="text-cyan-400 shrink-0" /> Vehicle Distance
                  </div>
                  <p className="text-base font-extrabold text-white mt-0.5">
                    {distanceKm} <span className="text-[11px] font-normal text-slate-400">km</span>
                  </p>
                  <span className="text-[9px] text-cyan-400 font-mono">Road Network</span>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl">
                  <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                    <Clock size={11} className="text-emerald-400 shrink-0" /> {isArrived ? "Trip Completed" : "Transit ETA"}
                  </div>
                  <p className="text-base font-extrabold text-white mt-0.5">
                    {isArrived ? 0 : remainingEtaMins} <span className="text-[11px] font-normal text-slate-400">mins</span>
                  </p>
                  <span className="text-[9px] text-emerald-400 font-mono">~{aiSpeedKmh} km/h (AI Fleet)</span>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl">
                  <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                    <Thermometer size={11} className="text-indigo-400 shrink-0" /> Safe Holdover
                  </div>
                  <p className="text-base font-extrabold text-white mt-0.5">
                    {transitHours} <span className="text-[11px] font-normal text-slate-400">hrs</span>
                  </p>
                  <span className="text-[9px] text-indigo-400 font-mono">2&ndash;8°C Cold ILR</span>
                </div>
              </div>

              {/* Carrier & Corridor Telemetry Info */}
              <div className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 shrink-0">
                    <Truck size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-[11px] truncate">{vehicleType}</p>
                    <p className="text-[10px] text-slate-400 truncate">Vehicle ID: <span className="font-mono text-cyan-300 font-bold">{registrationNo}</span> &bull; <span className="text-emerald-400 font-medium">Encrypted Telemetry</span></p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <span className="text-[10px] text-slate-400 block">Payload</span>
                  <span className="text-xs font-bold text-white">{requestedQty} Units</span>
                </div>
              </div>

              {/* AI Agent Decision Reasoning */}
              {aiReasoning && (
                <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-2.5 text-[11px] text-cyan-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                      <Bot size={13} className="text-cyan-400 shrink-0" />
                      <span>Google Cloud Vertex AI Supervisor</span>
                    </div>
                    {reallocationPlan?.holdover_safety_factor && (
                      <span className="text-[9px] font-mono bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded shrink-0">
                        Safety Margin: {reallocationPlan.holdover_safety_factor}x
                      </span>
                    )}
                  </div>
                  <div className="italic leading-relaxed text-[11px]">
                    {aiReasoning.split(/(\*\*.*?\*\*)/g).map((chunk, idx) => {
                      if (chunk.startsWith('**') && chunk.endsWith('**')) {
                        return (
                          <strong key={idx} className="font-bold text-white not-italic block mb-1">
                            {chunk.slice(2, -2)}
                          </strong>
                        );
                      }
                      return <span key={idx}>{chunk}</span>;
                    })}
                  </div>

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
                        <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                          {reallocationPlan.execution_trace.map((step) => (
                            <div key={step.step_number} className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-lg text-[10px] space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-white flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
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
            </div>

            {/* Footer Action Buttons (Pinned) */}
            <div className="flex gap-2 p-3 border-t border-slate-800/80 shrink-0 bg-slate-950/90 backdrop-blur-sm">
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

        {/* Active Fleet Convoys Side Panel Drawer */}
        {showFleetPanel && (
          <div className="absolute inset-y-0 right-0 z-[1100] w-full sm:w-[420px] max-w-full glass-panel border-l border-cyan-500/40 bg-slate-950/95 shadow-2xl backdrop-blur-xl flex flex-col animate-slide-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 p-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                  <Truck size={17} className="text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">Active Fleet Convoys</h4>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Dual-Cloud Synced (Firebase + BigQuery)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleDispatchFleet}
                  disabled={dispatchingFleet}
                  className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1"
                  title="Dispatch new fleet convoys"
                >
                  {dispatchingFleet ? <RefreshCw size={12} className="animate-spin" /> : <Bot size={12} />}
                  <span>+3 More</span>
                </button>
                <button
                  onClick={() => setShowFleetPanel(false)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-all"
                  title="Close Side Panel"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Database Master Ledger Lifetime Count Banner */}
            <div className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border-b border-cyan-500/20 shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Database size={12} className="text-cyan-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    Database Master Ledger
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-800/40">
                    SQLite + BigQuery + Firebase
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-1 rounded-lg bg-slate-950/80 border border-slate-800/80">
                  <p className="text-[9px] text-slate-400">Total Transits</p>
                  <p className="text-xs font-bold font-mono text-cyan-300">
                    {reallocationStats?.total_transits || activeFleet.length}
                  </p>
                </div>
                <div className="p-1 rounded-lg bg-slate-950/80 border border-slate-800/80">
                  <p className="text-[9px] text-slate-400">Delivered</p>
                  <p className="text-xs font-bold font-mono text-emerald-400">
                    {reallocationStats?.delivered_transits || deliveredCount}
                  </p>
                </div>
                <div className="p-1 rounded-lg bg-slate-950/80 border border-slate-800/80">
                  <p className="text-[9px] text-slate-400">Rebalanced</p>
                  <p className="text-xs font-bold font-mono text-purple-400">
                    {(reallocationStats?.total_units_rebalanced || 0).toLocaleString()} <span className="text-[8px] font-normal text-slate-400">u</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats & Filter Tabs */}
            <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 shrink-0 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">Filter:</span>
                  <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setFleetFilter('ALL')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                        fleetFilter === 'ALL' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({activeFleet.length})
                    </button>
                    <button
                      onClick={() => setFleetFilter('IN_TRANSIT')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                        fleetFilter === 'IN_TRANSIT' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      In-Transit ({inTransitCount})
                    </button>
                    <button
                      onClick={() => setFleetFilter('DELIVERED')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                        fleetFilter === 'DELIVERED' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Delivered ({deliveredCount})
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/40 font-medium">
                    Map: Latest 25
                  </span>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-mono">LIVE RTDB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Convoy Cards */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pr-2">
              {activeFleet
                .filter(item => {
                  const arr = isCorridorDelivered(item);
                  if (fleetFilter === 'IN_TRANSIT') return !arr;
                  if (fleetFilter === 'DELIVERED') return arr;
                  return true;
                })
                .length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                    <Truck size={22} />
                  </div>
                  <p className="text-xs text-slate-400">No convoys match the current filter.</p>
                  <button
                    onClick={handleDispatchFleet}
                    disabled={dispatchingFleet}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg shadow-cyan-600/20 transition-all inline-flex items-center gap-1.5"
                  >
                    <Layers size={13} />
                    <span>Launch AI Fleet (3 Convoys)</span>
                  </button>
                </div>
              ) : (
                activeFleet
                  .filter(item => {
                    const arr = isCorridorDelivered(item);
                    if (fleetFilter === 'IN_TRANSIT') return !arr;
                    if (fleetFilter === 'DELIVERED') return arr;
                    return true;
                  })
                  .map((corridor, cIdx) => {
                    const cStyle = getVehicleStyle(corridor.vehicle_details?.vehicle_type || corridor.vehicle_type, cIdx);
                    const waypts = getCorridorWaypoints(corridor);
                    const curIdx = fleetIndices[corridor.dispatch_id] ?? 0;
                    const isArr = corridor.status === 'DELIVERED' || (waypts.length > 0 && curIdx >= waypts.length - 1);
                    const vehName = corridor.vehicle_details?.vehicle_id || corridor.vehicle_id || `VEH-0${cIdx + 1}`;
                    const vehType = corridor.vehicle_details?.vehicle_type || corridor.vehicle_type || cStyle.label;
                    const donorName = corridor.donor_facility?.name || corridor.donor_facility_name || corridor.selected_donor?.name || "Surplus Depot";
                    const tgtName = corridor.target_facility?.name || corridor.target_facility_name || "Critical Deficit Node";
                    const medName = corridor.medicine_details?.name || corridor.medicine_name || "Emergency Medical Supplies";
                    const medQty = corridor.medicine_details?.quantity || corridor.target_facility?.requested_quantity || corridor.quantity || 25;
                    const isSelected = reallocationPlan?.dispatch_id === corridor.dispatch_id;
                    const progressPct = isArr ? 100 : Math.min(99, Math.round(((curIdx + 1) / Math.max(waypts.length, 1)) * 100));

                    return (
                      <div
                        key={corridor.dispatch_id || cIdx}
                        className={`p-3.5 rounded-xl border transition-all space-y-3 cursor-pointer group ${
                          isSelected
                            ? 'bg-slate-900/95 border-cyan-400 ring-1 ring-cyan-500/40 shadow-xl'
                            : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                        onClick={() => {
                          setReallocationPlan(corridor);
                          if (waypts.length > 0 && mapInstance) {
                            const pos = waypts[Math.min(curIdx, waypts.length - 1)];
                            mapInstance.flyTo(pos, 10, { duration: 1 });
                          }
                        }}
                      >
                        {/* Vehicle Top Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: isArr ? '#10b981' : cStyle.color }}
                            />
                            <div>
                              <span className="font-mono font-bold text-xs" style={{ color: cStyle.color }}>
                                {vehName}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1.5 hidden sm:inline">
                                &bull; {vehType}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isArr
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}>
                            {isArr ? (
                              <>
                                <CheckCircle2 size={11} className="text-emerald-400" />
                                <span>DELIVERED</span>
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                                <span>IN-TRANSIT</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Route Path (Origin -> Target) */}
                        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Building2 size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate text-[11px]">{donorName}</span>
                          </div>
                          <div className={`flex items-center gap-1.5 pl-3 font-bold text-[10px] ${
                            cStyle.isAerial || corridor.is_aerial || corridor.is_drone || vehType.toLowerCase().includes('drone')
                              ? 'text-sky-300'
                              : 'text-cyan-400'
                          }`}>
                            <ArrowRight size={11} className="shrink-0" />
                            <span>{
                              cStyle.isAerial || corridor.is_aerial || corridor.is_drone || vehType.toLowerCase().includes('drone')
                                ? '✈ Direct Airspace Flight Corridor'
                                : '🛣 Ground Road Transit Corridor'
                            }</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-rose-300 font-medium">
                            <ShieldAlert size={12} className="text-rose-400 shrink-0" />
                            <span className="truncate text-[11px] text-white">{tgtName}</span>
                          </div>
                        </div>

                        {/* Medicine & Cargo Spec */}
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="text-slate-300 flex items-center gap-1">
                            <span className="text-slate-400">Drug:</span>
                            <span className="font-semibold text-white">{medName}</span>
                            <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.2 rounded font-mono">
                              {medQty} units
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {corridor.estimated_distance_km ? `${corridor.estimated_distance_km} km` : ''}
                          </span>
                        </div>

                        {/* Progress Track */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Progress</span>
                            <span className="font-mono text-cyan-300 font-bold">
                              {isArr ? '100% Completed' : `${progressPct}% (Step ${curIdx + 1}/${waypts.length || 1})`}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isArr ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReallocationPlan(corridor);
                              if (waypts.length > 0 && mapInstance) {
                                const pos = waypts[Math.min(curIdx, waypts.length - 1)];
                                mapInstance.flyTo(pos, 10, { duration: 1 });
                              }
                            }}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold py-1.5 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1 group-hover:border-cyan-500/50"
                          >
                            <Navigation size={12} className="text-cyan-400" />
                            <span>Track on Map</span>
                          </button>

                          {!isArr ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkDelivered(corridor.dispatch_id);
                              }}
                              className="bg-emerald-600/90 hover:bg-emerald-500 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1 shrink-0"
                            >
                              <CheckCircle2 size={12} />
                              <span>Mark Delivered</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReallocationPlan(corridor);
                                setFleetIndices(prev => ({ ...prev, [corridor.dispatch_id]: 0 }));
                              }}
                              className="bg-indigo-600/80 hover:bg-indigo-500 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 shrink-0"
                            >
                              <RotateCcw size={12} />
                              <span>Replay</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* Database History Drawer Modal */}
        {showHistory && (
          <div className="absolute inset-y-0 right-0 z-[1100] w-full sm:w-96 glass-panel border-l border-cyan-500/40 bg-slate-950/98 shadow-2xl p-4 flex flex-col animate-slide-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-cyan-400" />
                <div>
                  <h4 className="font-bold text-white text-sm">Reallocation Database Ledger</h4>
                  <p className="text-[10px] text-slate-400">
                    Full count of all transits from initial stage
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-400 hover:text-white p-1"
                title="Close Ledger"
              >
                <X size={16} />
              </button>
            </div>

            {/* Lifetime Database Stats Banner */}
            <div className="my-2.5 p-2 rounded-xl bg-slate-900/90 border border-cyan-500/30">
              <div className="flex items-center justify-between text-[10px] mb-1.5 font-mono">
                <span className="text-slate-300 font-bold">LIFETIME TRANSIT AUDIT</span>
                <span className="text-emerald-400 flex items-center gap-1 text-[9px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  PERSISTENT SQLITE + BQ
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center text-xs">
                <div className="p-1 bg-slate-950/80 rounded border border-slate-800">
                  <div className="text-[8px] text-slate-400 uppercase">Total</div>
                  <div className="font-bold font-mono text-cyan-400 text-xs">{reallocationStats?.total_transits || historyRecords.length}</div>
                </div>
                <div className="p-1 bg-slate-950/80 rounded border border-slate-800">
                  <div className="text-[8px] text-slate-400 uppercase">Delivered</div>
                  <div className="font-bold font-mono text-emerald-400 text-xs">{reallocationStats?.delivered_transits || 0}</div>
                </div>
                <div className="p-1 bg-slate-950/80 rounded border border-slate-800">
                  <div className="text-[8px] text-slate-400 uppercase">Active</div>
                  <div className="font-bold font-mono text-amber-400 text-xs">{reallocationStats?.in_transit_transits || 0}</div>
                </div>
                <div className="p-1 bg-slate-950/80 rounded border border-slate-800">
                  <div className="text-[8px] text-slate-400 uppercase">Units</div>
                  <div className="font-bold font-mono text-purple-400 text-xs">{(reallocationStats?.total_units_rebalanced || 0).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Filter buttons in History Drawer */}
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-slate-400 text-[10px]">Filter:</span>
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                {['ALL', 'DELIVERED', 'IN_TRANSIT'].map(f => (
                  <button
                    key={f}
                    onClick={() => {
                      setHistoryFilter(f);
                      handleOpenHistory(f);
                    }}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-md transition-all ${
                      historyFilter === f ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f === 'ALL' ? `All (${reallocationStats?.total_transits || historyRecords.length})` : (f === 'DELIVERED' ? `Delivered (${reallocationStats?.delivered_transits || 0})` : `In-Transit (${reallocationStats?.in_transit_transits || 0})`)}
                  </button>
                ))}
              </div>
            </div>

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
