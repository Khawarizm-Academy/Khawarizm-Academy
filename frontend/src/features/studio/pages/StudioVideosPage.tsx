import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Grid2X2, List, Loader2, MoreVertical, Pause, Play, Plus, Search, Upload, Video, X } from 'lucide-react';
import { useSearchParams } from '@/app/routerContext';
import { useAuth } from '@/features/auth/context/authContext';
import { can } from '@/shared/lib/permissions';
import { ApiError, apiPost } from '@/shared/lib/apiClient';
import { StudioShell } from '@/features/studio/components/layout/StudioShell';
import { StudioProvider } from '@/features/studio/context/StudioProvider';
import {
  cancelStudioUpload,
  completeStudioUpload,
  createStudioCaption,
  createStudioVideoLink,
  deleteStudioCaption,
  deleteStudioVideo,
  fetchStudioVideoDetail,
  fetchStudioVideoLibrary,
  fetchStudioVideoProviders,
  getStudioUploadStatus,
  initStudioUpload,
  updateStudioVideo,
  uploadStudioChunk,
} from '@/features/studio/data/studioFetchers';
import { parseStudioVideoUrl, videoUrlError } from '@/features/studio/data/videoUrl';
import { UploadQueue, readVideoDuration, validateUploadFile, type UploadJob } from '@/features/studio/data/uploader/UploadQueue';
import type { StudioVideoCaption, StudioVideoDetail, StudioVideoProviderOption, StudioVideoSummary } from '@/features/studio/types';
import { mintStreamGrant } from '@/features/videohosting/data/videoHostingFetchers';
import { resolveEngineLoader } from '@/features/videohosting/engines/registry';
import type { PlaybackEngine, PlaybackState } from '@/features/videohosting/engines/types';
import type { StreamGrant } from '@/features/videohosting/types';

const STATUS_LABELS: Record<string, string> = { uploading: 'رفع', processing: 'معالجة', ready: 'جاهز', staged: 'قيد التجهيز', error: 'خطأ' };
const PROVIDER_LABELS: Record<string, string> = { google_drive: 'Google Drive', telegram: 'Telegram', youtube: 'YouTube', vimeo: 'Vimeo', external: 'رابط خارجي' };
const PROTECTION_LABELS: Record<string, string> = { encrypted: 'مشفّر', gated: 'محمي', none: 'خارجي' };
const MAX_BYTES = 2 * 1024 * 1024 * 1024;
const QUOTA_BYTES = 20 * 1024 * 1024 * 1024;
type ProviderPackagingOptions = { allowPackage: boolean; allowDirect: boolean; allowOverride: boolean; effective: 'package' | 'direct' };

function providerAllowsPackagingOverride(provider?: StudioVideoProviderOption) {
  return Boolean((provider as (StudioVideoProviderOption & { packagingOptions?: ProviderPackagingOptions }) | undefined)?.packagingOptions?.allowOverride);
}
function bytes(value = 0) {
  if (!value) return '—';
  const units = ['بايت', 'ك.ب', 'م.ب', 'ج.ب'];
  let n = value;
  let index = 0;
  while (n >= 1024 && index < units.length - 1) { n /= 1024; index += 1; }
  return `${n.toFixed(n >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}
function duration(value = 0) {
  if (!value) return '—';
  return `${Math.floor(value / 3600) ? `${Math.floor(value / 3600)}:` : ''}${String(Math.floor(value / 60) % 60).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
function statusLabel(status: string) { return STATUS_LABELS[status] || status; }
function assetUsage(asset: StudioVideoSummary) { return Array.isArray(asset.lessonsUsing) ? asset.lessonsUsing.length : asset.lessonsUsing || 0; }
function posterUrlError(value: string): string {
  if (!value.trim()) return '';
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:') return 'يجب أن يكون رابط صورة الغلاف HTTPS.';
    return '';
  } catch {
    return 'أدخل رابط صورة غلاف HTTPS صالحًا.';
  }
}

function useUploadQueue(onChange: (jobs: UploadJob[]) => void) {
  const queueRef = useRef<UploadQueue | null>(null);
  useEffect(() => {
    queueRef.current = new UploadQueue({ transport: { init: initStudioUpload, status: getStudioUploadStatus, chunk: uploadStudioChunk, complete: completeStudioUpload, cancel: cancelStudioUpload }, onChange });
    return () => queueRef.current?.destroy();
  }, [onChange]);
  return queueRef;
}

const StaffVideoPreview: React.FC<{ asset: StudioVideoSummary }> = ({ asset }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PlaybackEngine | null>(null);
  const [engine, setEngine] = useState<PlaybackEngine | null>(null);
  const [state, setState] = useState<PlaybackState | 'loading' | 'error'>('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let current: PlaybackEngine | null = null;
    const host = hostRef.current;
    if (!host) return undefined;
    host.replaceChildren();
    setState('loading');
    setError('');
    const start = async () => {
      try {
        const grant: StreamGrant = await mintStreamGrant(asset.slug);
        const loader = resolveEngineLoader(grant);
        if (!loader) throw new Error('unsupported');
        const module = await loader();
        if (cancelled) return;
        current = module.createEngine();
        engineRef.current = current;
        setEngine(current);
        current.on('state', (event) => setState(event.state));
        current.on('ready', () => {
          setState('ready');
          current?.getVideoElement()?.setAttribute('controls', 'true');
        });
        current.on('error', () => {
          setState('error');
          setError('تعذّر تشغيل معاينة الفيديو. حاول مرة أخرى.');
        });
        await current.attach(host, grant, { startAt: 0, autoplay: false });
        if (cancelled) current.destroy();
      } catch (reason) {
        if (cancelled) return;
        setState('error');
        setError(reason instanceof ApiError ? reason.message : 'تعذّر تشغيل معاينة الفيديو. حاول مرة أخرى.');
      }
    };
    void start();
    return () => {
      cancelled = true;
      current?.destroy();
      engineRef.current = null;
      setEngine(null);
      host.replaceChildren();
    };
  }, [asset.slug, attempt]);

  const togglePlayback = async () => {
    if (!engineRef.current) return;
    if (state === 'playing') engineRef.current.pause();
    else {
      try { await engineRef.current.play(); } catch { setError('تعذّر بدء تشغيل المعاينة.'); }
    }
  };
  return (
    <div className="studio-video-preview">
      <div ref={hostRef} className="studio-video-preview-host" aria-label="معاينة الفيديو" />
      {state === 'loading' && <span className="studio-preview-status"><Loader2 size={16} className="animate-spin" /> جارٍ تجهيز المعاينة…</span>}
      {state === 'error' && <p className="studio-form-error" role="alert">{error}</p>}
      {engine && state !== 'error' && <button type="button" className="btn-outline-blue studio-preview-toggle" onClick={() => void togglePlayback()} disabled={state === 'loading'}>{state === 'playing' ? <Pause size={15} /> : <Play size={15} />}{state === 'playing' ? 'إيقاف المعاينة' : 'تشغيل المعاينة'}</button>}
      {state === 'error' && <button type="button" className="btn-outline-blue" onClick={() => setAttempt((value) => value + 1)}>إعادة المحاولة</button>}
    </div>
  );
};

const AddVideoDrawer: React.FC<{ providers: StudioVideoProviderOption[]; onClose: () => void; onCreated: () => void; queue: React.MutableRefObject<UploadQueue | null> }> = ({ providers, onClose, onCreated, queue }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [source, setSource] = useState<'file' | 'link'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [provider, setProvider] = useState(providers.find((item) => item.available && item.kind === 'storage')?.code || '');
  const [packaging, setPackaging] = useState('auto');
  const [title, setTitle] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [posterError, setPosterError] = useState('');
  const parsed = useMemo(() => parseStudioVideoUrl(link.trim()), [link]);
  const selectedProvider = providers.find((item) => item.code === provider);
  const uploadProvider = providers.filter((item) => item.kind === 'storage');
  const selectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] || null;
    setFile(next);
    if (next && !title) setTitle(next.name.replace(/\.[^.]+$/, ''));
    setError(next ? validateUploadFile(next, MAX_BYTES, QUOTA_BYTES) || '' : '');
  };
  const next = () => {
    setError('');
    if (step === 1 && source === 'file' && !file) { setError('اختر ملف فيديو أولًا.'); return; }
    if (step === 1 && source === 'link' && !parsed) { setError(videoUrlError); return; }
    if (step === 2 && !provider && source === 'file') { setError('اختر مزودًا متاحًا.'); return; }
    if (step < 3) setStep(step + 1);
  };
  const submit = async () => {
    setError('');
    const posterValidation = posterUrlError(posterUrl);
    setPosterError(posterValidation);
    if (posterValidation) return;
    if (!title.trim()) { setError('أدخل عنوان الفيديو.'); return; }
    try {
      if (source === 'link') { await createStudioVideoLink(title.trim(), link.trim(), posterUrl.trim() || undefined); onCreated(); onClose(); return; }
      if (!file || !selectedProvider) return;
      const asset = await apiPost<StudioVideoSummary>('/studio/videos', { title: title.trim(), provider, packaging, ...(posterUrl.trim() ? { posterUrl: posterUrl.trim() } : {}) });
      const durationSeconds = await readVideoDuration(file);
      queue.current?.add(file, asset.id, { packaging, durationSeconds });
      onCreated();
      onClose();
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'تعذّر بدء رفع الفيديو.'); }
  };
  return <div className="studio-modal-scrim" role="presentation"><section className="studio-modal studio-video-flow" role="dialog" aria-modal="true" aria-labelledby="add-video-title"><header className="studio-modal-head"><div><span className="studio-kicker">فيديو جديد · الخطوة {step} من 3</span><h2 id="add-video-title">إضافة فيديو إلى المكتبة</h2></div><button type="button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></header><div className="studio-video-stepper" aria-label="خطوات الإضافة"><span className={step >= 1 ? 'is-active' : ''}>المصدر</span><span className={step >= 2 ? 'is-active' : ''}>المزوّد والمعالجة</span><span className={step >= 3 ? 'is-active' : ''}>التفاصيل</span></div>{step === 1 && <div className="studio-form"><div className="studio-view-toggle" role="tablist"><button type="button" className={source === 'file' ? 'is-active' : ''} onClick={() => setSource('file')}>رفع ملف</button><button type="button" className={source === 'link' ? 'is-active' : ''} onClick={() => setSource('link')}>رابط HTTPS</button></div>{source === 'file' ? <label>ملف الفيديو<input type="file" accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.m4v,.webm,.mkv" onChange={selectFile} />{file && <small>{file.name} · {bytes(file.size)}</small>}</label> : <label>الرابط<input type="url" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://youtube.com/…" />{parsed && <small className="studio-form-success">اكتُشف المزوّد: {PROVIDER_LABELS[parsed.provider]}{parsed.thumbnailUrl ? ' · ستُستخدم صورة YouTube الآمنة' : ''}</small>}</label>}</div>}{step === 2 && source === 'file' && <div className="studio-form"><fieldset><legend>اختر مزوّد التخزين</legend>{uploadProvider.map((item) => <label key={item.code} className={`studio-provider-option ${provider === item.code ? 'is-selected' : ''}`}><input type="radio" name="provider" value={item.code} checked={provider === item.code} disabled={!item.available} onChange={() => setProvider(item.code)} /><span><strong>{item.name}</strong><small>{item.available ? item.effectivePlan : item.reason || 'غير متاح حاليًا'}</small></span></label>)}</fieldset>{selectedProvider?.available && can(user, 'videos.package') && providerAllowsPackagingOverride(selectedProvider) && <label className="studio-switch-row"><input type="checkbox" checked={packaging !== 'never'} onChange={(event) => setPackaging(event.target.checked ? 'auto' : 'never')} /> تغليف FFmpeg عند الحاجة</label>}<p className="studio-muted">لن يبدأ النقل قبل التحقق من الامتداد والحجم والحصة.</p></div>}{step === 2 && source === 'link' && <div className="studio-panel"><strong>الرابط الخارجي لا يحتاج مزوّد رفع.</strong><p className="studio-muted">سيُحفظ كرابط تشغيل آمن بعد إعادة التحقق على الخادم.</p></div>}{step === 3 && <div className="studio-form"><label>العنوان<input value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} autoFocus /></label><label>رابط صورة الغلاف (اختياري)<input type="url" value={posterUrl} onChange={(event) => { setPosterUrl(event.target.value); setPosterError(posterUrlError(event.target.value)); }} placeholder="https://…" />{posterError && <small className="studio-form-error" role="alert">{posterError}</small>}</label><p className="studio-muted">يمكن إضافة الترجمة من لوحة تفاصيل الفيديو بعد الإنشاء.</p></div>}{error && <p className="studio-form-error" role="alert">{error}</p>}<footer className="studio-flow-actions">{step > 1 && <button type="button" className="btn-outline-blue" onClick={() => setStep(step - 1)}>السابق</button>}<button type="button" className="btn-gold" onClick={step === 3 ? () => void submit() : next}>{step === 3 ? (source === 'file' ? 'بدء الرفع' : 'إضافة الرابط') : 'التالي'}</button></footer></section></div>;
};

const VideoDetailDrawer: React.FC<{ asset: StudioVideoSummary; onClose: () => void; onChanged: () => void }> = ({ asset, onClose, onChanged }) => {
  const [detail, setDetail] = useState<StudioVideoDetail | null>(null);
  const [title, setTitle] = useState(asset.title);
  const [posterUrl, setPosterUrl] = useState(asset.posterUrl || '');
  const [posterError, setPosterError] = useState('');
  const [caption, setCaption] = useState({ language: 'ar', label: 'العربية', isDefault: true, vtt: 'WEBVTT\n\n' });
  const [error, setError] = useState('');
  const [captionError, setCaptionError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  useEffect(() => { void fetchStudioVideoDetail(asset.id).then((next) => { setDetail(next); setTitle(next.title); setPosterUrl(next.posterUrl || ''); }).catch(() => setError('تعذّر تحميل تفاصيل الفيديو.')); }, [asset.id]);
  const save = async () => {
    const posterValidation = posterUrlError(posterUrl);
    setPosterError(posterValidation);
    if (posterValidation) return;
    try {
      const next = await updateStudioVideo(asset.id, { title, posterUrl: posterUrl.trim() });
      setDetail((current) => current ? { ...current, ...next } : current);
      onChanged();
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'تعذّر الحفظ.'); }
  };
  const addCaption = async () => { setCaptionError(''); try { const next = await createStudioCaption(asset.id, caption); setDetail((current) => current ? { ...current, captions: [...current.captions, next] } : current); } catch (reason) { setCaptionError(reason instanceof ApiError ? reason.message : 'تعذّرت إضافة الترجمة.'); } };
  const removeCaption = async (language: string, captionId: string) => { setCaptionError(''); try { await deleteStudioCaption(asset.id, language); setDetail((current) => current ? { ...current, captions: current.captions.filter((item) => item.id !== captionId) } : current); } catch (reason) { setCaptionError(reason instanceof ApiError ? reason.message : 'تعذّر حذف الترجمة.'); } };
  const deleteToken = (detail?.title || asset.title || asset.id).trim();
  const requestRemove = () => { if (detail?.usage.length) { const uses = detail.usage.map((usage) => `${usage.course.title} · ${usage.lesson.title}`).join('، '); setDeleteOpen(false); setError(`لا يمكن حذف الفيديو لأن الروابط المنشورة التالية تستخدمه: ${uses}. أزل هذه الروابط أولًا.`); return; } setError(''); setDeleteConfirmation(''); setDeleteOpen(true); };
  const confirmRemove = async () => { if (deleteConfirmation.trim() !== deleteToken) { setError('اكتب عنوان الفيديو كاملًا للتأكيد قبل الحذف.'); return; } try { await deleteStudioVideo(asset.id); onChanged(); onClose(); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'تعذّر حذف الفيديو.'); } };
  return <aside className="studio-video-detail" aria-label="تفاصيل الفيديو"><header className="studio-drawer-head"><div><span className="studio-kicker">تفاصيل الفيديو</span><h2>{detail?.title || asset.title}</h2></div><button type="button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></header><div className="studio-drawer-body">{detail ? <><StaffVideoPreview asset={detail} /><div className="studio-form"><label>العنوان<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>رابط صورة الغلاف (HTTPS)<input type="url" value={posterUrl} onChange={(event) => { setPosterUrl(event.target.value); setPosterError(posterUrlError(event.target.value)); }} placeholder="https://…" />{posterError && <small className="studio-form-error" role="alert">{posterError}</small>}</label><button type="button" className="btn-outline-blue" onClick={() => void save()}>حفظ التعديلات</button></div><div className="studio-detail-facts"><span>الحالة: <b>{statusLabel(detail.status)}</b></span><span>الحماية: <b>{PROTECTION_LABELS[detail.protection] || '—'}</b></span><span>الحجم: <b>{bytes(detail.sizeBytes)}</b></span><span>المشاهدات: <b>{detail.viewCount || 0}</b></span></div><section className="studio-drawer-section"><strong>استبدال المصدر</strong><p className="studio-muted">غير متاح حاليًا: مزوّدو التخزين الحاليون لا يقدّمون عملية ذرّية تضمن بقاء المصدر العامل إذا فشل الرفع أو المعالجة، لذلك لن نعرض استبدالًا قد يقطع الدروس المرتبطة.</p></section><section className="studio-drawer-section"><div className="studio-drawer-section-title"><strong>الترجمات</strong><span>{detail.captions.length} مسارات</span></div>{detail.captions.map((track: StudioVideoCaption) => <div className="studio-caption-row" key={track.id}><span>{track.label} ({track.language}) {track.isDefault ? '· افتراضية' : ''}</span><button type="button" className="icon-action danger" onClick={() => void removeCaption(track.language, track.id)}>حذف</button></div>)}{captionError && <p className="studio-form-error" role="alert">{captionError}</p>}<textarea value={caption.vtt} onChange={(event) => setCaption({ ...caption, vtt: event.target.value })} aria-label="WebVTT" /><button type="button" className="btn-outline-blue" onClick={() => void addCaption()}>إضافة ترجمة</button></section><section className="studio-drawer-section"><strong>الاستخدام المانع للحذف</strong>{detail.usage.length ? detail.usage.map((usage) => <a key={`${usage.course.slug}-${usage.lesson.id}`} href={`/studio/courses/${usage.course.slug}?tab=curriculum&lesson=${usage.lesson.id}`} className="studio-usage-link">{usage.course.title} · {usage.lesson.title}</a>) : <p className="studio-muted">غير مستخدم في دورة منشورة.</p>}</section>{detail.errorMessage && <p className="studio-form-error">آخر خطأ: {detail.errorMessage}</p>}{deleteOpen && <div className="studio-panel studio-delete-confirmation" role="alertdialog" aria-label="تأكيد حذف الفيديو"><p>للتأكيد، اكتب عنوان الفيديو حرفيًا:</p><strong>{deleteToken}</strong><input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} aria-label="عنوان الفيديو للتأكيد" autoFocus /><div><button type="button" className="btn-outline-blue" onClick={() => setDeleteOpen(false)}>إلغاء</button><button type="button" className="btn-outline-danger" disabled={deleteConfirmation.trim() !== deleteToken} onClick={() => void confirmRemove()}>تأكيد الحذف</button></div></div>}<button type="button" className="btn-outline-danger" onClick={requestRemove}>حذف الفيديو</button></> : <p className="studio-muted">جارٍ تحميل التفاصيل…</p>}{error && <p className="studio-form-error" role="alert">{error}</p>}</div></aside>;
};

const StudioVideosContent: React.FC = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState<{ results: StudioVideoSummary[]; total: number; page: number; pageSize: number }>({ results: [], total: 0, page: 1, pageSize: 20 });
  const [providers, setProviders] = useState<StudioVideoProviderOption[]>([]);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [addOpen, setAddOpen] = useState(() => params.get('add') === '1');
  const [detail, setDetail] = useState<StudioVideoSummary | null>(null);
  const [error, setError] = useState('');
  const query = params.get('q') || '';
  const status = params.get('status') || '';
  const provider = params.get('provider') || '';
  const sort = params.get('sort') || 'newest';
  const scope = params.get('scope') || 'own';
  const currentPage = Number(params.get('page') || 1);
  const queue = useUploadQueue(setJobs);
  const resumeUpload = useCallback((asset: StudioVideoSummary, event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file || !asset.pendingUpload) return; const validation = validateUploadFile(file, MAX_BYTES, Number.MAX_SAFE_INTEGER); if (validation) { setError(validation); return; } queue.current?.resumeExisting(file, asset.id, asset.pendingUpload); }, [queue]);
  const setFilter = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); if (key !== 'page') next.delete('page'); setParams(next); };
  const load = useCallback(() => fetchStudioVideoLibrary({ q: query, status, provider, sort, scope, page: currentPage }).then(setPage).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'تعذّر تحميل المكتبة.')), [query, status, provider, sort, scope, currentPage]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void fetchStudioVideoProviders().then(setProviders).catch(() => setProviders([])); }, []);
  useEffect(() => { const inFlight = page.results.some((asset) => ['uploading', 'processing'].includes(asset.status)); if (!inFlight || document.hidden) return; const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 2000); return () => window.clearInterval(timer); }, [page.results, load]);
  useEffect(() => { const listener = () => { if (!document.hidden) void load(); }; document.addEventListener('visibilitychange', listener); return () => document.removeEventListener('visibilitychange', listener); }, [load]);
  const canSeeAll = can(user, 'videos.manage_any');
  return <StudioShell><div className="studio-container studio-videos-page"><div className="studio-page-head"><div className="workspace-section-heading"><div><span>ورشة الفيديو</span><h2>مكتبة الفيديو</h2></div><div className="studio-head-actions">{can(user, 'videos.upload') && <button type="button" className="btn-gold" onClick={() => setAddOpen(true)}><Plus size={16} /> إضافة فيديو</button>}</div></div></div><div className="studio-toolbar studio-video-toolbar"><label className="studio-search-field"><Search size={16} /><input value={query} placeholder="ابحث في الفيديوهات…" onChange={(event) => setFilter('q', event.target.value)} /></label><select value={status} aria-label="تصفية حسب الحالة" onChange={(event) => setFilter('status', event.target.value)}><option value="">كل الحالات</option>{Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select value={provider} aria-label="تصفية حسب المزود" onChange={(event) => setFilter('provider', event.target.value)}><option value="">كل المزودين</option>{providers.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select><select value={sort} aria-label="ترتيب الفيديوهات" onChange={(event) => setFilter('sort', event.target.value)}><option value="newest">الأحدث</option><option value="oldest">الأقدم</option><option value="title">العنوان</option><option value="views">المشاهدات</option><option value="progress">التقدم</option></select>{canSeeAll && <select value={scope} aria-label="نطاق المكتبة" onChange={(event) => setFilter('scope', event.target.value)}><option value="own">فيديوهاتي</option><option value="all">كل الفيديوهات</option></select>}<div className="studio-view-toggle"><button type="button" className={params.get('view') !== 'list' ? 'is-active' : ''} onClick={() => setFilter('view', 'grid')}><Grid2X2 size={15} />شبكة</button><button type="button" className={params.get('view') === 'list' ? 'is-active' : ''} onClick={() => setFilter('view', 'list')}><List size={15} />قائمة</button></div></div>{jobs.length > 0 && <section className="studio-upload-queue" aria-live="polite"><div className="studio-panel-title"><strong>طابور الرفع</strong><span>حد أقصى ملفين بالتوازي</span></div>{jobs.filter((job) => !['done', 'cancelled'].includes(job.state)).map((job) => <div className="studio-upload-job" key={job.id}><span className="studio-upload-job-name">{job.file.name}</span><div className="studio-progress" role="progressbar" aria-valuenow={job.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${job.percent}%` }} /></div><span>{job.percent}% {job.etaSeconds ? `· ${job.etaSeconds}ث` : ''}</span><button type="button" onClick={() => job.state === 'paused' ? queue.current?.resume(job.id) : queue.current?.pause(job.id)}>{job.state === 'paused' ? 'متابعة' : 'إيقاف'}</button><button type="button" onClick={() => void queue.current?.cancel(job.id)}>إلغاء</button>{job.error && <small role="alert">{job.error}</small>}</div>)}</section>}{error && <p className="studio-form-error" role="alert">{error}</p>}{page.results.length ? <div className={params.get('view') === 'list' ? 'studio-video-list' : 'studio-video-grid'}>{page.results.map((asset) => <article className="studio-video-card" key={asset.id}><button type="button" className="studio-video-poster" onClick={() => setDetail(asset)} aria-label={`فتح تفاصيل ${asset.title}`}>{asset.posterUrl ? <img src={asset.posterUrl} alt="" /> : <Video size={30} />}<span className={`studio-video-status status-${asset.status}`}>{statusLabel(asset.status)}</span>{['uploading', 'processing'].includes(asset.status) && <span className="studio-video-card-progress">{asset.progress || 0}%</span>}</button><div className="studio-video-card-body"><div className="studio-video-card-heading"><h3>{asset.title || 'فيديو بلا عنوان'}</h3><button type="button" aria-label="فتح التفاصيل" onClick={() => setDetail(asset)}><MoreVertical size={16} /></button></div><div className="studio-video-badges"><span>{PROVIDER_LABELS[asset.provider || ''] || asset.provider || '—'}</span><span>{PROTECTION_LABELS[asset.protection] || '—'}</span></div><div className="studio-video-meta"><span>{duration(asset.durationSeconds)}</span><span>{bytes(asset.sizeBytes)}</span><span>{asset.viewCount || 0} مشاهدة</span></div><small className="studio-video-usage">مستخدم في {assetUsage(asset)} دروس</small>{asset.status === 'uploading' && asset.pendingUpload && <label className="btn-outline-blue studio-resume-upload">متابعة الرفع<input type="file" hidden accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.m4v,.webm,.mkv" onChange={(event) => resumeUpload(asset, event)} /></label>}</div></article>)}</div> : <div className="studio-empty studio-video-empty"><Video size={34} /><h2>لم تضف فيديوهات بعد</h2><p>ارفع ملفًا كبيرًا بأمان أو أضف رابط YouTube/Vimeo أو رابط HTTPS مباشر.</p><div><button type="button" className="btn-gold" onClick={() => setAddOpen(true)}><Upload size={16} /> رفع ملف</button><button type="button" className="btn-outline-blue" onClick={() => setAddOpen(true)}>إضافة رابط</button></div></div>}{page.total > page.pageSize && <nav className="studio-pagination" aria-label="صفحات مكتبة الفيديو"><button type="button" disabled={currentPage <= 1} onClick={() => setFilter('page', String(currentPage - 1))}>السابق</button><span>صفحة {currentPage} من {Math.ceil(page.total / page.pageSize)}</span><button type="button" disabled={currentPage >= Math.ceil(page.total / page.pageSize)} onClick={() => setFilter('page', String(currentPage + 1))}>التالي</button></nav>}{addOpen && <AddVideoDrawer providers={providers} onClose={() => setAddOpen(false)} onCreated={() => void load()} queue={queue} />}{detail && <VideoDetailDrawer asset={detail} onClose={() => setDetail(null)} onChanged={() => void load()} />}</div></StudioShell>;
};

export const StudioVideosPage: React.FC = () => <StudioProvider><StudioVideosContent /></StudioProvider>;
