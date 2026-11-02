"""Canonical permissions, implications, ownership kinds, and role templates.

This module is the single source of truth for the access catalog. Keep it free
of ORM imports so it can safely be used by migrations, tests, and serializers.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Any


@dataclass(frozen=True, slots=True)
class PermissionSpec:
    key: str
    group: str
    label: str
    description: str
    elevated: bool = False
    implies: tuple[str, ...] = ()


def _permission(
    group: str,
    key: str,
    label: str,
    *,
    elevated: bool = False,
    implies: tuple[str, ...] = (),
) -> PermissionSpec:
    return PermissionSpec(
        key=key,
        group=group,
        label=label,
        description=f"تتيح صلاحية «{label}» هذا الإجراء للمستخدم.",
        elevated=elevated,
        implies=implies,
    )


PERMISSION_GROUPS: tuple[tuple[str, str], ...] = (
    ("general", "عام"),
    ("learning", "التعلّم"),
    ("courses", "الدورات"),
    ("students", "الطلاب"),
    ("videos", "الفيديو"),
    ("quizzes", "الاختبارات"),
    ("content", "المحتوى"),
    ("users", "المستخدمون"),
    ("roles", "الأدوار"),
    ("system", "النظام"),
)

# The row order is also the stable order returned to clients and used in auth
# payloads. Labels are product UI copy; descriptions are intentionally one
# short sentence each.
_PERMISSION_ROWS: tuple[PermissionSpec, ...] = (
    _permission("general", "administrator", "مشرف كامل — يتجاوز كل الصلاحيات", elevated=True),
    _permission("general", "admin.access", "الدخول إلى لوحة الإدارة"),
    _permission("general", "studio.access", "الدخول إلى استوديو المدرّب"),
    _permission("learning", "courses.enroll", "التسجيل في الدورات"),
    _permission("learning", "courses.favorite", "إضافة الدورات للمفضلة"),
    _permission("learning", "lessons.watch", "مشاهدة دروس الدورات المسجّل بها"),
    _permission("learning", "quizzes.attempt", "حلّ الاختبارات"),
    _permission("learning", "certificates.view_own", "عرض شهاداتي"),
    _permission("learning", "reviews.write", "كتابة تقييم للدورة"),
    _permission("learning", "scholarships.save", "حفظ المنح"),
    _permission("learning", "scholarships.apply", "التقديم على المنح"),
    _permission("learning", "competitions.join", "دخول المسابقات"),
    _permission("learning", "events.register", "التسجيل في الفعاليات"),
    _permission("learning", "profile.edit_own", "تعديل ملفي الشخصي"),
    _permission("learning", "discussions.post", "طرح الأسئلة والمشاركة في نقاش الدروس"),
    _permission("courses", "discussions.reply_own", "الرد على أسئلة دوراتي"),
    _permission("courses", "discussions.moderate", "إدارة النقاشات (إخفاء/تثبيت) في كل الدورات", elevated=True),
    _permission("courses", "reviews.reply_own", "الرد علنًا على تقييمات دوراتي"),
    _permission("courses", "courses.create", "إنشاء دورات", implies=("studio.access",)),
    _permission("courses", "courses.edit_own", "تعديل دوراتي"),
    _permission("courses", "courses.edit_any", "تعديل أي دورة", elevated=True, implies=("courses.edit_own",)),
    _permission("courses", "courses.delete_own", "حذف دوراتي"),
    _permission("courses", "courses.delete_any", "حذف أي دورة", elevated=True, implies=("courses.delete_own",)),
    _permission("courses", "courses.submit_for_review", "إرسال الدورة للمراجعة"),
    _permission("courses", "courses.publish", "نشر الدورات مباشرةً", implies=("courses.submit_for_review",)),
    _permission("courses", "courses.review", "مراجعة واعتماد دورات الآخرين", elevated=True),
    _permission("courses", "courses.manage_staff", "إدارة مدرّبي الدورة المشاركين"),
    _permission("courses", "curriculum.edit_own", "تعديل منهج دوراتي (وحدات ودروس)"),
    _permission(
        "courses", "curriculum.edit_any", "تعديل منهج أي دورة", elevated=True, implies=("curriculum.edit_own",)
    ),
    _permission("courses", "live_sessions.manage_own", "جدولة الجلسات المباشرة لدوراتي"),
    _permission(
        "courses",
        "live_sessions.manage_any",
        "إدارة كل الجلسات المباشرة",
        elevated=True,
        implies=("live_sessions.manage_own",),
    ),
    _permission("courses", "announcements.post", "نشر إعلانات في دوراتي"),
    _permission("courses", "certificates.manage", "إصدار الشهادات وإلغاؤها", elevated=True),
    _permission("courses", "reviews.moderate", "إدارة تقييمات الدورات", elevated=True),
    _permission("students", "students.view_own", "عرض طلاب دوراتي وتقدّمهم"),
    _permission("students", "students.view_any", "عرض كل الطلاب", elevated=True, implies=("students.view_own",)),
    _permission("students", "analytics.view_own", "تحليلات دوراتي"),
    _permission("students", "analytics.view_any", "تحليلات كل الدورات", elevated=True, implies=("analytics.view_own",)),
    _permission("videos", "videos.upload", "رفع الفيديوهات", implies=("studio.access",)),
    _permission("videos", "videos.manage_own", "إدارة فيديوهاتي"),
    _permission("videos", "videos.manage_any", "إدارة كل الفيديوهات", elevated=True, implies=("videos.manage_own",)),
    _permission("videos", "videos.use_embed", "استخدام مصادر غير محمية (يوتيوب/فيميو/رابط)"),
    _permission("videos", "videos.package", "تشغيل تغليف FFmpeg"),
    _permission("videos", "videos.watch_any", "مشاهدة أي فيديو دون تسجيل", elevated=True),
    _permission("videos", "videos.configure", "إعداد مزوّدي الفيديو ووضع FFmpeg", elevated=True),
    _permission("quizzes", "quizzes.create", "إنشاء اختبارات", implies=("studio.access",)),
    _permission("quizzes", "quizzes.edit_own", "تعديل اختباراتي"),
    _permission("quizzes", "quizzes.edit_any", "تعديل أي اختبار", elevated=True, implies=("quizzes.edit_own",)),
    _permission("quizzes", "quizzes.results_own", "نتائج اختباراتي"),
    _permission(
        "quizzes", "quizzes.results_any", "نتائج كل الاختبارات", elevated=True, implies=("quizzes.results_own",)
    ),
    _permission("quizzes", "quizzes.reset_attempts", "منح محاولة إضافية لطالب"),
    _permission("content", "scholarships.manage", "إدارة المنح", implies=("admin.access",)),
    _permission("content", "events.manage", "إدارة الفعاليات", implies=("admin.access",)),
    _permission("content", "competitions.manage", "إدارة المسابقات", implies=("admin.access",)),
    _permission("content", "catalog.manage", "إدارة التصنيفات والفلاتر", implies=("admin.access",)),
    _permission("content", "home.curate", "تنسيق الصفحة الرئيسية", implies=("admin.access",)),
    _permission("users", "users.view", "عرض المستخدمين", implies=("admin.access",)),
    _permission("users", "users.create", "إنشاء حسابات", implies=("users.view",)),
    _permission("users", "users.edit", "تعديل الحسابات", implies=("users.view",)),
    _permission("users", "users.delete", "حذف الحسابات", elevated=True, implies=("users.view",)),
    _permission("users", "users.assign_roles", "إسناد الأدوار للمستخدمين", elevated=True, implies=("users.view",)),
    _permission("users", "users.revoke_sessions", "إنهاء جلسات المستخدمين", implies=("users.view",)),
    _permission("users", "sessions.view_any", "عرض كل الجلسات", implies=("admin.access",)),
    _permission("users", "analytics.view_platform", "تحليلات المنصة", implies=("admin.access",)),
    _permission("users", "audit.view", "عرض سجل التدقيق", elevated=True, implies=("admin.access",)),
    _permission("roles", "roles.view", "عرض الأدوار", implies=("admin.access",)),
    _permission("roles", "roles.manage", "إنشاء الأدوار وتعديلها وحذفها", elevated=True, implies=("roles.view",)),
    _permission("system", "system.maintenance", "تشغيل مهام الصيانة", elevated=True, implies=("admin.access",)),
)

PERMISSIONS: dict[str, PermissionSpec] = {permission.key: permission for permission in _PERMISSION_ROWS}
PERMISSION_KEYS: tuple[str, ...] = tuple(PERMISSIONS)
PERMISSION_COLORS: tuple[str, ...] = ("cyan", "gold", "success", "warning", "danger", "slate", "white")

# Administrator is deliberately represented by one permission, but its closure
# is the complete catalog so new keys automatically receive the same bypass.
PERMISSIONS["administrator"] = replace(
    PERMISSIONS["administrator"],
    implies=tuple(key for key in PERMISSION_KEYS if key != "administrator"),
)

OWN_KINDS: dict[str, set[str]] = {
    "quizzes.edit_own": {"owner", "co_instructor"},
    "courses.edit_own": {"owner", "co_instructor"},
    "curriculum.edit_own": {"owner", "co_instructor"},
    "courses.delete_own": {"owner"},
    "courses.manage_staff": {"owner"},
    "live_sessions.manage_own": {"owner", "co_instructor"},
    "announcements.post": {"owner", "co_instructor", "assistant"},
    "students.view_own": {"owner", "co_instructor", "assistant"},
    "analytics.view_own": {"owner", "co_instructor", "assistant"},
    "quizzes.results_own": {"owner", "co_instructor", "assistant"},
    "quizzes.reset_attempts": {"owner", "co_instructor", "assistant"},
    "discussions.reply_own": {"owner", "co_instructor", "assistant"},
    "reviews.reply_own": {"owner", "co_instructor"},
}

STUDENT_PERMISSIONS: tuple[str, ...] = (
    "courses.enroll",
    "courses.favorite",
    "lessons.watch",
    "quizzes.attempt",
    "certificates.view_own",
    "reviews.write",
    "scholarships.save",
    "scholarships.apply",
    "competitions.join",
    "events.register",
    "profile.edit_own",
    "discussions.post",
)

INSTRUCTOR_PERMISSIONS: tuple[str, ...] = (
    "studio.access",
    "courses.create",
    "courses.edit_own",
    "courses.delete_own",
    "courses.submit_for_review",
    "curriculum.edit_own",
    "courses.manage_staff",
    "live_sessions.manage_own",
    "announcements.post",
    "discussions.reply_own",
    "reviews.reply_own",
    "videos.upload",
    "videos.manage_own",
    "videos.use_embed",
    "quizzes.create",
    "quizzes.edit_own",
    "quizzes.results_own",
    "quizzes.reset_attempts",
    "students.view_own",
    "analytics.view_own",
)

SYSTEM_ROLE_SPECS: dict[str, dict[str, Any]] = {
    "student": {
        "slug": "student",
        "name": "طالب",
        "description": "الدور الافتراضي لكل حساب في الأكاديمية.",
        "color": "cyan",
        "position": 0,
        "permissions": list(STUDENT_PERMISSIONS),
        "is_system": True,
        "is_default": True,
        "template_key": "",
    },
    "admin": {
        "slug": "admin",
        "name": "مشرف",
        "description": "دور النظام المخصص للمشرفين الكاملين.",
        "color": "gold",
        "position": 1000,
        "permissions": ["administrator"],
        "is_system": True,
        "is_default": False,
        "template_key": "",
    },
}

ROLE_TEMPLATES: dict[str, dict[str, Any]] = {
    "instructor": {
        "key": "instructor",
        "label": "مدرّب",
        "description": "صلاحيات إنشاء الدورات وإدارة المحتوى التعليمي الخاص بالمدرّب.",
        "slug": "instructor",
        "name": "مدرّب",
        "color": "cyan",
        "position": 100,
        "permissions": list(INSTRUCTOR_PERMISSIONS),
    },
    "senior_instructor": {
        "key": "senior_instructor",
        "label": "مدرّب خبير",
        "description": "صلاحيات المدرّب مع النشر المباشر وتغليف الفيديو.",
        "slug": "senior-instructor",
        "name": "مدرّب خبير",
        "color": "gold",
        "position": 200,
        "permissions": [*INSTRUCTOR_PERMISSIONS, "courses.publish", "videos.package"],
    },
    "teaching_assistant": {
        "key": "teaching_assistant",
        "label": "مساعد تدريس",
        "description": "صلاحيات مساندة للطلاب والاختبارات في الدورات.",
        "slug": "teaching-assistant",
        "name": "مساعد تدريس",
        "color": "cyan",
        "position": 50,
        "permissions": [
            "studio.access",
            "students.view_own",
            "quizzes.results_own",
            "quizzes.reset_attempts",
            "announcements.post",
            "discussions.reply_own",
            "analytics.view_own",
        ],
    },
    "content_moderator": {
        "key": "content_moderator",
        "label": "مشرف محتوى",
        "description": "صلاحيات مراجعة المحتوى والنقاشات والتقييمات.",
        "slug": "content-moderator",
        "name": "مشرف محتوى",
        "color": "warning",
        "position": 200,
        "permissions": [
            "admin.access",
            "courses.review",
            "reviews.moderate",
            "discussions.moderate",
            "users.view",
            "audit.view",
        ],
    },
    "support_agent": {
        "key": "support_agent",
        "label": "موظف دعم",
        "description": "صلاحيات مساعدة المستخدمين ومراجعة الجلسات.",
        "slug": "support-agent",
        "name": "موظف دعم",
        "color": "slate",
        "position": 50,
        "permissions": [
            "admin.access",
            "users.view",
            "users.revoke_sessions",
            "sessions.view_any",
            "videos.watch_any",
        ],
    },
    "content_manager": {
        "key": "content_manager",
        "label": "مدير محتوى",
        "description": "صلاحيات إدارة المنح والفعاليات والتصنيفات والواجهة الرئيسية.",
        "slug": "content-manager",
        "name": "مدير محتوى",
        "color": "gold",
        "position": 200,
        "permissions": [
            "admin.access",
            "scholarships.manage",
            "events.manage",
            "competitions.manage",
            "catalog.manage",
            "home.curate",
        ],
    },
}


def validate_permission_keys(keys: Any) -> list[str]:
    """Return a validated, ordered permission list or raise ``ValueError``."""
    if not isinstance(keys, (list, tuple)):
        raise ValueError("permissions must be a list of catalog keys")
    normalized = list(keys)
    if any(not isinstance(key, str) for key in normalized):
        raise ValueError("permission keys must be strings")
    if len(normalized) != len(set(normalized)):
        raise ValueError("permission keys must be unique")
    unknown = sorted(set(normalized) - PERMISSIONS.keys())
    if unknown:
        raise ValueError(f"unknown permission key(s): {', '.join(unknown)}")
    return normalized


def expand_permission_keys(keys: Any) -> frozenset[str]:
    """Expand validated permissions through the implication graph."""
    pending = list(validate_permission_keys(list(keys)))
    expanded: set[str] = set()
    while pending:
        key = pending.pop()
        if key in expanded:
            continue
        expanded.add(key)
        pending.extend(PERMISSIONS[key].implies)
    if "administrator" in expanded:
        return frozenset(PERMISSION_KEYS)
    return frozenset(expanded)


def permission_catalog() -> list[dict[str, Any]]:
    """Return stable catalog rows suitable for JSON and future API output."""
    return [
        {
            "key": permission.key,
            "group": permission.group,
            "label": permission.label,
            "description": permission.description,
            "elevated": permission.elevated,
            "implies": list(permission.implies),
        }
        for permission in PERMISSIONS.values()
    ]


def grouped_permission_catalog() -> list[dict[str, Any]]:
    """Return the Phase 2 role-catalog response's grouped permissions."""
    return [
        {
            "key": group_key,
            "label": group_label,
            "permissions": [
                {
                    "key": permission.key,
                    "label": permission.label,
                    "description": permission.description,
                    "elevated": permission.elevated,
                    "implies": list(permission.implies),
                }
                for permission in PERMISSIONS.values()
                if permission.group == group_key
            ],
        }
        for group_key, group_label in PERMISSION_GROUPS
        if any(permission.group == group_key for permission in PERMISSIONS.values())
    ]


def template_catalog() -> list[dict[str, Any]]:
    """Return public role-template metadata without mutable model state."""
    return [
        {
            "key": template["key"],
            "label": template["label"],
            "description": template["description"],
            "permissions": list(template["permissions"]),
        }
        for template in ROLE_TEMPLATES.values()
    ]


def registry_errors() -> list[str]:
    """Collect catalog integrity errors for a deterministic unit test."""
    errors: list[str] = []
    if len(PERMISSIONS) != len(_PERMISSION_ROWS):
        errors.append("permission keys are not unique")
    group_keys = {key for key, _label in PERMISSION_GROUPS}
    for key, permission in PERMISSIONS.items():
        if permission.key != key:
            errors.append(f"mapping key differs from permission key: {key}")
        if not permission.label.strip() or not permission.description.strip():
            errors.append(f"missing label or description: {key}")
        if permission.group not in group_keys:
            errors.append(f"unknown group for {key}: {permission.group}")
        for implied in permission.implies:
            if implied not in PERMISSIONS:
                errors.append(f"{key} implies unknown key {implied}")

    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(key: str) -> None:
        if key in visiting:
            errors.append(f"implication cycle includes {key}")
            return
        if key in visited:
            return
        visiting.add(key)
        for implied in PERMISSIONS[key].implies:
            if implied in PERMISSIONS:
                visit(implied)
        visiting.remove(key)
        visited.add(key)

    for permission_key in PERMISSIONS:
        visit(permission_key)

    for key, kinds in OWN_KINDS.items():
        if key not in PERMISSIONS:
            errors.append(f"ownership mapping uses unknown permission {key}")
        if not kinds or not all(isinstance(kind, str) and kind for kind in kinds):
            errors.append(f"ownership mapping is empty or invalid for {key}")
    for role_slug, role in SYSTEM_ROLE_SPECS.items():
        try:
            keys = validate_permission_keys(role["permissions"])
        except ValueError as exc:
            errors.append(f"invalid system role {role_slug}: {exc}")
            continue
        if role["is_default"] and any(PERMISSIONS[key].elevated for key in keys):
            errors.append(f"default role {role_slug} contains elevated permissions")
    for template_key, template in ROLE_TEMPLATES.items():
        try:
            validate_permission_keys(template["permissions"])
        except ValueError as exc:
            errors.append(f"invalid role template {template_key}: {exc}")
    return errors
