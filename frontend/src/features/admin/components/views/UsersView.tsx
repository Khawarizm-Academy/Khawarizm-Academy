import React from 'react';
import { SlidingSegmentedControl } from '@/shared/components/Controls/SlidingSegmentedControl';
import { UserRoundSearch } from 'lucide-react';
import { useAuth } from '@/features/auth/context/authContext';
import { useAdmin } from '@/features/admin/context/adminContext';
import { AdminSearchBox } from '@/features/admin/components/controls/AdminSearchBox';
import { UsersTable } from '@/features/admin/components/layout/UsersTable';
import { AdminPagination } from '@/features/admin/components/toolbar/AdminPagination';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { ROLE_FILTERS } from '@/features/admin/types';

/** Users section: search + role filter over the paged table; a row opens the inspector. */
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
          placeholder="ابحث بالاسم أو البريد الإلكتروني…"
          label="بحث في الحسابات"
        />
        <div className="admin-toolbar-actions">
          <SlidingSegmentedControl
            options={ROLE_FILTERS}
            value={userRole}
            onChange={setUserRole}
            tone="blue"
            aria-label="تصفية حسب الدور"
          />
        </div>
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
          icon={UserRoundSearch}
          title={
            loadErrors.users
              ? 'تعذّر تحميل الحسابات'
              : isSearching
              ? 'لا توجد حسابات تطابق البحث'
              : 'لا توجد حسابات بعد'
          }
          hint={
            loadErrors.users
              ? 'تعذّر الوصول إلى الخادم؛ أعد المحاولة بعد لحظات.'
              : isSearching
              ? 'جرّب تعديل كلمة البحث أو اختيار دور آخر.'
              : 'تظهر الحسابات هنا فور تسجيل أول مستخدم على المنصة.'
          }
          isError={loadErrors.users}
          onRetry={refresh}
        />
      )}
    </div>
  );
};
