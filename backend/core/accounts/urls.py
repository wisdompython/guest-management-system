from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import login_view, logout_view, me_view, csrf_view, UserViewSet

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('csrf/',   csrf_view),
    path('login/',  login_view),
    path('logout/', logout_view),
    path('me/',     me_view),
    path('', include(router.urls)),
]
