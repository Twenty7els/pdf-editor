"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Check,
  X,
  Sparkles,
  ChevronRight,
  Minus,
  Plus,
} from "lucide-react";
import {
  AVAILABLE_FONTS,
  getFontCss,
  type TextAlign,
} from "@/store/pdf-editor-store";

export interface TextSidebarData {
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: TextAlign;
  letterSpacing: number;
}

interface TextEditSidebarProps {
  open: boolean;
  mode: "create" | "edit";
  initialData: TextSidebarData | null;
  onClose: () => void;
  onSave: (data: TextSidebarData) => void;
}

const COLOR_SWATCHES = [
  "#000000",
  "#1F2937",
  "#6B7280",
  "#9CA3AF",
  "#DC2626",
  "#EA580C",
  "#D97706",
  "#16A34A",
  "#0891B2",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
];

const SIZE_PRESETS = [8, 10, 12, 14, 18, 24, 32, 48];

const FONT_MIN = 6;
const FONT_MAX = 72;

const DEFAULT_DATA: TextSidebarData = {
  text: "",
  fontSize: 14,
  color: "#000000",
  fontFamily: "Arial",
  bold: false,
  italic: false,
  underline: false,
  align: "left",
  letterSpacing: 0,
};

export default function TextEditSidebar({
  open,
  mode,
  initialData,
  onClose,
  onSave,
}: TextEditSidebarProps) {
  const [data, setData] = useState<TextSidebarData>(DEFAULT_DATA);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setData(initialData ?? DEFAULT_DATA);
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 150);
    }
  }, [open, initialData]);

  const update = <K extends keyof TextSidebarData>(
    key: K,
    value: TextSidebarData[K]
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!data.text.trim()) {
      onClose();
      return;
    }
    onSave(data);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Live preview scaled to fit
  const previewScale = useMemo(() => {
    if (data.fontSize > 28) return 28 / data.fontSize;
    return 1;
  }, [data.fontSize]);

  const previewLines = useMemo(() => data.text.split("\n"), [data.text]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        className="fixed inset-0 z-30 bg-foreground/10 animate-fade-in"
        onClick={handleCancel}
      />

      {/* Sidebar panel — left side */}
      <aside className="fixed top-0 left-0 bottom-0 z-40 w-full sm:w-[26rem] max-w-[95vw] bg-card border-r border-border/60 shadow-elevated flex flex-col animate-slide-down">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border/40 bg-card/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-terracotta-soft flex items-center justify-center shrink-0">
                <Type
                  className="h-5 w-5 text-terracotta-dark"
                  strokeWidth={2}
                />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Редактор текста
                </div>
                <div className="text-base font-semibold tracking-tight leading-tight">
                  {mode === "create" ? "Новый текст" : "Редактировать текст"}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg shrink-0"
              onClick={handleCancel}
              title="Закрыть"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Live preview — styled as the actual document page */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Как на документе
            </label>
            <div className="rounded-xl border border-border/60 bg-card shadow-paper p-5 min-h-[96px] max-h-[150px] overflow-auto flex items-center justify-center">
              {data.text.trim() ? (
                <div
                  className="overflow-hidden w-full"
                  style={{
                    transform: `scale(${previewScale})`,
                    transformOrigin: "center",
                  }}
                >
                  {previewLines.map((line, i) => (
                    <div
                      key={i}
                      style={{
                        textAlign: data.align,
                        color: data.color,
                        fontFamily: getFontCss(data.fontFamily),
                        fontSize: `${data.fontSize}px`,
                        fontWeight: data.bold ? "bold" : "normal",
                        fontStyle: data.italic ? "italic" : "normal",
                        textDecoration: data.underline ? "underline" : "none",
                        letterSpacing: `${data.letterSpacing}px`,
                        lineHeight: 1.2,
                        whiteSpace: "pre",
                      }}
                    >
                      {line || "\u00A0"}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-terracotta-dark" />
                  Введите текст ниже — увидите его здесь
                </div>
              )}
            </div>
          </div>

          {/* Textarea */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
              <span>Текст</span>
              <span className="text-[11px] font-medium text-muted-foreground/70 normal-case tracking-normal tabular-nums">
                {data.text.length} симв.
              </span>
            </label>
            <textarea
              ref={textareaRef}
              value={data.text}
              onChange={(e) => update("text", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  handleCancel();
                }
              }}
              placeholder="Введите текст… Enter — новая строка"
              className="w-full min-h-[120px] resize-none rounded-xl border border-input bg-background text-sm leading-relaxed px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary transition-all placeholder:text-muted-foreground/60"
            />
            <div className="text-[10px] text-muted-foreground mt-1.5">
              <kbd className="kbd">Ctrl+Enter</kbd> — сохранить
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* Font picker — chips rendered in their own typeface */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Шрифт
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {AVAILABLE_FONTS.map((font) => {
                const active = data.fontFamily === font.id;
                return (
                  <button
                    key={font.id}
                    onClick={() => update("fontFamily", font.id)}
                    className={`shrink-0 px-3 py-2.5 rounded-xl border text-center transition-all ${
                      active
                        ? "border-ink bg-ink text-white shadow-soft"
                        : "border-border bg-card text-foreground hover:border-primary/40 hover:shadow-soft"
                    }`}
                  >
                    <div
                      className="text-sm leading-tight whitespace-nowrap"
                      style={{ fontFamily: font.css }}
                    >
                      {font.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size — stepper + presets */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Размер
            </label>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  update("fontSize", Math.max(FONT_MIN, data.fontSize - 1))
                }
                className="h-9 w-9 shrink-0 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                title="Меньше"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex-1 h-9 rounded-lg border border-border bg-background flex items-center justify-center text-sm font-medium tabular-nums">
                {data.fontSize}{" "}
                <span className="text-muted-foreground font-normal">px</span>
              </div>
              <button
                onClick={() =>
                  update("fontSize", Math.min(FONT_MAX, data.fontSize + 1))
                }
                className="h-9 w-9 shrink-0 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                title="Больше"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {SIZE_PRESETS.map((size) => (
                <button
                  key={size}
                  onClick={() => update("fontSize", size)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium tabular-nums transition-all ${
                    data.fontSize === size
                      ? "bg-ink text-white shadow-soft"
                      : "bg-secondary/70 hover:bg-accent text-muted-foreground"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Style — one segmented control: B I U | align L C R */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Стиль и выравнивание
            </label>
            <div className="flex items-center rounded-xl border border-border bg-background p-1 gap-0.5">
              <SegmentButton
                active={data.bold}
                onClick={() => update("bold", !data.bold)}
                title="Жирный"
              >
                <Bold className="h-4 w-4" />
              </SegmentButton>
              <SegmentButton
                active={data.italic}
                onClick={() => update("italic", !data.italic)}
                title="Курсив"
              >
                <Italic className="h-4 w-4" />
              </SegmentButton>
              <SegmentButton
                active={data.underline}
                onClick={() => update("underline", !data.underline)}
                title="Подчёркнутый"
              >
                <Underline className="h-4 w-4" />
              </SegmentButton>
              <div className="w-px self-stretch my-1 bg-border/70" />
              <SegmentButton
                active={data.align === "left"}
                onClick={() => update("align", "left")}
                title="По левому краю"
              >
                <AlignLeft className="h-4 w-4" />
              </SegmentButton>
              <SegmentButton
                active={data.align === "center"}
                onClick={() => update("align", "center")}
                title="По центру"
              >
                <AlignCenter className="h-4 w-4" />
              </SegmentButton>
              <SegmentButton
                active={data.align === "right"}
                onClick={() => update("align", "right")}
                title="По правому краю"
              >
                <AlignRight className="h-4 w-4" />
              </SegmentButton>
            </div>
          </div>

          {/* Letter spacing */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
              <span>Межбуквенный интервал</span>
              <span className="text-terracotta-dark tabular-nums font-medium">
                {data.letterSpacing}px
              </span>
            </label>
            <input
              type="range"
              min={-2}
              max={10}
              step={0.5}
              value={data.letterSpacing}
              onChange={(e) =>
                update("letterSpacing", parseFloat(e.target.value))
              }
              className="w-full"
              style={
                {
                  "--range-progress": `${
                    ((data.letterSpacing - -2) / (10 - -2)) * 100
                  }%`,
                } as React.CSSProperties
              }
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
              <span>Цвет</span>
              <input
                type="color"
                value={data.color}
                onChange={(e) => update("color", e.target.value)}
                className="h-7 w-10 cursor-pointer p-0 rounded-lg border border-border"
              />
            </label>
            <div className="grid grid-cols-6 gap-1.5 mt-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  onClick={() => update("color", c)}
                  className={`aspect-square rounded-lg border-2 transition-all ${
                    data.color.toUpperCase() === c.toUpperCase()
                      ? "border-primary scale-110 shadow-soft"
                      : "border-border hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                >
                  {data.color.toUpperCase() === c.toUpperCase() && (
                    <Check
                      className="h-3 w-3 mx-auto"
                      style={{
                        color: c === "#FFFFFF" || c === "#F5F5F5" ? "#000" : "#fff",
                      }}
                      strokeWidth={2.2}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Hint */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/50 border border-border/50">
            <ChevronRight className="h-3.5 w-3.5 text-terracotta-dark shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Текст применится к PDF после сохранения
            </p>
          </div>
        </div>

        {/* Footer with actions */}
        <div className="px-5 py-4 border-t border-border/40 bg-card/80 backdrop-blur-sm flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="gap-1.5 rounded-xl font-medium flex-1 bg-card border border-border hover:bg-secondary/60"
          >
            <X className="h-4 w-4" />
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={!data.text.trim()}
            className="gap-1.5 shadow-soft rounded-xl font-medium flex-1 bg-ink hover:bg-ink-hover text-white transition-colors disabled:bg-ink/25"
          >
            <Check className="h-4 w-4" strokeWidth={2.2} />
            {mode === "create" ? "Добавить" : "Сохранить"}
          </Button>
        </div>
      </aside>
    </>
  );
}

function SegmentButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex-1 h-8 rounded-lg flex items-center justify-center transition-all ${
        active
          ? "bg-ink text-white shadow-soft"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
      }`}
    >
      {children}
    </button>
  );
}
