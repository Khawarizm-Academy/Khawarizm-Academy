import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { SlidingSegmentedControl } from '@/shared/components/Controls/SlidingSegmentedControl';
import { useAdmin } from '@/features/admin/context/adminContext';
import { AdminSearchBox } from '@/features/admin/components/controls/AdminSearchBox';
import { ContentTable } from '@/features/admin/components/layout/ContentTable';
import { AdminPagination } from '@/features/admin/components/toolbar/AdminPagination';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { ContentFormModal } from '@/features/admin/components/overlays/ContentFormModal';
import type { AdminContentRow } from '@/features/admin/types';

/** Content section: sub-tabs by content type, search, paged table, add/edit modal. */
export const ContentView: React.FC = () => {
  const {
    contentSchema,
    contentType,
    setContentType,
    content,
    contentSearch,
    setContentSearch,
    setContentPage,
    loadErrors,
    refresh,
    deleteContent,
    deletingContentId,
  } = useAdmin();
  const [formState, setFormState] = useState<{ open: boolean; row: AdminContentRow | null }>({
    open: false,
    row: null,
  });

  const activeType = contentSchema?.types.find((type) => type.key === contentType) ?? null;
  const rows = content?.results ?? [];
  const isSearching = Boolean(contentSearch);
  const closeForm = () => setFormState({ open: false, row: null });

  if (!activeType) {
    return (
      <AdminEmptyState
        title={loadErrors.content ? 'تعذّر تحميل أنواع المحتوى' : 'لا توجد أنواع محتوى'}
        isError={loadErrors.content}
        onRetry={refresh}
      />
    );
  }

  const typeTabs = (contentSchema?.types ?? []).map((type) => ({ id: type.key, label: type.label }));

  return (
    <div className="admin-view">
      <div className="admin-content-tabs">
        <SlidingSegmentedControl
          options={typeTabs}
          value={activeType.key}
          onChange={setContentType}
          tone="blue"
          aria-label="تصفية حسب نوع المحتوى"
        />
      </div>
      <div className="admin-toolbar">
        <AdminSearchBox
          value={contentSearch}
          onChange={setContentSearch}
          placeholder="ابحث في المحتوى…"
          label="بحث في المحتوى"
        />
        <div className="admin-toolbar-actions">
          <button
            type="button"
            className="admin-primary-btn"
            onClick={() => setFormState({ open: true, row: null })}
          >
            <Plus size={15} />
            <span>إضافة</span>
          </button>
        </div>
      </div>

      {rows.length > 0 ? (
        <>
          <ContentTable
            rows={rows}
            contentType={activeType}
            deletingId={deletingContentId}
            onEdit={(row) => setFormState({ open: true, row })}
            onDelete={(id) => deleteContent(id)}
          />
          <AdminPagination
            total={content?.total ?? 0}
            page={content?.page ?? 1}
            pageSize={content?.pageSize ?? 0}
            onPageChange={setContentPage}
          />
        </>
      ) : (
        <AdminEmptyState
          title={
            loadErrors.content
              ? 'تعذّر تحميل المحتوى'
              : isSearching
              ? 'لا توجد نتائج مطابقة'
              : 'لا توجد عناصر بعد'
          }
          hint={isSearching ? 'جرّب تعديل البحث أو الفلتر.' : undefined}
          isError={loadErrors.content}
          onRetry={refresh}
        />
      )}

      {formState.open && (
        <ContentFormModal
          key={`${activeType.key}:${formState.row?.id ?? 'new'}`}
          contentType={activeType}
          row={formState.row}
          onClose={closeForm}
        />
      )}
    </div>
  );
};
