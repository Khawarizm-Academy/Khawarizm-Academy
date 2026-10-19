import courseSystemJson from '@/shared/json/courseSystem.json';

/** Landing page copy, keyed exactly like courseSystem.json's landing block. */
export interface LandingCopy {
  backLabel: string;
  breadcrumbRoot: string;
  breadcrumbCourses: string;
  enrollLabel: string;
  continueLabel: string;
  enrolledLabel: string;
  favoriteLabel: string;
  favoritedLabel: string;
  syllabusStat: string;
  outcomesTitle: string;
  curriculumTitle: string;
  liveTitle: string;
  liveNote: string;
  examTitle: string;
  examNote: string;
  examThreshold: string;
  instructorTitle: string;
  relatedTitle: string;
  aboutTitle: string;
  liveStateLabels: Record<'live' | 'upcoming' | 'past', string>;
  toastEnrolled: string;
  toastFavoriteSaved: string;
  toastFavoriteRemoved: string;
  toastSignIn: string;
  metaRating: string;
  metaEnrolled: string;
  metaDuration: string;
  metaLessons: string;
  metaLevel: string;
  metaLanguage: string;
}

/** Course player copy, keyed exactly like courseSystem.json's player block. */
export interface PlayerCopy {
  backLabel: string;
  pathTitle: string;
  pathButton: string;
  progressLabel: string;
  tabLabel: string;
  tabs: Record<'lesson' | 'problems' | 'live' | 'exam', string>;
  qualityLabel: string;
  captionsLabel: string;
  speedLabel: string;
  speeds: string[];
  qualities: string[];
  summaryTitle: string;
  resumeTitle: string;
  lessonDoneToast: string;
  practiceLabel: string;
  problemsTitle: string;
  problemHint: string;
  problemCorrect: string;
  problemWrong: string;
  problemPrevious: string;
  problemNext: string;
  problemProgress: string;
  liveTitle: string;
  liveNow: string;
  liveUpcoming: string;
  joinNow: string;
  joinSoon: string;
  joinDisabled: string;
  addToCalendar: string;
  livePast: string;
  watchRecording: string;
  noMeetLink: string;
  examTitle: string;
  examLocked: string;
  examLockedNote: string;
  examUnlocked: string;
  examUnlockedNote: string;
  examStart: string;
  examQuestions: string;
  examMinutes: string;
  examAttempts: string;
  markComplete: string;
  completedLabel: string;
  backToLesson: string;
  playLabel: string;
  pauseLabel: string;
  skipForwardLabel: string;
  skipBackwardLabel: string;
  muteLabel: string;
  unmuteLabel: string;
  pipLabel: string;
  fullscreenLabel: string;
  exitFullscreenLabel: string;
  loadingLabel: string;
  bufferingLabel: string;
  errorTitle: string;
  errorNote: string;
  retryLabel: string;
  unsupportedTitle: string;
  unsupportedNote: string;
  settingsLabel: string;
  seekLabel: string;
  sourceLabel: string;
}

/** Certificate copy, keyed exactly like courseSystem.json's certificate block. */
export interface CertificateCopy {
  backLabel: string;
  title: string;
  subtitle: string;
  download: string;
  share: string;
  statLessons: string;
  statScore: string;
  statHours: string;
  certifiesLine: string;
  completedLine: string;
  scoreLine: string;
  sealLabel: string;
  serialLabel: string;
  defaultStudent: string;
  downloadDone: string;
  shareDone: string;
  demoScore: number;
}

export interface CourseSystemCopy {
  landing: LandingCopy;
  player: PlayerCopy;
  certificate: CertificateCopy;
}

/** JSON widens every literal; cast once here so components stay typed. */
export const courseCopy = courseSystemJson as unknown as CourseSystemCopy;