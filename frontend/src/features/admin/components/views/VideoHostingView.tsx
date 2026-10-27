import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Cloud, FileVideo, RefreshCw, Link2, Trash2, X } from 'lucide-react';
import { useAdmin } from '@/features/admin/context/adminContext';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { VideoStatusBadge } from '@/features/admin/components/cards/Badges';
import { ConfirmAction } from '@/features/admin/components/controls/ConfirmAction';
import { formatShortDateTime } from '@/features/admin/data/adminFormatters';
import { startDriveOAuth } from '@/features/admin/data/adminFetchers';
import { vercelUploadTooLarge } from '@/shared/lib/apiClient';
import { VIDEO_STAGE_LABELS, type AdminVideoProvider } from '@/features/admin/types';

/** The select's per-provider footnote; unknown codes simply read no note. */
const PROVIDER_NOTES: Record<string, string> = {
  telegram:
    'تُرفع المصادر إلى قناة الأكاديمية على تليجرام، ثم تُغلَّف بصيغة HLS مشفّرة قابلة للتشغيل داخل المنصة — التغليف يتطلب FFmpeg.',
  google_drive:
    'المصدر يُرفع تدفّقيًّا (resumable) إلى مجلد Google Drive المخصّص، ويُخزَّن كما هو دون تغليف HLS.',
};

/** Whether an option is selectable: the registry flag AND the env checks. */
const isSelectable = (provider: AdminVideoProvider): boolean =>
  provider.enabled && provider.available !== false;

/** "Course-1 -- Lesson-1.mp4" becomes a usable slug token. */
const slugFromFile = (fileName: string): string => {
  const stem = fileName.replace(/\.[^.]+$/, '');
  return (
    stem
      .toLowerCase()
      .replace(/[^a-z0-9\u0621-\u064A]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'video'
  );
};

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

/** The tracker's second line; an unknown stage falls back to its own text. */
const stageLabel = (stage: string): string => VIDEO_STAGE_LABELS[stage] ?? stage;

/** Google Drive's blocker is a missing consent — its one remedy button. */
const DriveLinkButton: React.FC<{ busy: boolean; onClick: () => void }> = ({ busy, onClick }) => (
  <button type="button" className="btn-outline-blue py-1.5 px-3 text-xs" onClick={onClick} disabled={busy}>
    <Cloud size={14} />
    <span>{busy ? 'جارٍ تجهيز عملية الربط…' : 'ربط حساب Google'}</span>
  </button>
);

/** استضافة الفيديو: file upload with a live tracker + the fleet of stored assets. */
export const VideoHostingView: React.FC = () => {
  const {
    videoProviders,
    videoAssets,
    videoDiagnostics,
    deletingVideoId,
    videoUpload,
    uploadVideo,
    clearVideoUpload,
    deleteVideo,
    loadErrors,
    refreshVideoData,
  } = useAdmin();
  const [provider, setProvider] = useState('');
  const [form, setForm] = useState<{ slug: string; title: string }>({ slug: '', title: '' });
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [authorizingDrive, setAuthorizingDrive] = useState(false);

  /** Drive's blocker is a missing consent, not a config edit — open Google's
      URL (public id only) and let Django hold whatever comes back. */
  const linkDrive = async () => {
    setAuthorizingDrive(true);
    try {
      const { authUrl } = await startDriveOAuth();
      window.open(authUrl, '_blank', 'noopener');
    } finally {
      setAuthorizingDrive(false);
    }
  };

  const chosen = videoProviders.find((p) => p.code === provider);
  const chosenBlocked = Boolean(provider) && (!chosen || !isSelectable(chosen));
  // A *.vercel.app API rejects bodies over ~4.5 MB at the edge — refuse the
  // file up front where the admin can read why, not in a CORS-labelled blur.
  const capBlocked = vercelUploadTooLarge(file);
  const pipelineKnown = videoDiagnostics !== null;
  const pipelineOk = videoDiagnostics?.summary.pipeline ?? true;
  const busy = videoUpload?.phase === 'sending' || videoUpload?.phase === 'tracking';
  const percent = videoUpload?.percent ?? 0;
  const missingFile = !file;

  /** Picking a file seeds the slug and title, so the form needs zero typing. */
  const attachFile = (next: File | null) => {
    setFile(next);
    if (next) {
      setForm({
        slug: slugFromFile(next.name),
        title: next.name.replace(/\.[^.]+$/, ''),
      });
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) attachFile(dropped);
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (missingFile || busy || chosenBlocked || capBlocked) return;
    const uploaded = await uploadVideo({
      slug: form.slug,
      title: form.title,
      provider: provider || undefined,
      file: file as File,
    });
    if (uploaded) {
      setFile(null);
      setForm({ slug: '', title: '' });
    }
  };

  return (
    <div className="admin-view">
      <div className="admin-toolbar">
        <span className="admin-meta-line">
          {videoProviders.filter(isSelectable).length} مُزوّد جاهز · {videoAssets.length} أصل مخزَّن
        </span>
        <div className="admin-toolbar-actions">
          <button type="button" className="btn-outline-blue py-1.5 px-4 text-xs" onClick={() => refreshVideoData()}>
            <RefreshCw size={14} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {loadErrors.videos && (
        <AdminEmptyState
          icon={Cloud}
          title="تعذّر تحميل أصول الفيديو"
          hint="تعذّر الوصول إلى الخادم؛ أعد المحاولة بعد لحظات."
          isError
          onRetry={refreshVideoData}
        />
      )}

      {pipelineKnown && !pipelineOk && (
        <div className="admin-diag-verdict admin-diag-verdict-error">
          <div className="flex items-center gap-2 text-xs font-bold font-display">
            <AlertTriangle size={16} className="shrink-0" />
            <span>
              FFmpeg غير متوفر على هذا الخادم — المصادر الجديدة تُحفظ مرحَّلةً دون تغليف، ويُغلَّف كل ملف لاحقًا من جهاز
              مثبَّت عليه FFmpeg. راجع تبويب «فحص المنظومة».
            </span>
          </div>
        </div>
      )}

      {videoUpload && (
        <section className="admin-view-section">
          <h2 className="admin-section-title">
            <FileVideo size={15} className="admin-section-title-icon" />
            <span className="admin-section-title-text">متابعة الرفع الحالي</span>
          </h2>
          <div className={`admin-upload-tracker ${videoUpload.error ? 'admin-upload-tracker-error' : ''}`}>
            <div className="admin-upload-tracker-head">
              <FileVideo size={18} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="admin-upload-tracker-name">{videoUpload.fileName}</div>
                <div className="admin-upload-tracker-stage">{stageLabel(videoUpload.stage)}</div>
              </div>
              <span className="admin-upload-tracker-percent">{percent}%</span>
              <button type="button" className="admin-icon-btn" onClick={clearVideoUpload} aria-label="إخفاء المتابعة">
                <X size={16} />
              </button>
            </div>
            <div className="admin-progress-track">
              <div
                className={`admin-progress-fill ${videoUpload.phase === 'error' ? 'admin-progress-fill-error' : ''}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            {videoUpload.phase === 'done' && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold font-display text-emerald-400">
                <CheckCircle2 size={14} />
                <span>اكتمل الرفع بنجاح — أصبح الفيديو متاحًا للاستخدام.</span>
              </div>
            )}
            {videoUpload.phase === 'error' && <div className="admin-form-error">{videoUpload.error}</div>}
          </div>
        </section>
      )}

      <section className="admin-view-section">
        <h2 className="admin-section-title">
          <Link2 size={15} className="admin-section-title-icon" />
          <span className="admin-section-title-text">إضافة فيديو جديد</span>
        </h2>
        <form onSubmit={handleUpload} className="admin-detail-section gap-4">
          <label
            className={`admin-dropzone ${dragging ? 'admin-dropzone-drag' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            htmlFor="video-file"
          >
            <input
              id="video-file"
              type="file"
              accept="video/*"
              className="sr-only"
              disabled={busy}
              onChange={(event) => attachFile(event.target.files?.[0] ?? null)}
            />
            {file ? (
              <>
                <FileVideo size={20} className="shrink-0" />
                <div className="min-w-0">
                  <div className="admin-dropzone-name">{file.name}</div>
                  <div className="admin-dropzone-hint">{formatBytes(file.size)} — اضغط لاختيار ملف آخر</div>
                </div>
              </>
            ) : (
              <>
                <FileVideo size={20} className="shrink-0" />
                <div>
                  <div className="admin-dropzone-name">اسحب ملف الفيديو إلى هنا، أو اضغط لاختياره</div>
                  <div className="admin-dropzone-hint">
                    حتى 2 GB — يُغلَّف بصيغة HLS تلقائيًا بعد الرفع إن توفر FFmpeg على الخادم
                  </div>
                </div>
              </>
            )}
          </label>
          {capBlocked && (
            <div className="admin-form-error">
              {formatBytes(file?.size ?? 0)} أكبر من حد الاستضافة السحابية (4.5 MB) — ارفع الملف من جهاز إداري عبر
              <span className="admin-mono mx-1">manage.py ingest_video</span>
              أو انشر الخادم على استضافة تسمح بالملفات الكبيرة.
            </div>
          )}

          <div className="admin-form-section">
            <header className="admin-form-section-head">
              <span className="admin-form-section-icon">
                <FileVideo size={14} />
              </span>
              <span className="admin-form-section-title">بيانات الأصل</span>
              <span className="admin-form-section-count">يُعبّأ الاسم تلقائيًا من الملف</span>
            </header>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label className="admin-field-label" htmlFor="video-slug">
                  معرّف الفيديو (slug)
                  <span className="admin-required" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="video-slug"
                  dir="ltr"
                  className="admin-input text-left admin-mono"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="course-1--lesson-1"
                  required
                />
                <span className="admin-detail-empty">يُكتب بالحروف والأرقام فقط، ويُستخدم في روابط المشغّل داخل الدورات.</span>
              </div>
              <div className="admin-field">
                <label className="admin-field-label" htmlFor="video-title">
                  عنوان الفيديو
                </label>
                <input
                  id="video-title"
                  className="admin-input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="يُعبّأ من اسم الملف تلقائيًا"
                />
              </div>
            </div>
          </div>

          <div className="admin-form-section">
            <header className="admin-form-section-head">
              <span className="admin-form-section-icon">
                <Cloud size={14} />
              </span>
              <span className="admin-form-section-title">مُزوّد الاستضافة</span>
              <span className="admin-form-section-count">اختياري — اتركه فارغًا للاختيار الافتراضي</span>
            </header>
            <div className="admin-field">
              <label className="admin-field-label" htmlFor="video-provider">
                اختيار المُزوّد
              </label>
              <select
                id="video-provider"
                className="admin-input"
                value={provider}
                disabled={busy}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="">الافتراضي</option>
                {videoProviders.map((p) => (
                  <option
                    key={p.code}
                    value={p.code}
                    disabled={!isSelectable(p)}
                    title={p.reason || undefined}
                  >
                    {p.name}
                    {isSelectable(p) ? '' : ' — غير جاهز'}
                  </option>
                ))}
              </select>
            </div>

            {/* Every greyed provider states its own blocker right here, so
                the dropdown never hides why an option cannot be chosen. */}
            <div className="flex flex-col gap-2">
              {videoProviders
                .filter((p) => !isSelectable(p))
                .map((p) => (
                  <div key={p.code} className="admin-check">
                    <div className="admin-check-line">
                      <span className="admin-check-label">{p.name}</span>
                      <span className="admin-badge admin-badge-inactive">غير جاهز</span>
                    </div>
                    <span className="admin-check-detail">{p.reason || 'تعذّر التحقق من جاهزيته.'}</span>
                    {p.code === 'google_drive' && (
                      <DriveLinkButton busy={authorizingDrive} onClick={linkDrive} />
                    )}
                  </div>
                ))}
              {chosenBlocked && chosen?.code === 'google_drive' && (
                <DriveLinkButton busy={authorizingDrive} onClick={linkDrive} />
              )}
              {chosenBlocked && chosen && (
                <div className="admin-form-error">{chosen.reason ?? 'هذا المُزوّد غير جاهز في الوقت الحالي.'}</div>
              )}
              {!chosenBlocked && provider && (
                <span className="admin-check-hint font-body">{PROVIDER_NOTES[provider]}</span>
              )}
              {!provider && !pipelineOk && (
                <span className="admin-check-hint font-body">
                  سيُحفظ المصدر مرحَّلًا دون تغليف، وتظل النتيجة قابلة للتشغيل بعد التغليف اللاحق.
                </span>
              )}
            </div>
          </div>

          <div className="admin-form-footer">
            <button
              type="submit"
              className="admin-primary-btn"
              disabled={busy || missingFile || chosenBlocked || capBlocked}
            >
              {busy ? 'جارٍ تنفيذ الرفع…' : 'بدء الرفع والتغليف'}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-view-section">
        <h2 className="admin-section-title">
          <FileVideo size={15} className="admin-section-title-icon" />
          <span className="admin-section-title-text">أصول الفيديو المخزَّنة</span>
        </h2>
        {videoAssets.length > 0 ? (
          <div className="admin-table admin-table-video">
            <div className="admin-table-head" aria-hidden="true">
              <span>المعرّف</span>
              <span>العنوان</span>
              <span>الحالة</span>
              <span>المُزوّد</span>
              <span>أُضيف</span>
              <span>إجراء</span>
            </div>
            {videoAssets.map((asset) => {
              /** The row the tracker is driving mirrors the live bar, not a stale load. */
              const liveRow = busy && videoUpload?.slug === asset.slug;
              return (
                <div key={asset.id} className="admin-table-row admin-table-row-static">
                  <div className="admin-cell">
                    <span className="admin-cell-label">المعرّف</span>
                    <span className="admin-cell-value admin-mono admin-key" title={asset.slug}>
                      {asset.slug}
                    </span>
                  </div>
                  <div className="admin-cell">
                    <span className="admin-cell-label">العنوان</span>
                    <span className="admin-cell-value">{asset.title || '—'}</span>
                  </div>
                  <div className="admin-cell admin-cell-user">
                    <span className="admin-cell-label">الحالة</span>
                    <span className="admin-cell-value">
                      <VideoStatusBadge status={asset.status} />
                      <span className="admin-cell-sub">
                        {asset.status === 'ready' ? `${asset.qualities ?? 0} نسخ جودة` : asset.error || ''}
                      </span>
                      {liveRow && (
                        <>
                          <div className="admin-cell-sub">{stageLabel(videoUpload.stage)}</div>
                          <div className="admin-progress-track admin-progress-track-inline">
                            <div className="admin-progress-fill" style={{ width: `${percent}%` }} />
                          </div>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="admin-cell">
                    <span className="admin-cell-label">المُزوّد</span>
                    <span className="admin-cell-value">{asset.provider || '—'}</span>
                  </div>
                  <div className="admin-cell">
                    <span className="admin-cell-label">أُضيف</span>
                    <span className="admin-cell-value">{formatShortDateTime(asset.createdAt)}</span>
                  </div>
                  <div className="admin-cell">
                    <span className="admin-cell-label">إجراء</span>
                    <span className="admin-actions">
                      <ConfirmAction
                        label=""
                        confirmLabel="نعم، احذف"
                        icon={Trash2}
                        busy={deletingVideoId === asset.id}
                        onConfirm={() => deleteVideo(asset.id)}
                      />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !loadErrors.videos && (
            <AdminEmptyState
              icon={FileVideo}
              title="لا توجد أصول فيديو بعد"
              hint="ارفع أول فيديو من النموذج أعلاه ليظهر هنا مع حالته وعدد جوداته."
            />
          )
        )}
      </section>
    </div>
  );
};
