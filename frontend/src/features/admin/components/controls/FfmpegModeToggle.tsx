import React from 'react';
import { Clapperboard, FileVideo } from 'lucide-react';
import type { AdminVideoSystemConfig } from '@/features/admin/types';

interface FfmpegModeToggleProps {
  config: AdminVideoSystemConfig | null;
  busy: boolean;
  onToggle: (useFfmpeg: boolean) => void;
}

/** The two feeding lines the card shows, keyed by the packaging mode. */
const MODE_ROWS: Record<'ffmpeg' | 'raw', { icon: React.ElementType; title: string; detail: string }> = {
  ffmpeg: {
    icon: Clapperboard,
    title: 'تغليف HLS عبر FFmpeg',
    detail: 'كل ملف يُرفع ثم يُغلَّف بسلّم جودة مشفّرة AES-128 — يتطلب FFmpeg على جهاز الرفع.',
  },
  raw: {
    icon: FileVideo,
    title: 'رفع مباشر بدون تغليف',
    detail: 'الملف يُخزَّن كما هو ويُشاهد داخل المنصة مباشرة عبر رابط مشاهدة مُتحكَّم به — لا يُطلَب FFmpeg.',
  },
};

/** One switch between live-HLS packaging and raw watchable uploads. */
export const FfmpegModeToggle: React.FC<FfmpegModeToggleProps> = ({ config, busy, onToggle }) => {
  const useFfmpeg = config?.useFfmpeg ?? true;
  const mode = MODE_ROWS[useFfmpeg ? 'ffmpeg' : 'raw'];
  const ModeIcon = mode.icon;
  return (
    <div className="admin-form-section">
      <header className="admin-form-section-head">
        <span className="admin-form-section-icon">
          <ModeIcon size={14} />
        </span>
        <span className="admin-form-section-title">وضع التغليف</span>
        <span className="admin-form-section-count">يُطبَّق على كل عملية رفع بعد تغييره</span>
      </header>
      <div className="admin-toggle-row">
        <div className="min-w-0 flex-1">
          <span className="admin-toggle-label">{mode.title}</span>
          <span className="admin-check-hint font-body">{mode.detail}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={useFfmpeg}
          aria-label="تبديل تغليف FFmpeg"
          disabled={busy}
          onClick={() => onToggle(!useFfmpeg)}
          className={`admin-toggle-track ${useFfmpeg ? 'admin-toggle-track-on' : 'admin-toggle-track-off'}`}
        >
          <span className={`admin-toggle-knob ${useFfmpeg ? 'admin-toggle-knob-on' : 'admin-toggle-knob-off'}`} />
        </button>
      </div>
    </div>
  );
};
