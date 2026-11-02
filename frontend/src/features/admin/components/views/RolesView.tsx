import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Copy,
  GripVertical,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useLocation } from '@/app/routerContext';
import { useAuth } from '@/features/auth/context/authContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { ApiError } from '@/shared/lib/apiClient';
import { can, type PermissionKey } from '@/shared/lib/permissions';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';
import { formatCount, formatDateTime } from '@/features/admin/data/adminFormatters';
import {
  addRoleMembers,
  createRole,
  deleteRole,
  fetchRole,
  fetchRoleCatalog,
  fetchRoleMembers,
  fetchRoles,
  reorderRoles,
  removeRoleMember,
  updateRole,
} from '@/features/admin/data/roleFetchers';
import type { AuthUser } from '@/features/auth/types';
import type {
  AdminRole,
  RoleCatalog,
  RoleCreateInput,
  RoleMember,
  RoleMembersPage,
  RolePermission,
} from '@/features/admin/types';
import roleCopy from '@/features/admin/data/roleCopy.json';

const DEFAULT_ROLE_COLOR = 'var(--color-gold-400)';
type EditorTab = 'overview' | 'permissions' | 'members' | 'advanced';

const tabLabels: Record<EditorTab, string> = {
  overview: roleCopy.overviewTab,
  permissions: roleCopy.permissionsTab,
  members: roleCopy.membersTab,
  advanced: roleCopy.advancedTab,
};

const interpolate = (value: string, replacements: Record<string, string | number>): string =>
  Object.entries(replacements).reduce((result, [key, replacement]) => result.replace(`{${key}}`, String(replacement)), value);

const blankRole = (catalog: RoleCatalog | null): RoleCreateInput => ({
  name: '',
  color: catalog?.colors[0] ?? DEFAULT_ROLE_COLOR,
  description: '',
  permissions: [],
});

interface RoleListProps {
  roles: AdminRole[];
  selectedSlug: string | null;
  onSelect: (role: AdminRole) => void;
  onReorder: (from: number, to: number) => void;
}

/** Searchable role list with pointer and Alt+arrow keyboard reordering. */
export const RoleList: React.FC<RoleListProps> = ({ roles, selectedSlug, onSelect, onReorder }) => {
  const [query, setQuery] = useState('');
  const [liveMessage, setLiveMessage] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleRoles = roles.filter((role) => role.name.toLocaleLowerCase().includes(normalizedQuery));

  const move = (from: number, delta: number) => {
    const to = from + delta;
    if (to < 0 || to >= roles.length || roles[from].isDefault || roles[to].isDefault) return;
    onReorder(from, to);
    setLiveMessage(interpolate(roleCopy.movedRole, { rank: to + 1 }));
  };

  return (
    <div className="role-list-panel">
      <label className="admin-field-label" htmlFor="role-search">
        <Search size={14} aria-hidden="true" />
        {roleCopy.roleSearchPlaceholder}
      </label>
      <input
        id="role-search"
        className="admin-input"
        type="search"
        value={query}
        placeholder={roleCopy.roleSearchPlaceholder}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="role-list" aria-label={roleCopy.roleListLabel}>
        {visibleRoles.map((role) => {
          const index = roles.findIndex((item) => item.id === role.id);
          const canMove = !role.isSystem && !role.isDefault;
          return (
            <div
              key={role.id}
              className={`role-list-item ${role.slug === selectedSlug ? 'role-list-item-selected' : ''}`}
              draggable={canMove}
              onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const from = Number(event.dataTransfer.getData('text/plain'));
                if (Number.isInteger(from)) onReorder(from, index);
              }}
            >
              <button
                type="button"
                className="role-drag-handle"
                aria-label={interpolate(roleCopy.moveRole, { role: role.name })}
                disabled={!canMove}
                onKeyDown={(event) => {
                  if (!event.altKey) return;
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    move(index, -1);
                  }
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    move(index, 1);
                  }
                }}
              >
                <GripVertical size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="role-list-main"
                onClick={() => onSelect(role)}
                aria-current={role.slug === selectedSlug ? 'page' : undefined}
              >
                <span className="role-color-dot" style={{ backgroundColor: role.color }} aria-hidden="true" />
                <span className="role-list-copy">
                  <strong>{role.name}</strong>
                  <small>{interpolate(roleCopy.memberCount, { count: formatCount(role.memberCount) })}</small>
                </span>
                {role.isSystem && <Lock size={14} aria-label={roleCopy.systemRole} />}
              </button>
            </div>
          );
        })}
      </div>
      <p className="role-list-hint">{roleCopy.roleListHint}</p>
      <div className="sr-only" aria-live="polite">{liveMessage}</div>
    </div>
  );
};

interface PermissionToggleProps {
  permission: RolePermission;
  checked: boolean;
  impliedBy?: string;
  canGrant: boolean;
  onChange: (checked: boolean) => void;
}

/** A permission switch that makes both elevation and implied access explicit. */
export const PermissionToggle: React.FC<PermissionToggleProps> = ({
  permission,
  checked,
  impliedBy,
  canGrant,
  onChange,
}) => {
  const disabled = Boolean(impliedBy) || !canGrant;
  const helper = impliedBy ? interpolate(roleCopy.impliedBy, { role: impliedBy }) : permission.description;
  return (
    <div
      className={`permission-toggle ${disabled ? 'permission-toggle-disabled' : ''}`}
      title={!canGrant && !impliedBy ? roleCopy.cannotGrant : undefined}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={permission.label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`permission-switch ${checked ? 'permission-switch-on' : ''}`}
      >
        <span />
      </button>
      <span className="permission-copy">
        <strong>{permission.label}</strong>
        <small>{helper}</small>
      </span>
      {permission.elevated && <span className="permission-elevated">{roleCopy.elevated}</span>}
      {impliedBy && <Lock size={14} aria-label={roleCopy.lockedPermission} />}
    </div>
  );
};

interface RolePermissionsTabProps {
  catalog: RoleCatalog;
  role: AdminRole;
  draft: PermissionKey[];
  actor: AuthUser;
  onChange: (permissions: PermissionKey[]) => void;
}

export const RolePermissionsTab: React.FC<RolePermissionsTabProps> = ({ catalog, role, draft, actor, onChange }) => {
  const [query, setQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const selected = new Set(draft);
  const allPermissions = catalog.groups.flatMap((group) => group.permissions);
  const canGrant = (key: PermissionKey) => can(actor, key);
  const impliedBy = (key: PermissionKey): string | undefined =>
    allPermissions.find((permission) => selected.has(permission.key) && permission.implies.includes(key))?.label;
  const toggle = (key: PermissionKey, checked: boolean) =>
    onChange(checked ? [...new Set([...draft, key])] : draft.filter((item) => item !== key));
  const filteredGroups = catalog.groups
    .map((group) => ({
      ...group,
      permissions: group.permissions.filter((permission) =>
        `${permission.label} ${permission.key}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())
      ),
    }))
    .filter((group) => group.permissions.length > 0);

  const toggleAdministrator = () => {
    if (draft.includes('administrator')) {
      toggle('administrator', false);
      return;
    }
    if (window.confirm(`${roleCopy.confirmAdministrator}: ${roleCopy.administratorWarning}`)) {
      toggle('administrator', true);
    }
  };

  return (
    <div className="permissions-tab">
      {can(actor, 'administrator') && (
        <button
          type="button"
          className="administrator-toggle"
          aria-pressed={draft.includes('administrator')}
          onClick={toggleAdministrator}
        >
          <ShieldCheck size={16} aria-hidden="true" />
          <span>
            <strong>{roleCopy.administratorLabel}</strong>
            <small>{roleCopy.administratorWarning}</small>
          </span>
          <span className="permission-elevated">{roleCopy.danger}</span>
        </button>
      )}
      <div className="permissions-toolbar">
        <label className="admin-search">
          <Search size={15} aria-hidden="true" />
          <input
            aria-label={roleCopy.permissionSearchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={roleCopy.permissionSearchPlaceholder}
          />
        </label>
        <strong>{interpolate(roleCopy.permissionCount, { selected: formatCount(draft.length), total: formatCount(allPermissions.length) })}</strong>
      </div>
      {filteredGroups.map((group) => {
        const grantable = group.permissions.filter((permission) => canGrant(permission.key));
        const allOn = grantable.length > 0 && grantable.every((permission) => selected.has(permission.key));
        const collapsed = collapsedGroups.has(group.key);
        return (
          <fieldset key={group.key} className="permission-group">
            <legend>
              <button
                type="button"
                className="permission-group-toggle"
                aria-expanded={!collapsed}
                onClick={() => {
                  setCollapsedGroups((current) => {
                    const next = new Set(current);
                    if (next.has(group.key)) next.delete(group.key);
                    else next.add(group.key);
                    return next;
                  });
                }}
              >
                <ChevronDown size={15} aria-hidden="true" />
                {group.label}
                <span>{interpolate(roleCopy.permissionCount, { selected: group.permissions.filter((permission) => selected.has(permission.key)).length, total: group.permissions.length })}</span>
              </button>
              <button
                type="button"
                className="admin-ghost-btn"
                disabled={!grantable.length}
                onClick={() => {
                  const next = allOn
                    ? draft.filter((key) => !grantable.some((permission) => permission.key === key))
                    : [...new Set([...draft, ...grantable.map((permission) => permission.key)])];
                  onChange(next);
                }}
              >
                {allOn ? roleCopy.disableAll : roleCopy.enableAll}
              </button>
            </legend>
            {!collapsed && group.permissions.map((permission) => (
              <PermissionToggle
                key={permission.key}
                permission={permission}
                checked={selected.has(permission.key) || Boolean(impliedBy(permission.key))}
                impliedBy={impliedBy(permission.key)}
                canGrant={canGrant(permission.key)}
                onChange={(checked) => toggle(permission.key, checked)}
              />
            ))}
          </fieldset>
        );
      })}
      {role.isSystem && role.slug === 'admin' && <p className="role-list-hint">{roleCopy.systemRole}</p>}
    </div>
  );
};

interface CreateRoleModalProps {
  catalog: RoleCatalog;
  onClose: () => void;
  onCreate: (input: RoleCreateInput) => Promise<void>;
}

export const CreateRoleModal: React.FC<CreateRoleModalProps> = ({ catalog, onClose, onCreate }) => {
  const [draft, setDraft] = useState<RoleCreateInput>(() => blankRole(catalog));
  const [template, setTemplate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const selectedTemplate = catalog.templates.find((item) => item.key === template);

  const chooseTemplate = (key: string) => {
    const item = catalog.templates.find((candidate) => candidate.key === key);
    setTemplate(key);
    setDraft(item ? { ...blankRole(catalog), name: item.label, permissions: item.permissions, templateKey: item.key } : blankRole(catalog));
  };

  return (
    <div className="admin-modal-overlay" role="presentation">
      <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="create-role-title">
        <div className="admin-modal-head">
          <h2 id="create-role-title">{roleCopy.createRoleTitle}</h2>
          <button type="button" className="admin-icon-btn" aria-label={roleCopy.close} onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <form
          className="admin-modal-body"
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft.name.trim()) {
              setError(roleCopy.nameRequired);
              return;
            }
            void onCreate({ ...draft, name: draft.name.trim(), ...(selectedTemplate ? { templateKey: selectedTemplate.key } : {}) });
          }}
        >
          <div className="create-role-options">
            <button type="button" className={!template ? 'create-option-selected' : ''} onClick={() => chooseTemplate('')}>
              <strong>{roleCopy.emptyRole}</strong>
              <small>{roleCopy.emptyRoleHint}</small>
            </button>
            {catalog.templates.map((item) => (
              <button type="button" key={item.key} className={template === item.key ? 'create-option-selected' : ''} onClick={() => chooseTemplate(item.key)}>
                <strong>{item.label}</strong>
                <small>{interpolate(roleCopy.templatePermissionCount, { count: formatCount(item.permissions.length) })}</small>
              </button>
            ))}
          </div>
          <label className="admin-field">
            <span className="admin-field-label">{roleCopy.roleName}</span>
            <input className="admin-input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">{roleCopy.description}</span>
            <textarea className="admin-textarea" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          </label>
          <div>
            <span className="admin-field-label">{roleCopy.roleColor}</span>
            <div className="role-color-swatches">
              {catalog.colors.map((color) => (
                <button
                  type="button"
                  key={color}
                  aria-label={interpolate(roleCopy.chooseColor, { color })}
                  className={`role-color-swatch ${draft.color === color ? 'role-color-swatch-selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setDraft({ ...draft, color })}
                />
              ))}
            </div>
          </div>
          {error && <p className="admin-form-error" role="alert">{error}</p>}
          <div className="admin-form-footer">
            <button type="button" className="admin-ghost-btn" onClick={onClose}>{roleCopy.cancel}</button>
            <button type="submit" className="admin-primary-btn" disabled={!draft.name.trim()}><Plus size={15} aria-hidden="true" />{roleCopy.createRoleAction}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RolePreviewPanel: React.FC<{ role: AdminRole; catalog: RoleCatalog }> = ({ role, catalog }) => {
  const selected = new Set(role.permissions);
  const groups = catalog.groups
    .filter((group) => group.permissions.some((permission) => selected.has(permission.key)))
    .map((group) => group.label);
  return (
    <aside className="role-preview">
      <h3>{roleCopy.rolePreviewTitle}</h3>
      <p>{groups.length ? interpolate(roleCopy.rolePreviewGroups, { groups: groups.join('، ') }) : roleCopy.rolePreviewEmpty}</p>
    </aside>
  );
};

interface RoleEditorProps {
  role: AdminRole;
  catalog: RoleCatalog;
  actor: AuthUser;
  onSaved: (role: AdminRole) => void;
  onDelete: () => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}

export const RoleEditor: React.FC<RoleEditorProps> = ({ role, catalog, actor, onSaved, onDelete, onDirtyChange }) => {
  const [tab, setTab] = useState<EditorTab>('overview');
  const [baseline, setBaseline] = useState(role);
  const [draft, setDraft] = useState(role);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<AdminRole | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const [userIds, setUserIds] = useState('');
  const [memberError, setMemberError] = useState<string | null>(null);
  const members = useCachedData<RoleMembersPage>(
    ['admin-role-members', role.id, debouncedMemberSearch, memberPage],
    () => fetchRoleMembers(role.id, { q: debouncedMemberSearch, page: memberPage }),
    { enabled: tab === 'members', initialData: { total: 0, page: 1, pageSize: 20, results: [] } }
  );
  const dirty = draft.name !== baseline.name || draft.color !== baseline.color || draft.description !== baseline.description || JSON.stringify(draft.permissions) !== JSON.stringify(baseline.permissions);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedMemberSearch(memberSearch);
      setMemberPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [memberSearch]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const update = (patch: Partial<AdminRole>) => setDraft((current) => ({ ...current, ...patch }));
  const save = async () => {
    setSaving(true);
    setMemberError(null);
    try {
      const saved = await updateRole(baseline.id, {
        name: draft.name,
        color: draft.color,
        description: draft.description,
        permissions: draft.permissions,
        expectedUpdatedAt: baseline.updatedAt,
      });
      setBaseline(saved);
      setDraft(saved);
      setConflict(null);
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const fresh = await fetchRole(baseline.id);
        setBaseline(fresh);
        setConflict(fresh);
      } else {
        setMemberError(error instanceof Error ? error.message : roleCopy.loadError);
      }
    } finally {
      setSaving(false);
    }
  };
  const assign = async () => {
    const ids = userIds.split(',').map((id) => id.trim()).filter(Boolean);
    if (!ids.length) return;
    await addRoleMembers(role.id, ids);
    setUserIds('');
    await members.refetch();
  };
  const removeMember = async (memberId: string) => {
    await removeRoleMember(role.id, memberId);
    await members.refetch();
  };

  return (
    <div className="role-editor">
      <div className="role-editor-header">
        <div className="role-editor-title">
          <span className="role-color-dot role-color-dot-large" style={{ backgroundColor: draft.color }} aria-hidden="true" />
          <div>
            <h2>{draft.name || roleCopy.newRole}</h2>
            <small>{role.isSystem ? roleCopy.systemRole : interpolate(roleCopy.roleUpdated, { date: formatDateTime(baseline.updatedAt) })}</small>
          </div>
        </div>
        <div className="admin-toolbar-actions">
          <button type="button" className="admin-ghost-btn" aria-label={roleCopy.copyRole} onClick={() => void navigator.clipboard?.writeText(role.slug)}>
            <Copy size={15} aria-hidden="true" />{roleCopy.copyRole}
          </button>
          {!role.isSystem && <button type="button" className="admin-danger-btn" onClick={() => void onDelete()}><Trash2 size={15} aria-hidden="true" />{roleCopy.deleteRole}</button>}
        </div>
      </div>
      <div className="role-tabs" role="tablist" aria-label={roleCopy.rolesTitle}>
        {(Object.keys(tabLabels) as EditorTab[]).map((item) => (
          <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)}>{tabLabels[item]}</button>
        ))}
      </div>
      {conflict && (
        <div className="role-conflict" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{roleCopy.conflict}</span>
          <small>{roleCopy.conflictContext}</small>
          <button type="button" className="admin-ghost-btn" onClick={() => setConflict(null)}><RefreshCw size={14} aria-hidden="true" />{roleCopy.reload}</button>
        </div>
      )}
      {tab === 'overview' && (
        <div className="role-overview">
          <label className="admin-field">
            <span className="admin-field-label">{roleCopy.roleName}</span>
            <input className="admin-input" value={draft.name} disabled={role.isSystem && role.slug === 'admin'} onChange={(event) => update({ name: event.target.value })} />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">{roleCopy.description}</span>
            <textarea className="admin-textarea" value={draft.description} onChange={(event) => update({ description: event.target.value })} />
          </label>
          <div>
            <span className="admin-field-label">{roleCopy.roleColor}</span>
            <div className="role-color-swatches">
              {catalog.colors.map((color) => (
                <button type="button" key={color} aria-label={interpolate(roleCopy.chooseColor, { color })} className={`role-color-swatch ${draft.color === color ? 'role-color-swatch-selected' : ''}`} style={{ backgroundColor: color }} onClick={() => update({ color })} />
              ))}
            </div>
          </div>
          <RolePreviewPanel role={draft} catalog={catalog} />
        </div>
      )}
      {tab === 'permissions' && <RolePermissionsTab catalog={catalog} role={draft} actor={actor} draft={draft.permissions} onChange={(permissions) => update({ permissions })} />}
      {tab === 'members' && (
        <div className="role-members">
          <div className="role-members-add">
            <label className="admin-field">
              <span className="admin-field-label">{roleCopy.memberIds}</span>
              <input className="admin-input" value={userIds} onChange={(event) => setUserIds(event.target.value)} placeholder={roleCopy.memberIdsPlaceholder} dir="ltr" />
            </label>
            <button type="button" className="admin-primary-btn" onClick={() => void assign()}><Users size={15} aria-hidden="true" />{roleCopy.assignMembers}</button>
          </div>
          <label className="admin-search">
            <Search size={15} aria-hidden="true" />
            <input aria-label={roleCopy.memberSearch} value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder={roleCopy.memberSearchPlaceholder} />
          </label>
          {members.data?.results.map((member: RoleMember) => (
            <div key={member.id} className="role-member-row">
              <span><strong>{member.fullName}</strong><small dir="ltr">{member.email}</small></span>
              <button type="button" className="admin-danger-btn" onClick={() => void removeMember(member.id)}>{roleCopy.removeMember}</button>
            </div>
          ))}
          {memberError && <p className="admin-form-error" role="alert">{memberError}</p>}
          {!members.isLoading && !members.data?.results.length && <p className="admin-detail-empty">{roleCopy.emptyMembers}</p>}
          {members.data && members.data.total > members.data.pageSize && (
            <div className="admin-pagination">
              <button type="button" className="admin-page-btn" disabled={memberPage <= 1} onClick={() => setMemberPage((value) => value - 1)}>{roleCopy.previous}</button>
              <span className="admin-page-info">{interpolate(roleCopy.pageOf, { page: memberPage, pages: Math.ceil(members.data.total / members.data.pageSize) })}</span>
              <button type="button" className="admin-page-btn" disabled={memberPage >= Math.ceil(members.data.total / members.data.pageSize)} onClick={() => setMemberPage((value) => value + 1)}>{roleCopy.next}</button>
            </div>
          )}
        </div>
      )}
      {tab === 'advanced' && (
        <div className="role-advanced">
          <p>{roleCopy.stableSlug}: <bdi dir="ltr">{role.slug}</bdi></p>
          <p>{roleCopy.members}: {formatCount(role.memberCount)}</p>
          <p>{roleCopy.rank}: {formatCount(role.position)}</p>
        </div>
      )}
      <div className={`unsaved-role-bar ${dirty ? 'unsaved-role-bar-visible' : ''}`} aria-hidden={!dirty}>
        <span>{roleCopy.unsaved}</span>
        <div>
          <button type="button" className="admin-ghost-btn" onClick={() => setDraft(baseline)} disabled={!dirty || saving}><RotateCcw size={14} aria-hidden="true" />{roleCopy.reset}</button>
          <button type="button" className="admin-primary-btn" onClick={() => void save()} disabled={!dirty || saving}><Save size={14} aria-hidden="true" />{saving ? roleCopy.saving : roleCopy.save}</button>
        </div>
      </div>
    </div>
  );
};

export const RolesView: React.FC = () => {
  const { user } = useAuth();
  const { search, navigate } = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [rolesOverride, setRolesOverride] = useState<AdminRole[] | null>(null);
  const [dirtyRoleId, setDirtyRoleId] = useState<string | null>(null);
  const rolesQuery = useCachedData<AdminRole[]>(['admin-roles'], fetchRoles, { initialData: [] });
  const catalogQuery = useCachedData<RoleCatalog>(['admin-role-catalog'], fetchRoleCatalog);
  const roles = rolesOverride ?? rolesQuery.data ?? [];
  const roleSlug = new URLSearchParams(search).get('role');
  const selected = roles.find((role) => role.slug === roleSlug) ?? roles.find((role) => !role.isDefault) ?? roles[0] ?? null;

  useEffect(() => {
    if (!roleSlug && selected) navigate(`/admin?tab=roles&role=${encodeURIComponent(selected.slug)}`, { replace: true });
  }, [roleSlug, selected, navigate]);

  if ((rolesQuery.isLoading && roles.length === 0) || catalogQuery.isLoading || !catalogQuery.data) {
    return <DataSectionSkeleton variant="list" count={5} />;
  }
  if (rolesQuery.isError || catalogQuery.isError) {
    return <AdminEmptyState title={roleCopy.loadError} hint={roleCopy.loadErrorHint} isError onRetry={() => { void rolesQuery.refetch(); void catalogQuery.refetch(); }} />;
  }

  const selectRole = (role: AdminRole) => {
    if (dirtyRoleId && dirtyRoleId !== role.id && !window.confirm(roleCopy.unsaved)) return;
    navigate(`/admin?tab=roles&role=${encodeURIComponent(role.slug)}`);
  };
  const create = async (input: RoleCreateInput) => {
    const created = await createRole(input);
    setCreateOpen(false);
    setRolesOverride(null);
    await rolesQuery.refetch();
    selectRole(created);
  };
  const reorder = async (from: number, to: number) => {
    if (from === to) return;
    const next = [...roles];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    setRolesOverride(next);
    try {
      setRolesOverride(await reorderRoles(next.map((role) => role.id)));
    } catch {
      setRolesOverride(roles);
    }
  };
  const remove = async () => {
    if (!selected || !window.confirm(interpolate(roleCopy.deleteConfirm, { name: selected.name }))) return;
    const replacement = roles.find((role) => role.id !== selected.id && role.canManage);
    await deleteRole(selected.id, selected.memberCount ? replacement?.id : undefined);
    setRolesOverride(null);
    await rolesQuery.refetch();
    navigate('/admin?tab=roles');
  };

  return (
    <div className="admin-view role-manager">
      <div className="admin-section-head">
        <div>
          <h1 className="view-h1">{roleCopy.rolesTitle}</h1>
          <p className="admin-page-head-sub">{roleCopy.rolesSubtitle}</p>
        </div>
        <button type="button" className="admin-primary-btn" onClick={() => setCreateOpen(true)}><Plus size={16} aria-hidden="true" />{roleCopy.createRole}</button>
      </div>
      <div className="role-manager-layout">
        <RoleList roles={roles} selectedSlug={selected?.slug ?? null} onSelect={selectRole} onReorder={(from, to) => void reorder(from, to)} />
        {selected ? (
          <RoleEditor
            key={selected.id}
            role={selected}
            catalog={catalogQuery.data}
            actor={user as AuthUser}
            onSaved={(saved) => setRolesOverride(roles.map((role) => role.id === saved.id ? saved : role))}
            onDelete={remove}
            onDirtyChange={(dirty) => setDirtyRoleId(dirty ? selected.id : null)}
          />
        ) : <AdminEmptyState title={roleCopy.noRoles} hint={roleCopy.noRolesHint} />}
      </div>
      {createOpen && <CreateRoleModal catalog={catalogQuery.data} onClose={() => setCreateOpen(false)} onCreate={create} />}
    </div>
  );
};
