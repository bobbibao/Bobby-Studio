/**
 * Sketch Preprocessor Utility
 * Automatically cleans and optimizes sketches for backend ControlNet processing
 */

export interface PreprocessingOptions {
  normalizeBackground?: boolean;
  improveContrast?: boolean;
  cleanTransparency?: boolean;
  targetFormat?: 'png' | 'jpeg';
}

const DEFAULT_OPTIONS: PreprocessingOptions = {
  normalizeBackground: true,
  improveContrast: true,
  cleanTransparency: true,
  targetFormat: 'png',
};

/**
 * Convert data URL to blob
 */
const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(data);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
};

/**
 * Convert blob to data URL
 */
const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/**
 * Process image through canvas with preprocessing options
 */
const processImageOnCanvas = async (
  imageData: string | Blob,
  options: PreprocessingOptions
): Promise<HTMLCanvasElement> => {
  const image = new Image();

  // Load image from data URL or blob
  const imageUrl = imageData instanceof Blob ? URL.createObjectURL(imageData) : imageData;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageUrl;
  });

  // Create canvas with same dimensions
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Draw original image
  ctx.drawImage(image, 0, 0);

  // Get image data for processing
  const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageDataObj.data;

  // Apply preprocessing
  if (options.normalizeBackground) {
    normalizeBackground(data);
  }

  if (options.improveContrast) {
    improveContrast(data);
  }

  if (options.cleanTransparency) {
    cleanTransparency(data);
  }

  // Put processed data back
  ctx.putImageData(imageDataObj, 0, 0);

  // Cleanup blob URL
  if (imageData instanceof Blob) {
    URL.revokeObjectURL(imageUrl);
  }

  return canvas;
};

/**
 * Normalize white background to pure white
 * Maps near-white colors to pure white
 */
const normalizeBackground = (data: Uint8ClampedArray): void => {
  const threshold = 240; // Colors above this are considered "white"
  const targetWhite = 255;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Check if pixel is near-white and not transparent
    if (r >= threshold && g >= threshold && b >= threshold && a === 255) {
      // Set to pure white
      data[i] = targetWhite;
      data[i + 1] = targetWhite;
      data[i + 2] = targetWhite;
    }
  }
};

/**
 * Improve sketch contrast for better ControlNet conditioning
 * Makes dark lines darker, light backgrounds lighter
 */
const improveContrast = (data: Uint8ClampedArray): void => {
  const contrastFactor = 1.3; // Increase contrast
  const mid = 128;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Apply contrast to each channel
    data[i] = Math.min(255, Math.max(0, mid + (r - mid) * contrastFactor));
    data[i + 1] = Math.min(255, Math.max(0, mid + (g - mid) * contrastFactor));
    data[i + 2] = Math.min(255, Math.max(0, mid + (b - mid) * contrastFactor));
  }
};

/**
 * Clean transparency - convert semi-transparent pixels
 * Semi-transparent dark pixels become opaque black
 * Semi-transparent light pixels become opaque white
 */
const cleanTransparency = (data: Uint8ClampedArray): void => {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // If semi-transparent
    if (a > 0 && a < 255) {
      const brightness = (r + g + b) / 3;

      // Semi-transparent dark -> opaque black
      if (brightness < 128) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }
      // Semi-transparent light -> opaque white
      else {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
    }
  }
};

/**
 * Main preprocessing function
 * Takes a sketch image and returns preprocessed base64 for backend
 */
export const preprocessSketch = async (
  sketchDataUrl: string,
  customOptions?: Partial<PreprocessingOptions>
): Promise<{
  base64: string;
  dataUrl: string;
  blob: Blob;
}> => {
  const options = { ...DEFAULT_OPTIONS, ...customOptions };

  // Process image
  const canvas = await processImageOnCanvas(sketchDataUrl, options);

  // Convert to blob
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), `image/${options.targetFormat}`, 0.95);
  });

  // Convert to data URL
  const dataUrl = await blobToDataUrl(blob);

  // Extract base64 (remove data:image/png;base64, prefix)
  const base64 = dataUrl.split(',')[1];

  return { base64, dataUrl, blob };
};

/**
 * Export canvas to clean PNG image
 */
export const exportCanvasAsImage = async (
  canvas: HTMLCanvasElement,
  options?: Partial<PreprocessingOptions>
): Promise<{ base64: string; dataUrl: string; blob: Blob }> => {
  const dataUrl = canvas.toDataURL('image/png');
  return preprocessSketch(dataUrl, options);
};

/**
 * Quick validation - check if image is suitable for ControlNet
 */
export const validateSketchImage = (dataUrl: string): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];

  // Check if data URL is valid
  if (!dataUrl.startsWith('data:image/')) {
    issues.push('Invalid image format');
  }

  // Check size roughly (data URL size as proxy)
  const kb = dataUrl.length / 1024;
  if (kb > 5000) {
    issues.push('Image too large - compression recommended');
  }

  if (kb < 10) {
    issues.push('Image too small - may lack detail');
  }

  return { valid: issues.length === 0, issues };
};

