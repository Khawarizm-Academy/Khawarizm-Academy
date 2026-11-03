"""Notification consumers and integration hooks for learning-loop events.

Feature event sources call the ``receive_*`` functions after their successful
transaction. Existing announcement, quiz, and live-session signals are wired
here so those sources stay independent of dashboard storage.
"""

from __future__ import annotations

from typing import Any

from django.dispatch import receiver

from features.announcements.signals import on_announcement_created
from features.courses.live_sessions_signals import live_session_changed
from features.dashboard.models import Enrollment
from features.dashboard.notifications import notify
from features.quizzes.signals import on_exam_passed, on_quiz_submitted


def _course_learners(course_id: Any, *, exclude_user_id: Any | None = None) -> list[Any]:
    query = Enrollment.objects.filter(course_id=course_id)
    if exclude_user_id is not None:
        query = query.exclude(user_id=exclude_user_id)
    return list(query.values_list("user_id", flat=True))


def _course_staff(course_id: Any) -> list[Any]:
    from features.courses.models import Course

    course = Course.objects.prefetch_related("staff").get(pk=course_id)
    ids = {course.owner_id} if course.owner_id else set()
    ids.update(course.staff.values_list("user_id", flat=True))
    return list(ids)


def receive_enrollment_created(enrollment: Any) -> int:
    """Hook called after enrollment creation."""
    return notify(
        [enrollment.user_id],
        "enrollment_confirmation",
        {
            "title": "تم تأكيد التسجيل",
            "message": f"تم تسجيلك في دورة {enrollment.course.title}.",
            "link": f"/courses/{enrollment.course.slug}",
            "notificationType": "lesson",
        },
        f"enrollment:{enrollment.pk}:confirmed",
    )


def receive_lesson_milestone(user_id: Any, course: Any, milestone: str, *, lesson_id: Any = "") -> int:
    return notify(
        [user_id],
        "lesson_milestone",
        {
            "title": "تقدّم جديد في الدورة",
            "message": f"أكملت {milestone} في دورة {course.title}.",
            "link": f"/courses/{course.slug}",
            "notificationType": "lesson",
        },
        f"lesson-milestone:{user_id}:{course.pk}:{lesson_id or milestone}",
    )


def receive_quiz_milestone(attempt: Any) -> int:
    quiz = attempt.quiz
    return notify(
        [attempt.user_id],
        "quiz_milestone",
        {
            "title": "نتيجة الاختبار متاحة",
            "message": f"ظهرت نتيجة اختبار {quiz.title}.",
            "link": f"/courses/{quiz.course.slug}",
            "notificationType": "exam",
        },
        f"quiz-milestone:{attempt.pk}",
    )


def receive_exam_result(attempt: Any) -> int:
    passed = bool(attempt.passed)
    kind = "exam_passed" if passed else "exam_failed"
    return notify(
        [attempt.user_id],
        kind,
        {
            "title": "نجحت في الاختبار" if passed else "نتيجة الاختبار",
            "message": f"نتيجتك في {attempt.quiz.title}: {attempt.percent or 0}%.",
            "link": f"/courses/{attempt.quiz.course.slug}",
            "notificationType": "exam",
        },
        f"exam-result:{attempt.pk}",
    )


def receive_certificate(user_id: Any, certificate: Any, *, revoked: bool = False) -> int:
    from features.courses.certificate_services import certificate_serial

    kind = "certificate_revoked" if revoked else "certificate_issued"
    return notify(
        [user_id],
        kind,
        {
            "title": "تم إلغاء الشهادة" if revoked else "تهانينا، صدرت شهادتك",
            "message": (
                f"تم إلغاء شهادة دورة {certificate.course.title}."
                if revoked
                else f"يمكنك الآن عرض شهادة دورة {certificate.course.title}."
            ),
            "link": f"/verify/{certificate_serial(certificate)}",
            "notificationType": "application",
        },
        f"certificate:{certificate.pk}:{kind}",
    )


def receive_announcement(announcement: Any, course: Any, *, actor_id: Any | None = None) -> int:
    return notify(
        _course_learners(course.pk, exclude_user_id=actor_id),
        "announcement",
        {
            "title": announcement.title,
            "message": announcement.title,
            "link": f"/courses/{course.slug}",
            "notificationType": "lesson",
        },
        f"announcement:{announcement.pk}",
    )


def receive_live_session(session: Any, action: str, *, course: Any | None = None) -> int:
    if action not in {"created", "scheduled", "rescheduled", "cancelled"}:
        return 0
    course = course or session.course
    labels = {
        "created": "تمت جدولة جلسة مباشرة",
        "scheduled": "تمت جدولة جلسة مباشرة",
        "rescheduled": "تم تغيير موعد الجلسة المباشرة",
        "cancelled": "تم إلغاء الجلسة المباشرة",
    }
    return notify(
        _course_learners(course.pk),
        "live_session",
        {
            "title": labels[action],
            "message": f"{session.title} — {labels[action]}.",
            "link": f"/courses/{course.slug}",
            "notificationType": "live",
        },
        f"live-session:{session.pk}:{action}:"
        f"{session.updated_at.isoformat() if getattr(session, 'updated_at', None) else ''}",
    )


def receive_course_published(course: Any) -> int:
    return notify(
        _course_staff(course.pk),
        "course_published",
        {
            "title": "تم نشر الدورة",
            "message": f"تم نشر دورة {course.title}.",
            "link": f"/courses/{course.slug}",
            "notificationType": "lesson",
        },
        f"course-published:{course.pk}:{course.updated_at.isoformat() if getattr(course, 'updated_at', None) else ''}",
    )


def receive_changes_requested(course: Any, *, reason: str = "") -> int:
    return notify(
        _course_staff(course.pk),
        "changes_requested",
        {
            "title": "مطلوب تعديل على الدورة",
            "message": reason or f"يرجى مراجعة التعديلات المطلوبة على {course.title}.",
            "link": f"/studio/courses/{course.slug}",
            "notificationType": "lesson",
        },
        f"course-changes-requested:{course.pk}:"
        f"{course.updated_at.isoformat() if getattr(course, 'updated_at', None) else ''}",
    )


def receive_review(review: Any) -> int:
    return notify(
        _course_staff(review.course_id),
        "new_review",
        {
            "title": "تقييم جديد على دورتك",
            "message": f"أضاف متعلّم تقييمًا إلى {review.course.title}.",
            "link": f"/studio/courses/{review.course.slug}/reviews",
            "notificationType": "application",
        },
        f"review:{review.pk}",
    )


def receive_question(thread: Any) -> int:
    return notify(
        _course_staff(thread.course_id),
        "new_question",
        {
            "title": "سؤال جديد في دورتك",
            "message": thread.title,
            "link": f"/studio/courses/{thread.course.slug}/discussions",
            "notificationType": "lesson",
        },
        f"question:{thread.pk}",
    )


def receive_discussion_reply(post: Any) -> int:
    thread = post.thread
    return notify(
        [thread.author_id],
        "discussion_reply",
        {
            "title": "رد فريق الدورة على سؤالك",
            "message": f"أجاب فريق الدورة عن: {thread.title}",
            "link": f"/courses/{thread.course.slug}/learn?lesson={thread.lesson.lesson_id if thread.lesson_id else ''}",
            "notificationType": "lesson",
        },
        f"discussion-reply:{post.pk}",
    )


def receive_role_changed(user_id: Any, *, role: str) -> int:
    return notify(
        [user_id],
        "role_changed",
        {
            "title": "تم تحديث دورك",
            "message": f"تم تحديث دور حسابك إلى {role}.",
            "link": "/profile",
            "notificationType": "application",
        },
        f"role-changed:{user_id}:{role}",
    )


@receiver(on_announcement_created, dispatch_uid="dashboard-notifications-announcement")
def _announcement_signal(sender: Any, announcement: Any, course: Any, actor: Any, **kwargs: Any) -> None:
    receive_announcement(announcement, course, actor_id=getattr(actor, "pk", None))


@receiver(live_session_changed, dispatch_uid="dashboard-notifications-live-session")
def _live_session_signal(sender: Any, session: Any, action: str, course: Any, **kwargs: Any) -> None:
    receive_live_session(session, action, course=course)


@receiver(on_quiz_submitted, dispatch_uid="dashboard-notifications-quiz-submitted")
def _quiz_signal(sender: Any, attempt: Any, **kwargs: Any) -> None:
    if getattr(attempt.quiz, "kind", "") != "exam":
        receive_quiz_milestone(attempt)
    else:
        receive_exam_result(attempt)


@receiver(on_exam_passed, dispatch_uid="dashboard-notifications-exam-passed")
def _exam_signal(sender: Any, attempt: Any, **kwargs: Any) -> None:
    # The submitted signal already carries the same dedupe key for exam attempts.
    receive_exam_result(attempt)
