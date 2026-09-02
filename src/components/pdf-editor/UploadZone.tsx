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

      <div className="relative w-full max-w-4xl grid lg:grid-cols-5 gap-6 animate-slide-up py-2">
        {/* Hero dropzone */}
        <Card
          className={`lg:col-span-3 relative border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden group lift ${
            isDragOver
              ? "border-primary bg-terracotta-soft/40 scale-[1.01] shadow-elevated"
              : "border-border bg-card hover:border-primary/50 hover:shadow-soft"
          }`}
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

            {/* Upload icon */}
            <div className="relative mb-6">
              {isDragOver && (
                <div className="absolute -inset-3 rounded-3xl bg-primary/20 animate-ping" />
              )}
              <div
                className={`relative h-20 w-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  isDragOver
                    ? "bg-primary scale-105 shadow-elevated"
                    : "bg-primary group-hover:scale-[1.03] shadow-soft"
                }`}
              >
                <FileUp
                  className="h-9 w-9 text-white"
                  strokeWidth={2.2}
                  fill="rgba(255,255,255,0.12)"
                />
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-2xl md:text-[2rem] md:leading-snug font-semibold mb-3 tracking-tight text-balance text-center">
              Загрузите{" "}
              <span className="text-primary">PDF</span> документ
            </h2>
            <p className="text-muted-foreground text-sm md:text-[15px] text-center mb-8 max-w-md text-balance leading-relaxed">
              Перетащите файл сюда или нажмите для выбора — всё
              обрабатывается локально
            </p>

            {/* CTA */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink text-white text-sm font-medium shadow-soft group-hover:bg-ink-hover transition-colors">
              <FileUp className="h-4 w-4" strokeWidth={2.2} />
              Выбрать файл
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-4 mt-8 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">Только PDF</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-border" />
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
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
          {/* Features grid */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-soft">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-px w-4 bg-primary/60" />
              <h3 className="text-sm font-semibold">
                Возможности
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group flex flex-col gap-2 p-3 rounded-xl bg-secondary/50 border border-border/60 hover:border-primary/35 hover:bg-accent transition-all lift"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/12 flex items-center justify-center border border-primary/15">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-tight">
                      {f.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {f.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Highlight card */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-soft flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-ink flex items-center justify-center shrink-0 shadow-soft">
              <ShieldCheck
                className="h-5 w-5 text-white"
                strokeWidth={2.2}
                fill="rgba(255,255,255,0.12)"
              />
            </div>
            <div>
              <div className="text-sm font-semibold mb-1">
                Работает прямо в браузере
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Никакой загрузки на сервер. Все операции выполняются
                локально — это быстро и безопасно.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
