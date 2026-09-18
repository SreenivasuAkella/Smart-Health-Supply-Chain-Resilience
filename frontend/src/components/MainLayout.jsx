'use client';
import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import OverviewDashboard from './OverviewDashboard';
import InteractiveMap from './InteractiveMap';
import FederatedLearningHub from './FederatedLearningHub';
import MultimodalVisionScanner from './MultimodalVisionScanner';
import VoiceCopilotModal from './VoiceCopilotModal';
import VoiceCopilotView from './VoiceCopilotView';
import ColdChainDigitalTwin from './ColdChainDigitalTwin';
import OutbreakForecasting from './OutbreakForecasting';
import CrisisSandbox from './CrisisSandbox';
import InventoryLedger from './InventoryLedger';
import GoogleTechArchitectureModal from './GoogleTechArchitectureModal';
import ApiKeyModal from './ApiKeyModal';
import { 
  fetchFacilities, 
  fetchSurveillanceDistricts, 
  confirmReallocationDispatch,
  subscribeToLiveSSE
} from '../services/api';

const VALID_TABS = [
  'overview', 
  'map', 
  'inventory', 
  'forecasting', 
  'coldchain', 
  'federated', 
  'simulation', 
  'vision', 
  'voice'
];

function getTabFromPath(path) {
  if (!path || path === '/' || path === '/overview') return 'overview';
  const clean = path.replace(/^\//, '').split('/')[0].toLowerCase();
  return VALID_TABS.includes(clean) ? clean : 'overview';
}

export default function MainLayout({ initialTab }) {
  const pathname = usePathname();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState(() => {
    return initialTab && VALID_TABS.includes(initialTab) 
      ? initialTab 
      : getTabFromPath(pathname);
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [facilities, setFacilities] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [surveillanceDistricts, setSurveillanceDistricts] = useState({});
  const [activeReallocation, setActiveReallocation] = useState(null);
  
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [sseConnected, setSseConnected] = useState(false);

  // Stockout early-warning toast with throttling & deduplication
  const [stockoutToast, setStockoutToast] = useState(null);
  const [areAlertsMuted, setAreAlertsMuted] = useState(false);
  const stockoutTimerRef = useRef(null);
  const lastToastTimeRef = useRef(0);
  const dismissedFacilitiesRef = useRef(new Set());

  const isFetchingRef = useRef(false);

  // Sync activeTab when pathname changes (e.g. browser back/forward or direct URL change)
  useEffect(() => {
    const tabFromUrl = getTabFromPath(pathname);
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [pathname]);

  const navigateToTab = (tabId) => {
    const cleanId = VALID_TABS.includes(tabId) ? tabId : 'overview';
    setActiveTab(cleanId);
    const targetUrl = cleanId === 'overview' ? '/' : `/${cleanId}`;
    if (pathname !== targetUrl) {
      router.push(targetUrl, { scroll: false });
    }
  };

  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = async () => {
    setRefreshKey(k => k + 1);
    if (activeTab === 'map') {
      setIsLoading(true);
      try {
        const [fullFacs, survRes] = await Promise.all([
          fetchFacilities(1, 1200),
          fetchSurveillanceDistricts(1, 15)
        ]);
        if (fullFacs?.length > 0) setFacilities(fullFacs);
        if (survRes) setSurveillanceDistricts(survRes);
      } catch (err) {
        console.error("Map refresh error:", err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // When on 'map' tab, dynamically load full geospatial node coverage for Leaflet rendering
  useEffect(() => {
    if (activeTab === 'map' && facilities.length < 100) {
      setIsLoading(true);
      Promise.all([
        fetchFacilities(1, 1200),
        fetchSurveillanceDistricts(1, 15)
      ]).then(([fullFacs, survRes]) => {
        if (fullFacs && fullFacs.length > 0) setFacilities(fullFacs);
        if (survRes) setSurveillanceDistricts(survRes);
      }).catch(err => {
        console.error("Error loading map facilities:", err);
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [activeTab, facilities.length]);

  const handleOpenCopilot = () => {
    setIsCopilotOpen(true);
    if (facilities.length === 0) {
      fetchFacilities(1, 100).then((facs) => {
        if (facs && facs.length > 0) setFacilities(facs);
      });
    }
  };

  useEffect(() => {
    const storedKey = localStorage.getItem('SANJEEVANI_GEMINI_KEY');
    if (storedKey) setGeminiApiKey(storedKey);

    // Subscribe to Server-Sent Events (SSE) Live Stream for zero-delay IoT and health telemetry updates
    const unsubscribeSSE = subscribeToLiveSSE(
      (event) => {
        if (event.type === 'telemetry' && event.data) {
          setTelemetry(event.data);
        }
        if (event.type === 'stockout_alert' && event.data) {
          if (areAlertsMuted) return;
          const facId = event.data.facility_id;
          if (facId && dismissedFacilitiesRef.current.has(facId)) return;

          const now = Date.now();
          if (now - lastToastTimeRef.current < 60000) return;
          lastToastTimeRef.current = now;

          setStockoutToast(event.data);
          if (stockoutTimerRef.current) clearTimeout(stockoutTimerRef.current);
          stockoutTimerRef.current = setTimeout(() => setStockoutToast(null), 7000);
        }
        if (event.type === 'reallocation' && event.data) {
          setActiveReallocation(event.data);
        }
      },
      (err) => {
        console.warn('[SSE] Stream error:', err);
      },
      (isConnected) => {
        setSseConnected(isConnected);
      }
    );

    return () => {
      if (unsubscribeSSE) unsubscribeSSE();
    };
  }, [areAlertsMuted]);

  const handleSaveApiKey = (key) => {
    setGeminiApiKey(key);
    localStorage.setItem('SANJEEVANI_GEMINI_KEY', key);
  };

  const handleTriggerReallocation = async (targetIdOrPlan = "PHC-BARAGAON-03", medId = "PUB-MED-001", quantity = 25) => {
    // If a pre-computed dispatch package / plan object is passed directly from Copilot
    if (typeof targetIdOrPlan === 'object' && targetIdOrPlan !== null) {
      setActiveReallocation(targetIdOrPlan);
      navigateToTab('map');
      return;
    }

    const targetId = typeof targetIdOrPlan === 'string' && targetIdOrPlan.trim() ? targetIdOrPlan.trim() : "PHC-BARAGAON-03";
    const plan = await confirmReallocationDispatch(targetId, medId, quantity);
    if (plan) {
      setActiveReallocation(plan);
      navigateToTab('map');
    }
  };

  const handleDismissToast = (facilityId) => {
    if (facilityId) {
      dismissedFacilitiesRef.current.add(facilityId);
    }
    setStockoutToast(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Stockout Early-Warning Toast with Mute / Dismiss */}
      {stockoutToast && !areAlertsMuted && (
        <div className="fixed top-4 right-4 z-[9999] max-w-sm w-full animate-fade-in">
          <div className="bg-rose-950/95 border border-rose-500/60 rounded-2xl p-4 shadow-2xl backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                  <span className="text-xs font-bold text-rose-300 uppercase tracking-wide">⚠ Stockout Imminent</span>
                </div>
                <p className="text-sm font-semibold text-white">{stockoutToast.facility_name}</p>
                <p className="text-xs text-rose-300 mt-0.5">{stockoutToast.district}, {stockoutToast.state}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Supply: <span className="text-rose-300 font-bold">{stockoutToast.medicine_days_of_supply}d remaining</span>
                  {stockoutToast.medicine_name && <span className="text-slate-500"> • {stockoutToast.medicine_name}</span>}
                </p>
              </div>
              <button onClick={() => handleDismissToast(stockoutToast.facility_id)} className="text-slate-500 hover:text-white text-lg leading-none">&times;</button>
            </div>
            <div className="flex gap-2 mt-3 items-center">
              <button
                onClick={() => {
                  handleTriggerReallocation(stockoutToast.facility_id, stockoutToast.medicine_id);
                  handleDismissToast(stockoutToast.facility_id);
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
              >
                Trigger Reallocation
              </button>
              <button
                onClick={() => handleDismissToast(stockoutToast.facility_id)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setAreAlertsMuted(true);
                  setStockoutToast(null);
                }}
                className="text-[10px] text-slate-500 hover:text-rose-300 px-1.5 py-1 border border-slate-700/50 rounded"
                title="Silence alert toasts for this session"
              >
                Mute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        mobileOpen={isMobileOpen}
        setMobileOpen={setIsMobileOpen}
        onOpenTechModal={() => setIsTechModalOpen(true)}
      />

      {/* Main Content Area */}
      <div 
        className={`
          flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}
        `}
      >
        {/* Top Header Bar */}
        <TopHeader
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onOpenTechModal={() => setIsTechModalOpen(true)}
          onOpenKeyModal={() => setIsKeyModalOpen(true)}
          onOpenCopilot={handleOpenCopilot}
          isKeyConfigured={Boolean(geminiApiKey)}
          onDataRefresh={handleRefresh}
          sseConnected={sseConnected}
        />

        {/* Tab Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'overview' && (
            <OverviewDashboard
              key={refreshKey}
              isLoading={isLoading}
              telemetry={telemetry}
              onNavigate={navigateToTab}
              onTriggerReallocation={handleTriggerReallocation}
              onOpenCopilot={handleOpenCopilot}
            />
          )}

          {activeTab === 'map' && (
            <InteractiveMap
              key={refreshKey}
              isLoading={isLoading}
              facilities={facilities}
              surveillanceDistricts={surveillanceDistricts}
              activeReallocation={activeReallocation}
              onSelectFacility={(fac) => handleTriggerReallocation(fac.id)}
            />
          )}

          {activeTab === 'federated' && (
            <FederatedLearningHub />
          )}

          {activeTab === 'vision' && (
            <MultimodalVisionScanner
              apiKey={geminiApiKey}
              onStockUpdated={handleRefresh}
              facilities={facilities}
            />
          )}

          {activeTab === 'voice' && (
            <VoiceCopilotView
              apiKey={geminiApiKey}
              onTriggerReallocation={handleTriggerReallocation}
            />
          )}

          {activeTab === 'coldchain' && (
            <ColdChainDigitalTwin />
          )}

          {activeTab === 'forecasting' && (
            <OutbreakForecasting
              onTriggerReallocation={handleTriggerReallocation}
            />
          )}

          {activeTab === 'simulation' && (
            <CrisisSandbox
              onNavigateToMap={() => navigateToTab('map')}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryLedger
              key={refreshKey}
              isLoading={isLoading}
              onRefresh={handleRefresh}
            />
          )}
        </main>
      </div>

      {/* Global Modals & Persistent Floating Copilot */}
      <VoiceCopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onToggle={() => {
          if (!isCopilotOpen) {
            handleOpenCopilot();
          } else {
            setIsCopilotOpen(false);
          }
        }}
        activeTab={activeTab}
        onOpenVoiceTab={() => {
          setIsCopilotOpen(false);
          navigateToTab('voice');
        }}
        apiKey={geminiApiKey}
        facilities={facilities}
        onTriggerReallocation={handleTriggerReallocation}
      />

      <GoogleTechArchitectureModal
        isOpen={isTechModalOpen}
        onClose={() => setIsTechModalOpen(false)}
      />

      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        apiKey={geminiApiKey}
        onSaveKey={handleSaveApiKey}
      />
    </div>
  );
}
