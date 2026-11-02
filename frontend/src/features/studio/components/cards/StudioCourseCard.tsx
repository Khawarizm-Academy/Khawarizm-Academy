import React from 'react';
import { MoreVertical, Users } from 'lucide-react';
import { useNavigate } from '@/app/routerContext';
import { ReadinessRing } from '@/features/studio/components/cards/ReadinessRing';
import { StatusChip } from '@/features/studio/components/controls/StatusChip';
import type { StudioCourse } from '@/features/studio/types';

type StudioCourseCardProps = {
  course: StudioCourse;
  selected: boolean;
  onSelect: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canSelect?: boolean;
  canEdit?: boolean;
  canArchive?: boolean;
  canDuplicate?: boolean;
  canDelete?: boolean;
};

export const StudioCourseCard: React.FC<StudioCourseCardProps> = ({
  course,
  selected,
  onSelect,
  onArchive,
  onDuplicate,
  onDelete,
  canSelect = false,
  canEdit = false,
  canArchive = false,
  canDuplicate = false,
  canDelete = false,
}) => {
  const nav = useNavigate();
  const editorPath = `/studio/courses/${course.slug}?tab=info`;

  return (
    <article className="studio-course-card">
      {canSelect && (
        <div className="studio-course-select">
          <input type="checkbox" checked={selected} onChange={onSelect} aria-label={`تحديد ${course.title}`} />
        </div>
      )}
      <button type="button" className="studio-course-media" aria-label={canEdit ? 'تحرير الدورة' : 'معاينة الدورة'} onClick={() => nav(canEdit ? editorPath : `/courses/${encodeURIComponent(course.slug)}`)}>
        {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt="" /> : <span>استوديو</span>}
      </button>
      <div className="studio-course-body">
        <div className="studio-course-heading">
          <div>
            <StatusChip status={course.status} />
            <h3>{course.title || 'دورة بلا عنوان'}</h3>
          </div>
          <div className="studio-course-menu">
            <button type="button" aria-label="إجراءات الدورة">
              <MoreVertical size={18} />
            </button>
            <div className="studio-course-menu-popover">
              {canEdit && <button type="button" onClick={() => nav(editorPath)}>تحرير</button>}
              <button type="button" onClick={() => nav(`/courses/${encodeURIComponent(course.slug)}`)}>معاينة</button>
              {canDuplicate && <button type="button" onClick={onDuplicate}>نسخ</button>}
              {canArchive && <button type="button" onClick={onArchive}>أرشفة</button>}
              {canDelete && <button type="button" onClick={onDelete}>حذف</button>}
            </div>
          </div>
        </div>
        <div className="studio-course-meta">
          <ReadinessRing value={course.readiness} size={64} />
          <span><Users size={14} />{course.enrolledCount} متعلّم</span>
          <small>{new Date(course.updatedAt).toLocaleDateString('ar')}</small>
        </div>
      </div>
    </article>
  );
};
