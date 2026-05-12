import io
import logging
import qrcode
from PIL import Image
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)


def build_qr_payload(guest) -> str:
    event_name = guest.event.name if guest.event else 'Unknown Event'
    return (
        f"EVENT: {event_name}\n"
        f"GUEST: {guest.full_name}\n"
        f"ID: {guest.id}"
    )


def generate_qr_code(guest) -> bool:
    """
    Generate a QR code for the guest and save it.
    Returns True on success, False on failure (logs the error).
    """
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(build_qr_payload(guest))
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white").convert('RGB')

        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        filename = f"qr_{guest.id}.png"
        guest.qr_code.save(filename, ContentFile(buffer.read()), save=True)
        return True

    except Exception as exc:
        logger.error("QR generation failed for guest %s: %s", guest.id, exc, exc_info=True)
        return False


def generate_pass_image(guest) -> bool:
    """
    Composite the guest's QR code onto the event design template.
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
        composite.paste(qr_img, (x, y), qr_img)

        buffer = io.BytesIO()
        composite.convert('RGB').save(buffer, format='PNG')
        buffer.seek(0)

        filename = f"pass_{guest.id}.png"
        guest.pass_image.save(filename, ContentFile(buffer.read()), save=True)
        return True

    except Exception as exc:
        logger.error("Pass generation failed for guest %s: %s", guest.id, exc, exc_info=True)
        return False
