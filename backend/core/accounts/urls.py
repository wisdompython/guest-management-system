from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import login_view, logout_view, me_view, UserViewSet

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('login/',  login_view),
    path('logout/', logout_view),
    path('me/',     me_view),
    path('', include(router.urls)),
]
