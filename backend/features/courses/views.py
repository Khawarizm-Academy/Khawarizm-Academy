"""Course views — thin handlers over the service.

Each one resolves the caller/row, calls one service function, serializes.
"""

from __future__ import annotations

from typing import Any

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework import serializers as ser
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from features.access.services import has_perm
from features.announcements.services import can_read as can_read_course_announcements
from features.common.choices import CourseStatus
from features.common.errors import Conflict, NotFound, PermissionDenied
from features.common.messages import COURSE_NOT_FOUND
from features.courses import services
from features.courses.models import Course, CourseLesson
from features.courses.serializers import course_detail
from features.dashboard.models import Enrollment


class CourseProgressRequestSerializer(ser.Serializer):
    progress = ser.IntegerField(required=False, min_value=0, max_value=100)
    lastLesson = ser.CharField(required=False, allow_blank=True, max_length=200)
    isCompleted = ser.BooleanField(required=False)
    completedLessonIds = ser.ListField(child=ser.CharField(max_length=120), required=False, max_length=1000)

    def to_internal_value(self, data):
        if not isinstance(data, dict):
            raise ser.ValidationError("يجب أن يكون جسم الطلب كائنًا.")
        unknown = sorted(set(data) - set(self.fields))
        if unknown:
            raise ser.ValidationError({key: "حقل غير معروف." for key in unknown})
        return super().to_internal_value(data)


def _visible_course(slug: str, user: Any) -> Course:
    course = Course.objects.visible_to(user).filter(slug=slug).first()
    if course is None:
        raise NotFound(COURSE_NOT_FOUND)
    return course


@extend_schema(
    operation_id="course_detail",
    summary="The full landing record for one course.",
    description="Modules, lessons, staff, and live sessions in one payload (constant 4 queries).",
    auth=None,
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="The CourseDetail shape.")},
)
@api_view(["GET"])
def course_detail_view(request: Any, slug: str) -> Response:
    """The full landing record for one course."""
    course = Course.objects.filter(slug=slug).select_related("owner", "owner__instructor_profile").first()
    if course is None:
        raise NotFound(COURSE_NOT_FOUND)
    preview = course.status in {CourseStatus.DRAFT, CourseStatus.IN_REVIEW}
    staff_view = services.can_edit(request.user, course) if getattr(request.user, "is_authenticated", False) else False
    if preview and not staff_view:
        raise NotFound(COURSE_NOT_FOUND)
    enrolled = bool(
        getattr(request.user, "is_authenticated", False)
        and course.status in {CourseStatus.PUBLISHED, CourseStatus.ARCHIVED}
        and has_perm(request.user, "lessons.watch")
        and Enrollment.objects.filter(user=request.user, course=course).exists()
    )
    can_read_announcements = can_read_course_announcements(request.user, course)
    from features.discussions import services as discussion_services

    can_read_discussions = discussion_services.can_read(request.user, course)
    can_post_discussions = discussion_services.can_post(request.user, course)
    can_reply_discussions = discussion_services.can_reply(request.user, course)
    can_moderate_discussions = discussion_services.can_moderate(request.user)
    include_private_session_data = staff_view or enrolled
    relation_rows = services.course_detail_relations(course)
    response = Response(
        course_detail(
            course,
            include_unpublished=staff_view,
            is_preview=preview,
            enrollable=course.status == CourseStatus.PUBLISHED,
            is_enrolled=enrolled,
            include_private_session_data=include_private_session_data,
            can_read_announcements=can_read_announcements,
            can_read_discussions=can_read_discussions,
            can_post_discussions=can_post_discussions,
            can_reply_discussions=can_reply_discussions,
            can_moderate_discussions=can_moderate_discussions,
            relation_rows=relation_rows,
        )
    )
    if getattr(request.user, "is_authenticated", False) or include_private_session_data or can_read_announcements:
        response["Cache-Control"] = "private, no-store"
    return response


@extend_schema(
    operation_id="course_lesson_article_content",
    summary="Read authorized Markdown and resources for one lesson.",
    auth=None,
    parameters=[
        OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH),
        OpenApiParameter("lesson_uuid", OpenApiTypes.UUID, OpenApiParameter.PATH),
    ],
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Lesson Markdown and safe resource links.")
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
def course_lesson_content_view(request: Any, slug: str, lesson_uuid: Any) -> Response:
    """Return lesson body only to staff, enrolled learners, or public free-preview viewers."""
    course = Course.objects.filter(slug=slug).first()
    if course is None:
        raise NotFound(COURSE_NOT_FOUND)
    lesson = (
        CourseLesson.objects.select_related("module__course")
        .prefetch_related("resources")
        .filter(pk=lesson_uuid, module__course_id=course.pk)
        .first()
    )
    if lesson is None:
        raise NotFound("الدرس غير موجود.")

    user = request.user
    staff_view = bool(
        getattr(user, "is_authenticated", False)
        and (services.can_edit(user, course) or services.can_edit(user, course, curriculum=True))
    )
    if not staff_view:
        if not lesson.is_published:
            raise NotFound("الدرس غير موجود.")
        free_preview = course.status == CourseStatus.PUBLISHED and lesson.is_free_preview
        enrolled = bool(
            course.status in {CourseStatus.PUBLISHED, CourseStatus.ARCHIVED}
            and getattr(user, "is_authenticated", False)
            and has_perm(user, "lessons.watch")
            and Enrollment.objects.filter(user=user, course=course).exists()
        )
        if not free_preview and not enrolled:
            raise PermissionDenied()

    response = Response(
        {
            "lessonId": lesson.lesson_id,
            "content": lesson.content,
            "resources": [
                {"id": str(item.pk), "title": item.title, "url": item.url, "kind": item.kind}
                for item in lesson.resources.all()
            ],
        }
    )
    response["Cache-Control"] = "private, no-store"
    return response


@extend_schema(
    operation_id="course_related",
    summary="Related course cards for the landing rail.",
    auth=None,
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT, description="`{items: [CatalogItem]}` — compact course cards."
        ),
    },
)
@api_view(["GET"])
def course_related_view(request: Any, slug: str) -> Response:
    """Related course cards for the landing rail."""
    course = _visible_course(slug, request.user)
    return Response({"items": services.related_for(course)})


@extend_schema(
    operation_id="course_enroll",
    summary="Enroll the signed-in learner in a course.",
    request=None,
    description="The enrollment counter moves inside the transaction; the catalog version bumps on commit only. "
    "Visitors get the same acknowledgement — the SPA gates the button.",
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{enrolled: true, courseId}`")},
)
@api_view(["POST"])
def course_enroll_view(request: Any, slug: str) -> Response:
    """Enroll the signed-in learner; anonymous callers get the plain acknowledgement."""
    course = Course.objects.filter(slug=slug).first()
    if course is None or course.status in {CourseStatus.DRAFT, CourseStatus.IN_REVIEW}:
        raise NotFound(COURSE_NOT_FOUND)
    if course.status != CourseStatus.PUBLISHED:
        raise Conflict("هذه الدورة غير متاحة للتسجيل.", code="not_enrollable")
    if request.user.is_authenticated:
        services.enroll(request.user, course)
    return Response({"enrolled": True, "courseId": course.slug})


@extend_schema(
    operation_id="course_progress",
    summary="Persist a progress sync for a course.",
    description="Signed-in callers save only the resume label; aggregate progress is derived on the server.",
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    request=CourseProgressRequestSerializer,
    responses={
        200: OpenApiResponse(response=OpenApiTypes.OBJECT, description="`{courseId, completedLessonIds}`"),
    },
)
@api_view(["POST"])
def course_progress_view(request: Any, slug: str) -> Response:
    """Persist the legacy resume label and never trust client aggregate fields."""
    course = Course.objects.filter(slug=slug).first()
    if course is None or course.status in {CourseStatus.DRAFT, CourseStatus.IN_REVIEW}:
        raise NotFound(COURSE_NOT_FOUND)
    body = CourseProgressRequestSerializer(data=request.data)
    body.is_valid(raise_exception=True)
    values = body.validated_data
    completed = values.get("completedLessonIds", [])
    if request.user.is_authenticated:
        enrollment = services.save_progress(request.user, course, values)
        return Response(
            {
                "courseId": course.slug,
                **services.enrollment_progress_payload(request.user, course, enrollment),
            }
        )
    return Response({"courseId": course.slug, "completedLessonIds": completed})


@extend_schema(
    operation_id="course_favorite",
    summary="Toggle a course in the learner's favorites.",
    request=None,
    description="Visitors get `{favorited: false, requiresAuth: true}` instead of an error.",
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT, description="`{favorited, courseId}` (+ `requiresAuth` for visitors)"
        ),
    },
)
@api_view(["POST"])
def course_favorite_view(request: Any, slug: str) -> Response:
    """Toggle a course in the learner's favorites; a visitor gets a sign-in hint."""
    course = Course.objects.filter(slug=slug, status__in=(CourseStatus.PUBLISHED, CourseStatus.ARCHIVED)).first()
    if course is None:
        raise NotFound(COURSE_NOT_FOUND)
    if not request.user.is_authenticated:
        return Response({"favorited": False, "requiresAuth": True})
    favorited = services.toggle_favorite(request.user, course)
    return Response({"favorited": favorited, "courseId": course.slug})


@extend_schema(
    operation_id="course_certificate",
    summary="Certificate metadata for a completed course.",
    auth=None,
    parameters=[OpenApiParameter("slug", OpenApiTypes.STR, OpenApiParameter.PATH)],
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT, description="`{courseId, courseTitle, credentialId, isOfficial}`"
        ),
    },
)
@api_view(["GET"])
def course_certificate_view(request: Any, slug: str) -> Response:
    """Certificate metadata for a completed course."""
    course = Course.objects.filter(slug=slug, status__in=(CourseStatus.PUBLISHED, CourseStatus.ARCHIVED)).first()
    if course is None:
        raise NotFound(COURSE_NOT_FOUND)
    return Response(services.certificate_payload(course))
