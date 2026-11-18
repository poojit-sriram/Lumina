import type { AspectRatioOption } from '../types';

export interface PhotoFilterPreset {
  name: string;
  cssFilter: string;
}

export const PHOTO_FILTERS: PhotoFilterPreset[] = [
  { name: 'Original', cssFilter: 'none' },
  { name: 'Kodak Warm', cssFilter: 'contrast(1.06) saturate(1.16) sepia(0.14)' },
  { name: 'Noir Mono', cssFilter: 'grayscale(1) contrast(1.22) brightness(0.98)' },
  { name: 'Velvet Matte', cssFilter: 'contrast(0.92) brightness(1.04) saturate(0.88)' },
  { name: 'Crisp Daylight', cssFilter: 'contrast(1.12) saturate(1.08) brightness(1.03)' },
];

export interface ProcessedImageResult {
  dataUrl: string;
  aspectRatio: AspectRatioOption;
  byteLength: number;
}

function detectClosestAspectRatio(width: number, height: number): AspectRatioOption {
  const ratio = width / height;
  const candidates: { option: AspectRatioOption; value: number }[] = [
    { option: '1:1', value: 1 },
    { option: '3:4', value: 0.75 },
    { option: '4:5', value: 0.8 },
    { option: '4:3', value: 1.333 },
  ];
  let best = candidates[0];
  let bestDiff = Math.abs(ratio - best.value);
  for (const c of candidates) {
    const diff = Math.abs(ratio - c.value);
    if (diff < bestDiff) {
      best = c;
      bestDiff = diff;
    }
  }
  return best.option;
}

export async function processImageFile(
  file: File,
  filterCss: string = 'none',
  maxDimension: number = 1080
): Promise<ProcessedImageResult> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode selected image.'));
      el.src = imageUrl;
    });

    const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable.');
    }

    ctx.filter = filterCss;
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.84;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > 360_000 && quality > 0.35) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    // If still above 380KB, scale down slightly more
    if (dataUrl.length > 380_000) {
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = Math.round(width * 0.72);
      smallCanvas.height = Math.round(height * 0.72);
      const sCtx = smallCanvas.getContext('2d');
      if (sCtx) {
        sCtx.filter = filterCss;
        sCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);
        dataUrl = smallCanvas.toDataURL('image/jpeg', 0.76);
      }
    }

    return {
      dataUrl,
      aspectRatio: detectClosestAspectRatio(width, height),
      byteLength: dataUrl.length,
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
