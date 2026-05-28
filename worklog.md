---
Task ID: 3
Agent: main
Task: Remove standard stamps + add resize/rotate handles on canvas

Work Log:
- Removed all 6 preset stamps (ОДОБРЕНО, КОНФИДЕНЦИАЛЬНО, ЧЕРНОВИК, ОПЛАЧЕНО, НА РАССМОТРЕНИИ, ПРОВЕРЕНО) from stamps.ts
- Removed "Стандартные печати" section from Toolbar
- Added 4 corner resize handles (tl, tr, bl, br) to selected stamps on canvas overlay
- Added rotation handle (circular icon above stamp, connected by line) for free rotation
- Resize handles work by dragging corners to change width/height independently
- Rotation handle calculates angle from element center to mouse position
- Shift+rotate snaps to 15° increments
- Updated Toolbar properties panel: separate width/height numeric inputs, rotation degree input
- Opacity slider shows percentage value
- Min stamp size enforced at 20px
- Pushed to GitHub commit 8de0894

Stage Summary:
- Standard stamps removed completely
- Stamps can now be resized by dragging corner handles on canvas
- Stamps can be rotated freely by dragging rotation handle
- Properties panel has numeric width/height/rotation inputs

---
Task ID: 4
Agent: main
Task: Move text settings to top horizontal bar, change eraser from rectangle to brush

Work Log:
- Changed EraserItem interface from rectangle (x,y,width,height) to brush path (points array, strokeWidth)
- Changed eraserSettings from {width, height, color} to {brushSize, color}
- Updated PdfCanvas to render eraser strokes as SVG paths with thick white stroke
- Added freehand drawing: mouse down starts stroke, mouse move adds points, mouse up finishes
- Moved text settings to floating top bar (shown when text tool is active)
- Added eraser settings to floating top bar (brush size slider + color picker + quick colors)
- Removed text/eraser settings from sidebar Toolbar
- Updated eraser scaling for zoom (scale points and strokeWidth proportionally)
- Updated PDF download to render eraser paths as line segments using page.drawLine()
- Fixed unused imports (EraserItem, Input, Eraser icon)
- Build verified successfully

Stage Summary:
- Text settings now appear in top horizontal bar when text tool is active
- Eraser now works as freehand brush instead of rectangle
- Eraser strokes rendered as SVG paths in overlay
- PDF export renders eraser paths as thick line segments
- Sidebar simplified to only tool selection and stamp picker
