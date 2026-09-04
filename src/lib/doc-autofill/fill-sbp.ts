/**
 * Заполнение шаблона «Заявка на регистрацию» (СБП — регистрация мерчанта).
 *
 * Правила безопасности:
 *  - Пишем ТОЛЬКО в заранее известные пустые ячейки значений (колонка C).
 *  - Красные/жёлтые ячейки с фикс. значениями и инструкциями не трогаем.
 */
import ExcelJS from "exceljs";
import type { MerchantProfile } from "./profile";

/** Собрать «№ X от дд.мм.гггг» из номера и даты договора. */
function composeContractInfo(num: string, date: string): string {
  const n = num.trim();
  const d = date.trim();
  if (!n && !d) return "";
  if (!n || !d) return n || d;
  // Полная форма уже есть, если номер начинается с «№»/«б/н» или содержит
  // «от <цифра>». Простое /от/i ловило «от» внутри номера (напр. «5/ОТ-24»)
  // и зря убирало приставку «№». \b не работает с кириллицей, поэтому
  // смотрим на символ перед «от» — не буква.
  const needsHash =
    !/^№/.test(n) && !/^б\/н/i.test(n) && !/(?:^|[^а-яё])от\s+\d/i.test(n);
  return `${needsHash ? `№ ${n}` : n} от ${d}`;
}

const SBP_FILL_MAP: Array<{ cell: string; get: (p: MerchantProfile) => string }> = [
  { cell: "B2", get: (p) => p.orgName ?? "" }, // наименование мерчанта (из ЛК)
  { cell: "C35", get: (p) => p.orgName ?? "" }, // Юр. лицо мерчанта — Наименование
  { cell: "C36", get: (p) => p.inn ?? "" }, // ИНН
  { cell: "C39", get: (p) => p.accountOpenDate ?? "" }, // Дата открытия р/с для СБП
  { cell: "C40", get: (p) => p.oldestContractDate ?? "" }, // Дата старого договора (Fraudscore)
  { cell: "C41", get: (p) => p.birthDate ?? "" }, // Дата рождения учредителя
  { cell: "C42", get: (p) => p.combatParamsDate ?? "" }, // Дата получения боевых параметров
  { cell: "C43", get: (p) => p.orgName ?? "" }, // Наименование (brandName)
  { cell: "C44", get: (p) => p.mcc ?? "" }, // МСС
  { cell: "C45", get: (p) => p.legalAddress || p.factAddress || "" }, // Адрес
  { cell: "C46", get: (p) => p.merchantId ?? "" }, // ID ЮЛ в СБП (merchantid)
  { cell: "C47", get: (p) => p.unitContractNumber ?? "" }, // Договор с Uniteller — номер
  { cell: "C48", get: (p) => p.unitContractDate ?? "" }, // — дата
  { cell: "C49", get: (p) => p.unitRate ?? "" }, // — ставка
  { cell: "C50", get: (p) => p.account ?? "" }, // р/с мерчанта
  { cell: "C53", get: (p) => p.upid ?? "" }, // UPID
  {
    cell: "C63",
    get: (p) =>
      composeContractInfo(p.unitContractNumber ?? "", p.unitContractDate ?? ""),
  }, // Номер и дата договора с Банком (тот же договор, что с Uniteller)
  { cell: "C64", get: (p) => p.orgName ?? "" }, // наименование ЮЛ
  { cell: "C65", get: (p) => p.inn ?? "" }, // ИНН
  { cell: "C67", get: (p) => p.orgName ?? "" }, // Наименование (brandName)
  { cell: "C68", get: (p) => p.merchantId ?? "" }, // merchantid (нижний блок)
  { cell: "C69", get: (p) => p.mcc ?? "" }, // МСС (нижний блок)
  { cell: "C70", get: (p) => p.legalAddress || p.factAddress || "" }, // адрес
  {
    cell: "C71",
    get: (p) =>
      composeContractInfo(p.unitContractNumber ?? "", p.unitContractDate ?? ""),
  }, // Дата и номер договора с Uniteller (автосборка)
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
    // Защита: не перезаписываем непустые ячейки (фикс. значения шаблона).
    // Учитываем richText/formula/hyperlink — у них нет .text как строки.
    let existing = "";
    if (c.value != null) {
      if (c.value instanceof Date) {
        existing = String(c.value);
      } else if (typeof c.value === "object") {
        const v = c.value as unknown as Record<string, unknown>;
        if (Array.isArray(v.richText)) {
          existing = (v.richText as Array<{ text?: unknown }>)
            .map((rt) => String(rt?.text ?? ""))
            .join("");
        } else if ("result" in v) {
          existing = String(v.result ?? "");
        } else if ("text" in v) {
          existing = String(v.text ?? "");
        }
      } else {
        existing = String(c.value);
      }
    }
    if (existing.trim()) continue;
    c.value = value;
  }

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}
