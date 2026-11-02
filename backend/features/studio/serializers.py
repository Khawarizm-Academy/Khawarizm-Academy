"""Studio boundary serializers: strict request validation and redacted responses."""

from __future__ import annotations

from typing import Any

from rest_framework import serializers

from features.common.choices import CourseLevel, CoursePriceType
from features.common.serializers import compact
from features.courses.models import LANGUAGES
from features.courses.serializers import course_detail


class StrictSerializer(serializers.Serializer):
    """Reject silently ignored keys so malformed editor payloads fail closed."""

    def to_internal_value(self, data):
        if not isinstance(data, dict):
            raise serializers.ValidationError("يجب أن يكون جسم الطلب كائنًا.")
        unknown = sorted(set(data) - set(self.fields))
        if unknown:
            raise serializers.ValidationError({key: "حقل غير معروف." for key in unknown})
        return super().to_internal_value(data)


class CourseRequest(StrictSerializer):
    title = serializers.CharField(required=False, allow_blank=True, max_length=200)
    categoryLabel = serializers.CharField(required=False, allow_blank=True, max_length=120)
    categorySlug = serializers.CharField(required=False, allow_blank=True, max_length=40)
    thumbnailUrl = serializers.URLField(required=False, allow_blank=True, max_length=400)
    courseLevel = serializers.ChoiceField(required=False, choices=CourseLevel.choices)
    courseLevelAr = serializers.CharField(required=False, allow_blank=True, max_length=40)
    priceType = serializers.ChoiceField(required=False, choices=CoursePriceType.choices)
    priceLabel = serializers.CharField(required=False, allow_blank=True, max_length=40)
    language = serializers.ChoiceField(required=False, choices=LANGUAGES)
    tagline = serializers.CharField(required=False, allow_blank=True, max_length=240)
    about = serializers.CharField(required=False, allow_blank=True)
    instructor = serializers.CharField(required=False, allow_blank=True, max_length=120)
    instructorCredential = serializers.CharField(required=False, allow_blank=True, max_length=200)
    instructorBio = serializers.CharField(required=False, allow_blank=True)
    outcomes = serializers.ListField(required=False, child=serializers.CharField(max_length=140), max_length=50)
    relatedIds = serializers.ListField(required=False, child=serializers.CharField(max_length=80), max_length=50)
    examQuestionCount = serializers.IntegerField(required=False, min_value=0, max_value=10000)
    examMinutes = serializers.IntegerField(required=False, min_value=0, max_value=10000)
    examPassThreshold = serializers.IntegerField(required=False, min_value=0, max_value=100)
    examAttemptsLeft = serializers.IntegerField(required=False, min_value=0, max_value=10000)
    slug = serializers.RegexField(
        required=False,
        regex=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
        min_length=3,
        max_length=60,
    )
    expectedUpdatedAt = serializers.DateTimeField(required=False)


class ModuleRequest(StrictSerializer):
    moduleId = serializers.CharField(required=False, allow_blank=False, max_length=120)
    title = serializers.CharField(required=False, allow_blank=True, max_length=160)
    order = serializers.IntegerField(required=False, min_value=0)
    expectedUpdatedAt = serializers.DateTimeField(required=False)


class LessonRequest(StrictSerializer):
    lessonId = serializers.CharField(required=False, allow_blank=False, max_length=120)
    title = serializers.CharField(required=False, allow_blank=True, max_length=160)
    duration = serializers.CharField(required=False, allow_blank=True, max_length=20)
    summary = serializers.CharField(required=False, allow_blank=True)
    order = serializers.IntegerField(required=False, min_value=0)
    kind = serializers.ChoiceField(required=False, choices=["video", "article", "quiz", "resource"])
    content = serializers.CharField(required=False, allow_blank=True)
    isFreePreview = serializers.BooleanField(required=False)
    isPublished = serializers.BooleanField(required=False)
    expectedUpdatedAt = serializers.DateTimeField(required=False)


class ReorderRequest(StrictSerializer):
    orderedIds = serializers.ListField(required=False, child=serializers.CharField(), allow_empty=True)
    moves = serializers.ListField(required=False, child=serializers.DictField(), allow_empty=True)

    def validate(self, attrs):
        if not attrs.get("orderedIds") and not attrs.get("moves"):
            raise serializers.ValidationError("أرسل orderedIds أو moves.")
        if attrs.get("orderedIds") and attrs.get("moves"):
            raise serializers.ValidationError("لا يمكن إرسال orderedIds وmoves معًا.")
        for move in attrs.get("moves", []):
            if set(move) != {"lessonId", "moduleId", "order"}:
                raise serializers.ValidationError("كل نقلة تحتاج lessonId وmoduleId وorder.")
            if not isinstance(move["lessonId"], str) or not isinstance(move["moduleId"], str):
                raise serializers.ValidationError("معرّفات النقلة يجب أن تكون نصوصًا.")
            if not isinstance(move["order"], int) or move["order"] < 0:
                raise serializers.ValidationError("ترتيب النقلة غير صالح.")
        return attrs


class StaffRequest(StrictSerializer):
    userId = serializers.UUIDField()
    kind = serializers.ChoiceField(required=False, choices=["co_instructor", "assistant"])


class VideoRequest(StrictSerializer):
    assetId = serializers.UUIDField()


class ResourceRequest(StrictSerializer):
    title = serializers.CharField(required=False, allow_blank=True, max_length=160)
    url = serializers.URLField(required=False, max_length=400)
    kind = serializers.ChoiceField(required=False, choices=["link", "document_link"])
    order = serializers.IntegerField(required=False, min_value=0)
    expectedUpdatedAt = serializers.DateTimeField(required=False)


class ReviewNoteRequest(StrictSerializer):
    note = serializers.CharField(allow_blank=False, max_length=10000)


def resource_row(row: Any) -> dict[str, Any]:
    return compact(id=str(row.pk), title=row.title, url=row.url, kind=row.kind, order=row.order)


def staff_row(row: Any) -> dict[str, Any]:
    user = row.user
    name = user.full_name or user.email.split("@", 1)[0]
    profile = getattr(user, "instructor_profile", None)
    return compact(
        id=str(row.user_id),
        name=name,
        headline=getattr(profile, "headline", ""),
        avatarUrl=user.avatar_url,
        kind=row.kind,
    )


def editor_course(course: Any, *, checklist: dict[str, Any]) -> dict[str, Any]:
    """Return the full editor graph without account emails or provider secrets."""
    payload = course_detail(
        course,
        include_unpublished=True,
        is_preview=course.status in {"draft", "in_review"},
        enrollable=course.status == "published",
    )
    payload["reviewNote"] = course.review_note
    payload["staff"] = [staff_row(row) for row in getattr(course, "_studio_staff", ())]
    payload["checklist"] = checklist
    payload["modules"] = [
        {
            "id": module.module_id,
            "title": module.title,
            "order": module.order,
            "updatedAt": module.updated_at,
            "lessons": [
                {
                    "id": lesson.lesson_id,
                    "title": lesson.title,
                    "duration": lesson.duration,
                    "summary": lesson.summary,
                    "order": lesson.order,
                    "kind": lesson.kind,
                    "content": lesson.content,
                    "isFreePreview": lesson.is_free_preview,
                    "isPublished": lesson.is_published,
                    "hasVideo": lesson.video_asset is not None,
                    "videoSlug": lesson.video_asset.slug if lesson.video_asset else None,
                    "durationSeconds": lesson.duration_seconds,
                    "updatedAt": lesson.updated_at,
                    "resources": [resource_row(row) for row in getattr(lesson, "_studio_resources", ())],
                }
                for lesson in getattr(module, "_studio_lessons", ())
            ],
        }
        for module in getattr(course, "_studio_modules", ())
    ]
    return payload


def course_row(course: Any) -> dict[str, Any]:
    return compact(
        id=course.slug,
        title=course.title,
        slug=course.slug,
        status=course.status,
        thumbnailUrl=course.thumbnail_url,
        instructor=course.instructor,
        lessonsCount=course.lessons_count,
        enrolledCount=course.enrolled_count,
        updatedAt=course.updated_at,
    )


def lesson_row(row: Any) -> dict[str, Any]:
    return compact(
        id=row.lesson_id,
        title=row.title,
        duration=row.duration,
        summary=row.summary,
        order=row.order,
        kind=row.kind,
        content=row.content,
        isFreePreview=row.is_free_preview,
        isPublished=row.is_published,
        hasVideo=row.video_asset is not None,
        videoSlug=row.video_asset.slug if row.video_asset else None,
        durationSeconds=row.duration_seconds,
        resources=[resource_row(item) for item in getattr(row, "_studio_resources", ())],
        updatedAt=row.updated_at,
    )


def module_row(row: Any) -> dict[str, Any]:
    return compact(
        id=row.module_id,
        title=row.title,
        order=row.order,
        lessons=[lesson_row(item) for item in getattr(row, "_studio_lessons", ())],
        updatedAt=row.updated_at,
    )


def checklist_payload(value: dict[str, Any]) -> dict[str, Any]:
    return {
        "issues": [
            compact(
                code=issue.get("code"),
                severity=issue.get("severity"),
                target=issue.get("target"),
                message=issue.get("message"),
            )
            for issue in value.get("issues", [])
        ],
        "ready": bool(value.get("ready")),
        "completeness": int(value.get("completeness", 0)),
    }
