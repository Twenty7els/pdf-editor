/**
 * Тест заполнения ЮЛ-формы + регресс ИП-формы.
 * Запуск: bun scripts/test-docx-yul.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fillAnketaDocx } from "../src/lib/doc-autofill/fill-docx";

const yulProfile = {
  orgName: "Общество с ограниченной ответственностью «Автомойка Элит»",
  inn: "9102000000",
  ogrip: "1159102000000",
  okpo: "12345678",
  okved: "45.20.01",
  legalAddress: "298600, РК, г. Симферополь, ул. Кирова, д. 25, оф. 3",
  factAddress: "298600, РК, г. Симферополь, пр. Победы, д. 100",
  bankName: "ВТБ (Публичное акционерное общество)",
  bik: "044525187",
  account: "40702810900000012345",
  corrAccount: "30101810745350000187",
  directorName: "Петров Пётр Петрович",
  contactName: "Петров Пётр Петрович",
  phone: "7 978 000-11-22",
  email: "elite@example.ru",
  activity: "Мойка автотранспортных средств",
};

const out = await fillAnketaDocx(
  readFileSync("/home/z/my-project/document-templates/anketa-yul.docx"),
  yulProfile as never
);
writeFileSync("/tmp/yul-filled.docx", out);

// ── Проверки ──
import JSZip from "jszip";
const zip = await JSZip.loadAsync(out);
const xml = await zip.file("word/document.xml")!.async("string");
const txt = (s: string) =>
  [...s.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join("");
const flat = txt(xml);
const TC_RE = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g;
const TR_RE = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g;

let fails = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(cond ? "  ✓" : "  ✗", msg);
  if (!cond) fails++;
};

console.log("ЮЛ-форма:");
// баланс тегов
const bal =
  [...xml.matchAll(/<w:p\b[^>]*(?<!\/)>/g)].length === [...xml.matchAll(/<\/w:p>/g)].length &&
  [...xml.matchAll(/<w:tc\b[^>]*(?<!\/)>/g)].length === [...xml.matchAll(/<\/w:tc>/g)].length;
ok(bal, "XML сбалансирован");

ok(flat.includes("Общество с ограниченной ответственностью «Автомойка Элит»"), "фирменное наименование");
ok(flat.includes("9102000000"), "ИНН");
ok(flat.includes("1159102000000"), "ОГРН");
ok(flat.includes("12345678"), "ОКПО");
ok(flat.includes("45.20.01"), "ОКВЭД");
ok(flat.includes("ул. Кирова, д. 25"), "адрес регистрации");
ok(flat.includes("пр. Победы, д. 100"), "адрес фактический");
ok(flat.includes("тел.: 7 978 000-11-22"), "телефон (тел.: …)");
ok(flat.includes("Email: elite@example.ru"), "email");
ok(flat.includes("ВТБ"), "банк");
ok(flat.includes("044525187"), "БИК");
ok(flat.includes("30101810745350000187"), "кор. счёт");
ok(flat.includes("40702810900000012345"), "расч. счёт");
ok(!flat.includes("Индексы"), "плейсхолдер «Индекс» в адресах заменён");
// телефонная ячейка: «тел.:    факс:» заменена целиком
ok(!/тел\.\s*факс/.test(flat), "плейсхолдер «тел.: факс:» заменён");
// контактные лица (3 строки)
const contactRows = [...xml.matchAll(TR_RE)].filter((tr) =>
  txt(tr[1]).includes("решения общих вопросов")
);
ok(contactRows.length === 1 && txt(contactRows[0][1]).includes("Петров Пётр Петрович, тел. 7 978 000-11-22, elite@example.ru"), "контактное лицо заполнено");
// СБП-строка: Бренднэйм → вид деятельности
const sbpRow = [...xml.matchAll(TR_RE)].find((tr) => {
  const tcs = [...tr[1].matchAll(TC_RE)];
  return tcs.some((c) => txt(c[1]).trim().toLowerCase() === "сбп");
});
if (sbpRow) {
  const texts = [...sbpRow[1].matchAll(TC_RE)].map((c) => txt(c[1]));
  ok(texts[1]?.includes("Мойка автотранспортных средств"), `«Наименование Сервиса» = вид деятельности (${texts[1]?.slice(0, 40)})`);
  ok(texts[0]?.trim() === "", "№п/п не тронут");
} else ok(false, "строка СБП найдена");
// плейсхолдер Бренднэйм исчез
ok(!flat.includes("Бренднэйм"), "плейсхолдер «Бренднэйм» заменён");
// шрифт значения фирменного наименования
{
  const trs = [...xml.matchAll(TR_RE)];
  for (const tr of trs) {
    const tcs = [...tr[1].matchAll(TC_RE)];
    if (txt(tcs[0][1]).toLowerCase().startsWith("полное и")) {
      const tc = tcs[1][1];
      const runRPr = tc.match(/<w:r>(<w:rPr[\s\S]*?<\/w:rPr>)/)?.[1] ?? "";
      ok(runRPr.includes('w:sz w:val="18"'), "фирм. наименование: 9pt (sz=18, формат ячейки)");
      ok(runRPr.includes("snapToGrid"), "фирм. наименование: snapToGrid=0");
      break;
    }
  }
}
// адрес: rPr из первого рана «Индекс» (TNR 8pt)
{
  const trs = [...xml.matchAll(TR_RE)];
  for (const tr of trs) {
    const tcs = [...tr[1].matchAll(TC_RE)];
    if (txt(tcs[0][1]).toLowerCase().startsWith("адрес места нахождения")) {
      const tc = tcs[1][1];
      const runRPr = tc.match(/<w:r>(<w:rPr[\s\S]*?<\/w:rPr>)/)?.[1] ?? "";
      ok(runRPr.includes('w:sz w:val="16"') && runRPr.includes("Times New Roman"), "адрес: TNR 8pt сохранён");
      break;
    }
  }
}

// ── Регресс ИП ──
console.log("Регресс ИП-формы:");
const ipProfile = {
  orgName: "ИП Тестов Тест Тестович",
  directorName: "Тестов Тест Тестович",
  inn: "860200000000",
  birthDate: "01.02.1990",
  birthPlace: "г. Тест",
  regAddress: "г. Тест, ул. Тестовая, д. 1",
  bankName: "Тест-Банк",
  bik: "044525999",
  account: "40802810500000099999",
  phone: "7 900 111-22-33",
  email: "t@t.ru",
  activity: "Тестовая деятельность",
};
const outIp = await fillAnketaDocx(
  readFileSync("/home/z/my-project/document-templates/anketa-ip.docx"),
  ipProfile as never
);
const zipIp = await JSZip.loadAsync(outIp);
const xmlIp = await zipIp.file("word/document.xml")!.async("string");
const flatIp = txt(xmlIp);
ok(flatIp.includes("Индивидуальный предприниматель Тестов Тест Тестович"), "ИП: «Индивидуальный предприниматель ФИО»");
ok(flatIp.includes("Тестовая деятельность"), "ИП: вид деятельности в СБП-строке");
const ipBal =
  [...xmlIp.matchAll(/<w:p\b[^>]*(?<!\/)>/g)].length === [...xmlIp.matchAll(/<\/w:p>/g)].length;
ok(ipBal, "ИП: XML сбалансирован");

console.log(fails === 0 ? "\nALL PASS" : `\nFAILURES: ${fails}`);
process.exit(fails === 0 ? 0 : 1);
