"use client";

import React, { useCallback, useRef, useState } from "react";
import { usePdfEditorStore } from "@/store/pdf-editor-store";
import PdfCanvas from "@/components/pdf-editor/PdfCanvas";
import Toolbar from "@/components/pdf-editor/Toolbar";
import UploadZone from "@/components/pdf-editor/UploadZone";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Menu, X } from "lucide-react";

export default function Home() {
  const {
    pdfFile,
    pdfArrayBuffer,
    stamps,
    texts,
    pageScale,
    pdfFileName,
    setPdfFile,
  } = usePdfEditorStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      toast.success("PDF загружен!");
    } else {
      toast.error("Пожалуйста, выберите PDF файл");
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownload = useCallback(async () => {
    if (!pdfArrayBuffer) return;

    try {
      toast.loading("Подготовка PDF...");

      // Convert ArrayBuffer to base64
      const uint8Array = new Uint8Array(pdfArrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const pdfBase64 = btoa(binary);

      // Fetch stamp images as data URLs
      const stampPromises = stamps.map(async (stamp) => {
        try {
          const response = await fetch(stamp.src);
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          return {
            ...stamp,
            imageDataUrl: dataUrl,
          };
        } catch {
          return {
            ...stamp,
            imageDataUrl: "",
          };
        }
      });

      const stampsWithImages = await Promise.all(stampPromises);

      // Get canvas dimensions for each page
      const canvasEl = document.querySelector("canvas");
      const canvasWidth = canvasEl?.width || 800;
      const canvasHeight = canvasEl?.height || 1100;

      // Build pageScales map
      const pageScales: Record<number, number> = {};
      const allPages = new Set([...stamps.map((s) => s.page), ...texts.map((t) => t.page)]);
      allPages.forEach((page) => {
        pageScales[page] = pageScale;
      });

      const response = await fetch("/api/modify-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfBase64,
          stamps: stampsWithImages.map((s) => ({
            id: s.id,
            type: s.type,
            imageDataUrl: s.imageDataUrl,
            x: s.x,
            y: s.y,
            width: s.width,
            height: s.height,
            page: s.page,
            rotation: s.rotation,
            opacity: s.opacity,
            canvasWidth,
            canvasHeight,
          })),
          texts: texts.map((t) => ({
            id: t.id,
            text: t.text,
            x: t.x,
            y: t.y,
            fontSize: t.fontSize,
            color: t.color,
            page: t.page,
            fontFamily: t.fontFamily,
            bold: t.bold,
            rotation: t.rotation,
            canvasWidth,
            canvasHeight,
          })),
          pageScales,
        }),
      });

      toast.dismiss();

      if (!response.ok) {
        throw new Error("Failed to modify PDF");
      }

      const result = await response.json();

      if (result.success && result.pdfBase64) {
        // Convert base64 to blob and download
        const modifiedPdfBytes = Uint8Array.from(atob(result.pdfBase64), (c) =>
          c.charCodeAt(0)
        );
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
        URL.revokeObjectURL(url);

        toast.success("PDF сохранён!");
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (error) {
      toast.dismiss();
      console.error("Error downloading PDF:", error);
      toast.error("Ошибка при сохранении PDF");
    }
  }, [pdfArrayBuffer, stamps, texts, pageScale, pdfFileName]);

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
    />
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
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
        </div>
        {pdfFile && (
          <div className="text-xs text-muted-foreground hidden sm:block">
            {pdfFileName}
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        {pdfFile && (
          <aside className="hidden md:block w-72 border-r border-border bg-card overflow-y-auto shrink-0">
            {toolbarContent}
          </aside>
        )}

        {/* Canvas area */}
        {pdfFile ? <PdfCanvas /> : <UploadZone />}
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-4 py-2 text-center text-xs text-muted-foreground shrink-0 mt-auto">
        PDF Редактор — добавляйте печати и текст на PDF документы
      </footer>

      {/* Hidden file input */}
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
