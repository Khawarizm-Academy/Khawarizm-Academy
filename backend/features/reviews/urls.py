from django.urls import path

from . import views

urlpatterns = [
    path("courses/<slug:slug>/reviews", views.course_reviews, name="course-reviews-list"),
    path("courses/<slug:slug>/reviews/write", views.course_review_create, name="course-review-create"),
    path("courses/<slug:slug>/reviews/<uuid:review_id>", views.course_review_update, name="course-review-update"),
    path(
        "courses/<slug:slug>/reviews/<uuid:review_id>/reply",
        views.course_review_reply,
        name="course-review-reply",
    ),
    path("reviews/<uuid:review_id>/moderate", views.course_review_moderate, name="course-review-moderate"),
    path("studio/reviews", views.studio_review_inbox, name="studio-review-inbox"),
]
