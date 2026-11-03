"""Seeds the database with the reference data and demo content.

Everything that used to be mock JSON (catalog filters, categories) or a shipped
seed record now lives in tables. The command is idempotent: run it as often as
you like with `python manage.py seed_demo`.
"""

from __future__ import annotations

import os
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from features.access.models import AccessRole, RoleAssignment
from features.access.registry import ROLE_TEMPLATES, validate_permission_keys
from features.access.services import bootstrap_system_roles, sync_primary_role
from features.auth.models import User
from features.catalog.models import Category, FilterGroup, FilterOption
from features.common.choices import (
    CategorySlug,
    CourseLevel,
    CoursePriceType,
    CourseStaffKind,
    CourseStatus,
    EventFormat,
    LessonKind,
    QuestionKind,
    QuizKind,
    Role,
    ScholarshipStatus,
)
from features.competitions.models import Competition
from features.courses.models import Course, CourseLesson, CourseLiveSession, CourseModule, CourseStaff
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
from features.quizzes.models import Option, Question, Quiz
from features.reviews.models import CourseReview
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
        "options": [
            ("all", "الكل", []),
            ("ai", "ذكاء اصطناعي", []),
            ("programming", "برمجة", []),
            ("cybersecurity", "أمن سيبراني", []),
            ("space", "فضاء", []),
        ],
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
        "options": [
            ("all", "الكل", []),
            ("arabic", "العربية", []),
            ("english", "الإنجليزية", []),
            ("french", "الفرنسية", []),
        ],
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
        "options": [
            ("all", "الكل", []),
            ("saudi", "السعودية", []),
            ("usa", "أمريكا", []),
            ("turkey", "تركيا", []),
            ("uk", "بريطانيا", []),
        ],
    },
    {
        "key": "status",
        "label": "حالة التقديم",
        "tone": "gold",
        "glow": False,
        "surfaces": ["desktop"],
        "options": [
            ("all", "الكل", []),
            ("open", "مفتوح الآن", []),
            ("closing_soon", "ينتهي قريباً", []),
            ("closed", "مغلق", []),
        ],
    },
    {
        "key": "sort",
        "label": "الترتيب",
        "tone": "sky",
        "kind": "sort",
        "surfaces": ["desktop", "mobile"],
        "options": [
            ("newest", "الأحدث", []),
            ("rating", "التقييم", []),
            ("deadline", "الأقرب انتهاءً", []),
            ("popular", "الأكثر شيوعًا", []),
        ],
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
    ("link-1", "BookOpen", "الدورات", "تابع تعلّمك", "blue", "courses"),
    ("link-2", "Award", "المنح", "فرص مميزة", "gold", "scholarships"),
]

# --- Phase 14 (P14.1): development-only demo data ---------------------------
# `admin@khawarizm.dev` is created by `_seed_users` and is the only account that
# survives a production run. Everything below is what the `--demo` gate guards:
# the logins must never exist on a real database.
DEMO_ACCOUNTS = (
    {
        "key": "instructor",
        "email": "instructor@khawarizm.dev",
        "full_name": "م. نورة الحربي",
        "avatar_initials": "نح",
        "roles": ("instructor",),
    },
    {
        "key": "assistant",
        "email": "assistant@khawarizm.dev",
        "full_name": "خالد الحربي",
        "avatar_initials": "خح",
        "roles": ("teaching_assistant",),
    },
    {
        "key": "learner",
        "email": "student@khawarizm.dev",
        "full_name": "سارة العبدالله",
        "avatar_initials": "سع",
        "roles": (),
    },
)

DEMO_COURSE_SLUG = "demo-course"
DEMO_VIDEO_LESSON_ID = f"{DEMO_COURSE_SLUG}-m2-l1"

# A real article body, because an empty `content` renders an empty reader and
# teaches nothing about the article lesson kind.
DEMO_ARTICLE_MARKDOWN = """## لماذا درس مقالي؟

الدرس المقالي كامل بذاته: لا يحتاج ملف فيديو ليُقرأ، ولا ينتظر معالجة من مزوّد.

### ماذا ستتعلمين هنا

1. كيف تُقرأ بنية المنهج: وحدة، ثم درس، ثم مصدر.
2. أين تُحفظ نسبة الإنجاز ولماذا تُشتق في الخادم لا في المتصفح.
3. ما الذي يشغّل إصدار الشهادة بعد إكمال كل الدروس.

> ملاحظة: هذا النص يُعرض كما هو في القارئ، وهو نفس المسار الذي يستخدمه المدرّب
> عند نشر درس مقالي من الاستوديو.
"""


class Command(BaseCommand):
    help = "Seed reference data (filters/categories) and demo content into the database."

    def add_arguments(self, parser):
        parser.add_argument("--flush", action="store_true", help="Delete seeded content first")
        parser.add_argument(
            "--demo",
            action="store_true",
            help="Also create the demo accounts and the demo course journey (off in production)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()
        bootstrap_system_roles()
        self._seed_reference()
        users = self._seed_users()
        content = self._seed_content()
        self._seed_home(content)
        self._seed_dashboard(users["student"], content)
        self.stdout.write(self.style.SUCCESS("Seeded reference data and demo content."))
        self.stdout.write(f"  admin: {users['admin'].email} / password from DJANGO_DEMO_ADMIN_PASSWORD or 'admin12345'")
        self.stdout.write(f"  student: {users['student'].email}")
        self.stdout.write(f"  instructor: {users['instructor'].email}")
        # Phase 14 P14.1: the role templates, the extra demo logins and the demo
        # course journey are development-only. A production seed run installs the
        # reference tables and nothing that looks like a fake learner.
        if options["demo"] or settings.DEBUG:
            self._seed_demo(self._seed_roles())
        else:
            self.stdout.write("  demo content skipped (run with --demo, or in DEBUG)")

    def _flush(self) -> None:
        for model in (
            HomeQuickLink,
            HomeEventSpot,
            HomeCompetitionSpot,
            HomeFeaturedScholarship,
            HomeFeaturedCourse,
            Enrollment,
            PriorityContinue,
            FavoriteCourse,
            SavedScholarship,
            SavedCompetition,
            Certificate,
            DashboardStat,
            UpcomingEvent,
            DashboardNotification,
            NotificationItemData,
        ):
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
        admin, created = User.objects.get_or_create(
            email=admin_email,
            defaults={"role": Role.ADMIN, "full_name": "مدير النظام", "is_staff": True, "is_superuser": True},
        )
        if created:
            admin.set_password(os.environ.get("DJANGO_DEMO_ADMIN_PASSWORD", "admin12345"))
            admin.save()
        sync_primary_role(admin)

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
        sync_primary_role(student)
        student.student_profile.learning_level = "intermediate"
        student.student_profile.interests = ["الذكاء الاصطناعي", "تحليل البيانات", "البرمجة والتطوير"]
        student.student_profile.notifications = {
            "liveSessionReminders": True,
            "weeklyProgressSummary": True,
            "recommendedOpportunities": False,
        }
        student.student_profile.save()

        instructor, _ = User.objects.get_or_create(
            email="salem.otaibi@example.com",
            defaults={"role": Role.INSTRUCTOR, "full_name": "د. سالم العتيبي"},
        )
        sync_primary_role(instructor)
        instructor.instructor_profile.headline = "أستاذ الذكاء الاصطناعي"
        instructor.instructor_profile.credential = "أستاذ مشارك · جامعة الملك سعود"
        instructor.instructor_profile.save()
        return {"admin": admin, "student": student, "instructor": instructor}

    def _seed_content(self) -> dict:
        for spec in COURSES:
            course, _ = Course.objects.update_or_create(slug=spec["slug"], defaults=spec)
            for index in range(1, 4):
                module, _ = CourseModule.objects.update_or_create(
                    course=course,
                    module_id=f"{course.slug}-m{index}",
                    defaults={"title": f"الوحدة {index}", "order": index},
                )
                CourseLesson.objects.update_or_create(
                    module=module,
                    lesson_id=f"{course.slug}-m{index}-l1",
                    defaults={
                        "title": f"الدرس {index}",
                        "duration": "12:00",
                        "summary": "شرح مبسّط مع أمثلة.",
                        "order": 1,
                    },
                )
            CourseLiveSession.objects.update_or_create(
                course=course,
                session_id=f"{course.slug}-live-1",
                defaults={
                    "title": "جلسة مراجعة أسبوعية",
                    "state": "upcoming",
                    "date_label": "الأحد القادم",
                    "time_label": "٨:٠٠ م",
                    "meet_url": "https://meet.google.com/abc-defg-hij",
                },
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
            "competitions": {
                c["competition_id"]: Competition.objects.get(competition_id=c["competition_id"]) for c in COMPETITIONS
            },
        }

    def _seed_home(self, content: dict) -> None:
        for order, course in enumerate(content["courses"].values()):
            HomeFeaturedCourse.objects.update_or_create(
                course=course,
                defaults={
                    "students_count": "1,240 طالب",
                    "status": "متاح",
                    "thumbnail_type": "ai_generative",
                    "order": order,
                },
            )
        for order, scholarship in enumerate(content["scholarships"].values()):
            HomeFeaturedScholarship.objects.update_or_create(
                scholarship=scholarship,
                defaults={
                    "deadline_text": scholarship.deadline_badge,
                    "icon_type": "university",
                    "thumbnail_type": "astrolabe_scholarship",
                    "order": order,
                },
            )
        HomeCompetitionSpot.objects.update_or_create(
            key="mobile", defaults={"competition": content["competitions"]["competition-1"]}
        )
        HomeCompetitionSpot.objects.update_or_create(
            key="desktop", defaults={"competition": content["competitions"]["competition-1"]}
        )
        HomeEventSpot.objects.update_or_create(key="mobile", defaults={"event": content["events"]["event-1"]})
        HomeEventSpot.objects.update_or_create(key="desktopFeatured", defaults={"event": content["events"]["event-2"]})
        HomeEventSpot.objects.update_or_create(key="desktopWorkshop", defaults={"event": content["events"]["event-1"]})
        for order, (link_id, icon, label, subtitle, tone, target) in enumerate(QUICK_LINKS):
            HomeQuickLink.objects.update_or_create(
                link_id=link_id,
                defaults={
                    "icon": icon,
                    "label": label,
                    "subtitle": subtitle,
                    "tone": tone,
                    "target": target,
                    "order": order,
                },
            )

    def _seed_dashboard(self, student: User, content: dict) -> None:
        course1 = content["courses"]["course-1"]
        course2 = content["courses"]["course-2"]
        Enrollment.objects.update_or_create(
            user=student,
            course=course1,
            defaults={
                "progress": 62,
                "last_lesson": "الوحدة 2 · الدرس 1",
                "exact_unit_lesson": "الوحدة 2",
                "next_live_time": "الأحد ٨:٠٠ م",
                "icon_type": "ai",
                "is_completed": False,
            },
        )
        Enrollment.objects.update_or_create(
            user=student,
            course=course2,
            defaults={
                "progress": 30,
                "last_lesson": "الوحدة 1 · الدرس 2",
                "exact_unit_lesson": "الوحدة 1",
                "icon_type": "code",
                "is_completed": False,
            },
        )
        PriorityContinue.objects.update_or_create(
            user=student, course=course1, defaults={"progress": 62, "lesson_status": "استكمل من حيث توقفت"}
        )
        DashboardStat.objects.update_or_create(
            user=student,
            defaults={
                "attendance_rate": 98,
                "attendance_note": "ممتاز",
                "gpa": "4.7",
                "gpa_rating": "ممتاز",
                "points_earned": 1240,
                "rank_note": "المرتبة 12",
            },
        )
        SavedScholarship.objects.update_or_create(
            user=student,
            scholarship=content["scholarships"]["scholarship-1"],
            defaults={"is_urgent": False, "gpa_requirement": "3.5"},
        )
        FavoriteCourse.objects.update_or_create(user=student, course=course2)
        SavedCompetition.objects.update_or_create(
            user=student,
            competition=content["competitions"]["competition-1"],
            defaults={
                "status_text": "قيد المشاركة",
                "status_color": "blue",
                "action_label": "عرض",
                "action_variant": "sky",
            },
        )
        Certificate.objects.update_or_create(
            user=student,
            course=course1,
            defaults={"issue_date": "١٠ أكتوبر ٢٠٢٦", "credential_id": "KHM-COURSE-1", "is_official": True},
        )
        UpcomingEvent.objects.update_or_create(
            user=student,
            event_id="due-1",
            defaults={
                "title": "تسليم مشروع الوحدة 2",
                "date_text": "غداً · ٩:٠٠ م",
                "event_type": "submission",
                "type_label": "تسليم",
            },
        )
        DashboardNotification.objects.update_or_create(
            user=student,
            notification_id="note-1",
            defaults={
                "title": "درس جديد متاح",
                "time_ago": "قبل ساعة",
                "notification_type": "lesson",
                "is_read": False,
                "link": "/courses/course-1",
            },
        )
        NotificationItemData.objects.update_or_create(
            user=student,
            notification_id="note-1",
            defaults={
                "message": "تم إضافة درس جديد إلى دورتك.",
                "time_ago": "قبل ساعة",
                "notification_type": "lesson",
                "is_unread": True,
            },
        )

    # ------------------------------------------------------------------ demo

    def _seed_demo(self, roles: dict[str, AccessRole]) -> dict[str, User]:
        """Role rows, demo logins, and one course that exercises every surface.

        Runs only under `--demo` or `DEBUG`. Idempotent like the rest of the
        command, and inside the same single transaction `handle()` opens.
        """
        accounts = self._seed_demo_accounts(roles)
        self._seed_demo_course(accounts)
        self._seed_demo_lessons(accounts)
        self._seed_demo_quizzes(accounts)
        self._seed_demo_review_and_certificate(accounts)
        self._seed_demo_studio_backlog(accounts)
        self.stdout.write("  demo logins share the password from DJANGO_DEMO_ACCOUNT_PASSWORD or 'demo12345'")
        self.stdout.write(
            f"  note: the demo video lesson ({DEMO_VIDEO_LESSON_ID}) is seeded with no source.\n"
            f"        attach one with:  manage.py ingest_video FILE --slug {DEMO_VIDEO_LESSON_ID}\n"
            f"        or point a hosted file at it: set playback_mode='external' + external_ref\n"
            f"        on a VideoAsset and link it to that lesson. Playback stays 409 until then."
        )
        return accounts

    def _seed_roles(self) -> dict[str, AccessRole]:
        """Materialise the six role templates as ordinary, editable role rows.

        get_or_create and never update_or_create: from Phase 2 onward the Role
        Manager owns these rows, so a re-seed must add what is missing without
        rolling back a permission an administrator changed in the UI.
        """
        seeded: dict[str, AccessRole] = {}
        for key, template in ROLE_TEMPLATES.items():
            role, created = AccessRole.objects.get_or_create(
                slug=template["slug"],
                defaults={
                    "name": template["name"],
                    "description": template["description"],
                    "color": template["color"],
                    "position": int(template["position"]),
                    "permissions": validate_permission_keys(template["permissions"]),
                    "template_key": key,
                },
            )
            if created:
                self.stdout.write(f"  role: {role.name} ({len(role.permissions)} permissions)")
            seeded[key] = role
        return seeded

    def _seed_demo_accounts(self, roles: dict[str, AccessRole]) -> dict[str, User]:
        password = os.environ.get("DJANGO_DEMO_ACCOUNT_PASSWORD", "demo12345")
        accounts: dict[str, User] = {}
        for spec in DEMO_ACCOUNTS:
            user, created = User.objects.get_or_create(
                email=spec["email"],
                defaults={
                    "role": Role.STUDENT,
                    "full_name": spec["full_name"],
                    "avatar_initials": spec["avatar_initials"],
                },
            )
            if created:
                user.set_password(password)
                user.save()
            for role_key in spec["roles"]:
                RoleAssignment.objects.get_or_create(user=user, role=roles[role_key])
            # Let the service derive `role`/`is_staff` from the assignments, the
            # same way a real login does, instead of hand-setting booleans here.
            sync_primary_role(user)
            accounts[spec["key"]] = user
            granted = ", ".join(roles[key].name for key in spec["roles"]) or "متعلّم"
            self.stdout.write(f"  account: {user.email} \u2192 {granted}")
        accounts["admin"] = User.objects.get(email="admin@khawarizm.dev")
        return accounts

    def _demo_course(self, account: User, *, slug: str = DEMO_COURSE_SLUG, **overrides: object) -> Course:
        base: dict[str, object] = {
            "title": "رحلة التجريب الكاملة",
            "status": CourseStatus.PUBLISHED,
            "owner": account,
            "category_label": "برمجة",
            "category_slug": CategorySlug.PROGRAMMING,
            "course_level": CourseLevel.BEGINNER,
            "course_level_ar": "مبتدئ",
            "price_type": CoursePriceType.FREE,
            "price_label": "مجانية",
            "duration": "٤ ساعات",
            "lessons_count": 2,
            "instructor": account.full_name,
            "tagline": "دورة نموذجية تمرّ بكل مسارات المنصة.",
            "about": "دورة تجريبية تغطي درسًا مقاليًا ودرس فيديو واختبارًا تدريبيًا واختبارًا نهائيًا وشهادة.",
            "outcomes": ["قراءة منهج منصة", "إكمال درس مقالي", "اجتياز اختبار", "استلام شهادة"],
        }
        course, _ = Course.objects.update_or_create(slug=slug, defaults={**base, **overrides})
        # The `owner` column is history; Studio, the roster and analytics all
        # scope through CourseStaff, so a demo course without an OWNER row is
        # invisible to the very account the journey is meant to be walked in as.
        CourseStaff.objects.update_or_create(course=course, user=account, defaults={"kind": CourseStaffKind.OWNER})
        return course

    def _seed_demo_course(self, accounts: dict[str, User]) -> Course:
        instructor = accounts["instructor"]
        submitted_at = timezone.now() - timedelta(days=32)
        course = self._demo_course(
            instructor,
            submitted_at=submitted_at,
            published_at=submitted_at + timedelta(days=2),
            review_note="",
            total_seconds=4 * 3600,
            enrolled_count=1,
            exam_question_count=2,
            exam_minutes=10,
            exam_pass_threshold=60,
        )
        # The `assistant` staff kind is what the teaching-assistant role is for:
        # it opens the roster, analytics and quiz results, and not the editor.
        CourseStaff.objects.update_or_create(
            course=course,
            user=accounts["assistant"],
            defaults={"kind": CourseStaffKind.ASSISTANT},
        )
        self.stdout.write(f"  course: {course.title} ({course.slug}, {course.status})")
        return course

    def _seed_demo_lessons(self, accounts: dict[str, User]) -> None:
        course = Course.objects.get(slug=DEMO_COURSE_SLUG)
        reading_module, _ = CourseModule.objects.update_or_create(
            course=course,
            module_id=f"{course.slug}-m1",
            defaults={"title": "الوحدة الأولى · الأساسيات", "order": 1},
        )
        CourseLesson.objects.update_or_create(
            module=reading_module,
            lesson_id=f"{course.slug}-m1-l1",
            defaults={
                "title": "بنية المنهج: قراءة أولية",
                "duration": "08:00",
                "duration_seconds": 480,
                "summary": "درس مقالي كامل بدون فيديو.",
                "order": 1,
                "kind": LessonKind.ARTICLE,
                "content": DEMO_ARTICLE_MARKDOWN,
                "is_published": True,
                "is_free_preview": True,
            },
        )
        practice_module, _ = CourseModule.objects.update_or_create(
            course=course,
            module_id=f"{course.slug}-m2",
            defaults={"title": "الوحدة الثانية · التطبيق", "order": 2},
        )
        # Deliberately no `video_asset`: the plan's fallback for a lesson whose
        # licensed source could not be verified, so playback answers a clean
        # "not ready" instead of pointing at a URL we did not confirm.
        CourseLesson.objects.update_or_create(
            module=practice_module,
            lesson_id=DEMO_VIDEO_LESSON_ID,
            defaults={
                "title": "جلسة تطبيق مباشر",
                "duration": "15:00",
                "duration_seconds": 900,
                "summary": "درس فيديو؛ مرفق المصدر لاحقًا من الاستوديو أو بأمر ingest_video.",
                "order": 1,
                "kind": LessonKind.VIDEO,
                "video_asset": None,
                "is_published": True,
            },
        )

    def _seed_demo_quizzes(self, accounts: dict[str, User]) -> None:
        course = Course.objects.get(slug=DEMO_COURSE_SLUG)
        author = accounts["instructor"]
        banks = (
            (
                "practice",
                {
                    "kind": QuizKind.PRACTICE,
                    "title": "تدريب الوحدة الأولى",
                    "instructions": "أسئلة تدريبية بدون وقت محدد.",
                    "order": 1,
                    "pass_threshold": 50,
                    "time_limit_minutes": None,
                    "draw_count": 2,
                },
                (
                    ("ما الذي يحدد إكمال الدرس المقالي؟", ("نسبة القراءة في الخادم", True), ("عدد الصور", False)),
                    ("أين تُخزَّن نسبة الإنجاز؟", ("في قاعدة البيانات", True), ("في المتصفح فقط", False)),
                ),
            ),
            (
                "exam",
                {
                    "kind": QuizKind.EXAM,
                    "title": "الاختبار النهائي",
                    "instructions": "اختبار من وقت محدد؛ اجتيازه يصدر الشهادة.",
                    "order": 2,
                    "pass_threshold": 60,
                    "time_limit_minutes": 10,
                    "draw_count": 2,
                },
                (
                    ("متى تُصدر الشهادة؟", ("بعد إكمال كل الدروس واجتياز الاختبار", True), ("عند التسجيل", False)),
                    ("هل يمكن مراجعة الشهادة علنًا؟", ("نعم، عبر صفحة التحقق", True), ("لا، أبدًا", False)),
                ),
            ),
        )
        for _, payload, questions in banks:
            quiz, _ = Quiz.objects.update_or_create(
                course=course,
                title=payload["title"],
                defaults={**payload, "is_published": True, "created_by": author},
            )
            for question_order, (prompt, *options) in enumerate(questions):
                question, _ = Question.objects.update_or_create(
                    quiz=quiz,
                    prompt=prompt,
                    defaults={"kind": QuestionKind.SINGLE, "order": question_order, "points": 1},
                )
                for option_order, (label, is_correct) in enumerate(options):
                    Option.objects.update_or_create(
                        question=question,
                        label=label,
                        defaults={"is_correct": is_correct, "order": option_order},
                    )

    def _seed_demo_review_and_certificate(self, accounts: dict[str, User]) -> None:
        course = Course.objects.get(slug=DEMO_COURSE_SLUG)
        learner = accounts["learner"]
        Enrollment.objects.update_or_create(
            user=learner,
            course=course,
            defaults={
                "progress": 100,
                "is_completed": True,
                "completion_date": timezone.now().strftime("%Y-%m-%d"),
                "last_lesson": "بنية المنهج: قراءة أولية",
                "icon_type": "check",
            },
        )
        CourseReview.objects.update_or_create(
            user=learner,
            course=course,
            defaults={
                "rating": 5,
                "title": "أوضح منصة جرّبتها",
                "body": "الدروس المقالية مختصرة ومفيدة، والاختبار يعيد المحاولة بوضوح.",
            },
        )
        # The aggregate a recompute would produce: one visible five-star review.
        Course.objects.filter(pk=course.pk).update(rating=Decimal("5.0"), review_count=1)
        Certificate.objects.update_or_create(
            user=learner,
            course=course,
            defaults={
                "serial": "KH-2026-DEMO-0001",
                "credential_id": "KH-2026-DEMO-0001",
                "issue_date": timezone.now().strftime("%Y-%m-%d"),
                "issued_at": timezone.now() - timedelta(days=1),
                "learner_name_snapshot": learner.full_name,
                "course_title_snapshot": course.title,
                "hours": Decimal("4.00"),
                "revoked_at": None,
                "revoked_reason": "",
            },
        )

    def _seed_demo_studio_backlog(self, accounts: dict[str, User]) -> None:
        """A draft and a submitted course, so Studio and the review queue aren't empty."""
        instructor = accounts["instructor"]
        self._demo_course(
            instructor,
            slug="demo-draft-course",
            title="دورة قيد الإعداد",
            status=CourseStatus.DRAFT,
            tagline="نسخة غير مكتملة تظهر في الاستوديو فقط.",
            published_at=None,
            submitted_at=None,
        )
        self._demo_course(
            instructor,
            slug="demo-review-course",
            title="دورة بانتظار المراجعة",
            status=CourseStatus.IN_REVIEW,
            tagline="مقدّمة للمراجعة؛ تظهر في قائمة المراجعة في لوحة التحكم.",
            published_at=None,
            # Four days old: the queue's age/SLA chip has something to show.
            submitted_at=timezone.now() - timedelta(days=4),
        )
