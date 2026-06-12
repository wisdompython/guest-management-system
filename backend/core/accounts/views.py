from django.contrib.auth import login, logout
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from .models import User
from .permissions import IsSuperAdmin, IsAuthenticatedAnyRole
from .serializers import (
    LoginSerializer, UserSerializer,
    CreateUserSerializer, UpdateUserSerializer,
)


@ensure_csrf_cookie
@api_view(['GET'])
@permission_classes([AllowAny])
def csrf_view(request):
    return Response({'detail': 'CSRF cookie set.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']
    login(request, user)
    return Response(UserSerializer(user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticatedAnyRole])
def logout_view(request):
    logout(request)
    return Response({'detail': 'Logged out.'})


@api_view(['GET'])
@permission_classes([IsAuthenticatedAnyRole])
def me_view(request):
    return Response(UserSerializer(request.user).data)


class UserViewSet(ModelViewSet):
    """CRUD for users — super admins only."""
    queryset = User.objects.all().order_by('username')
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        if self.action in ('update', 'partial_update'):
            return UpdateUserSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        create_ser = CreateUserSerializer(data=request.data)
        create_ser.is_valid(raise_exception=True)
        user = create_ser.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response(
                {'detail': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)
