import { NextRequest, NextResponse } from "next/server";
import { parseAnketaXlsx } from "@/lib/doc-autofill/parse-anketa";
import { parseAnketaDocx } from "@/lib/doc-autofill/parse-anketa-docx";
import { isAuthorized } from "@/lib/api-auth";

export const runtime = "nodejs";

/**
 * POST /api/doc-autofill/parse — multipart с полем `file` (.xlsx или .docx анкеты).
 * Возвращает извлечённый профиль мерчанта + предупреждения.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }
  try {
    // Отсекаем гигантские body ДО парсинга multipart — иначе весь файл
    // уже материализуется в памяти (DoS-вектор без авторизации).
    const cl = Number(req.headers.get("content-length") ?? 0);
    if (cl > 26 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Файл слишком большой (максимум 25 МБ)" },
        { status: 400 }
      );
    }
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      // битый multipart / не multipart вообще — это ошибка клиента, не сервера
      return NextResponse.json(
        { error: "Некорректный запрос: ожидается multipart/form-data" },
        { status: 400 }
      );
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Файл не передан" },
        { status: 400 }
      );
    }
    const name = file.name || "анкета";
    const lower = name.toLowerCase();
    const isXlsx = lower.endsWith(".xlsx");
    const isDocx = lower.endsWith(".docx");
    if (!isXlsx && !isDocx) {
      return NextResponse.json(
        { error: "Анкета должна быть в формате .xlsx или .docx" },
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
    const result = isDocx
      ? await parseAnketaDocx(buf, name)
      : await parseAnketaXlsx(buf, name);
    return NextResponse.json(result);
  } catch (err) {
    console.error("doc-autofill/parse error:", err);
    return NextResponse.json(
      {
        error:
          "Не удалось разобрать анкету. Убедитесь, что это заполненная анкета в формате .xlsx или .docx.",
      },
      { status: 500 }
    );
  }
}
