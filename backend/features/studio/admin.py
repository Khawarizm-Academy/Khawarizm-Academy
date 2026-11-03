from django.contrib import admin

from .models import InstructorStudentNote


@admin.register(InstructorStudentNote)
class InstructorStudentNoteAdmin(admin.ModelAdmin):
    list_display = ("course", "student", "author_name", "created_at")
    list_filter = ("course", "created_at")
    search_fields = ("course__title", "student__email", "author_name")
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("-created_at",)
