"use client";

import React, { useCallback, useState } from "react";
import { usePdfEditorStore } from "@/store/pdf-editor-store";
import { Card } from "@/components/ui/card";
import {
  FileUp,
  FileText,
  Stamp,
  Type,
  Paintbrush,
  ShieldCheck,
  Download,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  { icon: Stamp, title: "Печати и подписи", desc: "Загружайте свои" },
  { icon: Type, title: "Текст", desc: "Шрифты и цвета" },
  { icon: Paintbrush, title: "Ластик", desc: "Замазывайте данные" },
  { icon: Download, title: "Экспорт", desc: "Скачайте PDF" },
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
    <div className="flex-1 flex items-center justify-center p-6 md:p-8 aurora-bg relative overflow-y-auto">
      {/* Decorative dots overlay */}
      <div className="absolute inset-0 dot-bg opacity-40 pointer-events-none" />

      <div className="relative w-full max-w-4xl py-2">
        {/* Hero headline — stagger 0ms */}
        <div
          className="stagger-item text-center mb-8 md:mb-10"
          style={{ "--stagger-delay": "0ms" } as React.CSSProperties}
        >
          <h2 className="display-title text-3xl md:text-[2.75rem] text-balance">
            Загрузите{" "}
            <span className="text-terracotta-dark">PDF</span> документ
          </h2>
          <p className="text-muted-foreground text-sm md:text-[15px] mt-4 max-w-md mx-auto text-balance leading-relaxed">
            Перетащите файл сюда или нажмите для выбора — всё
            обрабатывается локально
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Hero dropzone — stagger 90ms */}
          <Card
            className={`lg:col-span-3 stagger-item relative rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden group ${
              isDragOver
                ? "border-primary bg-terracotta-soft/30 scale-[1.01] shadow-elevated"
                : "border-border bg-card/70 backdrop-blur-sm hover:border-primary/40 hover:bg-card hover:shadow-elevated"
            }`}
            style={{ "--stagger-delay": "90ms" } as React.CSSProperties}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <label className="flex flex-col items-center justify-center p-10 md:p-14 cursor-pointer relative">
              {/* Background icon */}
              <div
                className={`absolute right-4 bottom-4 opacity-[0.04] transition-all duration-500 ${
                  isDragOver
                    ? "scale-125 rotate-6"
                    : "group-hover:scale-110 group-hover:rotate-3"
                }`}
              >
                <FileText className="h-48 w-48" strokeWidth={0.8} />
              </div>

              {/* Upload icon chip */}
              <div className="relative mb-7">
                {isDragOver && (
                  <div className="absolute -inset-3 rounded-2xl bg-primary/20 animate-ping" />
                )}
                <div
                  className={`relative h-16 w-16 rounded-2xl bg-terracotta-soft flex items-center justify-center transition-all duration-300 ${
                    isDragOver
                      ? "scale-105 shadow-elevated"
                      : "group-hover:scale-[1.03] shadow-soft"
                  }`}
                >
                  <FileUp className="h-8 w-8 text-terracotta-dark" />
                </div>
              </div>

              {/* CTA */}
              <div className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-ink text-white text-sm font-medium shadow-soft group-hover:bg-ink-hover transition-colors">
                <FileUp className="h-4 w-4" strokeWidth={2.2} />
                Выбрать файл
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-4 mt-8 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-terracotta-dark" />
                  <span className="font-medium">Только PDF</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-border" />
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-terracotta-dark" />
                  <span className="font-medium">Не покидает браузер</span>
                </div>
              </div>

              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Загрузить PDF файл"
              />
            </label>
          </Card>

          {/* Features side panel */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Features grid — stagger 180ms */}
            <div
              className="stagger-item bg-card rounded-2xl p-5 border border-border shadow-soft"
              style={{ "--stagger-delay": "180ms" } as React.CSSProperties}
            >
              <div className="flex items-center gap-2 mb-4">
                <div aria-hidden="true" className="h-px w-5 bg-terracotta" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Возможности
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="flex flex-col gap-2.5 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-soft lift"
                  >
                    <div className="h-10 w-10 rounded-xl bg-terracotta-soft flex items-center justify-center">
                      <f.icon className="h-5 w-5 text-terracotta-dark" />
                    </div>
                    <div>
                      <div className="text-sm font-medium leading-tight">
                        {f.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {f.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Highlight card — stagger 270ms */}
            <div
              className="stagger-item rounded-2xl bg-ink text-white p-5 shadow-elevated flex items-start gap-3"
              style={{ "--stagger-delay": "270ms" } as React.CSSProperties}
            >
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <ShieldCheck
                  className="h-5 w-5 text-white"
                  strokeWidth={2.2}
                />
              </div>
              <div>
                <div className="text-sm font-medium text-white mb-1">
                  Работает прямо в браузере
                </div>
                <p className="text-xs text-white/70 leading-relaxed">
                  Никакой загрузки на сервер. Все операции выполняются
                  локально — это быстро и безопасно.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
