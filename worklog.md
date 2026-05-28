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
