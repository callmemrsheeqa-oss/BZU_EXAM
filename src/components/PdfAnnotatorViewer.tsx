import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Highlighter,
  MessageSquare,
  PenTool,
  RotateCcw,
  Save,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import type { PdfAnnotationStroke, StoredPdfAsset } from '../types/domain';
import { base64ToUint8Array, pdfjsLib } from '../lib/pdfUtils';

interface PdfAnnotatorViewerProps {
  asset: StoredPdfAsset;
  annotations: PdfAnnotationStroke[];
  editable: boolean;
  onSaveAnnotations?: (next: PdfAnnotationStroke[]) => Promise<void> | void;
}

type ToolMode = 'pen' | 'highlight' | 'checkmark' | 'comment';

export const PdfAnnotatorViewer: React.FC<PdfAnnotatorViewerProps> = ({
  asset,
  annotations,
  editable,
  onSaveAnnotations,
}) => {
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState<boolean>(true);
  const [tool, setTool] = useState<ToolMode>('pen');
  const [color, setColor] = useState<string>('#DC2626');
  const [localAnnotations, setLocalAnnotations] = useState<PdfAnnotationStroke[]>(annotations);
  const [saving, setSaving] = useState(false);

  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    points: Array<{ x: number; y: number }>;
  }>({ active: false, startX: 0, startY: 0, points: [] });

  useEffect(() => {
    setLocalAnnotations(annotations);
  }, [annotations, asset.id]);

  // Render PDF page via PDF.js
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPage(true);
      setRenderError(null);
      try {
        const bytes = base64ToUint8Array(asset.base64Data);
        const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        setNumPages(doc.numPages);
        const safePage = Math.min(Math.max(1, pageNumber), doc.numPages);
        const page = await doc.getPage(safePage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1.35 });
        const pdfCanvas = pdfCanvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        if (!pdfCanvas || !overlayCanvas) return;

        pdfCanvas.width = viewport.width;
        pdfCanvas.height = viewport.height;
        overlayCanvas.width = viewport.width;
        overlayCanvas.height = viewport.height;

        const ctx = pdfCanvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport, canvas: pdfCanvas }).promise;
      } catch (err) {
        if (!cancelled) {
          setRenderError(
            err instanceof Error ? err.message : 'Unable to render PDF document in browser.'
          );
        }
      } finally {
        if (!cancelled) setLoadingPage(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asset, pageNumber]);

  // Draw overlay annotations onto overlay canvas once PDF page dimensions are ready
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || loadingPage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const pageItems = localAnnotations.filter((a) => a.pageNumber === pageNumber);
    for (const item of pageItems) {
      if (item.kind === 'pen' && item.points && item.points.length > 1) {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(item.points[0].x * w, item.points[0].y * h);
        for (let i = 1; i < item.points.length; i++) {
          ctx.lineTo(item.points[i].x * w, item.points[i].y * h);
        }
        ctx.stroke();
      } else if (item.kind === 'highlight' && item.rect) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
        ctx.fillRect(item.rect.x * w, item.rect.y * h, item.rect.w * w, item.rect.h * h);
      } else if (item.kind === 'checkmark' && item.rect) {
        const cx = Math.min(w - 24, Math.max(16, item.rect.x * w));
        const cy = Math.min(h - 16, Math.max(16, item.rect.y * h));
        ctx.strokeStyle = item.color || '#16A34A';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy);
        ctx.lineTo(cx - 2, cy + 8);
        ctx.lineTo(cx + 12, cy - 8);
        ctx.stroke();
        if (item.text) {
          ctx.font = '600 12px "DM Sans", sans-serif';
          ctx.fillStyle = item.color || '#16A34A';
          const tw = ctx.measureText(item.text).width;
          const labelX = cx + 16 + tw > w - 12 ? Math.max(12, cx - tw - 16) : cx + 16;
          ctx.fillText(item.text, labelX, cy + 4);
        }
      } else if (item.kind === 'comment' && item.rect) {
        const label = item.text || 'Note';
        ctx.font = '500 12px "DM Sans", sans-serif';
        const boxW = Math.min(w - 24, ctx.measureText(label).width + 18);
        const cx = Math.min(w - boxW - 12, Math.max(12, item.rect.x * w));
        const cy = Math.min(h - 12, Math.max(24, item.rect.y * h));
        ctx.fillStyle = 'rgba(254, 243, 199, 0.95)';
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1.2;
        ctx.fillRect(cx, cy - 16, boxW, 24);
        ctx.strokeRect(cx, cy - 16, boxW, 24);
        ctx.fillStyle = '#92400E';
        ctx.fillText(label, cx + 9, cy);
      }
    }
  }, [localAnnotations, pageNumber, loadingPage]);

  const getNormCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editable) return;
    const pos = getNormCoords(e);

    if (tool === 'checkmark') {
      const stroke: PdfAnnotationStroke = {
        id: `ann-${Date.now()}`,
        pageNumber,
        kind: 'checkmark',
        color: '#16A34A',
        rect: { x: pos.x, y: pos.y, w: 0.05, h: 0.05 },
        createdAt: new Date().toISOString(),
      };
      setLocalAnnotations((prev) => [...prev, stroke]);
      return;
    }

    if (tool === 'comment') {
      const note = window.prompt('Enter overlay comment for this spot on the paper:');
      if (!note || !note.trim()) return;
      const stroke: PdfAnnotationStroke = {
        id: `ann-${Date.now()}`,
        pageNumber,
        kind: 'comment',
        color: '#D97706',
        rect: { x: pos.x, y: pos.y, w: 0.28, h: 0.05 },
        text: note.trim(),
        createdAt: new Date().toISOString(),
      };
      setLocalAnnotations((prev) => [...prev, stroke]);
      return;
    }

    drawingRef.current = {
      active: true,
      startX: pos.x,
      startY: pos.y,
      points: [pos],
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editable || !drawingRef.current.active) return;
    const pos = getNormCoords(e);
    drawingRef.current.points.push(pos);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editable || !drawingRef.current.active) return;
    const endPos = getNormCoords(e);
    const { startX, startY, points } = drawingRef.current;
    drawingRef.current.active = false;

    if (tool === 'pen' && points.length >= 2) {
      const stroke: PdfAnnotationStroke = {
        id: `ann-${Date.now()}`,
        pageNumber,
        kind: 'pen',
        color,
        points,
        createdAt: new Date().toISOString(),
      };
      setLocalAnnotations((prev) => [...prev, stroke]);
    } else if (tool === 'highlight') {
      const x = Math.min(startX, endPos.x);
      const y = Math.min(startY, endPos.y);
      const w = Math.max(0.06, Math.abs(endPos.x - startX));
      const h = Math.max(0.025, Math.abs(endPos.y - startY));
      const stroke: PdfAnnotationStroke = {
        id: `ann-${Date.now()}`,
        pageNumber,
        kind: 'highlight',
        color: '#F59E0B',
        rect: { x, y, w, h },
        createdAt: new Date().toISOString(),
      };
      setLocalAnnotations((prev) => [...prev, stroke]);
    }
  };

  const handleDownloadPdf = () => {
    const bytes = base64ToUint8Array(asset.base64Data);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = asset.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!onSaveAnnotations) return;
    setSaving(true);
    try {
      await onSaveAnnotations(localAnnotations);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50 dark:bg-slate-900/80">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {asset.fileName}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Rendered on-site via PDF.js · Overlay annotations (original PDF bytes preserved)
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs tabular-nums">
            <button
              type="button"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              aria-label="Previous PDF page"
              className="p-1 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-1.5 font-mono text-slate-700 dark:text-slate-200">
              Page {pageNumber} / {numPages}
            </span>
            <button
              type="button"
              disabled={pageNumber >= numPages}
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              aria-label="Next PDF page"
              className="p-1 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </button>
        </div>
      </div>

      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 bg-white dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTool('pen')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                tool === 'pen'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <PenTool className="h-3.5 w-3.5" />
              Digital Pen
            </button>
            <button
              type="button"
              onClick={() => setTool('highlight')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                tool === 'highlight'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Highlighter className="h-3.5 w-3.5" />
              Highlight
            </button>
            <button
              type="button"
              onClick={() => setTool('checkmark')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                tool === 'checkmark'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              Checkmark
            </button>
            <button
              type="button"
              onClick={() => setTool('comment')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                tool === 'comment'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Comment
            </button>

            {tool === 'pen' && (
              <div className="ml-2 flex items-center gap-1.5">
                {['#DC2626', '#16A34A', '#2563EB'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Pen color ${c}`}
                    onClick={() => setColor(c)}
                    className={`h-5 w-5 rounded-full border-2 ${
                      color === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={localAnnotations.length === 0}
              onClick={() => setLocalAnnotations((prev) => prev.slice(0, -1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Undo
            </button>
            {onSaveAnnotations && (
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Save Annotations'}
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className="relative overflow-auto bg-slate-100 dark:bg-slate-950 p-4 flex flex-col items-center"
        aria-busy={loadingPage}
      >
        {loadingPage && !renderError && (
          <div className="mb-3 text-xs font-medium text-slate-600 dark:text-slate-300">
            Rendering PDF page via PDF.js...
          </div>
        )}
        {renderError ? (
          <div className="rounded-lg border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">
            {renderError}
          </div>
        ) : (
          <div className="relative inline-block shadow-sm border border-slate-300 dark:border-slate-700 bg-white">
            <canvas ref={pdfCanvasRef} className="block max-w-full h-auto" />
            <canvas
              ref={overlayCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className={`absolute inset-0 h-full w-full ${
                editable ? 'cursor-crosshair touch-none' : 'pointer-events-none'
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
};
