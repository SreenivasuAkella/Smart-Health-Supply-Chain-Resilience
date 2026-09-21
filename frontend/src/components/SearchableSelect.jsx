'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check, MapPin, Building2 } from 'lucide-react';

export default function SearchableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select an option...",
  disabled = false,
  disabledText = "Disabled",
  emptyMessage = "No matching records found in database",
  icon: Icon = Building2,
  badgeText = null,
  placement = "auto" // 'auto' | 'top' | 'bottom'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [computedPlacement, setComputedPlacement] = useState(placement === 'top' ? 'top' : 'bottom');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Determine popover placement (flip to top if space below is constrained)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      if (placement === 'auto') {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        // If less than 260px below, flip upwards
        if (spaceBelow < 260) {
          setComputedPlacement('top');
        } else {
          setComputedPlacement('bottom');
        }
      } else {
        setComputedPlacement(placement);
      }
    }
  }, [isOpen, placement]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle keyboard shortcuts (Esc to close)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const query = searchTerm.toLowerCase().trim();
    return options.filter(opt => String(opt).toLowerCase().includes(query));
  }, [options, searchTerm]);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  const isTop = computedPlacement === 'top';

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            {Icon && <Icon size={12} className={disabled ? "text-slate-500" : "text-cyan-400"} />}
            <span>{label}</span>
          </label>
          {badgeText && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60">
              {badgeText}
            </span>
          )}
        </div>
      )}

      {/* Select Trigger Box */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`
          w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all border shadow-sm select-none
          ${disabled 
            ? 'bg-slate-950/50 border-slate-800/70 text-slate-500 cursor-not-allowed opacity-80' 
            : isOpen 
              ? 'bg-slate-950 border-cyan-400 ring-2 ring-cyan-500/25 text-white cursor-pointer shadow-cyan-950/50 shadow-md' 
              : 'bg-slate-950/70 border-slate-700/70 hover:border-slate-600 hover:bg-slate-950 text-white cursor-pointer'}
        `}
      >
        <div className="flex items-center gap-2 truncate mr-2 min-w-0">
          <span className={`truncate text-xs font-medium ${value ? "text-slate-100 font-semibold" : "text-slate-500"}`}>
            {disabled ? disabledText : value || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Clear selection"
            >
              <X size={12} />
            </button>
          )}
          <div className={`p-0.5 rounded text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`}>
            <ChevronDown size={13} />
          </div>
        </div>
      </div>

      {/* Floating Dropdown Popover */}
      {isOpen && !disabled && (
        <div 
          className={`
            absolute z-[100] left-0 right-0 bg-slate-900/98 border border-cyan-500/40 rounded-xl 
            shadow-[0_15px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden animate-fadeIn ring-1 ring-cyan-500/20
            ${isTop ? 'bottom-full mb-2' : 'top-full mt-2'}
          `}
        >
          {/* Internal Search Field */}
          <div className="p-2 border-b border-slate-800 bg-slate-950/85">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cyan-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${options.length} records...`}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 font-sans"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={11} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-slate-400 font-mono">
              <span>Verified Registry</span>
              <span className="text-cyan-400 font-semibold">{filteredOptions.length} available</span>
            </div>
          </div>

          {/* Scrollable Options List */}
          <div className="max-h-48 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-950">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3.5 text-center text-xs text-slate-400 italic flex flex-col items-center gap-1">
                <span>{emptyMessage}</span>
                <span className="text-[10px] text-slate-500">Verify your query against the Indian Health Grid</span>
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`
                      w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-xs transition-all
                      ${isSelected 
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm' 
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white hover:pl-3.5'}
                    `}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-cyan-400 ring-2 ring-cyan-400/40' : 'bg-slate-600'}`} />
                      <span className="truncate">{opt}</span>
                    </div>
                    {isSelected && <Check size={13} className="text-cyan-400 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
