from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PublicRsvpResponseView, RsvpRecipientViewSet, RsvpWorkflowViewSet


router = DefaultRouter()
router.register('workflows', RsvpWorkflowViewSet, basename='rsvp-workflow')
router.register('recipients', RsvpRecipientViewSet, basename='rsvp-recipient')

urlpatterns = [
    path('respond/<uuid:token>/', PublicRsvpResponseView.as_view(), name='public-rsvp-response'),
    path('', include(router.urls)),
]
