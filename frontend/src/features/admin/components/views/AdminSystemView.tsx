import React from 'react';
import { CheckCircle2, Cloud, Film, ListChecks, Loader2, RefreshCw, Send, Stethoscope, XCircle, type LucideIcon } from 'lucide-react';
import { useAdmin } from '@/features/admin/context/adminContext';
import { SeverityBadge } from '@/features/admin/components/cards/Badges';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { formatDateTime } from '@/features/admin/data/adminFormatters';
import type { AdminDiagnosticGroup } from '@/features/admin/types';

/** One icon per diagnostics group id (provider code, or the id for the pipeline). */
const GROUP_ICONS: Record<string, LucideIcon> = {
  pipeline: Film,
  telegram: Send,
  google_drive: Cloud,
};

/** One verdict chip for the strip: a group (or a provider select) at a glance. */
const HealthChip: React.FC<{ label: string; detail: string; ok: boolean; unknown?: boolean }> = ({
  label,
  detail,
  ok,
  unknown,
}) => (
  <div className={`admin-health-chip ${unknown ? 'admin-health-unknown' : ok ? 'admin-health-ok' : 'admin-health-error'}`}>
    <span className="admin-health-chip-icon">
      {unknown ? <RefreshCw size={17} /> : ok ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
    </span>
    <span className="admin-health-chip-text">
      <span className="admin-health-chip-name">{label}</span>
      <span className="admin-health-chip-detail">{detail}</span>
    </span>
  </div>
);

/** One stage card: every staged check with its dot, detail, and fix hint. */
const DiagnosticsGroup: React.FC<{ group: AdminDiagnosticGroup }> = ({ group }) => {
  const Icon = GROUP_ICONS[group.provider || group.id] ?? Film;
  return (
    <section className="admin-diag-group">
      <header className="admin-diag-group-head">
        <div className="admin-diag-group-title">
          <span className="admin-diag-group-icon">
            <Icon size={16} />
          </span>
          <span className="admin-diag-group-name">{group.label}</span>
        </div>
        <SeverityBadge severity={group.warningCount > 0 ? 'warn' : 'info'} ok={group.ok} />
      </header>
      <div className="flex flex-col gap-2">
        {group.checks.map((item) => (
          <div
            key={item.id}
            className={`admin-check ${item.ok ? 'admin-check-ok' : item.severity === 'warn' ? 'admin-check-warn' : 'admin-check-fail'}`}
          >
            <div className="admin-check-line">
              <div className="admin-check-name">
                <span className="admin-check-dot" />
                <span className="admin-check-label">{item.label}</span>
              </div>
              <SeverityBadge severity={item.severity} ok={item.ok} />
            </div>
            <span className="admin-check-detail">{item.detail}</span>
            {item.hint && (
              <span className="admin-check-hint font-body">
                الحل: {item.hint}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

/** فحص المنظومة: what works (and what does not) for the video pipeline. */
export const AdminSystemView: React.FC = () => {
  const {
    videoDiagnostics,
    deepDiagnostics,
    deepDiagnosticsLoading,
    deepDiagnosticsRequested,
    runDeepDiagnostics,
    loadErrors,
    refresh,
  } = useAdmin();

  if (!videoDiagnostics) {
    return (
      <AdminEmptyState
        icon={Stethoscope}
        title={loadErrors.system ? 'تعذّر تحميل نتيجة الفحص' : 'لم يُشغَّل الفحص بعد'}
        hint={
          loadErrors.system
            ? 'تعذّر الوصول إلى الخادم؛ أعد المحاولة بعد لحظات.'
            : 'اضغط تحديث الأقسام من الشريط العلوي لتشغيل الفحص السريع.'
        }
        isError={loadErrors.system}
        onRetry={refresh}
      />
    );
  }

  // The deep run replaces the shallow detail only once the admin asked for it;
  // until then the shallow report is the one on display.
  const report = deepDiagnosticsRequested && !deepDiagnostics ? videoDiagnostics : deepDiagnostics ?? videoDiagnostics;
  const problemCount = report.problems.length;

  return (
    <div className="admin-view">
      <div className="admin-toolbar">
        <h2 className="admin-section-title">
          <Stethoscope size={15} className="admin-section-title-icon" />
          <span className="admin-section-title-text">فحص المنظومة</span>
          <span className="admin-section-title-sub">استضافة الفيديو: الخط والمُزوّدون</span>
        </h2>
        <div className="admin-meta-line">
          <span>{report.deep ? 'فحص عميق (شبكة) ·' : 'فحص سريع (بيئة) ·'} {formatDateTime(report.checkedAt)}</span>
        </div>
      </div>

      <section className="admin-view-section">
        <div className={`admin-diag-verdict ${report.okOverall ? 'admin-diag-verdict-ok' : 'admin-diag-verdict-error'}`}>
          <div className="flex items-center gap-2 text-sm font-bold font-display">
            {report.okOverall ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span>
              {report.okOverall
                ? 'كل الفحوصات سليمة — استضافة الفيديو تعمل بالشكل الصحيح.'
                : problemCount === 1
                ? 'وجد الفحص مشكلة واحدة — تفاصيلها في الأسفل.'
                : `وجد الفحص ${problemCount.toLocaleString('ar-EG')} مشكلات — تفاصيلها في الأسفل.`}
            </span>
          </div>
          {report.problems.map((problem) => (
            <div key={problem} className="admin-diag-problem">
              <XCircle size={14} className="shrink-0 mt-0.5" />
              <span>{problem}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-view-section">
        <div className="admin-section-head">
          <h2 className="admin-section-title">
            <ListChecks size={15} className="admin-section-title-icon" />
            <span className="admin-section-title-text">الخلاصة</span>
            <span className="admin-section-title-sub">حالة كل مكوّن في لمحة واحدة</span>
          </h2>
          <button type="button" className="admin-primary-btn" onClick={runDeepDiagnostics} disabled={deepDiagnosticsLoading}>
            {deepDiagnosticsLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            <span>{deepDiagnosticsRequested ? 'إعادة الفحص العميق' : 'تشغيل الفحص العميق'}</span>
          </button>
        </div>
        <div className="admin-health-strip">
          <HealthChip
            label="خط التغليف (FFmpeg)"
            detail={report.summary.pipeline ? 'متوفر على الخادم — التغليف يعمل' : 'غير متوفر — المصادر تُحفظ مرحَّلًا دون تغليف'}
            ok={report.summary.pipeline}
          />
          <HealthChip
            label="تليجرام"
            detail={
              report.summary.telegram
                ? 'جاهز لاختياره عند الرفع'
                : (report.providers.find((p) => p.code === 'telegram')?.reason || 'غير مُعدّ بعد')
            }
            ok={report.summary.telegram}
          />
          <HealthChip
            label="Google Drive"
            detail={
              report.summary.google_drive
                ? 'جاهز لاختياره عند الرفع'
                : (report.providers.find((p) => p.code === 'google_drive')?.reason || 'غير مُعدّ بعد')
            }
            ok={report.summary.google_drive}
          />
        </div>
      </section>

      <section className="admin-view-section">
        <h2 className="admin-section-title">
          <ListChecks size={15} className="admin-section-title-icon" />
          <span className="admin-section-title-text">الفحوصات المرحلية</span>
          <span className="admin-section-title-sub">كل مرحلة بتفاصيل نتائجها وحلّها عند الفشل</span>
        </h2>
        <div className="flex flex-col gap-4">
          {report.groups.map((group) => (
            <DiagnosticsGroup key={group.id} group={group} />
          ))}
        </div>
      </section>

      {!report.deep && (
        <p className="admin-check-hint font-body">
          الفحص العميق يتواصل مع تليجرام Bot API و Google API للتحقق من بيانات الربط نفسها — شغّله بعد تعديل الإعدادات
          مباشرة ليؤكد أن التغييرات انتفعت.
        </p>
      )}
    </div>
  );
};
