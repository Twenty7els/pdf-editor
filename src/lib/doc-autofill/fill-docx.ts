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

/** Новый абзац с текстом (без pPr — Word применит стиль ячейки). */
function valueParagraph(text: string): string {
  if (!text) return "<w:p/>";
  return (
    `<w:p><w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`
  );
}

/** Заменить содержимое ячейки (<w:tc>), сохранив её свойства (<w:tcPr>). */
function setCellValue(tcInner: string, text: string): string {
  // tcPr не может вкладываться в себя: либо самозакрытый, либо до парного закрытия
  const tcPr =
    tcInner.match(/<w:tcPr\b[^>]*\/>/)?.[0] ??
    tcInner.match(/<w:tcPr\b[^>]*>[\s\S]*?<\/w:tcPr>/)?.[0] ??
    "";
  return tcPr + valueParagraph(text);
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
    match: byLabel("Наименование Заказчика"),
    value: (p) => {
      const fio = clean(p.directorName) || stripOrgPrefix(clean(p.orgName));
      const form =
        /ооо|общество/i.test(clean(p.orgName)) || clean(p.ogrip)
          ? ""
          : "Индивидуальный предприниматель ";
      return form + fio;
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
    xml = xml.replace(TR_RE, (trFull, trInner: string) => {
      const tcMatches = [...trInner.matchAll(TC_RE)];
      const texts = tcMatches.map((m) => xmlText(m[1]));
      const sbpIdx = texts.findIndex((t) => norm(t) === "сбп");
      if (sbpIdx > 0 && !texts[0]) {
        const tcFull = tcMatches[0][0];
        const newTc = tcFull.replace(
          tcMatches[0][1],
          () => setCellValue(tcMatches[0][1], clean(profile.activity))
        );
        return trFull.replace(tcFull, () => newTc);
      }
      return trFull;
    });
  }

  // ── 3. Абзацные замены (линия подписи и прочее) ─────────────────────
  const fio = clean(profile.directorName) || stripOrgPrefix(clean(profile.orgName));
  const paragraphReplacements: Array<[RegExp, (m: string) => string]> = [];
  if (fio) {
    paragraphReplacements.push([
      /\[\s*Фамилия[^\]]*\]/g,
      () => esc(fio),
    ]);
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
    return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${esc(
      newText
    )}</w:t></w:r></w:p>`;
  });

  zip.file(path, xml);
  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  return out as Buffer;
}
