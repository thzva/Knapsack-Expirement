# 🧪 Production Testing Guide

## ✅ Complete Testing Checklist

### 1. Backend Health Check

**Test Backend API:**
```powershell
# Test health endpoint
Invoke-WebRequest -Uri "https://knapsack-expirement-03kg.onrender.com/health"
```

**Expected Result:** `{"ok":true}`

**Or visit in browser:**
- https://knapsack-expirement-03kg.onrender.com/health

---

### 2. Frontend Accessibility

**Test Frontend:**
- Visit: https://smitSutariya0205.github.io/Knapsack-Expirement
- Should load without errors
- Check browser console (F12) for any errors

**Expected:** Page loads, no console errors

---

### 3. Backend API Connectivity

**Test from Frontend:**
1. Open frontend in browser
2. Open DevTools (F12) → Network tab
3. Interact with the app (try to register/start experiment)
4. Check Network tab for API calls to:
   - `https://knapsack-expirement-03kg.onrender.com/api/...`
5. Verify no CORS errors in console

**Expected:** API calls succeed, no CORS errors

---

### 4. Database Connection Test

**Test via Backend API:**

**A. Register a Test Participant:**
```powershell
$body = @{
    prolificPid = "test-$(Get-Date -Format 'yyyyMMddHHmmss')"
    studyId = "test-study"
    sessionId = "test-session"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://knapsack-expirement-03kg.onrender.com/api/v1/register-prolific" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

**Expected:** Returns `{"participantId": "...", "message": "New participant created"}`

**B. Check Study Stats:**
```powershell
Invoke-WebRequest -Uri "https://knapsack-expirement-03kg.onrender.com/api/v1/study-stats" -UseBasicParsing
```

**Expected:** Returns JSON with participant counts

---

### 5. Database Verification (Neon Dashboard)

**Check Database Directly:**
1. Go to: https://console.neon.tech
2. Open your project: `knapsack-experiment`
3. Click "SQL Editor"
4. Run query:
   ```sql
   SELECT * FROM "Participant" LIMIT 10;
   ```
5. Verify you can see the test participant you created

**Expected:** Table exists, can query data

---

### 6. Full End-to-End Test

**Test Complete User Flow:**

1. **Open Frontend:**
   - https://smitSutariya0205.github.io/Knapsack-Expirement

2. **Start Experiment:**
   - The app should load
   - If it requires Prolific parameters, it should create a test participant automatically (based on your code)

3. **Complete a Phase:**
   - Go through at least one phase of the experiment
   - Submit some data

4. **Verify Data Saved:**
   - Check Neon database to see if participant data was saved
   - Or use backend API to check participant status

---

### 7. Backend API Endpoints Test

**Test All Key Endpoints:**

```powershell
# 1. Health Check
Invoke-WebRequest -Uri "https://knapsack-expirement-03kg.onrender.com/health"

# 2. Root API Info
Invoke-WebRequest -Uri "https://knapsack-expirement-03kg.onrender.com/"

# 3. Study Stats
Invoke-WebRequest -Uri "https://knapsack-expirement-03kg.onrender.com/api/v1/study-stats"

# 4. Register Participant
$registerBody = @{
    prolificPid = "test-participant-001"
    studyId = "test-study-001"
    sessionId = "test-session-001"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://knapsack-expirement-03kg.onrender.com/api/v1/register-prolific" `
    -Method POST `
    -ContentType "application/json" `
    -Body $registerBody
```

---

### 8. Admin Endpoints Test (Optional)

**Test Admin Analytics:**
```powershell
$headers = @{
    "x-admin-key" = "knapsack-admin-2024-secure"
}

Invoke-WebRequest -Uri "https://knapsack-expirement-03kg.onrender.com/api/v1/admin/analytics" `
    -Headers $headers
```

**Expected:** Returns analytics data (requires admin key)

---

## 🔍 Troubleshooting

### If Frontend Can't Connect to Backend:

1. **Check CORS:**
   - Verify `CORS_ORIGIN` in Render includes your GitHub Pages URL
   - Should include: `https://smitSutariya0205.github.io`

2. **Check API Base URL:**
   - Verify GitHub secret `NEXT_PUBLIC_API_BASE` is set correctly
   - Should be: `https://knapsack-expirement-03kg.onrender.com`

3. **Check Browser Console:**
   - Look for CORS errors
   - Look for 404 errors (wrong API URL)

### If Database Queries Fail:

1. **Check Render Logs:**
   - Render Dashboard → Your service → Logs
   - Look for database connection errors

2. **Verify Environment Variables:**
   - `DATABASE_URL` and `DIRECT_URL` are set correctly in Render

3. **Test Connection:**
   - Run migrations again to verify connection

---

## ✅ Success Criteria

- [ ] Backend health endpoint returns `{"ok":true}`
- [ ] Frontend loads without errors
- [ ] Frontend can make API calls to backend (no CORS errors)
- [ ] Can register a new participant via API
- [ ] Participant data appears in Neon database
- [ ] Frontend can complete at least one phase of experiment
- [ ] Data is saved to database after interaction

---

## 📊 Quick Test Script

Run this PowerShell script to test everything at once:

```powershell
Write-Host "🧪 Testing Production Deployment..." -ForegroundColor Cyan

# Test 1: Backend Health
Write-Host "`n1. Testing Backend Health..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "https://knapsack-expirement-03kg.onrender.com/health" -UseBasicParsing
    Write-Host "   ✅ Backend is healthy: $($health.Content)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend health check failed: $_" -ForegroundColor Red
}

# Test 2: Study Stats
Write-Host "`n2. Testing Study Stats API..." -ForegroundColor Yellow
try {
    $stats = Invoke-WebRequest -Uri "https://knapsack-expirement-03kg.onrender.com/api/v1/study-stats" -UseBasicParsing
    Write-Host "   ✅ Study stats retrieved: $($stats.Content)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Study stats failed: $_" -ForegroundColor Red
}

# Test 3: Register Test Participant
Write-Host "`n3. Testing Participant Registration..." -ForegroundColor Yellow
$testPid = "test-$(Get-Date -Format 'yyyyMMddHHmmss')"
$registerBody = @{
    prolificPid = $testPid
    studyId = "test-study"
    sessionId = "test-session"
} | ConvertTo-Json

try {
    $register = Invoke-WebRequest -Uri "https://knapsack-expirement-03kg.onrender.com/api/v1/register-prolific" `
        -Method POST `
        -ContentType "application/json" `
        -Body $registerBody
    Write-Host "   ✅ Participant registered: $($register.Content)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Registration failed: $_" -ForegroundColor Red
}

Write-Host "`n✅ Testing Complete!" -ForegroundColor Cyan
Write-Host "`nFrontend URL: https://smitSutariya0205.github.io/Knapsack-Expirement" -ForegroundColor Cyan
Write-Host "Backend URL: https://knapsack-expirement-03kg.onrender.com" -ForegroundColor Cyan
```

---

## 🎉 You're All Set!

Once all tests pass, your production deployment is fully functional!

