import React from 'react';
import { Radio, Video } from 'lucide-react';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { courseEmptyStates } from '@/features/courses/data/courseStates';
import { CourseSectionEmpty } from '@/features/courses/components/states/CourseSectionEmpty';
import { LiveSessionPlayerCard } from '@/features/courses/components/cards/LiveSessionPlayerCard';

/** Live schedule and learner-safe join/replay actions for the course landing page. */
export const LiveSessionCard: React.FC = () => {
  const { course } = useCourseDetail();
  if (!course) return null;

  return (
    <section className="course-info-card animate-fade-in-up">
      <div className="course-info-head">
        <span className="course-info-icon"><Video size={18} className="text-blue-400" /></span>
        <h2 className="course-info-title">{courseCopy.landing.liveTitle}</h2>
      </div>
      <p className="course-info-text">{courseCopy.landing.liveNote}</p>
      {course.liveSessions.length === 0 ? (
        <CourseSectionEmpty copy={courseEmptyStates.live} icon={<Radio size={18} />} />
      ) : (
        <div className="flex flex-col gap-3">
          {course.liveSessions.slice(0, 4).map((session) => (
            <LiveSessionPlayerCard key={session.uuid || session.id} session={session} />
          ))}
        </div>
      )}
    </section>
  );
};
