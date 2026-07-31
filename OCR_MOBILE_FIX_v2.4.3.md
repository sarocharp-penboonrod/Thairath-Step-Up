# OCR Mobile Fix v2.4.3

## Changes

- OCR now reads from the original uploaded File instead of the 1,600px upload copy.
- Mobile portrait screenshots preserve a short side of roughly 1,000px, capped at 5 megapixels and 3,200px.
- Three free Tesseract.js passes are retained:
  1. Full high-resolution image
  2. Broad upper/centre crop with increased contrast
  3. Broad upper/centre crop with adaptive black/white threshold
- The entered step value is used only to rank OCR candidates that were genuinely found in the image.
- A single-pass result remains capped below the auto-verification threshold.
- `createImageBitmap(..., imageOrientation: 'from-image')` is used when available to respect mobile EXIF orientation.
- The upload copy remains compressed to save Google Drive space.

## Deployment

Frontend only. No changes are required in Code.gs, Google Sheets, Script Properties or Vercel Environment Variables.
