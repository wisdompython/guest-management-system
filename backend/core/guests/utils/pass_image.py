import io
import logging
from PIL import Image, ImageDraw
from django.core.files.base import ContentFile

from .color import _parse_color, _draw_name_in_zone

logger = logging.getLogger(__name__)


def generate_pass_image(guest) -> bool:
    """
    Composite the guest's QR code onto the event design template,
    then draw the guest's name in the name zone if configured.
    Returns True on success, False on failure (logs the error).
    """
    try:
        if not guest.event or not guest.event.design_template:
            return False
        if not guest.qr_code:
            return False

        template_path = guest.event.design_template.path
        qr_path = guest.qr_code.path

        template = Image.open(template_path).convert('RGBA')
        qr_img = Image.open(qr_path).convert('RGBA')

        event = guest.event
        tw, th = template.width, template.height

        # ── Place QR code ──────────────────────────────────────────────────────
        if all(v is not None for v in [event.qr_zone_x, event.qr_zone_y, event.qr_zone_w, event.qr_zone_h]):
            x = int(event.qr_zone_x * tw)
            y = int(event.qr_zone_y * th)
            qr_w = int(event.qr_zone_w * tw)
            qr_h = int(event.qr_zone_h * th)
            qr_size = min(qr_w, qr_h)
            x += (qr_w - qr_size) // 2
            y += (qr_h - qr_size) // 2
        else:
            qr_size = int(tw * 0.25)
            padding = 20
            x = tw - qr_size - padding
            y = th - qr_size - padding

        qr_img = qr_img.resize((qr_size, qr_size), Image.LANCZOS)

        composite = template.copy()

        qr_bg = (event.qr_bg_color or 'none').strip().lower()
        if qr_bg != 'none':
            # User-chosen backing colour — parse hex and draw a rounded rectangle behind the QR
            bg_rgb = _parse_color(qr_bg)
            pad = max(6, qr_size // 20)
            backing_size = (qr_size + pad * 2, qr_size + pad * 2)
            backing = Image.new('RGBA', backing_size, (*bg_rgb, 255))
            mask = Image.new('L', backing_size, 0)
            ImageDraw.Draw(mask).rounded_rectangle(
                [(0, 0), (backing_size[0] - 1, backing_size[1] - 1)],
                radius=pad * 2, fill=255,
            )
            backing.putalpha(mask)
            composite.paste(backing, (x - pad, y - pad), backing)

        composite.paste(qr_img, (x, y), qr_img)

        # ── Draw guest name ────────────────────────────────────────────────────
        if all(v is not None for v in [event.name_zone_x, event.name_zone_y,
                                       event.name_zone_w, event.name_zone_h]):
            font_path = None
            if event.name_font and event.name_font.file:
                try:
                    font_path = event.name_font.file.path
                except Exception:
                    pass

            font_size = max(8, int(event.name_font_size_fraction * th))
            font_color = event.name_font_color or '#ffffff'

            zone_px = {
                'x': int(event.name_zone_x * tw),
                'y': int(event.name_zone_y * th),
                'w': int(event.name_zone_w * tw),
                'h': int(event.name_zone_h * th),
            }

            draw = ImageDraw.Draw(composite)
            _draw_name_in_zone(draw, guest.full_name, zone_px, font_path, font_color, font_size)

        buffer = io.BytesIO()
        composite.convert('RGB').save(buffer, format='PNG')
        buffer.seek(0)

        filename = f"pass_{guest.id}.png"
        guest.pass_image.save(filename, ContentFile(buffer.read()), save=True)
        return True

    except Exception as exc:
        logger.error("Pass generation failed for guest %s: %s", guest.id, exc, exc_info=True)
        return False
