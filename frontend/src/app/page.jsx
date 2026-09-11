'use client';
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import OverviewDashboard from '../components/OverviewDashboard';
import InteractiveMap from '../components/InteractiveMap';
import FederatedLearningHub from '../components/FederatedLearningHub';
import MultimodalVisionScanner from '../components/MultimodalVisionScanner';
import VoiceCopilotModal from '../components/VoiceCopilotModal';
import VoiceCopilotView from '../components/VoiceCopilotView';
import ColdChainDigitalTwin from '../components/ColdChainDigitalTwin';
import OutbreakForecasting from '../components/OutbreakForecasting';
import CrisisSandbox from '../components/CrisisSandbox';
import InventoryLedger from '../components/InventoryLedger';
import GoogleTechArchitectureModal from '../components/GoogleTechArchitectureModal';
import ApiKeyModal from '../components/ApiKeyModal';
import { 
  fetchFacilities, 
  fetchMedicines, 
  fetchColdChainTelemetry, 
  fetchSurveillanceDistricts, 
  optimizeReallocationPlan,
  fetchDashboardBootstrap,
  subscribeToLiveSSE
} from '../services/api';

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');
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
  // U5: Stockout early-warning toast
  const [stockoutToast, setStockoutToast] = useState(null);
  const stockoutTimerRef = useRef(null);

  const isFetchingRef = useRef(false);

  const loadData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      // Use unified high-speed bootstrap (< 25ms load time)
      const bootstrap = await fetchDashboardBootstrap();
      if (bootstrap) {
        if (bootstrap.facilities) setFacilities(bootstrap.facilities);
        if (bootstrap.medicines) setMedicines(bootstrap.medicines);
        if (bootstrap.telemetry) setTelemetry(bootstrap.telemetry);
        if (bootstrap.surveillanceDistricts) setSurveillanceDistricts(bootstrap.surveillanceDistricts);
      }
    } catch (e) {
      console.error("Error loading live data:", e);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    loadData();
    const storedKey = localStorage.getItem('SANJEEVANI_GEMINI_KEY');
    if (storedKey) setGeminiApiKey(storedKey);

    // Subscribe to Server-Sent Events (SSE) Live Stream for zero-delay IoT and health telemetry updates
    const unsubscribeSSE = subscribeToLiveSSE((event) => {
      if (event.type === 'telemetry' && event.data) {
        setTelemetry(event.data);
      }
      if (event.type === 'stockout_alert' && event.data) {
        // U5: Surface early warning as a visible dismissible toast banner
        setStockoutToast(event.data);
        if (stockoutTimerRef.current) clearTimeout(stockoutTimerRef.current);
        stockoutTimerRef.current = setTimeout(() => setStockoutToast(null), 8000);
      }
      // M3: Auto-triggered reallocation dispatch — update map with live route
      if (event.type === 'reallocation' && event.data) {
        setActiveReallocation(prev => prev ? prev : event.data);
      }
    });

    return () => {
      if (unsubscribeSSE) unsubscribeSSE();
    };
  }, []);

  const handleSaveApiKey = (key) => {
    setGeminiApiKey(key);
    localStorage.setItem('SANJEEVANI_GEMINI_KEY', key);
  };

  const handleTriggerReallocation = async (targetId = "PHC-BARAGAON-03", medId = "MED-ASV-001") => {
    const plan = await optimizeReallocationPlan(targetId, medId, 25);
    setActiveReallocation(plan);
    setActiveTab('map');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* U5: Live Stockout Early-Warning Toast */}
      {stockoutToast && (
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
                </p>
              </div>
              <button onClick={() => setStockoutToast(null)} className="text-slate-500 hover:text-white text-lg leading-none">&times;</button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { handleTriggerReallocation(stockoutToast.facility_id); setStockoutToast(null); }}
                className="flex-1 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
              >
                Trigger Reallocation
              </button>
              <button onClick={() => setStockoutToast(null)} className="text-xs text-slate-400 hover:text-white px-2">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Left Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
          onOpenCopilot={() => setIsCopilotOpen(true)}
          isKeyConfigured={Boolean(geminiApiKey)}
          onDataRefresh={loadData}
        />

        {/* Tab Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'overview' && (
            <OverviewDashboard
              isLoading={isLoading}
              facilities={facilities}
              medicines={medicines}
              telemetry={telemetry}
              surveillanceDistricts={surveillanceDistricts}
              onNavigate={setActiveTab}
              onTriggerReallocation={handleTriggerReallocation}
              onOpenCopilot={() => setIsCopilotOpen(true)}
            />
          )}

          {activeTab === 'map' && (
            <InteractiveMap
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
              onStockUpdated={loadData}
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
              onNavigateToMap={() => setActiveTab('map')}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryLedger
              isLoading={isLoading}
              medicines={medicines}
              facilities={facilities}
              onRefresh={loadData}
            />
          )}
        </main>
      </div>

      {/* Modals */}
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

      <VoiceCopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        apiKey={geminiApiKey}
      />
    </div>
  );
}
