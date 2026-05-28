"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { usePdfEditorStore, StampItem, TextItem } from "@/store/pdf-editor-store";

export default function PdfCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<unknown | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const pdfjsRef = useRef<unknown>(null);
  const renderingRef = useRef(false);

  const {
    pdfFile,
    currentPage,
    setTotalPages,
    setPdfArrayBuffer,
    setPageScale,
    activeTool,
    selectedStampType,
    selectedStampSrc,
    stamps,
    texts,
    selectedItemId,
    selectedItemType,
    addStamp,
    addText,
    updateStamp,
    updateText,
    setSelectedItem,
    textSettings,
  } = usePdfEditorStore();

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragItem, setDragItem] = useState<{
    id: string;
    type: "stamp" | "text";
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Text editing
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editTextValue, setEditTextValue] = useState("");

  // Load pdfjs-dist dynamically on mount
  useEffect(() => {
    let cancelled = false;

    const loadPdfjs = async () => {
      try {
        const pdfjs = await import("pdfjs-dist");

        if (cancelled) return;

        // Set up worker - use local copy for reliability
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.mjs";

        pdfjsRef.current = pdfjs;
        setPdfjsReady(true);
        console.log("PDF.js loaded successfully, version:", pdfjs.version);
      } catch (err) {
        console.error("Failed to load pdfjs-dist:", err);
        setError("Ошибка загрузки PDF.js библиотеки");
      }
    };

    loadPdfjs();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load PDF when file changes
  useEffect(() => {
    if (!pdfFile || !pdfjsRef.current) return;

    const loadPdf = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        setPdfArrayBuffer(arrayBuffer.slice(0));

        const pdfjs = pdfjsRef.current as typeof import("pdfjs-dist");
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(arrayBuffer),
          useSystemFonts: true,
        });

        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        console.log("PDF loaded:", pdf.numPages, "pages");
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError("Ошибка загрузки PDF файла. Убедитесь что файл не повреждён.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [pdfFile, pdfjsReady, setTotalPages, setPdfArrayBuffer]);

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || renderingRef.current) return;

    renderingRef.current = true;

    try {
      const pdf = pdfDoc as import("pdfjs-dist").PDFDocumentProxy;
      const page = await pdf.getPage(currentPage);

      const container = containerRef.current;
      if (!container) {
        renderingRef.current = false;
        return;
      }

      const containerWidth = container.clientWidth - 40;
      const viewport = page.getViewport({ scale: 1 });
      const autoScale = containerWidth / viewport.width;
      const scale = Math.min(autoScale, 2.0);

      setPageScale(scale);

      const scaledViewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) {
        renderingRef.current = false;
        return;
      }

      // Set canvas dimensions
      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(scaledViewport.width * outputScale);
      canvas.height = Math.floor(scaledViewport.height * outputScale);
      canvas.style.width = Math.floor(scaledViewport.width) + "px";
      canvas.style.height = Math.floor(scaledViewport.height) + "px";

      const transform = outputScale !== 1
        ? [outputScale, 0, 0, outputScale, 0, 0]
        : undefined;

      setCanvasSize({
        width: Math.floor(scaledViewport.width),
        height: Math.floor(scaledViewport.height),
      });

      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
        transform,
      }).promise;

      console.log("Page rendered successfully, page", currentPage);
    } catch (err) {
      console.error("Error rendering page:", err);
      setError("Ошибка рендеринга страницы");
    } finally {
      renderingRef.current = false;
    }
  }, [pdfDoc, currentPage, setPageScale]);

  // Re-render when page changes or pdfDoc changes
  useEffect(() => {
    if (pdfDoc) {
      renderPage();
    }
  }, [renderPage, pdfDoc, currentPage]);

  // Handle window resize
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (pdfDoc) renderPage();
      }, 200);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeout);
    };
  }, [pdfDoc, renderPage]);

  // Handle click on canvas overlay
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (!overlayRef.current) return;

      const rect = overlayRef.current.getBoundingClientRect();

      if (activeTool === "stamp" && selectedStampType && selectedStampSrc) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const size = 120;

        const newStamp: StampItem = {
          id: `stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: selectedStampType,
          src: selectedStampSrc,
          x: x - size / 2,
          y: y - size / 2,
          width: size,
          height: size,
          page: currentPage,
          rotation: 0,
          opacity: 0.8,
        };

        addStamp(newStamp);
      } else if (activeTool === "text") {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newText: TextItem = {
          id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: "Текст",
          x,
          y,
          fontSize: textSettings.fontSize,
          color: textSettings.color,
          page: currentPage,
          fontFamily: textSettings.fontFamily,
          bold: textSettings.bold,
          rotation: 0,
        };

        addText(newText);
        setEditingTextId(newText.id);
        setEditTextValue("Текст");
        setSelectedItem(newText.id, "text");
      } else if (activeTool === "select") {
        const target = e.target as HTMLElement;
        if (target === overlayRef.current) {
          setSelectedItem(null, null);
          setEditingTextId(null);
        }
      }
    },
    [activeTool, selectedStampType, selectedStampSrc, currentPage, textSettings, addStamp, addText, setSelectedItem]
  );

  // Handle drag start on items
  const handleItemMouseDown = useCallback(
    (e: React.MouseEvent, id: string, type: "stamp" | "text") => {
      e.stopPropagation();
      setSelectedItem(id, type);
      setIsDragging(true);
      setDragItem({
        id,
        type,
        offsetX: e.nativeEvent.offsetX,
        offsetY: e.nativeEvent.offsetY,
      });
    },
    [setSelectedItem]
  );

  // Handle mouse move for dragging
  useEffect(() => {
    if (!isDragging || !dragItem || !overlayRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = overlayRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left - dragItem.offsetX;
      const y = e.clientY - rect.top - dragItem.offsetY;

      if (dragItem.type === "stamp") {
        updateStamp(dragItem.id, { x, y });
      } else {
        updateText(dragItem.id, { x, y });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragItem(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragItem, updateStamp, updateText]);

  // Handle text editing
  const handleTextDoubleClick = useCallback(
    (e: React.MouseEvent, textItem: TextItem) => {
      e.stopPropagation();
      setEditingTextId(textItem.id);
      setEditTextValue(textItem.text);
    },
    []
  );

  const handleTextEditComplete = useCallback(() => {
    if (editingTextId && editTextValue.trim()) {
      updateText(editingTextId, { text: editTextValue.trim() });
    }
    setEditingTextId(null);
    setEditTextValue("");
  }, [editingTextId, editTextValue, updateText]);

  const handleTextKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleTextEditComplete();
      } else if (e.key === "Escape") {
        setEditingTextId(null);
        setEditTextValue("");
      }
    },
    [handleTextEditComplete]
  );

  // Handle keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingTextId) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId) {
        if (e.key === "Backspace" && !(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
        }
        if (selectedItemType === "stamp") {
          usePdfEditorStore.getState().removeStamp(selectedItemId);
        } else if (selectedItemType === "text") {
          usePdfEditorStore.getState().removeText(selectedItemId);
        }
        setSelectedItem(null, null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemId, selectedItemType, editingTextId, setSelectedItem]);

  // Filter items for current page
  const pageStamps = stamps.filter((s) => s.page === currentPage);
  const pageTexts = texts.filter((t) => t.page === currentPage);

  const cursorClass =
    activeTool === "stamp" || activeTool === "text"
      ? "cursor-crosshair"
      : "cursor-default";

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center p-5 overflow-auto bg-muted/30"
    >
      {/* Error state */}
      {error && (
        <div className="text-center p-8">
          <div className="text-destructive text-lg mb-2">⚠️ {error}</div>
          <p className="text-muted-foreground text-sm">Попробуйте загрузить другой файл</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !error && (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
          <span className="text-sm text-muted-foreground">Загрузка PDF...</span>
        </div>
      )}

      {/* PDF Canvas */}
      {pdfDoc && !error && !isLoading && (
        <div className="relative shadow-2xl border border-border rounded-lg overflow-hidden">
          <canvas ref={canvasRef} className="block" />

          {/* Overlay for interactive items */}
          <div
            ref={overlayRef}
            className={`absolute top-0 left-0 ${cursorClass}`}
            onClick={handleOverlayClick}
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            {/* Stamps */}
            {pageStamps.map((stamp) => (
              <div
                key={stamp.id}
                className={`absolute group ${
                  selectedItemId === stamp.id
                    ? "ring-2 ring-primary ring-offset-1"
                    : "hover:ring-1 hover:ring-primary/50"
                }`}
                style={{
                  left: stamp.x,
                  top: stamp.y,
                  width: stamp.width,
                  height: stamp.height,
                  transform: `rotate(${stamp.rotation}deg)`,
                  opacity: stamp.opacity,
                  cursor: isDragging ? "grabbing" : "grab",
                }}
                onMouseDown={(e) => handleItemMouseDown(e, stamp.id, "stamp")}
              >
                <img
                  src={stamp.src}
                  alt={stamp.type}
                  className="w-full h-full object-contain pointer-events-none select-none"
                  draggable={false}
                />
                {selectedItemId === stamp.id && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full cursor-se-resize" />
                )}
              </div>
            ))}

            {/* Texts */}
            {pageTexts.map((textItem) => (
              <div
                key={textItem.id}
                className={`absolute ${
                  selectedItemId === textItem.id
                    ? "ring-2 ring-primary ring-offset-1"
                    : "hover:ring-1 hover:ring-primary/50"
                }`}
                style={{
                  left: textItem.x,
                  top: textItem.y,
                  fontSize: textItem.fontSize,
                  color: textItem.color,
                  fontFamily: textItem.fontFamily,
                  fontWeight: textItem.bold ? "bold" : "normal",
                  transform: `rotate(${textItem.rotation}deg)`,
                  cursor: isDragging ? "grabbing" : "grab",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
                onMouseDown={(e) => handleItemMouseDown(e, textItem.id, "text")}
                onDoubleClick={(e) => handleTextDoubleClick(e, textItem)}
              >
                {editingTextId === textItem.id ? (
                  <input
                    type="text"
                    value={editTextValue}
                    onChange={(e) => setEditTextValue(e.target.value)}
                    onBlur={handleTextEditComplete}
                    onKeyDown={handleTextKeyDown}
                    className="bg-white/90 border border-primary px-1 outline-none"
                    style={{
                      fontSize: textItem.fontSize,
                      color: textItem.color,
                      fontFamily: textItem.fontFamily,
                      fontWeight: textItem.bold ? "bold" : "normal",
                      minWidth: 50,
                    }}
                    autoFocus
                  />
                ) : (
                  <span className="bg-white/20 px-0.5">{textItem.text}</span>
                )}
              </div>
            ))}
          </div>

          {/* Rendering overlay */}
          {renderingRef.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/30">
              <div className="animate-spin h-6 w-6 border-3 border-primary border-t-transparent rounded-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
