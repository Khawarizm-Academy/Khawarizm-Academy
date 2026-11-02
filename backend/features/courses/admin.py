"""Django admin for courses — the whole curriculum is edited inline."""

from __future__ import annotations

from django.contrib import admin

from features.courses.models import (
    Course,
    CourseLesson,
    CourseLiveSession,
    CourseModule,
    CourseProblem,
    CourseProblemOption,
    CourseStaff,
    LessonResource,
)


class CourseModuleInline(admin.TabularInline):
    model = CourseModule
    extra = 0
    show_change_link = True


class CourseLiveSessionInline(admin.TabularInline):
    model = CourseLiveSession
    extra = 0


class CourseStaffInline(admin.TabularInline):
    model = CourseStaff
    extra = 0


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("slug", "title", "status", "owner", "course_level", "price_type", "language")
    list_filter = ("status", "course_level", "price_type", "language", "category_slug")
    search_fields = ("slug", "title", "instructor")
    inlines = [CourseModuleInline, CourseLiveSessionInline, CourseStaffInline]


class CourseLessonInline(admin.TabularInline):
    model = CourseLesson
    extra = 0


@admin.register(CourseModule)
class CourseModuleAdmin(admin.ModelAdmin):
    list_display = ("course", "module_id", "title", "order")
    list_filter = ("course",)
    search_fields = ("module_id", "title")
    inlines = [CourseLessonInline]


@admin.register(CourseLesson)
class CourseLessonAdmin(admin.ModelAdmin):
    list_display = ("module", "lesson_id", "title", "duration", "order")
    search_fields = ("lesson_id", "title")

    class LessonResourceInline(admin.TabularInline):
        model = LessonResource
        extra = 0

    inlines = [LessonResourceInline]


@admin.register(CourseStaff)
class CourseStaffAdmin(admin.ModelAdmin):
    list_display = ("course", "user", "kind", "created_at", "updated_at")
    list_filter = ("kind",)
    search_fields = ("course__slug", "user__email", "user__full_name")


@admin.register(LessonResource)
class LessonResourceAdmin(admin.ModelAdmin):
    list_display = ("lesson", "title", "kind", "order")
    list_filter = ("kind",)
    search_fields = ("lesson__lesson_id", "lesson__module__course__slug", "title")


@admin.register(CourseLiveSession)
class CourseLiveSessionAdmin(admin.ModelAdmin):
    list_display = ("course", "session_id", "title", "state", "date_label")
    list_filter = ("state",)
    search_fields = ("session_id", "title")


class CourseProblemOptionInline(admin.TabularInline):
    model = CourseProblemOption
    extra = 1


@admin.register(CourseProblem)
class CourseProblemAdmin(admin.ModelAdmin):
    list_display = ("problem_id", "prompt")
    search_fields = ("problem_id", "prompt")
    inlines = [CourseProblemOptionInline]


@admin.register(CourseProblemOption)
class CourseProblemOptionAdmin(admin.ModelAdmin):
    list_display = ("problem", "option_id", "label")
    search_fields = ("problem__problem_id", "option_id", "label")
