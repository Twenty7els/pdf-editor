/**
 * Серверная проверка авторизации для API-роутов.
 *
 * Клиент после успешного логина шлёт заголовок x-pdf-editor-auth с токеном
 * (см. getAuthHeaders в lib/auth.ts). Без него мутирующие и тяжёлые
 * эндпоинты отвечают 401 — аноним не может парсить анкеты, генерировать
 * документы или перезаписывать шаблоны на диске.
 */
import type { NextRequest } from "next/server";

const AUTH_TOKEN = "f3fc2f7af0e33a3ef10055dbbfc752d963eab4b095fea0e3a948b5f3ae042143";

export function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("x-pdf-editor-auth") === AUTH_TOKEN;
}
