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
)


class CourseModuleInline(admin.TabularInline):
    model = CourseModule
    extra = 0
    show_change_link = True


class CourseLiveSessionInline(admin.TabularInline):
    model = CourseLiveSession
    extra = 0


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("slug", "title", "category_label", "course_level", "price_type", "language")
    list_filter = ("course_level", "price_type", "language", "category_slug")
    search_fields = ("slug", "title", "instructor")
    inlines = [CourseModuleInline, CourseLiveSessionInline]


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
