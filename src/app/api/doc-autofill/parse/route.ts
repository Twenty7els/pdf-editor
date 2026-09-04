import { NextRequest, NextResponse } from "next/server";
import { parseAnketaXlsx } from "@/lib/doc-autofill/parse-anketa";

export const runtime = "nodejs";

/**
 * POST /api/doc-autofill/parse — multipart с полем `file` (.xlsx анкеты).
 * Возвращает извлечённый профиль мерчанта + предупреждения.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Файл не передан" },
        { status: 400 }
      );
    }
    const name = file.name || "анкета.xlsx";
    if (!name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Анкета должна быть в формате .xlsx" },
        { status: 400 }
      );
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Файл слишком большой (максимум 25 МБ)" },
        { status: 400 }
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await parseAnketaXlsx(buf, name);
    return NextResponse.json(result);
  } catch (err) {
    console.error("doc-autofill/parse error:", err);
    return NextResponse.json(
      {
        error:
          "Не удалось разобрать анкету. Убедитесь, что это заполненная «Заявка на подключение» (.xlsx).",
      },
      { status: 500 }
    );
  }
}
