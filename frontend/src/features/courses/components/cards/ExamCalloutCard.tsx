import React from 'react';
import { Award, FileQuestion } from 'lucide-react';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { courseEmptyStates } from '@/features/courses/data/courseStates';
import { CourseSectionEmpty } from '@/features/courses/components/states/CourseSectionEmpty';

/** Short expectations card: the exam exists, unlocks the certificate, here's the pass bar. */
export const ExamCalloutCard: React.FC = () => {
  const { course } = useCourseDetail();
  if (!course) return null;

  return (
    <section className="course-info-card animate-fade-in-up">
      <div className="course-info-head">
        <span className="course-info-icon">
          <Award size={18} className="text-gold-400" />
        </span>
        <h2 className="course-info-title">{courseCopy.landing.examTitle}</h2>
      </div>
      <p className="course-info-text">{courseCopy.landing.examNote}</p>
      {course.exam ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-body">
          <span className="tag-box">{course.exam.questionCount} {courseCopy.player.examQuestions}</span>
          <span className="tag-box">{course.exam.minutes} {courseCopy.player.examMinutes}</span>
          <span className="tag-box">{courseCopy.landing.examThreshold} · {course.exam.passThreshold}%</span>
        </div>
      ) : (
        <CourseSectionEmpty copy={courseEmptyStates.exam} icon={<FileQuestion size={18} />} />
      )}
    </section>
  );
};