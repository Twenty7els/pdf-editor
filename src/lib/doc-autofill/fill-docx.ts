/**
 * Заполнение шаблона «Анкета-заявление заказчика» (.docx).
 *
 * Алгоритм работает с word/document.xml напрямую (JSZip):
 *  1. Табличные правила: находим строку таблицы по тексту ячейки-подписи
 *     и записываем значение в соседнюю ячейку (с сохранением форматирования
 *     самой ячейки).
 *  2. Абзацные правила: замены текста в абзацах вне таблиц (линия подписи).
 *
 * Правила — обобщённые (по подписям), поэтому тот же профиль заполняет
 * и форму ИП, и форму ЮЛ: неподписанные поля остаются пустыми.
 */
import JSZip from "jszip";
import { stripOrgPrefix, type MerchantProfile } from "./profile";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const clean = (s?: string) => (s ?? "").trim();
const P_RE = /<w:p\b[^>]*(?:\/>|[\s\S]*?<\/w:p>)/g;
const TC_RE = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g;
const TR_RE = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g;

/** Видимый текст фрагмента XML (все <w:t>). Важно: не ловим <w:tbl>/<w:tcPr>. */
function xmlText(xml: string): string {
  const parts: string[] = [];
  for (const m of xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)) {
    parts.push(
      m[1]
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&")
    );
  }
  return parts.join("");
}

const norm = (s: string) => s.replace(/[\s\u00A0]+/g, " ").trim().toLowerCase();

/** Убрать оформление плейсхолдера (курсив, синий цвет) — оставить шрифт и размер. */
function stripPlaceholderStyle(rPr: string): string {
  return rPr
    .replace(/<w:i\b[^>]*\/>/g, "")
    .replace(/<w:iCs\b[^>]*\/>/g, "")
    .replace(/<w:color\b[^>]*\/>/g, "")
    .replace(/<w:highlight\b[^>]*\/>/g, "");
}

/**
 * Гарантировать snapToGrid=0: в документе есть docGrid (linePitch=360) и без
 * этого флага MS Word привязывает строки вставленных значений к сетке 18pt —
 * плотные строки шаблона «раздуваются» и вёрстка разъезжается. Подписи шаблона
 * сами несут snapToGrid=0 — повторяем их приём.
 */
function ensureSnapToGrid(rPr: string): string {
  if (!rPr || /<w:snapToGrid\b/.test(rPr)) return rPr;
  const snap = '<w:snapToGrid w:val="0"/>';
  if (/<w:rFonts\b[^>]*\/>/.test(rPr)) {
    // сразу после rFonts — валидная позиция по схеме rPr
    return rPr.replace(/(<w:rFonts\b[^>]*\/>)/, `$1${snap}`);
  }
  return rPr.replace(/(<w:rPr\b[^>]*>)/, `$1${snap}`);
}

/** Убрать плейсхолдерный стиль из rPr метки абзаца внутри pPr. */
function cleanPPr(pPr: string): string {
  return pPr.replace(
    /<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>/,
    (m) => stripPlaceholderStyle(m)
  );
}

/**
 * Форматирование исходной ячейки: pPr первого абзаца + rPr первого рана
 * (если рана нет — rPr метки абзаца из pPr). Без этого Word рисует значение
 * шрифтом по умолчанию (Normal, 12pt) вместо 8pt шаблона.
 */
function extractCellFormat(tcInner: string): { pPr: string; rPr: string } {
  const firstP = tcInner.match(
    /(?:<w:p\b[^>]*\/>)|<w:p\b[^>]*>[\s\S]*?<\/w:p>/
  );
  if (!firstP) return { pPr: "", rPr: "" };
  const pXml = firstP[0];
  const pPr =
    pXml.match(/<w:pPr\b[^>]*\/>/)?.[0] ??
    pXml.match(/<w:pPr\b[^>]*>[\s\S]*?<\/w:pPr>/)?.[0] ??
    "";
  const bodyAfterPPr = pPr
    ? pXml.slice(pXml.indexOf(pPr) + pPr.length)
    : pXml;
  // rPr первого рана (вне pPr)
  const runRPr =
    bodyAfterPPr.match(/<w:rPr\b[^>]*\/>/)?.[0] ??
    bodyAfterPPr.match(/<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>/)?.[0] ??
    "";
  if (runRPr) return { pPr: cleanPPr(pPr), rPr: ensureSnapToGrid(stripPlaceholderStyle(runRPr)) };
  // рана нет — берём формат метки абзаца (хранит шрифт/размер пустой ячейки)
  const markRPr =
    pPr.match(/<w:rPr\b[^>]*\/>/)?.[0] ??
    pPr.match(/<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>/)?.[0] ??
    "";
  return { pPr: cleanPPr(pPr), rPr: ensureSnapToGrid(stripPlaceholderStyle(markRPr)) };
}

/** Новый абзац с текстом в формате исходной ячейки. */
function valueParagraph(text: string, fmt: { pPr: string; rPr: string }): string {
  if (!text) return "<w:p/>";
  return (
    `<w:p>${fmt.pPr}<w:r>${fmt.rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`
  );
}

/** Заменить содержимое ячейки (<w:tc>), сохранив её форматирование. */
function setCellValue(tcInner: string, text: string): string {
  // tcPr не может вкладываться в себя: либо самозакрытый, либо до парного закрытия
  const tcPr =
    tcInner.match(/<w:tcPr\b[^>]*\/>/)?.[0] ??
    tcInner.match(/<w:tcPr\b[^>]*>[\s\S]*?<\/w:tcPr>/)?.[0] ??
    "";
  return tcPr + valueParagraph(text, extractCellFormat(tcInner));
}

interface DocxRule {
  /** Подпись строки (или предикат по массиву текстов ячеек). */
  match: (cellTexts: string[]) => number; // индекс ячейки со значением, -1 = нет
  value: (p: MerchantProfile) => string;
}

/** Ячейка-значение по подписи первой ячейки строки. */
const byLabel =
  (labelPrefix: string, valueCell = 1) =>
  (texts: string[]): number =>
    norm(texts[0] ?? "").startsWith(norm(labelPrefix)) ? valueCell : -1;

/** Ячейка с точной подписью в любом месте строки → соседняя справа. */
const cellEquals =
  (...labels: string[]) =>
  (texts: string[]): number => {
    const set = new Set(labels.map(norm));
    const i = texts.findIndex((t) => set.has(norm(t)));
    return i >= 0 && i + 1 < texts.length ? i + 1 : -1;
  };

const DOCX_RULES: DocxRule[] = [
  // { value: (p) => ..., value: ... }
  {
    // Форма ЮЛ: полное фирменное наименование (как в уставе)
    match: (t) =>
      norm(t[0]).startsWith("полное и (при наличии)") ? 1 : -1,
    value: (p) => clean(p.orgName),
  },
  {
    match: byLabel("Наименование Заказчика"),
    value: (p) => {
      const org = clean(p.orgName);
      // Юрлицо — полное наименование организации
      if (/ооо|общество/i.test(org)) return org;
      // ИП / физлицо — «Индивидуальный предприниматель ФИО»
      const fio = clean(p.directorName) || stripOrgPrefix(org);
      return fio ? `Индивидуальный предприниматель ${fio}` : "";
    },
  },
  {
    match: byLabel("Дата и место рождения"),
    value: (p) =>
      [clean(p.birthDate) && `${clean(p.birthDate)} г.`, clean(p.birthPlace)]
        .filter(Boolean)
        .join(", "),
  },
  { match: byLabel("Гражданство"), value: (p) => clean(p.citizenship) },
  { match: cellEquals("инн"), value: (p) => clean(p.inn) },
  {
    match: cellEquals("огрип", "огрн", "огрнип"),
    value: (p) => clean(p.ogrip),
  },
  { match: cellEquals("окпо"), value: (p) => clean(p.okpo) },
  {
    match: (t) => {
      const i = t.findIndex((x) => norm(x).startsWith("оквэд"));
      return i >= 0 && i + 1 < t.length ? i + 1 : -1;
    },
    value: (p) => clean(p.okved),
  },
  {
    match: byLabel("Адрес места жительства"),
    value: (p) => clean(p.regAddress) || clean(p.factAddress),
  },
  {
    // Форма ЮЛ: адрес места нахождения (регистрации)
    match: byLabel("Адрес места нахождения (регистрации)"),
    value: (p) => clean(p.legalAddress) || clean(p.factAddress),
  },
  {
    // Форма ЮЛ: адрес фактического места нахождения
    match: byLabel("Адрес фактического места нахождения"),
    value: (p) => clean(p.factAddress) || clean(p.legalAddress),
  },
  {
    match: byLabel("Адрес места пребывания"),
    value: (p) => clean(p.factAddress) || clean(p.legalAddress),
  },
  {
    match: byLabel("Почтовый адрес"),
    value: (p) => clean(p.legalAddress) || clean(p.factAddress),
  },
  {
    match: byLabel("Номера контактных телефонов"),
    value: (p) => (clean(p.phone) ? `тел.: ${clean(p.phone)}` : ""),
  },
  {
    match: (t) =>
      norm(t[0]).startsWith("адрес электронной почты") ? 1 : -1,
    value: (p) => (clean(p.email) ? `Email: ${clean(p.email)}` : ""),
  },
  { match: byLabel("Наименование Банка"), value: (p) => clean(p.bankName) },
  { match: cellEquals("бик банка"), value: (p) => clean(p.bik) },
  {
    match: (t) => {
      const i = t.findIndex((x) =>
        /^(кор\.\s*счет|кор\.\s*счёт)/.test(norm(x))
      );
      return i >= 0 && i + 1 < t.length ? i + 1 : -1;
    },
    value: (p) => clean(p.corrAccount),
  },
  {
    match: (t) => {
      const i = t.findIndex((x) =>
        /^(расчетный счет|расчётный счёт)$/.test(norm(x))
      );
      return i >= 0 && i + 1 < t.length ? i + 1 : -1;
    },
    value: (p) => clean(p.account),
  },
  {
    // Контактные лица: «<ФИО, телефон, e-mail>» в ячейке значения
    match: (t) =>
      t.findIndex((x) => norm(x).startsWith("контактное лицо для решения")) >= 0
        ? 1
        : -1,
    value: (p) =>
      [
        clean(p.contactName) || clean(p.directorName),
        clean(p.phone) && `тел. ${clean(p.phone)}`,
        clean(p.email),
      ]
        .filter(Boolean)
        .join(", "),
  },
];

/**
 * Убрать хвостовые пустые (пробельные) абзацы перед body-level sectPr.
 * Заполненные строки становятся чуть выше пустых — и такой абзац
 * выталкивается на отдельную пустую страницу в конце документа.
 * Не трогаем абзацы с текстом/картинками/таблицами и случай, когда
 * sectPr вложен в последний абзац.
 */
function trimTrailingEmptyParagraphs(xml: string): string {
  const sectIdx = xml.lastIndexOf("<w:sectPr");
  if (sectIdx < 0) return xml;
  let head = xml.slice(0, sectIdx);
  const tail = xml.slice(sectIdx);
  for (;;) {
    // последний абзац в head (без вложенных <w:p внутри — иначе это таблица/секции)
    const m = head.match(/<w:p\b[^>]*>(?:(?!<w:p\b)[\s\S])*<\/w:p>\s*$/);
    if (!m || m.index === undefined) break;
    const p = m[0];
    if (xmlText(p).trim() !== "" || /<w:drawing|<w:pict|<w:tbl/.test(p)) break;
    head = head.slice(0, m.index);
  }
  return head + tail;
}

/**
 * Заполнить шаблон анкеты-заявления данными профиля.
 * Возвращает новый .docx (Buffer).
 */
export async function fillAnketaDocx(
  templateBuffer: Buffer,
  profile: MerchantProfile
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(templateBuffer);
  const path = "word/document.xml";
  let xml = await zip.file(path)!.async("string");

  // ── 1. Табличные правила (все подходящие правила на строку) ─────────
  xml = xml.replace(TR_RE, (trFull, trInner: string) => {
    const tcMatches = [...trInner.matchAll(TC_RE)];
    if (tcMatches.length < 2) return trFull;
    const texts = tcMatches.map((m) => xmlText(m[1]));

    let result = trFull;
    const applied = new Set<number>();
    for (const rule of DOCX_RULES) {
      const idx = rule.match(texts);
      if (idx < 0 || idx >= tcMatches.length || applied.has(idx)) continue;
      const value = rule.value(profile);
      if (!value) continue; // нет данных — оставляем пустым
      const tcFull = tcMatches[idx][0];
      const tcInner = tcMatches[idx][1];
      const newTc = tcFull.replace(tcInner, () =>
        setCellValue(tcInner, value)
      );
      result = result.replace(tcFull, () => newTc);
      applied.add(idx);
    }
    return result;
  });

  // ── 2. Финансовые условия: «Наименование Сервиса» в строке с СБП ───
  if (clean(profile.activity)) {
    // Колонку «Наименование Сервиса» определяем по строке-шапке таблицы,
    // а не по индексу: в строке СБП ячейка №п/п узкая (567 dxa) и текст
    // в ней разваливается по одной букве на строку.
    let serviceCol = 1;
    for (const m of xml.matchAll(TR_RE)) {
      const texts = [...m[1].matchAll(TC_RE)].map((c) => xmlText(c[1]));
      const j = texts.findIndex((t) => norm(t) === "наименование сервиса");
      if (j >= 0) {
        serviceCol = j;
        break;
      }
    }
    xml = xml.replace(TR_RE, (trFull, trInner: string) => {
      const tcMatches = [...trInner.matchAll(TC_RE)];
      const texts = tcMatches.map((m) => xmlText(m[1]));
      const sbpIdx = texts.findIndex((t) => norm(t) === "сбп");
      if (sbpIdx < 0 || serviceCol >= tcMatches.length) return trFull;
      const [tcFull, tcInner] = tcMatches[serviceCol];
      const newTc = tcFull.replace(
        tcInner,
        () => setCellValue(tcInner, clean(profile.activity))
      );
      return trFull.replace(tcFull, () => newTc);
    });
  }

  // ── 3. Абзацные замены (линия подписи и прочее) ─────────────────────
  const fio = clean(profile.directorName) || stripOrgPrefix(clean(profile.orgName));
  const paragraphReplacements: Array<[RegExp, (m: string) => string]> = [];
  if (fio) {
    // без esc(): newText экранируется один раз при пересборке абзаца
    paragraphReplacements.push([/\[\s*Фамилия[^\]]*\]/g, () => fio]);
  }

  xml = xml.replace(P_RE, (pXml) => {
    const text = xmlText(pXml);
    let newText = text;
    let changed = false;
    for (const [re, fn] of paragraphReplacements) {
      if (re.test(newText)) {
        newText = newText.replace(re, fn);
        changed = true;
      }
    }
    if (!changed) return pXml;
    // Пересобираем абзац: сохраняем pPr, один run с текстом результата
    const pPr =
      pXml.match(/<w:pPr\b[^>]*\/>/)?.[0] ??
      pXml.match(/<w:pPr\b[^>]*>[\s\S]*?<\/w:pPr>/)?.[0] ??
      "";
    // Формат первого осмысленного run сохраняем (ищем rPr вне pPr)
    const bodyAfterPPr = pPr ? pXml.slice(pXml.indexOf(pPr) + pPr.length) : pXml;
    const rPr =
      bodyAfterPPr.match(/<w:rPr\b[^>]*\/>/)?.[0] ??
      bodyAfterPPr.match(/<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>/)?.[0] ??
      "";
    return `<w:p>${pPr}<w:r>${ensureSnapToGrid(
      rPr
    )}<w:t xml:space="preserve">${esc(newText)}</w:t></w:r></w:p>`;
  });

  // ── 4. Хвостовые пустые абзацы → убрать (иначе пустая страница в конце)
  xml = trimTrailingEmptyParagraphs(xml);

  zip.file(path, xml);
  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  return out as Buffer;
}
