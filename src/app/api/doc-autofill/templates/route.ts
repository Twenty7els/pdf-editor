import { NextRequest, NextResponse } from "next/server";
import { writeFileSync } from "fs";
import JSZip from "jszip";
import {
  AUTOFILL_TARGETS,
  findTarget,
  targetAvailable,
  targetPath,
} from "@/lib/doc-autofill/targets";
import { isAuthorized } from "@/lib/api-auth";

export const runtime = "nodejs";

/** Список целевых документов и доступность их шаблонов. */
export async function GET() {
  return NextResponse.json({
    targets: AUTOFILL_TARGETS.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      ext: t.ext,
      optional: !!t.optional,
      available: targetAvailable(t),
    })),
  });
}

const MAX_TEMPLATE_SIZE = 10 * 1024 * 1024; // 10 МБ

/**
 * Проверка содержимого OOXML: файл должен быть ZIP-контейнером с
 * обязательными частями. Иначе текстовый файл с расширением .docx затёр бы
 * рабочий шаблон и все генерации навсегда падали бы (восстановление — из git).
 */
async function isValidOoxml(buf: Buffer, ext: "xlsx" | "docx"): Promise<boolean> {
  try {
    const zip = await JSZip.loadAsync(buf);
    if (!zip.file("[Content_Types].xml")) return false;
    if (ext === "docx") {
      return !!zip.file("word/document.xml");
    }
    return !!zip.file("xl/workbook.xml");
  } catch {
    return false; // не ZIP вообще
  }
}

/**
 * POST /api/doc-autofill/templates — multipart { file, targetId }.
 * Ручная загрузка шаблона, если его ещё нет на сервере (fallback).
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }
  try {
    const cl = Number(req.headers.get("content-length") ?? 0);
    if (cl > MAX_TEMPLATE_SIZE + 64 * 1024) {
      return NextResponse.json(
        { error: "Файл слишком большой (максимум 10 МБ)" },
        { status: 400 }
      );
    }
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      // битый multipart / не multipart вообще — ошибка клиента, не сервера
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
    const target = findTarget(String(form.get("targetId") ?? ""));
    if (!target) {
      return NextResponse.json(
        { error: "Неизвестный тип документа" },
        { status: 400 }
      );
    }
    if (!file.name.toLowerCase().endsWith(`.${target.ext}`)) {
      return NextResponse.json(
        { error: `Нужен файл в формате .${target.ext}` },
        { status: 400 }
      );
    }
    if (file.size > MAX_TEMPLATE_SIZE) {
      return NextResponse.json(
        { error: "Файл слишком большой (максимум 10 МБ)" },
        { status: 400 }
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (!(await isValidOoxml(buf, target.ext))) {
      return NextResponse.json(
        {
          error:
            target.ext === "docx"
              ? "Файл не похож на документ Word (.docx) — проверьте, что выбран правильный файл"
              : "Файл не похож на книгу Excel (.xlsx) — проверьте, что выбран правильный файл",
        },
        { status: 400 }
      );
    }
    writeFileSync(targetPath(target), buf);
    return NextResponse.json({ ok: true, targetId: target.id });
  } catch (err) {
    console.error("doc-autofill/templates POST error:", err);
    return NextResponse.json(
      { error: "Не удалось загрузить шаблон" },
      { status: 500 }
    );
  }
}
