/**
 * Парсер заполненной анкеты «Заявка на подключение» (Uniteller, .xlsx).
 *
 * Форма построена парами «подпись → значение»: подпись находится в ячейке,
 * значение — справа на той же строке либо справа на строке ниже.
 * Парсер находит каждую подпись по тексту и берёт ближайшее значение,
 * поэтому лёгкий сдвиг ячеек не ломает разбор.
 */
import ExcelJS from "exceljs";
import { isPlaceholder, type MerchantProfile } from "./profile";

type CellRef = { ws: ExcelJS.Worksheet; row: number; col: number };

/** Адреса «подчинённых» ячеек слитых диапазонов — их значения брать нельзя. */
function mergedSlaveSet(ws: ExcelJS.Worksheet): Set<string> {
  const set = new Set<string>();
  for (const m of ws.model?.merges ?? []) {
    const [tl, br] = String(m).split(":");
    if (!br) continue;
    const r1 = parseInt(tl.replace(/\D/g, ""), 10);
    const r2 = parseInt(br.replace(/\D/g, ""), 10);
    const c1 = colToNum(tl.replace(/\d/g, ""));
    const c2 = colToNum(br.replace(/\d/g, ""));
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (r === r1 && c === c1) continue; // мастер не раб
        set.add(`${r}:${c}`);
      }
    }
  }
  return set;
}

function colToNum(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function cellText(c: ExcelJS.Cell): string {
  if (c.value == null) return "";
  if (typeof c.value === "object") {
    const v = c.value as unknown as Record<string, unknown>;
    if ("text" in v) return String(v.text ?? "").trim(); // rich text / hyperlink
    if ("result" in v) return String(v.result ?? "").trim(); // formula
    if (v instanceof Date) return "";
    return String(c.value).trim();
  }
  return String(c.value).trim();
}

/** Форматирование даты-значения ячейки в дд.мм.гггг. */
function cellDate(c: ExcelJS.Cell): string {
  const v = c.value;
  if (v instanceof Date) {
    const d = v;
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${dd}.${mm}.${d.getUTCFullYear()}`;
  }
  return cellText(c);
}

/** Значение ячейки-кандидата с учётом плейсхолдеров, дат и слитых ячеек. */
function candidateValue(
  ref: CellRef,
  slaves: Set<string>,
  labelNorm: string,
  isDate = false
): string {
  if (slaves.has(`${ref.row}:${ref.col}`)) return "";
  const cell = ref.ws.getRow(ref.row).getCell(ref.col);
  // Даты сначала: cellText(Date) пуст, а датa — валидное значение
  if (cell.value instanceof Date) {
    return isDate ? cellDate(cell) : "";
  }
  const raw = cellText(cell);
  if (!raw || isPlaceholder(raw)) return "";
  if (normalize(raw) === labelNorm) return ""; // эхо подписи (merge)
  return isDate ? cellDate(cell) : raw;
}

/**
 * Найти значение для подписи: перебираем смещения (строка, колонка)
 * от ячейки с подписью. Значение обычно в соседней колонке справа
 * на той же или следующей строке.
 */
function valueFor(
  ws: ExcelJS.Worksheet,
  labelRow: number,
  labelCol: number,
  slaves: Set<string>,
  labelNorm: string,
  isDate = false
): string {
  const offsets: Array<[number, number]> = [
    [0, 1],
    [1, 1],
    [0, 2],
    [1, 2],
    [2, 1],
  ];
  for (const [dr, dc] of offsets) {
    const v = candidateValue(
      { ws, row: labelRow + dr, col: labelCol + dc },
      slaves,
      labelNorm,
      isDate
    );
    if (v) return v;
  }
  return "";
}

/** Собрать список значений, идущих после подписи (для серийников/адресов). */
function listFor(
  ws: ExcelJS.Worksheet,
  labelPattern: RegExp,
  maxCount: number,
  slaves: Set<string>
): string[] {
  const out: string[] = [];
  ws.eachRow((row) => {
    row.eachCell((cell, col) => {
      const t = cellText(cell);
      if (labelPattern.test(t)) {
        const v = candidateValue(
          { ws, row: row.number + 1, col: col + 1 },
          slaves,
          normalize(t)
        );
        if (v) out.push(v);
      }
    });
    if (out.length >= maxCount * 2) return;
  });
  return out.slice(0, maxCount);
}

/** Найти координату ячейки по нормализованному тексту подписи. */
function findLabel(
  ws: ExcelJS.Worksheet,
  normalized: string
): { row: number; col: number } | null {
  let found: { row: number; col: number } | null = null;
  ws.eachRow((row) => {
    row.eachCell((cell, col) => {
      if (found) return;
      if (normalize(cellText(cell)) === normalized) {
        found = { row: row.number, col };
      }
    });
  });
  return found;
}

function normalize(s: string): string {
  return s
    .replace(/[\s\u00A0]+/g, " ")
    .replace(/\*/g, "")
    .replace(/…/g, "")
    .trim()
    .toLowerCase();
}

export interface ParseResult {
  profile: MerchantProfile;
  warnings: string[];
  sourceName: string;
}

export async function parseAnketaXlsx(
  buffer: Buffer,
  sourceName = "анкета.xlsx"
): Promise<ParseResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);

  // Основной лист — «Vendotek» (или первый лист книги)
  const ws = wb.getWorksheet("Vendotek") ?? wb.worksheets[0];
  if (!ws) {
    throw new Error("В файле нет листов с данными");
  }

  const warnings: string[] = [];
  const slaves = mergedSlaveSet(ws);
  const p: MerchantProfile = {
    serials: [],
    pointAddresses: [],
    pointComments: [],
  };

  const grab = (label: string, key: keyof MerchantProfile, isDate = false) => {
    const labelNorm = normalize(label);
    const loc = findLabel(ws, labelNorm);
    if (!loc) {
      warnings.push(`Поле «${label}» не найдено в анкете`);
      return;
    }
    const v = valueFor(ws, loc.row, loc.col, slaves, labelNorm, isDate);
    if (v) (p as Record<string, unknown>)[key] = v;
  };

  // 01 Организация
  grab("Название организации", "orgName");
  grab("ИНН", "inn");
  grab("КПП", "kpp");
  grab("Юридический адрес (с индексом)", "legalAddress");
  grab("Фактический адрес (с индексом)", "factAddress");

  // 02 Банк
  grab("БИК банка", "bik");
  grab("Название банка", "bankName");
  grab("Расчётный счёт", "account");
  grab("Корреспондентский счёт", "corrAccount");

  // 03 Руководитель
  grab("ФИО руководителя", "directorName");
  grab("Дата рождения", "birthDate", true);
  grab("Место рождения", "birthPlace");
  grab("СНИЛС", "snils");
  grab("Серия паспорта", "passSeries");
  grab("Номер паспорта", "passNumber");
  grab("Код подразделения", "passDeptCode");
  grab("Дата выдачи паспорта", "passIssueDate", true);
  grab("Кем выдан", "passIssuer");
  grab("Адрес регистрации по паспорту", "regAddress");

  // 04 Контакты
  grab("ФИО контактного лица", "contactName");
  grab("Телефон", "phone");
  grab("E-mail", "email");

  // 05 Деятельность
  grab("Вид деятельности", "activity");
  grab("Ожидаемый оборот в месяц", "turnover");

  // 06 Оборудование
  grab("Тип оборудования", "equipType");
  grab("Количество терминалов", "terminalCount");
  p.serials = listFor(ws, /^Серийный\s*№\s*\d+/i, 15, slaves);

  // 07 Точки
  p.pointAddresses = listFor(ws, /^Адрес\s+точки\s+\d+/i, 5, slaves);
  p.pointComments = listFor(ws, /^Комментарий\s+к\s+точке/i, 5, slaves);

  // 08 Комментарий
  grab("Дополнительная информация", "comment");

  // Значения по умолчанию
  if (!p.citizenship) p.citizenship = "Российская Федерация";

  if (!p.orgName) warnings.push("Не найдено название организации");
  if (!p.inn) warnings.push("Не найден ИНН");

  return { profile: p, warnings, sourceName };
}
