import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseLandingPage } from '@/features/courses/pages/CourseLandingPage';
import { InstructorCard } from '@/features/courses/components/cards/InstructorCard';
import { CoursePrimaryCta } from '@/features/courses/components/controls/CoursePrimaryCta';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import type { CourseDetailContextValue } from '@/features/courses/context/courseDetailContext';
import type { CourseLandingCourse } from '@/features/courses/types';
import { courseCopy } from '@/features/courses/data/courseCopy';

vi.mock('@/features/courses/context/CourseDetailProvider', () => ({
  CourseDetailProvider: ({ children }: { slug: string; children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/courses/components/views/CourseLandingView/DesktopCourseLandingView', () => ({
  DesktopCourseLandingView: () => <div data-testid="desktop-landing-view" />,
}));

vi.mock('@/features/courses/components/views/CourseLandingView/MobileCourseLandingView', () => ({
  MobileCourseLandingView: () => <div data-testid="mobile-landing-view" />,
}));

vi.mock('@/features/courses/components/states/CourseNotFound', () => ({
  CourseNotFound: () => <div data-testid="course-not-found">الدورة غير متوفرة</div>,
}));

vi.mock('@/features/courses/context/courseDetailContext', () => ({
  useCourseDetail: vi.fn(),
}));

const mockedUseCourseDetail = vi.mocked(useCourseDetail);

const baseCourse: CourseLandingCourse = {
  id: 'python-basics',
  title: 'أساسيات بايثون',
  category: 'البرمجة',
  categorySlug: 'programming',
  thumbnailUrl: '/course.png',
  tagline: 'ابدأ من الصفر',
  about: 'وصف الدورة',
  instructorName: 'مدرب قديم',
  instructorCredential: 'اعتماد قديم',
  instructorBio: 'نبذة قديمة',
  rating: 4.8,
  reviewCount: 10,
  enrolledCount: 100,
  duration: '4 ساعات',
  lessonsCount: 8,
  levelLabel: 'مبتدئ',
  languageLabel: 'العربية',
  priceType: 'free',
  priceLabel: 'مجانًا',
  outcomes: [],
  modules: [],
  liveSessions: [],
  exam: { questionCount: 10, minutes: 20, passThreshold: 70, attemptsLeft: 2 },
  relatedIds: [],
};

function contextFor(course: CourseLandingCourse | null): CourseDetailContextValue {
  return {
    course,
    isLoading: false,
    isEnrolled: false,
    isFavorite: false,
    startedLessonId: '',
    progress: 0,
    toastMessage: null,
    enroll: vi.fn(),
    toggleFavorite: vi.fn(),
    continueLearning: vi.fn(),
    hideToast: vi.fn(),
  };
}

describe('CourseLandingPage lifecycle slice', () => {
  beforeEach(() => {
    mockedUseCourseDetail.mockReturnValue(contextFor(baseCourse));
  });

  it('shows a private staff preview and archived notices while keeping both landing surfaces', () => {
    mockedUseCourseDetail.mockReturnValue(
      contextFor({ ...baseCourse, status: 'draft', isPreview: true, enrollable: false })
    );

    const preview = render(<CourseLandingPage />);

    expect(screen.getByRole('status').textContent).toContain('هذه معاينة خاصة للدورة غير المنشورة');
    expect(screen.queryByRole('note')).toBeNull();
    expect(screen.getByTestId('desktop-landing-view')).toBeTruthy();
    expect(screen.getByTestId('mobile-landing-view')).toBeTruthy();

    preview.unmount();
    mockedUseCourseDetail.mockReturnValue(contextFor({ ...baseCourse, status: 'archived', enrollable: false }));
    render(<CourseLandingPage />);
    expect(screen.getByRole('note').textContent).toContain('التسجيل فيها غير متاح');
  });

  it('keeps unauthorized or missing courses on the existing not-found behavior', () => {
    mockedUseCourseDetail.mockReturnValue(contextFor(null));

    render(<CourseLandingPage />);

    expect(screen.getByTestId('course-not-found')).toBeTruthy();
    expect(screen.queryByTestId('desktop-landing-view')).toBeNull();
    expect(screen.queryByTestId('mobile-landing-view')).toBeNull();
  });
});

describe('course landing public data', () => {
  beforeEach(() => {
    mockedUseCourseDetail.mockReturnValue(contextFor(baseCourse));
  });

  it('renders the public instructors array without leaking email fields', () => {
    mockedUseCourseDetail.mockReturnValue(
      contextFor({
        ...baseCourse,
        instructors: [
          {
            id: 'instructor-1',
            name: 'سارة علي',
            headline: 'مهندسة بيانات',
            avatarUrl: '/sarah.png',
          },
          {
            id: 'instructor-2',
            name: 'عمر حسن',
            headline: 'مدرب بايثون',
            avatarUrl: '',
          },
        ],
        email: 'private@example.com',
      } as CourseLandingCourse & { email: string })
    );

    render(<InstructorCard />);

    expect(screen.getByText('سارة علي')).toBeTruthy();
    expect(screen.getByText('مهندسة بيانات')).toBeTruthy();
    expect(screen.getByText('عمر حسن')).toBeTruthy();
    expect(screen.getByText('مدرب بايثون')).toBeTruthy();
    expect(screen.queryByText('private@example.com')).toBeNull();
  });

  it('preserves the legacy instructor and enrollment contract when additive fields are absent', () => {
    render(
      <>
        <InstructorCard />
        <CoursePrimaryCta />
      </>
    );

    expect(screen.getByText('مدرب قديم')).toBeTruthy();
    expect(screen.getByText('اعتماد قديم')).toBeTruthy();
    expect(screen.getByRole('button', { name: courseCopy.landing.enrollLabel })).toBeTruthy();
  });

  it('hides the primary enrollment CTA for archived courses', () => {
    mockedUseCourseDetail.mockReturnValue(contextFor({ ...baseCourse, enrollable: false }));

    render(<CoursePrimaryCta />);

    expect(screen.queryByRole('button', { name: courseCopy.landing.enrollLabel })).toBeNull();
  });
});
