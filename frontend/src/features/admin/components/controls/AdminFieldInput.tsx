import React from 'react';
import type { AdminField, AdminFieldKind } from '@/features/admin/types';
import { AdminToggle } from '@/features/admin/components/controls/AdminToggle';

export type AdminFormValue = string | boolean;

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

const FieldShell: React.FC<{ field: AdminField; children: React.ReactNode }> = ({ field, children }) => (
  <div className="admin-field">
    <label className="admin-field-label" htmlFor={fieldId(field)}>
      {field.label}
      {field.required && (
        <span className="admin-required" aria-hidden="true">
          *
        </span>
      )}
    </label>
    {children}
  </div>
);

const textField = (type: 'text' | 'url'): FieldRender => ({ field, value, disabled, readOnly, onChange }) => (
  <FieldShell field={field}>
    <input
      id={fieldId(field)}
      type={type}
      dir={type === 'url' ? 'ltr' : undefined}
      className={readOnly ? 'admin-input admin-input-readonly' : 'admin-input'}
      value={String(value ?? '')}
      disabled={disabled}
      readOnly={readOnly}
      onChange={(event) => onChange(event.target.value)}
    />
  </FieldShell>
);

const numberField = (step: string): FieldRender => ({ field, value, disabled, onChange }) => (
  <FieldShell field={field}>
    <input
      id={fieldId(field)}
      type="number"
      step={step}
      dir="ltr"
      className="admin-input"
      value={String(value ?? '')}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  </FieldShell>
);

const textareaField: FieldRender = ({ field, value, disabled, onChange }) => (
  <FieldShell field={field}>
    <textarea
      id={fieldId(field)}
      className="admin-textarea"
      value={String(value ?? '')}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  </FieldShell>
);

const jsonField: FieldRender = ({ field, value, disabled, onChange }) => (
  <FieldShell field={field}>
    <textarea
      id={fieldId(field)}
      dir="ltr"
      className="admin-textarea admin-textarea-code"
      spellCheck={false}
      value={String(value ?? '')}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  </FieldShell>
);

const selectField: FieldRender = ({ field, value, disabled, onChange }) => (
  <FieldShell field={field}>
    <select
      id={fieldId(field)}
      className="admin-select admin-select-full"
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
  </FieldShell>
);

const boolField: FieldRender = ({ field, value, disabled, onChange }) => (
  <div className="admin-field">
    <AdminToggle label={field.label} checked={Boolean(value)} disabled={disabled} onChange={onChange} />
  </div>
);

const FIELD_RENDERERS: Record<AdminFieldKind, FieldRender> = {
  text: textField('text'),
  url: textField('url'),
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
