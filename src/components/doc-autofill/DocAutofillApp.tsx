"use client";

/**
 * Экран «Автозаполнение документов»:
 *  1. Загрузка заполненной анкеты (.xlsx «Заявка на подключение»)
 *  2. Редактирование извлечённого профиля мерчанта
 *  3. Выбор целевого документа → генерация и скачивание
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  CircleDashed,
  Download,
  FileSpreadsheet,
  FileText,
  ListChecks,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PROFILE_GROUPS,
  type MerchantProfile,
} from "@/lib/doc-autofill/profile";
import {
  TARGET_REQUIREMENTS,
  isRequirementSatisfied,
  missingForTarget,
  type TemplateRequirement,
} from "@/lib/doc-autofill/requirements";

interface TargetInfo {
  id: string;
  title: string;
  description: string;
  ext: string;
  optional: boolean;
  available: boolean;
}

const LIST_KEYS = new Set(["serials", "pointAddresses", "pointComments"]);

export default function DocAutofillApp() {
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [targets, setTargets] = useState<TargetInfo[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState<string | null>(
    null
  );
  const anketaInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const templateTargetRef = useRef<string>("");
  const checklistRef = useRef<HTMLDivElement>(null);
  /** Актуальный флаг разбора для гарда параллельных запусков (без пересоздания колбэка). */
  const parsingRef = useRef(false);

  /** Поля чек-листа, которые пользователь заполнял вручную. Такие поля больше
   *  никогда не исчезают: после ввода они остаются на месте с зелёной отметкой
   *  «Вписано» и всегда доступны для мгновенной правки. */
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const touchField = useCallback((k: string) => {
    setTouched((p) => (p.has(k) ? p : new Set(p).add(k)));
  }, []);

  const selectedTarget = targets.find((t) => t.id === selected) ?? null;
  const requirements: TemplateRequirement[] = useMemo(
    () => (selected && profile ? TARGET_REQUIREMENTS[selected] ?? [] : []),
    [selected, profile]
  );
  const missing = useMemo(
    () => (profile && selected ? missingForTarget(selected, profile) : []),
    [profile, selected]
  );
  const present = useMemo(
    () =>
      requirements.filter(
        (r) =>
          profile &&
          isRequirementSatisfied(r, profile) &&
          // поля, которые пользователь заполнял руками, остаются инпутами в сетке
          !(r.key && touched.has(String(r.key)))
      ),
    [requirements, profile, touched]
  );
  /** Инпуты чек-листа: незаполненные + всё, что пользователь заполнял руками.
   *  Заполненные поля остаются в сетке с отметкой «Вписано» — не исчезают. */
  const gridReqs = useMemo(() => {
    const keys = new Set(missing.map((r) => String(r.key)));
    touched.forEach((k) => keys.add(k));
    return requirements.filter((r) => r.key && keys.has(String(r.key)));
  }, [requirements, missing, touched]);
  /** Автополя, которые пока не собраны — показываем как подсказку, без инпута. */
  const autoPending = useMemo(
    () =>
      requirements.filter(
        (r) => r.autoNote && profile && !isRequirementSatisfied(r, profile)
      ),
    [requirements, profile]
  );

  const loadTargets = useCallback(async () => {
    try {
      const res = await fetch("/api/doc-autofill/templates");
      const data = await res.json();
      setTargets(data.targets ?? []);
      setSelected((prev) => {
        if (prev) return prev;
        const first = (data.targets ?? []).find(
          (t: TargetInfo) => t.available
        );
        return first ? first.id : "";
      });
    } catch {
      toast.error("Не удалось загрузить список шаблонов");
    }
  }, []);

  useEffect(() => {
    void loadTargets();
  }, [loadTargets]);

  const handleAnketaFile = useCallback(async (file: File) => {
    if (parsingRef.current) return; // защита от параллельного разбора
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Анкета должна быть в формате .xlsx");
      return;
    }
    setParsing(true);
    parsingRef.current = true;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/doc-autofill/parse", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Ошибка разбора анкеты");
        return;
      }
      setProfile(data.profile);
      setSourceName(data.sourceName ?? file.name);
      setWarnings(data.warnings ?? []);
      setTouched(new Set());
      toast.success("Анкета распознана", {
        description: file.name,
      });
    } catch (err) {
      console.error(err);
      toast.error("Ошибка загрузки файла");
    } finally {
      setParsing(false);
      parsingRef.current = false;
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!profile || !selected || generating) return;
    const target = targets.find((t) => t.id === selected);
    if (!target?.available) {
      toast.error("Шаблон не загружен");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/doc-autofill/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: selected, profile }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Ошибка генерации документа");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = cd.match(/filename="([^"]+)"/);
      link.download = m?.[1] ?? `document.${target.ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("Документ сформирован", {
        description: target.title,
      });
    } catch (err) {
      console.error(err);
      toast.error("Ошибка генерации документа");
    } finally {
      setGenerating(false);
    }
  }, [profile, selected, generating, targets]);

  const handleTemplateUpload = useCallback(
    async (file: File) => {
      const targetId = templateTargetRef.current;
      if (!targetId) return;
      setUploadingTemplate(targetId);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("targetId", targetId);
        const res = await fetch("/api/doc-autofill/templates", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Не удалось загрузить шаблон");
          return;
        }
        toast.success("Шаблон загружен");
        await loadTargets();
      } catch {
        toast.error("Не удалось загрузить шаблон");
      } finally {
        setUploadingTemplate(null);
      }
    },
    [loadTargets]
  );

  const setField = (key: keyof MerchantProfile, value: unknown) => {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
  };

  // при смене целевого документа сбрасываем список заполненных вручную полей
  useEffect(() => {
    setTouched(new Set());
  }, [selected]);

  const filledCount = profile
    ? Object.entries(profile).filter(([k, v]) =>
        LIST_KEYS.has(k)
          ? (v as string[]).length > 0
          : Boolean(String(v ?? "").trim())
      ).length
    : 0;

  return (
    <div className="flex-1 overflow-y-auto stage-bg">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-10 w-full">
        {/* Hero */}
        <div className="text-center mb-8 stagger-item">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/80 border border-border/60 text-xs text-muted-foreground mb-4">
            <Sparkles className="h-3.5 w-3.5 text-terracotta" />
            Данные подставляются по смыслу
          </div>
          <h2 className="display-title text-3xl md:text-4xl">
            Автозаполнение{" "}
            <span className="text-terracotta-dark">документов</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            Загрузите заполненную анкету мерчанта — данные автоматически
            встанут в заявку на регистрацию СБП или анкету-заявление ИП/ЮЛ.
          </p>
        </div>

        <div className="space-y-5">
          {/* Шаг 1 — анкета */}
          <section
            className="bg-card border border-border/70 rounded-2xl shadow-paper p-5 md:p-6 stagger-item"
            style={{ ["--stagger-delay" as string]: "60ms" }}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
                  Шаг 1
                </div>
                <h3 className="display-title text-xl mt-0.5">
                  Заполненная анкета
                </h3>
              </div>
              {profile && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-xl"
                  disabled={parsing}
                  onClick={() => anketaInputRef.current?.click()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Другая
                </Button>
              )}
            </div>

            {!profile ? (
              <button
                type="button"
                onClick={() => anketaInputRef.current?.click()}
                disabled={parsing}
                className="w-full rounded-xl border-2 border-dashed border-border bg-secondary/30 hover:bg-secondary/50 transition-colors p-8 flex flex-col items-center gap-3 text-center disabled:opacity-60"
              >
                {parsing ? (
                  <Loader2 className="h-8 w-8 text-terracotta animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                )}
                <div>
                  <div className="font-medium text-sm">
                    {parsing
                      ? "Разбираем анкету…"
                      : "Нажмите, чтобы выбрать .xlsx анкету"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    «Заявка на подключение» (Uniteller) после заполнения
                  </div>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-oat/60 border border-border/50">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <Check className="h-5 w-5 text-emerald-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{sourceName}</div>
                  <div className="text-xs text-muted-foreground">
                    Распознано полей: {filledCount}
                  </div>
                </div>
              </div>
            )}

            {warnings.length > 0 && profile && (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200/70 p-3 space-y-1.5">
                {warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs text-amber-800"
                  >
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Шаг 2 — профиль */}
          {profile && (
            <section
              className="bg-card border border-border/70 rounded-2xl shadow-paper p-5 md:p-6 stagger-item"
              style={{ ["--stagger-delay" as string]: "120ms" }}
            >
              <div className="mb-4">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
                  Шаг 2
                </div>
                <h3 className="display-title text-xl mt-0.5">
                  Данные мерчанта
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Проверьте и при необходимости поправьте — в документы встанут
                  именно эти значения.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {PROFILE_GROUPS.map((group) => (
                  <div
                    key={group.title}
                    className="rounded-xl border border-border/50 bg-secondary/20 p-4"
                  >
                    <div className="text-xs font-semibold text-terracotta-dark uppercase tracking-wide mb-3">
                      {group.title}
                    </div>
                    <div className="space-y-2.5">
                      {group.fields.map((f) => (
                        <div key={String(f.key)}>
                          <label
                            htmlFor={`profile-${String(f.key)}`}
                            className="text-[11px] text-muted-foreground block mb-1"
                          >
                            {f.label}
                          </label>
                          {f.list ? (
                            <textarea
                              id={`profile-${String(f.key)}`}
                              value={((profile[f.key] as string[]) ?? []).join(
                                "\n"
                              )}
                              onChange={(e) =>
                                setField(
                                  f.key,
                                  e.target.value
                                    .split("\n")
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                )
                              }
                              rows={Math.min(
                                4,
                                Math.max(
                                  2,
                                  ((profile[f.key] as string[]) ?? []).length ||
                                    2
                                )
                              )}
                              placeholder="По одному в строке"
                              className="w-full text-sm rounded-lg border border-border/60 bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta/50 resize-y min-h-[60px] max-h-48"
                            />
                          ) : (
                            <input
                              id={`profile-${String(f.key)}`}
                              value={String(profile[f.key] ?? "")}
                              onChange={(e) =>
                                setField(f.key, e.target.value)
                              }
                              className="w-full text-sm rounded-lg border border-border/60 bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta/50"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Шаг 3 — целевой документ */}
          {profile && (
            <section
              className="bg-card border border-border/70 rounded-2xl shadow-paper p-5 md:p-6 stagger-item"
              style={{ ["--stagger-delay" as string]: "180ms" }}
            >
              <div className="mb-4">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
                  Шаг 3
                </div>
                <h3 className="display-title text-xl mt-0.5">
                  Куда подставить данные
                </h3>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {targets.map((t) => {
                  const active = selected === t.id && t.available;
                  return (
                    <div key={t.id} className="relative">
                      <button
                        type="button"
                        disabled={!t.available}
                        onClick={() => {
                          setSelected(t.id);
                          // панель проверки ниже — плавно показать её пользователю
                          setTimeout(
                            () =>
                              checklistRef.current?.scrollIntoView({
                                behavior: "smooth",
                                block: "nearest",
                              }),
                            60
                          );
                        }}
                        className={`w-full text-left rounded-xl border p-4 transition-all ${
                          active
                            ? "border-terracotta bg-terracotta/5 shadow-soft ring-2 ring-terracotta/20"
                            : t.available
                            ? "border-border/60 bg-card hover:border-terracotta/40 hover:shadow-soft"
                            : "border-border/40 bg-secondary/20 opacity-70 cursor-default"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                              active
                                ? "bg-terracotta text-white"
                                : "bg-secondary/70 text-muted-foreground"
                            }`}
                          >
                            {t.ext === "xlsx" ? (
                              <FileSpreadsheet className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </div>
                          {active && (
                            <div className="h-5 w-5 rounded-full bg-terracotta flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="font-medium text-sm mt-2.5">
                          {t.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          {t.description}
                        </div>
                        {!t.available && (
                          <div className="mt-2 text-[11px] font-medium text-amber-700">
                            Шаблон не загружен
                          </div>
                        )}
                      </button>

                      {!t.available && (
                        <button
                          type="button"
                          onClick={() => {
                            templateTargetRef.current = t.id;
                            templateInputRef.current?.click();
                          }}
                          disabled={uploadingTemplate === t.id}
                          className="absolute inset-x-4 bottom-4 inline-flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg border border-amber-300/70 bg-amber-50 hover:bg-amber-100 text-amber-800 py-1.5 transition-colors disabled:opacity-60"
                        >
                          {uploadingTemplate === t.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          Загрузить шаблон
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Проверка данных выбранного шаблона */}
              {selectedTarget && selectedTarget.available && requirements.length > 0 && (
                <div
                  ref={checklistRef}
                  className="mt-4 rounded-xl border border-border/60 bg-secondary/25 p-4"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-terracotta-dark">
                      <ListChecks className="h-3.5 w-3.5" />
                      Что встанет в «{selectedTarget.title}»
                    </div>
                    {missing.length === 0 ? (
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 px-2.5 py-1">
                        <Check className="h-3.5 w-3.5" />
                        Все данные на месте
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full bg-amber-50 border border-amber-200/70 text-amber-800 px-2.5 py-1">
                        <CircleDashed className="h-3.5 w-3.5" />
                        Не хватает полей: {missing.length}
                      </div>
                    )}
                  </div>

                  {/* Уже есть в анкете */}
                  {present.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {present.map((r) => (
                        <div
                          key={r.key ? String(r.key) : r.label}
                          title={
                            r.key
                              ? String(profile[r.key] ?? "")
                              : r.autoNote
                          }
                          className="inline-flex items-center gap-1 max-w-full text-[11px] rounded-full bg-emerald-50/70 border border-emerald-200/50 text-emerald-900 px-2 py-0.5"
                        >
                          <Check className="h-3 w-3 shrink-0 text-emerald-600" />
                          <span className="truncate max-w-[220px]">
                            {r.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Соберётся автоматически — без ручного ввода */}
                  {autoPending.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {autoPending.map((r) => (
                        <div
                          key={`auto-${r.label}`}
                          title={r.autoNote}
                          className="inline-flex items-center gap-1 text-[11px] rounded-full bg-secondary/60 border border-border/50 text-muted-foreground px-2 py-0.5"
                        >
                          <Sparkles className="h-3 w-3 shrink-0 text-terracotta/70" />
                          <span>{r.label}</span>
                          <span className="text-muted-foreground/70">
                            — {r.autoNote}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Дописать здесь. Заполненное поле не исчезает: остаётся на месте
                      с зелёной отметкой «Вписано» и правится в любой момент */}
                  {gridReqs.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs text-muted-foreground mb-2.5">
                        Допишите недостающие строки — они встанут в документ.
                        Заполненные поля остаются здесь с отметкой
                        «Вписано» — их можно поправить в любой момент.
                        <span className="text-amber-700 font-medium"> * </span>
                        — важно для этого шаблона.
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {gridReqs.map((r) => {
                          const key = String(r.key);
                          const filled = isRequirementSatisfied(r, profile);
                          return (
                            <div key={key}>
                              <label className="text-[11px] text-muted-foreground flex items-center gap-1.5 mb-1">
                                <span className="truncate">{r.label}</span>
                                {filled ? (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 px-1.5 py-px font-medium shrink-0">
                                    <Check className="h-2.5 w-2.5" />
                                    Вписано
                                  </span>
                                ) : (
                                  r.important && (
                                    <span className="text-amber-700">*</span>
                                  )
                                )}
                              </label>
                              <div className="relative">
                                <input
                                  value={String(profile[r.key!] ?? "")}
                                  onChange={(e) =>
                                    setField(r.key!, e.target.value)
                                  }
                                  onFocus={() => touchField(key)}
                                  placeholder={r.hint ?? "Заполнить…"}
                                  aria-label={r.label}
                                  className={`w-full text-sm rounded-lg border bg-card px-3 py-2 pr-8 focus:outline-none focus:ring-2 transition-colors placeholder:text-muted-foreground/50 ${
                                    filled
                                      ? "border-emerald-300/80 bg-emerald-50/40 focus:ring-emerald-200/70 focus:border-emerald-400"
                                      : "border-amber-200/80 focus:ring-terracotta/30 focus:border-terracotta/50"
                                  }`}
                                />
                                {filled && (
                                  <Check className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-600" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground max-w-md">
                  {missing.length > 0
                    ? `Можно скачать и сейчас: незаполненные поля (${missing.length}) останутся пустыми в документе.`
                    : "Данные из анкеты проверены — документ готов к формированию."}
                </p>
                <Button
                  onClick={handleGenerate}
                  disabled={!selected || generating}
                  className="gap-2 bg-ink hover:bg-ink/90 text-white rounded-xl h-11 px-6 font-medium"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : missing.length === 0 ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {missing.length > 0
                    ? `Сформировать (${missing.length} пусто)`
                    : "Сформировать документ"}
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>

      <input
        ref={anketaInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleAnketaFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={templateInputRef}
        type="file"
        accept=".docx,.xlsx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleTemplateUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
