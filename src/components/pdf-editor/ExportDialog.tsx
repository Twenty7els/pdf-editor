"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePdfEditorStore } from "@/store/pdf-editor-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download, FileText, Check, RotateCw } from "lucide-react";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: () => void;
}

export default function ExportDialog({
  open,
  onOpenChange,
  onExport,
}: ExportDialogProps) {
  const {
    totalPages,
    deletedPages,
    pageRotations,
    pageSkew,
    exportPageSelection,
    setExportPageSelection,
  } = usePdfEditorStore();

  // "all" or "selected"
  const [mode, setMode] = useState<"all" | "selected">(
    exportPageSelection === null ? "all" : "selected"
  );
  // Local selection state (page numbers)
  const [selected, setSelected] = useState<number[]>(
    exportPageSelection ?? []
  );

  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const pdfDocRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<import("pdfjs-dist").PDFDocumentLoadingTask | null>(null);
  const renderTasksRef = useRef<
    Record<number, import("pdfjs-dist").RenderTask | undefined>
  >({});
  const lastRotationsKeyRef = useRef<string>("");
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState<Record<number, boolean>>({});

  // Load pdf.js + PDF document from store
  const pdfArrayBuffer = usePdfEditorStore((s) => s.pdfArrayBuffer);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      try {
        if (!pdfArrayBuffer) return;
        const pdfjs = await import("pdfjs-dist");
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.mjs";
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(pdfArrayBuffer.slice(0)),
          useSystemFonts: true,
        });
        const pdf = await loadingTask.promise;
        if (cancelled) {
          void loadingTask.destroy();
          return;
        }
        pdfDocRef.current = pdf;
        loadingTaskRef.current = loadingTask;
        setPdfjsReady(true);
        // Render thumbnails for each page
        for (let p = 1; p <= pdf.numPages; p++) {
          if (cancelled) break;
          void renderThumb(pdf, p);
        }
      } catch (err) {
        console.error("Failed to load PDF for export dialog:", err);
      }
    };
    load();
    return () => {
      cancelled = true;
      const task = loadingTaskRef.current;
      if (task) {
        try {
          void task.destroy();
        } catch {
          // ignore
        }
      }
      loadingTaskRef.current = null;
      pdfDocRef.current = null;
      renderTasksRef.current = {};
      lastRotationsKeyRef.current = "";
      setPdfjsReady(false);
      setThumbLoaded({});
    };
  }, [open, pdfArrayBuffer]);

  const renderThumb = async (
    pdf: import("pdfjs-dist").PDFDocumentProxy,
    pageNum: number
  ) => {
    try {
      const page = await pdf.getPage(pageNum);
      // Total rotation = intrinsic page rotation + user rotation
      const rotation =
        ((((page.rotate || 0) + (pageRotations[pageNum] || 0)) % 360) + 360) %
        360;
      const baseVp = page.getViewport({ scale: 1 });
      const targetW = 80;
      const scale = targetW / baseVp.width;
      const viewport = page.getViewport({ scale, rotation });
      const canvas = canvasRefs.current[pageNum];
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // Cancel any in-flight render on this canvas — pdf.js forbids
      // multiple concurrent render() calls on the same canvas.
      const prevTask = renderTasksRef.current[pageNum];
      if (prevTask) {
        try {
          prevTask.cancel();
        } catch {
          // ignore
        }
        try {
          await prevTask.promise;
        } catch {
          // cancellation rejection — expected
        }
      }
      const outputScale = Math.max(window.devicePixelRatio || 1, 2);
      // Fine skew (deskew) — composite the bitmap rotated when non-zero
      const skew = pageSkew[pageNum] || 0;
      const rad = (skew * Math.PI) / 180;
      const cosA = Math.abs(Math.cos(rad));
      const sinA = Math.abs(Math.sin(rad));
      const bw = viewport.width * cosA + viewport.height * sinA;
      const bh = viewport.width * sinA + viewport.height * cosA;
      canvas.width = Math.floor(bw * outputScale);
      canvas.height = Math.floor(bh * outputScale);
      canvas.style.width = `${Math.floor(bw)}px`;
      canvas.style.height = `${Math.floor(bh)}px`;
      if (!skew) {
        const transform = [outputScale, 0, 0, outputScale, 0, 0];
        const task = page.render({
          canvas,
          canvasContext: ctx,
          viewport,
          transform,
        });
        renderTasksRef.current[pageNum] = task;
        await task.promise;
      } else {
        const off = document.createElement("canvas");
        off.width = Math.floor(viewport.width * outputScale);
        off.height = Math.floor(viewport.height * outputScale);
        const offCtx = off.getContext("2d");
        if (!offCtx) return;
        const task = page.render({
          canvas: off,
          canvasContext: offCtx,
          viewport,
          transform: [outputScale, 0, 0, outputScale, 0, 0],
        });
        renderTasksRef.current[pageNum] = task;
        await task.promise;
        ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, bw, bh);
        ctx.translate(bw / 2, bh / 2);
        ctx.rotate(rad);
        ctx.drawImage(
          off,
          -viewport.width / 2,
          -viewport.height / 2,
          viewport.width,
          viewport.height
        );
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      setThumbLoaded((prev) => ({ ...prev, [pageNum]: true }));
    } catch (err) {
      // Ignore intentional cancellations
      if (
        err &&
        typeof err === "object" &&
        (err as { name?: string }).name === "RenderingCancelledException"
      ) {
        return;
      }
      console.error(`Error rendering export thumbnail ${pageNum}:`, err);
    }
  };

  // Re-render thumbnails when rotations or skew change (the initial render is
  // done by the load effect above — skip to avoid double canvas renders)
  useEffect(() => {
    if (!open || !pdfjsReady) return;
    const key = JSON.stringify(pageRotations) + "|" + JSON.stringify(pageSkew);
    if (lastRotationsKeyRef.current === key) return;
    lastRotationsKeyRef.current = key;
    const pdf = pdfDocRef.current;
    if (!pdf) return;
    for (let p = 1; p <= totalPages; p++) {
      void renderThumb(pdf, p);
    }
  }, [pageRotations, pageSkew, open, pdfjsReady, totalPages]);

  const pages = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages]
  );

  const toggleSelected = (pageNum: number) => {
    setSelected((prev) =>
      prev.includes(pageNum)
        ? prev.filter((p) => p !== pageNum)
        : [...prev, pageNum].sort((a, b) => a - b)
    );
  };

  const handleExport = () => {
    if (mode === "all") {
      setExportPageSelection(null);
    } else {
      setExportPageSelection(selected);
    }
    onOpenChange(false);
    // Defer export to next tick so store is updated
    setTimeout(() => onExport(), 0);
  };

  const activePageCount =
    mode === "all"
      ? totalPages - deletedPages.length
      : selected.filter((p) => !deletedPages.includes(p)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col rounded-2xl shadow-elevated">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg display-title">
            <div className="h-8 w-8 rounded-lg bg-ink flex items-center justify-center shrink-0 shadow-soft">
              <Download
                className="h-4 w-4 text-white"
                strokeWidth={2.2}
                fill="rgba(255,255,255,0.12)"
              />
            </div>
            <span>Экспорт PDF</span>
          </DialogTitle>
          <DialogDescription>
            Выберите страницы для экспорта. Удалённые страницы всегда
            исключаются.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          {/* Mode selection */}
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as "all" | "selected")}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4"
          >
            <label
              onClick={() => setMode("all")}
              className={
                "flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all " +
                (mode === "all"
                  ? "border-primary/50 bg-terracotta-soft/40 shadow-soft"
                  : "border-border bg-card hover:border-primary/30")
              }
            >
              <RadioGroupItem
                value="all"
                checked={mode === "all"}
                className="mt-0.5 data-[state=checked]:border-terracotta"
              />
              <div>
                <div className="text-sm font-medium">Все страницы</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Экспортировать весь документ (кроме удалённых)
                </div>
              </div>
            </label>
            <label
              onClick={() => setMode("selected")}
              className={
                "flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all " +
                (mode === "selected"
                  ? "border-primary/50 bg-terracotta-soft/40 shadow-soft"
                  : "border-border bg-card hover:border-primary/30")
              }
            >
              <RadioGroupItem
                value="selected"
                checked={mode === "selected"}
                className="mt-0.5 data-[state=checked]:border-terracotta"
              />
              <div>
                <div className="text-sm font-medium">Выбранные страницы</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Отметьте конкретные страницы для экспорта
                </div>
              </div>
            </label>
          </RadioGroup>

          {/* Page grid */}
          {mode === "selected" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Страницы
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setSelected(pages.filter((p) => !deletedPages.includes(p)))
                    }
                    className="text-[11px] font-medium text-terracotta-dark hover:underline"
                  >
                    Выбрать все
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button
                    onClick={() => setSelected([])}
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    Очистить
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {pages.map((pageNum) => {
                  const isDeleted = deletedPages.includes(pageNum);
                  const isSelected = selected.includes(pageNum);
                  const rotation =
                    ((((pageRotations[pageNum] || 0) % 360) + 360) % 360);
                  return (
                    <button
                      key={pageNum}
                      disabled={isDeleted}
                      onClick={() => toggleSelected(pageNum)}
                      className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                        isDeleted
                          ? "border-border/50 opacity-40 cursor-not-allowed"
                          : isSelected
                          ? "border-primary/50 bg-terracotta-soft/40 shadow-soft"
                          : "border-border bg-card hover:border-primary/30 hover:shadow-soft"
                      }`}
                    >
                      <div className="relative w-full aspect-[3/4] bg-white rounded-lg overflow-hidden flex items-center justify-center">
                        <canvas
                          ref={(el) => {
                            canvasRefs.current[pageNum] = el;
                          }}
                          className="block max-w-full max-h-full"
                        />
                        {!thumbLoaded[pageNum] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-3 w-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          </div>
                        )}
                        {isDeleted && (
                          <div className="absolute inset-0 bg-destructive/30 flex items-center justify-center">
                            <span className="text-[10px] font-medium text-destructive-foreground px-1 py-0.5 rounded bg-background/80">
                              удалена
                            </span>
                          </div>
                        )}
                        {/* Selection checkmark */}
                        {!isDeleted && isSelected && (
                          <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary border border-primary flex items-center justify-center shadow-soft">
                            <Check
                              className="h-2.5 w-2.5 text-white"
                              strokeWidth={2.2}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[10px] font-medium tabular-nums">
                          {pageNum}
                        </span>
                        {rotation !== 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                            <RotateCw className="h-2 w-2" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/70 pt-4 mt-2">
          <div className="flex items-center justify-between w-full gap-2">
            <div className="text-xs text-muted-foreground">
              К экспорту:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {activePageCount}
              </span>{" "}
              стр.
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Отмена
              </Button>
              <Button
                onClick={handleExport}
                disabled={activePageCount === 0}
                className="gap-1.5 shadow-soft rounded-xl bg-ink hover:bg-ink-hover text-white font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                Экспорт
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
