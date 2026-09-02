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
  const pdfDocRef = useRef<unknown>(null);
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
        const pdf = await pdfjs.getDocument({
          data: new Uint8Array(pdfArrayBuffer.slice(0)),
          useSystemFonts: true,
        }).promise;
        if (cancelled) {
          pdf.destroy();
          return;
        }
        pdfDocRef.current = pdf;
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
      const pdf = pdfDocRef.current as { destroy?: () => void } | null;
      if (pdf && typeof pdf.destroy === "function") {
        try {
          pdf.destroy();
        } catch {
          // ignore
        }
      }
      pdfDocRef.current = null;
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
      const rotation = pageRotations[pageNum] || 0;
      const baseVp = page.getViewport({ scale: 1 });
      const targetW = 80;
      const scale = targetW / baseVp.width;
      const viewport = page.getViewport({ scale, rotation });
      const canvas = canvasRefs.current[pageNum];
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const outputScale = Math.max(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      const transform = [outputScale, 0, 0, outputScale, 0, 0];
      await page.render({
        canvasContext: ctx,
        viewport,
        transform,
      }).promise;
      setThumbLoaded((prev) => ({ ...prev, [pageNum]: true }));
    } catch (err) {
      console.error(`Error rendering export thumbnail ${pageNum}:`, err);
    }
  };

  // Re-render thumbnails if rotation changes
  useEffect(() => {
    if (!open || !pdfjsReady) return;
    const pdf = pdfDocRef.current as import("pdfjs-dist").PDFDocumentProxy | null;
    if (!pdf) return;
    for (let p = 1; p <= totalPages; p++) {
      void renderThumb(pdf, p);
    }
  }, [pageRotations, open, pdfjsReady]);

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
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-bg-tri flex items-center justify-center shrink-0 shadow-soft">
              <Download className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span>Экспорт PDF</span>
          </DialogTitle>
          <DialogDescription>
            Выберите страницы для экспорта. Удалённые страницы всегда исключаются.
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
                  ? "border-primary bg-primary/10 shadow-soft"
                  : "border-border/60 hover:border-primary/40 hover:bg-accent/30")
              }
            >
              <RadioGroupItem value="all" checked={mode === "all"} className="mt-0.5" />
              <div>
                <div className="text-sm font-semibold">Все страницы</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Экспортировать весь документ (кроме удалённых)
                </div>
              </div>
            </label>
            <label
              onClick={() => setMode("selected")}
              className={
                "flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all " +
                (mode === "selected"
                  ? "border-primary bg-primary/10 shadow-soft"
                  : "border-border/60 hover:border-primary/40 hover:bg-accent/30")
              }
            >
              <RadioGroupItem value="selected" checked={mode === "selected"} className="mt-0.5" />
              <div>
                <div className="text-sm font-semibold">Выбранные страницы</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Отметьте конкретные страницы для экспорта
                </div>
              </div>
            </label>
          </RadioGroup>

          {/* Page grid */}
          {mode === "selected" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Страницы
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelected(pages.filter((p) => !deletedPages.includes(p)))}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Выбрать все
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button
                    onClick={() => setSelected([])}
                    className="text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Очистить
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {pages.map((pageNum) => {
                  const isDeleted = deletedPages.includes(pageNum);
                  const isSelected = selected.includes(pageNum);
                  const rotation = pageRotations[pageNum] || 0;
                  return (
                    <button
                      key={pageNum}
                      disabled={isDeleted}
                      onClick={() => toggleSelected(pageNum)}
                      className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                        isDeleted
                          ? "border-border/30 opacity-40 cursor-not-allowed"
                          : isSelected
                          ? "border-primary bg-primary/10 shadow-soft"
                          : "border-border/60 hover:border-primary/40 hover:bg-accent/30"
                      }`}
                    >
                      <div className="relative w-full aspect-[3/4] bg-white rounded-md overflow-hidden flex items-center justify-center">
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
                            <span className="text-[8px] font-bold text-destructive-foreground px-1 py-0.5 rounded bg-background/80">
                              удалена
                            </span>
                          </div>
                        )}
                        {/* Selection checkmark */}
                        {!isDeleted && isSelected && (
                          <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center shadow-soft">
                            <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[10px] font-bold tabular-nums">
                          {pageNum}
                        </span>
                        {rotation !== 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[8px] text-amber-600 font-semibold">
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

        <DialogFooter className="border-t border-border/40 pt-4 mt-2">
          <div className="flex items-center justify-between w-full gap-2">
            <div className="text-xs text-muted-foreground">
              К экспорту:{" "}
              <span className="font-bold text-foreground tabular-nums">
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
                className="gap-1.5 shadow-soft btn-glow shimmer rounded-xl font-semibold"
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
