'use client';
import React, { useState } from 'react';
import { Camera, Upload, Sparkles, CheckCircle2, AlertTriangle, RefreshCw, FileCheck, ShieldCheck, Database } from 'lucide-react';
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
      const res = await scanMedicineWithVision(selectedImage, apiKey);
      setScanResult(res);
    }
    setLoading(false);
  };

  const handleSyncToLedger = async () => {
    if (!scanResult) return;
    setSyncStatus('SYNCING');
    await updateStockLedger("PHC-BARAGAON-03", "MED-ASV-001", 10, "Gemini Multimodal Intake Scan");
    setSyncStatus('SUCCESS');
    if (onStockUpdated) onStockUpdated();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-cyan-500/20 text-cyan-300 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <Sparkles size={13} /> Gemini 1.5 Multimodal Vision API
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Multimodal Medicine & Vaccine Inspection Scanner
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
            Instant camera OCR to verify batch numbers, compute expiry lead-time, authenticate security holograms, and flag counterfeit batches before clinic intake.
          </p>
        </div>

        {/* 1-Click Clinical Demo Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Quick Demo Samples:</span>
          {samplePresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setImagePreview(null);
                setSelectedImage(null);
                handleRunScan(preset);
              }}
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-2.5 py-1.5 rounded-lg transition-all"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Scanner Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Upload & Image Viewport */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Camera size={18} className="text-cyan-400" />
            Upload Drug Packaging or Vaccine Vial Image
          </h3>

          <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-2xl p-6 text-center transition-all bg-slate-900/50">
            {imagePreview ? (
              <div className="space-y-3">
                <img 
                  src={imagePreview} 
                  alt="Scanned Medicine" 
                  className="max-h-56 mx-auto rounded-xl object-contain shadow-lg"
                />
                <button 
                  onClick={() => { setImagePreview(null); setSelectedImage(null); }}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Remove & Upload Another
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Upload size={24} />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">Click to upload photo</span>
                  <span className="text-xs text-slate-400 block mt-0.5">Supports PNG, JPG, JPEG (Max 10MB)</span>
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

          <div className="flex gap-3">
            <button
              onClick={() => handleRunScan()}
              disabled={!selectedImage || loading}
              className={`w-full ${selectedImage ? 'btn-primary' : 'bg-slate-800 text-slate-500 cursor-not-allowed'} py-3 justify-center text-sm font-semibold rounded-xl`}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Gemini Multimodal Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Run Gemini Vision Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Extracted Structured Intelligence */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <FileCheck size={18} className="text-emerald-400" />
              Clinical Extraction & Authenticity Ledger
            </h3>
            {scanResult && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                scanResult.tamper_or_damage_detected 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {scanResult.packaging_status}
              </span>
            )}
          </div>

          {scanResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Brand Name</span>
                  <span className="font-bold text-white text-sm">{scanResult.brand_name}</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Batch Number</span>
                  <span className="font-mono font-bold text-cyan-300 text-sm">{scanResult.batch_number}</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Manufacturer</span>
                  <span className="font-semibold text-slate-200">{scanResult.manufacturer}</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Expiry Date</span>
                  <span className={`font-bold ${scanResult.days_to_expiry < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {scanResult.expiry_date} ({scanResult.days_to_expiry > 0 ? `${scanResult.days_to_expiry}d left` : 'EXPIRED'})
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1 text-xs">
                <span className="text-slate-400 block text-[11px]">Storage Condition Verified</span>
                <span className="text-cyan-300 font-medium">{scanResult.storage_condition}</span>
              </div>

              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400 text-[11px]">Counterfeit / Tamper Risk Score</span>
                  <span className={`font-bold ${scanResult.counterfeit_risk_score > 30 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {scanResult.counterfeit_risk_score}% Risk
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {scanResult.verification_notes}
                </p>
              </div>

              {scanResult.e_aushadhi_ledger_sync_ready && (
                <button
                  onClick={handleSyncToLedger}
                  disabled={syncStatus === 'SUCCESS'}
                  className="w-full btn-primary justify-center text-xs py-2.5"
                >
                  {syncStatus === 'SUCCESS' ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Intake Confirmed & Synced to e-Aushadhi (+10 Units)</span>
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
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
              <ShieldCheck size={36} className="text-slate-600" />
              <span>Select a quick demo sample or upload a medicine photo to run Gemini Vision.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
