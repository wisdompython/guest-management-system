from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, GuestViewSet, FontViewSet, EventReminderViewSet
from .webhook import whatsapp_webhook
from .views.test_views import whatsapp_test_send

router = DefaultRouter()
router.register('events', EventViewSet)
router.register('guests', GuestViewSet)
router.register('fonts', FontViewSet)
router.register('reminders', EventReminderViewSet, basename='reminder')

urlpatterns = [
    path('', include(router.urls)),
    path('webhooks/whatsapp/', whatsapp_webhook, name='whatsapp_webhook'),
    path('whatsapp/test-send/', whatsapp_test_send, name='whatsapp_test_send'),
]
