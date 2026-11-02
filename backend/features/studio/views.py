"""Thin Studio handlers over the course and access services."""

from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Any

from django.db.models import Count, Prefetch, Q, Sum
from django.db.models.functions import Lower, TruncDate
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from features.access.permissions import perm
from features.access.services import has_object_perm, has_perm
from features.adminconsole.permissions import permission_for_methods
from features.auth.models import InstructorProfile, User
from features.catalog.models import Category
from features.common.choices import CourseStaffKind, CourseStatus
from features.common.errors import InvalidParameter, NotFound, PermissionDenied
from features.common.messages import COURSE_NOT_FOUND
from features.common.throttling import scoped_throttle
from features.courses import services
from features.courses.models import Course, CourseLesson, CourseModule, CourseStaff, LessonResource
from features.dashboard.models import Enrollment
from features.quizzes.models import Quiz
from features.studio import serializers
from features.videohosting.models import VideoAsset

PAGE_SIZE = 20
MAX_PAGE = 10_000
MAX_SEARCH = 100
NO_STORE = "private, no-store"


def _response(data: Any = None, *, code: int = status.HTTP_200_OK) -> Response:
    response = Response(data, status=code)
    response["Cache-Control"] = NO_STORE
    return response


def _body(serializer_class: type[drf_serializers.Serializer], data: Any) -> dict[str, Any]:
    serializer = serializer_class(data=data)
    serializer.is_valid(raise_exception=True)
    return dict(serializer.validated_data)


def _page(request: Any) -> int:
    raw = request.query_params.get("page", "1")
    try:
        page = int(raw)
    except TypeError, ValueError:
        raise InvalidParameter("قيمة الصفحة غير صالحة.", code="invalid_page") from None
    if page < 1 or page > MAX_PAGE:
        raise InvalidParameter("قيمة الصفحة خارج النطاق.", code="invalid_page")
    return page


def _search(request: Any) -> str:
    value = request.query_params.get("q", "")
    if len(value) > MAX_SEARCH:
        raise InvalidParameter("عبارة البحث طويلة جدًا.", code="search_too_long")
    return value.strip()


def _course(slug: str, *, editor: bool = False) -> Course:
    queryset = Course.objects.select_related("owner", "owner__instructor_profile")
    if editor:
        queryset = queryset.prefetch_related(
            "staff__user__instructor_profile",
            "modules__lessons__resources",
            "modules__lessons__video_asset",
            Prefetch(
                "quizzes",
                queryset=Quiz.objects.annotate(
                    question_total=Count("questions", distinct=True),
                    attempt_total=Count("attempts", distinct=True),
                ),
            ),
        )
    row = queryset.filter(slug=slug).first()
    if row is None:
        raise NotFound(COURSE_NOT_FOUND)
    if editor:
        row._studio_staff = list(row.staff.all())
        row._studio_modules = list(row.modules.all())
        for module in row._studio_modules:
            module._studio_lessons = list(module.lessons.all())
            for lesson in module._studio_lessons:
                lesson._studio_resources = list(lesson.resources.all())
        row._studio_quizzes = list(row.quizzes.all())
        for quiz in row._studio_quizzes:
            quiz._question_count = quiz.question_total
            quiz._attempt_count = quiz.attempt_total
    return row


def _require_editor(actor: Any, course: Course) -> None:
    if not services.can_edit(actor, course):
        raise PermissionDenied()


def _require_curriculum(actor: Any, course: Course) -> None:
    if not services.can_edit(actor, course, curriculum=True):
        raise PermissionDenied()


def _require_staff_manager(actor: Any, course: Course) -> None:
    staff_kind = CourseStaff.objects.filter(course=course, user=actor).values_list("kind", flat=True).first()
    if not has_object_perm(actor, "courses.manage_staff", {staff_kind} if staff_kind else set()):
        raise PermissionDenied()


def _uuid(value: Any, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except AttributeError, TypeError, ValueError:
        raise InvalidParameter(f"معرّف {field} غير صالح.", code="invalid_uuid") from None


def _lesson(lesson_id: Any) -> CourseLesson:
    lesson_id = _uuid(lesson_id, "الدرس")
    try:
        row = (
            CourseLesson.objects.select_related("module__course", "video_asset")
            .prefetch_related("resources")
            .get(pk=lesson_id)
        )
    except CourseLesson.DoesNotExist, ValueError:
        raise NotFound("الدرس غير موجود.") from None
    row._studio_resources = list(row.resources.all())
    return row


def _module(module_id: Any) -> CourseModule:
    module_id = _uuid(module_id, "الوحدة")
    try:
        return CourseModule.objects.select_related("course").get(pk=module_id)
    except CourseModule.DoesNotExist, ValueError:
        raise NotFound("الوحدة غير موجودة.") from None


def _resource(resource_id: Any) -> LessonResource:
    resource_id = _uuid(resource_id, "المورد")
    try:
        return LessonResource.objects.select_related("lesson__module__course").get(pk=resource_id)
    except LessonResource.DoesNotExist, ValueError:
        raise NotFound("المورد غير موجود.") from None


@extend_schema(
    operation_id="studio_overview",
    summary="Studio KPI overview.",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Private Studio counters.")},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated, perm("studio.access")])
def overview(request: Any) -> Response:
    queryset = services.studio_course_queryset(request.user)
    counts = {row["status"]: row["total"] for row in queryset.values("status").annotate(total=Count("id"))}
    enrollment_total = queryset.aggregate(total=Sum("enrolled_count"))["total"] or 0
    recent_courses = list(queryset.order_by("-updated_at", "slug")[:10])
    review_changes = (
        queryset.filter(status=CourseStatus.DRAFT)
        .exclude(review_note="")
        .only("title", "slug", "review_note")
        .order_by("-updated_at", "slug")[:10]
    )
    since = timezone.now() - timedelta(days=30)
    series_rows = (
        Enrollment.objects.filter(course__in=queryset, created_at__gte=since)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(total=Count("id"))
        .order_by("day")
    )
    series_by_day = {row["day"].isoformat(): row["total"] for row in series_rows}
    days = [(since.date() + timedelta(days=index)).isoformat() for index in range(31)]
    return _response(
        {
            "courses": {status_value: counts.get(status_value, 0) for status_value in CourseStatus.values},
            "enrollments": enrollment_total,
            "inReview": counts.get(CourseStatus.IN_REVIEW, 0),
            "readiness": round(
                sum(services.publish_checklist(course)["completeness"] for course in recent_courses)
                / len(recent_courses)
            )
            if recent_courses
            else 0,
            "inbox": [
                {
                    "kind": "course_changes_requested",
                    "title": f"طلب المراجع تعديلات على «{course.title}»",
                    "courseSlug": course.slug,
                    "note": course.review_note,
                }
                for course in review_changes
            ],
            "recentActivity": [
                {"kind": "course_updated", "title": course.title, "courseSlug": course.slug, "at": course.updated_at}
                for course in recent_courses
            ],
            "series": [{"date": day, "enrollments": series_by_day.get(day, 0)} for day in days],
        }
    )


@extend_schema(
    methods=["GET"],
    operation_id="studio_profile_read",
    summary="Read the signed-in instructor profile.",
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@extend_schema(
    methods=["PATCH"],
    operation_id="studio_profile_update",
    summary="Update the signed-in instructor profile.",
    request=serializers.InstructorProfileRequest,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
)
@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated, perm("studio.access")])
@scoped_throttle("studio_write")
def profile(request: Any) -> Response:
    row, _ = InstructorProfile.objects.get_or_create(user=request.user)
    if request.method == "PATCH":
        values = _body(serializers.InstructorProfileRequest, request.data)
        avatar_url = values.pop("avatarUrl", None)
        if avatar_url is not None:
            request.user.avatar_url = avatar_url
            request.user.save(update_fields=["avatar_url"])
        for key, value in values.items():
            setattr(row, key, value)
        row.save()
    request.user.instructor_profile = row
    return _response(serializers.instructor_profile(request.user))


@extend_schema(
    methods=["GET"],
    operation_id="studio_courses_list",
    summary="List courses available in the Studio.",
    parameters=[
        OpenApiParameter("status", OpenApiTypes.STR, OpenApiParameter.QUERY),
        OpenApiParameter("q", OpenApiTypes.STR, OpenApiParameter.QUERY),
        OpenApiParameter("sort", OpenApiTypes.STR, OpenApiParameter.QUERY),
        OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY),
        OpenApiParameter("scope", OpenApiTypes.STR, OpenApiParameter.QUERY),
    ],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{items, total, page, pageSize}`.")},
)
@extend_schema(
    methods=["POST"],
    operation_id="studio_course_create",
    summary="Create a draft course.",
    request=serializers.CourseRequest,
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Full draft editor payload.")},
)
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, permission_for_methods(GET="studio.access", POST="courses.create")])
@scoped_throttle("studio_write")
def courses(request: Any) -> Response:
    if request.method == "POST":
        course = services.create_course(request.user, _body(serializers.CourseRequest, request.data))
        return _response(_editor_payload(_course(course.slug, editor=True)), code=status.HTTP_201_CREATED)
    scope = request.query_params.get("scope", "own")
    if scope not in {"own", "all"}:
        raise InvalidParameter("النطاق غير صالح.", code="invalid_scope")
    if scope == "all" and not has_perm(request.user, "courses.edit_any"):
        raise PermissionDenied()
    queryset = services.studio_course_queryset(request.user)
    if scope == "own" and has_perm(request.user, "courses.edit_any"):
        queryset = Course.objects.filter(
            staff__user=request.user,
            staff__kind__in=(CourseStaffKind.OWNER, CourseStaffKind.CO_INSTRUCTOR),
        ).distinct()
    status_value = request.query_params.get("status")
    if status_value:
        if status_value not in CourseStatus.values:
            raise InvalidParameter("حالة الدورة غير صالحة.", code="invalid_status")
        queryset = queryset.filter(status=status_value)
    query = _search(request)
    if query:
        queryset = queryset.filter(
            Q(slug__icontains=query) | Q(title__icontains=query) | Q(instructor__icontains=query)
        )
    sort_order = {
        "updated": ("-updated_at", "slug"),
        "enrolled": ("-enrolled_count", "-updated_at", "slug"),
        "title": (Lower("title"), "slug"),
    }.get(request.query_params.get("sort", "updated"), ("-updated_at", "slug"))
    page = _page(request)
    total = queryset.count()
    rows = queryset.prefetch_related("modules__lessons__video_asset").order_by(*sort_order)[
        (page - 1) * PAGE_SIZE : page * PAGE_SIZE
    ]
    for row in rows:
        row.studio_readiness = services.publish_checklist(row)["completeness"]
    return _response(
        {"items": [serializers.course_row(row) for row in rows], "total": total, "page": page, "pageSize": PAGE_SIZE}
    )


@extend_schema(
    operation_id="studio_course_duplicate",
    summary="Duplicate a course graph without copying provider video files.",
    parameters=[OpenApiParameter("keepVideos", OpenApiTypes.BOOL, OpenApiParameter.QUERY)],
    request=None,
    responses={201: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Duplicated draft course.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def duplicate(request: Any, slug: str) -> Response:
    course = _course(slug, editor=True)
    cloned = services.duplicate_course(
        course, request.user, keep_videos=request.query_params.get("keepVideos") == "true"
    )
    return _response(_editor_payload(_course(cloned.slug, editor=True)), code=status.HTTP_201_CREATED)


@extend_schema(
    operation_id="studio_course_bulk_archive",
    summary="Archive selected owned courses.",
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiResponse(description="Archive count.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def bulk_archive(request: Any) -> Response:
    slugs = request.data.get("slugs", []) if isinstance(request.data, dict) else []
    if not isinstance(slugs, list) or not slugs or any(not isinstance(slug, str) for slug in slugs):
        raise InvalidParameter("أرسل قائمة slugs صالحة.", code="invalid_slugs")
    return _response({"archived": services.bulk_archive_courses(slugs, request.user)})


def _editor_payload(course: Course) -> dict[str, Any]:
    return serializers.editor_course(
        course, checklist=serializers.checklist_payload(services.publish_checklist(course))
    )


@extend_schema(
    methods=["GET"],
    operation_id="studio_course_detail",
    summary="Read the full course editor graph.",
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    request=None,
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Editor graph including drafts and checklist.")
    },
)
@extend_schema(
    methods=["PATCH"],
    operation_id="studio_course_update",
    summary="Update course fields.",
    request=serializers.CourseRequest,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Updated editor graph.")},
)
@extend_schema(
    methods=["DELETE"],
    operation_id="studio_course_delete",
    summary="Delete a course without enrollments.",
    request=None,
    responses={204: OpenApiResponse(description="Deleted."), 409: OpenApiResponse(description="Has enrollments.")},
)
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def course_detail(request: Any, slug: str) -> Response:
    course = _course(slug, editor=True)
    if request.method == "GET":
        _require_editor(request.user, course)
        return _response(_editor_payload(course))
    if request.method == "PATCH":
        course = services.update_course(course, _body(serializers.CourseRequest, request.data), request.user)
        return _response(_editor_payload(_course(course.slug, editor=True)))
    services.delete_course(course, request.user)
    return _response(code=status.HTTP_204_NO_CONTENT)


@extend_schema(
    operation_id="studio_course_outcomes_replace",
    summary="Replace the ordered learning outcomes for a course.",
    request=serializers.OutcomesRequest,
    responses={200: OpenApiResponse(description="Updated editor graph.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def outcomes(request: Any, slug: str) -> Response:
    course = _course(slug)
    _require_editor(request.user, course)
    values = _body(serializers.OutcomesRequest, request.data)
    updated = services.update_course(
        course,
        {"outcomes": values["outcomes"], "expectedUpdatedAt": values.get("expectedUpdatedAt")},
        request.user,
    )
    return _response(_editor_payload(_course(updated.slug, editor=True)))


@extend_schema(
    operation_id="studio_course_related_replace",
    summary="Replace the published related-course slugs.",
    request=serializers.RelatedCoursesRequest,
    responses={200: OpenApiResponse(description="Updated editor graph.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def related_courses(request: Any, slug: str) -> Response:
    course = _course(slug)
    _require_editor(request.user, course)
    values = _body(serializers.RelatedCoursesRequest, request.data)
    updated = services.update_course(
        course,
        {"relatedIds": values["relatedIds"], "expectedUpdatedAt": values.get("expectedUpdatedAt")},
        request.user,
    )
    return _response(_editor_payload(_course(updated.slug, editor=True)))


@extend_schema(
    operation_id="studio_lesson_duplicate",
    summary="Duplicate a lesson and its resources.",
    request=None,
    responses={201: OpenApiResponse(description="Duplicated lesson row.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def lesson_duplicate(request: Any, lesson_id: Any) -> Response:
    row = _lesson(lesson_id)
    _require_curriculum(request.user, row.module.course)
    clone = services.duplicate_lesson(row, request.user)
    clone._studio_resources = list(clone.resources.all())
    return _response(serializers.lesson_row(clone), code=status.HTTP_201_CREATED)


@extend_schema(
    operation_id="studio_course_categories",
    summary="Read the catalog taxonomy for course editing.",
    responses={200: OpenApiResponse(description="`{items: [...]}`.")},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def categories(request: Any) -> Response:
    if not has_perm(request.user, "studio.access"):
        raise PermissionDenied()
    rows = Category.objects.order_by("slug")
    return _response({"items": [{"slug": row.slug, "label": row.label} for row in rows]})


@extend_schema(
    operation_id="studio_video_picker",
    summary="List own video metadata for the Phase 8 lesson picker.",
    parameters=[
        OpenApiParameter("q", OpenApiTypes.STR, OpenApiParameter.QUERY),
        OpenApiParameter("status", OpenApiTypes.STR, OpenApiParameter.QUERY),
    ],
    responses={200: OpenApiResponse(description="`{items: [...]}`.")},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def video_picker(request: Any) -> Response:
    if not has_perm(request.user, "videos.manage_own"):
        raise PermissionDenied()
    query = request.query_params.get("q", "").strip()
    if len(query) > MAX_SEARCH:
        raise InvalidParameter("عبارة البحث طويلة جدًا.", code="search_too_long")
    rows = VideoAsset.objects.select_related("provider")
    if not has_perm(request.user, "videos.manage_any"):
        rows = rows.filter(created_by=request.user)
    if query:
        rows = rows.filter(Q(title__icontains=query) | Q(slug__icontains=query))
    requested_status = request.query_params.get("status")
    if requested_status:
        if requested_status not in {"uploading", "processing", "ready", "staged", "error"}:
            raise InvalidParameter("حالة الفيديو غير صالحة.", code="invalid_status")
        rows = rows.filter(status=requested_status)
    return _response(
        {
            "items": [
                {
                    "id": str(row.pk),
                    "slug": row.slug,
                    "title": row.title or row.slug,
                    "status": row.status,
                    "durationSeconds": row.duration_seconds,
                    "playbackMode": row.playback_mode,
                    "protection": row.protection,
                    "provider": row.provider.code if row.provider_id else None,
                }
                for row in rows.order_by("-updated_at", "slug")[:100]
            ]
        }
    )


@extend_schema(
    operation_id="studio_course_submit",
    summary="Submit a draft course for review.",
    request=None,
    responses={200: OpenApiResponse(description="Updated course.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, perm("courses.submit_for_review")])
@scoped_throttle("studio_write")
def submit(request: Any, slug: str) -> Response:
    course = services.submit_for_review(_course(slug), request.user)
    return _response(_editor_payload(_course(course.slug, editor=True)))


@extend_schema(
    operation_id="studio_course_publish",
    summary="Publish a course.",
    request=None,
    responses={200: OpenApiResponse(description="Published course.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, perm("courses.publish")])
@scoped_throttle("studio_write")
def publish(request: Any, slug: str) -> Response:
    course = services.publish(_course(slug), request.user)
    return _response(_editor_payload(_course(course.slug, editor=True)))


@extend_schema(
    operation_id="studio_course_unpublish",
    summary="Unpublish or archive a course.",
    request=None,
    responses={200: OpenApiResponse(description="Updated course.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, perm("courses.publish")])
@scoped_throttle("studio_write")
def unpublish(request: Any, slug: str) -> Response:
    course = services.unpublish_or_archive(_course(slug), request.user)
    return _response(_editor_payload(_course(course.slug, editor=True)))


@extend_schema(
    operation_id="studio_course_checklist",
    summary="Read the publish checklist.",
    request=None,
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{issues, ready, completeness}`.")},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def checklist(request: Any, slug: str) -> Response:
    course = _course(slug)
    _require_editor(request.user, course)
    return _response(serializers.checklist_payload(services.publish_checklist(course)))


@extend_schema(
    methods=["GET"],
    operation_id="studio_course_staff_list",
    summary="List public-safe course staff.",
    request=None,
    responses={200: OpenApiResponse(description="`{items: [...]}`.")},
)
@extend_schema(
    methods=["POST"],
    operation_id="studio_course_staff_add",
    summary="Add course staff.",
    request=serializers.StaffRequest,
    responses={201: OpenApiResponse(description="Staff row.")},
)
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, perm("courses.manage_staff")])
@scoped_throttle("studio_write")
def staff(request: Any, slug: str) -> Response:
    course = _course(slug, editor=True)
    _require_staff_manager(request.user, course)
    if request.method == "GET":
        return _response({"items": [serializers.staff_row(row) for row in course._studio_staff]})
    values = _body(serializers.StaffRequest, request.data)
    try:
        user = User.objects.get(pk=values["userId"])
    except User.DoesNotExist, ValueError:
        raise NotFound("المستخدم غير موجود.") from None
    row = services.add_staff(course, request.user, user, values.get("kind", CourseStaffKind.CO_INSTRUCTOR))
    row.user = user
    return _response(serializers.staff_row(row), code=status.HTTP_201_CREATED)


@extend_schema(
    operation_id="studio_course_staff_candidates",
    summary="Search users allowed to join a course team.",
    parameters=[OpenApiParameter("q", OpenApiTypes.STR, OpenApiParameter.QUERY)],
    responses={200: OpenApiResponse(description="`{items: [...]}`.")},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated, perm("courses.manage_staff")])
@scoped_throttle("studio_write")
def staff_candidates(request: Any, slug: str) -> Response:
    course = _course(slug)
    _require_staff_manager(request.user, course)
    query = _search(request)
    existing_ids = set(CourseStaff.objects.filter(course=course).values_list("user_id", flat=True))
    users = User.objects.select_related("instructor_profile").exclude(pk__in=existing_ids)
    if query:
        users = users.filter(Q(full_name__icontains=query) | Q(email__icontains=query))
    candidates = []
    for user in users.order_by(Lower("full_name"), "email")[:100]:
        if has_perm(user, "studio.access"):
            candidates.append(serializers.staff_candidate_row(user))
            if len(candidates) >= 20:
                break
    return _response({"items": candidates})


@extend_schema(
    operation_id="studio_course_staff_remove",
    summary="Remove a course staff member.",
    request=None,
    responses={204: OpenApiResponse(description="Removed.")},
)
@api_view(["DELETE"])
@permission_classes([IsAuthenticated, perm("courses.manage_staff")])
@scoped_throttle("studio_write")
def staff_detail(request: Any, slug: str, staff_id: Any) -> Response:
    course = _course(slug)
    _require_staff_manager(request.user, course)
    row = CourseStaff.objects.filter(pk=_uuid(staff_id, "عضو الفريق")).first()
    if row is None:
        raise NotFound("عضو الفريق غير موجود.")
    services.remove_staff(course, request.user, row)
    return _response(code=status.HTTP_204_NO_CONTENT)


@extend_schema(
    operation_id="studio_module_create",
    summary="Add a curriculum module.",
    request=serializers.ModuleRequest,
    responses={201: OpenApiResponse(description="Module row.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def modules(request: Any, slug: str) -> Response:
    course = _course(slug)
    _require_curriculum(request.user, course)
    row = services.add_module(course, request.user, _body(serializers.ModuleRequest, request.data))
    row._studio_lessons = []
    return _response(serializers.module_row(row), code=status.HTTP_201_CREATED)


@extend_schema(
    operation_id="studio_module_reorder",
    summary="Reorder all modules.",
    request=serializers.ReorderRequest,
    responses={204: OpenApiResponse(description="Reordered.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def module_reorder(request: Any, slug: str) -> Response:
    course = _course(slug)
    _require_curriculum(request.user, course)
    values = _body(serializers.ReorderRequest, request.data)
    if values.get("moves"):
        raise InvalidParameter("لا تدعم الوحدات النقل بين الوحدات.")
    services.reorder_modules(course, request.user, values["orderedIds"])
    return _response(code=status.HTTP_204_NO_CONTENT)


@extend_schema(
    methods=["PATCH"],
    operation_id="studio_module_update",
    summary="Update a module.",
    request=serializers.ModuleRequest,
    responses={200: OpenApiResponse(description="Module row.")},
)
@extend_schema(
    methods=["DELETE"],
    operation_id="studio_module_delete",
    summary="Delete a module.",
    request=None,
    responses={204: OpenApiResponse(description="Deleted.")},
)
@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def module_detail(request: Any, module_id: Any) -> Response:
    row = _module(module_id)
    _require_curriculum(request.user, row.course)
    if request.method == "PATCH":
        row = services.update_module(row, request.user, _body(serializers.ModuleRequest, request.data))
        row._studio_lessons = []
        return _response(serializers.module_row(row))
    services.delete_module(row, request.user)
    return _response(code=status.HTTP_204_NO_CONTENT)


@extend_schema(
    operation_id="studio_lesson_create",
    summary="Add a lesson.",
    request=serializers.LessonRequest,
    responses={201: OpenApiResponse(description="Lesson row.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def lessons(request: Any, module_id: Any) -> Response:
    module = _module(module_id)
    _require_curriculum(request.user, module.course)
    row = services.add_lesson(module, request.user, _body(serializers.LessonRequest, request.data))
    row._studio_resources = []
    return _response(serializers.lesson_row(row), code=status.HTTP_201_CREATED)


@extend_schema(
    operation_id="studio_lesson_reorder",
    summary="Reorder lessons, including cross-module moves.",
    request=serializers.ReorderRequest,
    responses={204: OpenApiResponse(description="Reordered.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def lesson_reorder(request: Any, module_id: Any) -> Response:
    module = _module(module_id)
    _require_curriculum(request.user, module.course)
    values = _body(serializers.ReorderRequest, request.data)
    services.reorder_lessons(module, request.user, values.get("orderedIds", []), values.get("moves"))
    return _response(code=status.HTTP_204_NO_CONTENT)


@extend_schema(
    methods=["PATCH"],
    operation_id="studio_lesson_update",
    summary="Update a lesson.",
    request=serializers.LessonRequest,
    responses={200: OpenApiResponse(description="Lesson row.")},
)
@extend_schema(
    methods=["DELETE"],
    operation_id="studio_lesson_delete",
    summary="Delete a lesson.",
    request=None,
    responses={204: OpenApiResponse(description="Deleted.")},
)
@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def lesson_detail(request: Any, lesson_id: Any) -> Response:
    row = _lesson(lesson_id)
    _require_curriculum(request.user, row.module.course)
    if request.method == "PATCH":
        row = services.update_lesson(row, request.user, _body(serializers.LessonRequest, request.data))
        return _response(serializers.lesson_row(row))
    services.delete_lesson(row, request.user)
    return _response(code=status.HTTP_204_NO_CONTENT)


@extend_schema(
    methods=["PUT"],
    operation_id="studio_lesson_video_link",
    summary="Link a video asset to a lesson.",
    request=serializers.VideoRequest,
    responses={200: OpenApiResponse(description="Updated lesson.")},
)
@extend_schema(
    methods=["DELETE"],
    operation_id="studio_lesson_video_unlink",
    summary="Unlink a lesson video.",
    request=None,
    responses={200: OpenApiResponse(description="Updated lesson.")},
)
@api_view(["PUT", "DELETE"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def lesson_video(request: Any, lesson_id: Any) -> Response:
    row = _lesson(lesson_id)
    _require_curriculum(request.user, row.module.course)
    if request.method == "PUT":
        values = _body(serializers.VideoRequest, request.data)
        asset = VideoAsset.objects.filter(pk=values["assetId"]).first()
        if asset is None:
            raise NotFound("الفيديو غير موجود.")
        row = services.link_video(row, asset, request.user)
    else:
        row = services.unlink_video(row, request.user)
    row._studio_resources = list(row.resources.all())
    return _response(serializers.lesson_row(row))


@extend_schema(
    methods=["GET"],
    operation_id="studio_lesson_resources_list",
    summary="List lesson resources.",
    request=None,
    responses={200: OpenApiResponse(description="`{items: [...]}`.")},
)
@extend_schema(
    methods=["POST"],
    operation_id="studio_lesson_resource_create",
    summary="Create a lesson resource.",
    request=serializers.ResourceRequest,
    responses={201: OpenApiResponse(description="Resource row.")},
)
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def resources(request: Any, lesson_id: Any) -> Response:
    lesson = _lesson(lesson_id)
    _require_curriculum(request.user, lesson.module.course)
    if request.method == "GET":
        return _response({"items": [serializers.resource_row(row) for row in lesson._studio_resources]})
    values = _body(serializers.ResourceRequest, request.data)
    if not values.get("url"):
        raise InvalidParameter("رابط المورد مطلوب.", code="url_required")
    row = services.create_resource(lesson, request.user, values)
    return _response(serializers.resource_row(row), code=status.HTTP_201_CREATED)


@extend_schema(
    methods=["PATCH"],
    operation_id="studio_lesson_resource_update",
    summary="Update a lesson resource.",
    request=serializers.ResourceRequest,
    responses={200: OpenApiResponse(description="Resource row.")},
)
@extend_schema(
    methods=["DELETE"],
    operation_id="studio_lesson_resource_delete",
    summary="Delete a lesson resource.",
    request=None,
    responses={204: OpenApiResponse(description="Deleted.")},
)
@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@scoped_throttle("studio_write")
def resource_detail(request: Any, lesson_id: Any, resource_id: Any) -> Response:
    lesson = _lesson(lesson_id)
    _require_curriculum(request.user, lesson.module.course)
    row = _resource(resource_id)
    if row.lesson_id != lesson.pk:
        raise NotFound("المورد غير موجود.")
    if request.method == "PATCH":
        row = services.update_resource(row, request.user, _body(serializers.ResourceRequest, request.data))
        return _response(serializers.resource_row(row))
    services.delete_resource(row, request.user)
    return _response(code=status.HTTP_204_NO_CONTENT)


@extend_schema(
    operation_id="admin_review_queue",
    summary="List courses awaiting review.",
    request=None,
    responses={200: OpenApiResponse(description="Oldest in-review courses first.")},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated, perm("courses.review")])
def review_queue(request: Any) -> Response:
    rows = Course.objects.filter(status=CourseStatus.IN_REVIEW).order_by("submitted_at", "slug")
    return _response({"items": [serializers.course_row(row) for row in rows]})


@extend_schema(
    operation_id="admin_review_approve",
    summary="Approve and publish a course.",
    request=None,
    responses={200: OpenApiResponse(description="Published course.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, perm("courses.review")])
@scoped_throttle("studio_write")
def review_approve(request: Any, slug: str) -> Response:
    course = services.publish(_course(slug), request.user)
    return _response(_editor_payload(_course(course.slug, editor=True)))


@extend_schema(
    operation_id="admin_review_request_changes",
    summary="Return a course to draft with a review note.",
    request=serializers.ReviewNoteRequest,
    responses={200: OpenApiResponse(description="Draft course.")},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, perm("courses.review")])
@scoped_throttle("studio_write")
def review_request_changes(request: Any, slug: str) -> Response:
    values = _body(serializers.ReviewNoteRequest, request.data)
    course = services.request_changes(_course(slug), values["note"], request.user)
    return _response(_editor_payload(_course(course.slug, editor=True)))
