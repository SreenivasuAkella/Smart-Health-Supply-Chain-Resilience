# 🏥 Sanjeevani AI — Autonomous Health & Vaccine Supply Chain Resilience Network

> **Code for Communities 2 Hackathon (Hack2Skill / Google AI)**  
> **Track 3**: Smart Health & Supply Chain Resilience  
> **Backend**: Python (FastAPI + Google Gen AI SDK + Vertex AI Ensemble)  
> **Frontend**: React + Next.js 14 + Tailwind CSS + Lucide Icons + Leaflet Maps  

---

## 🌟 Overview & Problem Statement

Across India's 30,000+ Primary Health Centres (PHCs), sub-centres, and district hospitals:
- **Last-Mile Stockouts**: Remote clinics run out of critical life-saving commodities (Anti-Snake Venom, Rabies Vaccines, Insulin, Artesunate) during seasonal disease surges.
- **Cold-Chain Failures**: Extreme temperatures and rural power outages degrade vaccine potency without real-time kinetic shelf-life visibility.
- **Language & Literacy Barriers**: Frontline ASHA and ANM workers need voice-first workflows in their native regional languages.

**Sanjeevani AI** solves this with an autonomous health logistics and epidemic intelligence operating system powered by **Google Gemini Multimodal AI, Vertex AI Predictive Time-Series Modeling, Multilingual Speech NLU, and Google Maps Geospatial Optimization**.

---

## 🛠️ Google AI & Cloud Tech Stack Integration

| Contest Requirement | Google AI / Cloud Tool | Sanjeevani AI Implementation |
| :--- | :--- | :--- |
| **Generative AI & Agents** | **Google Gemini 1.5 / 2.0 Flash** (via Google AI Studio & Vertex AI) | Autonomous supply chain multi-agent reasoning, emergency dispatch generation, and crisis resolution planning. |
| **Predictive Modelling** | **Vertex AI (AutoML Time-Series)** | 14 to 30-day stockout risk prediction by correlating historical drug consumption, disease incidence, and climate indices. |
| **Vision & Multimodal** | **Gemini Multimodal Vision** | Real-time photo/camera OCR of medicine packaging, blister packs, and vaccine vials. Extracts batch number, expiry date, storage spec, and flags counterfeits. |
| **Language & Voice** | **Cloud Speech-to-Text & Translation API** | Voice-first multilingual copilot for ASHA workers supporting **Hindi, Telugu, Tamil, Marathi, Bengali, Kannada, and English**. |
| **Geospatial & Logistics** | **Google Maps Platform & Routes API** | Real-time inter-facility emergency stock transfer routing with terrain and cold-chain holdover window calculations. |
| **Data & Cloud Backend** | **BigQuery & Firebase Realtime DB** | High-concurrency health ledger schemas, cold-chain IoT telemetry streams, and Python FastAPI microservices. |
| **Public Data Integrations** | **data.gov.in, WHO, IMD, ISRO Bhuvan** | Real-world Indian datasets: NLEM 2022, IDSP epidemiological alerts, and high-resolution monsoon flood risk indices. |

---

## 📁 Project Structure

```
Smart-Health-Supply-Chain-Resilience/
├── .env.example                         # Environment blueprint template
├── .gitignore                           # Multi-tier gitignore
├── README.md                            # Hackathon documentation & judging alignment
│
├── backend/                             # Python FastAPI Backend
│   ├── .env.example
│   ├── requirements.txt
│   ├── run.py                           # Backend runner
│   ├── venv/                            # Virtual environment (ignored)
│   └── app/
│       ├── config.py                    # Environment & Gemini configuration
│       ├── main.py                      # FastAPI entry point with CORS & Swagger docs
│       ├── data/                        # Facilities, medicines, telemetry & public datasets
│       ├── services/                    # Gemini Vision, ASHA Copilot, Forecasting, Rebalancer, Cold-Chain
│       └── routers/                     # REST API endpoints
│
└── frontend/                            # Next.js 14 + React + Tailwind Frontend
    ├── .env.example
    ├── next.config.mjs
    ├── tailwind.config.js
    ├── postcss.config.mjs
    ├── package.json
    ├── node_modules/                    # Frontend dependencies (ignored)
    └── src/
        ├── app/                         # Next.js App Router (layout.jsx, page.jsx, globals.css)
        ├── components/                  # UI components, Leaflet Map, Camera Scanner, Voice Copilot
        └── services/api.js              # Configurable API client
```

---

## 🚀 How to Run the Project

### 1. Start Backend (Terminal 1)
```bash
cd backend
venv/bin/python run.py
```
- API Server: [http://localhost:8000](http://localhost:8000)
- Interactive Swagger Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)