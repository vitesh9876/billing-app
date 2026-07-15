# SmartShop Deployment Guide (100% Free & Cloud Persistent)

This guide provides step-by-step instructions to deploy your billing and loan management application to the cloud for free using production-grade platforms.

## Architectural Recommendation
* **Frontend**: Hosted on **Vercel** (Free, fast global CDN, built specifically for Next.js).
* **Backend**: Hosted on **Render** (Free persistent container, fully supports WebSockets for your Android SMS Bridge, with a free pinging service to keep it active 24/7).
* **Database**: Hosted on **Supabase** or **Neon** (Free, persistent, production-ready cloud PostgreSQL database).

---

## Step 1: Create a Hosted PostgreSQL Database

1. Sign up for a free account at **[Neon PostgreSQL](https://neon.tech/)** or **[Supabase](https://supabase.com/)**.
2. Create a new project (name it `SmartShop` or `billing-app`).
3. Once created, go to the project dashboard and copy the **URI Connection String**. It will look like this:
   ```text
   postgresql://neondb_owner:password@ep-cool-sun-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

## Step 2: Deploy the FastAPI Backend to Render

1. Sign up at **[Render](https://render.com/)** using your GitHub account.
2. From the dashboard, click **New +** -> **Web Service**.
3. Import your GitHub repository: `https://github.com/vitesh9876/billing-app.git`
4. Set the following configuration values:
   * **Name**: `smartshop-api`
   * **Language**: `Python`
   * **Branch**: `main`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
5. Click **Advanced**, and add the following **Environment Variables**:
   * **Key**: `DATABASE_URL`
   * **Value**: `<Paste your connection string from Step 1>`
6. Click **Create Web Service**. 
7. Once Render finishes building, copy the URL of your live API at the top left (e.g., `https://smartshop-api.onrender.com`).

---

## Step 3: Keep the Render Backend Awake 24/7 (Zero Sleep Workaround)

Render's free tier goes to sleep after 15 minutes of inactivity. To prevent this and make it respond instantly 24/7 for free, set up a free automated ping:

1. Go to **[cron-job.org](https://cron-job.org/)** and sign up for a free account.
2. Click **Create Cronjob**.
3. Set the following options:
   * **Title**: `Keep SmartShop Backend Awake`
   * **URL**: `<Paste your Render API URL from Step 2>` (e.g. `https://smartshop-api.onrender.com/`)
   * **Schedule**: Set execution interval to **Every 10 minutes** (this keeps the server active constantly).
4. Click **Create**. That's it! Your backend will remain active 24/7 for free, with zero startup delays.

---

## Step 4: Deploy the Next.js Frontend to Vercel

1. Sign up at **[Vercel](https://vercel.com/)** using your GitHub account.
2. Click **Add New** -> **Project**.
3. Import your GitHub repository: `billing-app`.
4. Configure the project:
   * **Framework Preset**: `Next.js`
   * **Root Directory**: Select/type `frontend` (it contains your React/Next.js code).
5. Open the **Environment Variables** section and add:
   * **Key**: `NEXT_PUBLIC_API_URL`
   * **Value**: `<Paste your Render API URL from Step 2>` (e.g. `https://smartshop-api.onrender.com`)
6. Click **Deploy**. Vercel will build the frontend and host it on a secure free domain (e.g., `https://billing-app-xyz.vercel.app`).

---

## Step 5: Configure your Android SMS Bridge App
Update the server IP/URL in your Android SMS Bridge App or web simulator to point to your new cloud backend:
* **Server URL**: `https://smartshop-api.onrender.com` (instead of `192.168.x.x:8000`)
* Both your browser and your phone will now talk to the cloud backend, allowing you to access the app and send SMS from anywhere in the world!
