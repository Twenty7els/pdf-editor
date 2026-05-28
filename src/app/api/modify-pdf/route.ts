import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfBase64, stamps, texts, pageScales } = body as {
      pdfBase64: string;
      stamps: {
        id: string;
        type: string;
        imageDataUrl: string;
        x: number;
        y: number;
        width: number;
        height: number;
        page: number;
        rotation: number;
        opacity: number;
        canvasWidth: number;
        canvasHeight: number;
      }[];
      texts: {
        id: string;
        text: string;
        x: number;
        y: number;
        fontSize: number;
        color: string;
        page: number;
        fontFamily: string;
        bold: boolean;
        rotation: number;
        canvasWidth: number;
        canvasHeight: number;
      }[];
      pageScales: Record<number, number>;
    };

    // Load the PDF
    const pdfBytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Embed fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);

    // Process stamps
    for (const stamp of stamps) {
      const page = pdfDoc.getPage(stamp.page - 1);
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // Convert canvas coordinates to PDF coordinates
      const pdfX = (stamp.x / stamp.canvasWidth) * pageWidth;
      const pdfY = pageHeight - ((stamp.y + stamp.height) / stamp.canvasHeight) * pageHeight;
      const pdfWidth = (stamp.width / stamp.canvasWidth) * pageWidth;
      const pdfHeight = (stamp.height / stamp.canvasHeight) * pageHeight;

      try {
        const dataUrl = stamp.imageDataUrl;
        if (!dataUrl || !dataUrl.includes(",")) continue;

        const base64Data = dataUrl.split(",")[1];
        const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

        let image;
        try {
          image = await pdfDoc.embedPng(imageBytes);
        } catch {
          try {
            image = await pdfDoc.embedJpg(imageBytes);
          } catch {
            console.error("Could not embed stamp image, skipping");
            continue;
          }
        }

        page.drawImage(image, {
          x: pdfX,
          y: pdfY,
          width: pdfWidth,
          height: pdfHeight,
          rotate: degrees(stamp.rotation),
          opacity: stamp.opacity,
        });
      } catch (err) {
        console.error("Error embedding stamp:", err);
      }
    }

    // Process texts
    for (const textItem of texts) {
      if (!textItem.text.trim()) continue;

      const page = pdfDoc.getPage(textItem.page - 1);
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // Convert canvas coordinates to PDF coordinates
      const pdfX = (textItem.x / textItem.canvasWidth) * pageWidth;
      const pdfY =
        pageHeight -
        ((textItem.y + textItem.fontSize) / textItem.canvasHeight) * pageHeight;

      // Scale font size proportionally
      const scaledFontSize = (textItem.fontSize / textItem.canvasHeight) * pageHeight;

      // Pick font
      const font =
        textItem.fontFamily === "Courier"
          ? fontCourier
          : textItem.bold
          ? fontBold
          : fontRegular;

      // Parse color
      const color = hexToRgb(textItem.color);

      try {
        page.drawText(textItem.text, {
          x: pdfX,
          y: pdfY,
          size: scaledFontSize,
          font,
          color: color ? rgb(color.r, color.g, color.b) : rgb(0, 0, 0),
          rotate: degrees(textItem.rotation),
        });
      } catch (err) {
        console.error("Error drawing text:", err);
      }
    }

    // Save and return
    const modifiedPdfBytes = await pdfDoc.save();
    const base64 = Buffer.from(modifiedPdfBytes).toString("base64");

    return NextResponse.json({
      success: true,
      pdfBase64: base64,
    });
  } catch (error) {
    console.error("Error modifying PDF:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : null;
}
