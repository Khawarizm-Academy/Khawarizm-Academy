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


class VideoStatus(models.TextChoices):
    """Lifecycle of a hosted lesson video (any provider, HLS-packaged)."""

    UPLOADING = "uploading", "Uploading"
    PROCESSING = "processing", "Processing"
    READY = "ready", "Ready"
    # Source stored safely, HLS packaging still pending (no FFmpeg on this host).
    STAGED = "staged", "Staged"
    ERROR = "error", "Error"


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


class Role(models.TextChoices):
    """The three account types; admin also gets Django's staff flags."""

    STUDENT = "student", "student"
    INSTRUCTOR = "instructor", "instructor"
    ADMIN = "admin", "admin"


class AuthProvider(models.TextChoices):
    """Where a login came from — Firebase reports this on the ID token."""

    PASSWORD = "password", "password"
    GOOGLE = "google", "google"
    FACEBOOK = "facebook", "facebook"
    DEV = "dev", "dev"


class DeviceType(models.TextChoices):
    DESKTOP = "desktop", "desktop"
    MOBILE = "mobile", "mobile"
    TABLET = "tablet", "tablet"
    UNKNOWN = "unknown", "unknown"


class SessionRevokeReason(models.TextChoices):
    """Why a session stopped being valid — surfaced to the device."""

    LOGOUT = "logout", "logout"
    SIGNED_IN_ELSEWHERE = "signed_in_elsewhere", "signed_in_elsewhere"
    EXPIRED = "expired", "expired"
    REVOKED_BY_ADMIN = "revoked_by_admin", "revoked_by_admin"


class AuthEventKind(models.TextChoices):
    """One audit row per auth action, for the admin analytics dashboard."""

    LOGIN = "login", "login"
    LOGOUT = "logout", "logout"
    REFRESH = "refresh", "refresh"
    REVOKED = "revoked", "revoked"
    REJECTED = "rejected", "rejected"


class FilterGroupKind(models.TextChoices):
    """How a filter group is rendered: exclusive buttons or a free input."""

    CHOICE = "choice", "choice"
    SEARCH = "search", "search"
