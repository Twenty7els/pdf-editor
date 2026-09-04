/**
 * Репродукция и проверка заполнения docx-анкеты.
 * Запуск: bun /home/z/my-project/scripts/test-docx-fill.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fillAnketaDocx } from "../src/lib/doc-autofill/fill-docx";

const template = readFileSync(
  "/home/z/my-project/document-templates/anketa-ip.docx"
);

const profile = {
  orgName: "ИП Шангараев Роман Романович",
  inn: "860200000000",
  ogrip: "300000000000000",
  legalAddress: "628600, ХМАО-Югра, г. Нижневартовск, ул. Ленина, д. 1, кв. 2",
  factAddress: "628600, ХМАО-Югра, г. Нижневартовск, ул. Мира, д. 5, оф. 10",
  bankName: "ВТБ (Публичное акционерное общество)",
  bik: "044525187",
  account: "40802810500000012345",
  corrAccount: "30101810745350000187",
  directorName: "Шангараев Роман Романович",
  birthDate: "01.02.1990",
  birthPlace: "г. Нижневартовск",
  citizenship: "Российская Федерация",
  phone: "+7 (900) 123-45-67",
  email: "avtomoyka@example.ru",
  contactName: "Шангараев Роман Романович",
  activity: "Мойка автомобилей",
};

const out = await fillAnketaDocx(template, profile as never);
writeFileSync("/tmp/anketa-filled.docx", out);
console.log("OK, bytes:", out.length);
