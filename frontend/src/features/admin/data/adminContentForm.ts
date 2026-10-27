import type { AdminField } from '@/features/admin/types';

export type AdminFormValue = string | boolean;

/** The reading order of an editor plate: required → prose → structured values. */
export const FIELD_GROUP_ORDER = ['required', 'prose', 'structured'] as const;

export type FieldGroupKey = (typeof FIELD_GROUP_ORDER)[number];

/** Arabic plate titles identical across every schema form. */
export const FIELD_GROUP_LABELS: Record<FieldGroupKey, string> = {
  required: 'البيانات الأساسية',
  prose: 'التفاصيل والوصف',
  structured: 'بيانات تقنية',
};

const PROSE_KINDS: AdminField['kind'][] = ['text', 'textarea', 'url', 'select'];

/**
 * Split a schema into the editor's stacks: what must exist before saving, the
 * descriptive prose fields, then numbers / toggles / JSON. Data-driven, so a
 * new backend schema needs no editor change.
 */
export const groupEditorFields = (fields: AdminField[]): Record<FieldGroupKey, AdminField[]> => {
  const groups: Record<FieldGroupKey, AdminField[]> = { required: [], prose: [], structured: [] };
  for (const field of fields) {
    const bucket = ((): FieldGroupKey => {
      if (field.required) return 'required';
      return PROSE_KINDS.includes(field.kind) ? 'prose' : 'structured';
    })();
    groups[bucket].push(field);
  }
  return groups;
};

function toFormValue(field: AdminField, raw: unknown): AdminFormValue {
  if (field.kind === 'bool') return Boolean(raw);
  if (field.kind === 'json') return raw == null ? '' : JSON.stringify(raw, null, 2);
  if (raw === null || raw === undefined) return '';
  return String(raw);
}

export const emptyFormValues = (fields: AdminField[]): Record<string, AdminFormValue> =>
  Object.fromEntries(fields.map((field) => [field.name, toFormValue(field, undefined)]));

export const toFormValues = (fields: AdminField[], source: Record<string, unknown>): Record<string, AdminFormValue> =>
  Object.fromEntries(fields.map((field) => [field.name, toFormValue(field, source[field.name])]));

interface PayloadResult {
  payload: Record<string, unknown>;
  error: string | null;
}

/** What blocks moving to the next step: a required field the step still leaves empty. */
export function stepGuardError(
  fields: AdminField[],
  formValues: Record<string, AdminFormValue>
): string | null {
  for (const field of fields) {
    if (!field.required || field.kind === 'bool') continue;
    if (String(formValues[field.name] ?? '').trim() !== '') continue;
    return `الحقل «${field.label}» إلزامي — أكمله قبل الانتقال إلى الخطوة التالية.`;
  }
  return null;
}

/** Turn form values into a payload; creates require non-empty, edits clear text-like fields when empty. */
export function toPayloadValues(
  fields: AdminField[],
  formValues: Record<string, AdminFormValue>,
  isCreate: boolean
): PayloadResult {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    // Read-only fields (the account email) are set once and never sent back.
    if (field.readonly && !isCreate) continue;
    const value = formValues[field.name];
    if (field.kind === 'bool') {
      payload[field.name] = Boolean(value);
      continue;
    }
    const text = typeof value === 'string' ? value.trim() : '';
    if (text === '') {
      if (isCreate) {
        if (field.required) {
          return { payload: {}, error: `الحقل «${field.label}» مطلوب.` };
        }
        continue;
      }
      if (field.kind === 'text' || field.kind === 'textarea' || field.kind === 'url' || field.kind === 'select') {
        payload[field.name] = '';
      }
      continue;
    }
    if (field.kind === 'json') {
      try {
        payload[field.name] = JSON.parse(text);
      } catch {
        return { payload: {}, error: `صيغة JSON غير صالحة في «${field.label}».` };
      }
      continue;
    }
    if (field.kind === 'number' || field.kind === 'decimal') {
      const parsed = Number(text);
      if (Number.isNaN(parsed)) {
        return { payload: {}, error: `قيمة غير صالحة في «${field.label}».` };
      }
      payload[field.name] = parsed;
      continue;
    }
    payload[field.name] = text;
  }
  return { payload, error: null };
}
