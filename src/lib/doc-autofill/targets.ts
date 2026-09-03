/**
 * Реестр целевых документов автозаполнения и хранилище шаблонов.
 * Шаблоны лежат в document-templates/ (git-отслеживаемые, без перс. данных).
 */
import { existsSync } from "fs";
import path from "path";

export const TEMPLATES_DIR = path.join(process.cwd(), "document-templates");

export interface AutofillTarget {
  id: string;
  title: string;
  description: string;
  file: string;
  ext: "xlsx" | "docx";
  optional?: boolean; // шаблон может быть ещё не загружен
}

export const AUTOFILL_TARGETS: AutofillTarget[] = [
  {
    id: "sbp",
    title: "Заявка на регистрацию (СБП)",
    description:
      "СБП — регистрация мерчанта: наименования, ИНН, адрес, р/с, дата рождения учредителя. Фиксированные значения не изменяются.",
    file: "zayavka-sbp.xlsx",
    ext: "xlsx",
  },
  {
    id: "anketa-ip",
    title: "Анкета-заявление заказчика (ИП)",
    description:
      "Полная анкета к Договору с АО «ПРЦ»: реквизиты, паспорт, банк, контакты, финансовые условия.",
    file: "anketa-ip.docx",
    ext: "docx",
  },
  {
    id: "anketa-yul",
    title: "Анкета-заявление заказчика (ЮЛ)",
    description:
      "Тот же формат для юридических лиц. Загрузите шаблон формы ЮЛ, если он ещё не добавлен.",
    file: "anketa-yul.docx",
    ext: "docx",
    optional: true,
  },
];

export function targetPath(t: AutofillTarget): string {
  return path.join(TEMPLATES_DIR, t.file);
}

export function targetAvailable(t: AutofillTarget): boolean {
  return existsSync(targetPath(t));
}

export function findTarget(id: string): AutofillTarget | undefined {
  return AUTOFILL_TARGETS.find((t) => t.id === id);
}
