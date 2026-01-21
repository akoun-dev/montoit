import { UploadService } from '@/services/upload/uploadService';

interface ProcessImageOptions {
  maxWidth?: number;
  quality?: number;
}

/**
 * Convert a data URL to a File object
 */
export async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const mimeType = dataUrl.split(';')[0]?.split(':')[1] || 'image/jpeg';
  return new File([blob], fileName, { type: mimeType });
}

/**
 * Convert a web path to a File object
 */
export async function webPathToFile(webPath: string, fileName: string): Promise<File> {
  const response = await fetch(webPath);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
}

/**
 * Process a native camera result: convert to File and compress
 */
export async function processNativeImage(
  dataUrl: string,
  options: ProcessImageOptions = {}
): Promise<{ file: File; preview: string }> {
  const { maxWidth = 1920, quality = 0.8 } = options;

  // Convert dataUrl to File
  const fileName = `photo_${Date.now()}.jpg`;
  const rawFile = await dataUrlToFile(dataUrl, fileName);

  // Compress the image
  const compressedFile = await UploadService.compressImage(rawFile, maxWidth, quality);

  // Generate preview from compressed file
  const preview = await fileToDataUrl(compressedFile);

  return { file: compressedFile, preview };
}

/**
 * Convert a File to a data URL for preview
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Generate a unique filename for uploads
 */
export function generateImageFileName(prefix = 'image'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
}
