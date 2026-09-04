/**
 * Профиль мерчанта — нормализованные данные, извлечённые из заполненной
 * анкеты («Заявка на подключение», Uniteller) и редактируемые пользователем.
 */
export interface MerchantProfile {
  // 01 Данные организации
  orgName?: string;
  inn?: string;
  kpp?: string;
  legalAddress?: string;
  factAddress?: string;

  // 02 Банковские реквизиты
  bik?: string;
  bankName?: string;
  account?: string;
  corrAccount?: string;

  // 03 Данные руководителя
  directorName?: string;
  birthDate?: string; // дд.мм.гггг
  birthPlace?: string;
  snils?: string;
  passSeries?: string;
  passNumber?: string;
  passDeptCode?: string;
  passIssueDate?: string; // дд.мм.гггг
  passIssuer?: string;
  regAddress?: string;

  // 04 Контактная информация
  contactName?: string;
  phone?: string;
  email?: string;

  // 05 Вид деятельности
  activity?: string;
  turnover?: string;

  // 06 Оборудование
  equipType?: string;
  terminalCount?: string;
  serials?: string[];

  // 07 Адреса точек установки
  pointAddresses?: string[];
  pointComments?: string[];

  // 08 Комментарий
  comment?: string;

  // Поля, которых нет в анкете (заполняются вручную при необходимости)
  citizenship?: string;
  ogrip?: string;
  okpo?: string;
  okved?: string;

  // 09 Параметры СБП (заявка на регистрацию мерчанта и UPID)
  upid?: string;
  mcc?: string;
  merchantId?: string; // merchantid (ID ЮЛ в СБП)
  accountOpenDate?: string; // дд.мм.гггг
  oldestContractDate?: string; // дд.мм.гггг — параметр Fraudscore
  combatParamsDate?: string; // дд.мм.гггг

  // 10 Договор с Uniteller (номер+дата также идут в нижний блок заявки СБП)
  unitContractNumber?: string;
  unitContractDate?: string; // дд.мм.гггг
  unitRate?: string;

  // 11 Финансовые условия анкеты (таблица «Финансовые условия», строка СБП)
  serviceCategory?: string; // колонка «Категория Услуг»
  partnerRate?: string; // «Размер вознаграждения Исполнителя за осущ.
  // инф.-технолог. взаимодействия, в т.ч. НДС 22%»
}

/** Группы полей для UI-редактора профиля. */
export interface ProfileFieldMeta {
  key: keyof MerchantProfile;
  label: string;
  list?: boolean; // поле-список (serials, pointAddresses, pointComments)
}

export interface ProfileGroup {
  title: string;
  fields: ProfileFieldMeta[];
}

export const PROFILE_GROUPS: ProfileGroup[] = [
  {
    title: "Данные организации",
    fields: [
      { key: "orgName", label: "Название организации" },
      { key: "inn", label: "ИНН" },
      { key: "kpp", label: "КПП" },
      { key: "ogrip", label: "ОГРНИП / ОГРН" },
      { key: "legalAddress", label: "Юридический адрес" },
      { key: "factAddress", label: "Фактический адрес" },
    ],
  },
  {
    title: "Банковские реквизиты",
    fields: [
      { key: "bankName", label: "Название банка" },
      { key: "bik", label: "БИК" },
      { key: "account", label: "Расчётный счёт" },
      { key: "corrAccount", label: "Корреспондентский счёт" },
    ],
  },
  {
    title: "Данные руководителя",
    fields: [
      { key: "directorName", label: "ФИО руководителя" },
      { key: "birthDate", label: "Дата рождения" },
      { key: "birthPlace", label: "Место рождения" },
      { key: "citizenship", label: "Гражданство" },
      { key: "snils", label: "СНИЛС" },
      { key: "passSeries", label: "Серия паспорта" },
      { key: "passNumber", label: "Номер паспорта" },
      { key: "passDeptCode", label: "Код подразделения" },
      { key: "passIssueDate", label: "Дата выдачи паспорта" },
      { key: "passIssuer", label: "Кем выдан" },
      { key: "regAddress", label: "Адрес регистрации по паспорту" },
    ],
  },
  {
    title: "Контакты и деятельность",
    fields: [
      { key: "contactName", label: "ФИО контактного лица" },
      { key: "phone", label: "Телефон" },
      { key: "email", label: "E-mail" },
      { key: "activity", label: "Вид деятельности" },
      { key: "turnover", label: "Ожидаемый оборот в месяц" },
      { key: "okpo", label: "ОКПО" },
      { key: "okved", label: "ОКВЭД (основной)" },
    ],
  },
  {
    title: "Параметры СБП",
    fields: [
      { key: "upid", label: "UPID" },
      { key: "mcc", label: "МСС-код" },
      { key: "merchantId", label: "merchantid (ID ЮЛ в СБП)" },
      { key: "accountOpenDate", label: "Дата открытия р/с для СБП" },
      { key: "oldestContractDate", label: "Дата старого договора с мерчантом" },
      { key: "combatParamsDate", label: "Дата получения боевых параметров СБП" },
    ],
  },
  {
    title: "Договор с Uniteller",
    fields: [
      { key: "unitContractNumber", label: "Номер договора" },
      { key: "unitContractDate", label: "Дата договора" },
      { key: "unitRate", label: "Ставка по договору" },
    ],
  },
  {
    title: "Финансовые условия анкеты",
    fields: [
      { key: "serviceCategory", label: "Категория услуг" },
      {
        key: "partnerRate",
        label: "Размер вознаграждения (в т.ч. НДС 22%)",
      },
    ],
  },
  {
    title: "Оборудование и точки",
    fields: [
      { key: "equipType", label: "Тип оборудования" },
      { key: "terminalCount", label: "Количество терминалов" },
      { key: "serials", label: "Серийные номера терминалов", list: true },
      { key: "pointAddresses", label: "Адреса точек установки", list: true },
      { key: "pointComments", label: "Комментарии к точкам", list: true },
      { key: "comment", label: "Дополнительная информация" },
    ],
  },
];

/** Убрать префикс организационной формы, оставить чистое ФИО/наименование. */
export function stripOrgPrefix(name: string): string {
  return name
    .replace(
      /^индивидуальный\s+предприниматель\s+/i,
      ""
    )
    .replace(/^ИП\s+/i, "")
    .replace(
      /^общество\s+с\s+ограниченной\s+ответственностью\s+/i,
      ""
    )
    .replace(/^ООО\s+/i, "")
    .trim();
}

/** Является ли значение анкеты пустышкой-плейсхолдером. */
export function isPlaceholder(v: string): boolean {
  const t = v.trim();
  if (!t) return true;
  return (
    /^дд\.мм\.гггг$/i.test(t) ||
    /^\+7\s*\(___\)/.test(t) ||
    /^000-000/.test(t) ||
    /^введите число$/i.test(t) ||
    t === "…" ||
    t === "..." ||
    // рукописные прочерки и отказы — это тоже «нет значения»
    /^[-–—]+$/.test(t) ||
    /^(нет|не указано|не указан|не указана|отсутствует)$/i.test(t)
  );
}

const LIST_FIELDS = new Set(["serials", "pointAddresses", "pointComments"]);

/**
 * Привести произвольный JSON-объект к валидному MerchantProfile:
 * строки — обрезаются, списки — массив непустых строк, всё остальное
 * (числа/объекты/null) отбрасывается. Защита и от 500 на сервере
 * (.trim() не функция), и от мусорных значений в документах.
 */
export function sanitizeProfile(raw: unknown): MerchantProfile {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(src)) {
    if (LIST_FIELDS.has(key)) {
      if (Array.isArray(value)) {
        const list = value
          .map((v) => String(v ?? "").trim())
          .filter(Boolean)
          .slice(0, 100);
        if (list.length) out[key] = list;
      }
      continue;
    }
    if (typeof value === "string") {
      const t = value.trim();
      if (t) out[key] = t.slice(0, 2000);
    }
    // числа/объекты/прочее — игнорируем
  }
  return out as MerchantProfile;
}
