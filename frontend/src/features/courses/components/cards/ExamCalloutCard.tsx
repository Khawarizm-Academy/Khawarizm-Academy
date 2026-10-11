import React from 'react';
import { Award } from 'lucide-react';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import { courseCopy } from '@/features/courses/data/courseCopy';

/** Short expectations card: the exam exists, unlocks the certificate, here's the pass bar. */
export const ExamCalloutCard: React.FC = () => {
  const { course } = useCourseDetail();
  if (!course) return null;

  const { questionCount, minutes, passThreshold } = course.exam;

  return (
    <section className="course-info-card">
      <div className="course-info-head">
        <span className="course-info-icon">
          <Award size={18} className="text-gold-400" />
        </span>
        <h2 className="course-info-title">{courseCopy.landing.examTitle}</h2>
      </div>
      <p className="course-info-text">{courseCopy.landing.examNote}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-body">
        <span className="tag-box">{questionCount} {courseCopy.player.examQuestions}</span>
        <span className="tag-box">{minutes} {courseCopy.player.examMinutes}</span>
        <span className="tag-box">{courseCopy.landing.examThreshold} · {passThreshold}%</span>
      </div>
    </section>
  );
};