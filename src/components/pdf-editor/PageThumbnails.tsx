"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePdfEditorStore } from "@/store/pdf-editor-store";
import { RotateCw, Trash2, RotateCcw } from "lucide-react";

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
  } = usePdfEditorStore();

  const [pdfjsReady, setPdfjsReady] = useState(false);
  const pdfjsRef = useRef<unknown>(null);
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const renderTasksRef = useRef<
    Record<number, import("pdfjs-dist").RenderTask | undefined>
  >({});
  const [thumbState, setThumbState] = useState<Record<number, ThumbState>>({});

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

  if (!pdfDoc) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="hidden md:flex w-[124px] shrink-0 border-r border-border/70 bg-card/30 overflow-y-auto py-3 px-2 flex-col gap-2.5">
      <div className="flex items-center justify-between gap-1 px-1 mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Страницы
        </span>
        <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-secondary tabular-nums">
          {totalPages}
        </span>
      </div>

      {pages.map((pageNum) => {
        const isCurrent = pageNum === currentPage;
        const isDeleted = deletedPages.includes(pageNum);
        const rotation = pageRotations[pageNum] || 0;
        const st = thumbState[pageNum];

        return (
          <div
            key={pageNum}
            className={`group relative rounded-xl p-1.5 transition-all cursor-pointer ${
              isCurrent
                ? "border-2 border-primary bg-card shadow-soft"
                : isDeleted
                ? "border border-border/50 bg-card opacity-50 hover:opacity-90"
                : "border border-border bg-card hover:border-primary/40"
            }`}
            onClick={() => {
              if (isDeleted) {
                undeletePage(pageNum);
              } else {
                setCurrentPage(pageNum);
              }
            }}
            title={
              isDeleted
                ? `Стр. ${pageNum} удалена — клик чтобы восстановить`
                : `Стр. ${pageNum}`
            }
          >
            {/* Page number */}
            <div className="flex items-center justify-between mb-1 px-0.5">
              <span
                className={`inline-flex items-center justify-center min-w-5 px-1.5 py-0.5 rounded-full text-[10px] font-medium tabular-nums leading-none ${
                  isCurrent
                    ? "bg-primary text-white"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {pageNum}
              </span>
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

            {/* Hover actions */}
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
          </div>
        );
      })}
    </div>
  );
}
