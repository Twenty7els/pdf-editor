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
  hidden?: boolean;
  canvasWidth: number;  // overlay width at time of placement
  canvasHeight: number; // overlay height at time of placement
}

export type TextAlign = "left" | "center" | "right";

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
  underline: boolean;
  align: TextAlign;
  letterSpacing: number; // in pixels (canvas space)
  rotation: number;
  hidden?: boolean;
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
  hidden?: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

export type ToolMode = "select" | "stamp" | "text" | "eraser";

export interface CustomStamp {
  id: string;
  name: string;
  dataUrl: string; // base64 data URL of the uploaded image
}

// History snapshot — captures all document state for undo/redo
export interface HistorySnapshot {
  stamps: StampItem[];
  texts: TextItem[];
  erasers: EraserItem[];
  pageRotations: Record<number, number>;
  // Fine per-page skew compensation in degrees (−15…15, step 0.5) —
  // straightens crooked scans on screen; items are compensated on export
  pageSkew: Record<number, number>;
  deletedPages: number[];
  selectedItemId: string | null;
  selectedItemType: "stamp" | "text" | "eraser" | null;
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

// Map font ID to css font-family string
export function getFontCss(fontId: string): string {
  const font = AVAILABLE_FONTS.find((f) => f.id === fontId);
  return font ? font.css : "Arial, Helvetica, sans-serif";
}

// Helper to create a history snapshot from current state
function snapshot(s: PdfEditorState): HistorySnapshot {
  return {
    stamps: s.stamps.map((st) => ({ ...st })),
    texts: s.texts.map((t) => ({ ...t })),
    erasers: s.erasers.map((e) => ({ ...e, points: e.points.map((p) => ({ ...p })) })),
    pageRotations: { ...s.pageRotations },
    pageSkew: { ...s.pageSkew },
    deletedPages: [...s.deletedPages],
    selectedItemId: s.selectedItemId,
    selectedItemType: s.selectedItemType,
  };
}

const MAX_HISTORY = 50;

interface PdfEditorState {
  // PDF file
  pdfFile: File | null;
  pdfArrayBuffer: ArrayBuffer | null;
  pdfFileName: string;
  totalPages: number;
  currentPage: number;
  zoomLevel: number; // 1.0 = 100% (real PDF size, 1pt = 1px)

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

  // Page rotations (page number → 0/90/180/270)
  pageRotations: Record<number, number>;
  // Per-page skew compensation (page number → −15…15 degrees, 0.5 step)
  pageSkew: Record<number, number>;
  // Deleted page numbers
  deletedPages: number[];
  // Export selection — null = all pages, array = specific pages
  exportPageSelection: number[] | null;

  // History stacks
  past: HistorySnapshot[];
  future: HistorySnapshot[];

  // Text tool settings (defaults for new text)
  textSettings: {
    fontSize: number;
    color: string;
    fontFamily: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    align: TextAlign;
    letterSpacing: number;
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
  setZoomLevel: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomFit: () => void;
  setActiveTool: (tool: ToolMode) => void;
  setSelectedStamp: (type: string, src: string) => void;
  addStamp: (stamp: StampItem) => void;
  updateStamp: (id: string, updates: Partial<StampItem>) => void;
  // Silent variant for slider drags — history pushed separately via pushHistory
  updateStampLive: (id: string, updates: Partial<StampItem>) => void;
  removeStamp: (id: string) => void;
  addText: (text: TextItem) => void;
  updateText: (id: string, updates: Partial<TextItem>) => void;
  removeText: (id: string) => void;
  addEraser: (eraser: EraserItem) => void;
  updateEraser: (id: string, updates: Partial<EraserItem>) => void;
  removeEraser: (id: string) => void;
  setSelectedItem: (id: string | null, type: "stamp" | "text" | "eraser" | null) => void;
  toggleItemHidden: (id: string, type: "stamp" | "text" | "eraser") => void;
  setTextSettings: (settings: Partial<PdfEditorState["textSettings"]>) => void;
  setPresetText: (text: string | null) => void;
  setEraserSettings: (settings: Partial<PdfEditorState["eraserSettings"]>) => void;
  addCustomStamp: (stamp: CustomStamp) => void;
  removeCustomStamp: (id: string) => void;
  // Page-level actions (history-tracked)
  rotatePage: (pageNum: number) => void;
  // Set fine skew compensation for a page (degrees, −15…15, rounded to 0.5)
  setPageSkew: (pageNum: number, deg: number) => void;
  // Silent variant for slider drags — history entry is pushed separately via pushHistory at drag start
  setPageSkewLive: (pageNum: number, deg: number) => void;
  // Push a snapshot of the CURRENT state onto the undo stack (call BEFORE a live change)
  pushHistory: () => void;
  deletePage: (pageNum: number) => void;
  undeletePage: (pageNum: number) => void;
  // Bulk page deletion/restoration — ONE history entry for the whole batch
  setPagesDeleted: (pageNums: number[], deleted: boolean) => void;
  // Selection-only actions (history-tracked)
  duplicateSelectedItem: () => void;
  // Undo/redo
  undo: () => void;
  redo: () => void;
  // Export selection
  setExportPageSelection: (pages: number[] | null) => void;
  reset: () => void;
}

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 5.0;

const initialState = {
  pdfFile: null,
  pdfArrayBuffer: null,
  pdfFileName: "",
  totalPages: 0,
  currentPage: 1,
  zoomLevel: 1.0,
  activeTool: "select" as ToolMode,
  selectedStampType: null,
  selectedStampSrc: null,
  stamps: [],
  texts: [],
  erasers: [],
  selectedItemId: null,
  selectedItemType: null as "stamp" | "text" | "eraser" | null,
  pageRotations: {} as Record<number, number>,
  pageSkew: {} as Record<number, number>,
  deletedPages: [] as number[],
  exportPageSelection: null as number[] | null,
  past: [] as HistorySnapshot[],
  future: [] as HistorySnapshot[],
  textSettings: {
    fontSize: 14,
    color: "#000000",
    fontFamily: "Arial",
    bold: false,
    italic: false,
    underline: false,
    align: "left" as TextAlign,
    letterSpacing: 0,
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
      zoomLevel: 1.0,
      pageRotations: {},
      pageSkew: {},
      deletedPages: [],
      exportPageSelection: null,
      past: [],
      future: [],
    }),

  setPdfArrayBuffer: (buffer) => set({ pdfArrayBuffer: buffer }),
  setTotalPages: (pages) => set({ totalPages: pages }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setZoomLevel: (zoom) =>
    set({ zoomLevel: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) }),
  zoomIn: () =>
    set({ zoomLevel: Math.min(ZOOM_MAX, get().zoomLevel + ZOOM_STEP) }),
  zoomOut: () =>
    set({ zoomLevel: Math.max(ZOOM_MIN, get().zoomLevel - ZOOM_STEP) }),
  zoomFit: () => set({ zoomLevel: 1.0 }),

  setActiveTool: (tool) =>
    set((state) => ({
      activeTool: tool,
      // Reset preset when leaving the text tool (spread avoids setting undefined)
      ...(tool !== "text" && state.presetText !== null ? { presetText: null } : {}),
    })),
  setSelectedStamp: (type, src) =>
    set({ selectedStampType: type, selectedStampSrc: src, activeTool: "stamp" }),

  addStamp: (stamp) =>
    set((state) => {
      const snap = snapshot(state);
      return {
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        stamps: [...state.stamps, stamp],
      };
    }),

  updateStamp: (id, updates) =>
    set((state) => {
      // Only push history if any stamp actually changes
      const target = state.stamps.find((s) => s.id === id);
      if (!target) return state;
      const snap = snapshot(state);
      return {
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        stamps: state.stamps.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      };
    }),

  updateStampLive: (id, updates) =>
    set((state) => ({
      stamps: state.stamps.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  removeStamp: (id) =>
    set((state) => {
      const snap = snapshot(state);
      return {
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        stamps: state.stamps.filter((s) => s.id !== id),
        selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
        selectedItemType:
          state.selectedItemId === id ? null : state.selectedItemType,
      };
    }),

  addText: (text) =>
    set((state) => {
      const snap = snapshot(state);
      return {
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        texts: [...state.texts, text],
      };
    }),

  updateText: (id, updates) =>
    set((state) => {
      const target = state.texts.find((t) => t.id === id);
      if (!target) return state;
      const snap = snapshot(state);
      return {
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        texts: state.texts.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      };
    }),

  removeText: (id) =>
    set((state) => {
      const snap = snapshot(state);
      return {
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        texts: state.texts.filter((t) => t.id !== id),
        selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
        selectedItemType:
          state.selectedItemId === id ? null : state.selectedItemType,
      };
    }),

  addEraser: (eraser) =>
    set((state) => {
      const snap = snapshot(state);
      return {
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        erasers: [...state.erasers, eraser],
      };
    }),

  updateEraser: (id, updates) =>
    set((state) => {
      const target = state.erasers.find((e) => e.id === id);
      if (!target) return state;
      const snap = snapshot(state);
      return {
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        erasers: state.erasers.map((e) =>
          e.id === id ? { ...e, ...updates } : e
        ),
      };
    }),

  removeEraser: (id) =>
    set((state) => {
      const snap = snapshot(state);
      return {
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        erasers: state.erasers.filter((e) => e.id !== id),
        selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
        selectedItemType:
          state.selectedItemId === id ? null : state.selectedItemType,
      };
    }),

  setSelectedItem: (id, type) =>
    set({ selectedItemId: id, selectedItemType: type }),

  toggleItemHidden: (id, type) =>
    set((state) => {
      const snap = snapshot(state);
      if (type === "stamp") {
        return {
          past: [...state.past, snap].slice(-MAX_HISTORY),
          future: [],
          stamps: state.stamps.map((s) =>
            s.id === id ? { ...s, hidden: !s.hidden } : s
          ),
        };
      }
      if (type === "text") {
        return {
          past: [...state.past, snap].slice(-MAX_HISTORY),
          future: [],
          texts: state.texts.map((t) =>
            t.id === id ? { ...t, hidden: !t.hidden } : t
          ),
        };
      }
      return {
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        erasers: state.erasers.map((e) =>
          e.id === id ? { ...e, hidden: !e.hidden } : e
        ),
      };
    }),

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

  rotatePage: (pageNum) =>
    set((state) => {
      const snap = snapshot(state);
      const current = state.pageRotations[pageNum] || 0;
      const next = (current + 90) % 360;
      const newRotations = { ...state.pageRotations };
      if (next === 0) {
        delete newRotations[pageNum];
      } else {
        newRotations[pageNum] = next;
      }
      return {
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        pageRotations: newRotations,
      };
    }),

  setPageSkew: (pageNum, deg) =>
    set((state) => {
      // Round to 0.5° steps, clamp to ±15
      const next = Math.max(-15, Math.min(15, Math.round(deg * 2) / 2));
      const current = state.pageSkew[pageNum] || 0;
      if (current === next) return state;
      const snap = snapshot(state);
      const newSkew = { ...state.pageSkew };
      if (next === 0) {
        delete newSkew[pageNum];
      } else {
        newSkew[pageNum] = next;
      }
      return {
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        pageSkew: newSkew,
      };
    }),

  setPageSkewLive: (pageNum, deg) =>
    set((state) => {
      const next = Math.max(-15, Math.min(15, Math.round(deg * 2) / 2));
      const current = state.pageSkew[pageNum] || 0;
      if (current === next) return state;
      const newSkew = { ...state.pageSkew };
      if (next === 0) {
        delete newSkew[pageNum];
      } else {
        newSkew[pageNum] = next;
      }
      return { pageSkew: newSkew };
    }),

  pushHistory: () =>
    set((state) => ({
      past: [...state.past, snapshot(state)].slice(-MAX_HISTORY),
      future: [],
    })),

  deletePage: (pageNum) =>
    set((state) => {
      if (state.deletedPages.includes(pageNum)) return state;
      const snap = snapshot(state);
      const newDeleted = [...state.deletedPages, pageNum];
      // If current page is deleted, move to next non-deleted page
      let newCurrent = state.currentPage;
      if (state.currentPage === pageNum) {
        const totalPages = state.totalPages;
        let next = state.currentPage + 1;
        while (next <= totalPages && newDeleted.includes(next)) next++;
        if (next > totalPages) {
          // try previous
          next = state.currentPage - 1;
          while (next >= 1 && newDeleted.includes(next)) next--;
          if (next < 1) next = 1;
        }
        newCurrent = Math.max(1, next);
      }
      return {
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        deletedPages: newDeleted,
        currentPage: newCurrent,
      };
    }),

  undeletePage: (pageNum) =>
    set((state) => {
      if (!state.deletedPages.includes(pageNum)) return state;
      const snap = snapshot(state);
      return {
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        deletedPages: state.deletedPages.filter((p) => p !== pageNum),
      };
    }),

  setPagesDeleted: (pageNums, deleted) =>
    set((state) => {
      const targets = deleted
        ? pageNums.filter((p) => !state.deletedPages.includes(p))
        : pageNums.filter((p) => state.deletedPages.includes(p));
      if (targets.length === 0) return state;
      const snap = snapshot(state);
      const newDeleted = deleted
        ? [...state.deletedPages, ...targets]
        : state.deletedPages.filter((p) => !targets.includes(p));
      // If current page became deleted, move to nearest non-deleted page
      let newCurrent = state.currentPage;
      if (deleted && newDeleted.includes(state.currentPage)) {
        let next = state.currentPage + 1;
        while (next <= state.totalPages && newDeleted.includes(next)) next++;
        if (next > state.totalPages) {
          next = state.currentPage - 1;
          while (next >= 1 && newDeleted.includes(next)) next--;
          if (next < 1) next = 1;
        }
        newCurrent = Math.max(1, next);
      }
      return {
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        deletedPages: newDeleted,
        currentPage: newCurrent,
      };
    }),

  duplicateSelectedItem: () => {
    const state = get();
    if (!state.selectedItemId || !state.selectedItemType) return;
    const snap = snapshot(state);
    const newId = (prefix: string) =>
      `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    if (state.selectedItemType === "stamp") {
      const orig = state.stamps.find((s) => s.id === state.selectedItemId);
      if (!orig) return;
      const copy: StampItem = {
        ...orig,
        id: newId("stamp"),
        x: orig.x + 20,
        y: orig.y + 20,
      };
      set({
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        stamps: [...state.stamps, copy],
        selectedItemId: copy.id,
      });
    } else if (state.selectedItemType === "text") {
      const orig = state.texts.find((t) => t.id === state.selectedItemId);
      if (!orig) return;
      const copy: TextItem = {
        ...orig,
        id: newId("text"),
        x: orig.x + 20,
        y: orig.y + 20,
      };
      set({
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        texts: [...state.texts, copy],
        selectedItemId: copy.id,
      });
    } else if (state.selectedItemType === "eraser") {
      const orig = state.erasers.find((e) => e.id === state.selectedItemId);
      if (!orig) return;
      const copy: EraserItem = {
        ...orig,
        id: newId("eraser"),
        points: orig.points.map((p) => ({ x: p.x + 20, y: p.y + 20 })),
      };
      set({
        past: [...state.past, snap].slice(-MAX_HISTORY),
        future: [],
        erasers: [...state.erasers, copy],
        selectedItemId: copy.id,
      });
    }
  },

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const current = snapshot(state);
      return {
        ...previous,
        past: state.past.slice(0, -1),
        future: [...state.future, current],
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[state.future.length - 1];
      const current = snapshot(state);
      return {
        ...next,
        past: [...state.past, current],
        future: state.future.slice(0, -1),
      };
    }),

  setExportPageSelection: (pages) => set({ exportPageSelection: pages }),

  reset: () => set(initialState),
}));
