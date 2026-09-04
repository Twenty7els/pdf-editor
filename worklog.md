# Worklog

---
Task ID: 1
Agent: Z.ai Code (main)
Task: Редизайн PDF-редактора в стиле Claude (Anthropic) + поиск и исправление всех ошибок

Work Log:
- Изучил весь проект: PDF-редактор (Next.js 16, App Router, Zustand, pdf.js + pdf-lib). Экраны: логин (SHA-256 пароль), загрузка PDF, холст с печатями/текстом/ластиком, слои, миниатюры, диалог экспорта.
- **Дизайн-система Claude** (`src/app/globals.css` — полная перезапись):
  - Палитра: фон #FAF9F5 (слоновая кость), овсяный #F0EEE6, терракота #D97757 (primary), чернильный #1F1E1D, тёплые границы #E8E4D8.
  - Утилиты переопределены под Claude-эстетику: gradient-bg → терракота, gradient-bg-tri → чернильный, aurora-bg → тёплая бумага с едва заметными оттенками, мягкие многослойные тени, тонкие hairline-градиенты вместо ярких рамок.
  - Удалены «дешёвые» эффекты: shimmer, btn-glow, pulse-glow, анимированные градиентные рамки.
- **Типографика** (`src/app/layout.tsx`): дисплейный шрифт Lora (сериф с кириллицей, близок к Copernicus у Claude) + Inter для UI. Акцентные слова в заголовках — терракотовый курсивный сериф. Обновлены metadata и themeColor (#faf9f5).
- **Редизайн компонентов**: LoginScreen, Header, Footer (page.tsx), UploadZone (герой-карточка + чернильная CTA), Toolbar (терракотовые активные состояния), LayersPanel, ExportDialog, TextEditSidebar, PageThumbnails, PdfCanvas (панели свойств, нижний пилл управления).
- **Исправленные баги**:
  1. **Экспорт при повороте страницы**: координаты элементов хранились в «повёрнутой» системе вида, а рисовались в неповернутом mediabox → штампы/текст/ластик оказывались не на месте. Написан полный преобразователь view→PDF (viewPointToPdf, getViewDims) с учётом суммарного поворота T = intrinsic /Rotate + пользовательский.
  2. **Направление поворота штампов/текста при экспорте инвертировано**: canvas rotate — по часовой, pdf-lib rotate — против. Угол в PDF теперь φ = T − θ.
  3. **Интринсик-поворот страниц игнорировался** в рендере холста, миниатюрах и диалоге экспорта (pdf.js `rotation` — абсолютное значение): теперь везде суммарный поворот.
  4. **letterSpacing молча терялся при экспорте** (у pdf-lib нет опции charSpacing): реализована посимвольная отрисовка вдоль базовой линии при ненулевом интервале.
  5. **React warning «Cannot update Home while rendering PdfCanvas»**: addEraser/setSelectedItem вызывались внутри setState-updater'а. Вынесены через eraserPointsRef.
  6. **Race рендера миниатюр** («Cannot use the same canvas during multiple render()»): добавлена отмена предыдущих RenderTask и дедупликация эффекта перерисовки в ExportDialog/PageThumbnails.
  7. Мелочи: presetText: undefined в setActiveTool, deprecated substr→slice, мёртвый код, подсчёт элементов в тосте экспорта (скрытые/удалённые больше не считаются), захардкоженные имена печатей в LayersPanel → динамический резолв (пресеты + загруженные), типизация pdfDoc (unknown → PDFDocumentProxy), canvas-параметр pdf.js v6 в render(), BlobPart, кнопки без группы для hover-стрелки.
- **Мобильная версия**: миниатюры скрыты на <md, авто-подгонка зума под ширину экрана при загрузке PDF, нижний пилл управления с ограничением ширины и горизонтальным скроллом.
- **Проверки**: ESLint — 0 ошибок/предупреждений; tsc --noEmit — 0 ошибок в src/; Agent Browser — полный «золотой путь» (логин + ошибка пароля, загрузка, печать с поворотом 45°, текст с кириллицей, ластик, поворот страницы 90°, undo, экспорт «все страницы»/«выбранные», скачивание) — все экспортированные PDF отрендерены через pdftoppm и сверены с превью: позиции, углы, кириллица, замазывание — совпадают. Консоль браузера чистая (0 ошибок/предупреждений).

Stage Summary:
- Приложение полностью переработано в тёплой «Claude»-эстетике (крем/овсянка/терракота/чернила + сериф Lora).
- Исправлено 6 значимых багов, включая критические ошибки экспорта (позиция и угол элементов на повёрнутых страницах, молча терявшийся letterSpacing).
- Все проверки пройдены: lint 0/0, tsc 0 ошибок (src/), браузерная верификация golden path успешна, консоль чистая.
- Проект готов к выгрузке на GitHub (ждёт ключ от пользователя).

---
Task ID: 2
Agent: Z.ai Code (main)
Task: Исправить баг «квадратики вместо цифр при скачивании» + заложить единую дизайн-систему

Work Log:
- БАГ ЦИФР: найдена причина — src/lib/font-base64.ts содержал сабсеты Noto Sans «Cyrillic only» (без глифов цифр и латиницы) → при экспорте pdf-lib рисовал .notdef-квадратики.
- Скачаны статические NotoSans-Regular/Bold/Italic/BoldItalic.ttf, пересабсетированы pyftsubset'ом с покрытием: Basic Latin (цифры!), Latin-1, Cyrillic, General Punctuation, супер/субскрипты, валюты (₽ €), № ™, стрелки, знаки − ≠ ≤ ≥ ≈. 883 глифа, ~140KB на начертание.
- Проверено: 0-9 A-Z а-я Ёё № ₽ «» — … € — все глифы присутствуют. tsc по src/ чист.
- Единая дизайн-система (globals.css переписан): ОДИН шрифт Inter (Lora/сериф удалён из layout.tsx), только веса 400/500/600 (font-bold запрещён), плоские цвета (градиенты удалены),brand-плитки = bg-ink, действия/активные состояния = terracotta (bg-primary, hover:bg-terracotta-dark — добавлены theme-цвета ink/ink-hover/terracotta/terracotta-dark/terracotta-soft/oat), радиусы 2xl/xl/lg, тени shadow-soft/shadow-elevated.
- page.tsx (логин, шапка, подвал) уже переведён на новую систему: без font-display, без <em>-курсивов, единые метки секций text-[11px] font-semibold uppercase tracking-wider.

Stage Summary:
- Дизайн-система канонизирована в globals.css (комментарий-регламент в шапке файла).
- Шрифт для экспорта теперь покрывает цифры/латиницу/символы — баг квадратиков устранён.
- Каноничные примеры паттернов для остальных компонентов: page.tsx (LoginScreen, Header, Footer).

---
Task ID: 4-b
Agent: frontend-styling-expert
Task: Рестайлинг LayersPanel / PageThumbnails / TextEditSidebar под единую Claude дизайн-систему (только стили: типографика, палитра, радиусы, тени, иконки; вся логика/пропсы/handlers/aria без изменений)

Work Log:
- LayersPanel.tsx: метка «Слои» → text-[11px] font-semibold uppercase tracking-wider; чип количества → text-[10px] font-medium rounded-lg; заголовок слоя font-semibold → font-medium (унификация строк списка); бейдж чужой страницы text-[9px] font-bold → text-[10px] font-medium rounded-lg; StatChip: число font-bold → font-semibold, метка text-[9px] → text-[10px]; иконка StatChip и ChevronRight подсказки — strokeWidth по умолчанию 2 (2.5 убран); выбранная плитка слоя gradient-bg → bg-primary (плитка rounded-lg → rounded-xl), strokeWidth 2.2 только в выбранном (solid) состоянии — иначе 2; empty-state заголовок text-xs font-medium; hint-бокс приведён к канону p-3 rounded-xl bg-secondary/60 + text-[11px].
- PageThumbnails.tsx: «Страницы» text-[9px] font-bold tracking-widest → text-[10px] font-semibold tracking-wider (10px сохранён намеренно — узкий рельс); чип количества → text-[10px] font-medium rounded-lg; номер страницы font-bold → font-medium; индикатор поворота (amber) text-[9px] font-semibold → text-[10px] font-medium (amber зарезервирован за поворотом/скрытием); бейдж «удалена» text-[9px] font-semibold → text-[10px] font-medium rounded-lg; «Ошибка» text-[9px] → text-[10px] font-medium; карточка миниатюры rounded-lg → rounded-xl, холст rounded-md → rounded-lg, мини-кнопки hover-действий rounded → rounded-lg.
- TextEditSidebar.tsx: заголовок диалога font-display удалён → text-base font-semibold tracking-tight; подзаголовок без font-medium (font-normal); плитка заголовка gradient-bg → bg-primary (strokeWidth 2.2 сохранён — solid); все 8 меток контролей (Предпросмотр/Текст/Размер/Шрифт/Начертание/Выравнивание/Межбуквенный интервал/Цвет) text-[10px] font-bold tracking-widest → text-[11px] font-semibold tracking-wider; inline-значения {fontSize}px/{letterSpacing}px font-semibold → font-medium (text-primary tabular-nums сохранены); счётчик символов → text-[11px] font-medium + normal-case tracking-normal; textarea — удалён font-mono (font-mono остался только в <kbd>); пресеты размера rounded-md → rounded-lg, font-semibold → font-medium, активный bg-primary text-white; кнопка «Сохранить» font-semibold → font-medium, hover:bg-[#c15f3c] → hover:bg-terracotta-dark; hairline-градиентный разделитель → плоский h-px bg-border/60 (no gradients); strokeWidth: Check в Save 2.5 → 2.2 (solid), Check в свотче 3 → 2.2, ChevronRight подсказки 2.5 → default 2; ToggleButton active оставлен как есть (border-primary bg-primary text-primary-foreground shadow-soft); live-preview inline-стили не тронуты.

Stage Summary:
- Три панели приведены к единой типографике: только Inter, веса 400/500/600, никаких font-display/serif/bold/italic, все uppercase-метки = text-[11px] font-semibold tracking-wider, микро = text-[10px]/[11px] font-medium (text-[9px] искоренены).
- Плоская палитра: gradient-bg удалён (bg-primary для активных/бренд-плиток), hover:bg-terracotta-dark вместо произвольного hex, градиентный разделитель выпрямлен, amber оставлен только для индикаторов hidden/rotate.
- Иконки: дефолтный strokeWidth 2 везде, 2.2 только внутри solid (bg-primary/bg-ink) плиток и primary-кнопки.
- Верификация: bunx tsc --noEmit — 0 ошибок в src/; bun run lint — 0 ошибок/предупреждений; grep по трём файлам на font-display/font-bold/gradient-bg/bg-[#c15f3c]/<em /tracking-widest/text-[9px] — 0 совпадений; font-mono остался только в <kbd>.
- Решение по счётчику символов: «font-medium» и «font-normal» взаимоисключающие — взят явный целевой вес font-medium из спецификации с сохранением модификаторов normal-case tracking-normal (font-normal исключён во избежание конфликтующей пары классов).
- Файлы вне зоны задачи (Toolbar, UploadZone, PdfCanvas, ExportDialog — там ещё есть gradient-bg/font-display/tracking-widest/hex-hover) не тронуты; их нужно пройти аналогично (Task 4-a/4-c).

---
Task ID: 4-c
Agent: frontend-styling-expert
Task: Рестайл PDF-редактора — привести UI-обвязку PdfCanvas.tsx к единой Claude дизайн-системе (только classNames/презентационная разметка; логика, координаты, обработчики, style-геометрия не тронуты)

Work Log:
- Прочитал worklog (Task 1–2), весь PdfCanvas.tsx (1913 строк), globals.css и ui/button.tsx + ui/alert-dialog.tsx для сверки с каноном системы.
- Типографика: убраны оба `font-display` (заголовки error/deleted-page → `text-lg font-semibold`); `font-semibold` на мелких элементах → `font-medium` (метка A4-баннера, номер страницы, зум %, preset-текст); статус «Загрузка PDF...» → `text-sm font-normal`; hint-строки → `text-[11px] text-muted-foreground`; метки полей (Кисть/Цвет/Поворот/Ш/В/Прозр.) → каноничный паттерн `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`; все числа/зум/габариты получили/сохранили `tabular-nums`; Serif/italic/`<em>` в файле отсутствовали и не добавлены.
- Цвета/панели: `gradient-bg` → `bg-primary` (круг ручки поворота) и → `bg-ink text-white` (иконка-плитка текст-инструмента в шапке панели); `gradient-border` на обоих плавающих контейнерах (нижний пилл + панель свойств) заменён на плоский `border border-border/70`; масштаб `shadow-elevated` сохранён только на плавающих панелях, мелкая ручка поворота → `shadow-soft`.
- Радиусы: мини-иконки нижнего пилла `rounded-full` → `rounded-lg` (сам пилл остался `rounded-full`); кнопки свойств (h-7: B/I/U, выравнивание, повороты, размеры кисти, destructive-удаления, «Изменить текст») → `rounded-lg`; number-inputs → `rounded-lg`; AlertDialogContent → `rounded-2xl`.
- Кнопки: primary «Изменить текст» → `hover:bg-terracotta-dark` (+rounded-lg); AlertDialogAction удаления страницы — с destructive-оверрайда на primary-стиль (`bg-primary text-white font-medium hover:bg-terracotta-dark`) по ТЗ.
- Иконки: lucide `strokeWidth` 2.5/3 → 2 (баннер X/AlertTriangle, Loader2); 2.2 оставлен только внутри сплошных плиток bg-ink/bg-primary (Type-иконка, SVG ручки поворота).
- Бейджи: opacity-процент → `text-[11px] font-medium tabular-nums`; номер страницы и зум → `text-[11px] font-medium tabular-nums`.
- Прочее: свотчи цвета → `rounded-lg` (+`shadow-soft` на активном, консистентно с TextEditSidebar); A4-баннер и amber-индикаторы сохранены (amber только для rotated/hidden/warning — ок); ring/handle выделения (border-primary, rounded-sm, HANDLE_SIZE/ROTATE_HANDLE_DISTANCE) не тронуты.
- Верификация: `bunx tsc --noEmit | grep "^src/"` — пусто; `bun run lint` — 0 ошибок; grep файла на `font-display|font-bold|gradient-bg|bg-[#c15f3c]|<em |tracking-widest|text-[9px]|gradient-border` — 0 совпадений; счётчики `style={{` (11), HANDLER-пропсов (40) и ссылок на HANDLE_SIZE/ROTATE_HANDLE_DISTANCE (5) идентичны до/после (git stash-сравнение) — геометрия и логика гарантированно не изменены (62 строки diff, только className/strokeWidth).

Stage Summary:
- PdfCanvas.tsx полностью переведён на единую систему: Inter, веса normal/medium/semibold по ролям, канонические метки `text-[11px] font-semibold uppercase tracking-wider`, tabular-nums на числах, плоские цвета (bg-primary/bg-ink вместо gradient-bg/gradient-border), радиусы lg/2xl по шкале, тени soft/elevated, иконки strokeWidth 2 (2.2 — только в сплошных плитках).
- Selection-UI, inline-геометрия (style props), координатная математика, обработчики и константы хендлов — без изменений (проверено счётчиками и diff).
- tsc: 0 ошибок в src/; ESLint: 0 ошибок/предупреждений; запрещённые паттерны: 0.

---
Task ID: 4-a
Agent: frontend-styling-expert
Task: Рестайлинг UploadZone, ExportDialog, Toolbar по единой Claude дизайн-системе (типографика, цвета, радиусы, иконки) — только стили, без изменения логики/пропсов/обработчиков/aria/текстов.

Work Log:
- UploadZone.tsx: убраны font-display и <em> из H2 → «Загрузите <span text-primary>PDF</span> документ» (text-2xl md:text-[2rem] font-semibold tracking-tight); иконка дропзоны gradient-bg → плоский bg-primary (FileUp strokeWidth 1.8 → 2.2, правило для solid-плиток); CTA bg-ink font-semibold → font-medium (hover bg-ink-hover сохранён через group-hover); заголовки карточек «Возможности»/«Работает прямо в браузере» → text-sm font-semibold без font-display; описания фич text-[10px] → text-[11px]; ShieldCheck в ink-плитке strokeWidth 2 → 2.2. aurora-bg, dot-bg, поведение дропзоны не тронуты.
- ExportDialog.tsx: иконка-плитка шапки gradient-bg → bg-ink; DialogTitle font-display → text-base font-semibold; радио-опции: заголовки text-sm font-semibold → font-medium, описания text-[11px] → text-xs; метка «Страницы» text-[10px] tracking-widest → text-[11px] tracking-wider; «Выбрать все»/«Очистить» → text-[11px] font-medium; бейдж «удалена» text-[8px] font-bold → text-[10px] font-medium; номер страницы text-[10px] font-bold → text-[10px] font-medium tabular-nums; Check strokeWidth 3 → 2.2 (внутри bg-primary); счётчик в футере font-bold → font-semibold text-foreground tabular-nums; кнопка «Экспорт» bg-[#c15f3c]/font-semibold → bg-primary hover:bg-terracotta-dark font-medium rounded-xl; «Отмена» — ghost, без изменений.
- Toolbar.tsx: кнопка «Скачать PDF» hover:bg-[#c15f3c] → hover:bg-terracotta-dark, font-medium на Button, span без класса веса (был font-semibold); outline-кнопка загрузки → border-primary/40 + font-medium на Button, span без класса; 4 метки секций («Инструменты», «Ваши печати», «Загруженные», «Готовые тексты») text-[10px] tracking-widest → text-[11px] font-semibold uppercase tracking-wider; активная плитка инструмента gradient-bg → bg-primary (strokeWidth 2.2 сохранён только в solid); desc инструментов text-[10px] → text-[11px]; чип «N шт.» rounded-md → rounded-lg (text-[10px] font-medium сохранён); имена печатей text-[10px] font-semibold → font-medium (2 шт.); плитка пресет-текста gradient-bg → bg-primary, rounded-md → rounded-lg, Type strokeWidth = active ? 2.2 : 2; нормализация strokeWidth вне solid-плиток к дефолту 2: ChevronRight 2.5 → 2 (2 шт.), Paintbrush 2.2 → 2, X 2.8 → 2; мини-плитки h-6 rounded-md → rounded-lg (upload, пресет). Hint-боксы уже соответствовали спеке — не тронуты.

Stage Summary:
- Нулевые вхождения font-display / font-bold / gradient-bg / bg-[#c15f3c] / <em> / tracking-widest / italic в трёх файлах (проверено grep).
- Один шрифт Inter; веса только normal/medium/semibold; активные состояния = border-primary + bg-primary/10 + shadow-soft с плоскими bg-primary/bg-ink плитками; hover primary = terracotta-dark; радиусы 2xl/xl/lg по роли; иконки lucide: дефолт 2, 2.2 только внутри solid-плиток (декоративный watermark FileUp/FileText 0.8 в герое оставлен намеренно — фоновая графика, не UI-иконка).
- Логика/пропсы/handlers/state/aria-labels/тексты не изменены. Верификация: bunx tsc --noEmit — 0 ошибок в src/; bun run lint — 0 ошибок/предупреждений.

---
Task ID: 3 (+ 4-a/b/c oversight, 5, 6)
Agent: Z.ai Code (main)
Task: Глобальный редизайн всех компонентов в единой системе + верификация

Work Log:
- Запущены 3 параллельных сабагента (4-a: UploadZone/ExportDialog/Toolbar; 4-b: LayersPanel/PageThumbnails/TextEditSidebar; 4-c: PdfCanvas) со строгим регламентом: один шрифт, веса 400/500/600, плоские цвета, единые радиусы/тени/активные состояния. Все отчитались: tsc 0, lint 0, запрещённые паттерны (font-display, font-bold, gradient-bg, hex-hover, tracking-widest, text-[9px]) удалены.
- Финальный grep по src/: чисто (остался только legacy-алиас .gradient-bg в globals.css и сток shadcn-компонент ui/*, не используемый в интерфейсе).
- Браузерная верификация (agent-browser, 1440×900 и 390×844): логин → загрузка PDF (тестовый 2-страничный) → печать «Печать ООО» → текст «Отчет №12345 от 15.09.2024 — сумма 87 650 руб.» → ластик (мазок, 13 точек, замазал линию) → экспорт.
- ГЛАВНОЕ: скачанный PDF отрендерен через pdftoppm — ВСЕ ЦИФРЫ/№/тире/кириллица отображаются корректно, квадратиков нет. Баг подтверждён исправленным.
- Консоль браузера: 0 ошибок/предупреждений. Мобильная версия: авто-подгонка зума, нижний пилл, футер на месте.
- Удалён тестовый public/test-doc.pdf, временные файлы очищены.

Stage Summary:
- Дизайн полностью унифицирован: Inter везде, 3 веса, плоские цвета, консистентные состояния.
- Баг «квадратики при скачивании» исправлен и проверен сквозным тестом с растеризацией экспорта.
- Проект готов к выгрузке на GitHub — ждём ключ от пользователя.

---
Task ID: 2-a
Agent: frontend-styling-expert
Task: Рестайл Toolbar + ExportDialog по ATELIER v2

Work Log:
- Прочитал worklog.md и весь globals.css (ATELIER v2: токены ink/ink-hover/terracotta/terracotta-dark/terracotta-soft/oat, утилиты display-title/shadow-*/lift/kbd/glass, регламент в комментарии).
- Toolbar.tsx: «Скачать PDF» — главный CTA переведён с терракоты на чернила (bg-primary hover:bg-terracotta-dark → bg-ink hover:bg-ink-hover, text-white shadow-soft); «Загрузить другой»/«Загрузить PDF» — вторичный стиль bg-card border-border text-foreground hover:bg-secondary/60, иконка-чип bg-primary/12 → bg-terracotta-soft, FileUp text-primary → text-terracotta-dark; 4 плитки инструментов приведены к единой структуре: активная border-primary/40 bg-terracotta-soft/50 shadow-soft, чип bg-primary text-white, неактивная border-border bg-card, чип bg-secondary (иконка text-muted-foreground), hover:border-primary/30 hover:shadow-soft + lift; чип увеличен h-8 w-8 rounded-lg → h-10 w-10 shrink-0 rounded-xl, иконка h-4 → h-5, убран лишний group-hover-кондиционал на чипе; метка плитки font-semibold → font-medium (по правилу «labels/buttons = 500»); индикаторная точка активности bg-primary → bg-terracotta; плитки печатей («Ваши печати», «Загруженные») — унификация hover: hover:border-primary hover:bg-accent → hover:border-primary/30 hover:shadow-soft, база border-border/70 → border-border bg-card; «Загрузить свою печать» — вторичный канон (bg-card hover:bg-secondary/60 hover:border-primary/30, dashed сохранён); пресет-тексты: активная border-primary/40 bg-terracotta-soft/50, неактивная border-border bg-card hover:border-primary/30 hover:shadow-soft. Секционные заголовки уже канонические (text-[11px] font-semibold uppercase tracking-wider) — не тронуты.
- ExportDialog.tsx: DialogContent + rounded-2xl shadow-elevated (по спеке для диалогов); заголовок «Экспорт PDF» — добавлен display-title (антиква Source Serif, только здесь), text-base → text-lg; радио-карточки «Все страницы»/«Выбранные страницы»: выбранная border-primary/50 bg-terracotta-soft/40 (shadow-soft), невыбранная border-border bg-card hover:border-primary/30; RadioGroupItem + data-[state=checked]:border-terracotta (точка индикатора fill-primary = терракота уже канонична); карточки страниц сетки: выбранная border-primary/50 bg-terracotta-soft/40 shadow-soft, невыбранная border-border bg-card hover:border-primary/30 hover:shadow-soft, холст превью rounded-md → rounded-lg; чекбокс выбранной страницы — bg-primary + border border-primary, белая галочка Check strokeWidth 2.2; бейдж поворота text-[8px] font-semibold → text-[10px] font-medium (amber сохранён — только индикаторы); «Выбрать все» text-primary → text-terracotta-dark (канон акцентного текста); футер: «Отмена» — ghost (не тронута), «Экспорт» — bg-primary hover:bg-terracotta-dark → bg-ink hover:bg-ink-hover text-white, disabled-логика (activePageCount === 0) не тронута.
- Проверки: bunx tsc --noEmit — 0 ошибок в src/ (4 ошибки только в examples/ и skills/ — существовали до задачи); bun run lint — 0 ошибок/предупреждений; grep обоих файлов на font-display|font-bold|gradient-bg|bg-[#|tracking-widest|text-[8px]|text-[9px]|<em|italic|shadow-lg — 0 совпадений; git diff сверен — изменены только className/размеры/радиусы, ни одного props/handler/state/aria/текста.

Stage Summary:
- Toolbar и ExportDialog переведены на ATELIER v2: primary-кнопки — чернильные (bg-ink/bg-ink-hover), терракота осталась только в акцентах/активных состояниях (мягкие подложки bg-terracotta-soft/40–50, border-primary/40–50, точка bg-terracotta), вторичные кнопки и плитки — bg-card + border-border + hover:bg-secondary/60.
- Плитки инструментов: единый размер и структура (чип 40px rounded-xl), hover-канон border-primary/30 + shadow-soft + lift.
- Экспорт-диалог: rounded-2xl + shadow-elevated, антиква display-title только в заголовке, радио-карточки/карточки страниц/чекбоксы в едином терракотово-мягком стиле.
- Верификация: tsc 0 ошибок (src/), lint 0/0, запрещённые паттерны отсутствуют, логика не затронута.

---
Task ID: 2-b
Agent: frontend-styling-expert
Task: Рестайл LayersPanel + PageThumbnails + TextEditSidebar по ATELIER v2

Work Log:
- Прочитал worklog.md (Tasks 1, 2, 4-a/b/c, 3) и весь globals.css (ATELIER v2: токены, display-title, kbd, shadow-soft/elevated/paper/float, lift, glass, регламент в шапке).
- LayersPanel.tsx: счётчик в шапке → каноничный бейдж rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium (tabular-nums сохранён); StatChip (ПЕЧАТИ/ТЕКСТЫ/ЛАСТИК) → единые пилюли rounded-xl border border-border bg-card px-3 py-2, иконка text-terracotta-dark (была text-primary), число text-sm font-semibold, подпись text-[10px] font-medium uppercase tracking-wider text-muted-foreground (было tracking-wide на bg-secondary/50); пустое состояние: чип bg-secondary (без /60), иконка без /60, заголовок «Пока нет слоёв» → display-title text-base text-foreground (единственный font-display в трёх файлах — по спецификации), описание text-[10px]/70 → text-xs text-muted-foreground; строки слоёв: невыбранные → border-border bg-card hover:border-primary/30 hover:shadow-soft (было hover:bg-accent), чужие страницы — дим opacity-60 сохранён + bg-card + hover:shadow-soft, выбранные → border-primary/40 bg-terracotta-soft/40 shadow-soft (было border-primary bg-primary/10); плитка-иконка невыбранного bg-secondary/70 → bg-secondary (выбранная bg-primary с белой иконкой — сохранена); мини-кнопки Eye/EyeOff/Trash rounded-md → rounded-lg (шкала радиусов); amber-индикаторы (скрытие/другая стр.) не тронуты — amber зарезервирован.
- PageThumbnails.tsx: заголовок «Страницы» text-[10px] → text-[11px] font-semibold uppercase tracking-wider text-muted-foreground (по ТЗ 2-b единый канон секционных заголовков); счётчик → rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium (было rounded-lg bg-muted/40 px-1 text-[10px]); карточка миниатюры: выбранная → border-2 border-primary bg-card shadow-soft (было border-primary bg-primary/10), невыбранная → border border-border bg-card hover:border-primary/40 (без bg-hover по ТЗ), удалённая → border border-border/50 bg-card opacity-50 (дим сохранён); номер-бейдж → пилюля rounded-full min-w-5 px-1.5 py-0.5 text-[10px] font-medium leading-none: выбранная bg-primary text-white, невыбранная bg-secondary text-muted-foreground; canvas-рендер (refs, useEffect, renderTasks) не тронут; amber-индикатор поворота сохранён; равные отступы gap-2.5 и rounded-xl сохранены.
- TextEditSidebar.tsx: textarea → каноничный контрол rounded-lg border border-input bg-background text-sm px-3 focus:ring-2 focus:ring-primary/35 focus:border-primary focus:outline-none (было rounded-xl, ring-primary/40; min-h/py-2.5/resize-none сохранены — textarea, h-9 не применим); kbd-подсказка Ctrl+Enter → утилита .kbd из globals.css (вместо ручных классов); color-input rounded-md → rounded-lg; кнопка «Отмена» → вторичная по ТЗ: bg-card border border-border hover:bg-secondary/60 rounded-lg (была ghost на hover:bg-accent); кнопка «Добавить/Сохранить» → основная по ТЗ и правилу 6 ATELIER: bg-ink hover:bg-ink-hover text-white rounded-lg (была bg-primary hover:bg-terracotta-dark rounded-xl — терракота запрещена для primary-кнопок); close-X в шапке rounded-xl → rounded-lg; все 8 label уже были каноничными text-[11px] font-semibold uppercase tracking-wider text-muted-foreground — ОДИНАКОВО по файлу, не тронуты; секции уже разделены space-y-5 + hairline h-px bg-border/60; ToggleButton/пресеты/шрифтовые плитки (активные = border-primary/bg-primary — разрешённые активные состояния), live-preview inline-стили, value/onChange/handlers/disabled — без изменений.
- Верификация: bunx tsc --noEmit — 0 ошибок в src/ (примеры/skills вне скоупа игнорированы); bun run lint — 0 ошибок/предупреждений; git diff -U0 по трём файлам — все изменённые строки только className/строки классов (props/onClick/onChange/state/aria/тексты не тронуты); grep по трём файлам на font-bold|tracking-widest|text-[9px]|gradient-bg|gradient-border|bg-[#|font-display — 0 совпадений (font-display присутствует только как утилита display-title в пустом состоянии слоёв, разрешено ТЗ).

Stage Summary:
- Три панели приведены к ATELIER v2: секционные заголовки + счётчики-бейджи (rounded-full bg-secondary), стат-пилюли LayersPanel на bg-card с terracotta-dark иконками, пустое состояние слоёв с display-title, строки слоёв bg-card + terracotta-soft/40 выбор, миниатюры с border-2 border-primary + номер-бейджем bg-primary text-white, форма TextEditSidebar с едиными контролами (rounded-lg, ring-primary/35) и кнопками bg-ink/secondary-outline по правилу «primary = ink, accent = terracotta».
- Только презентационные изменения (className/обёртки классов): 0 изменений props/handlers/state/effects/aria/текстов; canvas-логика миниатюр не затронута.
- Проверки: tsc 0 ошибок в src/; ESLint 0/0; запрещённые паттерны — 0.

---
Task ID: 2-c
Agent: frontend-styling-expert
Task: Рестайл UploadZone + UI-обвязки PdfCanvas по ATELIER v2

Work Log:
- Прочитал worklog.md (история Task 1, 2, 3, 4-a/b/c), весь globals.css (ATELIER v2 токены/утилиты), UploadZone.tsx и PdfCanvas.tsx (1913 строк); сверился с каноничным паттерном логина в page.tsx (display-title + text-terracotta-dark акцент + stagger-item).
- UploadZone.tsx (полный рестайл, логика/тексты/aria не тронуты):
  1. Заголовок вынесен из карточки в самостоятельный hero-блок над дропзоной (как на логине): h2 display-title text-3xl md:text-[2.75rem] text-balance, «PDF» — text-terracotta-dark; подзаголовок («Перетащите файл...») перенесён вместе с заголовком, текст сохранён.
  2. Хореография входа: контейнер больше не animate-slide-up; каждому блоку stagger-item + inline --stagger-delay: hero-заголовок 0ms, карточка загрузки 90ms, панель «Возможности» 180ms, карточка доверия 270ms.
  3. Карточка загрузки: rounded-3xl border-2 border-dashed, покой = border-border bg-card/70 backdrop-blur-sm, hover = border-primary/40 + shadow-elevated + bg-card, transition-all duration-300; dragover-логика сохранена, классы уточнены: border-primary bg-terracotta-soft/30 (scale/shadow-elevated оставлены). Иконка-чип: h-16 w-16 rounded-2xl bg-terracotta-soft, FileUp h-8 w-8 text-terracotta-dark (ping-индикатор dragover сохранён, rounded-2xl в тон чипа).
  4. CTA «Выбрать файл» = главная: h-11 px-6 rounded-xl bg-ink text-white text-sm font-medium shadow-soft group-hover:bg-ink-hover; иконка FileUp (2.2, solid-правило) и стрелка ArrowRight с group-hover сдвигом сохранены.
  5. Панель «Возможности»: заголовок → канон text-[11px] font-semibold uppercase tracking-wider text-muted-foreground + декоративная терракотовая черта h-px w-5 bg-terracotta (aria-hidden); сетка 2x2 сохранена, плитки → rounded-2xl border-border bg-card p-4 hover:border-primary/30 hover:shadow-soft lift; чипы h-10 w-10 rounded-xl bg-terracotta-soft, иконки h-5 w-5 text-terracotta-dark; заголовок плитки text-sm font-medium, подпись text-xs text-muted-foreground.
  6. Карточка доверия — премиальная тёмная: rounded-2xl bg-ink text-white p-5 shadow-elevated; чип h-10 w-10 rounded-xl bg-white/10, ShieldCheck text-white (2.2); заголовок text-sm font-medium text-white, описание text-xs text-white/70 leading-relaxed.
  7. Мелочи: trust-бейджи («Только PDF» / «Не покидает браузер») — иконки text-terracotta-dark; watermark FileText (opacity 0.04, strokeWidth 0.8) сохранён; fill-хаки у lucide-иконок убраны; aurora/dot-bg, label-обёртка, скрытый input, все handler'ы — без изменений.
- PdfCanvas.tsx (ТОЛЬКО обвязка, 12 строк diff, все правки — className):
  1. Обёртка страницы вокруг <canvas>: shadow-elevated → shadow-paper (размеры/позиционирование/canvas не тронуты).
  2. Нижний пилл (зум/страница/навигация/undo-redo/поворот/удаление): glass-strong shadow-elevated border-border/70 → bg-card/95 backdrop-blur-sm border-border shadow-float (rounded-full сохранён); 7 ghost-кнопок h-8 w-8 rounded-lg → hover:bg-secondary text-muted-foreground hover:text-foreground (destructive Trash сохранён намеренно); индикатор страницы и зум-% → text-xs font-medium tabular-nums.
  3. Плавающая панель свойств (топ-бар): тот же единый сёрфас bg-card/95 backdrop-blur-sm border-border shadow-float, rounded-2xl → rounded-full (пилюля ~46px, геометрически проверено — контент не режется); позиционирование/анимация обёртки не тронуты.
  4. ЗАПРЕЩЁННОЕ не тронуто: useEffect/useRef/handler'ы, координатная математика (scaleToDisplay, HANDLE_SIZE/ROTATE_HANDLE_DISTANCE), outputScale, рендер, оверлеи печатей/текста/ластика, selection-handles, state, props, тексты; inline text-edit input в файле отсутствует (текст редактируется через TextEditSidebar) — пункт спецификации N/A.
- Верификация: git-diff PdfCanvas = 12 строк, все className-only; тексты/aria/accept/handler'ы UploadZone сверены диффом — 0 изменений; bunx tsc --noEmit — 0 ошибок в src/ (только преждние ошибки examples/ и skills/, вне зоны); bun run lint — exit 0, 0 ошибок/предупреждений; grep UploadZone+PdfCanvas на font-display/font-bold/gradient-bg/tracking-widest/text-[9px]/<em/glass-strong — 0 совпадений.

Stage Summary:
- UploadZone превращён в витрину ATELIER v2: display-title с терракотовым «PDF», stagger-хореография 0/90/180/270ms, дашед-карточка bg-card/70+backdrop-blur с hover:shadow-elevated, терракота-софт чипы, чернильная CTA h-11 и премиальная тёмная карточка доверия bg-ink; вся загрузочная логика (drag&drop, input, aria) без изменений.
- PdfCanvas: все плавающие поверхности приведены к единому стилю — страница shadow-paper, нижний пилл и панель свойств bg-card/95 backdrop-blur-sm border-border shadow-float rounded-full, кнопки hover:bg-secondary + text-muted-foreground, индикаторы text-xs font-medium tabular-nums. Логика/координаты/рендер гарантированно не тронуты (className-only diff).
- Проверки: tsc 0 ошибок в src/, lint 0/0, запрещённые паттерны — 0.

---
Task ID: 3-v2 (design system + page.tsx + oversight 2-a/b/c)
Agent: Z.ai Code (main)
Task: Премиальный редизайн «ATELIER v2» — редакторская типографика, точная палитра, глубина; верификация и деплой

Work Log:
- Определена система ATELIER v2: пара шрифтов со строгим разделением ролей — Source Serif 4 (только hero-заголовки: логин, загрузка, заголовок диалога, пустое состояние) + Inter (весь UI); веса 400/500/600.
- globals.css: добавлены --font-display, .display-title, .stagger-item (+ --stagger-delay), .kbd, .shadow-paper, .shadow-float, .grain (бумажное зерно), усилены aurora-bg/dot-bg; обновлён манифест правил системы (кнопки основного действия = bg-ink, терракота = акценты).
- layout.tsx: подключён Source Serif 4 (600/700, latin+cyrillic) через next/font.
- page.tsx: логин — хореография входа (stagger 0/90/180ms), ambient-блики, зерно, логотип-плитка с терракотовой точкой, антиква-заголовок, тёмная кнопка «Войти»; шапка — антиква-вордмарк, kbd-подсказки через .kbd.
- Параллельные сабагенты: 2-a (Toolbar, ExportDialog), 2-b (LayersPanel, PageThumbnails, TextEditSidebar), 2-c (UploadZone — hero-экран, PdfCanvas — только обвязка). Все отчитались: tsc 0, lint 0, логика/props/aria/тексты не тронуты.
- Браузерная верификация (agent-browser, 1440×900 и 390×844): логин → загрузка → выбор инструмента «Печать» → установка печати «Печать ООО» на канвас (слой создан, пилюля свойств в новом стиле) → экспорт «Все страницы» → скачивание.
- ГЛАВНОЕ: экспортированный PDF отрендерен через pdftoppm — все цифры (№ 12345, даты, суммы) читаются, квадратиков нет; печать на месте. Багфикс цифр работает после редизайна.
- Консоль браузера: 0 ошибок/предупреждений. Мобильная версия: hero-заголовок, карточка загрузки, авто-зум документа, нижняя пилюля навигации, футер на месте.

Stage Summary:
- Приложение переведено на премиальную систему ATELIER v2: редакторская антиква в hero-зонах, тёмные кнопки основного действия, слоистые мягкие тени, зерно бумаги, хореографические входы экранов.
- Вся логика редактора без изменений; экспорт с цифрами проверен сквозным тестом.
- Обновления запушены в GitHub: Twenty7els/pdf-editor.

---
Task ID: 4-a
Agent: frontend-styling-expert
Task: Компактный про-рестайл Toolbar + LayersPanel (ATELIER v2, рабочая область)

Work Log:
- Прочитал worklog.md (Task 3-v2, 2-a/2-b/2-c) и весь globals.css (ATELIER v2: токены ink/terracotta/terracotta-soft, display-title, shadow-soft/float/paper, lift, регламент в шапке).
- Toolbar.tsx — высота до СЛОИ сокращена (~100px, замерено в браузере):
  1. «Загрузить другой/Загрузить PDF» + «Скачать PDF/Подготовка...» — из вертикального стека h-10 в ОДИН РЯД grid-cols-2 gap-1.5, оба h-9 rounded-lg text-xs font-medium justify-center gap-1 px-1: скачивание — тёмная bg-ink hover:bg-ink-hover text-white shadow-soft, загрузка — вторичная bg-card border-border hover:bg-secondary/60. Иконка-чип в кнопке загрузки убрана (разрешено ТЗ) — FileUp inline size-3.5 text-terracotta-dark; Download/Loader2 size-3.5 (size-* вместо h-3.5, т.к. базовый класс Button [&_svg:not([class*='size-'])]:size-4 перебивает h-3.5 по специфичности — измерено). Ширина проверена промером Inter 12px в headless-браузере: «Загрузить другой» = 95.2px + иконка + пэдинги = 123px ≤ 125px доступных (w-72), overflow нет (проверено scrollWidth в браузере).
  2. Плитки инструментов (Выбор/Печать/Текст/Ластик) — компактная сетка 2×2: колонка py-2.5 px-1 rounded-xl text-center, чип h-9 w-9 rounded-lg (был h-10 w-10 rounded-xl) по центру, иконка h-4, label text-[11px] font-medium по центру; активная border-primary/40 bg-terracotta-soft/50 shadow-soft + чип bg-primary text-white, неактивная border-border bg-card + чип bg-secondary text-muted-foreground, hover:border-primary/30 hover:shadow-soft; точка bg-terracotta сохранена (top-1.5 right-1.5 h-1.5 w-1.5); подзаголовки («Перемещение», «Печати и подписи», «Текстовые блоки», «Замазывание») — класс hidden, из разметки не удалены.
  3. Печати: карточки (ВАШИ ПЕЧАТИ и ЗАГРУЖЕННЫЕ) получили состояние выбора — выбранная border-primary/50 bg-terracotta-soft/40 (условный класс по существующему полю стора selectedStampType, только чтение; ни один сеттер/хендлер не тронут), невыбранная border-border bg-card hover:border-primary/30 hover:shadow-soft; миниатюры h-14 w-14 aspect сохранены; счётчик «N шт.» → бейдж rounded-full bg-secondary px-2 py-0.5 text-[11px]; «Загрузить свою печать» — dashed rounded-xl hover:border-primary/40 hover:bg-terracotta-soft/20, ImagePlus text-primary → text-terracotta-dark.
  4. Все подсказки-строки («Выберите печать, затем кликните на PDF», текстовая, ластик) → канон rounded-lg bg-secondary/50 border border-border/50 px-2.5 py-2, ChevronRight text-terracotta-dark h-3 w-3 (в подсказке ластика Paintbrush → ChevronRight, чисто презентационная замена иконки; Paintbrush остался импортирован для плитки «Ластик»).
  5. Контейнер gap-4 → gap-3; внутренний разделитель h-px bg-border/70 → h-px bg-border/50 mx-4 (канон ТЗ).
- LayersPanel.tsx — компактность без касания строк слоёв:
  1. StatChip ПЕЧАТИ/ТЕКСТЫ/ЛАСТИК — grid-cols-3 сохранён, чипы px-3 py-2 → px-2 py-1.5, gap-1 → gap-0.5, число text-sm → text-xs leading-none, подпись text-[10px] leading-none (замер: 38px высоты каждый).
  2. Пустое состояние: py-8 → py-6, gap-2 → gap-1.5, чип h-12 w-12 → h-10 w-10, иконка h-5 → h-4, заголовок display-title text-base → display-title text-sm (сериф пустых состояний сохранён по системе).
  3. Подсказка «Клик — выбрать · наведи для скрытия/удаления» → тот же канон подсказок (rounded-lg bg-secondary/50 border-border/50 px-2.5 py-2, ChevronRight text-terracotta-dark); заголовок, бейдж-счётчик, разделитель (h-px bg-border/50 mx-4), строки слоёв и amber-индикаторы — не тронуты (канон 2-b).
- Браузерная верификация (agent-browser, aside w-72): auth через sessionStorage, загрузка тестового PDF, промеры — toolbar root 281px, пара кнопок 36px (было 88px), плитки 78px (было ~102px), overflow текста в кнопках отсутствует; клик по плитке «Печать» → выбор печати «Печать ООО» → класс selected (border-primary/50 bg-terracotta-soft/40) применился; скрытые подзаголовки = display:none. Замечено: загрузка PDF через Playwright setInputFiles даёт NotReadableError «Ошибка загрузки PDF файла» (canvas не рендерится) — воспроизведено и на коде БЕЗ моих изменений (git stash тест) → артефакт инструмента загрузки файлов, не регрессия; в интерактивном режиме (проверка main-агента в 3-v2) поток работает.
- Верификация: bunx tsc --noEmit — 0 ошибок в src/ (только прежние examples/ и skills/); bun run lint — 0 ошибок/предупреждений; git diff двух файлов — только className/обёртки/порядок разметки + чтение selectedStampType для условных классов; тексты, props, обработчики, state, useEffect, aria — дословно на месте.

Stage Summary:
- Toolbar стал компактным про-инструментом: пара файловых кнопок в один ряд (h-9, тёмный primary + вторичная), сетка инструментов 2×2 с чипами 36px и скрытыми подзаголовками, печати с явным selected-состоянием (terracotta-soft), бейдж-счётчик, унифицированные hint-строки; высота панели до секции СЛОИ сокращена на ~100px.
- LayersPanel ужат по вертикали (стат-чипы py-1.5/38px, пустое состояние h-10/display-title text-sm/py-6), строки слоёв не тронуты; разделители h-px bg-border/50 mx-4 в обоих файлах.
- Проверки: tsc 0 ошибок в src/, lint 0/0; все изменения презентационные (className/layout + hidden подзаголовки), тексты/логика/aria без изменений.

---
Task ID: 5 (bulk delete + workspace deep redesign)
Agent: Z.ai Code (main)
Task: Массовое удаление страниц + глубокий редизайн рабочей области (ввод текста, сцена, панели)

Work Log:
- Найден и исправлен КРИТИЧЕСКИЙ баг больших документов: корень приложения был min-h-screen → 40 миниатюр раздували страницу до ~7000px, канвас уезжал на y=3182 (невидим). Заменено на h-screen + overflow-hidden + min-h-0 в цепочке флексов (page.tsx, PdfCanvas containerRef).
- Стор: новое действие setPagesDeleted(pageNums, deleted) — массовая пометка удалённых одним snapshot'ом (один Ctrl+Z отменяет всю пачку), с переносом currentPage при удалении текущей.
- PageThumbnails: режим мультивыбора (ListChecks в шапке) — чекбоксы на миниатюрах, «Все»/«Снять», красная «Удалить (N)», тост с кнопкой «Отменить» (undo), авто-выход из режима; колонка расширена 124→148px; sticky-шапки панелей.
- TextEditSidebar — полный редизайн: оверлайн «Редактор текста», живой предпросмотр на «бумажной» карточке (shadow-paper), textarea 120px с счётчиком, шрифтовые чипы в собственных гарнитурах (горизонтальный скролл, активный = ink), степпер размера [−] Npx [+] + пресеты, сегмент-контрол «Стиль и выравнивание» (B I U | L C R в одном контейнере), слайдер интервала, свотчи цвета, sticky-футер. Вся логика (state, Ctrl+Enter/Escape, focus, хендлеры) сохранена.
- Агент 4-a: Toolbar — файловые кнопки в один ряд, инструменты 2×2 компактные без подзаголовков (−100px высоты до СЛОИ), выбранная печать терракотовым бордером; LayersPanel — компактные stat-чипы и пустое состояние.
- Рабочая сцена: контрастный .stage-bg (тёплый тон + мелкая чертёжная сетка) — документ «парит» над рабочим полем, визуальное отделение панелей от канваса.
- Верификация (agent-browser): 40-страничный PDF → канвас виден на 1/40; выбор по одному (3 шт.) и «Все» (40) → удаление пачкой → тост → undo возвращает всё; текст «Отчет №12345 от 15.09.2024 — сумма 87 650 руб.» создан через новую панель, слой появился, предпросмотр живой; мобильный вид (390×844) — ок. Консоль 0 ошибок, dev.log чист, lint 0.

Stage Summary:
- Функция «удалить много страниц сразу» готова и проверена (частично и все 40), один undo на всю пачку.
- Рабочая страница переработана по-настоящему: ввод текста полностью новый, сцена с глубиной, панели компактнее, исправлен критический баг раскладки на больших документах.

---
Task ID: 6 (scroll fix + page deskew)
Agent: Z.ai Code (main)
Task: Фикс скролла при зуме + выравнивание перекошенных сканов (deskew)

Work Log:
- ФИКС СКРОЛЛА: канвас-область была flex items-center justify-center + overflow-auto — при зуме верх страницы становился недостижим (классический overflow-баг центрирования). Заменено на m-auto-паттерн: контейнер flex p-5 overflow-auto, всем 4 состояниям (ошибка/загрузка/удалена/канвас) добавлен m-auto. Проверено на 250%: scrollTop достигает 0, верх страницы виден.
- DESKEW (выравнивание наклона): pdf.js getViewport принимает только кратные 90° (PageViewport кидает Error) — реализован двухпроходный рендер: pdf.js рисует страницу в offscreen canvas, затем битмап компонируется с поворотом на угол skew в canvas 2D (белая подложка + bbox). Указатели/оверлеи остаются линейными (канвас axis-aligned), ноль изменений в интеракциях.
- Стор: pageSkew (Record, −15…15, шаг 0.5), setPageSkew (с историей), setPageSkewLive (без истории для драга слайдера), pushHistory (снапшот ДО начала драга = один Ctrl+Z на весь жест); pageSkew в HistorySnapshot/snapshot/setPdfFile-reset.
- PdfCanvas: renderPage двухпроходный при skew≠0 + canvasSize = bbox; в нижней пилюле новая кнопка «Выровнять наклон страницы» (Ruler, подсвечивается терракотой при skew≠0) с поповером: слайдер ±15°, ±1°, Сброс, подсказка. Поповер закрывается кликом по бэкдропу.
- PageThumbnails + ExportDialog: те же двухпроходные миниатюры, ре-рендер по pageSkew (в ExportDialog ключ lastRotationsKey включает skew); бейдж «~N°» на миниатюре при skew≠0.
- Экспорт (page.tsx): makeSkewGeometry — обратный поворот точек вокруг центров V→D (p_D = R_cw(−skew)·(p_V−c_V)+c_D) и angleShift = +skew к phiDeg для печатей и текста; масштабирование размеров/шрифтов через Wrho/Hrho (bbox); ластик — все точки через ту же трансформацию. При skew=0 — короткое замыкание (identity), нулевой риск регрессии.
- ВЕРИФИКАЦИЯ синтетическим кривым сканом (текст, нарисованный под −4°): слайдер −4° выпрямил строки на экране (миниатюра с бейджем «~−4°»); текст «Otmetka: 12345 RUB» поставлен на выпрямленном виде → экспорт → растеризация 150 DPI: текст в PDF ЛЕЖИТ ПОД ТЕМ ЖЕ УГЛОМ, что и строки скана (параллельность идеальна), позиция совпадает с экранной. Undo: один Ctrl+Z снял добавление текста, наклон остался в истории отдельным шагом.
- tsc 0, eslint 0, консоль браузера чистая, dev.log чистый.

Stage Summary:
- Зум больше не «отрезает» верх страницы — скролл работает во все стороны.
- Перекошенные сканы выпрямляются на экране слайдером наклона (−15…+15°, шаг 0.5°), а печать/текст/ластик при экспорте автоматически получают компенсацию угла — всё ложится ровно по строкам оригинала.

---
Task ID: 7 (full QA pass + fixes + improvements)
Agent: Z.ai Code (main)
Task: Протестировать всё, найти и починить баги, сделать улучшения

Work Log:
- Системный QA-прогон в браузере (1440×900 + 390×844): загрузка/валидация не-PDF (тост-ошибка + error-state ✓), печать (установка/перемещение/Del/undo ✓), текст (создание/редактирование — dblclick-хендлер проверен диспетчеризацией события, обновление на канвасе ✓), ластик (мазок/undo/redo ✓), поворот страницы 90° (элементы следуют за контентом ✓), Ctrl+колесо зум (100→125% ✓), скролл при зуме (верх достижим ✓), deskew + поворот 90° комбо-экспорт (печать/текст/ластик на местах ✓), экспорт «выбранные страницы» (pdf-lib: 1 страница ✓), мобильный sheet ✓, выход (сессия чистится ✓).
- Ложные тревоги отсеяны: «Ошибка загрузки PDF» — удалённый /tmp файл теста (error-state отработал корректно); «нет файла после экспорта» и «клик по карточке не снимает выбор» — артефакты синтетических кликов Playwright (реальные ref-клики работают).
- ФИКС 1: поповер «Наклон страницы» теперь закрывается по Escape (раньше только клик по бэкдропу — блокировал интерфейс во время тестов дважды).
- ФИКС 2: слайдер прозрачности печати больше не заливает undo-историю — updateStampLive (без истории) + pushHistory на pointerdown/keydown → один Ctrl+Z на весь жест (проверено: 100%→50%→undo→100%).
- УЛУЧШЕНИЕ 1: шаг кнопок поворота печати и текста в пилюле свойств 15° → 5° (точный ввод угла остался в поле).
- УЛУЧШЕНИЕ 2: в диалоге экспорта при режиме «Выбранные страницы» и пустом выборе появилась подсказка «Отметьте хотя бы одну страницу» (раньше кнопка молча disabled).
- tsc 0, eslint 0, консоль браузера чистая.

Stage Summary:
- Полный QA пройден: все инструменты, клавиатура, зум/скролл, deskew+поворот комбо, экспорт (все/выбранные), мобильная версия, logout.
- Исправлено 2 UX-дефекта (Escape поповера, история слайдера), 2 улучшения (точный шаг поворота, подсказка в экспорте).

---
Task ID: 7
Agent: Z.ai Code (main)
Task: Фикс рендеринга реального скана клиента (ИП Шангаараев, ВТБ): штрих-код JBIG2 пропадал (оставались только цифры), линии для заполнения «______» не отображались. В Adobe всё выглядело корректно.

Work Log:
- Получен проблемный файл /home/z/my-project/upload/ИП_Шангараев_Р_Р_Заявление_Лейка_изм_рас_счета_на_ВТБ.pdf (PDF 1.5, объектные потоки).
- Инспекция через qpdf --qdf: 4 не встроенных шрифта (TimesNewRomanPSMT, ArialUnicodeMS, Candara, ArialMT), 7 изображений, 2 JBIG2-потока, 3 Stamp-аннотации (подписи + круглая печать) с appearance-потоками.
- Воспроизведение в браузере: штрих-код отсутствует (только 2 строки цифр), круглая печать отсутствует, линии «___» отсутствуют; консоль: 6× «Warning: Dependent image isn't ready yet» + «Cannot load system font: Candara».
- Корневая причина №1: в pdf.js v5/v6 декодеры JBIG2, JPEG2000 и ICC (qcms) вынесены в WASM (jbig2.wasm, openjpeg.wasm, qcms_bg.wasm), грузятся по опции getDocument `wasmUrl`. Мы её не передавали → JBIG2-изображения (штрих-код страницы и SMask круглой печати) никогда не декодировались.
- Корневая причина №2: шрифты файла не встроены; без `standardFontDataUrl` pdf.js не мог подставить запасные шрифты → пропадали линии, набранные этими шрифтами.
- Исправление: создан src/lib/pdfjs-options.ts (PDFJS_DOC_OPTIONS: wasmUrl=/pdf-wasm/, standardFontDataUrl=/pdf-fonts/, cMapUrl=/cmaps/, cMapPacked) — подключён в getDocument в PdfCanvas.tsx и ExportDialog.tsx (миниатюры/экспорт-превью наследуют тот же документ).
- Ассеты скопированы в public/pdf-wasm, public/pdf-fonts, public/cmaps; добавлен scripts/sync-pdfjs-assets.sh для повторной синхронизации при апгрейде pdfjs-dist; public-вендорные папки добавлены в ignores ESLint.
- Экспорт проверен отдельно: экспорт строится поверх оригинального PDF (pdf-lib drawImage поверх исходных страниц), аннотации Stamp (подписи/печать) сохраняются в скачанном файле автоматически; скачанный PDF отрендерен pdftoppm — штрих-код, подписи, печать, линии на месте.
- Регресс-проверки: skewed-scan.pdf (deskew −4° выравнивает текст ровно), MIME всех ассетов 200 (application/wasm, font/ttf, application/x-font-type1), lint 0 ошибок, tsc src/ 0 ошибок.

Stage Summary:
- Причина обоих багов пользователя — не «перевод в цифры», а недекодированные JBIG2-изображения и неотработавшая подстановка шрифтов в pdf.js v6 из-за отсутствия wasmUrl/standardFontDataUrl.
- Файл клиента теперь отображается 1-в-1 с Adobe: штрих-код, синяя круглая печать (JBIG2 SMask), все линии «______», 3 подписи-аннотации. Экспорт сохраняет всё без потерь.
- Заодно закрыты будущие кейсы: JPEG2000-сканы (openjpeg.wasm), ICC-профили (qcms), CID-шрифты (cmaps).

---
Task ID: 8
Agent: Z.ai Code (main)
Task: Новая функция «Автозаполнение документов»: загрузка заполненной анкеты мерчанта («Заявка на подключение» Uniteller, xlsx) → автоматическая подстановка данных по смыслу в «Заявка на регистрацию» (СБП, xlsx) и «Анкета-заявление заказчика» ИП/ЮЛ (docx), с сохранением фиксированных значений шаблонов.

Work Log:
- Проанализированы 4 файла клиента: диф Анкета.xlsx ↔ АвтомойкаЭксель.xlsx (найдены все ячейки данных), полный дамп «Заявки на регистрацию» (секции A/B/C, красные фикс-значения, жёлтые ручные), структура docx ИП-формы (таблица label→value).
- Установлены exceljs (чтение/запись xlsx со стилями) и jszip (правка word/document.xml).
- src/lib/doc-autofill/: profile.ts (тип MerchantProfile + группы полей UI + stripOrgPrefix/isPlaceholder), parse-anketa.ts (label-driven парсер: поиск подписи → значение в соседней ячейке; учёт merged-slaves, дат, плейсхолдеров), fill-sbp.ts (карта 11 целевых ячеек, защита от перезаписи непустых; B2 — мастер слияния B2:C2), fill-docx.ts (правила label→соседняя ячейка + все правила на строку для многоклеточных строк ИНН/БИК/счета; абзацные замены подписи [Фамилия...]; сохранение tcPr/pPr/rPr).
- API: /api/doc-autofill/parse (multipart→профиль+warnings), /generate (JSON→binary файл с Content-Disposition), /templates GET (список+доступность) и /templates/upload POST (загрузка недостающего шаблона, напр. формы ЮЛ, с валидацией OOXML).
- UI: src/components/doc-autofill/DocAutofillApp.tsx — 3 шага (анкета → редактируемый профиль по группам → выбор цели), карточки целей с состоянием «шаблон не загружен» + кнопкой загрузки; встроен в page.tsx переключателем режимов «Редактор | Документы» (localStorage, иконки на мобильных).
- Шаблоны в document-templates/ (zayavka-sbp.xlsx, anketa-ip.docx — без перс. данных). Формы ЮЛ у клиента не было — предусмотрена загрузка.
- Найденные и исправленные баги при разработке: регэксп <w:t[^>]*> ловил <w:tcPr>/<w:tbl> (тексты ячеек загрязнялись XML → правила не матчились); tcPr обрезался по первому самозакрытому <w:tcW/> → битый XML; правило «одно на строку» не заполняло Кор.счёт/Расч.счёт; даты Date-объекты пропускались как пустые; merged-slave ячейки возвращали текст подписи.
- Верификация: программная (все 14 полей docx = true, фикс-ячейки xlsx rich-text не тронуты), LibreOffice-конвертация в PDF → визуальная сверка (анкета ИП заполнена: наименование, дата/место рождения, гражданство, ИНН, адреса, тел/email, банк ВТБ, БИК, кор/расч счета, 3 контактных лица, подпись), браузерный E2E (загрузка анкеты → 28 полей → генерация → скачивание → повторная проверка файла), валидация upload (400 на неверный ext), переключение режимов, мобильная вёрстка 390px. lint 0, tsc src 0.
- Безопасность: upload/ (перс. данные) удалён из git-индекса и добавлен в .gitignore (PDF клиента был закоммичен ранее — убран из трекинга).

Stage Summary:
- Реализована сквозная автоматизация: заполненная анкета мерчанта → за 3 клика готовые «Заявка на регистрацию (СБП)» и «Анкета-заявление ИП», без ручного перенабора.
- Фиксированные красные значения «Заявки» гарантированно не изменяются (защита непустых ячеек + узкая карта целей).
- Формы ЮЛ: достаточно один раз загрузить шаблон через UI — заполнение заработает по тем же правилам.

---
Task ID: 9
Agent: Z.ai Code (main)
Task: Фикс «анкета-заявление заполняется криво, огромный шрифт» (заполнение docx-форм)

Work Log:
- Воспроизведение: заполненная анкета ИП отрендерена через LibreOffice → подтверждены симптомы пользователя: значения 12pt (Normal) вместо 8pt шаблона, строки таблиц разъехались, «Мойка автомобилей» развалилась по букве в строку.
- Причина №1 (главная): setCellValue стирал всё содержимое ячейки и вставлял «голый» <w:p><w:r><w:t> без rPr/pPr → Word/LibreOffice брали шрифт по умолчанию (Normal, 12pt), тогда как весь шаблон набран явно заданным Times New Roman 8pt (sz=16).
- Причина №2: «Вид деятельности» вставлялся в ячейку 0 (№п/п, 567 dxa) строки СБП вместо колонки «Наименование Сервиса» (1701 dxa) — узкая ячейка рвала текст по буквам.
- Причина №3: в документе есть docGrid (linePitch=360); без snapToGrid=0 в ране MS Word привязывает строки значений к сетке 18pt — «всё кривит» (подписи шаблона сами несут snapToGrid=0).
- Причина №4: «Наименование Заказчика» для ИП теряло префикс «Индивидуальный предприниматель» (неверное условие по ОГРИП); для ЮЛ теперь подставляется полное наименование организации.
- Исправления в fill-docx.ts: extractCellFormat — берём pPr первого абзаца + rPr первого рана (fallback — rPr метки абзаца, где пустые ячейки хранят TNR 8pt); stripPlaceholderStyle — у значений убраны курсив и синий цвет плейсхолдера (шрифт/размер сохранены); ensureSnapToGrid — гарантирует snapToGrid=0 у вставленных ранов; cleanPPr — чистит цвет из rPr метки абзаца; колонка «Наименование Сервиса» ищется по строке-шапке; trimTrailingEmptyParagraphs — убран хвостовой пробельный абзац, выталкивавший пустую 2-ю страницу (документ снова ровно 1 страница); убрано двойное экранирование в абзацных заменах.
- Верификация: scripts/test-docx-fill.ts + scripts/verify-docx-fill.ts — 25/25 проверок (баланс XML-тегов, sz=16+TNR+snapToGrid во всех вставленных ранах, отсутствие курсива/цвета, СБП-колонка, полнота 11 значений, отсутствие плейсхолдеров); LibreOffice-рендер — визуально шаблонный вид 8pt, 1 страница; E2E в браузере с реальной анкетой (АвтомойкаЭксель, Фильченко А.Г.) — blob перехвачен и проверен: 17/17 ранов значений с sz + snapToGrid, СБП-строка корректна, телефон/email/адреса/ФИО на местах; режим «Редактор» не задет, консоль чистая; lint 0, tsc src 0.

Stage Summary:
- Заполненные анкеты-заявления теперь выглядят как родной шаблон: Times New Roman 8pt, компактные строки без «прилипания» к сетке, вид деятельности в правильной колонке, для ИП — «Индивидуальный предприниматель ФИО», документ ровно на 1 странице.

---
Task ID: 10
Agent: Z.ai Code (main)
Task: Допилить шаги автозаполнения: после выбора шаблона показывать, каких данных не хватает, предлагать дописать на месте, потом скачивать

Work Log:
- Создан src/lib/doc-autofill/requirements.ts — реестр требуемых полей на каждый шаблон (sbp: 5 полей; anketa-ip: 19; anketa-yul: 16) с label, hint-подсказками («если пусто — подставится…»), флагом important; missingForTarget()/isRequirementFilled().
- DocAutofillApp (шаг 3): при выборе шаблона под карточками появляется панель «Что встанет в „{название}“» — зелёные чипы заполненных полей (title=значение) + инпуты недостающих (сразу пишут в профиль через setField, шаг 2 синхронен); бейдж статуса «Не хватает полей: N» (янтарный) ↔ «Все данные на месте» (изумрудный); important помечены «*».
- Кнопка генерации динамическая: «Сформировать (N пусто)» ↔ «Сформировать документ» (с иконкой Check), подпись слева поясняет, что можно скачать и с пустыми. Клик по карточке плавно прокручивает к панели (scrollIntoView nearest).
- E2E в браузере: анкета Автомойка → выбор «Анкета-заявление (ИП)» → панель: 14 чипов «есть», 3 инпута (ОГРНИП/ОКПО/ОКВЭД) → заполнил все три → бейдж сменился на «Все данные на месте», кнопка «Сформировать документ» → файл скачан (перехват blob) и проверен: все 3 дописанных значения в document.xml, XML сбалансирован. Переключение на СБП — панель пересчиталась (5 чипов, «Все данные на месте»). Скриншоты 1440px и 390px, консоль чистая.
- tsc src 0, lint 0.

Stage Summary:
- Сценарий доведён до заявленного: анкета → анализ → выбор шаблона → система видит недостающие строки именно для этого шаблона → дописывание в интерфейсе → скачивание. Дописанное тут же попадает в профиль и в документ.

---
Task ID: 11
Agent: Z.ai Code (main)
Task: Чек-лист недостающих полей для всех трёх шаблонов + подключение присланной формы ЮЛ

Work Log:
- Разобран вопрос пользователя «почему только для ИП»: панель проверки применилась и к «Заявке на регистрацию» — просто форма СБП содержит ровно 5 полей мерчанта (наименование B2/C35/C64, ИНН C36/C65, дата рождения учредителя C41, адрес C45/C70, р/с C50), и анкета их покрывает → «Все данные на месте», без инпутов. Остальные строки СБП — договоры с банками (Моби/АББ/БРС/Сбер/АБР/АТБ/ПСБ) и служебные (legalid/merchantid/МСС) — данными анкеты не заполняются, трогать их нельзя.
- Программно перепроверено заполнение СБП реальным профилем Автомойки: все 11 целевых ячеек получили значения, фиксированные (C60 LB…, C66 р/с, C72 САТ, C3 договор) и инструкционные не тронуты.
- Шаблон ЮЛ: upload/анкета-заявление_юл_форма.docx → document-templates/anketa-yul.docx; цель anketa-yul больше не optional (описание карточки обновлено).
- fill-docx: новые правила под метки ЮЛ — «Полное и (при наличии) сокращенное фирменное наименование…» → orgName; «Адрес места нахождения (регистрации)» → legalAddress||factAddress; «Адрес фактического места нахождения» → factAddress||legalAddress. Плейсхолдеры ЮЛ («Индекс », «тел.:  факс:», «Email:», «Бренднэйм» в строке СБП) заменяются значениями; правила ИП не задеты.
- requirements: sbp — уточнены подписи/hints, birthDate стал important; anketa-yul — 16 полей по фактической форме (КПП убран — в форме его нет; «Наименование Сервиса» с hint «встанет вместо „Бренднэйм“»).
- scripts/test-docx-yul.ts: 26/26 (XML баланс, 14 значений, замена плейсхолдеров, формат ячеек sz=18/16+TNR+snapToGrid, №п/п не тронут; регресс ИП: «Индивидуальный предприниматель ФИО», XML баланс). LibreOffice-рендер ЮЛ: все разделы заполнены, 1 страница.
- Браузерный E2E: ЮЛ-карточка активна сразу; чек-лист ЮЛ — 12 чипов «есть» + 3 инпута (ОГРН/ОКПО/ОКВЭД); дописаны → «Все данные на месте» → генерация → скачанный docx проверен (все 3 значения, «Мойка…» вместо «Бренднэйм», XML баланс) + рендер. СБП-панель ранее подтверждена (5 чипов). lint 0, tsc src 0.

Stage Summary:
- Все три шаблона теперь в равном порядке: у каждого своя панель «Что встанет в …» с дописыванием недостающего. Форма ЮЛ встроена и работает из коробки (загрузка шаблона через UI осталась как запасной путь).

---
Task ID: 11
Agent: Z.ai Code (main)
Task: Чек-лист полей для «Заявки на регистрацию (СБП)» — добавить все поля шаблона (UPID, MCC, merchantid, даты Fraudscore, договоры с Uniteller/банком)

Work Log:
- Дампнул все 73 строки zayavka-sbp.xlsx: нашёл пустые значимые ячейки C39/C40/C42 (даты), C44/C69 (МСС), C46/C68 (merchantid), C47/C48/C49 (договор с Uniteller), C53 (UPID), C63 (договор с банком), C71 (дата и номер договора с Uniteller)
- Проверил анкету АвтомойкаЭксель: MCC/UPID/merchantid в ней отсутствуют → корректно предлагать вручную
- profile.ts: +11 полей (upid, mcc, merchantId, accountOpenDate, oldestContractDate, combatParamsDate, unitContractNumber, unitContractDate, unitRate, bankContractInfo, unitContractInfo) + 2 группы в PROFILE_GROUPS («Параметры СБП», «Договоры (Uniteller и банк)»)
- requirements.ts: sbp расширен 5 → 16 полей; добавлен optional satisfied() для автосборки unitContractInfo из номера+даты; новые хелперы isRequirementSatisfied()
- fill-sbp.ts: карта заполнения 11 → 24 ячейки; composeContractInfo() собирает «№ X от дд.мм.гггг» (с нюансом «б/н» без решётки); защита фикс-ячеек сохранена
- DocAutofillApp.tsx: present/missing учитывают satisfied()
- Программный тест: 23 ячейки + защита фикс-ячеек + б/н-сборка — ALL PASS
- E2E (agent-browser): загрузка Автомойки → чек-лист СБП «Не хватает полей: 11» (МСС, merchantid, UPID, даты, договоры) → дозаполнение 6 полей → бейдж пересчитался в 4, автополе переехало в «есть» → скачивание: C40/C44/C46/C47/C48/C53 заполнены реальными значениями, C71 = «№ 123/45 от 01.02.2024», фикс-ячейки (C37/C38/C62/C66/C72/C73) не тронуты
- Скриншоты 1440px + 390px, lint чист

Stage Summary:
- Чек-лист СБП теперь честный: показывает все 16 полей шаблона, 11 из них предлагается дописать вручную (в анкете их нет)
- Значения попадают в xlsx: МСС (C44/C69), merchantid (C46/C68), UPID (C53), даты Fraudscore (C40/C42), договоры (C47/C48/C49/C63/C71)
- Автосборка «номер и дата» в C71 из двух полей (satisfied-механизм переиспользуем для будущих целей)
- Фикс-значения шаблона (legalid, р/с Моби, САТ, руб.) защищены от перезаписи

---
Task ID: 12
Agent: Z.ai Code (main)
Task: Убрать дубли составных полей «номер и дата» + починить баг исчезновения инпута при вводе в чек-листе

Work Log:
- profile.ts: удалены bankContractInfo/unitContractInfo (составные строки), добавлены bankContractNumber + bankContractDate
- requirements.ts: key стал опциональным; введены автополя (autoNote без инпута): «Договор с Uniteller: номер и дата (низ)» и «Договор с банком: номер и дата (низ)» со satisfied() по паре номер+дата; missingForTarget исключает autoNote
- fill-sbp.ts: C63/C71 собираются composeContractInfo() из номер+дата (формат «№ X от дд.мм.гггг», «б/н» без решётки)
- DocAutofillApp.tsx: механизм pinned (Set) — инпут закрепляется по onFocus, отпускается по onBlur; gridReqs = missing ∪ pinned → инпут не размонтируется во время ввода; зелёный чип не показывается, пока поле редактируется; сброс pinned при смене цели; строка «Соберётся автоматически» с серыми чипами (Sparkles)
- Исправлен потенциальный дубль React key у чипов автополей (key по label)
- Тесты: missing без составных (11 чистых полей), C63=«№ 77 от 05.05.2024», C71=«№ 123/45 от 01.02.2024», satisfied обеих пар; E2E печать «7542» посимвольно — инпут на месте, чипа нет до blur, после blur чип появился, бейдж 11→10; регресс ИП (3 поля) OK

Stage Summary:
- В чек-листе больше нет дублирующих составных инпутов: только «Номер договора…» + «Дата договора…», нижние ячейки C63/C71 собираются автоматически и показываются серыми подсказками
- Ввод не прерывается: поле остаётся в форме до ухода фокуса, зелёная отметка ставится только после завершения ввода

---
Task ID: 13
Agent: Z.ai Code (main)
Task: Главный экран — большой выбор режима (Редактор PDF / Документы) вместо маленького переключателя в углу

Work Log:
- Создан src/components/home/ModeChooser.tsx: hero «С чего начнём?» + две большие карточки (иконка, описание, чипы возможностей, CTA, hover-подъём и терракотовая рамка)
- page.tsx: appMode расширен значением "home" и стал режимом по умолчанию (localStorage-восстановление убрано — главный экран всегда встречает выбором)
- Логотип в шапке — кнопка «На главную» (aria-label), переключатель Редактор/Документы в шапке сохранён для быстрой смены режима
- Главная-обёртка flex-1 overflow-y-auto stage-bg, футер прижат (mt-auto), карточки в столбец на мобиле
- E2E: карточка «Редактор PDF» → upload-зона редактора; логотип → возврат на выбор; «Документы» → DocAutofillApp; скриншоты 1440px и 390px; lint/tsc чисто

Stage Summary:
- Вход в приложение теперь начинается с большого центрированного выбора режима, а не с крошечного переключателя в углу
- Возврат на главный экран — клик по логотипу; переключение режимов доступно всегда в шапке

---
Task ID: 14
Agent: Z.ai Code (main)
Task: Объединить договоры «с Банком» и «с Uniteller» — это один договор, две строки шаблона

Work Log:
- profile.ts: удалены bankContractNumber/bankContractDate; группа «Договоры (Uniteller и банк)» → «Договор с Uniteller» (номер, дата, ставка)
- requirements.ts sbp: убраны инпуты и авточип банковского договора; оставлен один авточип «Договор с Uniteller: номер и дата (низ)» с autoNote «Один договор для обеих нижних строк»
- fill-sbp.ts: C63 («номер и дата договора мерчанта с Банком») теперь собирается из той же пары unitContractNumber + unitContractDate, что и C71
- targets.ts: описание карточки СБП приведено к «договор с Uniteller»
- Тесты: missing = 9 чистых полей, авточип 1, C47/C48/C49 напрямую + C63 = C71 = «№ 123/45 от 01.02.2024»; E2E чек-лист в браузере (9 инпутов, 1 серый авточип, дублей нет); lint чисто

Stage Summary:
- Дубль устранён по смыслу: одна пара «Номер + Дата договора с Uniteller» заполняет и блок «Договор мерчанта с Uniteller» (C47/C48/C49), и обе нижние строки шаблона C63/C71

---
Task ID: 15
Agent: Z.ai Code (main)
Task: Поле не должно исчезать после ввода — остаётся с эффектом «Вписано» и сразу доступно для правки

Work Log:
- DocAutofillApp.tsx: механизм pinned (фокус/onBlur) заменён на touched (Set) — pin по onFocus без снятия; заполненное вручную поле навсегда остаётся инпутом в сетке шаблона
- gridReqs = missing ∪ touched; present-чипы исключают затронутые поля (только данные из анкеты)
- Новое визуальное состояние заполненного поля: чип «Вписано» с галочкой у лейбла, изумрудная рамка/фон инпута (border-emerald-300/80, bg-emerald-50/40), галочка справа (pr-8), aria-label
- Очистка значения → возврат в янтарное «не хватает» (чип исчезает, звёздочка возвращается, счётчик растёт)
- Сброс touched: смена шаблона (selected) и загрузка новой анкеты
- Обновлена подсказка над сеткой: «Заполненные поля остаются здесь с отметкой "Вписано" — их можно поправить в любой момент»
- Найден и устранён баг stale-CSS дев-сервера: новые утилиты (right-2.5, bg-emerald-50/40) не попадали в CSS-чанк после HMR — помог перезапуск dev-сервера
- E2E: посимвольный ввод MCC (поле живо между символами), blur → поле осталось (value 7542, изумрудные стили, иконка справа x=690 при правом крае 714), чип «Вписано», бейдж 9→8; повторное редактирование; очистка → янтарь + бейдж 9; пара договоров → оба инпута живы, авточип «номер и дата (низ)» переехал в зелёные present-чипы, бейдж 6; генерация документа прошла; консоль без ошибок; скриншоты 1440px и 390px; lint/tsc чисто

Stage Summary:
- Заполненные вручную поля больше никогда не исчезают из чек-листа: остаются на месте с зелёной отметкой «Вписано» и мгновенно редактируются
- Зелёные чипы сверху теперь только для полей, пришедших из анкеты; всё, что вводил пользователь, живёт в сетке инпутов
- Коммит 5e408f2 отправлен на GitHub (Twenty7els/pdf-editor, main)

---
Task ID: 16-a/b/c + 17 + 18
Agent: Z.ai Code (main) + 3 субагента (Explore ×1, general-purpose ×2)
Task: Провести проект в порядок — удалить лишние файлы и строки, найти и устранить все баги

Work Log:
- Три параллельных аудита: (16-a) мёртвые файлы/экспорты/зависимости, (16-b) баги doc-autofill, (16-c) баги PDF-редактора; все находки верифицированы вручную перед правками (агент 16-a ошибся по isPlaceholder/stripOrgPrefix — они используются, оставлены)
- Удалено: tool-results/ (27 файлов из git), tests/ (дубли .zscripts), scripts/test-docx-*.ts + verify-docx-fill.ts, download/README.md, src/app/api/route.ts (scaffold), 41 мёртвый shadcn-компонент + use-toast + use-mobile, tailwind.config.ts (инертен в v4 — нет @config), public/fonts/ (9 файлов), 6 стоковых PNG-штампов; -48 npm-зависимостей (radix-сироты, dnd-kit, tanstack, framer-motion, recharts, sharp, zod и др.); z-ai-web-dev-sdk и prisma-стек оставлены (платформенные)
- .gitignore: +tool-results/, download/, upload-assets/, .zscripts/dev.pid, .tmp-*/; убран из git .zscripts/dev.pid
- КРИТИЧНЫЙ ФИКС (редактор): экспорт дважды прибавлял userRotation (T = intrinsic + 2·user) во всех трёх циклах (штампы/тексты/ластики) — после предприменения /Rotate getRotation() уже возвращает полный угол; E2E-подтверждение: экспорт повёрнутой страницы с штампом → /Rotate 90 (не 180), изображение встроено (902KB)
- pdf.js lifecycle в PdfCanvas: activeTaskRef, destroy предыдущего LoadingTask при замене документа (в v6 у PDFDocumentProxy нет своего destroy), cancel при гонке смены файла, destroy при размонтировании
- ExportDialog: миниатюры теперь рендерятся при переключении «Все»→«Выбранные» (раньше спиннеры навсегда); ресинк mode/selected при каждом открытии
- Undo: pushHistory один раз на жест (mousedown move/resize/rotate), Live-обновления в mousemove и числовых инпутах; в сторе добавлен updateTextLive
- Штампы: экспорт contain-fit по пропорциям (подписи не растягиваются), кэш PDFImage по src, WebP/GIF → PNG-нормализация при загрузке + тосты, сброс file-input до валидации
- Ластик: lineCap Round; клик-флаг очищается в mouseup; стрелки пропускают удалённые страницы; UploadZone/Toolbar тосты об ошибках
- doc-autofill: реализован отсутствовавший POST /api/doc-autofill/templates (кнопка «Загрузить шаблон» всегда падала 405) с валидацией targetId/ext/10МБ; content-length лимит ДО парсинга multipart; битый JSON/multipart → 400; fill-docx — замена ячеек по смещениям (String.replace ловил первую идентичную); composeContractInfo — «от» внутри номера больше не убирает «№» (регресс-тесты: 6/6); гард параллельного разбора; htmlFor/id в шаге 2
- db.ts: SQL-лог только в development
- Попутно найден и обойдён подвох E2E: document.querySelector('canvas') ловил миниатюру страницы, а не холст редактора — размещение штампа только реальным mouse (agent-browser mouse move/down/up) по canvas[3]
- Стабильный stale-кэш Turbopack: ошибки промежуточных состояний правок висели в консоли после исправления — лечится перезапуском dev-сервера/полной перезагрузкой
- Верификация: lint 0/0, tsc чисто, E2E: редактор (загрузка PDF, штамп реальным кликом, поворот, экспорт с проверкой /Rotate=90 + /Image), диалог экспорта (миниатюры 3/3), doc-autofill (9→6, поле живо, чип «Вписано», генерация xlsx и docx с проверкой содержимого), API-валидация (4×400), консоль без ошибок

Stage Summary:
- Проект почищен: -111 файлов/строк в git, -48 зависимостей; в src/components/ui осталось только 7 используемых компонентов
- Исправлены 3 критичных/мажорных бага (двойной поворот экспорта, отсутствие POST шаблонов, pdf.js утечка/гонка) и ~15 минорных
- Коммит a69787b отправлен на GitHub (Twenty7els/pdf-editor, main)
- Осознанно НЕ трогали (задокументировано): координаты элементов не мигрируют при повороте/наклоне страницы после размещения (экран и экспорт консистентны между собой); next.config ignoreBuildErrors оставлен (tsconfig цепляет examples/skills)
