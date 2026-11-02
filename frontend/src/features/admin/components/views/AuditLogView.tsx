import React, { useState } from 'react';
import { Filter, RefreshCw, Search } from 'lucide-react';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';
import { fetchAudit } from '@/features/admin/data/roleFetchers';
import { formatCount, formatDateTime } from '@/features/admin/data/adminFormatters';
import type { AuditPage, AuditRow } from '@/features/admin/types';
import roleCopy from '@/features/admin/data/roleCopy.json';

const interpolate = (value: string, replacements: Record<string, string>): string =>
  Object.entries(replacements).reduce((result, [key, replacement]) => result.replace(`{${key}}`, replacement), value);

const readableDetail = (row: AuditRow): string => {
  if (typeof row.detail === 'string') return row.detail;
  const added = row.detail.added ?? [];
  const removed = row.detail.removed ?? [];
  if (added.length && removed.length) return interpolate(roleCopy.addedAndRemovedPermissions, { added: added.join('، '), removed: removed.join('، ') });
  if (added.length) return interpolate(roleCopy.addedPermissions, { keys: added.join('، ') });
  if (removed.length) return interpolate(roleCopy.removedPermissions, { keys: removed.join('، ') });
  return row.action || roleCopy.changedAction;
};

export const AuditLogView: React.FC = () => {
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [page, setPage] = useState(1);
  const query = useCachedData<AuditPage>(['admin-audit', action, actor, page], () => fetchAudit({ action, actor, page }), { keepPreviousData: true });

  if (query.isLoading && !query.data) return <DataSectionSkeleton variant="list" count={6} />;
  if (query.isError) return <AdminEmptyState title={roleCopy.auditLoadError} hint={roleCopy.auditLoadErrorHint} isError onRetry={() => void query.refetch()} />;
  const data = query.data;
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="admin-view audit-view">
      <div className="admin-section-head">
        <div><h1 className="view-h1">{roleCopy.auditTitle}</h1><p className="admin-page-head-sub">{roleCopy.auditSubtitle}</p></div>
        <button type="button" className="admin-ghost-btn" onClick={() => void query.refetch()}><RefreshCw size={14} aria-hidden="true" />{roleCopy.refresh}</button>
      </div>
      <div className="audit-filters">
        <label className="admin-search"><Search size={15} aria-hidden="true" /><input aria-label={roleCopy.auditActionFilter} value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} placeholder={roleCopy.auditActionPlaceholder} /></label>
        <label className="admin-search"><Filter size={15} aria-hidden="true" /><input aria-label={roleCopy.auditActorFilter} value={actor} onChange={(event) => { setActor(event.target.value); setPage(1); }} placeholder={roleCopy.auditActorPlaceholder} dir="ltr" /></label>
      </div>
      {!data?.results.length ? <AdminEmptyState title={roleCopy.auditEmpty} hint={roleCopy.auditEmptyHint} /> : (
        <div className="audit-table-wrap">
          <table className="audit-table">
            <caption className="sr-only">{roleCopy.auditCaption}</caption>
            <thead><tr><th>{roleCopy.auditTime}</th><th>{roleCopy.auditActor}</th><th>{roleCopy.auditAction}</th><th>{roleCopy.auditDetails}</th></tr></thead>
            <tbody>{data.results.map((row) => <tr key={row.id}><td>{formatDateTime(row.createdAt)}</td><td>{row.actor?.name ?? roleCopy.auditSystem}</td><td><bdi dir="ltr">{row.action}</bdi></td><td>{readableDetail(row)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {data && totalPages > 1 && <div className="admin-pagination"><button type="button" className="admin-page-btn" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>{roleCopy.previous}</button><span className="admin-page-info">{interpolate(roleCopy.pageOf, { page: formatCount(page), pages: formatCount(totalPages) })}</span><button type="button" className="admin-page-btn" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>{roleCopy.next}</button></div>}
    </div>
  );
};
