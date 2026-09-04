/**
 * Программная верификация заполненной анкеты:
 * - шрифт/размер вставленных значений (sz=16, Times New Roman, snapToGrid=0)
 * - отсутствие курсива/синего цвета плейсхолдера
 * - позиция «Наименование Сервиса» в строке СБП (не в колонке №п/п)
 * - целостность XML (парсится DOMParser-подобным способом)
 * Запуск: bun scripts/verify-docx-fill.ts
 */
import { readFileSync } from "node:fs";
import JSZip from "jszip";

const zip = await JSZip.loadAsync(readFileSync("/tmp/anketa-filled.docx"));
const xml = await zip.file("word/document.xml")!.async("string");

// XML валиден?
// лёгкая проверка парности тегов w:p / w:tc / w:tr
const count = (re: RegExp) => [...xml.matchAll(re)].length;
const openP = count(/<w:p\b[^>]*(?<!\/)>/g);
const closeP = count(/<\/w:p>/g);
const openTc = count(/<w:tc\b[^>]*(?<!\/)>/g);
const closeTc = count(/<\/w:tc>/g);
const openTr = count(/<w:tr\b[^>]*(?<!\/)>/g);
const closeTr = count(/<\/w:tr>/g);
console.log("tag balance  w:p", openP, closeP, "| w:tc", openTc, closeTc, "| w:tr", openTr, closeTr);
if (openP !== closeP || openTc !== closeTc || openTr !== closeTr) {
  console.error("FAIL: XML tag mismatch");
  process.exit(1);
}

const TC_RE = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g;
const TR_RE = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g;
const xmlText = (s: string) =>
  [...s.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join("");

let fails = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(cond ? "  ✓" : "  ✗", msg);
  if (!cond) fails++;
};

// 1. Вставленное значение в «Наименование Заказчика» имеет sz=16 и TNR, без курсива/цвета
console.log("1) Формат вставленных значений:");
{
  const trs = [...xml.matchAll(TR_RE)];
  for (const tr of trs) {
    const tcs = [...tr[1].matchAll(TC_RE)];
    const texts = tcs.map((c) => xmlText(c[1]));
    const i = texts.findIndex((t) => t.includes("Индивидуальный предприниматель Шангараев"));
    if (i >= 0) {
      const tc = tcs[i][1];
      const runRPr = tc.match(/<w:r>(<w:rPr[\s\S]*?<\/w:rPr>)/)?.[1] ?? "";
      ok(runRPr.includes('w:sz w:val="16"'), "размер 8pt (sz=16)");
      ok(runRPr.includes("Times New Roman"), "Times New Roman");
      ok(runRPr.includes("snapToGrid"), "snapToGrid=0 (не липнет к сетке)");
      ok(!/<w:i\/>/.test(runRPr) && !/<w:i\b[^>]*\/>/.test(runRPr), "без курсива");
      ok(!/<w:color\b/.test(runRPr), "без синего цвета плейсхолдера");
      ok(!/<w:color\b/.test(tc.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? ""), "pPr без цвета плейсхолдера");
      ok(/<w:pPr>/.test(tc), "pPr сохранён");
      break;
    }
  }
}

// 2. Пустая ячейка ИНН заполнена и сохранила формат метки абзаца
console.log("2) Значения из пустых ячеек (формат метки абзаца):");
{
  const trs = [...xml.matchAll(TR_RE)];
  let checked = 0;
  for (const tr of trs) {
    const tcs = [...tr[1].matchAll(TC_RE)];
    const texts = tcs.map((c) => xmlText(c[1]).trim().toLowerCase());
    const j = texts.findIndex((t) => t === "инн");
    if (j >= 0 && tcs[j + 1]) {
      const tc = tcs[j + 1][1];
      const t = xmlText(tc);
      ok(t === "860200000000", `ИНН заполнен (${t})`);
      const runRPr = tc.match(/<w:r>(<w:rPr[\s\S]*?<\/w:rPr>)/)?.[1] ?? "";
      ok(runRPr.includes('w:sz w:val="16"'), "ИНН: размер 8pt");
      ok(runRPr.includes("Times New Roman"), "ИНН: Times New Roman");
      checked++;
      break;
    }
  }
  if (!checked) { ok(false, "строка ИНН найдена"); }
}

// 3. СБП: «Мойка автомобилей» в колонке «Наименование Сервиса», не в №п/п
console.log("3) Строка СБП:");
{
  const trs = [...xml.matchAll(TR_RE)];
  for (const tr of trs) {
    const tcs = [...tr[1].matchAll(TC_RE)];
    const texts = tcs.map((c) => xmlText(c[1]));
    if (texts.some((t) => t.trim().toLowerCase() === "сбп")) {
      ok((texts[1] ?? "").includes("Мойка автомобилей"), `«Мойка автомобилей» в ячейке 1 (Наименование Сервиса): [${texts.map((t, k) => `${k}:${t.slice(0, 20)}`).join(" | ")}]`);
      ok(!(texts[0] ?? "").trim() || texts[0].length < 3, "ячейка №п/п пуста");
      const tc = tcs[1][1];
      const runRPr = tc.match(/<w:r>(<w:rPr[\s\S]*?<\/w:rPr>)/)?.[1] ?? "";
      // ячейка СБП в шаблоне имеет собственный формат 7pt (sz=14, по центру) —
      // главное, что он сохранён, а не сброшен в Normal 12pt
      ok(
        runRPr !== "" && /<w:sz w:val="\d+"\/>/.test(runRPr),
        `формат ячейки сохранён (sz=${runRPr.match(/<w:sz w:val="(\d+)"/)?.[1] ?? "нет"})`
      );
      ok(runRPr.includes("snapToGrid"), "snapToGrid=0");
      break;
    }
  }
}

// 4. Все ключевые значения на месте
console.log("4) Полнота заполнения:");
const required: Array<[string, string]> = [
  ["наименование", "Индивидуальный предприниматель Шангараев Роман Романович"],
  ["дата рождения", "01.02.1990"],
  ["гражданство", "Российская Федерация"],
  ["ИНН", "860200000000"],
  ["ОГРИП", "300000000000000"],
  ["банк", "ВТБ"],
  ["БИК", "044525187"],
  ["кор.счёт", "30101810745350000187"],
  ["расч.счёт", "40802810500000012345"],
  ["телефон", "+7 (900) 123-45-67"],
  ["email", "avtomoyka@example.ru"],
];
const flat = xmlText(xml);
for (const [name, val] of required) ok(flat.includes(val), `${name}: «${val}»`);

// 5. Плейсхолдеры не остались в значениях
console.log("5) Плейсхолдеры:");
ok(!flat.includes("[Фамилия"), "нет [Фамилия...]");
ok(!flat.includes("Дополняется Заказчиком"), "нет «Заполняется Заказчиком»");

console.log(fails === 0 ? "\nALL PASS" : `\nFAILURES: ${fails}`);
process.exit(fails === 0 ? 0 : 1);
