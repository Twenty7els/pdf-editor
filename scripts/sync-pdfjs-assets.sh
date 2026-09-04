#!/usr/bin/env bash
# Синхронизирует бинарные ассеты pdfjs-dist в public/ после обновления пакета.
# Запуск: bash scripts/sync-pdfjs-assets.sh
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="node_modules/pdfjs-dist"

mkdir -p public/pdf-wasm public/pdf-fonts public/cmaps
cp "$SRC"/wasm/*.wasm "$SRC"/wasm/*_nowasm_fallback.js public/pdf-wasm/
cp "$SRC"/standard_fonts/*.pfb "$SRC"/standard_fonts/*.ttf public/pdf-fonts/ 2>/dev/null || true
cp "$SRC"/standard_fonts/LICENSE public/pdf-fonts/ 2>/dev/null || true
cp "$SRC"/cmaps/*.bcmap public/cmaps/

echo "✓ public/pdf-wasm:  $(ls public/pdf-wasm | wc -l) files"
echo "✓ public/pdf-fonts: $(ls public/pdf-fonts | wc -l) files"
echo "✓ public/cmaps:     $(ls public/cmaps | wc -l) files"
