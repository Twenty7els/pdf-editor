"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { usePdfEditorStore, StampItem, TextItem } from "@/store/pdf-editor-store";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  RotateCw,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";

type DragMode = "move" | "resize" | "rotate" | null;

interface DragState {
  mode: DragMode;
  id: string;
  type: "stamp" | "text";
  // for move
  offsetX: number;
  offsetY: number;
  // for resize — which corner: tl, tr, bl, br
  corner?: string;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  startWidth: number;
  startHeight: number;
  // for rotate
  startRotation: number;
  startAngle: number;
}

const HANDLE_SIZE = 8;
const ROTATE_HANDLE_DISTANCE = 25;

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
  const baseScaleRef = useRef(1.0);
  const clickedOnElementRef = useRef(false);

  const {
    pdfFile,
    currentPage,
    totalPages,
    zoomLevel,
    setTotalPages,
    setPdfArrayBuffer,
    setPageScale,
    zoomIn,
    zoomOut,
    zoomFit,
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
    setCurrentPage,
    textSettings,
  } = usePdfEditorStore();

  // Drag / resize / rotate state
  const [dragState, setDragState] = useState<DragState | null>(null);

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
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.mjs";
        pdfjsRef.current = pdfjs;
        setPdfjsReady(true);
      } catch (err) {
        console.error("Failed to load pdfjs-dist:", err);
        setError("Ошибка загрузки PDF.js библиотеки");
      }
    };
    loadPdfjs();
    return () => { cancelled = true; };
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
        const pdf = await pdfjs.getDocument({
          data: new Uint8Array(arrayBuffer),
          useSystemFonts: true,
        }).promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError("Ошибка загрузки PDF файла");
      } finally {
        setIsLoading(false);
      }
    };
    loadPdf();
  }, [pdfFile, pdfjsReady, setTotalPages, setPdfArrayBuffer]);

  // Render current page with zoom
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || renderingRef.current) return;
    renderingRef.current = true;
    try {
      const pdf = pdfDoc as import("pdfjs-dist").PDFDocumentProxy;
      const page = await pdf.getPage(currentPage);
      const container = containerRef.current;
      if (!container) { renderingRef.current = false; return; }
      const containerWidth = container.clientWidth - 40;
      // Skip render if container hasn't been laid out yet
      if (containerWidth < 100) { renderingRef.current = false; return; }
      const viewport = page.getViewport({ scale: 1 });
      const fitScale = containerWidth / viewport.width;
      baseScaleRef.current = fitScale;
      const scale = fitScale * zoomLevel;
      setPageScale(scale);
      const scaledViewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) { renderingRef.current = false; return; }
      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(scaledViewport.width * outputScale);
      canvas.height = Math.floor(scaledViewport.height * outputScale);
      canvas.style.width = Math.floor(scaledViewport.width) + "px";
      canvas.style.height = Math.floor(scaledViewport.height) + "px";
      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
      setCanvasSize({ width: Math.floor(scaledViewport.width), height: Math.floor(scaledViewport.height) });
      await page.render({ canvasContext: context, viewport: scaledViewport, transform }).promise;
    } catch (err) {
      console.error("Error rendering page:", err);
    } finally {
      renderingRef.current = false;
    }
  }, [pdfDoc, currentPage, zoomLevel, setPageScale]);

  // Initial render + delayed re-render to catch layout changes (sidebar appearing etc)
  useEffect(() => {
    if (!pdfDoc) return;
    renderPage();
    // Re-render after layout settles (sidebar, viewport changes)
    const t1 = setTimeout(() => renderPage(), 100);
    const t2 = setTimeout(() => renderPage(), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [renderPage, pdfDoc]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => { if (pdfDoc) renderPage(); }, 200);
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); clearTimeout(timeout); };
  }, [pdfDoc, renderPage]);

  // Mouse wheel zoom with Ctrl
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) zoomIn(); else zoomOut();
      }
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [zoomIn, zoomOut]);

  // Handle click on canvas overlay
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (!overlayRef.current) return;
      if (e.target !== overlayRef.current) return;
      // Skip if user just clicked on an existing element (stamp/text/handle)
      if (clickedOnElementRef.current) {
        clickedOnElementRef.current = false;
        return;
      }
      const rect = overlayRef.current.getBoundingClientRect();
      const overlayW = overlayRef.current.offsetWidth;
      const overlayH = overlayRef.current.offsetHeight;

      if (activeTool === "stamp" && selectedStampType && selectedStampSrc) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const size = 130;
        addStamp({
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
          canvasWidth: overlayW,
          canvasHeight: overlayH,
        });
      } else if (activeTool === "text") {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const newText: TextItem = {
          id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: "Текст",
          x, y,
          fontSize: textSettings.fontSize,
          color: textSettings.color,
          page: currentPage,
          fontFamily: textSettings.fontFamily,
          bold: textSettings.bold,
          rotation: 0,
          canvasWidth: overlayW,
          canvasHeight: overlayH,
        };
        addText(newText);
        setEditingTextId(newText.id);
        setEditTextValue("Текст");
        setSelectedItem(newText.id, "text");
      } else if (activeTool === "select") {
        setSelectedItem(null, null);
        setEditingTextId(null);
      }
    },
    [activeTool, selectedStampType, selectedStampSrc, currentPage, textSettings, addStamp, addText, setSelectedItem]
  );

  // Unified mouse down handler
  const handleItemMouseDown = useCallback(
    (e: React.MouseEvent, id: string, type: "stamp" | "text") => {
      e.stopPropagation();
      clickedOnElementRef.current = true;
      setSelectedItem(id, type);
      setDragState({
        mode: "move",
        id,
        type,
        offsetX: e.nativeEvent.offsetX,
        offsetY: e.nativeEvent.offsetY,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: 0,
        startTop: 0,
        startWidth: 0,
        startHeight: 0,
        startRotation: 0,
        startAngle: 0,
      });
    },
    [setSelectedItem]
  );

  // Resize handle mouse down
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, id: string, corner: string, item: StampItem | TextItem) => {
      e.stopPropagation();
      e.preventDefault();
      clickedOnElementRef.current = true;
      const stampItem = item as StampItem;
      setDragState({
        mode: "resize",
        id,
        type: "stamp",
        corner,
        offsetX: 0,
        offsetY: 0,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: stampItem.x,
        startTop: stampItem.y,
        startWidth: stampItem.width,
        startHeight: stampItem.height,
        startRotation: stampItem.rotation,
        startAngle: 0,
      });
    },
    []
  );

  // Rotation handle mouse down
  const handleRotateMouseDown = useCallback(
    (e: React.MouseEvent, id: string, item: StampItem) => {
      e.stopPropagation();
      e.preventDefault();
      clickedOnElementRef.current = true;
      // Calculate center of the element
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2;
      const rect = overlayRef.current!.getBoundingClientRect();
      const mouseLocalX = e.clientX - rect.left;
      const mouseLocalY = e.clientY - rect.top;
      const angle = Math.atan2(mouseLocalY - cy, mouseLocalX - cx) * (180 / Math.PI);
      setDragState({
        mode: "rotate",
        id,
        type: "stamp",
        offsetX: 0,
        offsetY: 0,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: item.x,
        startTop: item.y,
        startWidth: item.width,
        startHeight: item.height,
        startRotation: item.rotation,
        startAngle: angle,
      });
    },
    []
  );

  // Unified mouse move / up handler
  useEffect(() => {
    if (!dragState || !overlayRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = overlayRef.current!.getBoundingClientRect();

      if (dragState.mode === "move") {
        const x = e.clientX - rect.left - dragState.offsetX;
        const y = e.clientY - rect.top - dragState.offsetY;
        if (dragState.type === "stamp") updateStamp(dragState.id, { x, y });
        else updateText(dragState.id, { x, y });
      } else if (dragState.mode === "resize" && dragState.type === "stamp") {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;

        let newLeft = dragState.startLeft;
        let newTop = dragState.startTop;
        let newWidth = dragState.startWidth;
        let newHeight = dragState.startHeight;

        const corner = dragState.corner;

        if (corner === "br") {
          newWidth = Math.max(30, dragState.startWidth + dx);
          newHeight = Math.max(30, dragState.startHeight + dy);
        } else if (corner === "bl") {
          newLeft = dragState.startLeft + dx;
          newWidth = Math.max(30, dragState.startWidth - dx);
          newHeight = Math.max(30, dragState.startHeight + dy);
        } else if (corner === "tr") {
          newTop = dragState.startTop + dy;
          newWidth = Math.max(30, dragState.startWidth + dx);
          newHeight = Math.max(30, dragState.startHeight - dy);
        } else if (corner === "tl") {
          newLeft = dragState.startLeft + dx;
          newTop = dragState.startTop + dy;
          newWidth = Math.max(30, dragState.startWidth - dx);
          newHeight = Math.max(30, dragState.startHeight - dy);
        }

        updateStamp(dragState.id, {
          x: newLeft,
          y: newTop,
          width: newWidth,
          height: newHeight,
        });
      } else if (dragState.mode === "rotate" && dragState.type === "stamp") {
        const stamp = usePdfEditorStore.getState().stamps.find(s => s.id === dragState.id);
        if (!stamp) return;
        const cx = stamp.x + stamp.width / 2;
        const cy = stamp.y + stamp.height / 2;
        const mouseLocalX = e.clientX - rect.left;
        const mouseLocalY = e.clientY - rect.top;
        const currentAngle = Math.atan2(mouseLocalY - cy, mouseLocalX - cx) * (180 / Math.PI);
        const deltaAngle = currentAngle - dragState.startAngle;
        let newRotation = dragState.startRotation + deltaAngle;
        // Normalize to -180..180
        while (newRotation > 180) newRotation -= 360;
        while (newRotation < -180) newRotation += 360;
        // Snap to 15-degree increments when Shift is held
        if (e.shiftKey) {
          newRotation = Math.round(newRotation / 15) * 15;
        }
        updateStamp(dragState.id, { rotation: newRotation });
      }
    };

    const handleMouseUp = () => { setDragState(null); };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, updateStamp, updateText]);

  // Text editing
  const handleTextDoubleClick = useCallback((e: React.MouseEvent, t: TextItem) => {
    e.stopPropagation();
    setEditingTextId(t.id);
    setEditTextValue(t.text);
  }, []);

  const handleTextEditComplete = useCallback(() => {
    if (editingTextId && editTextValue.trim()) updateText(editingTextId, { text: editTextValue.trim() });
    setEditingTextId(null);
    setEditTextValue("");
  }, [editingTextId, editTextValue, updateText]);

  const handleTextKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleTextEditComplete();
    else if (e.key === "Escape") { setEditingTextId(null); setEditTextValue(""); }
  }, [handleTextEditComplete]);

  // Keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingTextId) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId) {
        if (e.key === "Backspace" && !(e.target instanceof HTMLInputElement)) e.preventDefault();
        if (selectedItemType === "stamp") usePdfEditorStore.getState().removeStamp(selectedItemId);
        else if (selectedItemType === "text") usePdfEditorStore.getState().removeText(selectedItemId);
        setSelectedItem(null, null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemId, selectedItemType, editingTextId, setSelectedItem]);

  // Keyboard arrow for pages
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingTextId || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") setCurrentPage(Math.max(1, currentPage - 1));
      if (e.key === "ArrowRight") setCurrentPage(Math.min(totalPages, currentPage + 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages, editingTextId, setCurrentPage]);

  const pageStamps = stamps.filter((s) => s.page === currentPage);
  const pageTexts = texts.filter((t) => t.page === currentPage);

  const cursorClass = activeTool === "stamp" || activeTool === "text" ? "cursor-crosshair" : "cursor-default";
  const zoomPercent = Math.round(zoomLevel * 100);

  // Render resize handles for selected stamp
  const renderStampHandles = (stamp: StampItem) => {
    if (selectedItemId !== stamp.id) return null;

    const hs = HANDLE_SIZE;
    const halfHs = hs / 2;
    const corners = [
      { key: "tl", style: { left: -halfHs, top: -halfHs, cursor: "nw-resize" } },
      { key: "tr", style: { right: -halfHs, top: -halfHs, cursor: "ne-resize" } },
      { key: "bl", style: { left: -halfHs, bottom: -halfHs, cursor: "sw-resize" } },
      { key: "br", style: { right: -halfHs, bottom: -halfHs, cursor: "se-resize" } },
    ];

    return (
      <>
        {/* Dashed border */}
        <div className="absolute inset-0 border-2 border-dashed border-primary/60 pointer-events-none" />

        {/* Corner resize handles */}
        {corners.map((c) => (
          <div
            key={c.key}
            className="absolute bg-white border-2 border-primary rounded-sm z-10"
            style={{
              ...c.style,
              width: hs,
              height: hs,
              cursor: c.cursor,
            }}
            onMouseDown={(e) => handleResizeMouseDown(e, stamp.id, c.key, stamp)}
          />
        ))}

        {/* Rotation handle */}
        <div
          className="absolute left-1/2 z-10"
          style={{
            top: -ROTATE_HANDLE_DISTANCE,
            transform: "translateX(-50%)",
            cursor: "grab",
          }}
          onMouseDown={(e) => handleRotateMouseDown(e, stamp.id, stamp)}
        >
          {/* Connecting line */}
          <div
            className="absolute left-1/2 bottom-full"
            style={{
              width: 1,
              height: ROTATE_HANDLE_DISTANCE - hs,
              backgroundColor: "hsl(var(--primary))",
              transform: "translateX(-50%)",
              pointerEvents: "none",
            }}
          />
          {/* Rotation circle */}
          <div
            className="w-5 h-5 rounded-full bg-primary border-2 border-white shadow-md flex items-center justify-center"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
          </div>
        </div>
      </>
    );
  };

  const selectedStamp = stamps.find((s) => s.id === selectedItemId);
  const selectedText = texts.find((t) => t.id === selectedItemId);

  return (
    <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden bg-muted/30">
      {/* Properties bar above PDF — horizontal */}
      {selectedItemId && pdfDoc && !error && !isLoading && (
        <div className="flex items-center gap-3 px-4 py-2 bg-card border-b border-border shrink-0 overflow-x-auto">
          {selectedItemType === "stamp" && selectedStamp && (
            <>
              {/* Rotation */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-muted-foreground">Поворот</span>
                <Button variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => updateStamp(selectedItemId!, { rotation: selectedStamp.rotation - 15 })}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Input
                  type="number" min={-180} max={180} step={1}
                  value={Math.round(selectedStamp.rotation)}
                  onChange={(e) => updateStamp(selectedItemId!, { rotation: parseFloat(e.target.value) || 0 })}
                  className="h-7 text-sm w-14 text-center"
                />
                <span className="text-xs text-muted-foreground">°</span>
                <Button variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => updateStamp(selectedItemId!, { rotation: selectedStamp.rotation + 15 })}
                >
                  <RotateCw className="h-3 w-3" />
                </Button>
              </div>

              <div className="w-px h-6 bg-border shrink-0" />

              {/* Width */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-muted-foreground">Ш</span>
                <Input
                  type="number" min={20} max={800} step={5}
                  value={Math.round(selectedStamp.width)}
                  onChange={(e) => updateStamp(selectedItemId!, { width: Math.max(20, parseInt(e.target.value) || 20) })}
                  className="h-7 text-sm w-16 text-center"
                />
              </div>

              {/* Height */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-muted-foreground">В</span>
                <Input
                  type="number" min={20} max={800} step={5}
                  value={Math.round(selectedStamp.height)}
                  onChange={(e) => updateStamp(selectedItemId!, { height: Math.max(20, parseInt(e.target.value) || 20) })}
                  className="h-7 text-sm w-16 text-center"
                />
              </div>

              <div className="w-px h-6 bg-border shrink-0" />

              {/* Opacity */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-muted-foreground">Прозрачность</span>
                <Input
                  type="range" min={0.05} max={1} step={0.05}
                  value={selectedStamp.opacity}
                  onChange={(e) => updateStamp(selectedItemId!, { opacity: parseFloat(e.target.value) })}
                  className="w-20 h-7"
                />
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {Math.round(selectedStamp.opacity * 100)}%
                </span>
              </div>

              <div className="w-px h-6 bg-border shrink-0" />

              {/* Delete */}
              <Button
                variant="destructive" size="sm"
                className="h-7 gap-1.5 shrink-0"
                onClick={() => {
                  usePdfEditorStore.getState().removeStamp(selectedItemId!);
                  setSelectedItem(null, null);
                }}
              >
                <Trash2 className="h-3 w-3" />
                Удалить
              </Button>
            </>
          )}

          {selectedItemType === "text" && selectedText && (
            <>
              {/* Rotation */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-muted-foreground">Поворот</span>
                <Button variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => updateText(selectedItemId!, { rotation: selectedText.rotation - 15 })}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Input
                  type="number" min={-180} max={180} step={1}
                  value={Math.round(selectedText.rotation)}
                  onChange={(e) => updateText(selectedItemId!, { rotation: parseFloat(e.target.value) || 0 })}
                  className="h-7 text-sm w-14 text-center"
                />
                <span className="text-xs text-muted-foreground">°</span>
                <Button variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => updateText(selectedItemId!, { rotation: selectedText.rotation + 15 })}
                >
                  <RotateCw className="h-3 w-3" />
                </Button>
              </div>

              <div className="w-px h-6 bg-border shrink-0" />

              {/* Font size */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-muted-foreground">Размер</span>
                <Input
                  type="number" min={8} max={72}
                  value={selectedText.fontSize}
                  onChange={(e) => updateText(selectedItemId!, { fontSize: parseInt(e.target.value) || 16 })}
                  className="h-7 text-sm w-16 text-center"
                />
              </div>

              <div className="w-px h-6 bg-border shrink-0" />

              {/* Delete */}
              <Button
                variant="destructive" size="sm"
                className="h-7 gap-1.5 shrink-0"
                onClick={() => {
                  usePdfEditorStore.getState().removeText(selectedItemId!);
                  setSelectedItem(null, null);
                }}
              >
                <Trash2 className="h-3 w-3" />
                Удалить
              </Button>
            </>
          )}
        </div>
      )}

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center p-5 overflow-auto">
        {error && (
          <div className="text-center p-8">
            <div className="text-destructive text-lg mb-2">⚠️ {error}</div>
            <p className="text-muted-foreground text-sm">Попробуйте загрузить другой файл</p>
          </div>
        )}

        {isLoading && !error && (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
            <span className="text-sm text-muted-foreground">Загрузка PDF...</span>
          </div>
        )}

        {pdfDoc && !error && !isLoading && (
          <div className="relative shadow-2xl border border-border rounded-lg overflow-hidden">
            <canvas ref={canvasRef} className="block" />

            {/* Overlay */}
            <div
              ref={overlayRef}
              className={`absolute top-0 left-0 ${cursorClass}`}
              onClick={handleOverlayClick}
              style={{ width: canvasSize.width, height: canvasSize.height }}
            >
              {pageStamps.map((stamp) => (
                <div
                  key={stamp.id}
                  className={`absolute ${selectedItemId === stamp.id ? "" : "hover:ring-1 hover:ring-primary/50"}`}
                  style={{
                    left: stamp.x,
                    top: stamp.y,
                    width: stamp.width,
                    height: stamp.height,
                    transform: `rotate(${stamp.rotation}deg)`,
                    opacity: stamp.opacity,
                    cursor: dragState?.mode === "move" ? "grabbing" : "grab",
                  }}
                  onMouseDown={(e) => handleItemMouseDown(e, stamp.id, "stamp")}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={stamp.src}
                    alt={stamp.type}
                    className="w-full h-full object-contain pointer-events-none select-none"
                    draggable={false}
                  />
                  {renderStampHandles(stamp)}
                </div>
              ))}

              {pageTexts.map((textItem) => (
                <div
                  key={textItem.id}
                  className={`absolute ${selectedItemId === textItem.id ? "ring-2 ring-primary ring-offset-1" : "hover:ring-1 hover:ring-primary/50"}`}
                  style={{
                    left: textItem.x,
                    top: textItem.y,
                    fontSize: textItem.fontSize,
                    color: textItem.color,
                    fontFamily: textItem.fontFamily,
                    fontWeight: textItem.bold ? "bold" : "normal",
                    transform: `rotate(${textItem.rotation}deg)`,
                    cursor: dragState?.mode === "move" ? "grabbing" : "grab",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                  onMouseDown={(e) => handleItemMouseDown(e, textItem.id, "text")}
                  onClick={(e) => e.stopPropagation()}
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
          </div>
        )}
      </div>

      {/* Bottom center controls */}
      {pdfDoc && !error && !isLoading && (
        <div className="flex justify-center pb-3 px-4">
          <div className="flex items-center gap-1 bg-card border border-border rounded-full shadow-lg px-2 py-1">
            <Button
              variant="ghost" size="icon" className="h-8 w-8 rounded-full"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium tabular-nums min-w-[60px] text-center select-none">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost" size="icon" className="h-8 w-8 rounded-full"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant="ghost" size="icon" className="h-8 w-8 rounded-full"
              onClick={zoomOut}
              disabled={zoomLevel <= 0.25}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <button
              className="text-sm font-medium tabular-nums min-w-[48px] text-center hover:bg-accent rounded-full py-1 px-2 transition-colors select-none"
              onClick={zoomFit}
              title="Сбросить масштаб"
            >
              {zoomPercent}%
            </button>
            <Button
              variant="ghost" size="icon" className="h-8 w-8 rounded-full"
              onClick={zoomIn}
              disabled={zoomLevel >= 3.0}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-8 w-8 rounded-full"
              onClick={zoomFit}
              title="Вписать в экран"
            >
              <Maximize className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
