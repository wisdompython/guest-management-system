from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, GuestViewSet

router = DefaultRouter()
router.register('events', EventViewSet)
router.register('guests', GuestViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
