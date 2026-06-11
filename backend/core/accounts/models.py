from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    SUPER_ADMIN    = 'super_admin',    'Super Admin'
    EVENT_MANAGER  = 'event_manager',  'Event Manager'
    CHECK_IN_STAFF = 'check_in_staff', 'Check-In Staff'
    VIEWER         = 'viewer',         'Viewer'


ROLE_HIERARCHY = {
    Role.SUPER_ADMIN:    4,
    Role.EVENT_MANAGER:  3,
    Role.CHECK_IN_STAFF: 2,
    Role.VIEWER:         1,
}


class User(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VIEWER,
    )

    class Meta:
        ordering = ['username']

    def has_min_role(self, min_role: str) -> bool:
        return ROLE_HIERARCHY.get(self.role, 0) >= ROLE_HIERARCHY.get(min_role, 0)

    @property
    def is_super_admin(self) -> bool:
        return self.role == Role.SUPER_ADMIN or self.is_superuser

    @property
    def is_event_manager(self) -> bool:
        return self.is_superuser or self.has_min_role(Role.EVENT_MANAGER)

    @property
    def is_check_in_staff(self) -> bool:
        return self.is_superuser or self.has_min_role(Role.CHECK_IN_STAFF)
