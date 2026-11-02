import { useState, useCallback } from 'react';

export interface FaceDetectionResult {
  faces: Array<{
    boundingBox: { x: number; y: number; width: number; height: number };
    landmarks?: Array<{ x: number; y: number }>;
  }>;
  imageData?: ImageData;
}

export function useFaceDetection() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [result, setResult] = useState<FaceDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detectFaces = useCallback(
    async (image: HTMLImageElement | HTMLVideoElement | ImageData) => {
      setIsDetecting(true);
      setError(null);
      try {
        // Stub: pas de détection réelle
        await new Promise((resolve) => setTimeout(resolve, 100));
        const stubResult: FaceDetectionResult = {
          faces: [],
        };
        setResult(stubResult);
        return stubResult;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      } finally {
        setIsDetecting(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isDetecting,
    result,
    error,
    detectFaces,
    reset,
  };
}

export default useFaceDetection;
