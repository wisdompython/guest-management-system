import logging

from django.conf import settings

from guests.whatsapp import (
    _build_pass_url,
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
    return f"{settings.SITE_URL.rstrip('/')}/rsvp/{recipient.callback_token}"


def _resolve_invitation_params(recipient) -> list:
    values = []
    for key in recipient.workflow.invitation_template.body_params or []:
        if key == 'rsvp_link':
            values.append(build_rsvp_url(recipient))
        else:
            values.extend(_resolve_template_params(recipient.guest, [key]))
    return values


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
    if template.has_header_image:
        raise ValueError('RSVP invitation templates cannot require a header image.')

    from pywa.types.templates import BodyText, TemplateLanguage

    params = []
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
    """Send a confirmed recipient's pass with the workflow's pass template."""
    workflow = recipient.workflow
    guest = recipient.guest
    template = workflow.pass_template

    if not settings.WHATSAPP_PHONE_ID or not settings.WHATSAPP_TOKEN:
        raise RuntimeError('WhatsApp is not configured on this server.')
    if not guest.phone_number:
        raise ValueError('The RSVP recipient has no phone number.')
    if not guest.pass_image:
        raise ValueError('The guest pass image has not been generated.')
    if not template:
        raise ValueError('The RSVP workflow has no pass template.')

    from pywa.types.templates import BodyText, HeaderImage, TemplateLanguage

    params = []
    if template.has_header_image:
        pass_url = _build_pass_url(guest)
        if not pass_url or 'localhost' in pass_url or '127.0.0.1' in pass_url:
            raise ValueError('The guest pass image does not have a public URL.')
        params.append(HeaderImage.params(image=pass_url))

    body_values = _resolve_template_params(guest, template.body_params or [])
    if body_values:
        params.append(BodyText.params(*body_values))

    logger.info(
        'Sending confirmed RSVP pass to recipient %s with template %s',
        recipient.id,
        template.name,
    )
    return _get_client().send_template(
        to=_normalise_phone(guest.phone_number),
        name=template.name,
        language=TemplateLanguage.ENGLISH,
        params=params,
    )
