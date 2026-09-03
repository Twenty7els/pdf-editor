/**
 * Требования шаблонов: какие поля профиля использует каждый целевой документ.
 * По ним шаг 3 показывает, чего не хватает в анкете, и предлагает дописать
 * прямо в интерфейсе — до скачивания.
 */
import type { MerchantProfile } from "./profile";

export interface TemplateRequirement {
  key: keyof MerchantProfile;
  label: string;
  /** Подсказка в пустом поле ввода. */
  hint?: string;
  /** Важно для этого документа (помечается звёздочкой). */
  important?: boolean;
  /** Поле автоподставляемое: показываем в списке «есть», но не требуем. */
  autoNote?: string;
}

export const TARGET_REQUIREMENTS: Record<string, TemplateRequirement[]> = {
  sbp: [
    { key: "orgName", label: "Наименование организации", important: true },
    { key: "inn", label: "ИНН", important: true },
    {
      key: "legalAddress",
      label: "Юридический адрес",
      hint: "Если оставить пустым — подставится фактический адрес",
      important: true,
    },
    { key: "account", label: "Расчётный счёт", important: true },
    {
      key: "birthDate",
      label: "Дата рождения учредителя",
      hint: "дд.мм.гггг",
    },
  ],

  "anketa-ip": [
    {
      key: "directorName",
      label: "ФИО (Наименование Заказчика)",
      hint: "Если оставить пустым — возьмётся из названия организации",
      important: true,
    },
    { key: "birthDate", label: "Дата рождения", hint: "дд.мм.гггг", important: true },
    { key: "birthPlace", label: "Место рождения" },
    {
      key: "citizenship",
      label: "Гражданство",
      hint: "Например: Российская Федерация",
    },
    { key: "inn", label: "ИНН", important: true },
    { key: "ogrip", label: "ОГРНИП" },
    { key: "okpo", label: "ОКПО" },
    { key: "okved", label: "ОКВЭД (основной)" },
    {
      key: "regAddress",
      label: "Адрес регистрации (место жительства)",
      important: true,
    },
    {
      key: "factAddress",
      label: "Адрес места пребывания",
      hint: "Если оставить пустым — подставится юридический адрес",
    },
    {
      key: "legalAddress",
      label: "Почтовый адрес",
      hint: "Если оставить пустым — подставится фактический адрес",
    },
    { key: "phone", label: "Контактный телефон", important: true },
    { key: "email", label: "E-mail", important: true },
    { key: "bankName", label: "Наименование банка", important: true },
    { key: "bik", label: "БИК банка", important: true },
    { key: "corrAccount", label: "Корреспондентский счёт", important: true },
    { key: "account", label: "Расчётный счёт", important: true },
    {
      key: "contactName",
      label: "Контактное лицо",
      hint: "Если оставить пустым — подставится ФИО руководителя",
    },
    { key: "activity", label: "Наименование сервиса (вид деятельности)", important: true },
  ],

  "anketa-yul": [
    { key: "orgName", label: "Полное наименование организации", important: true },
    { key: "inn", label: "ИНН", important: true },
    { key: "ogrip", label: "ОГРН" },
    { key: "kpp", label: "КПП" },
    { key: "okpo", label: "ОКПО" },
    { key: "okved", label: "ОКВЭД (основной)" },
    { key: "legalAddress", label: "Юридический адрес", important: true },
    {
      key: "factAddress",
      label: "Фактический адрес",
      hint: "Если оставить пустым — подставится юридический адрес",
    },
    { key: "phone", label: "Контактный телефон", important: true },
    { key: "email", label: "E-mail", important: true },
    { key: "bankName", label: "Наименование банка", important: true },
    { key: "bik", label: "БИК банка", important: true },
    { key: "corrAccount", label: "Корреспондентский счёт", important: true },
    { key: "account", label: "Расчётный счёт", important: true },
    {
      key: "directorName",
      label: "ФИО руководителя (контактное лицо)",
      important: true,
    },
    { key: "activity", label: "Наименование сервиса (вид деятельности)", important: true },
  ],
};

/** Значение профиля заполнено (строка или список). */
export function isRequirementFilled(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0;
  return Boolean(String(v ?? "").trim());
}

/** Требования шаблона, которых не хватает в профиле. */
export function missingForTarget(
  targetId: string,
  profile: MerchantProfile
): TemplateRequirement[] {
  return (TARGET_REQUIREMENTS[targetId] ?? []).filter(
    (r) => !isRequirementFilled(profile[r.key])
  );
}
