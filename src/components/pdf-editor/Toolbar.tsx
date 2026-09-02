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
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        dataUrl,
      };
      addCustomStamp(customStamp);
    };
    reader.readAsDataURL(file);
    if (customStampInputRef.current) customStampInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* File actions */}
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 h-10 rounded-xl hover:bg-accent/50 transition-all group btn-glow"
          onClick={onUploadClick}
        >
          <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileUp className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-medium">{pdfFile ? "Загрузить другой" : "Загрузить PDF"}</span>
        </Button>
        <Button
          className="w-full justify-start gap-2 h-10 rounded-xl shadow-soft btn-glow shimmer"
          onClick={onDownloadClick}
          disabled={!pdfFile || isDownloading}
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="font-semibold">{isDownloading ? "Подготовка..." : "Скачать PDF"}</span>
        </Button>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

      {/* Tools */}
      <div>
        <div className="flex items-center gap-1.5 mb-2.5 px-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
                className={`group relative flex flex-col items-start gap-1.5 p-3 rounded-xl border transition-all text-left lift ${
                  active
                    ? "border-primary bg-primary/10 shadow-soft"
                    : "border-border/40 hover:border-primary/40 hover:bg-accent/30"
                }`}
              >
                {/* Active glow */}
                {active && (
                  <div className="absolute inset-0 rounded-xl bg-primary/5 pointer-events-none" />
                )}
                <div
                  className={`relative h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                    active
                      ? "gradient-bg shadow-soft"
                      : "bg-muted/40 group-hover:bg-primary/10"
                  }`}
                >
                  <tool.icon
                    className={`h-4 w-4 transition-colors ${
                      active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                    }`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>
                <div className="relative">
                  <div className="text-xs font-semibold leading-tight">{tool.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                    {tool.desc}
                  </div>
                </div>
                {active && (
                  <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
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
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Ваши печати
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {builtInCustom.map((stamp) => (
                  <button
                    key={stamp.id}
                    className="group relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-border/40 hover:border-primary hover:bg-accent/30 transition-all lift overflow-hidden"
                    onClick={() =>
                      usePdfEditorStore
                        .getState()
                        .setSelectedStamp(stamp.id, stamp.src)
                    }
                  >
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                    <div className="relative h-14 w-14 flex items-center justify-center p-1 rounded-lg bg-muted/30 border border-border/30">
                      <img
                        src={stamp.src}
                        alt={stamp.name}
                        className="max-h-full max-w-full object-contain"
                        draggable={false}
                      />
                    </div>
                    <span className="relative text-[10px] text-muted-foreground text-center leading-tight font-semibold">
                      {stamp.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-1.5 mb-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Загруженные
              </span>
              <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded-md bg-muted/40">
                {customStamps.length} шт.
              </span>
            </div>

            {customStamps.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {customStamps.map((stamp) => (
                  <div
                    key={stamp.id}
                    className="group relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-border/40 hover:border-primary hover:bg-accent/30 transition-all lift"
                  >
                    <button
                      className="flex flex-col items-center gap-1.5 w-full"
                      onClick={() =>
                        usePdfEditorStore
                          .getState()
                          .setSelectedStamp(stamp.id, stamp.dataUrl)
                      }
                    >
                      <div className="h-14 w-14 flex items-center justify-center p-1 rounded-lg bg-muted/30 border border-border/30">
                        <img
                          src={stamp.dataUrl}
                          alt={stamp.name}
                          className="max-h-full max-w-full object-contain"
                          draggable={false}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight truncate w-full font-semibold">
                        {stamp.name}
                      </span>
                    </button>
                    <button
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-elevated hover:scale-110"
                      onClick={() => removeCustomStamp(stamp.id)}
                      title="Удалить печать"
                    >
                      <X className="h-3 w-3" strokeWidth={2.8} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground text-center mb-2 py-2 font-medium">
                Нет загруженных печатей
              </p>
            )}

            <Button
              variant="outline"
              className="w-full gap-2 h-9 rounded-xl border-dashed hover:bg-accent/50 font-medium"
              onClick={() => customStampInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4 text-primary" />
              <span className="text-xs">Загрузить свою печать</span>
            </Button>

            <input
              ref={customStampInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleCustomStampUpload}
              className="hidden"
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/8 border border-primary/20">
            <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
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
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-left transition-all border ${
                      active
                        ? "border-primary bg-primary/10 text-foreground shadow-soft"
                        : "border-border/40 hover:border-primary/40 hover:bg-accent/30 text-muted-foreground"
                    }`}
                  >
                    <div className={`h-6 w-6 rounded-md flex items-center justify-center transition-all ${
                      active ? "gradient-bg" : "bg-muted/40"
                    }`}>
                      <Type className={`h-3.5 w-3.5 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} strokeWidth={2.5} />
                    </div>
                    <span className="truncate font-medium">{preset.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/8 border border-primary/20">
            <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Выберите готовый текст или кликните на PDF — откроется редактор с
              предпросмотром, шрифтами, цветами и выравниванием.
            </p>
          </div>
        </div>
      )}

      {/* Eraser tool hint */}
      {activeTool === "eraser" && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/8 border border-primary/20 animate-fade-in">
          <Paintbrush className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" strokeWidth={2.2} />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Настройки ластика — вверху экрана. Рисуйте на PDF чтобы замазать.
          </p>
        </div>
      )}
    </div>
  );
}
