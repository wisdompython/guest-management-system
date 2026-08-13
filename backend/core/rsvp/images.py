import io
import logging

from django.core.files.base import ContentFile
from PIL import Image, ImageDraw

from guests.utils.color import _draw_name_in_zone

logger = logging.getLogger(__name__)


def generate_invitation_image(recipient) -> bool:
    """Create the recipient's RSVP artwork with their name and no QR code."""
    workflow = recipient.workflow
    event = workflow.event
    zone_values = (
        workflow.invitation_name_zone_x,
        workflow.invitation_name_zone_y,
        workflow.invitation_name_zone_w,
        workflow.invitation_name_zone_h,
    )
    if not workflow.invitation_design or any(value is None for value in zone_values):
        return False

    try:
        artwork = Image.open(workflow.invitation_design.path).convert('RGBA')
        width, height = artwork.size
        font_path = None
        if event.name_font and event.name_font.file:
            try:
                font_path = event.name_font.file.path
            except (OSError, ValueError):
                pass

        zone_px = {
            'x': int(workflow.invitation_name_zone_x * width),
            'y': int(workflow.invitation_name_zone_y * height),
            'w': int(workflow.invitation_name_zone_w * width),
            'h': int(workflow.invitation_name_zone_h * height),
        }
        draw = ImageDraw.Draw(artwork)
        _draw_name_in_zone(
            draw,
            recipient.guest.full_name,
            zone_px,
            font_path,
            event.name_font_color or '#ffffff',
            max(8, int(event.name_font_size_fraction * height)),
        )

        output = io.BytesIO()
        artwork.convert('RGB').save(output, format='PNG')
        output.seek(0)
        if recipient.invitation_image:
            recipient.invitation_image.delete(save=False)
        recipient.invitation_image.save(
            f'rsvp_{recipient.id}.png',
            ContentFile(output.read()),
            save=True,
        )
        return True
    except Exception as exc:
        logger.error(
            'RSVP artwork generation failed for recipient %s: %s',
            recipient.id,
            exc,
            exc_info=True,
        )
        return False
