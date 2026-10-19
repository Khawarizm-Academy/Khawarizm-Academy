import React, { useCallback } from 'react';
import { useParams } from '@/app/routerContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { fetchCourseCertificate, fetchCourseDetail } from '@/features/courses/data/courseFetchers';
import { courseCopy } from '@/features/courses/data/courseCopy';
import {
  certificateSerial,
  courseTrainingHours,
} from '@/features/courses/data/courseCertificate';
import { CertificateView } from '@/features/courses/components/views/CertificateView';
import { CourseLandingSkeleton } from '@/features/courses/components/states/CourseLandingSkeleton';
import { CourseNotFound } from '@/features/courses/components/states/CourseNotFound';
import type { CourseCertificate, CourseDetail } from '@/shared/types/entities';

/** Completion screen; shares the same detail cache as the landing and the player. */
export const CourseCertificatePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const fetcher = useCallback(() => fetchCourseDetail(slug), [slug]);
  const { data: course, isLoading } = useCachedData<CourseDetail | null>(
    ['course-detail', slug],
    fetcher,
    { keepPreviousData: true, staleTime: 10 * 60 * 1000, cacheTime: 30 * 60 * 1000 }
  );

  // The API issues the credential id; the local serial stays only as a fallback.
  const certFetcher = useCallback(() => fetchCourseCertificate(slug), [slug]);
  const { data: certificate } = useCachedData<CourseCertificate | null>(
    ['course-certificate', slug],
    certFetcher,
    { keepPreviousData: true, staleTime: 10 * 60 * 1000 }
  );

  const dateLabel = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="content-container">
      {isLoading ? (
        <CourseLandingSkeleton />
      ) : course ? (
        <CertificateView
          course={course}
          score={courseCopy.certificate.demoScore}
          hours={courseTrainingHours(course.modules)}
          serial={certificate?.credentialId ?? certificateSerial(course.id)}
          dateLabel={dateLabel}
        />
      ) : (
        <CourseNotFound />
      )}
    </main>
  );
};