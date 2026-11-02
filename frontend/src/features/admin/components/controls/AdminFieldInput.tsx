import React, { useEffect, useState } from 'react';
import type { AdminField, AdminFieldKind } from '@/features/admin/types';
import type { AdminFormValue, AdminUserRefValue } from '@/features/admin/data/adminContentForm';
import { AdminToggle } from '@/features/admin/components/controls/AdminToggle';
import { fieldIcon } from '@/features/admin/data/fieldIcons';
import { fetchUsers } from '@/features/admin/data/adminFetchers';
import type { AdminUserRow } from '@/features/admin/types';

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

/** Async user reference picker; selected values retain a label while submitting only the id. */
const userRefField: FieldRender = ({ field, value, disabled, onChange }) => (
  <UserRefField field={field} value={value} disabled={disabled} onChange={onChange} />
);

const UserRefField: React.FC<AdminFieldInputProps> = ({ field, value, disabled, onChange }) => {
  const selected = typeof value === 'object' && value !== null ? value : null;
  const selectedId = selected ? selected.id : typeof value === 'string' ? value : '';
  const [query, setQuery] = useState(selected?.label ?? selectedId);
  const [results, setResults] = useState<AdminUserRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed === selected?.label) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setIsSearching(true);
      void fetchUsers({ q: trimmed, page: 1 })
        .then((page) => {
          if (active) setResults(page.results);
        })
        .catch(() => {
          if (active) setResults([]);
        })
        .finally(() => {
          if (active) setIsSearching(false);
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, selected?.label]);

  return (
    <div className="admin-field">
      <FieldLabel field={field} />
      <div className="relative">
        <input
          id={fieldId(field)}
          type="search"
          className="admin-input"
          value={query}
          disabled={disabled}
          dir="auto"
          aria-autocomplete="list"
          aria-controls={`${fieldId(field)}-results`}
          onChange={(event) => {
            setQuery(event.target.value);
            setResults([]);
            setIsSearching(false);
            if (selectedId) onChange('');
          }}
        />
        {isSearching && <span className="sr-only" role="status" aria-live="polite">{field.label}</span>}
        {results.length > 0 && (
          <div id={`${fieldId(field)}-results`} className="admin-autocomplete" role="listbox" aria-label={field.label}>
            {results.map((result) => {
              const label = result.fullName || result.email;
              const nextValue: AdminUserRefValue = { id: result.id, label };
              return (
                <button
                  key={result.id}
                  type="button"
                  role="option"
                  aria-selected={result.id === selectedId}
                  className="admin-autocomplete-option"
                  onClick={() => {
                    setQuery(label);
                    setResults([]);
                    onChange(nextValue);
                  }}
                >
                  <span>{label}</span>
                  <bdi dir="ltr">{result.email}</bdi>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const FIELD_RENDERERS: Record<AdminFieldKind, FieldRender> = {
  text: textLikeField('text'),
  url: textLikeField('url'),
  textarea: textareaField,
  number: numberField('1'),
  decimal: numberField('0.01'),
  bool: boolField,
  select: selectField,
  json: jsonField,
  user_ref: userRefField,
};

/** Schema-driven single field input, keyed by `field.kind`. */
export const AdminFieldInput: React.FC<AdminFieldInputProps> = (props) => {
  const Renderer = FIELD_RENDERERS[props.field.kind];
  return <>{Renderer(props)}</>;
};
