import contentJson from '@/shared/json/dashboardContent.json';
import type { RawViewHeader } from '@/features/dashboard/context/dashboardContext';

export interface EnrolledFilterOption {
  id: 'all' | 'in-progress' | 'completed';
  label: string;
}
export interface EnrolledSortOption {
  id: 'recent' | 'progress-desc' | 'alphabetical';
  label: string;
}
export interface CompetitionFilterOption {
  id: 'completed' | 'active';
  label: string;
}
export interface SavedTabOption {
  id: 'scholarships' | 'courses';
  label: string;
}

/** The dashboard view chrome: headers, page lists and filter chip options. */
export interface DashboardViewContent {
  headers: Record<string, RawViewHeader>;
  fullPageViews: string[];
  singleColumnViews: string[];
  savedTabs: SavedTabOption[];
  enrolledFilters: EnrolledFilterOption[];
  enrolledSortOptions: EnrolledSortOption[];
  competitionFilters: CompetitionFilterOption[];
}

export interface DashboardContentPayload {
  views: DashboardViewContent;
}

/** Static content for the in-dashboard modal chambers. */
export interface DashboardChambersPayload {
  /** The code-language selector is UI chrome, so it stays in the config. */
  arenaLanguages: Array<{ id: 'python' | 'ts'; label: string }>;
}

/** View chrome shared by every dashboard consumer (no server round-trip). */
export const DASHBOARD_CONTENT = contentJson.views as DashboardContentPayload['views'];

/** Chamber chrome the modal overlays read synchronously. */
export const DASHBOARD_CHAMBERS = contentJson.chambers as DashboardChambersPayload;
