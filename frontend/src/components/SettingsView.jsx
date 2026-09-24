'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Key, Cpu, RefreshCw, CheckCircle2, ShieldCheck, Database, 
  Flame, Globe, Sparkles, LineChart, Eye, EyeOff, Mic, MapPin, 
  Layers, Lock, LogOut, Check, AlertCircle, ExternalLink, User,
  Wifi, WifiOff, FileSpreadsheet, CloudRain, Server
} from 'lucide-react';
import { triggerLiveDatasetSync } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getRoleTitle, getUserJurisdiction } from '../utils/rbac';

export default function SettingsView({ 
  geminiApiKey, 
  onSaveApiKey, 
  onDataRefresh, 
  sseConnected = true 
}) {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Gemini API Key State
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  // Sync Public Data State
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Just now (Auto)');

  useEffect(() => {
    if (geminiApiKey) setApiKeyInput(geminiApiKey);
  }, [geminiApiKey]);

  const handleSaveKey = (e) => {
    e.preventDefault();
    if (onSaveApiKey) {
      onSaveApiKey(apiKeyInput.trim());
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 3000);
    }
  };

  const handleClearKey = () => {
    setApiKeyInput('');
    if (onSaveApiKey) {
      onSaveApiKey('');
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 3000);
    }
  };

  const handleSyncData = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    try {
      await triggerLiveDatasetSync();
      if (onDataRefresh) await onDataRefresh();
      setSyncSuccess(true);
      setLastSyncTime(new Date().toLocaleTimeString());
      setTimeout(() => setSyncSuccess(false), 4000);
    } catch (err) {
      console.error("Data sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      
      {/* Section 1: Google Gemini API Key Configuration */}
          <div className="glass-panel p-5 sm:p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Key size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Google Gemini & AI Studio Key
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Powers Multimodal Vision OCR and ASHA Multilingual Voice Copilot
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                apiKeyInput 
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}>
                {apiKeyInput ? "CONFIGURED" : "DEFAULT KEY ACTIVE"}
              </span>
            </div>

            <form onSubmit={handleSaveKey} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Gemini API Key (AIzaSy...)
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter your Google Gemini API key or use system fallback..."
                    className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none font-mono transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <span>Get a free key from Google AI Studio</span>
                  <ExternalLink size={12} />
                </a>

                <div className="flex items-center gap-2">
                  {apiKeyInput && (
                    <button
                      type="button"
                      onClick={handleClearKey}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn-primary text-xs px-4 py-1.5 font-bold"
                  >
                    {keySaved ? (
                      <>
                        <Check size={13} />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <span>Save Key</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Section 2: Public Healthcare & Climate Data Synchronization */}
          <div className="glass-panel p-5 sm:p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <RefreshCw size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Public Dataset Synchronization
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Hydrates BigQuery and Firebase with official Indian health & weather feeds
                  </p>
                </div>
              </div>

              <button
                onClick={handleSyncData}
                disabled={syncing}
                className="btn-primary text-xs px-3.5 py-2 font-semibold shadow-md"
              >
                <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
                <span>{syncing ? "Syncing APIs..." : syncSuccess ? "Synced!" : "Sync Live Data"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                  <CloudRain size={14} className="text-cyan-400" />
                  <span>IMD Weather</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Hourly gridded rainfall & monsoon flood risk indices.
                </p>
                <div className="text-[9px] font-mono text-emerald-400 font-bold pt-1">
                  ● ACTIVE FEED
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                  <LineChart size={14} className="text-indigo-400" />
                  <span>IDSP Morbidity</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Weekly outbreak surveillance for snakebite, dengue, and fever.
                </p>
                <div className="text-[9px] font-mono text-emerald-400 font-bold pt-1">
                  ● SYNCHRONIZED
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                  <FileSpreadsheet size={14} className="text-purple-400" />
                  <span>e-Aushadhi / NLEM</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Essential medicines list & clinical facility stock levels.
                </p>
                <div className="text-[9px] font-mono text-emerald-400 font-bold pt-1">
                  ● 1,188 PHCs
                </div>
              </div>
            </div>

            {/* Real-time SSE Stream Telemetry */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {sseConnected ? (
                  <Wifi size={14} className="text-emerald-400" />
                ) : (
                  <WifiOff size={14} className="text-amber-400" />
                )}
                <span className="text-slate-300">
                  Server-Sent Events (SSE) Stream:
                </span>
                <strong className={sseConnected ? "text-emerald-400 font-mono" : "text-amber-400 font-mono"}>
                  {sseConnected ? "Connected (Zero-Delay)" : "Reconnecting..."}
                </strong>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Last Sync: {lastSyncTime}
              </span>
            </div>
          </div>

          {/* Section 3: Personnel Clearance & Session */}
          <div className="glass-panel p-5 sm:p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <User size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Personnel Session & Credentials
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Role-based access control and cryptographic session details
                  </p>
                </div>
              </div>

              <button
                onClick={() => router.push('/auth')}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                <span>Switch Role</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-500">Official Personnel</div>
                <div className="font-bold text-white text-sm">{user?.full_name || 'Dr. Sreenivasu'}</div>
                <div className="text-slate-400 font-mono text-[11px]">{user?.email || 'admin@sanjeevani.gov.in'}</div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-500">Security Clearance</div>
                <div className="font-bold text-cyan-300 text-sm">{getRoleTitle(user?.role)}</div>
                <div className="text-slate-400 text-[11px]">{getUserJurisdiction(user)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-500 font-mono">
                Differential Privacy ε &lt; 0.85 • SHA-256 JWT Signed
              </span>
              <button
                onClick={async () => {
                  await logout();
                  router.push('/auth');
                }}
                className="btn-danger text-xs px-3.5 py-1.5 font-bold"
              >
                <LogOut size={13} />
                <span>Sign Out of Session</span>
              </button>
            </div>
          </div>

    </div>
  );
}
