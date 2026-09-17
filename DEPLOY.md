# EcoCharge — Full Deployment Guide

## Architecture

```
Browser / Android App
        ↓
   Vercel (React frontend)
        ↓  /api/* rewrites
  Railway (.NET 9 API + SQL Server)
        ↓  bottle detection
   Render (Python YOLO server)
```

---

## Step 1 — Push all repos to GitHub

You need **3 separate GitHub repositories**:

| Repo | Local folder |
|---|---|
| `ecocharge-web` | `C:\Users\Prim0\Pictures\ecocharge-web` |
| `ecocharge-api` | `C:\Users\Prim0\SmartEVCharging\SmartEVCharging` |
| `ecocharge-yolo` | `C:\Users\Prim0\Pictures\ecocharge-yolo` |

Run these commands in PowerShell:

```powershell
# ── ecocharge-web ──────────────────────────────────────────────
cd C:\Users\Prim0\Pictures\ecocharge-web
git init
git add .
git commit -m "initial: EcoCharge web frontend"
git remote add origin https://github.com/Jjid23/ecocharge-web.git
git push -u origin main

# ── ecocharge-api ──────────────────────────────────────────────
cd C:\Users\Prim0\SmartEVCharging\SmartEVCharging
git init
git add .
git commit -m "initial: EcoCharge .NET API"
git remote add origin https://github.com/Jjid23/ecocharge-api.git
git push -u origin main

# ── ecocharge-yolo ─────────────────────────────────────────────
cd C:\Users\Prim0\Pictures\ecocharge-yolo
git init
git add .
git commit -m "initial: EcoCharge YOLO server"
git remote add origin https://github.com/Jjid23/ecocharge-yolo.git
git push -u origin main
```

> ⚠️ Make sure `v2.pt` is included in the YOLO repo.
> Add it to git: `git add v2.pt`

---

## Step 2 — Deploy YOLO server to Render

1. Go to [render.com](https://render.com) → Sign up free
2. Click **New +** → **Web Service**
3. Connect your `ecocharge-yolo` GitHub repo
4. Settings:
   - **Name:** `ecocharge-yolo`
   - **Runtime:** Docker
   - **Branch:** main
5. Click **Deploy Web Service**
6. Wait for deploy (~5 minutes — it downloads PyTorch)
7. Copy your service URL: `https://ecocharge-yolo.onrender.com`

> ⚠️ Free tier sleeps after 15 min inactivity. First request takes ~30s to wake up.
> Upgrade to Starter ($7/mo) for always-on.

---

## Step 3 — Deploy .NET API to Railway

1. Go to [railway.app](https://railway.app) → Sign up free
2. Click **New Project** → **Deploy from GitHub repo**
3. Select `ecocharge-api`
4. Railway auto-detects the `Dockerfile` and builds it

### Add a database

5. In your Railway project: click **+ New** → **Database** → **Add MS SQL Server**
   - OR use **PostgreSQL** (free) — but you'll need to change the EF provider
   - Easiest: use **Railway MS SQL** plugin
6. Copy the connection string from the database Variables tab

### Set environment variables

7. Click your API service → **Variables** tab → Add these one by one:

```
ConnectionStrings__DefaultConnection = Server=YOUR_MSSQL_HOST,1433;Database=SmartEVChargingDb;User Id=sa;Password=YOUR_PASSWORD;TrustServerCertificate=True;
Jwt__Key                             = REPLACE_WITH_STRONG_32_CHAR_SECRET
Jwt__Issuer                          = SmartEVChargingAPI
Jwt__Audience                        = EcoChargeApp
Jwt__ExpiryMinutes                   = 1440
Esp32__Secret                        = ECOCHARGE_ESP32_SHARED_SECRET_2025
Esp32__TokenExpiryDays               = 365
Yolo__BaseUrl                        = https://ecocharge-yolo.onrender.com
AllowedOrigins                       = https://ecocharge-web.vercel.app
ASPNETCORE_ENVIRONMENT               = Production
```

8. Railway redeploys automatically after saving variables
9. Copy your Railway URL: `https://ecocharge-api.railway.app`

---

## Step 4 — Update vercel.json with Railway URL

Open `vercel.json` and replace `YOUR_RAILWAY_APP`:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://ecocharge-api.railway.app/api/:path*"
    }
  ]
}
```

Commit and push:

```powershell
cd C:\Users\Prim0\Pictures\ecocharge-web
git add vercel.json
git commit -m "chore: set Railway API URL in vercel.json"
git push
```

---

## Step 5 — Deploy frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **Add New Project** → Import `ecocharge-web`
3. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build:vercel`
   - **Output Directory:** `dist`
4. **Environment Variables** (Vercel dashboard → Settings → Environment Variables):
   ```
   VITE_API_URL = (leave empty — vercel.json handles routing)
   ```
5. Click **Deploy**
6. Your app is live at: `https://ecocharge-web.vercel.app`

---

## Step 6 — Seed admin account on Railway

After the API deploys, open Railway's shell or use the Swagger UI at:
```
https://ecocharge-api.railway.app/swagger
```

Register the admin via `POST /api/auth/register`:
```json
{
  "fullName": "EcoCharge Admin",
  "username": "admin",
  "email": "admin@ecocharge.app",
  "password": "Admin@123456"
}
```

Then update the role to Admin directly in the DB, or use Railway's built-in database UI.

---

## Step 7 — Update Android app backend URL

In `C:\Users\Prim0\Pictures\ecocharge\gradle.properties`:

```properties
BASE_URL=https://ecocharge-api.railway.app/
```

Rebuild and install the APK.

---

## Step 8 — Update ESP32 firmware

In `EcoCharge_ESP32A.ino`:

```cpp
#define SERVER_IP   "ecocharge-api.railway.app"
#define SERVER_PORT 443
```

Also enable HTTPS (port 443) — Railway uses HTTPS in production.

---

## All URLs summary

After deploying, you'll have:

| Service | URL |
|---|---|
| 🌐 Web frontend | `https://ecocharge-web.vercel.app` |
| ⚙️ .NET API | `https://ecocharge-api.railway.app` |
| 🐍 YOLO server | `https://ecocharge-yolo.onrender.com` |
| 📖 Swagger UI | `https://ecocharge-api.railway.app/swagger` |

---

## Troubleshooting

**Vercel shows blank page**
- Check the build log in Vercel dashboard
- Make sure `build:vercel` script runs `vite build`

**API returns 404 on Vercel**
- Check `vercel.json` has the correct Railway URL
- Verify Railway app is running (green status)

**YOLO returns "no bottle detected"**
- Render free tier may be sleeping — first request takes ~30s
- Check Render logs for errors

**Database migration fails on Railway**
- Railway MS SQL may need manual migration: run `dotnet ef database update` pointing to Railway DB
- Or the API auto-migrates on startup — check Railway logs

**CORS error in browser**
- Add your Vercel URL to `AllowedOrigins` env var on Railway:
  `AllowedOrigins=https://ecocharge-web.vercel.app`
