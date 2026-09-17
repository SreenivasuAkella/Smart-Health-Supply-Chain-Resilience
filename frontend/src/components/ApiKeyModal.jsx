'use client';
import React, { useState } from 'react';
import { X, Key, Check, ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';

export default function ApiKeyModal({ isOpen, onClose, apiKey, onSaveKey }) {
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveKey(inputKey.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div 
        className="glass-panel w-full max-w-lg p-6 sm:p-7 relative border border-slate-700/80 shadow-2xl rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Key size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Google Gemini API Key
              </h3>
              <p className="text-xs text-slate-400">
                Powers Multimodal Vision OCR & ASHA Voice Copilot
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Gemini API Key (from Google AI Studio):
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none font-mono transition-colors"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck size={13} /> Stored locally in your browser
            </span>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noreferrer"
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              Get free key <ExternalLink size={11} />
            </a>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Sparkles size={13} className="text-cyan-400" /> Free Tier Available
            </div>
            <p className="text-[11px] leading-relaxed">
              Google AI Studio provides a free quota for Gemini 1.5 & 2.0 Flash models. Without a key, the app seamlessly runs using cached public Indian health surveillance datasets.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button 
            onClick={onClose} 
            className="btn-secondary text-xs px-4 py-2"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="btn-primary text-xs px-5 py-2"
          >
            {savedSuccess ? (
              <>
                <Check size={14} className="text-emerald-300" />
                <span>Saved & Configured!</span>
              </>
            ) : (
              <span>Save & Activate</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
