import React from 'react';
import { X, CheckCircle2, Cpu, Eye, Mic, MapPin, Database, LineChart, Globe, Sparkles } from 'lucide-react';

export default function GoogleTechArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const techStack = [
    {
      category: "1. Generative AI & Agents",
      icon: Sparkles,
      color: "#38bdf8",
      tools: "Google Gemini 1.5 / 2.0 Flash via Google AI Studio & Vertex AI",
      role: "Autonomous supply chain orchestration, multi-turn reasoning, inventory reallocation drafting, and crisis resolution planning."
    },
    {
      category: "2. Predictive Modelling",
      icon: LineChart,
      color: "#34d399",
      tools: "Vertex AI (AutoML Time-Series Forecasting) & Risk Ensemble",
      role: "Predicts 14–30 day stockout risks per PHC by correlating seasonal weather indices, historical drug burn rates, and disease morbidity."
    },
    {
      category: "3. Vision & Multimodal",
      icon: Eye,
      color: "#fbbf24",
      tools: "Google Gemini Multimodal Vision & Vertex AI Vision",
      role: "Instant OCR scanning of medicine strips, ampoules, and vaccine vials. Extracts batch number, expiry date, packaging integrity, and flags counterfeits."
    },
    {
      category: "4. Language & Voice",
      icon: Mic,
      color: "#f43f5e",
      tools: "Cloud Speech-to-Text, Text-to-Speech & Google Translation API",
      role: "Voice-first multilingual copilot for ASHA workers and rural pharmacists across 8+ Indian languages (Hindi, Telugu, Tamil, Marathi, Bengali, Kannada, Malayalam, English)."
    },
    {
      category: "5. Geospatial & Logistics",
      icon: MapPin,
      color: "#818cf8",
      tools: "Google Maps Platform (Distance Matrix & Routes) & Google Earth Engine",
      role: "Computes optimal inter-facility emergency stock transfer routes between surplus District Hospitals and deficit rural PHCs with terrain compliance."
    },
    {
      category: "6. Data & Cloud Backend",
      icon: Database,
      color: "#a855f7",
      tools: "BigQuery Public Health Data Warehouse, Firebase Realtime DB & Cloud Run",
      role: "Unified national health ledger schema, real-time IoT cold-chain sensor streams, and high-concurrency API microservices."
    },
    {
      category: "7. Public Data Integrations",
      icon: Globe,
      color: "#fb923c",
      tools: "data.gov.in (NLEM / HMIS), WHO Health Observatory, IMD Weather, ISRO Bhuvan",
      role: "Real-world Indian datasets: National Essential Medicines List, district flood vulnerability indices, and weekly IDSP epidemiological outbreak feeds."
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-panel-glow" 
        style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <Cpu size={26} color="#38bdf8" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Google AI & Tech Stack Integration Architecture
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Direct mapping to Code for Communities 2 contest requirements & judging criteria
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }}>
            <X size={22} />
          </button>
        </div>

        {/* Challenge Evaluation Alignment Box */}
        <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', padding: '14px 18px', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <CheckCircle2 size={18} color="#38bdf8" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#38bdf8' }}>
              Evaluation Weight: 25% AI / Technical Execution + 20% Problem-Solution Fit + 20% Pan-India Reach
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Sanjeevani AI delivers an end-to-end working pipeline where every component connects directly to Google AI tooling, solving real-world supply chain crises for 30,000+ Indian PHCs.
          </p>
        </div>

        {/* 7 Tools Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
          {techStack.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx} 
                style={{ 
                  background: 'rgba(15, 23, 42, 0.75)', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: '12px', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ padding: '6px', background: `${item.color}22`, borderRadius: '8px', border: `1px solid ${item.color}44` }}>
                    <Icon size={18} color={item.color} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: item.color }}>
                    {item.category}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item.tools}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                  {item.role}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '22px', textAlign: 'right' }}>
          <button onClick={onClose} className="btn-primary" style={{ padding: '8px 24px' }}>
            Close Architecture View
          </button>
        </div>
      </div>
    </div>
  );
}
