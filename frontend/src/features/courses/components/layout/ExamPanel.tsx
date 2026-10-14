import React from 'react';
import { Award, FileQuestion, Lock } from 'lucide-react';
import { useNavigate, useParams } from '@/app/routerContext';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { courseEmptyStates } from '@/features/courses/data/courseStates';
import { CourseSectionEmpty } from '@/features/courses/components/states/CourseSectionEmpty';
import type { CourseDetail } from '@/shared/types/entities';

/** Stats grid data per exam dimension. */
function examStats(course: CourseDetail | null) {
  const exam = course?.exam;
  if (!exam) return [];
  return [
    { value: String(exam.questionCount), label: courseCopy.player.examQuestions },
    { value: `${exam.minutes}`, label: courseCopy.player.examMinutes },
    { value: `${exam.passThreshold}%`, label: courseCopy.landing.examThreshold },
    { value: String(exam.attemptsLeft), label: courseCopy.player.examAttempts },
  ];
}

/** Exam tab: locked until every lesson is done, then a golden launchpad. */
export const ExamPanel: React.FC = () => {
  const { course, isExamUnlocked } = useCoursePlayer();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  if (!course) return null;

  // The course has no final exam configured yet.
  if (!course.exam) {
    return <CourseSectionEmpty copy={courseEmptyStates.exam} icon={<FileQuestion size={18} />} />;
  }

  const stats = examStats(course);

  const statRow = (
    <div className="player-exam-stats">
      {stats.map((stat, idx) => (
        <div key={stat.label} className="player-exam-stat animate-pop-in" style={{ animationDelay: `${idx * 70}ms` }}>
          <span className="player-exam-stat-value">{stat.value}</span>
          <span className="player-exam-stat-label">{stat.label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`${isExamUnlocked ? 'player-exam-card player-exam-open' : 'player-exam-card player-exam-locked'} animate-pop-in`}>
      <div className={isExamUnlocked ? 'player-exam-icon player-exam-icon-open' : 'player-exam-icon player-exam-icon-locked'}>
        {isExamUnlocked ? <Award size={24} /> : <Lock size={22} />}
      </div>

      <h2 className="text-lg sm:text-xl font-bold text-white font-display">
        {isExamUnlocked ? courseCopy.player.examUnlocked : courseCopy.player.examLocked}
      </h2>
      <p className="text-sm text-slate-400 font-body leading-relaxed">
        {isExamUnlocked ? courseCopy.player.examUnlockedNote : courseCopy.player.examLockedNote}
      </p>

      {statRow}

      {isExamUnlocked && (
        // Mock shortcut: the real quiz engine is out of scope; starting the exam
        // lands on the completion screen so the certificate flow stays demoable.
        <button type="button" onClick={() => navigate(`/courses/${slug}/certificate`)} className="btn-gold w-full max-w-xs">
          <Award size={16} />
          {courseCopy.player.examStart}
        </button>
      )}
    </div>
  );
};