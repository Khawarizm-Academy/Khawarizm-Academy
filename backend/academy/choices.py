"""Canonical choice constants that mirror the frontend discriminated unions."""

from django.db import models


class ItemType(models.TextChoices):
    COURSE = "course", "Course"
    SCHOLARSHIP = "scholarship", "Scholarship"


class CategorySlug(models.TextChoices):
    AI = "ai", "ai"
    PROGRAMMING = "programming", "programming"
    CYBERSECURITY = "cybersecurity", "cybersecurity"
    SPACE = "space", "space"
    CS = "cs", "cs"


class CourseLevel(models.TextChoices):
    BEGINNER = "beginner", "beginner"
    INTERMEDIATE = "intermediate", "intermediate"
    ADVANCED = "advanced", "advanced"


class CoursePriceType(models.TextChoices):
    FREE = "free", "free"
    PAID = "paid", "paid"


class ScholarshipCountrySlug(models.TextChoices):
    SAUDI = "saudi", "saudi"
    USA = "usa", "usa"
    TURKEY = "turkey", "turkey"
    UK = "uk", "uk"
    GERMANY = "germany", "germany"


class ScholarshipDegreeLevel(models.TextChoices):
    BACHELOR = "bachelor", "bachelor"
    MASTER = "master", "master"
    PHD = "phd", "phd"


class ScholarshipCoverageType(models.TextChoices):
    FULLY_FUNDED = "fully_funded", "fully_funded"
    PARTIAL = "partial", "partial"


class ScholarshipStatus(models.TextChoices):
    OPEN = "open", "open"
    CLOSING_SOON = "closing_soon", "closing_soon"
    CLOSED = "closed", "closed"


class ScholarshipDeadlineUrgency(models.TextChoices):
    CRITICAL = "critical", "critical"
    WARNING = "warning", "warning"
    NORMAL = "normal", "normal"


class LessonStatus(models.TextChoices):
    LOCKED = "locked", "locked"
    ACTIVE = "active", "active"
    COMPLETED = "completed", "completed"
    AVAILABLE = "available", "available"


class LiveSessionState(models.TextChoices):
    UPCOMING = "upcoming", "upcoming"
    LIVE = "live", "live"
    PAST = "past", "past"


class CompetitionStatusColor(models.TextChoices):
    BLUE = "blue", "blue"
    RED = "red", "red"
    GREEN = "green", "green"


class CompetitionActionVariant(models.TextChoices):
    GOLD = "gold", "gold"
    SKY = "sky", "sky"


class NotificationType(models.TextChoices):
    LIVE = "live", "live"
    SCHOLARSHIP = "scholarship", "scholarship"
    EXAM = "exam", "exam"
    COMPETITION = "competition", "competition"
    LESSON = "lesson", "lesson"
    APPLICATION = "application", "application"


class EventFormat(models.TextChoices):
    LIVE = "بث مباشر", "بث مباشر"
    IN_PERSON = "حضوري", "حضوري"
    ONLINE = "عبر الإنترنت", "عبر الإنترنت"


class ThumbnailType(models.TextChoices):
    AI_GENERATIVE = "ai_generative", "ai_generative"
    WEB_FRONTEND = "web_frontend", "web_frontend"
    PYTHON_DATA = "python_data", "python_data"
    AI_ML = "ai_ml", "ai_ml"
    ASTROLABE_SCHOLARSHIP = "astrolabe_scholarship", "astrolabe_scholarship"
    CAMPUS_NIGHT = "campus_night", "campus_night"
    LEADERSHIP_DUBAI = "leadership_dubai", "leadership_dubai"
    SPACE_ASTROLABE = "space_astrolabe", "space_astrolabe"
    DATA_SCIENCE_STAGE = "data_science_stage", "data_science_stage"
    ACADEMIC_WORKSHOP = "academic_workshop", "academic_workshop"


class CourseTrackIcon(models.TextChoices):
    PYTHON = "python", "python"
    DATA = "data", "data"
    AI = "ai", "ai"
    UIUX = "uiux", "uiux"
    CODE = "code", "code"


class QuickLinkTone(models.TextChoices):
    BLUE = "blue", "blue"
    GOLD = "gold", "gold"


class ScholarshipCheckIcon(models.TextChoices):
    CHECK_CIRCLE = "CheckCircle2", "CheckCircle2"
    FILE_CHECK = "FileCheck", "FileCheck"


class ScholarshipCheckKind(models.TextChoices):
    GPA = "gpa", "gpa"
    STATIC = "static", "static"
