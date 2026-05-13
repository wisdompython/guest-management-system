from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, GuestViewSet, FontViewSet

router = DefaultRouter()
router.register('events', EventViewSet)
router.register('guests', GuestViewSet)
router.register('fonts', FontViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
