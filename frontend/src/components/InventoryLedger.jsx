'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileSpreadsheet, Search, Filter, Plus, CheckCircle2, ShieldCheck, 
  Database, Building2, Globe, Thermometer, AlertCircle, Sparkles, RefreshCw,
  ChevronLeft, ChevronRight, Package, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { updateStockLedger, fetchMedicinesPaginated, fetchFacilities } from '../services/api';

// Deterministic mock stock generator for newly mapped OSM facilities
function getDeterministicStock(facilityId, facilityType, med) {
  if (med.inventoryByFacility?.[facilityId] !== undefined) {
    return med.inventoryByFacility[facilityId];
  }
  let hash = 0;
  const str = `${facilityId}-${med.id}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const isDH = facilityType?.toLowerCase().includes('district') || facilityType?.toLowerCase().includes('hospital');
  const base = isDH ? 120 : 25;
  const variance = Math.abs(hash) % 45;
  return base + variance;
}

export default function InventoryLedger({ 
  isLoading: parentLoading = false, 
  medicines: initialMedicines = [], 
  facilities: initialFacilities = [], 
  onRefresh 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFacilityId, setSelectedFacilityId] = useState('PHC-BARAGAON-03');
  const [updatingId, setUpdatingId] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [medicinesData, setMedicinesData] = useState(initialMedicines);
  const [facilitiesList, setFacilitiesList] = useState(initialFacilities);
  const [pagination, setPagination] = useState({
    total_records: initialMedicines.length || 0,
    page: 1,
    page_size: 25,
    total_pages: Math.ceil((initialMedicines.length || 1) / 25),
    has_next: false,
    has_prev: false
  });

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load facilities for facility selector if not provided by parent
  useEffect(() => {
    if (!facilitiesList || facilitiesList.length === 0) {
      fetchFacilities(1, 100).then(facs => {
        if (facs && facs.length > 0) setFacilitiesList(facs);
      });
    }
  }, [facilitiesList]);

  // Load paginated medicines independently
  const loadPaginatedMedicines = useCallback(async (pg, size, query) => {
    setLoading(true);
    try {
      const res = await fetchMedicinesPaginated(pg, size, query);
      if (res && res.items) {
        setMedicinesData(res.items);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error("Error loading paginated medicines:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPaginatedMedicines(page, pageSize, debouncedSearch);
  }, [page, pageSize, debouncedSearch, loadPaginatedMedicines]);

  const selectedFacility = useMemo(() => {
    return facilitiesList.find(f => f.id === selectedFacilityId) || facilitiesList[0] || { 
      id: "PHC-BARAGAON-03", 
      name: "PHC Baragaon", 
      district: "Varanasi",
      state: "Uttar Pradesh",
      type: "Primary Health Centre"
    };
  }, [facilitiesList, selectedFacilityId]);

  const categories = useMemo(() => {
    const set = new Set(['All']);
    medicinesData.forEach(m => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [medicinesData]);

  const filteredMedicines = useMemo(() => {
    return medicinesData.filter(m => {
      const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
      return matchesCategory;
    });
  }, [medicinesData, selectedCategory]);

  const handleQuickAdd = async (facilityId, medId) => {
    setUpdatingId(`${facilityId}-${medId}`);
    try {
      await updateStockLedger(facilityId, medId, 10, "Manual Procurement Intake");
      loadPaginatedMedicines(page, pageSize, debouncedSearch);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.warn("Update stock notice:", e);
    } finally {
      setTimeout(() => setUpdatingId(null), 700);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (pagination.total_pages || 1)) {
      setPage(newPage);
    }
  };

  const isPageLoading = loading || (parentLoading && medicinesData.length === 0);

  // Quick stats summary
  const totalCommodities = pagination.total_records || medicinesData.length;
  const criticalStockCount = useMemo(() => {
    return filteredMedicines.filter(m => {
      const stock = getDeterministicStock(selectedFacilityId, selectedFacility.type, m);
      return stock <= 15;
    }).length;
  }, [filteredMedicines, selectedFacilityId, selectedFacility.type]);

  const coldChainCount = useMemo(() => {
    return filteredMedicines.filter(m => 
      m.storageTemp?.includes('2°C') || m.storageTemp?.includes('2\u00b0C') || m.storageTemp?.includes('Cold')
    ).length;
  }, [filteredMedicines]);

  if (isPageLoading && medicinesData.length === 0) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-panel p-4 border border-slate-800 space-y-2">
              <div className="skeleton w-24 h-3 rounded" />
              <div className="skeleton w-16 h-7 rounded" />
            </div>
          ))}
        </div>
        <div className="glass-panel p-4 border border-slate-800 space-y-4">
          <div className="skeleton w-full h-10 rounded-xl" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton w-full h-12 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const startRecord = pagination.total_records === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, pagination.total_records || medicinesData.length);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 4 Summary Strip Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glass-panel p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Catalog</span>
            <Database size={16} className="text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white font-display">
            {totalCommodities.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5">NLEM 2022 & WHO EML</span>
        </div>

        <div className="glass-panel p-4 flex flex-col justify-between border-rose-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider">Stockout Risk</span>
            <ShieldAlert size={16} className="text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-400 font-display">
            {criticalStockCount} Items
          </div>
          <span className="text-[11px] text-rose-300/80 mt-0.5">&le; 15 units buffer reserve</span>
        </div>

        <div className="glass-panel p-4 flex flex-col justify-between border-cyan-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Cold-Chain Vaccines</span>
            <Thermometer size={16} className="text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-cyan-300 font-display">
            {coldChainCount} Lines
          </div>
          <span className="text-[11px] text-cyan-300/80 mt-0.5">2°C – 8°C Thermal Control</span>
        </div>

        <div className="glass-panel p-4 flex flex-col justify-between border-indigo-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Monitored Node</span>
            <Building2 size={16} className="text-indigo-400" />
          </div>
          <div className="mt-2 text-sm font-bold text-white truncate font-display">
            {selectedFacility.name}
          </div>
          <span className="text-[11px] text-indigo-300/80 truncate mt-0.5">{selectedFacility.district}, {selectedFacility.state}</span>
        </div>
      </div>

      {/* Main Ledger Table Card */}
      <div className="glass-panel overflow-hidden border border-slate-800/90 rounded-2xl shadow-2xl">
        {/* Toolbar with Facility Picker, Search, and Category */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5">
                <Database size={13} /> e-Aushadhi National Sync
              </span>
              <span className="bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5">
                <Globe size={13} /> Real-Time Burn Tracking
              </span>
              {loading && (
                <span className="text-xs text-cyan-400 font-mono flex items-center gap-1">
                  <RefreshCw size={11} className="animate-spin" /> Fetching ledger...
                </span>
              )}
            </div>

            <div className="text-xs text-slate-400 font-medium">
              Showing <strong className="text-cyan-400">{startRecord}–{endRecord}</strong> of <strong>{totalCommodities.toLocaleString()}</strong> Items
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
            {/* Search Box */}
            <div className="sm:col-span-5 relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search drug name, NLEM code, or active ingredient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-cyan-500/60 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all placeholder-slate-500"
              />
            </div>

            {/* Facility Picker */}
            <div className="sm:col-span-4 flex items-center gap-2 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 overflow-hidden">
              <Building2 size={14} className="text-cyan-400 shrink-0" />
              <select
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                className="bg-transparent text-cyan-300 text-xs focus:outline-none font-semibold w-full truncate cursor-pointer"
              >
                {facilitiesList.map((fac) => (
                  <option key={fac.id} value={fac.id} className="bg-slate-900 text-slate-200">
                    {fac.name} ({fac.district || fac.state})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="sm:col-span-3 flex items-center gap-2 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 overflow-hidden">
              <Filter size={14} className="text-indigo-400 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none font-medium w-full truncate cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-900 text-slate-200">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4 w-[36%]">Medicine & Dosage Form</th>
                <th className="py-3 px-3 w-[18%]">Thermal / Criticality</th>
                <th className="py-3 px-3 w-[20%] bg-cyan-950/20 text-cyan-300">
                  <div className="flex items-center gap-1.5">
                    <Building2 size={13} className="text-cyan-400 shrink-0" />
                    <span className="truncate">{selectedFacility.name?.split(' ')[0] || 'PHC'} Stock</span>
                  </div>
                </th>
                <th className="py-3 px-3 w-[14%]">National Pool</th>
                <th className="py-3 px-4 w-[12%] text-right">Intake</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    {loading ? "Loading medicines catalog..." : "No medicines match the search criteria."}
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((med) => {
                  const facStock = getDeterministicStock(selectedFacilityId, selectedFacility.type, med);
                  const isCriticalDeficit = facStock <= 15;
                  const isUpdating = updatingId === `${selectedFacilityId}-${med.id}`;
                  const unitLabel = med.unit || 'Units';
                  const nationalTotal = med.currentTotal || (Object.values(med.inventoryByFacility || {}).reduce((a, b) => a + b, 0) || 1800);
                  const isColdChain = med.storageTemp?.includes('2°C') || med.storageTemp?.includes('2\u00b0C') || med.storageTemp?.includes('Cold');

                  // Buffer percentage (assumed norm of 40 units for PHC)
                  const bufferNorm = med.nationalBufferNorm || 40;
                  const stockPct = Math.min(100, Math.round((facStock / bufferNorm) * 100));

                  return (
                    <tr key={med.id} className="hover:bg-slate-800/40 transition-colors group">
                      {/* Col 1: Drug Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
                          <span className="font-mono text-[10px] text-cyan-400 font-bold">{med.id}</span>
                          <span className="font-mono text-[9px] bg-slate-900 border border-slate-800 text-indigo-300 px-1.5 py-0.5 rounded">
                            {med.nlemCode || 'NLEM-2022'}
                          </span>
                        </div>
                        <div className="font-bold text-slate-100 text-xs group-hover:text-cyan-300 transition-colors truncate">
                          {med.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {med.category || 'Essential Drug'} &bull; {med.form || 'Standard Formulation'}
                        </div>
                      </td>

                      {/* Col 2: Storage & Criticality */}
                      <td className="py-3 px-3">
                        <div className="space-y-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border inline-flex items-center gap-1 ${
                            isColdChain 
                              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' 
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}>
                            <Thermometer size={10} className={isColdChain ? 'text-cyan-400' : 'text-slate-500'} />
                            <span>{med.storageTemp || 'Ambient (15–30°C)'}</span>
                          </span>

                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border block w-fit ${
                            med.criticality?.toLowerCase().includes('ultra') || med.criticality?.toLowerCase().includes('life')
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                              : (med.criticality?.toLowerCase().includes('high') 
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' 
                                  : 'bg-slate-800/80 text-slate-300 border-slate-700')
                          }`}>
                            {med.criticality || 'Standard Essential'}
                          </span>
                        </div>
                      </td>

                      {/* Col 3: Facility Stock + Visual Gauge */}
                      <td className="py-3 px-3 bg-cyan-950/10">
                        <div className="flex items-baseline justify-between gap-1.5 mb-1">
                          <span className={`font-mono font-black text-sm ${
                            isCriticalDeficit ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                          }`}>
                            {facStock.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">{unitLabel}</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {stockPct}% buffer
                          </span>
                        </div>
                        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isCriticalDeficit ? 'bg-rose-500' : stockPct < 50 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.max(5, stockPct)}%` }}
                          />
                        </div>
                      </td>

                      {/* Col 4: National Reserve */}
                      <td className="py-3 px-3">
                        <div className="font-mono text-cyan-300 font-bold text-xs">
                          {nationalTotal.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">{unitLabel}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          State Warehouse Pool
                        </div>
                      </td>

                      {/* Col 5: Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleQuickAdd(selectedFacilityId, med.id)}
                          disabled={isUpdating}
                          className="bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-xs px-2.5 py-1.5 rounded-xl font-semibold inline-flex items-center gap-1 shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                          title="Record procurement delivery of +10 units"
                        >
                          <Plus size={12} />
                          <span>{isUpdating ? 'Saving...' : '+10'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-400">
            <span>
              Page <strong className="text-white">{page}</strong> of <strong className="text-white">{pagination.total_pages || 1}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-700/80 text-cyan-300 px-2.5 py-1 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed font-semibold"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span className="px-3 py-1 rounded-xl bg-cyan-500/15 text-cyan-300 font-mono font-bold border border-cyan-500/30">
              {page}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= (pagination.total_pages || 1) || loading}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed font-semibold"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
