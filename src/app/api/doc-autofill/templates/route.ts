import { NextResponse } from "next/server";
import { AUTOFILL_TARGETS, targetAvailable } from "@/lib/doc-autofill/targets";

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
