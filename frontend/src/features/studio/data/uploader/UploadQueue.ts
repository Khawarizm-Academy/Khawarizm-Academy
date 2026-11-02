export type UploadJobState = 'queued' | 'initializing' | 'uploading' | 'paused' | 'completing' | 'done' | 'failed' | 'cancelled';
export interface UploadResumeSession { sessionId: string; fileName: string; total: number; chunkSize: number; offset: number; status?: string; progress?: number; firstChunkSha256: string; }
export interface UploadJob { id: string; file: File; assetId: string; sessionId?: string; offset: number; total: number; chunkSize: number; state: UploadJobState; percent: number; speed: number; etaSeconds: number | null; retries: number; firstChunkSha256?: string; error?: string; durationSeconds?: number; }
export interface UploadTransport {
  init(assetId: string, input: { fileName: string; sizeBytes: number; mimeType: string; firstChunkSha256: string; packaging?: string }): Promise<{ sessionId: string; chunkSize: number; offset: number; total?: number; fileName?: string; firstChunkSha256?: string }>;
  status(sessionId: string): Promise<{ offset: number; total?: number; chunkSize?: number; status?: string; fileName?: string; firstChunkSha256?: string }>;
  chunk(sessionId: string, body: Blob, start: number, end: number, total: number): Promise<{ offset: number; complete?: boolean }>;
  complete(sessionId: string, durationSeconds?: number): Promise<unknown>;
  cancel(sessionId: string): Promise<unknown>;
}
export interface UploadQueueOptions { transport: UploadTransport; maxConcurrent?: number; now?: () => number; sleep?: (ms: number) => Promise<void>; onChange?: (jobs: UploadJob[]) => void; }

const MAX_RETRIES = 8;
const MAX_BACKOFF = 30_000;
const DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const ARABIC_RETRY = 'تعذّر الاتصال مؤقتًا. ستُستأنف المحاولة تلقائيًا.';
const ARABIC_OFFLINE = 'لا يوجد اتصال — أوقفنا الرفع مؤقتًا.';
const ARABIC_FILE_MISMATCH = 'الملف المحدد لا يطابق جلسة الرفع من حيث الاسم أو الحجم أو بصمة المقطع الأول. لم نرسل أي مقطع جديد.';
const ARABIC_FINGERPRINT_UNAVAILABLE = 'لا يمكن متابعة جلسة الرفع بأمان لأن بصمة المقطع الأول غير متاحة. ابدأ رفعًا جديدًا.';

export function rollingSpeed(samples: Array<{ at: number; bytes: number }>, now = Date.now()): number {
  const recent = samples.filter((sample) => now - sample.at <= 5000);
  if (recent.length < 2) return 0;
  const first = recent[0]; const last = recent[recent.length - 1];
  return Math.max(0, (last.bytes - first.bytes) / Math.max(1, (last.at - first.at) / 1000));
}
export function etaSeconds(offset: number, total: number, speed: number): number | null { return speed > 0 ? Math.max(0, Math.ceil((total - offset) / speed)) : null; }
export async function sha256FirstChunk(file: Blob, chunkSize = DEFAULT_CHUNK_SIZE): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) throw new Error('تعذّر التحقق من بصمة الملف في هذا المتصفح.');
  const digest = await crypto.subtle.digest('SHA-256', await file.slice(0, Math.min(file.size, chunkSize)).arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
function backoff(retry: number, retryAfter?: number): number { if (retryAfter !== undefined) return Math.min(MAX_BACKOFF, Math.max(0, retryAfter)); const base = Math.min(MAX_BACKOFF, 500 * (2 ** Math.max(0, retry - 1))); return Math.min(MAX_BACKOFF, Math.round(base * (0.75 + Math.random() * 0.5))); }
function responseStatus(error: unknown): number | undefined { return typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: number }).status) : undefined; }
function retryAfterMs(error: unknown, now = Date.now()): number | undefined {
  const raw = typeof error === 'object' && error !== null && 'retryAfter' in error
    ? (error as { retryAfter?: number | string }).retryAfter
    : undefined;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw * 1000 : undefined;
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const value = raw.trim();
  if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value) * 1000;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - now) : undefined;
}
function messageFor(error: unknown): string { return typeof error === 'object' && error !== null && 'message' in error ? String((error as { message?: string }).message || ARABIC_RETRY) : ARABIC_RETRY; }

export function validateUploadFile(file: File, maxBytes: number, remainingQuota: number): string | null {
  const extension = file.name.toLowerCase().split('.').pop() || '';
  if (!['mp4', 'mov', 'm4v', 'webm', 'mkv'].includes(extension)) return 'صيغة الفيديو غير مدعومة. استخدم MP4 أو MOV أو WebM أو MKV.';
  if (file.size <= 0 || file.size > maxBytes) return 'حجم الفيديو يتجاوز الحد المسموح به.';
  if (file.size > remainingQuota) return 'لا تكفي الحصة المتبقية لهذا الفيديو.';
  return null;
}

export async function readVideoDuration(file: File): Promise<number> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return 0;
  return new Promise((resolve) => {
    const element = document.createElement('video'); const source = URL.createObjectURL(file); let settled = false;
    const finish = (value: number) => { if (settled) return; settled = true; URL.revokeObjectURL(source); element.remove(); resolve(Number.isFinite(value) && value > 0 ? Math.min(43200, Math.round(value)) : 0); };
    element.preload = 'metadata'; element.onloadedmetadata = () => finish(element.duration); element.onerror = () => finish(0); element.src = source; element.load();
  });
}

export class UploadQueue {
  private readonly jobs = new Map<string, UploadJob>();
  private readonly controllers = new Map<string, AbortController>();
  private readonly samples = new Map<string, Array<{ at: number; bytes: number }>>();
  private readonly transport: UploadTransport; private readonly maxConcurrent: number; private readonly now: () => number; private readonly sleep: (ms: number) => Promise<void>; private readonly onChange?: (jobs: UploadJob[]) => void;
  private active = 0; private offline = typeof navigator !== 'undefined' && navigator.onLine === false; private destroyed = false;
  constructor(options: UploadQueueOptions) {
    this.transport = options.transport; this.maxConcurrent = Math.max(1, options.maxConcurrent ?? 2); this.now = options.now ?? Date.now; this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))); this.onChange = options.onChange;
    if (typeof window !== 'undefined') { window.addEventListener('online', this.handleOnline); window.addEventListener('offline', this.handleOffline); window.addEventListener('beforeunload', this.handleBeforeUnload); }
  }
  private handleOnline = () => { this.offline = false; this.jobs.forEach((job) => { if (job.state === 'paused' && job.error === ARABIC_OFFLINE) { job.state = 'queued'; job.error = undefined; } }); this.emit(); this.pump(); };
  private handleOffline = () => { this.offline = true; this.jobs.forEach((job) => { if (job.state === 'uploading' || job.state === 'initializing' || job.state === 'completing') { job.state = 'paused'; job.error = ARABIC_OFFLINE; } }); this.emit(); };
  private handleBeforeUnload = (event: BeforeUnloadEvent) => { if ([...this.jobs.values()].some((job) => ['queued', 'initializing', 'uploading', 'paused', 'completing'].includes(job.state))) { event.preventDefault(); event.returnValue = 'يوجد رفع جارٍ.'; } };
  private emit() { this.onChange?.([...this.jobs.values()].map((job) => ({ ...job }))); }
  list(): UploadJob[] { return [...this.jobs.values()].map((job) => ({ ...job })); }
  add(file: File, assetId: string, options: { packaging?: string; durationSeconds?: number } = {}): string {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; this.jobs.set(id, { id, file, assetId, offset: 0, total: file.size, chunkSize: 0, state: 'queued', percent: 0, speed: 0, etaSeconds: null, retries: 0, durationSeconds: options.durationSeconds }); this.emit(); this.pump(options.packaging); return id;
  }
  resumeExisting(file: File, assetId: string, session: UploadResumeSession): string {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    this.jobs.set(id, { id, file, assetId, sessionId: session.sessionId, offset: session.offset, total: file.size, chunkSize: session.chunkSize, state: 'queued', percent: Math.min(100, Math.round(session.offset * 100 / Math.max(1, file.size))), speed: 0, etaSeconds: null, retries: 0, firstChunkSha256: session.firstChunkSha256 });
    this.emit(); this.pump(); return id;
  }
  pause(id: string) { const job = this.jobs.get(id); if (!job || ['done', 'failed', 'cancelled'].includes(job.state)) return; job.state = 'paused'; this.controllers.get(id)?.abort(); this.emit(); }
  resume(id: string) { const job = this.jobs.get(id); if (!job || ['done', 'failed', 'cancelled'].includes(job.state)) return; job.error = undefined; job.state = 'queued'; this.emit(); this.pump(); }
  async cancel(id: string) { const job = this.jobs.get(id); if (!job) return; this.controllers.get(id)?.abort(); if (job.sessionId) { try { await this.transport.cancel(job.sessionId); } catch { /* best effort; the server remains authoritative */ } } job.state = 'cancelled'; job.error = undefined; this.emit(); }
  destroy() { this.destroyed = true; this.jobs.forEach((job) => this.controllers.get(job.id)?.abort()); if (typeof window !== 'undefined') { window.removeEventListener('online', this.handleOnline); window.removeEventListener('offline', this.handleOffline); window.removeEventListener('beforeunload', this.handleBeforeUnload); } }
  private pump(packaging?: string) { while (!this.destroyed && !this.offline && this.active < this.maxConcurrent) { const next = [...this.jobs.values()].find((job) => job.state === 'queued'); if (!next) break; this.active += 1; void this.run(next, packaging).finally(() => { this.active -= 1; this.pump(packaging); }); } }
  private async verifySessionFile(job: UploadJob, status: Awaited<ReturnType<UploadTransport['status']>>) {
    if (status.fileName !== job.file.name || status.total !== job.file.size) throw new Error(ARABIC_FILE_MISMATCH);
    if (!status.firstChunkSha256) throw new Error(ARABIC_FINGERPRINT_UNAVAILABLE);
    const hash = await sha256FirstChunk(job.file, status.chunkSize || job.chunkSize || DEFAULT_CHUNK_SIZE);
    if (hash !== status.firstChunkSha256.toLowerCase()) throw new Error(ARABIC_FILE_MISMATCH);
    job.firstChunkSha256 = hash;
  }
  private async run(job: UploadJob, packaging?: string) {
    const controller = new AbortController(); this.controllers.set(job.id, controller);
    try {
      job.state = 'initializing'; this.emit();
      if (!job.sessionId) {
        const firstChunkSha256 = await sha256FirstChunk(job.file, DEFAULT_CHUNK_SIZE); job.firstChunkSha256 = firstChunkSha256;
        const init = await this.transport.init(job.assetId, { fileName: job.file.name, sizeBytes: job.file.size, mimeType: job.file.type || 'video/mp4', firstChunkSha256, packaging });
        job.sessionId = init.sessionId; job.chunkSize = init.chunkSize; job.offset = init.offset; job.total = init.total || job.total;
      }
      const status = await this.transport.status(job.sessionId);
      await this.verifySessionFile(job, status);
      job.offset = status.offset; job.chunkSize = status.chunkSize || job.chunkSize; job.total = status.total || job.total; this.emit();
      job.state = 'uploading'; const samples = this.samples.get(job.id) || [{ at: this.now(), bytes: job.offset }]; this.samples.set(job.id, samples);
      while (job.offset < job.total) {
        if (this.offline || job.state === 'paused' || controller.signal.aborted) { job.state = 'paused'; job.error ??= ARABIC_OFFLINE; this.emit(); return; }
        const start = job.offset; const end = Math.min(job.total, start + job.chunkSize) - 1; const body = job.file.slice(start, end + 1);
        try {
          const result = await this.transport.chunk(job.sessionId, body, start, end, job.total); job.offset = Math.max(job.offset, result.offset); job.retries = 0; samples.push({ at: this.now(), bytes: job.offset }); while (samples.length > 20 && this.now() - samples[0].at > 5000) samples.shift(); job.speed = rollingSpeed(samples, this.now()); job.etaSeconds = etaSeconds(job.offset, job.total, job.speed); job.percent = Math.min(100, Math.round(job.offset * 100 / job.total)); this.emit();
        } catch (error) {
          const statusCode = responseStatus(error);
          if (statusCode === 409 || (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'offset_mismatch')) { const server = await this.transport.status(job.sessionId); job.offset = server.offset; job.percent = Math.min(100, Math.round(job.offset * 100 / job.total)); this.emit(); continue; }
          if (statusCode === 429 || statusCode === undefined || RETRYABLE.has(statusCode)) { if (job.retries >= MAX_RETRIES) throw new Error('انتهت محاولات الرفع. حاول متابعة الرفع لاحقًا.', { cause: error }); job.retries += 1; job.state = 'paused'; job.error = messageFor(error); this.emit(); const retryAfter = statusCode === 429 ? retryAfterMs(error, this.now()) : undefined; await this.sleep(backoff(job.retries, retryAfter)); if (!this.offline && !controller.signal.aborted) { job.state = 'uploading'; job.error = undefined; this.emit(); } continue; }
          throw error;
        }
      }
      job.state = 'completing'; this.emit(); await this.transport.complete(job.sessionId, job.durationSeconds); job.state = 'done'; job.percent = 100; job.speed = 0; job.etaSeconds = 0; job.error = undefined; this.emit();
    } catch (error) { if (controller.signal.aborted && job.state === 'paused') return; job.state = 'failed'; job.error = messageFor(error); this.emit(); } finally { this.controllers.delete(job.id); }
  }
}
