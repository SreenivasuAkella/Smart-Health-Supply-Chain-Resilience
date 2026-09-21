'use client';
import React from 'react';
import { 
  Lock, 
  ArrowLeft, 
  UserCheck, 
  Building2, 
  Compass, 
  KeyRound,
  AlertOctagon
} from 'lucide-react';
import { getRoleTitle, getUserJurisdiction, ROLE_CONFIG, getRequiredRolesForTab } from '../utils/rbac';

export default function RoleRestrictedGuard({ 
  tabId, 
  tabTitle = "Module", 
  user, 
  onReturnToOverview,
  compact = false,
  customMessage = null
}) {
  const roleTitle = getRoleTitle(user?.role);
  const jurisdiction = getUserJurisdiction(user);
  const userConfig = ROLE_CONFIG[user?.role];
  const requiredRoles = tabId ? getRequiredRolesForTab(tabId) : ['NATIONAL_DIRECTOR'];

  if (compact) {
    return (
      <div className="w-full bg-slate-900/90 border border-amber-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-xl relative overflow-hidden my-4">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-amber-500/50 shadow-lg shadow-amber-500/20 bg-slate-950">
              <img 
                src="/team_logo.jpg" 
                alt="Sanjeevani Team Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center border-2 border-slate-900 shadow-md">
              <Lock size={12} strokeWidth={3} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ERROR 4007 • ROLE LOCKED
              </span>
              <span className="text-xs text-slate-400 font-mono">Requires: {requiredRoles.join(', ')}</span>
            </div>
            <h4 className="text-sm font-bold text-white mt-1 truncate">
              {tabTitle} Clearance Restricted
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {customMessage || `Your role (${roleTitle}) does not have permission to access this component.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[65vh] flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-xl w-full bg-slate-900/95 border border-amber-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Tag */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
              Access Clearance Guard • Code 4007
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
            Role Permission Denied
          </span>
        </div>

        {/* Sanjeevani Team Logo with Lock Overlaid */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-400/60 p-0.5 bg-slate-950 shadow-xl shadow-amber-500/20">
              <img
                src="/team_logo.jpg"
                alt="Sanjeevani AI Team Logo"
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-slate-950 flex items-center justify-center border-2 border-slate-900 shadow-xl animate-pulse">
              <Lock size={15} strokeWidth={2.5} className="text-white" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold tracking-wider text-amber-400 uppercase bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                SANJEEVANI AI RESILIENCE GRID
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Higher Security Clearance Required
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Cryptographic lock engaged for <strong className="text-amber-300 font-semibold">{tabTitle}</strong>.
            </p>
          </div>
        </div>

        {/* User Credential Verification Box */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 mb-6 font-mono text-xs shadow-inner">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/70 pb-2">
            <span className="flex items-center gap-1.5 text-slate-300">
              <UserCheck size={13} className="text-cyan-400" /> Active Personnel:
            </span>
            <span className="text-white font-bold">{user?.full_name || user?.email}</span>
          </div>

          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/70 pb-2">
            <span className="flex items-center gap-1.5 text-slate-300">
              <KeyRound size={13} className="text-indigo-400" /> Your Assigned Role:
            </span>
            <span className="text-cyan-300 font-bold">{roleTitle}</span>
          </div>

          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/70 pb-2">
            <span className="flex items-center gap-1.5 text-slate-300">
              <AlertOctagon size={13} className="text-rose-400" /> Required Role Clearance:
            </span>
            <span className="text-amber-400 font-bold">{requiredRoles.join(' or ')}</span>
          </div>

          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/70 pb-2">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Compass size={13} className="text-amber-400" /> Security Clearance Level:
            </span>
            <span className="text-amber-300 font-semibold">{userConfig?.level || "Personnel Clearance"}</span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Building2 size={13} className="text-emerald-400" /> Operating Jurisdiction:
            </span>
            <span className="text-emerald-300 font-bold">{jurisdiction}</span>
          </div>
        </div>

        {/* Informational Guidance */}
        <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px] text-slate-400 space-y-1.5 mb-6">
          <p className="flex items-center gap-1.5 text-slate-200 font-semibold">
            <Lock size={12} className="text-amber-400 shrink-0" />
            Zero-Trust Public Health Grid Protocol (Code 4007):
          </p>
          <p className="leading-relaxed">
            Under MoHFW sovereign architecture, operational modules such as federated AI model synchronization and crisis simulation drills strictly require Apex National Director credentials. Local PHC officers, logistics coordinators, and field epidemiologists are role-partitioned to their specific domain scopes.
          </p>
        </div>

        {/* Action Button */}
        {onReturnToOverview && (
          <button
            onClick={onReturnToOverview}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Return to Authorized Command Center</span>
          </button>
        )}
      </div>
    </div>
  );
}
