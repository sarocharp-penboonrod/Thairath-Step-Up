import { createWorker, PSM } from 'tesseract.js';

export interface EvidenceOcrResult {
  text: string;
  detectedSteps?: number;
  confidence: number;
  agreementCount: number;
  passCount: number;
  alternatives: number[];
}

type OcrVariantName = 'original' | 'high-contrast' | 'binary';

interface OcrVariant {
  name: OcrVariantName;
  label: string;
  image: HTMLCanvasElement;
  psm: PSM;
  whitelist: string;
}

interface NumericCandidate {
  value: number;
  confidence: number;
  area: number;
  centerX: number;
  centerY: number;
  imageWidth: number;
  imageHeight: number;
  sourceText: string;
  contextText: string;
  score: number;
  passName: OcrVariantName;
}

interface OcrPassResult {
  name: OcrVariantName;
  text: string;
  confidence: number;
  selected?: NumericCandidate;
  candidates: NumericCandidate[];
}

const OCR_PASS_COUNT = 3;
const MAX_OCR_SIDE = 2000;
const MIN_VALID_STEPS = 100;
const MAX_VALID_STEPS = 500000;

const POSITIVE_CONTEXT = /\b(step|steps|walking|walked)\b/i;
const NEGATIVE_CONTEXT = /\b(km|kilomet(?:er|re)s?|kcal|calories?|cal|distance|minute|min|hour|hours|hr|bpm|heart|sleep|goal|target|avg|average|day|days|date)\b/i;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('ไม่สามารถอ่านภาพสำหรับ OCR ได้'));
    image.src = source;
  });
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('อุปกรณ์นี้ไม่รองรับการประมวลผลภาพ OCR');
  return context;
}

function createScaledCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = longestSide > MAX_OCR_SIDE
    ? MAX_OCR_SIDE / longestSide
    : longestSide < 1100
      ? Math.min(1.8, 1400 / Math.max(1, longestSide))
      : 1;

  const canvas = createCanvas(image.naturalWidth * scale, image.naturalHeight * scale);
  const context = getContext(canvas);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = createCanvas(source.width, source.height);
  getContext(canvas).drawImage(source, 0, 0);
  return canvas;
}

function createHighContrastCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = cloneCanvas(source);
  const context = getContext(canvas);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = 0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2];
    const contrasted = clamp((luminance - 128) * 1.65 + 128, 0, 255);
    pixels[index] = contrasted;
    pixels[index + 1] = contrasted;
    pixels[index + 2] = contrasted;
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function calculateOtsuThreshold(histogram: number[], totalPixels: number): number {
  let totalLuminance = 0;
  for (let level = 0; level < 256; level += 1) totalLuminance += level * histogram[level];

  let backgroundWeight = 0;
  let backgroundLuminance = 0;
  let highestVariance = -1;
  let bestThreshold = 128;

  for (let level = 0; level < 256; level += 1) {
    backgroundWeight += histogram[level];
    if (backgroundWeight === 0) continue;

    const foregroundWeight = totalPixels - backgroundWeight;
    if (foregroundWeight === 0) break;

    backgroundLuminance += level * histogram[level];
    const backgroundMean = backgroundLuminance / backgroundWeight;
    const foregroundMean = (totalLuminance - backgroundLuminance) / foregroundWeight;
    const variance = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;

    if (variance > highestVariance) {
      highestVariance = variance;
      bestThreshold = level;
    }
  }

  return bestThreshold;
}

function createBinaryCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = cloneCanvas(source);
  const context = getContext(canvas);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const histogram = new Array<number>(256).fill(0);
  let luminanceSum = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = Math.round(0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2]);
    histogram[luminance] += 1;
    luminanceSum += luminance;
  }

  const totalPixels = Math.max(1, canvas.width * canvas.height);
  const threshold = calculateOtsuThreshold(histogram, totalPixels);
  const darkBackground = luminanceSum / totalPixels < 128;

  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = Math.round(0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2]);
    const isLikelyText = darkBackground ? luminance > threshold : luminance < threshold;
    const output = isLikelyText ? 0 : 255;
    pixels[index] = output;
    pixels[index + 1] = output;
    pixels[index + 2] = output;
    pixels[index + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

async function createOcrVariants(source: string): Promise<OcrVariant[]> {
  const image = await loadImage(source);
  const original = createScaledCanvas(image);
  const highContrast = createHighContrastCanvas(original);
  const binary = createBinaryCanvas(highContrast);

  return [
    {
      name: 'original',
      label: 'ภาพต้นฉบับ',
      image: original,
      psm: PSM.SPARSE_TEXT,
      whitelist: '0123456789OoIl|,.:/%- abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    },
    {
      name: 'high-contrast',
      label: 'ภาพเพิ่มความคมชัด',
      image: highContrast,
      psm: PSM.SPARSE_TEXT,
      whitelist: '0123456789OoIl|,.:/%- '
    },
    {
      name: 'binary',
      label: 'ภาพขาวดำ',
      image: binary,
      psm: PSM.SPARSE_TEXT,
      whitelist: '0123456789OoIl|,.:/%- '
    }
  ];
}

function normalizeOcrCharacters(raw: string): string {
  return String(raw || '')
    .replace(/[Oo]/g, '0')
    .replace(/[Il|]/g, '1')
    .trim();
}

function parseNumericText(raw: string): number | undefined {
  const normalized = normalizeOcrCharacters(raw);
  if (!normalized) return undefined;

  // Reject obvious time, date, percentage and decimal measurements such as 10:42, 20/07 or 5.72 km.
  if (/\d\s*[:/%]\s*\d/.test(normalized)) return undefined;
  if (/^\d{1,3}\.\d{1,2}$/.test(normalized)) return undefined;

  const compact = normalized.replace(/\s+/g, '');
  const validFormat =
    /^\d{3,7}$/.test(compact) ||
    /^\d{1,3}(?:,\d{3}){1,2}$/.test(compact) ||
    /^\d{1,3}(?:\.\d{3}){1,2}$/.test(compact);

  if (!validFormat) return undefined;

  const cleaned = compact.replace(/[,.]/g, '');
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < MIN_VALID_STEPS || value > MAX_VALID_STEPS) return undefined;
  return value;
}

function numericFragments(text: string): string[] {
  const normalized = normalizeOcrCharacters(text);
  return normalized.match(/\d[\d,.\s:/%|-]{1,12}\d|\d{3,7}/g) || [];
}

function scoreCandidate(candidate: Omit<NumericCandidate, 'score'>): number {
  const widthRatio = Math.sqrt(Math.max(1, candidate.area)) / Math.max(1, candidate.imageWidth);
  const heightRatio = Math.sqrt(Math.max(1, candidate.area)) / Math.max(1, candidate.imageHeight);
  const visualSizeScore = clamp((widthRatio + heightRatio) * 145, 0, 48);
  const confidenceScore = clamp(candidate.confidence, 0, 100) * 0.24;

  const normalizedX = candidate.centerX / Math.max(1, candidate.imageWidth);
  const normalizedY = candidate.centerY / Math.max(1, candidate.imageHeight);
  const horizontalCenterScore = clamp(1 - Math.abs(normalizedX - 0.5) / 0.5, 0, 1) * 12;
  const verticalScore = normalizedY >= 0.08 && normalizedY <= 0.72 ? 8 : normalizedY <= 0.9 ? 3 : 0;

  const digits = String(candidate.value).length;
  const digitScore = digits >= 4 && digits <= 6 ? 8 : 3;
  const context = candidate.contextText || candidate.sourceText;
  const positiveContextScore = POSITIVE_CONTEXT.test(context) ? 18 : 0;
  const negativeContextPenalty = NEGATIVE_CONTEXT.test(context) ? 24 : 0;

  return visualSizeScore + confidenceScore + horizontalCenterScore + verticalScore + digitScore + positiveContextScore - negativeContextPenalty;
}

function createCandidate(
  value: number,
  confidence: number,
  bbox: Tesseract.Bbox,
  imageWidth: number,
  imageHeight: number,
  sourceText: string,
  contextText: string,
  passName: OcrVariantName
): NumericCandidate {
  const width = Math.max(1, bbox.x1 - bbox.x0);
  const height = Math.max(1, bbox.y1 - bbox.y0);
  const base = {
    value,
    confidence: clamp(Number(confidence) || 0, 0, 100),
    area: width * height,
    centerX: bbox.x0 + width / 2,
    centerY: bbox.y0 + height / 2,
    imageWidth,
    imageHeight,
    sourceText,
    contextText,
    passName
  };

  return { ...base, score: scoreCandidate(base) };
}

function estimateFragmentBox(line: Tesseract.Line, fragment: string): Tesseract.Bbox {
  const lineWidth = Math.max(1, line.bbox.x1 - line.bbox.x0);
  const lineHeight = Math.max(1, line.bbox.y1 - line.bbox.y0);
  const textLength = Math.max(1, normalizeOcrCharacters(line.text).length);
  const estimatedWidth = clamp(lineWidth * (normalizeOcrCharacters(fragment).length / textLength) * 1.35, lineHeight * 1.2, lineWidth);
  const centerX = line.bbox.x0 + lineWidth / 2;

  return {
    x0: Math.max(line.bbox.x0, Math.round(centerX - estimatedWidth / 2)),
    y0: line.bbox.y0,
    x1: Math.min(line.bbox.x1, Math.round(centerX + estimatedWidth / 2)),
    y1: line.bbox.y1
  };
}

function collectCandidates(
  blocks: Tesseract.Block[] | null,
  imageWidth: number,
  imageHeight: number,
  passName: OcrVariantName
): NumericCandidate[] {
  if (!blocks) return [];
  const candidates: NumericCandidate[] = [];

  blocks.forEach((block) => {
    block.paragraphs.forEach((paragraph) => {
      paragraph.lines.forEach((line) => {
        const contextText = line.text || paragraph.text || block.text || '';

        line.words.forEach((word) => {
          const value = parseNumericText(word.text);
          if (value === undefined) return;
          candidates.push(createCandidate(
            value,
            word.confidence,
            word.bbox,
            imageWidth,
            imageHeight,
            word.text,
            contextText,
            passName
          ));
        });

        // Tesseract occasionally splits a formatted number into several words.
        // Reading the full line catches cases such as "8, 426" or "12 345".
        numericFragments(line.text).forEach((fragment) => {
          const value = parseNumericText(fragment);
          if (value === undefined) return;
          candidates.push(createCandidate(
            value,
            line.confidence,
            estimateFragmentBox(line, fragment),
            imageWidth,
            imageHeight,
            fragment,
            contextText,
            passName
          ));
        });
      });
    });
  });

  const deduplicated = new Map<string, NumericCandidate>();
  candidates.forEach((candidate) => {
    const key = `${candidate.value}-${Math.round(candidate.centerX / 20)}-${Math.round(candidate.centerY / 20)}`;
    const previous = deduplicated.get(key);
    if (!previous || candidate.score > previous.score) deduplicated.set(key, candidate);
  });

  return Array.from(deduplicated.values()).sort((a, b) => b.score - a.score);
}

function fallbackCandidatesFromText(
  text: string,
  confidence: number,
  imageWidth: number,
  imageHeight: number,
  passName: OcrVariantName
): NumericCandidate[] {
  const fallbackBox: Tesseract.Bbox = {
    x0: Math.round(imageWidth * 0.2),
    y0: Math.round(imageHeight * 0.2),
    x1: Math.round(imageWidth * 0.8),
    y1: Math.round(imageHeight * 0.4)
  };

  return numericFragments(text)
    .map((fragment) => {
      const value = parseNumericText(fragment);
      if (value === undefined) return undefined;
      return createCandidate(value, confidence * 0.75, fallbackBox, imageWidth, imageHeight, fragment, text, passName);
    })
    .filter((candidate): candidate is NumericCandidate => Boolean(candidate));
}

function selectBestCandidate(candidates: NumericCandidate[]): NumericCandidate | undefined {
  return candidates[0];
}

function resolveConsensus(passResults: OcrPassResult[]): EvidenceOcrResult {
  // Use the strongest candidates from every pass, not only the first candidate.
  // A value receives at most one vote per OCR pass.
  const grouped = new Map<number, Map<OcrVariantName, NumericCandidate>>();

  passResults.forEach((pass) => {
    pass.candidates.slice(0, 4).forEach((candidate) => {
      const byPass = grouped.get(candidate.value) || new Map<OcrVariantName, NumericCandidate>();
      const previous = byPass.get(pass.name);
      if (!previous || candidate.score > previous.score) byPass.set(pass.name, candidate);
      grouped.set(candidate.value, byPass);
    });
  });

  const rankedGroups = Array.from(grouped.entries()).sort(([, byPassA], [, byPassB]) => {
    if (byPassB.size !== byPassA.size) return byPassB.size - byPassA.size;
    const scoreA = Array.from(byPassA.values()).reduce((sum, candidate) => sum + candidate.score, 0);
    const scoreB = Array.from(byPassB.values()).reduce((sum, candidate) => sum + candidate.score, 0);
    return scoreB - scoreA;
  });

  const [winningValue, winningByPass] = rankedGroups[0] || [];
  const winningCandidates = winningByPass ? Array.from(winningByPass.values()) : [];
  const agreementCount = winningCandidates.length;
  const alternatives = rankedGroups
    .map(([value]) => value)
    .filter((value) => value !== winningValue)
    .slice(0, 4);

  let confidence = 0;
  if (winningCandidates.length) {
    const averageConfidence = winningCandidates.reduce((sum, candidate) => sum + candidate.confidence, 0) / winningCandidates.length;
    if (agreementCount >= 3) confidence = clamp(Math.round(averageConfidence + 15), 80, 99);
    else if (agreementCount === 2) confidence = clamp(Math.round(averageConfidence + 8), 68, 95);
    else confidence = Math.min(59, Math.round(averageConfidence * 0.72));
  }

  const combinedText = passResults
    .map((pass) => `[${pass.name}]\n${pass.text}`)
    .join('\n\n')
    .slice(0, 45000);

  return {
    text: combinedText,
    detectedSteps: winningValue,
    confidence,
    agreementCount,
    passCount: OCR_PASS_COUNT,
    alternatives
  };
}

export async function runEvidenceOcr(
  image: string,
  onProgress?: (progress: number, status: string) => void
): Promise<EvidenceOcrResult> {
  const variants = await createOcrVariants(image);
  let activePassIndex = 0;
  let activePassLabel = variants[0].label;

  const worker = await createWorker('eng', undefined, {
    logger: (message) => {
      const passProgress = clamp(Number(message.progress) || 0, 0, 1);
      const overallProgress = Math.round(((activePassIndex + passProgress) / variants.length) * 100);
      onProgress?.(overallProgress, `รอบ ${activePassIndex + 1}/${variants.length} · ${activePassLabel}`);
    }
  });

  const passResults: OcrPassResult[] = [];

  try {
    for (let index = 0; index < variants.length; index += 1) {
      const variant = variants[index];
      activePassIndex = index;
      activePassLabel = variant.label;
      onProgress?.(Math.round((index / variants.length) * 100), `รอบ ${index + 1}/${variants.length} · ${variant.label}`);

      await worker.setParameters({
        tessedit_pageseg_mode: variant.psm,
        tessedit_char_whitelist: variant.whitelist,
        preserve_interword_spaces: '1'
      });

      const result = await worker.recognize(variant.image, {}, { text: true, blocks: true });
      const blockCandidates = collectCandidates(
        result.data.blocks,
        variant.image.width,
        variant.image.height,
        variant.name
      );
      const candidates = blockCandidates.length > 0
        ? blockCandidates
        : fallbackCandidatesFromText(
            result.data.text || '',
            result.data.confidence || 0,
            variant.image.width,
            variant.image.height,
            variant.name
          );

      passResults.push({
        name: variant.name,
        text: result.data.text || '',
        confidence: result.data.confidence || 0,
        selected: selectBestCandidate(candidates),
        candidates
      });
    }

    onProgress?.(100, 'สรุปผล OCR หลายรอบ');
    return resolveConsensus(passResults);
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
