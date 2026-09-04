"use client";

/**
 * Главный экран: большой выбор режима — редактор PDF или автозаполнение документов.
 * Показывается по умолчанию при входе; в шапке остаётся компактный переключатель.
 */
import React from "react";
import {
  ArrowRight,
  FileStack,
  FileText,
  Layers,
  PenLine,
  Sparkles,
  Stamp,
  Type,
} from "lucide-react";

interface ModeChooserProps {
  onPick: (mode: "pdf" | "docs") => void;
  hasPdf?: boolean;
  pdfName?: string;
}

const MODES: Array<{
  id: "pdf" | "docs";
  title: string;
  desc: string;
  hints: Array<{ icon: React.ElementType; label: string }>;
  cta: string;
}> = [
  {
    id: "pdf",
    title: "Редактор PDF",
    desc: "Печати, подписи и текст на документах — правьте файл прямо в браузере и скачивайте готовый PDF.",
    hints: [
      { icon: Stamp, label: "Печати и подписи" },
      { icon: Type, label: "Текст поверх страниц" },
      { icon: Layers, label: "Порядок страниц" },
    ],
    cta: "Открыть редактор",
  },
  {
    id: "docs",
    title: "Автозаполнение документов",
    desc: "Загрузите заполненную анкету мерчанта — данные сами встанут в заявку СБП и анкеты-заявления ИП/ЮЛ.",
    hints: [
      { icon: FileText, label: "Заявка на регистрацию СБП" },
      { icon: FileText, label: "Анкета-заявление ИП" },
      { icon: FileText, label: "Анкета-заявление ЮЛ" },
    ],
    cta: "Заполнить документы",
  },
];

export default function ModeChooser({
  onPick,
  hasPdf,
  pdfName,
}: ModeChooserProps) {
  return (
    <div className="flex-1 overflow-y-auto stage-bg">
      <div className="min-h-full flex items-center justify-center px-4 py-10 w-full">
        <div className="max-w-3xl w-full">
          {/* Hero */}
          <div className="text-center mb-8 stagger-item">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/80 border border-border/60 text-xs text-muted-foreground mb-4">
              <Sparkles className="h-3.5 w-3.5 text-terracotta" />
              Дело · все инструменты в одном месте
            </div>
            <h2 className="display-title text-3xl md:text-4xl">
              С чего <span className="text-terracotta-dark">начнём?</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Выберите режим — переключаться можно в любой момент через шапку.
            </p>
          </div>

          {/* Две большие карточки */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-5">
            {MODES.map((mode, idx) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => onPick(mode.id)}
                aria-label={mode.title}
                className="group relative text-left bg-card border border-border/70 rounded-2xl shadow-paper p-6 md:p-7 flex flex-col transition-all duration-200 hover:border-terracotta/50 hover:shadow-elevated hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40 stagger-item"
                style={
                  {
                    "--stagger-delay": `${120 + idx * 80}ms`,
                  } as React.CSSProperties
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                      mode.id === "pdf"
                        ? "bg-ink text-white"
                        : "bg-terracotta/10 text-terracotta-dark"
                    }`}
                  >
                    {mode.id === "pdf" ? (
                      <PenLine className="h-6 w-6" strokeWidth={1.8} />
                    ) : (
                      <FileStack className="h-6 w-6" strokeWidth={1.8} />
                    )}
                  </div>
                  <div className="h-8 w-8 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground transition-all duration-200 group-hover:bg-terracotta group-hover:text-white">
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </div>

                <h3 className="display-title text-xl md:text-2xl mt-4">
                  {mode.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {mode.desc}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-4">
                  {mode.hints.map((h) => (
                    <span
                      key={h.label}
                      className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-secondary/50 border border-border/40 text-muted-foreground"
                    >
                      <h.icon className="h-3 w-3 text-terracotta/80" />
                      {h.label}
                    </span>
                  ))}
                </div>

                {mode.id === "pdf" && hasPdf && (
                  <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-terracotta-dark">
                    <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
                    <span className="truncate max-w-[240px]">
                      Продолжить работу: {pdfName}
                    </span>
                  </div>
                )}

                <div className="mt-5 pt-4 border-t border-border/50 text-sm font-medium text-foreground/80 group-hover:text-terracotta-dark transition-colors">
                  {mode.cta}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
