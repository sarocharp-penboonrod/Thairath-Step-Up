import { createWorker, PSM } from 'tesseract.js';

export interface EvidenceOcrResult {
  text: string;
  detectedSteps?: number;
  confidence: number;
}

interface NumericCandidate {
  value: number;
  confidence: number;
  area: number;
  text: string;
}

function parseNumericText(raw: string): number | undefined {
  const cleaned = raw
    .replace(/[Oo]/g, '0')
    .replace(/[^0-9]/g, '');

  if (cleaned.length < 3 || cleaned.length > 7) return undefined;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 100 || value > 500000) return undefined;
  return value;
}

function collectCandidates(blocks: Tesseract.Block[] | null): NumericCandidate[] {
  if (!blocks) return [];
  const candidates: NumericCandidate[] = [];

  blocks.forEach((block) => {
    block.paragraphs.forEach((paragraph) => {
      paragraph.lines.forEach((line) => {
        line.words.forEach((word) => {
          const value = parseNumericText(word.text);
          if (value === undefined) return;
          const width = Math.max(1, word.bbox.x1 - word.bbox.x0);
          const height = Math.max(1, word.bbox.y1 - word.bbox.y0);
          candidates.push({
            value,
            confidence: Number(word.confidence) || 0,
            area: width * height,
            text: word.text
          });
        });
      });
    });
  });

  return candidates;
}

function pickLargestVisualNumber(candidates: NumericCandidate[]): NumericCandidate | undefined {
  return [...candidates].sort((a, b) => {
    // Screenshot apps normally render the weekly total as the largest number.
    // Area is therefore the primary signal; OCR confidence is only the tie-breaker.
    if (b.area !== a.area) return b.area - a.area;
    return b.confidence - a.confidence;
  })[0];
}

function fallbackFromText(text: string): number | undefined {
  const matches = text.match(/[0-9Oo][0-9Oo,\.\s]{2,10}/g) || [];
  const values = matches
    .map(parseNumericText)
    .filter((value): value is number => value !== undefined);
  return values.length > 0 ? Math.max(...values) : undefined;
}

export async function runEvidenceOcr(
  image: string,
  onProgress?: (progress: number, status: string) => void
): Promise<EvidenceOcrResult> {
  const worker = await createWorker('eng', undefined, {
    logger: (message) => {
      onProgress?.(Math.round((message.progress || 0) * 100), message.status || 'OCR');
    }
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      tessedit_char_whitelist: '0123456789,.'
    });

    const result = await worker.recognize(image, {}, { text: true, blocks: true });
    const candidates = collectCandidates(result.data.blocks);
    const best = pickLargestVisualNumber(candidates);

    return {
      text: result.data.text || '',
      detectedSteps: best?.value ?? fallbackFromText(result.data.text || ''),
      confidence: Math.round(best?.confidence ?? result.data.confidence ?? 0)
    };
  } finally {
    await worker.terminate();
  }
}

export async function compressEvidenceImage(file: File): Promise<{
  dataUrl: string;
  mimeType: string;
  fileName: string;
}> {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
      img.src = sourceUrl;
    });

    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('อุปกรณ์นี้ไม่รองรับการเตรียมรูปหลักฐาน');
    context.drawImage(image, 0, 0, width, height);

    const mimeType = file.type === 'image/png' && file.size < 1_500_000 ? 'image/png' : 'image/jpeg';
    const dataUrl = mimeType === 'image/png'
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', 0.84);

    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9ก-๙_-]+/g, '_') || 'evidence';
    const fileName = `${baseName}.${mimeType === 'image/png' ? 'png' : 'jpg'}`;

    return { dataUrl, mimeType, fileName };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
