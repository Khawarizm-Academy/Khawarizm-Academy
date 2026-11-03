export interface AnnouncementAuthor {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface CourseAnnouncement {
  id: string;
  courseId: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: AnnouncementAuthor;
}

export interface AnnouncementCourseOption {
  slug: string;
  title: string;
}

export interface AnnouncementInput {
  title: string;
  body: string;
  pinned: boolean;
}
