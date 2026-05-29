import { create } from "zustand";

export interface StampItem {
  id: string;
  type: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  rotation: number;
  opacity: number;
  canvasWidth: number;  // overlay width at time of placement
  canvasHeight: number; // overlay height at time of placement
}

export interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  page: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  rotation: number;
  canvasWidth: number;  // overlay width at time of placement
  canvasHeight: number; // overlay height at time of placement
}

export interface EraserPoint {
  x: number;
  y: number;
}

export interface EraserItem {
  id: string;
  points: EraserPoint[]; // freehand brush path
  strokeWidth: number;   // brush size
  color: string;         // usually white
  page: number;
  canvasWidth: number;
  canvasHeight: number;
}

export type ToolMode = "select" | "stamp" | "text" | "eraser";

export interface CustomStamp {
  id: string;
  name: string;
  dataUrl: string; // base64 data URL of the uploaded image
}

// Available fonts for text tool
// Each font has: name (display), css (for canvas rendering), pdfLib (for StandardFonts mapping)
export const AVAILABLE_FONTS = [
  { id: "Arial", name: "Arial", css: "Arial, Helvetica, sans-serif", pdfLib: "Helvetica" },
  { id: "TimesNewRoman", name: "Times New Roman", css: "'Times New Roman', Times, serif", pdfLib: "TimesRoman" },
  { id: "Courier", name: "Courier New", css: "'Courier New', Courier, monospace", pdfLib: "Courier" },
  { id: "Georgia", name: "Georgia", css: "Georgia, serif", pdfLib: "TimesRoman" },
  { id: "Verdana", name: "Verdana", css: "Verdana, Geneva, sans-serif", pdfLib: "Helvetica" },
  { id: "Tahoma", name: "Tahoma", css: "Tahoma, Geneva, sans-serif", pdfLib: "Helvetica" },
  { id: "TrebuchetMS", name: "Trebuchet MS", css: "'Trebuchet MS', Helvetica, sans-serif", pdfLib: "Helvetica" },
  { id: "Impact", name: "Impact", css: "Impact, Charcoal, sans-serif", pdfLib: "Helvetica" },
] as const;

export type FontId = (typeof AVAILABLE_FONTS)[number]["id"];

// Map font ID to css font-family string
export function getFontCss(fontId: string): string {
  const font = AVAILABLE_FONTS.find((f) => f.id === fontId);
  return font ? font.css : "Arial, Helvetica, sans-serif";
}

// Map font ID to pdf-lib StandardFonts font name
export function getFontPdfLib(fontId: string): string {
  const font = AVAILABLE_FONTS.find((f) => f.id === fontId);
  return font ? font.pdfLib : "Helvetica";
}

interface PdfEditorState {
  // PDF file
  pdfFile: File | null;
  pdfArrayBuffer: ArrayBuffer | null;
  pdfFileName: string;
  totalPages: number;
  currentPage: number;
  pageScale: number; // auto-calculated scale from zoom
  zoomLevel: number; // user zoom: 0.5 = 50%, 1 = fit, 1.5 = 150%, etc.

  // Tool state
  activeTool: ToolMode;
  selectedStampType: string | null;
  selectedStampSrc: string | null;

  // Placed items
  stamps: StampItem[];
  texts: TextItem[];
  erasers: EraserItem[];

  // Selected item for editing
  selectedItemId: string | null;
  selectedItemType: "stamp" | "text" | "eraser" | null;

  // Text tool settings
  textSettings: {
    fontSize: number;
    color: string;
    fontFamily: string;
    bold: boolean;
    italic: boolean;
  };

  // Preset text for one-click placement
  presetText: string | null;

  // Eraser tool settings
  eraserSettings: {
    brushSize: number;
    color: string;
  };

  // Custom stamps uploaded by user
  customStamps: CustomStamp[];

  // Actions
  setPdfFile: (file: File | null) => void;
  setPdfArrayBuffer: (buffer: ArrayBuffer | null) => void;
  setTotalPages: (pages: number) => void;
  setCurrentPage: (page: number) => void;
  setPageScale: (scale: number) => void;
  setZoomLevel: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomFit: () => void;
  setActiveTool: (tool: ToolMode) => void;
  setSelectedStamp: (type: string, src: string) => void;
  addStamp: (stamp: StampItem) => void;
  updateStamp: (id: string, updates: Partial<StampItem>) => void;
  removeStamp: (id: string) => void;
  addText: (text: TextItem) => void;
  updateText: (id: string, updates: Partial<TextItem>) => void;
  removeText: (id: string) => void;
  addEraser: (eraser: EraserItem) => void;
  updateEraser: (id: string, updates: Partial<EraserItem>) => void;
  removeEraser: (id: string) => void;
  setSelectedItem: (id: string | null, type: "stamp" | "text" | "eraser" | null) => void;
  setTextSettings: (settings: Partial<PdfEditorState["textSettings"]>) => void;
  setPresetText: (text: string | null) => void;
  setEraserSettings: (settings: Partial<PdfEditorState["eraserSettings"]>) => void;
  addCustomStamp: (stamp: CustomStamp) => void;
  removeCustomStamp: (id: string) => void;
  reset: () => void;
}

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3.0;

const initialState = {
  pdfFile: null,
  pdfArrayBuffer: null,
  pdfFileName: "",
  totalPages: 0,
  currentPage: 1,
  pageScale: 1.0,
  zoomLevel: 0.5,
  activeTool: "select" as ToolMode,
  selectedStampType: null,
  selectedStampSrc: null,
  stamps: [],
  texts: [],
  erasers: [],
  selectedItemId: null,
  selectedItemType: null as "stamp" | "text" | "eraser" | null,
  textSettings: {
    fontSize: 28,
    color: "#000000",
    fontFamily: "Arial",
    bold: false,
    italic: false,
  },
  presetText: null,
  eraserSettings: {
    brushSize: 20,
    color: "#FFFFFF",
  },
  customStamps: [],
};

export const usePdfEditorStore = create<PdfEditorState>((set, get) => ({
  ...initialState,

  setPdfFile: (file) =>
    set({
      pdfFile: file,
      pdfFileName: file?.name ?? "",
      stamps: [],
      texts: [],
      erasers: [],
      selectedItemId: null,
      selectedItemType: null,
      currentPage: 1,
      zoomLevel: 0.5,
    }),

  setPdfArrayBuffer: (buffer) => set({ pdfArrayBuffer: buffer }),
  setTotalPages: (pages) => set({ totalPages: pages }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setPageScale: (scale) => set({ pageScale: scale }),
  setZoomLevel: (zoom) =>
    set({ zoomLevel: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) }),
  zoomIn: () =>
    set({ zoomLevel: Math.min(ZOOM_MAX, get().zoomLevel + ZOOM_STEP) }),
  zoomOut: () =>
    set({ zoomLevel: Math.max(ZOOM_MIN, get().zoomLevel - ZOOM_STEP) }),
  zoomFit: () => set({ zoomLevel: 1.0 }),

  setActiveTool: (tool) => set({ activeTool: tool, presetText: tool !== "text" ? null : undefined }),
  setSelectedStamp: (type, src) =>
    set({ selectedStampType: type, selectedStampSrc: src, activeTool: "stamp" }),

  addStamp: (stamp) =>
    set((state) => ({ stamps: [...state.stamps, stamp] })),

  updateStamp: (id, updates) =>
    set((state) => ({
      stamps: state.stamps.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  removeStamp: (id) =>
    set((state) => ({
      stamps: state.stamps.filter((s) => s.id !== id),
      selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
      selectedItemType:
        state.selectedItemId === id ? null : state.selectedItemType,
    })),

  addText: (text) =>
    set((state) => ({ texts: [...state.texts, text] })),

  updateText: (id, updates) =>
    set((state) => ({
      texts: state.texts.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  removeText: (id) =>
    set((state) => ({
      texts: state.texts.filter((t) => t.id !== id),
      selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
      selectedItemType:
        state.selectedItemId === id ? null : state.selectedItemType,
    })),

  addEraser: (eraser) =>
    set((state) => ({ erasers: [...state.erasers, eraser] })),

  updateEraser: (id, updates) =>
    set((state) => ({
      erasers: state.erasers.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  removeEraser: (id) =>
    set((state) => ({
      erasers: state.erasers.filter((e) => e.id !== id),
      selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
      selectedItemType:
        state.selectedItemId === id ? null : state.selectedItemType,
    })),

  setSelectedItem: (id, type) =>
    set({ selectedItemId: id, selectedItemType: type }),

  setTextSettings: (settings) =>
    set((state) => ({
      textSettings: { ...state.textSettings, ...settings },
    })),

  setPresetText: (text) => set({ presetText: text }),

  setEraserSettings: (settings) =>
    set((state) => ({
      eraserSettings: { ...state.eraserSettings, ...settings },
    })),

  addCustomStamp: (stamp) =>
    set((state) => ({ customStamps: [...state.customStamps, stamp] })),

  removeCustomStamp: (id) =>
    set((state) => ({
      customStamps: state.customStamps.filter((s) => s.id !== id),
    })),

  reset: () => set(initialState),
}));
