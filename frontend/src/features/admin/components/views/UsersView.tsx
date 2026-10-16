import React from 'react';
import { SlidingSegmentedControl } from '@/shared/components/Controls/SlidingSegmentedControl';
import { useAuth } from '@/features/auth/context/authContext';
import { useAdmin } from '@/features/admin/context/adminContext';
import { AdminSearchBox } from '@/features/admin/components/controls/AdminSearchBox';
import { UsersTable } from '@/features/admin/components/layout/UsersTable';
import { AdminPagination } from '@/features/admin/components/toolbar/AdminPagination';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import type { AdminRoleFilter } from '@/features/admin/types';

const ROLE_FILTERS: Array<{ id: AdminRoleFilter; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'student', label: 'طلاب' },
  { id: 'instructor', label: 'مدرّبون' },
  { id: 'admin', label: 'مشرفون' },
];

/** Users section: search + role filter over the paged table; a row opens the detail. */
export const UsersView: React.FC = () => {
  const { user } = useAuth();
  const {
    users,
    loadErrors,
    refresh,
    userSearch,
    setUserSearch,
    userRole,
    setUserRole,
    setUserPage,
    selectUser,
    changingRoleId,
    changeRole,
  } = useAdmin();

  const isSearching = Boolean(userSearch) || userRole !== 'all';

  return (
    <div className="admin-view">
      <div className="admin-toolbar">
        <AdminSearchBox
          value={userSearch}
          onChange={setUserSearch}
          placeholder="ابحث بالاسم أو البريد…"
          label="بحث في المستخدمين"
        />
        <SlidingSegmentedControl
          options={ROLE_FILTERS}
          value={userRole}
          onChange={setUserRole}
          tone="blue"
          aria-label="تصفية حسب الدور"
        />
      </div>

      {users && users.results.length > 0 ? (
        <>
          <UsersTable
            rows={users.results}
            currentUserId={user?.id ?? ''}
            changingRoleId={changingRoleId}
            onOpen={selectUser}
            onChangeRole={changeRole}
          />
          <AdminPagination
            total={users.total}
            page={users.page}
            pageSize={users.pageSize}
            onPageChange={setUserPage}
          />
        </>
      ) : (
        <AdminEmptyState
          title={loadErrors.users ? 'تعذّر تحميل المستخدمين' : isSearching ? 'لا توجد نتائج مطابقة' : 'لا يوجد مستخدمون بعد'}
          hint={isSearching ? 'جرّب تعديل البحث أو الفلتر.' : undefined}
          isError={loadErrors.users}
          onRetry={refresh}
        />
      )}
    </div>
  );
};
