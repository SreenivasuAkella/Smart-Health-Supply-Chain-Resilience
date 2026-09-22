'use client';
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  User, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Terminal, 
  Sparkles, 
  ArrowRight,
  Building2,
  MapPin,
  ClipboardPaste,
  Cpu,
  Globe2,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from './SearchableSelect';
import { fetchGeographyApi } from '../services/api';

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

export default function LoginModal({ isOpen, onClose, isMandatory = false }) {
  const { login, provisionUser, isLoading: authLoading } = useAuth();

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

  // Admin Provisioning State
  const envSecretKey = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ADMIN_SECRET_KEY_B64) || '';
  const [provSecret, setProvSecret] = useState(envSecretKey);
  const [provEmail, setProvEmail] = useState('');
  const [provPassword, setProvPassword] = useState('');
  const [provName, setProvName] = useState('');
  const [provRole, setProvRole] = useState('PHC_OFFICER');
  const [provState, setProvState] = useState('');
  const [provDistrict, setProvDistrict] = useState('');
  const [provLoading, setProvLoading] = useState(false);
  const [provSuccess, setProvSuccess] = useState(null);
  const [provError, setProvError] = useState('');

  // Fetch verified geography records strictly from backend / database on mount
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
          return;
        }
      }
    } catch {
      // Fallback
    }
    if (envSecretKey) {
      setProvSecret(envSecretKey);
    }
  };

  const handleQuickFill = (persona) => {
    setEmail(persona.email);
    setPassword(persona.password);
    setErrorMsg('');
  };

  if (!isOpen) return null;

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

    if (!result.success) {
      setErrorMsg(result.error || 'Invalid credentials or user not provisioned.');
    } else {
      if (onClose) onClose();
    }
  };

  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    setProvError('');
    setProvSuccess(null);

    if (!provSecret) {
      setProvError('Base64 Admin Secret Key is strictly required.');
      return;
    }
    if (!provEmail || !provPassword || !provName) {
      setProvError('Please fill in email, password, and personnel full name.');
      return;
    }

    if (provRole !== 'NATIONAL_DIRECTOR') {
      if (!provState) {
        setProvError('Please select a verified State from the database.');
        return;
      }
      if (!provDistrict) {
        setProvError(`Please select a verified District in ${provState} from the database.`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn overflow-y-auto">
      {/* Sanjeevani Command Center Background Image */}
      <div 
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{ backgroundImage: "url('/bglogo.png')" }}
      />
      {/* Dark vignette & ambient overlays for optimal focus and contrast */}
      <div className="fixed inset-0 pointer-events-none bg-slate-950/65 backdrop-blur-[1px]" />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/80" />

      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[600px] h-[500px] bg-cyan-500/15 rounded-full blur-[120px] -translate-y-12 animate-pulse" />
        <div className="w-[500px] h-[400px] bg-indigo-500/15 rounded-full blur-[100px] translate-y-12" />
      </div>

      <div 
        className={`
          relative w-full ${activeTab === 'provision' ? 'max-w-2xl' : 'max-w-lg'} 
          bg-slate-900/90 border border-cyan-500/30 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(6,182,212,0.15)] 
          overflow-hidden backdrop-blur-2xl transition-all duration-300 my-auto
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Watermark texture inside Card */}
        <div 
          className="absolute inset-0 pointer-events-none bg-cover bg-center opacity-10 mix-blend-screen"
          style={{ backgroundImage: "url('/bglogo.png')" }}
        />
        {/* Top Accent Gradient Bar */}
        <div className="relative z-10 h-1.5 w-full bg-gradient-to-r from-cyan-400 via-blue-500 via-indigo-500 to-emerald-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3.5">
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
              <ShieldCheck size={22} className="text-cyan-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-slate-900 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight font-display">
                  Sanjeevani Access Gateway
                </h3>
                <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Globe2 size={10} /> Gov Grid
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                National Healthcare Supply Chain Resilience & Emergency Grid
              </p>
            </div>
          </div>

          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition-all"
              aria-label="Close Modal"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Modern Segmented Pill Tab Switcher */}
        <div className="px-6 pt-4 pb-2 bg-slate-950/30">
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
              <span>Admin Provisioning Console</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Personnel Sign In */}
        {activeTab === 'signin' && (
          <div className="p-6 space-y-5 animate-fadeIn">
            {/* Quick Demo Credentials Bar */}
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Sparkles size={11} className="text-cyan-400" />
                  Quick Fill Demo Credentials
                </span>
                <span className="text-slate-500">1-Click Test Login</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {DEMO_PERSONAS.map((p) => (
                  <button
                    key={p.roleName}
                    type="button"
                    onClick={() => handleQuickFill(p)}
                    className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-700/60 hover:border-cyan-500/40 text-left transition-all group"
                  >
                    <div className="text-[11px] font-bold text-white group-hover:text-cyan-300 truncate">
                      {p.roleName}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate mt-0.5 font-mono">
                      {p.scope}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Official Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="personnel@sanjeevani.gov.in"
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Error Message Directly Above Action Button */}
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-3 shadow-lg shadow-rose-950/50 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert size={16} className="shrink-0 text-rose-400" />
                    <span className="font-medium leading-relaxed">{errorMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMsg('')}
                    className="text-rose-400 hover:text-white p-1 rounded-lg hover:bg-rose-500/20 transition-colors shrink-0"
                    title="Dismiss error"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || authLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials & Generating Tokens...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate & Access Command Grid</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Admin Provisioning Console */}
        {activeTab === 'provision' && (
          <div className="p-6 space-y-4 animate-fadeIn max-h-[78vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
            {provSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs space-y-3 animate-fadeIn shadow-lg shadow-emerald-950/40">
                <div className="flex items-center gap-2.5 font-bold text-emerald-300 text-sm">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  <span>{provSuccess.message || "Personnel account provisioned successfully."}</span>
                </div>
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  The account has been created in the live database. You can now switch to the sign-in console to log in immediately.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin');
                    setEmail(provEmail);
                    setProvSuccess(null);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-emerald-500/40"
                >
                  <span>Switch to Sign In Console ({provEmail})</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}

            <form onSubmit={handleProvisionSubmit} className="space-y-4">
              {/* Group 1: Identity & Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User size={13} className="text-indigo-400" />
                    <span>Full Name & Title <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    value={provName}
                    onChange={(e) => setProvName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma, MD"
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Mail size={13} className="text-indigo-400" />
                    <span>Official Email <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="email"
                    required
                    value={provEmail}
                    onChange={(e) => setProvEmail(e.target.value)}
                    placeholder="officer@sanjeevani.gov.in"
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 font-sans"
                  />
                </div>
              </div>

              {/* Group 2: Password & Base64 Secret */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Key size={13} className="text-indigo-400" />
                    <span>Initial Account Password <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="password"
                    required
                    value={provPassword}
                    onChange={(e) => setProvPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                      <Terminal size={13} className="text-indigo-400" />
                      <span>Base64 Admin Secret <span className="text-rose-400">*</span></span>
                    </label>
                    <button
                      type="button"
                      onClick={handlePasteSecret}
                      className="text-[10px] text-indigo-300 hover:text-white flex items-center gap-1 font-mono hover:underline"
                    >
                      <ClipboardPaste size={11} /> Paste
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={provSecret}
                    onChange={(e) => setProvSecret(e.target.value)}
                    placeholder="Enter Base64 Admin Secret Key"
                    className="w-full bg-slate-950/90 border border-indigo-500/40 rounded-xl px-3.5 py-2.5 text-xs text-indigo-200 placeholder-slate-600 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 font-mono"
                  />
                </div>
              </div>

              {/* Group 3: Grid Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Cpu size={13} className="text-cyan-400" />
                  <span>Assigned Grid Role & Clearance Level <span className="text-rose-400">*</span></span>
                </label>
                <select
                  value={provRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer font-sans"
                >
                  <option value="NATIONAL_DIRECTOR">National Director — Apex Pan-India Command (All Tabs Unlocked)</option>
                  <option value="PHC_OFFICER">PHC Medical Officer — Facility Intake, Vision Scanner & Local Dispatch</option>
                  <option value="LOGISTICS_COORDINATOR">Logistics Coordinator — Fleet Management, Transport & Cold-Chain</option>
                  <option value="SURVEILLANCE_EPIDEMIOLOGIST">Surveillance Epidemiologist — IDSP Outbreak Forecasting & Bio-Climatic Matrix</option>
                </select>

                {/* Role Description Notice */}
                <div className="mt-2 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                  {provRole === 'NATIONAL_DIRECTOR' && (
                    <span><strong>Apex Clearance:</strong> Full jurisdiction across all 35 States, 594 Districts, and administrative command consoles.</span>
                  )}
                  {provRole === 'PHC_OFFICER' && (
                    <span><strong>Clinical Clearance:</strong> Facility-level stock intake, multimodal OCR medicine scanner, and emergency requisition.</span>
                  )}
                  {provRole === 'LOGISTICS_COORDINATOR' && (
                    <span><strong>Transport Clearance:</strong> Cold-chain telemetry monitoring, emergency vehicle routing, and corridor dispatch.</span>
                  )}
                  {provRole === 'SURVEILLANCE_EPIDEMIOLOGIST' && (
                    <span><strong>Analytics Clearance:</strong> Vector vulnerability matrix, IDSP disease outbreak projections, and BigQuery analytics.</span>
                  )}
                </div>
              </div>

              {/* Group 4: Geographic Jurisdiction Assignment (Two spacious side-by-side columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <SearchableSelect
                    label="Assigned State Jurisdiction"
                    value={provRole === 'NATIONAL_DIRECTOR' ? 'All India Grid' : provState}
                    onChange={(val) => {
                      setProvState(val);
                      setProvDistrict('');
                    }}
                    options={geoData.states || []}
                    placeholder={geoLoading ? "Loading database..." : "Select State Jurisdiction..."}
                    disabled={provRole === 'NATIONAL_DIRECTOR'}
                    disabledText="All India Grid (National Scope)"
                    emptyMessage="State not found in verified database"
                    icon={Building2}
                    badgeText={provRole === 'NATIONAL_DIRECTOR' ? 'All India' : `${geoData.states?.length || 35} States`}
                    placement="top"
                  />
                </div>

                <div>
                  <SearchableSelect
                    label="Assigned District Jurisdiction"
                    value={provRole === 'NATIONAL_DIRECTOR' ? 'All Districts (National)' : provDistrict}
                    onChange={(val) => setProvDistrict(val)}
                    options={provState ? (geoData.districts_by_state[provState] || []) : []}
                    placeholder={!provState ? "Select State first" : "Select District Jurisdiction..."}
                    disabled={provRole === 'NATIONAL_DIRECTOR' || !provState}
                    disabledText={provRole === 'NATIONAL_DIRECTOR' ? "All 594 Districts (National Scope)" : "Select State first"}
                    emptyMessage={`No matching district in ${provState}`}
                    icon={MapPin}
                    badgeText={provState ? `${(geoData.districts_by_state?.[provState] || []).length} Districts` : null}
                    placement="top"
                  />
                </div>
              </div>

              {/* Database Verification Status Line */}
              {provRole !== 'NATIONAL_DIRECTOR' && (
                <div className="px-1 text-[10px] text-slate-400 flex items-center justify-between font-mono bg-slate-950/40 py-1.5 rounded-lg">
                  <span>Verified Database: <strong className="text-cyan-400">{geoData.states?.length || 35} States</strong> loaded</span>
                  {provState ? (
                    <span>Districts in {provState}: <strong className="text-indigo-300">{(geoData.districts_by_state?.[provState] || []).length}</strong></span>
                  ) : (
                    <span className="text-amber-400/80">Select State to filter verified districts</span>
                  )}
                </div>
              )}

              {/* Error Message Directly Above Provision Button */}
              {provError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-3 shadow-lg shadow-rose-950/50 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert size={16} className="shrink-0 text-rose-400" />
                    <span className="font-medium leading-relaxed">{provError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProvError('')}
                    className="text-rose-400 hover:text-white p-1 rounded-lg hover:bg-rose-500/20 transition-colors shrink-0"
                    title="Dismiss error"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Provision Action Button */}
              <button
                type="submit"
                disabled={provLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-400 hover:via-purple-500 hover:to-pink-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {provLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Cryptographically Provisioning Account...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Authorize & Provision Healthcare Personnel</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            Sanjeevani Access Gateway v2.4
          </span>
          <span>MoHFW Sovereign Infrastructure &bull; Authorized Personnel Only</span>
        </div>
      </div>
    </div>
  );
}
