"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePdfEditorStore } from "@/store/pdf-editor-store";
import PdfCanvas from "@/components/pdf-editor/PdfCanvas";
import Toolbar from "@/components/pdf-editor/Toolbar";
import UploadZone from "@/components/pdf-editor/UploadZone";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Menu, Lock, LogOut } from "lucide-react";
import { checkPassword, isAuthenticated, setAuthenticated, logout } from "@/lib/auth";

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-9 w-9 text-primary-foreground"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M9 15v2" />
              <path d="M12 12v5" />
              <path d="M15 14v3" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">PDF Редактор</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Введите пароль для входа
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Пароль"
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full h-11"
            disabled={isLoading || !password.trim()}
          >
            {isLoading ? "Проверка..." : "Войти"}
          </Button>
        </form>
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

  // Check session on mount
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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      toast.success("PDF загружен!");
    } else {
      toast.error("Пожалуйста, выберите PDF файл");
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [setPdfFile]);

  const handleDownload = useCallback(async () => {
    if (!pdfArrayBuffer || isDownloading) return;

    setIsDownloading(true);
    const loadingToast = toast.loading("Подготовка PDF...");

    try {
      // Dynamic import of pdf-lib (client-side)
      const { PDFDocument, rgb, degrees } = await import("pdf-lib");

      // Load the original PDF from stored ArrayBuffer
      const pdfDoc = await PDFDocument.load(pdfArrayBuffer);

      // Register fontkit — REQUIRED for embedding custom TTF fonts (Cyrillic support)
      const fontkit = (await import("@pdf-lib/fontkit")).default;
      pdfDoc.registerFontkit(fontkit);

      // Load NotoSans Unicode fonts (supports Cyrillic) — embedded as base64, lazy loaded
      let unicodeFonts: { regular: unknown; bold: unknown; italic: unknown; boldItalic: unknown } | null = null;
      const getUnicodeFonts = async () => {
        if (unicodeFonts) return unicodeFonts;
        // Dynamic import — font data is in a separate chunk, not in the initial bundle
        const { NOTO_SANS_REGULAR, NOTO_SANS_BOLD, NOTO_SANS_ITALIC, NOTO_SANS_BOLD_ITALIC } = await import("@/lib/font-base64");
        const decode = (b64: string) => new Uint8Array(atob(b64).split("").map(c => c.charCodeAt(0)));
        unicodeFonts = {
          regular: await pdfDoc.embedFont(decode(NOTO_SANS_REGULAR)),
          bold: await pdfDoc.embedFont(decode(NOTO_SANS_BOLD)),
          italic: await pdfDoc.embedFont(decode(NOTO_SANS_ITALIC)),
          boldItalic: await pdfDoc.embedFont(decode(NOTO_SANS_BOLD_ITALIC)),
        };
        return unicodeFonts;
      };

      // Process stamps — embed images directly
      for (const stamp of stamps) {
        try {
          const page = pdfDoc.getPage(stamp.page - 1);
          const { width: pageWidth, height: pageHeight } = page.getSize();

          // Use stored canvas dimensions for coordinate conversion
          const cw = stamp.canvasWidth || 800;
          const ch = stamp.canvasHeight || 1100;

          const pdfX = (stamp.x / cw) * pageWidth;
          const pdfY = pageHeight - ((stamp.y + stamp.height) / ch) * pageHeight;
          const pdfWidth = (stamp.width / cw) * pageWidth;
          const pdfHeight = (stamp.height / ch) * pageHeight;

          // Fetch stamp image bytes directly
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

      // Process texts
      for (const textItem of texts) {
        if (!textItem.text.trim()) continue;

        try {
          const page = pdfDoc.getPage(textItem.page - 1);
          const { width: pageWidth, height: pageHeight } = page.getSize();

          const cw = textItem.canvasWidth || 800;
          const ch = textItem.canvasHeight || 1100;

          const pdfX = (textItem.x / cw) * pageWidth;
          const pdfY =
            pageHeight -
            ((textItem.y + textItem.fontSize) / ch) * pageHeight;

          const scaledFontSize = (textItem.fontSize / ch) * pageHeight;

          // Always use Unicode font (supports both Cyrillic and Latin)
          let font: unknown;
          const uFonts = await getUnicodeFonts();
          if (textItem.bold && textItem.italic) font = uFonts.boldItalic;
          else if (textItem.bold) font = uFonts.bold;
          else if (textItem.italic) font = uFonts.italic;
          else font = uFonts.regular;

          const color = hexToRgb(textItem.color);

          page.drawText(textItem.text, {
            x: pdfX,
            y: pdfY,
            size: scaledFontSize,
            font: font as import("pdf-lib").PDFFont,
            color: color ? rgb(color.r, color.g, color.b) : rgb(0, 0, 0),
            rotate: degrees(textItem.rotation),
          });
        } catch (err) {
          console.error("Error drawing text:", err);
        }
      }

      // Process erasers — draw filled thick lines along the path
      for (const eraserItem of erasers) {
        try {
          if (eraserItem.points.length === 0) continue;

          const page = pdfDoc.getPage(eraserItem.page - 1);
          const { width: pageWidth, height: pageHeight } = page.getSize();

          const cw = eraserItem.canvasWidth || 800;
          const ch = eraserItem.canvasHeight || 1100;

          const eraserColor = hexToRgb(eraserItem.color);
          const pdfColor = eraserColor ? rgb(eraserColor.r, eraserColor.g, eraserColor.b) : rgb(1, 1, 1);

          // Scale stroke width to PDF coordinates
          const pdfStrokeWidth = (eraserItem.strokeWidth / ch) * pageHeight;

          // Draw line segments for each pair of consecutive points
          for (let i = 0; i < eraserItem.points.length; i++) {
            const p = eraserItem.points[i];

            // Convert overlay coords to PDF coords
            const pdfX = (p.x / cw) * pageWidth;
            const pdfY = pageHeight - (p.y / ch) * pageHeight;

            if (i === 0 && eraserItem.points.length === 1) {
              // Single point — draw a small filled circle (rectangle approximation)
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

      // Save and trigger download
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

      // Clean up after a delay to ensure download starts
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      toast.dismiss(loadingToast);
      toast.success("PDF сохранён!");
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error downloading PDF:", error);
      toast.error("Ошибка при сохранении PDF: " + String(error));
    } finally {
      setIsDownloading(false);
    }
  }, [pdfArrayBuffer, stamps, texts, erasers, pdfFileName, isDownloading]);

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
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          {pdfFile && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <SheetTitle className="sr-only">Панель инструментов</SheetTitle>
                {toolbarContent}
              </SheetContent>
            </Sheet>
          )}

          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-primary-foreground"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M9 15v2" />
              <path d="M12 12v5" />
              <path d="M15 14v3" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">PDF Редактор</h1>
            <p className="text-xs text-muted-foreground">
              Печати и текст на документах
            </p>
          </div>
          {pdfFile && (
            <div className="hidden lg:flex items-center gap-3 ml-6 text-[11px] text-muted-foreground">
              <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Ctrl+Колесо</kbd> масштаб</span>
              <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">← →</kbd> страницы</span>
              <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Delete</kbd> удалить</span>
              <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">2× клик</kbd> текст</span>
              <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Shift+Поворот</kbd> 15°</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pdfFile && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              {pdfFileName}
            </span>
          )}
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Выход</span>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {pdfFile && (
          <aside className="hidden md:block w-72 border-r border-border bg-card overflow-y-auto shrink-0">
            {toolbarContent}
          </aside>
        )}

        {pdfFile ? <PdfCanvas /> : <UploadZone />}
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-4 py-2 text-center text-xs text-muted-foreground shrink-0 mt-auto">
        PDF Редактор — добавляйте печати и текст на PDF документы
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
