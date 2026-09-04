/**
 * Общие опции загрузки PDF для pdf.js (getDocument).
 *
 * ВАЖНО: в pdf.js v5/v6 декодеры JBIG2, JPEG2000 (JPX) и цветовых профилей
 * (ICC/qcms) вынесены в WASM-модули, которые подгружаются по `wasmUrl`.
 * Без этой опции изображения, сжатые JBIG2 (штрих-коды, печати и маски
 * прозрачности на сканах из 1С и банковского софта), молча не рендерятся —
 * в консоль падает лишь "Warning: Dependent image isn't ready yet", а на
 * странице остаётся пустое место или только текст под штрих-кодом.
 *
 * standardFontDataUrl — запасные шрифты (Foxit/Liberation) для PDF, где
 * шрифты НЕ встроены (ссылки на системные Windows-шрифты: TimesNewRomanPSMT,
 * Candara, ArialUnicodeMS...). Без него части текста (линии из "__",
 * кириллица) могут не отрисоваться — "Cannot load system font".
 *
 * cMapUrl — упакованные CMap-таблицы для CID-шрифтов без встроенных cmaps.
 *
 * Файлы лежат в public/pdf-wasm, public/pdf-fonts, public/cmaps
 * (скопированы из node_modules/pdfjs-dist скриптом scripts/sync-pdfjs-assets.sh).
 */
export const PDFJS_DOC_OPTIONS = {
  wasmUrl: "/pdf-wasm/",
  standardFontDataUrl: "/pdf-fonts/",
  cMapUrl: "/cmaps/",
  cMapPacked: true,
} as const;
