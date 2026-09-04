/**
 * Требования шаблонов: какие поля профиля использует каждый целевой документ.
 * По ним шаг 3 показывает, чего не хватает в анкете, и предлагает дописать
 * прямо в интерфейсе — до скачивания.
 */
import type { MerchantProfile } from "./profile";

export interface TemplateRequirement {
  /** Основное поле профиля; для автополей (autoNote) может отсутствовать. */
  key?: keyof MerchantProfile;
  label: string;
  /** Подсказка в пустом поле ввода. */
  hint?: string;
  /** Важно для этого документа (помечается звёздочкой). */
  important?: boolean;
  /** Автополе: не требуем и не даём инпут — собирается из других полей. */
  autoNote?: string;
  /** Поле считается заполненным, даже если key пуст (автосборка из других полей). */
  satisfied?: (p: MerchantProfile) => boolean;
}

export const TARGET_REQUIREMENTS: Record<string, TemplateRequirement[]> = {
  sbp: [
    {
      key: "orgName",
      label: "Наименование организации",
      hint: "Встанет в наименование мерчанта, ЮЛ и brandName",
      important: true,
    },
    { key: "inn", label: "ИНН", important: true },
    {
      key: "mcc",
      label: "МСС-код",
      hint: "Код вида деятельности в СБП, например 7542",
      important: true,
    },
    {
      key: "merchantId",
      label: "merchantid (ID ЮЛ в СБП)",
      hint: "Например: LB0000006800",
      important: true,
    },
    {
      key: "upid",
      label: "UPID",
      hint: "ID для блока «регистрация UPID»",
    },
    {
      key: "legalAddress",
      label: "Юридический адрес",
      hint: "Если оставить пустым — подставится фактический адрес",
      important: true,
    },
    { key: "account", label: "Расчётный счёт мерчанта", important: true },
    {
      key: "accountOpenDate",
      label: "Дата открытия расчётного счёта",
      hint: "дд.мм.гггг",
    },
    {
      key: "birthDate",
      label: "Дата рождения учредителя",
      hint: "дд.мм.гггг — нужна для проверки Fraudscore",
      important: true,
    },
    {
      key: "oldestContractDate",
      label: "Дата самого старого договора с мерчантом",
      hint: "дд.мм.гггг — параметр Fraudscore",
      important: true,
    },
    {
      key: "combatParamsDate",
      label: "Дата получения боевых параметров СБП",
      hint: "дд.мм.гггг",
    },
    {
      key: "unitContractNumber",
      label: "Номер договора с Uniteller",
      hint: "Например: 123/45 или б/н",
      important: true,
    },
    {
      key: "unitContractDate",
      label: "Дата договора с Uniteller",
      hint: "дд.мм.гггг",
      important: true,
    },
    {
      key: "unitRate",
      label: "Ставка по договору с Uniteller",
      hint: "Например: 1,6%",
    },
    // Автополе: обе нижние строки заявки (с Банком и с Uniteller — один договор)
    {
      label: "Договор с Uniteller: номер и дата (низ)",
      autoNote: "Один договор для обеих нижних строк — соберётся из полей выше",
      satisfied: (p) =>
        isRequirementFilled(p.unitContractNumber) &&
        isRequirementFilled(p.unitContractDate),
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
    { key: "contactName",
      label: "Контактное лицо",
      hint: "Если оставить пустым — подставится ФИО руководителя",
    },
    { key: "activity", label: "Наименование сервиса (вид деятельности)", important: true },
    {
      key: "serviceCategory",
      label: "Категория услуг",
      hint: "Колонка «Категория Услуг» в финансовых условиях",
    },
    {
      key: "partnerRate",
      label: "Размер вознаграждения Исполнителя",
      hint: "За инф.-технолог. взаимодействие, в т.ч. НДС 22% — например: 1,5%",
    },
  ],

  "anketa-yul": [
    {
      key: "orgName",
      label: "Полное фирменное наименование",
      hint: "Как в уставе, например: ООО «Ромашка»",
      important: true,
    },
    { key: "inn", label: "ИНН", important: true },
    { key: "ogrip", label: "ОГРН" },
    { key: "okpo", label: "ОКПО" },
    { key: "okved", label: "ОКВЭД (основной)" },
    {
      key: "legalAddress",
      label: "Адрес места нахождения (регистрации)",
      hint: "Если оставить пустым — подставится фактический адрес",
      important: true,
    },
    {
      key: "factAddress",
      label: "Адрес фактического места нахождения",
      hint: "Если оставить пустым — подставится юридический адрес",
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
    {
      key: "activity",
      label: "Наименование Сервиса (в таблице условий)",
      hint: "Встанет вместо «Бренднэйм» в строке СБП",
      important: true,
    },
    {
      key: "serviceCategory",
      label: "Категория услуг",
      hint: "Встанет вместо «Наименование категории» в строке СБП",
    },
    {
      key: "partnerRate",
      label: "Размер вознаграждения Исполнителя",
      hint: "За инф.-технолог. взаимодействие, в т.ч. НДС 22% — например: 1,5%",
    },
  ],
};

/** Значение профиля заполнено (строка или список). */
export function isRequirementFilled(v: unknown): boolean {
  if (Array.isArray(v)) {
    // список заполнен, если есть хотя бы одна непустая строка
    // (при редактировании в textarea в конце может висеть пустая строка)
    return v.some((x) => Boolean(String(x ?? "").trim()));
  }
  return Boolean(String(v ?? "").trim());
}

/** Требование выполнено: напрямую или через автосборку (satisfied). */
export function isRequirementSatisfied(
  r: TemplateRequirement,
  profile: MerchantProfile
): boolean {
  if (r.satisfied) return r.satisfied(profile);
  if (!r.key) return false;
  return isRequirementFilled(profile[r.key]);
}

/** Требования шаблона, которых не хватает в профиле (без автополей). */
export function missingForTarget(
  targetId: string,
  profile: MerchantProfile
): TemplateRequirement[] {
  return (TARGET_REQUIREMENTS[targetId] ?? []).filter(
    (r) => !r.autoNote && !isRequirementSatisfied(r, profile)
  );
}
