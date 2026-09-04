"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePdfEditorStore } from "@/store/pdf-editor-store";
import PdfCanvas from "@/components/pdf-editor/PdfCanvas";
import Toolbar from "@/components/pdf-editor/Toolbar";
import LayersPanel from "@/components/pdf-editor/LayersPanel";
import UploadZone from "@/components/pdf-editor/UploadZone";
import ExportDialog from "@/components/pdf-editor/ExportDialog";
import DocAutofillApp from "@/components/doc-autofill/DocAutofillApp";
import ModeChooser from "@/components/home/ModeChooser";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Menu,
  LogOut,
  FileText,
  ShieldCheck,
  Lock,
  ArrowRight,
  FileStack,
  PenLine,
} from "lucide-react";
import {
  checkPassword,
  isAuthenticated,
  setAuthenticated,
  logout,
} from "@/lib/auth";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : null;
}

/* ============================================================
   Export geometry helpers
   ------------------------------------------------------------
   Items are stored in "view space" — the coordinate system of
   the rotated page as shown on screen (top-left origin, y down).
   The exported PDF page keeps an unrotated mediabox and gets a
   /Rotate entry, so every point and angle must be transformed.
   ============================================================ */

interface PageSize {
  width: number;
  height: number;
}

/** Display (view) dimensions in points for a page rotated T degrees CW. */
function getViewDims(T: number, size: PageSize): PageSize {
  const swap = T === 90 || T === 270;
  return swap
    ? { width: size.height, height: size.width }
    : { width: size.width, height: size.height };
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    setError("");

    const valid = await checkPassword(password);
    if (valid) {
      setAuthenticated();
      onLogin();
    } else {
      setError("Неверный пароль");
      setPassword("");
      inputRef.current?.focus();
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center aurora-bg dot-bg p-4 relative overflow-hidden grain">
      {/* Ambient corner glows */}
      <div
        aria-hidden
        className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-terracotta/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#7d9b76]/10 blur-3xl pointer-events-none"
      />

      <div className="w-full max-w-md relative">
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-7 mb-10 stagger-item">
          <div className="relative">
            <div className="h-20 w-20 rounded-[1.4rem] bg-ink flex items-center justify-center shadow-elevated">
              <FileText
                className="h-9 w-9 text-white"
                strokeWidth={1.6}
                fill="rgba(217,119,87,0.35)"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-terracotta ring-4 ring-background" />
          </div>
          <div className="text-center">
            <h1 className="display-title text-[2.6rem] text-balance">
              PDF{" "}
              <span className="text-terracotta-dark">Редактор</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-[17rem] text-balance leading-relaxed">
              Печати, подписи и текст на документах — прямо в браузере
            </p>
          </div>
        </div>

        {/* Login card */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 bg-card rounded-2xl p-7 border border-border shadow-elevated stagger-item"
          style={{ "--stagger-delay": "90ms" } as React.CSSProperties}
        >
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Пароль
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                id="password"
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Введите пароль"
                className="w-full h-12 py-3.5 pl-11 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary transition-all placeholder:text-muted-foreground/60"
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 animate-fade-in"
              role="alert"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
              <p className="text-xs font-medium text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-sm font-medium rounded-xl bg-ink hover:bg-ink-hover text-white transition-colors shadow-soft disabled:bg-ink/25"
            disabled={isLoading || !password.trim()}
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Проверка...
              </>
            ) : (
              <>
                Войти
                <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </form>

        {/* Trust badge */}
        <div
          className="flex items-center justify-center mt-6 text-xs text-muted-foreground stagger-item"
          style={{ "--stagger-delay": "180ms" } as React.CSSProperties}
        >
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border/60 shadow-soft">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Защищённый доступ · SHA-256</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const {
    pdfFile,
    pdfArrayBuffer,
    stamps,
    texts,
    erasers,
    pdfFileName,
    currentPage,
    totalPages,
    setPdfFile,
  } = usePdfEditorStore();

  const [authenticated, setAuthenticatedState] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  // Режим приложения: главный выбор / редактор PDF / автозаполнение документов.
  // Всегда начинаем с большого выбора на главной странице.
  const [appMode, setAppMode] = useState<"home" | "pdf" | "docs">("home");

  const switchMode = useCallback((mode: "pdf" | "docs") => {
    setAppMode(mode);
  }, []);

  const goHome = useCallback(() => {
    setAppMode("home");
  }, []);

  useEffect(() => {
    if (isAuthenticated()) {
      setAuthenticatedState(true);
    }
  }, []);

  const handleLogin = useCallback(() => {
    setAuthenticatedState(true);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setAuthenticatedState(false);
    usePdfEditorStore.getState().reset();
  }, []);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type === "application/pdf") {
        setPdfFile(file);
        toast.success("PDF загружен", {
          description: file.name,
        });
      } else {
        toast.error("Пожалуйста, выберите PDF файл");
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [setPdfFile]
  );

  const handleDownload = useCallback(async () => {
    if (!pdfArrayBuffer || isDownloading) return;

    setIsDownloading(true);
    const loadingToast = toast.loading("Подготовка PDF...");

    try {
      const { PDFDocument, rgb, degrees, LineCapStyle } = await import("pdf-lib");

      const pdfDoc = await PDFDocument.load(pdfArrayBuffer);

      const fontkit = (await import("@pdf-lib/fontkit")).default;
      pdfDoc.registerFontkit(fontkit);

      // Read document-level state from store
      const state = usePdfEditorStore.getState();
      const { pageRotations, pageSkew, deletedPages, exportPageSelection } = state;

      // Determine which pages (1-indexed) to keep in the export
      const pageCount = pdfDoc.getPageCount();
      const pagesToKeep: number[] = [];
      for (let p = 1; p <= pageCount; p++) {
        if (deletedPages.includes(p)) continue;
        if (exportPageSelection !== null && !exportPageSelection.includes(p))
          continue;
        pagesToKeep.push(p);
      }
      const keepSet = new Set(pagesToKeep);

      // Items actually included in the export (visible & on kept pages)
      const exportedStamps = stamps.filter(
        (s) => !s.hidden && keepSet.has(s.page)
      );
      const exportedTexts = texts.filter(
        (t) => !t.hidden && keepSet.has(t.page) && t.text.trim()
      );
      const exportedErasers = erasers.filter(
        (e) => !e.hidden && keepSet.has(e.page) && e.points.length > 0
      );

      // Apply page rotations to kept pages BEFORE drawing items
      for (const pageNum of pagesToKeep) {
        const userRotation = pageRotations[pageNum] || 0;
        if (userRotation !== 0) {
          const page = pdfDoc.getPage(pageNum - 1);
          const existing = page.getRotation().angle || 0;
          const total = (((existing + userRotation) % 360) + 360) % 360;
          page.setRotation(degrees(total));
        }
      }

      let unicodeFonts: {
        regular: unknown;
        bold: unknown;
        italic: unknown;
        boldItalic: unknown;
      } | null = null;
      const getUnicodeFonts = async () => {
        if (unicodeFonts) return unicodeFonts;
        const {
          NOTO_SANS_REGULAR,
          NOTO_SANS_BOLD,
          NOTO_SANS_ITALIC,
          NOTO_SANS_BOLD_ITALIC,
        } = await import("@/lib/font-base64");
        const decode = (b64: string) =>
          new Uint8Array(atob(b64).split("").map((c) => c.charCodeAt(0)));
        unicodeFonts = {
          regular: await pdfDoc.embedFont(decode(NOTO_SANS_REGULAR)),
          bold: await pdfDoc.embedFont(decode(NOTO_SANS_BOLD)),
          italic: await pdfDoc.embedFont(decode(NOTO_SANS_ITALIC)),
          boldItalic: await pdfDoc.embedFont(decode(NOTO_SANS_BOLD_ITALIC)),
        };
        return unicodeFonts;
      };

      /**
       * Convert a point from view space (top-left origin, y down, points)
       * to PDF space (bottom-left origin, y up) for a page with total
       * rotation T. `dims` = unrotated mediabox {width W, height H},
       * `Wv`/`Hv` = rotated view dimensions.
       */
      const viewPointToPdf = (
        vx: number,
        vy: number,
        T: number,
        H: number,
        Wv: number,
        Hv: number
      ): { x: number; y: number } => {
        let px: number;
        let py: number;
        switch (T) {
          case 90:
            px = vy;
            py = Wv - vx;
            break;
          case 180:
            px = Wv - vx;
            py = Hv - vy;
            break;
          case 270:
            px = Hv - vy;
            py = vx;
            break;
          default:
            px = vx;
            py = vy;
        }
        return { x: px, y: H - py };
      };

      /**
       * Skew compensation geometry.
       *
       * On screen the user sees the page deskewed by `skew` degrees
       * (fine rotation applied on top of the 90° view rotation T) and
       * places items in THAT view. The exported page keeps /Rotate = T,
       * so every view point must be rotated back about the center into
       * display space D (the T-rotated page), and every item angle must
       * gain the skew compensation.
       *
       * V (bbox Wρ×Hρ) = D (Wv×Hv) rotated visually CW by skew →
       *   p_D = R_cw(−skew) · (p_V − c_V) + c_D
       *   angle_D = angle_V − skew   (canvas CW convention)
       */
      const makeSkewGeometry = (
        skewDeg: number,
        Wv: number,
        Hv: number
      ) => {
        if (!skewDeg) {
          return {
            Wrho: Wv,
            Hrho: Hv,
            toDisplay: (vx: number, vy: number) => ({ vx, vy }),
            angleShift: 0,
          };
        }
        const rad = (skewDeg * Math.PI) / 180;
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        const Wrho = Wv * Math.abs(c) + Hv * Math.abs(s);
        const Hrho = Wv * Math.abs(s) + Hv * Math.abs(c);
        return {
          Wrho,
          Hrho,
          toDisplay: (vx: number, vy: number) => {
            const dx = vx - Wrho / 2;
            const dy = vy - Hrho / 2;
            return {
              vx: dx * c + dy * s + Wv / 2,
              vy: -dx * s + dy * c + Hv / 2,
            };
          },
          angleShift: skewDeg,
        };
      };

      /** Кэш встроенных картинок: каждое уникальное изображение штампа
       *  встраивается один раз (иначе дубли XObject раздували файл). */
      const stampImageCache = new Map<
        string,
        import("pdf-lib").PDFImage
      >();

      // Stamps — skip if page not in keepSet
      for (const stamp of exportedStamps) {
        try {
          const page = pdfDoc.getPage(stamp.page - 1);
          const { width: pageWidth, height: pageHeight } = page.getSize();

          // /Rotate уже включает пользовательский поворот (применён выше),
          // повторное сложение давало T = intrinsic + 2·user и съезжающие предметы.
          const T = (((page.getRotation().angle || 0) % 360) + 360) % 360;
          const { width: Wv, height: Hv } = getViewDims(T, {
            width: pageWidth,
            height: pageHeight,
          });
          const skew = pageSkew[stamp.page] || 0;
          const { Wrho, Hrho, toDisplay, angleShift } = makeSkewGeometry(
            skew,
            Wv,
            Hv
          );

          const cw = stamp.canvasWidth || Wv;
          const ch = stamp.canvasHeight || Hv;

          // Item size in view points
          const pw = (stamp.width / cw) * Wrho;
          const ph = (stamp.height / ch) * Hrho;

          // Item center in view space → display space → PDF space
          const cvx = ((stamp.x + stamp.width / 2) / cw) * Wrho;
          const cvy = ((stamp.y + stamp.height / 2) / ch) * Hrho;
          const display = toDisplay(cvx, cvy);
          const center = viewPointToPdf(
            display.vx,
            display.vy,
            T,
            pageHeight,
            Wv,
            Hv
          );

          // pdf-lib rotates CCW; canvas rotation is CW → invert,
          // account for the page's own /Rotate T and the skew compensation.
          const phiDeg = T - stamp.rotation + angleShift;
          const rad = (phiDeg * Math.PI) / 180;

          let image = stampImageCache.get(stamp.src);
          if (!image) {
            try {
              const response = await fetch(stamp.src);
              const imageBytes = new Uint8Array(await response.arrayBuffer());
              try {
                image = await pdfDoc.embedPng(imageBytes);
              } catch {
                image = await pdfDoc.embedJpg(imageBytes);
              }
              stampImageCache.set(stamp.src, image);
            } catch (embedErr) {
              console.error("Could not embed stamp image, skipping", embedErr);
              continue;
            }
          }

          // На экране картинка вписана в свой бокс с сохранением пропорций
          // (object-contain) — экспорт должен повторять это, иначе печать/подпись
          // растягиваются. Вписываем в pw×ph и центрируем.
          const fitScale = Math.min(pw / image.width, ph / image.height);
          const drawW = image.width * fitScale;
          const drawH = image.height * fitScale;

          // Anchor so the rotated image stays centered on `center`
          const adjX =
            center.x - (drawW / 2) * Math.cos(rad) + (drawH / 2) * Math.sin(rad);
          const adjY =
            center.y - (drawW / 2) * Math.sin(rad) - (drawH / 2) * Math.cos(rad);

          page.drawImage(image, {
            x: adjX,
            y: adjY,
            width: drawW,
            height: drawH,
            rotate: degrees(phiDeg),
            opacity: stamp.opacity,
          });
        } catch (err) {
          console.error("Error embedding stamp:", err);
        }
      }

      // Texts — skip if page not in keepSet
      for (const textItem of exportedTexts) {
        try {
          const page = pdfDoc.getPage(textItem.page - 1);
          const { width: pageWidth, height: pageHeight } = page.getSize();

          // /Rotate уже включает пользовательский поворот — см. комментарий выше.
          const T = (((page.getRotation().angle || 0) % 360) + 360) % 360;
          const { width: Wv, height: Hv } = getViewDims(T, {
            width: pageWidth,
            height: pageHeight,
          });
          const skew = pageSkew[textItem.page] || 0;
          const { Wrho, Hrho, toDisplay, angleShift } = makeSkewGeometry(
            skew,
            Wv,
            Hv
          );

          const cw = textItem.canvasWidth || Wv;
          const ch = textItem.canvasHeight || Hv;

          const scaledFontSize = (textItem.fontSize / ch) * Hrho;
          const scaledLetterSpacing = (textItem.letterSpacing / cw) * Wrho;

          let font: import("pdf-lib").PDFFont;
          const uFonts = await getUnicodeFonts();
          if (textItem.bold && textItem.italic)
            font = uFonts.boldItalic as import("pdf-lib").PDFFont;
          else if (textItem.bold)
            font = uFonts.bold as import("pdf-lib").PDFFont;
          else if (textItem.italic)
            font = uFonts.italic as import("pdf-lib").PDFFont;
          else font = uFonts.regular as import("pdf-lib").PDFFont;

          const color = hexToRgb(textItem.color);
          const pdfColor = color
            ? rgb(color.r, color.g, color.b)
            : rgb(0, 0, 0);

          // Multiline support
          const lines = textItem.text.split("\n");

          // Font ascent — distance from baseline to top of glyph.
          // CSS positions text by top of line-box; glyph is centered within line-height.
          // PDF positions text by baseline. So: baseline = top + leading/2 + ascent.
          const fontAscent = font.heightAtSize(scaledFontSize, {
            descender: false,
          });
          // Line height = 1.2 * fontSize (matches canvas CSS lineHeight: 1.2)
          const scaledLineHeight = scaledFontSize * 1.2;
          const leadingHalf = (scaledLineHeight - scaledFontSize) / 2;

          // pdf-lib CCW angle that matches the canvas CW angle after page
          // rotation and skew compensation
          const phiDeg = T - textItem.rotation + angleShift;
          const phiRad = (phiDeg * Math.PI) / 180;

          // Ширины строк считаем заранее: на экране div текста имеет
          // width: fit-content (= самая широкая строка) и textAlign —
          // выравнивание каждой строки ВНУТРИ этого бокса. Экспорт обязан
          // повторять именно это, иначе center/right уезжают на полстроки.
          const hasSpacing = Math.abs(scaledLetterSpacing) > 0.001;
          const measureLine = (line: string): number => {
            if (!line) return 0;
            if (!hasSpacing) {
              return font.widthOfTextAtSize(line, scaledFontSize);
            }
            const cs = Array.from(line);
            let w = 0;
            for (const c of cs) {
              w += font.widthOfTextAtSize(c, scaledFontSize);
            }
            return w + scaledLetterSpacing * Math.max(0, cs.length - 1);
          };
          const lineWidths = lines.map(measureLine);
          const textBoxWidth = Math.max(0, ...lineWidths);

          for (let li = 0; li < lines.length; li++) {
            const line = lines[li];
            if (!line) {
              continue;
            }

            // Canvas: top of line-box = textItem.y + li * (fontSize * 1.2)
            const lineCanvasTop = textItem.y + li * textItem.fontSize * 1.2;
            const baselineViewY =
              (lineCanvasTop / ch) * Hrho + leadingHalf + fontAscent;

            // pdf-lib has no charSpacing option — emulate letter spacing by
            // drawing glyph runs per character when it is non-zero.
            const chars = hasSpacing ? Array.from(line) : null;
            const charWidths = chars
              ? chars.map((c) => font.widthOfTextAtSize(c, scaledFontSize))
              : null;
            const lineWidth = lineWidths[li];

            // Compute baseline X in view space based on alignment:
            // строка выравнивается внутри бокса шириной textBoxWidth,
            // левый край бокса = textItem.x (как fit-content div на экране).
            const baseViewX = (textItem.x / cw) * Wrho;
            const alignOffset =
              textItem.align === "center"
                ? (textBoxWidth - lineWidth) / 2
                : textItem.align === "right"
                ? textBoxWidth - lineWidth
                : 0;
            const baselineViewX = baseViewX + alignOffset;

            // Baseline start point → display space (deskew back-rotation)
            // → PDF space
            const baselineView = toDisplay(baselineViewX, baselineViewY);
            const baselinePdf = viewPointToPdf(
              baselineView.vx,
              baselineView.vy,
              T,
              pageHeight,
              Wv,
              Hv
            );

            // Treat the line box as (lineWidth × fontSize) centered on
            // baseline + fontSize/2; anchor so rotation keeps center fixed.
            const lineCenterX = baselinePdf.x + lineWidth / 2;
            const lineCenterY = baselinePdf.y + scaledFontSize / 2;
            const textAdjX =
              lineCenterX -
              (lineWidth / 2) * Math.cos(phiRad) +
              (scaledFontSize / 2) * Math.sin(phiRad);
            const textAdjY =
              lineCenterY -
              (lineWidth / 2) * Math.sin(phiRad) -
              (scaledFontSize / 2) * Math.cos(phiRad);

            const drawOpts = {
              x: textAdjX,
              y: textAdjY,
              size: scaledFontSize,
              font,
              color: pdfColor,
              rotate: degrees(phiDeg),
            };

            if (charWidths && chars) {
              // Letter-spaced: place each character along the rotated baseline
              let cursorX = textAdjX;
              let cursorY = textAdjY;
              for (let ci = 0; ci < chars.length; ci++) {
                if (chars[ci] !== " ") {
                  page.drawText(chars[ci], { ...drawOpts, x: cursorX, y: cursorY });
                }
                const adv = charWidths[ci] + scaledLetterSpacing;
                cursorX += adv * Math.cos(phiRad);
                cursorY += adv * Math.sin(phiRad);
              }
            } else {
              page.drawText(line, drawOpts);
            }

            // Underline: thin rectangle below the baseline, offset
            // perpendicular to the text direction so it survives rotation.
            if (textItem.underline) {
              const underlineThickness = Math.max(0.5, scaledFontSize / 18);
              const off = scaledFontSize * 0.12;
              page.drawRectangle({
                x: textAdjX + off * Math.sin(phiRad),
                y: textAdjY - off * Math.cos(phiRad),
                width: lineWidth,
                height: underlineThickness,
                color: pdfColor,
                rotate: degrees(phiDeg),
              });
            }
          }
        } catch (err) {
          console.error("Error drawing text:", err);
        }
      }

      // Erasers — skip if page not in keepSet
      for (const eraserItem of exportedErasers) {
        try {
          const page = pdfDoc.getPage(eraserItem.page - 1);
          const { width: pageWidth, height: pageHeight } = page.getSize();

          // /Rotate уже включает пользовательский поворот — см. комментарий выше.
          const T = (((page.getRotation().angle || 0) % 360) + 360) % 360;
          const { width: Wv, height: Hv } = getViewDims(T, {
            width: pageWidth,
            height: pageHeight,
          });
          const skew = pageSkew[eraserItem.page] || 0;
          const { Wrho, Hrho, toDisplay } = makeSkewGeometry(skew, Wv, Hv);

          const cw = eraserItem.canvasWidth || Wv;
          const ch = eraserItem.canvasHeight || Hv;

          const eraserColor = hexToRgb(eraserItem.color);
          const pdfColor = eraserColor
            ? rgb(eraserColor.r, eraserColor.g, eraserColor.b)
            : rgb(1, 1, 1);

          const pdfStrokeWidth = (eraserItem.strokeWidth / ch) * Hrho;

          const pdfPoints = eraserItem.points.map((p) => {
            const vx0 = (p.x / cw) * Wrho;
            const vy0 = (p.y / ch) * Hrho;
            const view = toDisplay(vx0, vy0);
            return viewPointToPdf(view.vx, view.vy, T, pageHeight, Wv, Hv);
          });

          for (let i = 0; i < pdfPoints.length; i++) {
            const p = pdfPoints[i];

            if (i === 0 && pdfPoints.length === 1) {
              // Одиночный клик = круглая точка (на экране — canvas arc,
              // не квадрат)
              const r = pdfStrokeWidth / 2;
              page.drawEllipse({
                x: p.x,
                y: p.y,
                xScale: r,
                yScale: r,
                color: pdfColor,
              });
            } else if (i > 0) {
              const prevP = pdfPoints[i - 1];

              page.drawLine({
                start: { x: prevP.x, y: prevP.y },
                end: { x: p.x, y: p.y },
                thickness: pdfStrokeWidth,
                color: pdfColor,
                // Круглые концы — как на экране (canvas lineCap "round"),
                // иначе на изгибах остаются зазоры-«зазубрины».
                lineCap: LineCapStyle.Round,
              });
            }
          }
        } catch (err) {
          console.error("Error drawing eraser:", err);
        }
      }

      // Remove pages that are not in keepSet (deleted or not selected for export)
      // Iterate from the highest index to the lowest to avoid shifting issues.
      const indicesToRemove: number[] = [];
      for (let i = 0; i < pageCount; i++) {
        if (!keepSet.has(i + 1)) indicesToRemove.push(i);
      }
      // Sort descending so removal doesn't shift subsequent indices
      indicesToRemove.sort((a, b) => b - a);
      for (const idx of indicesToRemove) {
        try {
          pdfDoc.removePage(idx);
        } catch (err) {
          console.error(`Error removing page ${idx + 1}:`, err);
        }
      }

      const modifiedPdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(modifiedPdfBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFileName
        ? `modified_${pdfFileName}`
        : "modified_document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 5000);

      toast.dismiss(loadingToast);
      toast.success("PDF сохранён!", {
        description: `${pagesToKeep.length} стр. · ${exportedStamps.length} печатей · ${exportedTexts.length} текстов · ${exportedErasers.length} мазков`,
      });
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error downloading PDF:", error);
      toast.error("Ошибка при сохранении PDF", {
        description: String(error),
      });
    } finally {
      setIsDownloading(false);
    }
  }, [
    pdfArrayBuffer,
    stamps,
    texts,
    erasers,
    pdfFileName,
    isDownloading,
  ]);

  const toolbarContent = (
    <Toolbar
      onUploadClick={() => {
        handleUploadClick();
        setSidebarOpen(false);
      }}
      onDownloadClick={() => {
        setExportDialogOpen(true);
        setSidebarOpen(false);
      }}
      isDownloading={isDownloading}
    />
  );

  if (!authenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border/70 glass-strong px-4 py-2.5 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          {pdfFile && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-9 w-9 rounded-xl"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 overflow-y-auto">
                <SheetTitle className="sr-only">Панель инструментов</SheetTitle>
                {toolbarContent}
                <div className="h-px bg-border/60 mx-4" />
                <LayersPanel currentPage={currentPage} totalPages={totalPages} />
              </SheetContent>
            </Sheet>
          )}

          {/* Logo — клик возвращает на главный выбор */}
          <button
            type="button"
            onClick={goHome}
            aria-label="На главную — выбор режима"
            className={`relative flex items-center gap-2.5 rounded-xl transition-opacity ${
              appMode === "home"
                ? "cursor-default"
                : "hover:opacity-75"
            }`}
          >
            <div className="relative h-9 w-9 rounded-xl bg-ink flex items-center justify-center shadow-soft shrink-0">
              <FileText
                className="h-5 w-5 text-white"
                strokeWidth={2}
                fill="rgba(217,119,87,0.4)"
              />
            </div>
            <div className="text-left">
              <h1 className="display-title text-lg leading-tight">
                PDF{" "}
                <span className="text-terracotta-dark">Редактор</span>
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Печати, текст и документы
              </p>
            </div>
          </button>
          {pdfFile && (
            <div className="hidden lg:flex items-center gap-1.5 ml-6">
              {[
                { kbd: "Ctrl+Колесо", label: "масштаб" },
                { kbd: "← →", label: "страницы" },
                { kbd: "Del", label: "удалить" },
                { kbd: "2× клик", label: "текст" },
              ].map((h) => (
                <span
                  key={h.kbd}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/50 border border-border/40"
                >
                  <span className="kbd">{h.kbd}</span>
                  <span className="text-[11px] text-muted-foreground">{h.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Переключатель режимов */}
          <div className="flex items-center gap-0.5 p-1 rounded-xl bg-secondary/60 border border-border/50 mr-1">
            <button
              type="button"
              onClick={() => switchMode("pdf")}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 h-8 rounded-lg text-xs font-medium transition-colors ${
                appMode === "pdf"
                  ? "bg-card shadow-soft text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={appMode === "pdf"}
            >
              <PenLine className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Редактор</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode("docs")}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 h-8 rounded-lg text-xs font-medium transition-colors ${
                appMode === "docs"
                  ? "bg-card shadow-soft text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={appMode === "docs"}
            >
              <FileStack className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Документы</span>
            </button>
          </div>
          {pdfFile && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/70 border border-border/50 max-w-[220px]">
              <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                <FileText className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground truncate">
                {pdfFileName}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground h-9 rounded-xl font-medium"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Выход</span>
          </Button>
        </div>
      </header>

      {/* Main content */}
      {appMode === "home" ? (
        <ModeChooser
          onPick={switchMode}
          hasPdf={!!pdfFile}
          pdfName={pdfFileName}
        />
      ) : appMode === "pdf" ? (
        <div className="flex-1 flex overflow-hidden">
          {pdfFile && (
            <aside className="hidden md:block w-72 border-r border-border/70 bg-card/30 overflow-y-auto shrink-0">
              {toolbarContent}
              <div className="h-px bg-border/60 mx-4" />
              <LayersPanel currentPage={currentPage} totalPages={totalPages} />
            </aside>
          )}

          {pdfFile ? <PdfCanvas /> : <UploadZone />}
        </div>
      ) : null}
      {/* Режим «Документы»: держим смонтированным всегда (скрытым вне режима),
          чтобы разобранная анкета и вписанные данные не терялись при
          переключении в редактор и обратно. */}
      <div className={appMode === "docs" ? "contents" : "hidden"}>
        <DocAutofillApp />
      </div>

      {/* Footer */}
      <footer className="border-t border-border/70 glass-strong px-4 py-2.5 text-center text-xs text-muted-foreground shrink-0 mt-auto">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3 w-3 text-primary" />
          <span className="font-medium">
            PDF Редактор · документы не покидают ваш браузер
          </span>
        </div>
      </footer>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Export dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleDownload}
      />
    </div>
  );
}
