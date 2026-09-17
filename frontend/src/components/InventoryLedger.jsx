'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileSpreadsheet, Search, Filter, Plus, CheckCircle2, ShieldCheck, 
  Database, Building2, Globe, Thermometer, AlertCircle, Sparkles, RefreshCw,
  ChevronLeft, ChevronRight
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

  if (isPageLoading && medicinesData.length === 0) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="glass-panel overflow-hidden border border-slate-800/90 rounded-2xl shadow-2xl">
          <div className="p-3.5 sm:p-4 bg-slate-900/60 border-b border-slate-800/80 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <div className="skeleton w-36 h-5 rounded-lg" />
                <div className="skeleton w-36 h-5 rounded-lg" />
              </div>
              <div className="skeleton w-32 h-4 rounded" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
              <div className="sm:col-span-5 skeleton h-9 rounded-xl" />
              <div className="sm:col-span-4 skeleton h-9 rounded-xl" />
              <div className="sm:col-span-3 skeleton h-9 rounded-xl" />
            </div>
          </div>
          <div className="p-4 space-y-3">
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
    <div className="space-y-5 animate-fadeIn">
      {/* Unified Table Card Container with Integrated Toolbar */}
      <div className="glass-panel overflow-hidden border border-slate-800/90 rounded-2xl shadow-2xl">
        {/* Top Integrated Filter Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-900/60 border-b border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] px-2.5 py-0.5 rounded-lg font-semibold flex items-center gap-1">
                <Database size={12} /> NLEM 2022 & WHO EML
              </span>
              <span className="bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] px-2.5 py-0.5 rounded-lg font-semibold flex items-center gap-1">
                <Globe size={12} /> e-Aushadhi Cloud Sync
              </span>
              {loading && (
                <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                  <RefreshCw size={10} className="animate-spin" /> Loading...
                </span>
              )}
            </div>

            <div className="text-xs text-slate-400 font-medium">
              Showing <span className="text-cyan-400 font-bold">{startRecord}–{endRecord}</span> of {pagination.total_records || medicinesData.length} Commodities
            </div>
          </div>

          {/* Integrated Search, Facility Picker & Category Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
            {/* Search Box (5 cols) */}
            <div className="sm:col-span-5 relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search drug name, NLEM code, or active ingredient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700/80 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-cyan-500 transition-all placeholder-slate-500"
              />
            </div>

            {/* Facility Picker (4 cols) */}
            <div className="sm:col-span-4 flex items-center gap-2 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-1.5 overflow-hidden">
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

            {/* Category Filter Dropdown (3 cols) */}
            <div className="sm:col-span-3 flex items-center gap-2 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-1.5 overflow-hidden">
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

        {/* Dense Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4 w-[38%]">Medicine & Clinical Form</th>
                <th className="py-3 px-3 w-[18%]">Thermal / Risk</th>
                <th className="py-3 px-3 w-[16%] bg-cyan-950/20 text-cyan-300">
                  <div className="flex items-center gap-1.5">
                    <Building2 size={12} className="text-cyan-400 shrink-0" />
                    <span className="truncate">{selectedFacility.name?.split(' ')[0] || 'Node'} Stock</span>
                  </div>
                </th>
                <th className="py-3 px-3 w-[15%]">National Reserve</th>
                <th className="py-3 px-4 w-[13%] text-right">Procure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
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

                  return (
                    <tr key={med.id} className="hover:bg-slate-800/40 transition-colors group divide-x divide-slate-800/80">
                      {/* Col 1: Medicine & Classification */}
                      <td className="py-3 px-4">
                        <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
                          <span className="font-mono text-[10px] text-cyan-400 font-bold">{med.id}</span>
                          <span className="font-mono text-[9px] bg-slate-900 border border-slate-800 text-indigo-300 px-1 py-0.2 rounded">
                            {med.nlemCode || 'NLEM-2022'}
                          </span>
                        </div>
                        <div className="font-bold text-slate-100 text-xs group-hover:text-cyan-300 transition-colors truncate">
                          {med.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {med.category || 'Essential Medicine'} • {med.form || 'Oral Formulation'}
                        </div>
                      </td>

                      {/* Col 2: Storage & Criticality */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border inline-flex items-center gap-1 ${
                            isColdChain 
                              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' 
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}>
                            <Thermometer size={10} className={isColdChain ? 'text-cyan-400' : 'text-slate-500'} />
                            <span>{med.storageTemp || 'Ambient (15-30°C)'}</span>
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

                      {/* Col 3: Facility Stock */}
                      <td className="py-3 px-3 bg-cyan-950/10">
                        <div className="flex items-baseline gap-1.5">
                          <span className={`font-mono font-black text-sm ${
                            isCriticalDeficit ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                          }`}>
                            {facStock.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">{unitLabel}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Buffer Norm: {med.nationalBufferNorm || 300} {unitLabel}
                        </div>
                      </td>

                      {/* Col 4: National Reserve */}
                      <td className="py-3 px-3">
                        <div className="flex items-baseline gap-1">
                          <span className="font-mono text-cyan-300 font-extrabold text-xs">
                            {nationalTotal.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-500">{unitLabel}</span>
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          e-Aushadhi State Reserve
                        </div>
                      </td>

                      {/* Col 5: Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleQuickAdd(selectedFacilityId, med.id)}
                          disabled={isUpdating}
                          className="bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-xs px-2.5 py-1.5 rounded-lg font-semibold inline-flex items-center gap-1 shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                          <Plus size={12} />
                          <span>{isUpdating ? 'Adding...' : '10'}</span>
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
        <div className="p-3.5 sm:p-4 bg-slate-900/60 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-400">
            <span>
              Page <span className="font-bold text-white">{page}</span> of{' '}
              <span className="font-bold text-white">{pagination.total_pages || 1}</span>
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
                className="bg-slate-950 border border-slate-700/80 text-cyan-300 px-2 py-0.5 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer"
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
              className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 font-mono font-bold border border-cyan-500/20">
              {page}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= (pagination.total_pages || 1) || loading}
              className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
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
