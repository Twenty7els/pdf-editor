---
Task ID: 1
Agent: main
Task: Fix PDF download reliability and coordinate mapping

Work Log:
- Identified root cause: download was going through API route `/api/modify-pdf` which has body size limits, causing large PDFs to fail
- Rewrote download function to use pdf-lib directly in the browser (client-side) - no more API call, no body size limits
- Added `canvasWidth` and `canvasHeight` fields to StampItem and TextItem interfaces for accurate coordinate conversion
- Updated PdfCanvas.tsx to store overlay dimensions when creating stamp/text elements
- Added `isDownloading` state to prevent double-clicks and show loading spinner on download button
- Added `Loader2` spinner icon to Toolbar download button during processing
- Used `toast.dismiss(loadingToast)` for proper toast lifecycle management
- Verified build compiles successfully with `npx next build`
- Pushed to GitHub: `Twenty7els/pdf-editor` commit 8e4f42c

Stage Summary:
- Download now works entirely client-side via pdf-lib (no server round-trip)
- Coordinate mapping uses stored canvas dimensions per element
- Download button shows loading state and prevents double-clicks
- Token removed from git remote after push
