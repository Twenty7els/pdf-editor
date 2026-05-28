"use client";

import React from "react";
import { usePdfEditorStore } from "@/store/pdf-editor-store";
import { STAMP_DEFINITIONS } from "@/lib/stamps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  MousePointer2,
  Stamp,
  Type,
  Trash2,
  RotateCw,
  Download,
  FileUp,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Loader2,
} from "lucide-react";

interface ToolbarProps {
  onUploadClick: () => void;
  onDownloadClick: () => void;
  isDownloading?: boolean;
}

export default function Toolbar({ onUploadClick, onDownloadClick, isDownloading }: ToolbarProps) {
  const {
    pdfFile,
    activeTool,
    setActiveTool,
    stamps,
    texts,
    selectedItemId,
    selectedItemType,
    updateStamp,
    updateText,
    removeStamp,
    removeText,
  } = usePdfEditorStore();

  const selectedStamp = stamps.find((s) => s.id === selectedItemId);
  const selectedText = texts.find((t) => t.id === selectedItemId);
  const hasSelection = selectedItemId !== null;

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* File actions */}
      <Card>
        <CardContent className="p-3 flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={onUploadClick}
          >
            <FileUp className="h-4 w-4" />
            {pdfFile ? "Загрузить другой" : "Загрузить PDF"}
          </Button>
          <Button
            className="w-full justify-start gap-2"
            onClick={onDownloadClick}
            disabled={!pdfFile || isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isDownloading ? "Подготовка..." : "Скачать PDF"}
          </Button>
        </CardContent>
      </Card>

      {/* Tools */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-medium">Инструменты</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1 flex flex-col gap-1.5">
          <Button
            variant={activeTool === "select" ? "default" : "outline"}
            className="w-full justify-start gap-2"
            onClick={() => setActiveTool("select")}
          >
            <MousePointer2 className="h-4 w-4" />
            Выбор
          </Button>
          <Button
            variant={activeTool === "stamp" ? "default" : "outline"}
            className="w-full justify-start gap-2"
            onClick={() => setActiveTool("stamp")}
          >
            <Stamp className="h-4 w-4" />
            Печать
          </Button>
          <Button
            variant={activeTool === "text" ? "default" : "outline"}
            className="w-full justify-start gap-2"
            onClick={() => setActiveTool("text")}
          >
            <Type className="h-4 w-4" />
            Текст
          </Button>
        </CardContent>
      </Card>

      {/* Stamps selector */}
      {activeTool === "stamp" && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-medium">Печати</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="grid grid-cols-2 gap-2">
              {STAMP_DEFINITIONS.map((stamp) => (
                <button
                  key={stamp.id}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors"
                  onClick={() =>
                    usePdfEditorStore.getState().setSelectedStamp(stamp.id, stamp.src)
                  }
                >
                  <img
                    src={stamp.src}
                    alt={stamp.name}
                    className="w-14 h-14 object-contain"
                    draggable={false}
                  />
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">
                    {stamp.name}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Выберите печать, затем кликните на PDF
            </p>
          </CardContent>
        </Card>
      )}

      {/* Text settings */}
      {activeTool === "text" && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-medium">Настройки текста</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1 flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Размер шрифта</Label>
              <Input
                type="number"
                min={8}
                max={72}
                value={usePdfEditorStore.getState().textSettings.fontSize}
                onChange={(e) =>
                  usePdfEditorStore
                    .getState()
                    .setTextSettings({ fontSize: parseInt(e.target.value) || 16 })
                }
                className="h-8 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Цвет</Label>
              <Input
                type="color"
                value={usePdfEditorStore.getState().textSettings.color}
                onChange={(e) =>
                  usePdfEditorStore
                    .getState()
                    .setTextSettings({ color: e.target.value })
                }
                className="h-8 w-full cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Кликните на PDF чтобы добавить текст
            </p>
          </CardContent>
        </Card>
      )}

      {/* Selected item properties */}
      {hasSelection && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-medium">
              {selectedItemType === "stamp" ? "Свойства печати" : "Свойства текста"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1 flex flex-col gap-2.5">
            {/* Rotation */}
            <div className="flex items-center gap-2">
              <Label className="text-xs w-16">Поворот</Label>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    if (selectedItemType === "stamp" && selectedStamp) {
                      updateStamp(selectedItemId!, { rotation: selectedStamp.rotation - 15 });
                    } else if (selectedItemType === "text" && selectedText) {
                      updateText(selectedItemId!, { rotation: selectedText.rotation - 15 });
                    }
                  }}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    if (selectedItemType === "stamp" && selectedStamp) {
                      updateStamp(selectedItemId!, { rotation: selectedStamp.rotation + 15 });
                    } else if (selectedItemType === "text" && selectedText) {
                      updateText(selectedItemId!, { rotation: selectedText.rotation + 15 });
                    }
                  }}
                >
                  <RotateCw className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Opacity for stamps */}
            {selectedItemType === "stamp" && selectedStamp && (
              <div className="flex items-center gap-2">
                <Label className="text-xs w-16">Прозрачность</Label>
                <Input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={selectedStamp.opacity}
                  onChange={(e) =>
                    updateStamp(selectedItemId!, { opacity: parseFloat(e.target.value) })
                  }
                  className="flex-1 h-7"
                />
              </div>
            )}

            {/* Size for stamps */}
            {selectedItemType === "stamp" && selectedStamp && (
              <div className="flex items-center gap-2">
                <Label className="text-xs w-16">Размер</Label>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      updateStamp(selectedItemId!, {
                        width: Math.max(40, selectedStamp.width - 20),
                        height: Math.max(40, selectedStamp.height - 20),
                      })
                    }
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      updateStamp(selectedItemId!, {
                        width: selectedStamp.width + 20,
                        height: selectedStamp.height + 20,
                      })
                    }
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Font size for text */}
            {selectedItemType === "text" && selectedText && (
              <div className="flex items-center gap-2">
                <Label className="text-xs w-16">Размер</Label>
                <Input
                  type="number"
                  min={8}
                  max={72}
                  value={selectedText.fontSize}
                  onChange={(e) =>
                    updateText(selectedItemId!, { fontSize: parseInt(e.target.value) || 16 })
                  }
                  className="h-7 text-sm flex-1"
                />
              </div>
            )}

            <Separator />

            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                if (selectedItemType === "stamp") removeStamp(selectedItemId!);
                else removeText(selectedItemId!);
                usePdfEditorStore.getState().setSelectedItem(null, null);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Удалить
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Hints */}
      <Card>
        <CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <b>Ctrl + колесо</b> — масштаб<br/>
            <b>← →</b> — листать страницы<br/>
            <b>Delete</b> — удалить элемент<br/>
            <b>2× клик</b> — редактировать текст
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
