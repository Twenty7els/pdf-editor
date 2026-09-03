"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePdfEditorStore } from "@/store/pdf-editor-store";
import { RotateCw, Trash2, RotateCcw, ListChecks, X, Check } from "lucide-react";
import { toast } from "sonner";

interface PageThumbnailsProps {
  pdfDoc: unknown | null;
}

interface ThumbState {
  loaded: boolean;
  error: boolean;
}

const THUMB_WIDTH = 96; // px (canvas target width for thumbnail)

export default function PageThumbnails({ pdfDoc }: PageThumbnailsProps) {
  const {
    totalPages,
    currentPage,
    pageRotations,
    deletedPages,
    setCurrentPage,
    rotatePage,
    deletePage,
    undeletePage,
    setPagesDeleted,
    undo,
  } = usePdfEditorStore();

  const [pdfjsReady, setPdfjsReady] = useState(false);
  const pdfjsRef = useRef<unknown>(null);
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const renderTasksRef = useRef<
    Record<number, import("pdfjs-dist").RenderTask | undefined>
  >({});
  const [thumbState, setThumbState] = useState<Record<number, ThumbState>>({});

  // Bulk selection mode — pick many pages, delete them in one undoable step
  const [selMode, setSelMode] = useState(false);
  const [selSet, setSelSet] = useState<Set<number>>(new Set());

  // Load pdfjs-dist dynamically
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.mjs";
        pdfjsRef.current = pdfjs;
        setPdfjsReady(true);
      } catch (err) {
        console.error("Failed to load pdfjs for thumbnails:", err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Render each page's thumbnail
  useEffect(() => {
    if (!pdfDoc || !pdfjsReady) return;
    let cancelled = false;
    const pdf = pdfDoc as import("pdfjs-dist").PDFDocumentProxy;

    const renderThumb = async (pageNum: number) => {
      try {
        const page = await pdf.getPage(pageNum);
        // Total rotation = intrinsic page rotation + user rotation
        const rotation =
          ((((page.rotate || 0) + (pageRotations[pageNum] || 0)) % 360) + 360) %
          360;
        const baseVp = page.getViewport({ scale: 1 });
        const baseW = baseVp.width;
        const scale = THUMB_WIDTH / baseW;
        const viewport = page.getViewport({ scale, rotation });
        const canvas = canvasRefs.current[pageNum];
        if (!canvas || cancelled) return;
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
        if (cancelled) return;
        const outputScale = Math.max(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const transform = [outputScale, 0, 0, outputScale, 0, 0];
        const task = page.render({
          canvas,
          canvasContext: ctx,
          viewport,
          transform,
        });
        renderTasksRef.current[pageNum] = task;
        await task.promise;
        if (!cancelled) {
          setThumbState((prev) => ({
            ...prev,
            [pageNum]: { loaded: true, error: false },
          }));
        }
      } catch (err) {
        // Ignore intentional cancellations
        if (
          err &&
          typeof err === "object" &&
          (err as { name?: string }).name === "RenderingCancelledException"
        ) {
          return;
        }
        console.error(`Error rendering thumbnail for page ${pageNum}:`, err);
        if (!cancelled) {
          setThumbState((prev) => ({
            ...prev,
            [pageNum]: { loaded: false, error: true },
          }));
        }
      }
    };

    // Render all thumbnails (re-render when rotations change)
    for (let p = 1; p <= totalPages; p++) {
      void renderThumb(p);
    }

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pdfjsReady, totalPages, pageRotations]);

  // Leave selection mode when the document changes underneath us
  useEffect(() => {
    setSelMode(false);
    setSelSet(new Set());
  }, [totalPages]);

  if (!pdfDoc) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const exitSelMode = () => {
    setSelMode(false);
    setSelSet(new Set());
  };

  const selectAllPages = () => {
    setSelSet(new Set(pages.filter((p) => !deletedPages.includes(p))));
  };

  const toggleSel = (pageNum: number) => {
    setSelSet((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        next.delete(pageNum);
      } else {
        next.add(pageNum);
      }
      return next;
    });
  };

  const bulkDelete = () => {
    if (selSet.size === 0) return;
    const count = selSet.size;
    setPagesDeleted([...selSet], true);
    exitSelMode();
    toast.success(`Страниц удалено: ${count}`, {
      description: "Восстановить можно кликом по миниатюре",
      action: {
        label: "Отменить",
        onClick: () => undo(),
      },
    });
  };

  return (
    <div className="hidden md:flex w-[148px] shrink-0 border-r border-border/70 bg-card/40 overflow-y-auto py-3 px-2 flex-col gap-2.5">
      {/* Panel header */}
      {selMode ? (
        <div className="sticky top-0 z-10 -mx-2 px-2.5 pt-1 pb-2.5 mb-0.5 bg-card/95 backdrop-blur-sm border-b border-border/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground tabular-nums">
              Выбрано {selSet.size}
            </span>
            <button
              onClick={exitSelMode}
              className="h-6 w-6 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              title="Выйти из режима выбора"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1 mb-1.5">
            <button
              onClick={selectAllPages}
              className="flex-1 h-7 rounded-lg border border-border bg-card text-[11px] font-medium text-foreground hover:bg-secondary/60 transition-colors"
              title="Выбрать все неудалённые страницы"
            >
              Все
            </button>
            <button
              onClick={() => setSelSet(new Set())}
              className="flex-1 h-7 rounded-lg border border-border bg-card text-[11px] font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
            >
              Снять
            </button>
          </div>
          <button
            onClick={bulkDelete}
            disabled={selSet.size === 0}
            className="w-full h-8 rounded-lg bg-destructive text-white text-[11px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-destructive/90 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Удалить{selSet.size > 0 ? ` (${selSet.size})` : ""}
          </button>
        </div>
      ) : (
        <div className="sticky top-0 z-10 -mx-2 px-3 pt-1 pb-2 mb-0.5 bg-card/95 backdrop-blur-sm border-b border-border/60">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Страницы
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-secondary tabular-nums">
                {totalPages}
              </span>
              <button
                onClick={() => setSelMode(true)}
                className="h-6 w-6 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                title="Выбрать несколько страниц для удаления"
              >
                <ListChecks className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {pages.map((pageNum) => {
        const isCurrent = pageNum === currentPage;
        const isDeleted = deletedPages.includes(pageNum);
        const isChecked = selSet.has(pageNum);
        const rotation = pageRotations[pageNum] || 0;
        const st = thumbState[pageNum];

        const cardClass = selMode
          ? isChecked
            ? "border-2 border-primary bg-terracotta-soft/30 shadow-soft"
            : "border border-border bg-card hover:border-primary/40"
          : isCurrent
          ? "border-2 border-primary bg-card shadow-soft"
          : isDeleted
          ? "border border-border/50 bg-card opacity-50 hover:opacity-90"
          : "border border-border bg-card hover:border-primary/40";

        return (
          <div
            key={pageNum}
            className={`group relative rounded-xl p-1.5 transition-all cursor-pointer ${cardClass}`}
            onClick={() => {
              if (selMode) {
                if (!isDeleted) toggleSel(pageNum);
              } else if (isDeleted) {
                undeletePage(pageNum);
              } else {
                setCurrentPage(pageNum);
              }
            }}
            title={
              selMode
                ? isChecked
                  ? `Снять выбор со стр. ${pageNum}`
                  : `Выбрать стр. ${pageNum}`
                : isDeleted
                ? `Стр. ${pageNum} удалена — клик чтобы восстановить`
                : `Стр. ${pageNum}`
            }
          >
            {/* Page number / selection checkbox */}
            <div className="flex items-center justify-between mb-1 px-0.5">
              {selMode ? (
                <span
                  className={`inline-flex items-center justify-center h-5 w-5 rounded-md border-2 transition-all ${
                    isChecked
                      ? "bg-primary border-primary"
                      : "bg-card border-border"
                  }`}
                >
                  {isChecked && (
                    <Check
                      className="h-3 w-3 text-white"
                      strokeWidth={3}
                    />
                  )}
                </span>
              ) : (
                <span
                  className={`inline-flex items-center justify-center min-w-5 px-1.5 py-0.5 rounded-full text-[10px] font-medium tabular-nums leading-none ${
                    isCurrent
                      ? "bg-primary text-white"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {pageNum}
                </span>
              )}
              {rotation !== 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                  <RotateCw className="h-2.5 w-2.5" />
                  {rotation}°
                </span>
              )}
            </div>

            {/* Thumbnail canvas */}
            <div
              className="relative bg-white rounded-lg overflow-hidden flex items-center justify-center"
              style={{ minHeight: 80, minWidth: THUMB_WIDTH }}
            >
              <canvas
                ref={(el) => {
                  canvasRefs.current[pageNum] = el;
                }}
                className="block"
                style={{
                  maxWidth: "100%",
                  maxHeight: 140,
                }}
              />
              {!st?.loaded && !st?.error && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
              {st?.error && (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                  Ошибка
                </div>
              )}

              {/* Deleted overlay */}
              {isDeleted && (
                <div className="absolute inset-0 bg-destructive/20 backdrop-blur-[1px] flex items-center justify-center">
                  <div className="text-[10px] font-medium text-destructive px-1.5 py-0.5 rounded-lg bg-background/80">
                    удалена
                  </div>
                </div>
              )}

              {/* Strikethrough for deleted */}
              {isDeleted && (
                <div className="absolute inset-x-0 top-1/2 h-px bg-destructive rotate-[-12deg]" />
              )}
            </div>

            {/* Hover actions — hidden in selection mode */}
            {!selMode && (
              <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isDeleted && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        rotatePage(pageNum);
                      }}
                      className="h-5 w-5 rounded-lg bg-background/90 border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                      title="Повернуть страницу"
                    >
                      <RotateCw className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(pageNum);
                      }}
                      className="h-5 w-5 rounded-lg bg-background/90 border border-border/60 flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                      title="Удалить страницу"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </>
                )}
                {isDeleted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      undeletePage(pageNum);
                    }}
                    className="h-5 w-5 rounded-lg bg-background/90 border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                    title="Восстановить страницу"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
