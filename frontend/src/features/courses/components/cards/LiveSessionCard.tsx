import React from 'react';
import { Radio, Video } from 'lucide-react';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { courseEmptyStates } from '@/features/courses/data/courseStates';
import { CourseSectionEmpty } from '@/features/courses/components/states/CourseSectionEmpty';
import type { LiveSessionState } from '@/shared/types/entities';

/** State label and tone of a weekly live session row. */
const SESSION_TONE: Record<LiveSessionState, { stateClass: string; label: string }> = {
  live: { stateClass: 'course-live-state course-live-state-live', label: courseCopy.landing.liveStateLabels.live },
  upcoming: { stateClass: 'course-live-state course-live-state-upcoming', label: courseCopy.landing.liveStateLabels.upcoming },
  past: { stateClass: 'course-live-state course-live-state-past', label: courseCopy.landing.liveStateLabels.past },
};

/** The weekly Google Meet review brief with the next scheduled sessions. */
export const LiveSessionCard: React.FC = () => {
  const { course } = useCourseDetail();
  if (!course) return null;

  return (
    <section className="course-info-card animate-fade-in-up">
      <div className="course-info-head">
        <span className="course-info-icon">
          <Video size={18} className="text-blue-400" />
        </span>
        <h2 className="course-info-title">{courseCopy.landing.liveTitle}</h2>
      </div>
      <p className="course-info-text">{courseCopy.landing.liveNote}</p>
      {course.liveSessions.length === 0 ? (
        <CourseSectionEmpty copy={courseEmptyStates.live} icon={<Radio size={18} />} />
      ) : (
        <div className="flex flex-col gap-2">
          {course.liveSessions.map((session) => {
            // An unexpected phase from the API falls back to the calm "past" tone.
            const tone = SESSION_TONE[session.state] ?? SESSION_TONE.past;
            return (
              <div key={session.id} className="course-live-row">
                <div className="flex items-center gap-3 min-w-0">
                  {session.state === 'live' && <span className="course-live-dot" />}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] text-slate-200 font-body truncate">{session.title}</span>
                    <span className="text-[11px] text-slate-400 font-body">
                      {session.dateLabel} · {session.timeLabel}
                    </span>
                  </div>
                </div>
                <span className={tone.stateClass}>{tone.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};