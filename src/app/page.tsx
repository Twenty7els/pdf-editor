"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePdfEditorStore } from "@/store/pdf-editor-store";
import PdfCanvas from "@/components/pdf-editor/PdfCanvas";
import Toolbar from "@/components/pdf-editor/Toolbar";
import UploadZone from "@/components/pdf-editor/UploadZone";
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
  Moon,
  Sun,
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
import { useTheme } from "next-themes";

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

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 hover:bg-accent"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
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
    <div className="min-h-screen flex items-center justify-center mesh-bg p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative animate-slide-up">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-3xl" />
            <div className="relative h-16 w-16 rounded-2xl gradient-bg flex items-center justify-center shadow-glow">
              <FileText className="h-8 w-8 text-primary-foreground" strokeWidth={2.2} />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              PDF <span className="gradient-text">Редактор</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Введите пароль для входа в систему
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 glass-strong rounded-2xl p-6 border border-border/50 shadow-elevated"
        >
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Пароль"
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center animate-fade-in">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-sm font-medium shadow-soft hover:shadow-glow transition-all group"
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
                <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </form>

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Защищённый доступ · SHA-256</span>
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
    setPdfFile,
  } = usePdfEditorStore();

  const [authenticated, setAuthenticatedState] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

      // Stamps
      for (const stamp of stamps) {
        try {
          const page = pdfDoc.getPage(stamp.page - 1);
          const { width: pageWidth, height: pageHeight } = page.getSize();

          const cw = stamp.canvasWidth || 800;
          const ch = stamp.canvasHeight || 1100;

          const pdfX = (stamp.x / cw) * pageWidth;
          const pdfY = pageHeight - ((stamp.y + stamp.height) / ch) * pageHeight;
          const pdfWidth = (stamp.width / cw) * pageWidth;
          const pdfHeight = (stamp.height / ch) * pageHeight;

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
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
            rotate: degrees(stamp.rotation),
            opacity: stamp.opacity,
          });
        } catch (err) {
          console.error("Error embedding stamp:", err);
        }
      }

      // Texts
      for (const textItem of texts) {
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

          for (let li = 0; li < lines.length; li++) {
            const line = lines[li];
            if (!line) {
              continue;
            }

            // Base Y for this line (top-down from textItem.y which is the top)
            const lineCanvasTop = textItem.y + li * textItem.fontSize * 1.2;
            const lineBaselinePdfY =
              pageHeight -
              ((lineCanvasTop + textItem.fontSize) / ch) * pageHeight;

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

            page.drawText(line, {
              x: linePdfX,
              y: lineBaselinePdfY,
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
              const underlineY = lineBaselinePdfY - scaledFontSize * 0.12;
              page.drawRectangle({
                x: linePdfX,
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

      // Erasers
      for (const eraserItem of erasers) {
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
      toast.success("PDF сохранён!", {
        description: `${stamps.length} печатей · ${texts.length} текстов · ${erasers.length} мазков`,
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
        handleDownload();
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
      <header className="border-b border-border/60 glass-strong px-4 py-3 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          {pdfFile && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-9 w-9"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <SheetTitle className="sr-only">Панель инструментов</SheetTitle>
                {toolbarContent}
              </SheetContent>
            </Sheet>
          )}

          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-md rounded-lg" />
            <div className="relative h-9 w-9 rounded-xl gradient-bg flex items-center justify-center shadow-soft">
              <FileText className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight tracking-tight">
              PDF <span className="gradient-text">Редактор</span>
            </h1>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Печати и текст на документах
            </p>
          </div>
          {pdfFile && (
            <div className="hidden lg:flex items-center gap-2 ml-6 text-[11px] text-muted-foreground">
              {[
                { kbd: "Ctrl+Колесо", label: "масштаб" },
                { kbd: "← →", label: "страницы" },
                { kbd: "Del", label: "удалить" },
                { kbd: "2× клик", label: "текст" },
              ].map((h) => (
                <span
                  key={h.kbd}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/50"
                >
                  <kbd className="px-1 py-0.5 bg-background rounded text-[10px] font-mono border border-border">
                    {h.kbd}
                  </kbd>
                  {h.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pdfFile && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 max-w-[200px]">
              <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {pdfFileName}
              </span>
            </div>
          )}
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground h-9"
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
          <aside className="hidden md:block w-72 border-r border-border/60 bg-card/30 overflow-y-auto shrink-0">
            {toolbarContent}
          </aside>
        )}

        {pdfFile ? <PdfCanvas /> : <UploadZone />}
      </div>

      {/* Footer */}
      <footer className="border-t border-border/60 glass-strong px-4 py-2.5 text-center text-xs text-muted-foreground shrink-0 mt-auto">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-3 w-3 text-primary" />
          <span>PDF Редактор · добавляйте печати и текст на PDF документы</span>
        </div>
      </footer>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
