import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from './Button';
import { Trash2, Undo2 } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface SignaturePadProps {
  width?: number;
  height?: number;
  penColor?: string;
  backgroundColor?: string;
  onSignatureChange?: (dataUrl: string | null) => void;
  initialSignature?: string;
  readOnly?: boolean;
  label?: string;
  required?: boolean;
  className?: string;
}

export function SignaturePad({
  width = 400,
  height = 200,
  penColor = '#2C1810',
  backgroundColor = '#FAF7F4',
  onSignatureChange,
  initialSignature,
  readOnly = false,
  label,
  required = false,
  className = '',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width, height });

  // Responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const newWidth = Math.min(containerWidth - 2, width);
        const newHeight = Math.round(newWidth * (height / width));
        setCanvasSize({ width: newWidth, height: newHeight });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [width, height]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution for retina displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    ctx.scale(dpr, dpr);

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Load initial signature if provided
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height);
        setIsEmpty(false);
      };
      img.src = initialSignature;
    }
  }, [canvasSize, backgroundColor, initialSignature]);

  // Redraw all strokes when canvas size changes
  useEffect(() => {
    if (strokes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and redraw
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    strokes.forEach((stroke) => {
      drawStroke(ctx, stroke);
    });
  }, [canvasSize, strokes, backgroundColor]);

  const drawStroke = useCallback(
    (ctx: CanvasRenderingContext2D, points: Point[]) => {
      if (points.length < 2) return;

      ctx.strokeStyle = penColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(points[0]?.x ?? 0, points[0]?.y ?? 0);

      // Use quadratic curves for smoother lines
      for (let i = 1; i < points.length - 1; i++) {
        const curr = points[i];
        const next = points[i + 1];
        if (!curr || !next) continue;

        const midX = (curr.x + next.x) / 2;
        const midY = (curr.y + next.y) / 2;
        ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
      }

      const lastPt = points[points.length - 1];
      if (lastPt) {
        ctx.lineTo(lastPt.x, lastPt.y);
      }
      ctx.stroke();
    },
    [penColor]
  );

  const getPointFromEvent = useCallback((e: React.TouchEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }

    return { x: 0, y: 0 };
  }, []);

  const startDrawing = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (readOnly) return;

      e.preventDefault();
      const point = getPointFromEvent(e);
      setIsDrawing(true);
      setLastPoint(point);
      setCurrentStroke([point]);
      setIsEmpty(false);
    },
    [readOnly, getPointFromEvent]
  );

  const draw = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDrawing || readOnly) return;

      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx || !lastPoint) return;

      const point = getPointFromEvent(e);

      ctx.strokeStyle = penColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      setLastPoint(point);
      setCurrentStroke((prev) => [...prev, point]);
    },
    [isDrawing, readOnly, lastPoint, penColor, getPointFromEvent]
  );

  const stopDrawing = useCallback(() => {
    if (isDrawing && currentStroke.length > 0) {
      setStrokes((prev) => [...prev, currentStroke]);
      setCurrentStroke([]);

      // Notify parent of signature change
      const canvas = canvasRef.current;
      if (canvas && onSignatureChange) {
        onSignatureChange(canvas.toDataURL('image/png'));
      }
    }
    setIsDrawing(false);
    setLastPoint(null);
  }, [isDrawing, currentStroke, onSignatureChange]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    setStrokes([]);
    setCurrentStroke([]);
    setIsEmpty(true);
    onSignatureChange?.(null);
  }, [backgroundColor, canvasSize, onSignatureChange]);

  const undo = useCallback(() => {
    if (strokes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);

    // Clear and redraw
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    newStrokes.forEach((stroke) => {
      drawStroke(ctx, stroke);
    });

    if (newStrokes.length === 0) {
      setIsEmpty(true);
      onSignatureChange?.(null);
    } else {
      onSignatureChange?.(canvas.toDataURL('image/png'));
    }
  }, [strokes, backgroundColor, canvasSize, drawStroke, onSignatureChange]);

  return (
    <div className={`space-y-2 ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <canvas
          ref={canvasRef}
          className={`border rounded-lg touch-none ${
            readOnly ? 'cursor-default' : 'cursor-crosshair'
          } ${isEmpty && required ? 'border-destructive/50' : 'border-border'}`}
          style={{
            backgroundColor,
            width: '100%',
            maxWidth: canvasSize.width,
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          aria-label={label || 'Zone de signature'}
        />

        {isEmpty && !readOnly && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground/50 text-sm">Signez ici</p>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="small"
            onClick={undo}
            disabled={strokes.length === 0}
            className="flex-1"
          >
            <Undo2 className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button
            type="button"
            variant="outline"
            size="small"
            onClick={clear}
            disabled={isEmpty}
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Effacer
          </Button>
        </div>
      )}
    </div>
  );
}

export default SignaturePad;
