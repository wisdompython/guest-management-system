import logging

from django.conf import settings
from django.utils.text import slugify

from guests.whatsapp import (
    _build_pass_url,
    _format_ordinal_date,
    _get_client,
    _normalise_phone,
    _resolve_template_params,
)

logger = logging.getLogger(__name__)


def build_callback_data(recipient, answer: str) -> str:
    if answer not in {'yes', 'no'}:
        raise ValueError('RSVP callback answer must be yes or no.')
    return f'rsvp:{recipient.callback_token}:{answer}'


def build_rsvp_url(recipient) -> str:
    event_slug = slugify(recipient.workflow.event.name)[:48] or 'event'
    guest_slug = slugify(recipient.guest.full_name)[:40] or 'guest'
    return (
        f"{settings.SITE_URL.rstrip('/')}/{event_slug}/rsvp/"
        f"{guest_slug}-{recipient.public_code}"
    )


def _build_invitation_image_url(recipient) -> str:
    base = getattr(settings, 'WHATSAPP_MEDIA_BASE_URL', '')
    if not base:
        host = settings.ALLOWED_HOSTS[0] if settings.ALLOWED_HOSTS else 'localhost:8000'
        scheme = 'https' if not settings.DEBUG else 'http'
        base = f'{scheme}://{host}'
    return f"{base.rstrip('/')}{settings.MEDIA_URL}{recipient.invitation_image.name}"


def _resolve_invitation_params(recipient) -> list:
    values = []
    for key in recipient.workflow.invitation_template.body_params or []:
        if key == 'rsvp_link':
            values.append(build_rsvp_url(recipient))
        elif key == 'rsvp_deadline':
            deadline = recipient.workflow.response_deadline
            if deadline:
                values.append(_format_ordinal_date(deadline))
            else:
                values.append('')
        else:
            values.extend(_resolve_template_params(recipient.guest, [key]))
    return values


def configured_invitation_template_name(recipient) -> str:
    """Return the Meta template that a new invitation attempt will use."""
    template = recipient.workflow.invitation_template
    return template.name if template else ''


def configured_pass_template_name(recipient) -> str:
    """Return the Meta template that a new pass attempt will use."""
    workflow = recipient.workflow
    event = recipient.guest.event
    template = workflow.pass_template or (
        event.whatsapp_template if event and event.whatsapp_template_id else None
    )
    return template.name if template else settings.WHATSAPP_PASS_TEMPLATE


def send_invitation(recipient):
    """Send the configured RSVP template and return PyWa's sent update."""
    workflow = recipient.workflow
    guest = recipient.guest
    template = workflow.invitation_template

    if not settings.WHATSAPP_PHONE_ID or not settings.WHATSAPP_TOKEN:
        raise RuntimeError('WhatsApp is not configured on this server.')
    if not guest.phone_number:
        raise ValueError('The RSVP recipient has no phone number.')
    if not template:
        raise ValueError('The RSVP workflow has no invitation template.')
    if template.has_header_image and not workflow.invitation_design:
        raise ValueError('This RSVP template requires invitation artwork.')
    if workflow.invitation_design and not template.has_header_image:
        raise ValueError('Select an RSVP template with an image header for this artwork.')

    from pywa.types.templates import BodyText, HeaderImage, TemplateLanguage

    params = []
    if workflow.invitation_design:
        from .images import generate_invitation_image

        if not generate_invitation_image(recipient):
            raise ValueError('The personalised RSVP artwork could not be generated.')
        image_url = _build_invitation_image_url(recipient)
        if 'localhost' in image_url or '127.0.0.1' in image_url:
            raise ValueError('The RSVP artwork does not have a public URL.')
        params.append(HeaderImage.params(image=image_url))
    body_values = _resolve_invitation_params(recipient)
    if body_values:
        params.append(BodyText.params(*body_values))

    logger.info(
        'Sending RSVP invitation to recipient %s with template %s',
        recipient.id,
        template.name,
    )
    return _get_client().send_template(
        to=_normalise_phone(guest.phone_number),
        name=template.name,
        language=TemplateLanguage.ENGLISH,
        params=params,
    )


def send_configured_pass(recipient):
    """Send a confirmed recipient's pass.

    Template resolution mirrors the direct-delivery path in guests.whatsapp.send_pass:
    workflow pass template → event guest-pass template → global default.
    """
    workflow = recipient.workflow
    guest = recipient.guest
    event = guest.event
    template = workflow.pass_template or (
        event.whatsapp_template if event and event.whatsapp_template_id else None
    )

    if not settings.WHATSAPP_PHONE_ID or not settings.WHATSAPP_TOKEN:
        raise RuntimeError('WhatsApp is not configured on this server.')
    if not guest.phone_number:
        raise ValueError('The RSVP recipient has no phone number.')
    if not guest.pass_image:
        raise ValueError('The guest pass image has not been generated.')

    if template:
        template_name = template.name
        body_values = _resolve_template_params(guest, template.body_params or [])
        has_header_image = template.has_header_image
    else:
        # Global default — image header + guest_name + event_name
        template_name = configured_pass_template_name(recipient)
        body_values = [guest.full_name, event.name if event else 'the event']
        has_header_image = True

    from pywa.types.templates import BodyText, HeaderImage, TemplateLanguage

    params = []
    if has_header_image:
        pass_url = _build_pass_url(guest)
        if not pass_url or 'localhost' in pass_url or '127.0.0.1' in pass_url:
            raise ValueError('The guest pass image does not have a public URL.')
        params.append(HeaderImage.params(image=pass_url))

    if body_values:
        params.append(BodyText.params(*body_values))

    logger.info(
        'Sending confirmed RSVP pass to recipient %s with template %s',
        recipient.id,
        template_name,
    )
    return _get_client().send_template(
        to=_normalise_phone(guest.phone_number),
        name=template_name,
        language=TemplateLanguage.ENGLISH,
        params=params,
    )
