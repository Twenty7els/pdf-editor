/**
 * Парсер заполненной анкеты «Заявка на подключение» в формате Word (.docx).
 *
 * Word-анкеты не имеют жёсткой сетки, как Excel, поэтому подпись и значение
 * могут располагаться по-разному. Парсер перебирает типовые раскладки:
 *
 *   1. «Подпись: значение» — в одной строке/абзаце;
 *   2. Таблица: подпись в ячейке, значение — в соседней справа;
 *   3. Значение строкой ниже подписи (следующий абзац или та же ячейка);
 *   4. Строка с подписью, следующая строка таблицы со значением.
 *
 * Значения-плейсхолдеры («дд.мм.гггг», прочерки, «нет» и т.п.) и эхо-подписи
 * отбрасываются; серийники/адреса точек собираются списками.
 */
import JSZip from "jszip";
import { isPlaceholder, type MerchantProfile } from "./profile";
import type { ParseResult } from "./parse-anketa";

/* ============================================================
   Разбор OOXML: документ → строки + структура таблиц
   ============================================================ */

interface CellBlock {
  paras: string[];
}
interface RowBlock {
  cells: CellBlock[];
}
interface TableBlock {
  rows: RowBlock[];
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCodePoint(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (m) => ENTITIES[m] ?? m);
}

/** Модель документа: все абзацы подряд (в порядке документа) + таблицы. */
interface DocModel {
  lines: string[];
  tables: TableBlock[];
}

/**
 * Сканируем word/document.xml потоково: отслеживаем открытие/закрытие
 * w:p / w:tc / w:tr / w:tbl и собираем текст из w:t.
 * Вложенные таблицы складываются в общий список — на разбор не влияет.
 */
function parseDocxModel(xml: string): DocModel {
  const lines: string[] = [];
  const tables: TableBlock[] = [];

  const paraStack: string[] = []; // тексты открытых <w:p>
  const cellStack: CellBlock[] = [];
  const rowStack: RowBlock[] = [];
  const tblStack: TableBlock[] = [];

  let inText = false;
  let textStart = 0;

  const pushPara = (t: string) => {
    lines.push(t);
    if (cellStack.length) {
      cellStack[cellStack.length - 1].paras.push(t);
    }
  };

  const tagRe = /<(\/?)w:(p|tc|tr|tbl|t)\b([^>]*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(xml))) {
    const [, close, tag, , selfClose] = m;
    if (tag === "t") {
      if (!close && !selfClose) {
        inText = true;
        textStart = tagRe.lastIndex;
      } else if (close && inText) {
        inText = false;
        const raw = decodeXmlEntities(xml.slice(textStart, m.index));
        const txt = raw.replace(/[\s\u00A0]+/g, " ").trim();
        if (txt && paraStack.length) {
          const i = paraStack.length - 1;
          paraStack[i] = paraStack[i] ? `${paraStack[i]} ${txt}` : txt;
        }
      }
      continue;
    }
    if (tag === "p") {
      if (close) {
        pushPara(paraStack.pop() ?? "");
      } else if (selfClose) {
        pushPara(""); // пустой абзац <w:p/>
      } else {
        paraStack.push("");
      }
      continue;
    }
    if (tag === "tc") {
      if (close) {
        const cell = cellStack.pop();
        if (cell && rowStack.length) {
          rowStack[rowStack.length - 1].cells.push(cell);
        }
      } else if (!selfClose) {
        cellStack.push({ paras: [] });
      }
      continue;
    }
    if (tag === "tr") {
      if (close) {
        const row = rowStack.pop();
        if (row && tblStack.length) {
          tblStack[tblStack.length - 1].rows.push(row);
        }
      } else if (!selfClose) {
        rowStack.push({ cells: [] });
      }
      continue;
    }
    if (tag === "tbl") {
      if (close) {
        const tbl = tblStack.pop();
        if (tbl) tables.push(tbl);
      } else if (!selfClose) {
        tblStack.push({ rows: [] });
      }
      continue;
    }
  }
  return { lines, tables };
}

/* ============================================================
   Нормализация и словарь подписей
   ============================================================ */

function normBase(s: string): string {
  return s
    .replace(/[\s\u00A0]+/g, " ")
    .replace(/[*…]/g, "")
    .replace(/[«»"“”]/g, "")
    .replace(/ё/g, "е")
    .trim()
    .toLowerCase();
}

/** Подпись → ключ словаря: без нумерации, тире, хвостового двоеточия и уточнения в скобках.
 *  Дефисы и тире внутри подписи заменяются на пробел («МСС-код» = «МСС код»,
 *  «E-mail» = «E mail») — так варианты написания не ломают матчинг. */
function normLabel(s: string): string {
  let t = normBase(s);
  t = t.replace(/[\s:;.]+$/g, "");
  t = t.replace(/^\d+[.)]\s*/, "");
  t = t.replace(/^[-–—]\s*/, "");
  // «Юридический адрес (с индексом)» → «юридический адрес»
  t = t.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  // Точки внутри подписи — шум («Кор. счет Банка» = «кор счет банка»)
  t = t.replace(/\./g, " ").replace(/[-–—]/g, " ").replace(/\s+/g, " ").trim();
  return t;
}

/**
 * Словарь: подпись → ключ профиля (в удобной записи — см. нормализацию ниже).
 * Одна подпись может быть записана по-разному — все варианты здесь.
 */
const RAW_FIELD_MAP: Record<string, keyof MerchantProfile> = {
  // 01 Организация
  "название организации": "orgName",
  "наименование организации": "orgName",
  "полное наименование": "orgName",
  "наименование": "orgName",
  "организация": "orgName",
  "название": "orgName",
  "инн": "inn",
  "кпп": "kpp",
  "огрн": "ogrip",
  "огрнип": "ogrip",
  "огрн(ип)": "ogrip",
  "огрнип / огрн": "ogrip",
  "юридический адрес": "legalAddress",
  "юр адрес": "legalAddress",
  "адрес юридический": "legalAddress",
  "фактический адрес": "factAddress",
  "факт адрес": "factAddress",
  "адрес фактический": "factAddress",

  // 02 Банк
  "бик": "bik",
  "бик банка": "bik",
  "название банка": "bankName",
  "наименование банка": "bankName",
  "банк": "bankName",
  "расчетный счет": "account",
  "номер расчетного счета": "account",
  "р/с": "account",
  "корреспондентский счет": "corrAccount",
  "кор счет": "corrAccount",
  "к/с": "corrAccount",

  // 03 Руководитель
  "фио руководителя": "directorName",
  "руководитель": "directorName",
  "фио генерального директора": "directorName",
  "фио директора": "directorName",
  "фио ип": "directorName",
  "фио": "directorName",
  "дата рождения": "birthDate",
  "место рождения": "birthPlace",
  "гражданство": "citizenship",
  "снилс": "snils",
  "страховой номер": "snils",
  "серия паспорта": "passSeries",
  "серия": "passSeries",
  "номер паспорта": "passNumber",
  "номер": "passNumber",
  "код подразделения": "passDeptCode",
  "код": "passDeptCode",
  "дата выдачи паспорта": "passIssueDate",
  "дата выдачи": "passIssueDate",
  "кем выдан": "passIssuer",
  "кем выдан паспорт": "passIssuer",
  "адрес регистрации": "regAddress",
  "адрес регистрации по месту жительства": "regAddress",

  // 04 Контакты
  "фио контактного лица": "contactName",
  "контактное лицо": "contactName",
  "контакт": "contactName",
  "телефон": "phone",
  "телефон контактного лица": "phone",
  "контактный телефон": "phone",
  "номер телефона": "phone",
  "тел": "phone",
  "e-mail": "email",
  "email": "email",
  "электронная почта": "email",
  "почта": "email",

  // 05 Деятельность
  "вид деятельности": "activity",
  "ожидаемый оборот в месяц": "turnover",
  "оборот в месяц": "turnover",
  "ожидаемый оборот": "turnover",
  "окпо": "okpo",
  "оквед": "okved",
  "оквэд": "okved",
  "основной оквед": "okved",
  "основной оквэд": "okved",

  // 06 Оборудование
  "тип оборудования": "equipType",
  "модель оборудования": "equipType",
  "модель терминала": "equipType",
  "количество терминалов": "terminalCount",
  "кол-во терминалов": "terminalCount",

  // 08 Комментарий
  "дополнительная информация": "comment",
  "комментарий": "comment",
  "примечание": "comment",

  // 09 СБП (в Word-анкете могут быть, если есть — забираем молча)
  "upid": "upid",
  "мсс": "mcc",
  "мсс код": "mcc",
  "mcc": "mcc",
  "merchantid": "merchantId",
  "merchant id": "merchantId",
  "id юл в сбп": "merchantId",
  "дата открытия р/с для сбп": "accountOpenDate",
  "дата открытия расчетного счета для сбп": "accountOpenDate",
  "дата открытия р/с": "accountOpenDate",
  "дата старого договора с мерчантом": "oldestContractDate",
  "дата старого договора": "oldestContractDate",
  "дата получения боевых параметров сбп": "combatParamsDate",
  "дата получения боевых параметров": "combatParamsDate",

  // 10 Договор с Uniteller
  "номер договора": "unitContractNumber",
  "номер договора с uniteller": "unitContractNumber",
  "дата договора": "unitContractDate",
  "дата договора с uniteller": "unitContractDate",
  "ставка по договору": "unitRate",
  "ставка": "unitRate",

  // 11 Финансовые условия анкеты (таблица «Финансовые условия»)
  "категория услуг": "serviceCategory",
  "категория услуги": "serviceCategory",
  "размер вознаграждения": "partnerRate",
  "размер вознаграждения исполнителя": "partnerRate",
  "вознаграждение исполнителя": "partnerRate",

  // Подписи формы «анкета-заявление заказчика» (ИП/ЮЛ)
  "наименование заказчика": "directorName",
  "полное и (при наличии)": "orgName",
  "полное и (при наличии) фирменное наименование": "orgName",
  "полное и (при наличии) сокращенное фирменное наименование": "orgName",
  "огрип": "ogrip",
  "адрес места жительства": "regAddress",
  "адрес места пребывания": "factAddress",
  "адрес места нахождения": "legalAddress",
  "адрес фактического места нахождения": "factAddress",
  "почтовый адрес": "legalAddress",
  "адрес электронной почты": "email",
  "номера контактных телефонов и факсов": "phone",
  "кор счет банка": "corrAccount",
  "наименование сервиса": "activity",
};

/** Ключи словаря прогнаны через ту же нормализацию, что и подписи из файла. */
const FIELD_MAP: Record<string, keyof MerchantProfile> = {};
for (const [alias, key] of Object.entries(RAW_FIELD_MAP)) {
  FIELD_MAP[normLabel(alias)] = key;
}

/** Ключи, которых может не быть в Word-анкете — без предупреждения. */
const OPTIONAL_KEYS = new Set<keyof MerchantProfile>([
  "citizenship",
  "ogrip",
  "okpo",
  "okved",
  "upid",
  "mcc",
  "merchantId",
  "accountOpenDate",
  "oldestContractDate",
  "combatParamsDate",
  "unitContractNumber",
  "unitContractDate",
  "unitRate",
  "serviceCategory",
  "partnerRate",
]);

/** Основные поля: порядок как в xlsx-парсере (влияет на порядок предупреждений). */
const CORE_FIELDS: Array<{ label: string; key: keyof MerchantProfile }> = [
  { label: "Название организации", key: "orgName" },
  { label: "ИНН", key: "inn" },
  { label: "КПП", key: "kpp" },
  { label: "Юридический адрес", key: "legalAddress" },
  { label: "Фактический адрес", key: "factAddress" },
  { label: "БИК банка", key: "bik" },
  { label: "Название банка", key: "bankName" },
  { label: "Расчётный счёт", key: "account" },
  { label: "Корреспондентский счёт", key: "corrAccount" },
  { label: "ФИО руководителя", key: "directorName" },
  { label: "Дата рождения", key: "birthDate" },
  { label: "Место рождения", key: "birthPlace" },
  { label: "СНИЛС", key: "snils" },
  { label: "Серия паспорта", key: "passSeries" },
  { label: "Номер паспорта", key: "passNumber" },
  { label: "Код подразделения", key: "passDeptCode" },
  { label: "Дата выдачи паспорта", key: "passIssueDate" },
  { label: "Кем выдан", key: "passIssuer" },
  { label: "Адрес регистрации по паспорту", key: "regAddress" },
  { label: "ФИО контактного лица", key: "contactName" },
  { label: "Телефон", key: "phone" },
  { label: "E-mail", key: "email" },
  { label: "Вид деятельности", key: "activity" },
  { label: "Ожидаемый оборот в месяц", key: "turnover" },
  { label: "Тип оборудования", key: "equipType" },
  { label: "Количество терминалов", key: "terminalCount" },
  { label: "Дополнительная информация", key: "comment" },
];

const OPTIONAL_LIST: Array<{ key: keyof MerchantProfile }> = [
  { key: "citizenship" },
  { key: "ogrip" },
  { key: "okpo" },
  { key: "okved" },
  { key: "upid" },
  { key: "mcc" },
  { key: "merchantId" },
  { key: "accountOpenDate" },
  { key: "oldestContractDate" },
  { key: "combatParamsDate" },
  { key: "unitContractNumber" },
  { key: "unitContractDate" },
  { key: "unitRate" },
  { key: "serviceCategory" },
  { key: "partnerRate" },
];

/** Подписи-заголовки, у которых нет своего поля, но которые НЕ значения. */
const NOVALUE_LABELS = new Set([
  "наименование партнера",
  "сведения о причастности к категории публичных должностных лиц",
  "причастность к категории публичных должностных лиц",
  "дата и место рождения",
  "банковские реквизиты заказчика",
  "контактная информация заказчика",
  "финансовые условия",
  "обособленные подразделения",
]);

/** Результат поиска подписи в словаре. */
interface LabelHit {
  key: keyof MerchantProfile;
  /** Точное совпадение (иначе — префиксное: длинные заголовки колонок). */
  exact: boolean;
}

function lookupHit(rawLabel: string): LabelHit | null {
  const t = normLabel(rawLabel);
  if (!t || NOVALUE_LABELS.has(t)) return null;
  if (FIELD_MAP[t]) return { key: FIELD_MAP[t], exact: true };
  // Префикс-матчинг для длинных заголовков таблиц («Размер вознаграждения
  // Исполнителя за осущ. инф.-технолог. взаимодействия…» → «размер
  // вознаграждения»). Берём самый длинный подходящий ключ (≥ 10 символов),
  // чтобы короткие («ставка») не перехватывали чужие подписи.
  let best: keyof MerchantProfile | null = null;
  let bestLen = 0;
  for (const [alias, key] of Object.entries(FIELD_MAP)) {
    if (alias.length >= 10 && t.startsWith(alias) && alias.length > bestLen) {
      best = key;
      bestLen = alias.length;
    }
  }
  return best ? { key: best, exact: false } : null;
}

function lookupKey(rawLabel: string): keyof MerchantProfile | null {
  return lookupHit(rawLabel)?.key ?? null;
}

/** Похожа ли строка на какую-нибудь подпись (чтобы не принять её за значение). */
function looksLikeLabel(raw: string): boolean {
  return lookupKey(raw) !== null || NOVALUE_LABELS.has(normLabel(raw));
}

/** Чистое значение: не пусто, не плейсхолдер, не эхо-подпись, не другая подпись. */
function cleanValue(v: string, labelNorm?: string): string {
  let t = v.replace(/[\s\u00A0]+/g, " ").trim();
  // Контактные префиксы формы («тел.: +7…», «Email: ivan@…») — вместе
  // со всеми точками/двоеточиями после них
  t = t.replace(/^(тел|факс|e[\s-]?mail|email)\s*[.:\-]*\s*/i, "").trim();
  // Начальный знак-мусор («: факс:» → «факс:»)
  t = t.replace(/^[.:;,\-–—\s]+/, "").trim();
  if (!t || isPlaceholder(t) || isTemplateEcho(t)) return "";
  if (labelNorm && normBase(t) === labelNorm) return "";
  if (looksLikeLabel(t)) return "";
  return t.length > 2000 ? t.slice(0, 2000) : t;
}

/**
 * Оформляющие тексты пустого шаблона анкеты-заявления («Бренднэйм»,
 * «Суммарная комиссия% (Тип1/Тип2/Тип3)», «Индекс,», «www.», «<ФИО, …>»)
 * — не значения, даже если по раскладке стоят в ячейке-значении.
 */
function isTemplateEcho(t: string): boolean {
  const s = t.replace(/^[<«]+/, "").trimStart();
  return /^([\[«]?\s*(?:фамилия|фио|брендн[эе]йм)|брендн[эе]йм|наименование (категории|партн)|суммарная комиссия|сбп\s*$|№?\s*п\s*\/\s*п|индекс([.,:]|\s|$)|www|факс([.:]|\s|$)|адрес сайта|размер вознаграждения|индивидуальный предприниматель\s*\[)/i.test(
    s
  );
}

/** Первый непустой абзац ячейки (для поиска подписи в ячейке). */
function cellLabel(cell: CellBlock): string {
  for (const p of cell.paras) if (p.trim()) return p;
  return "";
}

/** Значение ячейки: все абзацы, соединённые пробелом. */
function cellValue(cell: CellBlock): string {
  return cell.paras.join(" ");
}

/* ============================================================
   Поиск значений
   ============================================================ */

/**
 * Найти значение для ключа по всем раскладкам. Возвращает строку или null.
 */
function findValue(
  target: keyof MerchantProfile,
  lines: string[],
  tables: TableBlock[]
): string | null {
  const isTarget = (raw: string) => lookupKey(raw) === target;

  // 1. «Подпись: значение» в одной строке
  for (const line of lines) {
    const ci = line.indexOf(":");
    if (ci <= 0) continue;
    if (isTarget(line.slice(0, ci))) {
      const v = cleanValue(line.slice(ci + 1), normLabel(line.slice(0, ci)));
      if (v) return v;
    }
  }

  // 2. Значение в следующей непустой строке (следующий абзац/ячейка).
  //    Только для ТОЧНЫХ подписей: у префиксных (заголовки колонок)
  //    следующая строка — продолжение заголовка, а не значение.
  for (let i = 0; i < lines.length; i++) {
    const lineHit = lookupHit(lines[i]);
    if (!lineHit || !lineHit.exact || lineHit.key !== target) continue;
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    if (j < lines.length) {
      const v = cleanValue(lines[j]);
      if (v) return v;
    }
  }

  // 3. Структура таблицы: подпись в ячейке → значение ниже в ТОМ ЖЕ столбце,
  //    в ячейке правее или в первой чистой ячейке следующей строки
  for (const tbl of tables) {
    for (let r = 0; r < tbl.rows.length; r++) {
      const row = tbl.rows[r];
      for (let c = 0; c < row.cells.length; c++) {
        const cell = row.cells[c];
        let hit = lookupHit(cellLabel(cell));
        let allowSameCell = hit?.exact ?? false;
        if (!hit) {
          // Многоабзацная подпись («Полное и (при наличии) / фирменное
          // наименование») — пробуем склеенный текст ячейки;
          // значение в этой же ячейке уже не ищем
          const joined = cellValue(cell).trim();
          if (joined) hit = lookupHit(joined);
        }
        if (!hit || hit.key !== target) continue;
        // 3а. значение ниже подписи в той же ячейке — только для ТОЧНЫХ
        // подписей: при префиксном/склеенном совпадении остальные абзацы
        // ячейки — продолжение заголовка («…взаимодействия, / в т.ч. НДС 22%»),
        // а не значение
        if (allowSameCell) {
          for (let k = 1; k < cell.paras.length; k++) {
            const v = cleanValue(cell.paras[k]);
            if (v) return v;
          }
        }
        // 3б. ячейка ПРЯМО НИЖЕ в том же столбце следующей строки
        //     (шапка таблицы → значение под ней)
        const belowRow = tbl.rows[r + 1];
        if (belowRow && c < belowRow.cells.length) {
          const v = cleanValue(cellValue(belowRow.cells[c]));
          if (v) return v;
        }
        // 3в. ячейка правее в той же строке
        for (let c2 = c + 1; c2 < row.cells.length; c2++) {
          const v = cleanValue(cellValue(row.cells[c2]));
          if (v) return v;
        }
        // 3г. следующая строка (обход ячеек слева направо)
        if (belowRow) {
          for (const c3 of belowRow.cells) {
            const v = cleanValue(cellValue(c3));
            if (v) return v;
          }
        }
      }
    }
  }
  return null;
}

/* ============================================================
   Списки: серийники, адреса точек, комментарии
   ============================================================ */

const SERIAL_LINE = /^серийный\s*(№|n|#|number)?\s*\d+/i;
const POINT_LINE = /^адрес\s+точки\s*\d*/i;
const COMMENT_LINE = /^комментарий\s+к\s+точке\s*\d*/i;

// Заголовки блоков («Серийные номера терминалов:», «Адреса точек установки»)
const SERIALS_HEADER = /^серийн\w*\s+номер/i;
const POINTS_HEADER = /^адрес\w*\s+(точек|точки)\b/i;
const COMMENTS_HEADER = /^комментари\w+\s+к\s+точкам\b/i;

/** Значение элемента списка: после «:» в той же строке или следующая непустая строка. */
function listItemValue(lines: string[], i: number): string | null {
  const line = lines[i];
  const ci = line.indexOf(":");
  if (ci > 0) {
    const v = cleanValue(line.slice(ci + 1));
    if (v) return v;
  }
  let j = i + 1;
  while (j < lines.length && !lines[j].trim()) j++;
  if (j < lines.length) {
    // заголовок/подпись — значение не берём
    if (looksLikeLabel(lines[j])) return null;
    const v = cleanValue(lines[j]);
    if (v) return v;
  }
  return null;
}

function collectList(
  lines: string[],
  itemRe: RegExp,
  headerRe: RegExp,
  maxCount: number
): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length && out.length < maxCount; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (itemRe.test(line)) {
      const v = listItemValue(lines, i);
      if (v) out.push(v);
      continue;
    }
    // Блок-заголовок: значения идут подряд следующими строками
    if (headerRe.test(line)) {
      for (let j = i + 1; j < lines.length && out.length < maxCount; j++) {
        const t = lines[j].trim();
        if (!t) continue;
        if (itemRe.test(t)) continue; // элементы формата «Серийный № 1» — сами по себе
        if (looksLikeLabel(t) || headerRe.test(t) || itemRe.test(t)) break;
        const v = cleanValue(t);
        if (!v) break;
        out.push(v);
      }
    }
  }
  return out;
}

/* ============================================================
   Точка входа
   ============================================================ */

export async function parseAnketaDocx(
  buffer: Buffer,
  sourceName = "анкета.docx"
): Promise<ParseResult> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error(
      "Файл повреждён или имеет другой формат — ожидается документ Word (.docx)"
    );
  }
  const docXml = zip.file("word/document.xml");
  if (!docXml) {
    throw new Error(
      "В файле нет содержимого документа Word — убедитесь, что это .docx (не .doc)"
    );
  }
  const xml = await docXml.async("string");
  const { lines, tables } = parseDocxModel(xml);

  const warnings: string[] = [];
  const p: MerchantProfile = {
    serials: [],
    pointAddresses: [],
    pointComments: [],
  };

  // Основные поля — с предупреждением, если не найдены
  for (const f of CORE_FIELDS) {
    const v = findValue(f.key, lines, tables);
    if (v) {
      (p as Record<string, unknown>)[f.key] = v;
    } else {
      warnings.push(`Поле «${f.label}» не найдено в анкете`);
    }
  }
  // Опциональные поля — забираем молча, если есть
  for (const f of OPTIONAL_LIST) {
    const v = findValue(f.key, lines, tables);
    if (v) {
      (p as Record<string, unknown>)[f.key] = v;
    }
  }

  // Списки
  p.serials = collectList(lines, SERIAL_LINE, SERIALS_HEADER, 15);
  p.pointAddresses = collectList(lines, POINT_LINE, POINTS_HEADER, 5);
  p.pointComments = collectList(lines, COMMENT_LINE, COMMENTS_HEADER, 5);

  // «Наименование Заказчика» на форме ИП — «Индивидуальный предприниматель
  // ФИО»: в профиль идёт чистое ФИО (правила заполнения сами вернут префикс)
  if (p.directorName) {
    const stripped = p.directorName
      .replace(/^индивидуальный\s+предприниматель\s+/i, "")
      .replace(/^ип\s+/i, "")
      .trim();
    if (stripped) p.directorName = stripped;
  }

  // «Дата и место рождения» — составное поле формы ИП («01.02.1990 г., Казань»)
  if (!p.birthDate || !p.birthPlace) {
    const dm = normLabel("Дата и место рождения");
    outer: for (const tbl of tables) {
      for (let r = 0; r < tbl.rows.length; r++) {
        const row = tbl.rows[r];
        for (let c = 0; c < row.cells.length; c++) {
          if (normLabel(cellLabel(row.cells[c])) !== dm) continue;
          const raw =
            (row.cells[c + 1] && cellValue(row.cells[c + 1])) ||
            (tbl.rows[r + 1] && tbl.rows[r + 1].cells[c]
              ? cellValue(tbl.rows[r + 1].cells[c])
              : "") ||
            cellValue(row.cells[c]);
          const m = raw
            .replace(/[\s\u00A0]+/g, " ")
            .trim()
            .match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s*(?:г\.)?\s*[,;]?\s*(.*)$/i);
          if (m) {
            if (!p.birthDate) {
              p.birthDate = `${m[1].padStart(2, "0")}.${m[2].padStart(2, "0")}.${m[3]}`;
            }
            const place = m[4].replace(/[\s,;]+$/, "").trim();
            if (place && !p.birthPlace) p.birthPlace = place;
          }
          break outer;
        }
      }
    }
  }

  // Значения по умолчанию
  if (!p.citizenship) p.citizenship = "Российская Федерация";
  // Для СБП наименование мерчанта — полное имя ИП
  if (!p.orgName && p.directorName) {
    p.orgName = `Индивидуальный предприниматель ${p.directorName}`;
  }

  if (!p.orgName) warnings.push("Не найдено название организации");
  if (!p.inn) warnings.push("Не найден ИНН");

  return { profile: p, warnings, sourceName };
}
