"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePdfEditorStore } from "@/store/pdf-editor-store";
import PdfCanvas from "@/components/pdf-editor/PdfCanvas";
import Toolbar from "@/components/pdf-editor/Toolbar";
import LayersPanel from "@/components/pdf-editor/LayersPanel";
import UploadZone from "@/components/pdf-editor/UploadZone";
import ExportDialog from "@/components/pdf-editor/ExportDialog";
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
  Sparkles,
  ShieldCheck,
  Lock,
  ArrowRight,
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
    <div className="min-h-screen flex items-center justify-center aurora-bg p-4 relative overflow-hidden">
      <div className="w-full max-w-md relative animate-slide-up">
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-5 mb-10">
          <div className="relative">
            {/* Logo */}
            <div className="relative h-20 w-20 rounded-3xl gradient-bg-tri flex items-center justify-center shadow-glow-lg gradient-border-strong">
              <FileText className="h-10 w-10 text-primary-foreground" strokeWidth={2} />
            </div>
          </div>
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight text-balance">
              PDF <span className="gradient-text-bright">Редактор</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs text-balance">
              Печати, подписи и текст на документах — прямо в браузере
            </p>
          </div>
        </div>

        {/* Login card */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 glass-strong rounded-2xl p-7 gradient-border shadow-elevated"
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Пароль
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Введите пароль"
                className="w-full h-13 py-3.5 pl-11 pr-4 rounded-xl border border-input bg-background/60 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-muted-foreground/60"
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 animate-fade-in">
              <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              <p className="text-xs font-medium text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-sm font-semibold btn-glow shimmer shadow-soft"
            disabled={isLoading || !password.trim()}
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Проверка...
              </>
            ) : (
              <>
                Войти
                <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>

        {/* Trust badge */}
        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass border border-border/40">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Защищённый доступ</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass border border-border/40">
            <span className="font-mono text-[10px]">SHA-256</span>
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
      const { PDFDocument, rgb, degrees } = await import("pdf-lib");

      const pdfDoc = await PDFDocument.load(pdfArrayBuffer);

      const fontkit = (await import("@pdf-lib/fontkit")).default;
      pdfDoc.registerFontkit(fontkit);

      // Read document-level state from store
      const state = usePdfEditorStore.getState();
      const { pageRotations, deletedPages, exportPageSelection } = state;

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

      // Apply page rotations to kept pages BEFORE drawing items
      for (const pageNum of pagesToKeep) {
        const userRotation = pageRotations[pageNum] || 0;
        if (userRotation !== 0) {
          const page = pdfDoc.getPage(pageNum - 1);
          const existing = page.getRotation().angle || 0;
          page.setRotation(degrees((existing + userRotation) % 360));
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

      // Stamps — skip if page not in keepSet
      for (const stamp of stamps.filter(
        (s) => !s.hidden && keepSet.has(s.page)
      )) {
        try {
          const page = pdfDoc.getPage(stamp.page - 1);
          const { width: pageWidth, height: pageHeight } = page.getSize();

          const cw = stamp.canvasWidth || 800;
          const ch = stamp.canvasHeight || 1100;

          const pdfX = (stamp.x / cw) * pageWidth;
          const pdfY = pageHeight - ((stamp.y + stamp.height) / ch) * pageHeight;
          const pdfWidth = (stamp.width / cw) * pageWidth;
          const pdfHeight = (stamp.height / ch) * pageHeight;

          // Compensate rotation: pdf-lib rotates around (x, y) = bottom-left corner,
          // but canvas rotates around center. Adjust (x, y) so center stays in place.
          const rad = (stamp.rotation * Math.PI) / 180;
          const cx = pdfX + pdfWidth / 2;
          const cy = pdfY + pdfHeight / 2;
          const adjX = cx - (pdfWidth / 2) * Math.cos(rad) + (pdfHeight / 2) * Math.sin(rad);
          const adjY = cy - (pdfWidth / 2) * Math.sin(rad) - (pdfHeight / 2) * Math.cos(rad);

          const response = await fetch(stamp.src);
          const imageArrayBuffer = await response.arrayBuffer();
          const imageBytes = new Uint8Array(imageArrayBuffer);

          let image;
          try {
            image = await pdfDoc.embedPng(imageBytes);
          } catch {
            try {
              image = await pdfDoc.embedJpg(imageBytes);
            } catch {
              console.error("Could not embed stamp image, skipping");
              continue;
            }
          }

          page.drawImage(image, {
            x: adjX,
            y: adjY,
            width: pdfWidth,
            height: pdfHeight,
            rotate: degrees(stamp.rotation),
            opacity: stamp.opacity,
          });
        } catch (err) {
          console.error("Error embedding stamp:", err);
        }
      }

      // Texts — skip if page not in keepSet
      for (const textItem of texts.filter(
        (t) => !t.hidden && keepSet.has(t.page)
      )) {
        if (!textItem.text.trim()) continue;

        try {
          const page = pdfDoc.getPage(textItem.page - 1);
          const { width: pageWidth, height: pageHeight } = page.getSize();

          const cw = textItem.canvasWidth || 800;
          const ch = textItem.canvasHeight || 1100;

          const scaledFontSize = (textItem.fontSize / ch) * pageHeight;
          // letterSpacing in canvas px → PDF points (text space)
          const scaledLetterSpacing =
            (textItem.letterSpacing / ch) * pageHeight;

          let font: import("pdf-lib").PDFFont;
          const uFonts = await getUnicodeFonts();
          if (textItem.bold && textItem.italic) font = uFonts.boldItalic as import("pdf-lib").PDFFont;
          else if (textItem.bold) font = uFonts.bold as import("pdf-lib").PDFFont;
          else if (textItem.italic) font = uFonts.italic as import("pdf-lib").PDFFont;
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
          // Leading is distributed equally above and below the glyph in CSS
          const leadingHalf = (scaledLineHeight - scaledFontSize) / 2;

          for (let li = 0; li < lines.length; li++) {
            const line = lines[li];
            if (!line) {
              continue;
            }

            // Canvas: top of line-box = textItem.y + li * (fontSize * 1.2)
            // Glyph top = top of line-box + leading/2
            // PDF baseline = glyph top + ascent
            const lineCanvasTop = textItem.y + li * textItem.fontSize * 1.2;
            const lineBaselinePdfY =
              pageHeight -
              ((lineCanvasTop + leadingHalf + fontAscent) / ch) * pageHeight;

            // Measure line width for alignment
            const lineWidth = font.widthOfTextAtSize(line, scaledFontSize);

            // Compute X based on alignment
            let linePdfX: number;
            const basePdfX = (textItem.x / cw) * pageWidth;
            if (textItem.align === "center") {
              linePdfX = basePdfX - lineWidth / 2;
            } else if (textItem.align === "right") {
              linePdfX = basePdfX - lineWidth;
            } else {
              linePdfX = basePdfX;
            }

            // Compensate rotation for text (pdf-lib rotates around baseline-left,
            // canvas rotates around center). Adjust (x, y) so center stays in place.
            const textRad = (textItem.rotation * Math.PI) / 180;
            const lineCenterX = linePdfX + lineWidth / 2;
            const lineCenterY = lineBaselinePdfY + scaledFontSize / 2;
            const textAdjX =
              lineCenterX -
              (lineWidth / 2) * Math.cos(textRad) +
              (scaledFontSize / 2) * Math.sin(textRad);
            const textAdjY =
              lineCenterY -
              (lineWidth / 2) * Math.sin(textRad) -
              (scaledFontSize / 2) * Math.cos(textRad);

            page.drawText(line, {
              x: textAdjX,
              y: textAdjY,
              size: scaledFontSize,
              font,
              color: pdfColor,
              rotate: degrees(textItem.rotation),
              // charSpacing is in text space units (1/1000 of font size)
              charSpacing: (scaledLetterSpacing / scaledFontSize) * 1000,
            });

            // Underline: draw a thin rectangle below the baseline
            if (textItem.underline) {
              const underlineThickness = Math.max(
                0.5,
                scaledFontSize / 18
              );
              const underlineY = textAdjY - scaledFontSize * 0.12;
              page.drawRectangle({
                x: textAdjX,
                y: underlineY,
                width: lineWidth,
                height: underlineThickness,
                color: pdfColor,
                rotate: degrees(textItem.rotation),
              });
            }
          }
        } catch (err) {
          console.error("Error drawing text:", err);
        }
      }

      // Erasers — skip if page not in keepSet
      for (const eraserItem of erasers.filter(
        (e) => !e.hidden && keepSet.has(e.page)
      )) {
        try {
          if (eraserItem.points.length === 0) continue;

          const page = pdfDoc.getPage(eraserItem.page - 1);
          const { width: pageWidth, height: pageHeight } = page.getSize();

          const cw = eraserItem.canvasWidth || 800;
          const ch = eraserItem.canvasHeight || 1100;

          const eraserColor = hexToRgb(eraserItem.color);
          const pdfColor = eraserColor
            ? rgb(eraserColor.r, eraserColor.g, eraserColor.b)
            : rgb(1, 1, 1);

          const pdfStrokeWidth = (eraserItem.strokeWidth / ch) * pageHeight;

          for (let i = 0; i < eraserItem.points.length; i++) {
            const p = eraserItem.points[i];

            const pdfX = (p.x / cw) * pageWidth;
            const pdfY = pageHeight - (p.y / ch) * pageHeight;

            if (i === 0 && eraserItem.points.length === 1) {
              const halfSize = pdfStrokeWidth / 2;
              page.drawRectangle({
                x: pdfX - halfSize,
                y: pdfY - halfSize,
                width: pdfStrokeWidth,
                height: pdfStrokeWidth,
                color: pdfColor,
              });
            } else if (i > 0) {
              const prevP = eraserItem.points[i - 1];
              const prevPdfX = (prevP.x / cw) * pageWidth;
              const prevPdfY = pageHeight - (prevP.y / ch) * pageHeight;

              page.drawLine({
                start: { x: prevPdfX, y: prevPdfY },
                end: { x: pdfX, y: pdfY },
                thickness: pdfStrokeWidth,
                color: pdfColor,
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
      const blob = new Blob([modifiedPdfBytes], { type: "application/pdf" });
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
      const exportedCount = pagesToKeep.length;
      toast.success("PDF сохранён!", {
        description: `${exportedCount} стр. · ${stamps.length} печатей · ${texts.length} текстов · ${erasers.length} мазков`,
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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/40 glass-strong px-4 py-2.5 flex items-center justify-between shrink-0 z-30">
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
                <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent mx-4" />
                <LayersPanel currentPage={currentPage} totalPages={totalPages} />
              </SheetContent>
            </Sheet>
          )}

          {/* Premium logo */}
          <div className="relative group">
            <div className="relative h-9 w-9 rounded-xl gradient-bg-tri flex items-center justify-center shadow-soft gradient-border-strong">
              <FileText className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
            </div>
          </div>
          <div>
            <h1 className="font-display text-base font-bold leading-tight tracking-tight">
              PDF <span className="gradient-text-bright">Редактор</span>
            </h1>
            <p className="text-[11px] text-muted-foreground hidden sm:block font-medium">
              Печати и текст на документах
            </p>
          </div>
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
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/40 border border-border/40 hover:border-primary/30 transition-colors"
                >
                  <kbd className="px-1.5 py-0.5 bg-background rounded text-[10px] font-mono border border-border/60 shadow-soft">
                    {h.kbd}
                  </kbd>
                  <span className="text-[11px] text-muted-foreground">{h.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pdfFile && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-border/40 max-w-[220px]">
              <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                <FileText className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground truncate font-medium">
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
      <div className="flex-1 flex overflow-hidden">
        {pdfFile && (
          <aside className="hidden md:block w-72 border-r border-border/40 bg-card/20 overflow-y-auto shrink-0">
            {toolbarContent}
            <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent mx-4" />
            <LayersPanel currentPage={currentPage} totalPages={totalPages} />
          </aside>
        )}

        {pdfFile ? <PdfCanvas /> : <UploadZone />}
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 glass-strong px-4 py-2.5 text-center text-xs text-muted-foreground shrink-0 mt-auto">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="font-medium">PDF Редактор · добавляйте печати и текст на PDF документы</span>
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
