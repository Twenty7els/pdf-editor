"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import {
  AVAILABLE_FONTS,
  getFontCss,
  type TextAlign,
} from "@/store/pdf-editor-store";

export interface TextModalData {
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

interface TextEditModalProps {
  open: boolean;
  mode: "create" | "edit";
  initialData: TextModalData | null;
  onOpenChange: (open: boolean) => void;
  onSave: (data: TextModalData) => void;
}

const COLOR_SWATCHES = [
  "#000000",
  "#FFFFFF",
  "#1F2937",
  "#6B7280",
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

const DEFAULT_DATA: TextModalData = {
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

export default function TextEditModal({
  open,
  mode,
  initialData,
  onOpenChange,
  onSave,
}: TextEditModalProps) {
  const [data, setData] = useState<TextModalData>(DEFAULT_DATA);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setData(initialData ?? DEFAULT_DATA);
      // Focus textarea after dialog opens
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 100);
    }
  }, [open, initialData]);

  const update = <K extends keyof TextModalData>(
    key: K,
    value: TextModalData[K]
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!data.text.trim()) {
      onOpenChange(false);
      return;
    }
    onSave(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Live preview scaled to fit
  const previewScale = useMemo(() => {
    // Scale down if fontSize is large
    if (data.fontSize > 32) return 32 / data.fontSize;
    return 1;
  }, [data.fontSize]);

  const previewLines = useMemo(
    () => data.text.split("\n"),
    [data.text]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-hidden p-0 gap-0">
        {/* Header with gradient accent */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="h-8 w-8 rounded-lg gradient-bg flex items-center justify-center shadow-soft">
              <Type className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span>
              {mode === "create" ? "Новый текст" : "Редактировать текст"}
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {mode === "create"
              ? "Создание нового текстового блока на PDF"
              : "Редактирование существующего текстового блока"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row max-h-[calc(90vh-180px)] overflow-hidden">
          {/* Left: Textarea + Preview */}
          <div className="flex-1 flex flex-col p-6 gap-4 min-h-0 border-r border-border/60">
            {/* Live preview */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 min-h-[80px] max-h-[140px] overflow-auto flex items-center justify-center">
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
                        textDecoration: data.underline
                          ? "underline"
                          : "none",
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
                  Предпросмотр появится здесь
                </div>
              )}
            </div>

            {/* Textarea */}
            <div className="flex-1 flex flex-col min-h-0">
              <label className="text-xs font-medium text-muted-foreground mb-2">
                Текст
                <span className="ml-2 text-[10px] text-muted-foreground/70">
                  (поддерживается многострочный — нажмите Enter)
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
                placeholder="Введите текст..."
                className="flex-1 min-h-[120px] resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                <span>{data.text.length} символов</span>
                <span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono border border-border">
                    Ctrl+Enter
                  </kbd>{" "}
                  сохранить
                </span>
              </div>
            </div>
          </div>

          {/* Right: Styling controls */}
          <div className="w-full lg:w-72 p-6 space-y-5 overflow-y-auto bg-muted/20">
            {/* Font picker */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
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
                        className="text-sm leading-tight truncate"
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
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
                <span>Размер</span>
                <span className="text-primary tabular-nums">
                  {data.fontSize}px
                </span>
              </label>
              <input
                type="range"
                min={6}
                max={72}
                step={1}
                value={data.fontSize}
                onChange={(e) =>
                  update("fontSize", parseInt(e.target.value))
                }
                className="w-full"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {SIZE_PRESETS.map((size) => (
                  <button
                    key={size}
                    onClick={() => update("fontSize", size)}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium tabular-nums transition-all ${
                      data.fontSize === size
                        ? "bg-primary text-primary-foreground"
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
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
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
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
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
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
                <span>Межбуквенный интервал</span>
                <span className="text-primary tabular-nums">
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
              />
            </div>

            {/* Color */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
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
                          color:
                            c === "#FFFFFF" || c === "#F5F5F5"
                              ? "#000"
                              : "#fff",
                        }}
                        strokeWidth={3}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 flex-row justify-between items-center sm:justify-between">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Изменения применятся к выбранному тексту на PDF
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="gap-1.5"
            >
              <X className="h-4 w-4" />
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={!data.text.trim()}
              className="gap-1.5 shadow-soft hover:shadow-glow"
            >
              <Check className="h-4 w-4" />
              {mode === "create" ? "Добавить" : "Сохранить"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
