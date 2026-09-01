import React from 'react';
import { Activity, ShieldAlert, Cpu, Sparkles, Key, MapPin, Radio, Languages, ThermometerSnowflake, Zap, FileSpreadsheet, Network } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenTechModal, onOpenKeyModal, isKeyConfigured }) {
  const navItems = [
    { id: 'overview', label: 'Command Center', icon: Activity },
    { id: 'map', label: 'Geospatial Rebalancer', icon: MapPin },
    { id: 'federated', label: 'Federated Multi-State AI', icon: Network },
    { id: 'vision', label: 'Gemini Vision Scanner', icon: Sparkles },
    { id: 'voice', label: 'ASHA Voice Copilot', icon: Languages },
    { id: 'coldchain', label: 'Cold-Chain IoT Twin', icon: ThermometerSnowflake },
    { id: 'forecasting', label: 'Epidemic Forecasting', icon: ShieldAlert },
    { id: 'simulation', label: 'Crisis Sandbox', icon: Zap },
    { id: 'inventory', label: 'e-Aushadhi Ledger', icon: FileSpreadsheet }
  ];

  return (
    <header className="glass-panel" style={{ margin: '12px 16px', padding: '12px 20px', position: 'sticky', top: '10px', zIndex: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        
        {/* Brand & Mission */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--gradient-brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-cyan)'
          }}>
            <Activity size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                SANJEEVANI AI
              </h1>
              <span className="badge-tech" style={{ padding: '2px 8px', fontSize: '0.65rem' }}>
                Federated Health Resilience
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              National Health Resource, Bed, Personnel Attendance & Vaccine Supply Chain Platform
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', maxWidth: '100%', padding: '4px 0' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  background: isActive ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: isActive ? '#38bdf8' : 'var(--text-secondary)',
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid transparent',
                  padding: '8px 13px',
                  borderRadius: '10px',
                  fontSize: '0.80rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onOpenTechModal}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '8px 14px' }}
            title="View Google AI & Cloud Services integration architecture"
          >
            <Cpu size={16} color="#38bdf8" />
            <span>Google AI Stack</span>
          </button>

          <button
            onClick={onOpenKeyModal}
            style={{
              background: isKeyConfigured ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: isKeyConfigured ? '#34d399' : '#fbbf24',
              border: isKeyConfigured ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Key size={15} />
            <span>{isKeyConfigured ? 'Gemini Key Active' : 'Configure Gemini'}</span>
          </button>
        </div>

      </div>
    </header>
  );
}
