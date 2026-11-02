from django.contrib import admin

from .models import Answer, Attempt, AttemptGrant, Option, Question, Quiz


class OptionInline(admin.TabularInline):
    model = Option
    extra = 0


class QuestionInline(admin.StackedInline):
    model = Question
    extra = 0
    show_change_link = True


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "kind", "is_published", "order", "created_by")
    list_filter = ("kind", "is_published", "reveal_policy")
    search_fields = ("title", "course__title")
    inlines = (QuestionInline,)


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("prompt", "quiz", "kind", "order", "points")
    list_filter = ("kind", "partial_credit")
    search_fields = ("prompt", "quiz__title")
    inlines = (OptionInline,)


@admin.register(Option)
class OptionAdmin(admin.ModelAdmin):
    list_display = ("label", "question", "is_correct", "order")
    list_filter = ("is_correct",)
    search_fields = ("label", "question__prompt")


@admin.register(Attempt)
class AttemptAdmin(admin.ModelAdmin):
    list_display = ("quiz", "user", "status", "percent", "passed", "started_at", "submitted_at")
    list_filter = ("status", "passed", "quiz__kind")
    search_fields = ("quiz__title", "user__email")
    readonly_fields = ("score", "max_score", "percent", "passed")


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ("attempt", "question", "is_correct", "points_awarded")
    list_filter = ("is_correct",)
    search_fields = ("attempt__user__email", "question__prompt")


@admin.register(AttemptGrant)
class AttemptGrantAdmin(admin.ModelAdmin):
    list_display = ("quiz", "user", "extra", "granted_by", "created_at")
    search_fields = ("quiz__title", "user__email", "note")
