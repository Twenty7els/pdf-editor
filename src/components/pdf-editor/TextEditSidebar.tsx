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
      {/* Backdrop — click to close (only on create mode, in edit mode changes apply live anyway) */}
      <div
        className="fixed inset-0 z-30 bg-foreground/10 backdrop-blur-[1px] animate-fade-in"
        onClick={handleCancel}
      />

      {/* Sidebar panel — left side */}
      <aside className="fixed top-0 left-0 bottom-0 z-40 w-full sm:w-96 max-w-[95vw] bg-card border-r border-border/60 shadow-elevated flex flex-col animate-slide-down">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border/40 bg-card/50 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="absolute inset-0 gradient-bg blur-md rounded-lg opacity-50" />
                <div className="relative h-9 w-9 rounded-xl gradient-bg-tri flex items-center justify-center shadow-soft">
                  <Type className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <div className="font-display font-bold tracking-tight text-base leading-tight">
                  {mode === "create" ? "Новый текст" : "Редактировать текст"}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">
                  {mode === "create" ? "Создание блока" : "Изменение блока"}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl shrink-0"
              onClick={handleCancel}
              title="Закрыть"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Live preview */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
              Предпросмотр
            </label>
            <div className="rounded-xl border border-border/40 bg-muted/20 p-4 min-h-[70px] max-h-[120px] overflow-auto flex items-center justify-center">
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
                  <Sparkles className="h-3.5 w-3.5" />
                  Введите текст ниже
                </div>
              )}
            </div>
          </div>

          {/* Textarea */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center justify-between">
              <span>Текст</span>
              <span className="text-muted-foreground/70 font-normal normal-case tracking-normal">
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
              placeholder="Введите текст... (Enter для новой строки)"
              className="w-full min-h-[100px] resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            <div className="text-[10px] text-muted-foreground mt-1.5">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono border border-border">
                Ctrl+Enter
              </kbd>{" "}
              — сохранить
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

          {/* Font picker */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
              Шрифт
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {AVAILABLE_FONTS.map((font) => {
                const active = data.fontFamily === font.id;
                return (
                  <button
                    key={font.id}
                    onClick={() => update("fontFamily", font.id)}
                    className={`px-2 py-2 rounded-lg border text-center transition-all ${
                      active
                        ? "border-primary bg-primary/10 shadow-soft"
                        : "border-border/60 hover:border-primary/40 hover:bg-accent/30"
                    }`}
                  >
                    <div
                      className="text-sm leading-tight truncate font-medium"
                      style={{ fontFamily: font.css }}
                    >
                      {font.name}
                    </div>
                    <div
                      className="text-[10px] text-muted-foreground mt-0.5"
                      style={{ fontFamily: font.css }}
                    >
                      Аа Бб 123
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center justify-between">
              <span>Размер</span>
              <span className="text-primary tabular-nums font-semibold">
                {data.fontSize}px
              </span>
            </label>
            <input
              type="range"
              min={6}
              max={72}
              step={1}
              value={data.fontSize}
              onChange={(e) => update("fontSize", parseInt(e.target.value))}
              className="w-full"
              style={
                {
                  "--range-progress": `${
                    ((data.fontSize - 6) / (72 - 6)) * 100
                  }%`,
                } as React.CSSProperties
              }
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {SIZE_PRESETS.map((size) => (
                <button
                  key={size}
                  onClick={() => update("fontSize", size)}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold tabular-nums transition-all ${
                    data.fontSize === size
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "bg-muted/50 hover:bg-accent text-muted-foreground"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* B / I / U */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
              Начертание
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <ToggleButton
                active={data.bold}
                onClick={() => update("bold", !data.bold)}
                title="Жирный"
              >
                <Bold className="h-4 w-4" />
              </ToggleButton>
              <ToggleButton
                active={data.italic}
                onClick={() => update("italic", !data.italic)}
                title="Курсив"
              >
                <Italic className="h-4 w-4" />
              </ToggleButton>
              <ToggleButton
                active={data.underline}
                onClick={() => update("underline", !data.underline)}
                title="Подчёркнутый"
              >
                <Underline className="h-4 w-4" />
              </ToggleButton>
            </div>
          </div>

          {/* Alignment */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
              Выравнивание
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <ToggleButton
                active={data.align === "left"}
                onClick={() => update("align", "left")}
                title="По левому краю"
              >
                <AlignLeft className="h-4 w-4" />
              </ToggleButton>
              <ToggleButton
                active={data.align === "center"}
                onClick={() => update("align", "center")}
                title="По центру"
              >
                <AlignCenter className="h-4 w-4" />
              </ToggleButton>
              <ToggleButton
                active={data.align === "right"}
                onClick={() => update("align", "right")}
                title="По правому краю"
              >
                <AlignRight className="h-4 w-4" />
              </ToggleButton>
            </div>
          </div>

          {/* Letter spacing */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center justify-between">
              <span>Межбуквенный интервал</span>
              <span className="text-primary tabular-nums font-semibold">
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
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center justify-between">
              <span>Цвет</span>
              <input
                type="color"
                value={data.color}
                onChange={(e) => update("color", e.target.value)}
                className="h-7 w-10 cursor-pointer p-0 rounded-md border border-border"
              />
            </label>
            <div className="grid grid-cols-6 gap-1.5 mt-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  onClick={() => update("color", c)}
                  className={`aspect-square rounded-md border-2 transition-all ${
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
                      strokeWidth={3}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Hint */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/8 border border-primary/20">
            <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Текст применится к PDF после сохранения
            </p>
          </div>
        </div>

        {/* Footer with actions */}
        <div className="px-5 py-4 border-t border-border/40 bg-card/50 flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="gap-1.5 rounded-xl font-medium flex-1"
          >
            <X className="h-4 w-4" />
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={!data.text.trim()}
            className="gap-1.5 shadow-soft btn-glow shimmer rounded-xl font-semibold flex-1"
          >
            <Check className="h-4 w-4" strokeWidth={2.5} />
            {mode === "create" ? "Добавить" : "Сохранить"}
          </Button>
        </div>
      </aside>
    </>
  );
}

function ToggleButton({
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
      className={`h-9 rounded-lg border flex items-center justify-center transition-all ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-soft"
          : "border-border/60 hover:border-primary/40 hover:bg-accent/30 text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
