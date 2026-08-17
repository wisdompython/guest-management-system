from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    QueueMonitorView,
    UserViewSet,
    csrf_view,
    login_view,
    logout_view,
    me_view,
)

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('csrf/',   csrf_view),
    path('login/',  login_view),
    path('logout/', logout_view),
    path('me/',     me_view),
    path('operations/queue/', QueueMonitorView.as_view()),
    path('', include(router.urls)),
]
