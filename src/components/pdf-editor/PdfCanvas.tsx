"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  usePdfEditorStore,
  type StampItem,
  type TextItem,
  type EraserPoint,
  getFontCss,
} from "@/store/pdf-editor-store";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eraser,
  Loader2,
  AlertCircle,
  AlertTriangle,
  X,
  FileText,
  PencilLine,
  Type,
  Undo2,
  Redo2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TextEditSidebar, { type TextSidebarData } from "./TextEditSidebar";
import PageThumbnails from "./PageThumbnails";

type DragMode = "move" | "resize" | "rotate" | null;

interface DragState {
  mode: DragMode;
  id: string;
  type: "stamp" | "text";
  offsetX: number;
  offsetY: number;
  corner?: string;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  startWidth: number;
  startHeight: number;
  startRotation: number;
  startAngle: number;
  itemCanvasWidth: number;
  itemCanvasHeight: number;
}

const HANDLE_SIZE = 9;
const ROTATE_HANDLE_DISTANCE = 28;

export default function PdfCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<
    import("pdfjs-dist").PDFDocumentProxy | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonA4Pages, setNonA4Pages] = useState<number[]>([]);
  const [a4BannerDismissed, setA4BannerDismissed] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const pdfjsRef = useRef<unknown>(null);
  const renderingRef = useRef(false);
  const clickedOnElementRef = useRef(false);

  // Eraser drawing state
  const eraserPointsRef = useRef<EraserPoint[]>([]);
  const [isEraserDrawing, setIsEraserDrawing] = useState(false);
  const [currentEraserPoints, setCurrentEraserPoints] = useState<EraserPoint[]>(
    []
  );
  const [eraserCursorPos, setEraserCursorPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Stamp cursor state
  const [stampCursorPos, setStampCursorPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const {
    pdfFile,
    currentPage,
    totalPages,
    zoomLevel,
    setTotalPages,
    setPdfArrayBuffer,
    zoomIn,
    zoomOut,
    zoomFit,
    activeTool,
    selectedStampType,
    selectedStampSrc,
    stamps,
    texts,
    erasers,
    selectedItemId,
    selectedItemType,
    addStamp,
    addEraser,
    updateStamp,
    updateText,
    setSelectedItem,
    setCurrentPage,
    setActiveTool,
    eraserSettings,
    setEraserSettings,
    presetText,
    pageRotations,
    deletedPages,
    undo,
    redo,
    duplicateSelectedItem,
    rotatePage,
    deletePage,
    past,
    future,
  } = usePdfEditorStore();

  // Scale stored overlay coordinates → current display coordinates
  const scaleToDisplay = useCallback(
    (storedX: number, storedCanvasWidth: number) => {
      if (!canvasSize.width || !storedCanvasWidth) return storedX;
      return storedX * (canvasSize.width / storedCanvasWidth);
    },
    [canvasSize.width]
  );

  const scaleToDisplayY = useCallback(
    (storedY: number, storedCanvasHeight: number) => {
      if (!canvasSize.height || !storedCanvasHeight) return storedY;
      return storedY * (canvasSize.height / storedCanvasHeight);
    },
    [canvasSize.height]
  );

  // Drag / resize / rotate state
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Text editing — sidebar panel
  const [textSidebar, setTextSidebar] = useState<{
    open: boolean;
    mode: "create" | "edit";
    targetId: string | null;
    pendingPos: { x: number; y: number; canvasWidth: number; canvasHeight: number } | null;
    initialData: TextSidebarData | null;
  }>({
    open: false,
    mode: "create",
    targetId: null,
    pendingPos: null,
    initialData: null,
  });

  // Delete page confirmation dialog
  const [deletePageDialogOpen, setDeletePageDialogOpen] = useState(false);

  const isCurrentPageDeleted = deletedPages.includes(currentPage);

  const openTextSidebarForCreate = useCallback(
    (pos: { x: number; y: number; canvasWidth: number; canvasHeight: number }) => {
      const s = usePdfEditorStore.getState();
      setTextSidebar({
        open: true,
        mode: "create",
        targetId: null,
        pendingPos: pos,
        initialData: {
          text: s.presetText ?? "",
          fontSize: s.textSettings.fontSize,
          color: s.textSettings.color,
          fontFamily: s.textSettings.fontFamily,
          bold: s.textSettings.bold,
          italic: s.textSettings.italic,
          underline: s.textSettings.underline,
          align: s.textSettings.align,
          letterSpacing: s.textSettings.letterSpacing,
        },
      });
    },
    []
  );

  const openTextSidebarForEdit = useCallback((t: TextItem) => {
    setTextSidebar({
      open: true,
      mode: "edit",
      targetId: t.id,
      pendingPos: null,
      initialData: {
        text: t.text,
        fontSize: t.fontSize,
        color: t.color,
        fontFamily: t.fontFamily,
        bold: t.bold,
        italic: t.italic,
        underline: t.underline,
        align: t.align,
        letterSpacing: t.letterSpacing,
      },
    });
  }, []);

  const handleTextSidebarSave = useCallback(
    (data: TextSidebarData) => {
      const state = usePdfEditorStore.getState();
      // Update default text settings so next text inherits
      state.setTextSettings({
        fontSize: data.fontSize,
        color: data.color,
        fontFamily: data.fontFamily,
        bold: data.bold,
        italic: data.italic,
        underline: data.underline,
        align: data.align,
        letterSpacing: data.letterSpacing,
      });

      if (textSidebar.mode === "edit" && textSidebar.targetId) {
        state.updateText(textSidebar.targetId, {
          text: data.text,
          fontSize: data.fontSize,
          color: data.color,
          fontFamily: data.fontFamily,
          bold: data.bold,
          italic: data.italic,
          underline: data.underline,
          align: data.align,
          letterSpacing: data.letterSpacing,
        });
      } else if (textSidebar.mode === "create" && textSidebar.pendingPos) {
        const pos = textSidebar.pendingPos;
        const newText: TextItem = {
          id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          text: data.text,
          x: pos.x,
          y: pos.y,
          fontSize: data.fontSize,
          color: data.color,
          page: state.currentPage,
          fontFamily: data.fontFamily,
          bold: data.bold,
          italic: data.italic,
          underline: data.underline,
          align: data.align,
          letterSpacing: data.letterSpacing,
          rotation: 0,
          canvasWidth: pos.canvasWidth,
          canvasHeight: pos.canvasHeight,
        };
        state.addText(newText);
        state.setSelectedItem(newText.id, "text");
        state.setActiveTool("select");
        state.setPresetText(null);
      }
    },
    [textSidebar]
  );

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
      setNonA4Pages([]);
      setA4BannerDismissed(false);
      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        setPdfArrayBuffer(arrayBuffer.slice(0));
        const pdfjs = pdfjsRef.current as typeof import("pdfjs-dist");
        const pdf = await pdfjs.getDocument({
          data: new Uint8Array(arrayBuffer),
        }).promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);

        // On narrow screens (mobile) start with a zoom that fits the page
        // width so the document is immediately readable.
        try {
          const firstPage = await pdf.getPage(1);
          const vp = firstPage.getViewport({ scale: 1 });
          const container = containerRef.current;
          if (container && vp.width > 0) {
            const avail = container.clientWidth - 32; // padding allowance
            if (avail > 120 && avail < vp.width) {
              usePdfEditorStore
                .getState()
                .setZoomLevel(Math.max(0.35, avail / vp.width));
            }
          }
        } catch {
          // non-critical
        }

        // Check page sizes against A4 standard
        const A4_WIDTH = 595.28;
        const A4_HEIGHT = 841.89;
        const TOLERANCE = 5;

        const nonA4Pages: number[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          const w = vp.width;
          const h = vp.height;

          const isPortraitA4 =
            Math.abs(w - A4_WIDTH) <= TOLERANCE &&
            Math.abs(h - A4_HEIGHT) <= TOLERANCE;
          const isLandscapeA4 =
            Math.abs(w - A4_HEIGHT) <= TOLERANCE &&
            Math.abs(h - A4_WIDTH) <= TOLERANCE;

          if (!isPortraitA4 && !isLandscapeA4) {
            nonA4Pages.push(i);
          }
        }

        if (nonA4Pages.length > 0) {
          setNonA4Pages(nonA4Pages);
        }
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
  // zoomLevel = 1.0 means 100% (real PDF size, 1pt = 1px on screen)
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || renderingRef.current) return;
    renderingRef.current = true;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const container = containerRef.current;
      if (!container) {
        renderingRef.current = false;
        return;
      }
      // Real PDF scale: 1.0 = 100% (1pt → 1px). No fit-to-container scaling.
      const scale = zoomLevel;
      // Total rotation = intrinsic page rotation + user rotation.
      // pdf.js treats the `rotation` option as ABSOLUTE, so we must add
      // the page's own /Rotate value — otherwise intrinsically rotated
      // pages render differently here than in the exported PDF.
      const intrinsic = page.rotate || 0;
      const userRotation = pageRotations[currentPage] || 0;
      const rotation =
        ((((intrinsic + userRotation) % 360) + 360) % 360) as number;
      const scaledViewport = page.getViewport({ scale, rotation });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) {
        renderingRef.current = false;
        return;
      }
      // Render at higher resolution for crisp text, especially on scanned PDFs.
      // Use max(devicePixelRatio, 2) so even non-retina screens get sharp rendering.
      const outputScale = Math.max(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(scaledViewport.width * outputScale);
      canvas.height = Math.floor(scaledViewport.height * outputScale);
      canvas.style.width = Math.floor(scaledViewport.width) + "px";
      canvas.style.height = Math.floor(scaledViewport.height) + "px";
      const transform = [outputScale, 0, 0, outputScale, 0, 0];
      setCanvasSize({
        width: Math.floor(scaledViewport.width),
        height: Math.floor(scaledViewport.height),
      });
      await page.render({
        canvas,
        canvasContext: context,
        viewport: scaledViewport,
        transform,
      }).promise;
    } catch (err) {
      console.error("Error rendering page:", err);
    } finally {
      renderingRef.current = false;
    }
  }, [pdfDoc, currentPage, zoomLevel, pageRotations]);

  // Initial render + delayed re-render
  useEffect(() => {
    if (!pdfDoc) return;
    renderPage();
    const t1 = setTimeout(() => renderPage(), 100);
    const t2 = setTimeout(() => renderPage(), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [renderPage, pdfDoc]);

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

  // Clear cursors when switching tools
  useEffect(() => {
    if (activeTool !== "eraser") setEraserCursorPos(null);
    if (activeTool !== "stamp") setStampCursorPos(null);
  }, [activeTool]);

  // Mouse wheel zoom with Ctrl
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
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
        const newId = `stamp-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 11)}`;
        addStamp({
          id: newId,
          type: selectedStampType,
          src: selectedStampSrc,
          x: x - size / 2,
          y: y - size / 2,
          width: size,
          height: size,
          page: currentPage,
          rotation: 0,
          opacity: 1.0,
          canvasWidth: overlayW,
          canvasHeight: overlayH,
        });
        setActiveTool("select");
        setSelectedItem(newId, "stamp");
      } else if (activeTool === "text") {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // Open the text editor modal instead of inline editing
        openTextSidebarForCreate({
          x,
          y,
          canvasWidth: overlayW,
          canvasHeight: overlayH,
        });
      } else if (activeTool === "select") {
        setSelectedItem(null, null);
      }
    },
    [
      activeTool,
      selectedStampType,
      selectedStampSrc,
      currentPage,
      addStamp,
      setSelectedItem,
      setActiveTool,
      openTextSidebarForCreate,
    ]
  );

  // Handle overlay mousedown for eraser brush drawing
  const handleOverlayMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== "eraser") return;
      if (!overlayRef.current) return;
      const target = e.target as HTMLElement;
      if (target !== overlayRef.current) return;

      const rect = overlayRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      eraserPointsRef.current = [{ x, y }];
      setIsEraserDrawing(true);
      setCurrentEraserPoints([{ x, y }]);
    },
    [activeTool]
  );

  // Eraser drawing mouse move and mouseup
  useEffect(() => {
    if (!isEraserDrawing || !overlayRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = overlayRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      eraserPointsRef.current = [...eraserPointsRef.current, { x, y }];
      setCurrentEraserPoints(eraserPointsRef.current);
      setEraserCursorPos({ x, y });
    };

    const handleMouseUp = () => {
      // Commit from the ref — store updates must never run inside a
      // setState updater (React executes updaters during render).
      const points = eraserPointsRef.current;
      if (points.length > 0) {
        const overlayW = overlayRef.current!.offsetWidth;
        const overlayH = overlayRef.current!.offsetHeight;
        const newId = `eraser-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 11)}`;
        addEraser({
          id: newId,
          points,
          strokeWidth: eraserSettings.brushSize,
          color: eraserSettings.color,
          page: currentPage,
          canvasWidth: overlayW,
          canvasHeight: overlayH,
        });
        setSelectedItem(newId, "eraser");
      }
      eraserPointsRef.current = [];
      setCurrentEraserPoints([]);
      setIsEraserDrawing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isEraserDrawing,
    eraserSettings,
    currentPage,
    addEraser,
    setSelectedItem,
  ]);

  // Unified mouse down handler
  const handleItemMouseDown = useCallback(
    (e: React.MouseEvent, id: string, type: "stamp" | "text") => {
      e.stopPropagation();
      clickedOnElementRef.current = true;
      setSelectedItem(id, type);
      const state = usePdfEditorStore.getState();
      const item =
        type === "stamp"
          ? state.stamps.find((s) => s.id === id)
          : state.texts.find((t) => t.id === id);
      const cw = item
        ? "canvasWidth" in item
          ? item.canvasWidth
          : canvasSize.width
        : canvasSize.width;
      const ch = item
        ? "canvasHeight" in item
          ? item.canvasHeight
          : canvasSize.height
        : canvasSize.height;
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
        itemCanvasWidth: cw,
        itemCanvasHeight: ch,
      });
    },
    [setSelectedItem, canvasSize.width, canvasSize.height]
  );

  // Resize handle mouse down
  const handleResizeMouseDown = useCallback(
    (
      e: React.MouseEvent,
      id: string,
      corner: string,
      item: StampItem | TextItem
    ) => {
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
        itemCanvasWidth: stampItem.canvasWidth,
        itemCanvasHeight: stampItem.canvasHeight,
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
      const dispX = scaleToDisplay(item.x, item.canvasWidth);
      const dispY = scaleToDisplayY(item.y, item.canvasHeight);
      const dispW = scaleToDisplay(item.width, item.canvasWidth);
      const dispH = scaleToDisplayY(item.height, item.canvasHeight);
      const cx = dispX + dispW / 2;
      const cy = dispY + dispH / 2;
      const rect = overlayRef.current!.getBoundingClientRect();
      const mouseLocalX = e.clientX - rect.left;
      const mouseLocalY = e.clientY - rect.top;
      const angle =
        Math.atan2(mouseLocalY - cy, mouseLocalX - cx) * (180 / Math.PI);
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
        itemCanvasWidth: item.canvasWidth,
        itemCanvasHeight: item.canvasHeight,
      });
    },
    [scaleToDisplay, scaleToDisplayY]
  );

  // Unified mouse move / up handler
  useEffect(() => {
    if (!dragState || !overlayRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = overlayRef.current!.getBoundingClientRect();
      const icw = dragState.itemCanvasWidth;
      const ich = dragState.itemCanvasHeight;

      if (dragState.mode === "move") {
        const dispX = e.clientX - rect.left - dragState.offsetX;
        const dispY = e.clientY - rect.top - dragState.offsetY;
        const storeX = dispX * (icw / (canvasSize.width || icw));
        const storeY = dispY * (ich / (canvasSize.height || ich));
        if (dragState.type === "stamp")
          updateStamp(dragState.id, { x: storeX, y: storeY });
        else updateText(dragState.id, { x: storeX, y: storeY });
      } else if (dragState.mode === "resize" && dragState.type === "stamp") {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        const sdx = dx * (icw / (canvasSize.width || icw));
        const sdy = dy * (ich / (canvasSize.height || ich));

        let newLeft = dragState.startLeft;
        let newTop = dragState.startTop;
        let newWidth = dragState.startWidth;
        let newHeight = dragState.startHeight;

        const corner = dragState.corner;

        if (corner === "br") {
          newWidth = Math.max(30, dragState.startWidth + sdx);
          newHeight = Math.max(30, dragState.startHeight + sdy);
        } else if (corner === "bl") {
          newLeft = dragState.startLeft + sdx;
          newWidth = Math.max(30, dragState.startWidth - sdx);
          newHeight = Math.max(30, dragState.startHeight + sdy);
        } else if (corner === "tr") {
          newTop = dragState.startTop + sdy;
          newWidth = Math.max(30, dragState.startWidth + sdx);
          newHeight = Math.max(30, dragState.startHeight - sdy);
        } else if (corner === "tl") {
          newLeft = dragState.startLeft + sdx;
          newTop = dragState.startTop + sdy;
          newWidth = Math.max(30, dragState.startWidth - sdx);
          newHeight = Math.max(30, dragState.startHeight - sdy);
        }

        updateStamp(dragState.id, {
          x: newLeft,
          y: newTop,
          width: newWidth,
          height: newHeight,
        });
      } else if (dragState.mode === "rotate" && dragState.type === "stamp") {
        const stamp = usePdfEditorStore
          .getState()
          .stamps.find((s) => s.id === dragState.id);
        if (!stamp) return;
        const dispX = scaleToDisplay(stamp.x, stamp.canvasWidth);
        const dispY = scaleToDisplayY(stamp.y, stamp.canvasHeight);
        const dispW = scaleToDisplay(stamp.width, stamp.canvasWidth);
        const dispH = scaleToDisplayY(stamp.height, stamp.canvasHeight);
        const cx = dispX + dispW / 2;
        const cy = dispY + dispH / 2;
        const mouseLocalX = e.clientX - rect.left;
        const mouseLocalY = e.clientY - rect.top;
        const currentAngle =
          Math.atan2(mouseLocalY - cy, mouseLocalX - cx) * (180 / Math.PI);
        const deltaAngle = currentAngle - dragState.startAngle;
        let newRotation = dragState.startRotation + deltaAngle;
        while (newRotation > 180) newRotation -= 360;
        while (newRotation < -180) newRotation += 360;
        if (e.shiftKey) {
          newRotation = Math.round(newRotation / 15) * 15;
        }
        updateStamp(dragState.id, { rotation: newRotation });
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    dragState,
    updateStamp,
    updateText,
    canvasSize.width,
    canvasSize.height,
    scaleToDisplay,
    scaleToDisplayY,
  ]);

  // Text double-click → open sidebar in edit mode
  const handleTextDoubleClick = useCallback(
    (e: React.MouseEvent, t: TextItem) => {
      e.stopPropagation();
      openTextSidebarForEdit(t);
    },
    [openTextSidebarForEdit]
  );

  // Keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (textSidebar.open) return;
      // Don't trigger delete when typing in any input/textarea/select
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      )
        return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId) {
        e.preventDefault();
        if (selectedItemType === "stamp")
          usePdfEditorStore.getState().removeStamp(selectedItemId);
        else if (selectedItemType === "text")
          usePdfEditorStore.getState().removeText(selectedItemId);
        else if (selectedItemType === "eraser")
          usePdfEditorStore.getState().removeEraser(selectedItemId);
        setSelectedItem(null, null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemId, selectedItemType, textSidebar.open, setSelectedItem]);

  // Undo / Redo / Duplicate keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (textSidebar.open) return;
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      )
        return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const key = e.key.toLowerCase();
      // Ctrl+Z = undo, Ctrl+Shift+Z or Ctrl+Y = redo
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        usePdfEditorStore.getState().undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        usePdfEditorStore.getState().redo();
      } else if (key === "d") {
        // Duplicate selected
        const st = usePdfEditorStore.getState();
        if (st.selectedItemId && st.selectedItemType) {
          e.preventDefault();
          st.duplicateSelectedItem();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [textSidebar.open]);

  // Keyboard arrow for pages
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (textSidebar.open || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft")
        setCurrentPage(Math.max(1, currentPage - 1));
      if (e.key === "ArrowRight")
        setCurrentPage(Math.min(totalPages, currentPage + 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages, textSidebar.open, setCurrentPage]);

  const pageStamps = stamps.filter((s) => s.page === currentPage);
  const pageTexts = texts.filter((t) => t.page === currentPage);
  const pageErasers = erasers.filter((e) => e.page === currentPage);

  const cursorClass =
    activeTool === "stamp" && selectedStampSrc
      ? "cursor-none"
      : activeTool === "stamp" || activeTool === "text"
      ? "cursor-crosshair"
      : activeTool === "eraser"
      ? "cursor-none"
      : "cursor-default";
  const zoomPercent = Math.round(zoomLevel * 100);

  // Build SVG path string from eraser points
  const buildEraserPath = (points: EraserPoint[]): string => {
    if (points.length === 0) return "";
    if (points.length === 1) {
      const p = points[0];
      const r = 1;
      return `M ${p.x - r} ${p.y} A ${r} ${r} 0 1 0 ${p.x + r} ${p.y} A ${r} ${r} 0 1 0 ${p.x - r} ${p.y}`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  // Render resize handles for selected stamp
  const renderStampHandles = (stamp: StampItem) => {
    if (selectedItemId !== stamp.id) return null;

    const hs = HANDLE_SIZE;
    const halfHs = hs / 2;
    const corners: { key: string; cursor: string; pos: React.CSSProperties }[] = [
      { key: "tl", cursor: "nw-resize", pos: { left: -halfHs, top: -halfHs } },
      { key: "tr", cursor: "ne-resize", pos: { right: -halfHs, top: -halfHs } },
      { key: "bl", cursor: "sw-resize", pos: { left: -halfHs, bottom: -halfHs } },
      { key: "br", cursor: "se-resize", pos: { right: -halfHs, bottom: -halfHs } },
    ];

    return (
      <>
        {/* Selection ring */}
        <div className="absolute inset-0 ring-2 ring-primary/70 rounded-sm pointer-events-none" />
        <div className="absolute inset-0 ring-1 ring-primary/30 ring-offset-2 ring-offset-transparent rounded-sm pointer-events-none" />

        {/* Corner resize handles */}
        {corners.map((c) => (
          <div
            key={c.key}
            className="absolute bg-background border-2 border-primary rounded-sm z-10 shadow-soft hover:scale-125 transition-transform"
            style={{
              ...c.pos,
              width: hs,
              height: hs,
              cursor: c.cursor,
            }}
            onMouseDown={(e) =>
              handleResizeMouseDown(e, stamp.id, c.key, stamp)
            }
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
              width: 1.5,
              height: ROTATE_HANDLE_DISTANCE - hs,
              backgroundColor: "var(--primary)",
              transform: "translateX(-50%)",
              pointerEvents: "none",
              opacity: 0.6,
            }}
          />
          {/* Rotation circle */}
          <div className="w-6 h-6 rounded-full bg-primary border-2 border-background shadow-soft flex items-center justify-center hover:scale-110 transition-transform">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
          </div>
        </div>
      </>
    );
  };

  const selectedStamp = stamps.find((s) => s.id === selectedItemId);
  const selectedText = texts.find((t) => t.id === selectedItemId);

  // Show top bar
  const showTopBar =
    pdfDoc &&
    !error &&
    !isLoading &&
    ((activeTool === "text" && !selectedItemId) ||
      activeTool === "eraser" ||
      selectedItemId !== null);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 flex flex-col overflow-hidden stage-bg relative"
    >
      {/* Non-A4 warning banner — persistent */}
      {nonA4Pages.length > 0 && !a4BannerDismissed && (
        <div className="shrink-0 px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-2.5 animate-slide-down">
          <div className="h-7 w-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-600" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-amber-700">
              Формат страниц не А4:{" "}
            </span>
            <span className="text-xs text-amber-700/80">
              стр. {nonA4Pages.length <= 8
                ? nonA4Pages.join(", ")
                : nonA4Pages.slice(0, 8).join(", ") + "…"}{" "}
              · размер может отличаться от стандартного
            </span>
          </div>
          <button
            onClick={() => setA4BannerDismissed(true)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-amber-700/60 hover:bg-amber-500/15 hover:text-amber-700 transition-colors shrink-0"
            title="Скрыть"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Main content row: thumbnails + canvas */}
      <div className="flex-1 flex min-h-0">
        {/* Page thumbnails strip */}
        {pdfDoc && !error && !isLoading && (
          <PageThumbnails pdfDoc={pdfDoc} />
        )}

        {/* Canvas + bottom controls column */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Canvas area */}
          <div className="flex-1 flex items-center justify-center p-5 overflow-auto">
        {error && (
          <div className="text-center p-8 animate-fade-in">
            <div className="relative h-16 w-16 mx-auto mb-5">
              <div className="relative h-16 w-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" strokeWidth={2} />
              </div>
            </div>
            <div className="text-lg font-semibold mb-2">{error}</div>
            <p className="text-muted-foreground text-sm">
              Попробуйте загрузить другой файл
            </p>
          </div>
        )}

        {isLoading && !error && (
          <div className="flex flex-col items-center justify-center gap-4 animate-fade-in">
            <div className="relative">
              <Loader2 className="relative h-12 w-12 animate-spin text-primary" strokeWidth={2} />
            </div>
            <span className="text-sm font-normal text-muted-foreground">Загрузка PDF...</span>
          </div>
        )}

        {pdfDoc && !error && !isLoading && isCurrentPageDeleted && (
          <div className="text-center p-8 animate-fade-in">
            <div className="relative h-16 w-16 mx-auto mb-5">
              <div className="relative h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-amber-600" strokeWidth={2} />
              </div>
            </div>
            <div className="text-lg font-semibold mb-2">
              Страница {currentPage} удалена
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Она будет исключена из экспортируемого PDF
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => usePdfEditorStore.getState().undeletePage(currentPage)}
              className="gap-1.5 rounded-xl"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Восстановить страницу
            </Button>
          </div>
        )}

        {pdfDoc && !error && !isLoading && !isCurrentPageDeleted && (
          <div className="relative shadow-paper border border-border/60 rounded-xl overflow-hidden bg-background">
            <canvas ref={canvasRef} className="block" />

            {/* Overlay */}
            <div
              ref={overlayRef}
              className={`absolute top-0 left-0 ${cursorClass}`}
              onClick={handleOverlayClick}
              onMouseDown={handleOverlayMouseDown}
              onMouseMove={(e) => {
                const rect = overlayRef.current!.getBoundingClientRect();
                const pos = {
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                };
                if (activeTool === "eraser") setEraserCursorPos(pos);
                if (activeTool === "stamp" && selectedStampSrc)
                  setStampCursorPos(pos);
              }}
              onMouseLeave={() => {
                setEraserCursorPos(null);
                setStampCursorPos(null);
              }}
              style={{ width: canvasSize.width, height: canvasSize.height }}
            >
              {/* SVG layer for eraser strokes */}
              <svg
                className="absolute top-0 left-0 pointer-events-none"
                width={canvasSize.width}
                height={canvasSize.height}
                style={{ zIndex: 5 }}
              >
                {pageErasers.filter((e) => !e.hidden).map((eraserItem) => {
                  const sx =
                    canvasSize.width /
                    (eraserItem.canvasWidth || canvasSize.width);
                  const sy =
                    canvasSize.height /
                    (eraserItem.canvasHeight || canvasSize.height);
                  const scaledPoints = eraserItem.points.map((p) => ({
                    x: p.x * sx,
                    y: p.y * sy,
                  }));
                  return (
                    <path
                      key={eraserItem.id}
                      d={buildEraserPath(scaledPoints)}
                      stroke={eraserItem.color}
                      strokeWidth={eraserItem.strokeWidth * Math.min(sx, sy)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      className={
                        selectedItemId === eraserItem.id
                          ? "pointer-events-auto cursor-pointer"
                          : "pointer-events-none"
                      }
                      onClick={(e) => {
                        if (activeTool === "select" || activeTool === "eraser") {
                          e.stopPropagation();
                          clickedOnElementRef.current = true;
                          setSelectedItem(eraserItem.id, "eraser");
                        }
                      }}
                    />
                  );
                })}
                {isEraserDrawing && currentEraserPoints.length > 0 && (
                  <path
                    d={buildEraserPath(currentEraserPoints)}
                    stroke={eraserSettings.color}
                    strokeWidth={eraserSettings.brushSize}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                )}
              </svg>

              {pageStamps.filter((s) => !s.hidden).map((stamp) => (
                <div
                  key={stamp.id}
                  className={`absolute ${
                    selectedItemId === stamp.id
                      ? ""
                      : "hover:ring-1 hover:ring-primary/50 rounded-sm"
                  }`}
                  style={{
                    left: scaleToDisplay(stamp.x, stamp.canvasWidth),
                    top: scaleToDisplayY(stamp.y, stamp.canvasHeight),
                    width: scaleToDisplay(stamp.width, stamp.canvasWidth),
                    height: scaleToDisplayY(stamp.height, stamp.canvasHeight),
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

              {pageTexts.filter((t) => !t.hidden).map((textItem) => {
                const dispX = scaleToDisplay(textItem.x, textItem.canvasWidth);
                const dispY = scaleToDisplayY(
                  textItem.y,
                  textItem.canvasHeight
                );
                const dispFontSize = scaleToDisplay(
                  textItem.fontSize,
                  textItem.canvasWidth
                );
                const dispLetterSpacing = scaleToDisplay(
                  textItem.letterSpacing,
                  textItem.canvasWidth
                );
                const textLines = textItem.text.split("\n");
                const isSelected = selectedItemId === textItem.id;
                return (
                  <div
                    key={textItem.id}
                    className={`absolute ${
                      isSelected
                        ? "ring-1 ring-primary/70 ring-offset-2 ring-offset-background rounded-sm p-0.5"
                        : "hover:ring-1 hover:ring-primary/50 rounded-sm"
                    }`}
                    style={{
                      left: dispX,
                      top: dispY,
                      color: textItem.color,
                      transform: `rotate(${textItem.rotation}deg)`,
                      cursor:
                        dragState?.mode === "move" ? "grabbing" : "grab",
                      userSelect: "none",
                      lineHeight: 1.2,
                      width: "fit-content",
                      textAlign: textItem.align,
                    }}
                    onMouseDown={(e) =>
                      handleItemMouseDown(e, textItem.id, "text")
                    }
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => handleTextDoubleClick(e, textItem)}
                  >
                    {textLines.map((line, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: dispFontSize,
                          fontFamily: getFontCss(textItem.fontFamily),
                          fontWeight: textItem.bold ? "bold" : "normal",
                          fontStyle: textItem.italic ? "italic" : "normal",
                          textDecoration: textItem.underline
                            ? "underline"
                            : "none",
                          letterSpacing: `${dispLetterSpacing}px`,
                          whiteSpace: "pre",
                          textAlign: textItem.align,
                        }}
                      >
                        {line || "\u00A0"}
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Stamp cursor preview */}
              {activeTool === "stamp" && selectedStampSrc && stampCursorPos && (
                <img
                  src={selectedStampSrc}
                  alt=""
                  className="absolute pointer-events-none object-contain"
                  style={{
                    width: 130,
                    height: 130,
                    left: stampCursorPos.x,
                    top: stampCursorPos.y,
                    transform: "translate(-50%, -50%)",
                    opacity: 0.7,
                    zIndex: 50,
                  }}
                  draggable={false}
                />
              )}

              {/* Eraser cursor preview */}
              {activeTool === "eraser" && eraserCursorPos && (
                <div
                  className="absolute pointer-events-none rounded-full border-2 border-foreground/40"
                  style={{
                    width: eraserSettings.brushSize,
                    height: eraserSettings.brushSize,
                    left: eraserCursorPos.x,
                    top: eraserCursorPos.y,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: eraserSettings.color,
                    opacity: 0.6,
                    zIndex: 50,
                  }}
                />
              )}
            </div>
          </div>
        )}
          </div>

          {/* Bottom center controls */}
          {pdfDoc && !error && !isLoading && (
            <div className="flex justify-center pb-3 px-4 pt-1">
              <div className="flex items-center gap-1 bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-float px-2 py-1 max-w-[calc(100vw-24px)] overflow-x-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1.5 px-2">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium tabular-nums min-w-[60px] text-center select-none">
                    {currentPage} / {totalPages}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="w-px h-5 bg-border/60 mx-1" />
                {/* Undo / Redo */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                  onClick={undo}
                  disabled={past.length === 0}
                  title="Отменить (Ctrl+Z)"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                  onClick={redo}
                  disabled={future.length === 0}
                  title="Повторить (Ctrl+Y)"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
                <div className="w-px h-5 bg-border/60 mx-1" />
                {/* Rotate page */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                  onClick={() => rotatePage(currentPage)}
                  disabled={isCurrentPageDeleted}
                  title={`Повернуть страницу (текущий: ${pageRotations[currentPage] || 0}°)`}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                {/* Delete page */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                  onClick={() => setDeletePageDialogOpen(true)}
                  disabled={isCurrentPageDeleted}
                  title="Удалить страницу"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="w-px h-5 bg-border/60 mx-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                  onClick={zoomOut}
                  disabled={zoomLevel <= 0.25}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <button
                  className="text-xs font-medium tabular-nums min-w-[52px] text-center hover:bg-secondary rounded-full py-1 px-2 transition-colors select-none"
                  onClick={zoomFit}
                  title="Сбросить до 100%"
                >
                  {zoomPercent}%
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                  onClick={zoomIn}
                  disabled={zoomLevel >= 5.0}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating properties bar */}
      {showTopBar && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-[calc(100%-1.5rem)] animate-slide-down">
          <div className="bg-card/95 backdrop-blur-sm rounded-full shadow-float border border-border px-3 py-2 flex items-center gap-2 overflow-x-auto max-w-full">
            {/* Text tool hint (no element selected) */}
            {activeTool === "text" && !selectedItemId && (
              <>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="h-7 w-7 rounded-lg bg-ink flex items-center justify-center shrink-0 shadow-soft">
                    <Type className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
                  </div>
                </div>
                <Divider />
                {presetText ? (
                  <span className="text-xs text-primary font-medium shrink-0 truncate max-w-60">
                    ✦ {presetText}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground leading-relaxed shrink-0">
                    Кликните на PDF — откроется редактор текста
                  </span>
                )}
              </>
            )}

            {/* Eraser tool settings */}
            {activeTool === "eraser" && (
              <>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Eraser className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Кисть</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {[5, 10, 20, 40, 60].map((size) => (
                    <Button
                      key={size}
                      variant={
                        eraserSettings.brushSize === size
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="h-7 px-2 text-xs tabular-nums shrink-0 min-w-9 rounded-lg"
                      onClick={() => setEraserSettings({ brushSize: size })}
                    >
                      {size}
                    </Button>
                  ))}
                </div>

                <Divider />

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Цвет</span>
                  <Input
                    type="color"
                    value={eraserSettings.color}
                    onChange={(e) =>
                      setEraserSettings({ color: e.target.value })
                    }
                    className="h-7 w-8 cursor-pointer p-0"
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {["#FFFFFF", "#000000", "#F5F5F5", "#D4D4D4"].map((c) => (
                    <button
                      key={c}
                      className={`w-5 h-5 rounded-lg border-2 transition-all shrink-0 ${
                        eraserSettings.color === c
                          ? "border-primary scale-110 shadow-soft"
                          : "border-border"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setEraserSettings({ color: c })}
                      title={c}
                    />
                  ))}
                </div>

                <Divider />

                {selectedItemId && selectedItemType === "eraser" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 gap-1.5 shrink-0 rounded-lg"
                    onClick={() => {
                      usePdfEditorStore
                        .getState()
                        .removeEraser(selectedItemId);
                      setSelectedItem(null, null);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                    Удалить
                  </Button>
                )}

                <span className="text-[11px] text-muted-foreground shrink-0 hidden md:inline">
                  Рисуйте чтобы замазать
                </span>
              </>
            )}

            {/* Stamp selected element properties */}
            {selectedItemId &&
              selectedItemType === "stamp" &&
              selectedStamp && (
                <>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Поворот
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() =>
                        updateStamp(selectedItemId!, {
                          rotation: selectedStamp.rotation - 15,
                        })
                      }
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min={-180}
                      max={180}
                      step={1}
                      value={Math.round(selectedStamp.rotation)}
                      onChange={(e) =>
                        updateStamp(selectedItemId!, {
                          rotation: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-7 text-xs w-14 text-center tabular-nums rounded-lg"
                    />
                    <span className="text-[11px] text-muted-foreground">°</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() =>
                        updateStamp(selectedItemId!, {
                          rotation: selectedStamp.rotation + 15,
                        })
                      }
                    >
                      <RotateCw className="h-3 w-3" />
                    </Button>
                  </div>

                  <Divider />

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ш</span>
                    <Input
                      type="number"
                      min={20}
                      max={800}
                      step={5}
                      value={Math.round(selectedStamp.width)}
                      onChange={(e) =>
                        updateStamp(selectedItemId!, {
                          width:
                            Math.max(20, parseInt(e.target.value) || 20),
                        })
                      }
                      className="h-7 text-xs w-16 text-center tabular-nums rounded-lg"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">В</span>
                    <Input
                      type="number"
                      min={20}
                      max={800}
                      step={5}
                      value={Math.round(selectedStamp.height)}
                      onChange={(e) =>
                        updateStamp(selectedItemId!, {
                          height:
                            Math.max(20, parseInt(e.target.value) || 20),
                        })
                      }
                      className="h-7 text-xs w-16 text-center tabular-nums rounded-lg"
                    />
                  </div>

                  <Divider />

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Прозр.
                    </span>
                    <Input
                      type="range"
                      min={0.05}
                      max={1}
                      step={0.05}
                      value={selectedStamp.opacity}
                      onChange={(e) =>
                        updateStamp(selectedItemId!, {
                          opacity: parseFloat(e.target.value),
                        })
                      }
                      className="w-20 h-7"
                    />
                    <span className="text-[11px] font-medium text-muted-foreground w-8 text-right tabular-nums">
                      {Math.round(selectedStamp.opacity * 100)}%
                    </span>
                  </div>

                  <Divider />

                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 gap-1.5 shrink-0 rounded-lg"
                    onClick={() => {
                      usePdfEditorStore
                        .getState()
                        .removeStamp(selectedItemId!);
                      setSelectedItem(null, null);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                    Удалить
                  </Button>
                </>
              )}

            {/* Text selected element properties — compact quick controls + Edit button */}
            {selectedItemId &&
              selectedItemType === "text" &&
              selectedText && (
                <>
                  {/* Edit text button — opens modal */}
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 gap-1.5 shrink-0 shadow-soft rounded-lg hover:bg-terracotta-dark"
                    onClick={() => openTextSidebarForEdit(selectedText)}
                    title="Редактировать текст"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    Изменить текст
                  </Button>

                  <Divider />

                  {/* Quick B/I/U */}
                  <Button
                    variant={selectedText.bold ? "default" : "outline"}
                    size="icon"
                    className="h-7 w-7 shrink-0 rounded-lg"
                    onClick={() =>
                      updateText(selectedItemId!, {
                        bold: !selectedText.bold,
                      })
                    }
                    title="Жирный"
                  >
                    <Bold className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={selectedText.italic ? "default" : "outline"}
                    size="icon"
                    className="h-7 w-7 shrink-0 rounded-lg"
                    onClick={() =>
                      updateText(selectedItemId!, {
                        italic: !selectedText.italic,
                      })
                    }
                    title="Курсив"
                  >
                    <Italic className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={selectedText.underline ? "default" : "outline"}
                    size="icon"
                    className="h-7 w-7 shrink-0 rounded-lg"
                    onClick={() =>
                      updateText(selectedItemId!, {
                        underline: !selectedText.underline,
                      })
                    }
                    title="Подчёркнутый"
                  >
                    <Underline className="h-3 w-3" />
                  </Button>

                  <Divider />

                  {/* Alignment */}
                  <Button
                    variant={selectedText.align === "left" ? "default" : "outline"}
                    size="icon"
                    className="h-7 w-7 shrink-0 rounded-lg"
                    onClick={() => updateText(selectedItemId!, { align: "left" })}
                    title="По левому краю"
                  >
                    <AlignLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={selectedText.align === "center" ? "default" : "outline"}
                    size="icon"
                    className="h-7 w-7 shrink-0 rounded-lg"
                    onClick={() => updateText(selectedItemId!, { align: "center" })}
                    title="По центру"
                  >
                    <AlignCenter className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={selectedText.align === "right" ? "default" : "outline"}
                    size="icon"
                    className="h-7 w-7 shrink-0 rounded-lg"
                    onClick={() => updateText(selectedItemId!, { align: "right" })}
                    title="По правому краю"
                  >
                    <AlignRight className="h-3 w-3" />
                  </Button>

                  <Divider />

                  {/* Color */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Цвет</span>
                    <Input
                      type="color"
                      value={selectedText.color}
                      onChange={(e) =>
                        updateText(selectedItemId!, { color: e.target.value })
                      }
                      className="h-7 w-8 cursor-pointer p-0"
                    />
                  </div>

                  <Divider />

                  {/* Rotation */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() =>
                        updateText(selectedItemId!, {
                          rotation: selectedText.rotation - 15,
                        })
                      }
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min={-180}
                      max={180}
                      step={1}
                      value={Math.round(selectedText.rotation)}
                      onChange={(e) =>
                        updateText(selectedItemId!, {
                          rotation: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-7 text-xs w-14 text-center tabular-nums rounded-lg"
                    />
                    <span className="text-[11px] text-muted-foreground">°</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() =>
                        updateText(selectedItemId!, {
                          rotation: selectedText.rotation + 15,
                        })
                      }
                    >
                      <RotateCw className="h-3 w-3" />
                    </Button>
                  </div>

                  <Divider />

                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 gap-1.5 shrink-0 rounded-lg"
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

            {/* Eraser selected element in select mode */}
            {selectedItemId &&
              selectedItemType === "eraser" &&
              activeTool === "select" && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 gap-1.5 shrink-0"
                  onClick={() => {
                    usePdfEditorStore.getState().removeEraser(selectedItemId);
                    setSelectedItem(null, null);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                  Удалить мазок
                </Button>
              )}
          </div>
        </div>
      )}

      {/* Text edit sidebar */}
      <TextEditSidebar
        open={textSidebar.open}
        mode={textSidebar.mode}
        initialData={textSidebar.initialData}
        onClose={() => setTextSidebar((prev) => ({ ...prev, open: false }))}
        onSave={handleTextSidebarSave}
      />

      {/* Delete page confirmation dialog */}
      <AlertDialog
        open={deletePageDialogOpen}
        onOpenChange={setDeletePageDialogOpen}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Удалить страницу {currentPage}?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Страница будет исключена из экспортируемого PDF. Вы можете
              восстановить её позже из панели миниатюр или отменить действие
              (Ctrl+Z).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-primary text-white font-medium hover:bg-terracotta-dark"
              onClick={() => {
                deletePage(currentPage);
                setDeletePageDialogOpen(false);
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-border/60 shrink-0" />;
}
