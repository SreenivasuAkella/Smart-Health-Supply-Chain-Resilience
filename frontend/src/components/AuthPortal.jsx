'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Lock, 
  Mail, 
  ShieldCheck, 
  ShieldAlert,
  Key, 
  User, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowRight,
  Building2,
  MapPin,
  ClipboardPaste,
  Globe2,
  Check,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from './SearchableSelect';
import { fetchGeographyApi } from '../services/api';
import { getRoleTitle, getUserJurisdiction } from '../utils/rbac';

const DEMO_PERSONAS = [
  {
    roleName: "National Director",
    scope: "Apex All-India Grid",
    email: "superadmin@sanjeevani.gov.in",
    password: "AdminSanjeevani@123",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
  },
  {
    roleName: "PHC Medical Officer",
    scope: "Varanasi, UP",
    email: "officer.varanasi@sanjeevani.gov.in",
    password: "PHCOfficer@2026",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
  },
  {
    roleName: "Logistics Lead",
    scope: "Pune, MH",
    email: "logistics.pune@sanjeevani.gov.in",
    password: "Logistics@2026",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
  }
];

export default function AuthPortal({ initialRedirect = '/' }) {
  const router = useRouter();
  const [redirectTarget, setRedirectTarget] = useState(initialRedirect);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const redir = params.get('redirect');
      if (redir) setRedirectTarget(redir);
    }
  }, []);

  const { user, isAuthenticated, login, logout, provisionUser, isLoading: authLoading } = useAuth();

  // If already authenticated, redirect directly to Command Center ('/')
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      const target = (redirectTarget && redirectTarget !== '/auth') ? redirectTarget : '/';
      router.replace(target);
    }
  }, [authLoading, isAuthenticated, user, router, redirectTarget]);

  const [activeTab, setActiveTab] = useState('signin'); // 'signin' | 'provision'
  
  // Database Geography Data
  const [geoData, setGeoData] = useState({ states: [], districts_by_state: {} });
  const [geoLoading, setGeoLoading] = useState(false);

  // Sign In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin Provisioning State - strictly NOT auto-filled
  const [provSecret, setProvSecret] = useState('');
  const [showProvSecret, setShowProvSecret] = useState(false);
  const [provEmail, setProvEmail] = useState('');
  const [provPassword, setProvPassword] = useState('');
  const [showProvPassword, setShowProvPassword] = useState(false);
  const [provName, setProvName] = useState('');
  const [provRole, setProvRole] = useState('PHC_OFFICER');
  const [provState, setProvState] = useState('');
  const [provDistrict, setProvDistrict] = useState('');
  const [provLoading, setProvLoading] = useState(false);
  const [provSuccess, setProvSuccess] = useState(null);
  const [provError, setProvError] = useState('');

  // Fetch verified geography records strictly from backend database on mount
  useEffect(() => {
    let mounted = true;
    async function loadGeography() {
      setGeoLoading(true);
      try {
        const data = await fetchGeographyApi();
        if (mounted && data?.states) {
          setGeoData(data);
        }
      } catch (err) {
        console.error("Failed to load geography from database:", err);
      } finally {
        if (mounted) setGeoLoading(false);
      }
    }
    loadGeography();
    return () => { mounted = false; };
  }, []);

  const handleRoleChange = (newRole) => {
    setProvRole(newRole);
    if (newRole === 'NATIONAL_DIRECTOR') {
      setProvState('All India Grid');
      setProvDistrict('All Districts (National)');
    } else {
      if (provState === 'All India Grid') {
        setProvState('');
        setProvDistrict('');
      }
    }
  };

  const handlePasteSecret = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setProvSecret(text.trim());
        }
      }
    } catch {
      // Ignore clipboard read permission errors
    }
  };

  const handleQuickFill = (persona) => {
    setEmail(persona.email);
    setPassword(persona.password);
    setErrorMsg('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      const destination = (redirectTarget && redirectTarget !== '/auth') ? redirectTarget : '/';
      router.push(destination);
    } else {
      setErrorMsg(result.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    setProvError('');
    setProvSuccess(null);

    if (!provSecret.trim()) {
      setProvError('Admin Master Secret Key is required.');
      return;
    }
    if (!provEmail || !provPassword || !provName) {
      setProvError('Full name, email, and password are required.');
      return;
    }
    if (provRole !== 'NATIONAL_DIRECTOR') {
      if (!provState) {
        setProvError('Please assign a verified state from the national registry.');
        return;
      }
      if (!provDistrict) {
        setProvError('Please assign a verified district from the state registry.');
        return;
      }
    }

    setProvLoading(true);
    try {
      const payload = {
        email: provEmail,
        password: provPassword,
        full_name: provName,
        role: provRole,
        assigned_state: provRole === 'NATIONAL_DIRECTOR' ? 'All India Grid' : provState,
        assigned_district: provRole === 'NATIONAL_DIRECTOR' ? 'All Districts (National)' : provDistrict
      };
      const res = await provisionUser(provSecret, payload);
      if (res?.status === 'success') {
        setProvSuccess(res);
        setEmail(provEmail);
        setPassword(provPassword);
        setProvPassword('');
      } else {
        setProvError(res?.detail || res?.error || 'Provisioning failed. Check your Base64 secret key.');
      }
    } catch (err) {
      setProvError(err.message || 'Network error provisioning user.');
    } finally {
      setProvLoading(false);
    }
  };

  return (
    <main 
      className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 bg-cover bg-center bg-no-repeat overflow-y-auto"
      style={{ 
        backgroundImage: "url('/bglogo.png')", 
        backgroundColor: '#020617' 
      }}
    >
      {/* 
        Interactive Authentication Gateway Card
        Shifted left on larger screens (lg:-translate-x-16 xl:-translate-x-24 2xl:-translate-x-28)
        so it lands in the negative space of bglogo.png between the left text and India hologram map.
        Fixed width max-w-lg across both tabs so no jumping occurs.
      */}
      <div 
        className="relative z-10 w-full max-w-lg bg-slate-950/90 sm:bg-slate-900/90 border border-cyan-500/30 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(6,182,212,0.15)] overflow-hidden my-auto transition-all duration-300 lg:-translate-x-16 xl:-translate-x-24 2xl:-translate-x-28"
      >
        {/* Top Accent Gradient Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-400 via-blue-500 via-indigo-500 to-emerald-400" />

        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3.5">
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner shrink-0">
              <ShieldCheck size={22} className="text-cyan-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight font-display">
                  Sanjeevani Access Gateway
                </h1>
                <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Globe2 size={10} /> Gov Grid
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                National Healthcare Supply Chain Resilience & Emergency Grid
              </p>
            </div>
          </div>
        </div>

        {/* If user is already authenticated, show Active Session banner with switch option */}
        {isAuthenticated && user && (
          <div className="p-3.5 mx-5 mt-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-slate-950 font-bold text-xs shadow-md shrink-0">
                {user.full_name ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">{user.full_name || user.email}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                    Active
                  </span>
                </div>
                <p className="text-[10px] text-cyan-300 font-mono truncate">
                  {getRoleTitle(user.role)} • {getUserJurisdiction(user)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={() => router.push(redirectTarget)}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <span>Enter Grid</span>
                <ArrowRight size={13} />
              </button>
              <button
                onClick={logout}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1"
                title="Sign out of current account"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab Switcher: Sign In vs Admin Provisioning */}
        <div className="px-5 pt-3.5 pb-2 bg-slate-950/40">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/90 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('signin')}
              className={`
                py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200
                ${activeTab === 'signin'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-200 font-bold border border-cyan-500/40 shadow-sm shadow-cyan-950/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'}
              `}
            >
              <Lock size={13} className={activeTab === 'signin' ? 'text-cyan-400' : 'text-slate-500'} />
              <span>Personnel Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('provision')}
              className={`
                py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200
                ${activeTab === 'provision'
                  ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-200 font-bold border border-indigo-500/40 shadow-sm shadow-indigo-950/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'}
              `}
            >
              <Key size={13} className={activeTab === 'provision' ? 'text-indigo-400' : 'text-slate-500'} />
              <span>Admin Provisioning</span>
            </button>
          </div>
        </div>

        {/* TAB 1: PERSONNEL SIGN IN */}
        {activeTab === 'signin' && (
          <div className="p-5 sm:p-6 space-y-4 animate-fadeIn">
            {/* Quick Demo Credentials Bar */}
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Sparkles size={11} className="text-cyan-400" />
                  Quick Fill Demo Credentials
                </span>
                <span className="text-[9px] text-slate-500 font-mono">1-Click Fast Auth</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {DEMO_PERSONAS.map((p) => (
                  <button
                    key={p.roleName}
                    type="button"
                    onClick={() => handleQuickFill(p)}
                    className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-all group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {p.roleName}
                      </span>
                      <ArrowRight size={11} className="text-slate-600 group-hover:text-cyan-400 transition-colors transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{p.scope}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Sign In Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-shake">
                  <ShieldAlert size={14} className="shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                  Official Gov / NIC Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer.name@sanjeevani.gov.in"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                  Access Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter security password"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Sovereign Credentials...</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>Sign In to Sanjeevani Grid</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: ADMIN PROVISIONING CONSOLE - REDESIGNED PROPERLY IN SAME WIDTH */}
        {activeTab === 'provision' && (
          <div className="p-5 sm:p-6 space-y-4 animate-fadeIn">
            {/* Master Key Input - Empty by default, NOT auto-filled */}
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-200 flex items-center gap-1.5 font-mono text-[11px]">
                  <Key size={13} className="text-indigo-400" />
                  Admin Provisioning Secret Key (Base64)
                </span>
                <button
                  type="button"
                  onClick={handlePasteSecret}
                  className="flex items-center gap-1 text-[10px] text-indigo-300 hover:text-white bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-500/40 transition-colors"
                  title="Paste from clipboard"
                >
                  <ClipboardPaste size={11} />
                  <span>Paste Key</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showProvSecret ? 'text' : 'password'}
                  value={provSecret}
                  onChange={(e) => setProvSecret(e.target.value)}
                  placeholder="Enter Base64 Admin Master Secret Key..."
                  className="w-full bg-slate-950/90 border border-indigo-500/40 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-400 font-mono"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowProvSecret(!showProvSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label="Toggle secret key visibility"
                >
                  {showProvSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Cryptographic authorization key required to provision official personnel.
              </p>
            </div>

            {provError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert size={14} className="shrink-0 text-rose-400" />
                <span>{provError}</span>
              </div>
            )}

            {provSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 font-bold text-emerald-200">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>Personnel Successfully Provisioned!</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  User <strong className="text-white">{provSuccess.user?.email}</strong> is registered.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('signin')}
                  className="mt-1 px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 rounded-lg text-xs font-semibold border border-emerald-500/40 transition-all flex items-center gap-1"
                >
                  <span>Go to Sign In</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            )}

            <form onSubmit={handleProvisionSubmit} className="space-y-3">
              {/* Row 1: Full Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-mono">
                  Official Full Name
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={provName}
                    onChange={(e) => setProvName(e.target.value)}
                    placeholder="Dr. Rajesh Kumar"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Assigned Email */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-mono">
                  Assigned Gov / NIC Email
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={provEmail}
                    onChange={(e) => setProvEmail(e.target.value)}
                    placeholder="rajesh.kumar@sanjeevani.gov.in"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Row 3: Initial Password & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-mono">
                    Initial Password
                  </label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showProvPassword ? 'text' : 'password'}
                      value={provPassword}
                      onChange={(e) => setProvPassword(e.target.value)}
                      placeholder="Min 8 chars"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowProvPassword(!showProvPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showProvPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-mono">
                    Platform Role
                  </label>
                  <select
                    value={provRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="NATIONAL_DIRECTOR">National Director (Apex)</option>
                    <option value="STATE_DIRECTOR">State Director</option>
                    <option value="PHC_OFFICER">PHC Medical Officer</option>
                    <option value="LOGISTICS_COORDINATOR">Logistics Coordinator</option>
                    <option value="FIELD_EPIDEMIOLOGIST">Field Epidemiologist</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Geographic Jurisdictions */}
              {provRole !== 'NATIONAL_DIRECTOR' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                  <SearchableSelect
                    label="State Jurisdiction"
                    value={provState}
                    onChange={(val) => {
                      setProvState(val);
                      setProvDistrict('');
                    }}
                    options={geoData.states}
                    placeholder={geoLoading ? "Loading..." : "Select State..."}
                    icon={Building2}
                    badgeText="Database"
                  />

                  <SearchableSelect
                    label="District Jurisdiction"
                    value={provDistrict}
                    onChange={(val) => setProvDistrict(val)}
                    options={provState ? (geoData.districts_by_state[provState] || []) : []}
                    placeholder={!provState ? "Select State first" : "Select District..."}
                    disabled={!provState}
                    disabledText="Select State first"
                    icon={MapPin}
                    badgeText="District"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={provLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 cursor-pointer mt-2"
              >
                {provLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registering Personnel...</span>
                  </>
                ) : (
                  <>
                    <Key size={14} />
                    <span>Provision Personnel</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800/60 bg-slate-950/60 text-center">
          <p className="text-[10px] text-slate-500 font-mono">
            Protected by Gaussian Differential Privacy & SHA-256 JWT Grid Tokens
          </p>
        </div>
      </div>
    </main>
  );
}
