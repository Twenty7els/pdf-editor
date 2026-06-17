"use client";

import React, { useCallback, useState } from "react";
import { usePdfEditorStore } from "@/store/pdf-editor-store";
import { Card } from "@/components/ui/card";
import {
  FileUp,
  FileText,
  Sparkles,
  Stamp,
  Type,
  Paintbrush,
  ShieldCheck,
  Zap,
  Download,
} from "lucide-react";

const FEATURES = [
  {
    icon: Stamp,
    title: "Печати и подписи",
    desc: "Загружайте свои печати",
  },
  {
    icon: Type,
    title: "Текст",
    desc: "Любой шрифт и цвет",
  },
  {
    icon: Paintbrush,
    title: "Ластик",
    desc: "Замазывайте данные",
  },
  {
    icon: Download,
    title: "Экспорт",
    desc: "Скачайте готовый PDF",
  },
];

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
    <div className="flex-1 flex items-center justify-center p-6 md:p-8 mesh-bg relative overflow-hidden">
      {/* Decorative grid */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-2xl grid lg:grid-cols-5 gap-6 animate-slide-up">
        {/* Dropzone */}
        <Card
          className={`lg:col-span-3 relative border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden group ${
            isDragOver
              ? "border-primary bg-primary/5 scale-[1.02] shadow-glow"
              : "border-border hover:border-primary/50 hover:bg-accent/30"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <label className="flex flex-col items-center justify-center p-10 md:p-14 cursor-pointer relative">
            {/* Background icon */}
            <div
              className={`absolute right-4 bottom-4 opacity-5 transition-all duration-500 ${
                isDragOver ? "scale-125 rotate-6" : "group-hover:scale-110"
              }`}
            >
              <FileText className="h-40 w-40" strokeWidth={1} />
            </div>

            <div
              className={`relative h-20 w-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${
                isDragOver
                  ? "gradient-bg scale-110 shadow-glow"
                  : "bg-primary/10 group-hover:bg-primary/15"
              }`}
            >
              <FileUp
                className={`h-10 w-10 transition-colors ${
                  isDragOver
                    ? "text-primary-foreground"
                    : "text-primary"
                }`}
                strokeWidth={2}
              />
              {isDragOver && (
                <div className="absolute -inset-2 rounded-2xl bg-primary/20 animate-ping" />
              )}
            </div>

            <h2 className="text-2xl font-bold mb-2 tracking-tight">
              Загрузите PDF документ
            </h2>
            <p className="text-muted-foreground text-sm text-center mb-6 max-w-sm">
              Перетащите файл сюда или нажмите для выбора
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-soft group-hover:shadow-glow transition-all">
              <FileUp className="h-4 w-4" />
              Выбрать файл
            </div>

            <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span>Только PDF</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Файл не покидает браузер</span>
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

        {/* Features panel */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="glass rounded-2xl p-5 border border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Возможности</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="flex flex-col gap-1.5 p-3 rounded-xl bg-muted/30 border border-border/40 hover:border-primary/30 hover:bg-accent/30 transition-all"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-medium">{f.title}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {f.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-5 border border-border/50 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg gradient-bg flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium mb-0.5">
                Работает прямо в браузере
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Никакой загрузки на сервер. Все операции выполняются локально —
                это быстро и безопасно.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
