"use client";

import React, { useCallback, useState } from "react";
import { usePdfEditorStore } from "@/store/pdf-editor-store";
import { Card } from "@/components/ui/card";
import { FileUp, FileText, Sparkles } from "lucide-react";

export default function UploadZone() {
  const { setPdfFile } = usePdfEditorStore();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type === "application/pdf") {
        setPdfFile(file);
      }
    },
    [setPdfFile]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type === "application/pdf") {
        setPdfFile(file);
      }
    },
    [setPdfFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center p-6 md:p-8">
      <Card
        className={`w-full max-w-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <label className="flex flex-col items-center justify-center p-10 md:p-16 cursor-pointer">
          <div className={`h-20 w-20 rounded-full flex items-center justify-center mb-6 transition-colors ${
            isDragOver ? "bg-primary/20" : "bg-primary/10"
          }`}>
            <FileUp className={`h-10 w-10 transition-colors ${
              isDragOver ? "text-primary" : "text-muted-foreground"
            }`} />
          </div>
          <h2 className="text-xl font-semibold mb-2">Загрузите PDF документ</h2>
          <p className="text-muted-foreground text-sm text-center mb-6">
            Перетащите файл сюда или нажмите для выбора
          </p>
          
          <div className="flex flex-col gap-3 items-center">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Поддерживаются только PDF файлы</span>
            </div>
            
            <div className="h-px w-32 bg-border my-2" />
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>Добавляйте печати, текст и скачивайте</span>
            </div>
          </div>
          
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </Card>
    </div>
  );
}
