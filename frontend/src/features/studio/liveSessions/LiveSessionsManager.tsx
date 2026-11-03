import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Film,
  List,
  Pencil,
  Plus,
  Radio,
  Search,
  Video,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/context/authContext";
import { fetchStudioPickerAssets } from "@/features/studio/data/studioFetchers";
import type { StudioPickerAsset } from "@/features/studio/types";
import { canAny } from "@/shared/lib/permissions";
import { ApiError } from "@/shared/lib/apiClient";
import { LiveSessionCountdown } from "./LiveSessionCountdown";
import {
  addLiveSessionRecording,
  cancelLiveSession,
  createLiveSession,
  deleteLiveSession,
  fetchGlobalLiveSessions,
  fetchLiveSessions,
  updateLiveSession,
} from "./liveSessionFetchers";
import {
  STATE_LABELS,
  STATUS_LABELS,
  type LiveSessionInput,
  type StudioLiveSession,
} from "./types";

interface LiveSessionsManagerProps {
  courseSlug?: string;
}
type CalendarMode = "list" | "month" | "week";

const WEEKDAYS = [
  "السبت",
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
];
const DEFAULT_TIMEZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Riyadh";

const localInputValue = (iso: string | null, timezone: string) => {
  if (!iso) return "";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "";
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(value)
        .map((part) => [part.type, part.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  } catch {
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
  }
};
const formToIso = (value: string | null) =>
  value ? `${value.length === 16 ? `${value}:00` : value}` : null;
const addLocalDays = (value: string, days: number) => {
  const normalized = value.length === 16 ? `${value}:00` : value;
  const date = new Date(`${normalized}Z`);
  if (Number.isNaN(date.getTime())) return value;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 16);
};
const dateKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const dateKeyInZone = (value: string, timezone: string) => {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(new Date(value))
        .map((part) => [part.type, part.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch {
    return dateKey(new Date(value));
  }
};
const startOfSaturdayWeek = (value: Date) => {
  const result = new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  );
  result.setDate(result.getDate() - ((result.getDay() + 1) % 7));
  return result;
};
const addDays = (value: Date, days: number) => {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
};
const monthLabel = (value: Date) =>
  new Intl.DateTimeFormat("ar-SA", { month: "long", year: "numeric" }).format(
    value,
  );
const readableDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("ar-SA", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "تاريخ غير محدد";
const sessionId = (session: StudioLiveSession) => session.uuid || session.id;

const EMPTY_FORM: LiveSessionInput = {
  title: "",
  startsAt: "",
  durationMinutes: 60,
  timezone: DEFAULT_TIMEZONE,
  meetUrl: "",
  recordingUrl: "",
  notes: "",
};

const StatusChip: React.FC<{ session: StudioLiveSession }> = ({ session }) => {
  const label =
    STATUS_LABELS[session.status] ||
    STATE_LABELS[session.state] ||
    session.status;
  return (
    <span
      className={`live-sessions-chip live-sessions-chip-${session.status || session.state}`}
    >
      {label}
    </span>
  );
};

const SessionDrawer: React.FC<{
  courseSlug: string;
  session: StudioLiveSession | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}> = ({ courseSlug, session, onClose, onSaved }) => {
  const [form, setForm] = useState<LiveSessionInput>(() =>
    session
      ? {
          title: session.title,
          startsAt: localInputValue(session.startsAt, session.timezone),
          durationMinutes: session.durationMinutes,
          timezone: session.timezone,
          meetUrl: session.meetUrl || "",
          recordingUrl: session.recordingUrl || "",
          notes: session.notes || "",
        }
      : { ...EMPTY_FORM },
  );
  const [repeatCount, setRepeatCount] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("أدخل عنوان الجلسة.");
      return;
    }
    setSaving(true);
    try {
      const first = {
        ...form,
        title: form.title.trim(),
        startsAt: formToIso(form.startsAt),
        durationMinutes: Number(form.durationMinutes),
      };
      if (session) {
        await updateLiveSession(courseSlug, sessionId(session), first);
      } else {
        const count = Math.max(1, Math.min(12, repeatCount));
        for (let index = 0; index < count; index += 1) {
          const startsAt = first.startsAt
            ? addLocalDays(first.startsAt, index * 7)
            : null;
          await createLiveSession(courseSlug, {
            ...first,
            startsAt,
            ...(index ? { title: `${first.title} · ${index + 1}` } : {}),
          });
        }
      }
      await onSaved();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "تعذر حفظ الجلسة.",
        caught instanceof ApiError ? caught.message : "تعذر حفظ الجلسة.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="live-sessions-drawer-backdrop"
        aria-label="إغلاق المحرر"
        onClick={onClose}
      />
      <aside
        className="live-sessions-drawer"
        aria-label={session ? "تعديل الجلسة" : "جلسة جديدة"}
      >
        <header className="live-sessions-drawer-head">
          <div>
            <span className="studio-kicker">الجلسات المباشرة</span>
            <h2>{session ? "تعديل الجلسة" : "جدولة جلسة"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </header>
        <form
          className="live-sessions-drawer-body live-sessions-form"
          onSubmit={save}
        >
          <label>
            عنوان الجلسة
            <input
              value={form.title}
              maxLength={160}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              autoFocus
            />
          </label>
          <div className="live-sessions-form-grid">
            <label>
              التاريخ والوقت
              <input
                type="datetime-local"
                value={form.startsAt || ""}
                onChange={(event) =>
                  setForm({ ...form, startsAt: event.target.value })
                }
              />
            </label>
            <label>
              المدة بالدقائق
              <input
                type="number"
                min={1}
                max={1440}
                value={form.durationMinutes}
                onChange={(event) =>
                  setForm({
                    ...form,
                    durationMinutes: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <label>
            المنطقة الزمنية
            <input
              value={form.timezone}
              onChange={(event) =>
                setForm({ ...form, timezone: event.target.value })
              }
              placeholder="Asia/Riyadh"
            />
          </label>
          <label>
            رابط الاجتماع HTTPS
            <input
              type="url"
              value={form.meetUrl}
              onChange={(event) =>
                setForm({ ...form, meetUrl: event.target.value })
              }
              placeholder="https://meet.google.com/…"
            />
          </label>
          <label>
            رابط التسجيل بعد الجلسة
            <input
              type="url"
              value={form.recordingUrl || ""}
              onChange={(event) =>
                setForm({ ...form, recordingUrl: event.target.value })
              }
              placeholder="https://…"
            />
          </label>
          <label>
            ملاحظات للمتعلمين
            <textarea
              value={form.notes}
              maxLength={10000}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
          </label>
          {!session && (
            <label>
              التكرار الأسبوعي
              <select
                value={repeatCount}
                onChange={(event) => setRepeatCount(Number(event.target.value))}
              >
                <option value={1}>جلسة واحدة</option>
                <option value={2}>انسخ الجلسة أسبوعيًا ×٢</option>
                <option value={4}>انسخ الجلسة أسبوعيًا ×٤</option>
                <option value={8}>انسخ الجلسة أسبوعيًا ×٨</option>
                <option value={12}>انسخ الجلسة أسبوعيًا ×١٢</option>
              </select>
            </label>
          )}
          {error && (
            <p className="live-sessions-error" role="alert">
              {error}
            </p>
          )}
          <div className="live-sessions-drawer-actions">
            <button type="submit" className="btn-gold" disabled={saving}>
              {saving ? "جارٍ الحفظ…" : "حفظ الجلسة"}
            </button>
            <button
              type="button"
              className="btn-outline-blue"
              onClick={onClose}
            >
              إلغاء
            </button>
          </div>
        </form>
      </aside>
    </>
  );
};

const RecordingDrawer: React.FC<{
  courseSlug: string;
  session: StudioLiveSession;
  close: () => void;
  onSaved: () => Promise<void>;
}> = ({ courseSlug, session, close, onSaved }) => {
  const { user } = useAuth();
  const canPickAsset = canAny(user, ["videos.manage_own", "videos.manage_any"]);
  const [mode, setMode] = useState<"asset" | "url">(() =>
    canPickAsset && Boolean(session.recordingAssetId) ? "asset" : "url",
  );
  const [assets, setAssets] = useState<StudioPickerAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState(
    session.recordingAssetId || "",
  );
  const [assetQuery, setAssetQuery] = useState("");
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState("");
  const [recordingUrl, setRecordingUrl] = useState(session.recordingUrl || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canPickAsset || mode !== "asset") return;
    let active = true;
    const timer = window.setTimeout(() => {
      setAssetLoading(true);
      setAssetError("");
      void fetchStudioPickerAssets({ q: assetQuery, status: "ready" })
        .then((result) => {
          if (active) setAssets(result.items);
        })
        .catch((reason) => {
          if (active)
            setAssetError(
              reason instanceof ApiError
                ? reason.message
                : "تعذّر تحميل مكتبة الفيديو.",
            );
        })
        .finally(() => {
          if (active) setAssetLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [assetQuery, canPickAsset, mode]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (mode === "asset" && !selectedAssetId) {
      setError("اختر أصل فيديو جاهزًا.");
      return;
    }
    if (mode === "url" && !recordingUrl.trim()) {
      setError("أدخل رابط التسجيل HTTPS.");
      return;
    }
    setSaving(true);
    try {
      const payload =
        mode === "asset"
          ? { recordingAssetId: selectedAssetId, recordingUrl: "" }
          : { recordingAssetId: null, recordingUrl: recordingUrl.trim() };
      await addLiveSessionRecording(courseSlug, sessionId(session), payload);
      await onSaved();
      close();
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "تعذّر حفظ التسجيل.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="live-sessions-drawer-backdrop"
        aria-label="إغلاق محرر التسجيل"
        onClick={close}
      />
      <aside className="live-sessions-drawer" aria-label="إضافة تسجيل للجلسة">
        <header className="live-sessions-drawer-head">
          <div>
            <span className="studio-kicker">تسجيل الجلسة</span>
            <h2>{session.title}</h2>
          </div>
          <button type="button" onClick={close} aria-label="إغلاق">
            <X size={18} />
          </button>
        </header>
        <form
          className="live-sessions-drawer-body live-sessions-form"
          onSubmit={save}
        >
          <div className="live-sessions-view-toggle" aria-label="مصدر التسجيل">
            {canPickAsset && (
              <button
                type="button"
                aria-pressed={mode === "asset"}
                onClick={() => setMode("asset")}
              >
                <Film size={15} /> مكتبة الفيديو
              </button>
            )}
            <button
              type="button"
              aria-pressed={mode === "url"}
              onClick={() => setMode("url")}
            >
              <ExternalLink size={15} /> رابط خارجي
            </button>
          </div>
          {mode === "asset" && canPickAsset ? (
            <>
              <label>
                بحث في الأصول الجاهزة
                <div className="live-sessions-search">
                  <Search size={15} />
                  <input
                    type="search"
                    value={assetQuery}
                    onChange={(event) => setAssetQuery(event.target.value)}
                    placeholder="ابحث بعنوان التسجيل"
                  />
                </div>
              </label>
              <label>
                اختر التسجيل المستضاف
                <select
                  value={selectedAssetId}
                  onChange={(event) => setSelectedAssetId(event.target.value)}
                >
                  <option value="">اختر أصلًا جاهزًا</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title}
                    </option>
                  ))}
                </select>
              </label>
              {assetLoading && (
                <p className="live-sessions-muted">جارٍ تحميل الأصول…</p>
              )}
              {assetError && (
                <p className="live-sessions-error" role="alert">
                  {assetError}
                </p>
              )}
              {!assetLoading && !assetError && assets.length === 0 && (
                <p className="live-sessions-muted">
                  لا توجد تسجيلات جاهزة مطابقة. يمكنك استخدام رابط HTTPS خارجي.
                </p>
              )}
              <p className="live-sessions-muted">
                سيُربط الأصل بالجلسة كمرشح لدرس إعادة في منهج الدورة.
              </p>
            </>
          ) : (
            <label>
              رابط التسجيل HTTPS
              <input
                type="url"
                value={recordingUrl}
                maxLength={400}
                onChange={(event) => setRecordingUrl(event.target.value)}
                placeholder="https://…"
              />
            </label>
          )}
          {error && (
            <p className="live-sessions-error" role="alert">
              {error}
            </p>
          )}
          <div className="live-sessions-drawer-actions">
            <button type="submit" className="btn-gold" disabled={saving}>
              {saving ? "جارٍ الحفظ…" : "حفظ التسجيل"}
            </button>
            <button type="button" className="btn-outline-blue" onClick={close}>
              إلغاء
            </button>
          </div>
        </form>
      </aside>
    </>
  );
};

const CalendarView: React.FC<{
  sessions: StudioLiveSession[];
  mode: "month" | "week";
  cursor: Date;
  onMove: (direction: number) => void;
  onEdit: (session: StudioLiveSession) => void;
}> = ({ sessions, mode, cursor, onMove, onEdit }) => {
  const days = useMemo(() => {
    if (mode === "week")
      return Array.from({ length: 7 }, (_, index) =>
        addDays(startOfSaturdayWeek(cursor), index),
      );
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = addDays(first, -((first.getDay() + 1) % 7));
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [cursor, mode]);
  const eventsByDay = useMemo(
    () =>
      sessions.reduce<Record<string, StudioLiveSession[]>>(
        (result, session) => {
          if (session.startsAt) {
            const key = dateKeyInZone(session.startsAt, session.timezone);
            result[key] = [...(result[key] || []), session];
          }
          return result;
        },
        {},
      ),
    [sessions],
  );
  return (
    <section
      className="live-sessions-calendar"
      aria-label={mode === "month" ? "التقويم الشهري" : "التقويم الأسبوعي"}
    >
      <div className="live-sessions-calendar-head">
        <button type="button" onClick={() => onMove(-1)} aria-label="السابق">
          <ChevronRight size={17} />
        </button>
        <strong>
          {mode === "month"
            ? monthLabel(cursor)
            : `أسبوع ${readableDate(days[0].toISOString()).split("،")[0]}`}
        </strong>
        <button type="button" onClick={() => onMove(1)} aria-label="التالي">
          <ChevronLeft size={17} />
        </button>
      </div>
      <div className="live-sessions-calendar-grid">
        {WEEKDAYS.map((day) => (
          <div className="live-sessions-calendar-label" key={day}>
            {day}
          </div>
        ))}
        {days.map((day) => {
          const items = eventsByDay[dateKey(day)] || [];
          const muted =
            mode === "month" && day.getMonth() !== cursor.getMonth();
          return (
            <div
              className={`live-sessions-calendar-cell ${mode === "week" ? "live-sessions-week-cell" : ""}`}
              key={dateKey(day)}
            >
              <div
                className={
                  muted
                    ? "live-sessions-calendar-day-muted"
                    : "live-sessions-calendar-day"
                }
              >
                {new Intl.NumberFormat("ar-SA").format(day.getDate())}
              </div>
              {items.map((session) => (
                <button
                  type="button"
                  className="live-sessions-calendar-event"
                  key={sessionId(session)}
                  onClick={() => onEdit(session)}
                >
                  <strong>{session.title}</strong>
                  <span>
                    {session.timeLabel || readableDate(session.startsAt)}
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const LiveSessionsManager: React.FC<LiveSessionsManagerProps> = ({
  courseSlug,
}) => {
  const { user } = useAuth();
  const canCreateReplayLesson = canAny(user, [
    "courses.edit_own",
    "courses.edit_any",
  ]);
  const [sessions, setSessions] = useState<StudioLiveSession[]>([]);
  const [mode, setMode] = useState<CalendarMode>("list");
  const [cursor, setCursor] = useState(new Date());
  const [editing, setEditing] = useState<StudioLiveSession | null | undefined>(
    undefined,
  );
  const [recording, setRecording] = useState<StudioLiveSession | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  // Loading is derived from the key stored with the last resolved fetch, so a
  // course switch restores the loading state without a sync setState.
  const [loadedKey, setLoadedKey] = useState("");
  const key = courseSlug ?? "";

  const load = useCallback(() => {
    void (courseSlug ? fetchLiveSessions(courseSlug) : fetchGlobalLiveSessions())
      .then((result) => setSessions(result.items))
      .catch((caught) =>
        setError(
          caught instanceof ApiError ? caught.message : "تعذر تحميل الجلسات.",
        ),
      )
      .finally(() => setLoadedKey(key));
  }, [courseSlug, key]);
  const loading = loadedKey !== key;
  useEffect(() => {
    void load();
  }, [load]);

  const mutate = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError("");
    try {
      await action();
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "تعذر تحديث الجلسة.",
      );
    } finally {
      setBusyId("");
    }
  };
  const ordered = [...sessions].sort((a, b) =>
    (a.startsAt || "").localeCompare(b.startsAt || ""),
  );
  const editCourseSlug = editing?.courseSlug || courseSlug;
  return (
    <div className="live-sessions-manager" dir="rtl">
      <div className="live-sessions-toolbar">
        <div>
          <span className="studio-kicker">التدريس المباشر</span>
          <h2 className="text-xl font-bold text-white">
            {courseSlug ? "الجلسات" : "تقويم الجلسات"}
          </h2>
          <p className="live-sessions-muted">
            التوقيت المعروض حسب المنطقة الزمنية لكل جلسة.
          </p>
        </div>
        <div className="live-sessions-toolbar-actions">
          <div className="live-sessions-view-toggle" aria-label="طريقة العرض">
            <button
              type="button"
              aria-pressed={mode === "list"}
              onClick={() => setMode("list")}
            >
              <List size={15} /> قائمة
            </button>
            <button
              type="button"
              aria-pressed={mode === "month"}
              onClick={() => setMode("month")}
            >
              <CalendarDays size={15} /> شهر
            </button>
            <button
              type="button"
              aria-pressed={mode === "week"}
              onClick={() => setMode("week")}
            >
              <CalendarDays size={15} /> أسبوع
            </button>
          </div>
          {courseSlug && (
            <button
              type="button"
              className="btn-gold"
              onClick={() => setEditing(null)}
            >
              <Plus size={16} /> جلسة جديدة
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="live-sessions-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <div className="live-sessions-empty" aria-live="polite">
          جارٍ تحميل الجلسات…
        </div>
      ) : mode !== "list" ? (
        <CalendarView
          sessions={ordered}
          mode={mode}
          cursor={cursor}
          onMove={(direction) =>
            setCursor((value) => {
              const next = new Date(value);
              if (mode === "month") next.setMonth(next.getMonth() + direction);
              else next.setDate(next.getDate() + direction * 7);
              return next;
            })
          }
          onEdit={setEditing}
        />
      ) : ordered.length === 0 ? (
        <div className="live-sessions-empty">
          <Radio size={28} />
          <p>لم تُجدول جلسات بعد.</p>
          {courseSlug && (
            <button
              type="button"
              className="btn-outline-blue"
              onClick={() => setEditing(null)}
            >
              جدولة أول جلسة
            </button>
          )}
        </div>
      ) : (
        <div className="live-sessions-list">
          {ordered.map((session) => {
            const targetSlug = session.courseSlug || courseSlug;
            return (
              <article
                className="live-sessions-row"
                key={`${targetSlug || "global"}-${sessionId(session)}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <StatusChip session={session} />
                    <h3 className="live-sessions-row-title truncate">
                      {session.title}
                    </h3>
                  </div>
                  <p className="live-sessions-row-subtitle">
                    {session.courseTitle ? `${session.courseTitle} · ` : ""}
                    {session.dateLabel} · {session.timeLabel} ·{" "}
                    {session.timezone}
                  </p>
                  <p className="live-sessions-row-subtitle">
                    {session.startsAt && session.state === "upcoming" && (
                      <LiveSessionCountdown
                        startsAt={session.startsAt}
                        serverNow={session.serverNow}
                      />
                    )}
                  </p>
                </div>
                <div className="live-sessions-row-meta">
                  <span>
                    <Clock3 size={14} /> {session.durationMinutes} دقيقة
                  </span>
                  <span>
                    {session.meetUrl ? (
                      <a
                        href={session.meetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-300"
                      >
                        فتح رابط الاجتماع <ExternalLink size={12} />
                      </a>
                    ) : (
                      "لا يوجد رابط اجتماع"
                    )}
                  </span>
                  {session.recordingUrl && (
                    <a
                      href={session.recordingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gold-300"
                    >
                      <Video size={13} /> التسجيل
                    </a>
                  )}
                </div>
                <div className="live-sessions-row-actions">
                  {targetSlug && (
                    <button
                      type="button"
                      className="btn-outline-blue"
                      onClick={() => setEditing(session)}
                    >
                      <Pencil size={14} /> تعديل
                    </button>
                  )}
                  {targetSlug && session.status !== "cancelled" && (
                    <button
                      type="button"
                      className="btn-outline-danger"
                      disabled={busyId === sessionId(session)}
                      onClick={() => {
                        if (window.confirm("هل تريد إلغاء هذه الجلسة؟"))
                          void mutate(sessionId(session), () =>
                            cancelLiveSession(targetSlug, sessionId(session)),
                          );
                      }}
                    >
                      إلغاء
                    </button>
                  )}
                  {targetSlug && session.status === "ended" && (
                    <button
                      type="button"
                      className="btn-outline-blue"
                      disabled={busyId === sessionId(session)}
                      onClick={() => setRecording(session)}
                    >
                      {session.recordingUrl || session.recordingAssetId
                        ? "تعديل التسجيل"
                        : "أضف التسجيل"}
                    </button>
                  )}
                  {targetSlug &&
                    canCreateReplayLesson &&
                    (session.recordingUrl || session.recordingAssetId) && (
                      <a
                        className="btn-outline-blue"
                        href={`/studio/courses/${encodeURIComponent(targetSlug)}?tab=curriculum`}
                      >
                        <Video size={13} /> إضافة كدرس إعادة
                      </a>
                    )}
                  {targetSlug && (
                    <button
                      type="button"
                      className="text-slate-400"
                      aria-label="حذف"
                      disabled={busyId === sessionId(session)}
                      onClick={() => {
                        if (window.confirm("حذف الجلسة نهائيًا؟"))
                          void mutate(sessionId(session), () =>
                            deleteLiveSession(targetSlug, sessionId(session)),
                          );
                      }}
                    >
                      حذف
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {editing !== undefined && editCourseSlug && (
        <SessionDrawer
          courseSlug={editCourseSlug}
          session={editing}
          onClose={() => setEditing(undefined)}
          onSaved={load}
        />
      )}
      {recording && (recording.courseSlug || courseSlug) && (
        <RecordingDrawer
          key={sessionId(recording)}
          courseSlug={recording.courseSlug || courseSlug!}
          session={recording}
          close={() => setRecording(null)}
          onSaved={load}
        />
      )}
    </div>
  );
};
