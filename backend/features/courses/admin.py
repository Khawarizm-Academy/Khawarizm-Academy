"""Django admin registration for the courses feature."""

from __future__ import annotations

from django.contrib import admin

from features.courses.models import Course, CourseLesson, CourseLiveSession, CourseModule, CourseProblem, CourseProblemOption


class CourseLessonInline(admin.TabularInline):
    model = CourseLesson
    extra = 0


class CourseModuleInline(admin.TabularInline):
    model = CourseModule
    extra = 0


class CourseLiveSessionInline(admin.TabularInline):
    model = CourseLiveSession
    extra = 0


class CourseProblemOptionInline(admin.TabularInline):
    model = CourseProblemOption
    extra = 0


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("slug", "title", "category_label", "course_level", "price_type", "lessons_count")
    list_filter = ("course_level", "price_type", "language", "category_slug")
    search_fields = ("slug", "title", "instructor")
    inlines = (CourseModuleInline, CourseLiveSessionInline)


@admin.register(CourseModule)
class CourseModuleAdmin(admin.ModelAdmin):
    list_display = ("module_id", "title", "course", "order")
    inlines = (CourseLessonInline,)


@admin.register(CourseProblem)
class CourseProblemAdmin(admin.ModelAdmin):
    list_display = ("problem_id", "prompt")
    inlines = (CourseProblemOptionInline,)
