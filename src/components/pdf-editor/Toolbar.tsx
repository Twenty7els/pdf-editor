"use client";

import React, { useRef } from "react";
import { usePdfEditorStore, type CustomStamp } from "@/store/pdf-editor-store";
import { STAMP_DEFINITIONS } from "@/lib/stamps";
import { Button } from "@/components/ui/button";
import {
  MousePointer2,
  Stamp,
  Type,
  Download,
  FileUp,
  Loader2,
  X,
  ImagePlus,
  Paintbrush,
  ChevronRight,
} from "lucide-react";

const PRESET_TEXTS = [
  { id: "preset-dover", text: "Представитель по доверенности" },
  { id: "preset-litvinkin", text: "Литвинкин Андрей Владимирович" },
] as const;

const TOOLS = [
  {
    id: "select" as const,
    label: "Выбор",
    icon: MousePointer2,
    desc: "Перемещение",
  },
  { id: "stamp" as const, label: "Печать", icon: Stamp, desc: "Печати и подписи" },
  { id: "text" as const, label: "Текст", icon: Type, desc: "Текстовые блоки" },
  { id: "eraser" as const, label: "Ластик", icon: Paintbrush, desc: "Замазывание" },
];

interface ToolbarProps {
  onUploadClick: () => void;
  onDownloadClick: () => void;
  isDownloading?: boolean;
}

export default function Toolbar({
  onUploadClick,
  onDownloadClick,
  isDownloading,
}: ToolbarProps) {
  const {
    pdfFile,
    activeTool,
    setActiveTool,
    selectedStampType,
    customStamps,
    addCustomStamp,
    removeCustomStamp,
    presetText,
    setPresetText,
  } = usePdfEditorStore();

  const customStampInputRef = useRef<HTMLInputElement>(null);

  const builtInCustom = STAMP_DEFINITIONS.filter((s) => s.category === "custom");

  const handleCustomStampUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const name = file.name.replace(/\.[^/.]+$/, "");
      const customStamp: CustomStamp = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        name,
        dataUrl,
      };
      addCustomStamp(customStamp);
    };
    reader.readAsDataURL(file);
    if (customStampInputRef.current) customStampInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* File actions — compact pair */}
      <div className="grid grid-cols-2 gap-1.5">
        <Button
          variant="outline"
          className="w-full justify-center gap-1 px-1 h-9 rounded-lg border-border bg-card text-foreground hover:bg-secondary/60 text-xs font-medium transition-colors"
          onClick={onUploadClick}
        >
          <FileUp className="size-3.5 text-terracotta-dark" />
          <span>
            {pdfFile ? "Загрузить другой" : "Загрузить PDF"}
          </span>
        </Button>
        <Button
          className="w-full justify-center gap-1 px-1 h-9 rounded-lg bg-ink hover:bg-ink-hover text-white shadow-soft text-xs font-medium transition-colors"
          onClick={onDownloadClick}
          disabled={!pdfFile || isDownloading}
        >
          {isDownloading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          <span>
            {isDownloading ? "Подготовка..." : "Скачать PDF"}
          </span>
        </Button>
      </div>

      <div className="h-px bg-border/50 mx-4" />

      {/* Tools */}
      <div>
        <div className="flex items-center gap-1.5 mb-2.5 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Инструменты
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {TOOLS.map((tool) => {
            const active = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                aria-pressed={active}
                className={`group relative flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border transition-all text-center lift ${
                  active
                    ? "border-primary/40 bg-terracotta-soft/50 shadow-soft"
                    : "border-border bg-card hover:border-primary/30 hover:shadow-soft"
                }`}
              >
                <div
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    active ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <tool.icon
                    className={`h-4 w-4 transition-colors ${
                      active ? "text-white" : "text-muted-foreground"
                    }`}
                    strokeWidth={active ? 2.2 : 2}
                  />
                </div>
                <div className="text-[11px] font-medium leading-tight">
                  {tool.label}
                </div>
                <div className="hidden text-[11px] text-muted-foreground leading-tight mt-0.5">
                  {tool.desc}
                </div>
                {active && (
                  <div className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-terracotta" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stamps selector */}
      {activeTool === "stamp" && (
        <div className="flex flex-col gap-3 animate-fade-in">
          {builtInCustom.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Ваши печати
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {builtInCustom.map((stamp) => {
                  const selected = selectedStampType === stamp.id;
                  return (
                    <button
                      key={stamp.id}
                      className={`group relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all lift overflow-hidden ${
                        selected
                          ? "border-primary/50 bg-terracotta-soft/40"
                          : "border-border bg-card hover:border-primary/30 hover:shadow-soft"
                      }`}
                      onClick={() =>
                        usePdfEditorStore
                          .getState()
                          .setSelectedStamp(stamp.id, stamp.src)
                      }
                    >
                      <div className="relative h-14 w-14 flex items-center justify-center p-1 rounded-lg bg-secondary/50 border border-border/60">
                        <img
                          src={stamp.src}
                          alt={stamp.name}
                          className="max-h-full max-w-full object-contain"
                          draggable={false}
                        />
                      </div>
                      <span className="relative text-[10px] text-muted-foreground text-center leading-tight font-medium">
                        {stamp.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-1.5 mb-2 px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Загруженные
              </span>
              <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-secondary tabular-nums">
                {customStamps.length} шт.
              </span>
            </div>

            {customStamps.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {customStamps.map((stamp) => {
                  const selected = selectedStampType === stamp.id;
                  return (
                    <div
                      key={stamp.id}
                      className={`group relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all lift ${
                        selected
                          ? "border-primary/50 bg-terracotta-soft/40"
                          : "border-border bg-card hover:border-primary/30 hover:shadow-soft"
                      }`}
                    >
                      <button
                        className="flex flex-col items-center gap-1.5 w-full"
                        onClick={() =>
                          usePdfEditorStore
                            .getState()
                            .setSelectedStamp(stamp.id, stamp.dataUrl)
                        }
                      >
                        <div className="h-14 w-14 flex items-center justify-center p-1 rounded-lg bg-secondary/50 border border-border/60">
                          <img
                            src={stamp.dataUrl}
                            alt={stamp.name}
                            className="max-h-full max-w-full object-contain"
                            draggable={false}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground text-center leading-tight truncate w-full font-medium">
                          {stamp.name}
                        </span>
                      </button>
                      <button
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-soft hover:scale-110"
                        onClick={() => removeCustomStamp(stamp.id)}
                        title="Удалить печать"
                        aria-label={`Удалить печать ${stamp.name}`}
                      >
                        <X className="h-3 w-3" strokeWidth={2} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground text-center mb-2 py-2 font-medium">
                Нет загруженных печатей
              </p>
            )}

            <Button
              variant="outline"
              className="w-full gap-2 h-9 rounded-xl border-dashed border-border bg-card hover:border-primary/40 hover:bg-terracotta-soft/20 font-medium"
              onClick={() => customStampInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4 text-terracotta-dark" />
              <span className="text-xs">Загрузить свою печать</span>
            </Button>

            <input
              ref={customStampInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleCustomStampUpload}
              className="hidden"
              aria-label="Загрузить изображение печати"
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-secondary/50 border border-border/50 px-2.5 py-2">
            <ChevronRight
              className="h-3 w-3 text-terracotta-dark shrink-0 mt-0.5"
              strokeWidth={2}
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Выберите печать, затем кликните на PDF
            </p>
          </div>
        </div>
      )}

      {/* Text tool presets */}
      {activeTool === "text" && (
        <div className="flex flex-col gap-3 animate-fade-in">
          <div>
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Готовые тексты
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {PRESET_TEXTS.map((preset) => {
                const active = presetText === preset.text;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      if (presetText === preset.text) {
                        setPresetText(null);
                      } else {
                        setPresetText(preset.text);
                      }
                    }}
                    aria-pressed={active}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-left transition-all border ${
                      active
                        ? "border-primary/40 bg-terracotta-soft/50 text-foreground shadow-soft"
                        : "border-border bg-card hover:border-primary/30 hover:shadow-soft text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all ${
                        active ? "bg-primary" : "bg-secondary"
                      }`}
                    >
                      <Type
                        className={`h-3.5 w-3.5 ${
                          active ? "text-white" : "text-muted-foreground"
                        }`}
                        strokeWidth={active ? 2.2 : 2}
                      />
                    </div>
                    <span className="truncate font-medium">{preset.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-secondary/50 border border-border/50 px-2.5 py-2">
            <ChevronRight
              className="h-3 w-3 text-terracotta-dark shrink-0 mt-0.5"
              strokeWidth={2}
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Выберите готовый текст или кликните на PDF — откроется редактор
              с предпросмотром, шрифтами, цветами и выравниванием.
            </p>
          </div>
        </div>
      )}

      {/* Eraser tool hint */}
      {activeTool === "eraser" && (
        <div className="flex items-start gap-2 rounded-lg bg-secondary/50 border border-border/50 px-2.5 py-2 animate-fade-in">
          <ChevronRight
            className="h-3 w-3 text-terracotta-dark shrink-0 mt-0.5"
            strokeWidth={2}
          />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Настройки ластика — вверху экрана. Рисуйте на PDF чтобы замазать.
          </p>
        </div>
      )}
    </div>
  );
}
