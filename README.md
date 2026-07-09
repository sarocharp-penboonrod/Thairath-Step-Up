# Thairath Step Up & Health Up

Interactive wellness dashboard, step-submission portal, and department leaderboard for Thairath Logistics employees.

## Current Backend

This version uses **Google Sheets as the operational backend** through a secure Vercel API proxy and Google Apps Script Web App.

```text
React / Vite on Vercel
        ↓ /api/sheets
Vercel Serverless Function
        ↓ GOOGLE_APPS_SCRIPT_URL
Google Apps Script Web App
        ↓
Google Sheets: Employees + StepLogs
```

The frontend no longer imports Firebase SDK or Firestore APIs.

## Google Sheets Structure

Create a Google Sheet with these sheets. The Apps Script also creates them automatically on first call.

### Employees

| employeeId | password | dateOfBirth | name | Surename | nickname | departmentId | weekTarget | totalTickets | email | status | createdAt | updatedAt | lastLoginAt | lastLoginAt |
|---|---|---|---|---|---|---:|---:|---|---|---|---|

Notes:
- `employeeId` = username, 6 digits.
- `password` = birthdate in `DDMMYY` using Thai Buddhist year last 2 digits, for example `120342` = 12/03/2542.
- `dateOfBirth` should be `YYYY-MM-DD`; age is calculated automatically by Apps Script and returned to the app.
- `status` must be `Active` to allow login.

### StepLogs

| id | userEmail | employeeId | date | steps | week | weekOfMonth | imageName | submittedAt | createdAt | updatedAt |
|---|---|---|---|---:|---:|---:|---|---|---|---|

## Apps Script Setup

1. Create/open the backend Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Replace the Apps Script content with `google-apps-script/Code.gs` from this project.
4. Run `doGet` once and approve permissions.
5. Deploy as **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone with the link**
6. Copy the Web App URL.
7. In Vercel → Project → Settings → Environment Variables, add:
   - `GOOGLE_APPS_SCRIPT_URL` = `https://script.google.com/macros/s/AKfycbzLD67Y13eXGOtZO9PJNC9DtGe6ZDCoPxcIGe8GY2DN4RcqUiVI0mRtRiZswdGP-Cao3g/exec`
   - `VITE_SHEETS_API_URL` = `/api/sheets`
8. Redeploy Vercel.

## Local / Deployment Commands

```bash
npm install
npm run dev
npm run build
npm run lint
```

For local development that needs `/api/sheets`, run via Vercel local dev or deploy to Vercel and test on the deployed URL.

## Admin Login

Current hardcoded demo admin credentials remain in `LoginView.tsx`:

- ID: `admin` or `100202`
- Password: `999999` or `240845`

For production, move admin authentication into the Google Sheets backend before broad rollout.

## Files Added for Sheets Backend

- `src/sheetsBackend.ts` — frontend API adapter replacing Firebase operations.
- `api/sheets.ts` — Vercel serverless proxy to Apps Script.
- `google-apps-script/Code.gs` — Google Sheets backend logic.
- `google-apps-script/sample-employees.csv` — starter employee rows.
- `google-apps-script/sample-steplogs.csv` — starter step log rows.


## Linked Database

Google Sheets Spreadsheet ID: `1YgxxKpP74EkzfzAJn2wnTXamrYJ9-aBZsKwcBo7v3Dk`

Employees header must be:

```text
employeeId | password | dateOfBirth | name | Surename | nickname | departmentId | weekTarget | totalTickets | email | status | createdAt | updatedAt | lastLoginAt
```

## Linked Apps Script Web App

Current Apps Script Web App URL:

```text
https://script.google.com/macros/s/AKfycbzLD67Y13eXGOtZO9PJNC9DtGe6ZDCoPxcIGe8GY2DN4RcqUiVI0mRtRiZswdGP-Cao3g/exec
```

Use this exact value for `GOOGLE_APPS_SCRIPT_URL` in Vercel Environment Variables.



## Latest Admin Fix

- Admin Department filter now reads both known department IDs and department names coming directly from Google Sheets. If a department is not in the original preset list, the app creates a dynamic department option automatically.
- Employee login now updates `lastLoginAt` in the Employees sheet every time a login succeeds. This column is also shown in the Admin employee table and CSV export.
