"""Seeds the database with the reference data and demo content.

Everything that used to be mock JSON (catalog filters, categories) or a shipped
seed record now lives in tables. The command is idempotent: run it as often as
you like with `python manage.py seed_demo`.
"""

from __future__ import annotations

import os

from django.core.management.base import BaseCommand
from django.db import transaction

from features.auth.models import User
from features.auth.services import ensure_profile
from features.catalog.models import Category, FilterGroup, FilterOption
from features.common.choices import (
    CategorySlug,
    CourseLevel,
    CoursePriceType,
    EventFormat,
    Role,
    ScholarshipStatus,
)
from features.competitions.models import Competition
from features.courses.models import Course, CourseLesson, CourseLiveSession, CourseModule
from features.dashboard.models import (
    Certificate,
    DashboardNotification,
    DashboardStat,
    Enrollment,
    FavoriteCourse,
    NotificationItemData,
    PriorityContinue,
    SavedCompetition,
    SavedScholarship,
    UpcomingEvent,
)
from features.events.models import EventItem
from features.home.models import (
    HomeCompetitionSpot,
    HomeEventSpot,
    HomeFeaturedCourse,
    HomeFeaturedScholarship,
    HomeQuickLink,
)
from features.scholarships.models import Scholarship

# The catalog sidebar used to read these from catalog.json; now they are rows.
# (value, label, tabs) — an empty `tabs` means the option shows on every tab.
CATEGORIES = [
    (CategorySlug.AI, "ذكاء اصطناعي"),
    (CategorySlug.PROGRAMMING, "برمجة"),
    (CategorySlug.CYBERSECURITY, "أمن سيبراني"),
    (CategorySlug.SPACE, "فضاء"),
    (CategorySlug.CS, "علوم الحاسب"),
]

FILTER_GROUPS = [
    {
        "key": "field",
        "label": "المجال",
        "tone": "gold",
        "glow": True,
        "surfaces": ["desktop", "mobile"],
        "options": [("all", "الكل", []), ("ai", "ذكاء اصطناعي", []), ("programming", "برمجة", []), ("cybersecurity", "أمن سيبراني", []), ("space", "فضاء", [])],
    },
    {
        "key": "level",
        "label": "المستوى التعليمي",
        "tone": "gold",
        "mobile_tone": "sky",
        "glow": True,
        "surfaces": ["desktop", "mobile"],
        "options": [
            ("all", "الكل", []),
            ("bachelor", "بكالوريوس", []),
            ("master", "ماجستير", []),
            ("phd", "دكتوراه", []),
            ("beginner", "مبتدئ", ["courses"]),
            ("intermediate", "متوسط", ["courses"]),
            ("advanced", "متقدم", ["courses"]),
            ("bootcamp", "دورات تدريبية", ["all"]),
        ],
    },
    {
        "key": "language",
        "label": "اللغة",
        "tone": "sky",
        "glow": False,
        "surfaces": ["desktop"],
        "options": [("all", "الكل", []), ("arabic", "العربية", []), ("english", "الإنجليزية", []), ("french", "الفرنسية", [])],
    },
    {
        "key": "cost",
        "label": "التكلفة",
        "tone": "sky",
        "glow": False,
        "surfaces": ["desktop", "mobile"],
        "options": [("all", "الكل", []), ("free", "مجانية", []), ("paid", "مدفوعة", [])],
    },
    {
        "key": "country",
        "label": "البلد المتاح",
        "tone": "gold",
        "glow": False,
        "surfaces": ["desktop", "mobile"],
        "options": [("all", "الكل", []), ("saudi", "السعودية", []), ("usa", "أمريكا", []), ("turkey", "تركيا", []), ("uk", "بريطانيا", [])],
    },
    {
        "key": "status",
        "label": "حالة التقديم",
        "tone": "gold",
        "glow": False,
        "surfaces": ["desktop"],
        "options": [("all", "الكل", []), ("open", "مفتوح الآن", []), ("closing_soon", "ينتهي قريباً", []), ("closed", "مغلق", [])],
    },
    {
        "key": "sort",
        "label": "الترتيب",
        "tone": "sky",
        "kind": "sort",
        "surfaces": ["desktop", "mobile"],
        "options": [("newest", "الأحدث", []), ("rating", "التقييم", []), ("deadline", "الأقرب انتهاءً", []), ("popular", "الأكثر شيوعًا", [])],
    },
]

COURSES = [
    {
        "slug": "course-1",
        "title": "أساسيات الذكاء الاصطناعي",
        "category_label": "ذكاء اصطناعي",
        "category_slug": CategorySlug.AI,
        "course_level": CourseLevel.BEGINNER,
        "course_level_ar": "مبتدئ",
        "price_type": CoursePriceType.FREE,
        "price_label": "مجانية",
        "duration": "6 ساعات",
        "lessons_count": 3,
        "instructor": "د. سالم العتيبي",
        "thumbnail_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
        "tagline": "ابدأ رحلتك في عالم الذكاء الاصطناعي من الصفر.",
        "about": "دورة تمهيدية تشرح مفاهيم الذكاء الاصطناعي الأساسية وتطبيقاتها العملية.",
        "outcomes": ["فهم مفاهيم الذكاء الاصطناعي", "بناء أول نموذج بسيط", "التعرّف على أدوات السوق"],
    },
    {
        "slug": "course-2",
        "title": "تطوير الويب الحديث",
        "category_label": "برمجة",
        "category_slug": CategorySlug.PROGRAMMING,
        "course_level": CourseLevel.INTERMEDIATE,
        "course_level_ar": "متوسط",
        "price_type": CoursePriceType.PAID,
        "price_label": "٢٩٩ ر.س",
        "duration": "12 ساعة",
        "lessons_count": 3,
        "instructor": "م. نورة الحربي",
        "thumbnail_url": "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800",
        "tagline": "ابنِ تطبيقات ويب متكاملة بأحدث التقنيات.",
        "about": "من HTML إلى React، رحلة عملية لبناء واجهات حديثة.",
        "outcomes": ["إتقان HTML و CSS", "بناء مكوّنات React", "نشر المشروع"],
    },
    {
        "slug": "course-3",
        "title": "أمن المعلومات التطبيقي",
        "category_label": "أمن سيبراني",
        "category_slug": CategorySlug.CYBERSECURITY,
        "course_level": CourseLevel.ADVANCED,
        "course_level_ar": "متقدم",
        "price_type": CoursePriceType.PAID,
        "price_label": "٤٩٩ ر.س",
        "duration": "18 ساعة",
        "lessons_count": 3,
        "instructor": "د. فيصل الشمري",
        "thumbnail_url": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800",
        "tagline": "احمِ الأنظمة وتعلّم أساليب الاختراق الأخلاقي.",
        "about": "دورة متقدمة في تحليل الثغرات والدفاع السيبراني.",
        "outcomes": ["اختبار الاختراق", "تحليل الثغرات", "بناء دفاعات قوية"],
    },
]

SCHOLARSHIPS = [
    {
        "slug": "scholarship-1",
        "title": "منحة جامعة الملك عبدالله",
        "category": "ذكاء اصطناعي",
        "category_slug": CategorySlug.AI,
        "country": "السعودية",
        "country_slug": "saudi",
        "degree_level": "master",
        "degree_label": "ماجستير",
        "provider": "جامعة الملك عبدالله",
        "coverage_label": "ممولة بالكامل",
        "days_remaining": 21,
        "deadline_badge": "متبقٍ ٢١ يوماً",
        "deadline_urgency": "normal",
        "status": ScholarshipStatus.OPEN,
        "thumbnail_url": "https://images.unsplash.com/photo-1562774053-701939374585?w=800",
    },
    {
        "slug": "scholarship-2",
        "title": "منحة MIT للباحثين",
        "category": "علوم الحاسب",
        "category_slug": CategorySlug.CS,
        "country": "أمريكا",
        "country_slug": "usa",
        "degree_level": "phd",
        "degree_label": "دكتوراه",
        "provider": "MIT",
        "coverage_label": "تمويل جزئي",
        "days_remaining": 4,
        "deadline_badge": "متبقٍ ٤ أيام",
        "deadline_urgency": "critical",
        "status": ScholarshipStatus.CLOSING_SOON,
        "thumbnail_url": "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=800",
    },
]

EVENTS = [
    {
        "event_id": "event-1",
        "title": "ورشة علوم البيانات",
        "description": "ورشة عملية في تحليل البيانات.",
        "badge": "ورشة",
        "date": "٢٤ أكتوبر ٢٠٢٦",
        "format": EventFormat.IN_PERSON,
        "is_featured": True,
        "thumbnail_type": "academic_workshop",
    },
    {
        "event_id": "event-2",
        "title": "جلسة مباشرة: الفضاء",
        "description": "حوار مفتوح مع خبراء الفضاء.",
        "badge": "بث مباشر",
        "date": "٣٠ أكتوبر ٢٠٢٦",
        "format": EventFormat.LIVE,
        "is_featured": False,
        "thumbnail_type": "space_astrolabe",
    },
]

COMPETITIONS = [
    {
        "competition_id": "competition-1",
        "title": "تحدي الذكاء الاصطناعي",
        "badge": "تحدٍّ مفتوح",
        "description": "ابنِ نموذجاً يحل مشكلة واقعية.",
        "days_remaining": "12",
        "hours_remaining": "6",
        "action_text": "شارك الآن",
    }
]

QUICK_LINKS = [
    ("link-1", "book-open", "الدورات", "تابع تعلّمك", "blue", "courses"),
    ("link-2", "award", "المنح", "فرص مميزة", "gold", "scholarships"),
]


class Command(BaseCommand):
    help = "Seed reference data (filters/categories) and demo content into the database."

    def add_arguments(self, parser):
        parser.add_argument("--flush", action="store_true", help="Delete seeded content first")

    @transaction.atomic
    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()
        self._seed_reference()
        users = self._seed_users()
        content = self._seed_content()
        self._seed_home(content)
        self._seed_dashboard(users["student"], content)
        self.stdout.write(self.style.SUCCESS("Seeded reference data and demo content."))
        self.stdout.write(f"  admin: {users['admin'].email} / password from DJANGO_DEMO_ADMIN_PASSWORD or 'admin12345'")
        self.stdout.write(f"  student: {users['student'].email}")
        self.stdout.write(f"  instructor: {users['instructor'].email}")

    def _flush(self) -> None:
        for model in (HomeQuickLink, HomeEventSpot, HomeCompetitionSpot, HomeFeaturedScholarship, HomeFeaturedCourse, Enrollment, PriorityContinue, FavoriteCourse, SavedScholarship, SavedCompetition, Certificate, DashboardStat, UpcomingEvent, DashboardNotification, NotificationItemData):
            model.objects.all().delete()

    def _seed_reference(self) -> None:
        for slug, label in CATEGORIES:
            Category.objects.update_or_create(slug=slug, defaults={"label": label})
        for order, spec in enumerate(FILTER_GROUPS):
            group, _ = FilterGroup.objects.update_or_create(
                key=spec["key"],
                defaults={
                    "label": spec["label"],
                    "kind": spec.get("kind", "choice"),
                    "tone": spec["tone"],
                    "mobile_tone": spec.get("mobile_tone", ""),
                    "glow": spec.get("glow", False),
                    "surfaces": spec["surfaces"],
                    "order": order,
                    "is_active": True,
                },
            )
            for option_order, (value, label, tabs) in enumerate(spec["options"]):
                FilterOption.objects.update_or_create(
                    group=group,
                    value=value,
                    defaults={"label": label, "tabs": tabs, "order": option_order, "is_active": True},
                )

    def _seed_users(self) -> dict[str, User]:
        admin_email = "admin@khawarizm.dev"
        admin, created = User.objects.get_or_create(email=admin_email, defaults={"role": Role.ADMIN, "full_name": "مدير النظام", "is_staff": True, "is_superuser": True})
        if created:
            admin.set_password(os.environ.get("DJANGO_DEMO_ADMIN_PASSWORD", "admin12345"))
            admin.save()
        ensure_profile(admin)

        student, _ = User.objects.get_or_create(
            email="ahmad.q@example.com",
            defaults={
                "role": Role.STUDENT,
                "full_name": "أحمد محمد القحطاني",
                "phone": "+966 55 820 1437",
                "membership_status": "متعلّم منذ مارس 2024 · المستوى المتوسط",
                "avatar_initials": "أق",
                "timezone": "الرياض (GMT+3)",
            },
        )
        ensure_profile(student)
        student.student_profile.learning_level = "intermediate"
        student.student_profile.interests = ["الذكاء الاصطناعي", "تحليل البيانات", "البرمجة والتطوير"]
        student.student_profile.notifications = {"liveSessionReminders": True, "weeklyProgressSummary": True, "recommendedOpportunities": False}
        student.student_profile.save()

        instructor, _ = User.objects.get_or_create(
            email="salem.otaibi@example.com",
            defaults={"role": Role.INSTRUCTOR, "full_name": "د. سالم العتيبي"},
        )
        ensure_profile(instructor)
        instructor.instructor_profile.headline = "أستاذ الذكاء الاصطناعي"
        instructor.instructor_profile.credential = "أستاذ مشارك · جامعة الملك سعود"
        instructor.instructor_profile.save()
        return {"admin": admin, "student": student, "instructor": instructor}

    def _seed_content(self) -> dict:
        for spec in COURSES:
            course, _ = Course.objects.update_or_create(slug=spec["slug"], defaults=spec)
            for index in range(1, 4):
                module, _ = CourseModule.objects.update_or_create(course=course, module_id=f"{course.slug}-m{index}", defaults={"title": f"الوحدة {index}", "order": index})
                CourseLesson.objects.update_or_create(
                    module=module,
                    lesson_id=f"{course.slug}-m{index}-l1",
                    defaults={"title": f"الدرس {index}", "duration": "12:00", "summary": "شرح مبسّط مع أمثلة.", "order": 1},
                )
            CourseLiveSession.objects.update_or_create(
                course=course,
                session_id=f"{course.slug}-live-1",
                defaults={"title": "جلسة مراجعة أسبوعية", "state": "upcoming", "date_label": "الأحد القادم", "time_label": "٨:٠٠ م", "meet_url": "https://meet.google.com/abc-defg-hij"},
            )

        for spec in SCHOLARSHIPS:
            Scholarship.objects.update_or_create(slug=spec["slug"], defaults=spec)

        for spec in EVENTS:
            EventItem.objects.update_or_create(event_id=spec["event_id"], defaults=spec)

        for spec in COMPETITIONS:
            Competition.objects.update_or_create(competition_id=spec["competition_id"], defaults=spec)

        return {
            "courses": {c["slug"]: Course.objects.get(slug=c["slug"]) for c in COURSES},
            "scholarships": {s["slug"]: Scholarship.objects.get(slug=s["slug"]) for s in SCHOLARSHIPS},
            "events": {e["event_id"]: EventItem.objects.get(event_id=e["event_id"]) for e in EVENTS},
            "competitions": {c["competition_id"]: Competition.objects.get(competition_id=c["competition_id"]) for c in COMPETITIONS},
        }

    def _seed_home(self, content: dict) -> None:
        for order, (slug, course) in enumerate(content["courses"].items()):
            HomeFeaturedCourse.objects.update_or_create(course=course, defaults={"students_count": "1,240 طالب", "status": "متاح", "thumbnail_type": "ai_generative", "order": order})
        for order, (slug, scholarship) in enumerate(content["scholarships"].items()):
            HomeFeaturedScholarship.objects.update_or_create(scholarship=scholarship, defaults={"deadline_text": scholarship.deadline_badge, "icon_type": "university", "thumbnail_type": "astrolabe_scholarship", "order": order})
        HomeCompetitionSpot.objects.update_or_create(key="mobile", defaults={"competition": content["competitions"]["competition-1"]})
        HomeCompetitionSpot.objects.update_or_create(key="desktop", defaults={"competition": content["competitions"]["competition-1"]})
        HomeEventSpot.objects.update_or_create(key="mobile", defaults={"event": content["events"]["event-1"]})
        HomeEventSpot.objects.update_or_create(key="desktopFeatured", defaults={"event": content["events"]["event-2"]})
        HomeEventSpot.objects.update_or_create(key="desktopWorkshop", defaults={"event": content["events"]["event-1"]})
        for order, (link_id, icon, label, subtitle, tone, target) in enumerate(QUICK_LINKS):
            HomeQuickLink.objects.update_or_create(link_id=link_id, defaults={"icon": icon, "label": label, "subtitle": subtitle, "tone": tone, "target": target, "order": order})

    def _seed_dashboard(self, student: User, content: dict) -> None:
        course1 = content["courses"]["course-1"]
        course2 = content["courses"]["course-2"]
        Enrollment.objects.update_or_create(user=student, course=course1, defaults={"progress": 62, "last_lesson": "الوحدة 2 · الدرس 1", "exact_unit_lesson": "الوحدة 2", "next_live_time": "الأحد ٨:٠٠ م", "icon_type": "ai", "is_completed": False})
        Enrollment.objects.update_or_create(user=student, course=course2, defaults={"progress": 30, "last_lesson": "الوحدة 1 · الدرس 2", "exact_unit_lesson": "الوحدة 1", "icon_type": "code", "is_completed": False})
        PriorityContinue.objects.update_or_create(user=student, course=course1, defaults={"progress": 62, "lesson_status": "استكمل من حيث توقفت"})
        DashboardStat.objects.update_or_create(user=student, defaults={"attendance_rate": 98, "attendance_note": "ممتاز", "gpa": "4.7", "gpa_rating": "ممتاز", "points_earned": 1240, "rank_note": "المرتبة 12"})
        SavedScholarship.objects.update_or_create(user=student, scholarship=content["scholarships"]["scholarship-1"], defaults={"is_urgent": False, "gpa_requirement": "3.5"})
        FavoriteCourse.objects.update_or_create(user=student, course=course2)
        SavedCompetition.objects.update_or_create(user=student, competition=content["competitions"]["competition-1"], defaults={"status_text": "قيد المشاركة", "status_color": "blue", "action_label": "عرض", "action_variant": "sky"})
        Certificate.objects.update_or_create(user=student, course=course1, defaults={"issue_date": "١٠ أكتوبر ٢٠٢٦", "credential_id": "KHM-COURSE-1", "is_official": True})
        UpcomingEvent.objects.update_or_create(user=student, event_id="due-1", defaults={"title": "تسليم مشروع الوحدة 2", "date_text": "غداً · ٩:٠٠ م", "event_type": "submission", "type_label": "تسليم"})
        DashboardNotification.objects.update_or_create(user=student, notification_id="note-1", defaults={"title": "درس جديد متاح", "time_ago": "قبل ساعة", "notification_type": "lesson", "is_read": False, "link": "/courses/course-1"})
        NotificationItemData.objects.update_or_create(user=student, notification_id="note-1", defaults={"message": "تم إضافة درس جديد إلى دورتك.", "time_ago": "قبل ساعة", "notification_type": "lesson", "is_unread": True})
