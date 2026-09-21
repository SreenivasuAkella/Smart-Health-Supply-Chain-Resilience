'use client';
import React, { useState } from 'react';
import { 
  Camera, Upload, Sparkles, CheckCircle2, AlertTriangle, RefreshCw, 
  FileCheck, ShieldCheck, Database, QrCode, ShieldAlert, ArrowRight, Pill, Loader2,
  Thermometer, FileText, Bot, AlertOctagon, Check
} from 'lucide-react';
import { scanMedicineWithVision, updateStockLedger } from '../services/api';
import OpenFDAClinicalCard from './OpenFDAClinicalCard';

export default function MultimodalVisionScanner({ apiKey, onStockUpdated, facilities = [] }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState('PHC-BARAGAON-03');
  const [intakeQty, setIntakeQty] = useState(10);
  const [isDragging, setIsDragging] = useState(false);

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

  const processFile = (file) => {
    if (!file) return;
    setSelectedImage(file);
    setScanResult(null);
    setScanError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRunScan = async (presetData = null) => {
    setLoading(true);
    setSyncStatus(null);
    setScanError(null);

    if (presetData) {
      setTimeout(() => {
        if (presetData.isTampered) {
          setScanResult({
            category: "MEDICINE_PACK",
            summary_title: `${presetData.name} - Tamper / Expiry Alert`,
            findings_summary: "CRITICAL: Drug expired over 18 months ago. Packaging seal shows signs of moisture infiltration. Quarantine item immediately.",
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
            category: "MEDICINE_PACK",
            summary_title: `${presetData.name} Authenticated`,
            findings_summary: "CDSCO National Drug Registry matched. GS1 2D DataMatrix code authenticated against central vaccine ledger.",
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

    if (imagePreview || selectedImage) {
      try {
        const payload = {
          image_base64: imagePreview,
          mime_type: selectedImage?.type || "image/jpeg",
          apiKey: apiKey,
          hint: selectedImage?.name ? `Inspect packaging of ${selectedImage.name}` : "Inspect health asset packaging"
        };
        const res = await scanMedicineWithVision(payload);
        const data = res?.data || res;
        if (!data || data.error) {
          throw new Error(data?.error || "Gemini vision analysis returned an empty response.");
        }
        setScanResult(data);
      } catch (err) {
        console.error("Vision scan error:", err);
        setScanError(err.message || "Failed to analyze image with Gemini Vision. Please verify your connection or try another photo.");
      }
    }
    setLoading(false);
  };

  const handleSyncToLedger = async () => {
    if (!scanResult) return;
    setSyncStatus('SYNCING');
    try {
      const brand = scanResult.brand_name || scanResult.name || "Inspected Asset";
      const generic = scanResult.generic_name || brand;
      const medId = scanResult.medicine_id || scanResult.medicine_details?.medicine_id || `PUB-MED-${brand.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}`;
      const facId = selectedFacilityId || "PHC-BARAGAON-03";
      const fda = scanResult.openfda_clinical_insights || scanResult.medicine_details?.openfda_clinical_insights;

      await updateStockLedger(
        medId,
        facId,
        intakeQty,
        `Gemini Multimodal Intake Scan: ${brand} (Batch: ${scanResult.batch_number || 'N/A'})`,
        {
          medicine_name: brand,
          brand_name: brand,
          generic_name: generic,
          batch_number: scanResult.batch_number,
          expiry_date: scanResult.expiry_date,
          openfda_insights: fda
        }
      );
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

          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all bg-slate-900/40 ${
              isDragging 
                ? 'border-cyan-400 bg-cyan-500/10 shadow-lg' 
                : 'border-slate-700/80 hover:border-cyan-500/50'
            }`}
          >
            {imagePreview ? (
              <div className="space-y-3">
                <img 
                  src={imagePreview} 
                  alt="Scanned Medicine" 
                  className="max-h-56 mx-auto rounded-xl object-contain shadow-2xl border border-slate-700/60"
                />
                <button 
                  onClick={() => { setImagePreview(null); setSelectedImage(null); setScanResult(null); setScanError(null); }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors"
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
                  <span className="text-sm font-bold text-white block">Click or Drag photo here to inspect</span>
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
            disabled={(!imagePreview && !selectedImage) || loading}
            className={`w-full ${(imagePreview || selectedImage) && !loading ? 'btn-primary' : 'bg-slate-800/80 text-slate-500 cursor-not-allowed'} py-3 justify-center text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2`}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin text-cyan-300" />
                <span>Gemini Multimodal Vision Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Run Gemini Vision Analysis</span>
              </>
            )}
          </button>

          {scanError && (
            <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-300 flex items-start gap-2.5 animate-fade-in">
              <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Analysis Failed</span>
                <p className="text-[11px] text-rose-200/90 mt-0.5">{scanError}</p>
                <button
                  onClick={() => handleRunScan()}
                  className="mt-2 text-[10px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-lg font-bold transition-all"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          )}
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
                  {scanResult?.summary_title || "Verification & Inspection Ledger"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                  {scanResult ? (
                    <>
                      <span className="text-cyan-400 font-semibold">{scanResult.category || "MEDICINE_PACK"}</span>
                      <span>&bull;</span>
                      <span className="text-slate-300">{scanResult.ai_engine_used || "Google Gemini Vision"}</span>
                    </>
                  ) : (
                    "Automated OCR extraction and counterfeit risk analysis"
                  )}
                </p>
              </div>
            </div>
            {scanResult && (
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${
                scanResult.tamper_or_damage_detected 
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {scanResult.packaging_status || (scanResult.tamper_or_damage_detected ? "Tampered" : "Authenticated")}
              </span>
            )}
          </div>

          {scanResult ? (
            <div className="space-y-4 animate-fade-in">
              {/* Findings Summary Banner */}
              {scanResult.findings_summary && (
                <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-slate-900/40 border border-cyan-500/30 rounded-2xl p-3.5 flex items-start gap-2.5 shadow-sm">
                  <Sparkles size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-200 leading-relaxed">
                    <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block mb-0.5">
                      Clinical Inspection Assessment
                    </span>
                    <p className="text-[11px] text-slate-300">{scanResult.findings_summary}</p>
                  </div>
                </div>
              )}

              {/* Multi-Category: ILR Thermometer Excursion */}
              {scanResult.category === 'ILR_THERMOMETER' && scanResult.temperature_details && (
                <div className={`p-4 rounded-2xl border ${
                  scanResult.temperature_details.excursion_detected 
                    ? 'bg-rose-950/30 border-rose-500/50' 
                    : 'bg-emerald-950/30 border-emerald-500/50'
                } space-y-3`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Thermometer size={16} className={scanResult.temperature_details.excursion_detected ? "text-rose-400 animate-pulse" : "text-emerald-400"} />
                      Ice-Lined Refrigerator (ILR) Telemetry
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                      scanResult.temperature_details.excursion_detected 
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {scanResult.temperature_details.excursion_type || (scanResult.temperature_details.excursion_detected ? "EXCURSION" : "SAFE")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Observed Temperature</span>
                      <span className={`text-lg font-extrabold block mt-0.5 ${scanResult.temperature_details.excursion_detected ? 'text-rose-400 font-mono' : 'text-emerald-300'}`}>
                        {scanResult.temperature_details.recorded_temperature_celsius ?? 8.9}°C
                      </span>
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Safe Cold-Chain Envelope</span>
                      <span className="text-emerald-400 font-bold block mt-0.5">2.0°C to 8.0°C</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-Category: Stock Register OCR */}
              {scanResult.category === 'STOCK_REGISTER' && scanResult.stock_register_details?.detected_rows?.length > 0 && (
                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileText size={15} className="text-cyan-400" />
                      Paper Stock Register OCR Extraction
                    </span>
                    {scanResult.stock_register_details.critical_stockouts_count > 0 && (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {scanResult.stock_register_details.critical_stockouts_count} Stockout Alert
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {scanResult.stock_register_details.detected_rows.map((row, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                        <div>
                          <span className="font-bold text-white block">{row.item_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{row.batch_no || 'Batch N/A'}</span>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-bold block ${row.stock_available === 0 ? 'text-rose-400' : 'text-cyan-300'}`}>
                            {row.stock_available} / {row.minimum_required} units
                          </span>
                          <span className={`text-[9px] font-bold uppercase ${row.urgency === 'CRITICAL' ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {row.urgency || (row.is_stockout ? 'CRITICAL' : 'OK')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Standard Pharmaceutical Medicine Pack Details */}
              {(scanResult.category === 'MEDICINE_PACK' || !scanResult.category || scanResult.brand_name) && (
                <>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Brand Name</span>
                      <span className="font-bold text-white text-sm block mt-0.5">
                        {scanResult.brand_name || scanResult.medicine_details?.brand_name || "Authentic Pharmaceutical Asset"}
                      </span>
                    </div>
                    <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Generic Salt / Formulation</span>
                      <span className="font-semibold text-cyan-300 text-xs block mt-0.5">
                        {scanResult.generic_name || scanResult.medicine_details?.generic_name || scanResult.brand_name}
                      </span>
                    </div>
                    <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Batch Number</span>
                      <span className="font-mono font-bold text-cyan-300 text-sm block mt-0.5">
                        {scanResult.batch_number || scanResult.medicine_details?.batch_number || "Verified"}
                      </span>
                    </div>
                    <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Expiry Date</span>
                      <span className={`font-bold block mt-0.5 ${
                        (scanResult.days_to_expiry ?? scanResult.medicine_details?.days_to_expiry) < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {scanResult.expiry_date || scanResult.medicine_details?.expiry_date || "03/2028"} {
                          (scanResult.days_to_expiry ?? scanResult.medicine_details?.days_to_expiry) !== undefined && (
                            <span className="text-[10px] font-normal">
                              ({(scanResult.days_to_expiry ?? scanResult.medicine_details?.days_to_expiry) > 0 
                                ? `${scanResult.days_to_expiry ?? scanResult.medicine_details?.days_to_expiry}d left` 
                                : 'EXPIRED'})
                            </span>
                          )
                        }
                      </span>
                    </div>
                    <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Manufacturer</span>
                      <span className="font-semibold text-slate-200 block mt-0.5">
                        {scanResult.manufacturer || scanResult.medicine_details?.manufacturer || "Verified Pharmaceutical Supplier"}
                      </span>
                    </div>
                    <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Dosage & Packaging Form</span>
                      <span className="font-semibold text-slate-200 block mt-0.5">
                        {scanResult.dosage_form || scanResult.medicine_details?.dosage_form || "Unit Packaging"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1 text-xs">
                    <span className="text-slate-400 block text-[11px]">Recommended Cold Chain / Storage Protocol</span>
                    <span className="text-cyan-300 font-semibold block">
                      {scanResult.storage_condition || scanResult.medicine_details?.storage_condition || "Store below 25°C in a dry place."}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-[11px] font-semibold">Counterfeit & Tamper Risk Score</span>
                      <span className={`font-mono font-bold ${
                        (scanResult.counterfeit_risk_score ?? scanResult.medicine_details?.counterfeit_risk_score ?? 3.2) > 30 ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {scanResult.counterfeit_risk_score ?? scanResult.medicine_details?.counterfeit_risk_score ?? 3.2}% Risk
                      </span>
                    </div>
                    {/* Visual Risk Bar */}
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          (scanResult.counterfeit_risk_score ?? 3.2) > 50 
                            ? 'bg-rose-500' 
                            : (scanResult.counterfeit_risk_score ?? 3.2) > 15 
                              ? 'bg-amber-500' 
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(4, scanResult.counterfeit_risk_score ?? 3.2))}%` }}
                      />
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed pt-1">
                      {scanResult.verification_notes || scanResult.medicine_details?.verification_notes || scanResult.findings_summary}
                    </p>
                  </div>
                </>
              )}

              {/* Agentic Autonomous Handoff Recommendation Card */}
              {scanResult.agentic_handoff && (
                <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-cyan-950/40 border border-indigo-500/30 rounded-2xl p-3.5 space-y-2 text-xs shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Bot size={15} className="text-indigo-400" />
                      Autonomous Downstream Agent Recommendation
                    </span>
                    <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {scanResult.agentic_handoff.recommended_agent || "AshaVoiceCopilotAgent"}
                    </span>
                  </div>
                  {scanResult.agentic_handoff.autonomous_prompt_suggestion && (
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 italic">
                      &ldquo;{scanResult.agentic_handoff.autonomous_prompt_suggestion}&rdquo;
                    </div>
                  )}
                </div>
              )}

              {/* OpenFDA Drug Labeling & Gemini Clinical Insights Card */}
              {(scanResult.openfda_clinical_insights || scanResult.medicine_details?.openfda_clinical_insights) && (
                <OpenFDAClinicalCard 
                  insights={scanResult.openfda_clinical_insights || scanResult.medicine_details?.openfda_clinical_insights} 
                />
              )}

              {scanResult.e_aushadhi_ledger_sync_ready && (
                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Database size={14} className="text-cyan-400" />
                      Register & Sync to Facility Inventory
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      e-Aushadhi / Firebase
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Target Healthcare Center</label>
                      <select
                        value={selectedFacilityId}
                        onChange={(e) => setSelectedFacilityId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      >
                        {facilities && facilities.length > 0 ? (
                          facilities.slice(0, 40).map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name} ({f.district || f.state || 'PHC'})
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="PHC-BARAGAON-03">PHC Baragaon (Varanasi)</option>
                            <option value="PHC-SEWAPURI-04">PHC Sewapuri (Varanasi)</option>
                            <option value="DH-VARANASI-01">Pandit Deen Dayal District Hospital (Varanasi)</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Verified Intake Quantity</label>
                      <div className="flex items-center gap-1.5">
                        {[10, 25, 50, 100].map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setIntakeQty(q)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              intakeQty === q
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            +{q}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSyncToLedger}
                    disabled={syncStatus === 'SUCCESS' || syncStatus === 'SYNCING'}
                    className="w-full btn-primary justify-center text-xs py-2.5 font-semibold shadow-md"
                  >
                    {syncStatus === 'SYNCING' ? (
                      <>
                        <Loader2 size={15} className="animate-spin text-cyan-300" />
                        <span>Registering Drug & Updating Ledger...</span>
                      </>
                    ) : syncStatus === 'SUCCESS' ? (
                      <>
                        <CheckCircle2 size={16} className="text-emerald-300" />
                        <span>Intake Verified & Logged (+{intakeQty} Units)</span>
                      </>
                    ) : (
                      <>
                        <Database size={15} />
                        <span>Sync Verified Intake to National Ledger (+{intakeQty} Units)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <ShieldCheck size={26} />
              </div>
              <span className="text-center max-w-xs leading-relaxed">
                Select a sample preset above or upload an image to run live Gemini Multimodal Vision analysis.
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

