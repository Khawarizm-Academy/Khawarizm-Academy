export type ReviewSort = 'newest' | 'highest' | 'lowest';

export interface ReviewAuthor {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface CourseReview {
  id: string;
  courseSlug: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isHidden: boolean;
  author: ReviewAuthor;
  reply?: {
    body: string;
    createdAt: string;
    author: ReviewAuthor;
  };
}

export interface ReviewEligibility {
  enrolled: boolean;
  progress: number;
  minimumProgress: number;
  eligible: boolean;
}

export interface ReviewSummary {
  rating: number | null;
  reviewCount: number;
  distribution: Record<string, number>;
}

export interface CourseReviewPage {
  summary: ReviewSummary;
  items: CourseReview[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalResults: number;
  eligibility: ReviewEligibility;
  ownReview: CourseReview | null;
}

export interface StudioReview extends CourseReview {
  courseTitle: string;
}

export interface StudioReviewPage {
  items: StudioReview[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalResults: number;
}
