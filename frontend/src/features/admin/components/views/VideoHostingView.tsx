import React, { useState } from 'react';
import { AlertTriangle, FileVideo, RefreshCw, Trash2, X } from 'lucide-react';
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
  telegram: 'تُرفع المقاطع إلى قناة تليجرام الخاصة وتُغلَّف HLS مشفّرًا — يتطلب FFmpeg للتغليف.',
  google_drive: 'المصدر يُرفع تدفّقيًّا (resumable) إلى مجلد Drive المخصّص — يُخزَّن ويُرحَّل دون تغليف HLS.',
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
  const authorizeDrive = async () => {
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
        <h2 className="admin-section-title">استضافة الفيديو</h2>
        <div className="admin-toolbar-actions">
          <button type="button" className="admin-ghost-btn" onClick={() => refreshVideoData()}>
            <RefreshCw size={15} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {loadErrors.videos && (
        <AdminEmptyState
          title="تعذّر تحميل بيانات الفيديو"
          hint="تعذّر الوصول إلى الخادم."
          isError
          onRetry={refreshVideoData}
        />
      )}

      {pipelineKnown && !pipelineOk && (
        <div className="admin-diag-verdict admin-diag-verdict-error">
          <div className="flex items-center gap-2 text-xs font-bold font-display">
            <AlertTriangle size={16} className="shrink-0" />
            <span>FFmpeg غير متوفر على هذا الخادم — الفيديو الجديد يُرحَّل "مرحَّلًا" ويغلَّف لاحقًا من جهاز يشغّل FFmpeg. راجع قسم «فحص المنظومة».</span>
          </div>
        </div>
      )}

      {videoUpload && (
        <section className="admin-view-section">
          <h2 className="admin-section-title">متابعة الرفع</h2>
          <div className={`admin-upload-tracker ${videoUpload.error ? 'admin-upload-tracker-error' : ''}`}>
            <div className="admin-upload-tracker-head">
              <FileVideo size={18} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="admin-upload-tracker-name">{videoUpload.fileName}</div>
                <div className="admin-upload-tracker-stage">
                  {stageLabel(videoUpload.stage)}
                </div>
              </div>
              <span className="admin-mono admin-upload-tracker-percent">{percent}%</span>
              <button type="button" className="admin-ghost-btn" onClick={clearVideoUpload} aria-label="إخفاء المتابعة">
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
              <div className="admin-upload-tracker-verdict admin-upload-tracker-verdict-ok">اكتمل بنجاح ✓</div>
            )}
            {videoUpload.phase === 'error' && (
              <div className="admin-form-error">{videoUpload.error}</div>
            )}
          </div>
        </section>
      )}

      <section className="admin-view-section">
        <h2 className="admin-section-title">رفع فيديو جديد</h2>
        <form onSubmit={handleUpload} className="admin-detail-section">
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
                  <div className="admin-dropzone-hint">{formatBytes(file.size)} — اضغط للاستبدال</div>
                </div>
              </>
            ) : (
              <>
                <FileVideo size={20} className="shrink-0" />
                <div>
                  <div className="admin-dropzone-name">اسحب الفيديو هنا أو اضغط للاختيار</div>
                  <div className="admin-dropzone-hint">حتى 2GB — يُغلَّف HLS تلقائيًّا بعد الرفع إن توفر FFmpeg</div>
                </div>
              </>
            )}
          </label>
          {capBlocked && (
            <div className="admin-form-error">
              {formatBytes(file?.size ?? 0)} أكبر من حد الخادم السحابي (4.5 MB) — ارفع من جهاز التغليف عبر
              <span className="admin-mono"> manage.py ingest_video</span> أو انشر الخادم على VM بدل Vercel.
            </div>
          )}

          <div className="admin-form-grid">
            <div className="admin-field">
              <label className="admin-field-label" htmlFor="video-slug">معرّف الفيديو (slug)</label>
              <input
                id="video-slug"
                className="admin-input admin-mono"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="course-1--lesson-1"
                required
              />
            </div>
            <div className="admin-field">
              <label className="admin-field-label" htmlFor="video-title">العنوان</label>
              <input
                id="video-title"
                className="admin-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="admin-field admin-field-wide">
              <label className="admin-field-label" htmlFor="video-provider">مزود الاستضافة</label>
              <select
                id="video-provider"
                className="admin-select"
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
                    {p.name}{isSelectable(p) ? '' : ' — غير جاهز'}
                  </option>
                ))}
              </select>
              {/* Every greyed provider states its own blocker right here, so
                  the dropdown never hides why an option cannot be chosen. */}
              {videoProviders
                .filter((p) => !isSelectable(p) && p.code !== provider)
                .map((p) => (
                  <div key={p.code} className="admin-detail-empty">
                    {p.name} غير جاهز — {p.reason || 'تعذّر التحقق من جاهزيته.'}
                    {p.code === 'google_drive' && (
                      <button
                        type="button"
                        className="admin-ghost-btn"
                        onClick={authorizeDrive}
                        disabled={authorizingDrive}
                      >
                        {authorizingDrive ? 'جارٍ تجهيز الرابط…' : 'تخويل حساب Google'}
                      </button>
                    )}
                  </div>
                ))}
              {chosenBlocked && chosen?.code === 'google_drive' && (
                <button
                  type="button"
                  className="admin-ghost-btn"
                  onClick={authorizeDrive}
                  disabled={authorizingDrive}
                >
                  {authorizingDrive ? 'جارٍ تجهيز الرابط…' : 'تخويل حساب Google'}
                </button>
              )}
              {chosenBlocked && (
                <div className="admin-form-error">{chosen?.reason ?? 'هذا المزود غير مفعّل.'}</div>
              )}
              {!chosenBlocked && provider && (
                <div className="admin-detail-empty">{PROVIDER_NOTES[provider]}</div>
              )}
              {!provider && !pipelineOk && (
                <div className="admin-detail-empty">
                  سيُحفظ المصدر فقط (مرحَّل) بانتظار جهاز يغلّف — النتيجة تبقى قابلة للتشغيل لاحقًا.
                </div>
              )}
            </div>
          </div>

          <div className="admin-form-footer">
            <button type="submit" className="admin-primary-btn" disabled={busy || missingFile || chosenBlocked || capBlocked}>
              <span>{busy ? 'جارٍ تنفيذ الرفع…' : 'رفع الفيديو'}</span>
            </button>
          </div>
        </form>
      </section>

      <section className="admin-view-section">
        <h2 className="admin-section-title">الفيديوهات المخزَّنة</h2>
        {videoAssets.length > 0 ? (
          <div className="admin-table admin-table-video">
            <div className="admin-table-head" aria-hidden="true">
              <span>المعرّف</span>
              <span>العنوان</span>
              <span>الحالة</span>
              <span>المزود</span>
              <span>أُنشئ</span>
              <span>إجراءات</span>
            </div>
            {videoAssets.map((asset) => {
              /** The row the tracker is driving mirrors the live bar, not a stale load. */
              const liveRow = busy && videoUpload?.slug === asset.slug;
              return (
                <div key={asset.id} className="admin-table-row admin-table-row-static">
                  <div className="admin-cell">
                    <span className="admin-cell-label">المعرّف</span>
                    <span className="admin-cell-value admin-mono admin-key" title={asset.slug}>{asset.slug}</span>
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
                        {asset.status === 'ready' ? `${asset.qualities ?? 0} نسخ` : (asset.error || '')}
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
                    <span className="admin-cell-label">المزود</span>
                    <span className="admin-cell-value">{asset.provider || '—'}</span>
                  </div>
                  <div className="admin-cell">
                    <span className="admin-cell-label">أُنشئ</span>
                    <span className="admin-cell-value">{formatShortDateTime(asset.createdAt)}</span>
                  </div>
                  <div className="admin-cell">
                    <span className="admin-cell-label">إجراءات</span>
                    <span className="admin-actions">
                      <ConfirmAction
                        label=""
                        confirmLabel="تأكيد الحذف"
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
          !loadErrors.videos && <AdminEmptyState title="لا توجد فيديوهات بعد" hint="ارفع أول فيديو من النموذج أعلاه." />
        )}
      </section>
    </div>
  );
};
