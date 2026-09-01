'use client';
import React, { useState } from 'react';
import { FileSpreadsheet, Search, Filter, Plus, CheckCircle2, ShieldCheck, Database } from 'lucide-react';
import { updateStockLedger } from '../services/api';

export default function InventoryLedger({ medicines = [], facilities = [], onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [updatingId, setUpdatingId] = useState(null);

  const categories = ['All', 'Emergency Antidote', 'Vaccine', 'Chronic / Emergency', 'Critical Infusion', 'Pediatric / Outbreak', 'Vector-Borne Emergency'];

  const filteredMedicines = medicines.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleQuickAdd = async (facilityId, medId) => {
    setUpdatingId(`${facilityId}-${medId}`);
    await updateStockLedger(facilityId, medId, 10, "Manual Procurement Intake");
    if (onRefresh) onRefresh();
    setTimeout(() => setUpdatingId(null), 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <Database size={13} /> e-Aushadhi & CoWIN Interoperability
            </span>
            <span className="bg-cyan-500/20 text-cyan-300 text-xs px-3 py-1 rounded-full font-semibold">
              NLEM 2022 Verified
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">
            National Essential Medicines Inventory Ledger
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
            Real-time stock audit across district hospitals, CHCs, and rural primary health centres with automatic cold-chain flag indicators.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Drug Name, Batch ID, or Category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            {categories.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-3.5 px-4">Item Code & Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Cold-Chain Spec</th>
                <th className="py-3.5 px-4">Criticality</th>
                <th className="py-3.5 px-4">National Buffer</th>
                <th className="py-3.5 px-4">PHC Baragaon (UP)</th>
                <th className="py-3.5 px-4">DH Varanasi (UP)</th>
                <th className="py-3.5 px-4 text-right">Quick Stock Intake</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMedicines.map((med) => {
                const baragaonStock = med.inventoryByFacility?.["PHC-BARAGAON-03"] ?? 0;
                const varanasiStock = med.inventoryByFacility?.["DH-VARANASI-01"] ?? 0;
                const isCriticalDeficit = baragaonStock <= 5;
                const isUpdating = updatingId === `PHC-BARAGAON-03-${med.id}`;

                return (
                  <tr key={med.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] text-cyan-400 block">{med.id}</span>
                      <span className="font-bold text-white text-xs">{med.name}</span>
                      <span className="text-[11px] text-slate-400 block">{med.form}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {med.category}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-800 text-cyan-300 border border-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                        {med.storageTemp}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        med.criticality.includes('Ultra') ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {med.criticality}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {med.nationalBufferNorm} {med.unit}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-mono font-bold text-sm ${isCriticalDeficit ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                        {baragaonStock} {med.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold text-sm">
                      {varanasiStock} {med.unit}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleQuickAdd("PHC-BARAGAON-03", med.id)}
                        disabled={isUpdating}
                        className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs px-2.5 py-1 rounded-lg font-semibold inline-flex items-center gap-1 transition-all"
                      >
                        <Plus size={13} />
                        <span>{isUpdating ? 'Added +10' : '+10 Units'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
