"""Seed the database with the demo data.

Run with: python manage.py seed_data

The command is idempotent: it clears the academy tables and re-creates every
record from the Python literals in ``academy/seed_data.py``. There are no JSON
files involved — the data is defined in code and written into SQLite through
the ORM, matching the shapes the frontend expects.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction

from academy import models as m
from academy.seed_data import (
    DASHBOARD_CHAMBERS,
    DASHBOARD_NOTIFICATIONS,
    DASHBOARD_VIEWS,
    MOCK_CATALOG,
    MOCK_COURSE_PROBLEMS,
    MOCK_COURSES,
    MOCK_DASHBOARD,
    MOCK_HOMEPAGE,
)


def decimal(value: Any) -> Decimal | None:
    """Convert catalog ratings to Decimal (seed floats are plain numbers)."""
    if value is None:
        return None
    return Decimal(str(value))


class Command(BaseCommand):
    help = "Load the frontend mock data into the database."

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        self.stdout.write("Clearing existing academy data...")
        self.clear()

        self.stdout.write("Seeding catalog + courses...")
        self.seed_catalog()
        self.seed_course_details()
        self.seed_course_problems()

        self.stdout.write("Seeding dashboard...")
        self.seed_dashboard()

        self.stdout.write("Seeding home + events + competitions...")
        self.seed_homepage()
        self.seed_events_and_competitions()

        self.stdout.write("Seeding chambers + dashboard content...")
        self.seed_chambers()
        self.seed_content_blocks()

        self.stdout.write(self.style.SUCCESS("Seed complete."))

    # Clearing

    def clear(self) -> None:
        """Delete children before parents so cascades stay predictable."""
        m.CourseProblemOption.objects.all().delete()
        m.CourseProblem.objects.all().delete()
        m.CourseLesson.objects.all().delete()
        m.CourseModule.objects.all().delete()
        m.CourseLiveSession.objects.all().delete()
        m.Course.objects.all().delete()
        m.Scholarship.objects.all().delete()
        m.Category.objects.all().delete()

        m.EnrolledCourse.objects.all().delete()
        m.PriorityContinue.objects.all().delete()
        m.ImminentLiveSession.objects.all().delete()
        m.DashboardStat.objects.all().delete()
        m.UpcomingEvent.objects.all().delete()
        m.DashboardNotification.objects.all().delete()
        m.NotificationItemData.objects.all().delete()
        m.SavedScholarshipItem.objects.all().delete()
        m.FavoriteCourseItem.objects.all().delete()
        m.CompetitionItem.objects.all().delete()
        m.CertificateItem.objects.all().delete()
        m.Learner.objects.all().delete()

        m.HomeFeaturedCourse.objects.all().delete()
        m.HomeFeaturedScholarship.objects.all().delete()
        m.HomeCompetition.objects.all().delete()
        m.HomeEvent.objects.all().delete()
        m.HomeQuickLink.objects.all().delete()

        m.WorkspaceLesson.objects.all().delete()
        m.ClassroomMessage.objects.all().delete()
        m.ClassroomCodeLine.objects.all().delete()
        m.ArenaLanguage.objects.all().delete()
        m.ArenaLeader.objects.all().delete()
        m.ScholarshipCheck.objects.all().delete()
        m.DashboardContentBlock.objects.all().delete()

        m.EventItem.objects.all().delete()
        m.Competition.objects.all().delete()

    # Catalog + courses

    def seed_catalog(self) -> None:
        data = MOCK_CATALOG

        # Categories are the distinct categorySlug/label pairs found in the catalog.
        seen: set[str] = set()
        for item in data["courses"] + data["scholarships"]:
            slug = item.get("categorySlug")
            if slug and slug not in seen:
                seen.add(slug)
                m.Category.objects.create(slug=slug, label=item.get("category", slug))

        for course in data["courses"]:
            m.Course.objects.create(
                slug=course["id"],
                title=course["title"],
                category_label=course["category"],
                category_slug=course["categorySlug"],
                thumbnail_url=course["thumbnailUrl"],
                rating=decimal(course.get("rating")),
                duration=course.get("duration", ""),
                lessons_count=course.get("lessonsCount", 0),
                instructor=course.get("instructor", ""),
                course_level=course["courseLevel"],
                course_level_ar=course.get("courseLevelAr", ""),
                price_type=course["priceType"],
                price_label=course.get("priceLabel", ""),
                progress_badge=course.get("progressBadge", ""),
                language=course.get("language", "arabic"),
            )

        for scholarship in data["scholarships"]:
            m.Scholarship.objects.create(
                slug=scholarship["id"],
                title=scholarship["title"],
                category=scholarship.get("category", ""),
                category_slug=scholarship.get("categorySlug", ""),
                thumbnail_url=scholarship["thumbnailUrl"],
                country=scholarship.get("country", ""),
                country_slug=scholarship.get("countrySlug", ""),
                degree_level=scholarship.get("degreeLevel", ""),
                degree_label=scholarship.get("degreeLabel", ""),
                provider=scholarship.get("provider", ""),
                coverage_type=scholarship.get("coverageType", ""),
                coverage_label=scholarship.get("coverageLabel", ""),
                days_remaining=scholarship.get("daysRemaining"),
                deadline_badge=scholarship.get("deadlineBadge", ""),
                deadline_urgency=scholarship.get("deadlineUrgency", ""),
                status=scholarship.get("status", ""),
            )

    def seed_course_details(self) -> None:
        data = MOCK_COURSES

        for seed in data["details"]:
            course = m.Course.objects.get(slug=seed["id"])

            # Detail-only fields that the catalog summary does not carry.
            course.tagline = seed["tagline"]
            course.about = seed["about"]
            course.instructor_credential = seed["instructorCredential"]
            course.instructor_bio = seed["instructorBio"]
            course.review_count = seed["reviewCount"]
            course.enrolled_count = seed["enrolledCount"]
            course.started_lesson_slug = seed["startedLessonId"]
            course.outcomes = seed["outcomes"]
            exam = seed["exam"]
            course.exam_question_count = exam["questionCount"]
            course.exam_minutes = exam["minutes"]
            course.exam_pass_threshold = exam["passThreshold"]
            course.exam_attempts_left = exam["attemptsLeft"]
            course.related_ids = seed["relatedIds"]
            course.save()

            for module_index, module in enumerate(seed["modules"]):
                module_row = m.CourseModule.objects.create(
                    course=course,
                    module_id=module["id"],
                    title=module["title"],
                    order=module_index,
                )
                for lesson_index, lesson in enumerate(module["lessons"]):
                    m.CourseLesson.objects.create(
                        module=module_row,
                        lesson_id=lesson["id"],
                        title=lesson["title"],
                        duration=lesson["duration"],
                        summary=lesson["summary"],
                        order=lesson_index,
                    )

            for session_index, session in enumerate(seed["liveSessions"]):
                m.CourseLiveSession.objects.create(
                    course=course,
                    session_id=session["id"],
                    title=session["title"],
                    state=session["state"],
                    date_label=session["dateLabel"],
                    time_label=session["timeLabel"],
                    order=session_index,
                )

    def seed_course_problems(self) -> None:
        data = MOCK_COURSE_PROBLEMS

        for problem in data["problems"]:
            row = m.CourseProblem.objects.create(
                problem_id=problem["id"],
                prompt=problem["prompt"],
                code=problem["code"],
                correct_option_id=problem["correctOptionId"],
                explanation=problem["explanation"],
                hint=problem["hint"],
            )
            for option in problem["options"]:
                m.CourseProblemOption.objects.create(
                    problem=row,
                    option_id=option["id"],
                    label=option["label"],
                )

    # Dashboard

    def seed_dashboard(self) -> None:
        data = MOCK_DASHBOARD

        from api.learners import get_demo_learner

        learner = get_demo_learner()

        for course in data["enrolledCourses"]:
            m.EnrolledCourse.objects.create(
                learner=learner,
                course_id=course["id"],
                title=course["title"],
                instructor=course.get("instructor", ""),
                total_lessons=course.get("totalLessons", 0),
                track=course.get("track", ""),
                progress=course.get("progress", 0),
                last_lesson=course.get("lastLesson", ""),
                exact_unit_lesson=course.get("exactUnitLesson", ""),
                thumbnail=course.get("thumbnail", ""),
                next_live_time=course.get("nextLiveTime", ""),
                icon_type=course.get("iconType", ""),
                is_completed=course.get("isCompleted", False),
                completion_date=course.get("completionDate", ""),
                slug=course.get("slug", ""),
            )

        priority = data["priorityContinueCourse"]
        m.PriorityContinue.objects.create(
            learner=learner,
            course_id=priority["id"],
            title=priority["title"],
            level_duration=priority.get("levelDuration", ""),
            instructor_subtitle=priority.get("instructorSubtitle", ""),
            lesson_status=priority.get("lessonStatus", ""),
            progress=priority.get("progress", 0),
            thumbnail=priority.get("thumbnail", ""),
        )

        live = data["imminentLiveSession"]
        m.ImminentLiveSession.objects.create(
            learner=learner,
            session_id=live["id"],
            course_title=live["courseTitle"],
            instructor=live.get("instructor", ""),
            initial_remaining_seconds=live.get("initialRemainingSeconds", 0),
            thumbnail=live.get("thumbnail", ""),
            meet_url=live.get("meetUrl", ""),
        )

        stats = data["stats"]
        m.DashboardStat.objects.create(
            learner=learner,
            attendance_rate=stats["attendanceRate"],
            attendance_note=stats.get("attendanceNote", ""),
            gpa=stats.get("gpa", ""),
            gpa_rating=stats.get("gpaRating", ""),
            points_earned=stats.get("pointsEarned", 0),
            rank_note=stats.get("rankNote", ""),
        )

        for event in data["upcomingEvents"]:
            m.UpcomingEvent.objects.create(
                learner=learner,
                event_id=event["id"],
                title=event["title"],
                date_text=event.get("dateText", ""),
                event_type=event.get("type", "submission"),
                type_label=event.get("typeLabel", ""),
            )

        for notif in data["notifications"]:
            m.DashboardNotification.objects.create(
                learner=learner,
                notification_id=notif["id"],
                title=notif.get("title", ""),
                time_ago=notif.get("timeAgo", ""),
                notification_type=notif.get("type", "lesson"),
                is_read=notif.get("isRead", False),
                link=notif.get("link", ""),
            )

        for notif in data["dashboardNotifications"]:
            m.NotificationItemData.objects.create(
                learner=learner,
                notification_id=notif["id"],
                message=notif.get("message", ""),
                time_ago=notif.get("timeAgo", ""),
                notification_type=notif.get("type", "lesson"),
                is_unread=notif.get("isUnread", False),
            )

        for saved in data["savedScholarships"]:
            m.SavedScholarshipItem.objects.create(
                learner=learner,
                item_id=saved["id"],
                title=saved["title"],
                provider=saved.get("provider", ""),
                deadline_text=saved.get("deadlineText", ""),
                is_urgent=saved.get("isUrgent", False),
                coverage=saved.get("coverage", ""),
                gpa_requirement=saved.get("gpaRequirement", ""),
            )

        for favorite in data["favoriteCourses"]:
            m.FavoriteCourseItem.objects.create(
                learner=learner,
                item_id=favorite["id"],
                title=favorite["title"],
                provider=favorite.get("provider", ""),
                duration_text=favorite.get("durationText", ""),
            )

        for competition in data["competitions"]:
            m.CompetitionItem.objects.create(
                learner=learner,
                item_id=competition["id"],
                title=competition["title"],
                status_text=competition.get("statusText", ""),
                status_color=competition.get("statusColor", "blue"),
                action_label=competition.get("actionLabel", ""),
                action_variant=competition.get("actionVariant", "sky"),
            )

        for certificate in data["certificates"]:
            m.CertificateItem.objects.create(
                learner=learner,
                item_id=certificate["id"],
                title=certificate["title"],
                issue_date=certificate.get("issueDate", ""),
                credential_id=certificate.get("credentialId", ""),
                is_official=certificate.get("isOfficial", True),
                course_slug=certificate.get("courseSlug", ""),
            )

    # Home

    def seed_homepage(self) -> None:
        data = MOCK_HOMEPAGE

        for course in data["courses"]:
            m.HomeFeaturedCourse.objects.create(
                course_id=course["id"],
                title=course["title"],
                category=course.get("category", ""),
                level=course.get("level", ""),
                duration=course.get("duration", ""),
                students_count=course.get("studentsCount", ""),
                status=course.get("status", ""),
                thumbnail_type=course.get("thumbnailType", ""),
            )

        for scholarship in data["scholarships"]:
            m.HomeFeaturedScholarship.objects.create(
                scholarship_id=scholarship["id"],
                title=scholarship["title"],
                provider=scholarship.get("provider", ""),
                location=scholarship.get("location", ""),
                deadline_text=scholarship.get("deadlineText", ""),
                deadline_urgency=scholarship.get("deadlineUrgency", ""),
                coverage=scholarship.get("coverage", ""),
                degree_level=scholarship.get("degreeLevel", ""),
                icon_type=scholarship.get("iconType", ""),
                thumbnail_type=scholarship.get("thumbnailType", ""),
            )

        for key in ("competitionMobile", "competitionDesktop"):
            competition = data[key]
            m.HomeCompetition.objects.create(
                key="mobile" if key == "competitionMobile" else "desktop",
                competition_id=competition["id"],
                title=competition["title"],
                badge=competition.get("badge", ""),
                description=competition.get("description", ""),
                days_remaining=competition.get("daysRemaining", ""),
                hours_remaining=competition.get("hoursRemaining", ""),
                action_text=competition.get("actionText", ""),
            )

        for key, label in (
            ("eventMobile", "mobile"),
            ("eventDesktopFeatured", "desktopFeatured"),
            ("eventDesktopWorkshop", "desktopWorkshop"),
        ):
            event = data[key]
            m.HomeEvent.objects.create(
                key=label,
                event_id=event["id"],
                title=event["title"],
                description=event.get("description", ""),
                badge=event.get("badge", ""),
                date=event.get("date", ""),
                format=event.get("format", ""),
                is_featured=event.get("isFeatured", False),
                thumbnail_type=event.get("thumbnailType", ""),
            )

        for link in data["quickLinks"]:
            m.HomeQuickLink.objects.create(
                link_id=link["id"],
                icon=link.get("icon", ""),
                label=link.get("label", ""),
                subtitle=link.get("subtitle", ""),
                tone=link.get("tone", "blue"),
                target=link.get("target", ""),
            )

    def seed_events_and_competitions(self) -> None:
        """Global event/competition lists, sourced from the home content."""
        data = MOCK_HOMEPAGE

        for key, label in (
            ("eventMobile", "mobile"),
            ("eventDesktopFeatured", "desktopFeatured"),
            ("eventDesktopWorkshop", "desktopWorkshop"),
        ):
            event = data[key]
            m.EventItem.objects.create(
                event_id=event["id"],
                title=event["title"],
                description=event.get("description", ""),
                badge=event.get("badge", ""),
                date=event.get("date", ""),
                format=event.get("format", ""),
                is_featured=event.get("isFeatured", False),
                thumbnail_type=event.get("thumbnailType", ""),
            )

        for key in ("competitionMobile", "competitionDesktop"):
            competition = data[key]
            m.Competition.objects.create(
                competition_id=competition["id"],
                title=competition["title"],
                badge=competition.get("badge", ""),
                description=competition.get("description", ""),
                days_remaining=competition.get("daysRemaining", ""),
                hours_remaining=competition.get("hoursRemaining", ""),
                action_text=competition.get("actionText", ""),
            )

    # Chambers + content

    def seed_chambers(self) -> None:
        data = DASHBOARD_CHAMBERS

        for lesson in data["workspaceLessons"]:
            m.WorkspaceLesson.objects.create(
                lesson_id=lesson["id"],
                title=lesson["title"],
                duration=lesson["duration"],
                is_completed=lesson.get("isCompleted", False),
            )

        for message in data["classroomMessages"]:
            m.ClassroomMessage.objects.create(
                message_id=message["id"],
                sender=message["sender"],
                text=message["text"],
                time=message["time"],
                is_instructor=message.get("isInstructor", False),
            )

        for index, line in enumerate(data["classroomCode"]):
            m.ClassroomCodeLine.objects.create(
                order=index,
                tone=line["tone"],
                indent=line["indent"],
                text=line["text"],
            )

        for language in data["arenaLanguages"]:
            m.ArenaLanguage.objects.create(lang_id=language["id"], label=language["label"])

        for index, leader in enumerate(data["arenaLeaders"]):
            m.ArenaLeader.objects.create(
                order=index,
                name=leader["name"],
                score=leader["score"],
                tone=leader["tone"],
            )

        for index, check in enumerate(data["scholarshipChecks"]):
            m.ScholarshipCheck.objects.create(
                order=index,
                kind=check["kind"],
                icon=check.get("icon", ""),
                label=check.get("label", ""),
                status=check.get("status", ""),
            )

    def seed_content_blocks(self) -> None:
        views = DASHBOARD_VIEWS
        notifications = DASHBOARD_NOTIFICATIONS
        chambers = DASHBOARD_CHAMBERS

        m.DashboardContentBlock.objects.create(key="dashboard-views", payload=views)
        m.DashboardContentBlock.objects.create(key="dashboard-notifications", payload=notifications)
        m.DashboardContentBlock.objects.create(
            key="dashboard-chambers-misc",
            payload={"arenaStarterCode": chambers["arenaStarterCode"]},
        )
