import React from 'react';
import { CheckCircle2, Cloud, Film, Loader2, RefreshCw, Send, XCircle } from 'lucide-react';
import { useAdmin } from '@/features/admin/context/adminContext';
import { SeverityBadge } from '@/features/admin/components/cards/Badges';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { formatDateTime } from '@/features/admin/data/adminFormatters';
import type { AdminDiagnosticGroup } from '@/features/admin/types';

/** One icon per diagnostics group id (provider code, or the id for the pipeline). */
const GROUP_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
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
            {item.hint && <span className="admin-check-hint">الحل: {item.hint}</span>}
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
        title={loadErrors.system ? 'تعذّر تحميل الفحص' : 'لا يوجد فحص بعد'}
        hint={loadErrors.system ? 'تعذّر الوصول إلى الخادم.' : 'اضغط تحديث لإعادة الفحص.'}
        isError={loadErrors.system}
        onRetry={refresh}
      />
    );
  }

  // The deep run replaces the shallow detail only once the admin asked for it;
  // until then the shallow report is the one on display.
  const report = deepDiagnosticsRequested && !deepDiagnostics ? videoDiagnostics : deepDiagnostics ?? videoDiagnostics;

  return (
    <div className="admin-view">
      <div className="admin-toolbar">
        <h2 className="admin-section-title">فحص المنظومة — استضافة الفيديو</h2>
        <div className="admin-diag-meta">
          <span>{report.deep ? 'فحص عميق (شبكة)' : 'فحص سريع (بيئة)'} · {formatDateTime(report.checkedAt)}</span>
        </div>
      </div>

      <section className="admin-view-section">
        <div className={`admin-diag-verdict ${report.okOverall ? 'admin-diag-verdict-ok' : 'admin-diag-verdict-error'}`}>
          <div className="flex items-center gap-2 text-sm font-bold font-display">
            {report.okOverall ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span>
              {report.okOverall
                ? 'كل الفحوصات الأساسية سليمة — استضافة الفيديو تعمل.'
                : `وجد الفحص ${report.problems.length.toLocaleString('ar-EG')} ${report.problems.length === 1 ? 'مشكلة' : 'مشاكل'} بالأسفل.`}
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
          <h2 className="admin-section-title">الخلاصة</h2>
          <button type="button" className="admin-primary-btn" onClick={runDeepDiagnostics} disabled={deepDiagnosticsLoading}>
            {deepDiagnosticsLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            <span>{deepDiagnosticsRequested ? 'إعادة الفحص العميق' : 'تشغيل الفحص العميق'}</span>
          </button>
        </div>
        <div className="admin-health-strip">
          <HealthChip
            label="خط التغليف"
            detail={report.summary.pipeline ? 'FFmpeg متوفر — التغليف يعمل' : 'FFmpeg غير متوفر — الرفع سيُرحّل المصدر فقط'}
            ok={report.summary.pipeline}
          />
          <HealthChip
            label="تليجرام"
            detail={report.summary.telegram ? 'جاهز للاختيار' : (report.providers.find((p) => p.code === 'telegram')?.reason || 'غير مضبوط')}
            ok={report.summary.telegram}
          />
          <HealthChip
            label="Google Drive"
            detail={report.summary.google_drive ? 'جاهز للاختيار' : (report.providers.find((p) => p.code === 'google_drive')?.reason || 'غير مضبوط')}
            ok={report.summary.google_drive}
          />
        </div>
      </section>

      <section className="admin-view-section">
        <h2 className="admin-section-title">الفحوصات المرحلية</h2>
        <div className="flex flex-col gap-4">
          {report.groups.map((group) => (
            <DiagnosticsGroup key={group.id} group={group} />
          ))}
        </div>
      </section>

      {!report.deep && (
        <section className="admin-view-section">
          <p className="admin-check-hint">
            الفحص العميق يتصل بـ Bot API و Google API للتأكد من الشهادات نفسها — شغّله بعد تعديل الإعدادات.
          </p>
        </section>
      )}
    </div>
  );
};
