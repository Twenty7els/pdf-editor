import { NextRequest, NextResponse } from "next/server";
import { writeFileSync } from "fs";
import {
  AUTOFILL_TARGETS,
  findTarget,
  targetAvailable,
  targetPath,
} from "@/lib/doc-autofill/targets";

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
 * POST /api/doc-autofill/templates — multipart { file, targetId }.
 * Ручная загрузка шаблона, если его ещё нет на сервере (fallback).
 */
export async function POST(req: NextRequest) {
  try {
    const cl = Number(req.headers.get("content-length") ?? 0);
    if (cl > MAX_TEMPLATE_SIZE + 64 * 1024) {
      return NextResponse.json(
        { error: "Файл слишком большой (максимум 10 МБ)" },
        { status: 400 }
      );
    }
    const form = await req.formData();
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
