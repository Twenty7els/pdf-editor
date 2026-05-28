"use client";

import React, { useRef } from "react";
import { usePdfEditorStore, CustomStamp, AVAILABLE_FONTS } from "@/store/pdf-editor-store";
import { STAMP_DEFINITIONS } from "@/lib/stamps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MousePointer2,
  Stamp,
  Type,
  Download,
  FileUp,
  Loader2,
  X,
  ImagePlus,
  Bold,
  Italic,
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
    customStamps,
    addCustomStamp,
    removeCustomStamp,
    textSettings,
    setTextSettings,
  } = usePdfEditorStore();

  const customStampInputRef = useRef<HTMLInputElement>(null);

  const builtInCustom = STAMP_DEFINITIONS.filter((s) => s.category === "custom");

  const handleCustomStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <>
          {/* Built-in custom stamps */}
          {builtInCustom.length > 0 && (
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-medium">Ваши печати</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  {builtInCustom.map((stamp) => (
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
              </CardContent>
            </Card>
          )}

          {/* User-uploaded custom stamps */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm font-medium">Загруженные печати</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1 flex flex-col gap-2">
              {customStamps.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {customStamps.map((stamp) => (
                    <div
                      key={stamp.id}
                      className="relative flex flex-col items-center gap-1 p-2 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors group"
                    >
                      <button
                        className="flex flex-col items-center gap-1 w-full"
                        onClick={() =>
                          usePdfEditorStore.getState().setSelectedStamp(stamp.id, stamp.dataUrl)
                        }
                      >
                        <img
                          src={stamp.dataUrl}
                          alt={stamp.name}
                          className="w-14 h-14 object-contain"
                          draggable={false}
                        />
                        <span className="text-[10px] text-muted-foreground text-center leading-tight truncate w-full">
                          {stamp.name}
                        </span>
                      </button>
                      <button
                        className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeCustomStamp(stamp.id)}
                        title="Удалить печать"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground text-center">
                  Нет загруженных печатей
                </p>
              )}

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => customStampInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4" />
                Загрузить свою печать
              </Button>

              <input
                ref={customStampInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleCustomStampUpload}
                className="hidden"
              />
            </CardContent>
          </Card>

          <p className="text-[11px] text-muted-foreground text-center px-2">
            Выберите печать, затем кликните на PDF
          </p>
        </>
      )}

      {/* Text settings */}
      {activeTool === "text" && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-medium">Настройки текста</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1 flex flex-col gap-3">
            {/* Font selector */}
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Шрифт</Label>
              <select
                value={textSettings.fontFamily}
                onChange={(e) => setTextSettings({ fontFamily: e.target.value })}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {AVAILABLE_FONTS.map((font) => (
                  <option key={font.id} value={font.id} style={{ fontFamily: font.css }}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Font size + Bold/Italic row */}
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <Label className="text-xs">Размер</Label>
                <Input
                  type="number"
                  min={6}
                  max={96}
                  value={textSettings.fontSize}
                  onChange={(e) =>
                    setTextSettings({ fontSize: parseInt(e.target.value) || 14 })
                  }
                  className="h-8 text-sm"
                />
              </div>
              <Button
                variant={textSettings.bold ? "default" : "outline"}
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setTextSettings({ bold: !textSettings.bold })}
                title="Жирный"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant={textSettings.italic ? "default" : "outline"}
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setTextSettings({ italic: !textSettings.italic })}
                title="Курсив"
              >
                <Italic className="h-4 w-4" />
              </Button>
            </div>

            {/* Color */}
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Цвет</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={textSettings.color}
                  onChange={(e) => setTextSettings({ color: e.target.value })}
                  className="h-8 w-12 cursor-pointer shrink-0 p-0.5"
                />
                <Input
                  type="text"
                  value={textSettings.color}
                  onChange={(e) => setTextSettings({ color: e.target.value })}
                  className="h-8 text-sm font-mono flex-1"
                  maxLength={7}
                />
              </div>
            </div>

            {/* Preview */}
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Предпросмотр</Label>
              <div
                className="h-10 rounded-md border border-input bg-white px-2 flex items-center overflow-hidden"
                style={{
                  fontFamily: AVAILABLE_FONTS.find((f) => f.id === textSettings.fontFamily)?.css || "Arial",
                  fontSize: Math.min(textSettings.fontSize, 20),
                  fontWeight: textSettings.bold ? "bold" : "normal",
                  fontStyle: textSettings.italic ? "italic" : "normal",
                  color: textSettings.color,
                }}
              >
                Пример текста
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              Кликните на PDF чтобы добавить текст
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
