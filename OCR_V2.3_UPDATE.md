# OCR v2.3 Update

## Files changed

- `src/evidenceOcr.ts`
- `src/components/SubmissionView.tsx`
- `src/components/AdminPortalView.tsx` (version label only)
- `package.json`
- `package-lock.json`
- `README.md`

## OCR behavior

1. Generates three OCR variants automatically: original, high-contrast grayscale and Otsu binary.
2. Runs Tesseract.js three times with the same worker.
3. Rejects obvious time, date, percentage and decimal measurement candidates.
4. Scores candidates using size, position, confidence and nearby English context.
5. Uses cross-pass consensus. Two or three agreeing passes can reach the auto-verification threshold.
6. A single-pass result is capped below 60% confidence and therefore requires Admin review.

## Deployment

No Google Apps Script change is required for this OCR-only update.
Upload the whole project to GitHub, or replace these two frontend files:

- `src/evidenceOcr.ts`
- `src/components/SubmissionView.tsx`

Then let Vercel deploy the new commit without using the previous build cache.
