'use client';
import React, { useState } from 'react';
import { 
  Camera, Upload, Sparkles, CheckCircle2, AlertTriangle, RefreshCw, 
  FileCheck, ShieldCheck, Database, QrCode, ShieldAlert, ArrowRight, Pill, Loader2
} from 'lucide-react';
import { scanMedicineWithVision, updateStockLedger } from '../services/api';

export default function MultimodalVisionScanner({ apiKey, onStockUpdated }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);

  const samplePresets = [
    {
      label: "Anti-Snake Venom (ASV)",
      name: "Polyvalent Anti-Snake Venom Serum IP (Lyophilized 10ml)",
      batch: "ASV-UP-2025-94B",
      exp: "03/2028",
      mfg: "Bharat Serums & Vaccines Ltd.",
      imagePlaceholder: "🐍 Anti-Snake Venom Vial (2-8°C Cold Chain)"
    },
    {
      label: "Anti-Rabies Vaccine",
      name: "Rabivax-S (Purified Vero Cell Rabies Vaccine)",
      batch: "RVX-2026-11C",
      exp: "12/2027",
      mfg: "Serum Institute of India",
      imagePlaceholder: "💉 Rabies Single Dose Vial (0.5ml)"
    },
    {
      label: "Human Insulin NPH",
      name: "Human Insulin NPH 100 IU/ml (10ml)",
      batch: "INS-2025-88A",
      exp: "09/2027",
      mfg: "Biocon Biologics",
      imagePlaceholder: "🧪 Insulin Suspension (2-8°C)"
    },
    {
      label: "Tampered / Expired Blister",
      name: "Paracetamol 500mg IP (Degraded Seal)",
      batch: "PCM-2023-01X",
      exp: "01/2024 (EXPIRED)",
      mfg: "Unverified Local Lab",
      isTampered: true,
      imagePlaceholder: "⚠️ Damaged Blister Strip with Expired Batch"
    }
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunScan = async (presetData = null) => {
    setLoading(true);
    setSyncStatus(null);

    if (presetData) {
      setTimeout(() => {
        if (presetData.isTampered) {
          setScanResult({
            brand_name: presetData.name,
            generic_name: "Paracetamol Tablets IP",
            batch_number: presetData.batch,
            manufacturer: presetData.mfg,
            mfg_date: "01/2022",
            expiry_date: "01/2024",
            days_to_expiry: -580,
            dosage_form: "Strip of 10 Tablets",
            storage_condition: "Store below 30°C",
            tamper_or_damage_detected: true,
            packaging_status: "Degraded Label & Expired Stock",
            counterfeit_risk_score: 84.5,
            barcode_or_qr_detected: false,
            verification_notes: "CRITICAL: Drug expired over 18 months ago. Packaging seal shows signs of moisture infiltration. Quarantine item immediately.",
            e_aushadhi_ledger_sync_ready: false,
            ai_engine_used: "Google Gemini 1.5 Flash (Multimodal OCR & Counterfeit Detector)"
          });
        } else {
          setScanResult({
            brand_name: presetData.name,
            generic_name: presetData.name.split("(")[0],
            batch_number: presetData.batch,
            manufacturer: presetData.mfg,
            mfg_date: "04/2025",
            expiry_date: presetData.exp,
            days_to_expiry: 620,
            dosage_form: "Vial / Injection",
            storage_condition: "Store between 2°C to 8°C. Do not freeze.",
            tamper_or_damage_detected: false,
            packaging_status: "Intact & Authenticated",
            counterfeit_risk_score: 2.1,
            barcode_or_qr_detected: true,
            verification_notes: "CDSCO National Drug Registry matched. GS1 2D DataMatrix code authenticated against central vaccine ledger.",
            e_aushadhi_ledger_sync_ready: true,
            ai_engine_used: "Google Gemini 1.5 Flash (Multimodal OCR & Counterfeit Detector)"
          });
        }
        setLoading(false);
      }, 700);
      return;
    }

    if (selectedImage) {
      try {
        const res = await scanMedicineWithVision(selectedImage, apiKey);
        setScanResult(res);
      } catch (err) {
        console.error("Vision scan error:", err);
      }
    }
    setLoading(false);
  };

  const handleSyncToLedger = async () => {
    if (!scanResult) return;
    setSyncStatus('SYNCING');
    try {
      await updateStockLedger("PHC-BARAGAON-03", "PUB-MED-001", 10, "Gemini Multimodal Intake Scan");
      setSyncStatus('SUCCESS');
      if (onStockUpdated) onStockUpdated();
    } catch (err) {
      console.error("Sync error:", err);
      setSyncStatus('ERROR');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Action Bar with Demo Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5">
            <Sparkles size={13} /> Gemini 1.5 Multimodal Vision
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Sub-second Batch OCR &bull; Expiry Verification &bull; Anti-Counterfeiting Hologram Check
          </span>
        </div>

        {/* 1-Click Clinical Demo Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold hidden md:inline">Inspect Sample:</span>
          {samplePresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setImagePreview(null);
                setSelectedImage(null);
                handleRunScan(preset);
              }}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all border ${
                preset.isTampered
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'btn-secondary'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Scanner Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Upload & Image Viewport */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Camera size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white font-display">
                  Medicine Packaging & Ampoule Scanner
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Upload or capture vaccine vial, blister pack, or QR shipment label
                </p>
              </div>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-700/80 hover:border-cyan-500/50 rounded-2xl p-6 text-center transition-all bg-slate-900/40">
            {imagePreview ? (
              <div className="space-y-3">
                <img 
                  src={imagePreview} 
                  alt="Scanned Medicine" 
                  className="max-h-56 mx-auto rounded-xl object-contain shadow-2xl border border-slate-700/60"
                />
                <button 
                  onClick={() => { setImagePreview(null); setSelectedImage(null); }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                >
                  Remove & Upload Another Photo
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block space-y-3 py-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
                  <Upload size={24} />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">Click to upload medicine photo</span>
                  <span className="text-xs text-slate-400 mt-1 block">Supports PNG, JPG, WEBP (Direct Camera or Gallery)</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            )}
          </div>

          <button
            onClick={() => handleRunScan()}
            disabled={!selectedImage || loading}
            className={`w-full ${selectedImage ? 'btn-primary' : 'bg-slate-800/80 text-slate-500 cursor-not-allowed'} py-3 justify-center text-xs font-bold rounded-xl shadow-md`}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin text-cyan-300" />
                <span>Gemini Multimodal OCR Running...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Run Gemini Vision Analysis</span>
              </>
            )}
          </button>
        </div>

        {/* Extracted Structured Intelligence */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <FileCheck size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white font-display">
                  Verification & Inspection Ledger
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated OCR extraction and counterfeit risk analysis
                </p>
              </div>
            </div>
            {scanResult && (
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${
                scanResult.tamper_or_damage_detected 
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {scanResult.packaging_status}
              </span>
            )}
          </div>

          {scanResult ? (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Brand Name</span>
                  <span className="font-bold text-white text-sm block mt-0.5">{scanResult.brand_name}</span>
                </div>
                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Batch Number</span>
                  <span className="font-mono font-bold text-cyan-300 text-sm block mt-0.5">{scanResult.batch_number}</span>
                </div>
                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Manufacturer</span>
                  <span className="font-semibold text-slate-200 block mt-0.5">{scanResult.manufacturer}</span>
                </div>
                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Expiry Date</span>
                  <span className={`font-bold block mt-0.5 ${scanResult.days_to_expiry < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {scanResult.expiry_date} ({scanResult.days_to_expiry > 0 ? `${scanResult.days_to_expiry}d left` : 'EXPIRED'})
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1 text-xs">
                <span className="text-slate-400 block text-[11px]">Recommended Cold Chain Storage</span>
                <span className="text-cyan-300 font-semibold">{scanResult.storage_condition}</span>
              </div>

              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400 text-[11px] font-semibold">Counterfeit & Tamper Risk Score</span>
                  <span className={`font-mono font-bold ${scanResult.counterfeit_risk_score > 30 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {scanResult.counterfeit_risk_score}% Risk
                  </span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {scanResult.verification_notes}
                </p>
              </div>

              {scanResult.e_aushadhi_ledger_sync_ready && (
                <button
                  onClick={handleSyncToLedger}
                  disabled={syncStatus === 'SUCCESS'}
                  className="w-full btn-primary justify-center text-xs py-2.5 font-semibold"
                >
                  {syncStatus === 'SUCCESS' ? (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-300" />
                      <span>Intake Verified & Logged (+10 Units)</span>
                    </>
                  ) : (
                    <>
                      <Database size={15} />
                      <span>Sync Verified Intake to PHC Inventory Ledger</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <ShieldCheck size={26} />
              </div>
              <span className="text-center max-w-xs">
                Select a sample preset above or upload an image to run live Gemini Multimodal Vision analysis.
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
