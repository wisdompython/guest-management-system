from rest_framework.permissions import BasePermission
from .models import Role


class IsSuperAdmin(BasePermission):
    """Full access — only super admins."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_super_admin)


class IsEventManagerOrAbove(BasePermission):
    """Super admin or event manager."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_event_manager)


class IsCheckInStaffOrAbove(BasePermission):
    """Any authenticated staff (check-in, manager, super admin)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_check_in_staff)


class IsAuthenticatedAnyRole(BasePermission):
    """Any authenticated user (including viewer)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


# Convenience: read-only for viewers/check-in staff, write for managers+
class ReadOnlyOrEventManager(BasePermission):
    """
    GET/HEAD/OPTIONS allowed for any authenticated user.
    Mutating methods (POST/PUT/PATCH/DELETE) require event_manager or above.
    """
    SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in self.SAFE_METHODS:
            return True
        return request.user.is_event_manager
