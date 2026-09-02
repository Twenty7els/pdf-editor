"use client";

import React, { useMemo } from "react";
import { usePdfEditorStore } from "@/store/pdf-editor-store";
import { STAMP_DEFINITIONS } from "@/lib/stamps";
import {
  Stamp,
  Type,
  Paintbrush,
  Eye,
  EyeOff,
  Trash2,
  Layers,
  ChevronRight,
} from "lucide-react";

interface LayersPanelProps {
  currentPage: number;
  totalPages: number;
}

type LayerType = "stamp" | "text" | "eraser";

interface LayerEntry {
  id: string;
  type: LayerType;
  label: string;
  sublabel: string;
  page: number;
  hidden: boolean;
  // For stamp thumbnail
  thumbSrc?: string;
}

export default function LayersPanel({
  currentPage,
  totalPages,
}: LayersPanelProps) {
  const {
    stamps,
    texts,
    erasers,
    customStamps,
    selectedItemId,
    selectedItemType,
    setSelectedItem,
    toggleItemHidden,
    removeStamp,
    removeText,
    removeEraser,
  } = usePdfEditorStore();

  // Resolve a human-readable name for any stamp (preset, built-in or uploaded)
  const getStampLabel = useMemo(() => {
    return (type: string): string => {
      const def = STAMP_DEFINITIONS.find((s) => s.id === type);
      if (def) return def.name;
      const custom = customStamps.find((s) => s.id === type);
      if (custom) return custom.name;
      return "Печать";
    };
  }, [customStamps]);

  // Combine all items into a unified layer list, newest first
  const layers = useMemo<LayerEntry[]>(() => {
    const stampLayers: LayerEntry[] = stamps.map((s) => ({
      id: s.id,
      type: "stamp" as const,
      label: getStampLabel(s.type),
      sublabel: `Печать · стр. ${s.page}`,
      page: s.page,
      hidden: !!s.hidden,
      thumbSrc: s.src,
    }));
    const textLayers: LayerEntry[] = texts.map((t) => ({
      id: t.id,
      type: "text" as const,
      label: t.text.split("\n")[0].slice(0, 28) || "Пустой текст",
      sublabel: `Текст · стр. ${t.page} · ${t.fontSize}px`,
      page: t.page,
      hidden: !!t.hidden,
    }));
    const eraserLayers: LayerEntry[] = erasers.map((e) => ({
      id: e.id,
      type: "eraser" as const,
      label: "Мазок ластика",
      sublabel: `Ластик · стр. ${e.page} · ${e.points.length} точек`,
      page: e.page,
      hidden: !!e.hidden,
    }));
    // Newest first (items pushed at end → reverse)
    return [...stampLayers, ...textLayers, ...eraserLayers].reverse();
  }, [stamps, texts, erasers, getStampLabel]);

  const counts = useMemo(
    () => ({
      stamps: stamps.length,
      texts: texts.length,
      erasers: erasers.length,
      total: stamps.length + texts.length + erasers.length,
    }),
    [stamps, texts, erasers]
  );

  const handleSelect = (layer: LayerEntry) => {
    setSelectedItem(layer.id, layer.type);
  };

  const handleToggleHidden = (e: React.MouseEvent, layer: LayerEntry) => {
    e.stopPropagation();
    toggleItemHidden(layer.id, layer.type);
  };

  const handleDelete = (e: React.MouseEvent, layer: LayerEntry) => {
    e.stopPropagation();
    if (layer.type === "stamp") removeStamp(layer.id);
    else if (layer.type === "text") removeText(layer.id);
    else removeEraser(layer.id);
    if (selectedItemId === layer.id) setSelectedItem(null, null);
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Header with counts */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-ink flex items-center justify-center shadow-soft">
            <Layers className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Слои
          </span>
        </div>
        <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded-lg bg-secondary/70 tabular-nums">
          {counts.total}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1.5">
        <StatChip icon={Stamp} count={counts.stamps} label="Печати" />
        <StatChip icon={Type} count={counts.texts} label="Тексты" />
        <StatChip icon={Paintbrush} count={counts.erasers} label="Ластик" />
      </div>

      <div className="h-px bg-border/70" />

      {/* Layers list */}
      {layers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="h-12 w-12 rounded-xl bg-secondary/60 flex items-center justify-center">
            <Layers className="h-5 w-5 text-muted-foreground/60" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            Пока нет слоёв
          </p>
          <p className="text-[10px] text-muted-foreground/70 leading-relaxed max-w-[200px]">
            Добавьте печати, текст или ластики — они появятся здесь
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto pr-1 -mr-1">
          {layers.map((layer) => {
            const isSelected =
              selectedItemId === layer.id && selectedItemType === layer.type;
            const Icon =
              layer.type === "stamp"
                ? Stamp
                : layer.type === "text"
                ? Type
                : Paintbrush;
            const onCurrentPage = layer.page === currentPage;
            return (
              <div
                key={`${layer.type}-${layer.id}`}
                className={`group relative flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-soft"
                    : onCurrentPage
                    ? "border-border/70 hover:border-primary/40 hover:bg-accent"
                    : "border-border/50 opacity-60 hover:opacity-100 hover:border-border"
                }`}
                onClick={() => handleSelect(layer)}
              >
                {/* Icon / thumbnail */}
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-primary" : "bg-secondary/70"
                  }`}
                >
                  {layer.type === "stamp" && layer.thumbSrc ? (
                    <img
                      src={layer.thumbSrc}
                      alt=""
                      className="h-7 w-7 object-contain"
                      draggable={false}
                    />
                  ) : (
                    <Icon
                      className={`h-4 w-4 ${
                        isSelected ? "text-white" : "text-muted-foreground"
                      }`}
                      strokeWidth={isSelected ? 2.2 : 2}
                    />
                  )}
                </div>

                {/* Labels */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate leading-tight">
                    {layer.label || "\u00A0"}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                    {layer.sublabel}
                    {!onCurrentPage && (
                      <span className="ml-1 text-amber-600">· другая стр.</span>
                    )}
                  </div>
                </div>

                {/* Page badge if not current */}
                {!onCurrentPage && (
                  <span className="text-[10px] font-medium text-muted-foreground/70 px-1.5 py-0.5 rounded-lg bg-secondary/70 shrink-0 tabular-nums">
                    {layer.page}
                  </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleToggleHidden(e, layer)}
                    className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
                      layer.hidden
                        ? "text-amber-600 hover:bg-amber-500/10"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                    title={layer.hidden ? "Показать" : "Скрыть"}
                  >
                    {layer.hidden ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, layer)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Hidden indicator (always visible when hidden) */}
                {layer.hidden && (
                  <div className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hint */}
      {layers.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/60 border border-border/60">
          <ChevronRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Клик — выбрать · наведи для скрытия/удаления
          </p>
        </div>
      )}
    </div>
  );
}

function StatChip({
  icon: Icon,
  count,
  label,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  count: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-secondary/50 border border-border/60">
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3 text-primary" />
        <span className="text-sm font-semibold tabular-nums">{count}</span>
      </div>
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}
