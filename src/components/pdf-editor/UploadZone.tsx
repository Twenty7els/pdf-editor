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
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Stamp,
    title: "Печати и подписи",
    desc: "Загружайте свои",
    gradient: "from-emerald-500/20 to-teal-500/10",
  },
  {
    icon: Type,
    title: "Текст",
    desc: "Шрифты и цвета",
    gradient: "from-cyan-500/20 to-blue-500/10",
  },
  {
    icon: Paintbrush,
    title: "Ластик",
    desc: "Замазывайте данные",
    gradient: "from-violet-500/20 to-purple-500/10",
  },
  {
    icon: Download,
    title: "Экспорт",
    desc: "Скачайте PDF",
    gradient: "from-amber-500/20 to-orange-500/10",
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
    <div className="flex-1 flex items-center justify-center p-6 md:p-8 aurora-bg relative overflow-hidden">
      {/* Decorative dots overlay */}
      <div className="absolute inset-0 dot-bg opacity-50 pointer-events-none" />

      <div className="relative w-full max-w-4xl grid lg:grid-cols-5 gap-6 animate-slide-up">
        {/* Hero dropzone */}
        <Card
          className={`lg:col-span-3 relative border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden group lift ${
            isDragOver
              ? "border-primary bg-primary/5 scale-[1.02] shadow-glow-lg gradient-border-animated"
              : "border-border/60 hover:border-primary/50 hover:bg-accent/20"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <label className="flex flex-col items-center justify-center p-10 md:p-16 cursor-pointer relative">
            {/* Background icon */}
            <div
              className={`absolute right-4 bottom-4 opacity-5 transition-all duration-500 ${
                isDragOver ? "scale-125 rotate-6" : "group-hover:scale-110 group-hover:rotate-3"
              }`}
            >
              <FileText className="h-48 w-48" strokeWidth={0.8} />
            </div>

            {/* Animated upload icon */}
            <div className="relative mb-6">
              {/* Pulsing ring when dragging */}
              {isDragOver && (
                <div className="absolute -inset-4 rounded-3xl gradient-bg opacity-30 animate-ping" />
              )}
              {/* Icon container */}
              <div
                className={`relative h-20 w-20 rounded-3xl flex items-center justify-center transition-all duration-300 ${
                  isDragOver
                    ? "gradient-bg-tri scale-110 shadow-glow-lg"
                    : "gradient-bg group-hover:scale-105 shadow-soft"
                }`}
              >
                <FileUp
                  className={`h-9 w-9 transition-colors ${
                    isDragOver ? "text-primary-foreground" : "text-primary-foreground"
                  }`}
                  strokeWidth={2.2}
                />
              </div>
            </div>

            {/* Headline */}
            <h2 className="font-display text-2xl md:text-4xl font-bold mb-3 tracking-tight text-balance text-center leading-tight">
              Загрузите PDF документ
            </h2>
            <p className="text-muted-foreground text-sm md:text-base text-center mb-8 max-w-md text-balance leading-relaxed">
              Перетащите файл сюда или нажмите для выбора — всё обрабатывается локально
            </p>

            {/* CTA button */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold shadow-soft group-hover:shadow-glow transition-all btn-glow shimmer">
              <FileUp className="h-4 w-4" strokeWidth={2.5} />
              Выбрать файл
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-4 mt-8 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">Только PDF</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
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
            />
          </label>
        </Card>

        {/* Features side panel */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Features grid */}
          <div className="glass rounded-2xl p-5 gradient-border">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-semibold tracking-tight">Возможности</h3>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="group relative flex flex-col gap-2 p-3 rounded-xl bg-muted/30 border border-border/40 hover:border-primary/30 hover:bg-accent/30 transition-all lift"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Gradient icon bg */}
                  <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${f.gradient} flex items-center justify-center border border-border/30`}>
                    <f.icon className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-tight">{f.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {f.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Highlight card */}
          <div className="glass rounded-2xl p-5 gradient-border flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl gradient-bg-tri flex items-center justify-center shrink-0 shadow-soft">
              <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
            </div>
            <div>
              <div className="font-display text-sm font-semibold mb-1 tracking-tight">
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
