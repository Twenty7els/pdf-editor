/**
 * Заполнение шаблона «Заявка на регистрацию» (СБП — регистрация мерчанта).
 *
 * Правила безопасности:
 *  - Пишем ТОЛЬКО в заранее известные пустые ячейки значений (колонка C).
 *  - Красные/жёлтые ячейки с фикс. значениями и инструкциями не трогаем.
 */
import ExcelJS from "exceljs";
import type { MerchantProfile } from "./profile";

/** Карта: ячейка → поле профиля. B2 — мастер слияния B2:C2. */
const SBP_FILL_MAP: Array<{ cell: string; get: (p: MerchantProfile) => string }> = [
  { cell: "B2", get: (p) => p.orgName ?? "" }, // наименование мерчанта (из ЛК)
  { cell: "C35", get: (p) => p.orgName ?? "" }, // Юр. лицо мерчанта — Наименование
  { cell: "C36", get: (p) => p.inn ?? "" }, // ИНН
  { cell: "C41", get: (p) => p.birthDate ?? "" }, // Дата рождения учредителя
  { cell: "C43", get: (p) => p.orgName ?? "" }, // Наименование (brandName)
  { cell: "C45", get: (p) => p.legalAddress || p.factAddress || "" }, // Адрес
  { cell: "C50", get: (p) => p.account ?? "" }, // р/с мерчанта
  { cell: "C64", get: (p) => p.orgName ?? "" }, // наименование ЮЛ
  { cell: "C65", get: (p) => p.inn ?? "" }, // ИНН
  { cell: "C67", get: (p) => p.orgName ?? "" }, // Наименование (brandName)
  { cell: "C70", get: (p) => p.legalAddress || p.factAddress || "" }, // адрес
];

export async function fillSbpZayavka(
  templateBuffer: Buffer,
  profile: MerchantProfile
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(templateBuffer as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("В шаблоне заявки нет листов");

  for (const { cell, get } of SBP_FILL_MAP) {
    const value = get(profile).trim();
    if (!value) continue;
    const c = ws.getCell(cell);
    // Защита: не перезаписываем непустые ячейки (фикс. значения шаблона)
    const existing =
      c.value == null
        ? ""
        : c.value instanceof Date
        ? String(c.value)
        : typeof c.value === "object"
        ? String(
            (c.value as unknown as Record<string, unknown>).text ?? ""
          )
        : String(c.value);
    if (existing.trim()) continue;
    c.value = value;
  }

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}
