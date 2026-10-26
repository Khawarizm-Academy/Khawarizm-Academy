import React, {useState} from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useAdmin } from '@/features/admin/context/adminContext';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { VideoStatusBadge } from '@/features/admin/components/cards/Badges';
import { ConfirmAction } from '@/features/admin/components/controls/ConfirmAction';
import { formatShortDateTime } from '@/features/admin/data/adminFormatters';
import type { AdminVideoProvider } from '@/features/admin/types';

/** The select's per-provider footnote; unknown codes simply read no note. */
const PROVIDER_NOTES: Record<string, string> = {
  telegram: 'تُرفع المقاطع إلى قناة تليجرام الخاصة وتُغلَّف HLS مشفّرًا — يتطلب FFmpeg للتغليف.',
  google_drive: 'الملف المصدر يُحفظ في مجلد Drive المخصّص — بديل بسيط دون تغليف HLS.',
};

/** Whether an option is selectable: the registry flag AND the env checks. */
const isSelectable = (provider: AdminVideoProvider): boolean =>
  provider.enabled && provider.available !== false;

/** استضافة الفيديو: staging-aware creation + the fleet of stored assets. */
export const VideoHostingView: React.FC = () => {
  const {
    videoProviders,
    videoAssets,
    videoDiagnostics,
    deletingVideoId,
    creatingVideo,
    createVideo,
    deleteVideo,
    loadErrors,
    refreshVideoData,
  } = useAdmin();
  const [form, setForm] = useState({ slug: '', title: '', provider: '' });

  const chosen = videoProviders.find((p) => p.code === form.provider);
  const chosenBlocked = Boolean(form.provider) && (!chosen || !isSelectable(chosen));
  const pipelineKnown = videoDiagnostics !== null;
  const pipelineOk = videoDiagnostics?.summary.pipeline ?? true;

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (chosenBlocked) return;
    const created = await createVideo({
      slug: form.slug,
      title: form.title,
      provider: form.provider || undefined,
    });
    if (created) setForm({ slug: '', title: '', provider: form.provider });
  };

  return (
    <div className="admin-view">
      <div className="admin-toolbar">
        <h2 className="admin-section-title">استضافة الفيديو</h2>
        <div className="admin-toolbar-actions">
          <button type="button" className="admin-ghost-btn" onClick={() => refreshVideoData()}>
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

      <section className="admin-view-section">
        <h2 className="admin-section-title">إضافة فيديو</h2>
        <form onSubmit={handleCreate} className="admin-detail-section">
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
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
              >
                <option value="">الافتراضي</option>
                {videoProviders.map((provider) => (
                  <option key={provider.code} value={provider.code} disabled={!isSelectable(provider)}>
                    {provider.name}{isSelectable(provider) ? '' : ' — غير جاهز'}
                  </option>
                ))}
              </select>
              {chosenBlocked && (
                <div className="admin-form-error">{chosen?.reason ?? 'هذا المزود غير مفعّل.'}</div>
              )}
              {!chosenBlocked && form.provider && (
                <div className="admin-detail-empty">{PROVIDER_NOTES[form.provider]}</div>
              )}
              {!form.provider && !pipelineOk && (
                <div className="admin-detail-empty">
                  سيُحفظ المصدر فقط (مرحَّل) بانتظار جهاز يغلّف — النتيجة تبقى قابلة للتشغيل لاحقًا.
                </div>
              )}
            </div>
          </div>
          <div className="admin-form-footer">
            <button type="submit" className="admin-primary-btn" disabled={creatingVideo}>
              <span>{creatingVideo ? 'جارٍ الإضافة…' : 'إضافة'}</span>
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
            {videoAssets.map((asset) => (
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
            ))}
          </div>
        ) : (
          !loadErrors.videos && <AdminEmptyState title="لا توجد فيديوهات بعد" hint="أضف أول فيديو من النموذج أعلاه." />
        )}
      </section>
    </div>
  );
};
