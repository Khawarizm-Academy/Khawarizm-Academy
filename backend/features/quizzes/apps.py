from django.apps import AppConfig


class QuizzesConfig(AppConfig):
    name = "features.quizzes"
    label = "quizzes"
    verbose_name = "Quizzes"
    default_auto_field = "django.db.models.BigAutoField"
