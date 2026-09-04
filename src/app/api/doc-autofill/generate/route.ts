import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { findTarget, targetAvailable, targetPath } from "@/lib/doc-autofill/targets";
import { fillSbpZayavka } from "@/lib/doc-autofill/fill-sbp";
import { fillAnketaDocx } from "@/lib/doc-autofill/fill-docx";
import { sanitizeProfile, type MerchantProfile } from "@/lib/doc-autofill/profile";
import { isAuthorized } from "@/lib/api-auth";

export const runtime = "nodejs";

const MAX_BODY_SIZE = 5 * 1024 * 1024; // JSON-профиль мал, 5 МБ с запасом

/**
 * POST /api/doc-autofill/generate — JSON { targetId, profile }.
 * Возвращает готовый файл (binary) с заголовками скачивания.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }
  try {
    const cl = Number(req.headers.get("content-length") ?? 0);
    if (cl > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: "Тело запроса слишком большое" },
        { status: 400 }
      );
    }
    let body: { targetId?: string; profile?: MerchantProfile };
    try {
      body = (await req.json()) as {
        targetId?: string;
        profile?: MerchantProfile;
      };
    } catch {
      // битый JSON — ошибка клиента, а не сервера
      return NextResponse.json(
        { error: "Некорректный запрос: ожидается JSON" },
        { status: 400 }
      );
    }
    const target = findTarget(body.targetId ?? "");
    if (!target) {
      return NextResponse.json(
        { error: "Неизвестный тип документа" },
        { status: 400 }
      );
    }
    if (!targetAvailable(target)) {
      return NextResponse.json(
        { error: `Шаблон «${target.title}» не загружен на сервер` },
        { status: 409 }
      );
    }
    // Санитизация: клиент может прислать всё что угодно — приводим каждое
    // поле к строке/списку строк (иначе .trim() на числе/объекте падает 500-й)
    const profile = sanitizeProfile(body.profile ?? {});
    const template = readFileSync(targetPath(target));

    const buffer =
      target.ext === "xlsx"
        ? await fillSbpZayavka(template, profile)
        : await fillAnketaDocx(template, profile);

    const stamp = new Date().toISOString().slice(0, 10);
    const downloadName = `${target.id}-${stamp}.${target.ext}`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          target.ext === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${downloadName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("doc-autofill/generate error:", err);
    return NextResponse.json(
      { error: "Ошибка генерации документа" },
      { status: 500 }
    );
  }
}
