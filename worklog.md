---
Task ID: 2
Agent: main
Task: Add user's custom stamps and upload feature

Work Log:
- Analyzed uploaded images with VLM: 2 signatures + 1 round company seal (ООО «Предприятие общественного питания Расчетный центр»)
- Copied 3 custom stamp images to /public/stamps/ (custom-seal-ooo.png, custom-signature-1.png, custom-signature-2.png)
- Updated stamps.ts with category field ("preset" | "custom") and added 3 custom stamps
- Added CustomStamp interface to store with dataUrl (base64) support
- Added addCustomStamp/removeCustomStamp actions to store
- Updated Toolbar with 3 stamp sections: standard, your stamps (pre-loaded), uploaded stamps (with upload button)
- Upload button reads image as dataURL for client-side pdf-lib embedding
- Delete button (X) on hover for user-uploaded stamps
- Added upload/ folder to .gitignore
- Built successfully, pushed to GitHub

Stage Summary:
- User's 3 stamps are now in the editor under "Ваши печати" section
- New "Загрузить свою печать" button allows uploading any PNG/JPG image as a stamp
- Uploaded stamps are stored as base64 data URLs and embedded directly in PDF on download
