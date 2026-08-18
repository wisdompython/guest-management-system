from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from ..models import Guest


class GuestPreferencesView(APIView):
    """Collect planning preferences without turning pass delivery into RSVP."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'public_rsvp'

    def get_guest(self, token):
        return get_object_or_404(
            Guest.objects.select_related('event'),
            preference_token=token,
        )

    @staticmethod
    def can_respond(guest):
        return bool(
            guest.event.preferences_enabled
            and not guest.event.is_ended
            and guest.event.date > timezone.now()
        )

    def get(self, request, token):
        guest = self.get_guest(token)
        event = guest.event
        from ..plus_one import get_named_plus_one
        named_plus_one = get_named_plus_one(guest)
        return Response({
            'guest_name': guest.full_name,
            'event_name': event.name,
            'event_date': event.date,
            'venue': event.venue,
            'allow_plus_one': event.allow_plus_one,
            'collect_aso_ebi': event.collect_aso_ebi,
            'collect_celebrant': event.collect_celebrant,
            'celebrant_options': event.celebrant_options or [],
            'plus_one_attending': guest.plus_one_attending,
            'plus_one_full_name': named_plus_one.full_name if named_plus_one else '',
            'plus_one_phone_number': named_plus_one.phone_number if named_plus_one else '',
            'aso_ebi_requested': guest.aso_ebi_requested,
            'aso_ebi_quantity': guest.aso_ebi_quantity,
            'celebrant_name': guest.celebrant_name,
            'submitted_at': guest.preferences_submitted_at,
            'can_respond': self.can_respond(guest),
        })

    @transaction.atomic
    def post(self, request, token):
        guest = self.get_guest(token)
        event = guest.event
        if not self.can_respond(guest):
            return Response(
                {'detail': 'Guest preferences are not open for this event.'},
                status=status.HTTP_409_CONFLICT,
            )

        plus_one_attending = request.data.get('plus_one_attending', False)
        aso_ebi_requested = request.data.get('aso_ebi_requested', False)
        if not isinstance(plus_one_attending, bool):
            return Response(
                {'detail': 'plus_one_attending must be true or false.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(aso_ebi_requested, bool):
            return Response(
                {'detail': 'aso_ebi_requested must be true or false.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if plus_one_attending and not event.allow_plus_one:
            return Response(
                {'detail': 'Plus one is not enabled for this event.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        plus_one_full_name = str(request.data.get('plus_one_full_name', '') or '').strip()
        plus_one_phone_number = str(request.data.get('plus_one_phone_number', '') or '').strip()
        if plus_one_attending:
            from ..plus_one import NamedPlusOneError, validate_named_plus_one
            try:
                plus_one_full_name, plus_one_phone_number = validate_named_plus_one(
                    guest,
                    plus_one_full_name,
                    plus_one_phone_number,
                )
            except NamedPlusOneError as exc:
                return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if aso_ebi_requested and not event.collect_aso_ebi:
            return Response(
                {'detail': 'Aso Ebi requests are not enabled for this event.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            aso_ebi_quantity = int(request.data.get('aso_ebi_quantity', 0))
        except (TypeError, ValueError):
            aso_ebi_quantity = 0
        if aso_ebi_requested and aso_ebi_quantity < 1:
            return Response(
                {'detail': 'Enter at least 1 yard for the Aso Ebi request.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        celebrant_name = str(request.data.get('celebrant_name', '') or '').strip()
        if celebrant_name and not event.collect_celebrant:
            return Response(
                {'detail': 'Celebrant preferences are not enabled for this event.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if celebrant_name and event.celebrant_options and celebrant_name not in event.celebrant_options:
            return Response(
                {'detail': 'Select one of the configured celebrants.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        guest.plus_one_attending = plus_one_attending if event.allow_plus_one else False
        guest.aso_ebi_requested = aso_ebi_requested if event.collect_aso_ebi else False
        guest.aso_ebi_quantity = aso_ebi_quantity if guest.aso_ebi_requested else 0
        guest.celebrant_name = celebrant_name if event.collect_celebrant else ''
        guest.preferences_submitted_at = timezone.now()
        if not guest.plus_one_attending:
            guest.plus_one_checked_in = False
            guest.plus_one_checked_in_at = None
        guest.save(update_fields=[
            'plus_one_attending', 'aso_ebi_requested', 'aso_ebi_quantity',
            'celebrant_name', 'preferences_submitted_at',
            'plus_one_checked_in', 'plus_one_checked_in_at',
        ])
        named_plus_one = None
        if guest.plus_one_attending:
            from ..plus_one import upsert_named_plus_one
            from ..tasks import generate_guest_assets
            from rsvp.services import sync_guest_to_workflow

            named_plus_one, _, changed = upsert_named_plus_one(
                guest,
                plus_one_full_name,
                plus_one_phone_number,
            )
            sync_guest_to_workflow(named_plus_one)
            if changed:
                plus_one_id = str(named_plus_one.id)
                transaction.on_commit(
                    lambda: generate_guest_assets.delay(plus_one_id, send_whatsapp=True)
                )
        else:
            from ..plus_one import NamedPlusOneError, remove_named_plus_one
            try:
                remove_named_plus_one(guest)
            except NamedPlusOneError as exc:
                transaction.set_rollback(True)
                return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        return Response({
            'saved': True,
            'plus_one_attending': guest.plus_one_attending,
            'plus_one_full_name': named_plus_one.full_name if named_plus_one else '',
            'plus_one_phone_number': named_plus_one.phone_number if named_plus_one else '',
            'aso_ebi_requested': guest.aso_ebi_requested,
            'aso_ebi_quantity': guest.aso_ebi_quantity,
            'celebrant_name': guest.celebrant_name,
            'submitted_at': guest.preferences_submitted_at,
        })
