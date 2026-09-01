# 🏥 Sanjeevani AI — Federated Health Resource & Supply Chain Resilience Platform

> **Code for Communities 2 Hackathon (Hack2Skill / Google AI)**  
> **Track 3**: Smart Health & Supply Chain Resilience  
> **Backend**: Python (FastAPI + Google Gen AI SDK + Vertex AI + Federated FedAvg + BigQuery)  
> **Frontend**: React + Next.js 14 + Tailwind CSS + Lucide Icons + Google Maps  

---

## 🌟 The Challenge Statement & Solution Alignment

### The Problem
Public healthcare systems across India face persistent supply chain vulnerabilities. The inability to track medicines, patient footfall, and resource utilisation in real time across vast networks of Primary Health Centres leads to stock-outs and limits the country's capacity to respond when it matters most.

### The Solution: Sanjeevani AI
A national-scale **Federated AI Platform** for health resource and supply chain resilience providing:
1. **Real-time Visibility**: Live tracking of medicine stocks (e-Aushadhi), bed availability (Total, Occupied, Oxygen, ICU), and medical personnel/ASHA attendance across India's PHC network.
2. **Patient Footfall Analytics**: Daily OPD footfall monitoring against surge thresholds.
3. **Emergency Early Warnings & Demand Forecasting**: Vertex AI time-series models predicting 14–30 day stockouts during Dengue, Malaria, and Monsoon flood emergencies.
4. **Automated Cross-District Redistribution**: Autonomous routing engine using Google Maps Platform to rebalance supplies from surplus District Hospitals to deficit rural clinics.
5. **Federated Multi-State Shared Predictive Modelling**: Privacy-preserving federated model training (FedAvg + Differential Privacy $\epsilon < 0.85$) across state health agencies (UP, Bihar, Assam, Maharashtra, Kerala) without exposing raw patient PII.

---

## 🛠️ Google AI & Cloud Tech Stack Integration

| Challenge Requirement | Google Tool / Stack | Sanjeevani AI Implementation |
| :--- | :--- | :--- |
| **Generative AI & Agents** | **Google Gemini 1.5 / 2.0 Flash** | Autonomous supply chain multi-agent reasoning, emergency dispatch drafting, and crisis resolution planning. |
| **Predictive Modelling** | **Vertex AI (AutoML Time-Series)** | 14 to 30-day stockout risk prediction by correlating historical drug consumption, disease incidence, and climate indices. |
| **Vision & Multimodal** | **Gemini Multimodal Vision** | Real-time photo/camera OCR of medicine packaging, blister packs, and vaccine vials. Extracts batch number, expiry date, storage spec, and flags counterfeits. |
| **Language & Voice** | **Cloud Speech-to-Text & Translation API** | Voice-first multilingual copilot for ASHA workers supporting **Hindi, Telugu, Tamil, Marathi, Bengali, Kannada, and English**. |
| **Geospatial & Logistics** | **Google Maps Platform** | Real-time inter-facility emergency stock transfer routing with terrain and cold-chain holdover window calculations. |
| **Data & Cloud Backend** | **BigQuery & Firebase Realtime DB** | High-concurrency health ledger schemas, cold-chain IoT telemetry streams, and Python FastAPI microservices. |
| **Public Data Integrations** | **data.gov.in, WHO, IMD, ISRO Bhuvan** | Real-world Indian datasets: NLEM 2022, IDSP epidemiological alerts, and high-resolution monsoon flood risk indices. |

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