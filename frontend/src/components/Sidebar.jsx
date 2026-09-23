'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  MapPin, 
  Network, 
  Sparkles, 
  Languages, 
  ThermometerSnowflake, 
  ShieldAlert, 
  Zap, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight, 
  Database, 
  Flame, 
  Radio, 
  ShieldCheck, 
  Cpu, 
  Layers,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasTabAccess } from '../utils/rbac';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isCollapsed, 
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
  onOpenTechModal
}) {
  const { user } = useAuth();
  const navCategories = [
    {
      title: "Core Command",
      items: [
        { id: 'overview', label: 'Command Center', icon: Activity, badge: 'Live' },
        { id: 'map', label: 'Geospatial Rebalancer', icon: MapPin, badge: 'GIS' },
        { id: 'inventory', label: 'e-Aushadhi Ledger', icon: FileSpreadsheet, badge: 'Stocks' }
      ]
    },
    {
      title: "AI & Public Health Intel",
      items: [
        { id: 'forecasting', label: 'Epidemic Forecasting', icon: ShieldAlert, badge: 'BigQuery' },
        { id: 'coldchain', label: 'Cold-Chain IoT Twin', icon: ThermometerSnowflake, badge: 'RTDB' },
        { id: 'federated', label: 'Federated Multi-State AI', icon: Network, badge: 'Mesh' },
        { id: 'simulation', label: 'Crisis Sandbox', icon: Zap, badge: 'Drills' }
      ]
    },
    {
      title: "Field & Clinical AI",
      items: [
        { id: 'vision', label: 'Gemini Vision Scanner', icon: Sparkles, badge: 'Multimodal' },
        { id: 'voice', label: 'ASHA Voice Copilot', icon: Languages, badge: '8 Langs' }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-50 flex flex-col justify-between
          bg-slate-950/95 backdrop-blur-2xl border-r border-slate-800/80
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-72'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Desktop Collapse Toggle Floating Button (Edge Positioned) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3.5 top-6 z-50 w-7 h-7 rounded-full bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-cyan-500/50 hover:bg-slate-800 shadow-lg shadow-black/40 items-center justify-center transition-all cursor-pointer group"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          ) : (
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          )}
        </button>

        {/* Top Header / Brand */}
        <div className={`p-4 border-b border-slate-800/80 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} min-h-[72px]`}>
          <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 min-w-[40px] rounded-xl overflow-hidden bg-slate-950 border border-cyan-400/30 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <img
                src="/team_logo.jpg"
                alt="Sanjeevani AI Logo"
                className="w-full h-full object-cover rounded-[10px]"
              />
            </div>
            {!isCollapsed && (
              <div className="truncate animate-fadeIn">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-base tracking-tight bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                    SANJEEVANI
                  </h1>
                  <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">
                    AI
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  BRICS Health Resilience Mesh
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Categories */}
        <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'} py-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-800`}>
          {navCategories.map((category, catIdx) => (
            <div key={catIdx} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/90">
                  {category.title}
                </div>
              ) : (
                catIdx > 0 && <div className="my-2 border-t border-slate-800/60 mx-2" />
              )}

              {category.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isAllowed = hasTabAccess(user?.role, item.id);
                const targetPath = item.id === 'overview' ? '/' : `/${item.id}`;
                return (
                  <Link
                    key={item.id}
                    href={targetPath}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileOpen(false);
                    }}
                    className={`
                      w-full flex items-center ${isCollapsed ? 'justify-center px-0 h-11' : 'gap-3 px-3 py-2.5'} rounded-xl text-xs font-semibold
                      transition-all duration-200 group relative
                      ${!isAllowed ? 'opacity-70 hover:opacity-100' : ''}
                      ${isActive 
                        ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10' 
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent'}
                    `}
                    aria-label={item.label}
                  >
                    <Icon 
                      size={18} 
                      className={`min-w-[18px] transition-transform duration-200 group-hover:scale-110 ${
                        !isAllowed ? 'text-slate-500' : isActive ? 'text-cyan-400' : 'text-slate-400'
                      }`} 
                    />
                    
                    {!isCollapsed ? (
                      <div className="flex items-center justify-between w-full truncate">
                        <span className={`truncate ${!isAllowed ? 'text-slate-400' : ''}`}>
                          {item.label}
                        </span>
                        {!isAllowed ? (
                          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-mono font-medium bg-amber-500/10 text-amber-400/90 border border-amber-500/20">
                            <Lock size={9} />
                            <span>Locked</span>
                          </span>
                        ) : item.badge && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                            isActive 
                              ? 'bg-cyan-400/20 text-cyan-200 border border-cyan-400/30' 
                              : 'bg-slate-900 text-slate-300 border border-slate-800'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    ) : (
                      /* Floating Hover Tooltip in Collapsed Mode */
                      <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-slate-100 rounded-lg shadow-xl text-xs whitespace-nowrap hidden group-hover:flex items-center gap-2 z-50 pointer-events-none">
                        <span>{item.label}</span>
                        {!isAllowed ? (
                          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Lock size={9} />
                            <span>Restricted</span>
                          </span>
                        ) : item.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Collapsed Active Indicator Line */}
                    {isCollapsed && isActive && (
                      <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-5 bg-cyan-400 rounded-r-full shadow-glow-cyan" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom System Health Status Card */}
        <div className={`p-3 border-t border-slate-800/80 bg-slate-950/60 ${isCollapsed ? 'flex justify-center' : ''}`}>
          {!isCollapsed ? (
            <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Cloud Telemetry
                </span>
                <button 
                  onClick={onOpenTechModal}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-0.5 transition-colors"
                >
                  <Cpu size={11} /> Stack
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800/60 flex items-center gap-1.5">
                  <Database size={12} className="text-indigo-400" />
                  <span className="text-slate-300 truncate">BigQuery</span>
                </div>
                <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800/60 flex items-center gap-1.5">
                  <Flame size={12} className="text-amber-400" />
                  <span className="text-slate-300 truncate">Firebase</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1 relative group">
              <button 
                onClick={onOpenTechModal}
                className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 flex items-center justify-center hover:bg-slate-800 hover:border-cyan-500/40 transition-all shadow-sm"
                title="Google AI Stack Blueprint"
                aria-label="Google AI Stack Blueprint"
              >
                <Cpu size={18} />
              </button>
              {/* Tooltip */}
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-slate-100 rounded-lg shadow-xl text-xs whitespace-nowrap hidden group-hover:flex items-center gap-2 z-50 pointer-events-none">
                <span>Google AI Stack Blueprint</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
