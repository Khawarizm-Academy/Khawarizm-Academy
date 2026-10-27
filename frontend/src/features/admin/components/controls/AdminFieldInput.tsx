import React from 'react';
import type { AdminField, AdminFieldKind } from '@/features/admin/types';
import type { AdminFormValue } from '@/features/admin/data/adminContentForm';
import { AdminToggle } from '@/features/admin/components/controls/AdminToggle';
import { fieldIcon } from '@/features/admin/data/fieldIcons';

export type { AdminFormValue };

interface AdminFieldInputProps {
  field: AdminField;
  value: AdminFormValue | undefined;
  disabled?: boolean;
  /** Blocks editing a field the server marks read-only (never sent back). */
  readOnly?: boolean;
  onChange: (value: AdminFormValue) => void;
}

type FieldRender = (props: AdminFieldInputProps) => React.ReactNode;

const fieldId = (field: AdminField) => `admin-field-${field.name}`;

/** Values that read left-to-right even inside this RTL console: codes and Latin text. */
const LTR_NAMES = new Set(['email', 'url', 'link', 'imageUrl', 'slug', 'key', 'phone', 'timezone']);
const LTR_KINDS: AdminFieldKind[] = ['number', 'decimal', 'json'];

const isLtrField = (field: AdminField): boolean =>
  LTR_NAMES.has(field.name) || LTR_KINDS.includes(field.kind);

/** Small typing aids for the Latin-format inputs; everything else stays bare. */
const PLACEHOLDERS: Record<string, string> = {
  email: 'name@example.com',
  url: 'https://…',
  slug: 'example-course-code',
};

/** The labeled icon above every field, so the schema reads like a real editor. */
const FieldLabel: React.FC<{ field: AdminField }> = ({ field }) => (
  <label className="admin-field-label" htmlFor={fieldId(field)}>
    {React.createElement(fieldIcon(field), { size: 13, className: 'admin-field-label-icon' })}
    <span>{field.label}</span>
    {field.required && (
      <span className="admin-required" aria-hidden="true">
        *
      </span>
    )}
  </label>
);

/** Arabic-text inputs keep the icon on the start edge; Latin ones open LTR cleanly. */
const textLikeField = (type: 'text' | 'url'): FieldRender => ({ field, value, disabled, readOnly, onChange }) => {
  const ltr = isLtrField(field);
  return (
    <div className="admin-field">
      <FieldLabel field={field} />
      <div className="relative">
        {!ltr && (
          <span className="admin-field-glyph">
            {React.createElement(fieldIcon(field), { size: 15 })}
          </span>
        )}
        <input
          id={fieldId(field)}
          type={type}
          dir={ltr ? 'ltr' : undefined}
          placeholder={PLACEHOLDERS[field.name] ?? undefined}
          className={`admin-input ${ltr ? 'text-left' : 'ps-10'}`}
          value={String(value ?? '')}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
};

const numberField = (step: string): FieldRender => ({ field, value, disabled, onChange }) => (
  <div className="admin-field">
    <FieldLabel field={field} />
    <input
      id={fieldId(field)}
      type="number"
      step={step}
      dir="ltr"
      className="admin-input text-left"
      value={String(value ?? '')}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);

const textareaField: FieldRender = ({ field, value, disabled, onChange }) => (
  <div className="admin-field sm:col-span-2">
    <FieldLabel field={field} />
    <textarea
      id={fieldId(field)}
      className="admin-textarea"
      value={String(value ?? '')}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);

const jsonField: FieldRender = ({ field, value, disabled, onChange }) => (
  <div className="admin-field sm:col-span-2">
    <FieldLabel field={field} />
    <textarea
      id={fieldId(field)}
      dir="ltr"
      className="admin-textarea admin-textarea-code"
      spellCheck={false}
      value={String(value ?? '')}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);

const selectField: FieldRender = ({ field, value, disabled, onChange }) => (
  <div className="admin-field">
    <FieldLabel field={field} />
    <select
      id={fieldId(field)}
      className="admin-input"
      value={String(value ?? '')}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">—</option>
      {(field.options ?? []).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const boolField: FieldRender = ({ field, value, disabled, onChange }) => (
  <AdminToggle label={field.label} checked={Boolean(value)} disabled={disabled} onChange={onChange} />
);

const FIELD_RENDERERS: Record<AdminFieldKind, FieldRender> = {
  text: textLikeField('text'),
  url: textLikeField('url'),
  textarea: textareaField,
  number: numberField('1'),
  decimal: numberField('0.01'),
  bool: boolField,
  select: selectField,
  json: jsonField,
};

/** Schema-driven single field input, keyed by `field.kind`. */
export const AdminFieldInput: React.FC<AdminFieldInputProps> = (props) => {
  const Renderer = FIELD_RENDERERS[props.field.kind];
  return <>{Renderer(props)}</>;
};
