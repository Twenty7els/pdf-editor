"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { usePdfEditorStore, StampItem, TextItem } from "@/store/pdf-editor-store";

let pdfjsLib: any = null;

export default function PdfCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [rendering, setRendering] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

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

  // Load pdfjs-dist dynamically
  useEffect(() => {
    import("pdfjs-dist").then((module) => {
      pdfjsLib = module;
      module.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${module.version}/pdf.worker.min.mjs`;
    });
  }, []);

  // Load PDF when file changes
  useEffect(() => {
    if (!pdfFile || !pdfjsLib) return;

    const loadPdf = async () => {
      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        setPdfArrayBuffer(arrayBuffer.slice(0));
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
      } catch (err) {
        console.error("Error loading PDF:", err);
      }
    };

    loadPdf();
  }, [pdfFile, pdfjsLib, setTotalPages, setPdfArrayBuffer]);

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || rendering) return;

    setRendering(true);
    try {
      const page = await pdfDoc.getPage(currentPage);
      
      const container = containerRef.current;
      if (!container) return;
      
      const containerWidth = container.clientWidth - 40;
      const viewport = page.getViewport({ scale: 1 });
      const autoScale = containerWidth / viewport.width;
      const scale = Math.min(autoScale, 1.5);
      
      setPageScale(scale);
      
      const scaledViewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;

      setCanvasSize({ width: scaledViewport.width, height: scaledViewport.height });

      await page.render({
        canvasContext: context!,
        viewport: scaledViewport,
      }).promise;
    } catch (err) {
      console.error("Error rendering page:", err);
    } finally {
      setRendering(false);
    }
  }, [pdfDoc, currentPage, rendering, setPageScale]);

  useEffect(() => {
    renderPage();
  }, [renderPage, currentPage]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (pdfDoc) renderPage();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
        // Prevent backspace from navigating back
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
      <div className="relative shadow-2xl border border-border rounded-lg overflow-hidden">
        <canvas ref={canvasRef} className="block" />

        {/* Overlay for interactive items */}
        <div
          ref={overlayRef}
          className={`absolute inset-0 ${cursorClass}`}
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

        {/* Loading overlay */}
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
