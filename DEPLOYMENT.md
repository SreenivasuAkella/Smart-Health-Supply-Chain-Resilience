# 🚀 100% Free Deployment Guide — Sanjeevani AI

This guide shows how to deploy both the **Frontend (Next.js)** and **Backend (FastAPI)** for free with HTTPS endpoints suitable for hackathon judging submission.

---

## 🟢 Option A: Recommended Hackathon Setup (Fastest & 100% Free)

- **Frontend**: **Vercel** (100% Free, native Next.js host)
- **Backend**: **Render** (100% Free Python Web Service) or **Google Cloud Run** (Free Tier: 2M requests/month)

---

### Step 1: Deploy the Python Backend on Render (Free)

1. Push your repository to **GitHub**.
2. Go to [**render.com**](https://render.com) and create a free account.
3. Click **"New +"** $\rightarrow$ **"Web Service"**.
4. Connect your GitHub repository: `Smart-Health-Supply-Chain-Resilience`.
5. Configure the service with these settings:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
6. Add **Environment Variables** under the Environment tab:
   - `GEMINI_API_KEY`: *(Your Google AI Studio API Key)*
   - `GEMINI_MODEL`: `gemini-1.5-flash`
7. Click **"Deploy Web Service"**.
8. Copy your live backend URL (e.g., `https://sanjeevani-backend.onrender.com`).

---

### Step 2: Deploy the Next.js Frontend on Vercel (Free)

1. Go to [**vercel.com**](https://vercel.com) and sign in with GitHub.
2. Click **"Add New..."** $\rightarrow$ **"Project"**.
3. Import your GitHub repository.
4. In the configuration screen:
   - **Root Directory**: Click "Edit" and choose `frontend`.
   - **Framework Preset**: `Next.js` (automatically detected).
5. Expand **Environment Variables** and add:
   - `NEXT_PUBLIC_API_BASE_URL`: `https://sanjeevani-backend.onrender.com/api` *(replace with your Render backend URL from Step 1)*
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: *(Optional)*
6. Click **"Deploy"**.
7. In ~60 seconds, your frontend will be live on a free `.vercel.app` domain with free SSL/HTTPS!

---

## 🔵 Option B: Deploy Backend on Google Cloud Run (Free Tier)

Google Cloud offers **2 Million requests/month free** on Cloud Run:

```bash
# 1. Login to Google Cloud CLI
gcloud auth login

# 2. Set your GCP project
gcloud config set project YOUR_PROJECT_ID

# 3. Deploy from the backend directory
cd backend
gcloud run deploy sanjeevani-backend \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_MODEL=gemini-1.5-flash"
```

Once deployed, copy the Cloud Run URL and set it as `NEXT_PUBLIC_API_BASE_URL` in Vercel.

---

## 🎯 Submission URL Checklist

Once deployed, you will have two public links ready for your contest submission form:
- 🌐 **Live Web Application**: `https://sanjeevani-ai.vercel.app`
- 📖 **Public Backend API & Docs**: `https://sanjeevani-backend.onrender.com/docs`
