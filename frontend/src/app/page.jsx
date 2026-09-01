'use client';
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import OverviewDashboard from '../components/OverviewDashboard';
import InteractiveMap from '../components/InteractiveMap';
import MultimodalVisionScanner from '../components/MultimodalVisionScanner';
import VoiceCopilotModal from '../components/VoiceCopilotModal';
import ColdChainDigitalTwin from '../components/ColdChainDigitalTwin';
import OutbreakForecasting from '../components/OutbreakForecasting';
import CrisisSandbox from '../components/CrisisSandbox';
import InventoryLedger from '../components/InventoryLedger';
import GoogleTechArchitectureModal from '../components/GoogleTechArchitectureModal';
import ApiKeyModal from '../components/ApiKeyModal';
import { fetchFacilities, fetchMedicines, fetchColdChainTelemetry, optimizeReallocationPlan } from '../services/api';

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');
  const [facilities, setFacilities] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [activeReallocation, setActiveReallocation] = useState(null);
  
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');

  const loadData = async () => {
    const [facs, meds, tele] = await Promise.all([
      fetchFacilities(),
      fetchMedicines(),
      fetchColdChainTelemetry()
    ]);
    if (facs) setFacilities(facs);
    if (meds) setMedicines(meds);
    if (tele) setTelemetry(tele);
  };

  useEffect(() => {
    loadData();
    const storedKey = localStorage.getItem('SANJEEVANI_GEMINI_KEY');
    if (storedKey) setGeminiApiKey(storedKey);
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
    <div className="min-h-screen pb-16">
      {/* Sticky Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenTechModal={() => setIsTechModalOpen(true)}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        isKeyConfigured={Boolean(geminiApiKey)}
      />

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        {activeTab === 'overview' && (
          <OverviewDashboard
            facilities={facilities}
            medicines={medicines}
            telemetry={telemetry}
            onNavigate={setActiveTab}
            onTriggerReallocation={handleTriggerReallocation}
            onOpenCopilot={() => setIsCopilotOpen(true)}
          />
        )}

        {activeTab === 'map' && (
          <InteractiveMap
            facilities={facilities}
            activeReallocation={activeReallocation}
            onSelectFacility={(fac) => handleTriggerReallocation(fac.id)}
          />
        )}

        {activeTab === 'vision' && (
          <MultimodalVisionScanner
            apiKey={geminiApiKey}
            onStockUpdated={loadData}
          />
        )}

        {activeTab === 'voice' && (
          <div className="glass-panel p-8 text-center space-y-4">
            <h2 className="text-xl font-bold text-white">ASHA Voice Copilot Launchpad</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Access the multilingual voice-first copilot in Hindi, Telugu, Tamil, Marathi, Bengali, Kannada, and English.
            </p>
            <button
              onClick={() => setIsCopilotOpen(true)}
              className="btn-primary px-6 py-3 text-sm font-semibold"
            >
              Open Interactive Voice Copilot
            </button>
          </div>
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
            medicines={medicines}
            facilities={facilities}
            onRefresh={loadData}
          />
        )}
      </main>

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
