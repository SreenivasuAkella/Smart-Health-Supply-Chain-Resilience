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
