'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Settings,
  Lock,
  Compass,
  LogOut,
  User,
  ShieldCheck,
  Bed,
  Database,
  HeartPulse
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasTabAccess, getRoleTitle } from '../utils/rbac';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isCollapsed, 
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
  onOpenGuideModal
}) {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const navCategories = [
    {
      title: "Core Operations",
      items: [
        { id: 'overview', label: 'Command Center', icon: Activity, badge: 'Live' },
        { id: 'clinical', label: 'Capacity & Attendance', icon: Bed, badge: 'Beds & Staff' },
        { id: 'map', label: 'Geospatial Rebalancer', icon: MapPin, badge: 'GIS' },
        { id: 'inventory', label: 'e-Aushadhi Ledger', icon: FileSpreadsheet, badge: 'Stocks' }
      ]
    },
    {
      title: "Predictive & Cloud Intel",
      items: [
        { id: 'forecasting', label: 'Epidemic Forecasting', icon: ShieldAlert, badge: 'BigQuery' },
        { id: 'coldchain', label: 'Cold-Chain IoT Twin', icon: ThermometerSnowflake, badge: 'RTDB' },
        { id: 'cloud-data', label: 'BigQuery & Firebase Hub', icon: Database, badge: 'SQL Studio' },
        { id: 'federated', label: 'Federated Sovereign AI', icon: Network, badge: 'Mesh' },
        { id: 'simulation', label: 'Crisis Sandbox Drills', icon: Zap, badge: 'Drills' }
      ]
    },
    {
      title: "Frontline & Diagnostics",
      items: [
        { id: 'vision', label: 'Gemini Vision Scanner', icon: Sparkles, badge: 'Vision' },
        { id: 'voice', label: 'ASHA Voice Copilot', icon: Languages, badge: '8 Langs' }
      ]
    },
    {
      title: "System & Governance",
      items: [
        { id: 'settings', label: 'System Settings', icon: Settings, badge: 'Config' }
      ]
    }
  ];

  const handleSignOut = async () => {
    await logout();
    router.push('/auth');
  };

  const userInitial = user?.full_name 
    ? user.full_name.trim().charAt(0).toUpperCase() 
    : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');

  const displayName = user?.full_name || (user?.email ? user.email.split('@')[0] : 'Dr. Sreenivasu');
  const roleTitle = getRoleTitle(user?.role);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
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
        {/* Desktop Collapse Toggle Floating Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3.5 top-6 z-50 w-7 h-7 rounded-full bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-cyan-500/50 hover:bg-slate-800 shadow-xl items-center justify-center transition-all cursor-pointer group"
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
            <div className="w-10 h-10 min-w-[40px] rounded-xl overflow-hidden bg-slate-950 border border-cyan-400/40 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <img
                src="/team_logo.jpg"
                alt="Sanjeevani AI Logo"
                className="w-full h-full object-cover rounded-[10px]"
              />
            </div>
            {!isCollapsed && (
              <div className="truncate animate-fade-in">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-base tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent font-display">
                    SANJEEVANI
                  </h1>
                  <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
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
        <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'} py-3.5 space-y-4 scrollbar-thin`}>
          {navCategories.map((category, catIdx) => (
            <div key={catIdx} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
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
                      ${!isAllowed ? 'opacity-65 hover:opacity-100' : ''}
                      ${isActive 
                        ? 'bg-gradient-to-r from-cyan-500/20 via-sky-500/15 to-indigo-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10' 
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
                          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Lock size={9} />
                            <span>Locked</span>
                          </span>
                        ) : item.badge && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                            isActive 
                              ? 'bg-cyan-400/20 text-cyan-200 border border-cyan-400/30' 
                              : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    ) : (
                      /* Tooltip in Collapsed Mode */
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

                    {/* Active Accent Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r-full shadow-glow-cyan" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom User Profile Card */}
        <div className={`p-3 border-t border-slate-800/80 bg-slate-950/70 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {!isCollapsed ? (
            /* USER PROFILE CARD AT BOTTOM */
            <div className="bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-2.5 transition-all">
              <div className="flex items-center justify-between gap-2">
                <div 
                  onClick={() => {
                    setActiveTab('settings');
                    router.push('/settings');
                  }}
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer group/prof flex-1"
                  title="Open System Settings & Profile"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 via-sky-400 to-indigo-500 flex items-center justify-center text-slate-950 font-bold text-xs shadow-inner shrink-0 group-hover/prof:scale-105 transition-transform">
                    {userInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate group-hover/prof:text-cyan-300 transition-colors">
                      {displayName}
                    </div>
                    <div className="text-[10px] font-mono text-cyan-300 truncate">
                      {roleTitle}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors shrink-0"
                  title="Sign Out of Session"
                  aria-label="Sign Out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* Collapsed Mode */
            <div className="flex flex-col items-center py-1">
              {/* Collapsed User Profile Avatar Button */}
              <div className="relative group">
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    router.push('/settings');
                  }}
                  className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-slate-950 font-bold text-sm shadow-md hover:scale-105 transition-all"
                  title={`${displayName} (${roleTitle})`}
                >
                  {userInitial}
                </button>
                {/* Floating Tooltip in Collapsed Mode */}
                <div className="absolute left-full ml-3 bottom-0 px-3 py-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-slate-100 rounded-xl shadow-xl text-xs whitespace-nowrap hidden group-hover:flex flex-col gap-1 z-50">
                  <span className="font-bold text-white">{displayName}</span>
                  <span className="text-[10px] text-cyan-300 font-mono">{roleTitle}</span>
                  <button
                    onClick={handleSignOut}
                    className="mt-1 text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                  >
                    <LogOut size={11} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
