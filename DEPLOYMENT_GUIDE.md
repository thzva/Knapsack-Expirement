# 🚀 Production Deployment Guide

## ✅ Code Changes Completed

All code changes have been made and pushed to GitHub:
- ✅ Frontend API client updated to use `NEXT_PUBLIC_API_BASE`
- ✅ Backend CORS configuration updated
- ✅ GitHub Actions workflow updated
- ✅ Changes committed and pushed to: `https://github.com/SmitSutariya0205/Knapsack-Expirement`

---

## 📋 Step-by-Step Deployment Instructions

### Step 1: Set Up Neon Database (PostgreSQL)

1. **Go to Neon**: https://neon.tech
2. **Sign up/Login** (GitHub login works)
3. **Create a new project**:
   - Project name: `knapsack-experiment`
   - Region: Choose closest to your backend hosting region (US East recommended for Render)
   - PostgreSQL version: 15 or 16
4. **Copy connection strings**:
   - You'll see two connection strings:
     - **Connection Pooling URL** → Use for `DATABASE_URL`
     - **Direct Connection URL** → Use for `DIRECT_URL`
   - Save both - you'll need them for Render

**Example format:**
```
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

### Step 2: Deploy Backend to Render

1. **Go to Render**: https://render.com
2. **Sign up/Login** (GitHub login works)
3. **Connect GitHub account** if not already connected
4. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect repository: `Arjav5090/Knapsack-Expirement`
   - Click "Connect"

5. **Configure the service**:
   - **Name**: `knapsack-backend` (or your choice)
   - **Region**: Choose closest to your users (US East recommended)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or choose paid for better performance)

6. **Set Environment Variables** (in Render dashboard):
   Click "Add Environment Variable" for each:

   ```env
   DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
   DIRECT_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
   PORT=8787
   NODE_ENV=production
   CORS_ORIGIN=https://smitSutariya0205.github.io,https://smitSutariya0205.github.io/Knapsack-Expirement
   ADMIN_KEY=knapsack-admin-2024-secure
   ```

   **Important**: Replace the database URLs with your actual Neon connection strings!

7. **Create the service**:
   - Click "Create Web Service"
   - Wait for deployment (2-5 minutes)
   - **Note your service URL**: `https://knapsack-backend-xxx.onrender.com`

8. **Run Prisma Migrations**:
   - After first deployment, go to Render dashboard → Your service → "Shell"
   - Run:
     ```bash
     cd backend
     npx prisma migrate deploy
     ```
   - This will apply all database migrations

9. **Verify Backend**:
   - Visit: `https://YOUR_BACKEND_URL.onrender.com/health`
   - Should return: `{"ok":true}`

---

### Step 3: Configure GitHub Pages

1. **Set GitHub Secret** (for API URL):
   - Go to: https://github.com/SmitSutariya0205/Knapsack-Expirement/settings/secrets/actions
   - Click "New repository secret"
   - **Name**: `NEXT_PUBLIC_API_BASE`
   - **Value**: `https://YOUR_BACKEND_URL.onrender.com` (from Step 2)
   - Click "Add secret"

2. **Enable GitHub Pages**:
   - Go to: https://github.com/SmitSutariya0205/Knapsack-Expirement/settings/pages
   - **Source**: Select "GitHub Actions"
   - Click "Save"

3. **Trigger Deployment**:
   - Go to: https://github.com/SmitSutariya0205/Knapsack-Expirement/actions
   - You should see "Deploy Next.js site to Pages" workflow
   - If not running, click "Run workflow" → "Run workflow"
   - Wait for deployment (2-5 minutes)

4. **Access Your Site**:
   - Your site will be at: `https://smitSutariya0205.github.io/Knapsack-Expirement`
   - Note: First deployment may take 5-10 minutes

---

### Step 4: Verify Everything Works

#### Backend Verification:
```powershell
# Test health endpoint
Invoke-WebRequest -Uri "https://YOUR_BACKEND_URL.onrender.com/health"
# Should return: {"ok":true}
```

#### Frontend Verification:
1. Visit: `https://smitSutariya0205.github.io/Knapsack-Expirement`
2. Open browser DevTools (F12) → Network tab
3. Try to register a participant or interact with the app
4. Check that API calls are going to your Render backend
5. Verify no CORS errors in console

#### Database Verification:
- Go to Neon dashboard
- Check that tables were created (you should see `Participant` table)
- You can use Neon's SQL editor to query: `SELECT * FROM "Participant";`

---

## 🔧 Troubleshooting

### Backend not responding?
- Check Render logs: Dashboard → Your service → "Logs"
- Verify environment variables are set correctly
- Check that migrations ran successfully

### Frontend not loading?
- Check GitHub Actions: https://github.com/Arjav5090/Knapsack-Expirement/actions
- Verify `NEXT_PUBLIC_API_BASE` secret is set
- Check that GitHub Pages is enabled

### CORS errors?
- Verify `CORS_ORIGIN` in Render includes your GitHub Pages URL
- Check that URLs match exactly (including https://)
- Restart Render service after changing CORS_ORIGIN

### Database connection errors?
- Verify `DATABASE_URL` and `DIRECT_URL` in Render
- Check that migrations ran: `npx prisma migrate deploy` in Render Shell
- Test connection in Neon dashboard

---

## 📊 Final URLs

After deployment, you should have:

- **Frontend**: `https://smitSutariya0205.github.io/Knapsack-Expirement`
- **Backend**: `https://YOUR_BACKEND_URL.onrender.com`
- **Backend Health**: `https://YOUR_BACKEND_URL.onrender.com/health`
- **Database**: Managed by Neon (no direct URL needed)

---

## ✅ Deployment Checklist

- [ ] Neon database created and connection strings saved
- [ ] Render backend deployed and environment variables set
- [ ] Prisma migrations run in production
- [ ] Backend health endpoint working
- [ ] GitHub secret `NEXT_PUBLIC_API_BASE` set
- [ ] GitHub Pages enabled and configured
- [ ] GitHub Actions workflow completed successfully
- [ ] Frontend accessible at GitHub Pages URL
- [ ] Frontend can communicate with backend (no CORS errors)
- [ ] Test participant registration works
- [ ] Database records are being created

---

## 🎉 You're Done!

Once all steps are complete, your application will be live in production!

**Need help?** Check the logs in:
- Render dashboard (backend logs)
- GitHub Actions (frontend build logs)
- Browser DevTools (frontend errors)

